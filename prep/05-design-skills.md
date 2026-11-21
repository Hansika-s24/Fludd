# 05 - Design skills and tooling for Claude Code (checked 2026-11-21)

Scope: a polished, map-centric Next.js + Tailwind v4 + shadcn/ui app built today.
Nothing was installed or modified. Everything below was checked today with `gh api`, `curl`, or the skills.sh pages and search API. Where I could not verify something I say so.

## How to read the evidence

- **Stars / last push**: `gh api repos/OWNER/REPO` today.
- **Installs**: skills.sh all-time leaderboard JSON (top 600) or `skills.sh/api/search`. Treat these as weak evidence. Several top entries look inflated: `designed-by-ai/skills` `design-mobile-apps` shows 1,551,717 installs on a 40-star repo, `uizze.sh` `ui-taste` shows 1,097,388 against 122 stars for `uizze/uizze`, and five different `*/superpowers` clones carry near-identical counts. That is my inference from the mismatch, not something skills.sh states.
- **Descriptions**: taken from each SKILL.md frontmatter.

Current library versions (latest GitHub release): MapLibre GL JS **v6.19.0** (2026-11-17), deck.gl v9.3.12, Mapbox GL JS v3.35.2, react-map-gl v8.1.3, Tailwind v4.3.5, Next.js v16.4.6.

---

## 4. Ranked shortlist: what to add or update today

