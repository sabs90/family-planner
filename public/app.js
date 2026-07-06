import { FAMILY, PARENTS, KIDS, LOCATIONS, WEEK } from './config.js';

const POLL_MS = 20_000;   // dynamic-state poll
const TICK_MS = 30_000;   // clock / today / theme recompute
const LIGHT_FROM = 7;     // auto theme: light 07:00–18:59
const DARK_FROM = 19;

// ---------- state ----------
let weekStart = null;       // 'YYYY-MM-DD' of this week's Sunday
let week = { meals: {}, tasks: {}, notes: '' };  // dynamic state from server
let editing = false;        // true while an inline editor is open → pause re-render

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
  const strip = document.getElementById('notes-strip');
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

// ---------- render: board ----------
function renderBoard() {
  if (editing) return; // don't clobber an open editor on poll
  const board = document.getElementById('board');
  board.textContent = '';
  const todayIso = iso(new Date());

  WEEK.forEach((day, i) => {
    const date = dateOfDay(i);
    const dayIso = iso(date);
    const col = el('section', 'day-col');
    if (dayIso === todayIso) col.classList.add('today');
    else if (dayIso < todayIso) col.classList.add('past');

    // Day header
    const head = el('div', 'day-head');
    const name = el('span', 'day-name', day.label);
    if (dayIso === todayIso) name.append(el('span', 'today-badge', 'Today'));
    head.append(name, el('span', 'day-date', String(date.getDate())));
    col.append(head);

    col.append(renderParentsLane(day));
    col.append(renderKidsLane(day));
    col.append(renderMealLane(day));
    if (day.evening.length) col.append(renderEveningLane(day));
    if (day.tasks.length) col.append(renderTasksLane(day));

    board.append(col);
  });
}

function locChip(entry) {
  if (entry.activity) {
    const chip = el('span', 'loc');
    chip.append(
      el('span', null, entry.icon || '•'),
      el('span', null, entry.activity),
    );
    if (entry.time) chip.append(el('span', 'sub', entry.time));
    return chip;
  }
  const loc = LOCATIONS[entry.loc];
  const chip = el('span', 'loc');
  chip.append(el('span', null, loc.icon), el('span', null, loc.label));
  if (loc.sub) chip.append(el('span', 'sub', loc.sub));
  return chip;
}

function renderParentsLane(day) {
  const lane = el('div', 'lane');
  lane.append(el('div', 'lane-title', 'Parents'));
  for (const id of PARENTS) {
    const row = personColor(el('div', 'person-row'), id);
    row.append(el('span', 'dot'), el('span', 'person-name', FAMILY[id].short));
    const entry = day.parents[id];
    row.append(entry ? locChip(entry) : el('span', 'none', '—'));
    lane.append(row);
  }
  return lane;
}

function renderKidsLane(day) {
  const lane = el('div', 'lane');
  lane.append(el('div', 'lane-title', 'Kids'));
  for (const id of KIDS) {
    const entry = day.kids[id];
    const wrap = el('div', 'kid-row');
    const row = personColor(el('div', 'person-row'), id);
    row.append(el('span', 'dot'), el('span', 'person-name', FAMILY[id].short));
    row.append(entry ? locChip(entry) : el('span', 'none', '—'));
    wrap.append(row);

    // D/P ownership — the most important info on the board
    if (entry) {
      const dpLine = el('div', 'dp-line');
      if (entry.dp) {
        const chip = personColor(el('span', 'dp-chip'), entry.dp);
        chip.append(el('span', null, `${FAMILY[entry.dp].short} · drop + pick`));
        dpLine.append(chip);
      } else if (entry.drop || entry.pick) {
        for (const [verb, pid] of [['drop', entry.drop], ['pick', entry.pick]]) {
          if (!pid) continue;
          const chip = personColor(el('span', 'dp-chip'), pid);
          chip.append(el('span', null, `${FAMILY[pid].short} · ${verb}`));
          dpLine.append(chip, document.createTextNode(' '));
        }
      }
      if (dpLine.childNodes.length) wrap.append(dpLine);
    }
    lane.append(wrap);
  }
  return lane;
}

function renderMealLane(day) {
  const lane = el('div', 'lane meal-lane');
  lane.append(el('div', 'lane-title', 'Dinner'));

  if (day.mealFixed) {
    const row = el('div', 'meal-row meal-fixed');
    row.append(el('span', null, '🍽️'), el('span', 'meal-dish', day.mealFixed.dish));
    lane.append(row);
    return lane;
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
  row.addEventListener('click', () => openMealEditor(lane, row, day));
  lane.append(row);
  return lane;
}

function openMealEditor(lane, row, day) {
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

function renderEveningLane(day) {
  const lane = el('div', 'lane');
  lane.append(el('div', 'lane-title', 'Evening'));
  for (const ev of day.evening) {
    const chip = personColor(el('span', 'evening-chip'), ev.personId);
    if (ev.icon) chip.append(el('span', null, ev.icon));
    chip.append(el('span', null, ev.personId ? `${FAMILY[ev.personId].short} · ${ev.label}` : ev.label));
    lane.append(chip);
  }
  return lane;
}

function renderTasksLane(day) {
  const lane = el('div', 'lane');
  lane.append(el('div', 'lane-title', 'Prep'));
  for (const task of day.tasks) {
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
    lane.append(row);
  }
  return lane;
}

// ---------- lifecycle ----------
async function refresh() {
  const ws = currentWeekStart();
  if (ws !== weekStart) week = { meals: {}, tasks: {}, notes: '' }; // week rolled over
  weekStart = ws;
  await fetchWeek();
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
refresh();
setInterval(refresh, POLL_MS);
setInterval(tick, TICK_MS);
