import { FAMILY, PARENTS, KIDS, LOCATIONS, PARENT_LOCS, KID_LOCS } from './config.js';

const POLL_MS = 20_000;   // dynamic-state poll
const TICK_MS = 30_000;   // clock / today / theme recompute
const LIGHT_FROM = 7;     // auto theme: light 07:00–18:59
const DARK_FROM = 19;

// Open-Meteo daily forecast — Mascot/Sydney, free, no API key.
const WEATHER_LAT = -33.92;
const WEATHER_LON = 151.19;
const WEATHER_TTL = 60 * 60 * 1000; // refetch hourly

// ---------- state ----------
let weekStart = null;       // 'YYYY-MM-DD' of this week's Sunday
let TEMPLATE = [];          // the standing routine, from GET /api/template
let ACTIVITIES = [];        // reusable activity catalog (grows via "add new")
let week = { meals: {}, tasks: {}, notes: '', dayNotes: {}, overrides: {} };
let weather = {};           // dateIso → { icon, min, max, rain, hum }
let weatherFetched = 0;
let editing = false;        // true while an inline editor is open → pause re-render
let editMode = false;       // header ✏️ toggle: highlight editables, tap-to-edit everywhere

const narrowMq = window.matchMedia('(max-width: 900px)');

// ---------- date helpers (all local / Sydney time) ----------
const pad = (n) => String(n).padStart(2, '0');
const iso = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

function currentWeekStart() {
  const d = new Date();
  d.setDate(d.getDate() - d.getDay()); // back to Sunday
  return iso(d);
}

function dateOfDay(i) {
  const [y, m, day] = weekStart.split('-').map(Number);
  return new Date(y, m - 1, day + i);
}

// ---------- theme ----------
// Mode: 'auto' (light by day, dark by night) | 'light' | 'dark'.
// Priority: ?theme= URL override > saved mode > auto.
const THEME_MODES = ['auto', 'light', 'dark'];
const THEME_LABELS = { auto: '🌗 Auto', light: '☀️ Light', dark: '🌙 Dark' };

function themeMode() {
  const saved = localStorage.getItem('themeMode');
  return THEME_MODES.includes(saved) ? saved : 'auto';
}

function applyTheme() {
  const override = new URLSearchParams(location.search).get('theme');
  const mode = THEME_MODES.includes(override) ? override : themeMode();
  let theme = mode;
  if (mode === 'auto') {
    const h = new Date().getHours();
    theme = h >= LIGHT_FROM && h < DARK_FROM ? 'light' : 'dark';
  }
  document.documentElement.dataset.theme = theme;
  const btn = document.getElementById('theme-btn');
  if (btn) btn.textContent = THEME_LABELS[themeMode()];
}

function cycleTheme() {
  const next = THEME_MODES[(THEME_MODES.indexOf(themeMode()) + 1) % THEME_MODES.length];
  localStorage.setItem('themeMode', next);
  applyTheme();
}

// ---------- server ----------
async function fetchWeek() {
  const res = await fetch(`/api/week/${weekStart}`);
  if (res.ok) week = await res.json();
}

async function fetchTemplate() {
  const res = await fetch('/api/template');
  if (res.ok) {
    const t = await res.json();
    TEMPLATE = t.week;
    ACTIVITIES = t.activities || [];
  }
}