| # | Action | Repo and path | Stars | Last push | Why it helps here | Red flags |
|---|---|---|---|---|---|---|
| 1 | **Add** mapcn skill + registry | `AnmolSaini16/mapcn` -> `skills/mapcn/` (SKILL.md + `references/blocks.md`, `components.md`, `patterns.md`). Registry `@mapcn` (`npx shadcn@latest add @mapcn/map`, blocks `choropleth`, `heatmap`, `analytics-map`, `store-locator` and 5 more) | 12,404 | 2026-11-15 | The only thing found that is shadcn-styled, Tailwind-themed, light/dark aware map UI on MapLibre. Gives designed markers, popups, controls, clusters, GeoJSON layers and whole map-page blocks, so the map matches the rest of the shadcn UI instead of looking like default MapLibre chrome. | MIT. Default basemap is CARTO: attribution must stay visible, free tier is request-limited, CARTO may require keys. Pass your own style (OpenFreeMap, MapTiler, Protomaps) via `styles` if that matters. Needs `components.json`. Installed blocks are third-party code: list it in the README given the "nothing pre-built" rule. |
| 2 | **Add** MapLibre agent skills | `maplibre/maplibre-agent-skills` -> `skills/maplibre-cartography/`, `skills/maplibre-source-wiring/`, `skills/maplibre-tile-sources/`, `skills/maplibre-v6-migration/`; optional `skills/maplibre-terrain-rendering/` (hillshade, `color-relief`, contours for the lidar layer), `skills/maplibre-pmtiles-patterns/`, `skills/maplibre-sprites-icons/` | 163 | 2026-11-20 | Low stars, but it is the MapLibre org's own repo, each skill carries a `verified` / `provisional` status backed by Promptfoo evals with results committed daily. `maplibre-cartography` covers label halos, figure-ground, layer ordering (insert data below labels), hierarchy. `maplibre-v6-migration` matters because v6 is ESM-only with no default export, and agents tend to write v4/v5 imports. | MIT. Pure markdown, no scripts or network calls seen. `source-wiring`, `tile-sources`, `v6-migration` are `provisional`. Cartography skill does not cover data colour ramps (see section 2). |
| 3 | **Update** ui-ux-pro-max to `main` | `nextlevelbuilder/ui-ux-pro-max-skill` -> `.claude/skills/ui-ux-pro-max/` | 152,343 | 2026-11-21 | Local copy is 94 commits behind. On 2026-11-18 upstream added a **Maps** guideline category (rows 121-130: attribution, text alternative, keyboard and non-drag navigation, symbology not colour alone, normalised choropleths, perceptual colour ramps, safe popup content, clustering, vector tiles for large data, reduced-motion camera) plus GIS web map product types and palettes. Directly on target. | MIT. The last tagged release is still v2.15.0 (2026-08-13), so the map rows exist only on `main`; I did not verify whether the `uipro` CLI ships `main`. Needs Python for its search scripts. Sibling `design` skill has optional paid logo providers (not needed). |
| 4 | **Switch/add** official shadcn MCP + skill | `shadcn-ui/ui` -> `skills/shadcn/` (SKILL.md, `rules/styling.md`, `rules/composition.md`, `rules/base-vs-radix.md`, `design-system.md`, `mcp.md`). MCP: `npx shadcn@latest mcp init --client claude` | 128,676 | 2026-11-21 | Your connected "shadcn" MCP is `@jpisnice/shadcn-ui-mcp-server` (community), not the official one. The official MCP reads `registries` from `components.json`, so one tool searches and installs from `@mapcn`, `@magicui`, `@react-bits`, `@aceternity`, `@kibo-ui`, `@cult-ui`, `@motion-primitives` (all confirmed in `ui.shadcn.com/r/registries.json`, 593 registries). The skill was extended 2026-10-09 with a DESIGN.md design-system workflow. 426,541 installs via search API. | MIT. Skill is `user-invocable: false` and pre-allows `npx shadcn@latest *`. Third-party registries are unreviewed code: read what gets added. |
| 5 | **Refresh** frontend-design | `anthropics/skills` -> `skills/frontend-design/SKILL.md` | 198,274 | 2026-11-16 | One-file copy. Upstream rewrote it on 2026-09-03 ("avoid generic design defaults", +36/-20 lines); local is the pre-September text (8,315 bytes vs 9,390, different blob hash). | None. Same skill ships as the `frontend-design` plugin in `anthropics/claude-plugins-official`. |
| 6 | **Update** impeccable 4.8.2 -> 4.10.0 | `pbakaus/impeccable` -> `.claude/skills/impeccable/` (source in `skill/`); `npx impeccable update` | 114,298 | 2026-11-21 | Three skill releases behind (4.9.0, 4.9.1, 4.10.0). Gains: `animate` now captures and reviews the motion it built, drift reports name what contradicts DESIGN.md, long DESIGN.md is served as a lookup map, `audit` saves reports and checks RTL. Useful, not essential today. For this app use its **Operate** mode. | Apache-2.0. Engine binary downloads once to `~/.impeccable/bin/`. New-design runs fetch a direction catalogue from impeccable.style; that request cannot be turned off, only the anonymous record of picks (`npx impeccable telemetry off` or `DO_NOT_TRACK=1`). Since 4.9.0 a **signed-in** CLI uploads DESIGN.md and critique reports in full; do not `impeccable login` if unwanted. Hooks run outside model approval. Live-mode "Apply" can spawn `claude` with `bypassPermissions` unless `IMPECCABLE_LIVE_COPY_AGENT=chat`. |
| 7 | **Optional** jakubkrehel/skills | `jakubkrehel/skills` -> `skills/better-colors/`, `skills/better-typography/`, `skills/better-ui/`, `skills/better-layout/`; `skills/better-interface/` for a ranked review | 12,533 | 2026-11-19 | The author's successor to `make-interfaces-feel-better` (whose content last changed in July/August). Exact values for radius, shadows, optical alignment and icon states; `better-colors` builds semantic tokens and measures contrast, handy for legend and panel colours. | MIT. Overlaps impeccable's `polish`, `typeset`, `colorize`. Add only if you want a second opinion pass; skip under time pressure. |

Not on the list on purpose: I could not find an eighth item that beats the cost of installing it today.

### Popular but redundant or mostly hype for this project

- **taste-skill v2.5.1** (119,556 stars): do not update for this build. It is now a company-website and landing-page builder, needs Node 22+ and Chrome, and registers a **Stop hook** (`gate.mjs`, 600 s timeout) that can block the agent from finishing a turn. Wrong tool for app UI on a deadline.
- **heydamir/unslop** (19,548 stars, created 2026-10-29): the real surge of the last month, covers dashboards and apps, but it duplicates impeccable + frontend-design. Licence is CC BY 4.0, so attribution is required. Its extras need Playwright and ffmpeg and can call paid image services (it asks first).
- **designed-by-ai `design-mobile-apps`, uizze `ui-taste` / `uizze-ui`, thinkui.xyz, flowkit `website-builder`, the `*/superpowers` clones**: install counts out of proportion to their GitHub footprint. Skip.
- **GoogleChrome/modern-web-guidance** (24,209 stars, 78,784 installs): credible, but its description tells the agent it is "MANDATORY: Execute FIRST" for all HTML/CSS tasks, which costs context on every step. Worth it for long projects, not for a seven-hour build.
- **google-labs-code/stitch-skills** (11,215 stars): needs the Stitch MCP and a Google account; useful only if you design in Stitch.
- **figma/mcp-server-guide skills** (2,219 stars): only useful with Figma files and the Figma MCP.
- **anthropics/skills canvas-design, theme-factory, web-artifacts-builder, brand-guidelines**: posters/PDF art, artifact themes, claude.ai artifact bundling, and Anthropic's own brand. None helps a Next.js map app.
- **superdesign** (`superdesigndev/superdesign` last push 2026-06-29, skill repo 2026-08-21), **Dammyjay93/interface-design** (2026-06-20), **bencium** (503 stars): stale or minor.
- **21st.dev magic MCP**: needs an API key you do not have configured; repo last pushed 2026-09-09. The official shadcn MCP with extra registries covers the same need without a key.
- **scroll-craft, oil-ui, awwwards-style skills**: marketing-site tools. `oil-ui` defers to an `oil-ui-pro` that I did not investigate.

