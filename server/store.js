// JSON file store for the routine template and dynamic weekly state.
// Deliberately not SQLite — no native modules to build on Synology.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { DEFAULT_WEEK } from './default-template.js';

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
let template = loadJson(TEMPLATE_FILE, { week: DEFAULT_WEEK });

// ---------- template (the standing routine) ----------
export function getTemplate() {
  return template;
}

const DAY_KEYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

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
  template = { week: next.week };
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
