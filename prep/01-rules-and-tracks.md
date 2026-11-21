# HackJam '26 - rules, tracks, fact-check, Gemini basics

Researched 2026-11-21 (event day), before 11:00 local. Every claim below carries its source URL.
Two labels are used throughout:

- **VERIFIED** = I read the page itself today (rendered in a browser or fetched raw).
- **NOT VERIFIED** = page could not be read, or the source is silent. Nothing in this file is filled in from memory.

How pages were read: the Notion guide and MLH pages are JS-rendered and were read with a headless browser (scrolled end to end, FAQ toggles expanded). Google docs and MLH guide pages were fetched raw. Axios was read from a Wayback Machine capture because the live page is truncated/403.

---

## 0. The five things that matter most

1. **No project work before hacking starts (11:00).** Guide: "You may not work on your project before the event" and projects "must be created during the event". Penalty is disqualification. The guide does **not** say whether ideation, planning, research or installing tools beforehand is allowed (see 1.2).
2. **AI use is allowed but must be credited, in two places:** in the MLH submission *and* in a detailed README that separates what you made from what was generated. Not crediting AI = disqualified and reported to MLH.
3. **Submit on MLH OrganizerHQ by 18:00 sharp**, with the same MLH account you registered with, and only after you are checked in. Tick every challenge you want; you can only win challenges you ticked.
4. **A team can win only one prize**, even if it enters all four challenges.
5. **No judging criteria weights are published.** Only per-track "what we look for" bullets exist. The four-criteria MLH rubric (Technology / Design / Completion / Learning, equal weight) is MLH's standard and most plausibly governs the Gemini (MLH) category; it is not confirmed for HackJam's own tracks.

---

## 1. Hacker's Guide

Source: https://app.notion.com/p/HackJam-26-Hacker-s-Guide-5bfb26cd08b18382b1f181d715cf7ffc (VERIFIED, rendered, page title "HackJam '26 | Hacker's Guide")

Organizer: SHPE USF. MLH member event. Other official pages:
- Event site: https://www.hackjam26.com/ (same content also at https://hack-jam26.vercel.app/)
- MLH event page: https://events.mlh.com/events/14412-hackjam-26
- MLH challenges page: https://www.mlh.com/events/hackjam-26?tab=challenges

### 1.1 Rules (VERIFIED, full list as written in the guide's "Rules" section)

- Teams can be 1-3 people. (Solo is allowed.)
- You may not crosspost to other hackathons.
- You may not submit multiple projects.
- You may submit to multiple challenges.
- "You may not work on your project before the event. You must stop development when submissions are due."
  - Sub-point: you should not be reusing code from previous projects.
- You may use publicly available frameworks, but you must list them in a README.
- "You may use LLM/ChatGPT/AI, but must state how you did so in your MLH submission."
  - Sub-point: credit any tools used; be clear on what you made versus what was generated, via a detailed README. The project must not be a reskin of an existing AI tool. Uncredited AI use = disqualification and a report to cheating@mlh.io.
- Judging will be in person.
- Students only. Volunteers, organizers and mentors cannot win prizes.

From "Important information" (VERIFIED): all projects "must be created during the event"; participants may not "reuse, modify, or continue work on projects that were started prior to the start of hacking"; violations are "subject to disqualification". Deadline: November 21, 6:00 PM.

From "How HackJam works" (VERIFIED): the project must address at least one of the three tracks, and teams can only submit what they accomplished in the given time.

These rules are a near word-for-word copy of MLH's recommended copy-paste rule set, with team size changed from 4 to 3 and "Devpost" changed to "MLH". Source: https://guide.mlh.com/general-information/judging-and-submissions/rules-for-your-hackathon (VERIFIED). One line from MLH's template was **dropped** by HackJam: the requirement to submit code as a publicly available link with API keys removed. So a public repo is not literally required by the guide (see 1.4).

### 1.2 What prep is allowed before 11:00

