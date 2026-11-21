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
    series = np.maximum(np.round(levels, 3), np.round(floor, 3))
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
    for f in groups["pump-stations"]:
        if f["properties"].get("SITE_NAME") == "DUCK POND EAST":
            f["properties"]["approximate"] = True
    for name, feats in groups.items():
        _write_json(GOLD / "layers" / f"{name}.geojson", {"type": "FeatureCollection", "features": feats})
    return {name: len(feats) for name, feats in groups.items()}


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
    for scenario in config.SCENARIOS:
        for pump in config.PUMP_STATES:
            result = run_scenario(tree, regions, scenario, pump, pump_nodes)
            levels_json(tree, result.levels_m, scenario, pump)
            print(f"   {scenario}-pump-{pump}: off map {result.off_map_m3:,.0f} m3, pumped {result.pumped_m3:,.0f} m3")
    counts = layers()
    manifest(grid, lo_hi)
    print(f"   {tree.n} bowls; layers {counts}")


if __name__ == "__main__":
    run()
