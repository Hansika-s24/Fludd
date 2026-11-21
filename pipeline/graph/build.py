"""Road graph for routing: graph.bin + graph.json + segments.json in web/public/data/.

Same format as the toy fixture (web/scripts/make-toy-fixture.mjs, docs/contracts.md):
- graph.bin: flat little-endian arrays nodeLng, nodeLat (float32), edgeFrom, edgeTo (uint32),
  edgeLengthM (float32), edgeSpeedClass (uint8), back to back; graph.json gives each one's offset.
- segments.json: per segment id, the bowls it crosses and its lowest ground height in each.

Nodes are junctions and dead ends; a segment runs from one junction to the next, with
bends and end-to-end ways merged into it. A node also stays where the road class changes,
so each segment has one speed class. Only the largest connected piece is kept, so every
junction can reach every other. Roads are cut at their last node inside the study box, so
every junction lies on the bowl grid. Roads are drivable OSM ways (see DRIVABLE); one-way tags
are not represented: the toy format has no direction, so every segment is two-way.

Bowls: each segment's line is sampled every half grid cell; each sample's cell gives a
bowl id (bowls.png, 0 = drains away) and a ground height (silver elevation grid).
"""

from __future__ import annotations

import json
import math
from collections.abc import Sequence
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

import numpy as np
from numpy.typing import NDArray

import config

LngLat = tuple[float, float]
Box = tuple[float, float, float, float]  # west, south, east, north

# Same encoding as the toy fixture: the reader takes the speed from the "<n> mph" text.
SPEED_CLASSES: dict[int, str] = {1: "residential 25 mph", 2: "arterial 40 mph"}
ARTERIAL = {
    "motorway", "motorway_link", "trunk", "trunk_link", "primary", "primary_link",
    "secondary", "secondary_link", "tertiary", "tertiary_link",
}
LOCAL = {"unclassified", "residential", "living_street", "service", "road"}
DRIVABLE = ARTERIAL | LOCAL
# Service roads stay (apartment complexes are reached by them); parking aisles and driveways do not.
SKIPPED_SERVICE = {"parking_aisle", "driveway", "drive-through"}

EARTH_RADIUS_M = 6_371_008.8


@dataclass
class Way:
    node_ids: list[int]
    tags: dict[str, str]


@dataclass
class RoadGraph:
    node_lnglat: list[LngLat] = field(default_factory=list)
    edge_from: list[int] = field(default_factory=list)
    edge_to: list[int] = field(default_factory=list)
    edge_length_m: list[float] = field(default_factory=list)
    edge_speed_class: list[int] = field(default_factory=list)
    edge_shape: list[list[LngLat]] = field(default_factory=list)


def is_drivable(tags: dict[str, str]) -> bool:
    highway = tags.get("highway")
    if highway not in DRIVABLE:
        return False
    if tags.get("area") == "yes" or tags.get("access") == "no" or tags.get("motor_vehicle") == "no":
        return False
    return not (highway == "service" and tags.get("service") in SKIPPED_SERVICE)


def speed_class(highway: str) -> int:
    return 2 if highway in ARTERIAL else 1


def haversine_m(a: LngLat, b: LngLat) -> float:
    lng1, lat1, lng2, lat2 = map(math.radians, (a[0], a[1], b[0], b[1]))
    h = math.sin((lat2 - lat1) / 2) ** 2 + math.cos(lat1) * math.cos(lat2) * math.sin((lng2 - lng1) / 2) ** 2
    return 2 * EARTH_RADIUS_M * math.asin(math.sqrt(h))


def parse_overpass(data: dict[str, Any]) -> tuple[dict[int, LngLat], list[Way]]:
    nodes: dict[int, LngLat] = {}
    ways: list[Way] = []
    for e in data["elements"]:
        if e["type"] == "node":
            nodes[int(e["id"])] = (float(e["lon"]), float(e["lat"]))
        elif e["type"] == "way":
            ways.append(Way(node_ids=[int(n) for n in e["nodes"]], tags=dict(e.get("tags", {}))))
    return nodes, ways


def _inside(pos: LngLat, box: Box) -> bool:
    return box[0] <= pos[0] <= box[2] and box[1] <= pos[1] <= box[3]


