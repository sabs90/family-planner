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

## Data split (updated 2026-07-07: template is now editable in-app)
- **Static (`public/config.js`):** family members + roles, locations + colors, editor
  location lists. Changes here still mean a redeploy (rare).
- **Routine template (server-stored, `server/data/template.json`):** the standing weekly
  schedule — work locations, kid care + drop-off/pickup, activities, chores, fixed meals.
  Seeded from `server/default-template.js` on first boot; edited via the **settings page**
  (`/settings.html`) or inline on the board with scope "Every week". **No container rebuild
  needed to change the routine.**
- **Dynamic (server-stored, keyed by week):** meals + cook, chore/task completion, weekly
  notes, per-day notes, and **this-week-only overrides** of the routine. Keyed by **week
  start (Sunday) ISO date** so each week is independent, **chores auto-reset**, and
  overrides expire when the week rolls over.

## File tree (as built)
```
family-planner/
├── CLAUDE.md
├── README.md                 # run + Synology/Fully Kiosk deploy guide
├── docs/                     # these docs
├── package.json              # ESM; Express is the only dependency
├── Dockerfile
├── docker-compose.yml        # host 3210 → 3000, ./data bind mount, TZ Sydney
├── .gitignore
├── server/
│   ├── server.js             # Express: static + /api/week + /api/template
│   ├── store.js              # atomic JSON persistence, merges, validation
│   ├── default-template.js   # seed routine + seed activity catalog
│   └── data/                 # gitignored, bind-mounted in Docker
│       ├── state.json        # weekly dynamic state
│       └── template.json     # live routine (created on first in-app edit)
└── public/
    ├── index.html            # the board
    ├── settings.html         # routine editor page
    ├── config.js             # FAMILY, LOCATIONS, editor location lists (static)
    ├── styles.css            # themes, grid, chips, editors, settings
    ├── app.js                # render, poll, weather, all inline editors
    └── settings.js           # settings-page forms → PUT /api/template
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
      },
      "overrides": {                    // this-week-only routine deviations
        "tuesday": { "parents": { "raya": { "loc": "city" } },
                     "kids": { "illy": { "loc": "home" } } }
      }
    }
  }
}
```
Task ids are `${day}::${slug}` (e.g. `sunday::pack-bags`). Slugs come from the template's
prep-task definitions so ids are stable.

## API
- `GET  /api/template` → `{ week: [7 days] }` — the standing routine.
- `PUT  /api/template` → replaces the routine (validated: 7 days, correct keys). Used by
  the settings page and by inline "Every week" edits.
- `GET  /api/week/:weekStart` → returns that week's record, or a default if absent.
- `PATCH /api/week/:weekStart` → deep-merges a partial
  `{ meals?, tasks?, notes?, dayNotes?, overrides? }` and persists. Last-write-wins (fine
  for a single family). Used for:
  - toggling a task: `{ "tasks": { "sunday::meal-prep": true } }`
  - setting a meal: `{ "meals": { "monday": { "dish": "Butter chicken", "cookId": "raya" } } }`
  - notes / dayNotes: `{ "notes": "..." }` / `{ "dayNotes": { "thursday": "..." } }`
  - this-week override: `{ "overrides": { "tuesday": { "parents": { "raya": { "loc": "city" } } } } }`
    (value `null` = nothing scheduled; string `"__reset__"` = remove override, back to routine)
- (Static assets served from `public/`; board at `/`, routine editor at `/settings.html`.)

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
