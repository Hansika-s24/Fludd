# Hacker doc: Harshith (the interface, plus lead)

Fludd, HackJam '26, 2026-11-21. Hacking 11:00 to 18:00 EST. Lunch 13:00 to 14:00. Submit by 18:00. Judging 18:20.

This is your working document and the working document of your Claude session. The whole-project document is `PLAN.md`. Your teammate's document is `HACKER-HANSIKA.md`. After 11:00 all three live in the repo under `prep/`.

This document holds no implementation code on purpose. It holds ownership, times, prompts and a checklist.

---

## 1. What you own

**Default split: logic versus presentation.** Hansika owns all logic, data and backend (about 60%). You own the interface and the lead duties (about 40%).

| Yours | From PLAN.md section 7 | Folders |
|---|---|---|
| Map and design | Lane D, all of it | `web/app/` pages and layouts (not `web/app/api/`), `web/components/map/`, `web/components/ui/`, global styles |
| Report card interface | Lane E: search box, card, guidance cards, validation panel, all states | `web/components/report-card/`, `web/components/guidance/` |
| Report and admin screens | Lane F: photo flow screens, admin queue and inspector, calibration chart, the Apple Shortcut | `web/app/admin/`, `web/components/report/`, `web/components/admin/` |
| Lead | Lane G | Root files (`README.md`, `.env.example`, `.gitignore`), `docs/`, `.github/`, `.claude/`, `prep/` (except Hansika's hacker doc), `web/tests/smoke/`, `web/tests/components/`, deploy, domain, submission |

**Do not touch (Hansika's):** `pipeline/`, `supabase/`, `web/lib/` (routing, grade, data, gemini, supabase, `config.ts`), `web/app/api/`, `web/public/data/`, the rest of `web/tests/`, and `prep/HACKER-HANSIKA.md`.

**The boundary.** Your components call functions exported from `web/lib/` and fetch the routes under `web/app/api/`. Nothing else crosses. Hansika never edits a component. You never edit `web/lib/` or a route. The list of what you may call is in `docs/contracts.md` under "What the interface can call" (PLAN.md section 5).

**One exception, once.** As part of the 11:00 scaffold your session writes, inside Hansika's folders: stub versions of every function in "What the interface can call" (in `web/lib/`), placeholder routes that return fixed example answers (in `web/app/api/`), and the toy fixture. When you say "scaffold pushed" (target 11:20) those folders are Hansika's and you do not touch them again. You build against the stubs and the fixture until the real ones land.

**Shared files, handled by rule**

| File | Rule |
|---|---|
| `web/package.json` and lock file | The scaffold installs every package the stack names, for both sides. After that, either of you may add one: say it out loud, pull, add it, commit only those two files, push at once |
| `.env.example` | Yours. Hansika's Claude writes new key names under "Notes for my teammate"; you add them and set the values in Vercel |
| `docs/contracts.md` and the toy fixture | Yours to write. After 11:20 they change only when both of you agree, announced out loud |

**How to swap.** Say it out loud. A piece moves whole, with all its folders. Each of you adds one line under "Notes for my teammate", and the unticked checklist items are copied into the new owner's doc. Likely swaps: the grade rules to you if Hansika's data lane runs late; the photo flow screens to Hansika if the interface runs late.

**What you must be able to explain to judges:** the interface, and the product decisions (what was cut, why the grade means what it means, the wording rules). Hansika explains the depth model and the routing engine.

### Two-person git rules

1. One repo, both on `main`. No branches, no pull requests, no force push.
2. Strict folder ownership. Never edit the other person's folders, even for a one-line fix. Write the problem under "Notes for my teammate" and say it out loud.
3. Pull with rebase before every push. Small commits. Each commit works on its own.
4. Stage by folder. Never `git add -A` or `git add .`.
5. Contract changes only by agreement, announced out loud, then written by you.
6. Your Claude edits only `prep/HACKER-HARSHITH.md`. Hansika's Claude edits only `prep/HACKER-HANSIKA.md`. The two docs never conflict.
7. Each of you commits under your own GitHub account, so the history shows two authors.
8. If a rebase reports a conflict: stop, do not resolve it by guessing, tell your teammate.

One-time setup in the repo (tooling commands, run after 11:00):

```text
git config pull.rebase true
git config rebase.autoStash true
```

Then every push is `git pull` followed by `git push`.

---

## 2. Before 11:00

No code, no scaffold, no data downloads, no design assets. Accounts and tools only.

- [ ] Check in 9:00 to 10:00 at ENB 109 (photo ID, laptop, charger). Opening ceremony 10:00, CMC 141. Hansika must check in too; nobody can submit otherwise.
- [ ] Ask an organizer: "Is pre-event research and planning allowed, as long as no code, design assets or data were prepared? May the planning notes sit in the repo?" Follow the ruling. Write the answer in section 5 under "Notes".
- [ ] Ask an organizer how a teammate is added to one MLH submission on OrganizerHQ.
- [ ] Send Hansika `HACKER-HANSIKA.md` and `PLAN.md` by any private channel. The research files and the skills kit stay on this PC until you commit them at 11:00.
- [ ] Collect Hansika's GitHub username and the email they use for Vercel.
- [ ] Create your Gemini API key at aistudio.google.com/apikey (it goes into Vercel later). Read your free-tier limits at aistudio.google.com/rate-limit. Paste the key nowhere yet.
- [ ] Sign in to GitHub and Vercel in the browser. Do not create the repo or any project yet.
- [ ] Tools answer on this PC: `git --version`, `node --version`, `gh auth status`, `claude --version`.
- [ ] Decide the repo folder. Your home folder `C:\Users\hanst` is itself a git repo, so after `git init` at 11:00 check that `git rev-parse --show-toplevel` prints the new folder and not your home folder.
- [ ] iPhone charged, Shortcuts app present, Action Button free to assign.
- [ ] Do not carry anything from `ui-preview.html` or `..\visuals\` into the repo. They were made before 11:00.

---

## 3. Your timeline

Same gates and cut lines as PLAN.md section 8, filtered to you.

| Time | Gate | Your part | You hand to Hansika | If not met |
|---|---|---|---|---|
| **11:00 to 11:15** | **Agree the contracts together, before either session starts a lane** | Sit with Hansika. Agenda below. Meanwhile your Claude creates the repo and pushes tooling and `prep/` | Repo invite and URL by 11:05 | Do not start lanes on an unagreed contract. Cut the talk short only by deciding, never by skipping an item |
| 11:05 | Contracts copied in | `docs/contracts.md` from PLAN.md section 5, including "What the interface can call" | | |
| 11:10 | Toy fixture and stubs | Fixture in the gold formats. Stubs in `web/lib/`. Placeholder routes in `web/app/api/` | | |
| 11:20 | Scaffold pushed | Say "scaffold pushed" out loud | `web/lib/`, `web/app/api/`, the fixture. Yours no longer | |
| 11:25 | Empty shell live on Vercel. Launch lanes | Design direction, then lane D. Buy `fludd.app` and attach it | Live URL, written in `docs/contracts.md` | |
| 12:00 | Map draws water from the toy fixture | D1 to D3 | | Simplify the water layer to a flat colour ramp; keep the gate |
| 13:00 | **Vertical slice on real data:** type an address, see a grade and water | Search box and card wired to the real functions. Run the integration prompt | The list of stubs still in use | Stay on stubs for whatever is late; say which in the checkpoint |
| 13:00 to 14:00 | Lunch | Agents keep working. Review when back; look at the site yourself | | |
| 14:30 | Timeline, pump toggle and guidance cards on real data. Milton validation computed | D4, guidance cards, validation panel reading `validation.json` | | Show the Milton points as an evidence layer and state that validation is not done |
| 15:00 | **Feature decision.** Photo to Gemini to queue works end to end | Photo flow and admin queue screens against the real routes. Decide together in two minutes | | Cut to seeded reports. Stop new report and admin screens. If you disagree, the PLAN cut line wins |
| 16:00 | Submission workshop (ENB 116). Polish pass: states, phone layout, copy | You go; leave once any added requirements are clear. Build the Shortcut once the reports route works | | Shortcut is cut with the photo report |
| 16:30 | **Feature freeze.** Fixes only | | | |
| 17:00 | README final. Two timed rehearsals. Deploy checked on a phone | README, method page, demo script. Ask Hansika for their AI-use paragraph, test counts and validation numbers | | |
| 17:30 | Submit on OrganizerHQ, all four challenges ticked | You submit with the MLH account you registered with. Hansika on the team | | |
| 17:50 | Last push. Stop | | | |
| 18:00 | Submissions close. No commits after this | | | |
| 18:20 | Judging, in person | Hook, why, storm playback, residents and Shortcut, close (PLAN.md section 13) | | |

### Contracts talk agenda (11:00 to 11:15, answers go into `docs/contracts.md`)

1. Read "What the interface can call" row by row. For each: what it takes, what it gives back, what it gives back when it has no answer.
2. Scenario names exactly as they appear in the manifest and in `levels/`: four storm sizes, the Milton replay, pump on and pump off. Names of the low and high variants.
3. Hours: how many a scenario has and what clock time hour zero is, so "before about 9 pm" can be printed.
4. "Depth at a building": how many cells wide the ring is. The Milton cap: how many metres counts as "nearby".
5. The grade answer: letter, range, low-confidence flag, reasons, depth band per storm, the two "official map says / we found" facts, the paired action. What the card shows before the low and high variants exist.
6. The error shape every route returns, and the fields of the plain form upload the Shortcut posts.
7. The data-folder switch: the one setting that points the app at the toy fixture or at real data.
8. How Hansika tells you a stub has been replaced: a line under "Notes for my teammate" and a word out loud.

---

## 4. Prompts for Claude

Paste as written. Start Claude Code from the repo root so `.claude/skills/` loads.

### 4.1 Kickoff prompt (paste once the repo exists)

> You are working with Harshith on Fludd at HackJam '26. Hacking ends at 18:00 EST today and nothing may be pushed after 17:50.
>
> Read these in full before doing anything: `prep/HACKER-HARSHITH.md` (this is our working document), `prep/PLAN.md`, and `docs/contracts.md` if it exists yet. Read `prep/05-design-skills.md` before any interface work, and `prep/04-depth-model-and-routing.md` sections 3 and 5.3 for thresholds, card wording and the safety footer.
>
> You may edit only: `web/app/` pages and layouts (never `web/app/api/`), `web/components/`, global styles, `web/tests/smoke/`, `web/tests/components/`, root files, `docs/`, `.github/`, `.claude/` and `prep/HACKER-HARSHITH.md`. My teammate Hansika owns `pipeline/`, `supabase/`, `web/lib/`, `web/app/api/`, `web/public/data/`, the rest of `web/tests/` and `prep/HACKER-HANSIKA.md`. Never edit those. The single exception is the 11:00 scaffold, which I will paste separately. If something on their side is wrong, append the exact problem to "Notes for my teammate" in my hacker doc and tell me.
>
> The interface gets everything through the functions and routes listed under "What the interface can call" in `docs/contracts.md`. Components never read data files or environment settings directly and never contain model, grade or routing logic. Build against the toy fixture and the stubs first.
>
> Working rules. Write each test before the code it checks. Make small conventional commits, one logical change each, with no AI attribution of any kind in the commit message. Stage by folder, never everything. Pull with rebase before every push; if the rebase conflicts, stop and tell me. Never change a contract without stopping to ask me. Run things and look at the result in a browser before you say they work.
>
> When I paste a lane prompt you may run it as a background sub-agent limited to that lane's folders. Check its work yourself; do not trust its report. Only you edit my hacker doc.
>
> Keep the progress checklist in section 5 of my hacker doc current: tick each item as it lands and add a short note after it (commit id, what was cut). Commit the tick with the step.
>
> Now start with the first unticked item in that checklist.

### 4.2 Scaffold and contracts prompt (11:00)

> It is 11:00. Set up the repo in this order and push after each numbered step, because Hansika is waiting to clone.
>
> 1. Confirm this folder is its own git repository and not part of the repository at my home folder. Create a public GitHub repo named `fludd` and push a first small commit. Tell me the URL so I can add Hansika as a collaborator.
> 2. Tooling. Copy the `.claude` folder from `C:\Users\hanst\claude skills\hackathon-kit\.claude` into the repo root, keeping `settings.json` and all nine agents, but leave out these skill folders: every `threejs-*` folder, `hyperframes`, `hyperframes-cli`, `hyperframes-registry`, `media-use`, `frontend-slides`, `investor-materials`, `market-research`, `mcp-builder`, `mcp-server-patterns`, `ui-demo`, `grill-me`, `grilling`, `orch-build-mvp`, `orch-pipeline`, `maplibre-terrain-rendering`, `motion-advanced`. That leaves 36 skills. Keep each skill's licence file. Commit as tooling.
> 3. Planning notes. Copy into `prep/` in the repo: `PLAN.md`, `HACKER-HARSHITH.md`, `HACKER-HANSIKA.md` and the five research files numbered 01 to 05 from `C:\Users\hanst\claude skills\hackathon-kit\prep\`. Do not copy `ui-preview.html`, `00-source-plan.txt` or anything from the `visuals` folder. Commit as documentation. If I have told you the organizer wants planning notes kept out of the repo, add `prep/` to `.gitignore` instead and tell me, so I can send the files to Hansika another way.
> 4. Set the two git settings from section 1 of my hacker doc.
> 5. Copy PLAN.md section 5 into `docs/contracts.md`, including the table "What the interface can call". Add a header block for the live URL, the toy fixture's path and the data-folder switch. Hansika and I are agreeing the details right now; I will dictate the answers. Mark any open line "to be agreed" and remind me if one is still open at 11:20.
> 6. Scaffold the layout in PLAN.md section 4 with the stack in section 3: the Next.js app in `web/` as an empty shell, root files, `.env.example` listing every key the plan implies with its purpose and whether it is required (Gemini key, Gemini model and fallback, provider choice, Supabase URL and keys, the data-folder switch), and the CI workflow (lint, typecheck, tests, secret scan). Install every package the stack table names, for both sides, so neither of us has to add packages later. Do not create `pipeline/` or `supabase/`; Hansika's session creates those. CI must pass before `pipeline/` exists and run its tests once it does.
> 7. Toy fixture, as PLAN.md section 5 describes: two bowls, one spill point, one pump, a dozen road segments, in exactly the gold file formats. Write its path into `docs/contracts.md`.
> 8. Stubs. For every row of "What the interface can call", write a stub in `web/lib/` with the agreed name, inputs and outputs that returns a fixed, plausible answer taken from the toy fixture. For every server route, write a placeholder under `web/app/api/` that returns a fixed example answer in the contract shape. Mark each one clearly as a stub so Hansika can find and replace them.
> 9. Push. Say "scaffold pushed". From this moment `web/lib/`, `web/app/api/` and the fixture belong to Hansika and you never edit them again.
> 10. Deploy the empty shell to Vercel with `web` as the root directory, using the `deploy-to-vercel` skill. Write the live URL into `docs/contracts.md` and tell me, so I can attach `fludd.app`.
>
> Tick the G1 items in my hacker doc as you go.

### 4.3 Design direction prompt (before any screen)

> Set the design direction before building any screen. Read PLAN.md section 9 in full; it is the brief. Then load the `apple-design` skill for the principles and the motion rules, `mobile-native` for the Home Screen app, and `frontend-design` and `ui-ux-pro-max` for the map layout. `liquid-glass-design` targets SwiftUI: take its ideas about materials, not its code.
>
> Produce the design tokens in the global styles, light mode first: the platform font and the type scale, one tint (system blue) for every action and the route, the three meaning colours (red too late, orange warning, green safe), the water's own blue ramp, one thick translucent material for the sidebar and sheet, one small glass style for map controls, spacing, corner radii, and the spring (damping 0.8, response 0.3).
>
> Hold these rules from section 9: the map is the content; one structural surface (a sidebar on desktop, a bottom sheet on iPhone); never a translucent surface on top of another; lists, not tiles; real controls (switch, segmented control, slider); water is the one showpiece and everything else stays still. Avoid by name: stacks of floating glass cards, gradient buttons, pills on everything, metric tiles, decorative rings, more than one accent colour.
>
> Do not open or copy `ui-preview.html`; it was made before the event. Restyle shadcn components to these rules; do not leave defaults. Show me the tokens and one screen (the map with the sidebar holding search and an empty card) at desktop and iPhone width before building anything else.

### 4.4 Lane D prompt: map, water and timeline

> Build lane D. Edit only `web/app/` pages and layouts, `web/components/map/`, `web/components/ui/` and the global styles. Use `mapcn`, `maplibre-cartography`, `maplibre-source-wiring`, `maplibre-tile-sources` and `maplibre-v6-migration` for the map, `shadcn` for components, `animate` and `review-animations` for motion.
>
> Steps, in order, one commit each:
> 1. Design direction as tokens (the design direction prompt covers this).
> 2. App shell and the map with the OpenFreeMap "liberty" basemap. Deploy.
> 3. Water layer reading the toy fixture through the "load the gold files" function: depth is the bowl's water level minus ground height, per pixel. Depth colour ramp, moving surface, soft shoreline. Then the real files, with no change to the component.
> 4. Timeline with play, drag and event flags; storm selector; pump switch. The water eases to its new level when the switch flips.
> 5. Markers: address pin, dry parking, pump station (labelled "approximate"), fire stations, resident reports.
> 6. iPhone layout (the iPhone prompt covers this).
> 7. Loading, empty and error states for every panel. Reduced-motion and reduced-transparency variants.
>
> Accept each step by looking at it in a browser at desktop and iPhone width. The 12:00 gate is step 3 on the fixture.

### 4.5 iPhone prompt: Home Screen app and bottom sheet

> Build the iPhone layout, lane D step 6. Use `apple-design` for the sheet physics and `mobile-native` for the Home Screen app.
>
> One bottom sheet over the map with three resting heights. It tracks the finger one to one, hands off its velocity on release, projects where the flick is going and snaps there with the spring from the tokens. It can be grabbed mid-flight and rubber-bands at the ends. Feedback on press, not release.
>
> The site installs to the Home Screen and opens full screen with no browser chrome. Content clears the status bar and the home indicator using safe areas. Touch targets are at least 44 points. Nothing depends on hover. Text scales with the user's setting. With reduced motion the water freezes and the sheet cross-fades; with reduced transparency the materials turn solid.
>
> Accept by installing the live site on my iPhone and checking each of those sentences on the device. Tell me which ones you could only check in a desktop browser.

### 4.6 Report card and guidance prompt (lane E interface)

> Build the interface half of lane E. Edit only `web/components/report-card/` and `web/components/guidance/` and the page that holds them. Use `better-typography` for the card. All numbers and wording inputs come from the functions in "What the interface can call"; the components hold no grade or routing logic.
>
> Steps, in order, one commit each:
> 1. Address search box using the "find an address" function. An address outside the area shows "outside validated area" and never a grade.
> 2. Card: the grade and its range, "low confidence" when the function says so, the reasons as a grouped list (base rule, notches, caps), the "official map says / we found" pair, depth by storm size in bands, and the action paired with any low grade.
> 3. Guidance: three rows, each a small coloured icon, a label and a value: "Move your car by", "Rescue can reach you until", and roads to avoid. The value turns red once the moment has passed on the timeline. Times read like "before about 9 pm".
> 4. Validation panel reading the validation figures: the hit rate on the Milton points, the false-alarm area and the FEMA comparison, shown as given, never rounded up. If the figures are missing, show the Milton points as evidence and say validation is not done.
> 5. The fixed safety footnote on every card, wording from `prep/04-depth-model-and-routing.md` section 5.3. Loading, empty and error states.
>
> Copy rules: sentence case, plain verbs, no exclamation marks. The app never says a flooded road is safe to drive.

### 4.7 Photo report and admin screens prompt (lane F interface)

> Build the interface half of lane F. Edit only `web/components/report/`, `web/components/admin/` and `web/app/admin/`. Everything goes through the server routes and functions in `docs/contracts.md`; while they are placeholders, build against the placeholder answers.
>
> Steps, in order, one commit each:
> 1. Photo flow: capture or upload a photo, ask for location, fall back to a dropped pin on the map, show the notice that the photo is sent to Gemini, submit, show the reading or "reading unavailable, sent for manual review".
> 2. Admin page behind sign-in: a queue with photo, position, AI reading and model depth; an inspector with approve, edit depth and reject; a segmented control for status.
> 3. Approved reports appear on the map as they arrive, at their public street-level position.
> 4. Calibration chart of model depth against confirmed depth, with the running error figure. If time is short, the single error number only.
>
> The 15:00 gate is steps 1 and 2 working end to end against Hansika's real routes on the live site. If they are not, stop these screens and show seeded reports, labelled as seeded.

### 4.8 Apple Shortcut prompt ("Report flooding")

> Help me build the "Report flooding" Apple Shortcut on my iPhone. Start only after Hansika says the reports route accepts a plain form upload on the live site.
>
> Read the reports route and the form upload fields in `docs/contracts.md`, and the live URL at the top of that file. Then write `docs/shortcut.md`: a numbered, tap-by-tap list I can follow in the Shortcuts app, with the exact action names and every field value written out. The Shortcut is named "Report flooding" and does four things in order: Take Photo (one photo, back camera); Get Current Location; Get Contents of URL, renamed "Send to Fludd", a POST to the reports route with a form body holding the photo, the latitude, the longitude and the time; Show Result, showing the depth reading from the answer in one plain sentence, or "sent for manual review" if there is none.
>
> Then list how to add it to the Home Screen, assign it to the Action Button and run it by voice, and how to copy its share link. First send one test upload to the live route yourself and show me the answer, so we know the route works before I touch the phone. I will paste the share link back to you for the README.

### 4.9 Lane G prompt: lead

> You hold lane G alongside the interface. Use `superpowers:verification-before-completion` for every claim, `gstack-qa` for browser checks and the `e2e-testing` skill for the smoke test.
>
> 1. Repo, scaffold, contracts, toy fixture, stubs, CI, first deploy (the 11:00 prompt covers this).
> 2. At every gate, check the live site yourself in a browser against the gate's wording.
> 3. At 13:00 integrate (the integration prompt covers this). Write one Playwright smoke test in `web/tests/smoke/`: address to grade to timeline, green on the deployed site.
> 4. Write `README.md`, `docs/method.md` and `docs/demo-script.md`, then prepare the submission (the 17:00 prompt covers this).
>
> Keep CI green. If CI fails because of a file in Hansika's folders, do not fix it: append the failing check and its output to "Notes for my teammate" and tell me.

### 4.10 Integration prompt (13:00)

> It is 13:00, the vertical-slice gate. Pull first and read "Notes for my teammate" in `prep/HACKER-HANSIKA.md`.
>
> 1. List every function in "What the interface can call" and every route, and say for each whether it is still a stub or is now real. Do this by reading the files, not by trusting the notes.
> 2. Confirm real gold files are in `web/public/data/` and tell me the setting that switches the app to them, so I can set it in Vercel.
> 3. On the deployed site, in a real browser with `gstack-qa` in report-only mode: type an address, see a grade, see water on the map. Then the same at iPhone width.
> 4. Run the smoke test against the deployed site.
>
> Report three lists: passes (with what you ran), fails (with the output), cut. For anything that fails on Hansika's side, append the exact steps and output to "Notes for my teammate" in my hacker doc and do not edit their folders. For anything that fails on my side, fix it after I answer.

### 4.11 Checkpoint prompts

**11:25**

> Checkpoint 11:25. Confirm by checking, not by memory: the repo is public, CI ran on the last push, the empty shell answers at the live URL, `docs/contracts.md` has no line still marked "to be agreed", every row of "What the interface can call" has a stub, every route has a placeholder, and the toy fixture is committed. Report three lists: passes (with what you ran), fails (with the output), cut. Tick the checklist. Do not fix anything until I answer.

**12:00**

> Checkpoint 12:00. Gate on my side: the map draws water from the toy fixture. Open the live site and check it at desktop and iPhone width. Pull and tell me, from Hansika's notes and commits only, whether raw data is downloaded and shortest path passes its tests. Report three lists: passes (with what you ran), fails (with the output), cut. Tick the checklist. Do not fix anything until I answer.

**13:00**

> Checkpoint 13:00. Run the integration prompt in section 4.10 of my hacker doc and report as it says. State plainly which parts of the slice run on real functions and which still run on stubs.

**14:30**

> Checkpoint 14:30. Gate: timeline, pump switch and guidance cards on real data; Milton validation shown. On the live site, play the Milton replay, flip the pump switch, and read the three guidance values for one address. Check the validation panel against `validation.json`. If validation is missing, confirm the panel shows the evidence layer and says validation is not done. Report three lists: passes (with what you ran), fails (with the output), cut. Tick the checklist. Do not fix anything until I answer.

**15:00**

> Checkpoint 15:00, the feature decision. On the live site, submit one photo report, read the Gemini result, sign in as admin, approve it, and see it on the map. Tell me exactly which step breaks, if any, and on whose side. If I say it was cut, switch to seeded reports labelled as seeded, stop work on report and admin screens, and record the cut for the README. Then report three lists: passes (with what you ran), fails (with the output), cut.

**16:00**

> Checkpoint 16:00, polish pass. Run an `impeccable` critique, `review-animations` and a `gstack-qa` pass on the live site at desktop and iPhone width. List findings most serious first, against PLAN.md section 9. Fix only what is in my folders, starting with loading, empty and error states, the phone layout and copy. Anything on Hansika's side goes into "Notes for my teammate". List what must still land before the 16:30 freeze.

**16:30**

> Checkpoint 16:30, feature freeze. From now on, fixes only. Run my tests and the smoke test on the deployed site. List anything unfinished and mark it as cut in the checklist; do not start it. Report three lists: passes (with what you ran), fails (with the output), cut.

**17:50**

> It is 17:50. Pull, confirm the working tree is clean, CI is green on the last commit and the live site loads on my iPhone. Push once if anything is waiting. After that, make no commits and no pushes for any reason. Tell me the id of the final commit.

### 4.12 README and submission prompt (17:00)

> It is 17:00. Write the final `README.md`, `docs/method.md` and `docs/demo-script.md` for Fludd. Use PLAN.md section 12 for the README sections in order, section 1 for the tagline and the pitch corrections, section 3 for the tradeoffs table, section 6 for the limits, and section 13 for the demo script with each part assigned as that section says.
>
> Rules. Every number comes from a file or a command run today: test counts from the test runners, validation figures from `validation.json`, routing times from the benchmark. Hansika's notes hold the counts for their side; use them as written and say where each came from. If a number does not exist, say the thing is not done. List every framework and library. In "How AI was used", be specific and truthful: the tools (Claude Code for planning, research and code generation; Gemini inside the product); what the two of us designed and decided; which folders AI generated, named, with who directed each; and what existed before 11:00 (research and planning notes, the shared Claude Code skills in `.claude/`, no code, no assets, no data), plus what the organizer told us. Use Hansika's AI-use paragraph from their "Notes for my teammate" as written. Include the Shortcut share link. State every cut from both checklists.
>
> Then give me the submission checklist from PLAN.md section 12 as a tick list, and the AI-use statement as plain text for the MLH form. Do not push after 17:50.

### 4.13 Resume prompt

> This session was restarted. Read `prep/HACKER-HARSHITH.md` in full, then `docs/contracts.md`, then the last 30 entries of the git log and the working tree status. Tell me in five lines where things stand: the last ticked item, the first unticked item, anything half-done in the working tree, the next gate and how many minutes away it is. Then continue with the first unticked item under the same rules as the kickoff prompt in section 4.1.

### 4.14 Handoff prompt (sync with Hansika)

> Sync with my teammate. Pull with rebase. Then report: which commits came from Hansika since my last pull and which folders they touched; whether `docs/contracts.md` changed and how; anything new under "Notes for my teammate" in `prep/HACKER-HANSIKA.md`; which stubs and placeholder routes have become real since last time; and whether any of it changes what my components should call or show. If one of their commits touched a folder I own, show me the change and do not revert it. Then append to "Notes for my teammate" in my own hacker doc anything from my side they need: a function whose answer does not match the contract, a missing field, new keys added to `.env.example`, the live URL. Push.

### 4.15 Unstick prompt (failing for more than 15 minutes)

> We have been stuck on the same failure for more than 15 minutes. Stop trying variations. State in three lines: what fails, the exact output, and what you have already tried. Then find the fallback for this item in PLAN.md (section 2 cut lines, section 8 "if not met", section 14 risks) and in section 6 of my hacker doc. Recommend one of: take the named fallback, cut the item, or one more specific attempt with a five-minute limit. Wait for my answer. If we cut, record it in the checklist, and in "Notes for my teammate" if it affects Hansika.

---

## 5. Progress checklist

Claude ticks these and adds a note after each (commit id, what was cut).

**Lead, 11:00**
- [ ] G1a Contracts talk held with Hansika (11:00 to 11:15); eight answers written into `docs/contracts.md`
- [ ] G1b Repo `fludd` created after 11:00, public, own git root confirmed
- [ ] G1c Hansika added as collaborator; URL sent
- [ ] G1d `.claude/` tooling committed (36 skills, 9 agents)
- [ ] G1e `prep/` committed: PLAN, both hacker docs, research 01 to 05 (or kept local by organizer ruling)
- [x] G1f `docs/contracts.md` written, with "What the interface can call". Done 11:55 with exact names; items 1 to 4 marked "to be agreed"
- [x] G1g Scaffold with all packages installed; CI green. Green from `42d1c94` (web, pipeline, gitleaks)
- [x] G1h Toy fixture committed; path in `docs/contracts.md`. `web/public/data/toy/`, 6 contract tests
- [x] G1i Stubs in `web/lib/` and placeholder routes in `web/app/api/`. All rows incl. real-estate extras (`findBetterOptions`, `/api/gemini/remedies`)
- [ ] G1j "Scaffold pushed" said; those folders handed to Hansika
- [ ] G1k Empty shell live on Vercel; live URL in `docs/contracts.md`
- [ ] G1l `fludd.app` bought and attached to Vercel (before noon)
- [ ] G1m Checked that Vercel builds Hansika's first push; if not, I redeploy
- [ ] G1n Vercel keys set: my Gemini key, Supabase URL and keys from Hansika

**Lane D: map and design**
- [x] D1 Design direction as tokens; one screen shown at two widths. Tokens in `web/app/globals.css`; map + sidebar/sheet checked at 1440 and 393 wide. MapLibre worker is copied to `public/` by predev/prebuild (bundler breaks its relative URL). Basemap is busy (bus stops, POIs): quiet it in D2
- [x] D2 App shell and basemap; deployed. Basemap quieted (POI and transit hidden). Deploy pending: Vercel is not Git-connected and needs `NEXT_PUBLIC_DATA_SET=real`
- [x] D3 Water layer on the toy fixture (12:00), then on real files. Real data at 12:38 (`e657c8f`). CPU canvas pass per hour; WebGL surface still to do
- [ ] D4 Timeline, storm selector, pump switch
- [ ] D5 Markers
- [ ] D6 iPhone: bottom sheet, Home Screen app, safe areas; checked on the device
- [ ] D7 Loading, empty, error states; reduced motion and reduced transparency

**Lane E: interface half**
- [x] E3 Address search box; "outside validated area". County locator suggestions, keyboard and Enter; "Outside the validated area" card (`6418faf`)
- [ ] E4 Card: grade, range, reasons, "official map says / we found", depth by storm
- [ ] E4a Validation panel
- [ ] E5 Guidance cards on real routing results; fixed safety footnote

**Lane F: interface half**
- [ ] F2 Photo flow screens
- [ ] F4 Admin queue and inspector screens behind sign-in
- [ ] F5 Approved reports appear live on the map
- [ ] F6 Calibration chart, or the single error number
- [ ] F8 "Report flooding" Shortcut built; Home Screen, Action Button; share link saved

**Lead, rest of day**
- [ ] G2 Gates checked on the live site at 12:00, 13:00, 14:30, 15:00, 16:30
- [ ] G3a 13:00 integration done; real-data switch set in Vercel
- [ ] G3b Smoke test green on the deployed site
- [ ] G3c Critique pass done (16:00)
- [ ] G4a README final, with both AI-use statements and every cut
- [ ] G4b `docs/method.md` and `docs/demo-script.md`
- [ ] G4c I can explain the interface and each product decision without notes
- [ ] G4d Two timed rehearsals with Hansika
- [ ] G4e Submitted on OrganizerHQ, four challenges ticked, Hansika on the team (17:30)
- [ ] G4f Last push by 17:50

### Notes

- Organizer's answer on pre-event planning:
- Organizer's answer on adding a teammate to the submission:

### Notes for my teammate

Claude appends here, newest last, whenever something on this side affects Hansika. Format: time, what changed, what they need to do.

- 12:30 For Hansika: `manifest.json` has `hourZeroByScenario` but `Manifest` in `web/lib/types.ts` does not, so the interface cannot read Milton's clock type-safely. Please add `hourZeroByScenario: Record<Scenario, string>` (and to `validateManifest`). Also: `ground.png` is 6.9 MB; fine on Wi-Fi, slow on a phone over cellular. If time allows, a downsampled copy for the water layer.
- 12:30 CI was red on every push since 11:50 (`RouteContext`/`LayoutProps` missing in CI). Fixed in `42d1c94`: `npm run typecheck` now runs `next typegen` first.

- 14:20 For Hansika: while you were out of usage I finished `app/api/weather` (NWS proxy, tests in `web/tests/routes/`) and `app/api/health` (manifest version), and added `outputFileTracingIncludes` for `/api/reports` and `/api/health` in `web/next.config.ts`. Your F0 and F9 can be ticked once you've looked.

---

## 6. If things go wrong

Rows from PLAN.md section 14 that touch your side, with the fallbacks.

| Risk | Sign | Response |
|---|---|---|
| Gemini rate limit or outage | 429 errors | The screen shows "reading unavailable, sent for manual review". Keep a clearly labelled recorded example for the demo |
| Supabase setup eats time | Not working by 14:00 | Cut to seeded reports at 15:00 |
| Venue Wi-Fi fails | | Everything except Gemini and Supabase runs from static files. Keep a local build ready on this PC |
| Two agents edit the same file | Merge conflicts | Folder ownership. Contracts change only by agreement, written by you |
| Overclaiming to judges | | Pitch corrections in PLAN.md section 1 and the limits in the README |
| Full depth model not passing by 13:00 | Hansika reports tests red | Nothing changes for you: the top-level cascade writes the same files |

Added for the two-person setup (not in PLAN.md):

| Risk | Sign | Response |
|---|---|---|
| Real functions land late | Stubs still in use at 13:00 | Keep building on stubs. The slice ships with whatever is real; say which in the checkpoint |
| A real function does not match its stub | A screen breaks after a pull | Do not patch around it in a component. Write the mismatch in "Notes for my teammate"; the contract decides who changes |
| Vercel will not build a teammate's commits | Hansika's first push shows no deploy | You own the Vercel project: redeploy from your side. Check at about 11:35 |
| Lock file conflict on a pull | Rebase stops on the lock file | Stop. Keep the teammate's version, reinstall, commit the lock file alone |
| Hansika's laptop cannot run the pipeline | No data lane progress by 11:45 | Run `pipeline/` in a second session on this PC under Hansika's direction. Say the swap out loud |
| A broken push breaks the live site | Vercel build red | Whoever pushed it fixes or reverts their own commit at once. After 16:30, test locally before every push |
| No iPhone for the Shortcut | | Demo the photo flow in the Home Screen app instead; the Shortcut is cut with a line in the README |
