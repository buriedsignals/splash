# Gantt — in web

**Argues:** A Gantt chart draws each item as a bar spanning its own start to its own end on one shared, to-scale time axis, one row per item — answering "when did this happen, how long did it take, and what overlapped with what."

Owner rules that apply here: an interaction is a SPACE the reader explores, not a sequence — every control is compared against the DEFAULT state, never against the state before it; nothing argument-bearing sits behind a control; the page still reads whole with no script.

## Recorded from the validated beat

Worked example: `proof/web-gantt-top-ten-tenure` (2026-09-15), from `proof/static-gantt-top-ten-tenure`.

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

## Reader gestures
- **`align` — « Vingt-sept ans, c'est long comment ? »** — this is the one type whose mark is an INTERVAL, carrying two readings on one axis, so the reader chooses where each bar's own zero is put: the shared calendar, each row's own entry, or each row's held time with the interruptions closed
- **One unit of length is one year in every state** — the scale is never recomputed, so the graduations sit at the same pixels throughout and only their WORDS change: that is what makes an alignment an alignment and not a rescale
- **`ask-a-mark`** — a span answers with its years, its duration and its interruptions
- **Default state** — the picture a reader who touches nothing is looking at, which is also the picture a reader with no script never leaves: the whole plate, its claim, its reference marks and its accent
- **Keyboard and touch** — every reading is `tabIndex={0}` at build time and one `show(point, x, y)` serves focus and pointer alike; the controls are native form elements with the treatment layered on top (`opacity: 0`, never `display: none`)

## A choreography must NOT
- `no-put-anything-argument` — put anything argument-bearing behind a control — the takeaway, the reference rule and the subject's accent are drawn unconditionally
- `no-ship-control-applied` — ship a control whose applied state equals the DEFAULT state — an answer the plate already prints is refused by `assertInteractionPlan`
- `no-describe-control-mechanism` — describe a control as a mechanism ("a hover detail", "a filter") instead of as the reader's own question, or let the browser format a number — every derived reading is computed in the runner
- `no-recompute-scale-between` — recompute the scale between options — three states that do not share one unit are three charts that happen to share a frame
- `no-let-caption-become` — let the caption become furniture: under the aligned options the plate LOOKS like a plain bar chart, which is exactly the misreading the type warns about, so the caption states that length means duration

## Precision to assert
- spans are computed in the runner from the frozen ranking and asserted before anything is drawn; interruptions are FOUND, not listed, and the page says which years
- no span may be inverted and no two spans of one row may land on top of each other — refused per row AND per state, because an alignment re-places both ends of every interval
- the printed figure at a bar's tip equals that bar's drawn length under the state that claims it

## Devices the worked example implements
- **`align.ts`, a new vocabulary** — what every interval is lined up ON, with one unit of length across all three states (`skills/chart-web/assets/align.ts`)
- **Interruptions closed as their own option** — the difference between years elapsed and years held made a reading (`render-directions-web.mjs`)
- **Per-state inversion and overlap refusals** — the type's literal trap, made reachable by the control and then refused (`render-directions-web.mjs`)

## Worked example
`proof/web-gantt-top-ten-tenure/` — the reference implementation of this type's INTERACTION; read its CODE, not only its BRIEF.md. `render-directions-web.mjs` (the frozen read, every derived answer, the claim, the words, the declared `interaction` plan and the refusals it is checked against), `DirectedGanttWeb.tsx` (the drawing, the answer markup, the generated stylesheet and the accessible table), `skills/chart-web/assets/align.ts`. `BRIEF.md` records the controls and what each one had to pass, not the shape. `skills/chart-web/scripts/scaffold-web-beat.mjs --type gantt --beat proof/web-gantt-<subject> --static proof/static-gantt-<subject>` copies this beat's plumbing, marked `SCAFFOLD:` over what is its subject rather than this type's.
