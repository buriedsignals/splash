---
format: web
type: line
---

# Beat — Life expectancy in Switzerland rose 15 years since 1950 (web, directed)

**Type:** line. **Medium/format:** chart / **web**. **Channel:** article web. **Frame:** fluid.
**Directions:** three, `renders/{creme,nocturne,rapport}.html`.

Web sibling of `proof/more-line-swiss-life-expectancy` (the static beat) — same frozen data, same
asserted claim, same words, same colour rules — written for this format's fluid-frame /
baked-in-interaction shape and taken through the design base.

## What directing it changed, and why the page before it was not merely a restyle away

Measured on the build this replaces: it made **zero calls to `webRegisters` / `webRegister`**, had no
`renders/` and no `render-directions-web.mjs`, and its component took no `direction` prop. Its type
scale was a `FRAME` constant (24 / 14 / 13 / 12) and its colours were a ground and an accent handed
down as props. So the three filed directions could not reach it: the six registers, the arbiter, the
measured contrast floors and the adaptive leading all stopped at its door, and the beat shipped one
page where every other directed beat ships three.

Now every size, weight, family, tracking, case and **line** on the page resolves from the direction
through `webRegisters` (`registerOf` / `leadOf`, never `.leading` read directly), and every colour
from that direction's own ground, ink and accent through `deriveFurniture` / `mix` /
`adjustToContrast`. `DirectedLifeExpectancyWeb.tsx` names **no hex at all**.

Two things the last commit earned are carried in whole, not reimplemented:

- **The interaction.** Every one of the 74 readings answers with the share of the whole 15.0-year
  climb banked by that year — something the drawing cannot say. Computed in the runner, asserted
  there, read back in the component.
- **The fix for this type's named trap** (below), now derived from the direction instead of typed.

## Claim

Life expectancy in Switzerland rose by **15.0 years between 1950 and 2023**, from 68.9 to 84.0,
**first passing 80 in 2001**, and it fell in **9** of those years — most recently 2020 and 2022.
Every number in that sentence is computed by `render-directions-web.mjs` from the frozen CSV and
printed before the render; none is asserted from this file's own approximation.

The headline's `delta` and the 2023 reading's own answer are **one subtraction, checked to be one**:
the runner refuses to render if the last year's answer does not contain the title's own number.

## Data

- Source: UN, World Population Prospects (2024), via Our World in Data, `life-expectancy` grapher.
- `data.csv`: the static sibling's own frozen fetch (148 rows, 1876–2023, Switzerland only),
  re-verified here independently — entity check (every row reads "Switzerland"), row count (148) and
  the 1950-filtered span (74 readings, 1950–2023) all asserted before the component sees the data.
- Original fetch: `https://ourworldindata.org/grapher/life-expectancy.csv?country=~CHE&csvType=filtered`.

## What the type sheet asked of it

Walked against `chart-beat/references/types/line.md`, rule by rule, on these three renders.

- **The zero.** The sheet's central warning is a forced zero flattening the very change the chart
  exists to show, and it is the rule this beat spends. The readings run 68.9–84.0, so
  `scaleLinear().domain(extent(readings)).nice()` lands on 68–84. A zero floor would leave the whole
  15-year climb inside the top fifth of the plot. **The caveat now says so** — a fitted axis that
  does not state that it is fitted is the half-honest version, and the sentence is built from the
  frozen file's own first and last readings rather than typed.

