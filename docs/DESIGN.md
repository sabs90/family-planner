# Design System

## References / north star
Blend the best of the genre:
- **Skylight Calendar** — color-per-person coding, warm/clean, chore chart.
- **Hearth Display** — "family operating system" logistics focus, routines.
- **DAKboard** — clean wall-dashboard aesthetic for a browser-on-a-screen.

Goal aesthetic: a **premium, calm family display** — not a spreadsheet. Big type, generous
spacing, color used meaningfully (person identity + drop-off/pickup ownership).

## Layout — landscape, days as columns
- **Header bar:** title, live date + clock, current week range (e.g. "5–11 Jul"). Subtle.
- **7 day columns**, order **Sun → Sat**.
  - **Today's column auto-highlights** (accent border/tint). Past days slightly dimmed.
  - Highlight recomputes each minute so it advances at midnight.
- Optimize for ~1080p landscape (tablet or monitor). ~1/7 width per column is enough for
  stacked chips. Must stay readable from across a room — no tiny text.

## Column anatomy (top → bottom)
1. **Day header** — weekday + date number. Today = accent.
2. **Parents lane** — two rows (Sabeeh, Raya): person color dot + work-location badge
   (City / WFH / Parramatta). On weekends, show weekend state or their activity instead.
3. **Kids lane** — two rows (Illy, Ismail): person color dot + care location
   (Daycare / Grandparents' / Home / activity) + a **D/P chip** in the responsible parent's
   color ("Raya · drop + pick"). Render one combined chip when drop == pick; split into two
   chips if they ever differ.
4. **Dinner lane** — dish text + a dot in the **cook's** color. Editable. Wed = "Family
   dinner @ Mascot" (no cook dot).
5. **Evening / activities** — chips: pilates (Raya color), futsal (Sab color), swimming
   (Illy color), family dinner (neutral/warm).
6. **Tasks lane** — checkable prep items (mostly Sunday). Checkbox + label; checked = struck
   through / muted. State persists per week and resets weekly.

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
