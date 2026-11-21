# Fludd

**What the flood map doesn't tell you about your address.**

Type any address near USF and get a flood report card: a letter grade, where the water goes hour by hour, when to move your car, whether a fire truck can still reach you, and what to fix. Built at HackJam '26 (SHPE USF, an MLH event) on November 21, 2026 by Harshith and Hansika.

## What makes it different

1. **A depth model built around bowls, spill points and pumps.** It fills low ground the way the University Area flooded in Hurricane Milton, bowl by bowl, spilling into the next one. A pump station is a real object you can switch off.
2. **Routing that understands depth and time.** Every road segment closes at its own hour for a car, a truck and a fire engine, so the app can say "move your car before about 6 pm" and "fire trucks can reach you until about 9 pm".
3. **It checks itself against Milton.** Hillsborough County recorded 547 flood-damage points inside our study box. The model, never tuned to those points, puts water at **286 of them (52.3%)**, including **136 of the 207 that sat outside FEMA's high-risk zones**. FEMA's zones held 62% of the points but cover 9.07 km², against the model's 3.54 km² of predicted water. The app shows these numbers next to every grade.

## How it works

- **Depth model** (`pipeline/model/`, Python): 3 m lidar elevation, runoff per storm (NOAA Atlas 14 at USF: 10, 25, 100 and 500-year 24-hour storms, plus a Milton replay), a sweep that finds 8,612 bowls and their spill points, then water moved between bowls hour by hour with pumps on or off. It writes compact files the browser draws directly.
- **Grade** (`web/lib/grade/`): the letter comes from the smallest storm that puts 6 in or more of water at the building. Notches and caps (pump dependence, deep water at the floor, Milton damage within 100 m) can only lower it. A range and "low confidence" come from rainfall at the edges of the NOAA confidence interval.
- **Routing** (`web/lib/routing/`, TypeScript in a web worker): the real OpenStreetMap road graph (6,481 junctions, 9,064 segments). Closing hours per vehicle class, time-aware best route, cut-off time (widest-path search), rescue reach (multi-source search from fire stations) and latest safe departure.
- **Interface** (`web/app/`, `web/components/`): one map, one surface. Before, during and after a flood:
  - **Before:** grade, flood history nearby, drainage network, steps that fit your home (own or rent, floor) and similar homes nearby with a better grade.
  - **During:** water at the door hour by hour, move-your-car time, fire truck reach, last way out, live National Weather Service alerts, and "Ask Pelican" for a trip that avoids roads the model closes.
  - **After:** what Milton did at the address, what the pumps changed, and resident photo reports checked by a person before they appear.
- **Privacy:** your home, car spot, insurance details and camera link stay in your browser (localStorage). They are never sent to our server.

## Data sources

All fetched on 2026-11-21, no keys required. Full list with filters and counts in `web/public/data/manifest.json`.

| Data | Source |
|---|---|
| Elevation, 3 m lidar (2011) | USGS 3DEP |
| Flood zones | FEMA National Flood Hazard Layer |
| Milton flood-damage points | Hillsborough County damage assessments 2024 |
| Known-flooding parcels, inlets, detention areas, open drains, pump stations | City of Tampa stormwater open data |
| Pump stations, catch basins, channels, ponds, storm pipes | Hillsborough County stormwater GIS |
| Street-flooding reports | City of Tampa flooding spots |
| Parcels (value, beds, baths; no owner fields) | Hillsborough County parcels |
| Fire stations, hospitals | Hillsborough County |
| Roads; places for Ask Pelican | OpenStreetMap via Overpass |
| Places for Ask Pelican when Overpass is busy | Esri ArcGIS World Geocoder (category search, keyless) |
| Address search | Hillsborough County address locator |
| Weather alerts | National Weather Service API |
| Basemap | OpenFreeMap "liberty" (OpenStreetMap data) |

## Frameworks and libraries

- **Web:** Next.js 16.4, React 19.3, TypeScript (strict), Tailwind CSS 4.3, MapLibre GL JS 6.17, Motion 14, Zod 4, Supabase JS 2 and `@supabase/ssr`, Google Gen AI SDK (`@google/genai`) 3.6.
- **Pipeline:** Python 3.11 with uv, NumPy, SciPy, Numba, Rasterio, Pillow, Requests.
- **Tests:** Vitest, pytest, Playwright.
- **Backend:** Supabase (Postgres, storage, auth, realtime). Hosting on Vercel.
- **Boot animation:** Blender (EEVEE), encoded with FFmpeg.

