# Hackathon skill kit

Researched 2026-11-21. Star counts and last-push dates were read from the GitHub API that day.
Status key: **HAVE** = already on this PC · **KIT** = installed into this folder today · **GAP** = worth adding.

## 1. The actual Anthropic hackathon winner's setup (ECC)

- The link you had, `alphachoi/everything-claude-code`, is a stale fork: 39 stars, last push 2026-01-30, 5,100 commits behind.
- The real repo is **`affaan-m/ECC`** (formerly `affaan-m/everything-claude-code`): 308k stars, MIT, v2.2.3. Author Affaan Mustafa won the Anthropic x Forum Ventures hackathon in NYC (zenith.chat, built in 8 hours with Claude Code).
- It has grown to 328 skills, 72 agents, 99 commands plus hooks. The January snapshot (what he actually had near the win) was 22 skills, 12 agents, 23 commands.

**What I installed (KIT)** from commit `4adeee6`, into `.claude/` in this folder, with no hooks, no rules and no commands:

| Area | Skills |
|---|---|
| Winner's original core | `coding-standards` `backend-patterns` `frontend-patterns` `postgres-patterns` `eval-harness` `strategic-compact` |
| Build loop | `search-first` `orch-build-mvp` (+ `orch-pipeline`, its engine) `api-design` `deployment-patterns` `e2e-testing` `mcp-server-patterns` |
| Motion and polish | `motion-foundations` `motion-patterns` `motion-advanced` `make-interfaces-feel-better` |
| Demo and pitch | `frontend-slides` `ui-demo` `investor-materials` `market-research` |

Agents (9 of the original 12): `planner` `architect` `code-reviewer` `security-reviewer` `build-error-resolver` `e2e-runner` `tdd-guide` `refactor-cleaner` `database-reviewer`.

Skipped on purpose:
- `tdd-workflow`, `verification-loop`, `security-review`: you already have these from Superpowers and the built-ins, and duplicate triggers make routing worse. `orch-pipeline` mentions `tdd-workflow`; Superpowers TDD fills that role.
- The full `ecc@ecc` plugin: 300+ skill descriptions and its own hooks would stack on top of your Superpowers and Ponytail session hooks.

These skills only load when Claude Code is started in this folder (or a subfolder). To use them in a different project, copy this folder's `.claude` directory into it.

## 2. What Anthropic's own hackathon winners did

From Anthropic's winner write-ups for the Opus 4.6, 4.7 and 4.8 events. None of them publish judging criteria.

- **Map the whole project before building.** Tekton (1st, 4.8) wrote a PRD and about 50 tickets, then ran them in parallel. Maieutic (3rd, 4.7) spent two days on specs first.
- **One agent or session per domain.** Wrench Board (2nd, 4.7) ran five or six agents in parallel. Medkit (1st, 4.7) used four separate sessions to keep contexts clean.
- **Independent verifier sub-agents** that grade the work in a fresh context (Tekton, Sim Francisco).
- **Eval first, features later** (MaestrIA).
- **Reserve the last day for the demo video.** Virtual Puppet Theater made theirs with HyperFrames.
- Wrench Board used **Superpowers** for brainstorm-then-plan. You already have it.

## 3. Top picks per area

### Ideation, spec, planning
| Pick | Status | Notes |
|---|---|---|
| `superpowers:brainstorming` + `writing-plans` | HAVE | Used by a 4.7 runner-up |
| `gstack-office-hours` / `gstack-spec` / `gstack-autoplan` | HAVE | Idea pressure test, spec, auto-reviewed plan |
| `grill-me` + `grilling` (mattpocock/skills, 329k stars) | KIT | `grill-me` is a manual trigger that calls `grilling`. Among the most-installed skills; interrogates your plan until it is concrete |

### Frontend design and UI
| Pick | Status | Notes |
|---|---|---|
| `design-skills:frontend-design` (Anthropic) | HAVE | The baseline anti-generic design skill |
| `impeccable` (pbakaus, 114k stars) | HAVE | Critique, audit and polish passes |
| `ui-ux-pro-max` and `design-taste-frontend` | HAVE | Palettes, type pairings, anti-slop direction |
| `web-design-guidelines` (vercel-labs/agent-skills, 35k stars) | KIT | Fast UI audit against Vercel's guidelines |

