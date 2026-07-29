---
id: gantt
engines: {}
unreachable: "chart-native has no MAPPERS entry for gantt (deferred: \"family-B: needs start/end intervals\", native-types.ts) — no spec can reach it today"
intent: [change-over-time]
shape: structural
limits: {}
formats: [static, interactive, video]
bestFor:
  - "a handful of dated spans where duration and overlap are the story — phases of a programme, stages of an inquiry, overlapping terms"
notFor:
  - "instants with no duration — use a dot/event timeline; a Gantt bar of zero width is a dot"
  - "many rows — it becomes a wall; group or filter to the spans that matter"
  - "magnitude — the bar's length is duration (time), never a quantity; don't mix the two"
---

# Gantt / timeline (time spans) — per-type best practice (L2)

> Sources: FT Visual Vocabulary (the canon) — "change over time" / spans · Priestley (the timeline of
> lifespans) · data-to-viz.com. credited.
> Inherits: `global/dataviz.md` (L0). A duration layout on a real time axis.

A Gantt/timeline draws each item as a **horizontal bar spanning its start → end on a shared, to-scale
time axis**. It answers **"when did each thing happen, how long did it last, and what overlapped"** —
project phases, event durations, tenures, lifespans.

## When to use / when NOT — read the caveats first

- **Use** for: a handful of dated SPANS where duration and overlap are the story — phases of a programme,
  stages of an inquiry, overlapping terms.
- **Not** for: instants with no duration — use a dot/event timeline (a Gantt bar of zero width is a dot).
- **Not** for: many rows — it becomes a wall; group or filter to the spans that matter.
- **Not** for: magnitude — the bar's length is DURATION (time), never a quantity; don't mix the two.

## Correctness "de base" (gantt-specific)

1. **A real, to-scale time axis** — gaps between bars are real elapsed time; never space rows evenly and
   pretend it's time. → `checkGanttConformance` (every end ≥ start; a captioned time axis).
2. **Order rows by start** (or group by workstream and order within), so the eye reads top-down in time.
3. **Label every row** (in a gutter) and caption the axis; an optional "today"/"now" marker dates the view.
4. **Colour by group** (Okabe-Ito, ≤ ~6) or a single hue; keep bars solid, separators light.

## data-to-viz caveats (credited)

- Bar LENGTH here is time, not value — readers trained on bar charts may misread it as magnitude, so
  caption the axis clearly and keep it strictly linear in time (no broken/▼ axis).

## Motion grammar (how a Gantt *builds*)

See `formats/video.md`; the gesture:

- each bar **grows from its start along the time axis** (left → right to its end), eased, staggered by
  row (top → bottom); the row label and any duration caption fade in after the bar lands.
A bar grows from its start, never from its centre or end, so frame N is a pure function of the frame.
