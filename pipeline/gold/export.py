"""Write the app's gold files to web/public/data/, in the formats of docs/contracts.md.

- manifest.json   grid, box, height range, hours, scenarios, sources
- ground.png      ground height packed as R*256 + G over the manifest's height range
- bowls.png       bowl id per cell as R + G*256 (0 = drains away)
- bowls.json      one entry per bowl
- levels/<scenario>-pump-<on|off>.json   water surface height per bowl per hour
- layers/*.geojson   map layers, trimmed to the fields the map needs (no owner data)
"""

from __future__ import annotations

import json
from datetime import date
from pathlib import Path
from typing import Any

import numpy as np
from numpy.typing import NDArray
from PIL import Image

import config
from ingest import storm_network
from model.depressions import BowlTree, find_bowls
from model.routing_volume import Regions
from model.scenarios import basin_nodes, run_scenario
from silver.elevation import Grid, build

GOLD = config.GOLD_DIR


def _write_json(path: Path, data: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, separators=(",", ":")))


def ground_png(grid: Grid) -> tuple[float, float]:
    z = grid.ground_m
    lo, hi = float(np.floor(z.min())), float(np.ceil(z.max()))
    packed = np.round((z - lo) / (hi - lo) * 65535).astype(np.uint32)
    rgb = np.zeros((*z.shape, 3), dtype=np.uint8)
    rgb[..., 0] = packed >> 8
    rgb[..., 1] = packed & 255
    Image.fromarray(rgb, "RGB").save(GOLD / "ground.png", optimize=True)
    return lo, hi


def bowls_png(tree: BowlTree, shape: tuple[int, int]) -> None:
    ids = np.where(tree.cell_node >= 0, tree.cell_node + 1, 0).astype(np.uint32).reshape(shape)
    if ids.max() > 65535:
        raise RuntimeError(f"{ids.max()} bowls do not fit the 16-bit bowl image")
    rgb = np.zeros((*shape, 3), dtype=np.uint8)
    rgb[..., 0] = ids & 255
    rgb[..., 1] = ids >> 8
    Image.fromarray(rgb, "RGB").save(GOLD / "bowls.png", optimize=True)


def lnglat_of_cell(grid: Grid, cell: int) -> list[float]:
    height, width = grid.ground_m.shape
    row, col = divmod(cell, width)
    west, south, east, north = grid.bbox
    lng = west + (col + 0.5) / width * (east - west)
    lat = north - (row + 0.5) / height * (north - south)
    return [round(lng, 6), round(lat, 6)]


def bowls_json(tree: BowlTree, grid: Grid, pump_nodes: list[int]) -> None:
    served = set(pump_nodes)
    out = []
    for i in range(tree.n):
        out.append(
            {
                "id": i + 1,
                "lowestPoint": {"position": lnglat_of_cell(grid, int(tree.min_cell[i])), "heightM": round(float(tree.min_m[i]), 3)},
                "spillHeightM": round(float(tree.spill_m[i]), 3),
                "spillsTo": int(tree.overflow[i]) + 1 if tree.overflow[i] >= 0 else None,
                "parent": int(tree.parent[i]) + 1 if tree.parent[i] >= 0 else None,
                "pump": i in served,
                "storageAtSpillM3": round(float(tree.cap_m3[i]), 1),
            }
        )
    _write_json(GOLD / "bowls.json", out)


def levels_json(tree: BowlTree, levels: NDArray[np.float64], scenario: str, pump: str, suffix: str = "") -> None:
    floor = tree.min_m[:, None]
    series = np.maximum(np.round(levels, 2), np.ceil(floor * 100) / 100)
    data = {
        "scenario": scenario,
        "pump": pump,
        "levels": {str(i + 1): series[i].tolist() for i in range(tree.n)},
    }
    _write_json(GOLD / "levels" / f"{scenario}{suffix}-pump-{pump}.json", data)


def _round(coords: Any) -> Any:
    if isinstance(coords, list):
        return [_round(c) for c in coords]
    return round(coords, 6) if isinstance(coords, float) else coords


