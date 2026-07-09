// Family Google Calendar feed — read via the calendar's "Secret address in
// iCal format" (Settings → target calendar → Integrate calendar). No OAuth:
// just a private URL the server polls periodically. The URL itself lives in
// server/data/calendar-config.json (gitignored, never returned to the client)
// and is never sent to the browser — only the derived event list is.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import ical from 'node-ical';

const DATA_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), 'data');
const CONFIG_FILE = path.join(DATA_DIR, 'calendar-config.json');
const CACHE_TTL = 15 * 60 * 1000; // 15 min — calendars don't need tighter polling

let cache = { fetchedAt: 0, events: [] }; // events: [{ uid, title, start: Date, end: Date, allDay }]

function loadConfig() {
  try {
    return JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
  } catch {
    return { icsUrl: null };
  }
}

const pad = (n) => String(n).padStart(2, '0');
const dateKey = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

async function refreshCache() {
  const { icsUrl } = loadConfig();
  if (!icsUrl) { cache = { fetchedAt: Date.now(), events: [] }; return; }

  const parsed = await ical.async.fromURL(icsUrl, { signal: AbortSignal.timeout(10_000) });
  // Wide-ish window: a couple of weeks either side covers the visible board
  // plus any week the user scrolls to, without re-fetching per week.
  const from = new Date(); from.setDate(from.getDate() - 14);
  const to = new Date(); to.setDate(to.getDate() + 21);

  const events = [];
  for (const item of Object.values(parsed)) {
    if (item.type !== 'VEVENT') continue;
    for (const occ of ical.expandRecurringEvent(item, { from, to })) {
      events.push({
        uid: item.uid,
        title: occ.summary || '(untitled)',
        date: dateKey(occ.start),
        time: occ.isFullDay ? null : `${pad(occ.start.getHours())}:${pad(occ.start.getMinutes())}`,
        allDay: occ.isFullDay,
      });
    }
  }
  cache = { fetchedAt: Date.now(), events };
}

export function isCalendarConfigured() {
  return Boolean(loadConfig().icsUrl);
}

// Returns this week's events (Sun–Sat), keyed by date, refreshing the cache
// if it's gone stale. Fails soft: a fetch error just serves the last good
// cache (or empty) rather than breaking the board.
export async function getWeekEvents(weekStartIso) {
  if (Date.now() - cache.fetchedAt > CACHE_TTL) {
    try { await refreshCache(); } catch { /* keep serving stale cache */ }
  }
  const [y, m, d] = weekStartIso.split('-').map(Number);
  const start = new Date(y, m - 1, d);
  const end = new Date(y, m - 1, d + 7);
  return cache.events.filter((ev) => {
    const [ey, em, ed] = ev.date.split('-').map(Number);
    const evDate = new Date(ey, em - 1, ed);
    return evDate >= start && evDate < end;
  });
}
