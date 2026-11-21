"""Stage 5 of the depth model: run every storm, pump on and off, and record hourly levels.

For each scenario:
1. Build the hourly rainfall (a design storm from NOAA Atlas 14, or the Milton replay).
2. Turn it into runoff per hour (SCS curve number), minus a small background drain for
   storm sewers, and send each cell's runoff to the bowl it drains into.
3. Step the water model one hour at a time, with the Duck Pond pump on or off.
4. Record every bowl's water surface height at the end of each hour.

Design storm shape: the alternating-block method. Hourly depths come from the
depth-duration table; the biggest hour sits in the middle, the next biggest on either
side, and so on. Source: prep/04-depth-model-and-routing.md sections 1.6 and 5.
"""

from __future__ import annotations

from dataclasses import dataclass

import numpy as np
from numpy.typing import NDArray

import config
from model.depressions import BowlTree
from model.routing_volume import Pump, Regions, WaterState, bowl_levels
from model.runoff import scs_runoff_in

IN_TO_M = 0.0254


def design_storm_cumulative_in(depth_by_duration: dict[int, float], rain_hours: int, total_hours: int) -> NDArray[np.float64]:
    """Cumulative rain (inches) at each hour boundary 0..total_hours, alternating-block shape."""
    durations = np.array(sorted(depth_by_duration), dtype=float)
    depths = np.array([depth_by_duration[int(d)] for d in durations])
    hours = np.arange(1, rain_hours + 1, dtype=float)
    cumulative_by_duration = np.interp(hours, durations, depths, left=depths[0] * hours[0] / durations[0])
    blocks = np.diff(np.concatenate([[0.0], cumulative_by_duration]))  # largest first
    order = np.argsort(-blocks, kind="stable")
    arranged = np.zeros(rain_hours)
    centre = rain_hours // 2
    for rank, block in enumerate(blocks[order]):
        offset = (rank + 1) // 2
        slot = centre + offset if rank % 2 == 1 else centre - offset
        arranged[min(max(slot, 0), rain_hours - 1)] += block
    hourly = np.zeros(total_hours)
    hourly[:rain_hours] = arranged
    return np.concatenate([[0.0], np.cumsum(hourly)])


def milton_cumulative_in(total_hours: int) -> NDArray[np.float64]:
    """Milton replay: the 100-year storm's shape scaled to the reported total, peaking at 22:00 Oct 9."""
    base = design_storm_cumulative_in(config.DEPTH_DURATION_IN["100yr"], config.RAIN_HOURS, config.RAIN_HOURS)
    hourly = np.diff(base) * (config.MILTON_TOTAL_IN / base[-1])
    shift = config.MILTON_PEAK_HOUR - config.RAIN_HOURS // 2
    out = np.zeros(total_hours)
    for h, value in enumerate(hourly):
        t = h + shift
        if 0 <= t < total_hours:
            out[t] += value
        elif t < 0:
            out[0] += value
    return np.concatenate([[0.0], np.cumsum(out)])


def rainfall_cumulative_in(scenario: str) -> NDArray[np.float64]:
    hours = config.HOURS[scenario]
    if scenario == "milton":
        return milton_cumulative_in(hours)
    return design_storm_cumulative_in(config.DEPTH_DURATION_IN[scenario], config.RAIN_HOURS, hours)


def pump_rate(scenario: str, pump: str, hour: int) -> float:
    rate = config.DUCK_POND_PUMP_CFS * config.CFS_TO_M3_PER_HOUR
    if pump == "on":
        return rate
    if scenario == "milton":
        start, end = config.MILTON_PUMP_OFF_HOURS
        return 0.0 if start <= hour < end else rate
    return 0.0


def basin_nodes(tree: BowlTree, inside_cell: "NDArray[np.bool_]") -> list[int]:
    """Leaf bowls whose lowest point lies inside the pump's watershed (mask over cells)."""
    leaves = np.flatnonzero(tree.child0 < 0)
    return [int(i) for i in leaves if inside_cell[tree.min_cell[i]]]


def pump_node_for_cell(tree: BowlTree, cell: int) -> int | None:
    """The bowl a pump drains: the lowest leaf of the whole top-level basin it sits in.

    A stormwater pump station collects from its basin through pipes, so it takes water
    from where the basin's water collects first, not only from the cell it stands on.
    """
    node = int(tree.cell_node[cell])
    if node < 0:
        node = int(tree.cell_catchment[cell])
    if node < 0:
        return None
    while tree.parent[node] >= 0:
        node = int(tree.parent[node])
    while tree.child0[node] >= 0:
        a, b = int(tree.child0[node]), int(tree.child1[node])
        node = a if tree.min_m[a] <= tree.min_m[b] else b
    return node


@dataclass
class ScenarioResult:
    levels_m: NDArray[np.float64]  # [bowl, hour]
    runoff_in_m3: float
    off_map_m3: float
    pumped_m3: float
    held_m3: float


def run_scenario(
    tree: BowlTree,
    regions: Regions,
    scenario: str,
    pump: str,
    pump_nodes: list[int],
    curve_number: float = config.CURVE_NUMBER,
    rain_scale: float = 1.0,
) -> ScenarioResult:
    """Run one storm. `rain_scale` gives the low and high variants for the grade range."""
    hours = config.HOURS[scenario]
    cumulative = rainfall_cumulative_in(scenario) * rain_scale
    runoff_in = np.diff(np.asarray(scs_runoff_in(cumulative, curve_number)))
    drained_in = np.minimum(runoff_in, config.BACKGROUND_DRAIN_IN_PER_HOUR)
    effective_m = (runoff_in - drained_in) * IN_TO_M

    catch = tree.cell_catchment
    cells_per_leaf = np.bincount(catch[catch >= 0], minlength=tree.n).astype(np.float64)
    area_per_leaf = cells_per_leaf * tree.cell_area_m2

    state = WaterState(tree)
    levels = np.zeros((tree.n, hours), dtype=np.float64)
    for hour in range(hours):
        pumps = [Pump(pump_nodes, pump_rate(scenario, pump, hour))] if pump_nodes else []
        state.step(area_per_leaf * effective_m[hour], pumps)
        levels[:, hour] = bowl_levels(state, regions)

    t = state.totals
    return ScenarioResult(levels, t.runoff_in_m3, t.off_map_m3, t.pumped_m3, state.held_m3())
