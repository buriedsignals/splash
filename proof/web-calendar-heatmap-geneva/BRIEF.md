---
format: web
type: calendar-heatmap
medium: chart
grounding: supported
---

# Beat — Genève a tenu 31 jours d'affilée à 20 °C ou plus en 2024 (web)

**Type:** calendar heatmap (month × day-of-month). **Medium/format:** chart / **web**.
**Frame:** fluid.

## Claim

Daily mean temperature in Geneva, every day of 2024 — **366 cells**. From **18 July to 17 August**
the daily mean stayed at or above 20 °C for **31 consecutive days**, the year's longest such run. The
warmest month was **August (22,2 °C), not July (20,9)**; the hottest day was 30 July at 26,4 °C, the
coldest 12 January at −1,3 °C.

The run is **found, not typed** — the longest sequence at or above a threshold is walked out of the
frozen file — and the beat throws if no run of at least twenty days exists at the claim's own
threshold.

---

## The interaction, written before the code

### What this page earns

A still prints **one** streak, because it has one plate and the threshold that defines that streak
was chosen by the author. The headline "31 days in a row" is not a reading off the data: it is a
reading off the data **and a line drawn at 20 °C**. Move the line and the number moves with it —
78 days at 16 °C, 43 at 18, 31 at 20, 13 at 22, 4 at 24. No still can print five streaks, no video
can let the reader pick which one, and the scrolly sibling filters at 20 °C once because a
choreography is a sequence its author owns.

And the page's own answer, the one that only appears once the reader sweeps the line, is not the
collapse — it is where the collapse happens. **The run's end date does not move.** At every threshold
from 19 to 22 °C the longest run ends on **17 August**, while its start slides from 14 July to
5 August. Geneva's summer 2024 did not taper; it stopped on 18 August, and the headline's 31 days is
fragile at one end and anchored at the other. That fact is not on the static plate, not in the
scrolly's six cards, and not derivable from any single one of the five pictures — it is only visible
in the *difference between them*, which is what a control is for.

### The controls

| # | the reader's question | gesture | what changes in the picture |
| --- | --- | --- | --- |
| 1 | *« 31 jours à 20 °C — mais 20, c'est qui qui l'a choisi ? Si la ligne avait été à 18, ou à 22, est-ce que l'été de Genève raconte encore la même chose ? »* | `toggle-a-comparison` | The outline leaves the 18 July – 17 August block and is redrawn around the longest run at the chosen threshold, wherever on the calendar that is — four row-segments at 16 °C, one at 24 °C. A sentence states that run's length, its two dates and how many days of the year clear that line. **The colours do not move**: the ramp is the year's temperature and stays put, so the reader watches the outline travel across a picture that is holding still. |
| 2 | *« Cette case-là, elle valait combien exactement ? Et c'était un jour chaud pour l'année, ou juste chaud pour mars ? »* | `ask-a-mark` | The day answers with its date, its mean, its maximum, the bin it fell in, and **its rank among the year's 366 days** — a derived reading computed in the runner, which no axis on this plate carries and which the bin deliberately destroys. |

### What was weighed and refused

- **Selecting a span of the calendar (a month, a season) so the rest recedes.** Refused on a
  measurement, not on taste. A span's readings are its count and its mean — and a monthly mean is a
  thing a *still* prints trivially (a column of twelve numbers down the right edge of the grid), which
  is exactly what the scrolly sibling's card 5 already draws: *"every month's mean is drawn beside its
  row, August in the accent"*. Shipping it here would be that card re-run under the reader's hand, and
  the mandate's test is whether the reader is *doing* something, not watching the choreography again.
- **`filter.ts`, "a threshold as named bands".** The vocabulary literally names this case, and it is
  still the wrong one twice over. Mechanically it makes the days below the line *leave*, which is the
  scrolly's card 3 (*"every day under 20 °C steps back to a neutral"*). Doctrinally,
  `directed-interaction.md` says to reach for a filter when the part is **orthogonal to the encoded
  variable, so narrowing can never hide the claim** — and here the filter's dimension *is* the encoded
  variable. Filtering by temperature on a chart whose one channel is temperature deletes the bottom of
  its own ramp.
