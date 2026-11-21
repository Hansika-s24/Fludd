# Fludd: build plan for HackJam '26

Written 2026-11-21 before hacking starts. Hacking window 11:00 to 18:00 EST. A team of two, Harshith and Hansika, each with their own Claude Code session and AI agents.
This plan contains no implementation code on purpose: the guide says all project work happens after 11:00. It describes files, contracts, algorithms in words, tests and a schedule. Research behind every choice is in the numbered files next to this one.

| File | What it holds |
|---|---|
| `01-rules-and-tracks.md` | Rules, schedule, track wording, pitch fact-check, Gemini basics |
| `02-flood-and-elevation-data.md` | FEMA zones, lidar elevation, Milton evidence, rainfall (every endpoint called today) |
| `03-drainage-roads-live-data.md` | Drainage layers, road graph, fire stations, live feeds, geocoder, basemap |
| `04-depth-model-and-routing.md` | Depth model, routing engine, thresholds, grading scheme, validation |
| `05-design-skills.md` | Design and map skills research |

---

## Team and documents

**Team of two, split as logic versus presentation.**

| Person | Share | Owns | Folders |
|---|---|---|---|
| **Hansika** | About 60%: all logic, data and backend | Lanes A (data), B (depth model), C (routing engine); the grade rules, data loaders and address lookup from lane E; the backend half of lane F (Supabase project, tables, storage, access rules, reports and moderation routes, Gemini provider and both Gemini routes, weather proxy, health route, the plain form upload the Apple Shortcut posts to) | `pipeline/`, `supabase/`, `web/lib/`, `web/app/api/`, `web/public/data/`, and the tests for all of those |
| **Harshith** | About 40%: the interface, plus lead duties | Lane D (map, water layer, timeline, design system, iPhone Home Screen app); the interface half of lane E (report card, guidance cards, address search box, validation panel, all states); the interface half of lane F (photo report screens, admin queue and inspector, calibration chart, the "Report flooding" Apple Shortcut); lane G (repo, scaffold, contracts, toy fixture, stubs, skills kit and research files into the repo, CI, deploy, domain, 13:00 integration, README, demo script, submission) | `web/app/` pages and layouts (not `web/app/api/`), `web/components/`, global styles, `web/tests/smoke/` and `web/tests/components/`, `docs/`, root files, `.github/`, `.claude/` |

**The boundary.** Harshith's components call functions exported from `web/lib/` and fetch the routes under `web/app/api/`. Hansika never edits components; Harshith never edits `web/lib/` or the routes. What may be called is listed in section 5, "What the interface can call". At 11:10, as part of the scaffold, Harshith's session writes stub versions of those functions inside `web/lib/`, placeholder routes inside `web/app/api/`, and the toy fixture; at "scaffold pushed" those folders pass to Hansika and Harshith does not touch them again. Harshith builds against the stubs and the fixture until the real ones land.

**First 15 minutes (11:00 to 11:15):** the two agree the contracts together, before either session starts a lane.

**To swap a piece:** say it out loud, move it whole with its folders, and note it in both hacker docs.

**The three documents**

| Document | What it is for |
|---|---|
| `PLAN.md` (this file) | The whole project: framing, scope, architecture, contracts, lanes, schedule, design direction, risks |
| `HACKER-HARSHITH.md` | Harshith's working document and his Claude session's: ownership, timeline, copy-paste prompts, live progress checklist, fallbacks |
| `HACKER-HANSIKA.md` | The same for Hansika and Hansika's Claude session |

All three, plus the research files `01` to `05`, are committed to the repo under `prep/` at 11:00 by Harshith, together with the needed part of the Claude Code skills kit under `.claude/`. Until then the research and the kit exist only on Harshith's PC, so Hansika's session reads them from the repo. If an organizer rules that planning notes must stay out of the repo, `prep/` stays local and is shared another way.

**Two-person git rules**

1. One repo, both on `main`. No branches, no force push.
2. Strict folder ownership (table above). Never edit the other person's folders.
3. Pull with rebase before every push. Small commits, each one working.
4. Stage by folder, never everything.
5. Contract changes only by agreement, announced out loud, then written by Harshith in `docs/contracts.md`.
6. Each person's Claude updates only that person's hacker doc, so the two docs never conflict.
7. Each person commits under their own GitHub account.

---

## 0. Before 11:00

1. **Check in** 9:00 to 10:00 at ENB 109. Opening ceremony 10:00 at CMC 141. You cannot submit unless you are checked in.
2. **Ask an organizer one question:** "Is pre-event research and planning allowed, as long as no code, design assets or data were prepared?" The guide only says "You may not work on your project before the event" and is silent on planning. If the answer is no, tell them what exists (this plan and research notes) and follow their ruling.
3. **Create the Gemini API key** at aistudio.google.com/apikey and open the rate-limit page to read your real free-tier limits. Do not paste the key anywhere yet.
4. **Sign in** to Vercel, GitHub and Supabase in the browser. Do not create the repo or the Supabase project until 11:00.
5. **Do not carry anything from `prep/ui-preview.html` or the `visuals/` folder into the repo.** Those were made before 11:00.

Things the cheating check looks at (MLH guidance to organizers): git history that starts before the event, one giant first commit, pushes after the deadline, and whether the people on the team can account for an advanced project. So: create the repo after 11:00, commit small and often under two GitHub accounts, and each person must be able to explain any file on their own side: Hansika the depth model, routing, grade rules and backend; Harshith the interface and the product decisions. Both people must check in, and each does the account steps above for their own accounts; the per-person lists are in the hacker docs.

---

## 1. Product framing