def build_graph(nodes: dict[int, LngLat], ways: Sequence[Way], box: Box | None = None) -> RoadGraph:
    """Split drivable ways at junctions, merge bends, keep the largest connected piece."""
    # 1. Pieces: one per pair of consecutive OSM nodes on a drivable way.
    piece_a: list[int] = []
    piece_b: list[int] = []
    piece_cls: list[int] = []
    for w in ways:
        if not is_drivable(w.tags):
            continue
        cls = speed_class(w.tags["highway"])
        for a, b in zip(w.node_ids, w.node_ids[1:]):
            if a == b or a not in nodes or b not in nodes:
                continue
            if box is not None and not (_inside(nodes[a], box) and _inside(nodes[b], box)):
                continue
            piece_a.append(a)
            piece_b.append(b)
            piece_cls.append(cls)

    touching: dict[int, list[int]] = {}
    for i, (a, b) in enumerate(zip(piece_a, piece_b)):
        touching.setdefault(a, []).append(i)
        touching.setdefault(b, []).append(i)

    def is_junction(n: int) -> bool:
        ps = touching[n]
        return len(ps) != 2 or piece_cls[ps[0]] != piece_cls[ps[1]]

    junctions = {n for n in touching if is_junction(n)}
    visited = [False] * len(piece_a)
    raw_edges: list[tuple[int, int, list[int], int]] = []  # from, to, OSM node path, class

    def walk(start: int, first: int) -> None:
        path = [start]
        cur, p = start, first
        while True:
            visited[p] = True
            nxt = piece_b[p] if piece_a[p] == cur else piece_a[p]
            path.append(nxt)
            if nxt in junctions:
                break
            p = touching[nxt][0] if touching[nxt][1] == p else touching[nxt][1]
            cur = nxt
        raw_edges.append((start, path[-1], path, piece_cls[first]))

    for j in sorted(junctions):
        for p in touching[j]:
            if not visited[p]:
                walk(j, p)
    # 2. Rings with no junction at all: make one of their nodes a junction.
    for p in range(len(piece_a)):
        if not visited[p]:
            junctions.add(piece_a[p])
            walk(piece_a[p], p)

    # 3. Largest connected piece (union-find over junctions).
    parent: dict[int, int] = {j: j for j in junctions}

    def root(n: int) -> int:
        while parent[n] != n:
            parent[n] = parent[parent[n]]
            n = parent[n]
        return n

    for a, b, _, _ in raw_edges:
        ra, rb = root(a), root(b)
        if ra != rb:
            parent[ra] = rb
    size: dict[int, int] = {}
    for a, _, _, _ in raw_edges:
        size[root(a)] = size.get(root(a), 0) + 1
    if not size:
        return RoadGraph()
    keep = max(size, key=lambda r: (size[r], -r))

    g = RoadGraph()
    index: dict[int, int] = {}

    def node_index(n: int) -> int:
        if n not in index:
            index[n] = len(g.node_lnglat)
            g.node_lnglat.append(nodes[n])
        return index[n]

    for a, b, path, cls in raw_edges:
        if root(a) != keep:
            continue
        shape = [nodes[n] for n in path]
        g.edge_from.append(node_index(a))
        g.edge_to.append(node_index(b))
        g.edge_length_m.append(sum(haversine_m(s, t) for s, t in zip(shape, shape[1:])))
        g.edge_speed_class.append(cls)
        g.edge_shape.append(shape)
    return g


def segment_bowls(
    shape: Sequence[LngLat],
    bowl_ids: NDArray[np.integer[Any]],
    ground_m: NDArray[np.floating[Any]],
    bbox: Box,
    step_m: float,
) -> list[dict[str, float | int]]:
    """Bowls a line crosses, in the order it meets them, with its lowest ground in each."""
    west, south, east, north = bbox
    height, width = bowl_ids.shape
    lngs: list[NDArray[np.float64]] = []
    lats: list[NDArray[np.float64]] = []
    for i, (s, t) in enumerate(zip(shape, shape[1:])):
        n = max(1, math.ceil(haversine_m(s, t) / step_m))
        f = np.arange(0 if i == 0 else 1, n + 1) / n
        lngs.append(s[0] + (t[0] - s[0]) * f)
        lats.append(s[1] + (t[1] - s[1]) * f)
    if not lngs:
        return []
    lng = np.concatenate(lngs)
    lat = np.concatenate(lats)
    col = np.floor((lng - west) / (east - west) * width).astype(np.int64)
    row = np.floor((north - lat) / (north - south) * height).astype(np.int64)
    ok = (row >= 0) & (row < height) & (col >= 0) & (col < width)
    ids = bowl_ids[row[ok], col[ok]]
    ground = ground_m[row[ok], col[ok]]

    lowest: dict[int, float] = {}  # insertion order = order met
    for b, h in zip(ids.tolist(), ground.tolist()):
        if b and (b not in lowest or h < lowest[b]):
            lowest[b] = h
    return [{"bowl": int(b), "lowestGroundM": round(float(h), 2)} for b, h in lowest.items()]


