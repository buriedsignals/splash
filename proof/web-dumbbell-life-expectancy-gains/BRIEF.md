---
format: web
type: dumbbell
---

# Beat — Les dix ont tous gagné des années de vie depuis 2000 (web)

**Type:** dumbbell (range plot). **Medium/format:** chart / **web**. **Frame:** fluid.

## Claim

Every one of ten countries added years of life expectancy between 2000 and 2023 — **Poland gained the
most, +5,0 years; the United States the least, +2,5.** The median gain is +4,1. The beat throws if any
country did not gain.

## Treatments spent

- `segment-between-two-named-states` — the bar between the heads **is** the gap, and both ends are
  named states rather than an anonymous range. That is the difference from a lollipop pair: a
  dumbbell answers "how far apart", not "how far from nothing", so **the axis is fitted and does not
  start at zero** — and the caveat says so rather than leaving it to be noticed.
- `the-delta-is-its-own-register-beside-the-values` — the gain is printed in its own register in its
  own column past the end of every bar, never mixed with the two levels it came from.
- One hue, two chromas: the two heads are two **states** of one measure, never two categories. The
  argument, and the measurement that constrains it, are in `PALETTE.md`.

## THE INTERACTION, WRITTEN BEFORE THE CODE

### What this page earns

A still has to pick one order and that order is the author's. Sorted by gain, this plate says who
moved most and hides who lives longest: Poland tops the chart on +5,0 years and is still, in 2023,
the shortest-lived of the ten. A still cannot lay one country's two levels across the other nine, and
a video cannot let the reader choose which country that is. Here they choose — and what comes back is
the fact the gain order buries: **not one of these ten changed rank in twenty-three years.** Japan was
first in 2000 and is first in 2023; the United States ninth and ninth. Five of the nine others were
already living longer in 2000 than Poland manages in 2023.

### Control 1 — the yardstick

- **The reader's question.** « Ce pays-là, il est où par rapport aux autres ? Les dix sont rangés par
  gain — mais qui vit plus longtemps que qui, et est-ce que ça a bougé ? »
- **The gesture.** `find-your-own-case` — the `level.ts` vocabulary, radios plus generated CSS, no
  script. Its `x` marks: on this shape the value axis is horizontal, so a chosen country's two levels
  are two references **stood up** across the ten rows, not laid flat. That widening already exists
  (it was cut for the scatter); nothing here is new vocabulary.
- **What changes in the picture.** Two dashed uprights cross all ten rows at the chosen country's 2000
  and 2023 values, each drawn on a ground casing so it stays readable where it crosses a connector or
  a head. Its own two heads take an ink ring among eighteen that keep only the colour their state
  gave them; its name in the gutter takes full ink and the nine others step back. A sentence under
  the control gives its level rank in 2000 and in 2023, how many of the nine were **already** above
  its 2023 level back in 2000, and how many are **still** below its 2000 level in 2023 — three
  readings the plate does not print and the gain order actively hides.
- **What it does not touch.** The title, the caveat, the delta column and the accent on Poland's own
  gain are drawn in every state of this page. The reader can choose what the picture is measured
  against; they cannot switch the claim off.

### Control 2 — the row's own bar

- **The reader's question.** « Celui-là a gagné combien, et ça le met où ? »
- **The gesture.** `ask-a-line`. The connector is what answers, because the connector **is** the
  reading: the two ends already print their own values beside themselves, so an answer repeating them
  is the plate read back aloud. The corpus has one other page of this shape, `web-co2-decline-slope`.
- **What changes in the picture.** The row under the pointer, the key or the finger takes full ink
  across its whole bar — the shape the reading is about, not a dot floating at its midpoint. The
  answer is the gain, its rank among the ten, and its signed distance from the group's median gain;
  the last of those is printed nowhere on the page.

## What the render taught

Four things, all found by measuring rather than by looking, and each is a defect this beat shipped.

- **The pointer answered about the wrong country four times out of five.** `data-hit="cell"` resolves
  by Euclidean distance in the geometry's own units, and this `<svg>` is `preserveAspectRatio="none"`
  — so one viewBox unit of x and one of y are different numbers of reader pixels. With each row's
  point at its own connector's midpoint, the ten points are not a grid: probed at five positions
  across each of the ten rows, **40 of 50 probes named a country the pointer was not over** (France's
  row answered Pologne, Espagne, then Suisse). Every point now sits at the same x, so the distance
  reduces to the row — which is what a cell means on a plate with one row per category.
