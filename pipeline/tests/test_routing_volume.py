"""Tests for moving water between bowls (cell size 1 m, volumes in m3)."""

import numpy as np
import pytest

from model.depressions import find_bowls
from model.routing_volume import Pump, Regions, WaterState, bowl_levels, level_of

EDGE = 10.0


def two_bowls() -> tuple[np.ndarray, object]:
    row = [EDGE, 8, 2, 2, 6, 3, 3, 8, EDGE]
    ground = np.array([[EDGE] * 9, row, [EDGE] * 9], dtype=float)
    return ground, find_bowls(ground, 1.0, min_depth_m=0, min_cells=1)


def ids(tree: object) -> tuple[int, int, int]:
    t = tree  # type: ignore[assignment]
    a = next(i for i in range(t.n) if t.child0[i] < 0 and t.min_m[i] == 2.0)  # type: ignore[attr-defined]
    b = next(i for i in range(t.n) if t.child0[i] < 0 and t.min_m[i] == 3.0)  # type: ignore[attr-defined]
    p = int(t.parent[a])  # type: ignore[attr-defined]
    return a, b, p


def pour(state: WaterState, node: int, m3: float, pumps: list[Pump] | None = None) -> None:
    runoff = np.zeros(state.tree.n)
    runoff[node] = m3
    state.step(runoff, pumps or [])


def test_level_from_volume() -> None:
    # two cells at 2 m holding 5 m3 -> (5 + 4) / 2 = 4.5 m
    assert level_of(np.array([2.0, 2.0, 6.0]), 5.0, 1.0) == pytest.approx(4.5)
    # spreads onto the third cell once the first two reach it: (17 + 16) / 5
    assert level_of(np.array([2.0, 2.0, 3.0, 3.0, 6.0, 8.0, 8.0]), 17.0, 1.0) == pytest.approx(6.6)


def test_full_bowl_spills_into_its_neighbour() -> None:
    ground, tree = two_bowls()
    a, b, _ = ids(tree)
    state = WaterState(tree)  # type: ignore[arg-type]
    pour(state, a, 10.0)  # A holds 8
    assert state.water_m3[a] == pytest.approx(8.0)
    assert state.water_m3[b] == pytest.approx(2.0)
    levels = bowl_levels(state, Regions(tree, ground))  # type: ignore[arg-type]
    assert levels[a] == pytest.approx(6.0)
    assert levels[b] == pytest.approx(4.0)


def test_two_full_bowls_merge_at_the_right_level() -> None:
    ground, tree = two_bowls()
    a, b, p = ids(tree)
    state = WaterState(tree)  # type: ignore[arg-type]
    pour(state, a, 17.0)  # 8 + 6 fills both, 3 more merges them
    assert state.merged[p]
    assert state.water_m3[p] == pytest.approx(17.0)
    levels = bowl_levels(state, Regions(tree, ground))  # type: ignore[arg-type]
    assert levels[a] == levels[b] == levels[p] == pytest.approx(6.6)


def test_overflow_leaves_the_map_and_volume_is_conserved() -> None:
    _, tree = two_bowls()
    a, _, p = ids(tree)
    state = WaterState(tree)  # type: ignore[arg-type]
    pour(state, a, 50.0)  # parent holds 38
    assert state.water_m3[p] == pytest.approx(38.0)
    assert state.totals.off_map_m3 == pytest.approx(12.0)


def test_volume_conserved_over_random_storms() -> None:
    rng = np.random.default_rng(7)
    ground = rng.uniform(0, 5, size=(40, 50))
    ground[0, :] = ground[-1, :] = ground[:, 0] = ground[:, -1] = 6.0
    tree = find_bowls(ground, 2.0, min_depth_m=0.05, min_cells=2)
    assert tree.n > 3
    state = WaterState(tree)
    leaves = np.flatnonzero(tree.child0 < 0)
    pumps = [Pump(node=int(leaves[0]), rate_m3_per_hour=5.0)]
    for _ in range(24):
        runoff = np.zeros(tree.n)
        runoff[leaves] = rng.uniform(0, 20, size=leaves.size)
        state.step(runoff, pumps)
        t = state.totals
        assert state.held_m3() + t.off_map_m3 + t.pumped_m3 == pytest.approx(t.runoff_in_m3, rel=1e-9)
        lakes = [i for i in range(tree.n) if state.is_lake(i)]
        assert np.all(state.water_m3[lakes] <= tree.cap_m3[lakes] + 1e-6)


def test_pump_at_zero_changes_the_result() -> None:
    _, tree = two_bowls()
    a, _, _ = ids(tree)
    on, off = WaterState(tree), WaterState(tree)  # type: ignore[arg-type]
    for _ in range(3):
        pour(on, a, 3.0, [Pump(node=a, rate_m3_per_hour=1.0)])
        pour(off, a, 3.0, [Pump(node=a, rate_m3_per_hour=0.0)])
    assert off.water_m3[a] > on.water_m3[a]
    assert on.totals.pumped_m3 == pytest.approx(3.0)
    assert off.totals.pumped_m3 == 0.0


def test_more_rain_never_lowers_water() -> None:
    ground, tree = two_bowls()
    a, _, _ = ids(tree)
    regions = Regions(tree, ground)  # type: ignore[arg-type]
    previous = None
    for total in [1.0, 5.0, 9.0, 15.0, 20.0, 40.0]:
        state = WaterState(tree)  # type: ignore[arg-type]
        pour(state, a, total)
        levels = bowl_levels(state, regions)
        if previous is not None:
            assert np.all(levels >= previous - 1e-9)
        previous = levels
