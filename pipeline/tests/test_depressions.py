"""Tests for the bowl sweep, on hand-checkable grids (cell size 1 m, so volumes are in m3)."""

import numpy as np
import pytest

from model.depressions import OUTLET, find_bowls

EDGE = 10.0


def strip(interior: list[float]) -> np.ndarray:
    """A 3-row grid: one interior row between two edge rows of outlets."""
    row = [EDGE, *interior, EDGE]
    return np.array([[EDGE] * len(row), row, [EDGE] * len(row)], dtype=float)


def test_single_bowl_spill_height_and_capacity() -> None:
    tree = find_bowls(strip([8, 2, 3, 8]), 1.0, min_depth_m=0, min_cells=1)
    assert tree.n == 1
    assert tree.spill_m[0] == EDGE
    # cells 8,2,3,8 filled to 10: 2 + 8 + 7 + 2 = 19
    assert tree.cap_m3[0] == pytest.approx(19.0)
    assert tree.overflow[0] == OUTLET
    assert tree.min_m[0] == 2.0


def test_two_bowls_merge_at_the_saddle() -> None:
    tree = find_bowls(strip([8, 2, 2, 6, 3, 3, 8]), 1.0, min_depth_m=0, min_cells=1)
    assert tree.n == 3
    leaves = [i for i in range(tree.n) if tree.child0[i] < 0]
    parent = next(i for i in range(tree.n) if tree.child0[i] >= 0)
    a = next(i for i in leaves if tree.min_m[i] == 2.0)
    b = next(i for i in leaves if tree.min_m[i] == 3.0)
    assert tree.parent[a] == parent and tree.parent[b] == parent
    assert tree.spill_m[a] == 6.0 and tree.spill_m[b] == 6.0
    assert tree.cap_m3[a] == pytest.approx(8.0)  # 2 cells from 2 to 6
    assert tree.cap_m3[b] == pytest.approx(6.0)  # 2 cells from 3 to 6
    assert tree.overflow[a] == b and tree.overflow[b] == a
    # parent: cells 2,2,3,3,6,8,8 filled to 10
    assert tree.spill_m[parent] == EDGE
    assert tree.cap_m3[parent] == pytest.approx(38.0)
    assert tree.overflow[parent] == OUTLET


def test_flat_plane_has_no_bowls() -> None:
    tree = find_bowls(np.full((6, 6), 5.0), 1.0)
    assert tree.n == 0
    assert np.all(tree.cell_node == -1)


def test_shallow_bowl_is_filtered_out() -> None:
    tree = find_bowls(strip([8, 7.95, 8]), 1.0, min_depth_m=0.10, min_cells=1)
    # 7.95 sits 2.05 m below the 10 m edge, so it is a bowl; a 5 cm dimple inside a bowl is not
    assert tree.n == 1
    tree2 = find_bowls(strip([8, 2, 2, 6, 5.95, 6.0, 8]), 1.0, min_depth_m=0.10, min_cells=1)
    # the 5 cm dimple next to the saddle is absorbed: one leaf below the top bowl at most
    assert all(tree2.min_m[i] != 5.95 for i in range(tree2.n))


def test_catchments_point_at_the_bowl_rain_runs_into() -> None:
    tree = find_bowls(strip([8, 2, 2, 6, 3, 3, 8]), 1.0, min_depth_m=0, min_cells=1)
    interior = tree.cell_catchment.reshape(3, 9)[1]
    a = tree.cell_catchment.reshape(3, 9)[1, 2]
    b = tree.cell_catchment.reshape(3, 9)[1, 5]
    assert a != b
    assert interior[1] == a  # the 8 next to bowl A drains into A
    assert interior[7] == b
    assert np.all(tree.cell_catchment.reshape(3, 9)[0] == -1)  # edge cells leave the map
