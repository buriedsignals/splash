---
format: web
type: scatter
medium: chart
grounding: supported
---

# Beat — Au-delà de 30 000 $ par personne, le revenu n'achète presque plus d'années de vie (web)

**Type:** scatter. **Medium/format:** chart / **web**. **Frame:** fluid.

## Claim

Across **165** countries in 2021, life expectancy rises steeply with income and then flattens: the
**41** countries above **30 000 $** per person span **13,9 years** (71,2 to 85,1), while the **124**
below span **41,1**. Both bands are measured off the data, and the beat throws if the upper band is
not much narrower than the lower one.

## The interaction, written before the code

`directed-interaction.md`, rule 1. Every sentence below was written before a line of this build, and
it travels into the render as `interaction`, so the prose and the page cannot drift.

**What this format earns.** A still can draw the author's threshold and assert that the band above
it is narrow. It cannot let a reader stand anywhere else. This page lets the reader park the
threshold on a country they hold — and the counts that come back are the claim in their hand: at
Nigeria, **119 countries are richer and not one of them lives a shorter life**; at the United
States, **7th richest of the 165, forty poorer countries live longer**. That reversal is the
flattening, and no still of this claim has any way to draw it.

### Control 1 — the reader's own case, laid across the cloud

- **The reader's question.** « Ce pays-ci, où est-il dans le nuage — et combien de pays plus pauvres
  que lui vivent plus longtemps ? »
- **The gesture.** `find-your-own-case`, on `assets/level.ts` (see *What was widened*). The
  repertoire in `directed-interaction.md` records this row as shipping nowhere in the corpus; this
  is the first beat to reach for it, because it is the row written for a reader who is *in* the
  data.
- **What changes in the picture.** Two references cross the plot at the chosen country's own two
  values — one **upright** at its income, one **flat** at its life expectancy. Its point takes a
  ring among 164 that stay anonymous, and its name is written at the foot of its own income rule. A
  sentence under the control gives its rank on each axis, how many countries are richer *and live
  shorter*, and how many are poorer *and live longer* — four derived readings, computed in the
  runner from the frozen file, that no axis on this plate carries.
- **Where the name goes was decided by looking.** Written at the crossing first: the band's own
  note is anchored to the right edge at the band's vertical centre, and the United States crossing
  (76,4 ans, 87 % across) landed on top of it — two sentences in one strip, one of them
  argument-bearing. The threshold note labels its rule from the top of the plot; this one labels its
  rule from the bottom, through the same `noteAnchor`, so the two can never meet each other and
  neither can reach the band's note. What says *which point* is the reader's is the ring, which is
  that treatment's own instrument.
- **The references are in INK, never in the accent.** The accent on this page carries the author's
  threshold and its band, and nothing else. A yardstick painted in it would make one hue mean both
  "the claim" and "you clicked here" — and the accent would be spent twice. Measured consequence,
  not taste: the yardstick's own guard refuses the accent by name.

### Control 2 — which one is that

- **The reader's question.** « Lequel est-ce, et combien de gens vivent là ? »
- **The gesture.** `ask-a-mark`.
- **What changes in the picture.** The point answers with its country, both of its readings, its
  region and its population. Population is now carried **only** here — see the trap below — so this
  control is the one place on the page that quantity exists at all.

### The option set, and why it is six and not 165

The honest set for "find your own case" is every country. It is refused, and the refusal is
**measured rather than argued**: the control is `flex: 0 0 auto` inside a figure capped at `100dvh`,
so every pill row comes out of the plot's own height. Both pages were built and driven at 375 × 812
(creme):

| | the six-pill control | all 165 options |
| --- | --- | --- |
| the control's own height | 79 px | **1 256 px** |
| what is left for the plot | 160 px | 120 px, its floor |
| the document in an 812 px window | **812 px — it fits exactly** | **1 882 px** |

`verify-web.mjs` on the 165-option build: *"no vertical scroll inside the visual — document 1882px
in a 812px window (overflow 1070px)"*, plus the x axis and the source line both off screen, and
`0/0` readings answering a pointer because there is no plot left to point at. The 165-pill page is
not a worse version of this control; it is a page with no chart on it.

So the options are **derived, not hand-picked**: the most populous country of each of the six world
regions the frozen file names — Nigeria, Brazil, China, Russia, Australia, United States, in the
file's own spelling. They are six marks a reader can already point at, they span the income axis
from 5 029 $ to 57 523 $, and together they hold 30,2 % of the 7,85 billion people in the file. The
runner asserts the rule that chose them, so an option added by hand refuses the render.

## Treatments spent

