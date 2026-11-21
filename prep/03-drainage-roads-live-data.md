# 03 - Drainage, roads, live feeds, resident reports, geocoding: verified data sources

Research date: 2026-11-21 (all calls below were made this morning, roughly 13:15-13:35 UTC, from a Windows laptop with curl).
Target: USF Tampa main campus, lat 28.0587, lon -82.4139, 4 x 4 mile box.

**Box used in every spatial query (WGS84):** `xmin=-82.4467, ymin=28.0297, xmax=-82.3811, ymax=28.0877`

**How to read this file**

- "Verified" means I called the exact URL shown and got the status and sample shown. Samples are trimmed real responses.
- "Not verified" means I could not make it respond, or only read about it. Those are called out explicitly. Nothing here is filled in from memory without saying so.
- CORS was tested by sending `Origin: https://example.org` and reading `Access-Control-Allow-Origin` (ACAO) in the response.

**Shared ArcGIS query suffix** (append to any `.../MapServer/<id>/query?` or `.../FeatureServer/<id>/query?`):

```
where=1%3D1&geometry=-82.4467,28.0297,-82.3811,28.0877&geometryType=esriGeometryEnvelope&inSR=4326&spatialRel=esriSpatialRelIntersects&outFields=*&outSR=4326&f=geojson
```

Called `<BOX>` below. Always pass `inSR=4326` and `outSR=4326`: the native projections are State Plane feet (WKID 2237 county, 2882 SWFWMD) or Web Mercator (3857), and you get those back if you forget `outSR`.

**ArcGIS gotchas that apply to every county / city / SWFWMD layer**

- `maxRecordCount` is 1000 (county, SWFWMD) or 2000 (Tampa, ArcGIS Online). A response with `"exceededTransferLimit": true` is truncated. Page with `resultOffset=1000&resultRecordCount=1000` (add `orderByFields=OBJECTID`), or check `returnCountOnly=true` first.
- Dates are epoch milliseconds.
- `f=geojson` works on all servers tested. Tampa also offers `f=pbf`.
- On-premises servers (maps.hillsboroughcounty.org, arcgis.tampagov.net, www25.swfwmd.state.fl.us) echo back whatever `Origin` you send, so browser fetch works from any origin. ArcGIS Online (`services*.arcgis.com`) returns `ACAO: *`.
- No licence text is published in the service metadata (only `copyrightText` such as "EGIS", "Tampa GIS", "Southwest Florida Water Management District"). Treat as Florida public records, credit the agency on the map. I did not find or verify a formal licence statement.

---

## A. Stormwater and drainage infrastructure

### A1. The pump station that failed in Milton: Duck Pond

What the sources say:

- Hillsborough County's own releases (10 and 14 Oct 2024) named it the **Duck Pond pump station**. Both hcfl.gov URLs now return **404** (I tried WebFetch and curl; the Wayback availability API returned no snapshot for the first and timed out for the second). So the county text below comes from search-result snippets of those pages, not a page I could open today:
  - Power went out at about 3 a.m. Thursday 10 Oct 2024 and was restored about 10 a.m. the next day.
  - It is the county's largest stormwater pump station, capacity 50 to 90 cubic feet per second, built to protect low-lying University Area land up to a 25-year storm.
  - County rainfall figure: about 10.7 inches, exceeding the 100-year event.
