"""The underground storm-drain network: pipes, culverts, channels and outfalls in the study box.

County (Hillsborough, HC_STORMWATER): storm drains (pipes, 2,207), channels (621),
end treatments / outfalls (914). City of Tampa (UtilityStorm): culverts (39),
gravity mains (1,737), discharge points (29). Counts from prep/03-drainage-roads-live-data.md A2/A3.

`download()` writes raw layers to bronze; `build()` turns them into two gold layers:
- layers/storm-pipes.geojson  LineStrings, `kind` = pipe | culvert | channel, `diameterIn` when known
- layers/outfalls.geojson     Points where pipes empty out

Only asset fields are kept (size, material, shape, owner). Street-address descriptions,
inspector ids and dates are dropped.

Run standalone from pipeline/: `uv run python -m ingest.storm_network`.
"""

from __future__ import annotations

import json
from collections.abc import Callable
from typing import Any

import config
from ingest.fetch import fetch_arcgis_layer

COUNTY = "https://maps.hillsboroughcounty.org/arcgis/rest/services/CORPORATE/HC_STORMWATER/MapServer"
CITY = "https://arcgis.tampagov.net/arcgis/rest/services/OpenData/UtilityStorm/MapServer"

LAYERS: dict[str, str] = {
    "county_storm_pipes": f"{COUNTY}/0",
    "county_storm_channels": f"{COUNTY}/1",
    "county_end_treatments": f"{COUNTY}/2",
    "city_culverts": f"{CITY}/1",
    "city_discharge_points": f"{CITY}/3",
    "city_gravity_mains": f"{CITY}/4",
}

Feature = dict[str, Any]


def download() -> None:
    for name, url in LAYERS.items():
        fetch_arcgis_layer(name, url)


def _round(coords: Any) -> Any:
    if isinstance(coords, list):
        return [_round(c) for c in coords]
    return round(coords, 6) if isinstance(coords, float) else coords


def _size(value: Any) -> float | None:
    """Positive size in inches, rounded to 0.1, or None for missing/zero values."""
    if isinstance(value, (int, float)) and not isinstance(value, bool) and value > 0:
        return round(float(value), 1)
    return None


MISSING = {"", "NONE", "UNK", "UNKNOWN", "N/A", "NA", "OTHER"}


def _text(value: Any) -> str | None:
    """Trimmed text, or None for blanks and placeholder codes like "NONE"."""
    if isinstance(value, str) and value.strip().upper() not in MISSING:
        return value.strip()
    return None


def _clean(props: dict[str, Any]) -> dict[str, Any]:
    return {k: v for k, v in props.items() if v is not None}


def county_pipe(p: dict[str, Any]) -> dict[str, Any]:
    width, height = _size(p.get("WIDTH")), _size(p.get("HEIGHT"))
    return _clean(
        {
            "kind": "culvert" if p.get("PIPETYPE") == "CULV" else "pipe",
            "diameterIn": width,
            # Only for non-round pipes (elliptical, box): the rise, when it differs from the span.
            "heightIn": height if height is not None and height != width else None,
            "material": _text(p.get("MATERIAL")),
            "shape": _text(p.get("P_SHAPE")),
            "owner": _text(p.get("OWNER")),
            "source": "Hillsborough County",
        }
    )


def county_channel(p: dict[str, Any]) -> dict[str, Any]:
    return _clean(
        {
            "kind": "channel",
            "type": _text(p.get("CHNLTYPE")),
            "material": _text(p.get("MATERIAL")),
            "widthIn": _size(p.get("WIDTH")),
            "owner": _text(p.get("OWNER")),
            "source": "Hillsborough County",
        }
    )


def _city_main(kind: str) -> Callable[[dict[str, Any]], dict[str, Any]]:
    def convert(p: dict[str, Any]) -> dict[str, Any]:
        return _clean(
            {
                "kind": kind,
                "diameterIn": _size(p.get("DIAMETER")),
                "material": _text(p.get("MATERIAL")),
                "shape": _text(p.get("MAINSHAPE")),
                "owner": "City of Tampa",
                "source": "City of Tampa",
            }
        )

    return convert


def county_outfall(p: dict[str, Any]) -> dict[str, Any]:
    return _clean(
        {
            "kind": "end treatment",
            "type": _text(p.get("ETDESC")),
            "material": _text(p.get("MATERIAL")),
            "owner": _text(p.get("OWNER")),
            "source": "Hillsborough County",
        }
    )


def city_outfall(p: dict[str, Any]) -> dict[str, Any]:
    return _clean(
        {
            "kind": "outfall",
            "type": _text(p.get("DISCHRGTYP")),
            "diameterIn": _size(p.get("DIAMETER")),
            "owner": "City of Tampa",
            "source": "City of Tampa",
        }
    )


LINE_TYPES = {"LineString", "MultiLineString"}
POINT_TYPES = {"Point", "MultiPoint"}


def transform(features: list[Feature], convert: Callable[[dict[str, Any]], dict[str, Any]], types: set[str]) -> list[Feature]:
    """Keep features with the expected geometry, select fields, round coordinates to 6 decimals."""
    out: list[Feature] = []
    for f in features:
        geometry = f.get("geometry")
        if not geometry or geometry.get("type") not in types or not geometry.get("coordinates"):
            continue
        out.append(
            {
                "type": "Feature",
                "properties": convert(f.get("properties") or {}),
                "geometry": {"type": geometry["type"], "coordinates": _round(geometry["coordinates"])},
            }
        )
    return out


PIPES: dict[str, Callable[[dict[str, Any]], dict[str, Any]]] = {
    "county_storm_pipes": county_pipe,
    "county_storm_channels": county_channel,
    "city_culverts": _city_main("culvert"),
    "city_gravity_mains": _city_main("pipe"),
}
OUTFALLS: dict[str, Callable[[dict[str, Any]], dict[str, Any]]] = {
    "county_end_treatments": county_outfall,
    "city_discharge_points": city_outfall,
}


def _bronze(name: str) -> list[Feature]:
    features: list[Feature] = json.loads((config.BRONZE_DIR / f"{name}.geojson").read_text())["features"]
    return features


def build() -> dict[str, list[Feature]]:
    """Both gold layers from bronze, keyed by layer name."""
    pipes = [f for name, convert in PIPES.items() for f in transform(_bronze(name), convert, LINE_TYPES)]
    outfalls = [f for name, convert in OUTFALLS.items() for f in transform(_bronze(name), convert, POINT_TYPES)]
    return {"storm-pipes": pipes, "outfalls": outfalls}


def write_gold() -> dict[str, int]:
    """Write the two layers straight to web/public/data/layers/ without the full pipeline."""
    out_dir = config.GOLD_DIR / "layers"
    out_dir.mkdir(parents=True, exist_ok=True)
    counts: dict[str, int] = {}
    for name, feats in build().items():
        body = json.dumps({"type": "FeatureCollection", "features": feats}, separators=(",", ":"))
        (out_dir / f"{name}.geojson").write_text(body)
        counts[name] = len(feats)
    return counts


if __name__ == "__main__":
    download()
    print(write_gold())
