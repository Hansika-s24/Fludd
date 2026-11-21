# 02 - Flood and elevation data for the USF "Storm report card"

Research date: 2026-11-21, all calls made between about 13:10 and 13:45 UTC from a Windows machine with curl 8.2.1.
Everything marked VERIFIED was actually called today; the response shown is the real one, trimmed.
Anything I could not make respond is listed in section F, with what I tried.

Reference geometry used throughout:

- USF centre: lat 28.0587, lon -82.4139
- 4 x 4 mile box (2 miles each way): `-82.4467,28.0297,-82.3811,28.0877` (xmin,ymin,xmax,ymax, WGS84)
- University Area test point that sits in a mapped flood zone: lat 28.064686, lon -82.431385

Two demo points that give contrasting results (verified below):

| Point | FEMA zone | 3DEP elevation |
|---|---|---|
| USF centre 28.0587,-82.4139 | X, "AREA OF MINIMAL FLOOD HAZARD" | 16.78 m / 55.05 ft |
| University Area 28.064686,-82.431385 | AE, BFE 36.8 ft NAVD88 | not sampled at this exact point (call reset); nearby samples 11.9 to 13.9 m |

## 0. Read this first

1. **The best "what actually flooded" source is not federal.** Hillsborough County publishes a public ArcGIS FeatureServer of 2024 damage assessment points. In the 4 x 4 mile box it has 905 points, 848 tagged Hurricane Milton, 548 with primary cause "Flood". CORS is open. See C5.
2. **USGS high-water marks are a dead end for this area.** The STN database holds only 3 Milton HWMs in all of Florida, none in Hillsborough County. See C1.
3. **The standard USGS "1 m DEM" product does not exist at USF**, and the 3DEP dynamic service there is 2011 lidar at 1/9 arc-second (about 3 m). But a brand-new lidar DEM (2.5 ft pixels, flown January 2025, so after Milton) was published to the USGS bucket on 2026-11-05. See B3.
4. **The Milton rainfall near USF was 11.6 to 12.3 inches in about 24 hours**, which is the NOAA Atlas 14 100-year 24-hour depth for that exact point (11.9 in). See D.
5. **Network gotcha seen today:** from this machine, TLS connections to several USGS hosts (`elevation.nationalmap.gov`, `tnmaccess.nationalmap.gov`, sometimes `epqs.nationalmap.gov`) and to `gis.earthdata.nasa.gov` were reset roughly one time in three. Retrying fixed every one. `prd-tnm.s3.amazonaws.com` failed in curl with a Windows certificate revocation-check error until I added `--ssl-no-revoke`. Build in retries and cache everything you fetch.

## A. FEMA flood zones (NFHL)

### A1. NFHL Flood Hazard Zones - VERIFIED

| | |
|---|---|
| Service | `https://hazards.fema.gov/arcgis/rest/services/public/NFHL/MapServer` (ArcGIS Server 11.1) |
| Layer | **28 = "Flood Hazard Zones"** (polygons). Other useful ids: 3 FIRM Panels, 16 Base Flood Elevations, 27 Flood Hazard Boundaries, 1 LOMRs, 34 LOMAs |
| Auth | none |
| Formats | JSON, geoJSON, PBF |
| Native SR | WKID 4269 (NAD83). Pass `inSR=4326` and `outSR=4326` |
| maxRecordCount | 2000, pagination supported |
| Licence | US Government work. Service `copyrightText` is empty. Suggested line: "Flood zones: FEMA National Flood Hazard Layer (NFHL)" |
| CORS | Browser can call it directly. Response echoes the Origin (`Access-Control-Allow-Origin: http://localhost:3000`, `Access-Control-Allow-Credentials: true`). OPTIONS preflight returned 200 |

Fields that matter:

| Field | Meaning | Values seen in the USF box |
|---|---|---|
| `FLD_ZONE` | zone code | `AE`, `A`, `X` |
| `ZONE_SUBTY` | subtype | `AREA OF MINIMAL FLOOD HAZARD`, `0.2 PCT ANNUAL CHANCE FLOOD HAZARD`, `FLOODWAY`, or null |
| `SFHA_TF` | in Special Flood Hazard Area (1% annual chance) | `T` / `F` |
| `STATIC_BFE` | base flood elevation, feet | 29.5 to 45; `-9999` means none |
| `V_DATUM` | vertical datum of the BFE | `NAVD88` |
| `DEPTH` | depth for AO zones | `-9999` here |

Classification rule:

- `SFHA_TF = 'T'` : 1% annual chance (A, AE; elsewhere also AH, AO, VE)
- `FLD_ZONE = 'X'` and `ZONE_SUBTY` starts with `0.2 PCT` : shaded X, 0.2% annual chance
- `FLD_ZONE = 'X'` and `ZONE_SUBTY = 'AREA OF MINIMAL FLOOD HAZARD'` : unshaded X
- `ZONE_SUBTY = 'FLOODWAY'` : regulatory floodway inside AE

Other subtype strings exist elsewhere in the country (levee-related, for example). I only observed the ones above in this box, so match with `LIKE '0.2 PCT%'` rather than exact equality.

**Point query (HTTP 200, 844 bytes, 0.34 s):**

```
https://hazards.fema.gov/arcgis/rest/services/public/NFHL/MapServer/28/query?geometry=-82.4139,28.0587&geometryType=esriGeometryPoint&inSR=4326&spatialRel=esriSpatialRelIntersects&outFields=FLD_ZONE,ZONE_SUBTY,SFHA_TF,STATIC_BFE,DFIRM_ID,FLD_AR_ID&returnGeometry=false&f=json
```

```json
{"features":[{"attributes":{"FLD_ZONE":"X","ZONE_SUBTY":"AREA OF MINIMAL FLOOD HAZARD","SFHA_TF":"F","STATIC_BFE":-9999.0,"DFIRM_ID":"12057C","FLD_AR_ID":"12057C_7396"}}]}
```

Same query at the University Area point (`geometry=-82.431385,28.064686`):

```json
[{"attributes":{"FLD_ZONE":"AE","ZONE_SUBTY":null,"SFHA_TF":"T","STATIC_BFE":36.8,"V_DATUM":"NAVD88","DEPTH":-9999.0}}]
```

**Box query.** Count call returned `{"count":90}`. Breakdown of the 90 polygons: 41 AE, 37 A, 10 X minimal, 1 X 0.2%, 1 AE floodway.

Gotcha: the unsimplified GeoJSON for the box is **7.0 MB**, because the big X polygons extend far outside the box. This filtered and simplified version is **174 KB** (HTTP 200, 0.84 s, 80 features):