**Name:** Fludd
FLUDD is also the name of the water pack in Nintendo's Super Mario Sunshine. Fine for a hackathon; check trademarks before using the name commercially.
**Tagline:** What the flood map doesn't tell you about your address.
**One-line outcome:** Type an address near USF, get a letter grade for how it holds up in a storm, see where the water goes hour by hour, and know when to move your car.

**What makes this different**
1. **A depth model built around bowls, spill points and pumps.** It fills low ground the way the University Area actually flooded, and a pump station is a first-class object you can switch off.
2. **Routing that understands depth and time.** Each road closes at a different hour for a car, a truck and a rescue vehicle, so the app can say "move your car by" and "rescue can reach you until".
3. **It checks itself against Milton.** The county recorded 548 flood-damage points inside the study box. The model's hit rate on those points is shown in the app, next to how many sat inside FEMA's high-risk zones.

**Hero metric (compute it, never invent it):** share of the 548 county-recorded Milton flood-damage points that fall where the model predicts water, compared with the share inside a FEMA Special Flood Hazard Area. If the numbers are unflattering, show them anyway with the false-alarm area; an honest validation beats a suspicious one.

### Pitch corrections (from the fact-check)

| Your draft says | Say this instead | Why |
|---|---|---|
| "Flood zone X, a 1-in-500 annual chance" | "Axios reported the University Area lies in flood zone X, FEMA's lower-risk category" | "1-in-500" is Axios's gloss. Unshaded zone X means below the 500-year level |
| Rainfall "10 to 15 inches" with the county as source | Pick one: Axios 10 to 15 in, or county-derived reporting about 10.7 in | Sources differ; do not merge them |
| Link to the hcfl.gov release | Tampa Free Press reprint (tampafp.com/?p=243784) | Both county pages now return 404 |
| "a county pump station that lost power" | "Duck Pond, the county's largest stormwater pump station, lost power" | Named in sources. Do not say a generator failed there; no source says so |
| "The University Area is mapped as flood zone X" as a blanket claim | "Parts of the area are zone X and parts are zone AE; the app shows the zone for each address" | A FEMA lookup at a University Area test point returned AE (high risk), while USF's centre returned X. The contrast is per address, not for the whole neighbourhood |
| Pump station position on the map | Label it "approximate" | The only county record is "Duck Pond East" and is flagged as needing GPS |

### Tracks

| Track | What judges look for | What to show |
|---|---|---|
| Home Turf | A local problem, the solution, effectiveness | The University Area in Milton; a real address a mile from the judging room; the validation number |
| Best Overall | Creativity, execution, a well-rounded solution | The full loop: grade, storm playback, guidance, photo report, admin, calibration |
| Gemini API | The project must actually call Gemini | Photo to depth estimate with a fixed schema; plain-language guidance written from the model's numbers |
| Off the Grid | Environmental sustainability, not offline use | Weakest fit. Argue climate adaptation: UN SDG 11 and 13, stormwater infrastructure, changing what residents do before a storm. Tick it, do not build for it |

A team can win only one prize. Home Turf is the strongest fit; lead the pitch with it.

---

## 2. Scope and cut lines

| Tier | Feature | Cut line |
|---|---|---|
| Must ship | Address search, map, modelled depth for 4 storm sizes plus a Milton replay, letter grade with reasons, storm timeline, pump on/off, "move your car by" and "rescue can reach you until" | None. This is the product |
| Must ship | Milton validation panel with the hero metric | If the model is not validated by 15:00, show the 548 points as an evidence layer and state that validation is not done |
| Should ship | Resident photo report: photo, phone location, Gemini depth reading | If upload to Gemini to queue is not working by 15:00, cut to seeded demo reports and say so in the README |
| Should ship | Admin queue: approve, edit, reject; approved reports appear live and block roads in routing | Cut with the photo report |
| Should ship | Calibration view: model depth vs approved photo depth | Cut to a single error number if short on time |
| Should ship | **iPhone, part 1:** the site installs to the Home Screen and behaves like an app (full screen, bottom sheet over the map, safe areas, no browser chrome) | About 30 minutes inside lane D. Do not cut; this is how judges will hold it |
| Should ship | **iPhone, part 2:** a "Report flooding" Apple Shortcut: take photo, get current location, send to the reports route, show the reading. Runs from the Action Button, Siri or a Home Screen icon | Built by Harshith on an iPhone in the Shortcuts app after Hansika's reports route works. Cut with the photo report |
| Stretch | Live feeds: NWS alerts, USGS gauge at Fowler Ave, Tampa street-flooding layer | Start only after 15:00 if everything above works |
| Stretch | Offline use (cached data, installable) | Earns nothing on any track. Last |
| Not building | A native Swift app | Needs a Mac with Xcode; this is a Windows PC. The Home Screen web app plus the Shortcut cover the iPhone without it. Say this plainly if asked |
| Not building | Storm surge, river flooding, insurance advice, turn-by-turn navigation, user accounts for residents | Out of scope; listed in the README as limits |

---

## 3. Architecture

```
Public data (FEMA, USGS 3DEP, OSM, county and city GIS)
        │  fetched once after 11:00, kept as raw files
        ▼
pipeline/ (Python)   bronze = raw   →   silver = clipped, reprojected, validated   →   gold = compact app files
        │                                   │
        │                                   ├─ depth model: bowls, spill points, pumps, hourly water levels
        │                                   └─ road graph with, per road segment, which bowl it sits in and how low it is
        ▼
web/public/data/  (static gold files, versioned by a manifest)
        ▼
web/ (Next.js on Vercel)
   browser:  map + water layer drawn from the gold files · routing engine in a worker · grade rules
   server routes:  Gemini calls · report intake · weather proxy
        ▼
Supabase:  reports table · photo storage · admin login · realtime feed
```

