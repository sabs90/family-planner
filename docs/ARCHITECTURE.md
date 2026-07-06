# Architecture

## Stack
- **Frontend:** vanilla HTML/CSS/JS single page. No framework, no build step. Easy to host
  on Synology and easy to vibe-edit.
- **Backend:** Node.js + Express. Serves the static frontend and a small REST API.
- **Persistence:** a single JSON file on disk (`server/data/state.json`), written
  atomically (write temp + rename). Deliberately **not** SQLite — no native modules to
  compile on Synology's platform. Data volume is tiny (one family).
- **Deploy:** one Docker container via Synology Container Manager, data dir bind-mounted so
  state survives container rebuilds.

## Data split (important)
- **Template (static, ships in `public/config.js`):** family + colors, locations, and the
  recurring weekly routine from `docs/SCHEDULE.md` (work locations, kid care, drop-off/pickup,
  fixed evening activities, prep task definitions). Rarely edited; not stored server-side.
- **Dynamic (stored server-side, keyed by week):** meals + cook, chore/task completion,
  free-text notes, and any one-off overrides. Keyed by **week start (Sunday) ISO date** so
  each week is independent and **chores auto-reset** when the week rolls over.

## Proposed file tree
```
family-planner/
├── CLAUDE.md
├── docs/                     # these docs
├── package.json
├── Dockerfile
├── docker-compose.yml
├── .gitignore
├── server/
│   ├── server.js             # Express app: static + API
│   ├── store.js              # JSON file load/save (atomic), week defaults
│   └── data/
│       └── state.json        # persisted dynamic state (bind-mounted; gitignored)
└── public/
    ├── index.html
    ├── config.js             # FAMILY, LOCATIONS, WEEK_TEMPLATE (from SCHEDULE.md)
    ├── styles.css
    └── app.js                # render, poll, optimistic edits
```

## Dynamic state shape
```jsonc
{
  "weeks": {
    "2026-07-05": {                     // week start = Sunday ISO date
      "meals": {
        "sunday":    { "dish": "", "cookId": "" },
        "monday":    { "dish": "", "cookId": "" },
        "wednesday": { "dish": "Dinner at grandparents’", "cookId": "" }
        // ... one per day
      },
      "tasks": {                        // completion by task id "<day>::<slug>"
        "sunday::meal-prep": true,
        "sunday::iron-shirts": false
      },
      "notes": "",                      // week-level notes strip
      "dayNotes": {                     // per-day one-off notes
        "thursday": "Illy photo day"
      }
    }
  }
}
```
Task ids are `${day}::${slug}` (e.g. `sunday::pack-bags`). Slugs come from the template's
prep-task definitions so ids are stable.

## API
- `GET  /api/week/:weekStart` → returns that week's record, creating a default (empty meals
  from template defaults, all tasks false, empty notes) if absent.
- `PATCH /api/week/:weekStart` → deep-merges a partial `{ meals?, tasks?, notes? }` into the
  week record and persists. Last-write-wins (fine for a single family). Used for:
  - toggling a task: `{ "tasks": { "sunday::meal-prep": true } }`
  - setting a meal: `{ "meals": { "monday": { "dish": "Butter chicken", "cookId": "raya" } } }`
  - notes: `{ "notes": "..." }`
- (Static assets served from `public/`.)

`weekStart` is computed client-side from "today": most recent Sunday
(`d.getDate() - d.getDay()`), formatted `YYYY-MM-DD` in local (Sydney) time.

## Refresh strategy
- Wall display **polls** `GET /api/week/:weekStart` every ~20s and re-renders; also
  recomputes "today" / clock each minute so the highlighted column advances at midnight.
- Edits (from phone or display) are **optimistic**: update UI immediately, then PATCH.
- **Phase 5 upgrade:** replace polling with SSE so a phone edit reflects on the wall instantly.

## Timezone
Australia/Sydney. Compute "today" and week start in local time. If containerized, set `TZ`
env in docker-compose.

## Deploy (Synology, outline)
1. Build image from `Dockerfile` (Node LTS base, copy app, `npm ci --omit=dev`, `CMD node server/server.js`).
2. In Container Manager: create container, map host port → 3000, bind-mount a host folder
   to `/app/server/data`, set `TZ=Australia/Sydney`, restart policy = always.
3. Point Fully Kiosk Browser on the tablet at `http://<nas-ip>:<port>/`.
Full step-by-step goes in `README.md` when built.
