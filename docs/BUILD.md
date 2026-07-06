# Build Roadmap

Execute top-down. Each phase has acceptance criteria. Check items off and update status on
"end session".

## Status
**Phases 0–4 built and verified locally (2026-07-07).** Remaining: user design review,
Docker build test, actual Synology deploy + tablet setup. Then Phase 5 nice-to-haves.

Notes from the build:
- Local dev runs on **port 3210** (`PORT=3210 npm start`) — port 3000 is occupied by
  another app (Finboard) on the dev machine. Docker publishes host 3210 → container 3000.
- Verified via curl: week defaults, PATCH deep-merge, weekly reset, 400 on bad weekStart,
  state survives server restart. `state.json` test data was cleared after verification.

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
- [x] `README.md` — Synology Container Manager steps + Fully Kiosk Browser setup.
- [ ] Docker image build tested.
- [ ] Deployed on the NAS; state survives restart; tablet shows it fullscreen.

## Phase 5 — Future / nice-to-have
- [ ] SSE for instant cross-device updates (replace polling).
- [ ] Per-week logistics **overrides** (one-off "Raya in City this Tue").
- [ ] Optional Home Assistant / Google Calendar feed as a data source.
- [ ] Weather strip, "next up" indicator, week-over-week chore completion stats.

## Build conventions
- Keep deps minimal (Express + maybe nothing else). No build step for the frontend.
- Follow the data split in `docs/ARCHITECTURE.md` — template static, dynamic via API.
- Colors/layout per `docs/DESIGN.md`; routine per `docs/SCHEDULE.md` (source of truth).
