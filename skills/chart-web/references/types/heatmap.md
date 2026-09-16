# Heatmap — in web

**Argues:** A heatmap lays a grid across two categorical (or temporal) dimensions and encodes a third, quantitative value as the colour of each cell.

Owner rules that apply here: an interaction is a SPACE the reader explores, not a sequence — every control is compared against the DEFAULT state, never against the state before it; nothing argument-bearing sits behind a control; the page still reads whole with no script.

## Recorded from the validated beat

Worked example: `proof/web-heatmap-europe-electricity` (2026-09-15), from `proof/static-heatmap-europe-electricity`.

- **The gesture**: the reader raises the FLOOR and watches which cells survive it.
- **Start from what a ramp cannot do.** Colour ranks; it does not measure — and a sequential ramp's low
  end is close to the ground by construction, which here is 29 cells under 0,5 % and 44 under 5 %. Two
  thirds of the grid is a pale wash that no cell and no key can turn back into a reading.
- **Build it with `chart-web/assets/filter.ts`** in its threshold-as-named-bands form: each band
  reveals a sentence saying how much of a country's electricity the survivors still account for. Pure
  CSS, so it works with the script absent.
- **Give the value twice over**: the cells that carry the argument print their own share, and all 63
  answer with their exact value under the pointer — a cell is a colour and a colour is a bin, so
  either the number is printed or the reader is owed another way to get it.
- **One hue at increasing strength, and order chosen from the answer.** Nine sources are nine columns,
  not nine colours: a qualitative palette would say the sources differ in KIND along the axis meant to
  carry magnitude. Rows order by low-carbon share, columns group renewables-first, so the three routes
  the headline names are three shapes rather than three facts to assemble. The pointer resolves by CELL
  (`data-hit="cell"`) — seven rows share every x.
- **`filter.ts` is the right mechanism here because the columns are an unordered set.** Nine sources
  carry no sequence, so a floor that removes the rounding-error cells leaves exactly what the question
  asks for: a list of survivors. That stops being true the moment a heatmap's columns are consecutive
  and the reader's question is about crossing a line rather than surviving one. There a filter would
  delete a relapse (a series crossing back above the line) with nothing on the page marking that it
  ever happened, so the gesture is `chart-web/assets/cutoff.ts` — the worked example for consecutive
  columns is `proof/web-calendar-heatmap-geneva`. Do not assume this sheet's mechanism transfers to a
  time-columned grid.

## Reader gestures
- **`filter` — « Qu'est-ce qui reste si on enlève le bruit ? »** — colour ranks but does not measure, and two thirds of this grid is a pale wash under 5 %; the reader raises the FLOOR under the grid and watches which cells survive, with the page saying how much of each row the survivors still account for
- **`ask-a-mark`** — a cell answers with its exact value and its share of its own row, which the bin colour cannot
- **What does NOT move** — the rows, the columns, the colour scale's domain, and the partition the claim rests on
- **Default state** — the picture a reader who touches nothing is looking at, which is also the picture a reader with no script never leaves: the whole plate, its claim, its reference marks and its accent
- **Keyboard and touch** — every reading is `tabIndex={0}` at build time and one `show(point, x, y)` serves focus and pointer alike; the controls are native form elements with the treatment layered on top (`opacity: 0`, never `display: none`)

## A choreography must NOT
- `no-put-anything-argument` — put anything argument-bearing behind a control — the takeaway, the reference rule and the subject's accent are drawn unconditionally
- `no-ship-control-applied` — ship a control whose applied state equals the DEFAULT state — an answer the plate already prints is refused by `assertInteractionPlan`
- `no-describe-control-mechanism` — describe a control as a mechanism ("a hover detail", "a filter") instead of as the reader's own question, or let the browser format a number — every derived reading is computed in the runner
- `no-offer-floor-keeps` — offer a floor that keeps every drawn cell — `assertFilterDeclaration` refuses an option that is "the unfiltered view under a second name"
- `no-let-colour-ramp` — let the colour ramp be the only channel: the key prints the bin boundaries as numbers, and every hidden cell's value stays reachable in the accessible table

## Precision to assert
- the colour scale's domain is fixed across every state
- the routes the claim names are a COMPUTED partition — disjoint tests, and a case falling into none or two throws
- the survivors' share of each row is derived server-side per floor

## Devices the worked example implements
- **The raised floor** — the filter as the reading, aimed at a real property of the grid rather than bolted on (`skills/chart-web/assets/filter.ts`)
- **A computed three-way partition** — the caption's "three routes" made a test (`render-directions-web.mjs`)
- **Per-floor coverage figures** — what the survivors still account for, so narrowing never hides the claim (`DirectedHeatmapWeb.tsx`)

## Worked example
`proof/web-heatmap-europe-electricity/` — the reference implementation of this type's INTERACTION; read its CODE, not only its BRIEF.md. `render-directions-web.mjs` (the frozen read, every derived answer, the claim, the words, the declared `interaction` plan and the refusals it is checked against), `DirectedHeatmapWeb.tsx` (the drawing, the answer markup, the generated stylesheet and the accessible table), `skills/chart-web/assets/filter.ts`. `BRIEF.md` records the controls and what each one had to pass, not the shape. `skills/chart-web/scripts/scaffold-web-beat.mjs --type heatmap --beat proof/web-heatmap-<subject> --static proof/static-heatmap-<subject>` copies this beat's plumbing, marked `SCAFFOLD:` over what is its subject rather than this type's.
