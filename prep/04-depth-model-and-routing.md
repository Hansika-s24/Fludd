# 04 - Depth model and routing engine: design memo

Project: Storm report card (addresses within ~2 miles of USF Tampa)
Date: 2026-11-21. Build window: 7 hours.
Scope of this memo: the two components the judges were told are original work - the DEPTH MODEL and the ROUTING ENGINE - plus validation, thresholds, grading and offline packaging.

Reading key used throughout:

- **[E]** established method or published number, with a source URL.
- **[S]** our own suggested simplification or design choice. Defensible, but it is ours - say so to judges.
- **[U]** could not be verified today. Do not put it on a slide without checking.

Everything marked as a performance or payload figure is an estimate, not a measurement, unless it says otherwise. Measure before you claim.

---

## 0. One-page answer

| Decision | Recommendation |
|---|---|
| Rain to runoff | SCS curve number on the cumulative hyetograph, per cell, 3-5 CN classes [E] |
| Depth model | Own implementation of depression fill-spill-merge on a 2-3 m lidar DEM: one elevation-ordered sweep builds the depression tree, a small worklist routes runoff volume through it, stage-storage tables turn volume into a water level per depression [E algorithm, S simplifications] |
| Fallback (60-minute checkpoint) | Same sweep, top-level depressions only ("bluespot cascade") [E/S] |
| Pump failure | The pump basin is a depression with a drain rate q (cfs). Toggle sets q = 0 for the outage window [S] |
| Time dimension | Hourly steps: add incremental runoff, subtract drains, re-run the overflow worklist. Seconds of compute for a whole storm [S] |
| Routing | OSM graph in CSR typed arrays. Each edge stores, per vehicle class, the time it closes. Time-dependent Dijkstra for routes; a max-min ("widest path") Dijkstra for "cut-off time" maps; multi-source from fire stations for rescue reach [E building blocks, S combination] |
| Grade | A-F tied to annual-chance bands of water reaching the building, with notches for pump dependence and isolation, shown as a range, never a decimal [S] |
| Offline | Two rasters + depression tables + graph arrays + address index, cached by a service worker. Roughly 5-25 MB total [S, estimate] |

Why this is the right call for this terrain: the study area is flat, has closed basins, and the worst Milton flooding was a ponding problem made worse by a pump station that lost power. A model whose native concepts are "bowls, spill points, volumes and drains" matches the physics that mattered and lets a pump be a first-class object. Hydrodynamic and CA models are higher fidelity for moving water but cannot run a 6x6 km lidar grid interactively in a browser, and cannot be explained in two minutes.

---

## 1. Depth model

### 1.1 Options ranked for a 7-hour build

| Rank | Option | What it is | Fidelity here | Effort | Verdict |
|---|---|---|---|---|---|
| 1 | Fill-spill-merge on a depression hierarchy + SCS-CN volumes | Runoff fills depressions, full ones overflow to neighbours, two full neighbours merge. Barnes, Callaghan and Wickert (2021), Earth Surface Dynamics 9, 105-121; worst case O(N log N); reference code is public [E] https://esurf.copernicus.org/articles/9/105/2021/ , https://github.com/r-barnes/Barnes2020-FillSpillMerge | Good for ponding depth and extent; no velocities, no flow depth on slopes | Medium-high (150-250 lines if you follow section 1.3) | **Build this** |
| 2 | Top-level "bluespot" cascade | Priority-Flood fill, treat each maximal depression as one level pool, cascade overflow downstream. This is the Arc-Malstrom / malstroem screening approach (Balstrom and Crawford 2018, Computers and Geosciences 116, 64-73) [E] https://github.com/SDFIdk/malstroem | Good for big events that fill basins; misplaces water in partly filled nested basins | Low-medium | **Checkpoint fallback** |
| 3 | Cellular automata rapid spreading (CA-ffe, WCA2D) | Rule-based cell-to-cell water transfer instead of solving shallow water equations. CA-ffe: Jamali et al. 2019, WRR 55, 4936-4953, tested against HEC-RAS and TUFLOW in 20 experiments across 5 urban areas, good in depressions, weak where flow has momentum, no time evolution [E] https://research.monash.edu/en/publications/a-cellular-automata-fast-flood-evaluation-ca-ff%C3%A9-model/ . WCA2D: Guidolin et al. 2016, Env. Modelling and Software 84, 378-394, up to 8x faster than a commercial model in its real-world case [E] https://ore.exeter.ac.uk/repository/handle/10871/22670 | Similar to option 1 for final ponding; WCA2D adds dynamics | High, and millions of cells x many iterations is not interactive in a browser | Skip; cite as the next step |
| 4 | LISFLOOD-FP inertial | Simplified shallow-water scheme, Bates, Horritt and Fewtrell 2010, J. Hydrology 387, 33-45; stable time step follows a CFL condition (scales with cell size) [E] https://www.fathom.global/academic-papers/a-simple-inertial-formulation-of-the-shallow-water-equations-for-efficient-two-dimensional-flood-inundation-modelling/ | Highest of the simple options | High. Our arithmetic: at 2 m cells and ~1 m depth the CFL step is under a second, so a 24 h storm is on the order of 10^5 steps over 9 million cells [S estimate] | Not in 7 hours |
| 5 | HAND | Elevation of each cell above the nearest drainage cell (Nobre et al. 2011, J. Hydrology 404, 13-29) [E] https://repositorio.inpa.gov.br/handle/1/18178 | Poor here. It needs a meaningful channel network; NOAA's own notes say HAND only inundates from the nearest flowpath and does not handle waterbodies well, and flat terrain is a known weak spot [E] https://www.weather.gov/media/owp/operations/HAND_factsheet.pdf , https://hess.copernicus.org/articles/28/1287/2024/ | Low | Use only as a "relative elevation" feature in the grade |
| 6 | Bathtub | One water level over the whole area | Poor. Ignores connectivity and volume | Trivial | Keep as the baseline your model must beat in validation |
| - | SCS curve number | Not a depth model. It is the rainfall-to-runoff front end for all of the above | - | Trivial | **Use it** |

Closest published analogue to cite when asked "has anyone done this?": Safer_RAIN (Samela et al. 2020, Water 12(6), 1514), a DEM-based hierarchical filling-and-spilling pluvial tool with infiltration, validated on two Italian case studies with reported sensitivity and specificity of roughly 71% and 99% [E, numbers from a search summary of the paper; the publisher page returned 403 to us, so re-open it before quoting] https://www.mdpi.com/2073-4441/12/6/1514

Originality note for judges: the algorithms are published; the implementation, the drain/pump extension, the time stepping and the coupling to routing are the team's. Use `richdem` or the Barnes reference code only as a test oracle, never in the product.

### 1.2 Rainfall to runoff: SCS curve number [E]

Equations (TR-55, June 1986; table footnote confirms average runoff condition and Ia = 0.2S) https://ehs.umich.edu/wp-content/uploads/2017/01/TR-55_curve_numbers.pdf , https://en.wikipedia.org/wiki/Runoff_curve_number :

```
S  = 1000/CN - 10            (inches)      [S = 25400/CN - 254 in mm]
Ia = 0.2 * S
Q  = 0                        if P <= Ia
Q  = (P - Ia)^2 / (P - Ia + S) = (P - 0.2S)^2 / (P + 0.8S)   if P > Ia
```

