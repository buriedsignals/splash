# Gantt — in web

Worked example: `proof/web-gantt-top-ten-tenure` (2026-09-12), from `proof/static-gantt-top-ten-tenure`.

- **The gesture**: the reader chooses WHERE EACH BAR'S OWN ZERO IS PUT — the shared calendar, each
  row's own entry, or the held years with interruptions closed.
- **Start from the origin the type has to spend.** A gantt's mark is an INTERVAL: where it sits says
  WHEN, how long it runs says HOW LONG, and one axis carries both only by fixing the zero at 1990 for
  every row. That spend makes the questions mutually exclusive — *who lasted longest* needs a shared
  STOPWATCH a calendar cannot give. Canada and South Korea both held the place 27 years, five rows and
  six years apart; no reader can see on a calendar that they are equal, and under the third origin
  they are the same bar.
- **Build it with `chart-web/assets/align.ts`, and ONE SCALE** — 22,286 geometry units per year in all
  three states, never recomputed, so the seven graduations sit at the same seven pixels and only their
  WORDS change. That is the difference between an alignment and a rescale, and what makes the three
  states comparable rather than three charts sharing a frame. The graduations crossfade: a number that
  changes in place reads as a relabelling, one that slides reads as a bug.
- **Rows sort by entry year then tenure** — a property of the DATA rather than of the chosen origin, so
  it is true in all three states. The readings sit at the SAME x at their row's height, which is how a
  reader means a gantt anyway; `assertAlignRest` refuses the beat if they drift.
- **Refused twice.** Re-sorting rows into a length ladder under the second origin: `interaction.mjs`
  reads `cx`/`cy` once at init, sixteen names re-sorting is the owner's ruling at scale, and an
  arguable ladder does not buy the movement. And `both-dates-in-the-row-label`: sixteen rows of dates
  are true under one origin and meaningless under the other two, so every row prints the one figure
  true in all three — the years it held — and the dates go to the pointer. An open span is notated by
  the taper alone, drawn INSIDE its own length, because "flush at the axis edge" does not survive here.
