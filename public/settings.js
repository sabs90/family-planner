// Routine settings: edit the standing weekly template (GET/PUT /api/template).
// One-off "this week" changes are made on the board itself, not here.
import { FAMILY, PARENTS, KIDS, LOCATIONS, PARENT_LOCS, KID_LOCS } from './config.js';

let week = null; // working copy of the template
let settings = { prayerView: 'countdown' }; // display prefs, saved immediately on change

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text != null) node.textContent = text;
  return node;
}

const slugify = (label) =>
  label.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'task';

// ---------- person editors (select + optional custom activity) ----------
function personRow(day, group, id) {
  const entry = day[group][id];
  const row = el('div', 'set-row');
  const name = el('span', 'set-name', FAMILY[id].short);
  name.style.setProperty('--pc', `var(--c-${id})`);
  row.append(el('span', 'dot set-dot'), name);
  row.querySelector('.set-dot').style.background = `var(--c-${id})`;

  const locSel = document.createElement('select');
  locSel.append(new Option('—', ''));
  for (const locId of (group === 'kids' ? KID_LOCS : PARENT_LOCS)) {
    locSel.append(new Option(`${LOCATIONS[locId].icon} ${LOCATIONS[locId].label}`, locId));
  }
  locSel.value = entry?.loc || '';

  const act = document.createElement('input');
  act.type = 'text';
  act.placeholder = 'or activity (e.g. Pilates)';
  act.value = entry?.activity || '';

  const time = document.createElement('input');
  time.type = 'text';
  time.className = 'set-time';
  time.placeholder = 'AM';
  time.value = entry?.time || '';

  const write = () => {
    if (act.value.trim()) {
      day[group][id] = { activity: act.value.trim() };
      if (time.value.trim()) day[group][id].time = time.value.trim();
      if (entry?.icon) day[group][id].icon = entry.icon;
      locSel.value = '';
    } else if (locSel.value) {
      day[group][id] = { loc: locSel.value };
    } else {
      day[group][id] = null;
    }
    if (group === 'kids' && day[group][id]?.loc) {
      const dropV = dropSel.value, pickV = pickSel.value;
      if (dropV && dropV === pickV) day[group][id].dp = dropV;
      else {
        if (dropV) day[group][id].drop = dropV;
        if (pickV) day[group][id].pick = pickV;
      }
    }
  };

  let dropSel = null, pickSel = null;
  if (group === 'kids') {
    dropSel = document.createElement('select');
    dropSel.append(new Option('Drop: —', ''));
    for (const pid of PARENTS) dropSel.append(new Option(`Drop: ${FAMILY[pid].short}`, pid));
    dropSel.value = entry?.dp || entry?.drop || '';
    dropSel.addEventListener('change', write);

    pickSel = document.createElement('select');
    pickSel.append(new Option('Pick: —', ''));
    for (const pid of PARENTS) pickSel.append(new Option(`Pick: ${FAMILY[pid].short}`, pid));
    pickSel.value = entry?.dp || entry?.pick || '';
    pickSel.addEventListener('change', write);
  }

  locSel.addEventListener('change', () => { act.value = ''; write(); });
  act.addEventListener('input', write);
  time.addEventListener('input', write);

  row.append(locSel);
  if (dropSel) row.append(dropSel, pickSel);
  row.append(act, time);
  return row;
}

// ---------- list editors (activities / chores) ----------
function eventRow(day, ev) {
  const row = el('div', 'set-row');
  const icon = document.createElement('input');
  icon.type = 'text';
  icon.className = 'set-icon';
  icon.placeholder = '🎉';
  icon.value = ev.icon || '';
  icon.addEventListener('input', () => { ev.icon = icon.value.trim(); });

  const label = document.createElement('input');
  label.type = 'text';
  label.placeholder = 'Activity';
  label.value = ev.label || '';
  label.addEventListener('input', () => { ev.label = label.value; });

  const who = document.createElement('select');
  who.append(new Option('Everyone', ''));
  for (const [pid, p] of Object.entries(FAMILY)) who.append(new Option(p.short, pid));
  who.value = ev.personId || '';
  who.addEventListener('change', () => { ev.personId = who.value || undefined; });

  const rm = el('button', 'rm-btn', '✕');
  rm.addEventListener('click', () => {
    day.events.splice(day.events.indexOf(ev), 1);
    row.remove();
  });

  row.append(icon, label, who, rm);
  return row;
}

