# Project: Family Weekly Ops Board

## Goal
A glanceable wall display that keeps the family on track through the week. The core value
is **logistics coordination** — at a glance you can see, for any day:
- Where each parent is working (City / WFH / Parramatta).
- Where each kid is (Daycare / Grandparents' at Mascot / Home / an activity).
- **Who is doing drop-off and pickup** for each kid (the real coordination pain point).
- Dinner and who's cooking.
- Evening commitments (Raya pilates, Sabeeh futsal, family dinner at grandparents').
- Weekly prep chores (Sunday), checkable, that reset each week.

This is explicitly **not** a general calendar (Cozi/Google Calendar already exist). It's a
stable, repeating *operating rhythm* for the week, with a few editable slots (meals, notes,
one-off changes) and check-off-able prep tasks.

## Family
| Person | Role | Notes |
|---|---|---|
| **Sabeeh** ("Sab") | Dad | Works City most days; futsal Thu night |
| **Raya** | Mum | Works City / Parramatta / WFH; pilates Tue night + Sat AM |
| **Illy** | 3yo | Daycare / grandparents; swimming Sat AM |
| **Ismail** | 8 months | Daycare / grandparents / home |

"**Mascot**" in the routine = the **grandparents' place** (suburb of Mascot), used as
childcare on some days — distinct from daycare.

## Success criteria
- From across the room you can answer "who's got the kids today and where's everyone?" in
  ~2 seconds.
- Sunday prep chores are visible and can be ticked off; they reset for the new week.
- Meals for the week are visible with who's cooking.
- Editable from a phone (same web app, responsive) without touching the wall display.
- Runs 24/7 on the Synology, survives reboots, updates on its own.

## Hardware / display stack (updated 2026-07-07)
- **Content:** web page hosted on the **Synology NAS** (Docker), shown in a fullscreen
  browser. Decouples content from hardware; maximizes LLM/vibe-code leverage.
- **Display:** **monitor driven by a Raspberry Pi 4B (4GB)** running Chromium in kiosk mode
  pointed at the NAS URL. Bigger screen than a tablet; Pi is processor, monitor is display.
- **Rejected for this use case:** e-paper (bad at dense/frequently-updating color content)
  and ESP32 (can't run a browser; fights vibe-coding). Android tablet + Fully Kiosk was the
  original plan but dropped in favor of a bigger monitor.
- **Home Assistant:** not the display layer. Optional later as a *data aggregator* only.

See `docs/DECISIONS.md` for the full rationale behind each choice.
