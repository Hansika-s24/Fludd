"""County parcels with assessed values, for "better options nearby".

Owner names and mailing addresses are in the same layer and are never requested.
Source: Hillsborough County HC_ParcelsPublic (checked live 2026-11-21: 16,808 parcels in box).
"""

from ingest.fetch import fetch_arcgis_layer

URL = "https://maps.hillsboroughcounty.org/arcgis/rest/services/InfoLayers/HC_ParcelsPublic/FeatureServer/0"
FIELDS = "OBJECTID,FOLIO,SITE_ADDR,SITE_CITY,SITE_ZIP,MARKET_VAL,JUST,S_AMT,S_DATE,tBEDS,tBATHS,tSTORIES,tUNITS,HEAT_AR,ACREAGE,DOR_CODE,LU_GRP"


def download() -> None:
    fetch_arcgis_layer("parcels", URL, out_fields=FIELDS)


if __name__ == "__main__":
    download()
