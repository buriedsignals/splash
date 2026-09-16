# Bump — in web

**Argues:** A bump chart answers "who overtook whom, and when" among several competitors ranked over multiple periods — a league table's season, a chart's weekly top-ten, a poll's changing front-runners.

Owner rules that apply here: an interaction is a SPACE the reader explores, not a sequence — every control is compared against the DEFAULT state, never against the state before it; nothing argument-bearing sits behind a control; the page still reads whole with no script.

## Recorded from the validated beat

Worked example: `proof/web-bump-emitter-rank` (2026-09-15), from `proof/static-bump-emitter-rank`.

- **The gesture**: the reader follows one line and is told the field the chart does not draw — who it
  passed, by name, at every crossing.
- **Start from the rows nobody occupies on the plate.** Ten rows are ten places in the world and the
  plate draws six lines, so four rows are held at every step by countries with no line here. Germany
  goes 5th to 10th and the picture never says it was Iran, Saudi Arabia, Indonesia and South Korea.
- **Build it with `chart-web/assets/follow.ts`** — it names them, rings every crossing on its own line,
  and states the whole walk run by run. The subject is NOT among the options: its line is the claim,
  and `assertFollowDeclaration` is handed its key and refuses any option that names it.
- **One mark per YEAR, never one per country per year** — six lines stacked in one column would make a
  pointer resolving by x ambiguous. It answers with the subject's rank that year, its emissions, and
  who sat immediately above and below. Rank is printed in words at both ends; both ends carry a name,
  collision-free by construction because drawn countries hold distinct ranks in any one year.
- **Refused: the transform, and the label column as a share of the plot.** Every ring is drawn once at
  its own crossing and hidden. Labels at `left: 75 %` / `max-width: 25 %` were 310 px at 1400 and
  54 px at 375 — three lines, overlapping by 36 px — so both gutters are measured in the face the page
  actually draws in, and the plot is what is left.

## Reader gestures
- **`follow` — « Cette ligne, qui l'a doublée, et quand ? »** — the reader pulls one competitor out of the tangle and gets its OWN history: the countries it passed and the countries that passed it, year by year — including the ones the plate does not draw, which is the reading every other format of this claim has to leave out
- **What does NOT move** — no other line is re-ranked, re-coloured or measured against the chosen one; the rows are places in the world, and they stay
- **`ask-a-mark`** — a vertex answers with the rank and the year, and with who held the rows above and below it
- **Default state** — the picture a reader who touches nothing is looking at, which is also the picture a reader with no script never leaves: the whole plate, its claim, its reference marks and its accent
- **Keyboard and touch** — every reading is `tabIndex={0}` at build time and one `show(point, x, y)` serves focus and pointer alike; the controls are native form elements with the treatment layered on top (`opacity: 0`, never `display: none`)

## A choreography must NOT
- `no-put-anything-argument` — put anything argument-bearing behind a control — the takeaway, the reference rule and the subject's accent are drawn unconditionally
- `no-ship-control-applied` — ship a control whose applied state equals the DEFAULT state — an answer the plate already prints is refused by `assertInteractionPlan`
- `no-describe-control-mechanism` — describe a control as a mechanism ("a hover detail", "a filter") instead of as the reader's own question, or let the browser format a number — every derived reading is computed in the runner
- `no-read-rank-drawn` — read a rank off the drawn subset — every rank is computed over the whole file, because a rank read off six lines is not a world rank
- `no-paint-end-label` — paint an end label in the line's own hue: end labels stay in the page's neutral ink and the subject is told apart by weight and by a small accent swatch

## Precision to assert
- ranks are computed over all 209–215 countries per year, and the crossings are FOUND by walking the subject's own rank series, never listed by hand
- the beat throws if the subject did not rise or passed fewer than the stated number of competitors
- the drawn set is a stated rule (top five in either end year, plus the subject), not a hand-pick

## Devices the worked example implements
- **`follow.ts`** — one competitor pulled out of a tangle it crosses, with its own crossing history as the answer (`skills/chart-web/assets/follow.ts`)
- **Crossings against the invisible field** — the answer names the countries no line is drawn for, which is the page's whole earn (`render-directions-web.mjs`)
- **Weight plus a swatch instead of coloured type** — the catalogue's accessibility trap, found live on this page and fixed (`DirectedBumpWeb.tsx`)

## Worked example
`proof/web-bump-emitter-rank/` — the reference implementation of this type's INTERACTION; read its CODE, not only its BRIEF.md. `render-directions-web.mjs` (the frozen read, every derived answer, the claim, the words, the declared `interaction` plan and the refusals it is checked against), `DirectedBumpWeb.tsx` (the drawing, the answer markup, the generated stylesheet and the accessible table), `skills/chart-web/assets/follow.ts`. `BRIEF.md` records the controls and what each one had to pass, not the shape. `skills/chart-web/scripts/scaffold-web-beat.mjs --type bump --beat proof/web-bump-<subject> --static proof/static-bump-<subject>` copies this beat's plumbing, marked `SCAFFOLD:` over what is its subject rather than this type's.
