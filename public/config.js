// Static template — the recurring weekly routine.
// Source of truth: docs/SCHEDULE.md. Update the doc first, then this file.

export const FAMILY = {
  sabeeh: { name: 'Sabeeh', short: 'Sab', role: 'dad' },
  raya:   { name: 'Raya',   short: 'Raya', role: 'mum' },
  illy:   { name: 'Illy',   short: 'Illy', role: '3yo' },
  ismail: { name: 'Ismail', short: 'Ismail', role: '8mo' },
};

export const PARENTS = ['sabeeh', 'raya'];
export const KIDS = ['illy', 'ismail'];

// `c` = CSS color slug (--c-<slug>) for tinted chips; others render neutral.
export const LOCATIONS = {
  city:         { label: 'City',       icon: '🏙️' },
  wfh:          { label: 'WFH',        icon: '🏠' },
  parramatta:   { label: 'Parramatta', icon: '🚆' },
  daycare:      { label: 'Daycare',    icon: '🧸', c: 'daycare' },
  grandparents: { label: 'Mascot',     icon: '👵', c: 'mascot' },
  home:         { label: 'Home',       icon: '🏠' },
};

// Week starts Sunday (Sunday prep sets up the week).
// Kid entries: { loc, dp } where dp = parent doing BOTH drop-off and pickup.
// If drop/pick ever differ, use { drop: 'raya', pick: 'sabeeh' } instead of dp.
// `events` = activities/evening chips; `tasks` = checkable chores (reset weekly).
export const WEEK = [
  {
    key: 'sunday', label: 'Sunday', shortLabel: 'Sun',
    parents: { sabeeh: null, raya: null },
    kids: { illy: { loc: 'home' }, ismail: { loc: 'home' } },
    events: [],
    tasks: [
      { slug: 'meal-prep',    label: 'Weekly meal prep',      when: 'Arvo' },
      { slug: 'groceries',    label: 'Groceries' },
      { slug: 'kids-clothes', label: 'Arrange kids’ clothes', when: 'Evening' },
      { slug: 'pack-bags',    label: 'Pack kids’ bags',       when: 'Evening' },
      { slug: 'iron-shirts',  label: 'Iron shirts',           personId: 'sabeeh' },
      { slug: 'prep-outfits', label: 'Prep work outfits',     personId: 'raya' },
    ],
  },
  {
    key: 'monday', label: 'Monday', shortLabel: 'Mon',
    parents: { sabeeh: { loc: 'city' }, raya: { loc: 'wfh' } },
    kids: {
      illy:   { loc: 'daycare', dp: 'raya' },
      ismail: { loc: 'daycare', dp: 'raya' },
    },
    events: [],
    tasks: [],
  },
  {
    key: 'tuesday', label: 'Tuesday', shortLabel: 'Tue',
    parents: { sabeeh: { loc: 'city' }, raya: { loc: 'parramatta' } },
    kids: {
      illy:   { loc: 'daycare',      dp: 'raya' },
      ismail: { loc: 'grandparents', dp: 'sabeeh' },
    },
    events: [{ label: 'Pilates', personId: 'raya', icon: '🧘' }],
    tasks: [],
  },
  {
    key: 'wednesday', label: 'Wednesday', shortLabel: 'Wed',
    parents: { sabeeh: { loc: 'city' }, raya: { loc: 'city' } },
    kids: {
      illy:   { loc: 'grandparents', dp: 'sabeeh' },
      ismail: { loc: 'grandparents', dp: 'sabeeh' },
    },
    events: [{ label: 'Family dinner @ Mascot', icon: '🍽️' }],
    tasks: [],
    // Fixed meal — not editable, not stored server-side.
    mealFixed: { dish: 'Dinner at grandparents’' },
  },
  {
    key: 'thursday', label: 'Thursday', shortLabel: 'Thu',
    parents: { sabeeh: { loc: 'city' }, raya: { loc: 'parramatta' } },
    kids: {
      illy:   { loc: 'grandparents', dp: 'sabeeh' },
      ismail: { loc: 'daycare',      dp: 'raya' },
    },
    events: [{ label: 'Futsal', personId: 'sabeeh', icon: '⚽' }],
    tasks: [
      { slug: 'bins',   label: 'Bins' },
      { slug: 'fridge', label: 'Fridge' },
    ],
  },
  {
    key: 'friday', label: 'Friday', shortLabel: 'Fri',
    parents: { sabeeh: { loc: 'wfh' }, raya: { loc: 'wfh' } },
    kids: {
      illy:   { loc: 'daycare', dp: 'sabeeh' },
      ismail: { loc: 'home' },
    },
    events: [],
    tasks: [
      { slug: 'laundry',   label: 'Laundry' },
      { slug: 'tidy',      label: 'Tidy' },
      { slug: 'toilets',   label: 'Toilets' },
      { slug: 'vacuum',    label: 'Vacuum' },
      { slug: 'meal-plan', label: 'Meal plan' },
    ],
  },
  {
    key: 'saturday', label: 'Saturday', shortLabel: 'Sat',
    parents: {
      sabeeh: null,
      raya: { activity: 'Pilates', time: 'AM', icon: '🧘' },
    },
    kids: {
      illy:   { activity: 'Swimming', time: 'AM', icon: '🏊' },
      ismail: { loc: 'home' },
    },
    events: [{ label: 'Family fun adventure day', icon: '🎉' }],
    tasks: [
      { slug: 'laundry', label: 'Laundry' },
      { slug: 'study',   label: 'Study' },
    ],
  },
];
