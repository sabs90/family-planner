// JSON file store for the routine template and dynamic weekly state.
// Deliberately not SQLite — no native modules to build on Synology.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { DEFAULT_WEEK, DEFAULT_ACTIVITIES } from './default-template.js';

const DATA_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), 'data');
const STATE_FILE = path.join(DATA_DIR, 'state.json');
const TEMPLATE_FILE = path.join(DATA_DIR, 'template.json');

function loadJson(file, fallback) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return fallback;
  }
}

// Atomic write: temp file + rename, so a crash mid-write never corrupts state.
function saveJson(file, obj) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  const tmp = file + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(obj, null, 2));
  fs.renameSync(tmp, file);
}

const state = loadJson(STATE_FILE, { weeks: {} });
// Routine template: seeded from default-template.js until first saved edit.
let template = loadJson(TEMPLATE_FILE, { week: DEFAULT_WEEK, activities: DEFAULT_ACTIVITIES });
template.activities ??= DEFAULT_ACTIVITIES; // template.json saved before the catalog existed
template.settings ??= { prayerView: 'countdown' }; // template.json saved before settings existed
template.settings.showActivities ??= false; // template.json saved before the toggle existed
template.settings.layout ??= 'standard'; // 'standard' (header top) | 'flipped' (board top)

// One-time migration: the board switched from Sunday-start to Monday-start weeks.
// Rotate a Sunday-first template into Monday-first order…
if (template.week?.[0]?.key === 'sunday') {
  template.week.push(template.week.shift());
  saveJson(TEMPLATE_FILE, template);
}
// …and re-key Sunday-keyed week state to its Monday (one day later). Day names
// inside each record are unchanged, so ticks/notes/overrides carry over as-is.
for (const key of Object.keys(state.weeks)) {
  const [y, m, d] = key.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  if (date.getDay() !== 0) continue;
  date.setDate(date.getDate() + 1);
  const pad = (n) => String(n).padStart(2, '0');
  const monKey = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  state.weeks[monKey] ??= state.weeks[key];
  delete state.weeks[key];
  saveJson(STATE_FILE, state);
}

// ---------- template (the standing routine) ----------
export function getTemplate() {
  return template;
}

const DAY_KEYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

export function putTemplate(next) {
  if (!next || !Array.isArray(next.week) || next.week.length !== 7) {
    throw new Error('template must be { week: [7 days] }');
  }
  next.week.forEach((day, i) => {
    if (!day || day.key !== DAY_KEYS[i]) throw new Error(`day ${i} must have key "${DAY_KEYS[i]}"`);
    day.parents ??= {};
    day.kids ??= {};
    day.events = Array.isArray(day.events) ? day.events : [];
    day.tasks = Array.isArray(day.tasks) ? day.tasks : [];
  });
  // Activity catalog: replace when provided, otherwise preserve (the settings
  // page PUTs { week } only and must not wipe the catalog).
  const activities = Array.isArray(next.activities)
    ? next.activities.filter((a) => a && typeof a.label === 'string' && a.label.trim())
    : template.activities;
  // Display settings: same preserve-if-omitted rule as activities.
  const settings = next.settings && typeof next.settings === 'object'
    ? {
        prayerView: next.settings.prayerView === 'all' ? 'all' : 'countdown',
        showActivities: Boolean(next.settings.showActivities),
        layout: next.settings.layout === 'flipped' ? 'flipped' : 'standard',
      }
    : template.settings;
  template = { week: next.week, activities, settings };
  saveJson(TEMPLATE_FILE, template);
  return template;
}

// ---------- weekly dynamic state ----------
function defaultWeek() {
  // Meals/tasks default empty; the template supplies fixed defaults
  // (e.g. Wednesday's grandparents dinner) so nothing is duplicated here.
  return { meals: {}, tasks: {}, notes: '', dayNotes: {}, overrides: {} };
}

export function getWeek(weekStart) {
  return state.weeks[weekStart] ?? defaultWeek();
}

// Deep-merge a partial { meals?, tasks?, notes?, dayNotes?, overrides? } into the
// week and persist. Last-write-wins is fine for a single family.
export function patchWeek(weekStart, patch) {
  const week = state.weeks[weekStart] ?? defaultWeek();

  if (patch.meals && typeof patch.meals === 'object') {
    for (const [day, meal] of Object.entries(patch.meals)) {
      if (meal && typeof meal === 'object') {
        week.meals[day] = { ...week.meals[day], ...meal };
      }
    }
  }
  if (patch.tasks && typeof patch.tasks === 'object') {
    for (const [id, done] of Object.entries(patch.tasks)) {
      week.tasks[id] = Boolean(done);
    }
  }
  if (typeof patch.notes === 'string') {
    week.notes = patch.notes;
  }
  if (patch.dayNotes && typeof patch.dayNotes === 'object') {
    week.dayNotes ??= {}; // records created before dayNotes existed
    for (const [day, note] of Object.entries(patch.dayNotes)) {
      week.dayNotes[day] = String(note);
    }
  }
  // This-week-only routine overrides:
  //   { overrides: { tuesday: { parents: { raya: {loc:'city'} },   ← set override
  //                             kids:    { illy: '__reset__' } } } } ← back to routine
  // An override value of null means "nothing scheduled" (renders as —).
  if (patch.overrides && typeof patch.overrides === 'object') {
    week.overrides ??= {};
    for (const [day, groups] of Object.entries(patch.overrides)) {
      if (!groups || typeof groups !== 'object') continue;
      week.overrides[day] ??= {};
      for (const group of ['parents', 'kids']) {
        if (!groups[group] || typeof groups[group] !== 'object') continue;
        week.overrides[day][group] ??= {};
        for (const [id, entry] of Object.entries(groups[group])) {
          if (entry === '__reset__') delete week.overrides[day][group][id];
          else week.overrides[day][group][id] = entry;
        }
      }
    }
  }

  state.weeks[weekStart] = week;
  saveJson(STATE_FILE, state);
  return week;
}
