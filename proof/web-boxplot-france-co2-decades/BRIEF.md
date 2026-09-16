---
format: web
type: boxplot
medium: chart
grounding: supported
derived: v1
---

# Beat — Le CO₂ par personne des Français a culminé dans les années 1970 (web)

**Type:** box plot. **Medium/format:** chart / **web**. **Frame:** fluid.

## Claim

France's annual CO₂ per person peaked in the **1970s** (median 9,96 t) and has fallen in **every
decade since**: 5,41 → 7,59 → **9,96** → 7,43 → 6,92 → 6,75 → 5,17 → 4,27. The runner computes every
summary from the frozen file and **throws rather than draw the headline** if any decade after the
peak is not below the one before it. The 2020s carry n=5 (a partial decade), which each box states
under its own label.

## The whisker rule, and where the page says it

**Tukey's, and it is not a formality here — it is the one thing this type can get wrong.** Quartiles
are the linear-interpolation definition; the fence is Q1 − 1,5 × IQR and Q3 + 1,5 × IQR; **each
whisker stops at the furthest real reading still inside its own fence**, never at the group's
extreme. Seven of the eight decades have no reading outside their fence, so for them the whisker end
and the decade's true min/max are the same number and nothing distinguishes the two rules. **The
1980s is the decade that separates them**, and it is the whole reason to state the rule:

- 1980s Q1 7,06 · Q3 8,03 · IQR 0,98 · upper fence **9,50**
- the decade's true maximum is **1980, at 9,54 t** — the tail of the 1970s oil-crisis highs carrying
  into the first year of the next decade
- so the whisker is clipped to **1981, at 8,53 t**, and 1980 is drawn as a hollow ring above it

Stretching the whisker to 9,54 would have laundered that single year into looking like ordinary
1980s spread — the shortcut `chart-beat/references/types/boxplot.md` names as this type's one
honesty failure.

**What the page was saying before, and what it says now.** The shipped caveat read « les moustaches
à 1,5 écart interquartile ». That names the multiplier and stops there: it does not say the whisker
is **clipped to a real reading**, and nothing on the page said what the hollow ring above the 1980s
**is**. A boxplot that does not state its whisker rule is unreadable in principle, and a mark with
no key is worse than a mark that is absent. The caveat now reads « Moustaches de Tukey — chacune
s'arrête à la dernière lecture réelle située à moins de 1,5 écart interquartile de son quartile,
jamais à l'extrême ; au-delà, l'année est un cercle creux (1980, 9,54 t) », and the ring's own hover
reading names 1980 as « valeur aberrante au sens de Tukey ». Both halves are computed in the runner
from the fence, never typed — the clause disappears on its own if a moved file produces no outlier.

**And stating it is the only defence there is.** Mutating `Math.min(...inside)` / `Math.max(...inside)`
to `...values` — the exact shortcut the type sheet names — stretches the 1980s whisker up to 9,54 t
and **nothing in this toolchain goes red**: all three directions render, `verify-web` stays green,
and the hollow ring simply lands on top of the whisker cap it was supposed to stand clear of. There
is no mechanical guard for this and there cannot easily be one, because for seven of the eight
decades the two rules give the same number. The page's own sentence is the guard.

## The interaction, written before the code

`references/directed-interaction.md`, rule 1. Two controls, each a question a reader of *this* claim
actually arrives with. Both are carried into the render as `interaction`, so this prose and the
markup cannot drift.

**What this page earns, and a still cannot.** A still of eight boxes can print eight medians, and
eight falling medians is exactly what the headline asserts. What it cannot do is tell the reader
whether the decades **separate** — eight medians can fall monotonically while the boxes underneath
them sit on top of each other, and a reader has no way to see that from a row of rectangles at eight
different x. Here the reader parks one decade's own quartiles flat across the other seven, and what
comes back is the fact the falling medians bury: **the 1980s box and the 1960s box are the same box**
(7,06–8,03 against 7,09–8,11, the widest overlap on the plate at 0,94 t). Twenty years after the
1960s, the fall from the peak had returned France to its 1960s spread and no further. Six years of
the **2000s** fall inside the 1990s band — the largest such count, and the one the `earns` sentence
carries; four years of the **1950s** fall inside the 2010s band. The peak and the present are the
only two decades whose bands contain no year from anywhere else.

### Control 1 — the yardstick

- **The reader's question:** « Cette décennie-là, elle est vraiment au-dessous de la précédente, ou
  est-ce que les deux se recouvrent ? »
- **The gesture:** `find-your-own-case` — `assets/level.ts`, unchanged, no fourth vocabulary. The
  reader is in this data: they lived through one of these decades.
- **What changes in the picture:** the chosen decade's **three own levels** — Q1, median, Q3 — lie
  flat across all eight boxes as dashed rules on a ground casing, so every other box is read against
  that decade's band rather than against the axis. The chosen decade's box takes an ink ring; the
  seven other decade labels under the axis step back to muted and the chosen one lights. A sentence
  under the control gives the band in tonnes, **how many of the other seven boxes sit entirely above
  it, entirely below it, and which one recoups it**, and **how many years belonging to other decades
  fall inside that band** — four derived readings, none of them printed anywhere on the plate.

**Three series, and all three or none.** `assertLevelDeclaration` refuses an option that lays a rule
on some of the series a beat draws, on the argument that a half-laid yardstick « answers half the
question while looking like it answered all of it ». That refusal is exactly right on this type and
it is why this beat declares `q1`, `median` and `q3` as three series rather than laying one rule at
the median: **a box plot's argument is the spread**, and a yardstick that carried only the median
would measure this picture on the one channel a plain line chart already has.

