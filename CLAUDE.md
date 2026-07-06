# Family Planner — CLAUDE.md

Entry point for Claude in this repo. Read this first, then the docs it points to.

## What this is
A wall-mounted **family logistics / weekly ops board** for the Hus(?) family. Not a
calendar — the point is to make *"who's got which kid, where is everyone working, and
who's doing drop-off/pickup"* glanceable, plus meals and weekly prep chores. Runs as a
locally-hosted web page on a Synology NAS, displayed fullscreen on a wall-mounted
landscape device, and editable from a phone.

## Status
**Built (Phases 0–4) and verified locally, 2026-07-07.** App runs with
`PORT=3210 npm start` → http://localhost:3210 (port 3000 is taken by Finboard on the dev
machine). Remaining: user design review/tweaks, Docker build test, Synology deploy, tablet
setup. See `docs/BUILD.md` Status for details.

## Doc index
- `docs/PROJECT.md` — goal, why, family context, hardware stack, success criteria.
- `docs/SCHEDULE.md` — **source of truth** for the weekly routine (feeds the app's config).
- `docs/ARCHITECTURE.md` — tech stack, file tree, data model, API, deploy.
- `docs/DESIGN.md` — visual system: layout, colors, components, interaction.
- `docs/BUILD.md` — phased build roadmap with acceptance criteria.
- `docs/DECISIONS.md` — dated decision log (append to this over time).

## Tech stack (decided)
- Frontend: vanilla HTML/CSS/JS single page (no framework). Landscape, 7 day columns.
- Backend: Node/Express + **JSON file store** (not SQLite — avoids native builds on Synology).
- Deploy: one Docker container via Synology Container Manager.
- Display: wall-mounted landscape Android tablet running Fully Kiosk Browser → NAS URL.

## How to work in this repo
- The stable weekly routine lives in frontend config (rarely edited). Dynamic state
  (meals + cook, chore checkmarks, notes) persists via the API, **keyed by week** so
  chores auto-reset each week. Keep this split — don't hardcode dynamic data.
- Week starts **Sunday** (Sunday prep kicks off the week). Column order is Sun→Sat.
- Keep it vibe-code-friendly and simple: readable vanilla code, minimal deps.

## ⚑ "end session" trigger
When the user says **"end session"** (or "end the session"), treat it as a signal to
**update the docs before finishing**:
1. Update `docs/BUILD.md` status / checkboxes to reflect what got done.
2. Append any decisions made to `docs/DECISIONS.md` (with today's date).
3. Update the **Status** section above.
4. Reflect any routine changes into `docs/SCHEDULE.md`, design changes into `docs/DESIGN.md`,
   architecture changes into `docs/ARCHITECTURE.md`.
5. Summarize what changed in the reply.
Keep docs the durable memory of this project so any fresh chat can pick up cleanly.