- **`brush.ts`, a span chosen on an axis.** A calendar grid has no value axis to brush; its two axes
  are day-of-month and month, and neither is the quantity. The gesture name `brush-a-range` is
  permitted by the new vocabulary because the reader does sweep a line along a scale, but the
  geometry `brush.ts` expresses is not this one.
- **`level.ts`, a reference laid across the plot.** Conceptually the closest — a threshold *is* a
  yardstick every one of the 366 cells is read against. Refused because its primitive is a rule drawn
  at a coordinate (`y`, `x` or `angle`) and this plot carries no coordinate for 20 °C. Declaring one
  would mean typing a geometry that does not exist.

### The vocabulary this needed, and it is new

`skills/chart-web/assets/cutoff.ts` — **what the claim's own line is drawn at, and which region of
the plate that line selects.** Radios plus CSS generated at build time, no script, every option's
region pre-drawn and merely revealed, exactly as `filter.ts`, `stack.ts` and `level.ts` work. Its own
refusal, the one none of the three already had: **two options whose regions are identical are one
threshold under two names** — a control that lets the reader move a line while the outline stays put
is the same lie as a filter option that keeps every mark.

`interaction-plan.ts` gained a `cutoff` block in both its copies, the way it gained one when `stack`
and `level` were written. Without it the guard is blind to the control and
`assertInteractionPlan` refuses the declared gesture as unshipped.

---

## The ramp, measured before anything else — and it was broken

This type's central trap is that **colour carries the entire quantitative channel**, and the type
sheet asks for the ramp to be checked *stop by stop*. Measured on the shipped page, the adjacent
steps of its seven-bin ramp:

| direction | bin0→1 | 1→2 | 2→3 | 3→4 | 4→5 | 5→6 |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| creme | **1,005** | **1,032** | **1,038** | 1,257 | 1,331 | 1,311 |
| nocturne | **1,025** | 1,105 | 1,398 | 1,359 | 1,323 | 1,291 |
| rapport | **1,004** | **1,007** | **1,001** | 1,287 | 1,345 | 1,358 |

In `rapport`, bins 0, 1, 2 and 3 — *every reading below 15 °C*, which is most of January to April and
October to December — are **the same colour to four decimal places**. The chart's whole quantitative
channel carried four levels while printing a key for seven.

The cause is in the brief's own list of paid-for traps: the shipped code lifted each too-pale step
independently with `adjustToContrast(step, ground, NON_TEXT_CONTRAST_MIN)`, and *two colours calibrated
independently onto the same floor against the same ground come out identical by construction*. Every
step that started below 3,0:1 was pinned to 3,0:1.

**The fix is arithmetic, not taste.** The budget is fixed: a direction's whole usable range is
`contrast(accent, ground)`, from the 3,0:1 non-text floor up to the accent itself — 6,64:1 in creme,
7,09 in rapport, 10,80 in nocturne. The low pole is lifted **once**, and the ramp is interpolated from
that pole to the accent, so no two steps can land on the same floor. Five bins then spend the creme
budget at a geometric step of 6,64/3,00 ^ ¼:

| direction | steps vs ground | worst adjacent pair |
| --- | --- | ---: |
| creme | 3,00 · 3,69 · 4,51 · 5,56 · 6,64 | **1,195** |
| nocturne | 3,10 · 4,41 · 6,11 · 8,20 · 10,80 | **1,317** |
| rapport | 3,02 · 3,70 · 4,61 · 5,70 · 7,09 | **1,226** |

Five and not six: a sixth bin drops creme's worst pair to 1,150 for no reading gained. That is the
brief's *"au-delà de quatre ou cinq, nommer plutôt que nuancer"* arriving as a measurement. Breaks at
5 / 10 / 15 / 20 °C give **70 / 81 / 98 / 58 / 59** days — balanced, and the 20 °C break is the
claim's own line, so the streak block reads as a block before any control is touched.