### Control 2 — ask a year

- **The reader's question:** « Cette année-là, elle vaut combien, et elle est où dans sa propre
  décennie ? »
- **The gesture:** `ask-a-mark`.
- **What changes in the picture:** a box is a five-number **summary** — it hides the ten readings it
  was computed from, and nothing in it separates a decade that fell steadily from one that swung and
  landed on the same median. So the 75 years are drawn as their own dots beside their boxes, and one
  answers with its year, its value, its decade's median and n, and whether it sits above or below
  that median — or that it is the decade's Tukey outlier. The static plate can draw the dots. It
  cannot name one of them.

### One control that is NOT shipped, and the measurement behind the refusal

**A filter over the decades.** Tempting, and refused: the encoded variable *is* the decade, so
narrowing to a subset removes boxes the claim is made of. `directed-interaction.md` allows a filter
only where the named set is « ORTHOGONAL to the encoded variable, so narrowing can never hide the
claim » — here it would hide the peak, which is the claim. The yardstick answers the same
comparison question without taking a single box off the plate.

## Treatments

`the-sample-is-drawn-beside-its-own-summary` — every year drawn as its own dot beside its box.
`every-band-names-its-own-statistic` — each box prints its median above it and its n under it, so a
partial decade cannot be mistaken for a full one. `the-subject-is-ringed-not-recoloured` — the
yardstick rings the chosen decade rather than repainting it: the accent is already carrying the
peak, and a control that spent it would say two decades are the subject at once.

## The axis is fitted, and that is the type's own rule

A box plot encodes POSITIONS: nothing on this page is measured by its length from a baseline, so the
axis is fitted to the readings (3–11 t) rather than anchored at zero, and the caveat says so in
words. What the component *does* check is that the fitted window contains every mark drawn inside
it, outliers included — an axis that clips a reading is worse than one that wastes space, because
the clipped mark is silently gone.

The first render anchored at zero and wasted the bottom third of the plot; the type sheet and the
static sibling both refuse that, and the render showed why.

## Two collisions the eye caught, both now the scale's business rather than this beat's

- **The top tick's label sat on the caveat.** A scale whose maximum IS its top tick puts half that
  label outside the plot's own cell. Fixed once, in `#shared/design-base/web.mjs`'s `fitY`, which
  every directed web beat now shares.
- **The three level words could not stack at one x.** Each rule owes the reader a word saying which
  level it is — three dashes in one ink are three references in one ink, and the order alone is an
  assertion in the runner rather than a label on the plot. Stacked at the plot's left edge they
  collided immediately: the 1970s box is **0,03 t** from its Q3 to its median and the 2010s is
  **0,09 t** from its median to its Q1 — 2 px and 6 px at 1400, under a 17 px line — and a
  de-collision typed in geometry units is wrong at one end or the other, because a geometry unit is
  1,3 reader px at 1400 and 0,4 at 375. So the three words are separated on the axis that does not
  stretch against them: each sits in the midpoint of a **different inter-band gap**, at its own
  rule's height. Three words at three x cannot meet whatever the band does, and each gap is a fixed
  share of the plot.
- **The peak's note landed on the peak's own printed median.** It is anchored at the left edge now:
  the accent and the accented decade label under the axis are what point at the peak, and the box
  already carries its number.

## Verification

`verify-web.mjs --file renders/<direction>.html`, driving a real Chrome at seven widths with the
script on and again with it **off**: **creme 153 / 0 / 5, nocturne 147 / 0 / 5, rapport 141 / 0 / 5.**
Every skip is the filter's — this beat ships none. The no-JS pass clicks all eight yardstick options
and reads back each one's sentence, so the control is verified working with no script rather than
assumed to be.

**What the control cost, measured.** The fieldset and its sentence are 94 px, and at 375 × 812 this
beat had no slack: nocturne spends **351 px of an 812 px window on the title alone**. The first
build with the yardstick stood 120 / 194 / 26 px outside the window in creme / nocturne / rapport.
It is closed, and not by a layout hack — the caveat and the reading line were cut to what they
actually owe the reader (the whisker rule, the two gestures), the legend and the untouched option
took the short words the dumbbell already uses, and the note row's own 4 px gap is overridden in
this beat's stylesheet. All three now fit exactly.

## What survives with JavaScript off

The whole plate: eight boxes, the 75 dots, every median, every n, the peak's accent and its note,
the caveat carrying the whisker rule, the reading line and the source. **And the yardstick**, in
full — `level.ts` is radios plus `:checked`/`:has()` generated at build time, so every option's three
rules, its ring, its label lighting and its sentence work with no script at all. What does not
survive is the tooltip box on the year dots; the 75 readings are still each `tabIndex={0}` with the
full answer on `aria-label`, baked in at build time.

## Source

Global Carbon Budget 2025, via Our World in Data · France, 1950–2024, 75 annual readings. `data.csv`
is a byte-for-byte copy of `proof/more-boxplot-france-co2-decades/data.csv`, re-parsed here.

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
    "every-summary-is-computed-from-the": null,
    "a-partial-category-states-its-n": null,
    "the-overlap-counts-the-sentence-reports": null,
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
      "gesture": "find-your-own-case",
      "input": "hover"
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