---

## 1. Top design/UI/frontend skills not already installed

| Skill / repo | Stars | Last push | Installs (skills.sh) | What it does (from SKILL.md) | Verdict for today |
|---|---|---|---|---|---|
| `shadcn` in `shadcn-ui/ui` (`skills/shadcn/`) | 128,676 | 2026-11-21 | 426,541 (search API; leaderboard splits it 271,099 + 155,628 across two source names) | Manages shadcn components and projects: add, search, fix, style, compose; DESIGN.md / design-system workflow | **Add** |
| `mapcn` in `AnmolSaini16/mapcn` | 12,404 | 2026-11-15 | not captured | Themeable shadcn-style map components and blocks on MapLibre GL + Tailwind | **Add** |
| `jakubkrehel/skills` (16 skills: better-colors, better-layout, better-typography, better-ui, better-motion, better-interface, better-accessibility, better-writing, interface-review, variant, break, build-design, state-machine, explain-interface, afk, upskill) | 12,533 | 2026-11-19 | better-colors 42,384 | Exact-value polish rules per domain plus a ranked interface review | Optional |
| `emilkowalski/skills` remaining 16 of 20 | 58,561 | 2026-11-15 | find-animation-opportunities 272,641; pick-ui-library 246,412; prototype 234,610; break-ui 128,210; animation-performance 100,661 | See section 3 | `break-ui` and `animation-performance` are the two worth a look |
| `vercel-react-view-transitions` (`vercel-labs/agent-skills/skills/react-view-transitions/`) | 34,639 | 2026-11-20 | 198,816 | React `<ViewTransition>` page and shared-element transitions; now recommends stable React 19.3 | Nice for panel/route transitions if time allows |
| `vercel-composition-patterns` (same repo, `skills/composition-patterns/`) | 34,639 | 2026-11-20 | 466,134 | Compound components, avoiding boolean-prop sprawl | Code structure, not visual quality |
| `GoogleChrome/modern-web-guidance` | 24,209 | 2026-11-17 | 78,784 | Search tool for current web platform practice (anchor positioning, popover, view transitions, CWV) | Skip today (context cost) |
| `heydamir/unslop` (`skills/unslop/`) | 19,548 | 2026-11-15 | not captured | Turns AI-looking UI into a designed interface, fixes spacing, colour, icons, copy, type in order | Redundant with impeccable |
| `addyosmani/agent-skills` `frontend-ui-engineering` | 119,494 | 2026-11-18 | 85,735 | Production-quality accessible responsive UI engineering | Generic; redundant |
| `ibelick/ui-skills` (baseline-ui, improve-ui, create-design-md, component-canvas, device-frames, fixing-accessibility, fixing-metadata, fixing-motion-performance) | 11,273 | 2026-11-18 | create-design-md 5,919 | Fast deslop pass, read-only UI audit with plans, DESIGN.md generator, device-framed screenshots | `device-frames` could help demo screenshots; otherwise redundant |
| `google-labs-code/stitch-skills` (16 skills in `plugins/stitch-*/skills/`) | 11,215 | 2026-11-20 | design-md 67,109; shadcn-ui 55,280; taste-design 21,936 | Stitch MCP workflows; `taste-design` writes an anti-generic DESIGN.md | Needs Stitch; skip |
| `google-labs-code/design.md` (spec) and `VoltAgent/awesome-design-md` (ready-made DESIGN.md files) | 28,994 / 128,486 | 2026-11-18 / 2026-10-28 | n/a | DESIGN.md format; brand design systems to drop in | A borrowed DESIGN.md is a quick way to pin a visual direction; impeccable `document` and shadcn skill both read it |
| `figma/mcp-server-guide` (17 skills in `skills/`) | 2,219 | 2026-11-18 | figma-use 10,287; figma-generate-design 6,710 | Official Figma MCP workflows | Only with Figma |
| `abdiraimov-otabek/dashboard-design-skill` (`skills/dashboard-design/`) | 1,036 | 2026-11-09 | not captured | KPI cards, charts, heatmaps, comparison periods, empty/loading states, screenshot QA | Consider only if the report card grows chart-heavy |
| `arvindrk/extract-design-system` | 292 | 2026-09-05 | 131,879 (weekly ~300) | Extracts tokens from a public website | All-time count far above current weekly use; skip |
| Magic UI: `magicuidesign/mcp` (232 stars, 2026-11-17), skill `magic-ui` in `magicuidesign/magicui` (1,560 installs) | 23,412 (library) | 2026-11-17 | 1,560 | Official MCP and skill for Magic UI components | Use via `@magicui` registry instead |
| Dataviz: `caylent/tufte-data-viz` (238 stars, 342 installs), `antvis/chart-visualization-skills` (540 stars, 6,542 installs) | - | 2026-11-19 / 2026-09-22 | - | Tufte principles; AntV chart generation | Minor |