```
https://hazards.fema.gov/arcgis/rest/services/public/NFHL/MapServer/28/query?geometry=-82.4467,28.0297,-82.3811,28.0877&geometryType=esriGeometryEnvelope&inSR=4326&spatialRel=esriSpatialRelIntersects&where=SFHA_TF%3D%27T%27%20OR%20ZONE_SUBTY%20LIKE%20%270.2%25%27&outFields=FLD_ZONE,ZONE_SUBTY,SFHA_TF,STATIC_BFE&outSR=4326&geometryPrecision=5&maxAllowableOffset=0.00003&f=geojson
```

Treat "not in any returned polygon" as zone X minimal, which avoids downloading the X polygons at all.

Other verified calls on the same service:

- Raster overlay, HTTP 200, 32 KB PNG (one connection reset first, fine on retry):
  `https://hazards.fema.gov/arcgis/rest/services/public/NFHL/MapServer/export?bbox=-82.4467,28.0297,-82.3811,28.0877&bboxSR=4326&imageSR=3857&size=800,800&layers=show:28&format=png32&transparent=true&f=image`
- WMS capabilities, HTTP 200, 64 KB: `https://hazards.fema.gov/arcgis/services/public/NFHLWMS/MapServer/WMSServer?request=GetCapabilities&service=WMS`
- FIRM panel at USF (layer 3): panel `12057C0216H`, effective **2008-08-28**. The flood map for campus is 18 years old, which is worth saying on the report card.

Gotchas: layer 28 only draws in `export` below 1:36,112 scale (queries work at any scale). `STATIC_BFE` is `-9999`, not null, when absent.

### A2. Backup: Esri Living Atlas copy - VERIFIED

```
https://services.arcgis.com/P3ePLMYs2RVChkJx/arcgis/rest/services/USA_Flood_Hazard_Reduced_Set_gdb/FeatureServer/0/query?geometry=-82.431385,28.064686&geometryType=esriGeometryPoint&inSR=4326&spatialRel=esriSpatialRelIntersects&outFields=*&returnGeometry=false&f=json
```

