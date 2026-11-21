"""Sanity checks on the pipeline settings."""

import config


def test_study_box_is_ordered() -> None:
    xmin, ymin, xmax, ymax = config.STUDY_BOX_WGS84
    assert xmin < xmax
    assert ymin < ymax


def test_storms_grow_with_return_period() -> None:
    totals = [config.STORM_TOTALS_IN[k] for k in ("10yr", "25yr", "100yr", "500yr")]
    assert totals == sorted(totals)


def test_gold_dir_is_web_public_data() -> None:
    assert config.GOLD_DIR.parts[-3:] == ("web", "public", "data")