## How AI was used

We used AI throughout and say so plainly, because the rules require it and because it is true.

**Tools.** Claude Code (Anthropic) for planning, research and code generation, including several Claude Code agents working in parallel on separate folders. Google Gemini inside the product.

**What we decided ourselves.**
- **Both of us:** the idea, the product framing, what to cut, and the before, during and after structure.
- **Hansika:** the bowl-and-spill depth model instead of a simple fill, the grading rules and every threshold (6 in "wet", 1 ft floor, the vehicle depth limits, the 100 m Milton cap), and how to validate against Milton without tuning to it.
- **Harshith:**
  - **Design direction:** the map is the content, one surface, one tint colour.
  - **Onboarding and privacy:** what onboarding asks; keeping personal data on the device.
  - **Ask Pelican's safety design:** the language model only reads the request and never invents routes or times.
  - **Features:** the optional camera opt-in and the boot animation's story.

**What AI generated.** Claude Code wrote most of the code under our direction, and we reviewed, ran and corrected it:
- **Directed by Hansika:** `pipeline/`, `web/lib/`, `web/app/api/`, `supabase/`.
- **Directed by Harshith:** `web/app/` pages, `web/components/`, `docs/`, `design/`, `.github/` and the root files.
- **Finished by Harshith's sessions:** when Hansika's session hit its usage limit, they finished `/api/weather`, `/api/health`, `/api/pelican` and the storm-pipe layer.

**Before the event (before 11:00).** Research and planning only, with Claude Code: the notes in `prep/` (plan, research, team guides) and the public Claude Code skills in `.claude/`. No code, no design assets and no data were prepared before 11:00.

**Boot animation.** Designed with an AI design tool, then built and rendered in Blender by Claude Code from a script (`design/boot/build_boot.py`) through Blender's MCP add-on, under our direction.

**Inside the product.**
- **Gemini's jobs:** it reads resident flood photos (water present, depth range, reference object), writes plain-language guidance and remedies from our numbers, and turns an "Ask Pelican" request into a destination type.
- **Guards:** every Gemini answer is checked so it cannot add numbers we did not give it. With Gemini off, the app falls back to fixed text and still works: the grade, map, storm timeline and routing never need it.

## Tradeoffs we chose

- **3 m lidar from 2011** instead of the 2025 county lidar (published 2026-11-05): faster to fetch and process today; the newer data is the first upgrade.
- **No storm sewer flow model.** Pipes are shown on the map but water is not routed through them, so the model is pessimistic where drains work and optimistic where they clog.
- **One calibration storm (Milton).** The 52.3% hit rate is one check against one storm, not a guarantee.
- **Water drawn on the CPU per hour**, not animated on the GPU: simpler and reliable, less smooth.
- **Personal data only in the browser:** private by default, but it does not follow you to a second device.

## Limits and safety

Fludd is a screening estimate from a simplified model. It leaves out storm sewers, storm surge, river flooding and groundwater, and is checked against one storm. It is not a FEMA flood determination, and not for insurance, lending or purchase decisions. In a storm, follow Hillsborough County Emergency Management and the National Weather Service. Never drive or walk into floodwater. The app never tells anyone a flooded road is safe.

## Run it

```bash
cd web
cp ../.env.example .env.local   # fill in the keys you have; the app runs without them
npm ci
npm run dev                     # http://localhost:3000
```

Set `NEXT_PUBLIC_DATA_SET=real` to use the real data in `web/public/data/` (the default is the small toy fixture). The pipeline: `cd pipeline && uv run python run.py`.

## Tests

```bash
cd web && npm run lint && npm run typecheck && npm test     # 300+ tests
cd pipeline && uv run pytest -q                              # 65 tests
```

CI runs lint, typecheck, both test suites and a secret scan on every push.

## Repo guide

- `pipeline/`: data download, depth model, road graph, gold export (Python).
- `web/`: the Next.js app. `lib/` holds the logic, `components/` the display, `app/api/` the server routes.
- `supabase/`: reports table, private photo storage, access rules.
- `docs/contracts.md`: the boundary between the logic and the interface.
- `prep/`: planning and research notes written before the event. They contain no code.
- `design/boot/`: the boot animation's references and Blender build.
