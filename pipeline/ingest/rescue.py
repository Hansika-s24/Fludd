"""Fire stations (all jurisdictions, with a BOAT field) and hospitals inside the study box.

Source: Hillsborough County DisplayLayers, prep/03-drainage-roads-live-data.md section B.
"""

from ingest.fetch import fetch_arcgis_layer

DISPLAY = "https://maps.hillsboroughcounty.org/arcgis/rest/services/InfoLayers/DisplayLayers/MapServer"


def download() -> None:
    fetch_arcgis_layer("fire_stations", f"{DISPLAY}/2")
    fetch_arcgis_layer("hospitals", f"{DISPLAY}/8")


if __name__ == "__main__":
    download()
