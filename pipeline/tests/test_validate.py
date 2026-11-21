"""Tests for the Milton validation figures, on a hand-made grid."""

import numpy as np
import pytest

from model import validate


def test_hits_use_the_radius_and_threshold() -> None:
    depth = np.zeros((20, 20))
    depth[5, 5] = 0.20  # wet
    depth[15, 15] = 0.10  # too shallow
    points = [(5, 7), (15, 15), (0, 19)]  # 2 cells from the wet cell, on the shallow cell, far away
    hits = validate.hit_mask(depth, points, radius_cells=2)
    assert hits.tolist() == [True, False, False]
    assert validate.hit_mask(depth, points, radius_cells=1).tolist() == [False, False, False]


def test_points_off_the_grid_are_not_counted() -> None:
    depth = np.ones((5, 5))
    assert validate.hit_mask(depth, [(-1, 0), (2, 2), (5, 5)], radius_cells=0).tolist() == [False, True, False]


def test_false_alarm_area_excludes_cells_near_evidence() -> None:
    depth = np.zeros((10, 10))
    depth[0:2, 0:2] = 1.0  # 4 wet cells near evidence
    depth[8, 8] = 1.0  # 1 wet cell far from evidence
    evidence = np.zeros((10, 10), dtype=bool)
    evidence[0, 0] = True
    area = validate.false_alarm_area_km2(depth, evidence, buffer_cells=2, cell_area_m2=1_000_000.0)
    assert area == pytest.approx(1.0)


def test_summary_figures() -> None:
    result = validate.summarise(
        hits=np.array([True, True, False, False]),
        inside_high_risk=np.array([False, True, False, False]),
        false_alarm_km2=0.5,
    )
    assert result["hits"] == 2 and result["total"] == 4
    assert result["hitRate"] == pytest.approx(0.5)
    assert result["femaBaseline"] == {"insideHighRisk": 1, "total": 4}
    assert result["falseAlarmAreaKm2"] == 0.5
