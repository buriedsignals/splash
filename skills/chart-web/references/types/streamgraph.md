# Streamgraph — in web

**Argues:** A streamgraph shows many overlapping time series stacked with no fixed baseline — so the READ is the overall rhythm and relative flow of many series at once, not the exact value of any one band.

Owner rules that apply here: an interaction is a SPACE the reader explores, not a sequence — every control is compared against the DEFAULT state, never against the state before it; nothing argument-bearing sits behind a control; the page still reads whole with no script.

## Recorded from the validated beat

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

## Reader gestures
- **`floor` — « Cette bande-là, elle grandit, et de combien ? »** — this is the moving-floor problem at its most extreme (one band's floor wanders 1,48× further than the band itself grows), so the reader chooses which band is laid FLAT: the whole stream shears vertically, every band keeps its exact shape and its exact place in the order, and nothing is repainted
- **The reader EARNS the axis** — under a chosen option that band's floor IS a fixed zero, so a real value axis appears in the gutter with dashed graduations, and leaves again when the reader leaves the option
- **`ask-a-mark`, one point per PERIOD** — at an x no option ever moves, wired to a full-height guide, answering with the period, its total and every source in rank order
- **Default state** — the picture a reader who touches nothing is looking at, which is also the picture a reader with no script never leaves: the whole plate, its claim, its reference marks and its accent
- **Keyboard and touch** — every reading is `tabIndex={0}` at build time and one `show(point, x, y)` serves focus and pointer alike; the controls are native form elements with the treatment layered on top (`opacity: 0`, never `display: none`)

## A choreography must NOT
- `no-put-anything-argument` — put anything argument-bearing behind a control — the takeaway, the reference rule and the subject's accent are drawn unconditionally
- `no-ship-control-applied` — ship a control whose applied state equals the DEFAULT state — an answer the plate already prints is refused by `assertInteractionPlan`
- `no-describe-control-mechanism` — describe a control as a mechanism ("a hover detail", "a filter") instead of as the reader's own question, or let the browser format a number — every derived reading is computed in the runner
- `no-re-base-translation` — re-base with a translation: re-basing a stream is a SHEAR, because the correction is a different number at every step, and a single `dy` per band would be wrong by more than the thing it exists to show
- `no-leave-hit-points` — leave hit points at coordinates the shear moves — a point that answers for where its band used to be is the worst answer an interactive chart can give, and this corpus has paid for it twice

## Precision to assert
- the wiggle baseline is computed once and held fixed in the default state, and every option's shear is derived from it
- which bands may be offered is arithmetic, not taste: an axis a reader cannot read is not an axis
- the rank, the period it was first reached and the fact that it held are all computed, and the beat throws if the subject reached the rank and then lost it

## Devices the worked example implements
- **`floor.ts`** — what the picture may STAND ON, a shear no translation vocabulary can express (`skills/chart-web/assets/floor.ts`)
- **An axis earned by the option** — the static sibling's confessed debt (`a-free-baseline-forbids-a-value-axis`) paid, only where it is true (`DirectedStreamWeb.tsx`)
- **One hit point per period on a fixed x** — the readout rebuilt so the shear cannot invalidate it (`DirectedStreamWeb.tsx`)

## Worked example
`proof/web-streamgraph-swiss-electricity/` — the reference implementation of this type's INTERACTION; read its CODE, not only its BRIEF.md. `render-directions-web.mjs` (the frozen read, every derived answer, the claim, the words, the declared plan where one can be declared, and the refusals it is checked against), `DirectedStreamWeb.tsx` (the drawing, the answer markup, the generated stylesheet and the accessible table), `skills/chart-web/assets/floor.ts`. `BRIEF.md` records the controls and what each one had to pass, not the shape. `skills/chart-web/scripts/scaffold-web-beat.mjs --type streamgraph --beat proof/web-streamgraph-<subject> --static proof/static-streamgraph-<subject>` copies this beat's plumbing, marked `SCAFFOLD:` over what is its subject rather than this type's.