Returned `FLD_ZONE: AE, SFHA_TF: T, STATIC_BFE: 37, esri_symbology: "1% Annual Chance Flood Hazard"`. CORS `*`. Differences from FEMA: it holds only SFHA and 0.2% polygons (the USF centre returns an empty feature list), and BFE is rounded (37 against FEMA's 36.8). Use only if `hazards.fema.gov` is down.

## B. Elevation (USGS 3DEP)

### B1. Point elevation, EPQS - VERIFIED

```
https://epqs.nationalmap.gov/v1/json?x=-82.4139&y=28.0587&wkid=4326&units=Meters&includeDate=true
```

HTTP 200, 224 bytes:

```json
{"location":{"x":-82.4139,"y":28.0587,"spatialReference":{"wkid":4326,"latestWkid":4326}},"locationId":0,"value":"16.780120850","rasterId":14553,"resolution":0.0000308641987179478,"attributes":{"AcquisitionDate":"1/1/2011"}}
```

With `units=Feet` the value is `55.052891689514`.

| | |
|---|---|
| Auth | none |
| CORS | `Access-Control-Allow-Origin: *` |
| Datum | NAVD88 |
| Source at USF | `resolution` 0.0000309 degrees = 1/9 arc-second (about 3.4 m), acquisition 2011 |
| Licence | USGS, public domain. "Elevation: USGS 3D Elevation Program" |

Gotchas:

- `value` came back as a **string** with `units=Meters` and a **number** with `units=Feet`. Parse defensively.
- One point per request. For many points use `getSamples` in B2.
- A point with no data returns HTTP 200 with a plain-text body (`Call failed. [Failed cloud operation: ...]`), not JSON and not an error status.
- 2 of 5 calls today were reset at the TLS handshake; retries worked.

### B2. 3DEP dynamic ImageServer - VERIFIED

Service: `https://elevation.nationalmap.gov/arcgis/rest/services/3DEPElevation/ImageServer` (ArcGIS 11.3)

| | |
|---|---|
| Pixel type | F32, metres, NAVD88, 1 band |
| Service SR | 3857. Nominal pixel size 1 m, but see the warning below |
| Max export | 8000 x 8000 px |
| Auth | none |
| CORS | `Access-Control-Allow-Origin: *` on `exportImage` |
| Attribution | service text: "USGS National Map 3D Elevation Program (3DEP). October 27, 2026." |
| Raster functions | Hillshade Gray, Hillshade Elevation Tinted, Hillshade Multidirectional, Slope Degrees, Slope Map, Aspect Degrees, Contour 25, and others |

**Warning: this service is not 1 m at USF.** `identify` with `returnCatalogItems=true` at the USF centre lists the source rasters. The best one is `ned19_n28x25_w082x50_fl_nrthrnhillsbourough_2011` (1/9 arc-second, lidar flown 2011-01-29 to 2011-02-14), then the 1/3 and 1 arc-second seamless tiles. No 1 m source is in the mosaic there. Asking for 1 m pixels just resamples 3 m data.

Tiny GeoTIFF (HTTP 200, 131,912 bytes, `image/tiff`, 0.25 s). Decoded: 120 x 200 float32, min 8.81, max 19.31, mean 15.32 m, GeoTIFF tags present, nodata -9999:

```
https://elevation.nationalmap.gov/arcgis/rest/services/3DEPElevation/ImageServer/exportImage?bbox=-82.4189,28.0557,-82.4089,28.0617&bboxSR=4326&imageSR=4326&size=200,120&format=tiff&pixelType=F32&noData=-9999&interpolation=RSP_BilinearInterpolation&f=image
```

Whole 4 x 4 mile box in UTM 17N metres (HTTP 200, 4.2 MB, 4.1 s). Decoded: 1000 x 1000 float32, 6.52 m pixels, no nodata, **min 3.24 m, max 27.06 m, median 12.32 m** (5th percentile 6.92 m, 95th 21.89 m):

```
https://elevation.nationalmap.gov/arcgis/rest/services/3DEPElevation/ImageServer/exportImage?bbox=-82.4467,28.0297,-82.3811,28.0877&bboxSR=4326&imageSR=26917&size=1000,1000&format=tiff&pixelType=F32&noData=-9999&interpolation=RSP_BilinearInterpolation&f=image
```

Variants, all verified:

- `format=lerc` for the same request: 1.76 MB instead of 4.2 MB.
- `f=json` instead of `f=image` returns `{"href":"https://elevation.nationalmap.gov/arcgis/rest/directories/elevation_output/....tif","width":1000,"height":1000,"extent":{...}}`. It returned a 502 once and worked on retry.
- For native 3 m, use `size=2146,2125` (about 18 MB as uncompressed TIFF). I did not download that size.
- Hillshade picture for the map, HTTP 200, 259 KB PNG: add `&format=png&renderingRule={"rasterFunction":"Hillshade Elevation Tinted"}` (URL-encode the JSON).
- Multi-point sampling, HTTP 200:
  `.../ImageServer/getSamples?geometry={"points":[[-82.4139,28.0587],[-82.4250,28.0640],[-82.4300,28.0700]],"spatialReference":{"wkid":4326}}&geometryType=esriGeometryMultipoint&returnFirstValueOnly=true&f=json`
  returned values 16.780, 11.945 and 13.863 m.
- WCS capabilities, HTTP 200: `https://elevation.nationalmap.gov/arcgis/services/3DEPElevation/ImageServer/WCSServer?request=GetCapabilities&service=WCS`

Gotcha: `identify` needs the geometry as JSON with its own `spatialReference`; passing `sr=4326` separately returns `NoData`.

### B3. Lidar tiles: what exists at USF

**The National Map API (TNM Access).** `https://tnmaccess.nationalmap.gov/api/v1/datasets` works (HTTP 200, 42.7 KB). The **products endpoint is broken today**: every query returned HTTP 200 with this body:

```json
{"error": "Expecting value: line 1 column 1 (char 0)", "showToast": true, "toastMessage": "Expecting value: line 1 column 1 (char 0)", "toastType": "warning"}
```

Tried six datasets ("Digital Elevation Model (DEM) 1 meter", "Seamless 1-m DEM (S1M)", "Original Product Resolution (OPR) Digital Elevation Model (DEM)", the 1/9 and 1/3 arc-second NED sets, "Lidar Point Cloud (LPC)") with `bbox=`, with `polygon=`, with `+` and `%20` encoding, and with `prodFormats=GeoTIFF`. Same error each time. So I listed the public bucket directly, which is where TNM download URLs point anyway.

**Standard 1 m DEM: not available at USF.** The box falls in UTM 17N tiles `x35y311` and `x36y311` (box extent is E 357,788 to 364,310, N 3,101,250 to 3,107,772). Listing `https://prd-tnm.s3.amazonaws.com/?list-type=2&prefix=StagedProducts/Elevation/1m/Projects/FL_...` shows 33 Florida projects and none contains those two tiles:

| Project | Nearest tiles | Covers USF box? |
|---|---|---|
| `FL_2018PascoCounty_C22` | `USGS_1M_17_x35y312_FL_2018PascoCounty_C22.tif` (111.4 MB), `USGS_1M_17_x36y312_FL_2018PascoCounty_C22.tif` (125.1 MB) | No, these start at northing 3,110,000, about 1.4 miles north of the box edge |
| `FL_Peninsular_2018_D18` | x31 to x33 for y309 to y312, x34y309 | No, too far west |
| `FL_Peninsular_FDEM_2018_D19_DRRA` | x39 for y309 to y313 | No, too far east |

**New: Hillsborough/Pinellas lidar DEM (OPR), published 2026-11-05 - VERIFIED by header read.**

| | |
|---|---|
| Folder | `https://prd-tnm.s3.amazonaws.com/StagedProducts/Elevation/OPR/Projects/FL_HillsboroughPinellas_B24/FL_HillsboroughPinellas_1_B24/` |
| Mosaic index | `.../FL_HillsboroughPinellas_1_B24.vrt` (1.3 MB, 2096 tiles, uses `/vsicurl/` absolute paths) |
| URL list | `.../0_file_download_links.txt` (388 KB) |
| Pixel size | **2.5 US survey feet (0.76 m)** |
| CRS | EPSG:6443, NAD83(2011) / Florida West (ftUS). Heights NAVD88 in US survey feet (Geoid18) |
| Lidar flown | **2025-01-08 to 2025-01-30**, three months after Milton (from tile metadata XML, pubdate 2026-11-02) |
| File layout | 2000 x 2000 px Float32, LZW with floating-point predictor, internal 512 px tiles, 2 overview levels, nodata -999999 |
| CORS | `Access-Control-Allow-Origin: *`, `Accept-Ranges: bytes`, range request returned 206 |
| Licence | USGS, no access constraints; acknowledgement requested |

25 tiles cover the box, 14.1 to 16.9 MB each, **388.9 MB total**. File name pattern `USGS_OPR_FL_HillsboroughPinellas_B24_DEM<id>.tif` under `.../TIFF/`. Each tile is 5000 x 5000 ft. Grid (state plane feet):

| Northing band | Easting 510-515k | 515-520k | 520-525k | 525-530k | 530-535k |
|---|---|---|---|---|---|
| 1,360-1,365k | 468203 | 468204 | 468205 | 468206 | 468207 |
| 1,355-1,360k | 468503 | 468504 | 468505 | 468506 | 468507 |
| 1,350-1,355k | 468803 | 468804 | **468805** | 468806 | 468807 |
| 1,345-1,350k | 469103 | 469104 | 469105 | 469106 | 469107 |
| 1,340-1,345k | 469403 | 469404 | 469405 | 469406 | 469407 |

The USF centre is at about E 522,677, N 1,354,272 ftUS, inside tile **468805** (15.5 MB). The University Area test point (about E 517,040, N 1,356,450) falls in **468504** (15.1 MB).

What I did and did not verify: I read the first 64 KB of tile 468805 by range request and parsed the TIFF header (dimensions, pixel scale, tiepoint 520000/1355000, CRS string, compression, overviews). I could **not** decode pixel values because this machine's Python has no `imagecodecs`, `rasterio` or GDAL, and I did not install anything. So the elevation values in this dataset are unconfirmed by me. The tile-to-box mapping uses my own transverse Mercator calculation, which gave a box of 21,229 x 21,015 ft (4.02 x 3.98 miles), so it is consistent.

### B4. Fastest path to a usable elevation grid (under 30 minutes)

1. **Browser, zero setup (recommended baseline).** Fetch the B2 `exportImage` GeoTIFF once and parse it with geotiff.js. CORS is `*`. Ask for `imageSR=26917` so pixels are metres. About 3 m native resolution, 2011 lidar. Save the file into the repo so the demo does not depend on a flaky host.
2. **Python, same data.** `requests.get(url)` then `tifffile.imread` gives a NumPy array; georeferencing is just the bbox you asked for.
3. **Upgrade if someone has 30 spare minutes: the 2025 lidar.** Download 1 to 4 tiles from B3 (15 MB each) for the University Area and reproject. With `pip install rasterio`, `rasterio.open` on the tile URL works over HTTP range requests, and the `.vrt` gives the whole mosaic. I did not test GDAL or rasterio against it. Remember the units are **feet**, the CRS is EPSG:6443, and nodata is -999999.

For per-address lookups at runtime, `getSamples` or EPQS is enough; no raster needed.

## C. Observed flood evidence

### C1. USGS high-water marks (STN / Flood Event Viewer) - VERIFIED, and empty for this area

The old host is gone: `https://stn.wim.usgs.gov/STNServices/...` returns 301 to `https://apps.usgs.gov/stnweb`, which returns 403. The new viewer at `https://apps.usgs.gov/fev/` loads, and its JavaScript bundle names the new API base:

**`https://api.waterdata.usgs.gov/stnservices`**

| | |
|---|---|
| Auth | Worked with no key. Response header `X-Ratelimit-Limit: 3000`. (The viewer itself sends an `X-Api-Key`; get your own free key from USGS if you hit limits.) |
| Format | JSON |
| CORS | **No `Access-Control-Allow-Origin` header came back.** Call it from a server or pre-fetch it |
| Licence | USGS, public domain |

Calls:

- `https://api.waterdata.usgs.gov/stnservices/events.json` : HTTP 200, 97.5 KB, 334 events. Event ids: **2024 Milton = 347**, **2024 Helene = 346**, **2017 Irma = 182**.
- `https://api.waterdata.usgs.gov/stnservices/hwms/filteredhwms/?event=347&states=FL&format=json` : HTTP 200, 3.6 KB.
- Other filters the viewer uses: `county=`, `hwm_type=`, `hwm_quality=`, `hwm_environment=`, `survey_complete=`, `still_water=`. Sensors: `/sensors/filteredsensors/?event=347&states=FL&format=json` (HTTP 200, 19.6 KB).

Results:

| Event | HWMs in Florida | In Hillsborough County | Within 2 / 5 / 10 miles of USF | Nearest to USF |
|---|---|---|---|---|
| Milton (347) | **3** (2 Sarasota County, 1 Collier County) | 0 | 0 / 0 / 0 | 49.9 miles |
| Helene (346) | 16 | 0 | 0 / 0 / 0 | 24.7 miles (Gulf coast) |
| Irma (182) | 397 | 15 | 0 / 0 / 0 | 13.6 miles (Alafia River) |

Sample Milton record, trimmed: `{"event_name":"2024 Milton","hwm_type_name":"Stain line","hwm_quality_name":"Good: +/- 0.10 ft","vertical_datum_name":"NAVD88","county_name":"Collier County","latitude_dd":26.332791,"longitude_dd":-81.844525,"elev_ft":6.8,"height_above_ground":1.92,"environment":"Coastal"}`.

Verdict: skip for this build.

### C2. USGS stream gauges (new OGC API) - VERIFIED, optional

`https://api.waterdata.usgs.gov/ogcapi/v0/collections/monitoring-locations/items?bbox=-82.50,27.98,-82.30,28.16&limit=200&f=json` returned 200 locations. No key, CORS `*`.

Daily mean gage height around Milton:

```
https://api.waterdata.usgs.gov/ogcapi/v0/collections/daily/items?monitoring_location_id=USGS-02303800&parameter_code=00065&time=2024-10-05/2024-10-20&limit=200&f=json&skipGeometry=true
```

| Gauge | Location | 2024-10-05 | Peak daily mean |
|---|---|---|---|
| USGS-02303800 Cypress Creek near Sulphur Springs | 28.0889,-82.4092, about 2 miles north of campus | 29.14 ft | 31.99 ft on 2024-10-16 |
| USGS-02304000 Hillsborough R at Fowler Ave | 28.0545,-82.3637, east edge of the box | 22.75 ft | 24.94 ft on 2024-10-18 |
| USGS-02303330 Hillsborough R at Morris Bridge | 28.0986,-82.3114 | 28.13 ft | 38.04 ft on 2024-10-12 |

All "Approved". Gage heights are relative to each gauge's own datum, so do not compare them directly to NAVD88 ground elevations without checking the gauge datum. Useful as a "the creeks kept rising for a week" chart, not as a flood extent.

### C3. NOAA NGS emergency response imagery, Milton - VERIFIED, does not cover the University Area usefully

- Viewer: `https://storms.ngs.noaa.gov/storms/milton/index.html`
- Layer index: `https://storms.ngs.noaa.gov/storms/milton/services/index.json` (HTTP 200, 13 NOAA flight layers, 11 to 14 October 2024)
- Tile template: `https://stormscdn.ngs.noaa.gov/<layer>/{z}/{x}/{y}` (XYZ, 256 px, CORS `*`, served as `binary/octet-stream` but the bytes are JPEG or PNG)
- Resolution 15 to 30 cm for NOAA flights. NOAA imagery is public domain.

Coverage test at five points (USF centre, two University Area points, east campus, Busch Gardens) at zoom 14 and 17:

| Layer | Bounds claim | Result near USF |
|---|---|---|
| `20241014a-rgb` | lon -82.91 to -82.35, lat 27.49 to 28.11 | every tile 302 to `/storms/images/clear.png`: **no imagery** |
| `20241014b-rgb` | lon -82.40 to -80.50 | every tile 302: **no imagery** |
| `20241010m-maxar` (Maxar, 10 October 2024) | lon -82.94 to -82.36, lat 27.16 to 28.20 | tiles exist west of campus (for example `17/35524/54880`, 69.8 KB) but what I viewed is **solid cloud**, and the image edge cuts through the area. USF centre and east campus z17 tiles are missing |

The Maxar layer is "©2024 Maxar open data licensed under Creative Commons Attribution Non Commercial 4.0" (quoted from the NGS page). Verdict: skip. NOAA flew the coast, not north Tampa. I did not check the Helene or Irma NGS pages.

### C4. Satellite flood extent products

**NASA Disasters, Milton - VERIFIED, covers the box, weak signal in the urban area.**

The old `maps.disasters.nasa.gov/ags04/...` services and download folders return 404. The services now live here (found through the portal search `https://gis.earthdata.nasa.gov/portal/sharing/rest/search?q=Milton&f=json`):

`https://gis.earthdata.nasa.gov/portal/rest/services/DISASTERS_202410_HURRICANE_MILTON/<name>/ImageServer`

| Service | Content | Resolution | Items intersecting the USF box |
|---|---|---|---|
| `2428_sentinel1` | Sentinel-1 RGB and classified water extent (ASF) | about 20 m | Water extent for 2024-10-11 11:26 UTC (objectid 13), RGB for 10-03, 10-08, 10-11, 10-20 |
| `2428_opera_dswx_hls` | OPERA DSWx water masks and change maps (JPL) | about 30 m | 10-03, 10-08, 10-11 mosaics, two change maps |
| `2428_uavsar` | UAVSAR L-band airborne classification | 10 m | 21 items, 10-11 to 10-14, including daily "UNet Classification" |
| also | `2428_sentinel2`, `2428_landsat`, `2428_uavsar_rgb`, `2428_opera_dist_hls`, `2428_BlackMarble_brdf` | | not tested |

No auth. CORS echoes the Origin. Attribution strings from the services: "NASA/MSFC, USGS, ESA Copernicus. ... contains modified Copernicus Sentinel data ... processed by ESA, Alaska Satellite Facility", "NASA JPL-Caltech ARIA/OPERA Team", "NASA/JPL-Caltech UAVSAR Team".

Working export, HTTP 200, 4.4 KB PNG (Sentinel-1 water extent, 11 October):

```
https://gis.earthdata.nasa.gov/portal/rest/services/DISASTERS_202410_HURRICANE_MILTON/2428_sentinel1/ImageServer/exportImage?bbox=-82.4467,28.0297,-82.3811,28.0877&bboxSR=4326&imageSR=3857&size=640,640&format=png32&mosaicRule={"mosaicMethod":"esriMosaicLockRaster","lockRasterIds":[13]}&f=image
```

Pixel values are class codes: 1 known water, 2 flooded developed, 3 flooded vegetation, 4 flooded cropland/grassland. In the box, **98.7% of pixels are unclassified**: 0.7% known water, 0.5% flooded developed, 0.1% flooded vegetation. The "flooded developed" pixels are small scattered patches.

UAVSAR UNet classification (lock raster 57 for 11 October, 59 for 12 October), HTTP 200, 25 KB: about 10% of the box is one class that follows the Hillsborough River floodplain forest north-east of campus, with small open-water ponds elsewhere. Nothing shows over the dense University Area west of campus. The colours in a default export (green, red, blue) do not match the legend text in the service description (blue, cyan, pink), so check the class mapping before labelling it.

Why the weak signal: the acquisitions are 11 October or later, at least 30 hours after the rain, and radar does not see street-level water between buildings well. Good as a supporting overlay for the river floodplain, not as proof of neighbourhood flooding.

**Others:**

| Product | Finding | Status |
|---|---|---|
| Copernicus EMS Rapid Mapping | **No Milton activation.** `https://rapidmapping.emergency.copernicus.eu/backend/dashboard-api/public-activations-info/?limit=400` lists EMSR752 to EMSR775 for September and October 2024; none is in the United States | VERIFIED absent |
| Copernicus GFM | WMS is public with CORS `*`: `https://geoserver.gfm.eodc.eu/geoserver/gfm/wms` (layers `observed_flood_extent_group_layer`, `observed_water_extent_group_layer`, time dimension from 2015). GetMap for Tampa with `time=2024-10-10` and `2024-10-11` returned HTTP 200 but **fully transparent images**, even for water extent over Tampa Bay | Could not confirm any Milton data |
| Global Flood Database | Covers 2000 to 2018 only, at 250 m (Google Earth Engine catalogue entry). No Milton or Helene, and too coarse for a neighbourhood | Skip |
| Dartmouth Flood Observatory | Site responds; the two archive URLs I guessed returned 404. Not investigated further | Unknown |
| Floodbase | Commercial. Site responds; I found no open download | Skip |
| UNOSAT / HDX | `https://data.humdata.org/api/3/action/package_search?q=Milton+Florida` returned 0 datasets | Nothing found |

### C5. Hillsborough County damage assessments - VERIFIED, the key dataset

Found by searching ArcGIS Online (`https://www.arcgis.com/sharing/rest/search?q=...`). All three are public hosted services in the county's ArcGIS Online organisation, no auth, **CORS `*`**, maxRecordCount 2000. `copyrightText` is empty and no licence is stated on the services, so credit "Hillsborough County, FL" and say so if judges ask.

**(a) Damage assessment points**

`https://services.arcgis.com/apTfC6SUmnNfnxuF/arcgis/rest/services/HC_DamageAssessments2024_PublicView/FeatureServer/24`

The service description says it holds county damage assessments from the August to October 2024 storm season, with a reduced field set for a public viewer. Native SR 2237 (state plane feet), so always pass `outSR=4326`. 19,571 points countywide.

Box query, HTTP 200, 427 KB GeoJSON, 0.87 s, 905 features:

```
https://services.arcgis.com/apTfC6SUmnNfnxuF/arcgis/rest/services/HC_DamageAssessments2024_PublicView/FeatureServer/24/query?where=1%3D1&geometry=-82.4467,28.0297,-82.3811,28.0877&geometryType=esriGeometryEnvelope&inSR=4326&spatialRel=esriSpatialRelIntersects&outFields=OBJECTID,CreationDate,IncidentType,EventName,PRIMCAUSE,TYPDAMAGE,HOMETYPE&outSR=4326&f=geojson
```

What is in the box:

| Field | Counts |
|---|---|
| `EventName` | Hurricane Milton 848, null 56, Hurricane Helene 1 |
| `PRIMCAUSE` | **Flood 548**, null 236, Wind 95, Tree 16, Powerline 6, Rain 3, Outage 1 |
| `TYPDAMAGE` | Major 752, Affected 57, null 50, Minor 39, Inaccessible 4, Destroyed 3 |
| `HOMETYPE` | Multi-Family 656, null 84, Mobile Home 81, Duplex/Townhome 56, Detached Home 27 |
| `IncidentType` | Residential Structure Damage 830, Commercial Structure Damage 17, Flood/Water Level 17, others |
| `CreationDate` | 2024-09-27 to 2024-10-30 (epoch milliseconds) |

**528 of the 548 flood-cause points are within 2 miles of the USF centre.**

Gotchas:

- `FloodRelated` is null on every record here. Use `PRIMCAUSE = 'Flood'`.
- `DESCDAMAGE` is free text that contains street addresses, unit numbers and inspector notes, and `PARCELID` identifies the parcel. It is public, but these are people's flooded homes. I left those fields out of the query above on purpose; show counts or an anonymised heat layer rather than individual notes.
- Points are inspections, so one apartment complex can produce dozens of points. Absence of a point does not mean a building stayed dry.

**(b) Same data aggregated to census block groups**

`https://services.arcgis.com/apTfC6SUmnNfnxuF/arcgis/rest/services/HurricaneDamage2024_ByBlock/FeatureServer/17`

568 polygons countywide, 46 intersect the box. Despite the name, `GEOID` is a 12-digit block group id. Fields include `Point_Count`, `Majority_TYPDAMAGE`, `Majority_PRIMCAUSE` and their percentages, `POP100`, `HU100`. Covers 2024-08-05 to 2025-02-07. Top of the list in the box:

| GEOID | Damage points | Majority damage | Majority cause |
|---|---|---|---|
| 120570108161 | 444 | Major (98%) | Flood (73%) |
| 120570108141 | 162 | Major (99%) | Flood (55%) |
| 120570108173 | 130 | Major (57%) | Wind (49%) |
| 120570108053 | 59 | Major (92%) | Flood (81%) |
| 120570108162 | 52 | Major (94%) | Flood (90%) |

**(c) Flooding focus areas**

`https://services.arcgis.com/apTfC6SUmnNfnxuF/arcgis/rest/services/Flooding_Focus_Areas/FeatureServer/1`

27 polygons from the county's Regional Stormwater Evaluation of Debby, Helene and Milton. Six intersect the box, but four of those are commissioner district or city boundaries. The two real ones are **"University Mall"** (watershed DuckPond) and **"Temple Terrace"** (watershed HillsboroughRiver). Filter with `FolderPath LIKE '%FocusAreas'`. The box GeoJSON is 507 KB because of the big boundary polygons.

**Not found or not relevant:**

- No City of Tampa Milton layer turned up in the ArcGIS Online search.
- `https://www25.swfwmd.state.fl.us/arcgis11/rest/services/prjStructureFloodStudy/HillsCntyFloodInundationArea/MapServer` responds, but its layers are flood-control structures, levees and "Inside/Outside the Inundation Area" notification zones. It is not a Milton extent.
- The same county organisation hosts `Milton_adv..._InundationAG_Polygon` services. From the names these are pre-landfall storm surge forecasts per advisory, not observed flooding. I did not query them.

### C6. OpenFEMA - VERIFIED, with a renamed dataset

Base `https://www.fema.gov/api/open/`. No key. CORS `*`. JSON by default.

**The old claims endpoint is gone.** `https://www.fema.gov/api/open/v2/FimaNfipClaims` returns HTTP 404 with a 660 KB HTML error page. The catalogue (`/v1/OpenFemaDataSets`) shows it is now **`/v3/NfipClaims`** ("NFIP Redacted Claims", 2,731,064 records, last refreshed 2026-08-04). Policies moved to `/v3/NfipPolicies`.

**NFIP claims for the three zip codes since 2017** (HTTP 200, 111 KB, 3.6 s, 256 records):

```
https://www.fema.gov/api/open/v3/NfipClaims?$filter=reportedZipCode in ('33612','33613','33617') and yearOfLoss ge 2017&$select=id,dateOfLoss,yearOfLoss,reportedZipCode,censusGeoid,ratedFloodZone,floodEvent,causeOfDamage,waterDepth,exteriorWaterDepth,interiorWaterDepth,amountPaidOnBuildingClaim,amountPaidOnContentsClaim,buildingDamageAmount,latitude,longitude&$top=5000&$count=true
```

| Zip | Event | Claims | Building + contents paid |
|---|---|---|---|
| 33612 | Hurricane Milton 2024 | **163** | **$28,060,797** |
| 33613 | Hurricane Milton 2024 | 55 | $4,665,349 |
| 33617 | Hurricane Milton 2024 | 4 | $128,678 |
| 33612 | Hurricane Irma 2017 | 5 | $7,500 |
| 33613 | Hurricane Irma 2017 | 4 | $19,515 |

At least one Helene claim exists in 33612, but no zip has three or more, so Helene is not in the table. Of the 222 Milton claims, 154 were rated in zone AE, 26 in A, and **42 in zone X**. Top block groups: 120570108161 (38 claims), 120570108141 (31), 120570112045 (26). The first two are also the top two in the county damage layer.

Sample record, trimmed: `{"dateOfLoss":"2024-09-26T00:00:00.000Z","ratedFloodZone":"AE","floodEvent":"Hurricane Helene","waterDepth":1,"exteriorWaterDepth":17,"interiorWaterDepth":9,"reportedZipCode":"33612","countyCode":"12057","censusGeoid":"120570108211","latitude":28.1,"longitude":-82.4,"amountPaidOnBuildingClaim":500000}`

Field notes from the live data dictionary (`/v1/OpenFemaDataSetFields?$filter=openFemaDataSet eq 'NfipClaims' and datasetVersion eq 3`):

- `censusGeoid` is the census **block group** (12 digits). That is the finest geography.
- `latitude` and `longitude` are rounded to 1 decimal place for privacy. Do not plot them.
- `waterDepth`: "Depth of flood water in inches. Note: there are instances where measurements were provided in feet." `exteriorWaterDepth` and `interiorWaterDepth` are inches relative to lowest adjacent grade.
- `causeOfDamage` 4 = "Accumulation of rainfall or snowmelt", 2 = "Stream, river, or lake overflow", 1 = "Tidal water overflow".
- Only insured properties appear, so renters in apartments are badly under-counted.

**FEMA Individual Assistance registrations** (covers uninsured households and renters):

`https://www.fema.gov/api/open/v2/IndividualsAndHouseholdsProgramValidRegistrations?$filter=disasterNumber eq 4834 and damagedZipCode eq '33612'&$top=1000&$count=true`

Disaster numbers confirmed from `/v2/DisasterDeclarationsSummaries` for Hillsborough: **Milton DR-4834**, Helene DR-4828, Debby DR-4806.

| Zip | Milton registrations | with `waterLevel` > 0 | with `floodDamage` true | Helene registrations | Helene `waterLevel` > 0 |
|---|---|---|---|---|---|
| 33612 | 10,819 | **931** | 822 | 2,724 | 114 |
| 33613 | 6,540 | 331 | 291 | 1,526 | 59 |
| 33617 | 8,773 | 200 | 148 | 2,598 | 76 |

Useful fields: `censusGeoid` (block group), `waterLevel` ("Total depth of water affected the damaged dwelling, in inches"), `highWaterLocation` (1 = first floor, B = basement, and so on), `floodDamage`, `floodDamageAmount`, `ownRent`, `residenceType`. Slow: a filtered count took about 10 seconds. Pre-fetch and aggregate; do not call it per page view.

Other gotchas: OData `$select` with an unknown field name returns HTTP 400 with a JSON error. `$top=5000` worked in one call. The `fema.gov` documentation pages return 403 to curl, so I could not re-read the OpenFEMA terms of use today; check the required attribution wording in a browser before you present.

### C7. Block group shapes for joining C5(b) and C6 - VERIFIED

```
https://tigerweb.geo.census.gov/arcgis/rest/services/TIGERweb/Tracts_Blocks/MapServer/1/query?geometry=-82.4467,28.0297,-82.3811,28.0877&geometryType=esriGeometryEnvelope&inSR=4326&spatialRel=esriSpatialRelIntersects&outFields=GEOID,TRACT,BLKGRP,AREALAND&outSR=4326&geometryPrecision=5&f=geojson
```

HTTP 200, 126 KB, 79 block groups, CORS echoes Origin. Layer 1 is the current block group layer. The NFIP and IHP `censusGeoid` values look like 2020 vintage (IHP records carry `censusYear: 2020`); if GEOIDs fail to match, try layer 11 under the "Census 2020" group. The county's ByBlock layer already carries geometry, so you may not need this.

## D. Rainfall, 9 to 10 October 2024

### D1. Numbers to quote

| Source | Location | Total | Period |
|---|---|---|---|
| NCEI daily summaries, station USW00012842 | Tampa International Airport, 10.1 miles south-west of USF | **11.43 in** on 2024-10-09; 0.31 on 10-08; 0.30 on 10-10 | calendar days |
| NWS Tampa Bay post-storm report | same | "second-highest 1-day total rainfall amount of 11.43 inches, just shy of the all-time record of 11.45 inches set on May 8, 1979" | |
| WPC Storm Summary Number 3, 11 AM EDT 10 October 2024 | "TAMPA INTL AP" | 11.73 in (equals 11.43 + 0.30) | storm total |
| WPC Storm Summary Number 3 | **"TEMPLE TERRACE 3.1 W"** | **15.66 in** | storm total, preliminary |
| CoCoRaHS FL-HB-55 "Tampa 5.0 NNE" (28.0126,-82.4155), 3.2 miles south of USF | | 0.44 + **11.79** = 12.23 in | 7 AM reports on 10-09 and 10-10 |
| NCEI USC00088784 "TAMPA 6 NE" (28.0575,-82.4751), 3.7 miles west | | 2.02 + 11.65 = 13.67 in | daily reports 10-09 and 10-10 |
| CoCoRaHS FL-HB-27 "Lutz 1.3 SSE", 5.0 miles north-west | | 0.48 + 8.25 = 8.73 in | |
| CoCoRaHS FL-HB-116 "Lutz 0.6 WSW", 6.3 miles | | 0.65 + 10.13 = 10.78 in | |
| CoCoRaHS FL-HB-140 "Greater Northdale 1.2 S", 6.5 miles | | 0.49 + 10.81 = 11.30 in | |
| IEM reanalysis grid **at the USF point** | 28.0587,-82.4139 | 12.25 in (calendar day 10-09); MRMS 10.52 in; 24 hours ending 12 UTC on 10-10: 11.64 in; PRISM 11.86 in | gridded |
| NWS Tampa Bay post-storm narrative | Hillsborough County | "10 to 15 inches over most of the county and 5 to 10 inches over the southeastern part of the county, with an isolated maximum total of 18.82 inches near Westchase" | |

Honest reading: **about 11.6 to 12.3 inches at USF, nearly all of it inside 24 hours.** The 15.66 in "Temple Terrace 3.1 W" report would sit in or beside the University Area going by its name, but I could not find that station's coordinates (it is not in the CoCoRaHS daily export or the NCEI station search), so treat its location as approximate.

KVDF (Tampa Executive, the nearest ASOS) has **no precipitation value** for 8 to 11 October in the IEM daily summary (gust 60 kt on 10-09). KTPF also has none. Do not cite KVDF rainfall.

**Return period context, NOAA Atlas 14 at the USF point - VERIFIED** (Volume 9 Version 2, partial duration series, inches):

| Duration | 10-yr | 25-yr | 50-yr | 100-yr | 200-yr | 500-yr | 1000-yr |
|---|---|---|---|---|---|---|---|
| 12-hr | 5.49 | 6.84 | 8.06 | 9.44 | 11.0 | 13.3 | 15.3 |
| 24-hr | 6.60 | 8.40 | 10.0 | **11.9** | 14.0 | 17.2 | 19.9 |

So the gridded 24-hour totals at USF (11.6 to 12.3 in) are about the 100-year 24-hour storm, and a 15.66 in total would fall between the 200-year and 500-year depths.

Related, from the same NWS narrative: Hillsborough River at Morris Bridge crested at a record 38.16 ft on 12 October, above the 34.66 ft Irma record. That matches the USGS daily mean of 38.04 ft in C2.

### D2. Endpoints

| Source | Exact URL | Auth | Format | CORS | Result |
|---|---|---|---|---|---|
| NCEI Access Data Service, daily summaries | `https://www.ncei.noaa.gov/access/services/data/v1?dataset=daily-summaries&stations=USW00012842&startDate=2024-10-07&endDate=2024-10-12&dataTypes=PRCP,WSF2,WSF5&format=json&units=standard&includeStationName=true` | none | JSON or CSV | `*` | HTTP 200, 802 bytes |
| NCEI station search by box | `https://www.ncei.noaa.gov/access/services/search/v1/data?dataset=daily-summaries&bbox=28.20,-82.60,27.92,-82.25&startDate=2024-10-09T00:00:00&endDate=2024-10-10T23:59:59&dataTypes=PRCP&limit=200` | none | JSON | not checked | HTTP 200, 19 stations. bbox order is N,W,S,E |
| CoCoRaHS export | `https://data.cocorahs.org/export/exportreports.aspx?ReportType=Daily&dtf=1&Format=CSV&State=FL&County=HB&ReportDateType=reportdate&StartDate=10/9/2024&EndDate=10/11/2024&TimesInGMT=False` | none | CSV | `*` | HTTP 200, 11 KB, 80 reports with lat/lon |
| IEM reanalysis, point | `https://mesonet.agron.iastate.edu/iemre/daily/2024-10-09/28.0587/-82.4139/json` | none | JSON | `*` | HTTP 200, 439 bytes |
| IEM ASOS daily | `https://mesonet.agron.iastate.edu/api/1/daily.json?station=TPA&network=FL_ASOS&year=2024&month=10` | none | JSON | not checked | HTTP 200, 16.6 KB |
| NOAA Atlas 14 | `https://hdsc.nws.noaa.gov/cgi-bin/new/cgi_readH5.py?lat=28.0587&lon=-82.4139&type=pf&data=depth&units=english&series=pds` | none | JavaScript-style text (`quantiles = [[...]];`) | no CORS header seen | HTTP 200, 5.1 KB. The older `/cgi-bin/hdsc/new/` path returns 301 to this one |
| WPC storm summary | `https://www.wpc.ncep.noaa.gov/storm_summaries/2024/storm24/stormsum_4.html` | none | HTML text | | HTTP 200. This file is "Storm Summary Number 3"; `stormsum_5.html` is 404, so it is the last one |
| NWS Tampa Bay post-storm reports | `https://www.weather.gov/media/tbw/TropicalEventSummary/PSHTBW_2024AL14_Milton_Summary.pdf` and `..._ImpactNarratives.pdf` | none | PDF | | fetched and read |
| NWS Stage IV daily grid | `https://water.noaa.gov/resources/downloads/precip/stageIV/2024/10/10/nws_precip_1day_20241010_conus.tif` | none | GeoTIFF, about 4 km | | HEAD 200, 3.37 MB. `.nc` also exists, 3.23 MB. Not downloaded or sampled |
| MRMS 24-hour QPE | `https://noaa-mrms-pds.s3.amazonaws.com/CONUS/MultiSensor_QPE_24H_Pass2_00.00/20241010/MRMS_MultiSensor_QPE_24H_Pass2_00.00_20241010-120000.grib2.gz` | none | GRIB2, about 1 km | | listed, 2.87 MB. Not downloaded |

Gotchas:

- CoCoRaHS and COOP daily values are 24 hours ending about 7 AM local, so the "10-10" report holds the storm. Airport values are midnight to midnight, so the storm is on "10-09". Do not add them as if they were the same day.
- NCEI data service requires `stations=`; a `boundingBox` alone returns HTTP 400 "A station is required". Use the search endpoint first.
- Old `water.weather.gov` no longer resolves; the precipitation downloads are on `water.noaa.gov`.
- Stage IV and MRMS grids need projection handling (polar stereographic, GRIB2). The IEM point endpoint already gives you the MRMS and Stage IV style numbers at any lat/lon without that work.

Licence lines: NOAA and NWS data are public domain ("Rainfall: NOAA NCEI / NWS"). CoCoRaHS: credit "CoCoRaHS" (I did not re-read their data policy today). IEM: credit "Iowa Environmental Mesonet, Iowa State University".

## E. Ranked recommendation for a 7-hour build

**Use (minimal set, in priority order):**

1. **Hillsborough County damage assessment points** (C5a) and the **block group aggregate** (C5b). This is the observed-flooding layer. One GeoJSON call each, CORS open. Per address: count of flood-cause points within 150 m, 300 m and 500 m.
   `https://services.arcgis.com/apTfC6SUmnNfnxuF/arcgis/rest/services/HC_DamageAssessments2024_PublicView/FeatureServer/24/query`
2. **FEMA NFHL layer 28** (A1). Live point query per address, plus the 174 KB simplified box polygons for the map.
   `https://hazards.fema.gov/arcgis/rest/services/public/NFHL/MapServer/28/query`
3. **3DEP elevation** (B1, B2). `getSamples` or EPQS per address; one cached `exportImage` GeoTIFF of the box for the map and for "how low is this address compared with its surroundings".
   `https://elevation.nationalmap.gov/arcgis/rest/services/3DEPElevation/ImageServer/exportImage` and `https://epqs.nationalmap.gov/v1/json`
4. **OpenFEMA NfipClaims v3 and IHP registrations** (C6), pre-aggregated by block group into a static JSON. Gives dollars paid and "households reporting water in the home", and the strong line that 42 of 222 Milton flood claims here were in zone X.
   `https://www.fema.gov/api/open/v3/NfipClaims` and `https://www.fema.gov/api/open/v2/IndividualsAndHouseholdsProgramValidRegistrations`
5. **Rainfall as static facts** (D1): hard-code the table and the Atlas 14 comparison with source links. No live call needed.

Pre-fetch items 1, 3 (raster), 4 and 5 into the repo in the first 30 minutes. Keep only FEMA and the elevation point lookup live, each with a retry and a cached fallback.

**Nice to have if time remains:**

- 2025 lidar tiles for the University Area (B3): sharper low spots, and newer than the storm.
- County "University Mall" focus area polygon (C5c) as a map outline.
- USGS Cypress Creek daily gage height chart (C2).
- NASA Sentinel-1 or UAVSAR export as a faint overlay of the river floodplain (C4).

**Skip:**

- USGS STN high-water marks: zero within 10 miles for Milton, Helene and Irma.
- NOAA NGS aerial imagery: no NOAA flight over the area; the Maxar tile is cloud.
- Copernicus EMS (no activation), GFM (empty responses), Global Flood Database (ends 2018, 250 m), DFO, Floodbase, UNOSAT.
- TNM products API (broken today) and the standard 1 m DEM product (no tiles here).
- Stage IV and MRMS grids: the IEM point endpoint gives the same answer for one location.
- SWFWMD inundation-area service: not about Milton.

## F. What failed or is uncertain

| Item | What happened | What I tried |
|---|---|---|
| TNM products API | HTTP 200 with a JSON error body for every query | 6 datasets, bbox and polygon forms, two encodings, `prodFormats` filter, `max=1` |
| Old STN host | 301 to a 403 page | Found the replacement base in the Flood Event Viewer bundle; that works |
| STN from a browser | No CORS header on `api.waterdata.usgs.gov/stnservices` | Sent an Origin header; nothing echoed. The OGC API on the same host does send `*` |
| OpenFEMA `v2/FimaNfipClaims` | 404 | Replaced by `v3/NfipClaims`, which works |
| NASA `maps.disasters.nasa.gov` services and downloads, `aria-share.jpl.nasa.gov` Milton folder | 404 | Replacement services found on `gis.earthdata.nasa.gov/portal`. I found no bulk GeoTIFF download; `exportImage` works |
| Copernicus GFM | Blank images for Tampa on 10 and 11 October 2024 | Two layers, two bboxes, two dates. Did not test the GFM portal login or API |
| 2025 lidar pixel values | Not decoded | Header read by range request; no LZW decoder available locally and I installed nothing |
| GDAL or rasterio against the `.vrt` | Not tested | Neither is installed on this machine |
| "Temple Terrace 3.1 W" rain gauge location | Not found | CoCoRaHS Hillsborough export and NCEI box search |
| UAVSAR class colours | Export colours differ from the legend text | Viewed the export; did not resolve the mapping |
| University Area point elevation from EPQS | Connection reset on that single call | Not retried; nearby `getSamples` values are 11.9 and 13.9 m |
| OpenFEMA terms and attribution wording | `fema.gov` documentation pages return 403 to curl | Read the data dictionary through the API instead |
| Helene and Irma NGS imagery, DFO archive, Floodbase data | Not checked beyond a reachability test | |
| Seamless 1 m DEM (S1M) folder | Exists on the bucket with a tile naming I did not decode | Listed the top level only; coverage at USF unknown |
| Connection resets | About one in three calls to `elevation.nationalmap.gov`, `tnmaccess.nationalmap.gov`, `gis.earthdata.nasa.gov`; one to FEMA export and two to EPQS | Could be this network rather than the servers. Retries always worked |
| One oversized download | The unsimplified NFHL box GeoJSON was 7.0 MB, over the 5 MB limit I was given | Found by accident; the simplified query is 174 KB |
