"""Tests for per-home building depth (90th percentile of the ring, highest over hours)."""

import numpy as np
import pytest

from gold.parcels import centre, peak_building_depth, ring_offsets


def test_ring_is_a_disk() -> None:
    assert len(ring_offsets(0)) == 1
    assert len(ring_offsets(1)) == 5
    assert len(ring_offsets(3)) == 29


def test_peak_depth_uses_p90_of_ring_and_highest_hour() -> None:
    ground = np.zeros((9, 9))
    bowl = np.zeros((9, 9), dtype=np.int64)
    bowl[4, 4] = 1  # only the centre cell is in a bowl
    levels = np.array([[0.2, 1.0, 0.5]])  # bowl 1 over three hours
    # radius 1: 5 cells, one wet. p90 nearest-rank of 5 values -> the largest -> the wet cell
    d = peak_building_depth(np.array([[4, 4]]), bowl, ground, levels, radius_cells=1)
    assert d[0] == pytest.approx(1.0)
    # radius 3: 29 cells, one wet -> p90 is dry
    d3 = peak_building_depth(np.array([[4, 4]]), bowl, ground, levels, radius_cells=3)
    assert d3[0] == 0.0


def test_off_grid_cells_are_ignored() -> None:
    ground = np.zeros((3, 3))
    bowl = np.ones((3, 3), dtype=np.int64)
    levels = np.array([[0.3]])
    d = peak_building_depth(np.array([[0, 0]]), bowl, ground, levels, radius_cells=1)
    assert d[0] == pytest.approx(0.3)


def test_centre_of_a_square() -> None:
    sq = {"type": "Polygon", "coordinates": [[[0, 0], [2, 0], [2, 2], [0, 2]]]}
    assert centre(sq) == (1.0, 1.0)
