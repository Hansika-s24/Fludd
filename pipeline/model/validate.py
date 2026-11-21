"""Stage 6 of the depth model: check it against Hurricane Milton.

Three figures, computed, never estimated (prep/04-depth-model-and-routing.md section 2.3):

1. Hit rate: share of the county-recorded Milton flood-damage points where the Milton
   replay (Duck Pond pump failing for the outage window) puts water >= 0.15 m anywhere
   within HIT_RADIUS_M of the point. The radius allows for where the point was placed
   on the parcel and for the 3 m grid.
2. False-alarm area: modelled wet area (>= 0.15 m at the peak) farther than
   EVIDENCE_BUFFER_M from any recorded flooding (Milton points, the city's known-flooding
   parcels, police street-flooding reports). There is no flood-extent map, so this is our
   stated stand-in; it counts as false alarm anything with no record nearby, which also
   includes real flooding nobody recorded.
3. FEMA baseline: share of the same points inside a FEMA Special Flood Hazard Area.

Nothing here is tuned to the points.
"""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

import numpy as np
from numpy.typing import NDArray
from scipy.ndimage import binary_dilation

WET_M = 0.15
HIT_RADIUS_M = 25.0
EVIDENCE_BUFFER_M = 150.0


def _disk(radius_cells: int) -> NDArray[np.bool_]:
    r = int(radius_cells)
    yy, xx = np.mgrid[-r : r + 1, -r : r + 1]
    return (yy**2 + xx**2) <= r * r


def hit_mask(depth_m: NDArray[np.floating], points_rc: list[tuple[int, int]], radius_cells: int) -> NDArray[np.bool_]:
    """For each (row, col) point: is there water >= WET_M within the radius? Off-grid points miss."""
    height, width = depth_m.shape
    wet = depth_m >= WET_M
    disk = _disk(radius_cells)
    r = int(radius_cells)
    out = np.zeros(len(points_rc), dtype=bool)
    for k, (row, col) in enumerate(points_rc):
        if not (0 <= row < height and 0 <= col < width):
            continue
        r0, r1 = max(row - r, 0), min(row + r + 1, height)
        c0, c1 = max(col - r, 0), min(col + r + 1, width)
        window = wet[r0:r1, c0:c1]
        mask = disk[r0 - (row - r) : r1 - (row - r), c0 - (col - r) : c1 - (col - r)]
        out[k] = bool(np.any(window & mask))
    return out


def false_alarm_area_km2(
    depth_m: NDArray[np.floating], evidence: NDArray[np.bool_], buffer_cells: int, cell_area_m2: float
) -> float:
    near = binary_dilation(evidence, structure=_disk(buffer_cells)) if buffer_cells > 0 else evidence
    far_wet = (depth_m >= WET_M) & ~near
    return float(np.count_nonzero(far_wet) * cell_area_m2 / 1e6)


def summarise(hits: NDArray[np.bool_], inside_high_risk: NDArray[np.bool_], false_alarm_km2: float) -> dict[str, Any]:
    total = int(hits.size)
    n_hits = int(np.count_nonzero(hits))
    return {
        "hitRate": n_hits / total if total else 0.0,
        "hits": n_hits,
        "total": total,
        "falseAlarmAreaKm2": round(false_alarm_km2, 3),
        "femaBaseline": {"insideHighRisk": int(np.count_nonzero(inside_high_risk)), "total": total},
        "computedAt": datetime.now(timezone.utc).isoformat(timespec="seconds"),
    }