- **The trap the sheet names DOES apply, in a form its wording does not cover — and it applies
  DIFFERENTLY IN EACH DIRECTION, which is the finding of this pass.** The sheet's trap is two series'
  end-labels colliding. This beat draws one series — one entity, one value column, one `path`, one
  accent — and it still carries **two direct labels stacked in the same band**: the crossing note at
  80.3 and the end label at 84.0, **22.4 % of the plot's height apart**, a constant, while both
  labels are a FIXED pixel height. So the gap closes as the plot shrinks.

  The previous pass fixed that with a `@media (max-width: 479px)` breakpoint, measured on its own
  type scale. Under a direction that breakpoint is **wrong**, and measured wrong in two independent
  ways:

  | direction | annot register | note box | gap at 480 px with the typed breakpoint |
  | --- | --- | --- | --- |
  | creme | serif italic 13 | one line, 20.2 px | clear by 6.7 px |
  | rapport | geometric sans 10, uppercase, tracked | one line, 16.0 px | clear by 11.2 px |
  | nocturne | geometric sans 10, **uppercase, 1.8 px tracking** | **two lines, 30.0 px** | **overlapping by 2.4 px** |

  Two defects, both fixed here and both from the same cause — a number that was right for one set of
  registers:

  1. **The note wrapped.** `noteAnchor` lets a label wrap rather than run off the frame, which is
     right for a long note and wrong for a four-word one: under `nocturne` the tracked uppercase note
     laid itself out in two lines and a box twice as tall as anything had allowed for. The note is now
     `nowrap`, and the horizontal safety `noteAnchor` was providing is **re-established as a refusal**
     rather than dropped — the component measures the note in the direction's own annot register and
     **throws** if half of it does not fit beside its own point on the narrowest plot this format is
     verified at (272 px). Measured: widest rendering 116 px (nocturne), space each side 82 px.
  2. **The breakpoint is now derived, and it is asked of the plot rather than of the window.** The
     component computes, from this direction's own `leadOf`, the plot height at which the note's lift,
     the note's box, half the end label's box and one lift of clearance stop fitting inside the band —
     **206 px under creme, 186 under rapport, 185 under nocturne** — and flips the note under its own
     point below it, through a `@container` query on the overlay. A viewport media query could not do
     this correctly even with the right number: the format clamps the whole figure to the window's
     height, so in a short window the plot shrinks while the viewport stays wide and a width-based
     breakpoint never fires at the size where the labels collide.

  Both placements stay ON the point; neither is a slide sideways off the mark it annotates, which is
  the sheet's own remedy. **Measured after the fix: 9 widths × 3 directions, zero label collisions,
  and `document.scrollWidth` equal to the viewport at every one** (320, 360, 375, 414, 479, 480, 768,
  1400, 1600). The tightest remaining gap is 11.1 px.

- **The sheet's "can a reader locate the point the chart names" test.** The crossing note reads
  **"past 80 in 2001"** and states its own year, which the decade ticks (1950…2020) otherwise could
  not have given a reader; the end label states its own at the other end.

- **A missing reading ends the run outright.** Nothing is bridged, because nothing is missing: the 74
  readings are consecutive years, asserted in the runner (span 1950–2023, count 74).

- **No fill, no marker at every point.** The 74 `.pt` circles are `fill="transparent"` hit targets,
  not markers. The only two visible dots are the 2001 crossing and the 2023 end — the two points the
  argument names.

- **Axis density derived from the span.** Eight x ticks a decade apart over 74 years. On y the fitted
  scale's own ticks are 70 / 75 / 80, and 70 is dropped because its label would print inside 9 % of
  the plot's height of the 1950 reference rule's own label. The top of the scale (84) carries no tick;
  the end label states that reading directly, in the series' own colour, which is what this type asks
  for instead of a legend.

## Treatments — what the arbiter offered, what was spent, what was declined

`applicableTreatments` on this beat's own facts offers four:

- **`accent-marks-the-thread` — spent.** One series carries the direction's accent and nothing else on
  the frame is chromatic. The gridlines, the reference rule, the crossing dot, both notes and every
  axis label are steps off the direction's own ground.
- **`direct-end-label-in-the-series-colour` — spent.** The series is named at its own end, in its own
  colour, instead of a legend.
- **`the-subject-is-ringed-not-recoloured` — declined.** It is a treatment for a subject inside a
  crowd. There is one series here, so there is no crowd to ring it out of.
- **`area-to-reference` — declined on this type's own sheet.** Filling between the line and the 1950
  rule is the *area* type's instrument; `line.md` refuses a fill "unless the fill itself is carrying a
  second, named quantity", and here it would carry the same quantity twice. The reference is drawn as
  a rule and named on the rule instead.

Two things this beat does that the arbiter does **not** offer, recorded rather than claimed:

