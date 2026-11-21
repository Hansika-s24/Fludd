"""Tests for rain-to-runoff (SCS curve number)."""

import numpy as np
import pytest

from model import runoff


def test_zero_rain_gives_zero_runoff() -> None:
    assert runoff.scs_runoff_in(0.0, 85) == 0.0


def test_rain_below_initial_abstraction_gives_zero() -> None:
    # CN 80: S = 2.5 in, Ia = 0.5 in
    assert runoff.scs_runoff_in(0.5, 80) == 0.0


@pytest.mark.parametrize("cn", [39, 61, 80, 90, 98])
def test_runoff_never_exceeds_rain(cn: float) -> None:
    rain = np.linspace(0, 20, 201)
    q = runoff.scs_runoff_in(rain, cn)
    assert np.all(q <= rain + 1e-12)
    assert np.all(q >= 0)
    assert np.all(np.diff(q) >= -1e-12)


def test_textbook_example() -> None:
    # CN 80, P = 5 in: S = 2.5, Ia = 0.5, Q = 4.5^2 / (4.5 + 2.5) = 2.893 in (TR-55 equation 2-3)
    assert runoff.scs_runoff_in(5.0, 80) == pytest.approx(2.893, abs=1e-3)


@pytest.mark.parametrize(
    ("cn", "rain", "expected"),
    [(80, 6.6, 4.33), (85, 11.9, 10.02), (90, 17.2, 15.93)],
)
def test_matches_research_table(cn: float, rain: float, expected: float) -> None:
    # prep/04-depth-model-and-routing.md section 1.2
    assert runoff.scs_runoff_in(rain, cn) == pytest.approx(expected, abs=0.01)


def test_incremental_runoff_sums_to_total() -> None:
    cumulative_rain = np.array([0.0, 0.5, 1.5, 4.0, 6.0, 6.6])
    steps = runoff.incremental_runoff_in(cumulative_rain, 80)
    assert len(steps) == len(cumulative_rain) - 1
    assert np.all(steps >= 0)
    assert steps.sum() == pytest.approx(runoff.scs_runoff_in(6.6, 80))
