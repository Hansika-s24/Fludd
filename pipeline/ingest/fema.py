"""FEMA flood zones (National Flood Hazard Layer, layer 28) inside the study box.

Source: prep/02-flood-and-elevation-data.md, FEMA section.
"""

from ingest.fetch import fetch_arcgis_layer

URL = "https://hazards.fema.gov/arcgis/rest/services/public/NFHL/MapServer/28"


def download() -> None:
    fetch_arcgis_layer("fema_zones", URL, out_fields="FLD_ZONE,ZONE_SUBTY,SFHA_TF,STATIC_BFE")


if __name__ == "__main__":
    download()
