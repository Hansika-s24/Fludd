"""Named places people live in, for search by community name ("Campus Palms", "42 North").

The county address locator only knows street addresses, and the keyless world geocoder knows few apartment
communities here. OpenStreetMap names about a hundred inside the study box, so they are fetched once and
shipped as a small file the browser searches locally: instant, and it works when the geocoders are slow.

Run from pipeline/:  uv run python -m ingest.communities [raw_overpass.json]
Writes web/public/data/communities.json as [{"name": str, "position": [lng, lat]}].
"""

from __future__ import annotations

import json
import re
import sys
import urllib.parse
import urllib.request
from collections import defaultdict
from pathlib import Path

# The study box, as in web/public/data/manifest.json "bbox": west, south, east, north.
WEST, SOUTH, EAST, NORTH = -82.4467, 28.0297, -82.3811, 28.0877
OUT = Path(__file__).resolve().parents[2] / "web" / "public" / "data" / "communities.json"
OVERPASS = "https://overpass-api.de/api/interpreter"

BOX = f"({SOUTH},{WEST},{NORTH},{EAST})"
QUERY = (
    "[out:json][timeout:25];("
    f'nwr["name"]["building"~"apartments|residential|dormitory"]{BOX};'
    f'nwr["name"]["landuse"="residential"]{BOX};'
    f'nwr["name"]["place"~"neighbourhood|suburb|quarter"]{BOX};'
    f'nwr["name"]["residential"]{BOX};'
    f'nwr["name"]["tourism"="apartment"]{BOX};'
    ");out center tags;"
)

# "Carlton Arms North Apartments Building 12" and "Greek Village Building-GVA" are one community each.
BUILDING_SUFFIX = re.compile(r"\s+(?:building|bldg)[\s.-]*\w*$", re.IGNORECASE)
# Names that describe a thing, not a place someone would search for.
GENERIC = {"apartment", "apartment building", "fitness center", "clubhouse", "leasing office", "pool", "office", "apartments"}


def fetch_raw() -> dict:
    body = urllib.parse.urlencode({"data": QUERY}).encode()
    request = urllib.request.Request(OVERPASS, data=body, headers={"User-Agent": "fludd-hackathon"})
    with urllib.request.urlopen(request, timeout=60) as response:
        return json.load(response)


def clean(name: str) -> str | None:
    """The community's name without a building number, or None when it is not a searchable name."""
    name = BUILDING_SUFFIX.sub("", name).strip(" -,")
    if len(name) < 3 or name.lower() in GENERIC:
        return None
    return name


def communities(raw: dict) -> list[dict]:
    points: dict[str, list[tuple[float, float]]] = defaultdict(list)
    for element in raw.get("elements", []):
        name = clean(element.get("tags", {}).get("name", ""))
        centre = element.get("center") or element
        if name is None or "lon" not in centre:
            continue
        points[name].append((centre["lon"], centre["lat"]))
    out = []
    for name in sorted(points, key=str.lower):
        lngs, lats = zip(*points[name])
        out.append({"name": name, "position": [round(sum(lngs) / len(lngs), 6), round(sum(lats) / len(lats), 6)]})
    return out


def main() -> None:
    raw = json.loads(Path(sys.argv[1]).read_text(encoding="utf-8")) if len(sys.argv) > 1 else fetch_raw()
    result = communities(raw)
    OUT.write_text(json.dumps(result, ensure_ascii=False, separators=(",", ":")) + "\n", encoding="utf-8")
    print(f"{len(result)} communities -> {OUT}")


if __name__ == "__main__":
    assert clean("Carlton Arms North Apartments Building 12") == "Carlton Arms North Apartments"
    assert clean("Greek Village Building-GVA") == "Greek Village"
    assert clean("Apartment Building") is None and clean("A") is None
    assert clean("42 North apartments") == "42 North apartments"
    main()