function patchWeek(patch) {
  // Optimistic: state already updated locally; fire-and-forget, poll reconciles.
  fetch(`/api/week/${weekStart}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(patch),
  }).catch(() => {});
}

function putTemplate() {
  fetch('/api/template', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ week: TEMPLATE, activities: ACTIVITIES }),
  }).catch(() => {});
}

// Effective schedule entry for a person-day: this week's override if one
// exists (may be null = nothing scheduled), else the routine template.
function effEntry(day, group, id) {
  const g = (week.overrides || {})[day.key]?.[group];
  if (g && id in g) return { entry: g[id], ovr: true };
  return { entry: day[group][id], ovr: false };
}

// ---------- weather ----------
function weatherIcon(code) {
  if (code === 0) return '☀️';
  if (code <= 2) return '🌤️';
  if (code === 3) return '☁️';
  if (code <= 48) return '🌫️';
  if (code <= 57) return '🌦️';
  if (code <= 67) return '🌧️';
  if (code <= 77) return '🌨️';
  if (code <= 82) return '🌧️';
  if (code <= 86) return '🌨️';
  return '⛈️';
}

async function fetchWeather() {
  if (Date.now() - weatherFetched < WEATHER_TTL) return;
  try {
    const url = `https://api.open-meteo.com/v1/forecast` +
      `?latitude=${WEATHER_LAT}&longitude=${WEATHER_LON}` +
      `&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,relative_humidity_2m_mean` +
      `&timezone=Australia%2FSydney&start_date=${weekStart}&end_date=${iso(dateOfDay(6))}`;
    const res = await fetch(url);
    if (!res.ok) return;
    const { daily } = await res.json();
    weather = {};
    daily.time.forEach((d, i) => {
      weather[d] = {
        icon: weatherIcon(daily.weather_code[i]),
        min: Math.round(daily.temperature_2m_min[i]),
        max: Math.round(daily.temperature_2m_max[i]),
        rain: daily.precipitation_sum[i],
        hum: Math.round(daily.relative_humidity_2m_mean[i]),
      };
    });
    weatherFetched = Date.now();
  } catch { /* offline / API down → just no weather line */ }
}

// ---------- DOM helpers ----------
function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text != null) node.textContent = text;
  return node;
}

function personColor(node, personId) {
  if (personId) node.style.setProperty('--pc', `var(--c-${personId})`);
  return node;
}

// ---------- render: header ----------
function renderHeader() {
  const now = new Date();
  document.getElementById('clock').textContent =
    `${pad(now.getHours())}:${pad(now.getMinutes())}`;
  document.getElementById('today-label').textContent =
    now.toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'short' });

  const start = dateOfDay(0), end = dateOfDay(6);
  const fmt = (d) => d.toLocaleDateString('en-AU', { day: 'numeric', month: 'short' });
  document.getElementById('week-range').textContent = `${fmt(start)} – ${fmt(end)}`;
}

// ---------- render: weekly notes strip ----------
function renderNotes() {
  const textEl = document.getElementById('notes-text');
  if (!textEl) return; // notes editor is open
  if (week.notes) {
    textEl.textContent = week.notes;
    textEl.classList.add('has-notes');
  } else {
    textEl.textContent = 'Tap to add a note for the week…';
    textEl.classList.remove('has-notes');
  }
}

function openNotesEditor() {
  if (editing) return;
  editing = true;
  const textEl = document.getElementById('notes-text');
  const ta = document.createElement('textarea');
  ta.rows = 1;
  ta.value = week.notes;
  textEl.replaceWith(ta);
  ta.focus();

  let closed = false;
  const close = (save) => {
    if (closed) return;
    closed = true;
    editing = false;
    if (save) {
      week.notes = ta.value.trim();
      patchWeek({ notes: week.notes });
    }
    const span = el('span', 'notes-text');
    span.id = 'notes-text';
    ta.replaceWith(span);
    renderNotes();
  };
  ta.addEventListener('blur', () => close(true));
  ta.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); ta.blur(); }
    if (e.key === 'Escape') close(false);
  });
}

// ---------- cell content builders (shared by grid + stacked layouts) ----------
function locChip(entry) {
  const chip = el('span', 'loc');
  if (entry.activity) {
    chip.append(el('span', null, entry.icon || '•'), el('span', null, entry.activity));
    if (entry.time) chip.append(el('span', 'sub', entry.time));
    return chip;
  }
  const loc = LOCATIONS[entry.loc];
  if (!loc) return el('span', 'none', '—');
  chip.append(el('span', null, loc.icon), el('span', null, loc.label));
  if (loc.c) {
    chip.classList.add('tinted');
    chip.style.setProperty('--lc', `var(--c-${loc.c})`);
  }
  return chip;
}

function ovrFlag() {
  return el('span', 'ovr-flag', 'this wk');
}

function parentContent(day, id) {
  const { entry, ovr } = effEntry(day, 'parents', id);
  const nodes = [entry ? locChip(entry) : el('span', 'none', '—')];
  if (ovr) nodes.push(ovrFlag());
  return nodes;
}

