# Build Roadmap

Execute top-down. Each phase has acceptance criteria. Check items off and update status on
"end session".

## Status
**Phases 0–4 built + 5 post-v1 feature rounds, all verified locally (2026-07-07).**
Remaining: Docker build test, Synology deploy, Pi + monitor kiosk setup (see checklist below).

Notes from the build:
- Local dev runs on **port 3210** (`PORT=3210 npm start`) — port 3000 is occupied by
  another app (Finboard) on the dev machine. Docker publishes host 3210 → container 3000.
- Verified via curl: week defaults, PATCH deep-merge, weekly reset, 400 on bad weekStart,
  state survives server restart; template GET/PUT/persist/validate; overrides set/reset;
  activity catalog backfill + preservation on week-only PUTs.

## Post-v1 feature rounds (all done 2026-07-07, user-driven; details in DECISIONS.md)
- [x] Label-rail grid restructure (names once, not per column); phone keeps stacked cards.
- [x] Weather per day (Open-Meteo): icon + min–max + rain mm (humidity added then removed).
- [x] "Mascot" rename + daycare (rose) vs Mascot (green) tinted chips.
- [x] Expanded chores (Thu/Fri/Sat/Sun) + Sat "Family fun adventure day".
- [x] Theme switch button (Auto/Light/Dark, localStorage; `?theme=` still wins).
- [x] Per-day notes row (dayNotes, tap to edit).
- [x] Board scrolls when grid exceeds viewport.
- [x] **Routine editable in-app**: template server-side (`template.json` + GET/PUT
      /api/template), inline person-cell editors with This-week/Every-week scope,
      this-week overrides ("this wk" badge, auto-expire), ⚙️ /settings.html page.
- [x] Inline activities editor (person + catalog dropdowns, "new activity" grows catalog)
      and chores editor (add/remove with ✕); + buttons removed → tap activities /
      long-press chores / **✏️ Edit mode** toggle that outlines all editables.

## Deploy checklist (next session)
- [ ] `docker compose build` succeeds locally.
- [ ] Copy to NAS, Container Manager project up, reachable at `http://<nas-ip>:3210`.
- [ ] State + template survive container restart (bind-mounted `./data`).
- [ ] Pi + monitor: Chromium kiosk mode pointed at NAS URL, mounted, autostart + nightly restart cron set up.
- [ ] Real-hardware design review (row heights at 1080p, touch targets).

## Phase 0 — Scaffold ✅
- [x] `git init` (repo is not yet a git repo).
- [x] `package.json` (ESM, `"type": "module"`), Express dep (only dep).
- [x] `server/server.js` serving `public/` statically (port 3000, `PORT` env overridable).
- [x] `.gitignore` (node_modules, server/data/state.json, data/).
- **Accept:** ✅ `npm start` serves the page.

## Phase 1 — Frontend design ✅
- [x] `public/config.js` — FAMILY, PARENTS, KIDS, LOCATIONS, WEEK transcribed from `docs/SCHEDULE.md`.
- [x] `public/index.html` + `styles.css` + `app.js` rendering the full landscape board.
- [x] Layout per `docs/DESIGN.md`: 7 columns Sun→Sat, column anatomy, color-coded
      D/P chips, today highlight, live clock, light/dark (auto by hour, `?theme=` override).
- **Accept:** ⏳ pending user design review in browser (built end-to-end per user request).

## Phase 2 — Backend + persistence ✅
- [x] `server/store.js` — atomic JSON save (tmp+rename); `getWeek` returns `{meals:{},tasks:{},notes:''}`
      default; fixed meals (Wed) live only in the frontend template, never stored.
- [x] API: `GET /api/week/:weekStart`, `PATCH /api/week/:weekStart` (deep-merge), weekStart validated.
- [x] Frontend wired: weekStart = most recent Sunday (local), GET on load, optimistic PATCH
      on task toggle / meal edit / notes edit.
- [x] Weekly reset works (new weekStart → fresh record).
- **Accept:** ✅ verified via curl incl. restart survival and cross-week isolation.

## Phase 3 — Polish ✅
- [x] Poll GET every 20s; 30s tick recomputes clock/theme/today (advances at midnight).
- [x] Phone-edit affordances (inline meal editor with cook select, notes strip, tap-to-toggle
      tasks), empty states ("add dinner", notes placeholder). Editors pause poll re-render.
- [x] Accessibility: every colored chip carries a text label; light+dark palettes.
- **Accept:** ⏳ needs a real phone+wall session to confirm feel.

## Phase 4 — Dockerize + Synology deploy ✅ (files) / ⏳ (deploy)
- [x] `Dockerfile` (node:22-alpine, `npm ci --omit=dev`).
- [x] `docker-compose.yml` — host 3210 → 3000, bind-mount `./data` → `/app/server/data`,
      `TZ=Australia/Sydney`, `restart: always`.
- [x] `README.md` — Synology Container Manager steps + Pi/Chromium kiosk setup.
- [ ] Docker image build tested.
- [ ] Deployed on the NAS; state survives restart; Pi + monitor shows it fullscreen.

## Phase 5 — Future / nice-to-have
- [x] Per-week logistics **overrides** (one-off "Raya in City this Tue") — done, inline.
- [x] Weather strip — done (Open-Meteo per-day).
- [ ] SSE for instant cross-device updates (replace polling).
- [ ] Optional Home Assistant / Google Calendar feed as a data source.
- [ ] "Next up" indicator, week-over-week chore completion stats.
- [ ] Settings-page visual polish (functional but plain).
- [ ] `?readonly=1` mode for the wall URL if stray taps become a problem.

## Build conventions
- Keep deps minimal (Express + maybe nothing else). No build step for the frontend.
- Follow the data split in `docs/ARCHITECTURE.md` — template static, dynamic via API.
- Colors/layout per `docs/DESIGN.md`; routine per `docs/SCHEDULE.md` (source of truth).
