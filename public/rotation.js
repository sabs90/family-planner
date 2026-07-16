// Rotating chores: a task with `rotate: [pidOrNull, pidOrNull, …]` cycles
// through the array week by week — rotate[weekIndex % length] is on duty,
// and a null slot means the chore is off (hidden) that week.
// e.g. Meal plan  { rotate: ['sabeeh', 'raya'] }  → Sab week A, Raya week B
//      Batch cook { rotate: ['sabeeh', null] }    → Sab week A, off week B
import { FAMILY, PARENTS } from './config.js';

// Anchor Monday: the week of 2026-07-13 is "week A" (rotation index 0).
// To flip every rotation by a week, move this one week either way.
export const ROTATION_EPOCH = '2026-07-13';

function weeksSince(weekStartIso) {
  const [y, m, d] = weekStartIso.split('-').map(Number);
  const [ey, em, ed] = ROTATION_EPOCH.split('-').map(Number);
  // Math.round absorbs the DST hour between two local midnights.
  return Math.round((new Date(y, m - 1, d) - new Date(ey, em - 1, ed)) / 604_800_000);
}

// Who's on a task for the given week: rotating tasks resolve via the cycle,
// fixed tasks fall back to personId. hidden = rotating task's off-week.
export function taskAssignee(task, weekStartIso) {
  if (!Array.isArray(task.rotate) || !task.rotate.length) {
    return { pid: task.personId || null, rotates: false, hidden: false };
  }
  const len = task.rotate.length;
  const idx = ((weeksSince(weekStartIso) % len) + len) % len;
  const pid = task.rotate[idx] || null;
  return { pid, rotates: true, hidden: !pid };
}

// <select> value encoding for rotate arrays ('' keeps plain personId values
// distinguishable): ['sabeeh', null] ⇄ 'rot:sabeeh,'
export const encodeRotate = (rotate) => 'rot:' + rotate.map((p) => p || '').join(',');

export function decodeRotate(value) {
  if (typeof value !== 'string' || !value.startsWith('rot:')) return null;
  return value.slice(4).split(',').map((p) => p || null);
}

// Options for the "who" <select> in the chore editors. Labels are phrased
// relative to the week being edited ("this wk" = weekStartIso's week), but the
// stored arrays are anchored to ROTATION_EPOCH so they mean the same thing
// no matter which week they were created from.
export function rotationOptions(weekStartIso) {
  const p = ((weeksSince(weekStartIso) % 2) + 2) % 2;
  const mk = (thisWk, nextWk) => {
    const arr = [null, null];
    arr[p] = thisWk;
    arr[1 - p] = nextWk;
    return arr;
  };
  const S = (pid) => FAMILY[pid].short;
  const [a, b] = PARENTS;
  const opts = [
    { rotate: mk(a, b), label: `🔁 ${S(a)} this wk ⇄ ${S(b)}` },
    { rotate: mk(b, a), label: `🔁 ${S(b)} this wk ⇄ ${S(a)}` },
  ];
  for (const pid of PARENTS) {
    opts.push({ rotate: mk(pid, null), label: `${S(pid)} · alt wks (on this wk)` });
    opts.push({ rotate: mk(null, pid), label: `${S(pid)} · alt wks (off this wk)` });
  }
  return opts.map((o) => ({ ...o, value: encodeRotate(o.rotate) }));
}
