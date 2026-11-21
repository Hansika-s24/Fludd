"""Tests for the road graph build and the OSM download, on tiny hand-made road sets (no network)."""

from __future__ import annotations

import json
import math
from pathlib import Path
from typing import Any

import numpy as np
import pytest

import config
from graph import build
from graph.build import Way
from ingest import osm

TOY_DIR = config.REPO_DIR / "web" / "public" / "data" / "toy"

# Positions on a small lattice near USF: 0.001 degrees of latitude is about 111.2 m on a sphere.
LAT0, LNG0 = 28.06, -82.42
D = 0.001


def p(x: float, y: float) -> tuple[float, float]:
    return (LNG0 + x * D, LAT0 + y * D)


def way(nodes: list[int], highway: str = "residential", **tags: str) -> Way:
    return Way(node_ids=nodes, tags={"highway": highway, **tags})


def edges_as_pairs(g: build.RoadGraph) -> list[tuple[tuple[float, float], tuple[float, float]]]:
    """Each edge as its two end positions, sorted, so tests do not depend on numbering."""
    out = []
    for a, b in zip(g.edge_from, g.edge_to):
        ends = sorted([g.node_lnglat[a], g.node_lnglat[b]])
        out.append((ends[0], ends[1]))
    return sorted(out)


# ---------------------------------------------------------------- filters and classes


def test_drivable_roads_only() -> None:
    assert build.is_drivable({"highway": "residential"})
    assert build.is_drivable({"highway": "primary_link"})
    assert build.is_drivable({"highway": "service"})
    assert not build.is_drivable({"highway": "service", "service": "parking_aisle"})
    assert not build.is_drivable({"highway": "service", "service": "driveway"})
    assert not build.is_drivable({"highway": "footway"})
    assert not build.is_drivable({"highway": "residential", "area": "yes"})
    assert not build.is_drivable({"highway": "residential", "access": "no"})
    assert not build.is_drivable({"building": "yes"})


def test_speed_classes_use_the_toy_encoding() -> None:
    toy = json.loads((TOY_DIR / "graph.json").read_text())
    assert {str(k): v for k, v in build.SPEED_CLASSES.items()} == toy["speedClasses"]
    assert build.speed_class("residential") == 1
    assert build.speed_class("service") == 1
    assert build.speed_class("primary") == 2
    assert build.speed_class("secondary_link") == 2


def test_haversine_one_millidegree_of_latitude() -> None:
    assert build.haversine_m(p(0, 0), p(0, 1)) == pytest.approx(111.2, abs=0.1)


# ---------------------------------------------------------------- junction splitting and merging


def test_crossing_roads_split_at_the_junction() -> None:
    nodes = {1: p(-1, 0), 2: p(0, 0), 3: p(1, 0), 4: p(0, -1), 5: p(0, 1)}
    g = build.build_graph(nodes, [way([1, 2, 3]), way([4, 2, 5])])
    assert len(g.node_lnglat) == 5
    assert len(g.edge_from) == 4
    east_west = build.haversine_m(p(0, 0), p(1, 0))
    north_south = build.haversine_m(p(0, 0), p(0, 1))
    assert sorted(g.edge_length_m) == pytest.approx([east_west, east_west, north_south, north_south], rel=1e-6)


def test_bends_and_end_to_end_ways_merge_into_one_segment() -> None:
    # Way A runs 1 -> 10 -> 2 with a bend at 10; way B continues 2 -> 3. Nothing else touches 10 or 2.
    nodes = {1: p(0, 0), 10: p(1, 1), 2: p(2, 0), 3: p(3, 0)}
    g = build.build_graph(nodes, [way([1, 10, 2]), way([2, 3])])
    assert edges_as_pairs(g) == [(p(0, 0), p(3, 0))]
    expected = build.haversine_m(p(0, 0), p(1, 1)) + build.haversine_m(p(1, 1), p(2, 0)) + build.haversine_m(p(2, 0), p(3, 0))
    assert g.edge_length_m[0] == pytest.approx(expected, rel=1e-6)
    assert g.edge_shape[0][0] in (p(0, 0), p(3, 0))
    assert len(g.edge_shape[0]) == 4


def test_a_change_of_road_class_keeps_the_node() -> None:
    nodes = {1: p(0, 0), 2: p(1, 0), 3: p(2, 0)}
    g = build.build_graph(nodes, [way([1, 2], "residential"), way([2, 3], "primary")])
    assert len(g.edge_from) == 2
    assert sorted(g.edge_speed_class) == [1, 2]


def test_dead_ends_are_nodes_and_footways_are_dropped() -> None:
    nodes = {1: p(0, 0), 2: p(1, 0), 3: p(2, 0), 4: p(1, 1), 5: p(1, -1)}
    ways = [way([1, 2, 3]), way([2, 4]), way([2, 5], "footway")]
    g = build.build_graph(nodes, ways)
    assert len(g.node_lnglat) == 4  # junction 2 and dead ends 1, 3, 4
    assert len(g.edge_from) == 3


