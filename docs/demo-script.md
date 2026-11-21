# Fludd demo script (3 minutes, in person)

Updated from `prep/PLAN.md` section 13 for what actually shipped: onboarding, the Maps-style sheet (no tab bar), Live, Ask Pelican, Rewards and the "Report flooding" Shortcut.

**Setup before judges arrive**
- iPhone on venue Wi-Fi, `fludd.app` open from the Home Screen icon, onboarding **not** done yet (Safari > clear website data for fludd.app, or use a second phone).
- Laptop: `fludd.app` at full width for the map on the projector, a second tab on `fludd.app/admin`, signed in.
- A printed flood photo (car tyre half under water) on the table.
- Demo address: **1514 E 139th Ave** (grade F, Zone X "minimal flood hazard", 21 Milton-damaged properties within 400 m). Backup home with a good grade: **4202 E Fowler Ave** (grade A).

| Time | Who | Say | Do |
|---|---|---|---|
| 0:00 | Harshith | "This apartment is a mile from this room. The official flood map calls it minimal hazard. In Milton, 21 homes around it were damaged." | Phone: the storm intro plays, then **Get started**. |
| 0:15 | Harshith | "Renters never get a flood report. Five taps and it's about your home, and it never leaves your phone." | Onboarding: *I rent* > *Apartment* > *Ground floor* > type **1514 E 139th Ave** > *I park at home* > *Every day* > insurance *No* > *Show me my home*. |
| 0:40 | Harshith | "F. Official map: Zone X. What we found: water at the door in a storm you'll see this decade." | Sheet opens on the map like Maps. The Home shortcut shows the red **F**. Drag the sheet up: the two tiles, *Water at the door*, *Flood history nearby*. |
| 1:00 | Harshith | "Now the storm." | Tap **Live**. Pick *Hurricane*, drag the time slider: water spreads street by street; *Move your car by* goes red. Turn **Pump stations have power** off, then on: "That one switch is what happened on October 10." |
| 1:25 | Harshith | "Mid-storm you need groceries. Ask Pelican." | Close (✕) > **Ask Pelican** > tap *Groceries*. The sheet drops to half and the route draws on the map with a dot at the store: "only roads the model keeps open at that hour." |
| 1:40 | Hansika | "Under it: the ground split into bowls, each fills and spills; pumps drain them; every road gets a closing hour for a car and for a fire truck. Built today, runs once in about 1.5 s per storm, the phone only draws static files." | Laptop: toggle **Drainage** on to show 4,604 storm pipes and 943 outfalls. |
| 2:00 | Hansika | "Checked against Milton: 52.3% of the county's 547 damage points fall where we put water, including 136 of the 207 outside FEMA's high-risk zones. FEMA's zones hold 62%, but over 9.07 km² against our 3.54." | Scroll to *How we checked the model*. |
| 2:25 | Harshith | "Residents make it better." | Press the **Action Button** ("Report flooding"), photograph the printed photo. Phone says "Fludd read up to about N inches of water." Laptop admin tab: approve it. (Steps in `docs/shortcut.md`.) |
| 2:45 | Harshith | "Every report, inlet cleared and check-in earns points." | Phone: **Rewards** shortcut: rank card (Puddle Spotter > Rain Watcher > Storm Scout > Pelican > Harbor Keeper). |
| 2:55 | Harshith | "Fludd is for renters choosing where to live, and for everyone on storm day. It never tells you a flooded road is safe." | Stop. |

## Guided demos (if a judge wants to click through alone, or the live walk runs out of time)

`https://fludd.app/demo` has four short walks with Back and Next. Each runs on the real map and model; anything made up is tagged on screen in orange.

| Page | One line to say | The moment to land |
|---|---|---|
| `/demo/1` Neighbours report | "This is the map with people on it." | Step 3: each resident reading next to what the model said there, then "3 of 5 reports with water are deeper than the model". Step 4: three reports past the car limit, 185 homes within 150 m. The reports are simulated; the model numbers are read live. |
| `/demo/2` Moving or building | "Two homes on the same street, both Zone X on the official map." | Step 2: 1415 E 139th Ave grades A, 1519 E 139th Ave grades F. Step 4: similar homes nearby with a better grade. Nothing here is simulated. |
| `/demo/3` Your camera is a gauge | "A camera you already own reads the water at your own kerb." | Step 3: the camera's readings against the model's line for that spot. Step 5: a spare phone today, or CCTV through `docs/camera-bridge.md`. The camera readings are simulated. |
| `/demo/4` Food after the flood | "Food exists a mile away, with no way to find it." | Step 3: a giver whose street the model floods is hidden. Step 4: "I need food" gives a pickup code and no name; the giver sees only a rounded count. Say plainly that the offers are simulated and the portals are a design, not built. |

## If something breaks

- **Intro video stalls**: tap anywhere; the app takes over after 6 s anyway.
- **Address search slow**: tap the **A** home shortcut on the backup phone (4202 E Fowler Ave) and tell the same story with the contrast "this one stays dry."
- **Pelican says it can't reach a place service**: tap *Pharmacy*; the app falls back from Overpass to ArcGIS place search within 3 s.
- **Shortcut says "Sent for manual review."**: the upload worked, Gemini timed out. Approve it in admin anyway.
- **No Wi-Fi**: switch the phone to a hotspot. There is no offline mode: the app loads its data (about 67 MB) over the network, so load it once on good Wi-Fi before judging and keep the tab open.

## Questions (Hansika: technical; Harshith: product, design, privacy)

- **"How accurate is it?"** (Hansika) 52.3% of 547 Milton points; 136 of the 207 FEMA missed. Limits: no storm surge, river flooding or groundwater; one storm to check against; a screening estimate, not a FEMA determination.
- **"Isn't this Google Maps?"** (Hansika) Google learns a road is closed after someone reports it. Fludd predicts depth hour by hour, per vehicle, before anyone drives there.
- **"What did you build versus the AI?"** (each for their own side) From the README's AI-use section: the team chose the model, the grading rule, the design and every safety line; Claude Code and ChatGPT Codex wrote code to those decisions; Gemini only parses Pelican requests, reads report photos and writes short guidance, never the grade, map or routes.
- **"Why trust a grade?"** (Hansika for the rule, Harshith for the display) It is a rule you can say back ("F: 6 in or more at the building in a 10-year storm"), shown with its reasons, capped by evidence.
- **"Privacy?"** (Harshith) Home, car and insurance stay in the phone's storage. Report photos have metadata stripped; a person approves each one; the public map shows a street-level position, never the exact point. Rewards are counted on the device only.
- **"Why no tab bar?"** (Harshith) It's a map app: one sheet over the map, like Apple and Google Maps, so the water stays on screen while you read about it.

## Rehearsal log

- [ ] Run 1 (time: ___ ) notes:
- [ ] Run 2 (time: ___ ) notes:
