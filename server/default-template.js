// Seed routine — used only until the first saved edit creates data/template.json.
// Human-readable source of truth: docs/SCHEDULE.md.

// Reusable activity catalog for the board's activity picker; grows via "add new".
export const DEFAULT_ACTIVITIES = [
  { label: 'Pilates', icon: '🧘' },
  { label: 'Futsal', icon: '⚽' },
  { label: 'Swimming', icon: '🏊' },
  { label: 'Family dinner @ Mascot', icon: '🍽️' },
  { label: 'Family fun adventure day', icon: '🎉' },
];

export const DEFAULT_WEEK = [
  {
    key: 'sunday', label: 'Sunday',
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
    key: 'monday', label: 'Monday',
    parents: { sabeeh: { loc: 'city' }, raya: { loc: 'wfh' } },
    kids: {
      illy:   { loc: 'daycare', dp: 'raya' },
      ismail: { loc: 'daycare', dp: 'raya' },
    },
    events: [],
    tasks: [],
  },
  {
    key: 'tuesday', label: 'Tuesday',
    parents: { sabeeh: { loc: 'city' }, raya: { loc: 'parramatta' } },
    kids: {
      illy:   { loc: 'daycare',      dp: 'raya' },
      ismail: { loc: 'grandparents', dp: 'sabeeh' },
    },
    events: [{ label: 'Pilates', personId: 'raya', icon: '🧘' }],
    tasks: [],
  },
  {
    key: 'wednesday', label: 'Wednesday',
    parents: { sabeeh: { loc: 'city' }, raya: { loc: 'city' } },
    kids: {
      illy:   { loc: 'grandparents', dp: 'sabeeh' },
      ismail: { loc: 'grandparents', dp: 'sabeeh' },
    },
    events: [{ label: 'Family dinner @ Mascot', icon: '🍽️' }],
    tasks: [],
    mealFixed: { dish: 'Dinner at grandparents’' },
  },
  {
    key: 'thursday', label: 'Thursday',
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
    key: 'friday', label: 'Friday',
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
    key: 'saturday', label: 'Saturday',
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
