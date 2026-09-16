---
format: web
type: histogram
medium: chart
grounding: supported
derived: v1
---

# Beat — 127 pays sur 213 émettent moins de 4 tonnes de CO₂ par personne (web)

**Type:** histogram. **Medium/format:** chart / **web**. **Frame:** fluid.

## Claim

**127 of 213 countries (59,6 %) emitted under 4 tonnes of CO₂ per person in 2023.** The distribution
is heavily right-skewed: the median is **3,1 t** and the tail runs out to **40,1 t** (Qatar), one or
two countries per bin. The beat throws if the share under the threshold is not near six in ten.

## The bin width, which is this type's whole trap, and why it is 2 t

`chart-beat/references/types/histogram.md`: *"bin width is a decision the histogram maker makes,
invisibly, and it can manufacture or erase a peak that isn't a property of the data at all."* It
names a floor (three bins) and a ceiling (about fifty), and a working default of about ten
roughly-round bins. **The static sibling took that default — 4 t, ten bins. This page takes 2 t,
twenty-one bins, and until now said so nowhere: `render-directions-web.mjs` carried `const BIN = 2`
as a bare literal and neither file gave a reason.** Three measurements decided it, and the render
script now asserts all three rather than hoping:

- **4 t has to land on a bin edge.** The headline counts the countries under 4 t and the accent is
  spent on exactly the bins it counts. Any width that does not divide 4 puts the threshold inside a
  bar, and the accent would then claim a bin the claim does not count. That leaves 1, 2 and 4.
- **1 t combs the body of the distribution.** What separates a real outlier from noise is not how
  many bins are empty but **where the first gap falls**: at 1 t the unbroken run of bins from the
  left breaks at 18 t and leaves **seven countries (3,3 %) scattered past gaps**; at 2 t it breaks at
  28 t and leaves exactly one, Qatar, which is an outlier and not noise. The sheet's "too narrow and
  sampling noise starts looking like structure", in a form whose bars must touch. The render script
  asserts the unbroken run carries 99 % of the observations.
- **4 t hides the claim's own shape.** At 4 t the whole claim is ONE bar of 127. At 2 t it is
  **80 then 47** — the mass is in the first two tonnes, not spread evenly under four, and that is a
  reading the coarser width cannot draw at all.

**What the width does NOT do here, measured before the interaction was designed.** The sheet's trap
is a peak that moves. Counted at 1, 2, 3, 4, 5, 8 and 10 t, this distribution is **monotone
decreasing from the leftmost bin at every one of them** — 54, 80, 104, 127, 145, 180, 189 in the
first bin, and never a second hump anywhere. There is no peak to manufacture or erase.

## Treatments spent

- `bin-named-by-both-edges-and-an-open-top` — a bin is an interval, so it is named by **both** edges,
  and the last one says it is open rather than pretending to end where the data happens to stop. An
  axis labelled `0 2 4 6` leaves the reader to guess which side of 4 a country at exactly 4 t fell
  on; this one does not.
- `the-distribution-is-furniture-and-the-case-is-ink` — the shape is the argument, so the bars are one
  neutral and only the bins the headline counts carry the accent.
- Bars **touch**: a histogram's bins are contiguous intervals, and a gap between them says the scale
  is categorical.

## THE INTERACTION, WRITTEN BEFORE THE CODE

### The one gesture that was considered first, and rejected with a measurement

A still has to pick one bin width and the reader has to trust it. Letting the reader change it is
the obvious way to turn this type's central lie into the page's honesty, so it was costed first.
**Rejected, on three measurements:**

1. **It answers with "nothing happens".** The seven widths above all draw the same monotone decay
   with the same leftmost mode. A control whose every option returns the same shape at a different
   resolution is a control that changes the picture and not the reading.
2. **No vocabulary in this format expresses it, and a fourth one is not written for one beat.**
   `filter.ts` is monotone narrowing from an all-visible default — `filterCss` emits no rule for the
   unfiltered option, so every candidate bin set would be drawn on top of the others in the state the
   page ships in, and `assertFilterDeclaration` refuses an option that keeps every drawn datum.
   `stack.ts` emits only `translate`, so a merged pair becomes a double-height bar at **half** its
   interval's width with a gap where its partner stood — the one picture this type forbids.
   `level.ts` adds a reference and moves nothing, and `assertLevelDeclaration` refuses two marks on
   one series, so a set of 11 to 41 bin edges cannot be one option.
