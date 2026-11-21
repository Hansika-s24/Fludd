"""Per-home water depths for "better options nearby", precomputed so the browser does not
have to grade 16,000 homes.

For each residential parcel with a value: its centre, address, assessed value, beds, baths,
living area and type; and for every storm (pump on, pump off, low and high variants) the
peak depth at the building, defined exactly as in docs/contracts.md: the 90th percentile of
depth over the cells within BUILDING_RING_CELLS of the point, highest over all hours.
Plus the evidence flags the grade caps need: FEMA zone, Milton flood point within 100 m.
Owner names and mailing addresses were never downloaded.
"""

from __future__ import annotations

import json
from typing import Any

import numpy as np
from numpy.typing import NDArray

import config

RESIDENTIAL = {"SINGLE FAMILY", "MULTI-FAMILY", "MOBILE HOMES", "VACANT RESIDENT", "CONDOMINIUM"}


def ring_offsets(radius_cells: int) -> NDArray[np.int64]:
    r = radius_cells
    yy, xx = np.mgrid[-r : r + 1, -r : r + 1]
    keep = (yy**2 + xx**2) <= r * r
    return np.stack([yy[keep], xx[keep]], axis=1)


def peak_building_depth(
    centres_rc: NDArray[np.int64],
    bowl_id: NDArray[np.int64],
    ground_m: NDArray[np.float64],
    levels_by_bowl_hour: NDArray[np.float64],
    radius_cells: int,
    chunk: int = 2000,
) -> NDArray[np.float64]:
    """Highest (over hours) 90th-percentile depth in the ring around each centre.

    `bowl_id` is per cell (0 = drains away, else index + 1 into levels_by_bowl_hour).
    Ring cells off the grid are ignored.
    """
    height, width = ground_m.shape
    offsets = ring_offsets(radius_cells)
    out = np.zeros(len(centres_rc), dtype=np.float64)
    hours = levels_by_bowl_hour.shape[1]
    padded_levels = np.vstack([np.full((1, hours), -np.inf), levels_by_bowl_hour])
    for start in range(0, len(centres_rc), chunk):
        c = centres_rc[start : start + chunk]
        rr = c[:, None, 0] + offsets[None, :, 0]
        cc = c[:, None, 1] + offsets[None, :, 1]
        inside = (rr >= 0) & (rr < height) & (cc >= 0) & (cc < width)
        rr_c, cc_c = np.clip(rr, 0, height - 1), np.clip(cc, 0, width - 1)
        ids = np.where(inside, bowl_id[rr_c, cc_c], 0)
        z = ground_m[rr_c, cc_c]
        depth = np.maximum(padded_levels[ids] - z[..., None], 0.0)  # [parcel, cell, hour]
        depth = np.where(inside[..., None], depth, np.nan)
        p90 = np.nanpercentile(depth, 90, axis=1, method="inverted_cdf")  # nearest rank, as the web side
        out[start : start + chunk] = np.nanmax(p90, axis=1)
    return out


def centre(geometry: dict[str, Any]) -> tuple[float, float]:
    ring = geometry["coordinates"][0] if geometry["type"] == "Polygon" else geometry["coordinates"][0][0]
    xs = [p[0] for p in ring]
    ys = [p[1] for p in ring]
    return (sum(xs) / len(xs), sum(ys) / len(ys))


def load_parcels() -> list[dict[str, Any]]:
    features = json.loads((config.BRONZE_DIR / "parcels.geojson").read_text())["features"]
    out = []
    for f in features:
        p = f["properties"]
        if p.get("LU_GRP") not in RESIDENTIAL or not (p.get("MARKET_VAL") or 0) > 0 or not f.get("geometry"):
            continue
        lng, lat = centre(f["geometry"])
        out.append(
            {
                "folio": p.get("FOLIO"),
                "address": (p.get("SITE_ADDR") or "").strip(),
                "position": [round(lng, 6), round(lat, 6)],
                "assessedValue": int(p["MARKET_VAL"]),
                "beds": p.get("tBEDS") or 0,
                "baths": p.get("tBATHS") or 0,
                "livingAreaSqft": p.get("HEAT_AR") or 0,
                "propertyType": p.get("LU_GRP"),
            }
        )
    return out