## Two more colours, and both were wrong until they were measured against what the page paints

The ramp is not the only thing colour carries here. Measuring every ink the page actually puts on
screen, rather than the formula each was derived from, found two more:

**The five impossible cells were invisible in `nocturne`.** Their dashed stroke was
`mix(ground, ink, 0.18)` — derived *toward the ink*, which on a dark ground moves it *toward the
ground*: **1,04:1**. That is this type's own accessibility trap one element over, and it meant 31
February and its four siblings read as blank cells rather than as "no such date". They now carry
their own stroke on their own shape, lifted to the non-text floor: **3,08 / 3,12 / 3,11** across the
three directions. The quiet gridline between filled cells is untouched — it is furniture; the dash
is a reading.

**No flat colour can outline a run on this chart.** The run's outline measured **3,08:1** against the
top bin in creme, **2,96** in rapport and **2,40** in nocturne — two of the three under the floor, on
the one mark the whole claim rests on. Sweeping the entire ink-to-ground axis in each direction, the
best achievable minimum is 3,08 / 2,96 / **1,65**: there is no colour that works, and that is
geometry rather than a bad choice — the ramp spans the luminance range end to end, so any single ink
sits close to one of its steps. A **casing** does work, and by construction: every ramp step is
already at or above 3:1 *against the ground*, so a casing drawn in the ground clears the floor over
every cell it crosses, and the core only has to clear the casing — which is the ink-against-ground
contrast the base already holds at 4,5:1. Both bounds are asserted in the component, not assumed.

## What the mutations found

Three run, through the real render path.

1. **Two lines made to select the same region** — refused by `assertCutoffDeclaration`, all three
   directions, naming both options.
2. **Every cutoff note replaced by a string the page already prints** — refused by
   `assertInteractionPlan` through the `cutoff` block added to `interaction-plan.ts`, and the runner
   exits 1 so a refused page cannot be mistaken for a produced one.
3. **The ramp reverted to the shipped construction** (each step pinned to the floor independently,
   bins 0–2 landing at 1,005 and 1,014 apart) — **stayed green**. Nothing in this tree watches the
   type sheet's central rule: not the contrast gate, not `verify-web.mjs`, not the interaction plan.
   That is the finding, and it is why the check now lives in the component: every stop is measured
   against the ground and every stop must be further from it than the one before, or the beat
   refuses.

## Treatments spent

- `a-sequential-grid-is-one-hue-cluster` — every filled cell is the direction's own accent against the
  direction's own ground at increasing strength, one hue by construction. What changed here is not the
  hue, it is that the steps are now **told apart**.
- `the-key-prints-its-breaks-in-the-data-s-units` — the key names its five bins in °C.
- `a-missing-cell-is-drawn-as-missing` — 31 February and its four siblings are **impossible, not
  absent**: drawn hollow and dashed so the grid stays rectangular.
- `the-subject-is-ringed-not-recoloured` — the run is outlined, never repainted, in every state of the
  control. On this type colour is already carrying the whole quantity; a control that recoloured cells
  would spend the one channel the chart has.

## The pointer resolves by cell, not by column

Twelve months share every x on this grid. The shared script resolves a pointer by **x alone** — right
for a series, where every reading owns a column, and wrong for a grid, where it would answer
confidently with whichever of twelve marks the markup listed first. The `<svg>` carries
`data-hit="cell"`, the opt-in already in `chart-web/assets/interaction.mjs`, and nothing that ships
without the attribute takes the new path.

## Source

Open-Meteo (ERA5 reanalysis), daily mean and maximum 2 m temperature, Geneva (46,20 N · 6,14 E),
1 January – 31 December 2024. `data.csv` is a byte-for-byte copy of
`proof/static-calendar-heatmap-geneva/data.csv`.
