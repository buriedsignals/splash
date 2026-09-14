---
ground: "#FFFFFF"
accent: "#0B7A75"
origin: newsroom
---

The answer recorded for this beat: the newsroom's own house colours, as they stand in
`skills/splash/assets/root-template/NEWSROOM.example.md` (`brandColor: "#0B7A75"`,
`ground: "#FFFFFF"` — measured together at 5,18:1). `origin: newsroom` says who chose them. This is
the palette `composeDirections` reconciles the three filed directions against; the delivered page is
drawn in whichever direction governs it, never in this one.

**One hue, five steps, and the step count is arithmetic rather than taste.** A calendar heatmap puts
its ENTIRE quantitative channel into colour — 366 cells, one value each, no value axis anywhere on
the plate — so how many levels the ramp can carry is not a design preference, it is a budget. The
budget is `contrast(accent, ground)` in the direction being rendered, spent from the 3:1 non-text
floor up to the accent itself: **6,64:1 in creme, 7,09 in rapport, 10,80 in nocturne**. Five bins
spend creme's at a geometric step of (6,64/3,00)^¼ and land a worst adjacent pair of **1,195:1**; a
sixth would drop that to **1,150** for no reading gained. That is `chart-beat`'s "name rather than
shade past four or five" arriving as a measurement.

**The low pole is lifted once, and that is the whole correction.** The ramp this page shipped before
lifted every too-pale step INDEPENDENTLY onto the non-text floor — and two colours calibrated
independently onto the same floor against the same ground come out identical by construction.
Measured in `rapport`: bins 0, 1, 2 and 3, *every reading below 15 °C*, adjacent at **1,004 / 1,007 /
1,001** to one. Most of January to April and October to December was one flat colour under a key
printing seven levels. Here the pole is lifted once and every step is a mix from that pole toward
the accent, so no two can land on the same floor:

| direction | the five steps, against that direction's ground | worst adjacent pair |
| --- | --- | ---: |
| creme (`#FFFCEE` / `#1757B6`) | 3,00 · 3,69 · 4,51 · 5,56 · 6,64 | 1,195 |
| nocturne (`#111044` / `#4FE0C0`) | 3,10 · 4,41 · 6,11 · 8,20 · 10,80 | 1,317 |
| rapport (`#FFFFFF` / `#1F5C8B`) | 3,02 · 3,70 · 4,61 · 5,70 · 7,09 | 1,226 |

Every step is checked at render time against the ground AND against the step before it — the type
sheet's "one luminance direction from end to end, checked stop by stop" — and the beat refuses rather
than draws. It is checked here because nothing else in this tree checks it: reverting the ramp to the
broken construction rendered green through the contrast gate, `verify-web.mjs` and
`assertInteractionPlan` alike.

**Two colours outside the ramp, and both were wrong until they were measured against what the page
actually paints rather than against the formula that made them.**

- *The five impossible cells.* 31 February and its four siblings are drawn hollow and dashed, and
  their stroke was `mix(ground, ink, 0.18)` — derived toward the ink, which on a dark ground moves it
  toward the ground: **1,04:1 in nocturne**. Invisible, which turns "no such date" back into a blank
  the reader has to interpret. Lifted to the non-text floor on its own shape, it measures **3,08 /
  3,12 / 3,11**. The quiet gridline between filled cells keeps the old value: it is furniture, and
  the dash is a reading.
- *The outline around the run.* **No flat colour can carry it.** Measured against the top bin it was
  3,08 in creme, 2,96 in rapport and 2,40 in nocturne — two of three under the floor, on the one mark
  the whole claim rests on. Sweeping the entire ink-to-ground axis, the best achievable minimum
  against all five steps is 3,08 / 2,96 / **1,65**: there is no such colour, and that is geometry, not
  a poor choice — the ramp spans the luminance range end to end, so any single ink sits close to one
  of its steps. A **casing** works by construction: every step is already at or above 3:1 against the
  ground, so a casing drawn IN the ground clears the floor over every cell it crosses, and the core
  only has to clear the casing — the ink-against-ground contrast the base already holds at 4,5:1.
  Both bounds are asserted, not assumed.

**Nothing else on the page is chromatic.** The month and day labels, the key's own words, the
control's pills, the revealed sentence and the source line are steps off the direction's own ground,
computed by `deriveFurniture` and `webRegisters` at render time and never written here as a literal.
The control's checked pill takes ink-on-ground rather than a step of the ramp: on this type colour is
already carrying the whole quantity, and a pill that borrowed a step would make a colour meaning
"20 °C" also mean "you clicked here".

**The run is ringed, never recoloured** — `the-subject-is-ringed-not-recoloured`, and on this type
that is doctrine rather than preference. Recolouring spends a channel already carrying something, and
here it is carrying everything. It is also why the reader's own control moves an OUTLINE: a cutoff
that repainted the cells it selects would destroy the only reading the chart has in order to answer a
question about it.
