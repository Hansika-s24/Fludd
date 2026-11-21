"""Stage 1 of the depth model: rain to runoff, SCS curve-number method (TR-55).

    S  = 1000 / CN - 10          potential retention, inches
    Ia = 0.2 * S                 initial abstraction
    Q  = (P - Ia)^2 / (P - Ia + S)   for P > Ia, else 0

P is cumulative rainfall and Q cumulative runoff, both in inches. Hour-by-hour runoff
is the difference of Q between steps, which is the standard way to apply SCS-CN over time.
Source: prep/04-depth-model-and-routing.md section 1.2.
"""

from __future__ import annotations

import numpy as np
from numpy.typing import ArrayLike, NDArray


def scs_runoff_in(cumulative_rain_in: ArrayLike, cn: float) -> NDArray[np.float64] | float:
    """Cumulative runoff depth (inches) for cumulative rainfall (inches) and curve number."""
    p = np.asarray(cumulative_rain_in, dtype=np.float64)
    s = 1000.0 / cn - 10.0
    ia = 0.2 * s
    excess = np.maximum(p - ia, 0.0)
    q = np.where(excess > 0, excess**2 / (excess + s), 0.0)
    return float(q) if q.ndim == 0 else q


def incremental_runoff_in(cumulative_rain_in: ArrayLike, cn: float) -> NDArray[np.float64]:
    """Runoff added in each step, from a cumulative rainfall series (one value per step boundary)."""
    q = np.asarray(scs_runoff_in(cumulative_rain_in, cn), dtype=np.float64)
    return np.diff(q)
