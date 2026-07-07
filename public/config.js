// Static config: people and locations. The weekly routine itself now lives
// server-side (GET/PUT /api/template) and is editable in-app — seed default in
// server/default-template.js, human-readable doc in docs/SCHEDULE.md.

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

// Which locations make sense in each group's editors.
export const PARENT_LOCS = ['city', 'wfh', 'parramatta'];
export const KID_LOCS = ['daycare', 'grandparents', 'home'];