def duck_pond_mask(grid: Grid) -> NDArray[np.bool_]:
    """Cells inside the county's Duck Pond watershed: the pump station's basin."""
    from rasterio.features import rasterize
    from rasterio.transform import from_bounds

    sheds = json.loads((config.BRONZE_DIR / "county_watersheds.geojson").read_text())["features"]
    shapes = [f["geometry"] for f in sheds if f["properties"].get("WATERSHED") == "Duck Pond"]
    height, width = grid.ground_m.shape
    transform = from_bounds(*grid.bbox, width, height)
    return rasterize(shapes, out_shape=(height, width), transform=transform, fill=0, default_value=1).astype(bool).ravel()


def _features(name: str, keep: list[str], extra: dict[str, Any] | None = None) -> list[dict[str, Any]]:
    src = json.loads((config.BRONZE_DIR / f"{name}.geojson").read_text())
    out = []
    for f in src["features"]:
        props = {k: f["properties"].get(k) for k in keep}
        props.update(extra or {})
        geometry = dict(f["geometry"])
        geometry["coordinates"] = _round(geometry["coordinates"])
        out.append({"type": "Feature", "properties": props, "geometry": geometry})
    return out


def layers() -> dict[str, int]:
    groups: dict[str, list[dict[str, Any]]] = {
        "fema-zones": _features("fema_zones", ["FLD_ZONE", "ZONE_SUBTY", "SFHA_TF", "STATIC_BFE"]),
        "pump-stations": _features("county_pump_stations", ["SITE_NAME", "WATERSHED", "NOTES"], {"source": "Hillsborough County"})
        + _features("city_pump_stations", ["NAME", "STRUCTTYPE"], {"source": "City of Tampa"}),
        "drains": _features("county_catch_basins", ["INLTDESC", "CONDITION", "BLOCKAGE"], {"source": "Hillsborough County"})
        + _features("city_inlets", ["INLETTYPE"], {"source": "City of Tampa"}),
        "ponds": _features("county_ponds", ["PONDDESC", "ACRES"], {"source": "Hillsborough County"})
        + _features("city_detention_areas", ["LOCDESC"], {"source": "City of Tampa"}),
        "fire-stations": _features("fire_stations", []),
        "hospitals": _features("hospitals", []),
        "milton-damage": _features("milton_flood_points", ["CreationDate", "TYPDAMAGE", "HOMETYPE"]),
        "known-flooding": _features("known_flooding_parcels", ["DESCRIP", "COMMENT_TY", "RECDFLOOD"]),
    }
    groups.update(storm_network.build())
    for f in groups["pump-stations"]:
        if f["properties"].get("SITE_NAME") == "DUCK POND EAST":
            f["properties"]["approximate"] = True
    for name, feats in groups.items():
        _write_json(GOLD / "layers" / f"{name}.geojson", {"type": "FeatureCollection", "features": feats})
    return {name: len(feats) for name, feats in groups.items()}


def _rasterize(grid: Grid, geometries: list[dict[str, Any]]) -> NDArray[np.bool_]:
    from rasterio.features import rasterize
    from rasterio.transform import from_bounds

    height, width = grid.ground_m.shape
    if not geometries:
        return np.zeros((height, width), dtype=bool)
    transform = from_bounds(*grid.bbox, width, height)
    return rasterize(geometries, out_shape=(height, width), transform=transform, fill=0, default_value=1, all_touched=True).astype(bool)


def peak_depth(tree: BowlTree, grid: Grid, levels: NDArray[np.float64]) -> NDArray[np.float64]:
    peak = levels.max(axis=1)
    node = tree.cell_node.reshape(grid.ground_m.shape)
    level = np.where(node >= 0, peak[np.maximum(node, 0)], -np.inf)
    return np.maximum(level - grid.ground_m, 0.0)


