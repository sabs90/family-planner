// JSON file store for dynamic weekly state (meals, tasks, notes).
// Deliberately not SQLite — no native modules to build on Synology.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const DATA_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), 'data');
const FILE = path.join(DATA_DIR, 'state.json');

function load() {
  try {
    return JSON.parse(fs.readFileSync(FILE, 'utf8'));
  } catch {
    return { weeks: {} };
  }
}

// Atomic write: temp file + rename, so a crash mid-write never corrupts state.
function save(state) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  const tmp = FILE + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(state, null, 2));
  fs.renameSync(tmp, FILE);
}

const state = load();

function defaultWeek() {
  // Meals/tasks default empty; the frontend template supplies fixed defaults
  // (e.g. Wednesday's grandparents dinner) so nothing is duplicated here.
  return { meals: {}, tasks: {}, notes: '' };
}

export function getWeek(weekStart) {
  return state.weeks[weekStart] ?? defaultWeek();
}

// Deep-merge a partial { meals?, tasks?, notes? } into the week and persist.
// Last-write-wins is fine for a single family.
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

  state.weeks[weekStart] = week;
  save(state);
  return week;
}
