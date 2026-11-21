"""OpenStreetMap roads inside the study box, from Overpass, saved once to bronze/osm_roads.json.

Source: prep/03-drainage-roads-live-data.md, section B1. The query keeps every `highway` way
except paths, footways and the like; graph/build.py picks the drivable ones, so the raw file
can be re-filtered without downloading again. Overpass is slow and shared: one request,
cached; on failure the next mirror is tried. Licence ODbL 1.0, "(c) OpenStreetMap contributors".
"""

from __future__ import annotations

import json
from pathlib import Path

import config
from ingest.fetch import get_with_retry, record

NAME = "osm_roads"
ENDPOINTS: tuple[str, ...] = (
    "https://overpass-api.de/api/interpreter",
    "https://maps.mail.ru/osm/tools/overpass/api/interpreter",
    "https://overpass.kumi.systems/api/interpreter",
)
NOT_ROADS = "footway|path|cycleway|steps|pedestrian|track|bridleway|corridor|proposed|construction|platform|elevator"


def query() -> str:
    west, south, east, north = config.STUDY_BOX_WGS84
    # Overpass boxes are (south, west, north, east)
    return (
        "[out:json][timeout:120];"
        f'way["highway"]["highway"!~"{NOT_ROADS}"]["area"!="yes"]({south},{west},{north},{east});'
        "out body;>;out skel qt;"
    )


def download() -> Path:
    """Fetch the roads once; later calls return the saved file."""
    path = config.BRONZE_DIR / f"{NAME}.json"
    if path.exists():
        print(f"== {NAME}: already downloaded, skipping")
        return path

    q = query()
    errors: list[str] = []
    for url in ENDPOINTS:
        print(f"== {NAME}: {url}")
        try:
            response = get_with_retry(url, data={"data": q}, attempts=2, timeout=180)
            body = response.json()
        except (RuntimeError, ValueError) as error:
            errors.append(f"{url}: {error}")
            continue
        remark = str(body.get("remark", ""))
        if "elements" not in body or "error" in remark.lower():
            errors.append(f"{url}: incomplete answer ({remark or 'no elements'})")
            continue
        elements = body["elements"]
        ways = sum(1 for e in elements if e.get("type") == "way")
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_bytes(response.content)
        record(NAME, url, path, count=ways, extra={"query": q, "elements": len(elements), "osm_base": body.get("osm3s", {}).get("timestamp_osm_base")})
        print(f"   {ways} ways, {len(elements)} elements -> {path.name}")
        return path
    raise RuntimeError(f"{NAME}: every Overpass endpoint failed: {errors}")


if __name__ == "__main__":
    download()
