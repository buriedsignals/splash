# Marimekko — in web

**Argues:** A Marimekko shows two nested part-to-whole proportions at once: column WIDTH encodes each group's share of the grand total, and the segments inside encode that group's own composition — so a cell's AREA is the joint share.

Owner rules that apply here: an interaction is a SPACE the reader explores, not a sequence — every control is compared against the DEFAULT state, never against the state before it; nothing argument-bearing sits behind a control; the page still reads whole with no script.

## Recorded from the validated beat

Worked example: `proof/web-marimekko-electricity-mix` (2026-09-15), from
`proof/static-marimekko-electricity-mix`.

- **Vocabulary: `chart-web/assets/hold.ts`** (with `assets/stack.ts` as its neighbour) — three native
  radios plus build-time CSS that re-scale every column at once.
- **The gesture is holding one of the two dimensions still**, because a mosaic cell is a PRODUCT —
  group size times internal share — and an eye cannot factor a product.
- **Start from the mosaic and state the width scale in words**: width is the country's own
  generation, height its mix, so a tile's AREA is real TWh; the unit is named ONCE above the columns,
  and each column prints its own production.
- **Offer the two honest re-scalings**: equal widths, where height is the share alone; and equal
  widths on one absolute scale, where height is the terawatt-hours read from a common floor. Both are
  true pictures of the same frozen file, and the reader moves between them as often as they like.
- **Refused: letting the moved marks keep answering.** `interaction.mjs` resolves a mark from `cx`/`cy`
  read once at init and a CSS transform never changes them, so under a held state the answering layer
  is taken out of the page (`quiet`) rather than left to answer with a neighbour's name.

## Reader gestures
- **`hold` + `stack` — « Ces deux tuiles ont la même surface : elles disent la même chose ? »** — the reader FREEZES one factor of the product so the other becomes readable, and the tiles the comparison is about are brought onto one baseline: a cell's area is group-size × internal-split, and no eye decomposes a product
- **`ask-a-mark`** — a band answers with its group, its source, its share of the group and its share of the whole, the two readings the one area confuses
- **What does NOT move** — the column order, the source order inside every column, and the grand total's own statement
- **Default state** — the picture a reader who touches nothing is looking at, which is also the picture a reader with no script never leaves: the whole plate, its claim, its reference marks and its accent
- **Keyboard and touch** — every reading is `tabIndex={0}` at build time and one `show(point, x, y)` serves focus and pointer alike; the controls are native form elements with the treatment layered on top (`opacity: 0`, never `display: none`)

## A choreography must NOT
- put anything argument-bearing behind a control — the takeaway, the reference rule and the subject's accent are drawn unconditionally
- ship a control whose applied state equals the DEFAULT state — an answer the plate already prints is refused by `assertInteractionPlan`
- describe a control as a mechanism ("a hover detail", "a filter") instead of as the reader's own question, or let the browser format a number — every derived reading is computed in the runner
- print a share inside a cell — the cell's area IS the share, and a number in it invites reading the height as the value
- let a key swatch be measured against its neighbours rather than against the page: inside the chart a band is bounded by its neighbours, but in the KEY it sits on the ground, and its outline is held to the 3:1 non-text floor and re-measured after adjustment

## Precision to assert
- column width is on one unit-per-value scale and band height a share of the same 100 %, so a cell's area is the quantity, in every state
- every column's bands sum to that column's own total, and the columns' widths sum to the grand total
- a band whose share rounds to zero still has its answer point INSIDE the frame — a point 0,03 px outside is a reading the pointer can never reach

## Devices the worked example implements
- **`hold.ts` freezing one factor of the product** — the only way a mosaic's two proportions are read one at a time (`skills/chart-web/assets/hold.ts`)
- **`stack.ts` bringing the compared tiles to one baseline** — the across-column comparison the mosaic's geometry forbids (`skills/chart-web/assets/stack.ts`)
- **Key swatches calibrated to the non-text floor and re-measured** — the defect measurement found, with the twenty-seven in-tile contrasts recorded in `PALETTE.md`

## Worked example
`proof/web-marimekko-electricity-mix/` — the reference implementation of this type's INTERACTION; read its CODE, not only its BRIEF.md. `render-directions-web.mjs` (the frozen read, every derived answer, the claim, the words, the declared `interaction` plan and the refusals it is checked against), `DirectedMarimekkoWeb.tsx` (the drawing, the answer markup, the generated stylesheet and the accessible table), `skills/chart-web/assets/hold.ts`, `skills/chart-web/assets/stack.ts`. `BRIEF.md` records the controls and what each one had to pass, not the shape. `skills/chart-web/scripts/scaffold-web-beat.mjs --type marimekko --beat proof/web-marimekko-<subject> --static proof/static-marimekko-<subject>` copies this beat's plumbing, marked `SCAFFOLD:` over what is its subject rather than this type's.