Checked and found nothing official:
- **Tailwind Labs**: `tailwindlabs/skills` and `tailwindlabs/tailwindcss-skills` return 404; `tailwindcss.com/llms.txt` returns 404. Community only (`wshobson/agents` `tailwind-design-system` 74,668 installs; `Lombiq/Tailwind-Agent-Skills` `tailwind-4-docs` 19,286 installs, last push 2026-04-09).
- **Vercel v0 skills**: `vercel/v0-skills` returns 404; I found no official v0 design skill. Not searched further.
- **React Bits / Aceternity**: no official skill found. Community skills only (React Bits best is 694 installs; Aceternity 1,624). Both publish `llms.txt` and are in the shadcn registry directory.
- **anthropics/claude-plugins-official**: the only design plugin is `frontend-design`; `playwright` and `context7` are under `external_plugins`. No map or design-system plugin.
- **claudemarketplaces.com**: the page exposed only category counts (Design & UI/UX 2,936 skills), no ranked design list I could extract.
- **skills.sh "hot"**: every design-related entry had 1 to 5 installs in the window; nothing meaningful.

Surging in the last three months (by repo creation date and stars): `heydamir/unslop` (created 2026-10-29, 19,548), `kaankiziltug/logo-design-skill` (7,446), `nateherkai/scroll-craft` (created 2026-08-22, 5,310), `oil-oil/oil-ui` (created 2026-09-30, 3,653), `abdiraimov-otabek/dashboard-design-skill` (created 2026-10-20, 1,036), two Refactoring UI skills (704 and 492). On skills.sh, `emilkowalski` `break-ui` and `animation-performance` went from zero to ~18K installs a week since October.

---

## 2. Map and geo UI

### Skills that exist

| Repo | Stars | Last push | Skills (path `skills/<name>/SKILL.md`) | Installs | Notes |
|---|---|---|---|---|---|
| `maplibre/maplibre-agent-skills` | 163 | 2026-11-20 | maplibre-cartography (verified), maplibre-pmtiles-patterns (verified), maplibre-sprites-icons (verified), maplibre-terrain-rendering (verified), maplibre-source-wiring, maplibre-tile-sources, maplibre-v6-migration (provisional), maplibre-fonts-glyphs, maplibre-mapbox-migration, maplibre-native-gl-js-parity, plus two repo-process skills | tile-sources 1,186; pmtiles 894; cartography 615; source-wiring 400 | Releases v0.2.0 (2026-08-30), v0.3.0 (2026-10-26). Claude plugin marketplace included. |
| `AnmolSaini16/mapcn` | 12,404 | 2026-11-15 | `skills/mapcn/` | not captured | Also `https://mapcn.dev/llms.txt` and registry `https://mapcn.dev/r/registry.json` |
| `mapbox/mapbox-agent-skills` | 87 | 2026-11-20 | 29 skills incl. mapbox-cartography, mapbox-data-visualization-patterns, mapbox-style-quality, mapbox-web-performance-patterns, mapbox-web-integration-patterns | web-integration 2,746; data-visualization-patterns 2,224 | Official Mapbox. `mapbox-data-visualization-patterns` has choropleth and heatmap recipes with ColorBrewer-style ramps; the expressions are close to MapLibre's but written for Mapbox GL JS and tokens. |
| `nextlevelbuilder/ui-ux-pro-max-skill` (main) | 152,343 | 2026-11-21 | Maps category in `data/ux-guidelines.csv` | - | See shortlist item 3 |