function taskRow(day, task) {
  const row = el('div', 'set-row');
  const label = document.createElement('input');
  label.type = 'text';
  label.placeholder = 'Chore';
  label.value = task.label || '';
  label.addEventListener('input', () => { task.label = label.value; });

  const who = document.createElement('select');
  who.append(new Option('Anyone', ''));
  for (const pid of PARENTS) who.append(new Option(FAMILY[pid].short, pid));
  who.value = task.personId || '';
  who.addEventListener('change', () => { task.personId = who.value || undefined; });

  const when = document.createElement('input');
  when.type = 'text';
  when.className = 'set-time';
  when.placeholder = 'When';
  when.value = task.when || '';
  when.addEventListener('input', () => { task.when = when.value.trim() || undefined; });

  const rm = el('button', 'rm-btn', '✕');
  rm.addEventListener('click', () => {
    day.tasks.splice(day.tasks.indexOf(task), 1);
    row.remove();
  });

  row.append(label, who, when, rm);
  return row;
}

function addBtn(text, onClick) {
  const btn = el('button', 'add-btn', text);
  btn.addEventListener('click', onClick);
  return btn;
}

// ---------- page ----------
function renderDay(day) {
  const card = el('section', 'set-day');
  card.append(el('h2', null, day.label));

  const people = el('div', 'set-block');
  people.append(el('div', 'set-block-title', 'People'));
  for (const id of PARENTS) people.append(personRow(day, 'parents', id));
  for (const id of KIDS) people.append(personRow(day, 'kids', id));
  card.append(people);

  const meals = el('div', 'set-block');
  meals.append(el('div', 'set-block-title', 'Fixed dinner (blank = plan weekly)'));
  const fixed = document.createElement('input');
  fixed.type = 'text';
  fixed.placeholder = 'e.g. Dinner at grandparents’';
  fixed.value = day.mealFixed?.dish || '';
  fixed.addEventListener('input', () => {
    if (fixed.value.trim()) day.mealFixed = { dish: fixed.value.trim() };
    else delete day.mealFixed;
  });
  meals.append(fixed);
  card.append(meals);

  const events = el('div', 'set-block');
  events.append(el('div', 'set-block-title', 'Activities'));
  const evList = el('div', 'set-list');
  for (const ev of day.events) evList.append(eventRow(day, ev));
  events.append(evList, addBtn('+ activity', () => {
    const ev = { label: '' };
    day.events.push(ev);
    evList.append(eventRow(day, ev));
  }));
  card.append(events);

  const chores = el('div', 'set-block');
  chores.append(el('div', 'set-block-title', 'Chores'));
  const taskList = el('div', 'set-list');
  for (const task of day.tasks) taskList.append(taskRow(day, task));
  chores.append(taskList, addBtn('+ chore', () => {
    const task = { label: '' };
    day.tasks.push(task);
    taskList.append(taskRow(day, task));
  }));
  card.append(chores);

  return card;
}

function cleanup() {
  // Drop empty rows; give new chores stable unique slugs (renaming a chore's
  // label keeps its slug, so this week's tick state survives).
  for (const day of week) {
    day.events = day.events.filter((ev) => ev.label && ev.label.trim());
    day.tasks = day.tasks.filter((t) => t.label && t.label.trim());
    const used = new Set(day.tasks.map((t) => t.slug).filter(Boolean));
    for (const t of day.tasks) {
      if (t.slug) continue;
      let slug = slugify(t.label), n = 2;
      while (used.has(slug)) slug = `${slugify(t.label)}-${n++}`;
      used.add(slug);
      t.slug = slug;
    }
  }
}

async function putTemplate(body) {
  return fetch('/api/template', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }).catch(() => null);
}

async function save() {
  cleanup();
  const status = document.getElementById('save-status');
  const res = await putTemplate({ week, settings });
  if (res && res.ok) {
    status.textContent = '✓ Saved — the board updates within ~20s';
    setTimeout(() => { status.textContent = ''; }, 4000);
  } else {
    status.textContent = '✗ Save failed — is the server up?';
  }
}

async function init() {
  document.documentElement.dataset.theme =
    localStorage.getItem('themeMode') === 'dark' ? 'dark'
    : localStorage.getItem('themeMode') === 'light' ? 'light'
    : (new Date().getHours() >= 7 && new Date().getHours() < 19 ? 'light' : 'dark');

  const res = await fetch('/api/template');
  const t = await res.json();
  week = t.week;
  settings = t.settings || { prayerView: 'countdown' };

  const prayerViewSelect = document.getElementById('prayer-view-select');
  prayerViewSelect.value = settings.prayerView;
  prayerViewSelect.addEventListener('change', () => {
    settings = { ...settings, prayerView: prayerViewSelect.value };
    putTemplate({ week, settings });
  });

  const days = document.getElementById('days');
  for (const day of week) days.append(renderDay(day));
  document.getElementById('save-btn').addEventListener('click', save);
}

init();
