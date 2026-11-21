"""Records of past flooding inside the study box.

- County 2024 damage assessments, Hurricane Milton + Flood (research: 547 in box).
  Dollar values and parcel ids are left out on purpose: these are people's homes.
- City of Tampa Stormwater Advisory List: known-flooding parcels (research: 1,016 in box).
- Tampa police street-flooding reports 2016 to 2022 (research: 159 in box).

Source: prep/03-drainage-roads-live-data.md, sections A4 and D1.
"""

from ingest.fetch import fetch_arcgis_layer

MILTON = "https://services.arcgis.com/apTfC6SUmnNfnxuF/arcgis/rest/services/HC_DamageAssessments2024_PublicView/FeatureServer/24"
ADVISORY = "https://arcgis.tampagov.net/arcgis/rest/services/OpenData/UtilityStorm/MapServer/14"
STREET_FLOODING = "https://services8.arcgis.com/PhlIGoEH2v95HxTw/arcgis/rest/services/Tampa_Flooding_Spots/FeatureServer/1"


def download() -> None:
    fetch_arcgis_layer(
        "milton_flood_points",
        MILTON,
        where="EventName='Hurricane Milton' AND PRIMCAUSE='Flood'",
        out_fields="OBJECTID,CreationDate,IncidentType,EventName,PRIMCAUSE,TYPDAMAGE,HOMETYPE",
    )
    fetch_arcgis_layer("known_flooding_parcels", ADVISORY)
    fetch_arcgis_layer("street_flooding_reports", STREET_FLOODING)


if __name__ == "__main__":
    download()