**Why the heavy lifting is precomputed:** the model runs once per storm scenario in Python and writes a small table of water levels per bowl per hour. The browser only needs two rasters (ground height, bowl id) and that table to draw any hour of any storm, so the timeline and pump toggle are instant and the demo cannot stall on a slow server.

### Stack

| Concern | Choice | Note |
|---|---|---|
| App | Next.js 15 App Router, React 19, TypeScript strict | Playbook default |
| Styling | Tailwind v4 with oklch tokens, shadcn/ui, mapcn map components | Light mode first |
| Map | MapLibre GL JS v6, OpenFreeMap "liberty" style | No key, no card |
| Water layer | Custom WebGL layer inside MapLibre | Depth = bowl water level minus ground height, per pixel |
| Routing | Own engine in TypeScript, typed arrays, in a web worker | Own work; lead with it |
| Depth model | Own implementation in Python (numpy, scipy), rasterio to read the elevation file | Own work; lead with it |
| Data pipeline | Python 3.11 managed with uv; bronze, silver, gold folders with a manifest | Medallion, kept small |
| Reports, storage, admin login, live feed | Supabase | Kit has the official Supabase skills |
| AI | Gemini through `@google/genai`, model `gemini-4-hydrogen`, fallback `gemini-3.8-flash` | Behind a provider interface, chosen by env var |
| Tests | pytest (model), vitest (routing, grade, contracts), Playwright (one smoke path) | |
| CI | GitHub Actions: lint, typecheck, tests, secret scan | |
| Deploy | Vercel, first deploy by 11:25 | Deploy early, then keep it green |

### Playbook sections scoped out, and what that costs

| Playbook item | Decision | What is given up |
|---|---|---|
| FastAPI backend, Postgres, Redis, Docker Compose | Replaced by Next.js server routes plus Supabase | One-command local stack; a separate typed API |
| Dagster or Airflow orchestration | A single pipeline entry point with ordered steps and a manifest | Lineage UI, retries, scheduling |
| LangGraph agents, RAG | None. Two narrow Gemini calls with forced structure | Nothing this product needs |
| Prometheus, Grafana, Sentry | Structured logs and a `/api/health` route only | Dashboards, traces |
| Hash-chained audit log | A plain append-only moderation log in the reports table | Tamper evidence |
| Load tests | One timing benchmark for routing and model run | p95 under concurrency |

State these in the README under "Tradeoffs".

---

## 4. Repo layout (create at 11:00)

```
fludd/
  README.md                 what it is, AI disclosure, frameworks, validation, limits
  .env.example              every key with purpose and required/optional
  .github/workflows/ci.yml  lint, typecheck, tests, secret scan
  docs/
    contracts.md            the data contracts in section 5, copied in at 11:05
    method.md               how the model, routing and grade work; thresholds and sources
    demo-script.md          the judging walkthrough
  pipeline/                 Python, uv project
    config.py               study box, grid size, storm sizes, file paths (only place settings live)
    ingest/                 one file per source: elevation, fema, osm, county, city, evidence
    silver/                 clip, reproject, validate; one file per dataset
    model/
      runoff.py             rainfall to runoff
      depressions.py        the sweep that finds bowls and spill points
      routing_volume.py     moves water between bowls; drains and pumps
      scenarios.py          runs each storm, writes hourly levels
      validate.py           Milton comparison and the hero metric
    graph/
      build.py              road graph arrays and the road-to-bowl table
    gold/export.py          writes web/public/data and the manifest
    run.py                  one entry point: ingest, silver, model, graph, gold
    tests/                  mirrors the folders above
  web/                      Next.js app
    app/
      page.tsx              the map and report card
      admin/                review queue and calibration (login required)
      api/
        reports/            intake and moderation
        gemini/             photo reading and guidance text
        weather/            NWS proxy (adds the required User-Agent)
        health/
    components/
      map/                  map shell, water layer, markers, legend, timeline
      report-card/          grade, reasons, comparison tiles
      guidance/             car, rescue, door cards
      report/               photo capture and submit flow
      admin/                queue rows, calibration chart
      ui/                   shadcn primitives
    lib/
      data/                 loads and validates the gold files
      routing/              graph, heap, searches, worker
      grade/                grade rules and notches
      gemini/               provider interface and the Gemini implementation
      supabase/             clients and typed queries
      config.ts             the only place env is read
    public/data/            gold files and manifest.json
    tests/                  unit, contract, and one Playwright smoke test
  supabase/
    migrations/             reports table, storage bucket, access rules
```

Rules this layout enforces: one file per data source, one file per model stage, settings read in exactly one place per side, `web/lib` holds logic and `web/components` holds display, tests mirror the folders.

---

## 5. Contracts between lanes

Written as descriptions, not code. Copy this section into `docs/contracts.md` at 11:05. The lead also creates a **toy fixture** at 11:10: a tiny synthetic area with two bowls, one spill point, one pump and a dozen road segments, in exactly these formats, so every lane can build and test before real data lands. In the same step Harshith's session writes stub versions of every function in "What the interface can call" below, and placeholder routes, so the interface can be built before Hansika's real ones land.

### Gold files in `web/public/data/`

