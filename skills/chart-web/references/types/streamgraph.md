# Streamgraph — in web

Worked example: `proof/web-streamgraph-swiss-electricity` (2026-09-15), from
`proof/static-streamgraph-swiss-electricity`.

- **Vocabulary: `chart-web/assets/floor.ts`**, a vocabulary written for this beat.
- **The gesture is the reader choosing which band is laid FLAT**: "is this band growing, and by how
  much" is the reader's question, and a stream is the worst place in the catalogue to ask it —
  measured here, seven of the nine bands move their own floor further across the record than they
  ever move their own thickness. Solar wanders 53,7 units of ground under a 36,2-unit rise.
- **Shear, never repaint**: the plate shears vertically until that band's bottom edge is a straight
  rule; every band keeps its exact shape and its exact place in the order, because the ramp encodes
  stack position and a shear preserves it. Band names are CARRIED by the control, not hidden by it.
- **Hand back the axis the type forbids**: `a-free-baseline-forbids-a-value-axis` holds in the
  default state, and is SUSPENDED rather than broken under an option — that band's floor IS a fixed
  zero, so a real TWh axis opens in the gutter and closes when the reader leaves. Which bands are
  offered is arithmetic: an option must hold two graduations at the axis register's own leading,
  admitting three of nine.
- **Refused: one hit point per band-year.** All 234 move under a shear, and `interaction.mjs` resolves
  a pointer off `cx`/`cy` read once at init. The reading is one point per YEAR, at an x no option
  moves, on a full-height guide, answering with the whole year in rank order.
