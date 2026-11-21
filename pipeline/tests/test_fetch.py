"""Tests for the shared download helpers (no network)."""

from pathlib import Path

import pytest

import config
from ingest import fetch


def test_chunks_cover_every_item_once() -> None:
    items = list(range(1203))
    batches = list(fetch.chunks(items, 500))
    assert [len(b) for b in batches] == [500, 500, 203]
    assert [i for b in batches for i in b] == items


def test_existing_file_is_not_fetched_again(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(config, "BRONZE_DIR", tmp_path)
    (tmp_path / "layer.geojson").write_text("{}")

    def fail(*args: object, **kwargs: object) -> None:
        raise AssertionError("network was called")

    monkeypatch.setattr(fetch, "get_with_retry", fail)
    assert fetch.fetch_arcgis_layer("layer", "https://example.invalid/0") == tmp_path / "layer.geojson"


def test_record_writes_manifest_entry(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(config, "BRONZE_DIR", tmp_path)
    data = tmp_path / "x.geojson"
    data.write_text("abc")
    fetch.record("x", "https://example.invalid", data, count=3)
    import json

    entry = json.loads((tmp_path / "manifest.json").read_text())["x"]
    assert entry["count"] == 3
    assert entry["bytes"] == 3
    assert entry["file"] == "x.geojson"