**The guide is silent.** It does not mention ideation, design, planning, research, datasets, or installing tools. (VERIFIED absence: read the full guide including all seven FAQ answers.)

What does exist:
- HackJam's own text bans working on "your project" before the event and reusing code from previous projects (1.1).
- MLH's *standard* hackathon rules, which organizers may or may not adopt (the document says so itself), state: all work on a project should be done during the hackathon period; "Teams can use an idea they had before the event"; teams may work on an idea they worked on before as long as they do not reuse code "or other project materials"; libraries, frameworks and open-source code are allowed. Source: https://raw.githubusercontent.com/MLH/mlh-policies/main/standard-hackathon-rules.md (VERIFIED)

Reading of the above (my interpretation, not a quoted rule):
- Having the idea beforehand: explicitly fine under MLH standard rules; not addressed by HackJam.
- Reading docs, learning APIs, installing tools/SDKs, creating accounts and API keys: not prohibited by any text I found, and not explicitly permitted either.
- Writing code, scaffolding a repo, building UI mockups or design assets, or pre-processing datasets that ship in the project: this is the risk zone. "Other project materials" in MLH's rule 9 plausibly covers design files and prepared data, not only code.
- **NOT VERIFIED:** whether HackJam organizers treat pre-event planning notes / wireframes / research as "working on your project". Ask in Discord or at opening ceremony (10:00) before 11:00 if anything beyond pure reading was done.

