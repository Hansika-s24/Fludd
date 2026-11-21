# Fludd

What the flood map doesn't tell you about your address.

Type an address near USF and get a letter grade for how it holds up in a storm, see where the water goes hour by hour, and know when to move your car.

Built at HackJam '26 (SHPE USF, an MLH event) on November 21, 2026 by Harshith and Hansika.

**Status:** in progress. This README is filled in as the build lands.

## How AI was used

We used Claude Code throughout, and we are stating it plainly because the rules require it.

- **Before the event:** research and planning only, with Claude Code. The notes are in `prep/`. They contain no code, no design assets and no prepared data.
- **During the event:** Claude Code generated code under our direction. We chose the approach, the grading rules, the thresholds and what to cut. This section will list which folders were generated and what we wrote or changed by hand before we submit.
- **Inside the product:** the Google Gemini API reads resident flood photos and phrases guidance. The grade, map, storm timeline and routing work without it.

## Frameworks and libraries

Listed here as each one is added.

## Repo guide

- `prep/PLAN.md`: the full project plan.
- `CLAUDE.md`: working rules for coding sessions.