def write_gold(g: RoadGraph, segments: Sequence[Sequence[dict[str, float | int]]], out_dir: Path) -> None:
    """graph.bin, graph.json and segments.json, laid out exactly like the toy fixture."""
    if len(segments) != len(g.edge_from):
        raise ValueError(f"{len(segments)} segment bowl lists for {len(g.edge_from)} segments")
    columns: list[tuple[str, str, NDArray[Any]]] = [
        ("nodeLng", "float32", np.array([p[0] for p in g.node_lnglat], dtype="<f4")),
        ("nodeLat", "float32", np.array([p[1] for p in g.node_lnglat], dtype="<f4")),
        ("edgeFrom", "uint32", np.array(g.edge_from, dtype="<u4")),
        ("edgeTo", "uint32", np.array(g.edge_to, dtype="<u4")),
        ("edgeLengthM", "float32", np.array(g.edge_length_m, dtype="<f4")),
        ("edgeSpeedClass", "uint8", np.array(g.edge_speed_class, dtype="u1")),
    ]
    arrays: list[dict[str, Any]] = []
    parts: list[bytes] = []
    offset = 0
    for name, kind, values in columns:
        data = values.tobytes()
        arrays.append({"name": name, "type": kind, "offset": offset, "length": int(values.size)})
        parts.append(data)
        offset += len(data)
    out_dir.mkdir(parents=True, exist_ok=True)
    (out_dir / "graph.bin").write_bytes(b"".join(parts))
    layout = {
        "nodeCount": len(g.node_lnglat),
        "edgeCount": len(g.edge_from),
        "speedClasses": {str(k): v for k, v in SPEED_CLASSES.items()},
        "arrays": arrays,
    }
    (out_dir / "graph.json").write_text(json.dumps(layout, indent=1))
    listed = [{"id": i, "bowls": list(b)} for i, b in enumerate(segments)]
    (out_dir / "segments.json").write_text(json.dumps(listed, separators=(",", ":")))


def main() -> None:
    from PIL import Image

    from ingest import osm
    from silver import elevation

    data = json.loads(osm.download().read_text(encoding="utf-8"))
    nodes, ways = parse_overpass(data)
    g = build_graph(nodes, ways, box=config.STUDY_BOX_WGS84)
    print(f"== graph: {len(g.node_lnglat)} nodes, {len(g.edge_from)} segments, "
          f"{sum(g.edge_length_m) / 1000:.1f} km of road")

    gold = config.GOLD_DIR
    manifest = json.loads((gold / "manifest.json").read_text())
    rgb = np.asarray(Image.open(gold / "bowls.png").convert("RGB")).astype(np.int64)
    bowl_ids = rgb[:, :, 0] + rgb[:, :, 1] * 256
    grid = elevation.build()
    if bowl_ids.shape != grid.ground_m.shape or bowl_ids.shape != (manifest["grid"]["height"], manifest["grid"]["width"]):
        raise RuntimeError(f"bowls.png {bowl_ids.shape} and ground {grid.ground_m.shape} are not on the manifest grid")
    if any(abs(a - b) > 1e-6 for a, b in zip(grid.bbox, manifest["bbox"])):
        raise RuntimeError(f"ground box {grid.bbox} differs from manifest box {manifest['bbox']}")

    step = min(grid.cell_x_m, grid.cell_y_m) / 2
    bbox: Box = (grid.bbox[0], grid.bbox[1], grid.bbox[2], grid.bbox[3])
    segments = [segment_bowls(shape, bowl_ids, grid.ground_m, bbox, step) for shape in g.edge_shape]

    known = {int(b["id"]) for b in json.loads((gold / "bowls.json").read_text())}
    unknown = {int(b["bowl"]) for s in segments for b in s} - known
    if unknown:
        raise RuntimeError(f"segments cross {len(unknown)} bowls missing from bowls.json, e.g. {sorted(unknown)[:5]}")

    write_gold(g, segments, gold)
    wet = sum(1 for s in segments if s)
    print(f"   {wet} of {len(segments)} segments cross at least one bowl")
    for name in ("graph.bin", "graph.json", "segments.json"):
        print(f"   {name}: {(gold / name).stat().st_size:,} bytes")


if __name__ == "__main__":
    main()
