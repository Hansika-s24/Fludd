"""Stage 3 of the depth model: move water between bowls, hour by hour.

State: W[lake] = volume of water held by a lake (m3). A leaf bowl is always a lake.
When both children of a bowl are full, they merge and the parent becomes the lake
that holds all their water.

Each hour:
1. Add the hour's runoff to the leaf bowl each cell drains into.
2. Pumps remove up to their rate from the lake they sit in (rate 0 = pump failed).
3. Any lake holding more than its capacity passes the excess through its spill point:
   - top-level bowls spill off the map;
   - otherwise into the lake on the other side; if that whole side is also full,
     the two merge into their parent.
   Every pass either merges two lakes or moves water strictly downhill, so it ends.

Volume is conserved: runoff in = water held + water off the map + water pumped out.

Stage 4 (`level_of`) turns a lake's volume into a water surface height: fill the
lake's cells from the lowest up until the volume fits.
Source: prep/04-depth-model-and-routing.md sections 1.3 (steps C and D) and 1.4.
"""

from __future__ import annotations

from dataclasses import dataclass, field

import numpy as np
from numpy.typing import NDArray

from model.depressions import OUTLET, BowlTree

EPS = 1e-9


@dataclass
class Pump:
    node: int  # leaf bowl the pump's catchment drains into
    rate_m3_per_hour: float


@dataclass
class Totals:
    runoff_in_m3: float = 0.0
    off_map_m3: float = 0.0
    pumped_m3: float = 0.0


@dataclass
class WaterState:
    tree: BowlTree
    water_m3: NDArray[np.float64] = field(init=False)
    merged: NDArray[np.bool_] = field(init=False)
    totals: Totals = field(default_factory=Totals)

    def __post_init__(self) -> None:
        self.water_m3 = np.zeros(self.tree.n, dtype=np.float64)
        self.merged = np.zeros(self.tree.n, dtype=bool)

    # ----- tree helpers -----

    def is_leaf(self, node: int) -> bool:
        return bool(self.tree.child0[node] < 0)

    def lake_of(self, node: int) -> int:
        """The lake that currently holds water poured into `node`'s region."""
        while True:
            p = int(self.tree.parent[node])
            if p < 0 or not self.merged[p]:
                return node
            node = p

    def sibling(self, node: int) -> int:
        p = int(self.tree.parent[node])
        c0 = int(self.tree.child0[p])
        return int(self.tree.child1[p]) if c0 == node else c0

    def is_lake(self, node: int) -> bool:
        return (self.is_leaf(node) or bool(self.merged[node])) and self.lake_of(node) == node

    def held_m3(self) -> float:
        return float(sum(self.water_m3[i] for i in range(self.tree.n) if self.is_lake(i)))

    # ----- one hour -----

    def step(self, runoff_m3_per_leaf: NDArray[np.float64], pumps: list[Pump]) -> None:
        tree = self.tree
        for node in np.flatnonzero(runoff_m3_per_leaf > 0):
            lake = self.lake_of(int(node))
            self.water_m3[lake] += runoff_m3_per_leaf[node]
        self.totals.runoff_in_m3 += float(runoff_m3_per_leaf.sum())

        for pump in pumps:
            if pump.rate_m3_per_hour <= 0:
                continue
            lake = self.lake_of(pump.node)
            out = min(self.water_m3[lake], pump.rate_m3_per_hour)
            self.water_m3[lake] -= out
            self.totals.pumped_m3 += out

        work = [i for i in range(tree.n) if self.is_lake(i)]
        while work:
            lake = work.pop()
            if not self.is_lake(lake):
                continue
            cap = tree.cap_m3[lake]
            if self.water_m3[lake] <= cap + EPS:
                continue
            excess = self.water_m3[lake] - cap
            self.water_m3[lake] = cap
            target = int(tree.overflow[lake])
            if target == OUTLET:
                self.totals.off_map_m3 += excess
                continue
            receiver = self.lake_of(target)
            other_side = self.sibling(lake)
            if receiver == other_side and self.water_m3[receiver] >= tree.cap_m3[receiver] - EPS:
                parent = int(tree.parent[lake])
                self.merged[parent] = True
                self.water_m3[parent] = self.water_m3[lake] + self.water_m3[receiver] + excess
                work.append(parent)
            else:
                self.water_m3[receiver] += excess
                work.append(receiver)


def region_heights(tree: BowlTree, ground_m: NDArray[np.floating]) -> list[NDArray[np.float64]]:
    """Per bowl: sorted ground heights of every cell in the bowl and all bowls below it."""
    z = np.asarray(ground_m, dtype=np.float64).ravel()
    own: list[list[NDArray[np.float64]]] = [[] for _ in range(tree.n)]
    cells = np.flatnonzero(tree.cell_node >= 0)
    nodes = tree.cell_node[cells]
    order = np.argsort(nodes, kind="stable")
    cells, nodes = cells[order], nodes[order]
    bounds = np.searchsorted(nodes, np.arange(tree.n + 1))
    regions: list[NDArray[np.float64]] = [np.empty(0)] * tree.n
    # children have lower ids than parents, so one pass upward builds each region
    for i in range(tree.n):
        parts = [z[cells[bounds[i] : bounds[i + 1]]]]
        for child in (tree.child0[i], tree.child1[i]):
            if child >= 0:
                parts.append(regions[child])
        regions[i] = np.sort(np.concatenate(parts))
        own[i] = parts
    return regions


def level_of(heights_sorted: NDArray[np.float64], volume_m3: float, cell_area_m2: float) -> float:
    """Water surface height that holds `volume_m3` over cells with these ground heights."""
    if heights_sorted.size == 0:
        return float("nan")
    v = volume_m3 / cell_area_m2
    if v <= 0:
        return float(heights_sorted[0])
    cum = np.cumsum(heights_sorted)
    k_idx = np.arange(1, heights_sorted.size + 1)
    # volume (in cell-heights) when the k lowest cells are filled to the k-th height
    filled = k_idx * heights_sorted - cum
    k = int(np.searchsorted(filled, v, side="right"))
    k = max(1, min(k, heights_sorted.size))
    return float((v + cum[k - 1]) / k)


def bowl_levels(state: WaterState, regions: list[NDArray[np.float64]]) -> NDArray[np.float64]:
    """Water surface height for every bowl at this moment.

    A bowl inside a lake gets the lake's level. A parent whose children have not merged
    yet is dry: it gets its children's spill height, so its own cells show no water.
    """
    tree = state.tree
    levels = np.empty(tree.n, dtype=np.float64)
    lake_level: dict[int, float] = {}
    for i in range(tree.n):
        if state.is_leaf(i) or state.merged[i]:
            lake = state.lake_of(i)
            if lake not in lake_level:
                lake_level[lake] = level_of(regions[lake], float(state.water_m3[lake]), tree.cell_area_m2)
            levels[i] = lake_level[lake]
        else:
            levels[i] = float(tree.spill_m[tree.child0[i]])
    return levels