def validation(tree: BowlTree, grid: Grid, milton_off: NDArray[np.float64], milton_on: NDArray[np.float64]) -> None:
    from model import validate

    def feats(name: str) -> list[dict[str, Any]]:
        return json.loads((config.BRONZE_DIR / f"{name}.geojson").read_text())["features"]

    points = feats("milton_flood_points")
    lnglat = [tuple(f["geometry"]["coordinates"][:2]) for f in points]
    cells = [grid.cell_of(lng, lat) or (-1, -1) for lng, lat in lnglat]
    radius = int(round(validate.HIT_RADIUS_M / grid.cell_size_m))
    depth_off = peak_depth(tree, grid, milton_off)
    depth_on = peak_depth(tree, grid, milton_on)
    hits = validate.hit_mask(depth_off, cells, radius)
    hits_pump_on = validate.hit_mask(depth_on, cells, radius)

    sfha = _rasterize(grid, [f["geometry"] for f in feats("fema_zones") if f["properties"].get("SFHA_TF") == "T"])
    inside = np.array([bool(sfha[r, c]) if r >= 0 else False for r, c in cells])

    evidence = _rasterize(
        grid,
        [f["geometry"] for f in points] + [f["geometry"] for f in feats("known_flooding_parcels")] + [f["geometry"] for f in feats("street_flooding_reports")],
    )
    buffer = int(round(validate.EVIDENCE_BUFFER_M / grid.cell_size_m))
    false_alarm = validate.false_alarm_area_km2(depth_off, evidence, buffer, grid.cell_x_m * grid.cell_y_m)

    result = validate.summarise(hits, inside, false_alarm)
    cell_area = grid.cell_x_m * grid.cell_y_m
    result.update(
        {
            "scenario": "milton-pump-off",
            "hitRadiusM": validate.HIT_RADIUS_M,
            "wetThresholdM": validate.WET_M,
            "evidenceBufferM": validate.EVIDENCE_BUFFER_M,
            "wetAreaKm2": round(float(np.count_nonzero(depth_off >= validate.WET_M)) * cell_area / 1e6, 3),
            "boxAreaKm2": round(depth_off.size * cell_area / 1e6, 3),
            "pumpOnHits": int(np.count_nonzero(hits_pump_on)),
            "femaHighRiskAreaKm2": round(float(np.count_nonzero(sfha)) * cell_area / 1e6, 3),
            "outsideHighRisk": int(np.count_nonzero(~inside)),
            "hitsOutsideHighRisk": int(np.count_nonzero(hits & ~inside)),
            "pointFilter": "EventName = 'Hurricane Milton' AND PRIMCAUSE = 'Flood', inside the study box",
            "notes": "One storm, not tuned to these points. False-alarm area counts wet cells with no recorded flooding within the buffer, which includes real flooding nobody recorded.",
        }
    )
    _write_json(GOLD / "validation.json", result)
    print(f"   validation: {result['hits']}/{result['total']} hits ({result['hitRate']:.1%}), pump on {result['pumpOnHits']}; "
          f"FEMA SFHA {result['femaBaseline']['insideHighRisk']}/{result['total']}; wet {result['wetAreaKm2']} km2 of {result['boxAreaKm2']}; "
          f"false alarm {result['falseAlarmAreaKm2']} km2; FEMA area {result['femaHighRiskAreaKm2']} km2; "
          f"outside FEMA high risk: {result['hitsOutsideHighRisk']}/{result['outsideHighRisk']} hit")
    order = np.argsort([-1 if h else 1 for h in hits], kind="stable")
    shown_hits = [lnglat[i] for i in np.flatnonzero(hits)[:5]]
    shown_miss = [(lnglat[i], round(float(depth_off[max(cells[i][0]-radius,0):cells[i][0]+radius+1, max(cells[i][1]-radius,0):cells[i][1]+radius+1].max()), 3)) for i in np.flatnonzero(~hits)[:5]]
    print(f"   example hits: {shown_hits}")
    print(f"   example misses (max depth within radius): {shown_miss}")
    del order