shadcn MCP is connected. The `magic` (21st.dev) MCP is configured but failing: its API key is missing or was reset.

### Animation and motion
| Pick | Status | Notes |
|---|---|---|
| Official GSAP skills, 8 of them (greensock/gsap-skills, 19k stars) | HAVE | `gsap-core`, `-timeline`, `-scrolltrigger`, `-react`, `-plugins`, `-performance`, `-utils`, `-frameworks` |
| `motion-framer` plus ECC `motion-foundations/patterns/advanced` | HAVE + KIT | React and Next.js with `motion/react`: springs, page transitions, gestures |
| emilkowalski/skills (59k stars): `animate`, `review-animations`, `choreograph`, `emil-design-eng` | KIT | Best pick for animation taste and review, not just API usage |
| CloudAI-X/threejs-skills (4.3k stars, 13 skills) | KIT | Only if you want a 3D hero or scene |

Skipped: freshtechbro/claudedesignskills (last push 2025-11, a year stale).

### Backend, data, auth
| Pick | Status | Notes |
|---|---|---|
| ECC `backend-patterns`, `api-design`, `postgres-patterns` | KIT | Node, Express, Next.js API routes |
| supabase/agent-skills: `supabase`, `supabase-postgres-best-practices` | KIT | Official. Add if you use Supabase for DB and auth |
| `design-skills:convex-create-component` | HAVE | If you go Convex instead |

### AI and agent features
| Pick | Status | Notes |
|---|---|---|
| `claude-api` | HAVE | Model IDs, tool use, caching, streaming |
| ECC `eval-harness`, `mcp-server-patterns` | KIT | Eval-first loop; building an MCP server |
| `mcp-builder` (anthropics/skills, 198k stars) | KIT | Anthropic's own MCP server guide |

### Testing, QA, debugging
| Pick | Status | Notes |
|---|---|---|
| `superpowers:systematic-debugging`, `test-driven-development`, `verification-before-completion` | HAVE | |
| `gstack-qa` plus Playwright MCP | HAVE | Browser-driven QA that fixes what it finds |
| ECC `e2e-testing` plus the `e2e-runner` agent | KIT | Playwright test patterns |

### Deploy and ship
| Pick | Status | Notes |
|---|---|---|
| `gstack-ship` / `gstack-land-and-deploy` | HAVE | Test, review, PR, deploy |
| `deploy-to-vercel` (vercel-labs/agent-skills) | KIT | Fastest route to a live demo URL |
| ECC `deployment-patterns` | KIT | Docker, CI, health checks |

### Demo video and pitch
| Pick | Status | Notes |
|---|---|---|
| ECC `frontend-slides`, `ui-demo`, `investor-materials` | KIT | Animated HTML deck; Playwright-recorded UI walkthrough; pitch content |
| HyperFrames (heygen-com/hyperframes, 88k stars): `hyperframes`, `hyperframes-cli`, `hyperframes-registry`, `media-use` | KIT | HTML-to-video; a 4.7 winner used it for their demo video |
| remotion-dev/skills (7.7k stars, official) | GAP (skipped) | React video; HyperFrames covers the same job. Remotion has a paid company licence above small-team size |
| `anthropic-skills:pptx`, `gstack-make-pdf` | HAVE | If judges want a file |

### Research and review
All HAVE: `tavily:*`, `anthropic-skills:deep-research`, `code-review`, `security-review`, `gstack-cso`. ECC `search-first` and `market-research` are in the KIT.

## 4. Gap skills added on 2026-11-21

Copied by hand from a shallow clone of each repo (not through the `npx skills` CLI), into `.claude/skills/` in this folder. The kit now holds 49 skills and 9 agents.