Other map registries listed by shadcn (not evaluated in depth): `@terrae` (Mapbox + MapLibre), `@shadcn-map` (Leaflet), `@shadcnmaps` (SVG), `@flightcn`, `@bklit` (charts incl. maps).

### MCP servers

| Server | Stars | Last push | What | Flag |
|---|---|---|---|---|
| `mapbox/mcp-server` | 373 | 2026-11-18 | Geocoding, directions and other Mapbox APIs | Needs a Mapbox token |
| `mapbox/mcp-devkit-server` | 62 | 2026-11-18 | Style management, GeoJSON preview, bbox and coordinate tools, style comparison | Needs a Mapbox token |
| `mapbox/mcp-docs-server` | 1 | 2026-11-11 | Mapbox docs lookup | New, barely used |
| `birkskyum/maplibre-mcp` | 3 | 2026-10-05 | Renders a MapLibre style so the agent can see it; local, no key | Tiny, unvetted. Playwright MCP screenshots of your dev server do the same job. |
| `CodeStorm-Hub/maplibre_mcp` | 3 | 2026-10-31 | "All-in-one" MapLibre MCP | Unvetted |

### No real skills: use the official docs

- **deck.gl**: nothing credible (`karlaugustnybo/deckgl-skill` has 0 stars and 4 to 7 installs). Use `https://deck.gl/llms.txt` (200, 49 KB) and the repo's `AGENTS.md`. Layer reference: `https://deck.gl/docs/api-reference/layers`.
- **Leaflet**: community skills only, all under 75 installs. No `llms.txt` (404). `https://leafletjs.com/reference.html`.
- **react-map-gl**: no skill, no `llms.txt` (404). `https://visgl.github.io/react-map-gl/docs`. mapcn wraps MapLibre directly, so you may not need it.
- **Protomaps / PMTiles**: no `llms.txt` (404). `https://docs.protomaps.com/pmtiles/maplibre`; `maplibre-pmtiles-patterns` covers the protocol and hosting.

Verified `llms.txt` endpoints (HTTP 200 today):
- `https://maplibre.org/llms.txt`, `https://maplibre.org/maplibre-gl-js/docs/llms.txt` (42 KB), `https://maplibre.org/maplibre-gl-js/docs/llms-full.txt` (1.9 MB, too big to load whole)
- `https://deck.gl/llms.txt`
- `https://docs.mapbox.com/llms.txt`, `https://docs.mapbox.com/mapbox-gl-js/llms.txt`
- `https://mapcn.dev/llms.txt`
- `https://docs.maptiler.com/llms.txt`, `https://docs.stadiamaps.com/llms.txt`, `https://docs.carto.com/llms.txt`
- UI side: `https://ui.shadcn.com/llms.txt`, `https://motion.dev/llms.txt`, `https://nextjs.org/docs/llms.txt`, `https://magicui.design/llms.txt`, `https://reactbits.dev/llms.txt`, `https://ui.aceternity.com/llms.txt`
- Style expressions: `https://maplibre.org/maplibre-style-spec/expressions/`

### Cartographic colour (flood depth)

No dedicated skill for data colour ramps exists that I could find. The nearest are the ui-ux-pro-max Maps rows 124 to 126 and `mapbox-data-visualization-patterns`. Guidance from the sources found:

