# Fludd: presentation prep

Who says what, in the order the judges will hear it. The minute-by-minute live walk is in `docs/demo-script.md`; this page is the talk around it and the questions after it. Every number here is from the app or `web/public/data/validation.json`. Do not round them differently on stage.

## The split

| Part | Who | Time | Why this person |
|---|---|---|---|
| 1. Why we built it | **Harshith** | 0:40 | It is the product story, and it should land before any screen is shown |
| 2. Impact | **Hansika** | 0:30 | It is her validation number |
| 3. Features (live) | **Harshith** drives the phone | 1:15 | He built the interface |
| 4. Tech stack | **Hansika** | 0:35 | She built the model and routing |
| 5. Close | **Harshith** | 0:10 | |
| FAQ | Split below | | Technical → Hansika. Product, design, privacy, AI use → Harshith |

If they give five minutes instead of three, spend the extra on part 3 (add the photo report and one guided demo), not on more talking.

## 1. Why we built it (Harshith, about 40 s)

Say this before you touch the phone. Slowly. Look at the judges, not the screen.

> "On October 9th, 2024, eleven and a half inches of rain fell on Tampa in a single day. That is more than this city had ever recorded in an entire October.
>
> The water rose in the dark. In six hours that night, Hillsborough firefighters pulled more than five hundred people out of flooded homes.
>
> In the sixteen square miles around this campus, the county later counted **five hundred and forty-seven** flood-damaged properties. And **two hundred and seven** of them sat outside the official high-risk flood zones. If you had looked one of them up before signing a lease, the map would have told you: *minimal flood hazard*.
>
> Nearly half the homes in Tampa are at risk of flooding in the next thirty years. Nobody hands a renter a flood report. So we built one."

Then one beat of silence, and: "This is Fludd." Start the phone.

**Where each number comes from** (in case a judge asks):
- 11.43 in at Tampa International on October 9, the second-wettest day on record there, and more than any full October since 1890: National Weather Service Tampa Bay, Hurricane Milton summary.
- More than 500 people rescued by Hillsborough County Fire Rescue overnight: Axios Tampa Bay, October 10, 2024. (Fox 13 quoted the county at more than 725 people and 128 pets between 9 pm and 3 am. Say "more than five hundred"; both reports support it.)
- 547 damaged properties in our study area, 207 outside FEMA's high-risk zones: Hillsborough County damage assessments, counted by our pipeline (`web/public/data/validation.json`). The study area is 41.3 km², about 16 square miles.
- "Nearly half the homes in Tampa": 44% of residential properties in the city of Tampa, First Street Foundation's 2021 analysis as reported by the National Wildlife Federation.

**Numbers to leave out:** a yearly "chance of a hurricane hitting Tampa". The only figure we found is a forecaster's "about once a decade" in a news story, with no clear definition. If you want the idea, say "a hurricane passes close to Tampa about once a decade" and nothing more precise.

In reserve, if you have five more seconds: "Two homes on E 139th Ave, 265 metres apart, both 'minimal hazard' on the official map. Our model grades one A and the other F."

## 2. Impact (Hansika, 30 s)

- "We did not tune the model to Milton. We built it, then checked it against the county's damage records."
- "It puts water at **286 of the 547** damage points: **52.3%**."
- "Of the **207** points FEMA's high-risk zones missed, it finds **136**."
- "FEMA's zones catch more points, 62%, but they cover **9.07 km²**. Our flooded area is **3.54 km²**. We are pointing at streets, not at districts."
- "It is one storm, so we call it a check, not a guarantee. The app shows this number next to every grade."

Who it helps, if asked to spell it out: renters and buyers before they sign; residents on storm day (when to move the car, how long a fire truck can reach them); and neighbours, because one photo report covers the homes within 150 m of it.

## 3. Features (Harshith drives, about 75 s)

Follow `docs/demo-script.md`. The four things that must be seen, in this order:

1. **The grade.** Search the demo address. "F. Official map: minimal hazard." Then read the "We found" line off the screen, exactly as the app words it. (Storms are named in plain words in the app; say them that way.)
2. **The storm.** Storm mode, play it. Water spreads street by street; "move your car by" turns red; switch the pump stations off and on.
3. **Ask Pelican.** "I need a pharmacy." It only uses roads the model keeps open at that hour, and it says so when there is no safe route. "It never tells you a flooded road is safe."
4. **People.** A photo report read by Gemini and approved by a person. If time: the checklist for buying, renting or building, or `fludd.app/demo`.

Have ready on the laptop: `fludd.app/demo` (four guided walks) and the looping video, in case the phone or the Wi-Fi fails.

