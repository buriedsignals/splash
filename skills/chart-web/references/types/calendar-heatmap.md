# Calendar heatmap — in web

**Argues:** A calendar heatmap answers "when, across a real calendar, did this value run high or low" by laying one cell per day into a fixed grid and colouring each cell by its value.

Owner rules that apply here: an interaction is a SPACE the reader explores, not a sequence — every control is compared against the DEFAULT state, never against the state before it; nothing argument-bearing sits behind a control; the page still reads whole with no script.

## Recorded from the validated beat

Worked example: `proof/web-calendar-heatmap-geneva` (2026-09-15), from `proof/static-calendar-heatmap-geneva`.

- **The gesture**: the reader moves the threshold that defines the streak, and watches which end of the
  headline holds.
- **Start from the line the author drew.** "31 days in a row" is a reading off the data AND a line at
  20 °C: 78 days at 16 °C, 43 at 18, 31 at 20, 13 at 22, 4 at 24. Move it and the run's START slides
  from 14 July to 5 August while its END does not move at all — Geneva's summer did not taper, it
  stopped, and the headline is fragile at one end and anchored at the other.
- **Build it with `chart-web/assets/cutoff.ts`**, and ring the run rather than repaint it. On this type
  colour already carries the whole quantity; a control that recoloured cells would spend the chart's
  one channel.
- **The pointer resolves by CELL, not by column** — twelve months share every x, so the shared
  script's nearest-by-x default would answer confidently and wrongly. `data-hit="cell"` in
  `chart-web/assets/interaction.mjs` is the opt-in for this shape. A missing cell is drawn as missing:
  31 February and its four siblings are impossible, not absent, and keep the grid rectangular.
- **Refused: lifting each ramp step independently.** Two colours calibrated onto the same floor against
  the same ground come out identical — measured, bins 0 to 3 adjacent at 1,004 / 1,007 / 1,001 to one,
  four real levels under a key printing seven. Lift the LOW POLE once and interpolate the ramp from
  that pole to the accent; five bins then spend the whole budget at a worst adjacent pair of 1,195,
  and a sixth drops it to 1,150 for no reading gained.

## Reader gestures
- **`cutoff` — « Et si la barre n'était pas à 20 °C ? »** — the reader sweeps the threshold that DEFINES the streak, and the run recomputes with it (78 days at 16 °C, 43 at 18, 31 at 20, 13 at 22, 4 at 24): the headline number is a reading off the data AND a line somebody drew
- **The answer only the sweep gives** — the run's END date does not move across four thresholds while its start slides three weeks, which is visible only in the DIFFERENCE between the states and is in no single picture
- **`ask-a-mark`** — a cell answers with its date and its exact value, which the bin colour cannot
- **Default state** — the picture a reader who touches nothing is looking at, which is also the picture a reader with no script never leaves: the whole plate, its claim, its reference marks and its accent
- **Keyboard and touch** — every reading is `tabIndex={0}` at build time and one `show(point, x, y)` serves focus and pointer alike; the controls are native form elements with the treatment layered on top (`opacity: 0`, never `display: none`)

## A choreography must NOT
- `no-put-anything-argument` — put anything argument-bearing behind a control — the takeaway, the reference rule and the subject's accent are drawn unconditionally
- `no-ship-control-applied` — ship a control whose applied state equals the DEFAULT state — an answer the plate already prints is refused by `assertInteractionPlan`
- `no-describe-control-mechanism` — describe a control as a mechanism ("a hover detail", "a filter") instead of as the reader's own question, or let the browser format a number — every derived reading is computed in the runner
- `no-let-colour-scale` — let the colour scale's domain move with the threshold — the cells' meaning is fixed, and only the outlined run changes
- `no-type-streak` — type the streak: the longest run at or above the current threshold is WALKED out of the frozen file, and the beat throws if no run of the stated length exists at the claim's own threshold

## Precision to assert
- every day of the period is present and in order, and the cell count is asserted
- the run at every offered threshold is derived server-side, with its start and end dates, and the browser formats nothing
- the bins are fixed once from the frozen series and the key prints their breaks

## Devices the worked example implements
- **`cutoff.ts`** — a threshold as named rungs, each a real reading, with no script (`skills/chart-web/assets/cutoff.ts`)
- **A run recomputed per rung** — five streaks derived at build time so the reader can compare states (`render-directions-web.mjs`)
- **The outline as the only thing that moves** — the calendar itself is never re-coloured by the control (`DirectedCalendarWeb.tsx`)

## Worked example
`proof/web-calendar-heatmap-geneva/` — the reference implementation of this type's INTERACTION; read its CODE, not only its BRIEF.md. `render-directions-web.mjs` (the frozen read, every derived answer, the claim, the words, the declared `interaction` plan and the refusals it is checked against), `DirectedCalendarWeb.tsx` (the drawing, the answer markup, the generated stylesheet and the accessible table), `skills/chart-web/assets/cutoff.ts`. `BRIEF.md` records the controls and what each one had to pass, not the shape. `skills/chart-web/scripts/scaffold-web-beat.mjs --type calendar-heatmap --beat proof/web-calendar-heatmap-<subject> --static proof/static-calendar-heatmap-<subject>` copies this beat's plumbing, marked `SCAFFOLD:` over what is its subject rather than this type's.