- Depth is ordered data, so use a **sequential** ramp, not rainbow and not red-green. Ordnance Survey's cartography guide recommends single-hue ramps varying in lightness and suggests blues for water: `https://docs.os.uk/more-than-maps/geographic-data-visualisation/guide-to-cartography/colour`
- Esri's flood simulation symbology uses darker colour for deeper water: `https://developers.arcgis.com/javascript/latest/visualization/best-practices/choosing-a-color-ramp/`
- Pick ramps from ColorBrewer (`https://colorbrewer2.org`, e.g. Blues or YlGnBu with the colour-blind-safe filter on) or `d3-scale-chromatic` (`https://d3js.org/d3-scale-chromatic`); Crameri's scientific colour maps are another vetted set (`https://www.fabiocrameri.ch/colourmaps/`).
- Do not rely on colour alone: add depth labels, a legend with class breaks, and a pattern or outline for the worst class.
- Keep the basemap muted so the ramp carries the figure. `maplibre-cartography` covers that layering.
- Reference reading I did not open in full: Defra's "Designing a more accessible flood map" (`https://defradigital.blog.gov.uk/2021/05/20/designing-a-more-accessible-flood-map`). FEMA's flood depth guidance PDF returned 403 to curl, so its symbology table is unverified.

---

## 3. Installed skills: local versus upstream