- `crossing-marked` does not fire. Its predicate looks for a reading that comes back **down** to a
  reference after the series' peak; this series crosses 80 going **up** and never returns. The marker
  is drawn anyway because the static sibling's claim names that year — it is the claim's, not a
  treatment's.
- `the-target-is-named-on-the-line-that-draws-it` does not fire either: it is predicated on
  `markerCount`, which counts a per-row target of the bullet's kind and is zero here. Naming the 1950
  rule on the rule is taken from `line.md`, not from the arbiter.

## The interaction, written before the code

`chart-web/references/directed-interaction.md`. The same declaration is carried into the render as
`interaction`, so `assertInteractionPlan` holds this prose against the markup the page ships.

### What this page earns

A still of this claim prints **three of its 74 numbers** — 68.9 at the 1950 rule, the crossing, and
84.0 at the end — and it draws the distance between any other year and that 1950 rule as *pixels a
reader has to eyeball*. This page answers with that distance as a number, and with the **share of the
whole 15.0-year climb already banked** by the year the reader is pointing at: the headline's own
arithmetic, run on all 74 years instead of on one. A still can state the climb and a video can play
it; neither can be asked *how much of it had happened by 1985*.

### Control 1 — ask a mark

- **The reader's question.** *"How much of the climb had already happened by the year I am looking
  at?"* A reader arrives with a year of their own: the year they were born, the year a parent was,
  2001 because the chart names it, 2020 because they lived it.
- **The gesture.** `ask-a-mark`. Pointer, tap and keyboard focus share one path; a pointer anywhere in
  the plot resolves to the nearest year by x, so no tap has to land on a 5-unit circle, and
  Left/Right/Home/End step year by year from the keyboard. Every reading carries the same string on
  `aria-label`, separators turned into commas, so a reader who never sees the tooltip gets the whole
  answer and not a thinner half of it.
- **What changes in the picture.** The year under the pointer lights, and the tooltip prints up to
  four readings the plate does not hold: that year's own value; how far it stands above the 1950 rule;
  what share of the whole climb that is; and, for the nine years the series actually fell, how far it
  fell and that it is one of only nine such years in the run.

  `2001 · 80.3 years · +11.3 since 1950 · 75% of the whole climb`
  `2020 · 83.1 years · +14.1 since 1950 · 94% of the whole climb · 0.7 below 2019, one of only 9
  years since 1950 that fell`

### The controls considered and declined

- **Open the full table.** 74 rows of the readings the hover already answers with. The claim of this
  type is the SHAPE, and 74 rows of text is the shape destroyed. The targeting problem it would fix —
  at 375 px consecutive years are about 4 px apart — is answered on a channel that keeps the shape:
  the pointer resolves by nearest x rather than by hit-testing a circle, and the keyboard steps one
  year at a time.
- **Brush a range / filter to decades.** Refused on the rule, not on taste. `directed-interaction.md`
  rule 5: nothing argument-bearing sits behind a control. Here the x-axis IS the encoded variable, so
  every option takes years off the frame — and three of the years it could take (1950, 2001, 2023) are
  the claim.

### The reading that was replaced, and why (kept from the last pass)

The beat once answered with `1997 · 79.2 years` — the year and its value, and nothing else: the
**weak form** `directed-interaction.md` warns against by name, the reading the mark's own position
already encodes handed back as text. It cleared the mechanical refusal and still taught a reader
nothing they could not have read off the axis with a ruler.

## What is NOT interactive, and stays drawn

The eyebrow, the title, the caveat, the 1950 reference rule and its label, the crossing marker and its
note, the end label, the reading line and the source line are drawn unconditionally and no control can
remove them. With JavaScript off the whole plate is still there, and every one of the 74 readings is
still `tabIndex={0}` with its full answer on `aria-label`, because both were baked in at build time.
What does not survive is the tooltip box itself.

## Verification

- `verify-web.mjs` on each delivered file: **creme 93 passed / 0 failed / 6 skipped**, **nocturne
  87 / 0 / 5**, **rapport 87 / 0 / 5**. Every skip is this beat's own shape — it ships no filter.
