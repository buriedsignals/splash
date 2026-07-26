---
id: calendar
engines:
  chart-native: calendar
intent: [change-over-time]
shape: structural
limits: {}
formats: [static, interactive, video]
bestFor:
  - "a long run of daily values where seasonality, day-of-week pattern, and outlier days are the story — cases, crimes, hires, temperatures over a year"
notFor:
  - "precise day-to-day comparison — colour is read approximately; use a line and label, or rely on hover, for exact values"
  - "sparse/irregular data — a calendar implies every day; gaps mislead"
  - "a short span — a few weeks is better as a bar or line"
---

# Calendar heatmap — per-type best practice (L2)

> Sources: FT Visual Vocabulary (the canon) — "change over time" / temporal heatmap · the GitHub
> contributions calendar (the canonical form) · data-to-viz.com. credited.
> Inherits: `global/dataviz.md` (L0) and the heatmap colour rules (sequential, monotonic luminance).

A calendar heatmap lays out **one cell per day** in a grid — weeks as columns, weekdays as rows — and
colours each by its value. It answers **"what's the daily PATTERN over a long span — seasonality, the
weekly rhythm, the spikes"** at a glance, the way a line can't for 365 noisy points.

## When to use / when NOT — read the caveats first

- **Use** for: a long run of DAILY values where seasonality + day-of-week pattern + outlier days are the
  story — cases, crimes, hires, temperatures over a year.
- **Not** for: precise day-to-day comparison — colour is read approximately; for exact values use a line
  and label, or rely on hover.
- **Not** for: sparse/irregular data — a calendar implies every day; gaps mislead.
- **Not** for: a short span — a few weeks is better as a bar or line.

## Correctness "de base" (calendar-specific)

1. **A SEQUENTIAL single-hue ramp with monotonic luminance** (inherited heatmap rule) — CVD-safe and
   greyscale-readable; never a rainbow. → `checkCalendarConformance`.
2. **One cell per real day**, weeks in columns, weekdays in rows; month boundaries marked and labelled,
   weekday labels on the side.
3. **A colourbar legend** with the value range; label the unit.
4. **Square-ish cells**, a thin gap so days read as a grid.

## data-to-viz caveats (credited)

- Colour encodes value poorly for fine differences — a calendar is for PATTERN, not precise reading.
  Anchor the ramp at a meaningful range and let hover give the exact day value.

## Motion grammar (how a calendar *builds*)

See `formats/video.md`; the gesture:

- the cells **fade/scale in week by week, left → right**, so the year fills in chronologically; the month
  labels + colourbar fade in with the chrome.
A cell's colour/position is fixed by the layout; only its opacity/scale animates, so frame N is a pure
function of the frame.
