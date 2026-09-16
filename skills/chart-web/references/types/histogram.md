# Histogram — in web

**Argues:** A histogram bins one continuous variable into contiguous intervals and draws a bar per bin whose height is the count that landed there.

Owner rules that apply here: an interaction is a SPACE the reader explores, not a sequence — every control is compared against the DEFAULT state, never against the state before it; nothing argument-bearing sits behind a control; the page still reads whole with no script.

## Recorded from the validated beat

Worked example: `proof/web-histogram-carbon-footprint` (2026-09-15), from `proof/static-carbon-footprint-spread`.

- **The gesture**: the reader stands the distribution's OWN QUANTILES up across the plot — the readings
  no choice of bins can move.
- **Refused first, and it shapes everything: the bin width is NOT handed over.** That is the obvious
  control and `BRIEF.md` records the three measurements that closed the door. So the page hands over
  what survives any binning instead.
- **Build it with `chart-web/assets/level.ts`.** Three quarters of the world's countries stop at 5,8 t,
  which is 14 % of this chart's width; the last 40 % of it carries two countries. Not one of those
  numbers is a bin edge, so not one can be printed on a still of this claim.
- **Every bar also answers** — with its interval, its count, its share of the whole, the running share
  up to its own top edge, and the countries inside it.
- **Name a bin by BOTH edges and leave the last one open.** A histogram labelled `0 2 4 6` leaves the
  reader guessing which side of 4 a country at exactly 4 t fell on. The shape is the argument, so the
  bars are one neutral and the accent goes to the bins the headline counts.

## Reader gestures
- **`find-your-own-case` (`level.ts`) — « Et moi, je suis où là-dedans ? »** — a reference stood up at a value the reader picks, with the count and share either side of it derived
- **`ask-a-mark`** — a bar answers with its bin's edges, its count and its cumulative share
- **The gesture that was REJECTED, with measurements** — letting the reader change the bin width, which is this type's central lie: refused because every offered width draws the same monotone decay with the same mode, because no existing vocabulary expresses it, and because a fourth one is not written for one beat
- **Default state** — the picture a reader who touches nothing is looking at, which is also the picture a reader with no script never leaves: the whole plate, its claim, its reference marks and its accent
- **Keyboard and touch** — every reading is `tabIndex={0}` at build time and one `show(point, x, y)` serves focus and pointer alike; the controls are native form elements with the treatment layered on top (`opacity: 0`, never `display: none`)

## A choreography must NOT
- `no-put-anything-argument` — put anything argument-bearing behind a control — the takeaway, the reference rule and the subject's accent are drawn unconditionally
- `no-ship-control-applied` — ship a control whose applied state equals the DEFAULT state — an answer the plate already prints is refused by `assertInteractionPlan`
- `no-describe-control-mechanism` — describe a control as a mechanism ("a hover detail", "a filter") instead of as the reader's own question, or let the browser format a number — every derived reading is computed in the runner
- `no-let-reader-change` — let the reader change the bin width here just because it is the type's own trap — the refusal is measured and written down, and a control whose every option returns the same reading at a different resolution changes the picture and not the reading
- `no-carry-bin-width` — carry the bin width as a bare literal: the three measurements that chose it are asserted in the render script

## Precision to assert
- the threshold the headline counts must land on a bin EDGE, so the accent never claims a bin the claim does not count — asserted, not assumed
- bin edges are fixed across every state, and every observation falls in exactly one bin
- the beat throws if the share under the threshold is not near the headline's own figure

## Devices the worked example implements
- **Three asserted measurements behind the bin width** — edge alignment, where the first gap falls, and the bin count against the type's floor and ceiling (`render-directions-web.mjs`)
- **A reader-placed reference** — the distribution read from the reader's own value (`skills/chart-web/assets/level.ts`)
- **A rejected control, costed in the brief** — the decision and its evidence kept where the next beat will read it (`BRIEF.md`, cited from the sheet)

## Worked example
`proof/web-histogram-carbon-footprint/` — the reference implementation of this type's INTERACTION; read its CODE, not only its BRIEF.md. `render-directions-web.mjs` (the frozen read, every derived answer, the claim, the words, the declared `interaction` plan and the refusals it is checked against), `DirectedHistogramWeb.tsx` (the drawing, the answer markup, the generated stylesheet and the accessible table), `skills/chart-web/assets/level.ts`. `BRIEF.md` records the controls and what each one had to pass, not the shape. `skills/chart-web/scripts/scaffold-web-beat.mjs --type histogram --beat proof/web-histogram-<subject> --static proof/static-histogram-<subject>` copies this beat's plumbing, marked `SCAFFOLD:` over what is its subject rather than this type's.