def test_only_the_largest_connected_piece_is_kept() -> None:
    nodes = {1: p(0, 0), 2: p(1, 0), 3: p(2, 0), 4: p(5, 5), 5: p(6, 5)}
    g = build.build_graph(nodes, [way([1, 2]), way([2, 3], "primary"), way([4, 5])])
    assert len(g.edge_from) == 2
    assert p(5, 5) not in g.node_lnglat


def test_a_ring_road_with_no_junctions_keeps_one_node() -> None:
    nodes = {1: p(0, 0), 2: p(1, 0), 3: p(1, 1)}
    g = build.build_graph(nodes, [way([1, 2, 3, 1])])
    assert len(g.node_lnglat) == 1
    assert len(g.edge_from) == 1
    assert g.edge_from[0] == g.edge_to[0] == 0


def test_roads_are_cut_at_the_last_node_inside_the_box() -> None:
    """Every junction must sit on the bowl grid, or roads beyond it would look like dry ground."""
    nodes = {1: p(0, 0), 2: p(1, 0), 3: p(2, 0), 4: p(3, 0), 5: p(1, 1), 6: p(1, 9)}
    box = (p(-0.5, -0.5)[0], p(-0.5, -0.5)[1], p(2.5, 1.5)[0], p(2.5, 1.5)[1])
    g = build.build_graph(nodes, [way([1, 2, 3, 4], "primary"), way([2, 5, 6])], box=box)
    assert sorted(g.node_lnglat) == sorted([p(0, 0), p(1, 0), p(2, 0), p(1, 1)])
    assert len(g.edge_from) == 3
    for lng, lat in g.node_lnglat:
        assert box[0] <= lng <= box[2] and box[1] <= lat <= box[3]


# ---------------------------------------------------------------- bowls crossed


def bowl_grid() -> tuple[np.ndarray, np.ndarray, tuple[float, float, float, float]]:
    """10 x 10 cells. Bowl 3 in columns 2-4, bowl 7 in column 7, the rest drains away."""
    ids = np.zeros((10, 10), dtype=np.int64)
    ids[:, 2:5] = 3
    ids[:, 7] = 7
    ground = np.full((10, 10), 9.0)
    ground[:, 2] = 2.0
    ground[:, 3] = 1.5
    ground[:, 4] = 2.5
    ground[:, 7] = 4.25
    ground[0, 3] = 0.1  # lower, but in a row the road never touches
    bbox = (LNG0, LAT0, LNG0 + 10 * D, LAT0 + 10 * D)
    return ids, ground, bbox


def test_segment_records_each_bowl_and_its_lowest_ground() -> None:
    ids, ground, bbox = bowl_grid()
    row_lat = LAT0 + 4.5 * D  # middle of row 5 (rows count from the north)
    shape = [(LNG0 + 0.5 * D, row_lat), (LNG0 + 9.5 * D, row_lat)]
    cell_m = build.haversine_m(p(0, 0), p(1, 0))
    result = build.segment_bowls(shape, ids, ground, bbox, step_m=cell_m / 2)
    assert result == [{"bowl": 3, "lowestGroundM": 1.5}, {"bowl": 7, "lowestGroundM": 4.25}]


def test_segment_outside_every_bowl_crosses_none() -> None:
    ids, ground, bbox = bowl_grid()
    lat = LAT0 + 4.5 * D
    shape = [(LNG0 + 0.5 * D, lat), (LNG0 + 1.5 * D, lat), (LNG0 + 1.5 * D, lat - 3 * D)]
    assert build.segment_bowls(shape, ids, ground, bbox, step_m=50.0) == []


def test_short_step_catches_a_one_cell_bowl_between_shape_points() -> None:
    ids, ground, bbox = bowl_grid()
    lat = LAT0 + 4.5 * D
    shape = [(LNG0 + 6.5 * D, lat), (LNG0 + 8.5 * D, lat)]  # endpoints in columns 6 and 8
    cell_m = build.haversine_m(p(0, 0), p(1, 0))
    assert build.segment_bowls(shape, ids, ground, bbox, step_m=cell_m / 2) == [{"bowl": 7, "lowestGroundM": 4.25}]


def test_samples_outside_the_grid_are_ignored() -> None:
    ids, ground, bbox = bowl_grid()
    lat = LAT0 + 4.5 * D
    shape = [(LNG0 - 5 * D, lat), (LNG0 + 3.5 * D, lat)]
    assert build.segment_bowls(shape, ids, ground, bbox, step_m=20.0) == [{"bowl": 3, "lowestGroundM": 1.5}]


