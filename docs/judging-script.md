# Judging script: 3½ minutes, then the phone

Built around the scorecard: Technical Implementation 25%, Innovation & Creativity 20%, Relevance to the Track 20%, Execution & Completeness 20%, Presentation & Understanding 15%. Each block says which line it scores on.

**Before the judges arrive**
- Phone: fludd.app open from the Home Screen icon, onboarding done, home set to **1514 E 139th Ave** (grade F), sheet resting, **Now** chip on.
- Laptop: the 42-second film open full screen and paused on its first frame, sound up. Second tab: `fludd.app/demo` as a backup.
- Decide who holds the phone (Harshith) and who drives the laptop (Hansika).

| Time | Who | Say | Do | Scores |
|---|---|---|---|---|
| 0:00–0:40 | Harshith | **Why we built it.** The opening from `docs/presentation.md`, slowly, eyes on the judges: October 9th, 2024, 11.43 inches in one day; 500+ people rescued that night; **547** damaged properties around this campus, **207** of them outside the official high-risk zones, where the map said *minimal flood hazard*; nearly half the homes in Tampa at risk in the next 30 years. "Nobody hands a renter a flood report. So we built one." | Nothing in your hands. One beat of silence. | Relevance, Presentation |
| 0:40–0:55 | Harshith | **What it is, two lines.** "This is Fludd. Type any address and you get a flood grade, where the water goes hour by hour in a storm, and when to move your car. On a normal day it's live: weather, river gauges, alerts. In a storm it's your map." | Hold up the phone: map, **Now** chip, the F home. | Relevance, Innovation |
| 0:55–1:00 | Harshith | "We built it today, in seven hours. Hansika built the engine." | Hand over to Hansika. | Presentation |
| 1:00–2:15 | Hansika | **How it works and the features** (see below). | Laptop or her own phone. Point, don't scroll. | Technical, Execution |
| 2:15–2:57 | Both, silent | **The film**, 42 seconds. "Here's what that looks like on a phone." | Hansika presses play. Let it run; no talking over it. | Innovation, Presentation |
| 2:57–3:30 | Harshith | **Close.** "It's live right now at fludd.app. It's honest about what it knows: together with FEMA's map it flags **87%** of the damage Milton did here, and it caught **136 of the 207** homes FEMA's map missed. It never tells anyone a flooded road is safe. Who's it for? Renters deciding where to live, and everyone on storm day." | Phone back in hand. | Execution, Relevance |
| 3:30 | Harshith | "Try it yourself." | **Hand the phone to a judge** (tasks below). | Execution, Presentation |

## Hansika's 75 seconds (1:00–2:15)

Say the mechanism plainly, one feature per line, each with its number.

1. **The model (Technical).** "We took 3-metre lidar of the area and found **8,612 low spots**, bowls, and where each one spills into the next. A storm fills them hour by hour, pump stations on or off. One storm runs in about a second and a half, then the phone just draws it."
2. **The grade (Technical).** "The letter is a rule you can repeat: the smallest storm that puts 6 inches of water at the building. It can only go down, never up."
3. **Roads (Technical, Innovation).** "We loaded the real road network, **6,481 junctions**, and every road closes at its own hour for a car, an SUV or a fire truck. That's how it says *move your car by 6 pm* and *fire trucks can reach you until 9*. You tell it what you drive."
4. **Live now (Relevance).** "On a dry day it shows live Weather Service alerts, **USGS river gauges** and the forecast. Storm mode is a simulation, and it's labelled as one."
5. **Pelican (Innovation).** "Ask Pelican: *I need groceries*. It routes only on roads the model keeps open, and it still works if the AI is down."
6. **Community (Relevance).** "Residents send flood photos; AI reads the depth and a person checks it. And food share: restaurants offer meals and supplies within a few miles, and people ask with no name. Givers only ever see a count."
7. **Proof (Execution).** "**493** unit tests and **16** end-to-end tests, phone and desktop. Checked against Milton: **87%** with FEMA's map, **52.3%** for our model alone, never tuned to those points."

## When you hand over the phone (3:30)

Say: "Three things to try."
1. **"Tap any building."** It gets its own grade and history.
2. **"Tap Storm mode, then Play."** Water spreads street by street; the meter bottom-left climbs.
3. **"Tap the pelican and ask for groceries."** A route appears that avoids the water.

Stay quiet while they explore. Answer only what they ask.

## Questions, and who takes them

- **"Is it 87% accurate?"** (Hansika) "No. Our model alone hits 52.3%. Together with FEMA's map it covers 87%, and ours is the half FEMA misses: 136 of 207. We never tuned it to those points." *Never let 87% stand as the model's own number.*
- **"What did AI build versus you?"** (each for your own side) The README's AI-use section: we chose the model, the grade rule, the design and every safety line; Claude Code and ChatGPT Codex wrote code to those decisions; Gemini only reads requests and photos.
- **"Why not Google Maps?"** (Hansika) "Google learns a road is closed after someone reports it. Fludd predicts depth, per vehicle, hour by hour, before anyone drives there."
- **"Privacy?"** (Harshith) "Home, car and insurance stay on your phone. Photos lose their metadata and a person approves each one. Food requests keep only a 500-metre area and are deleted after 48 hours."
- **"Does it cover all of Tampa?"** (Harshith) "Search, weather, gauges and food share do. The flood model covers 16 square miles around USF today; the city-wide run is set up."

## If something breaks

- **No Wi-Fi:** phone hotspot. The film plays from the laptop.
- **The app stalls:** switch to `fludd.app/demo` on the laptop and keep talking.
- **Pelican says routes are unavailable:** "the router's busy", then tap Food & help instead.
