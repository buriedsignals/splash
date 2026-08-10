# The hex-grid video refuses all three frames, and the title is not why — 2026-08-11

`mapvid-hexgrid-quakes` is one of the four beats owing a size pin. The ledger recorded the cause as
one finding shared with the other two map videos: at the video table's 30 px landscape floor **the
words fill the band**. The removal ladder has since gained R6, a rung for the title, and this file is
that rung applied to this beat and measured.

Re-run: `bun proof/mapvid-hexgrid-quakes/probe/size-budget.mjs`

## R6 DECLINED, at every frame, and that is the rung working

The shorter form written for this headline:

| | |
|---|---|
| as it ships | *The Ring of Fire is not one bad day: 2024's densest cell shook on 360 days out of 366.* (85 characters) |
| shortened | *Not one bad day: the Ring of Fire's densest cell shook on 360 of 2024's 366 days.* (80) |

The shorter form passes every claim rule — the subject (the Ring of Fire, the densest cell), the
quantities (360, 2024, 366), the counting word (one) and the negation all survive. **It still wraps
to the same number of lines at every candidate frame**: two at landscape, four at square and
portrait. So R6 does not fire, and the journalist's own sentence stays, which is the ladder's R5
lesson made mechanical — a rung that frees no budget costs the reader for nothing.

Five characters is not a line. At landscape the title is drawn at 71 px into a 1750 px measure, and
one line holds about 47 characters; the shortest form that still makes this claim is 80. **The gap is
not a matter of trying harder at the sentence.**

## The readings

Plate room is what is left between the title's own bottom and the legend's top, after the caveat,
the source and the class scale are laid out from the frame's floor upward. `mapStageBox` then gives
the box the plate's geography can take in it.

| frame | rung | plate room | the map it leaves |
|---|---|---|---|
| landscape 1920×1080 | keep everything | 58 px | 100 × 58 — **5% of the frame's width** |
| landscape | R6+R7 (conclusion gone) | 127 px | 221 × 127 — 12% |
| landscape | R6+R7+R3 | 173 px | 301 × 173 — 16% |
| landscape, **floor tuning** | keep everything | 206 px | 358 × 206 — 19% |
| landscape, floor tuning | R6+R7+R3 | 247 px | 429 × 247 — 22% |
| square 1080×1080 | keep everything | **−776 px** | the words alone overrun the band |
| square | R6+R7+R3 | **−500 px** | — |
| portrait 1080×1920 (story band) | keep everything | **−733 px** | — |
| portrait | R6+R7+R3 | **−457 px** | — |
| *CALIBRATION — 1080×1080 as shipped* | *keep everything* | *565 px* | *940 × 540, 87%* |

"Floor tuning" is landscape at the lowest type scale that still clears its own 30 px floor (2.25
rather than the table's default 2.5), carried so the verdict does not rest on agreeing with one
number in the table.

## The refusal does not rest on the caveat, and that was measured rather than assumed

On a map the caveat is the honesty line — here, that an absent cell means "nothing catalogued yet"
and never "no earthquakes here", that a count is not an energy, and that 102 of the 14,175
catalogued events fall poleward of the plate's own 61°S–78°N. It is not a rung.

It would not save the beat if it were. With the caveat **gone entirely**:

- landscape, table tuning: 300 px → a **522 × 300** map, 27% of the frame's width;
- landscape, floor tuning: 361 px → 628 × 361, 33%;
- square: still **−127 px**. Portrait: still **−84 px**.

So the disclosure is kept and the beat still refuses. That is a stronger statement than choosing the
caveat over the frame, and it is the one this beat can make.

## The frame it already measures, and why that is not a pin

The delivered mp4 is **1080 × 1080** — the square row's own dimensions, read from the file
(`ffprobe`: 1080, 1080, 380 frames). It still cannot pin `square`, and the reason is the second half
of the size decision: at square the row's floor is 36 px against this beat's smallest token of 16,
which forces a type scale of 3.0, at which the words overrun the band by 776 px. **A frame that
matches is not a size that is honoured.**

## What would actually close it, named rather than attempted

Not the sentence. This beat's furniture is laid out in ONE COLUMN — title above the plate, legend,
conclusion, caveat and source below it — and a 1920 × 1080 frame gives 1750 px of width against 910
px of band. A landscape layout that put the plate beside its words rather than between them is the
change with the room in it, and it is a redraw of the genre's layout, not a rung on the ladder. It is
a person's decision, and nothing here takes it.

## The instrument, and its stated limit

`size-budget.mjs` REPRODUCES `HexGridVideo.tsx`'s baseline arithmetic at each candidate; it does not
render it. It is calibrated rather than trusted: at the beat's own shipped frame it reports **565 px**
of plate room where the component really draws **540**, so it is 25 px **generous** — it reports more
room than exists, which can only make a refusal more conservative and cannot manufacture one.
