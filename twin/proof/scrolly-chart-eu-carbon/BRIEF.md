# Beat — the same 27 countries, four charts, four different answers

**Type:** line, ranked bar, slope and stacked dot plot — four chart types, carried by the scroll
vehicle. **Medium/genre:** chart / **scrolly**. **Channel:** article web, one self-contained
`render/eu-carbon-four-charts.html` (76 KB), **four steps**, one frozen column of numbers.

## Claim

CO₂ per person has fallen across the European Union — and "who emits the most" has a different
answer depending on which chart you draw. Four charts of one column: a LINE says nearly everyone
came down; a RANKED BAR says the top is still three times the bottom; a SLOPE says the biggest
cutter is the country still at the top; a DOT PLOT says that, names removed, the union is one crowd
and one outlier. Each is true. Each hides what the next one shows.

## Why this earns the scroll — the test `twin-scrolly/SKILL.md` sets

The vehicle's own rule: *"if every step would show the same chart, do not reach for this skill —
animate the beat instead. A vehicle earns its existence only by carrying different media."* This
beat is the chart-side reading of that rule, and it passes it on the strict version:

- **Every step is a DIFFERENT CHART**, not a reveal state of one chart. `LineFrame`,
  `RankedBarFrame`, `SlopeFrame` and `DotStripFrame` are four components with four geometries; there
  is deliberately no single parameterised chart with a `kind` prop, because that shape would be the
  beat arguing against itself.
- **What the scroll adds that a still could not.** The argument IS the comparison between four
  encodings of one column. A still frame carries exactly one of them; four stills side by side are
  four charts a quarter of the size each, read left to right, with no way to bind a sentence to the
  chart it is about.
- **What it adds that a VIDEO could not.** A video can cut between four charts, and the cut is the
  problem: the reader is being asked to notice that the ranking MOVED between two encodings, which
  takes as long as it takes, differently for each reader, and needs going back. Scroll gives that
  pace to the reader and reverses on demand. A video also carries none of this in text — with
  JavaScript off, this file still delivers all four paragraphs and the first chart (measured below).
- **The picture does NOT evolve within a step, and that is the argument rather than a defect.**
  Driven continuously on 2026-08-10 — a per-frame recorder installed before the scroll was touched,
  both directions, three widths — this beat measured **0 of 113, 0 of 99 and 0 of 88 intra-step
  frames on which any geometry moved**: about half of every sweep changed only an opacity (the
  cross-fade at a boundary) and the rest changed nothing at all. The sibling single-visual beats
  were repaired to move on every frame, because their claim is one picture the reader navigates
  INSIDE. This beat's claim is the opposite one — four encodings of one column, *"each is true, each
  hides what the next one shows"* — and a picture that continuously morphed a line into a ranked bar
  would be a fifth thing that is none of the four. The reader's own motion is carried by the card
  travelling over the frame, and the frame swaps in the clear gap between two cards. **Recorded so
  the number is not mistaken for a missing repair**; if this beat's argument ever becomes "one chart,
  four readings", it is the single-visual sibling `scrolly-one-chart-swiss-life-expectancy` that is
  the model, not this one.
- **The honest cost**, so it is not sold as free: the four charts are not simultaneously visible, so
  a reader cannot hold two encodings side by side at one instant. This beat trades that for pace and
  for one full-frame chart at a time. A small-multiples static beat makes the opposite trade and is
  the right answer for a reader who wants the four at once.

## Data

- Source: Global Carbon Budget (2025); population from various sources — with major processing by
  Our World in Data, indicator `co-emissions-per-capita`. Tonnes of CO₂ per person, fossil fuels and
  industry only.
- `eu-co2-per-capita.csv`: the full series for the 27 EU member states, frozen unedited beside this
  beat. Byte-identical (same md5, `bdf29438bbd78111c890e7734b619fd5`) to the copy
  `proof/webz-diverging-bar-eu-per-capita` freezes — this beat re-reads the same file rather than
  importing anything from that beat.
- `render.mjs` asserts the window before it draws: every one of the 27 must carry a reading in
  EVERY year from 1990 to 2024, and it throws naming the country and the year if one does not. Three
  of the four frames draw the whole window; a hole in one series would be invisible beside a
  complete ranking.

## Exact values — computed from `eu-co2-per-capita.csv`, never typed

Every figure below is derived at render time by `carbon-data.ts`'s `deriveFacts` and interpolated
into the prose; nothing in the delivered HTML is a number written by hand.

| Figure the beat states | Computed value |
| --- | --- |
| member states | 27 (asserted: `render.mjs` throws if the file stops holding 27) |
| cut per-person emissions 1990 → 2024 | 26 of 27 |
| rose | 1 — Croatia, +0.0315 (4.7331753 → 4.764723), stated as +0.03 |
| median of the 27 | 8.133435 → 5.282773, stated as 8.1 → 5.3 |
| highest, 2024 | Luxembourg 10.459649 → "10.5" |
| lowest, 2024 | Malta 3.2037206 → "3.2" |
| top ÷ bottom | 3.2648 → "a factor of 3.3" |
| largest cut | Luxembourg −20.478131 → "shed 20.5 tonnes" |
| that country's 2024 rank | 1 — so the prose reads "still the highest of the 27"; the sentence is a computed branch, and a rank other than 1 would print "*n*th of 27 even so" |
| within 2 t of the median | 25 of 27 |
| within 1 t of the median | 13 of 27 |