- **The 2000 head measured 1,02:1 against the bar it terminates**, in all three directions. Both were
  clamped to the non-text floor against the same ground by `adjustToContrast`, and two marks pinned
  to the same floor on the same ground are the same value by construction. On this ground no colour
  fixes it — the darkest an earlier head may be **is** the later head — so the separation is
  geometric: the bar is thinned to scaffolding, and each head sits on its own ground casing, which
  measures 3,07:1 / 3,07:1 / 3,01:1 against the bar. The beat refuses rather than assumes it.
- **The row names' gutter was typed at 104 px.** This is the one type whose own sheet names the label
  gutter as its production failure mode, and this beat guessed it. It is now measured from the widest
  name the beat is about to draw, in the axis register's own face, size and weight — at the subject
  row's 700 as well, which is wider than the rest.
- **The page could not be built at all.** All three directions refused, on a Google Fonts `text=`
  request that answers with a kit URL returning 400. The characters asking for it were `ᵉ` (U+1D49)
  and `→` (U+2192), which neither Open Sans nor Montserrat carries — the rule `web-donut-world-co2-share`
  already wrote down. ASCII ordinals and plain words now; and this is why the committed renders were
  still baking `Avenir Next`.
- **A hard-coded `lineHeight: 1.1` sat in the same object as `regs.axis`**, beating the leading the
  register emits. It was there to stop a wrapped name from running into its neighbour, paired with a
  `whiteSpace: "normal"` that overrode the shared sheet's `nowrap`. Measured: the widest name is
  72,8 px in a 94 px column, no name wraps at any width in any direction, and a single line centred
  by `translateY(-50%)` sits at the same pixel whatever its leading — so the override changed nothing
  a reader could see and cost the register its lever. Both are gone; the gutter is the right lever and
  it is now measured.

## Three earlier things the render taught, all about fixed type over scaled geometry

- **A label lifted above its row by a percentage of its own height clears the row at desktop scale
  and lifts clean out of the svg at 375 px** — the geometry shrinks and the type does not. Value
  labels sit beside their heads now, never above them.
- **The label gutter intercepts the pointer.** Row names are furniture, not controls; the gutter is
  `pointer-events: none` so the plot's hit area sees the pointer wherever a value label crosses it.
- **A label that would leave the frame flips to the inside.** Poland's 2000 head sits at 4 % of the
  plot; its label slid into the gutter and, at phone width, out of the figure. `.end-label` carries
  a ground chip, so a flipped label sits legibly over the connector it now covers.

The delta column is drawn **inside the viewBox**, not at `left: 100.5 %` — the mistake this base's
bump beat paid for at all seven viewports.

## What the control cost, and what it was paid with

The yardstick's eleven pills and its reserved sentence are 119 px of chrome, which at 375 x 812 —
where this beat's title alone takes 426 px — pushed the figure 78 px past the window and broke the
fit rule the plate passed without it. Given back in prose rather than in plot: the caveat, the
reading line and the source line are each a sentence shorter, the untouched option is "Aucun repère"
rather than a phrase, and the control opens 4 px below the legend instead of 10. The plot sits on
`PLOT_FLOOR_PX` at that width either way. Ten rows of fixed 11 px type in a 120 px plot is a real
limit of this beat at phone width and it is not this pass's to close.

Two decisions the render made, not the plan:

- **The uprights are drawn BEHIND the data.** Drawn last, as the scatter draws them, each reference
  ran through the two heads it is read off and the casing's ground dots punched holes in the very
  marks the option names. There are twenty heads and ten hairlines here, not 165 translucent dots.
- **The band stops short of the bottom.** Each upright is labelled with its year at the foot, and at
  `BOTTOM_PAD = 0` those two words sat on the last row's own value labels — visible in one look at
  the United States option.

## Verification

`verify-web.mjs --file renders/{creme,nocturne,rapport}.html` — **165 / 159 / 153 passed, 0 failed,
5 skipped**, each lane driven with script on and with script off. The hit-resolution probe: **50 of
50**, from 10 of 50. Three mutations, all restored:

| mutation | what happened |
|---|---|
| the head's casing becomes the connector | all three directions refuse, naming 1,023:1 / 1,020:1 / 1,015:1 |
| the point goes back to its own bar's midpoint | 11 of 50 probes answer about the right row |
| one row name gets half again as long | the gutter goes 86 px → 195 px rather than clipping |

## Source

UN WPP via Our World in Data · life expectancy at birth, 2000 and 2023. `data.csv` is a byte-for-byte
copy of `proof/more-dumbbell-life-expectancy-gains/data.csv`.