| Repo | Commit | Skills |
|---|---|---|
| emilkowalski/skills | `64eb3de` | `animate` `review-animations` `choreograph` `emil-design-eng` |
| vercel-labs/agent-skills | `5a37a63` | `web-design-guidelines` `deploy-to-vercel` |
| mattpocock/skills | `abeeaf9` | `grill-me` `grilling` |
| heygen-com/hyperframes | `e8f52dc` | `hyperframes` `hyperframes-cli` `hyperframes-registry` `media-use` |
| supabase/agent-skills | `c9be0e9` | `supabase` `supabase-postgres-best-practices` |
| anthropics/skills | `e4bb5d9` | `mcp-builder` |
| CloudAI-X/threejs-skills | `0e18186` | all 13 `threejs-*` skills |

Things to know before the hackathon:
- **HyperFrames telemetry.** `media-use` ships a script that posts usage events to PostHog. `.claude/settings.json` in this folder sets `DO_NOT_TRACK=1` and `HYPERFRAMES_NO_TELEMETRY=1`, the two opt-outs that script checks. That only applies to commands Claude Code runs from this folder.
- **HyperFrames needs keys for audio.** Voiceover and music paths look for `ELEVENLABS_API_KEY`, `GEMINI_API_KEY` or `HEYGEN_API_KEY`. Silent video renders do not need them. Rendering runs `npx hyperframes`, which downloads the CLI on first use.
- **Nothing here has been exercised.** The files are in place and each has a valid `SKILL.md`; no skill has been run end to end.
- To update a skill later, re-copy its folder from the repo. There is no lock file tracking these.

## 5. Design and map skills added for the Storm report card (2026-11-21)

Hand-copied after a scan, same as section 4. The kit now holds 62 skills.

| Repo | Commit | Skills | Why |
|---|---|---|---|
| AnmolSaini16/mapcn | `fd8ce8f` | `mapcn` | shadcn-styled map components on MapLibre. Defaults to CARTO basemaps: credit them |
| maplibre/maplibre-agent-skills | `247a37b` | `maplibre-cartography` `maplibre-source-wiring` `maplibre-tile-sources` `maplibre-v6-migration` `maplibre-terrain-rendering` | Official. MapLibre is now v6 (ESM-only) |
| nextlevelbuilder/ui-ux-pro-max-skill | `f76d165` (main) | `ui-ux-pro-max` | Newer than the August global copy; adds map guidance |
| shadcn-ui/ui | `654a6d7` | `shadcn` | Official shadcn skill |
| anthropics/skills | `e4bb5d9` | `frontend-design` | Rewritten upstream in September |
| jakubkrehel/skills | `672ae44` | `better-colors` `better-typography` `better-ui` `better-layout` | Overlaps impeccable; included for colour and type passes |

Deliberately not done:
- **taste-skill update:** v2.5.1 adds a Stop hook that can block turns for up to 10 minutes. The August copy stays.
- **impeccable 4.8.2 to 4.10.0:** modest gain; its updater downloads a binary and fetches a remote catalogue. Run `npx impeccable update` yourself if you want it.
- **Official shadcn MCP server:** the connected one is a community server. Add the official one inside the project after 11:00 with `npx shadcn@latest mcp init --client claude`.
- **21st.dev magic MCP:** API key missing; skipped.

Full research: `prep/05-design-skills.md`.

## Sources

- https://github.com/affaan-m/ECC
- https://claude.com/blog/meet-the-winners-of-our-claude-opus-4-8-build-day-hackathon
- https://claude.com/blog/meet-the-winners-of-built-with-opus-4-7-claude-code-hackathon
- https://claude.com/blog/meet-the-winners-of-our-built-with-opus-4-6-claude-code-hackathon
- https://github.com/greensock/gsap-skills · https://github.com/emilkowalski/skills · https://github.com/CloudAI-X/threejs-skills
- https://github.com/vercel-labs/agent-skills · https://github.com/supabase/agent-skills · https://github.com/anthropics/skills
- https://github.com/heygen-com/hyperframes · https://github.com/remotion-dev/skills · https://github.com/mattpocock/skills
- https://github.com/affaan-m/ECC/discussions/2504 (context cost of the full install)
