# Fludd: guide for any Claude Code session in this repo

Fludd gives any address near USF a flood report card: a letter grade, where the water goes hour by hour, and when to move your car. Built at HackJam '26 on 2026-11-21. Hacking ends and submissions close at 18:00 EST. No commits after 18:00.

## Read these first

1. `prep/PLAN.md`: the whole project. Scope, architecture, repo layout, contracts, lanes, schedule, design rules, demo.
2. Your person's guide. It has copy-paste prompts and a progress checklist you keep up to date:
   - working with **Hansika** (logic, data, backend): `prep/HACKER-HANSIKA.md`
   - working with **Harshith** (interface, lead duties): `prep/HACKER-HARSHITH.md`
3. `docs/contracts.md` once it exists. It is the boundary between the two halves.

If you do not know who you are working with, ask before editing anything.

To pick up after a restart or on a new account: read your person's guide, run `git log --oneline -20` and `git status`, find the first unticked item in the progress checklist, and continue from there.

## Who owns what

| Person | Folders | Never edits |
|---|---|---|
| Hansika | `pipeline/`, `supabase/`, `web/lib/`, `web/app/api/`, `web/public/data/` and their tests | Pages, components, styles |
| Harshith | `web/app/` pages and layouts (not `api/`), `web/components/`, styles, `docs/`, root files, `.github/` | `web/lib/`, `web/app/api/`, `pipeline/`, `supabase/` |

Each session updates only its own person's guide in `prep/`.

## Working rules

- Tests before the code they check. Build against the toy fixture until real data lands.
- Run things before saying they work. Report failures with their output.
- Small commits, conventional messages, imperative mood. **No AI attribution in commit messages.**
- Pull with rebase before every push. Never force-push.
- Never change a contract without stopping to ask both people.
- Config comes from env. Never commit a key. `.env.example` documents every variable.
- TypeScript strict, no `any`. Python typed.
- The app never says a flooded road is safe to drive.

## Hackathon rules that bind this repo

- All project code is written after 11:00 on 2026-11-21. Nothing is reused from earlier projects.
- The files in `prep/` are planning and research notes written before 11:00. They contain no code. The README says so.
- AI use must be credited in the README and the MLH submission, separating what the team decided from what was generated. Leaving it out means disqualification.
- Frameworks and libraries are listed in the README.

## Skills

Skills in `.claude/skills/` load automatically. Design skills and the order to use them: `prep/DESIGN-SKILLS.md`. Sources: `.claude/SOURCES.md`.
