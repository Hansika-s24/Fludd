"""County and city stormwater infrastructure inside the study box.

County: pump stations (5), catch basins (1,325), channels (621), ponds (106).
City: detention areas (37), inlets (1,110), pump stations, open drains (258).
Counts are from prep/03-drainage-roads-live-data.md (ranked list at the end).
"""

from ingest.fetch import fetch_arcgis_layer

COUNTY = "https://maps.hillsboroughcounty.org/arcgis/rest/services"
CITY = "https://arcgis.tampagov.net/arcgis/rest/services/OpenData/UtilityStorm/MapServer"

LAYERS: dict[str, str] = {
    "county_pump_stations": f"{COUNTY}/CORPORATE/HC_STORMWATER/MapServer/4",
    "county_catch_basins": f"{COUNTY}/MaintStar/MaintStarStormWaterOnly/MapServer/1",
    "county_channels": f"{COUNTY}/MaintStar/MaintStarStormWaterOnly/MapServer/2",
    "county_ponds": f"{COUNTY}/MaintStar/MaintStarStormWaterOnly/MapServer/9",
    "city_detention_areas": f"{CITY}/2",
    "city_inlets": f"{CITY}/5",
    "city_pump_stations": f"{CITY}/7",
    "city_open_drains": f"{CITY}/8",
}


# Layer 7 holds every stormwater structure; keep only pumps (research file 03, A4).
WHERE: dict[str, str] = {"city_pump_stations": "STRUCTTYPE IN ('Pump Station','Lift Station')"}


def download() -> None:
    for name, url in LAYERS.items():
        fetch_arcgis_layer(name, url, where=WHERE.get(name, "1=1"))


if __name__ == "__main__":
    download()