function kidContent(day, id) {
  const { entry, ovr } = effEntry(day, 'kids', id);
  if (!entry) return [el('span', 'none', '—'), ...(ovr ? [ovrFlag()] : [])];
  const nodes = [locChip(entry)];
  if (entry.dp) {
    const chip = personColor(el('span', 'dp-chip'), entry.dp);
    chip.append(el('span', null, `${FAMILY[entry.dp].short} · drop + pick`));
    nodes.push(chip);
  } else if (entry.drop || entry.pick) {
    for (const [verb, pid] of [['drop', entry.drop], ['pick', entry.pick]]) {
      if (!pid) continue;
      const chip = personColor(el('span', 'dp-chip'), pid);
      chip.append(el('span', null, `${FAMILY[pid].short} · ${verb}`));
      nodes.push(chip);
    }
  }
  if (ovr) nodes.push(ovrFlag());
  return nodes;
}

// ---------- inline person editor (location + D/P + scope) ----------
function openPersonEditor(container, day, group, id) {
  if (editing) return;
  editing = true;
  const { entry, ovr } = effEntry(day, group, id);
  const isKid = group === 'kids';

  container.textContent = '';
  const form = el('div', 'cell-editor');
  form.addEventListener('click', (e) => e.stopPropagation());

  const locSel = document.createElement('select');
  locSel.append(new Option('— nothing', ''));
  for (const locId of (isKid ? KID_LOCS : PARENT_LOCS)) {
    locSel.append(new Option(`${LOCATIONS[locId].icon} ${LOCATIONS[locId].label}`, locId));
  }
  locSel.value = entry?.loc || '';
  form.append(locSel);

  let dpSel = null;
  if (isKid) {
    dpSel = document.createElement('select');
    dpSel.append(new Option('Drop/pick: —', ''));
    for (const pid of PARENTS) dpSel.append(new Option(`${FAMILY[pid].short} · drop + pick`, pid));
    dpSel.value = entry?.dp || '';
    form.append(dpSel);
  }

  // Scope: one-off override vs standing routine change
  const scope = el('div', 'scope-toggle');
  const scopeWeek = el('button', 'scope-btn active', 'This week');
  const scopeAlways = el('button', 'scope-btn', 'Every week');
  let scopeVal = 'week';
  scopeWeek.addEventListener('click', () => {
    scopeVal = 'week';
    scopeWeek.classList.add('active'); scopeAlways.classList.remove('active');
  });
  scopeAlways.addEventListener('click', () => {
    scopeVal = 'always';
    scopeAlways.classList.add('active'); scopeWeek.classList.remove('active');
  });
  scope.append(scopeWeek, scopeAlways);
  form.append(scope);

  const actions = el('div', 'editor-actions');
  const save = el('button', 'save', 'Save');
  const cancel = el('button', null, 'Cancel');
  actions.append(save, cancel);
  if (ovr) {
    const reset = el('button', 'reset', '↩ Routine');
    reset.addEventListener('click', () => close('reset'));
    actions.append(reset);
  }
  form.append(actions);
  container.append(form);
  locSel.focus();

  function setLocalOverride(value) {
    const g = ((week.overrides ??= {})[day.key] ??= {});
    (g[group] ??= {})[id] = value;
  }

  const close = (action) => {
    editing = false;
    if (action === 'save') {
      let e = locSel.value ? { loc: locSel.value } : null;
      if (isKid && e && dpSel.value) e.dp = dpSel.value;
      if (scopeVal === 'week') {
        setLocalOverride(e);
        patchWeek({ overrides: { [day.key]: { [group]: { [id]: e } } } });
      } else {
        day[group][id] = e;   // day is a live reference into TEMPLATE
        putTemplate();
      }
    } else if (action === 'reset') {
      const g = (week.overrides || {})[day.key]?.[group];
      if (g) delete g[id];
      patchWeek({ overrides: { [day.key]: { [group]: { [id]: '__reset__' } } } });
    }
    renderBoard();
  };
  save.addEventListener('click', () => close('save'));
  cancel.addEventListener('click', () => close('cancel'));
}