P is cumulative rainfall, Q cumulative runoff depth. Runoff volume from a cell = Q x cell area.

Curve numbers, TR-55 Table 2-2a, by hydrologic soil group A / B / C / D [E, read directly from the table]:

| Cover | Avg % impervious | A | B | C | D |
|---|---|---|---|---|---|
| Paved parking, roofs, driveways; paved streets with curbs and storm sewers | - | 98 | 98 | 98 | 98 |
| Open space, good condition (grass > 75%) | - | 39 | 61 | 74 | 80 |
| Open space, fair (grass 50-75%) | - | 49 | 69 | 79 | 84 |
| Open space, poor (grass < 50%) | - | 68 | 79 | 86 | 89 |
| Commercial and business | 85 | 89 | 92 | 94 | 95 |
| Industrial | 72 | 81 | 88 | 91 | 93 |
| Residential, 1/8 acre or less (town houses) | 65 | 77 | 85 | 90 | 92 |
| Residential, 1/4 acre | 38 | 61 | 75 | 83 | 87 |
| Residential, 1/2 acre | 25 | 54 | 70 | 80 | 85 |

Soils. [U] We did not retrieve the SSURGO map units for the USF area. Florida flatwoods sands are commonly dual-class (A/D): NRCS assigns dual groups to wet soils, first letter for the drained condition and second for the undrained condition [E] https://www.damtoolbox.org/images/e/e9/NEH7.pdf . Pull the `hydgrp` field from Web Soil Survey or the county soil layer https://gisdextweb1.hillsboroughcounty.org/arcgis/rest/services/Hosted/DSD_Viewer_Layers1/FeatureServer/49 .

[S] Our simplification: three CN classes from OSM/NLCD - impervious (98), urban pervious on undrained/wet soil (80, i.e. group D good-condition open space), urban pervious on drained sand (39-61). For hurricane scenarios use the wet end: the City of Tampa's Milton briefing says the ground was fully saturated after the wettest September on record and Helene [E] https://tampa.gov/sites/default/files/document/2024/milton-forest-hills-mtg-stormwater-v1.pdf . Wikipedia's CN article lists antecedent-moisture adjustment factors (e.g. about 1.14 x at CN 80 for wet conditions, from Ward and Trimble 2004) [E] https://en.wikipedia.org/wiki/Runoff_curve_number . It also notes research (Hawkins et al.) suggesting Ia = 0.05S may fit urban watersheds better; if you change Ia you must not reuse TR-55 CNs unchanged.

Useful fact to show judges (our arithmetic from the equation above and the Atlas 14 depths in section 5):

| CN | 10-yr, 6.60 in | 25-yr, 8.40 in | 100-yr, 11.9 in | 500-yr, 17.2 in |
|---|---|---|---|---|
| 80 | 4.33 in (66%) | 6.00 in (71%) | 9.35 in (79%) | 14.53 in (84%) |
| 85 | 4.87 in (74%) | 6.60 in (79%) | 10.02 in (84%) | 15.25 in (89%) |
| 90 | 5.43 in (82%) | 7.20 in (86%) | 10.66 in (90%) | 15.93 in (93%) |
| 95 | 6.01 in (91%) | 7.80 in (93%) | 11.29 in (95%) | 16.58 in (96%) |

Takeaway: for the big storms, runoff is 80-95% of rainfall whatever CN you pick between 80 and 95. CN uncertainty matters for the 10-year grade boundary, much less for the 100- and 500-year.

### 1.3 Recommended algorithm: fill-spill-merge with drains

Data inputs:

| Input | Source | Notes |
|---|---|---|
| Bare-earth lidar DEM | NOAA Digital Coast, 2017 SWFWMD lidar DEM for Hillsborough County https://chs.coast.noaa.gov/htdata/raster5/elevation/FL_Hills_DEM_2017_9457/supplemental/Hillsborough_County_Topographic_Lidar_Final_Report_20190611.pdf , or USGS 3DEP via The National Map | [U] we did not confirm cell size or vertical accuracy for the USF tiles; read the report. Resample to 2 m or 3 m for the build (9 M or 4 M cells for 6x6 km) |
| Land cover / imperviousness | OSM buildings, roads, parking; or NLCD | For CN classes |
| Soils | SSURGO `hydgrp` | See 1.2 |
| Culverts, bridges | OSM `tunnel=culvert`, `bridge=yes`, plus eyeballing | For conditioning |
| Outlets and drains | Pump station locations, receiving water, domain boundary | Duck Pond station details in section 2 |
| Rainfall | NOAA Atlas 14 (section 5), Milton totals (section 2), live gauge or forecast | Cumulative hyetograph |

**Step A - condition the DEM (do not skip).**

