# Weekly Routine — Source of Truth

This is the canonical description of the recurring week. It feeds the frontend template
config (`public/config.js`). Update this doc first when the routine changes, then the code.

## Conventions
- **Week starts Sunday**, column order **Sun → Sat** (Sunday prep sets up the week).
- **D/P** = same person does **both** drop-off and pickup. If they ever differ, split into
  separate drop / pick fields (the data model supports it — see ARCHITECTURE).
- Parent work locations: `city` (Sydney CBD), `wfh`, `parramatta`.
- Kid care locations: `daycare`, `grandparents` (at Mascot), `home`, or an activity.

## People + colors
| id | name | short | role | color |
|---|---|---|---|---|
| `sabeeh` | Sabeeh | Sab | dad | `#3B82F6` (blue) |
| `raya` | Raya | Raya | mum | `#A855F7` (violet) |
| `illy` | Illy | Illy | 3yo | `#14B8A6` (teal) |
| `ismail` | Ismail | Ismail | 8mo | `#F59E0B` (amber) |

## Locations
| id | label | sub | note |
|---|---|---|---|
| `city` | City | | Sydney CBD |
| `wfh` | WFH | | working from home |
| `parramatta` | Parramatta | | |
| `daycare` | Daycare | | colored chip (rose) |
| `grandparents` | Mascot | | childcare at grandparents' (displayed as just "Mascot"); colored chip (green) |
| `home` | Home | | kid at home with parent(s) |

## Day by day

### Sunday — prep day (no work)
- **Sabeeh:** iron shirts.
- **Raya:** prep work outfits.
- **Shared prep tasks (checkable, reset weekly):**
  - Afternoon — **weekly meal prep**
  - **Groceries**
  - Evening — **arrange kids' clothes for the week**
  - Evening — **pack kids' bags**
  - Sabeeh — **iron shirts**
  - Raya — **prep work outfits**

### Monday
- Sabeeh: **City** · Raya: **WFH**
- Illy: **Daycare** — Raya D/P
- Ismail: **Daycare** — Raya D/P
- Evening: —

### Tuesday
- Sabeeh: **City** · Raya: **Parramatta**
- Illy: **Daycare** — Raya D/P
- Ismail: **Grandparents' (Mascot)** — Sabeeh D/P
- Evening: **Raya — pilates**

### Wednesday
- Sabeeh: **City** · Raya: **City**
- Illy: **Grandparents' (Mascot)** — Sabeeh D/P
- Ismail: **Grandparents' (Mascot)** — Sabeeh D/P
- Evening: **Family dinner at grandparents' (Mascot)** — this doubles as Wed's dinner (no home cook).

### Thursday
- Sabeeh: **City** · Raya: **Parramatta**
- Illy: **Grandparents' (Mascot)** — Sabeeh D/P
- Ismail: **Daycare** — Raya D/P
- Evening: **Sabeeh — futsal**
- Chores: **bins, fridge**

### Friday
- Sabeeh: **WFH** · Raya: **WFH**
- Illy: **Daycare** — Sabeeh D/P
- Ismail: **Home** (both parents WFH)
- Evening: —
- Chores: **laundry, tidy, toilets, vacuum, meal plan**

### Saturday
- No work.
- Illy: **swimming (morning)**
- Raya: **pilates (morning)**
- **Family fun adventure day** 🎉
- Chores: **laundry, study**

## Meals (dynamic, editable per week)
Meals are **not** part of the fixed template — they're editable weekly with "who cooks"
(cook shown in that person's color). Wednesday is pre-set to the grandparents' family
dinner. Everything else is filled in each week (target of Sunday meal prep).

## Quick logistics matrix (for sanity-checking the build)
| Day | Sabeeh | Raya | Illy | Ismail | Evening |
|---|---|---|---|---|---|
| Sun | iron shirts | prep outfits | — | — | meal prep · kids' clothes · pack bags |
| Mon | City | WFH | Daycare · Raya D/P | Daycare · Raya D/P | — |
| Tue | City | Parramatta | Daycare · Raya D/P | Grandparents · Sab D/P | Raya pilates |
| Wed | City | City | Grandparents · Sab D/P | Grandparents · Sab D/P | Family dinner @ Mascot |
| Thu | City | Parramatta | Grandparents · Sab D/P | Daycare · Raya D/P | Sab futsal |
| Fri | WFH | WFH | Daycare · Sab D/P | Home | — |
| Sat | — | pilates (AM) | swimming (AM) | — | — |
