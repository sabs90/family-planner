# Decision Log

Newest at bottom. Append with today's date when decisions are made or changed.

## 2026-07-07 — Hardware / display stack
- **NAS-hosted web page** displayed in a fullscreen browser (not native device code, not
  Home Assistant dashboards). Reason: maximizes LLM/vibe-code leverage, decouples content
  from hardware, trivial to iterate.
- **Wall-mounted landscape Android tablet + Fully Kiosk Browser** as display+processor
  (tablet is both). Alt kept in reserve: LCD monitor + Raspberry Pi (Chromium kiosk).
- **Rejected:** e-paper (poor for dense, frequently-updating, color content) and ESP32
  (can't run a browser; fights vibe-coding). Home Assistant not used as display layer;
  optional later as data aggregator only.

## 2026-07-07 — Product framing
- This is a **logistics/ops board**, not a calendar. Priority is drop-off/pickup ownership,
  work locations, and kid care locations being glanceable.

## 2026-07-07 — Requirements Q&A
- **"Mascot" = grandparents' place** (childcare at grandparents', suburb of Mascot);
  distinct from daycare, gets its own label/icon.
- **Layout = landscape, days as columns** (Sun→Sat).
- **Content = fully dynamic + checkable chores** → requires a backend on the Synology
  (chose JSON file store to avoid SQLite native builds). Chores persist and reset weekly.
- **Meals = show dinner per day + who cooks** (cook shown in that person's color).

## 2026-07-07 — Architecture
- Node/Express + JSON file store; template static in frontend, dynamic state via API keyed
  by week (Sunday start). Single Docker container on Synology, data bind-mounted.
- Week starts **Sunday** so Sunday prep sets up the coming week.

## 2026-07-07 — Process
- User will build in a **fresh chat** from these docs. "**end session**" is the trigger to
  update docs (see CLAUDE.md). Nothing built yet this session — docs only.

## 2026-07-07 — Build session Q&A
- **Theme: auto** — light 07:00–18:59, dark otherwise; `?theme=light|dark` URL override.
- **Display target:** ~1080p landscape (no specific tablet chosen yet); responsive down to
  phone (days stack vertically, past days hidden on phone).
- **Notes strip: yes** — slim editable strip under the header for one-off reminders.
- **Scope:** built end-to-end (Phases 0–4) in one go per user choice; design review after.

## 2026-07-07 — Build implementation decisions
- ESM (`"type": "module"`), Express is the only dependency, no frontend build step.
- **Port:** container listens on 3000; compose publishes **host 3210**. Local dev also uses
  3210 (`PORT=3210 npm start`) because Finboard occupies 3000 on the dev machine.
- Fixed meals (Wed grandparents dinner) live only in `config.js` (`mealFixed`) — never
  stored server-side, not editable. Server default week is just `{meals:{},tasks:{},notes:''}`.
- Store keeps state in memory, loads file only at boot, atomic tmp+rename writes.
- Task ids `${day}::${slug}`; kid logistics use `dp` (one parent both ways) with `drop`/`pick`
  split supported by the renderer for future use.
- Icons: consistent emoji set (not SVG) — simplest, renders well on tablets.

## 2026-07-07 — Design review round 1 (after seeing it live)
- **Label rail layout**: board restructured from 7 self-contained day cards to one grid
  with a left label column (Sab / Raya / Illy / Ismail / Dinner / Activities / Chores) —
  names no longer repeat in every day column. Phone keeps stacked day cards (names inline).
- **"Grandparents' Mascot" → "Mascot"**; daycare (rose) vs Mascot (green) get distinct
  tinted chip colors so care location reads at a glance.
- **Weather** added per day header: emoji + min–max °C from **Open-Meteo** (free, no key),
  Mascot coords, fetched client-side, cached 1h, silent on failure.
- **Chores expanded**: Sun + groceries; Thu bins, fridge; Fri laundry, tidy, toilets,
  vacuum, meal plan; Sat laundry, study. Sat also gets "Family fun adventure day" 🎉.
- Lane renamed Evening → **Activities** (now holds daytime events too).