## The four frames, and the one rule each keeps

All four are FITTED, never cropped — a chart is evidence, and cropping an axis label is a chart that
reads wrong. Geometry lives in a `preserveAspectRatio="none"` SVG; every WORD is HTML at a fixed
pixel size. **So is every DOT**: a circle inside a stretched SVG is an ellipse at every viewport but
one, so the dot plot's marks are HTML too.

| Frame | What it answers | The accent's one job |
| --- | --- | --- |
| line | direction, over 35 years | the median of the 27, over a fan of 27 muted lines |
| ranked bar | level, in the final year | the two ends the ratio is between |
| slope | change, both ends joined | the largest fall; the one riser is drawn in `ink`, furniture rather than a second hue |
| dot plot | spread, names removed | the 27 dots themselves — here they ARE the subject |

**The slope draws both vertical axes**, with ticks and labels. A slope chart without them is a
bundle of lines floating in space, and this project has that exact report open against a sibling
slope beat (`B6.8`/`B6.9`).

## What driving a real browser found and fixed

Rendered, then opened in Chrome and sampled at **25 scroll positions across the full track at
1600×900, 1280×800 and 375×812** — not eyeballed, and not from a screenshot taken before scrolling.

Three defects the tests did not see, all found by measuring bounding boxes:

1. **The last x-axis tick ran off the screen at 375px.** "2024" was centred on the plot's right
   edge, which puts half its width past the frame. The last tick is now right-aligned to that edge.
2. **The slope's riser label ran off the screen at 375px.** "Croatia 4.8" was placed outside the
   right-hand axis, which leaves about 34px of a phone for an 87px label. It now hangs inside.
3. **The dot plot was a lattice, not a distribution.** The first version assigned each dot to the
   first row with space, spreading 27 readings across five rows in a grid that read as a scatter of
   two variables — and the second variable did not exist. Replaced by a stacked (Wilkinson) dot
   plot: equal bins, dots piled above the axis, so the shape of the pile IS the distribution. Only
   looking at the render showed this; every number in it was correct throughout.

## Measured, after those fixes

- **Collisions between the graphic's own annotations and the pinned prose panel, while the graphic
  is PINNED: 0**, at all three widths, every sample. **Off screen: 0.** Exactly one panel painted at
  a time at every sample. The sticky graphic measured full viewport width (`left: 0`,
  `right = innerWidth`) and full height at every pinned sample; no horizontal overflow anywhere.
- **The pre-pin band, stated rather than hidden.** Before the graphic reaches `top: 0` it is still
  climbing from its document position below the header — the vehicle's own doctrine calls this
  normal `position: sticky` catch-up. For a FITTED frame that band puts the bottom of the plot
  behind the panel: 2 label boxes at 1280×800 and 8 at 375×812, in the first sample only. The band
  is **90px of a 3330px track at 1600×900 (2.7%), 90px of 2970px at 1280×800 (3.0%) and 177px of
  3100px at 375×812 (5.7%)**, and it never recurs. It is a property of the vehicle, not of this
  beat: the skill's own seed and `mapmore-scrolly-danube` both avoid it only because their first
  step is a COVER-cropped frame whose annotations sit high. Reported rather than patched — the fix
  belongs in `twin-scrolly`'s scaffold, which this beat does not edit. Mitigated here by keeping the
  title and the credit short: trimming them took the band at 375px from 262px to 177px.
- **Reduced motion**: 12 sampled positions, 0 intermediate opacities, computed
  `transition-duration: 0s`, and the active frame still advanced through all four steps.
- **JavaScript disabled**: one server-rendered active frame and all four steps' prose present in
  full (203 / 227 / 259 / 211 characters).
- **Prose panel**: computed `rgb(255,255,255)` on `rgb(0,0,0)` read live off the DOM — **21.00:1**,
  matching `renderScrolly`'s own build-time tripwire.

## Anti-patterns for this case

- **Four states of one chart is not a scrolly.** If this beat's four steps had been one line chart
  revealing a decade at a time, it would belong in `twin-chart-web` or `twin-chart-beat`, animated.
- **Never let a step's prose claim something its own frame does not show.** Each paragraph names
  only what its own chart draws: the line step never names Luxembourg's rank, the ranked-bar step
  never names a change.
- Derive every figure. The one hand-typed value in an earlier draft of this beat's title — a count
  of countries — is now asserted (`if (n !== 27) throw`), because the EU has had 27 members only
  since 2020 and a re-export with 28 rows would quietly turn the headline false.
- One accent, one job per frame. Twenty-seven accented lines would be twenty-seven claims.

## Source line

`CO₂ per person (fossil fuels and industry): Global Carbon Budget (2025) and population data from various sources, with major processing by Our World in Data — indicator co-emissions-per-capita. All 27 EU member states, 1990–2024. Four charts, one frozen column of numbers. Colours recorded in PALETTE.md by the newsroom.`