def parcels_json(grid: Grid, levels: dict[str, NDArray[np.float64]]) -> int:
    """Per-home depths and evidence flags for "better options nearby" (see gold/parcels.py)."""
    from scipy.spatial import cKDTree

    from gold.parcels import load_parcels, peak_building_depth

    homes = load_parcels()
    width = grid.ground_m.shape[1]
    keep, centres = [], []
    for h in homes:
        rc = grid.cell_of(*h["position"])
        if rc is not None:
            keep.append(h)
            centres.append(rc)
    centres_rc = np.array(centres, dtype=np.int64)
    bowl_id = np.asarray(Image.open(GOLD / "bowls.png").convert("RGB")).astype(np.int64)
    bowl_id = bowl_id[..., 0] + bowl_id[..., 1] * 256
    del width

    depths = {key: peak_building_depth(centres_rc, bowl_id, grid.ground_m, lv, config.BUILDING_RING_CELLS) for key, lv in levels.items()}

    def feats(name: str) -> list[dict[str, Any]]:
        return json.loads((config.BRONZE_DIR / f"{name}.geojson").read_text())["features"]

    zones = feats("fema_zones")
    sfha = _rasterize(grid, [f["geometry"] for f in zones if f["properties"].get("SFHA_TF") == "T"])
    shaded = _rasterize(grid, [f["geometry"] for f in zones if "0.2 PCT" in str(f["properties"].get("ZONE_SUBTY") or "")])
    to_m = np.array([grid.cell_y_m, grid.cell_x_m])
    milton = [grid.cell_of(*f["geometry"]["coordinates"][:2]) for f in feats("milton_flood_points")]
    tree = cKDTree(np.array([m for m in milton if m is not None], dtype=float) * to_m)
    dist, _ = tree.query(centres_rc.astype(float) * to_m)

    out = []
    for k, h in enumerate(keep):
        r, c = centres_rc[k]
        h = dict(h)
        h["peakDepthM"] = {key: round(float(d[k]), 3) for key, d in depths.items()}
        h["femaHighRisk"] = bool(sfha[r, c])
        h["femaShadedX"] = bool(shaded[r, c])
        h["miltonPointWithin100m"] = bool(dist[k] <= config.MILTON_NEARBY_M)
        out.append(h)
    _write_json(GOLD / "parcels.json", out)
    return len(out)


def manifest(grid: Grid, ground_range: tuple[float, float]) -> None:
    bronze = json.loads((config.BRONZE_DIR / "manifest.json").read_text())
    height, width = grid.ground_m.shape
    _write_json(
        GOLD / "manifest.json",
        {
            "version": f"real-{date.today().isoformat()}",
            "bbox": [round(v, 6) for v in grid.bbox],
            "grid": {"width": width, "height": height, "cellSizeM": round(grid.cell_size_m, 3)},
            "groundRange": {"min": ground_range[0], "max": ground_range[1]},
            "hourZero": config.DESIGN_HOUR_ZERO,
            "hourZeroByScenario": {s: (config.MILTON_HOUR_ZERO if s == "milton" else config.DESIGN_HOUR_ZERO) for s in config.SCENARIOS},
            "hours": config.HOURS["100yr"],
            "scenarios": list(config.SCENARIOS),
            "units": "m",
            "sources": [{"name": name, "url": entry["url"], "date": entry["fetched_at"][:10]} for name, entry in bronze.items()],
        },
    )


def run() -> None:
    grid = build()
    GOLD.mkdir(parents=True, exist_ok=True)
    lo_hi = ground_png(grid)
    tree = find_bowls(grid.ground_m, grid.cell_size_m)
    regions = Regions(tree, grid.ground_m)
    pump_nodes = basin_nodes(tree, duck_pond_mask(grid))
    print(f"   Duck Pond pump serves {len(pump_nodes)} leaf bowls")
    bowls_png(tree, grid.ground_m.shape)
    bowls_json(tree, grid, pump_nodes)
    milton: dict[str, NDArray[np.float64]] = {}
    all_levels: dict[str, NDArray[np.float64]] = {}
    for scenario in config.SCENARIOS:
        for pump in config.PUMP_STATES:
            result = run_scenario(tree, regions, scenario, pump, pump_nodes)
            levels_json(tree, result.levels_m, scenario, pump)
            all_levels[f"{scenario}-{pump}"] = result.levels_m
            if scenario == "milton":
                milton[pump] = result.levels_m
            print(f"   {scenario}-pump-{pump}: off map {result.off_map_m3:,.0f} m3, pumped {result.pumped_m3:,.0f} m3")
    validation(tree, grid, milton["off"], milton["on"])
    for scenario, (low_in, high_in) in config.RAIN_INTERVAL_24H_IN.items():
        central = config.DEPTH_DURATION_IN[scenario][24]
        for variant, bound in (("low", low_in), ("high", high_in)):
            result = run_scenario(tree, regions, scenario, "on", pump_nodes, rain_scale=bound / central)
            levels_json(tree, result.levels_m, scenario, "on", suffix=f"-{variant}")
            all_levels[f"{scenario}-{variant}-on"] = result.levels_m
    print(f"   low/high variants written (pump on); {parcels_json(grid, all_levels)} homes in parcels.json")
    counts = layers()
    manifest(grid, lo_hi)
    print(f"   {tree.n} bowls; layers {counts}")


if __name__ == "__main__":
    run()