// ---------- dinner ----------
function mealContent(day) {
  if (day.mealFixed) {
    const row = el('div', 'meal-row meal-fixed');
    row.append(el('span', null, '🍽️'), el('span', 'meal-dish', day.mealFixed.dish));
    return [row];
  }
  const meal = week.meals[day.key] || {};
  const row = el('div', 'meal-row');
  row.append(el('span', null, '🍽️'));
  if (meal.dish) {
    row.append(el('span', 'meal-dish', meal.dish));
    if (meal.cookId && FAMILY[meal.cookId]) {
      const cook = personColor(el('span', 'cook-chip'), meal.cookId);
      cook.append(el('span', null, FAMILY[meal.cookId].short));
      row.append(cook);
    }
  } else {
    row.append(el('span', 'meal-dish empty', 'add dinner'));
  }
  row.addEventListener('click', () => openMealEditor(row, day));
  return [row];
}

function openMealEditor(row, day) {
  if (editing) return;
  editing = true;
  const meal = week.meals[day.key] || {};

  const form = el('div', 'meal-editor');
  const input = document.createElement('input');
  input.type = 'text';
  input.placeholder = 'What’s for dinner?';
  input.value = meal.dish || '';

  const select = document.createElement('select');
  select.append(new Option('Who’s cooking?', ''));
  for (const id of PARENTS) select.append(new Option(FAMILY[id].name, id));
  select.value = meal.cookId || '';

  const actions = el('div', 'editor-actions');
  const save = el('button', 'save', 'Save');
  const cancel = el('button', null, 'Cancel');
  actions.append(save, cancel);
  form.append(input, select, actions);
  row.replaceWith(form);
  input.focus();

  const close = (doSave) => {
    editing = false;
    if (doSave) {
      const updated = { dish: input.value.trim(), cookId: select.value };
      week.meals[day.key] = updated;
      patchWeek({ meals: { [day.key]: updated } });
    }
    renderBoard();
  };
  save.addEventListener('click', () => close(true));
  cancel.addEventListener('click', () => close(false));
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') close(true);
    if (e.key === 'Escape') close(false);
  });
}

// ---------- activities / chores / day notes ----------
function eventChip(ev) {
  const chip = personColor(el('span', 'evening-chip'), ev.personId);
  if (ev.icon) chip.append(el('span', null, ev.icon));
  chip.append(el('span', null,
    ev.personId && FAMILY[ev.personId] ? `${FAMILY[ev.personId].short} · ${ev.label}` : ev.label));
  return chip;
}

// Press-and-hold to edit (used where plain tap already means something else).
function onLongPress(node, fn) {
  let timer = null;
  node.addEventListener('pointerdown', () => {
    if (editing) return;
    timer = setTimeout(() => { timer = null; fn(); }, 550);
  });
  for (const ev of ['pointerup', 'pointerleave', 'pointercancel']) {
    node.addEventListener(ev, () => { clearTimeout(timer); timer = null; });
  }
  node.addEventListener('contextmenu', (e) => e.preventDefault());
}

function eventsContent(day) {
  if (!day.events.length) return [el('span', 'none', '—')];
  return day.events.map(eventChip);
}