## 4. Tech stack (Hansika, 35 s)

- **The model (Python).** "3-metre lidar, NOAA rainfall. We split the ground into **8,612 bowls**. Each fills, spills into the next, and pump stations drain them. A simple 'fill the low ground' model was wrong here; this one moves water."
- **Routing (TypeScript, in a web worker).** "The real road graph, **6,481 junctions and 9,064 segments**. Every segment gets its own closing hour for a car, a truck and a fire engine. That is where 'move your car by 6' comes from."
- **The app.** "Next.js, React, TypeScript, MapLibre for the map, Supabase for reports, hosted on Vercel. The heavy model runs once per storm and ships as static files, so a visit costs no model compute."
- **Gemini.** "It reads flood photos, writes the plain-language advice from our numbers, and understands Ask Pelican requests. Every answer is checked so it cannot add a number we did not give it. Turn Gemini off and the grade, the map and the routing still work."
- **Tests.** "Over 450 web tests and 70 model tests, run on every push."

## 5. Close (Harshith, 10 s)

"Fludd is for the renter choosing where to live, and for everyone on the street the night the water comes. It is live at fludd.app."

## FAQ

**Hansika answers**

- **How accurate is it?** 52.3% of 547 Milton damage points; 136 of the 207 outside FEMA's high-risk zones. A point counts if the model has 6 in or more of water within 25 m. One storm, so it is a check, not a guarantee.
- **What does the model leave out?** Storm sewers (pipes are drawn, water is not routed through them), storm surge, river flooding, groundwater. It uses 2011 lidar; the 2025 county lidar is the first upgrade.
- **Why not just use FEMA's map?** FEMA's zones are for insurance and cover wide areas. They held 62% of Milton's damage here but over 9.07 km², and they missed 207 damaged properties. We predict water at a building, by the hour.
- **Isn't this Google Maps?** Google learns a road is closed after someone reports it. Fludd predicts depth per road per hour before anyone is there, separately for a car and a fire engine.
- **How does the grade work?** One rule you can say back: the letter comes from the smallest storm that puts 6 in or more of water at the building. Pump dependence, deep water at the floor and Milton damage within 100 m can only lower it.
- **Does it scale beyond USF?** The pipeline is the same for any area with lidar and a road graph. An all-of-Tampa trial run exists; it is not in the app today.
- **How good is Gemini at reading photos?** On 8 test photos today it was right on 4, slightly high on 1, too deep on 2, and read a wet road as shallow water. We then tightened the prompt. That is why a person approves every report before it reaches the map.

**Harshith answers**

- **What did you build and what did the AI build?** "We chose the idea, the model design, the grading rule and thresholds, the design direction and what the app must never say. Claude Code and Codex wrote most of the code under our direction, and we ran, reviewed and corrected it. It is all in the README's AI section."
- **What is real and what is simulated?** The grades, the water, the routing, the validation and the weather are real. In the guided demos the neighbours' reports, the camera readings and the food offers are simulated and labelled in orange on screen. The food-share portals are a design, not built.
- **Privacy?** Home, car and insurance answers stay in the phone's storage and never reach our server. Report photos have their metadata stripped, carry no identity, and a person approves each one.
- **Can I use my existing security camera?** Yes if it gives a video address or a snapshot link: a short script on your own network sends one still. Ring and Nest keep their video inside their own apps, so not those. We have not tested it on a real camera yet.
- **Why would anyone send reports?** The app shows how many homes within 150 m your report reaches. It is framed as helping your block, not as points.
- **What about people without a smartphone, or Spanish speakers?** Honest answer: not solved today. A spoken brief works through an iPhone Shortcut; Spanish is next.
- **Is it safe to rely on in a storm?** It is a screening estimate. In a storm people should follow the county and the National Weather Service. The app never tells anyone a flooded road is safe, and says so on screen.
- **Business model, or who pays?** Not built for revenue today. The natural homes for it are a university housing office, a county emergency office or a renters' rights group.
- **What's next?** Newer lidar, storm sewers in the model, all of Tampa, Spanish, and the food-share portals.

## Things not to say

- "It predicts floods." Say: "it estimates where water collects, checked against Milton."
- "100-year storm". Say "hurricane-level rain", as the app does.
- Any number that is not on this page or in the app.
- That any road or depth is safe.

## Before you walk in

- [ ] Phone: `fludd.app` open, site data cleared so the intro and welcome screen show.
- [ ] Laptop: `fludd.app` full width, `fludd.app/demo` in a second tab, `/admin` signed in, the loop video ready.
- [ ] The 8 test reports rejected in `/admin`.
- [ ] One run-through each of your own parts, out loud, with a timer.