What organizers are told to check on winners (MLH cheating check, VERIFIED, https://guide.mlh.com/general-information/judging-and-submissions/cheating-check ): GitHub history (did work start before the event; one giant initial commit prompts questions but is not an automatic DQ; pushes after the deadline), a README that mentions another event, and specifically "Is a solo hacker making a really advanced project in a single weekend?". As a solo entrant, expect to be asked to explain any part of the code. Practical consequence: create the repo after 11:00 and commit incrementally.

### 1.3 Team rules (VERIFIED)

- 1-3 people; solo allowed. Team formation activity 10:30-11:00 is optional (FAQ: you do not need a team beforehand).
- One project per team; it may target more than one track (FAQ).
- A team can win only one prize (Tracks section and FAQ).
- Eligibility wording differs by page: guide says "limited to students"; event site FAQ says currently enrolled college students; MLH page lists university students, secondary/high school students and "Other".

### 1.4 Submission requirements (VERIFIED, guide "Submitting your project")

- Platform: MLH OrganizerHQ, event page https://events.mlh.com/events/14412-hackjam-26 . Every team that presents has to submit.
- Window: opens Sat 11/21 11:00 AM, closes 6:00 PM sharp.
- Steps: sign in with the same MLH account you registered with (you must be checked in first); open the event page, click Challenges, then Submit a Project; add "your project link, description and tech used"; include frameworks and AI usage; tick each challenge you are entering (the guide lists: Gemini API, Best Overall, Home Turf, Off the Grid).
- One submission per team; you can only win challenges you selected.
- README: must list frameworks used, and must detail what you built versus what AI generated (from Rules).

**Not required by anything I read (VERIFIED absence in the guide):** a demo video, a Devpost entry, slides. A "Submission Workshop" runs 4:00-4:50 PM in ENB 116 and may add requirements.

**NOT VERIFIED:** the exact fields of the MLH submission form (it is behind login); whether "project link" must be a public GitHub repo. MLH standard rules require code to be public and stay public to be prize-eligible (source above), so treat a public repo as required in practice.

### 1.5 Schedule (VERIFIED, guide schedule table, Nov 21)

| Event | Time | Location |
|---|---|---|
| Hacker check-in | 9:00-10:00 AM | ENB 109 |
| Opening ceremony | 10:00-10:30 AM | CMC 141 |
| Team formation activity | 10:30-11:00 AM | Fish Bowl |
| Professional panel | 10:45-11:30 AM | CMC 141 |
| **Hacking begins** | **11:00 AM** | |
| Git/GitHub Fundamentals (GDG) | 11:30 AM-12:45 | ENB 116 |
| Beyond the Selfie: Build AI That Recognizes You (SASE) | 12:00-12:50 PM | ENB 118 |
| Lunch | 1:00-2:00 PM | ENB 109 |
| From Idea to Demo: A Practical Hackathon Playbook (WICSE) | 2:00-2:50 PM | ENB 118 |
| From Pins to Prompts: Making Hardware Talk to AI (MEA) | 2:00-2:50 PM | ENB 116 |
| EventFinder: From APIs to Algorithms (SCP) | 3:00-3:50 PM | ENB 118 |
| Submission workshop | 4:00-4:50 PM | ENB 116 |
| **Hacking ends / MLH submission** | **6:00 PM** | |
| **Judging** | **6:20-7:50 PM** | ENB 216, 214, 228A |
| Dinner | 7:00-8:00 PM | ENB 109 |
| Build Lab Showcase | 8:00-8:50 PM | CMC 141 |
| Closing ceremony | 9:00-10:00 PM | CMC 141 |

Venue: ENB Building, 4220 E Fowler Ave, Tampa, FL 33620 (guide). Parking recommended at the Beard garage. Bring laptop, charger, photo ID.

### 1.6 Judging criteria and weights

**No rubric or weights are published** in the guide, on the event site, or on the MLH event/challenge pages (VERIFIED absence). What exists:

- Per-track "What we look for" bullets (section 2).
- Format: in person, 6:20-7:50 PM, three rooms.
- Judges named in the guide: Danil Matrosov, Prakshal Doshi, Silu Panda, Vaibhav Jain, Nutan Sahoo, Vishal Punjabi, Yesha Patel, Akshay Sharma, Sanjoy Sarkar. The event site lists 13 judges with employers including Google, Microsoft, Apple, LinkedIn, SAP, IBM, ReliaQuest, Galileo Group (https://www.hackjam26.com/ , read via a summarizing fetch, so treat employer details as lower confidence).

MLH defaults that likely shape judging but are **not confirmed for HackJam**:
- MLH standard judging criteria, used for "MLH categories at an in person event" (i.e. most plausibly the Gemini prize): **Technology, Design, Completion, Learning, weighted equally.** Explicitly *not* judged: code quality, pitch quality, how good the idea is, how well it solves a problem. Demos are strongly preferred over pitches. Source: https://raw.githubusercontent.com/MLH/mlh-policies/main/standard-hackathon-rules.md (VERIFIED)
- MLH's organizer guidance: science-fair style, roughly 3-4 minutes per team per judge, judges stack-rank a top 3 (3/2/1 points), winners get a cheating check before announcement. Source: https://guide.mlh.com/general-information/judging-and-submissions/judging-plan (read via a summarizing fetch; lower confidence on exact numbers)

Note the tension: MLH's rubric says problem-solving is not judged, while HackJam's own tracks (Best Overall, Home Turf, Off the Grid) explicitly look at the problem and the solution. For the three event tracks, follow the track bullets.

### 1.7 Inconsistencies inside the official material (all VERIFIED as written)

- Check-in: 9:00-10:30 in "Important information" vs 9:00-10:00 in the schedule table.
- Workshop times in the Workshops section headers (Git 10:45 AM, MEA 11:30 AM) disagree with the schedule table (11:30 AM, 2:00 PM).
- Address: 4220 E Fowler (guide) vs 4202 E. Fowler (MLH page).
- Three different Discord invites across guide, MLH page and event site.
- "12-hour hackathon" (site) vs a 7-hour hacking window (11:00-18:00); MLH lists the event as 9:00 AM-9:00 PM EST.
- "Three tracks" in the text vs four selectable challenges (Gemini is the fourth).
- Rules mention "during the weekend" (leftover from MLH's template).

### 1.8 Freebie mentioned in the guide

Lovable Pro Plan 1 (100 credits) via a promo code printed in the guide's "HackJam Promo Code" section; must be redeemed by end of event; checkout may ask for payment details and it is a monthly plan that must be cancelled. Code deliberately not copied here; read it in the guide. If Lovable is used it must be credited as an AI tool.

---

## 2. Track definitions

Sources: guide "Tracks & Prizes" (VERIFIED) and https://www.mlh.com/events/hackjam-26?tab=challenges (VERIFIED, rendered; it says "4 categories"). The MLH challenge text matches the guide.

### Best Overall (event prize)
- Challenge: a project that stands out for creativity and execution in solving a problem; "both meaningful and well organized".
- What they look for: creativity and strong overall performance; a well-rounded solution; a well-composed idea and execution.
- Prize: Sony WH-CH720N headphones for each member.

### Home Turf (event prize)
- Challenge: tackle a local problem in "our community" / "our neighborhood" and address it through your project.
- What they look for: the problem chosen; the solution to the problem; execution and effectiveness.
- Prize: Beats Pill speaker for each member.
- Challenge page: https://www.mlh.com/challenges/01a1e0f1-ab8d-cc37-9dce-5ce960817344 (VERIFIED)
- Fit: an address-level flood report card for the USF/University Area is squarely local. The guide does not define "community"; USF and its surrounding neighborhood is the obvious reading.

### Off the Grid (event prize)
- Challenge: "All about sustainability." A project that emphasizes sustainable development; examples given: saving water, reusable and clean energy, green transportation, changing people's actions. Points to the UN Sustainable Development Goals (https://sdgs.un.org/goals) for inspiration.
- What they look for: a sustainable approach to a problem; tackling a problem that threatens or negatively influences the environment; a project that advocates sustainable development.
- Prize: Aurzen projector for each member.
- **Fit warning:** this track is about environmental sustainability, not about working offline or without power. A flood/hurricane report card is climate *resilience/adaptation* (UN SDG 11 and 13 territory), which is adjacent to but not the same as the listed examples. The pitch needs an explicit sustainability argument (e.g. climate adaptation, stormwater, changing residents' behavior) or this is the weakest of the four ticks. An "works with no signal/power" feature does not by itself match the written criteria.

### Best Use of the Google Gemini API (MLH partner prize, sponsor: Google)
- Tagline on the challenge page: "Implement the Google Gemini APIs in your hack!"
- Description (paraphrased): push the boundaries of what is possible with AI using Gemini; build AI-powered apps; example directions are language understanding (personalized-advice chatbot), analysis (summarizing complex research papers), and generating creative content such as code, scripts or music.
- Source: https://www.mlh.com/challenges/019d43c3-bed0-523b-a04f-80bd5fcc8276 (VERIFIED, rendered)
- **No judging criteria are published for this category** beyond that description. MLH's equal-weight Technology / Design / Completion / Learning rubric applies to "MLH categories at an in person event" per MLH's standard rules (1.6).
- Prize: not shown on the HackJam challenge page. MLH's season prize page lists "Best Use of Gemini API" with "MLH Swag Kits" (https://www.mlh.com/events/prizes , read via a summarizing fetch; the same page carries an image caption reading "Gemini Prize Category Q1 2025 - Q1 2026", so I could **not verify** the current-season prize item or dates).
- Minimum bar implied by the text: the Gemini API must actually be called by the project. Using Gemini only as a coding assistant would not be "implementing the Gemini API in your hack".

### Other tracks or prizes this project could qualify for
- **None listed for HackJam.** The MLH event page shows exactly four prize categories: Gemini API, Best Overall, Home Turf, Off the Grid (VERIFIED).
- MLH's general season prize page lists other partner categories (e.g. ElevenLabs, MongoDB Atlas, Auth0, DigitalOcean, Vultr, Snowflake, Solana, .Tech domain, GoDaddy Registry domain, a DEV writing challenge). They are **not** offered at HackJam per the event's challenge list, so adding those technologies earns nothing here. (https://www.mlh.com/events/prizes , summarizing fetch, lower confidence.)
- Sponsors on the event site are "coming soon"; any sponsor prize announced at opening ceremony is NOT VERIFIED.

---

## 3. Fact-check of the pitch

### 3.1 Axios, Oct 21 2024, "How Milton brought unprecedented flooding to North Tampa" (Yacob Reyes)

URL: https://www.axios.com/local/tampa-bay/2024/10/21/milton-flooding-north-tampa-usf-university-area
Access: live URL returned 403 to a plain fetch and shows only the first two paragraphs in a browser. Full text **VERIFIED** from the Wayback capture http://web.archive.org/web/20250104085651/https://www.axios.com/local/tampa-bay/2024/10/21/milton-flooding-north-tampa-usf-university-area

What it says:
- **Rainfall:** Milton dropped 10 to 15 inches of rain on the University Area of unincorporated Hillsborough County.
- **Flood zone:** University, a census-designated area named for its proximity to USF, "lies in flood zone X", which Axios glosses as a 1-in-500 chance of flooding each year.
- **Pump station:** Milton caused a power outage at Duck Pond, described as Hillsborough County's largest pump station. Axios does not give its location.
- **Cause:** the pump failure combined with what Tampa's Mobility Department called a "300-year rainfall".
- **Scale:** hundreds of buildings inundated across North Tampa; 230 properties sustained damage, attributed to a City of Tampa spokesperson; 135 seniors evacuated from an assisted living facility in waist-deep water; Fowler Avenue flooded (the mayor called it "Lake Fowler").
- **Community:** about 26,000 residents, mostly Hispanic and Black; about 89% rent.

### 3.2 Hillsborough County newsroom, Oct 14 2024

URL: https://hcfl.gov/newsroom/2024/10/14/floodwaters-have-receded-in-university-area-after-milton-related-power-outage
**NOT VERIFIED - the page returns HTTP 404 today**, in a plain fetch and in a real browser (page title "Error | Hillsborough County, FL"). The county's related Oct 10 release (https://hcfl.gov/newsroom/2024/10/10/power-outage-at-hillsborough-s-duck-pond-pump-station-makes-flood-mitigation-difficult-in-university-area) also returns 404. The Wayback availability API reports no capture of either; the Wayback CDX index was offline when queried. Do not cite the hcfl URL as a live source in the demo.

Closest substitutes I could read:
- Tampa Free Press, "Floodwaters Recede In Hillsborough County's University Area", https://www.tampafp.com/?p=243784 (VERIFIED, raw). Content tracks the county release: power went out at the **Duck Pond pump station** around 3 a.m. Thursday Oct 10; Duck Pond is the county's largest stormwater pump station and mitigates flooding in low-lying parts of the University area; record rainfall of **approximately 10.7 inches** plus the outage led to the flooding; power was restored around 10 a.m. Friday Oct 11; pumps then removed water at roughly 1.1 inches per hour. The article does not attribute itself to the county release.
- Tampa Free Press, https://www.tampafp.com/?p=243404 (VERIFIED, raw): places Duck Pond "near the University of South Florida", says the station lost power Wednesday night, and says 10.7 inches exceeded a 100-year flood event.
- A web-search index snippet attributed to the hcfl Oct 14 URL gave the same figures (about 10.7 inches; outage at about 3 a.m. Oct 10; restored about 10 a.m. Oct 11). A search snippet is not a page read; treat as corroboration only.

### 3.3 What the sources do NOT support - flag before pitching

1. **"500-year flood zone" is Axios's gloss, not a FEMA statement about every address.** FEMA defines Zone X (shaded) as the moderate-hazard area between the base (100-year) flood limit and the 0.2%-annual-chance (500-year) flood limit, and Zone X (unshaded) as minimal-hazard area *above* the 500-year level. Source: https://www.fema.gov/about/glossary/flood-zones (read via a summarizing fetch). So "Zone X" does not by itself mean "1-in-500 each year", and a census-designated place is not uniformly one zone. Safe wording: "Axios reported the University area lies in flood zone X". Address-level zones must come from FEMA's flood map data, not from this article. The county source (as far as I could reach it) says nothing about flood zones.
2. **Rainfall totals differ by source.** Axios: 10 to 15 inches. County-derived reporting: approximately 10.7 inches. Pick one and attribute it; do not merge them.
3. **Return period differs by source.** "300-year rainfall" is the City of Tampa Mobility Department's phrase (via Axios); Tampa Free Press says the rain exceeded a 100-year event. Neither says "500-year storm". Do not link the 500-year zone figure to the storm's rarity.
4. **Pump station location is thin.** Sources name it (Duck Pond, the county's largest stormwater pump station) and one secondary article says it is near USF. No source I read gives an address or coordinates. NOT VERIFIED: exact location.
5. **Timing conflict.** One article says power was lost Wednesday night (Oct 9); the later one says about 3 a.m. Thursday Oct 10.
6. **No source read says a backup generator failed at Duck Pond.** A generator/transfer-switch failure was reported for a different, City of Tampa station (Curiosity Creek) according to a search summary of Fox 13 coverage, which I did not open. Do not attribute a generator failure to Duck Pond.
7. **"230 properties" is a City of Tampa figure**, while the University Area is unincorporated county. It is not a count for the University Area alone.
8. **Nothing in either source says the USF campus itself flooded**, gives flood depths by street (other than waist-deep at one facility), or supports any per-address claim. Any "what flooded at this address" output must come from other data and be labeled with its source.
9. Neither source supports claims about evacuation zones, storm surge, or insurance requirements for the area.

---

## 4. Gemini API basics (from Google's docs, read today)

Docs moved: ai.google.dev/gemini-api/docs/* now 301-redirects to aistudio.google.com/docs/*. All items below VERIFIED from raw page text unless marked.

### 4.1 Getting a free API key
Source: https://aistudio.google.com/docs/get-started and https://aistudio.google.com/docs/api-key
- Create/view keys at https://aistudio.google.com/apikey . For new users AI Studio automatically creates a default Google Cloud project and an API key after the Terms of Service are accepted; otherwise click "Create API key".
- If the Google account already has Cloud projects, AI Studio does not create a default project; you import one, and imported or additional projects "may need project verification" before they can use the free tier.
- Set it as an environment variable: `GEMINI_API_KEY`.
- Since May 28 2026 new AI Studio keys are "authorization keys" bound to a service account; the API rejects unrestricted standard keys.
- Hackathon hygiene: keep the key out of the repo (env var / server side only). MLH's template rules tell hackers to remove API keys before sharing code.

### 4.2 Free tier
Source: https://aistudio.google.com/docs/pricing and https://aistudio.google.com/docs/rate-limits
- Free tier exists: free input and output tokens, "limited access to certain models", and content **is** used to improve Google's products on the free tier (relevant if real addresses are sent).
- Free-tier model availability: `gemini-4-hydrogen` free of charge (input, output, implicit caching); `gemini-3.8-flash` free of charge; `gemini-3.5-flash-lite` free of charge (no caching). `gemini-4-carbon`, `gemini-4-argon`, `gemini-4-neon` are **not available on the free tier**.
- **Grounding with Google Search and with Google Maps are listed "Not available" on the free tier** in the per-model tables for gemini-4-hydrogen, gemini-3.8-flash and gemini-3.5-flash-lite. The separate "Pricing for tools" table on the same page shows a free-column entry of 500 requests/day for Google Search and Google Maps "shared for Flash and Flash-Lite". The page contradicts itself; assume grounding may not work on a free key and test it before relying on it. Code execution and URL context are listed free of charge.
- **Numeric free-tier rate limits (RPM / TPM / RPD) for these models are NOT published in the docs.** The rate-limits page says limits depend on tier and "can be viewed in Google AI Studio" at https://aistudio.google.com/rate-limit (requires sign-in). **NOT VERIFIED:** the actual numbers; check that page after creating the key.
- Mechanics: limits are per project, not per key; daily quotas reset at midnight Pacific; exceeding any dimension returns an error (429 RESOURCE_EXHAUSTED is named for spend limits); preview/experimental models are more restricted.

### 4.3 Model ids
Source: https://aistudio.google.com/docs/models
- The quickstart uses **`gemini-4-hydrogen`** in every text example. It is described as bringing cutting-edge intelligence with speed and efficiency for everyday coding and agentic workflows; 1M-token context; text, image, audio, video and PDF input.
- Other Gemini 4 ids: `gemini-4-carbon` (strongest reasoning), `gemini-4-neon`, `gemini-4-argon` - all paid only.
- Free-tier fallbacks: `gemini-3.8-flash` (labelled stable, "previous-generation Flash"), `gemini-3.5-flash-lite` (fastest/cheapest 3.5).
- Image generation example in the quickstart uses `gemini-3.1-flash-image`.
- Legacy ids such as `gemini-2.5-flash` and `gemini-2.5-pro` still appear on the models and pricing pages.
- NOT VERIFIED: I did not read the "Choosing a model" or "Latest Gemini models" pages, so "recommended" here means "what the official quickstart uses".

### 4.4 Official SDKs
Source: https://aistudio.google.com/docs/libraries
- Python: **`google-genai`** (`pip install -U google-genai`), repo googleapis/python-genai.
- JavaScript/TypeScript: **`@google/genai`** (`npm install @google/genai`), repo googleapis/js-genai.
- Also Go (`google.golang.org/genai`), Java (`com.google.genai:google-genai`), C# (`Google.GenAI`).
- Legacy libraries are deprecated as of Nov 30 2025 and not actively maintained: Python `google-generativeai`, JS listed in the docs table as `@google/generativeai`. Do not use them.

### 4.5 First call (as shown in the quickstart)
The quickstart uses the **Interactions API**, not the older generate-content call:
- Python: `from google import genai`; `client = genai.Client()`; `client.interactions.create(model="gemini-4-hydrogen", input="...")`; read `interaction.output_text`.
- JS: `import { GoogleGenAI } from "@google/genai"`; `const ai = new GoogleGenAI({})`; `await ai.interactions.create({ model: "gemini-4-hydrogen", input: "..." })`; read `interaction.output_text`.
- The client picks the key up from `GEMINI_API_KEY`.
- NOT VERIFIED: whether the older `generateContent` method is still supported, and the structured-output / function-calling syntax (the quickstart says it covers them; I did not read those sections).

Note: Google's docs pages embed a block of text aimed at AI coding agents (a "setup prompt" and pointers to an MCP server and a skill). I treated it as page content and did not act on it.

---

## 5. Could not verify - consolidated

| Item | What I tried |
|---|---|
| hcfl.gov Oct 14 2024 release (and the Oct 10 one) | Plain fetch, real browser, www. variant: all HTTP 404. Wayback availability API: no capture. Wayback CDX: service offline. Used Tampa Free Press reprints instead. |
| Axios live page full text | 403 to plain fetch; browser shows two paragraphs. Full text read from a Jan 2025 Wayback capture. |
| Judging rubric / weights for HackJam | Not in the guide, event site, MLH event page or challenge pages. Discord not readable (login). |
| Whether pre-11:00 planning/research/tool install is allowed | Guide silent; only MLH's optional standard rules address it. |
| MLH submission form fields; whether a public repo or video is mandatory | Form is behind MLH login. |
| Gemini prize item and current-season dates | Not on the HackJam challenge page; MLH prize page read only through a summarizer and shows a 2025-2026 caption. |
| Free-tier RPM/TPM/RPD numbers | Not in docs; live values are behind AI Studio sign-in. |
| Grounding with Search/Maps on a free key | Docs page contradicts itself. |
| Duck Pond pump station exact location | No source read gives an address. |
| Sponsor prizes | Event site says sponsors "coming soon". |