function openActivitiesEditor(container, day) {
  if (editing || !container) return;
  editing = true;
  container.textContent = '';
  const ed = el('div', 'list-editor');
  ed.addEventListener('click', (e) => e.stopPropagation());

  const list = el('div', 'list-editor-rows');
  const rebuild = () => {
    list.textContent = '';
    for (const ev of day.events) {
      const row = el('div', 'le-row');
      const rm = el('button', 'rm-btn', '✕');
      rm.addEventListener('click', () => {
        day.events.splice(day.events.indexOf(ev), 1);
        putTemplate();
        rebuild();
      });
      row.append(eventChip(ev), rm);
      list.append(row);
    }
  };
  rebuild();

  const who = document.createElement('select');
  who.append(new Option('Everyone', ''));
  for (const [pid, p] of Object.entries(FAMILY)) who.append(new Option(p.short, pid));

  const what = document.createElement('select');
  ACTIVITIES.forEach((a, i) => what.append(new Option(`${a.icon || '•'} ${a.label}`, String(i))));
  what.append(new Option('➕ New activity…', '__new__'));

  const newInput = document.createElement('input');
  newInput.type = 'text';
  newInput.placeholder = 'New activity name';
  newInput.style.display = 'none';
  what.addEventListener('change', () => {
    newInput.style.display = what.value === '__new__' ? '' : 'none';
    if (what.value === '__new__') newInput.focus();
  });

  const addRow = el('div', 'le-add');
  addRow.append(who, what, newInput);

  const actions = el('div', 'editor-actions');
  const add = el('button', 'save', 'Add');
  const done = el('button', null, 'Done');
  add.addEventListener('click', () => {
    let catalogEntry;
    if (what.value === '__new__') {
      const label = newInput.value.trim();
      if (!label) return;
      catalogEntry = { label };
      ACTIVITIES.push(catalogEntry);
      newInput.value = '';
    } else {
      catalogEntry = ACTIVITIES[Number(what.value)];
      if (!catalogEntry) return;
    }
    const ev = { label: catalogEntry.label };
    if (catalogEntry.icon) ev.icon = catalogEntry.icon;
    if (who.value) ev.personId = who.value;
    day.events.push(ev);
    putTemplate();
    rebuild();
  });
  done.addEventListener('click', () => {
    editing = false;
    renderBoard();
  });
  actions.append(add, done);

  ed.append(list, addRow, actions);
  container.append(ed);
}

function taskSlug(day, label) {
  const base = label.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'task';
  const used = new Set(day.tasks.map((t) => t.slug));
  let slug = base, n = 2;
  while (used.has(slug)) slug = `${base}-${n++}`;
  return slug;
}

function openChoresEditor(container, day) {
  if (editing || !container) return;
  editing = true;
  container.textContent = '';
  const ed = el('div', 'list-editor');
  ed.addEventListener('click', (e) => e.stopPropagation());

  const list = el('div', 'list-editor-rows');
  const rebuild = () => {
    list.textContent = '';
    for (const task of day.tasks) {
      const row = el('div', 'le-row');
      const label = el('span', 'task-label', task.label);
      const meta = personColor(el('span', 'task-meta'), task.personId);
      meta.textContent = task.personId && FAMILY[task.personId]
        ? FAMILY[task.personId].short : (task.when || '');
      const rm = el('button', 'rm-btn', '✕');
      rm.addEventListener('click', () => {
        day.tasks.splice(day.tasks.indexOf(task), 1);
        putTemplate();
        rebuild();
      });
      row.append(label, meta, rm);
      list.append(row);
    }
  };
  rebuild();

  const input = document.createElement('input');
  input.type = 'text';
  input.placeholder = 'New chore';

  const who = document.createElement('select');
  who.append(new Option('Anyone', ''));
  for (const pid of PARENTS) who.append(new Option(FAMILY[pid].short, pid));

  const addRow = el('div', 'le-add');
  addRow.append(input, who);

  const actions = el('div', 'editor-actions');
  const add = el('button', 'save', 'Add');
  const done = el('button', null, 'Done');
  const addTask = () => {
    const label = input.value.trim();
    if (!label) return;
    const task = { slug: taskSlug(day, label), label };
    if (who.value) task.personId = who.value;
    day.tasks.push(task);
    putTemplate();
    rebuild();
    input.value = '';
    input.focus();
  };
  add.addEventListener('click', addTask);
  input.addEventListener('keydown', (e) => { if (e.key === 'Enter') addTask(); });
  done.addEventListener('click', () => {
    editing = false;
    renderBoard();
  });
  actions.append(add, done);

  ed.append(list, addRow, actions);
  container.append(ed);
}

function tasksContent(day) {
  return day.tasks.map((task) => {
    const id = `${day.key}::${task.slug}`;
    const done = Boolean(week.tasks[id]);
    const row = el('div', `task-row${done ? ' done' : ''}`);
    row.append(el('span', 'task-check', '✓'), el('span', 'task-label', task.label));
    const meta = personColor(el('span', 'task-meta'), task.personId);
    meta.textContent = task.personId && FAMILY[task.personId]
      ? FAMILY[task.personId].short : (task.when || '');
    row.append(meta);
    row.addEventListener('click', () => {
      if (editing) return;  // a long-press just opened the chores editor
      if (editMode) return; // in edit mode the tap bubbles up and opens the editor
      const next = !week.tasks[id];
      week.tasks[id] = next;
      patchWeek({ tasks: { [id]: next } });
      renderBoard();
    });
    return row;
  });
}