| Skill | Local | Upstream now | Behind? | What changed |
|---|---|---|---|---|
| `anthropics/skills` frontend-design | Copy of 2026-08-19, 8,315 bytes | Updated 2026-09-03 (#1713), 9,390 bytes | **Yes** | "Avoid generic design defaults" rewrite. Single file to replace. |
| `pbakaus/impeccable` | **4.8.2** (frontmatter; files dated 2026-11-11; engine pin 0.1.22) | **skill-v4.10.0** (2026-11-18), engine 0.1.28 | Slightly (3 releases) | 4.9.0: signed-in CLI saves design health and uploads DESIGN.md and critiques; `audit` saves reports, checks RTL; subagents reach MCP tools. 4.9.1: `impeccable world <id>`, `walkthrough`, `foundations`, Loop agent hooks, steadier Live. 4.10.0: DESIGN.md as a map (`design-compact`), actionable drift, `animate` reviews captured motion. New companion product "Impeccable Loop" (0.1.0 on 2026-11-10, 0.2.0 on 2026-11-18). |
| `nextlevelbuilder/ui-ux-pro-max-skill` | 2026-08-19: 79 styles, 192 palettes, 119 guidelines | `main`: 80 styles, 194 palettes, 141 guidelines; tag still v2.15.0 | **Yes** (94 commits) | Maps guideline category and GIS product types (2026-11-18), form error-handling rows (2026-11-21), design-system token export and preview page (2026-11-15), Apple Native style, RTL filter, React 19 stack rows, `--dry-run`. Repo also ships sibling skills `banner-design`, `brand`, `design`, `design-system`, `slides`, `ui-styling` in `.claude/skills/`; you have only `ui-ux-pro-max`. |
| `Leonxlnx/taste-skill` (`design-taste-frontend`) | 2026-08-19, one 88 KB SKILL.md, v1-era text (no version string in file) | **v2.5.1** (2026-11-07); v2.0.0 was 2026-10-13 | **Yes, by a full rewrite** | Now a single skill folder with `assets/`, `library/`, `references/`, `scripts/`: real-browser checker, finish gate as a Stop hook, copy linter, motion layer, licensed photo search (Wikimedia Commons), palettes by trade. Not recommended for this project (see above). |
| `greensock/gsap-skills` (8) | 2026-08-19 | Last push 2026-07-29 | No | Same eight skills. |
| `motion-framer` | 2026-08-19 | Upstream source not identifiable from the folder | Unknown | Could not verify. Emil's repo notes Motion 14.2 guidance changes on 2026-11-02, so the August text may be dated. |
| `emilkowalski/skills` | 4 of 20, copied into hackathon-kit today; `apple-design` in the August plugin | Last push 2026-11-15 | The 4 are current; `apple-design` predates the 2026-11-13 API fix pass | Added since August: mobile-native (09-15), break-ui (10-02), animation-performance (10-11), remove-animations (10-28), choreograph (11-04), gestures (11-08), learn-taste (11-12), ask-emil (11-15). |
| `vercel-labs/agent-skills` web-design-guidelines | Copied today | 2026-10-29: guidelines are now bundled and pinned instead of fetched from `main` | No | One fewer network call. |
| `CloudAI-X/threejs-skills` | 13 skills, copied today | Last push 2026-10-19 | No | Includes the three added on 2026-10-19 (performance, react-three-fiber, asset-pipeline). |
| ECC `motion-*`, `make-interfaces-feel-better` | Copied today | ECC last push 2026-11-20 | No | The original `jakubkrehel/make-interfaces-feel-better` has had only README changes since August; its author now maintains `jakubkrehel/skills`. |
| shadcn MCP | `@jpisnice/shadcn-ui-mcp-server` | Official is `npx shadcn@latest mcp` | Different server | Official one supports multiple registries. |
| Playwright MCP | `@playwright/mcp@latest` | - | No | - |
| 21st.dev magic MCP | Configured, key missing | `21st-dev/magic-mcp` last push 2026-09-09 | Not working | Skip today. |

### Full current upstream sets

**impeccable 4.10.0**: one skill, `impeccable`, with sub-commands. From the local 4.8.2 command table plus release notes: `shape`, `init` (alias `teach`), `document`, `extract`, `critique`, `audit`, `polish`, `bolder`, `quieter`, `distill`, `harden`, `onboard`, `animate`, `colorize`, `typeset`, `layout`, `delight`, `overdrive`, `clarify`, `adapt`, `optimize`, `live`, `generate`, `hooks`, `doctor`, `pin`/`unpin`, `craft` (deprecated alias). CLI verbs added in 4.9 to 4.10: `world`, `walkthrough`, `foundations`, `loop connect`, `login`, `health`, `critiques`, `setup`, `forget`, `design-compact`. I did not diff the 4.10.0 SKILL.md command table line by line. The old standalone skills (`polish`, `critique`, `bolder` and so on) show zero weekly installs on skills.sh; they were folded into the single skill.

**taste-skill v2.5.1**: one skill only, folder `skills/taste-skill/`, frontmatter name `design-taste-frontend`. The earlier sub-skills (`high-end-visual-design`, `redesign-existing-projects`, `minimalist-ui`, `industrial-brutalist-ui`, `gpt-taste`, `stitch-design-taste`, `brandkit`, `image-to-code`, `imagegen-frontend-web`, `imagegen-frontend-mobile`, `full-output-enforcement`, `design-taste-frontend-v1`) are no longer in the repo tree; their weekly installs fell from about 20,000 to about 20 in mid-October, matching the v2.0.0 release.

**emilkowalski/skills (20)**: animate, animate-expo, animation-performance, animation-vocabulary, apple-design, ask-emil, ask-sonner, break-ui, choreograph, emil-design-eng, find-animation-opportunities, gestures, improve-animations, learn-taste, mobile-native, pick-ui-library, prototype, remove-animations, review-animations, write-swift.

---

## Install commands (for reference; nothing was run)

```bash
# 1 mapcn (command from the mapcn README)
npx skills add AnmolSaini16/mapcn
npx shadcn@latest add @mapcn/map

# 2 MapLibre skills: copy the listed folders from maplibre/maplibre-agent-skills/skills/
#   or: /plugin marketplace add maplibre/maplibre-agent-skills

# 3 ui-ux-pro-max: replace the local folder with .claude/skills/ui-ux-pro-max from main

# 4 official shadcn MCP (from ui.shadcn.com/docs/mcp)
npx shadcn@latest mcp init --client claude

# 5 frontend-design: replace SKILL.md from anthropics/skills/skills/frontend-design/

# 6 impeccable
npx impeccable update
```

Hackathon note: your plan says all code must be written after 11:00 and AI use and frameworks must be credited. mapcn blocks, shadcn registry components and these skills belong in the README credits.

## Not verified

- Whether the `uipro` CLI installs `main` or the v2.15.0 tag.
- skills.sh install counts for `mapcn`, `unslop`, `dashboard-design` (not in the top 600 and not queried by name).
- The upstream source of the local `motion-framer` skill.
- FEMA flood depth symbology table (403).
- Pricing or limits of 21st.dev magic and of `oil-ui-pro`.
- Code quality of the mapcn blocks; I read the skill, README and llms.txt, not the component source.

## Sources

- skills.sh: `https://skills.sh/`, `/trending`, `/hot`, `/topic/design`, `/api/search`
- `https://ui.shadcn.com/r/registries.json`, `https://ui.shadcn.com/docs/mcp`
- `https://mapcn.dev/llms.txt`, `https://maplibre.org/llms.txt`, `https://deck.gl/llms.txt`
- `https://claudemarketplaces.com/`
- Colour: `https://docs.os.uk/more-than-maps/geographic-data-visualisation/guide-to-cartography/colour`, `https://developers.arcgis.com/javascript/latest/visualization/best-practices/choosing-a-color-ramp/`, `https://colorbrewer2.org`, `https://defradigital.blog.gov.uk/2021/05/20/designing-a-more-accessible-flood-map`
- GitHub repos named above, via `gh api`