- `the-distribution-is-furniture-and-the-case-is-ink` — the claim is about the SHAPE of the whole
  cloud, so there is **no named subject**: every point is one neutral, and the only ink carrying an
  argument is the threshold rule and the band it names. The reader's yardstick is the one case that
  becomes ink, and only while they hold it.
- The x axis is **logarithmic and says so in words**. A log axis is the most common silent lie in
  this family: it makes a tenfold difference look like a step.

## What was widened, and why nothing new was written

`assets/level.ts` — **one type and one refusal**, not a fourth vocabulary. `LevelMark` carried a
single coordinate, `y`, because every type that had needed a yardstick until now spends its x on
category. A scatter is the one type in the catalogue where **both** axes carry a measured value
(`chart-beat/references/types/scatter.md`, first paragraph), so a case's own values are two
references, one per axis. A mark may now declare `x` instead of `y`; which key is present names the
axis, a mark carrying both is refused rather than resolved by precedence, and an `x` is
range-checked against a `width` the beat must pass. Every other part of the vocabulary — the slug,
the ring, the required `note` and `announce`, the generated CSS, the "every option names every
series" refusal — is used exactly as the grouped bar uses it. `drawnSeries` here is the two AXES,
`income` and `life`, so that existing refusal already says a country's yardstick must carry both of
its coordinates or none.

## The type sheet's trap, and the form it actually took

`references/types/scatter.md`: *"Bubble size lies the moment someone maps a value to RADIUS instead
of AREA."* The literal form was **absent** — the build took `sqrt(pop / maxPop)`, which is
area-proportional and correct. The trap's *reason* was wide open:

- The mark radius was `Math.max(2.4, sqrt(pop / maxPop) * 22)`. That floor pins **95 of the 165
  countries at an identical size across a 253× population range** (67 222 to 16 974 309 people),
  while the caveat stated flatly « la surface du point étant la population ». The drawn size did not
  mean what the caption said it meant, for 58 % of the cloud.
- The floor could not simply be lowered. The population range in this file is 21 220:1, so an
  area-true scale that draws China at 22 units draws Tuvalu at **0,15** — well under one reader
  pixel. Area-true and visible are not both available on this frame.
- And the floor was never buying reachability: `interaction.mjs` resolves the pointed mark by
  nearest `cx`/`cy`, not by hit-testing the circle, so a mark's radius has nothing to do with
  whether a reader can ask it.
- **The static sibling had already refused this third variable in writing** —
  `IncomeLifeExpectancyScatter.tsx`: *"no bubble, no third variable, so the 'radius should scale by
  area not by value' trap that sheet names does not apply here at all."* The web build quietly
  reintroduced it.

So the size channel is gone. Every point is one neutral mark at one radius, which is what this
beat's own declared treatment said it was drawing all along, and population lives where it was
always readable: in the answer the mark gives when asked.

## Two more defects this pass measured

- **The mark's contrast was measured on a colour the page never paints.** The build lifted the dot
  fill to the 3:1 non-text floor and then drew it at `fillOpacity 0.6` — so the mark a reader
  actually sees measured **1,752:1** in creme, 1,968 in nocturne, 1,744 in rapport. The fill is now
  solved backwards from the composite: the colour painted at the mark's own opacity lands on the
  floor, and the component throws if no in-gamut fill can.
- **The yardstick crosses the accent, and in ink it vanishes there.** Ink against the accent
  threshold rule measures **2,979:1** (creme), **1,627:1** (nocturne), **2,873:1** (rapport) — under
  the non-text floor in all three, and the horizontal yardstick crosses that rule every single time,
  at the exact landmark the comparison is about. Each reference is drawn twice: a wider ground
  casing under the dash, same dash pattern, so the halo shows only where the dash does. The guard
  measures the dash *and* the casing against every fill the rule crosses.

## Two things the first render taught (kept from the previous pass)

- **A hand-picked tick list set the scale's ends**, so every country poorer than the first tick or
  richer than the last was drawn outside the frame. The domain is the data's own now, and the
  component throws if any point falls outside its own axes.
- **Rounding the ends out to decades wasted two thirds of the frame** on a scale where empty space
  is itself a claim about how far apart countries are. The ends are the poorest and richest
  readings.

## Verification

`verify-web.mjs` on all three directions: **creme 135 passed / 0 failed / 6 skipped**, nocturne
123 / 0 / 5, rapport 129 / 0 / 5. Every option of the yardstick is clicked at the pill's own centre,
with scripting on and again with **JavaScript disabled** — the control is radios plus generated CSS,
so it behaves identically in both, which is checked rather than claimed.

## Source

Our World in Data · life expectancy at birth and GDP per capita (constant international dollars),
2021. `data.csv` is a byte-for-byte copy of `proof/static-income-life-expectancy/data.csv`.
