import { FAMILY, PARENTS, KIDS, LOCATIONS, WEEK } from './config.js';

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
let week = { meals: {}, tasks: {}, notes: '' };  // dynamic state from server
let weather = {};           // dateIso → { icon, min, max }
let weatherFetched = 0;
let editing = false;        // true while an inline editor is open → pause re-render

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
function applyTheme() {
  const override = new URLSearchParams(location.search).get('theme');
  let theme;
  if (override === 'light' || override === 'dark') {
    theme = override;
  } else {
    const h = new Date().getHours();
    theme = h >= LIGHT_FROM && h < DARK_FROM ? 'light' : 'dark';
  }
  document.documentElement.dataset.theme = theme;
}

// ---------- server ----------
async function fetchWeek() {
  const res = await fetch(`/api/week/${weekStart}`);
  if (res.ok) week = await res.json();
}

function patchWeek(patch) {
  // Optimistic: state already updated locally; fire-and-forget, poll reconciles.
  fetch(`/api/week/${weekStart}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(patch),
  }).catch(() => {});
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
      `&daily=weather_code,temperature_2m_max,temperature_2m_min` +
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

// ---------- render: notes ----------
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
  chip.append(el('span', null, loc.icon), el('span', null, loc.label));
  if (loc.c) {
    chip.classList.add('tinted');
    chip.style.setProperty('--lc', `var(--c-${loc.c})`);
  }
  return chip;
}

function parentContent(day, id) {
  const entry = day.parents[id];
  return [entry ? locChip(entry) : el('span', 'none', '—')];
}

function kidContent(day, id) {
  const entry = day.kids[id];
  if (!entry) return [el('span', 'none', '—')];
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
  return nodes;
}

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

function eventsContent(day) {
  return day.events.map((ev) => {
    const chip = personColor(el('span', 'evening-chip'), ev.personId);
    if (ev.icon) chip.append(el('span', null, ev.icon));
    chip.append(el('span', null,
      ev.personId ? `${FAMILY[ev.personId].short} · ${ev.label}` : ev.label));
    return chip;
  });
}

function tasksContent(day) {
  return day.tasks.map((task) => {
    const id = `${day.key}::${task.slug}`;
    const done = Boolean(week.tasks[id]);
    const row = el('div', `task-row${done ? ' done' : ''}`);
    row.append(el('span', 'task-check', '✓'), el('span', 'task-label', task.label));
    const meta = personColor(el('span', 'task-meta'), task.personId);
    meta.textContent = task.personId ? FAMILY[task.personId].short : (task.when || '');
    row.append(meta);
    row.addEventListener('click', () => {
      const next = !week.tasks[id];
      week.tasks[id] = next;
      patchWeek({ tasks: { [id]: next } });
      renderBoard();
    });
    return row;
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
  return line;
}

// ---------- render: board ----------
// Row definitions: label rail + one cell builder per day.
const ROWS = [
  ...PARENTS.map((id) => ({ type: 'person', id, build: (d) => parentContent(d, id) })),
  ...KIDS.map((id) => ({ type: 'person', id, build: (d) => kidContent(d, id) })),
  { type: 'group', label: 'Dinner',     build: mealContent },
  { type: 'group', label: 'Activities', build: eventsContent },
  { type: 'group', label: 'Chores',     build: tasksContent, cls: 'chores' },
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
  WEEK.forEach((day, i) => {
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
    WEEK.forEach((day, i) => {
      const dayIso = iso(dateOfDay(i));
      const cell = el('div', `cell${dayClass(dayIso, todayIso)}${row.cls ? ' ' + row.cls : ''}`);
      cell.append(...row.build(day));
      grid.append(cell);
    });
  }

  board.append(grid);
}

// Phone layout: stacked day cards (label rail doesn't fit → names shown inline).
function renderStacked(board) {
  const todayIso = iso(new Date());
  WEEK.forEach((day, i) => {
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
      } else {
        lane.append(el('div', 'lane-title', row.label));
      }
      lane.append(...content);
      card.append(lane);
    }
    board.append(card);
  });
}

// ---------- lifecycle ----------
async function refresh() {
  const ws = currentWeekStart();
  if (ws !== weekStart) {
    week = { meals: {}, tasks: {}, notes: '' }; // week rolled over
    weatherFetched = 0;                          // refetch for the new range
  }
  weekStart = ws;
  await Promise.all([fetchWeek(), fetchWeather()]);
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

applyTheme();
weekStart = currentWeekStart();
document.getElementById('notes-strip').addEventListener('click', openNotesEditor);
narrowMq.addEventListener('change', renderBoard);
refresh();
setInterval(refresh, POLL_MS);
setInterval(tick, TICK_MS);