- Driven by hand in a real Chrome at **1400 × 900 in all three directions**: a pointer on 1985 answers
  `1985 · 76.9 years · +8.0 since 1950 · 53% of the whole climb` in each; `End` reaches 2023 and
  answers with the title's own number, three `ArrowLeft`s reach 2020 and its fall clause, `Home`
  reaches 1950 and the baseline sentence. Captured through `Page.captureScreenshot` directly, never
  `page.screenshot()`: the latter toggles the viewport override, which fires a `pointerleave` that
  clears the tooltip before the frame is painted — the capture would have lied.
- Overlay geometry re-measured at **nine widths × three directions**: no two labels collide at any of
  them, and the document never grows wider than the window.

### Does it fill its box — measured, not eyeballed

The standing complaint against this beat's picture was that the chart sat in the upper part of its
frame with empty space below at 1400 px. **It was real, and small:** the undirected page measured
829 px of figure in a 900 px window at 1400 × 900 — **71 px, 7.9 %, empty below the source line**.

It is closed, and not by a layout hack: the directed page carries the two blocks the undirected one
had no place for — the eyebrow above the title and the reading line below the plot — and they are
exactly what the gap was.

| 1400 × 900 | figure | plot | fill | empty below |
| --- | ---: | ---: | ---: | ---: |
| before (undirected) | 829 | 706 | 92.1 % | 71 px |
| creme | 900 | 700 | 100 % | 0 px |
| nocturne | 900 | 662 | 100 % | 0 px |
| rapport | 886 | 709 | 98.4 % | 14 px |

At 1600 × 800 all three fill the window exactly. At 768 × 1024 the figure is 61–66 % of the window's
height, and that is **the format's design, not this beat's defect**: `.chart-figure` grows its height
WITH its width through `aspect-ratio` and is only ever clamped downward by `max-height: 100dvh`, so a
figure embedded in an article is never stretched to fill a tall window it does not need.

## The mutations run against this beat's own guards

Each was applied, run, and reverted; each reddened with a message that names what broke.

| mutation | what went red |
| --- | --- |
| the fall comparison inverted (`<` → `>`) | `56 of 73 steps fall, which is not a climb — the comparison is inverted, or this is no longer the series the claim is about` |
| the crossing level raised past the data (80 → 200) | `readings never reach 200 — the claim the marker makes would be false` |
| the headline delta re-derived from the second reading | `the headline says "+15.3 since 1950" and 2023 answers "…+15.0 since 1950 — the whole climb" — two arithmetics for one claim` |
| the crossing note lengthened past the space beside its own point | all three directions REFUSED, each naming its own measured width: `renders 339px wide in this direction's annot register, so half of it (170px) does not fit the 83px it has beside its own point on a 272px plot` |
| the derived flip threshold forced to zero | the collision came back: **10 label overlaps** across the three directions at 320/360/375/414, up to 12.4 px — and none at any width once restored |

The emptiness guard on the fall clause (`fell.length === 0`) is the one that is **vacuous on its own**
— it catches a clause that can never fire, and it does NOT catch the comparison being the wrong way
round, which is the likelier slip. The majority check beside it is what makes that mutation red, and
the table above is the run that proves it.

## Source line

`Source: UN, World Population Prospects (2024), via Our World in Data · Switzerland, 1950–2023,
extracted 8 August 2026`

## Out of scope, named rather than left quiet

- **The beat carries no entrance**, like all 40 other directed web beats, and it stays on
  `ENTRANCE_PENDING`'s subject matter. Whether a *directed render* should carry an entrance the way a
  beat's own main page does is a FORMAT question across 40 beats, not a call this type's pass makes in
  passing (`splash/test/web-entrance-is-an-addition.test.ts`).
- **`claims-grounded-in-data.test.ts` does not know `render-directions-web.mjs`.** Its `BEAT_SCRIPTS`
  set lists `render.mjs`, `render-web.mjs`, `render-map.mjs` and `render-directions.mjs`, so every
  directed WEB render in the tree is an "orphan artifact" to it — 140 of them before this beat, 143
  after. Adding the name would also start scanning 40 other beats' claim strings, which is a change
  those beats own.