function dayNoteContent(day) {
  const note = (week.dayNotes || {})[day.key] || '';
  const row = el('div', `day-note${note ? '' : ' empty'}`, note || '+ note');
  row.addEventListener('click', () => openDayNoteEditor(row, day));
  return [row];
}

function openDayNoteEditor(row, day) {
  if (editing) return;
  editing = true;
  const ta = document.createElement('textarea');
  ta.className = 'day-note-input';
  ta.rows = 2;
  ta.value = (week.dayNotes || {})[day.key] || '';
  row.replaceWith(ta);
  ta.focus();

  let closed = false;
  const close = (save) => {
    if (closed) return;
    closed = true;
    editing = false;
    if (save) {
      const value = ta.value.trim();
      (week.dayNotes ??= {})[day.key] = value;
      patchWeek({ dayNotes: { [day.key]: value } });
    }
    renderBoard();
  };
  ta.addEventListener('blur', () => close(true));
  ta.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); ta.blur(); }
    if (e.key === 'Escape') close(false);
  });
}

function weatherLine(dayIso) {
  const w = weather[dayIso];
  if (!w) return null;
  const line = el('div', 'wx');
  line.append(
    el('span', 'wx-icon', w.icon),
    el('span', 'wx-temp', `${w.min}°–${w.max}°`),
  );
  if (w.rain != null) {
    const mm = w.rain < 1 && w.rain > 0 ? w.rain.toFixed(1) : Math.round(w.rain);
    line.append(el('span', 'wx-rain', `☔ ${mm}mm`));
  }
  return line;
}

// ---------- render: board ----------
// Row definitions: label rail + one cell builder per day.
const ROWS = [
  ...PARENTS.map((id) => ({ type: 'person', group: 'parents', id, build: (d) => parentContent(d, id) })),
  ...KIDS.map((id) => ({ type: 'person', group: 'kids', id, build: (d) => kidContent(d, id) })),
  { type: 'group', label: 'Dinner',     build: mealContent },
  { type: 'group', label: 'Activities', build: eventsContent, tapEdit: openActivitiesEditor },
  { type: 'group', label: 'Chores',     build: tasksContent, cls: 'chores', holdEdit: openChoresEditor },
  { type: 'group', label: 'Notes',      build: dayNoteContent },
];

function dayClass(dayIso, todayIso) {
  if (dayIso === todayIso) return ' today';
  if (dayIso < todayIso) return ' past';
  return '';
}

function renderBoard() {
  if (editing) return; // don't clobber an open editor on poll
  const board = document.getElementById('board');
  board.textContent = '';
  if (narrowMq.matches) renderStacked(board);
  else renderGrid(board);
}

function renderGrid(board) {
  const todayIso = iso(new Date());
  const grid = el('div', 'grid');

  // Header row: corner + day headers with date + weather
  grid.append(el('div', 'cell head first'));
  TEMPLATE.forEach((day, i) => {
    const date = dateOfDay(i);
    const dayIso = iso(date);
    const cell = el('div', `cell head${dayClass(dayIso, todayIso)}`);
    const name = el('div', 'day-name', day.label);
    if (dayIso === todayIso) name.append(el('span', 'today-badge', 'Today'));
    name.append(el('span', 'day-date', String(date.getDate())));
    cell.append(name);
    const wx = weatherLine(dayIso);
    if (wx) cell.append(wx);
    grid.append(cell);
  });

  for (const row of ROWS) {
    // Label rail
    const label = el('div', `cell first label${row.type === 'group' ? ' group' : ''}${row.cls ? ' ' + row.cls : ''}`);
    if (row.type === 'person') {
      personColor(label, row.id);
      const nameRow = el('div', 'label-name');
      nameRow.append(el('span', 'dot'), el('span', null, FAMILY[row.id].short));
      label.append(nameRow, el('div', 'label-role', FAMILY[row.id].role));
    } else {
      label.append(el('span', null, row.label));
    }
    grid.append(label);

    // Day cells
    TEMPLATE.forEach((day, i) => {
      const dayIso = iso(dateOfDay(i));
      const cell = el('div', `cell${dayClass(dayIso, todayIso)}${row.cls ? ' ' + row.cls : ''}`);
      cell.append(...row.build(day));
      if (row.type === 'person') {
        cell.classList.add('editable');
        cell.addEventListener('click', () => openPersonEditor(cell, day, row.group, row.id));
      }
      if (row.type === 'group') cell.classList.add('can-edit');
      if (row.tapEdit) {
        cell.classList.add('editable');
        cell.addEventListener('click', () => row.tapEdit(cell, day));
      }
      if (row.holdEdit) {
        onLongPress(cell, () => row.holdEdit(cell, day));
        if (editMode) cell.addEventListener('click', () => row.holdEdit(cell, day));
      }
      grid.append(cell);
    });
  }

  board.append(grid);
}

