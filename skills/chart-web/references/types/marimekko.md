# Marimekko — in web

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