- Lidar DEMs are hydro-flattened, not hydro-enforced. Bridges are removed, but road fills over culverts stay in the surface, so they act as dams until you cut them [E] https://www.usgs.gov/core-science-systems/ngp/ss/lidar-base-specification-appendix-2-hydro-flattening-reference , https://pubs.usgs.gov/fs/2014/3051/pdf/fs2014-3051.pdf .
- [S] Draw 10-30 culvert/underpass lines by hand over a hillshade + OSM, and set DEM cells along each line to the lower endpoint elevation. Budget 30 minutes. Least-cost breaching (Lindsay 2016) is the established automated alternative [U, not opened today].
- [S] Ponds and lakes: the DEM value is the water surface on survey day. Treat ponds as "already full to that level"; only storage above it counts. That is the right behaviour for retention ponds at normal pool, and wrong if a pond was pumped down before the storm (the City pumped Curiosity Creek down 6 ft before Milton [E] https://tampa.gov/sites/default/files/document/2024/milton-forest-hills-mtg-stormwater-v1.pdf ). Offer pre-storm drawdown as extra capacity on selected ponds if time allows.
- [S] Drop depressions shallower than ~5-10 cm or smaller than ~20 m2 (merge them into their parent). They are lidar noise and they explode the node count.
- [S] Buildings: keep bare earth for the model. Read the depth for an address from the ring of cells just outside the footprint. Raising footprints creates false dams between close buildings.

**Step B - one elevation-ordered sweep builds everything (precompute, Python or TypeScript).**

This is a merge-tree construction, equivalent in result to the depression hierarchy of Barnes et al. (Part 2, 2020, Earth Surface Dynamics 8, 431-445) [E] https://esurf.copernicus.org/articles/9/105/2021/ . Priority-Flood (Barnes, Lehman, Mulla 2014, Computers and Geosciences 62, 117-127) is the related flood-from-the-edges algorithm: O(n) on integer and O(n log n) on floating-point DEMs [E] https://arxiv.org/pdf/1511.04463 . Use Priority-Flood for the fallback (section 1.5) and as a cross-check that your sweep's top-level depressions equal (filled DEM - DEM > 0).

```
mark OUTLET cells: domain boundary + receiving water (river) cells
sort all cells by (elevation, index) ascending
union-find over cells; each component carries: node_id, cell_count, sum_z, is_ocean
for cell c in sorted order:
    P = neighbours of c already processed (8-connected)
    if c is OUTLET: start/join the OCEAN component
    if P is empty:                       # c is a pit
        create LEAF node; flowto[c] = c; leaf_of[c] = that leaf
    else:
        flowto[c]  = lowest cell in P                  # steepest-descent pointer
        leaf_of[c] = leaf_of[flowto[c]]                # catchment label (who gets c's runoff)
        comps = distinct components among P
        join c to the first component
        for each further component Y (X = the one c is in):   # c is a saddle
            if X or Y is OCEAN:
                the non-ocean one, D, becomes TOP-LEVEL:
                    spill_z[D] = z[c]; cap[D] = count[D]*z[c] - sum_z[D]
                    overflow_target[D] = leaf_of[lowest neighbour of c on the ocean side]  (or OUTLET)
            else:
                create PARENT node N with children X, Y; floor_z[N] = z[c]
                cap[X] = count[X]*z[c] - sum_z[X];  cap[Y] likewise
                overflow_target[X] = leaf_of[lowest neighbour of c that is in Y], and vice versa
            union(X, Y)
    node_of[c] = current node of c's component     # the lowest node that contains c
record per node: own cells' elevation histogram (2-5 cm bins) -> stage-storage table
record per leaf: catchment area by CN class  A[leaf][k]
```

Complexity: sort O(N log N), sweep near-linear. Estimate for 4 M cells: seconds in compiled/typed-array code, a few minutes in plain Python loops [S estimate - time it]. Output: a tree of a few hundred to a few thousand nodes after the noise filter.

**Step C - route volume through the tree (runtime, tiny).**

A "lake" is a node whose children have merged (or a leaf). `top(leaf)` = the highest merged ancestor of a leaf.

```
W[leaf] += runoff volume for this step          # sum_k A[leaf][k] * dQ(P, CN_k)
subtract drains (see below)
worklist = all lakes
while some lake L has W[L] > cap[L]:
    excess = W[L] - cap[L];  W[L] = cap[L]
    if L is TOP-LEVEL and overflow_target[L] is OUTLET: discard excess (it left the map); continue
    T = top(overflow_target[L])                  # the lake that receives the overflow
    if T is L's sibling and W[T] >= cap[T]:      # both full -> merge
        P = parent(L); mark P merged; W[P] = W[L] + W[T] + excess
        cap[P] is known from the sweep (volume below P's own spill level)
    else:
        W[T] += excess
```

Every iteration either merges two lakes or moves water strictly downstream, so it terminates. Mass balance is exact by construction: stored + discharged = runoff in. Make that an automated test.

**Step D - volume to water level to depth.**

For a lake with water W over a region whose cell elevations (ascending) are z_1..z_m and cell area a, the level h satisfies sum over wet cells of (h - z_i) x a = W, so with k wet cells:

```
h = ( W/a + (z_1 + ... + z_k) ) / k        valid while h <= z_(k+1)
```

[S, our derivation from mass balance; Barnes et al. 2021 use an equivalent lake-level equation.] In practice: binary-search the precomputed stage-storage table. Then

```
depth(cell) = max(0, level[lake containing node_of[cell]] - z[cell])
```

Cells that belong to an unmerged parent node are dry. In the browser this is one lookup-texture fetch per pixel, so the map redraws instantly when levels change.

**Complexity summary:** precompute O(N log N) once; each time step O(number of nodes); rendering O(pixels on screen).

### 1.4 Failed pump station or blocked drainage as a toggle [S]

Give any lake an optional drain: `q` (volume per time), a schedule, and a destination (OUTLET or another leaf).

```
each step, for each drained lake L:  out = min(W[L], q_L(t) * dt);  W[L] -= out;  W[dest] += out
```

| Scenario toggle | Model change |
|---|---|
| Pump running | q = station capacity |
| Pump failed (power loss) | q = 0 between outage start and restore times |
| Partially blocked inlets/pipes | q multiplied by a slider 0-100% |
| Tailwater (receiving water high) | q = 0 while the destination lake is full |
| Pre-storm pond drawdown | add capacity to selected ponds before step 0 |

Numbers to seed it: Hillsborough County describes Duck Pond as its largest stormwater pump station, 50 to 90 cfs, intended to protect low-lying University-area land up to a 25-year storm [U - from search-engine snippets of hcfl.gov pages that returned 404 when fetched directly; re-verify] https://hcfl.gov/newsroom/2024/10/10/power-outage-at-hillsborough-s-duck-pond-pump-station-makes-flood-mitigation-difficult-in-university-area . Our conversion: 50 cfs = 4.32 million ft3/day (99 acre-ft/day); 90 cfs = 7.78 million ft3/day (179 acre-ft/day). Spread over one square mile that is 1.9 to 3.3 inches per day - small next to 10+ inches of rain in a night, which is the point to make: the pump matters most for how long water stays, and for moderate storms. [U] We do not know the true contributing area; delineate it from your own catchment labels.

The system has two stations working together, one City (Donut Pond) and one County, discharging to the Hillsborough River, a $27 million project [E] https://www.swfwmd.state.fl.us/blog/project-reduces-flooding-issues .

Storm sewers in general are not in a DEM-only model, so small storms will over-predict ponding. [S] Add one global "background drainage rate" (inches per hour removed from every depression) as a single calibration knob. Precedent: the Leicester surface-water modelling used in Green et al. 2017 applied a uniform 12 mm/h loss for drainage and infiltration [E] https://nhess.copernicus.org/articles/17/1/2017/nhess-17-1-2017.pdf . Tampa's appropriate value is unknown [U]; see the honesty note in section 2.4.

### 1.5 Checkpoint fallback: top-level bluespot cascade [E/S]

If the merge logic is not working by hour 2.5, ship this. It uses only top-level nodes:

1. Priority-Flood from outlets to get the filled surface F. Algorithm: push edge cells into a min-priority queue; pop the lowest; raise each unvisited neighbour to at least that elevation, mark it, push it; repeat [E] https://arxiv.org/pdf/1511.04463 . Record, for every cell, the neighbour it was reached from: those parent pointers are a ready-made drainage tree on the filled surface [S].
2. Bluespots = connected components where F - Z > threshold. For each: capacity = sum(F - Z) x area, stage-storage table, pour cell.
3. Local watershed of a bluespot = cells whose parent chain reaches it first. Downstream bluespot = first bluespot reached from the pour cell.
4. Per step: add runoff, subtract drains, and pass any volume above capacity downstream in upstream-to-downstream order (Priority-Flood pop order of pour cells, reversed).
5. Level from stage-storage; depth = level - Z.

Known error [S]: each maximal depression is treated as one level pool. In a partly filled basin with internal sub-basins, all water is drawn at the lowest point: too deep there, too dry on perched streets. In flat closed-basin terrain the maximal depressions can be very large, so this matters for moderate storms and matters less once basins fill. malstroem documents the same family of assumptions: impermeable terrain, no concept of time, D8 flow [E] https://github.com/SDFIdk/malstroem .

### 1.6 Getting "water rises over hours" cheaply [S]

- Build a cumulative hyetograph P(t) at 15-60 minute steps. Options: (a) observed Milton rain, worst from 8 pm to midnight on Oct 9 per the City [E] https://tampa.gov/sites/default/files/document/2024/milton-forest-hills-mtg-stormwater-v1.pdf ; (b) a design storm nested from the Atlas 14 durations in section 5 (alternating-block method, a textbook technique [U, no URL checked]); (c) SWFWMD recommends the SCS Type II Florida Modified distribution for quantity analysis [U, seen only in a search summary; ordinates not retrieved].
- Apply the CN equation to cumulative P; the increment between steps is the runoff to add. This is the standard way to get excess rainfall over time from SCS-CN [E, same equation].
- Run steps C and D each step. Store `level[node][t]`. With ~1,000 nodes and 96 steps that is ~100k numbers.
- Derived products per cell or road edge: first time depth exceeds a threshold. These "time of closure" values feed the routing engine.

What this is and is not: each step is an equilibrium of volumes. Water is assumed to reach its depression within the step. There is no travel-time lag and no velocity. In flat terrain overland flow can lag by hours, so modelled onset can be early. Say so; add a stated safety buffer to guidance instead of pretending to minute precision. Recession: keep merged lakes merged (no un-merge logic); treat falling water as approximate. The product's promise is the rising limb.

### 1.7 Known failure modes

| Failure mode | Symptom | Mitigation |
|---|---|---|
| Culvert embankments left in DEM | False lake upstream of a road | Cut culvert lines (step A) |
| Bridges and overpasses | Bare-earth DEM shows the ground under the deck; road edge looks flooded | Tag OSM `bridge=yes` edges as never flooded; route on deck |
| Underpasses, depressed lots, garage ramps | Real hazard, but 2-3 m cells can miss them | Keep 1 m resolution in a few hand-picked windows if time |
| No storm sewers | Over-prediction in small storms | Background drainage knob; say the model is tuned for sewer-overwhelming events |
| Boundary effects | Water vanishes at the box edge; no inflow from outside | Buffer the DEM by 0.5-1 km beyond the 6x6 km display box |
| Lidar noise (~decimetre vertical) | Speckle ponds; false precision | Noise filter; report depth in bands |
| Karst | Sinkholes drain or sometimes back up; infiltration is not modelled | State it. Do not claim groundwater behaviour |
| Buildings as bare earth | Water mapped "inside" footprints | Sample the perimeter ring |
| No velocity | Cannot apply depth x velocity hazard curves directly | Use still-water depth limits (section 3); ponding velocities are low |
| Rate of rise timing | Onset can be early or late | Buffers and bands, not timestamps to the minute |

### 1.8 Tests that make it defensible (cheap)

1. Mass balance: stored + discharged = runoff in, to floating-point tolerance, every step.
2. Monotonicity: more rain never makes any cell shallower (same drains).
3. Synthetic bowls: two bowls and a saddle with hand-computed answers (fill, spill, merge).
4. Oracle: top-level depression capacity equals sum(filled - raw) from an independent Priority-Flood (`richdem` is fine as an oracle).
5. Pump sanity: pump-off depth >= pump-on depth everywhere.

---

## 2. Validating against Hurricane Milton (Oct 9-10, 2024)

### 2.1 What happened, with sources

| Fact | Value | Source |
|---|---|---|
| Rain, University area | About 10.7 in; county said it exceeded a 100-year event | [E] https://www.tampafp.com/?p=243404 (reports the county statement) |
| Rain, North Tampa average | 13.8 in, described by the City as a 300-year rainfall, about a quarter of annual rain in 24 h | [E] https://www.fox13news.com/news/tampa-councilman-calls-investigation-university-area-north-tampa-flooding-what-went-wrong , https://tampa.gov/sites/default/files/document/2024/milton-forest-hills-mtg-stormwater-v1.pdf |
| Rain, range reported for the University Area | 10 to 15 in | [U] Axios, page returned 403; figure seen in search summaries https://www.axios.com/local/tampa-bay/2024/10/21/milton-flooding-north-tampa-usf-university-area |
| Highest NWS-listed totals nearby | St. Petersburg 2.5 S 20.40 in; Tampa 5.1 S 16.51 in (CoCoRaHS) | [E] https://www.weather.gov/media/tbw/TropicalEventSummary/PSHTBW_2024AL14_Milton_Summary.pdf |
| Duck Pond pump station | Lost power; pumping limited; county's largest stormwater facility | [E] https://www.tampafp.com/?p=243404 |
| Outage timing | Tampa Free Press: lost power Wednesday night. County release as summarized by search: about 3 a.m. Thu Oct 10, restored about 10 a.m. Fri Oct 11 | [U] conflicting; hcfl.gov pages 404 on direct fetch |
| City pump stations (Forest Hills, outside our box) | East Ridge lost power ~10 pm Wed, Curiosity Creek ~10:30 pm; generator at Curiosity Creek running Friday noon | [E] City deck above |
| Worst rain window | 8 pm to midnight, Oct 9 | [E] City deck above |

How rare was it at the USF point? From the Atlas 14 table in section 5: 10.7 in in 24 h sits between the 50-year (10.0) and 100-year (11.9) values; 13.8 in is about the 200-year 24-hour value (14.0). If most of it fell in 12 hours it is rarer: the 12-hour 200-year depth is 11.0 in and the 500-year is 13.3 in. So "100-year-plus" and "300-year" are both consistent with the published numbers depending on total and duration. That is a clean, checkable thing to tell judges. [E data, S interpretation]

### 2.2 Observations to compare against

Known-flooded locations (geocode each as a point or short segment):

| Location | Evidence | Source |
|---|---|---|
| Fowler Avenue, with cars partly submerged; Fowler and N 22nd Street near University Mall | Student newspaper report, Oct 10 | [E] https://usforacle.com/2024/10/10/usf-closes-all-campuses-until-saturday-due-to-hurricane-milton |
| USF campus: between Marshall Student Center and the Bookstore; around the Bookstore; Morsani Center for Advanced Healthcare | Same | [E] same |
| Great American Assisted Living, off Fowler Avenue: 135 residents rescued | TV report, Oct 10; boats used in neighbourhoods off Fowler | [E] https://www.fox13news.com/news/hurricane-milton-brings-extensive-flooding-tampas-university-area-neighborhood |
| Fletcher Avenue and Fowler Avenue; parts of USF's Greenway (future stadium site) | Alt-weekly report | [E] https://www.cltampa.com/?p=27782 |
| Timberfalls Apartments, East 113th Avenue: first-floor tenants told to vacate | Same | [E] same. [U] confirm it lies inside your 2-mile box |
| Residents reporting water above mailbox height in North Tampa / University Area | Councilman relaying residents | [E] Fox 13, Oct 16 link above. Location not specific |

Sources to mine in the first hour:

- USGS Flood Event Viewer / Short-Term Network high-water marks for Milton https://www.usgs.gov/mission-areas/water-resources/science/usgs-flood-event-viewer-providing-hurricane-and-flood-response . [U] The STN web service returned 403 to our scripted requests, so we could not confirm that any Milton HWM lies near USF. Milton HWM work is likely concentrated on surge and rivers. Open the viewer in a browser and filter to Hillsborough County before promising a depth-error metric on HWMs.
- NOAA NGS post-Milton aerial imagery https://storms.ngs.noaa.gov/storms/milton and https://oceanservice.noaa.gov/news/oct24/ngs-storm-imagery-milton.html . [U] North Tampa coverage and flight date not confirmed. If covered, it gives both wet and dry ground truth.
- Hillsborough County's independent stormwater investigation (Black and Veatch) included documenting and mapping the extent of Milton flooding [E] https://www.wusf.org/weather/2024-11-14/hillsborough-county-officially-launches-investigation-flooding-issues-during-recent-hurricanes . [U] We did not find the published map. If the county has it online, it is the best extent dataset.
- Photos and video in the news links above for rough depths: wheel-deep, door-deep, mailbox-deep.

You also need known-dry control points (10-20). Without them you cannot report false alarms. Take them from imagery or from team members who were there.

### 2.3 Three honest metrics

Run the model with Milton rain (bracket: 10.7 in and 13.8 in), wet CN, pump OFF for the outage window.

1. **Hit rate on known-flooded points.** Hits / (hits + misses), where a hit is modelled depth >= 0.15 m anywhere within 20-30 m of the point (tolerance for geocoding and DEM resolution). Report the count, e.g. "8 of 10", not just a percentage.
2. **False alarms.** Either (a) share of known-dry control points the model wets, or (b) if you have an extent polygon, the Critical Success Index: hits / (hits + misses + false alarms) on cells. Also state the modelled wet area as a share of the box, so a model that wets everything cannot look good.
3. **Depth error where depth evidence exists.** Mean absolute error and bias against HWMs if any exist; otherwise agreement in depth bands (ankle / knee / waist / deeper) against photo evidence. Present photo-derived depth as ordinal, not metric.

Two comparisons that cost minutes and impress:

- **Baselines.** Same hit and false-alarm numbers for (i) the FEMA Special Flood Hazard Area and (ii) a bathtub. Many flooded homes in Tampa were in Zone X and uninsured; a local TV investigation profiles one in Forest Hills [E] https://www.yahoo.com/news/investigating-zone-x-hillsborough-county-041231551.html .
- **Pump ablation.** Hit rate and wet area with the pump ON versus OFF. If OFF fits better inside the Duck Pond basin, that is mechanistic evidence, not curve fitting.

Benchmark for expectations: a published fill-and-spill tool reported about 71% sensitivity and 99% specificity against reference data [E/U as noted in 1.1].

### 2.4 Keeping the validation honest

- One event, a handful of points: this is a sanity check, not a validation study. Say that.
- If you tune the background drainage knob on Milton, the Milton fit is calibration. Hold out half the points, or report it as "calibrated to Milton".
- News reports over-sample dramatic locations. Hit rate will look better than true skill.
- Rain was not uniform; you are using one number for the box.
- Report misses and name them.

---

## 3. Depth thresholds for guidance

Convert once: 6 in = 0.15 m, 12 in = 0.30 m, 18 in = 0.46 m, 24 in = 0.61 m, 30 in = 0.76 m.

### 3.1 Sources

| Subject | Threshold | Source and status |
|---|---|---|
| Adult on foot, moving water | 6 inches of fast-moving water can knock over an adult | [E] NWS https://www.weather.gov/safety/flood-turn-around-dont-drown |
| Most cars, moving water | 12 inches of rushing water can carry away most cars | [E] same NWS page |
| SUVs and trucks, moving water | 2 feet of rushing water can carry away SUVs and trucks. Some other NWS pages say 18 or 18-24 inches for larger vehicles | [E] same page; variation noted at https://www.weather.gov/media/twc/FloodSafety-OnePager-11-29-2018.pdf |
| Flood deaths in vehicles | Over half of flood drownings involve a vehicle driven into floodwater (CDC, via NWS) | [E] same NWS page |
| Cars, 6 inches | Reaches the bottom of most passenger cars, causing loss of control and possible stalling; a foot floats many vehicles | [U for attribution] Widely repeated and usually attributed to FEMA; we did not find the primary FEMA or NWS page carrying this exact wording. Secondary: https://www.txdot.gov/about/newsroom/stories/six-inches-of-water-can-be-deadly.html |
| Cars, air intake | Around 150 mm water can reach the air intake of small cars; 300 mm is the commonly used depth at which passenger cars start to float | [E] literature table in Pregnolato et al. 2017, Transportation Research Part D 55, 67-81 https://research-information.bris.ac.uk/ws/files/191868409/Full_text_PDF_final_published_version_.pdf |
| Safe speed versus depth | v(w) = 0.0009 w^2 - 0.5529 w + 86.9448, v in km/h, w in mm, R-squared 0.95; reaches roughly zero near 300 mm | [E] same paper |
| Vehicle stability, still water | Small passenger car: 0.3 m. Large passenger: 0.4 m. Large 4WD: 0.5 m. With flow: D x V <= 0.3, 0.45, 0.6 m2/s | [E] Shand et al. 2011 criteria as tabulated in WRL TR2017/07 https://www.unsw.edu.au/content/dam/pdfs/engineering/civil-environmental/water-research-laboratory/publications/WRL-TR2017-07-Vehicle-Stability-Testing-for-Flood-Flows.pdf . The same report discourages ad hoc use by individuals at real crossings |
| People, depth x velocity | Children: low hazard for D x V < 0.4 m2/s, max depth 0.5 m. Adults: low hazard for D x V < 0.6, max depth 1.2 m. Trained workers: < 0.8. Extreme above 1.2 | [E] Cox et al. 2010 as summarized in WRL TR2014/07 https://knowledge.aidr.org.au/media/2334/wrl-flood-hazard-techinical-report-september-2014.pdf |
| Combined hazard classes H1-H6 | H1: D <= 0.3 m, D x V <= 0.3, generally safe. H2: D <= 0.5 m, D x V <= 0.6, unsafe for small vehicles. H3: D <= 1.2 m, D x V <= 0.6, unsafe for vehicles, children, elderly. H4: D <= 2.0 m, D x V <= 1.0, unsafe for people and vehicles. H5: D <= 4.0 m, D x V <= 4.0. H6: above. Velocity limits 2.0 m/s (H1-H4), 4.0 m/s (H5) | [E] AIDR Guideline 7-3, Tables 1 and 2 https://knowledge.aidr.org.au/media/3518/adr-guideline-7-3.pdf |
| UK hazard rating | HR = d x (v + 0.5) + DF. Bands (FD2320): < 0.75 caution; 0.75-1.25 dangerous for some (e.g. children); 1.25-2.0 dangerous for most; > 2.0 dangerous for all. FD2320 default debris factor 0.5 at depth <= 0.25 m, 1.0 above | [E] EA / HR Wallingford supplementary note, May 2008 https://n-somerset.gov.uk/sites/default/files/2024-08/CD%20K10%20Supplementary%20Note%20on%20Flood%20Hazard%20Ratings.pdf . R&D recommendation, not statutory policy |
| Fire engine | About 25 cm treated as the limit for fire appliances (about 12 t) from interviews with a UK fire service; used as the routing restriction in a peer-reviewed accessibility study | [E] Green et al. 2017, NHESS 17, 1-16 https://nhess.copernicus.org/articles/17/1/2017/nhess-17-1-2017.pdf |
| Fire engine, cautionary case | New Zealand crews were told to avoid water deeper than about 10 cm after trucks ingested water through low air intakes | [E] https://www.rnz.co.nz/news/national/483559/seven-fire-trucks-damaged-by-water-sucked-into-engines-during-auckland-floods |
| Emergency vehicles, experiments | 0.6 m fording limit proposed for emergency vehicles, 0.3 m for passenger cars (Kramer et al. 2016, flume tests) | [E] as cited in Pregnolato et al. 2017, link above |
| High-water rescue vehicle | Standard fording depth 30 inches; deeper risks crew and vehicle; at that depth small boats become the tool | [E] Firehouse, May 2023 https://www.firehouse.com/rescue/water-ice/article/53057131/what-fire-departments-must-know-about-high-water-vehicles-for-urban-flooding |
| US fire apparatus standard | [U] We found no fording depth in NFPA 1901 and no published figure for Hillsborough or Tampa apparatus. Ask the local departments; do not present 25 cm as a US standard |
| Slab-on-grade first floor | Hazus default first-floor height for slab foundations: 1 ft above grade (crawlspace 3 ft pre-FIRM, 4 ft post-FIRM) | [E] Hazus Flood Technical Manual tables as reproduced by HRPDC, Appendix A https://www.hrpdcva.gov/DocumentCenter/View/6598 . A default, not a survey of Tampa homes; many older slabs sit lower [U] |
| Damage onset, one-story, no basement, structure | 0% at -2 ft; 2.5% at -1 ft; 13.4% at 0 ft (water at first-floor level); 23.3% at +1 ft; 32.1% at +2 ft; 40.1% at +3 ft; 47.1% at +4 ft | [E] USACE EGM 04-01 https://planning.erdc.dren.mil/toolbox/library/EGMs/egm04-01.pdf |
| Same, contents | 2.4% at -1 ft; 8.1% at 0 ft; 13.3% at +1 ft; 17.9% at +2 ft; 22.0% at +3 ft | [E] same |
| Dollar framing | FEMA materials say one inch of water in a home can cause roughly $25,000 of damage; wording varies between "roughly", "up to" and "more than" | [E] https://agents.floodsmart.gov/sites/default/files/media/document/2025-07/fema-nfip-just-one-inch-of-floodwater-flyer-06-2023.pdf |

### 3.2 Thresholds we recommend the product uses [S]

Water in this model is ponded and slow, so use still-water depth limits and say so. A published accessibility study made the same choice because modelled velocities in ponded hollows were typically under 1 m/s [E] Green et al. 2017, link above.

| Class | Edge closes at | Basis |
|---|---|---|
| On foot (general public) | 0.30 m | AIDR H1 upper depth; well under the 0.5 m child limit. Warn about hidden hazards regardless |
| Passenger car | 0.15 m | Air-intake / loss-of-control depth; half the 0.3 m stability limit |
| SUV / pickup | 0.30 m | Below the 0.5 m large-4WD stability limit, consistent with official caution |
| Fire engine / ambulance | 0.25 m | Green et al. 2017. Mark as an assumption pending local confirmation |
| High-water rescue vehicle | 0.75 m | 30-inch fording figure |
| Beyond | Boat only | Same source |

Parked-car guidance: "at risk" when depth at the parking spot reaches 0.15 m; "likely total loss / may float" at 0.30 m. Home guidance: "water at the door" at 0.15-0.30 m above adjacent grade (give the range, because floor heights are unknown).

Public wording rule: the app never says a flooded road is safe to drive. Official guidance is to turn around [E, NWS link]. For public classes the thresholds decide when to tell people to leave early or stay put; they are not permission to ford.

---

## 4. Routing engine

### 4.1 Prior art to cite

- Green et al. 2017 (Leicester): flood depth grids from a hydrodynamic model became road restrictions at 25 cm; Dijkstra quickest-path by travel time; fire and ambulance coverage against 10- and 8-minute targets fell sharply as flooding grew [E] https://nhess.copernicus.org/articles/17/1/2017/nhess-17-1-2017.pdf
- Coles et al. 2017 (York): emergency accessibility to care homes during surface-water and river floods; 7 of 22 care homes beyond the 8-minute ambulance target in the 2014 surface-water flood, J. Hydrology 546, 419-436 [E] https://dspace.lboro.ac.uk/2134/23621
- Yin et al. 2016 (Shanghai): 2D pluvial model plus a depth-dependent road measure, J. Hydrology 537, 138-145 [E] https://dspace.lboro.ac.uk/2134/20960 . [U] the specific closure depth they used was not confirmed.
- Pregnolato et al. 2017: depth-disruption function for speed versus depth (section 3) [E].
- Time-dependent shortest paths: Dijkstra remains correct when the network is FIFO (no overtaking); without FIFO the general problem is hard [E] https://people.csail.mit.edu/bdean/tdsp.pdf , https://i11www.iti.kit.edu/extra/publications/dw-tdrp-09.pdf

What is ours: per-edge closure times derived from our own depth model through depression water levels, the vehicle-class threshold set, the latest-safe-departure map, and the car-move and dry-parking logic.

### 4.2 Graph and edge depth

- Nodes and directed edges from OSM `highway=*` (keep service roads and parking aisles: cars live there). Store in CSR form: `offset[Int32, n+1]`, `target[Int32, m]`, `length_m[Float32, m]`, `speed[Uint8, m]`, `flags[Uint8, m]` (bridge, one-way, class restrictions).
- Edge depth. Naive: sample the depth grid every cell along the edge geometry and take the maximum. Better and cheaper for time series [S]: because depth = lake level - ground, precompute for each edge a short list of `(lake_node, min_ground_z)` pairs for the depressions it crosses. Then

```
edge_depth(e, t) = max over pairs of ( level[lake][t] - min_z )        (0 if negative)
t_close[e][class] = first t where edge_depth >= threshold[class]
t_open[e][class]  = first later t where it falls back below (optional)
```

- Sample ground from the DEM along the centerline using a small median window to damp lidar noise [S]. Bridges: depth 0. Underpasses: sample the low point.
- Store `t_close` as `Uint16` step indices, 65535 = never. Four classes x 50k edges = 400 kB.

### 4.3 Queries and algorithms

| User question | Algorithm | Status |
|---|---|---|
| Best route now for class c | Time-dependent Dijkstra (or A* with straight-line / max-speed heuristic). Label = earliest arrival. Relax edge (u,v) only if arrival_u + w_e <= t_close[e][c]. Optional: cap speed with the depth-disruption function | [E] valid because closures only remove options, so the network is FIFO and waiting never helps |
| Which roads stay dry | Edges with max depth below ~0.05-0.10 m for the whole scenario; show the largest connected dry component that reaches an exit | [S] |
| Until when is this address connected to the outside / to a fire station (cut-off time) | Max-min ("widest path") Dijkstra: `C[source] = +inf`; pop the largest label; `cand = min(C[u], t_close[e][c])`; keep the larger. C[v] = the last time v is still connected | [E] classic bottleneck path; [S] use here. Ignores travel time, which is minutes against hourly flood steps |
| Last safe time to leave (latest departure to reach safety) | Backward search from all safe destinations on the reversed graph: `L[dest] = horizon`; `L[u] = max over edges (u,v) of min(t_close[e], L[v]) - w_e`; max-heap, label-setting | [S] our formulation. Correct as label-setting because labels only decrease along the search. One run gives L for every node: draw it as an isochrone map |
| Can rescue reach you | Multi-source run from fire stations (OSM `amenity=fire_station`) per class: fire engine, high-water vehicle. Report: reachable now? travel time now? cut-off time? | [E] multi-source Dijkstra = single run with all stations at distance 0 |
| Move your car by T | `T = min( first time parking-spot depth >= 0.15 m , L_car[nearest node] ) - buffer`. If the spot never floods in the scenario: "no move needed in this scenario" | [S] |
| Nearest dry high-ground parking | Candidates: OSM `amenity=parking` polygons that have zero modelled depth in the 500-year pump-off run, lie outside every depression, and prefer `parking=multi-storey`. Reverse multi-source Dijkstra from candidates over car-open edges gives every node its nearest candidate and route in one run | [S] |
| Am I an island | `C_car[v] <= t` and `C_rescue[v] <= t` | [S] |

Buffer [S]: subtract at least one model time step plus a fixed margin (e.g. 60 minutes) from every "by T" message, and print it as "before about 9 pm", not "20:47".

### 4.4 Making it fast in the browser

- CSR typed arrays; no objects per node or edge. A binary heap on parallel `Float32Array` keys and `Int32Array` ids, with lazy deletion (push duplicates, skip stale pops). A 4-ary heap is a small further win.
- Because closure times are discretized to at most ~100 steps, the max-min query can use a bucket queue, or simply run one BFS per time step over open edges: 100 steps x 50k edges = 5 million edge visits.
- Expected cost: one Dijkstra over ~10-20k nodes and 20-50k edges should take low single-digit milliseconds in a modern JS engine [S estimate, not measured]. Measure with `performance.now()`, report p50 and p95 over 1,000 random queries on the demo laptop.
- Precompute per scenario (return period x pump on/off): `t_close`, cut-off times for all classes, latest-departure labels, nearest-dry-parking labels. Then every address tap is a table lookup; only custom routes run live.
- Snap an address to the nearest edge with a uniform grid index over edge segments.
- Put the precompute in a Web Worker so the map never stalls.

### 4.5 Failure modes

- Garbage in: a false DEM pond closes a real road. The culvert and bridge fixes in 1.3 matter more for routing than for the depth map.
- OSM one-ways, gates and private roads can strand or over-connect; allow contraflow for emergency classes as a stated assumption.
- Closure is modelled, not observed. Add a manual "road reported closed / open" override and say live reports beat the model.
- Thresholds are per class, not per vehicle. Low cars stall earlier.

---

## 5. Report card grade

### 5.1 Rainfall inputs: NOAA Atlas 14 at USF

Source: NOAA Atlas 14, Volume 9, Version 2 (Southeastern States), partial-duration series, point query at lat 28.0587, lon -82.4139 (USF Tampa campus), retrieved 2026-11-21 from the PFDS data service [E]
https://hdsc.nws.noaa.gov/cgi-bin/new/cgi_readH5.py?lat=28.0587&lon=-82.4139&type=pf&data=depth&units=english&series=pds
(interactive page: https://hdsc.nws.noaa.gov/pfds/pfds_map_cont.html?bkmrk=fl )

24-hour rainfall depth, inches (90% confidence interval):

| Return period | 24-h depth | 90% interval |
|---|---|---|
| 2-year | 4.51 | 3.93 - 5.24 |
| 5-year | 5.53 | 4.80 - 6.44 |
| **10-year** | **6.60** | 5.69 - 7.72 |
| **25-year** | **8.40** | 7.13 - 10.6 |
| 50-year | 10.0 | 8.21 - 12.7 |
| **100-year** | **11.9** | 9.33 - 15.5 |
| 200-year | 14.0 | 10.4 - 18.7 |
| **500-year** | **17.2** | 12.2 - 23.6 |
| 1000-year | 19.9 | 13.5 - 27.2 |

Shorter durations for building a hyetograph (inches):

| Duration | 10-yr | 25-yr | 100-yr | 500-yr |
|---|---|---|---|---|
| 1 hour | 2.94 | 3.38 | 4.03 | 4.75 |
| 2 hours | 3.66 | 4.24 | 5.12 | 6.13 |
| 3 hours | 4.06 | 4.77 | 5.90 | 7.30 |
| 6 hours | 4.74 | 5.73 | 7.48 | 9.89 |
| 12 hours | 5.49 | 6.84 | 9.44 | 13.3 |

Caveat: the service returns unlabeled rows; we mapped rows to durations using the standard Atlas 14 order (5, 10, 15, 30, 60 min; 2, 3, 6, 12, 24 h; 2, 3, 4, 7, 10, 20, 30, 45, 60 days). The values are monotonic and the 24-hour 100-year value is plausible for Tampa, but open the interactive page once and confirm the row labels. Note how wide the intervals are: the 100-year 24-hour depth could be 9.3 or 15.5 inches. That alone forbids decimal-point grades.

### 5.2 The scheme [S]

Principle: the letter means something physical - how often water is expected to reach the building - and every other factor can only lower it, by a visible notch, for a stated reason.

Core metric: d_T = modelled depth at the building perimeter (90th percentile of the ring of cells around the footprint) in the T-year 24-hour storm, pumps running. "Reaches the building" = d_T >= 0.15 m.

| Grade | Rule | Rough annual chance of water at the building |
|---|---|---|
| A | Dry (< 0.15 m) even in the 500-year storm | Below 0.2% |
| B | Dry at 100-year, wet at 500-year | 0.2% - 1% |
| C | Dry at 25-year, wet at 100-year | 1% - 4% |
| D | Dry at 10-year, wet at 25-year | 4% - 10% |
| F | Wet at 10-year | Above 10% |

Notches (each lowers the grade one step; at most two apply; each is printed on the card):

| Factor | Rule | Why |
|---|---|---|
| Pump dependence | In the 25-year storm, switching the pump off adds >= 0.15 m at the building or flips it from dry to wet | The address is only as safe as the power supply. Milton showed that failure mode [E, section 2] |
| Isolation | In the 25-year storm the address is cut off from every fire station for the high-water vehicle class, or car access is cut for more than a few hours | Access is part of risk even when the floor stays dry |
| Floor exposure | Depth at the building >= 0.30 m at the grade-defining return period | Above the Hazus slab default; structure damage begins [E, section 3] |

Caps (evidence overrides the model):

| Evidence | Cap | Why |
|---|---|---|
| Documented flooded in Milton (within ~50 m of a verified report) | No better than C | Milton's rain was roughly a 100- to 200-year 24-hour event at this point [E data] |
| FEMA Special Flood Hazard Area (zones A, AE, AH, AO) | No better than C | By definition a 1% annual chance zone |
| FEMA shaded Zone X (0.2% annual chance) | No better than B | By definition |

Unshaded Zone X gives no bonus. Zone X homes flooded in Milton [E, section 2.3].

Supporting facts on the card, not scored separately: elevation relative to surroundings (height of the building above its depression's spill level, or "not in a depression"); which basin and whether it has a pump; depth band in each of the four storms; cut-off times by vehicle class; what was observed in Milton nearby.

Why not 0-100: a weighted score invites arguments about weights and implies precision the inputs do not have. A rule a resident can repeat back is easier to defend. If the UI needs a number, show the estimated annual-chance band.

### 5.3 Keeping it honest

- Show a range. Re-run with (lower Atlas 14 bound, CN - 5) and (upper bound, CN + 5), and with the drainage knob at its plausible extremes. Print "C (range B-D)". If the range spans three or more letters, print "low confidence".
- Depth in bands (none / under 6 in / 6-12 in / 1-2 ft / over 2 ft), never centimetres.
- Times as "before about 9 pm".
- A fixed footer on every card: screening estimate from a simplified model; no storm sewers, storm surge, river flooding or groundwater; one calibration event; not a FEMA flood determination, not for insurance, lending or purchase decisions; in a storm follow Hillsborough County Emergency Management and the National Weather Service; never drive or walk into floodwater.
- Publish the method, the thresholds and the validation hits and misses inside the app.
- Do not grade addresses whose catchment is clipped by the DEM edge; show "outside validated area".
- Fairness: the University Area is a lower-income, mostly renter community hit hard in Milton [E] https://www.fox13news.com/news/hurricane-milton-brings-extensive-flooding-tampas-university-area-neighborhood . A grade can affect people. Frame it as "what to prepare for", and pair every low grade with an action.

---

## 6. Off the grid: what runs offline

Everything after data preparation can run with no network: the runoff equation, the volume routing, level-to-depth rendering, every routing query, the grade lookup. Storms take out power and cell service, so this is a core feature, not a garnish.

| Asset | Form | Rough size (estimates) |
|---|---|---|
| Ground elevation raster | `Uint16` centimetres above a base; only cells inside depressions need real values | 2 m grid: 9 M cells = 18 MB raw; 3 m: 4 M cells = 8 MB raw. Expect several-fold reduction with Brotli/gzip or PNG because terrain is smooth |
| Cell-to-depression raster | `Uint16` node id | Same raw size; compresses much better (large uniform regions) |
| Depression tables | capacities, tree links, overflow targets, stage-storage tables, CN areas, drains | ~0.1-1 MB |
| Level time series per scenario | `Float32[nodes x steps]` | ~0.4 MB per scenario at 1,000 nodes x 96 steps; 8 scenarios ~3 MB, or recompute live and ship none |
| Road graph | CSR arrays + `t_close` | ~1 MB for 50k edges |
| Road geometry | quantized polylines, or reuse basemap tiles | 1-3 MB |
| Address index | points + street names for offline search | 1-3 MB |
| Basemap | vector tiles for the box as a single PMTiles file, or a pre-rendered raster | a few MB |
| App shell | JS, CSS, HTML | < 1 MB |
| **Total** | | **roughly 5-25 MB** |

Encoding choices:

- Simplest and robust [S]: ship raw typed-array binaries, let the server apply Brotli, read with `fetch().arrayBuffer()`.
- PNG-as-data is the established trick when the raster must be a GPU texture. Mapbox Terrain-RGB decodes as height = -10000 + (R x 65536 + G x 256 + B) x 0.1 [E for the formula via MapLibre's decoder and third-party docs; the official Mapbox page we opened did not print it] https://docs.mapbox.com/data/tilesets/reference/mapbox-terrain-rgb-v1/ . For a custom grid, pack centimetres into R and G. Keep alpha at 255: canvas readback premultiplies alpha and corrupts packed values [S].
- Render depth in a WebGL fragment shader: sample elevation and node-id textures, look up the node's level in a small data texture, colour by depth band. Changing the time slider updates one tiny texture.

Service worker: precache the app shell and all data files on first load; cache-first strategy; show "data from <date>, offline ready" in the UI. Use the Cache API or IndexedDB for the binaries. Test in airplane mode before the demo.

What cannot be offline: live rainfall and forecasts, live road reports, geocoding of addresses outside the bundled index. Degrade gracefully: offline, the user sets "rain so far" and "pump working?" by hand, or uses the last cached forecast. That manual mode is also the best demo.

---

## 7. Suggested 7-hour split for these two components

| Hours | Depth model | Routing |
|---|---|---|
| 0:00-0:45 | Download and clip DEM, resample, culvert cuts, outlets | Pull OSM graph, build CSR arrays |
| 0:45-2:30 | Sweep, tree, top-level cascade (fallback working by 2:00), tests 1-3 | Edge-to-depression table, binary heap, plain Dijkstra |
| 2:30-3:30 | Merge worklist, drains, time stepping, pump toggle | `t_close`, time-dependent Dijkstra, multi-source from stations |
| 3:30-4:30 | Milton run, hit / false-alarm / baseline table | Cut-off map, latest-departure map, car-move and dry-parking |
| 4:30-5:30 | Return-period runs, uncertainty variants, grade table | Precompute per scenario, benchmark p50 / p95 |
| 5:30-7:00 | Offline packaging, shader, polish, rehearse the two-minute explanation | Same |

Tradeoff stated plainly: choosing fill-spill over a hydrodynamic model gives up velocities, flow depth on slopes and true timing, in exchange for an engine that is explainable, mass-conserving, pump-aware and interactive on a phone.

---

## 8. Verification status

Verified today by opening the primary document or data service: Atlas 14 values; TR-55 Table 2-2a; AIDR H1-H6 limits; FD2320 formula and bands; USACE EGM 04-01 damage percentages; Hazus slab default (through a secondary reproduction of the Hazus tables); Shand vehicle criteria and Cox people criteria (through WRL reports that tabulate them); Pregnolato function and literature table; Green et al. 25 cm threshold and 12 mm/h drainage loss; Firehouse 30-inch figure; NWS Turn Around Don't Drown wording; Priority-Flood complexity; Fill-Spill-Merge description and complexity; City of Tampa Milton deck; NWS Milton summary rainfall table; SWFWMD Duck Pond project article; local news items listed in section 2.

Not verified - treat as leads:

1. Duck Pond capacity (50-90 cfs), 25-year design level and exact outage and restore times: from search snippets of county pages that returned 404. The outage start time conflicts between sources.
2. Axios figures (10-15 in; "Lake Fowler"): page blocked.
3. Whether any USGS Milton high-water mark exists near USF: STN service blocked our requests.
4. Whether NOAA post-Milton imagery covers North Tampa, and whether the county's Milton flood-extent map is public.
5. The "6 inches reaches the bottom of most cars / a foot floats many vehicles" wording: no primary FEMA or NWS page found.
6. Any US fire apparatus fording standard or local department figure.
7. SSURGO soil groups at USF; whether local soils are dual-class.
8. DEM cell size and vertical accuracy for the USF tiles.
9. SCS Type II Florida Modified ordinates; alternating-block and Lindsay breaching references (recalled, not opened).
10. Safer_RAIN accuracy numbers (publisher page blocked; from a search summary).
11. Yin et al. closure depth; Mapbox's own statement of the Terrain-RGB formula.
12. All runtime and payload figures: estimates until measured on the demo machine.
13. Timberfalls Apartments location relative to the 2-mile box; contributing area of the Duck Pond basin.