- Tampa Free Press, 10 Oct 2024 (fetched and read today, https://www.tampafp.com/?p=243404): "The Duck Pond pump station, located near the University of South Florida, is the County's largest stormwater facility". It gives no address.
- No source I found publishes an address or coordinates in prose. Whether the station had a working generator is **not confirmed** by anything I read (a separate City of Tampa station at Curiosity Creek had a generator transfer switch that failed, per Fox 13; do not mix the two up).

What the county GIS says (verified, this is the only record with "Duck" in its name out of 38 county stormwater pump stations):

```
GET https://maps.hillsboroughcounty.org/arcgis/rest/services/CORPORATE/HC_STORMWATER/MapServer/4/query?where=UPPER(SITE_NAME)+LIKE+%27%25DUCK%25%27&outFields=OBJECTID,SITE_ID,SITE_NAME,DESCRIPT,WATERSHED,NOTES,COMMENTS,EMG_PMP,AUTODIALER&outSR=4326&f=geojson
HTTP 200, 373 bytes
{"type":"FeatureCollection","features":[{"type":"Feature","id":38,"geometry":{"type":"Point",
 "coordinates":[-82.430539366664121,28.05883506339908]},"properties":{"OBJECTID":38,"SITE_ID":"38",
 "SITE_NAME":"DUCK POND EAST","DESCRIPT":"On E 122ND AVE near 2601 E 122nd Ave","WATERSHED":"Duck Pond",
 "NOTES":"STATION NEED GPS ","COMMENTS":null,"EMG_PMP":null,"AUTODIALER":"N"}}]}
```

- **Best available location: "DUCK POND EAST", E 122nd Ave near 2601 E 122nd Ave, lat 28.05884, lon -82.43054** (about 1 mile west of the campus centre, in unincorporated University Area).
- Caveats: the record's own note says "STATION NEED GPS", so the point is digitised, not surveyed. Matching this record to the station in the news is my inference from the name; the county never published the address. The record has no pump count, capacity or emergency-pump field filled in.

### A2. Hillsborough County stormwater network (unincorporated side) - verified

Base: `https://maps.hillsboroughcounty.org/arcgis/rest/services` (ArcGIS Server 10.91, no auth, HTTP 200, CORS: echoes Origin).

| Service / layer | What | Features in box | Notes |
|---|---|---|---|
| `CORPORATE/HC_STORMWATER/MapServer/4` | Pump Stations (point) | 5 (38 countywide) | native SR 3857 |
| `CORPORATE/HC_STORMWATER/MapServer/0` | Storm Drains = pipes (line) | 2,207 | over 1000, must page |
| `CORPORATE/HC_STORMWATER/MapServer/1` | Channels = ditches/canals (line) | 621 | |
| `CORPORATE/HC_STORMWATER/MapServer/2` | End Treatments = headwalls/outfalls (point) | 914 | |
| `CORPORATE/HC_STORMWATER/MapServer/3` | Junctions (point) | 401 | |
| `MaintStar/MaintStarStormWaterOnly/MapServer/1` | CatchBasins = inlets (point) | 1,325 | has `CONDITION` (1-5) and `BLOCKAGE` ("0-10", "11-20" %) and `INSP_DATE` |
| `.../MapServer/3` | ControlStructures (point) | 76 | weir/skimmer flags |
| `.../MapServer/9` | Ponds (point, not polygon) | 106 | `PONDTYPE`, `PONDDESC` |
| `.../MapServer/10` | PumpStations | 5 | same records as HC_STORMWATER/4 |
| `.../MapServer/6` | MitigationAreas (polygon) | 16 | |
| `.../MapServer/12`, `/2`, `/4`, `/5` | StormDrains, Channels, EndTreatments, Junctions | 2,207 / 621 / 914 / 401 | same data as HC_STORMWATER, native SR 2237 |

Working call, all 5 county pump stations in the box (HTTP 200, 7,620 bytes, 0.2 s):

```
GET https://maps.hillsboroughcounty.org/arcgis/rest/services/CORPORATE/HC_STORMWATER/MapServer/4/query?where=1%3D1&geometry=-82.4467,28.0297,-82.3811,28.0877&geometryType=esriGeometryEnvelope&inSR=4326&spatialRel=esriSpatialRelIntersects&outFields=*&outSR=4326&f=geojson
```

| SITE_ID | SITE_NAME | lon, lat | Address field | Detail from the record |
|---|---|---|---|---|
| 02 | LEISUREWOOD | -82.43348, 28.06576 | 13101 Leisurewood Dr | dual pump, `EMG_PMP: Y`, installed 2002 |
| 24 | 42ND ST STREET | -82.41390, 28.07233 | 13702 7th Lazy Oak Drive | dual pump, `EMG_PMP: Y` |
| 32 | GIBSON AVE | -82.39140, 28.06383 | 5622 Gibson Avenue | dual pump, "STATION UPGRADED (NEW)" |
| 33 | HARTLINE | -82.42978, 28.06571 | 13110 N 27th Street | dual pump, "STATION UPGRADED (NEW)" |
| 38 | DUCK POND EAST | -82.43054, 28.05884 | On E 122nd Ave near 2601 E 122nd Ave | attributes mostly empty, "STATION NEED GPS" |

All five have `WATERSHED: "Duck Pond"`, `MAINTAINER: "HCPWD"`, `AUTODIALER: "N"`. The `COMMENTS` field gives pump-on water levels, for example Leisurewood: "PUMP #1 ACTIVATE WHEN WATER LEVE IS 6FT / 72" HIGH AND PUMP #2 IS AT 6 1/2 FT / 78" HIGH IN WELL". The `DATALINK` field is an internal UNC path, not usable.

Sample catch basin (trimmed): `{"ASSETTYPE":"CATCH BASIN","INLTTYPE":"CURB","CONDITION":3,"BLOCKAGE":"11-20","INSP_DATE":1684508227000,"DESCRIPT":"near 13615 N 22nd St","WATERSHED":"Duck Pond","SUBAREA":"613"}`

### A3. City of Tampa stormwater network (campus, south and east) - verified

Base: `https://arcgis.tampagov.net/arcgis/rest/services` (ArcGIS Server 11.5, no auth, HTTP 200, CORS: echoes Origin, maxRecordCount 2000, formats JSON / geoJSON / PBF).

Service: `OpenData/UtilityStorm/MapServer`

| Layer id | Name | In box | Notes |
|---|---|---|---|
| 0 | Stormwater Basins (polygon) | 28 | drainage basins |
| 1 | Stormwater Culverts (line) | 39 | |
| 2 | Stormwater Detention Areas (polygon) | 37 | ponds / retention |
| 3 | Stormwater Discharge Points | 29 | outfalls |
| 4 | Stormwater Gravity Mains (line) | 1,737 | pipes |
| 5 | Stormwater Inlets (point) | 1,110 | `INLETTYPE` (GI, CI), `SCHCLEANING`, `COMPCLEANING` |
| 6 | Stormwater Manholes | 366 | |
| 7 | Stormwater Network Structures | 519 | `STRUCTTYPE` in CS, ME, Pump Station, Virtual Junction, Tide Chamber, Lift Station, Junction Chamber, HW, Other |
| 8 | Stormwater Open Drains (line) | 258 | ditches |
| 9 | Stormwater Pressurized Mains | 47 | force mains from pumps |
| 14 | **Stormwater Advisory List (polygon, parcels)** | **1,016** (9,419 citywide) | see A4 |
| 15 | Stormwater Curbed Streets | 1,187 | |

There is a second service, `Utility/StormNetworkViewer/MapServer` (23 layers, same data split by flow direction, plus layer 17 Storm Ponds and 14 Storm Ditches - City Owned). Not needed if you use the one above.

City pump stations (citywide, verified, HTTP 200, 18 features; the layer has **no names**, only `FACILITYID`):

```
GET https://arcgis.tampagov.net/arcgis/rest/services/OpenData/UtilityStorm/MapServer/7/query?where=STRUCTTYPE+IN+(%27Pump+Station%27,%27Lift+Station%27)&outFields=FACILITYID,STRUCTTYPE,WORKZONE,LIFECYCLE,DATASOURCE,FILENUMBER&outSR=4326&f=geojson
```

Those inside or at the edge of the box: FACILITYID 1515838 (-82.42757, 28.04128), 2894265 (-82.43066, 28.05070), 4280623 (-82.43843, 28.04934, file SW2022-07REV, In-Service), lift station 4337112 (-82.43140, 28.03694), and 2909768 (-82.44709, 28.05089, just outside the west edge). I could not tell from the data which one is the Curiosity Creek station named in news reports.

Sample inlet (trimmed): `{"type":"Feature","id":11438407,"geometry":{"type":"Point","coordinates":[-82.4259777,28.0437335]},"properties":{"FACILITYID":"1979001","INLETTYPE":"GI","SCHCLEANING":"N","WORKZONE":"North 03"}}`

The county also republishes Tampa's storm network at `https://maps.hillsboroughcounty.org/arcgis/rest/services/COT_Infrastructure/COT_STORMWASTEWATER/MapServer` (layers Inlet 6, Culvert 9, OpenDrain 8, Gravity Main 11, swBasins 13, swDetention 19, swRainGauge 3). I listed it but did not query it; freshness unknown.

### A4. "Known flooding" layers - verified, these are the strongest finds

**1. City of Tampa Stormwater Advisory List (parcel polygons with known-flooding flags and recorded flood elevations)**

```
GET https://arcgis.tampagov.net/arcgis/rest/services/OpenData/UtilityStorm/MapServer/14/query?where=1%3D1&geometry=-82.4467,28.0297,-82.3811,28.0877&geometryType=esriGeometryEnvelope&inSR=4326&spatialRel=esriSpatialRelIntersects&outFields=OBJECTID,COMMENT_TY,RECDFLOOD,SWCOMMENTS1&outSR=4326&geometryPrecision=5&f=geojson
HTTP 200, about 390 KB, 0.5 s, 1,016 features (under the 2000 cap, no paging needed)
```

Value counts of `SWCOMMENTS1` inside the box:

- 499: "DEVELOPMENT CONSIDERATIONS: Future development requires 100-year storage for any discharge to 'Volume Sensitive' basin ..."
- **264: "FLOOD PRONE AREA: Known flooding of existing lot, structure and/or street [Sect. III.D.1 of the Stormwater Technical Standards Manual]"**
- **76: "FLOOD PRONE AREA: Receiving drainage system inadequate ..."**
- 51: equivalent storage required for filling of flood prone areas
- 43 / 40: drainage easement / existing drainage feature on site

`RECDFLOOD` holds a recorded flood elevation, for example "28.91 NAVD88" (109 parcels), "25.61 NAVD88" (93), "28.21 NAVD88" (26). The city's own caveat in `COMMENT_TY`: "Record flood indicates a past observation and does not necessarily equate to the 100yr flood or any other design storm." Other fields: `SWCOMMENTS2..7`, `FOLIO`, `LASTUPDATE`, `DOCUMENTLINK`. City limits only.

**2. Tampa historical street flooding reports (police-reported, point)**

```
GET https://services8.arcgis.com/PhlIGoEH2v95HxTw/arcgis/rest/services/Tampa_Flooding_Spots/FeatureServer/1/query?where=1%3D1&geometry=-82.4467,28.0297,-82.3811,28.0877&geometryType=esriGeometryEnvelope&inSR=4326&spatialRel=esriSpatialRelIntersects&outFields=Location,Status,Date,ReportedBy,Notes&outSR=4326&orderByFields=Date+DESC&f=geojson
HTTP 200, ACAO: *
{"type":"Feature","geometry":{"type":"Point","coordinates":[-82.4345964945077,28.0456680967959]},
 "properties":{"Location":"N 22ND ST / MARVY AVE","Status":"Cleared","Date":1671125400000,"ReportedBy":"Officer","Notes":"NOT PASSABLE"}}
```

- 1,904 points citywide, 159 in the box. Latest `Date` is 15 Dec 2022 (one record has a bogus 1970 date). No Helene or Milton records.
- Gotcha: this copy is hosted in a **Bloomberg** ArcGIS Online org (`svc_ArcGISOnline@bloomberg.org_Bloomberg`), last edited April 2023, not by the city. It could disappear. Download it once.

**3. Tampa LIVE street flooding (the city's active layer)**

```
GET https://services1.arcgis.com/IbNXlmt2RVVRCZ6M/arcgis/rest/services/Street_Flooding_view/FeatureServer/0/query?where=1%3D1&outFields=*&outSR=4326&f=geojson
HTTP 200, ACAO: *, 0 features today
```

- Same schema as above (`Location, Status, Date, ReportedBy, Notes, DateCleared`). It is a view with definition query `Status <> 'Cleared'`, data last edited about 18 Nov 2026. So it is empty in dry weather and fills with open street-flooding reports during an event. This is a real "live as water rises" feed for the city side. Owner shows as `PrivateInfo_TampaGIS`, public access.

**4. Hillsborough County 2024 damage assessments (point, countywide incl. city)**

```
GET https://services.arcgis.com/apTfC6SUmnNfnxuF/arcgis/rest/services/HC_DamageAssessments2024_PublicView/FeatureServer/24/query?<BOX>
HTTP 200, ACAO: *, 19,571 total, 905 in box
sample: {"IncidentType":"Flooding","PARCELID":"T-15-28-19-54V-000010-K0000.0","PREDISVAL":577749,"STRLOSS":144437.25,
         "TYPDAMAGE":"Minor","PRIMCAUSE":"Flood","DESCDAMAGE":"Flooding","EventName":"Hurricane Helene"}
```

In the box, by `EventName` / `PRIMCAUSE`: **Hurricane Milton / Flood 547**, Milton / null 183, Milton / Wind 95, Milton / Tree 13. Filter with `where=EventName='Hurricane Milton' AND PRIMCAUSE='Flood'`. Privacy: it carries parcel ids and dollar losses; show points or aggregate, not values per home. There is also an aggregated version, `HurricaneDamage2024_ByBlock/FeatureServer/17` (568 block-group polygons, 46 in box).

**5. City of Tampa Helene and Milton damage points**

```
GET https://services1.arcgis.com/IbNXlmt2RVVRCZ6M/arcgis/rest/services/HurricaneHeleneandMilton/FeatureServer/2/query?<BOX>
HTTP 200, 6,527 total, 128 in box
sample: {"CAT":"IA","ADDR":"8610 N 14TH ST","DAMAGE":"Affected","x_Owner":"Residential","x_Damage_Type":"Other","Hurricane":"Milton"}
```

**6. SWFWMD flood photos (point)**

```
GET https://www25.swfwmd.state.fl.us/arcgis11/rest/services/prjFloodplainWatersheds/FloodPhotos/MapServer/0/query?<BOX>
HTTP 200, 10 KB, 37 in box (3,358 district-wide): 28 dated 2024, 8 from 2012 (TS Debby), 1 from 2017
samples: {"DESCRIPTION":"Flood photos from TS Debby at intersection of 26th Street and 110th Avenue.","PHOTO_YEAR":"2012","SOURCE":"SWFWMD"}
         {"OBJECTID":9466,"DESCRIPTION":"Roadway Flooding","SOURCE":"News Media CNN"}   at -82.43596, 28.05422
         {"OBJECTID":9471,"DESCRIPTION":"Aerial Video of Structure and Parking Lot Flooding","SOURCE":"HCSO"}  at -82.44106, 28.05653
```

Gotcha: the layer says `hasAttachments: true` but `/9466/attachments?f=json` returned `{"attachmentInfos":[]}` and `queryAttachments` returned nothing. So you get photo locations and descriptions, **not the photos**. Some 2024 records have null `PHOTO_DATE`.

**7. County "Flooding Focus Areas" (polygon)**: `https://services.arcgis.com/apTfC6SUmnNfnxuF/arcgis/rest/services/Flooding_Focus_Areas/FeatureServer/1` - 27 polygons, 6 intersect the box, including one named "University Mall" and one "Temple Terrace" (the others are commissioner districts and city outlines). Part of the post-2024 Regional Stormwater Evaluation. Attributes are just a name and an HTML popup; low value.

### A5. Drainage basins, floodplains and flood zones - verified

| Source | Endpoint | Result |
|---|---|---|
| County watershed boundaries | `https://maps.hillsboroughcounty.org/arcgis/rest/services/DSD_Viewer_Services/DSD_Flood_Hazard_Layers/MapServer/1` | 3 in box: **Duck Pond (5,700 acres)**, Cypress Creek (26,805 acres), Hillsborough River |
| County model subbasins | `.../DSD_Flood_Hazard_Layers/MapServer/2` | 386 in box. Point query near Duck Pond East returned `{"SUBBASIN_ID":"SUB624080","JUNCTION_ID":"624080","AREA_AC":89.19,"WATERSHED":"Duck Pond"}` |
| County FEMA flood zones | `.../DSD_Flood_Hazard_Layers/MapServer/6` | 91 polygons in box. Point at -82.4305, 28.0600 returned `FLD_ZONE: "X", ZONE_SUBTY: "AREA OF MINIMAL FLOOD HAZARD", SFHA_TF: "F"` (this confirms the pitch line: the flooded area is mapped zone X) |
| County volume/peak-sensitive basins | `https://services.arcgis.com/apTfC6SUmnNfnxuF/arcgis/rest/services/HC_BASINS_PEAK_VOLUME_SENSITIVE11102022_DRAFT/FeatureServer/0` | 386 in box; `VOLUME_SENSITIVE_DESIGNATION`, `PEAK_SENSITIVE_DESIGNATION`, `DS_TRIGGERS_25YR_COUNT`. Marked DRAFT by the county |
| FEMA NFHL direct | `https://hazards.fema.gov/arcgis/rest/services/public/NFHL/MapServer/28/query?geometry=-82.4305,28.0600&geometryType=esriGeometryPoint&inSR=4326&spatialRel=esriSpatialRelIntersects&outFields=FLD_ZONE,ZONE_SUBTY,SFHA_TF,STATIC_BFE,DFIRM_ID&returnGeometry=false&f=json` | HTTP 200, CORS echoes Origin |
| SWFWMD drainage basins | `https://www25.swfwmd.state.fl.us/arcgis12/rest/services/OpenData/Hydrography/MapServer/10` | 4 in box: Cypress Creek (76.9 sq mi), Hillsborough River, **Curiosity Creek (5.21 sq mi)**, Sulphur Springs |
| **SWFWMD watershed-model floodplains** | `https://www25.swfwmd.state.fl.us/arcgis12/rest/services/BaseVector/FloodplainBndCache/MapServer/0` (same data at `.../arcgis11/rest/services/prjFloodplainWatersheds/FloodplainBndsNoCache/MapServer/0`) | 923 polygons in box: Duck Pond AE 563, Duck Pond A 189, Cypress Creek AE 61, Duck Pond A "TRANSITION ZONE" 59, Hillsborough River / TBC / East Lake 42 |
| SWFWMD watershed study status | `.../arcgis11/rest/services/prjFloodplainWatersheds/FloodplainWatershedBnds/MapServer/0` | 124 studies, 3 in box, fields `GOV_BOARD_APPROVED`, `GOV_BOARD_APPROVAL_DATE` |

SWFWMD floodplain working call. **Size gotcha: full geometry for the box is 12.4 MB.** Add `maxAllowableOffset` to simplify:

```
GET https://www25.swfwmd.state.fl.us/arcgis12/rest/services/BaseVector/FloodplainBndCache/MapServer/0/query?where=1%3D1&geometry=-82.4467,28.0297,-82.3811,28.0877&geometryType=esriGeometryEnvelope&inSR=4326&spatialRel=esriSpatialRelIntersects&outFields=WATERSHED,FEMA_ZONE,FTYPE&outSR=4326&maxAllowableOffset=0.00005&geometryPrecision=5&f=geojson
HTTP 200, 602 KB, 1.2 s, 923 features
attributes: {"WATERSHED":"DUCK POND","COUNTY":"HILLSBOROUGH","FEMA_ZONE":"AE","FTYPE":"FLOODPLAIN"}
```

What I did **not** find: a public service with **flood depths** or water-surface elevations from the Duck Pond, Curiosity Creek or Cypress Creek watershed models. The SWFWMD layers are extent polygons only (zone A / AE), with no depth or elevation attribute. Depth grids probably exist in the model deliverables but would need a request to SWFWMD or county Floodplain Administration; not doable today. Also note a point query at -82.4305, 28.0600 on this layer returned no polygon, so the modelled floodplain does not blanket the area that flooded in Milton either.

Other county river-stage products (Hillsborough River only, not the University Area drainage problem): `https://services.arcgis.com/apTfC6SUmnNfnxuF/arcgis/rest/services/HillsboroughRiver_Stage_Roads/FeatureServer/0` - road segments inundated at each river stage (fields `Stage19ft` ... `Stage46ft`, 3,127 segments, 230 in box, 2D analysis by Wood, Sept 2020, "should not be used for navigation"). Useful for the "which roads stay dry" story near Temple Terrace when paired with the Fowler Ave gauge (section C2).

---

## B. Roads, routing, rescue facilities

### B1. Road graph: OpenStreetMap via Overpass - verified

```
POST https://overpass-api.de/api/interpreter
Content-Type: application/x-www-form-urlencoded
data=[out:json][timeout:60];way["highway"]["highway"!~"footway|path|cycleway|steps|pedestrian|track|bridleway|corridor|proposed|construction|platform|elevator"]["area"!="yes"](28.0297,-82.4467,28.0877,-82.3811);out body;>;out skel qt;
```

- **HTTP 200, 4,145,588 bytes (4.1 MB), 45 seconds**, `ACAO: *`. OSM base timestamp 2026-11-21T13:20:51Z.
- 6,474 ways, 25,175 nodes. By class: service 4,165, residential 1,343, secondary 345, primary 281, tertiary 235, primary_link 56, secondary_link 24, unclassified 21.
- Two thirds of the ways are `service` (parking aisles, driveways). Drop `service` from the regex for a much smaller arterial-plus-residential graph, or keep them because apartment complexes in the University Area are reached only by service roads.
- Bbox order in Overpass is **south, west, north, east** (opposite of ArcGIS).
- Sample way: `{"type":"way","id":10964561,"nodes":[97740852,97740854,...],"tags":{"highway":"residential","maxspeed":"25 mph","name":"North Hyaleah Road"}}`. `oneway`, `maxspeed`, `bridge`, `tunnel`, `layer` tags are present where mapped.
- Reliability today: main instance was slow (45 s and 40 s). Mirror `https://overpass.kumi.systems/api/interpreter` **timed out (120 s, no response)**. Mirror `https://overpass.private.coffee/api/interpreter` **timed out twice**. Mirror `https://maps.mail.ru/osm/tools/overpass/api/interpreter` returned 200 in 21 s on a smaller query.
- **Do not call Overpass from the live app.** Fetch once at the start of hacking, save the JSON in the repo, build the graph from the file.
- Licence: ODbL 1.0, attribution "© OpenStreetMap contributors" required.

Alternatives:

- Geofabrik Florida extract `https://download.geofabrik.de/north-america/us/florida-latest.osm.pbf`: the HEAD request returned a 301 redirect; I did not follow it or get the size. It is a statewide file far over the 5 MB limit for this research and needs osmium/osmnx to clip. Skip for a 4-mile box.
- `osmnx` (Python) does the same Overpass call and returns a NetworkX graph; fine if the backend is Python, same Overpass slowness applies.
- Official centrelines: Tampa `https://arcgis.tampagov.net/arcgis/rest/services/Roads/RoadsCenterline/MapServer/0` and county `https://services.arcgis.com/apTfC6SUmnNfnxuF/arcgis/rest/services/HillsboroughRiver_Stage_Roads/FeatureServer/0` have `EST_SPEED`, `ONEWAY`, `TRAV_TIME`, but are not topologically noded for routing. Use OSM.
- OSRM public demo (sanity check only, not your routing engine): `https://router.project-osrm.org/route/v1/driving/-82.42772,28.03585;-82.4139,28.0587?overview=false` returned HTTP 200, `ACAO: *`, `{"code":"Ok","routes":[{"duration":342.8,"distance":3772.9}]}` (Tampa Fire Station 13 to campus centre, 3.8 km, 5.7 min dry). Demo server, no SLA, cannot block flooded edges.

### B2. Fire / rescue stations - verified

| Source | Endpoint | Result |
|---|---|---|
| County, all jurisdictions (best single layer) | `https://maps.hillsboroughcounty.org/arcgis/rest/services/InfoLayers/DisplayLayers/MapServer/2` | 18 stations in a wider box (-82.52, 27.98, -82.31, 28.14). Fields `STATION`, `ADDRESS`, `ENGINE`, `RESCUE`, `LADDER`, **`BOAT`**, `CITY` (TT = Temple Terrace, COT = Tampa, HC), `ALS` |
| Same data on ArcGIS Online | `https://services.arcgis.com/apTfC6SUmnNfnxuF/arcgis/rest/services/Stations_AllJurisdictions/FeatureServer/0` | 78 countywide, 4 in the 4-mile box, `ACAO: *`, last edited Nov 2022 |
| Tampa Fire Rescue | `https://arcgis.tampagov.net/arcgis/rest/services/OpenData/Fire/MapServer/10` | 10 in wider box. `{"NAME":"Fire Station 13","FULLADDR":"2713 E Annie St","DESCRIPTION":"Engine 13, Rescue 13, District Chief 3, FireLite 13"}` at -82.42772, 28.03585 |
| County stations via Tampa server | `https://arcgis.tampagov.net/arcgis/rest/services/Fire/FireStationsHCO/MapServer/0` | 10 in wider box, `Station: "HCR41"` style ids |
| First-due response areas | `https://services.arcgis.com/apTfC6SUmnNfnxuF/arcgis/rest/services/CurrentCADFireResponse/FeatureServer/0` | 2,099 polygons, 51 in box, `FirstDueSt`, `Alarm1: "40,43,5"`. Described as "as of 2021" |
| OSM cross-check | Overpass `amenity=fire_station` | near campus: HCFR Station 14 (28.06582, -82.44492), HCFR Station 5 (28.07351, -82.44816), Tampa Station 13 (28.03578, -82.42771), Tampa Station 20 (28.0907, -82.4051), Tampa Station 11, Temple Terrace Stations 1 and 2 |

Sample county record: `{"STATION":"Station 20","ADDRESS":"16200 N Bruce B Downs Bl","ENGINE":"1","RESCUE":"1","BRUSH":"1","BOAT":"1","CITY":"COT","STA_NUM":"20"}`.
Gotcha: the county and Tampa layers overlap and disagree slightly on coordinates; dedupe by address. Apparatus counts are strings.

### B3. Hospitals - verified

- County: `https://maps.hillsboroughcounty.org/arcgis/rest/services/InfoLayers/DisplayLayers/MapServer/8` - 12 in wider box, with `TYPE` such as "Hospital (Trauma Capable)", "Trauma Center (L-2+Peds+Air Med)", "No Emergency Department", and `HELIPAD`.
- Tampa: `https://arcgis.tampagov.net/arcgis/rest/services/FacilitiesMunicipal/Hospitals/MapServer/0` - 11 in wider box, including Shriners (12502 USF Pine Dr) and James A Haley Veterans Hospital (13000 Bruce B Downs Blvd).
- County critical facilities view: `https://services.arcgis.com/apTfC6SUmnNfnxuF/arcgis/rest/services/Emergency_Hospital_EMS_and_Trauma_Resources_view/FeatureServer/0` - 441 points, 26 in box, has `GENERATOR` and `EZONE` fields and notes such as "Flood-prone" (AdventHealth Tampa, 3100 E Fletcher Ave, lat 28.07009, lon -82.42399). **It also exposes named contacts and phone numbers; do not display or store those fields.**
- OSM has AdventHealth Tampa, Moffitt, Haley VA, Shriners as `amenity=hospital` polygons.

### B4. Evacuation zones and shelters - verified

Evacuation zones (5 polygons, A to E):

```
GET https://services.arcgis.com/apTfC6SUmnNfnxuF/arcgis/rest/services/EvacuationZones_2026Final/FeatureServer/0/query?where=1%3D1&geometry=-82.4139,28.0587&geometryType=esriGeometryPoint&inSR=4326&spatialRel=esriSpatialRelIntersects&outFields=ZONE&returnGeometry=false&f=json
HTTP 200, ACAO: *
USF point            -> "features":[]              (not in any evacuation zone)
-82.4550, 27.9200    -> "features":[{"attributes":{"ZONE":"A"}}]   (Davis Islands, control test)
```

- **An empty result means "not in an evacuation zone", which is the normal answer for the USF area.** That is itself a report-card fact: evacuation zones are about surge, so the University Area had no zone and still flooded from rain.
- Caveat: the service description reads "Evacuation Zones Final 2026 for testing web performance". Alternatives with the same 5 polygons: on-prem `https://maps.hillsboroughcounty.org/arcgis/rest/services/InfoLayers/infoLayers/MapServer/9` (field `ZONE`), ArcGIS Online `.../EvacuationZones2026/FeatureServer/0` (not queried), and Tampa's `https://services1.arcgis.com/IbNXlmt2RVVRCZ6M/arcgis/rest/services/EvacuationZone/FeatureServer/0` (fields `EVAC_LEVEL`, `EVAC_COLOR`, `TIDE_HTS`, `TO_BE_EVAC`).

Shelters:

```
GET https://services.arcgis.com/apTfC6SUmnNfnxuF/arcgis/rest/services/Shelters_2026/FeatureServer/0/query?<BOX>
HTTP 200, 64 total, 4 in box, layer name "WebEOC Shelters", last edited about Aug 2026
{"shelter_name":"Bowers-Whitley / Muller","address":"13609 N 22nd St, Tampa, FL 33613","status":"Closed","ada_compliant":"Yes",
 "functional_needs":"No","pet_friendly":"No","capacity":"288","occupancy":0,"availability":288}
```

- Has `status`, `capacity`, `occupancy`, `availability`: looks like the feed the county updates from WebEOC during an activation. Whether it updates live in a storm is not something I could verify on a dry day.
- On-prem equivalent: `https://maps.hillsboroughcounty.org/arcgis/rest/services/InfoLayers/DisplayLayers/MapServer/10` (8 in wider box, `STATUS: "Closed"`, `PETS`, `ADA`).

---

## C. Live "as the water rises" feeds

### C1. NWS API (api.weather.gov) - verified

- Auth: none. **A `User-Agent` header is required for non-browser clients: without one I got HTTP 403.** Browsers send their own, so client-side fetch works; server-side set something like `User-Agent: storm-report-card (contact)`. All responses `ACAO: *`, GeoJSON (`application/geo+json`).
- Point metadata: `GET https://api.weather.gov/points/28.0587,-82.4139` -> 200. Grid is **TBW 72,102**, forecast zone FLZ151, county zone **FLC057**, radar KTBW.

| Call | Status | Result today |
|---|---|---|
| `https://api.weather.gov/alerts/active?point=28.0587,-82.4139` | 200, 233 B | `"features": []`, title "Current watches, warnings, and advisories for 28.0587 N, 82.4139 W" |
| `https://api.weather.gov/alerts/active?zone=FLC057` | 200 | 0 alerts for Hillsborough County |
| `https://api.weather.gov/gridpoints/TBW/72,102/forecast` | 200, 13 KB | "Today ... Isolated rain showers between noon and 3pm. Mostly sunny, with a high near 78 ... Chance of precipitation is 20%." |
| `https://api.weather.gov/gridpoints/TBW/72,102/forecast/hourly` | 200, 163 KB | 156 hourly periods with `probabilityOfPrecipitation` |
| `https://api.weather.gov/gridpoints/TBW/72,102` | 200, 280 KB | raw grid incl. `quantitativePrecipitation` (mm per 6 h), `probabilityOfTropicalStormWinds`, `probabilityOfHurricaneWinds`, `hazards` |
| `https://api.weather.gov/gridpoints/TBW/72,102/stations` | 200 | nearest: **KVDF** Vandenberg (-82.3415, 28.0198), KTPF, KTPA |
| `https://api.weather.gov/stations/KVDF/observations/latest` | 200, 5 KB | 12:35Z "Light Rain and Fog/Mist", 20.3 C, `precipitationLastHour: 0 mm` |

Gotchas: alerts are empty on a quiet day, so the demo needs a recorded or mocked Flash Flood Warning. Filter `properties.event` for "Flash Flood Warning", "Flood Warning", "Flood Advisory", "Hurricane Warning", "Tropical Storm Warning". Airport stations are 4+ miles away and `precipitationLast3Hours` / `6Hours` were null. Rate limit is unpublished; cache 60 s.

### C2. USGS stream gauges - verified

Legacy instantaneous-values service (works, `ACAO: *`, no key):

```
GET https://waterservices.usgs.gov/nwis/iv/?format=json&sites=02303800,02304500,02305851,02304000&parameterCd=00065,00060&period=PT2H
HTTP 200, 16 KB, 5.6 s (slow)
02303800 00065 ft    {"value":"27.59","qualifiers":["P"],"dateTime":"2026-11-21T07:45:00.000-05:00"}
02304000 00065 ft    {"value":"21.91", ... "2026-11-21T08:00:00.000-05:00"}
02304500 00065 ft    {"value":"21.73", ...}
02305851 00065 ft    {"value":"29.86", ...}
```

Discovery call used (bounding box about 10 miles around USF): `https://waterservices.usgs.gov/nwis/iv/?format=json&bBox=-82.60,27.90,-82.23,28.22&parameterCd=00065,00060,00045&siteStatus=active` -> 200, 104 KB, 8.2 s, 30 sites.

New OGC API (faster, also works, `ACAO: *`):

```
GET https://api.waterdata.usgs.gov/ogcapi/v0/collections/latest-continuous/items?f=json&monitoring_location_id=USGS-02303800&parameter_code=00065
HTTP 200, 0.6 s
{"properties":{"monitoring_location_id":"USGS-02303800","parameter_code":"00065","time":"2026-11-21T12:45:00+00:00","value":"27.59","unit_of_measure":"ft","approval_status":"Provisional"},
 "geometry":{"type":"Point","coordinates":[-82.40916666666668,28.08888888888889]}}
```

Gauges nearest USF (site id, name, lat, lon, reading at about 08:00 EST today). Distances are my rough straight-line estimates. Parameter 00065 = gauge height ft, 00060 = discharge cfs, 00045 = precipitation in.

| Site id | Name | Lat, lon | Approx. distance | Stage ft / flow cfs | Rain gauge (00045) |
|---|---|---|---|---|---|
| **02303800** | Cypress Creek near Sulphur Springs (at Bruce B Downs Blvd) | 28.0889, -82.4092 | 2 mi N | 27.59 / 47.3 | stale (last 2025-11-19) |
| **02304500** | Hillsborough River near Tampa (Tampa Dam) | 28.0239, -82.4276 | 2.5 mi S | 21.73 / 243 | current |
| 02304510 | Hillsborough River at Rowlett Park Dr | 28.0220, -82.4350 | 3 mi S | 0.74 / 237 | no |
| **02305851** | Curiosity Creek at 122nd Ave near Sulphur Springs | 28.0586, -82.4612 | 3 mi W | 29.86 / 0.68 | no |
| **02304000** | Hillsborough River at Fowler Ave near Temple Terrace | 28.0545, -82.3637 | 3 mi E | 21.91 / 352 | current |
| 02306000 | Sulphur Springs at Sulphur Springs | 28.0211, -82.4518 | 3.5 mi SW | 7.08 / 30.0 | stale |
| 023060013 | Hillsborough River at I-275 bridge | 28.0203, -82.4548 | 3.7 mi SW | 0.67 / - | no |
| 280311082282601 | Lake Eckles near Carrollwood | 28.0532, -82.4740 | 3.7 mi W | 29.61 / - | no |
| 02301793 | East Lake Outfall at E Chelsea St | 27.9850, -82.3718 | 5.7 mi SE | 21.93 / 1.23 | no |
| 02303350 | Trout Creek near Sulphur Springs | 28.1347, -82.3619 | 6 mi NE | 36.49 / 11.5 | stale |
| 02306500 | Sweetwater Creek near Sulphur Springs | 28.0431, -82.5118 | 6 mi W | 2.10 / 3.25 | current |
| 02303330 | Hillsborough River at Morris Bridge | 28.0986, -82.3114 | 7 mi NE | 26.41 / 290 | current |
| 02306904 | Brushy Creek near Sulphur Springs | 28.0839, -82.5250 | 7 mi W | 7.94 / - | current |
| 02303424 | Cypress Creek at County Line Rd, Wesley Chapel | 28.1713, -82.3886 | 8 mi N | 36.85 / - | no |
| 02303348 | Trout Creek at Wesley Chapel | 28.1713, -82.3622 | 8.5 mi N | 44.59 / 5.21 | no |
| 02306028 | Hillsborough River at Platt St, Tampa (tidal) | 27.9420, -82.4588 | 8.5 mi S | 11.02 / - | stale |
| 02303420 | Cypress Creek at SR 54, Worthington Gardens | 28.1872, -82.4022 | 9 mi N | 4.56 / 27.5 | no |

Also in the bbox response, further out: 02306647, 023066535, 02306950, 02306774, 02307000, 02307200, 02309848, 02303000, 02303205, 02303346, 02301745, 02301750, 023060003.

Gotchas:

- **There is no gauge inside the Duck Pond basin.** The closest proxies for University Area flooding are Curiosity Creek (02305851) and Cypress Creek (02303800). Rivers rising is a different mechanism from the pump-failure ponding.
- Gauge height is relative to each gauge's local datum, not NAVD88 and not depth of water on a street.
- All values are provisional (`"qualifiers":["P"]`). Legacy service is slow (5 to 8 s); cache server-side or use the OGC API. USGS has said the legacy service will be retired; it still worked today.

NOAA National Water Prediction Service (adds flood-stage thresholds; no key; `ACAO: *`):

```
GET https://api.water.noaa.gov/nwps/v1/gauges?bbox.xmin=-82.60&bbox.ymin=27.90&bbox.xmax=-82.23&bbox.ymax=28.22&srid=EPSG_4326
HTTP 200, 34 KB, 33 gauges
GET https://api.water.noaa.gov/nwps/v1/gauges/FOWF1
HTTP 200: FOWF1 = USGS 02304000, flood categories action 25 ft, minor 29, moderate 31, major 33; observed 21.91 ft; forecast "fcst_not_current"
GET https://api.water.noaa.gov/nwps/v1/gauges/FOWF1/stageflow   -> 200, 467 KB, 2,863 observed points, 0 forecast points today
```

- NWS ids: FOWF1 (Fowler Ave), SULF1 (Cypress Creek at Bruce B Downs), CURF1 (Curiosity Creek at 122nd), TMTF1 (Tampa Dam), MORF1 (Morris Bridge).
- **Only FOWF1 has flood-stage thresholds.** SULF1, CURF1 and TMTF1 return -9999 for every category, so you have to define your own thresholds for those.
- Local quirk: my Windows curl got no response from this host until I added `--ssl-no-revoke` (certificate revocation check). Not a browser issue. The first call without the bbox to `/gauges/HTTF1` returned 404 because that id does not exist.

County staff gauges (lake levels), listed but not queried: `https://maps.hillsboroughcounty.org/arcgis/rest/services/Staffgauge/StaffGaugeReadings/MapServer` (layer 0 StaffGauges, table 1 Lake Levels).

### C3. NOAA tides / storm surge - works, not relevant here

`GET https://api.tidesandcurrents.noaa.gov/api/prod/datagetter?date=latest&station=8726607&product=water_level&datum=MHHW&time_zone=gmt&units=english&format=json&application=hackathon` -> HTTP 200, `ACAO: *`, `{"metadata":{"id":"8726607","name":"Old Port Tampa","lat":"27.8578","lon":"-82.5528"},"data":[{"t":"2026-11-21 13:18","v":"-0.682",...}]}`.

Say this in the app rather than show it: USF is about 10 miles inland, the campus-area gauges read 20+ ft on their datums, and the address is in no evacuation zone. University Area flooding in Milton was rainfall plus drainage failure, not surge. Skip.

### C4. Real-time rainfall - verified options

| Source | Call | Result | Notes |
|---|---|---|---|
| MRMS radar rainfall tiles (Iowa Environmental Mesonet) | `https://mesonet.agron.iastate.edu/cache/tile.py/1.0.0/q2-p24h/{z}/{x}/{y}.png` | HTTP 200 PNG, `ACAO: *` (tested z10) | drop-in raster overlay; products seen in the WMS capabilities: `mrms_p1h`, `mrms_p24h`, `mrms_p48h`, `mrms_p72h` at `https://mesonet.agron.iastate.edu/cgi-bin/wms/us/mrms_nn.cgi` |
| Open-Meteo point rainfall | `https://api.open-meteo.com/v1/forecast?latitude=28.0587&longitude=-82.4139&current=precipitation,rain&hourly=precipitation&past_hours=6&forecast_hours=12&timezone=America%2FNew_York` | HTTP 200, 891 B, `ACAO: *`, `"current":{"time":"2026-11-21T08:30","interval":900,"precipitation":0.00}` | no key; model-based, 15-min current; free for non-commercial use (terms not re-read today) |
| USGS rain gauges | parameter `00045` at 02304000, 02304500, 02303330, 02306500 | 0.00 in today | real tipping buckets 2.5 to 7 miles away; several others are stale |
| NWS station obs | `stations/KVDF/observations/latest` | `precipitationLastHour` | airport, 4.5 miles |
| NWS local storm reports, historical (IEM) | `https://mesonet.agron.iastate.edu/geojson/lsr.geojson?wfo=TBW&sts=2024-10-09T00:00Z&ets=2024-10-11T12:00Z` | HTTP 200, 233 KB, 425 reports (160 tropical cyclone, 73 rain, 16 flood) | only 5 within about 10 miles of USF, all wind/tree damage. Not a flood-report source for this neighbourhood |

Raw MRMS GRIB2 from NOAA/AWS was not tested; the IEM tiles avoid GRIB decoding.

### C5. Power outages (TECO) - no public feed

- The outage map lives at `https://outage.tecoenergy.com/` (HTTP 200; tampaelectric.com/outagemap redirects there).
- The page loads its data from `https://outage-data-prod-hrcadje2h9aje9c9.a03.azurefd.net/api/v1/config`. A plain GET returned **HTTP 401 `{"message":"Access denied.","status":"unauthorized"}`**. I stopped there; it is an undocumented internal API with no published terms.
- A third-party catalogue (apis.io) lists a "TECO Energy Outages API" behind developer.tecoenergy.com that requires authentication; not verified.
- Conclusion: **no free, documented, no-wait outage feed.** For the pump-power story, simulate it: a toggle "pump station loses power" on the Duck Pond East point. Link out to the TECO map.

### C6. Road closures

- **FL511: key required.** `GET https://fl511.com/api/v2/get/event?format=json` -> HTTP 400 `<Error><Message>Invalid Key</Message></Error>` (same with a dummy key). I could not open the developer documentation: `https://fl511.com/developers/doc` gave a connection reset in both curl and WebFetch, `/developers/help` gave 404, and two web searches found no page describing how keys are issued. Whether the key is instant is **unknown**. Skip unless someone already has one.
- County road closures layer: `https://services.arcgis.com/apTfC6SUmnNfnxuF/arcgis/rest/services/RoadClosure_view/FeatureServer/0` - HTTP 200, 834 polylines, 13 in box, fields `Active_Planned`, `Closure_Type`, `LocDesc` (sample: "Bruce B. Downs Blvd. / E. Bearss Ave. Between Cove Bend Dr. And N 30th Street"). **Last edited June 2023: stale, not a live feed.**
- `Hurricane_Debby_Reported_Road_Closures/FeatureServer/0`: 10 points, none in the box.
- Tampa police traffic advisories, past 4 hours: `https://arcgis.tampagov.net/arcgis/rest/services/CallsforService/FirePoliceCalls/MapServer/0` - listed in the service, not queried.
- Best live closure signal for the city side is the **Street_Flooding_view** layer in A4 (open reports with "NOT PASSABLE" notes).
- Waze for Cities: partner programme for government agencies and road operators; requires an application with a work email. No approval time is published. Not available today.

---

## D. Resident reports

### D1. What exists (all verified unless stated)

| Dataset | Endpoint | Coverage near USF | Verdict |
|---|---|---|---|
| Tampa police street-flooding reports 2016 to Dec 2022 | `Tampa_Flooding_Spots/FeatureServer/1` (A4) | 159 points in box | Use. Third-party hosted copy; download once |
| Tampa live street flooding | `Street_Flooding_view/FeatureServer/0` (A4) | 0 today | Use as live layer |
| Tampa Stormwater Advisory List | `UtilityStorm/MapServer/14` (A4) | 264 "known flooding" + 76 "drainage inadequate" parcels in box | Use. City limits only |
| County 2024 damage assessments | `HC_DamageAssessments2024_PublicView/FeatureServer/24` (A4) | 547 Milton flood points in box | Use. Covers the unincorporated University Area, which the city layers do not |
| Tampa Helene/Milton damage points | `HurricaneHeleneandMilton/FeatureServer/2` (A4) | 128 in box | Optional |
| SWFWMD flood photo locations | `FloodPhotos/MapServer/0` (A4) | 37 in box, 28 from 2024 | Optional; no images retrievable |
| **FEMA NFIP claims (OpenFEMA)** | see below | by census block group | Use for a "claims near you" number |
| County "Unmet Needs" survey | `https://services.arcgis.com/apTfC6SUmnNfnxuF/arcgis/rest/services/UnmetNeedsReport_Geocoded_Master_View/FeatureServer/11` | 3,039 points, 96 in box | **Do not use.** It is publicly readable but contains street addresses with self-reported household income, insurance status and needs. Sensitive personal data |
| County "At Your Service" flooding requests | hcfl.gov "Report street flooding" page | - | No public dataset or API found. Intake only (online form or Public Works 813-635-5400) |
| Tampa 311 / "Tampa Connect" | `https://arcgis.tampagov.net/arcgis/rest/services/TampaConnect` | - | The folder exists but is **empty**. No open flood-complaint dataset found beyond the layers above |
| mPING | `https://mping.ou.edu/mping/api/v2/reports?category=Flood` | - | HTTP 401 "Authentication credentials were not provided." Needs an API key by request; not instant as far as I could tell (not verified) |
| CrowdHydrology | http://www.crowdhydrology.com/ | - | Site loads (200); I found no evidence of Florida stations and did not locate an API. Skip |
| Waze for Cities | - | - | Partners only (C6) |
| "FloodGeo" | - | - | I found no such public dataset. Unverified name; skip |

NFIP claims, working call (note: the old `v2/FimaNfipClaims` path now returns **404**; the dataset is `v3/NfipClaims` and the tract field is now `censusGeoid`, a 12-digit block group):

```
GET https://www.fema.gov/api/open/v3/NfipClaims?$filter=countyCode%20eq%20%2712057%27%20and%20yearOfLoss%20eq%202024%20and%20reportedZipCode%20eq%20%2733612%27&$select=censusGeoid,dateOfLoss,waterDepth,exteriorWaterDepth,interiorWaterDepth,ratedFloodZone,floodEvent,causeOfDamage,amountPaidOnBuildingClaim,reportedZipCode,latitude,longitude&$top=1000&$count=true
HTTP 200, 55 KB, ACAO: *, "count": 166
{"censusGeoid":"120570002021","dateOfLoss":"2024-10-09T00:00:00.000Z","waterDepth":0,"exteriorWaterDepth":30,"interiorWaterDepth":0,
 "ratedFloodZone":"AE","floodEvent":"Hurricane Milton","causeOfDamage":"4","amountPaidOnBuildingClaim":63562.01,"reportedZipCode":"33612","latitude":28,"longitude":-82.4}
```

- ZIP 33612, 2024: 166 claims, **163 from Hurricane Milton**; rated zones AE 110, **X 30**, A 26. Top block groups 120570108161 (38) and 120570108141 (31).
- Gotchas: latitude/longitude are rounded to 0.1 degree (useless for mapping); join on `censusGeoid` (first 11 digits = tract; the USF address is in tract 12057010900 per the Census geocoder). Claims exist only where people had flood insurance, so zone X renters are heavily under-counted. Data last refreshed 2026-08-04. Max 1000 rows per call, page with `$skip`. No key. `exteriorWaterDepth` is in inches (not verified against the data dictionary today).

### D2. What a from-scratch report feature needs

Minimum for a demo:

- Fields: location (map tap or geocoded address, stored as lat/lon), time observed, depth category in plain terms (ankle / knee / car door / in the house), road passable yes/no, optional photo, free-text note.
- Storage: one table with a geometry or lat/lon pair (Supabase/Postgres, Firebase, or SQLite on the backend). Insert plus "reports within N metres in the last N hours" query.
- Trust controls: rate limit per device, snap to nearest road segment or address point, show report age, expire after a few hours, cluster instead of trusting a single report, and label everything "unverified resident report".
- Privacy: do not store names or exact unit numbers; blur to the block or road segment when displaying.
- Seeding for the demo: say clearly which points are real historical records (Tampa street-flooding points, county Milton damage points) and which are demo entries. Do not present seeded entries as live resident reports.
- Use in the model: a "not passable" report on a segment is a hard block in routing; a depth report calibrates the depth estimate nearby.

---

## E. Address search, geocoding, basemap

### E1. Geocoders - all called with "4202 E Fowler Ave, Tampa, FL 33620"

| Geocoder | Working call | Status | CORS | Result | Gotchas |
|---|---|---|---|---|---|
| **Hillsborough County composite locator** | `https://maps.hillsboroughcounty.org/arcgis/rest/services/Geocoding/Composite_Address_Locator_Overall/GeocodeServer/findAddressCandidates?SingleLine=4202%20E%20Fowler%20Ave%2C%20Tampa%2C%20FL%2033620&outSR=4326&maxLocations=3&f=json` | 200, 0.2 s | echoes Origin | 3 candidates, score 94.26, e.g. `{"address":"4202 E Fowler Ave, Tampa, 33620","location":{"x":-82.4139475,"y":28.0619367}}` | covers city and unincorporated. One street address can return several points (campus has many address points) |
| **County autocomplete** | `.../Composite_Address_Locator_Overall/GeocodeServer/suggest?text=4202%20E%20Fowl&f=json` | 200, 0.08 s | echoes Origin | `{"suggestions":[{"text":"4202 E Fowler Ave, Tampa","magicKey":"..."},{"text":"4202 E Fowler Ave, Thonotosassa",...}]}` | pass `magicKey` back to `findAddressCandidates` |
| County address points (authoritative, 753,982 points) | `https://services.arcgis.com/apTfC6SUmnNfnxuF/arcgis/rest/services/Site_Address_Point/FeatureServer/0/query?where=FULLADDR+LIKE+%274202+E+Fowler%25%27&outFields=FULLADDR,ZIP,MUNICIPALITY,FOLIO,PLACENAME&outSR=4326&resultRecordCount=3&f=geojson` | 200, 0.9 s | `*` | points with `MUNICIPALITY` ("T" = Tampa, "H" = unincorporated Hillsborough) and `FOLIO` | **This tells you city vs county for an address in one call.** 48,779 points in the box. Edited daily |
| City of Tampa locator | `https://arcgis.tampagov.net/arcgis/rest/services/Locators/CompositeLocator/GeocodeServer/findAddressCandidates?SingleLine=4202%20E%20Fowler%20Ave&outSR=4326&maxLocations=3&f=json` (also `/suggest?text=`) | 200 | echoes Origin | score 100, `-82.411785, 28.056267` | city addresses only; shows city as "T" |
| US Census Geocoder | `https://geocoding.geo.census.gov/geocoder/locations/onelineaddress?address=4202%20E%20Fowler%20Ave%2C%20Tampa%2C%20FL%2033620&benchmark=Public_AR_Current&format=json` | 200, 0.3 to 2.4 s | **no ACAO header: browser fetch is blocked** | `"matchedAddress":"4202 E FOWLER AVE, TAMPA, FL, 33612","coordinates":{"x":-82.41419794706,"y":28.054512746238}` | use from the backend, or JSONP (`format=jsonp&callback=cb` returned 200 `/**/cb({...})`). Interpolated along the street, not rooftop. The `/geographies/` variant with `vintage=Current_Current&layers=Census%20Tracts` returns tract GEOID 12057010900 |
| Nominatim (OSM) | `https://nominatim.openstreetmap.org/search?q=4202%20E%20Fowler%20Ave%2C%20Tampa%2C%20FL%2033620&format=jsonv2&limit=2&countrycodes=us&addressdetails=1` | 200, 0.9 s | `*` | "University of South Florida, 4202, East Fowler Avenue, Tampa ...", lat 28.0599999, lon -82.4138362 | Policy (read today): absolute max **1 request per second** for the whole app, identifying User-Agent or Referer required, **autocomplete is prohibited**, attribution required, cache results. ODbL |
| Photon (komoot) | `https://photon.komoot.io/api/?q=4202%20E%20Fowler%20Ave%20Tampa%20FL&lat=28.0587&lon=-82.4139&limit=3` | 200, 0.8 s | `*` | GeoJSON; first hit USF, second Yuengling Center | built for autocomplete, no key. Usage terms not re-read today; public demo server, be gentle. Residential house-number coverage in OSM is patchy |

Recommendation: county `suggest` + `findAddressCandidates` for search, then one `Site_Address_Point` point-in-radius query for jurisdiction. No keys, CORS works, rooftop-level points, and it handles the unincorporated University Area that the Tampa locator does not.

### E2. Basemap tiles

| Source | Tested URL | Result | Key / card | Terms and attribution |
|---|---|---|---|---|
| **OpenFreeMap** (vector, MapLibre) | style `https://tiles.openfreemap.org/styles/liberty` (also `/bright`, `/positron`); a vector tile fetched from the TileJSON | style 200 (43 KB), tile 200, `ACAO: *` | none, no registration | quick-start page read today: no key or sign-up mentioned; it shows attribution "OpenFreeMap © OpenMapTiles Data from OpenStreetMap"; donation-funded, no SLA. I did not read the full Terms of Service page |
| CARTO basemaps | `https://basemaps.cartocdn.com/gl/positron-gl-style/style.json`, raster `https://a.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png` | 200, `ACAO: *` | none | terms not checked today; attribution "© OpenStreetMap contributors © CARTO". Treat as fallback |
| OSM standard raster | `https://tile.openstreetmap.org/{z}/{x}/{y}.png` | 200, `ACAO: *` | none | policy read today: HTTPS URL only, visible attribution, valid Referer from browsers, no bulk download or prefetch, no offline, **no SLA, may be blocked without notice**. Acceptable for a demo with light traffic |
| Esri World Imagery | `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}` | 200 JPEG, `ACAO: *` (needed `--ssl-no-revoke` on my curl) | none to fetch | Esri terms not checked today; nice for showing ponds and ditches |
| County aerials | `https://maps.hillsboroughcounty.org/arcgis/rest/services/AerialsNew/Aerials_2025/ImageServer` | listed, not fetched | none | 2025 county imagery exists |
| Stadia Maps | `https://tiles.stadiamaps.com/tiles/alidade_smooth/14/4441/6835.png` | **401 without a key** | free plan, no card (per search results, not verified on their site): 200,000 credits/month, non-commercial/evaluation | account sign-up needed |
| MapTiler | not called | - | free plan, no card (per search results): 5,000 map sessions and 100,000 requests/month, logo must stay | account sign-up needed |
| Protomaps hosted API | `https://api.protomaps.com/tiles/v4/14/4441/6835.mvt` | **403 without a key** | key required; free for non-commercial (per search results) | sign-up needed |
| USGS National Map | `https://basemap.nationalmap.gov/arcgis/rest/services/USGSTopo/MapServer/tile/...` | no response from my machine (curl 000 twice) | - | could not verify |

---

## Ranked recommendation: minimal set for a 7-hour build

Fetch-once-and-commit (static files, do this in the first 20 minutes; these are data downloads, not code):

1. **OSM road graph via Overpass** (B1). 4.1 MB, allow a minute, have the mail.ru mirror as fallback. Everything in routing depends on it.
2. **County stormwater**: pump stations (`HC_STORMWATER/MapServer/4`, 5 points), catch basins with condition and blockage (`MaintStarStormWaterOnly/MapServer/1`, 1,325, two pages), channels (`/2`, 621), ponds (`/9`, 106). Skip the 2,207 pipes unless you draw them.
3. **City stormwater**: inlets (`UtilityStorm/MapServer/5`, 1,110), detention areas (`/2`, 37), open drains (`/8`, 258), pump stations from `/7`, and the **Stormwater Advisory List** (`/14`, 1,016 parcels, 390 KB).
4. **Evidence of past flooding**: county 2024 damage assessments filtered to Milton + Flood (547 in box), Tampa historical street-flooding points (159 in box).
5. **Rescue**: county `DisplayLayers/MapServer/2` fire stations (all jurisdictions, has BOAT) and `/8` hospitals.

Live calls from the app:

6. **County geocoder** `suggest` + `findAddressCandidates`, then `Site_Address_Point` for city-vs-county (E1).
7. **NWS alerts + hourly forecast** for the point (C1). Remember the User-Agent on the server side.
8. **USGS gauges** 02305851 (Curiosity Creek), 02303800 (Cypress Creek), 02304000 (Fowler Ave, the only one with NWS flood stages: action 25 / minor 29 / moderate 31 / major 33 ft), via the OGC API (C2).
9. **Tampa Street_Flooding_view** as the live closure layer (A4), plus your own resident-report table.
10. **OpenFreeMap** style in MapLibre, IEM MRMS 1-hour rainfall tiles as an overlay (C4).

Nice to have if time allows: SWFWMD floodplain polygons simplified (602 KB), evacuation zone point check (expect "none"), shelters `Shelters_2026`, NFIP claims count per block group, county subbasins for "which basin drains your street".

Skip:

- TECO outage data (401, no public feed) - simulate pump power loss instead.
- FL511 (key required, docs unreachable today), Waze for Cities (partners only), mPING (401), CrowdHydrology, "FloodGeo" (not found).
- NOAA tides and surge (inland; not the mechanism here).
- Geofabrik extract, Tampa/county centrelines for routing, the 23-layer StormNetworkViewer duplicate.
- Stadia / MapTiler / Protomaps (sign-ups for no gain over OpenFreeMap).
- Census geocoder in the browser (no CORS), Nominatim for autocomplete (prohibited).
- County RoadClosure_view (last edited June 2023), Unmet Needs survey (sensitive personal data).
- Any flood-depth layer from SWFWMD or county models (none found as a public service).

## What failed or is uncertain (summary)

- hcfl.gov Milton press releases about Duck Pond: both URLs now 404, no Wayback snapshot found. Outage times, 50-90 cfs capacity and 25-year design figure come from search snippets only.
- Duck Pond station coordinates: from the county GIS record "DUCK POND EAST" whose own note says "STATION NEED GPS". The link between that record and the station in the news is inferred from the name.
- Which Tampa pump station is "Curiosity Creek": the city layer has no names.
- Overpass mirrors kumi.systems and private.coffee timed out; main instance took 40 to 45 s.
- FL511 developer docs unreachable; key issuance time unknown.
- TECO: internal API returns 401; no public feed confirmed.
- OpenFEMA `v2/FimaNfipClaims` is gone (404); `v3/NfipClaims` works with renamed fields.
- SWFWMD flood photos: locations only, attachments empty.
- Shelters_2026 and Street_Flooding_view look like live operational feeds, but I could only observe them in their idle state.
- Licence text for county, city and SWFWMD services, and terms for CARTO, Esri, Photon, Open-Meteo, Stadia, MapTiler, Protomaps were not read from the providers' own pages today. Nominatim, OSM tile and OpenFreeMap quick-start pages were.
- USGS National Map basemap and Geofabrik size: could not verify.
- Gauge distances from USF are rough estimates.
- `api.water.noaa.gov` and `server.arcgisonline.com` needed `--ssl-no-revoke` in Windows curl; unrelated to browser use.
- During testing one SWFWMD floodplain download came to 12.4 MB (over the 5 MB guideline); it was deleted and replaced by the simplified 602 KB query above.
