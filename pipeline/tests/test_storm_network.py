"""Tests for the storm-network transform: field selection, kind mapping, coordinate rounding."""

from typing import Any

from ingest.storm_network import (
    LINE_TYPES,
    POINT_TYPES,
    PIPES,
    city_outfall,
    county_channel,
    county_outfall,
    county_pipe,
    transform,
)


def _line(props: dict[str, Any]) -> dict[str, Any]:
    return {
        "type": "Feature",
        "properties": props,
        "geometry": {"type": "LineString", "coordinates": [[-82.425849158853609, 28.066125011236657], [-82.4258492318, 28.0660105017]]},
    }


def test_county_pipe_keeps_size_material_owner_and_drops_personal_fields() -> None:
    props = {"PIPETYPE": "SDRN", "WIDTH": 24, "HEIGHT": 24, "MATERIAL": "RCP", "P_SHAPE": "CIRC", "OWNER": "HCBOCC",
             "DESCRIPT": "near 13101 Bruce B Downs Blvd", "INSP_BY": "67", "UNITID": "X"}
    out = county_pipe(props)
    assert out == {"kind": "pipe", "diameterIn": 24.0, "material": "RCP", "shape": "CIRC", "owner": "HCBOCC",
                   "source": "Hillsborough County"}


def test_county_culvert_and_elliptical_height() -> None:
    out = county_pipe({"PIPETYPE": "CULV", "WIDTH": 30, "HEIGHT": 19, "MATERIAL": "NONE"})
    assert out["kind"] == "culvert"
    assert out["diameterIn"] == 30.0 and out["heightIn"] == 19.0
    assert "material" not in out  # placeholder code dropped


def test_zero_size_is_unknown() -> None:
    assert "diameterIn" not in county_pipe({"PIPETYPE": "SDRN", "WIDTH": 0})


def test_kinds_for_channels_city_mains_and_outfalls() -> None:
    assert county_channel({"CHNLTYPE": "DITCH"})["kind"] == "channel"
    assert PIPES["city_culverts"]({"DIAMETER": 48.96})["kind"] == "culvert"
    assert PIPES["city_culverts"]({"DIAMETER": 48.96})["diameterIn"] == 49.0
    assert PIPES["city_gravity_mains"]({"DIAMETER": 15})["kind"] == "pipe"
    assert county_outfall({"ETDESC": "FLARED"}) == {"kind": "end treatment", "type": "FLARED", "source": "Hillsborough County"}
    assert city_outfall({"DISCHRGTYP": "Outfall"})["kind"] == "outfall"


def test_transform_rounds_coordinates_and_filters_geometry() -> None:
    point = {"type": "Feature", "properties": {}, "geometry": {"type": "Point", "coordinates": [-82.1, 28.1]}}
    empty = {"type": "Feature", "properties": {}, "geometry": None}
    out = transform([_line({"PIPETYPE": "SDRN", "WIDTH": 18}), point, empty], county_pipe, LINE_TYPES)
    assert len(out) == 1
    assert out[0]["geometry"] == {"type": "LineString", "coordinates": [[-82.425849, 28.066125], [-82.425849, 28.066011]]}
    assert out[0]["properties"]["diameterIn"] == 18.0
    assert len(transform([point], county_outfall, POINT_TYPES)) == 1