3. **It would put the accent behind a control.** At 3 t or 5 t the 4 t threshold falls inside a bar,
   so the accent that carries the claim could not be drawn — `directed-interaction.md` rule 5.

What the page does instead is answer the question underneath the one about bin width: *if I cannot
choose the bins, give me the numbers no choice of bins can move.* Quantiles are exactly that.

### What this page earns

A still fixes the author's own cut — 4 t — and the axis it draws is 42 t wide, so the eye reads a
long flat tail and cannot weigh it. **This page hands the reader the distribution's own quantiles,
which are properties of the 213 values and not of the binning**: three quarters of the world's
countries stop at **5,8 t**, which is 14 % of the drawn width; the remaining 54 spread over the other
**86 %**. Nine in ten stop at 11,3 t, and ninety-nine in a hundred at 25,4 t — so **the last 40 % of
this chart's width carries two countries**. Not one of those numbers is printed on a still of this
claim, and none of them can be, because none of them is a bin edge.

### Control 1 — the coverage band

- **The reader's question.** « Cette queue qui prend la moitié du graphique, elle pèse combien —
  et les trois quarts des pays, ils s'arrêtent où au juste ? »
- **The gesture.** `toggle-a-comparison`, on the `level.ts` vocabulary: radios plus CSS generated at
  build time, `:checked` and `:has()` on the figure, no listener, no script. It is the corpus's own
  name for a reader picking what everything else is measured against —
  `web-grouped-bar-wind-vs-solar` declares it on the same vocabulary. `level.ts`'s `x` mark,
  **unwidened**: on a histogram the measured variable IS the x axis, so a coverage band's edge is a
  reference stood up, and a flat one would name a count rather than a quantile. No vocabulary file is
  edited by this beat.
- **`brush-a-range` was what this wanted to be, and it is not available here.** The repertoire
  records that gesture as shipping nowhere and as costing a script, with "named bands give most of it
  with none" — which is exactly the shape of this control. But `interaction-plan.ts` admits
  `brush-a-range` only on a **filter** control, and the filter here would have to hide the bars
  beyond the band rather than hollow them, which takes part of the distribution off a plate whose
  claim is the distribution; its derived note is also a fixed English template on a French page. So
  the gesture is named for the mechanism the page actually ships.
- **The option's key is the BAR the quantile falls inside**, not the quantile, so the reader measures
  against a datum that is on the plate and `assertLevelDeclaration`'s own refusal stays meaningful.
- **What changes in the picture.** One dashed upright stands at the chosen quantile, on a ground
  casing so it stays readable where it crosses a bar. The bar it falls inside keeps its fill and
  takes an ink ring; **every bar entirely beyond it is hollowed to an outline** — the span outside
  the band stepping back, geometrically rather than by a second tone, because two tones clamped to
  the same floor on the same ground come out identical by construction. A sentence under the control
  gives the four readings the plate cannot print: the quantile's value, how many of the 213 sit under
  it, its multiple of the median, and what share of the drawn width the countries beyond it occupy —
  **86 %, 73 %, 40 %** for three quarters, nine tenths and ninety-nine hundredths.
- **Why the three options start at three-quarters, and the two reasons are not the same reason.**
  P25 is refused by rule 5, mechanically: at 0,99 t everything from 2 t up lies beyond the band, so
  the `[2,4)` **accent** bin would be hollowed — the component throws on it, and a mutation adding
  that option was refused in all three directions. P50 is not refused by anything; it was dropped
  because **the median is already drawn unconditionally on this plate**, so an option laying a second
  rule at the same x answers with a picture the reader is already looking at. Every offered quantile
  sits above 4 t, so both accent bins stay solid whatever the reader presses.
- **What it does not touch.** The title, the caveat, the two accent bins, the median rule and the
  axis are drawn in every state.

### Control 2 — the bar

- **The reader's question.** « Combien sont tombés là — et QUI ? »
- **The gesture.** `ask-a-mark`. A histogram's bar says "this many fell here" and refuses to say who.
  That refusal is the form working correctly — a distribution is not a ranking — but it is also the
  first question every reader asks. Every bar answers with its interval, its count, its share of the
  whole, **the running share up to its own top edge**, and the countries inside it (the four largest,
  then a count of the rest).