| File | Contents | Produced by | Used by |
|---|---|---|---|
| `manifest.json` | Version, study box corners, grid width, height and cell size, list of scenarios, units, data sources with dates | Pipeline | Everything |
| `ground.png` | Ground height per cell, packed into image channels so the browser can read it as a texture. Height range recorded in the manifest | Pipeline | Water layer, grade |
| `bowls.png` | Bowl id per cell, same grid. Zero means "drains away" | Model | Water layer, grade |
| `bowls.json` | Per bowl: id, lowest point, spill height, where it spills to, parent bowl, pump present, storage at spill | Model | Grade, method page |
| `levels/<scenario>.json` | Per hour, per bowl: water surface height. One file each for the 10, 25, 100 and 500-year storms and the Milton replay, each with pump on and pump off | Model | Water layer, routing, grade |
| `graph.bin` + `graph.json` | Road graph as flat arrays: node positions, segment ends, length, speed class; index layout described in the json | Graph | Routing |
| `segments.json` | Per road segment: the bowls it crosses and its lowest ground height inside each | Graph | Routing (closure times) |
| `layers/*.geojson` | FEMA zones, pump stations, drains, ponds, fire stations, hospitals, Milton damage points, known-flooding parcels | Pipeline | Map |
| `validation.json` | Hit rate on Milton points, false-alarm area, the FEMA baseline, counts, the date computed | Model | Validation panel, README |

### Derived values (same definition everywhere)

| Value | Definition |
|---|---|
| Depth at a cell | Water level of the cell's bowl minus ground height, never below zero |
| Depth at a building | 90th percentile of depth in the ring of cells around the address point |
| A road segment closes for a vehicle class | First hour when depth at its lowest point reaches that class's limit |
| Vehicle limits | On foot 0.30 m, car 0.15 m, SUV or pickup 0.30 m, fire engine 0.25 m, high-water vehicle 0.75 m. Sources in `04`, section 3 |

### Server routes

| Route | Takes | Returns |
|---|---|---|
| `POST /api/reports` | Photo, position (phone GPS or dropped pin), time | Report id, Gemini reading, status "waiting" |
| `GET /api/reports?status=approved` | Nothing | Approved reports with street-level position, depth, age, source |
| `POST /api/reports/:id/moderate` | Decision (approve, edit depth, reject); admin only | Updated report |
| `POST /api/gemini/guidance` | The numbers for one address and hour | Two or three sentences of plain guidance |
| `GET /api/weather` | A point | Active NWS alerts for it |
| `GET /api/health` | Nothing | Status and the data manifest version |

Every route returns the same error shape and never crashes the page.

### What the interface can call

This is the whole boundary between Harshith's components and Hansika's logic. Functions are exported from `web/lib/`; routes are the table above. Described in words; exact names are fixed in `docs/contracts.md` during the first 15 minutes and do not change when a stub becomes real.

| What | Takes | Gives back |
|---|---|---|
| Load the gold files | Nothing. A data-folder setting chooses the toy fixture or real data | Manifest, scenario list, ground and bowl grids ready for the water layer, the bowl table; a clear error if a file breaks the contract |
| Load a scenario's levels | Scenario, pump on or off | Water surface height per bowl per hour |
| Load a map layer | Layer name | Its features, validated |
| Depth at a point | Position, scenario, pump state, hour | Depth in metres, never below zero; "outside validated area" off the grid |
| Find an address | Typed text; then a chosen suggestion | Suggestions; then the position and whether it is inside the validated area |
| Grade for an address | Position | Letter, range, low-confidence flag, reasons (base rule, notches, caps), depth band per storm size, the "official map says" and "we found" facts, the action paired with a low grade; or "outside validated area" |
| Closing hours | Scenario, pump state | For each road segment, the hour it closes for each vehicle class |
| Best route now | From, to, vehicle class, scenario, pump state, start hour | Route line and travel time, or "no route" |
| Cut-off time | Position, vehicle class, scenario, pump state | The latest hour any route to dry ground still exists |
| Rescue reach | Position, vehicle class, scenario, pump state | Until what hour a fire station can still reach the position; and the roads reachable at a given hour |
| Latest safe departure | Position, scenario, pump state | The "move your car by" hour and the dry parking place it leads to |
| Approved reports feed | Nothing | Current approved reports and a notice when one is added or changed. Routing applies them itself |
| Admin sign-in and queue | Sign-in details; then nothing | Whether the user is an admin; waiting reports with photo link, exact position, AI reading and model depth |
| Calibration figures | Nothing (admin only) | Pairs of model depth and confirmed depth, and the running error |
| Validation figures | Nothing | The contents of `validation.json` |
| Server routes | See the table above | Fetched by the interface, never imported |

### Reports table

| Field | Meaning |
|---|---|
| id, created time | |
| position (exact) | Stored, visible to admins only |
| position (public) | Snapped to the nearest road segment midpoint; this is what the map shows |
| position source | Phone GPS or dropped pin |
| photo path | Private storage; embedded metadata stripped on upload |
| AI reading | Water present, depth range, reference object used, confidence |
| model depth at that place and hour | Recorded at submission for calibration |
| status | Waiting, approved, rejected |
| final depth | The admin's confirmed figure |
| moderation log | Who decided what, when (append-only) |

---

## 6. How the three "own work" pieces work

Full detail, sources and equations are in `04-depth-model-and-routing.md`. This is the version to be able to say out loud.

### Depth model

1. **Rain to runoff.** For each storm, turn hourly rainfall into runoff using the SCS curve-number method, with three to five land-cover classes. Storm sizes come from NOAA Atlas 14 at USF: 6.6 in (10-year), 8.4 in (25-year), 11.9 in (100-year), 17.2 in (500-year) over 24 hours. Confirm the duration mapping on NOAA's interactive page before quoting them.
2. **Find the bowls.** Sweep the lidar ground grid from lowest to highest cell once. Every local low point starts a bowl; where two bowls meet is a spill point. This yields a tree of bowls inside bigger bowls.
3. **Move the water.** Each hour, add that hour's runoff to the bowls it falls in, subtract what drains or pumps remove, and pass overflow down to the next bowl through the spill point. Volume is conserved exactly.
4. **Turn volume into a water level** per bowl with a storage table.
5. **Pump failure** is one number: the pump's drain rate goes to zero for the outage window.
6. **Fallback at 13:00** if the full version is not passing its tests: use only the top-level bowls ("bluespot" cascade). Same files, same contracts.

