# Family Planner

A wall-mounted **family weekly ops board**: who's working where, who's got which kid,
who's doing drop-off/pickup, dinner + cook, evening activities, and checkable Sunday prep
chores that reset each week. Served from a Synology NAS, displayed fullscreen on a monitor
driven by a Raspberry Pi in kiosk mode, editable from a phone.

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
Set a DHCP reservation for the NAS in your router so the wall display's URL never breaks.

## Wall display setup (Raspberry Pi + monitor, Chromium kiosk)

Recommended hardware: **Raspberry Pi 4B, 4GB RAM** — enough headroom for Chromium running
24/7 without memory pressure; 2GB risks OOM over time, 8GB+/Pi 5 is unnecessary for a
lightweight dashboard like this.

1. Flash **Raspberry Pi OS** (with desktop) to an SD card, boot, connect to the monitor.
2. Set Chromium to launch in kiosk mode pointed at `http://<nas-ip>:3210/`, e.g. via an
   autostart entry: `chromium-browser --kiosk --noerrdialogs --disable-infobars http://<nas-ip>:3210/`.
3. Disable screen blanking/DPMS so the monitor stays on (`xset s off`, `xset -dpms`).
4. Set up a nightly `cron` restart of Chromium (or a full reboot) to clear any memory creep
   from the long-running kiosk session.
5. Mount monitor + Pi, landscape orientation.

## Phone editing

Open the same URL on your phone. The board stacks vertically (past days hidden). Tap a
dinner slot to set the dish + who's cooking, tap prep tasks to tick them off, tap the notes
strip to edit the week's notes. Changes appear on the wall within ~20 seconds.

## Changing the routine

Edit [docs/SCHEDULE.md](docs/SCHEDULE.md) first (source of truth), then mirror the change in
[public/config.js](public/config.js), rebuild the container. Day entries support split
drop-off/pickup (`{ drop: 'raya', pick: 'sabeeh' }`) if the routine ever needs it.

## Family Google Calendar (optional)

The board's Calendar row reads events from a Google Calendar's **secret iCal address** —
a private, read-only feed URL. No OAuth, no Google Cloud project, no login.

1. In Google Calendar (web): **Settings → [pick the calendar] → Integrate calendar →
   Secret address in iCal format**. Copy that URL.
2. Create `server/data/calendar-config.json` (this whole directory is gitignored — the URL
   is never committed and never sent to the browser, only the parsed event titles/times
   are):
   ```json
   { "icsUrl": "https://calendar.google.com/calendar/ical/....../basic.ics" }
   ```
   (`server/calendar-config.example.json` has the exact shape.)
3. Restart the server (or the container). The server polls the feed every ~15 minutes and
   expands recurring events; if the feed is missing/unreachable the row just shows nothing
   — the rest of the board is unaffected.
