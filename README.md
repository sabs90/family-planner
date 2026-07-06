# Family Planner

A wall-mounted **family weekly ops board**: who's working where, who's got which kid,
who's doing drop-off/pickup, dinner + cook, evening activities, and checkable Sunday prep
chores that reset each week. Served from a Synology NAS, displayed fullscreen on a
wall-mounted landscape tablet, editable from a phone.

Docs live in [docs/](docs/) — start with [CLAUDE.md](CLAUDE.md) and [docs/PROJECT.md](docs/PROJECT.md).

## Run locally

```bash
npm install
npm start          # → http://localhost:3000
```

- The recurring routine lives in [public/config.js](public/config.js) (source of truth: [docs/SCHEDULE.md](docs/SCHEDULE.md)).
- Dynamic state (meals, chore ticks, notes) persists to `server/data/state.json`, keyed by
  each week's Sunday date — chores reset automatically when the week rolls over.
- Theme is automatic: light 07:00–19:00, dark otherwise. Force with `?theme=light` or `?theme=dark`.

## Deploy on Synology (Container Manager)

1. **Copy the project to the NAS** — e.g. to `/volume1/docker/family-planner`
   (File Station upload, or `git clone` via SSH). You don't need `node_modules`.
2. Open **Container Manager → Project → Create**:
   - Project name: `family-planner`
   - Path: `/volume1/docker/family-planner` (it will find `docker-compose.yml`)
   - Build and start.
3. That's it. The compose file:
   - publishes the app on **port 3210** → `http://<nas-ip>:3210/`
   - bind-mounts `./data` so state survives container rebuilds
   - sets `TZ=Australia/Sydney` and `restart: always` (survives NAS reboots)

To update after editing code: Container Manager → Project → family-planner → **Build** again
(or via SSH: `docker compose up -d --build` in the project folder).

### Give the NAS a fixed IP
Set a DHCP reservation for the NAS in your router so the tablet's URL never breaks.

## Wall tablet setup (Fully Kiosk Browser)

1. Install **Fully Kiosk Browser** (Play Store) on the Android tablet.
2. Set **Start URL** to `http://<nas-ip>:3210/`.
3. Recommended settings:
   - **Device Management → Keep Screen On**: enabled (or use Fully's motion-detection
     screensaver to blank at night and wake on motion).
   - **Web Content → Autoplay/JS**: defaults are fine, no special permissions needed.
   - **Kiosk mode**: optional, locks the tablet to the board.
4. Mount landscape. Power via a smart plug on a schedule (e.g. charge to ~80%, off
   overnight) to protect the battery.

## Phone editing

Open the same URL on your phone. The board stacks vertically (past days hidden). Tap a
dinner slot to set the dish + who's cooking, tap prep tasks to tick them off, tap the notes
strip to edit the week's notes. Changes appear on the wall within ~20 seconds.

## Changing the routine

Edit [docs/SCHEDULE.md](docs/SCHEDULE.md) first (source of truth), then mirror the change in
[public/config.js](public/config.js), rebuild the container. Day entries support split
drop-off/pickup (`{ drop: 'raya', pick: 'sabeeh' }`) if the routine ever needs it.
