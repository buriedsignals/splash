# Dumbbell — in web

**Argues:** A dumbbell chart answers "how big is the gap between two values, for each of several categories, and which categories have the biggest gap" — two dots joined by a connecting line whose LENGTH is the point.

Owner rules that apply here: an interaction is a SPACE the reader explores, not a sequence — every control is compared against the DEFAULT state, never against the state before it; nothing argument-bearing sits behind a control; the page still reads whole with no script.

## Recorded from the validated beat

Worked example: `proof/web-dumbbell-life-expectancy-gains` (2026-09-15).

- **The gesture**: the reader lays one country's OWN TWO LEVELS across the other nine, stood UP rather
  than laid flat because on this shape the value axis is horizontal.
- **Start from what the author's sort buries.** A still picks one order and that order is the author's:
  sorted by gain, this plate says who moved most and hides who lives longest. The yardstick gives back
  the fact the gain order hides — not one of these ten changed rank in twenty-three years.
- **Build it with `chart-web/assets/level.ts`** — the same yardstick vocabulary, no new one. All the
  levels or none: the bar between the heads IS the gap, so a reference carrying one end would measure
  the picture on a channel a lollipop already has.
- **Each part answers for itself**: the row's bar answers with what LINKS its two ends, never with
  either end again; the delta is printed in its own register at the end of the row, never mixed in with
  the two levels it was computed from. Both ends are NAMED STATES rather than an anonymous range,
  which is the whole difference from a lollipop pair — and the axis is fitted for exactly that reason.

## Reader gestures
- **`find-your-own-case` (`level.ts`) — « Ce pays-là, il est où par rapport aux autres ? »** — the reader lays ONE category's two levels flat across the other nine, so the order the plate is sorted in (gain) stops hiding the order it is not sorted in (level)
- **`ask-a-mark`** — a head answers with its year and reading, and a connector with the gap, which the sorted order does not give
- **What does NOT move** — the row order, the takeaway, the legend, and every category's two heads
- **Default state** — the picture a reader who touches nothing is looking at, which is also the picture a reader with no script never leaves: the whole plate, its claim, its reference marks and its accent
- **Keyboard and touch** — every reading is `tabIndex={0}` at build time and one `show(point, x, y)` serves focus and pointer alike; the controls are native form elements with the treatment layered on top (`opacity: 0`, never `display: none`)

## A choreography must NOT
- `no-put-anything-argument` — put anything argument-bearing behind a control — the takeaway, the reference rule and the subject's accent are drawn unconditionally
- `no-ship-control-applied` — ship a control whose applied state equals the DEFAULT state — an answer the plate already prints is refused by `assertInteractionPlan`
- `no-describe-control-mechanism` — describe a control as a mechanism ("a hover detail", "a filter") instead of as the reader's own question, or let the browser format a number — every derived reading is computed in the runner
- `no-draw-references-data` — draw the references over the data: the uprights go BEHIND the marks, or the casing punches holes in the very heads the option names
- `no-pay-control-out` — pay for the control out of the plot — the chrome is paid for in PROSE (a shorter caveat, reading line and source line), because the figure must still fit the window it opens in

## Precision to assert
- the drawn connector length equals the asserted computed difference
- the beat throws if any category did not move in the claimed direction
- the page still fits its window at 375 px after the control's pills and its reserved sentence, measured, not assumed

## Devices the worked example implements
- **A yardstick of two levels at once** — both ends laid flat, which is what exposes the rank order the sort buries (`skills/chart-web/assets/level.ts`)
- **Uprights drawn behind the data, labelled at the foot** — a render decision, not a plan decision, and written down as such (`DirectedDumbbellWeb.tsx`)
- **The chrome's cost paid in prose** — measured at 375 px and recorded (`render-directions-web.mjs`)

## Worked example
`proof/web-dumbbell-life-expectancy-gains/` — the reference implementation of this type's INTERACTION; read its CODE, not only its BRIEF.md. `render-directions-web.mjs` (the frozen read, every derived answer, the claim, the words, the declared `interaction` plan and the refusals it is checked against), `DirectedDumbbellWeb.tsx` (the drawing, the answer markup, the generated stylesheet and the accessible table), `skills/chart-web/assets/level.ts`. `BRIEF.md` records the controls and what each one had to pass, not the shape. `skills/chart-web/scripts/scaffold-web-beat.mjs --type dumbbell --beat proof/web-dumbbell-<subject> --static proof/static-dumbbell-<subject>` copies this beat's plumbing, marked `SCAFFOLD:` over what is its subject rather than this type's.