- **What changes in the picture.** The bar under the pointer, the finger or the key takes full ink —
  the shape the reading is about, not a dot dropped on top of it.

## What the render taught

- **The median rule was the type sheet's own amendment, unmeasured, on the web sibling.** It was
  `mix(ground, ink, 0.6)` running the full height of the plot, and the median falls inside the
  `[2,4)` **accent** bar: 5,68:1 against the creme ground and **1,17:1 / 1,23:1 / 1,57:1 against the
  bar it crosses**, in creme, rapport and nocturne. The static sibling answered by inking its rule
  near black, which works there because the bar it crosses is a mid grey; here no ink reads at 3:1
  over both a near-white page and this accent (black reaches only 2,96:1 on rapport's `#1F5C8B`). So
  every full-height rule on this plate — the median and the three yardsticks — is **cased**: a
  ground-coloured dash under the ink dash, same pattern, measured against its own casing wherever it
  crosses a mark, and asserted over every fill on the plate rather than looked at.
- **The bars' separating hairline could not stay a stroke on the rect.** `levelCss` emits
  `:has(#…:checked) [data-col] { stroke: none }` at (1,1,0) to take every ring off before it puts one
  back, and the bars are what carry `data-col` here — so choosing any band stripped the 1 px ground
  stroke that keeps twenty-one contiguous bars apart. The separation is drawn as its own ground
  hairline at each internal edge now, from the baseline up to the shorter neighbour's top, and the
  rects carry no stroke of their own.
- **`[data-axis]` is drawn by nothing on this plate.** A histogram has no category gutter, so the two
  rules `levelCss` emits to light one name and step the others back match nothing. That is left as it
  is rather than manufactured: the pill itself is the affordance, and inventing a row of names for a
  control to light would be furniture bought for a stylesheet.

## Verification

`verify-web.mjs` on all three pages, which drives a real browser at laptop-wide, phone and
laptop-wide-with-no-JS: **creme 117 passed / 0 failed / 6 skipped, rapport 111 / 0 / 5, nocturne
105 / 0 / 6**.

Four mutations, each run against the whole render:

- a coverage band at the first quartile → refused in all three directions, *"the bin 2–4 carries the
  accent and would be hollowed by the band(s) 0"*.
- `BIN = 3` → refused, *"4 has to be a bin EDGE — a width of 3 puts it inside a bar"*.
- the rules cased in their own ink → refused, *"1.000:1 against each other"* in creme and, one step
  earlier, *"neither its dash #000000 (2.962:1) nor its casing … reaches the 3:1 non-text floor"*
  against rapport's accent bin — the arithmetic that put the casing there in the first place.
- the band's foot label removed → `verify-web.mjs` fails nine checks, three per viewport,
  *"choosing \"4\" draws its own words on the plot and nobody else's — 0/0 of its own drawn"*. That
  was found by the check before it was written back, not invented for this list.

**What nothing here can see, so it is not trusted past it.** Delete the hollowing rules and every
check stays green: `assertInteractionPlan` measures the SENTENCE an option reveals and says so in its
own header — "a transform is not a reading and nothing here can see one". The hollowing was verified
by looking at the three captures with the band operated.

## Source

Global Carbon Budget 2025, via Our World in Data · 2023, 213 countries. `data.csv` is a byte-for-byte
copy of `proof/static-carbon-footprint-spread/data.csv`.

## Precision

```json splash:precision
{
  "kind": "pointer",
  "rounding": null,
  "asserts": [],
  "values": {},
  "staticFloor": [],
  "onDemand": [],
  "unfound": [],
  "covers": {
    "claim-datum": null,
    "the-threshold-the-headline-counts-must": null,
    "bin-edges-are-fixed-across-every": null,
    "the-beat-throws-if-the-share": null,
    "asserted-in-the-js-off-floor": null
  }
}
```

## The choreography

```json splash:choreography
{
  "kind": "pointer",
  "promiseSource": "slot",
  "controls": [
    {
      "order": 1,
      "gesture": "toggle-a-comparison",
      "input": "tap"
    },
    {
      "order": 2,
      "gesture": "ask-a-mark",
      "input": "hover"
    }
  ],
  "keyboard": true,
  "degradesTo": "static-frame"
}
```
