# Design System

## References / north star
Blend the best of the genre:
- **Skylight Calendar** — color-per-person coding, warm/clean, chore chart.
- **Hearth Display** — "family operating system" logistics focus, routines.
- **DAKboard** — clean wall-dashboard aesthetic for a browser-on-a-screen.

Goal aesthetic: a **premium, calm family display** — not a spreadsheet. Big type, generous
spacing, color used meaningfully (person identity + drop-off/pickup ownership).

## Layout — landscape grid: label rail + days as columns (updated 2026-07-07)
- **Header bar:** title, live date + clock, current week range (e.g. "5–11 Jul"). Subtle.
- The board is **one grid card**: a fixed **left label rail** (~96px) naming each row once,
  then **7 day columns** Sun → Sat. Rationale: names/categories were repeated in every
  column and cluttered the board — the rail declutters it.
- **Rows (top → bottom):** day header (with weather) · Sabeeh · Raya · Illy · Ismail ·
  Dinner · Activities · Chores. Person rows show a color dot + short name (+ role for
  clarity) in the rail; day cells contain only chips, no names.
- **Today's column** tints top-to-bottom, header cell solid accent. Past columns dimmed.
  Highlight recomputes each minute so it advances at midnight.
- **Weather** per day in the header cell: condition emoji + `min°–max°` (Open-Meteo,
  Mascot coords, cached 1h, silently absent when offline).
- Optimize for ~1080p landscape. Must stay readable from across a room — no tiny text.

## Cell contents
1. **Parent cells** — work-location chip (City / WFH / Parramatta), or activity chip on
   weekends (Raya Sat pilates), else "—".
2. **Kid cells** — care-location chip + a **D/P chip** in the responsible parent's color
   ("Raya · drop + pick"). One combined chip when drop == pick; split into two if they differ.
   **Daycare and Mascot location chips are color-tinted** (rose / green) so care location
   pops at a glance; other locations stay neutral.
3. **Dinner cells** — dish text + cook chip in the cook's color. Editable. Wed = fixed
   "Dinner at grandparents'" (no cook).
4. **Activities cells** — chips: pilates (Raya color), futsal (Sab color), family dinner and
   Sat "Family fun adventure day" (neutral).
5. **Chores cells** — checkable items (Sun prep + groceries; Thu bins/fridge; Fri laundry/
   tidy/toilets/vacuum/meal plan; Sat laundry/study). Checked = struck through / muted.
   State persists per week and resets weekly.

## Color system
Person identity colors (accessible, well-separated, work in light + dark):
| Person | Hex |
|---|---|
| Sabeeh | `#3B82F6` blue |
| Raya | `#A855F7` violet |
| Illy | `#14B8A6` teal |
| Ismail | `#F59E0B` amber |

- Use color for **identity and ownership**, not decoration. A D/P chip's color answers
  "whose job is this?" instantly.
- Provide light + dark theming (the display may be wall-lit day/night). Use CSS variables;
  give slightly lightened person colors for dark backgrounds so text stays legible.
- Meet contrast: colored chips carry a text label too (never color alone) for accessibility.

## Iconography
Small, restrained set (inline SVG preferred; a few tasteful emoji acceptable):
- Locations: City, WFH/Home, Parramatta (train), Daycare, Grandparents'.
- Activities: pilates, futsal, swimming, dinner.
Keep one visual language; don't mix heavy emoji with line icons.

## Typography
- Large, friendly, high-legibility sans. Clear weight hierarchy: day headers bold, labels
  medium, secondary info lighter. Numbers (dates, times) tabular.

## Interaction
- **Wall display:** read-mostly, auto-refresh. Tapping a task toggles it (kiosk touch).
- **Phone (responsive):** same app, narrower viewport → columns stack vertically. This is
  where meals/notes get edited and tasks ticked off on the go.
- Optimistic updates: reflect immediately, then PATCH; reconcile on next poll.
- Empty states: unfilled meal shows a subtle "add dinner" affordance.

## Things to get right
- The drop-off/pickup ownership must be the most scannable thing on the board — it's the
  reason this exists.
- Today must be unmistakable at a glance.
- Sunday is denser (prep checklist) — design the column to handle more items gracefully.