// Phone layout: stacked day cards (label rail doesn't fit → names shown inline).
function renderStacked(board) {
  const todayIso = iso(new Date());
  TEMPLATE.forEach((day, i) => {
    const date = dateOfDay(i);
    const dayIso = iso(date);
    if (dayIso < todayIso) return; // phone: hide past days, focus on now

    const card = el('section', `day-card${dayClass(dayIso, todayIso)}`);
    const head = el('div', 'day-head');
    const name = el('span', 'day-name', day.label);
    if (dayIso === todayIso) name.append(el('span', 'today-badge', 'Today'));
    head.append(name);
    const wx = weatherLine(dayIso);
    if (wx) head.append(wx);
    head.append(el('span', 'day-date', String(date.getDate())));
    card.append(head);

    for (const row of ROWS) {
      const content = row.build(day);
      if (!content.length) continue;
      const lane = el('div', `lane${row.cls ? ' ' + row.cls : ''}`);
      if (row.type === 'person') {
        const pr = personColor(el('div', 'label-name'), row.id);
        pr.append(el('span', 'dot'), el('span', null, FAMILY[row.id].short));
        lane.append(pr);
        const body = el('div', 'cell-body');
        body.append(...content);
        body.addEventListener('click', () => openPersonEditor(body, day, row.group, row.id));
        lane.append(body);
      } else {
        lane.append(el('div', 'lane-title', row.label));
        const body = el('div', 'cell-body');
        body.append(...content);
        if (row.tapEdit) body.addEventListener('click', () => row.tapEdit(body, day));
        if (row.holdEdit) {
          onLongPress(body, () => row.holdEdit(body, day));
          if (editMode) body.addEventListener('click', () => row.holdEdit(body, day));
        }
        lane.append(body);
      }
      card.append(lane);
    }
    board.append(card);
  });
}

// ---------- lifecycle ----------
async function refresh() {
  const ws = currentWeekStart();
  if (ws !== weekStart) {
    week = { meals: {}, tasks: {}, notes: '', dayNotes: {}, overrides: {} }; // week rolled over
    weatherFetched = 0;                                                       // refetch range
  }
  weekStart = ws;
  // Don't refetch the template mid-edit: open editors hold live references into
  // TEMPLATE, and replacing it would silently orphan their changes.
  await Promise.all([fetchWeek(), editing ? null : fetchTemplate(), fetchWeather()]);
  renderHeader();
  renderNotes();
  renderBoard();
}

function tick() {
  applyTheme();
  renderHeader();
  // Advance today-highlight (and week) at midnight without waiting for a poll.
  if (currentWeekStart() !== weekStart) refresh();
  else if (!editing) renderBoard();
}

function toggleEditMode() {
  editMode = !editMode;
  document.body.classList.toggle('edit-mode', editMode);
  const btn = document.getElementById('edit-btn');
  btn.textContent = editMode ? '✓ Done' : '✏️ Edit';
  btn.classList.toggle('active', editMode);
  if (!editing) renderBoard();
}

applyTheme();
weekStart = currentWeekStart();
document.getElementById('notes-strip').addEventListener('click', openNotesEditor);
document.getElementById('theme-btn').addEventListener('click', cycleTheme);
document.getElementById('edit-btn').addEventListener('click', toggleEditMode);
narrowMq.addEventListener('change', renderBoard);
refresh();
setInterval(refresh, POLL_MS);
setInterval(tick, TICK_MS);
