"""Tests for storm building and the scenario runner."""

import numpy as np
import pytest

import config
from model import scenarios
from model.depressions import find_bowls
from model.routing_volume import Regions


@pytest.mark.parametrize("storm", ["10yr", "25yr", "100yr", "500yr"])
def test_design_storm_total_and_peak(storm: str) -> None:
    cumulative = scenarios.rainfall_cumulative_in(storm)
    assert len(cumulative) == config.HOURS[storm] + 1
    assert cumulative[-1] == pytest.approx(config.DEPTH_DURATION_IN[storm][24])
    hourly = np.diff(cumulative)
    assert np.all(hourly >= 0)
    # the biggest hour is the published 1-hour depth, in the middle of the rain
    assert hourly.max() == pytest.approx(config.DEPTH_DURATION_IN[storm][1])
    assert int(np.argmax(hourly)) == config.RAIN_HOURS // 2
    assert np.all(hourly[config.RAIN_HOURS :] == 0)


def test_milton_total_and_peak_hour() -> None:
    hourly = np.diff(scenarios.rainfall_cumulative_in("milton"))
    assert hourly.sum() == pytest.approx(config.MILTON_TOTAL_IN)
    assert int(np.argmax(hourly)) == config.MILTON_PEAK_HOUR


def test_pump_schedule() -> None:
    start, end = config.MILTON_PUMP_OFF_HOURS
    assert scenarios.pump_rate("milton", "off", start) == 0
    assert scenarios.pump_rate("milton", "off", start - 1) > 0
    assert scenarios.pump_rate("milton", "off", end) > 0
    assert scenarios.pump_rate("100yr", "off", 0) == 0
    assert scenarios.pump_rate("100yr", "on", 0) > 0


def test_pump_off_is_never_drier_than_pump_on() -> None:
    rng = np.random.default_rng(3)
    ground = rng.uniform(0, 3, size=(30, 30)) + np.linspace(0, 1, 30)
    ground[0, :] = ground[-1, :] = ground[:, 0] = ground[:, -1] = 5.0
    tree = find_bowls(ground, 3.0, min_depth_m=0.05, min_cells=2)
    regions = Regions(tree, ground)
    pump_node = int(np.flatnonzero(tree.child0 < 0)[0])
    on = scenarios.run_scenario(tree, regions, "100yr", "on", pump_node)
    off = scenarios.run_scenario(tree, regions, "100yr", "off", pump_node)
    assert np.all(off.levels_m >= on.levels_m - 1e-9)
    for result in (on, off):
        assert result.held_m3 + result.off_map_m3 + result.pumped_m3 == pytest.approx(result.runoff_in_m3, rel=1e-9)