What it does not do, and the README must say so: no flow speed, no storm sewers, no surge or river flooding, no groundwater, one calibration storm.

### Routing engine

1. Road graph from OpenStreetMap, stored as flat arrays.
2. Every road segment knows which bowls it crosses and how low it sits, so for any scenario its closing hour per vehicle class is a lookup.
3. Four searches on the same graph:
   - **Best route now:** shortest path that only uses roads still open when you reach them.
   - **Cut-off time:** the latest hour any route to dry ground still exists.
   - **Rescue reach:** one search outward from all fire stations at once, per vehicle class.
   - **Latest safe departure:** searched backwards from dry parking, giving "move your car by".
4. Approved resident reports override the model on their segment.
5. Wording rule: the app never says a flooded road is safe to drive. It gives roads to avoid and a time to leave by.

### Grade

The letter means one thing: how often water is expected to reach the building.

| Grade | Rule |
|---|---|
| A | Dry even in the 500-year storm |
| B | Dry at 100-year, wet at 500-year |
| C | Dry at 25-year, wet at 100-year |
| D | Dry at 10-year, wet at 25-year |
| F | Wet at 10-year |

"Wet" means 0.15 m or more at the building. Then:
- **Notches**, each one step down, at most two, each printed on the card: depends on a working pump; gets cut off from every fire station; water deep enough to enter the floor.
- **Caps** from evidence: documented flooding in Milton nearby means no better than C; a FEMA high-risk zone means no better than C; shaded zone X means no better than B.
- **Show a range** ("C, range B to D") from re-running with rainfall and runoff at their plausible low and high. If the range spans three letters, print "low confidence".
- Depth in bands (none, under 6 in, 6 to 12 in, 1 to 2 ft, over 2 ft). Times as "before about 9 pm".
- Every low grade is paired with an action.

---

## 7. Work lanes for the agent swarm

Seven lanes, each owning its own folders so no two agents edit the same file. Each person launches the lanes they own from their own Claude session at 11:25, after the contracts are agreed and the scaffold is committed. Each agent reads this plan, `docs/contracts.md` and the research file named in its row.