# ---------------------------------------------------------------- gold files


def test_written_files_match_the_toy_layout(tmp_path: Path) -> None:
    nodes = {1: p(-1, 0), 2: p(0, 0), 3: p(1, 0), 4: p(0, -1), 5: p(0, 1)}
    g = build.build_graph(nodes, [way([1, 2, 3], "primary"), way([4, 2, 5])])
    segs = [[{"bowl": 1, "lowestGroundM": 3.0}], [], [], []]
    build.write_gold(g, segs, tmp_path)

    layout = json.loads((tmp_path / "graph.json").read_text())
    toy = json.loads((TOY_DIR / "graph.json").read_text())
    assert [(a["name"], a["type"]) for a in layout["arrays"]] == [(a["name"], a["type"]) for a in toy["arrays"]]
    assert layout["speedClasses"] == toy["speedClasses"]
    assert layout["nodeCount"] == 5 and layout["edgeCount"] == 4

    bin_ = (tmp_path / "graph.bin").read_bytes()
    size = {"float32": 4, "uint32": 4, "uint8": 1}
    assert len(bin_) == max(a["offset"] + a["length"] * size[a["type"]] for a in layout["arrays"])
    arrays: dict[str, Any] = {}
    for a in layout["arrays"]:
        dtype = {"float32": "<f4", "uint32": "<u4", "uint8": "u1"}[a["type"]]
        arrays[a["name"]] = np.frombuffer(bin_, dtype=dtype, count=a["length"], offset=a["offset"])
    assert arrays["nodeLng"][0] == pytest.approx(g.node_lnglat[0][0])
    assert arrays["nodeLat"][4] == pytest.approx(g.node_lnglat[4][1])
    assert list(arrays["edgeFrom"]) == g.edge_from
    assert list(arrays["edgeSpeedClass"]) == g.edge_speed_class
    assert arrays["edgeLengthM"][2] == pytest.approx(g.edge_length_m[2], rel=1e-6)

    segments = json.loads((tmp_path / "segments.json").read_text())
    assert [s["id"] for s in segments] == [0, 1, 2, 3]
    assert segments[0]["bowls"] == [{"bowl": 1, "lowestGroundM": 3.0}]


def test_write_gold_refuses_a_segment_count_mismatch(tmp_path: Path) -> None:
    g = build.build_graph({1: p(0, 0), 2: p(1, 0)}, [way([1, 2])])
    with pytest.raises(ValueError):
        build.write_gold(g, [], tmp_path)


def test_parse_overpass_reads_ways_and_nodes() -> None:
    data = {
        "elements": [
            {"type": "way", "id": 9, "nodes": [1, 2], "tags": {"highway": "residential"}},
            {"type": "node", "id": 1, "lat": 28.0, "lon": -82.4},
            {"type": "node", "id": 2, "lat": 28.001, "lon": -82.4},
        ]
    }
    nodes, ways = build.parse_overpass(data)
    assert nodes[1] == (-82.4, 28.0)
    assert ways == [Way(node_ids=[1, 2], tags={"highway": "residential"})]


# ---------------------------------------------------------------- download


def test_osm_query_uses_the_study_box_in_overpass_order() -> None:
    west, south, east, north = config.STUDY_BOX_WGS84
    assert f"({south},{west},{north},{east})" in osm.query()


def test_osm_download_is_cached(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(config, "BRONZE_DIR", tmp_path)
    (tmp_path / "osm_roads.json").write_text("{}")

    def fail(*args: object, **kwargs: object) -> None:
        raise AssertionError("network was called")

    monkeypatch.setattr(osm, "get_with_retry", fail)
    assert osm.download() == tmp_path / "osm_roads.json"


class FakeResponse:
    def __init__(self, body: dict[str, Any]) -> None:
        self.content = json.dumps(body).encode()

    def json(self) -> dict[str, Any]:
        return json.loads(self.content)


def test_osm_download_falls_back_to_a_mirror(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(config, "BRONZE_DIR", tmp_path)
    calls: list[str] = []

    def fake(url: str, **kwargs: object) -> FakeResponse:
        calls.append(url)
        if url == osm.ENDPOINTS[0]:
            raise RuntimeError("main instance down")
        return FakeResponse({"elements": [{"type": "way", "id": 1, "nodes": [1, 2], "tags": {"highway": "primary"}}]})

    monkeypatch.setattr(osm, "get_with_retry", fake)
    path = osm.download()
    assert calls == list(osm.ENDPOINTS[:2])
    assert json.loads(path.read_text())["elements"][0]["id"] == 1
    entry = json.loads((tmp_path / "manifest.json").read_text())["osm_roads"]
    assert entry["url"] == osm.ENDPOINTS[1]
    assert entry["count"] == 1
    assert math.isfinite(entry["bytes"])
