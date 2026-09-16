# Mobile-first portrait — the measurements, as produced

Regenerate with `bun proof/portrait-aspect-probe/mobile-first-probe.mjs` from `twin/`.
Every number below is written by that script. `MOBILE-FIRST-VERDICT.md` beside this file is the
other half — what a person saw when the PNGs were opened — and is not generated.

## The frame's budget

- stage — Meta's published safe band on 1080x1920: **269 to 1248 px, 979 px tall, 51% of the frame**.
- one frame pixel = **0.333 CSS px** on a 360 dp phone shown full-bleed.
- type floor — 12 CSS px = **36 frame px**. Nothing is drawn below it.

## The arms

| arm | plot aspect | plot fill | tallest bar | block ink | overflows stage by | smallest type drawn | under the floor | clipped | collisions | editorial words |
|---|---|---|---|---|---|---|---|---|---|---|
| `m-h-mobile-first` | 1.86:1 | 24% | 5.4:1 | 929.3px (287.7–1217) | 0.0px | 36px = **12 CSS px** | **none** | 0 | 0 | 51 |
| `m-l-mobile-first` | 1.63:1 | 27.4% | n/a | 927.9px (288.7–1216.5) | 0.0px | 36px = **12 CSS px** | **none** | 0 | 0 | 35 |
| `m-l-b2-story-type` | 0.87:1 | 27.3% | n/a | 1755.1px (94.6–1849.6) | 776.0px | 23px = **7.7 CSS px** | 16 runs at 29px, 27px, 25px, 23px | 0 | 0 | 117 |
| `h-b2-story-type` | 2.39:1 | 16.2% | 4.1:1 | 1759.5px (92.9–1852.4) | 780.5px | 25px = **8.3 CSS px** | 22 runs at 27px, 25px | 0 | 0 | 142 |
| `h-v3-safe-band-centred` | 1.1:1 | 41% | 9:1 | 990.5px (263.2–1253.7) | 11.5px | 16px = **5.3 CSS px** | 24 runs at 30px, 17px, 16px | 0 | 0 | 58 |
| `l-v3-safe-band-centred` | 0.8:1 | 44.9% | n/a | 1594.3px (281.3–1875.5) | 627.5px | 14px = **4.7 CSS px** | 17 runs at 31px, 18px, 17px, 16px, 14px | 0 | 0 | 15 |

## Every size actually drawn, and what it is on a phone


**`m-h-mobile-first`**

| frame px | on a 360 dp phone | runs | clears the 12 CSS px floor |
|---|---|---|---|
| 72 | 24 CSS px | 3 | yes |
| 42 | 14 CSS px | 1 | yes |
| 39 | 13 CSS px | 14 | yes |
| 36 | 12 CSS px | 1 | yes |

**`m-l-mobile-first`**

| frame px | on a 360 dp phone | runs | clears the 12 CSS px floor |
|---|---|---|---|
| 72 | 24 CSS px | 2 | yes |
| 42 | 14 CSS px | 1 | yes |
| 39 | 13 CSS px | 15 | yes |
| 36 | 12 CSS px | 1 | yes |

**`m-l-b2-story-type`**

| frame px | on a 360 dp phone | runs | clears the 12 CSS px floor |
|---|---|---|---|
| 68 | 22.7 CSS px | 2 | yes |
| 39 | 13 CSS px | 16 | yes |
| 29 | 9.7 CSS px | 1 | **NO** |
| 27 | 9 CSS px | 1 | **NO** |
| 25 | 8.3 CSS px | 13 | **NO** |
| 23 | 7.7 CSS px | 1 | **NO** |

**`h-b2-story-type`**

| frame px | on a 360 dp phone | runs | clears the 12 CSS px floor |
|---|---|---|---|
| 65 | 21.7 CSS px | 3 | yes |
| 39 | 13 CSS px | 14 | yes |
| 36 | 12 CSS px | 3 | yes |
| 27 | 9 CSS px | 2 | **NO** |
| 25 | 8.3 CSS px | 20 | **NO** |

**`h-v3-safe-band-centred`**

| frame px | on a 360 dp phone | runs | clears the 12 CSS px floor |
|---|---|---|---|
| 30 | 10 CSS px | 1 | **NO** |
| 17 | 5.7 CSS px | 3 | **NO** |
| 16 | 5.3 CSS px | 20 | **NO** |

**`l-v3-safe-band-centred`**

| frame px | on a 360 dp phone | runs | clears the 12 CSS px floor |
|---|---|---|---|
| 31 | 10.3 CSS px | 1 | **NO** |
| 18 | 6 CSS px | 1 | **NO** |
| 17 | 5.7 CSS px | 1 | **NO** |
| 16 | 5.3 CSS px | 13 | **NO** |
| 14 | 4.7 CSS px | 1 | **NO** |

## What the ladder removed, and why


**`m-h-mobile-first`** — plot 859 x 461 px (its height floor at this width is 296px, its ceiling 781px); block 979px against a 979px stage.

1. R1 axis title dropped, unit folded into the last tick
2. R3 standfirst sentence dropped
3. R4 annotation dropped
4. R4 annotation dropped
5. R4 annotation dropped
6. R7 standfirst removed entirely
- final state: {"axisTitle":false,"yTickCount":5,"standfirstSentences":0,"noteCount":0,"medianLabel":true,"binCount":10}
- refused: no

**`m-l-mobile-first`** — plot 859 x 527 px (its height floor at this width is 477px, its ceiling 1073px); block 979px against a 979px stage.

1. R3 standfirst sentence dropped
2. R4 annotation dropped
3. R4 annotation dropped
4. R4 annotation dropped
5. R7 standfirst removed entirely
- *not available on this type* — R0 transpose — a line's x axis is time, and Horak et al. 2021 §2.4.2: 'Line charts also resist rotation, due to the convention that the horizontal axis represents time proceeding from left to right'
- *not available on this type* — R1 axis title — this type draws none; its unit rides a caption above the axis, which the ladder never removes because it is the only statement of what the numbers are
- *not available on this type* — R5 end label reduced to the value alone — there is nothing left to reduce: the portrait frame uses the SHORT form by default. 'the sample town 604 mm' repeats a subject the title already names, and at 42 frame px it is 500 px of ink laid across the series it is labelling
- *not available on this type* — R6 reclassify — thinning eleven annual readings changes the series the claim is about, not its presentation
- final state: {"yTickCount":5,"xTickCount":6,"standfirstSentences":0,"noteCount":0}
- refused: no

## The line's own measurement: slope

Cleveland's banking-to-45° says a line's aspect should put its average segment near 45° off
horizontal (Heer & Agrawala, *Multi-Scale Banking to 45°*, InfoVis 2006).
`PORTRAIT-MEASUREMENTS.md` measured the shipped portrait render at 80.6° steepest / 65.2° end
to end — a drift drawn as a cliff.

| arm | steepest drawn segment | first reading to last |
|---|---|---|
| `m-l-mobile-first` | 56.5° | 28.4° |
| `m-l-b2-story-type` | 70.5° | 45.3° |
| `l-v3-safe-band-centred` | 71.9° | 47.7° |

## Cross-check — are the earlier arms measured as they were published?

`h-b2-story-type` was published at **2.39:1 plot aspect, 16.2% fill**; measured off its own file
here it is **2.39:1, 16.2%**. The instruments are the earlier probe's, copied,
and they reproduce its table — so the comparison is against the real prior artifact.