| Lane | Owner | Owns | Reads | Delivers | Skills to use |
|---|---|---|---|---|---|
| **A. Data** | Hansika | `pipeline/ingest`, `pipeline/silver`, `pipeline/gold`, `web/public/data/layers` | `02`, `03` | Raw downloads, clipped and validated datasets, layer files, manifest | `search-first` |
| **B. Depth model** | Hansika | `pipeline/model`, its tests | `04` sections 1, 2, 5 | Bowls, hourly levels for all scenarios, validation numbers | `superpowers:test-driven-development`, `eval-harness` |
| **C. Routing** | Hansika | `web/lib/routing`, `pipeline/graph`, their tests | `04` section 4, `03` section B | Graph files, the four searches, a worker, a timing benchmark | `superpowers:test-driven-development` |
| **D. Map and design** | Harshith | `web/app/page.tsx`, `web/components/map`, `web/components/ui`, global styles | `05` | App shell, map, water layer, timeline, markers, legend, design tokens | `apple-design`, `mobile-native`, `frontend-design`, `mapcn`, `maplibre-*`, `shadcn`, `ui-ux-pro-max`, `animate`, `review-animations` |
| **E. Report card** | Split. Hansika: the logic (`web/lib/grade`, `web/lib/data`). Harshith: the interface (the two component folders) | `web/lib/grade`, `web/lib/data`, `web/components/report-card`, `web/components/guidance` | `04` sections 3, 5 | Data loaders with validation, grade rules, card UI, guidance cards, address search | `superpowers:test-driven-development`, `better-typography` |
| **F. Reports, admin, Gemini** | Split. Hansika: the backend (`web/app/api`, `web/lib/gemini`, `web/lib/supabase`, `supabase/`). Harshith: the screens (`web/app/admin`, the two component folders) and the Shortcut | `web/app/api`, `web/app/admin`, `web/components/report`, `web/components/admin`, `web/lib/gemini`, `web/lib/supabase`, `supabase/` | `01` section 4, `03` section D | Photo flow, Gemini reading, queue, moderation, live feed, calibration chart | `supabase`, `supabase-postgres-best-practices`; read Google's Gemini docs directly |
| **G. Lead (Harshith's session)** | Harshith | Root files, `docs/`, CI, `web/tests` smoke test, deploy | Everything | Scaffold, contracts, toy fixture, integration, README, demo script, submission | `superpowers:verification-before-completion`, `gstack-qa`, `impeccable` for the polish pass |

### Order of work inside each lane

Lanes E and F are split by step:

| Lane | Hansika (logic and backend) | Harshith (interface) |
|---|---|---|
| E | Step 1 loaders, step 2 grade rules, the address lookup behind step 3, the results that feed step 5 | The search box in step 3, step 4 card, step 5 guidance cards, the validation panel |
| F | Step 1 Supabase, step 3 Gemini reading, step 7 guidance route, the routes and queries behind steps 2, 4, 5 and 6, the form upload in step 8 | The screens in steps 2, 4 and 6, reports on the map in step 5, building the Shortcut in step 8 |

Hansika's session does not have Harshith's global plugins: where a row names `superpowers:test-driven-development`, it uses the kit's `tdd-guide` agent instead.

**A. Data**
1. Download elevation for the study box from the USGS 3DEP image service (about 3 m lidar, flown 2011; there are no 1 m tiles here); record source, date, resolution and licence in the manifest. Acceptance: file opens, covers the box, no gaps.
2. Download FEMA zones, the road graph, county and city drainage layers, fire stations, hospitals, the 548 Milton damage points, the known-flooding parcels. Acceptance: counts match those in `03`.
3. Clip and reproject everything to one grid; validate (no empty layers, coordinates inside the box, required fields present). Failures go to a quarantine folder with a reason, not silently dropped.
4. Export layers and the manifest. Acceptance: the toy fixture and the real export pass the same contract test.
5. First 20 minutes are downloads only; commit raw data handling before anything clever.

**B. Depth model** (tests first, on the toy fixture)
1. Runoff: zero rain gives zero runoff; runoff never exceeds rain; published curve-number example reproduced.
2. Bowls: a single bowl is found with the right spill height; two bowls merge at the right level; a flat plane has no bowls.
3. Water movement: volume in equals volume stored plus volume drained plus volume out, to rounding; a full bowl spills into its neighbour; a pump at zero rate changes the result.
4. Run on real elevation. Checkpoint 13:00: top-level cascade working end to end, or fall back.
5. Milton replay: compute hit rate on the 548 points, false-alarm area, and the FEMA baseline. Write `validation.json`.
6. Four storm sizes, pump on and off, plus low and high variants for the grade range.

**C. Routing** (tests first, on the toy fixture)
1. Graph loads; a hand-checkable shortest path is correct.
2. Closing hours: a segment in a filling bowl closes at the expected hour for each vehicle class.
3. Time-aware route avoids a road that closes before you reach it.
4. Cut-off time, rescue reach from several stations, latest safe departure: each tested on the fixture with a known answer.
5. Move the searches into a worker; benchmark on the real graph and record median and 95th-percentile times.
6. Approved reports override a segment.

**D. Map and design**
1. Design direction first (section 9), as tokens. Light mode.
2. App shell and map with the basemap; deploy.
3. Water layer reading the toy fixture: depth colour ramp, moving surface, soft shoreline. Then the real files.
4. Timeline with play, drag, and event flags; storm selector; pump toggle.
5. Markers: address pin, dry parking, pump station (marked approximate), fire stations, resident reports.
6. iPhone layout: one bottom sheet with three resting heights that follows the finger and snaps with a spring; installs to the Home Screen and opens full screen with safe areas handled.
7. Loading, empty and error states for every panel. Reduced-motion and reduced-transparency variants.

**E. Report card**
1. Loaders that validate every gold file against the contract and fail with a clear message.
2. Grade rules with a test per row of the grade table, per notch and per cap.
3. Address search using the county geocoder; out-of-area addresses get "outside validated area", never a grade.
4. Card UI: grade and range, the reasons, "official map says / we found" tiles, depth by storm size.
5. Guidance cards wired to routing results; fixed safety footer.

**F. Reports, admin, Gemini**
1. Supabase project, table, private photo bucket, access rules: public can insert, only admins read exact positions and photos.
2. Photo flow: capture or upload, ask for location, fall back to a dropped pin, strip photo metadata, show the Gemini notice.
3. Gemini photo reading with a fixed schema; reject anything that does not fit; handle rate-limit errors with a clear "reading unavailable, sent for manual review".
4. Admin page behind login: queue with photo, position, AI reading, model depth; approve, edit, reject.
5. Live feed of approved reports to the map and to routing.
6. Calibration chart and the running error figure.
7. Guidance text route: Gemini rewrites numbers it is given and may not introduce new ones; check the output contains only numbers from the input.
8. The reports route also accepts a plain form upload (photo, latitude, longitude) so an Apple Shortcut can post to it. Harshith then builds the "Report flooding" Shortcut on an iPhone: Take Photo, Get Current Location, Get Contents of URL (a POST to the route, labelled "Send to Fludd"), Show Result. Add it to the Home Screen and the Action Button, and put its share link in the README.

**G. Lead**
1. 11:00 repo (Hansika added as collaborator), skills kit and research files committed, scaffold, contracts, toy fixture, stubs, CI, first deploy.
2. Review each lane at every checkpoint against its acceptance checks; run the tests myself, do not trust reports.
3. Integrate real data at 13:00; smoke test the full path.
4. README, method page, demo script; submission.

### Launch brief for each agent (paste at 11:25, one per lane; fuller versions are in each hacker doc)

> You own lane **[letter and name]** of the Fludd build. Read `prep/PLAN.md` sections 5, 6 and 7 and `docs/contracts.md`, plus research file **[file]**. Edit only **[folders]**. Work in the order listed for your lane. Write each test before the code it checks, and build against the toy fixture until real data lands. Commit after each numbered step with a conventional commit message and no AI attribution in the message. Do not change a contract; if one is wrong, stop and report it. At each checkpoint time report: what passes, what fails with the output, and what you cut.

---

## 8. Schedule

| Time | Gate | If not met |
|---|---|---|
| 11:00 | Harshith creates the repo, Hansika the Supabase project. **11:00 to 11:15: both agree the contracts together, before either session starts a lane.** Scaffold, contracts, toy fixture, stubs, CI, first commit | |
| 11:25 | Empty shell live on Vercel. Launch lanes A to F | |
| 12:00 | Raw data downloaded. Map draws water from the toy fixture. Shortest path passes its tests | Data lane gets help first; everything waits on it |
| 13:00 | **Vertical slice on real data:** type an address, see a grade and water on the map | Depth model falls back to the top-level cascade |
| 13:00 to 14:00 | Lunch. Agents keep working; review when you are back | |
| 14:30 | Timeline, pump toggle and guidance cards on real data. Milton validation computed | Show the Milton points as evidence only |
| 15:00 | **Feature decision.** Photo to Gemini to queue works end to end | Cut to seeded reports; stop lane F's new work |
| 16:00 | Submission workshop (ENB 116) for any added requirements. Polish pass: states, phone layout, copy | |
| 16:30 | **Feature freeze.** Fixes only | |
| 17:00 | README final. Two timed demo rehearsals. Production deploy checked on a phone | |
| 17:30 | Submit on OrganizerHQ with all four challenges ticked | |
| 17:50 | Last push. Stop | |
| 18:00 | Submissions close. No commits after this | |
| 18:20 | Judging, in person | |

---

## 9. Design direction

The bar is Apple Maps and Apple Weather, not a dashboard. `ui-preview.html` in this folder shows the direction (a reference only; nothing in it may be copied into the repo).

**What to avoid, by name:** stacks of floating glass cards, gradient buttons, pills on everything, metric tiles, decorative rings, more than one accent colour. These are what made the first previews read as generic.

**Rules**
- **The map is the content.** Everything else is a thin control layer over it.
- **One structural surface.** A single sidebar on desktop, a single bottom sheet on iPhone, holding search, the grade, guidance and reasons as grouped lists. No free-floating cards.
- **Materials encode hierarchy.** The sidebar and sheet use one thick translucent material. Map controls and the timeline are small glass elements. Never put a translucent surface on top of another; inside the sidebar, groups are near-solid.
- **System type.** The platform font, a large bold title with tight tracking, body at reading size, footnotes slightly loose. Hierarchy from size and weight together.
- **One tint.** System blue for every action and the route. Red, orange and green only carry meaning (too late, warning, safe). Water has its own blue ramp.
- **Lists, not tiles.** Guidance is three rows with a small coloured icon, a label and a value. The value turns red when the moment has passed.
- **Real controls.** A switch for pump power, a segmented control for report status, a slider for the timeline. They look and behave like the system's.
- **Motion is physical.** Feedback on press, not release. The bottom sheet tracks the finger 1:1, hands off its velocity on release, projects where the flick is going and snaps there with a spring (damping 0.8, response 0.3). It can be grabbed mid-flight. Rubber-band at the ends.
- **Water is the one showpiece.** It fills streets first, then blocks, with a moving surface and a bright shoreline, and eases to a new level when the pump switch flips. Everything else stays still.
- **Accessibility built in:** reduced motion freezes the water and cross-fades the sheet; reduced transparency makes materials solid; colour never carries meaning alone; text scales with the user's setting.
- **iPhone specifics:** full-screen when launched from the Home Screen, content under the status bar and home indicator handled with safe areas, 44-point touch targets, no hover-only behaviour.
- **Copy:** sentence case, plain verbs, no exclamation marks. "Move your car by", not "Vehicle relocation deadline". A fixed safety footnote on every card (wording in `04` section 5.3).

Skills in the kit, in this order: `apple-design` for the principles and motion, `mobile-native` for the Home Screen app, `frontend-design` and `ui-ux-pro-max` for the map layout, `mapcn` and `maplibre-cartography` for the map itself, `shadcn` for components (restyled to the rules above, not left at defaults), `animate` and `review-animations` for motion, then `impeccable` for a critique pass at 16:00. `liquid-glass-design` is in the kit as a reference for the material look; it targets SwiftUI, so use its ideas, not its code.

---

## 10. Gemini

| Use | Input | Output | Guard |
|---|---|---|---|
| Photo reading | One photo | Water present, depth range, reference object, confidence | Fixed schema; anything else is rejected; an admin confirms before it counts |
| Guidance text | The model's numbers for one address and hour | Two or three plain sentences | May not introduce numbers; output is checked against the input |

- Server side only. The key lives in an environment variable and never reaches the browser or the repo.
- Model `gemini-4-hydrogen` on the free tier, fallback `gemini-3.8-flash`. The quickstart uses the Interactions API; read the structured-output section of the docs at 11:00, because the research did not verify that syntax.
- Free-tier limits are not published; read yours in AI Studio. Plan for rate-limit errors with a manual-review path.
- On the free tier Google uses submitted content to improve its products. The upload screen must say the photo is sent to Gemini.
- Gemini sits behind a provider interface chosen by environment variable, so a second provider can be added without touching callers.
- The app is not a wrapper around a model: with Gemini switched off, the grade, map, timeline and routing all still work. Say this to judges; the rules ban "a reskin of an existing AI tool".

---

## 11. Testing and validation

| Layer | What it proves | Pass looks like |
|---|---|---|
| Model unit tests | Runoff, bowls, water movement, pump | All pass on the toy fixture; volume conserved to rounding |
| Routing unit tests | Paths, closing hours, the four searches | All pass; known answers on the fixture match |
| Grade tests | Every row, notch and cap of the grade table | One test per rule |
| Contract tests | Gold files match `docs/contracts.md` | Toy fixture and real export both pass |
| Server route tests | Every route's success and error shape | Typed errors, no crashes |
| Smoke test (Playwright) | Address to grade to timeline in a real browser | One green run on the deployed site |
| Validation | Model against Milton | `validation.json` written with hit rate, false-alarm area and the FEMA baseline |
| Security | No secrets in the repo; photos private; admin routes locked | Secret scan green; anonymous read of a photo is refused |

Put the test count and the validation numbers in the README. Run the checks yourself before claiming anything works.

---

## 12. README and submission

**README sections, in order:** name and tagline · what makes this different · the validation number and how it was computed · screenshots · how it works (model, routing, grade) · data sources with links and dates · frameworks and libraries used (required by the rules) · **how AI was used** (required; see below) · tradeoffs · limits and safety wording · how to run it · tests · licence.

**How AI was used (required, or you are disqualified).** Write it truthfully and specifically:
- Which tools: Claude Code for planning, research and code generation; Gemini inside the product.
- What the two of you designed and decided, by name: the idea, the choice of model, the grading rules, the thresholds, what was cut.
- What AI generated: name the folders, and who directed each (Hansika: `pipeline/`, `web/lib/`, `web/app/api/`, `supabase/`; Harshith: `web/app/` pages, `web/components/`, `docs/`).
- What was done before 11:00: research, this plan and the two hacker docs, plus the public Claude Code skills in `.claude/`; no code, no assets, no data. Say what the organizer told you if you asked.
- The same statement goes in the MLH submission form.

Your standing rule of no AI attribution in **commit messages** still holds; the disclosure belongs in the README and the submission, where the hackathon requires it.

**A warning about "own work".** The original draft says the depth model and routing engine are your own work. If agents write that code, the README must say so, and a judge may ask either of you to walk through any file on your own side. Being a team of two does not remove this: each person must be able to explain the code they directed.
- **Hansika explains the engines.** Before 17:00, read the depth model and the routing engine top to bottom and be able to explain the bowl sweep, the spill logic and the latest-departure search without notes (the 16:30 prompt in `HACKER-HANSIKA.md` prepares this). Also the grade rules and the Gemini guards.
- **Harshith explains the interface and the product decisions:** why one surface, how the water layer draws depth, the sheet physics, what was cut and why, what the grade means.
- If the team wants to say part was written by hand, the grade rules and the vehicle thresholds are the smallest high-value piece; they are on Hansika's side.

**Submission checklist (OrganizerHQ, by 18:00):** same MLH account you registered with · project link (public repo) · description · tech used · AI usage statement · all four challenges ticked · live URL works on a phone · no pushes after 18:00.

---

## 13. Demo script (about 3 minutes, in person)

1. **The hook (20 s, Harshith).** "This address is a mile from this room. The official map says low risk. In Milton it flooded." Type it in. The grade appears.
2. **Why (30 s, Harshith).** The two tiles: what the official map says, what we found. One line each on low ground, the pump, and history.
3. **The storm (45 s, Harshith).** Press play. Water creeps along the streets. "Move your car by" turns red. Switch the pump back on; the water recedes. "That one switch is what happened on October 10."
4. **How it works (30 s, Hansika).** Bowls, spill points, pumps. Roads close at different hours for a car and a rescue truck. Built today.
5. **Proof (20 s, Hansika).** The validation number against the 548 county-recorded points, and the FEMA comparison.
6. **Residents (25 s, Harshith).** On the iPhone, press the Action Button to run the "Report flooding" Shortcut and photograph a printed flood picture; Gemini reads the depth; approve it in the admin view; the road closes on the map.
7. **Close (10 s, Harshith).** Who Fludd is for: renters choosing where to live, residents during a storm.

**Questions to be ready for** (Hansika takes the technical ones; Harshith takes product, design and privacy)
- "How accurate is it?" (Hansika) Give the validation numbers and the false-alarm area, then the limits.
- "Isn't this what Google Maps does?" (Hansika) Google knows a road is closed after someone reports it. This predicts depth, per vehicle, before it happens, on streets nobody is driving.
- "What did you build versus the AI?" (each for their own side) Answer from the README, specifically.
- "Why should I trust a grade?" (Hansika for the rule, Harshith for how it is shown) It is a rule you can repeat back, shown with a range, capped by evidence.
- "What about privacy?" (Harshith) Admin review before anything is public, street-level positions, metadata stripped.

---

## 14. Risks

| Risk | Sign | Response |
|---|---|---|
| Elevation download is slow or fails | No raster by 11:45 | USGS hosts dropped about one connection in three during research; retry with backoff. The service gives roughly 3 m lidar from 2011, not 1 m. State the resolution and year in the README |
| Flood-point count differs from the research | Ingest count is not about 548 | Two research passes counted 547 and 548 with slightly different filters. Use the ingest count and record the filter in the manifest |
| Full depth model not passing by 13:00 | Tests red | Ship the top-level cascade; same contracts |
| Model disagrees badly with Milton | Low hit rate | Check the pump setting and runoff classes once; then report the number honestly with its limits |
| A public data service is down | Errors during ingest | Raw files are kept once downloaded; never re-fetch during the demo |
| Gemini rate limit or outage | 429 errors | Manual-review path; a clearly labelled recorded example for the demo |
| Supabase setup eats time | Not working by 14:00 | Cut to seeded reports at 15:00 |
| Venue Wi-Fi fails | | Everything except Gemini and Supabase runs from static files; keep a local build ready |
| Two agents edit the same file | Merge conflicts | Folder ownership in section 7; contracts change only through the lead |
| Overclaiming to judges | | The pitch corrections in section 1 and the limits in the README |

---

## 15. Decisions taken for you (change any of them at 11:00)

| Decision | Default chosen |
|---|---|
| Team | Two. Hansika: all logic, data and backend (lanes A, B, C, the logic half of E, the backend half of F), about 60%. Harshith: the interface and lead duties (lane D, the interface halves of E and F, lane G), about 40%. Details in "Team and documents" |
| Name | Fludd. Repo `fludd` |
| Study area | About 2 miles around USF, centred on the University Area |
| Backend | Next.js server routes plus Supabase, no separate API server |
| Where the model runs | Precomputed in Python; the browser draws from its output |
| Repo visibility | Public from the first commit |
| Domain | Buy `fludd.app` (about $9 the first year, about $15 a year after; the `.com` is taken). Harshith buys it and attaches it to the Vercel project after the first deploy at 11:25. `.app` domains only work over HTTPS, which Vercel provides automatically |
| iPhone delivery | The website installed to the Home Screen, plus a "Report flooding" Apple Shortcut. No native app (no Mac) |
| Offline mode | Not built unless everything else is done |
