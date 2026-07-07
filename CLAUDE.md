# Family Planner — CLAUDE.md

Entry point for Claude in this repo. Read this first, then the docs it points to.

## What this is
A wall-mounted **family logistics / weekly ops board** for the Hus(?) family. Not a
calendar — the point is to make *"who's got which kid, where is everyone working, and
who's doing drop-off/pickup"* glanceable, plus meals and weekly prep chores. Runs as a
locally-hosted web page on a Synology NAS, displayed fullscreen on a wall-mounted
landscape device, and editable from a phone.

## Status
**v1 feature-complete, verified locally, 2026-07-07** — after 5 design-review rounds with
the user (see `docs/DECISIONS.md`). Board + full editing story are done: label-rail grid,
weather, per-day/weekly notes, theme switch, in-app routine editing (inline cell editors
with this-week/every-week scope, ✏️ edit mode, ⚙️ settings page, activity catalog).

Run locally: `PORT=3210 npm start` → http://localhost:3210 (port 3000 is taken by Finboard
on the dev machine). A dev server may still be running from the last session.

**Remaining (next session):** Docker build test → Synology deploy (README has the steps) →
tablet + Fully Kiosk setup → review on real hardware. Optional: settings-page polish, SSE.

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
- **Three data tiers — keep the split:**
  1. `public/config.js` — static: people, locations, colors (change = redeploy).
  2. Routine template — server-stored (`server/data/template.json`, seeded from
     `server/default-template.js`), edited in-app via `GET/PUT /api/template`.
     Routine changes need **no container rebuild**.
  3. Weekly dynamic state — `server/data/state.json` keyed by week-start (Sunday):
     meals, chore ticks, notes, dayNotes, and this-week **overrides** (auto-expire at
     rollover; `"__reset__"` sentinel clears one).
- Week starts **Sunday** (Sunday prep kicks off the week). Column order is Sun→Sat.
- Editors hold live references into the client's TEMPLATE — never refetch the template
  while `editing` is true.
- Keep it vibe-code-friendly and simple: readable vanilla code, Express is the only dep.

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
