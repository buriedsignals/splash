---
id: gantt
engines:
  chart-native: gantt
intent: [change-over-time]
shape: structural
limits: { maxCategories: 6, minRows: 2 }
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

## The CSV, and the two refusals

`label,start,end[,group]` — one row per span. The two date columns are found **structurally**:
the columns whose EVERY value parses as a **big-endian** date (`2024-06-30`, `2024-06`, `2024`),
in column order — earlier is the start. Deliberately **no `start`/`end` header word list**: that
is *début/fin*, *Beginn/Ende*, *inizio/fine* across the four languages splash finishes
deliverables in, an open vocabulary that would fail silently on the fifth phrasing. Name them
with `ganttStart` / `ganttEnd` when the CSV carries more than two date columns.

Two shapes are refused **at the gate**, before anything renders:

- **A row whose end precedes its start**, *named*: a bar of negative length draws as nothing at
  all, so the phase silently disappears and the chart reads "this never happened".
- **A numeric day/month date** (`03/04/2024`): that is the 3rd of April to a French, German or
  Italian reader and the 4th of March to an American one, and nothing on the chart tells them
  which. Every date splash draws is big-endian on input and written with the month as a **NAME**
  on output (`3 avr.`, `3. Apr.`, `3 apr`), for the same reason.

**An end date closes the period it names.** "2023-01 → 2023-06" is six months of work, so the bar
runs to 1 July; a one-month phase whose start and end name the same month is a full month wide,
not zero. A bar that stopped at the first instant of the month it names would be a month short on
every row.

## Correctness "de base" (gantt-specific)

1. **A real, to-scale time axis** — gaps between bars are real elapsed time; never space rows evenly and
   pretend it's time. → `checkGanttConformance` (every end ≥ start; a captioned time axis).
2. **Order rows by start** (or group by workstream and order within), so the eye reads top-down in time.
3. **Label every row** (in a gutter) and caption the axis; an optional "today"/"now" marker dates the view.
4. **Colour by group** (Okabe-Ito, ≤ ~6) or a single hue; keep bars solid, separators light. The
   newsroom house hue tints the **furniture only** — one hue over the bars would collapse the
   workstreams the colour exists to separate.
5. **Every row is labelled** — `checkGanttConformance` counts the unlabelled ones and names the
   count; a bar in a gutter with no name says nothing.

## data-to-viz caveats (credited)

- Bar LENGTH here is time, not value — readers trained on bar charts may misread it as magnitude, so
  caption the axis clearly and keep it strictly linear in time (no broken/▼ axis).

## Motion grammar (how a Gantt *builds*)

See `formats/video.md`; the gesture:

- each bar **grows from its start along the time axis** (left → right to its end), eased, staggered by
  row (top → bottom); the row label and any duration caption fade in after the bar lands.
A bar grows from its start, never from its centre or end, so frame N is a pure function of the frame.
