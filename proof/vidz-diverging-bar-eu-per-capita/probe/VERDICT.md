# 27 member states, and no frame that holds them — the size decision, 2026-08-10

`vidz-diverging-bar-eu-per-capita` is the last chart beat owing a size pin, and the ledger records it
as **a decision, not a migration**: 27 EU rows clear no size against the video type floor, and the
only rung that fits drops member states, which changes what the beat states — "the only EU country"
cannot be made from a partial field, and `render.mjs` already throws rather than let it be.

Two arms were offered. **Both were measured. Both fail.** The beat stays unpinned, refused with the
numbers below, and this file is the record.

Re-run: `bun proof/vidz-diverging-bar-eu-per-capita/probe/size-budget.mjs`

## What was measured

Plot height, row pitch and panel width at every candidate frame, at each rung of the removal ladder,
for one, two and three columns. Two thresholds decide a row:

- **the lane** — a row must be at least 1.2× its own label's type, the ratio the static sibling packs
  to and the one `type-at-size.mjs` brackets with the population pyramid's measured break at ~1.1;
- **the panel** — a column must have at least as much room for BARS as it spends on gutters. A
  column costs its own name gutter plus a value gutter on each side of its zero line before one
  pixel of bar is drawn. This is the arithmetic that refuses the static sibling's third column, in
  its own words: "a table with a decorative complication".

## The readings

| frame | best rung | plot | lane needed | 1 col | 2 col | 3 col |
|---|---|---|---|---|---|---|
| landscape 1920×1080 | R1+R7 | 260 px | 46 px | 9.6 px | 18.6 px | 28.9 px, panel 68 |
| square 1080×1080 | R1+R7 | **−449 px** | 54 px | — | — | — |
| portrait 1080×1920 (story band) | R1+R7 | **−406 px** | 54 px | — | — | — |
| portrait 1080×1920, **no story band** | R1+R7 | 391 px | 54 px | 14.5 px | 27.9 px, panel −146 | — |
| landscape, **shipped tuning** | R1+R7 | 361 px | 38 px | 13.4 px | 25.8 px | 40.1 px, panel 145 |
| **a 4:5 row at the phone's own floor** | R1+R6+R7 | **−179 px** | 54 px | — | — | — |
| *CALIBRATION — 1080×1350 as shipped* | *keep everything* | *850 px* | *22 px* | ***31.5 px, FITS*** | *panel 245* | *panel 81* |

Nothing fits, at any column count, with the ladder spent. The closest any candidate comes is the
bottom-right cell: three columns at landscape, at the beat's own shipped tuning, where the row lane
is finally cleared at 40.1 px against 38 — **and the panel is 145 px against 439 px of gutter**. A
145 px panel for a domain running −20.48 to +0.03 gives Croatia's +0.03 a fifth of a pixel. That is
not a diverging bar; it is a table with three decorative complications.

## Arm A — the two-column redraw: REJECTED, and it is not the columns' fault

The static sibling does exactly this and it works there
(`proof/static-diverging-bar-eu-per-capita`): 27 rows into 2 columns at landscape, one shared
domain, one panel width, 14 rows at 34.9 px against a 29 px label.

It fails here because **columns buy height and this beat has run out of height before the rows are
reached.** At landscape the video type floor is 30 px rather than the static's 26, and the beat
carries three header blocks and a conclusion line: with the whole ladder spent — axis title gone,
caveat gone entirely — the plot is 260 px of a 1080 px frame. Two columns turn that into 18.6 px
per row against a 46 px lane. Three columns clear the lane and lose the panel.

## Arm B — a taller frame for a video that is not a story: REJECTED, twice over

The argument is sound as far as it goes: Meta's 979 px safe band exists for Stories and Reels, and
this beat is an article/YouTube video, so reading portrait's full 1920 px is not obviously wrong.

1. **It does not work.** Portrait without the band is the fourth row of the table above: 391 px of
   plot at the spent ladder, against 27 rows needing a 54 px lane each. It is short by a factor of
   nearly four, because the same phone floor that opens the band shuts the frame — at a 36 px floor
   this beat's claim-length headline takes four lines and its credit takes five.
2. **It is not ours to take.** `stage` is a fact about the FRAME, not about a beat's intent —
   `size-table-parity.test.ts` says so in as many words and guards it across all seven carried
   copies. Re-purposing portrait by dropping its band for one beat is exactly the drift that guard
   exists to catch. And a genuinely new row is reserved: `sizes.mjs`'s own header records that "R2
   named three, and a fourth row is a decision nobody has taken."

## What this actually says, and where it belongs

The beat fits **exactly one frame — 1080 × 1350 — and that frame is not in the table.** It was
chosen for the content ("Twenty-seven rows in a 1080 × 1080 square would leave each row 24px"), the
way every frame in this corpus was chosen before R2 pinned three.

The binding constraint was recorded as the one the static lot wrote down and left open:

> **The ladder has no rung for a TITLE, and on these beats the title is the claim.** At a 36 px
> floor the headline takes 72–78 px over 3–4 lines and the credit 42 px over 3. This is the real
> reason the refusals happen, and it is a design decision — a claim cannot be shortened without
> changing what the beat states.

27 rows is that finding at its most extreme, because the rows are a MEMBERSHIP LIST: the EU has 27
member states, and R8 (reclassify — "rows 10 → 6, and say so") destroys the sentence rather than
shortening it. So the beat is left refused, deliberately, and `BEATS_OWING_A_PIN` keeps counting it.

**That open question is now closed, and the answer is no — see the two sections below.** The ladder
gained its title rung on 2026-08-11; applied here it declines, and a title of no height at all would
not close the gap either.

## R6 — the title rung, applied and DECLINED — 2026-08-11

| | |
|---|---|
| as it ships | *Croatia is the only EU country emitting more CO₂ per person than in 1990* (72 characters) |
| shortened | *Croatia alone in the EU emits more CO₂ per person than in 1990* (62) |

The shorter form keeps everything the sentence asserts, and the rung checked each: the subject
(Croatia), the field it is exclusive within (the EU), the quantity's subject (CO₂), the rate (per
person), the direction (more) and the year it is more than (1990). *only* becomes *alone*, which is
the same class of qualifier, and "is the … country emitting" becomes "emits".

**It wraps to the same number of lines at every candidate frame** — two at landscape, four at square
and portrait, two at the beat's own — so R6 does not fire and the journalist's sentence stays. Ten
characters is not a line: at landscape the title is drawn at 80 px into a 1750 px measure, where one
line holds about 45 characters, and the shortest form that still makes this claim is 62.

## And a title of NO HEIGHT would not close it either

Not available — take away a beat's claim and there is no beat, which is why R6 shortens rather than
drops. Measured anyway, because it is the only way to bound the question:

| frame | plot with the ladder spent AND the title gone | 27 rows need |
|---|---|---|
| landscape 1920×1080 | 440 px | 1 col 1,242 px · 2 col 644 px, and the panel is 360 against 515 of gutter |
| landscape, shipped tuning | 514 px | 1 col 1,026 px · 3 col clears the lane at 57.1 px and the panel is 145 against 439 |
| square 1080×1080 | **7 px** | — |
| portrait 1080×1920 | **50 px** | — |
| portrait, no story band | 847 px | 1 col 1,458 px; 2 col clears the lane at 60.5 px and the panel is −146 |

At landscape the shortfall on one column is **802 px** at the table's tuning and **512 px** at the
beat's own, against a whole title worth 153 px. **The words were never the constraint here.** 27 rows
at a video legibility floor need more height than a 1080 px frame has, whatever is written above
them.

## What a fourth frame would cost — priced, 2026-08-11

The beat fits exactly one frame, 1080 × 1350, and `sizes.mjs` records in its own header that "R2
named three, and a fourth row is a decision nobody has taken". Nobody has taken it here either. What
has been done is to price it, because a refusal that names an unpriced alternative is not finished.

**It fits that frame only by drawing type nobody can read on the device the frame is for.** The
beat's smallest token is a 17 px axis tick in a 1080-wide frame, which on the 360 dp phone such a
frame is read full-bleed on is **5.7 CSS px** — against the 12 CSS px floor three independent sources
converge on, and which every row of the table already carries as `minTypePx`.

So a fourth row would carry the same rule the other three do — 12 × 1080 / 360 = **36 px** — and the
last candidate in the run is what that row would really deliver:

| a 4:5 row at the phone's own floor | plot | 1 col pitch |
|---|---|---|
| keep everything | **−536 px** | — |
| the whole ladder spent (R1+R6+R7) | **−179 px** | — |
| *and the title gone as well* | 277 px | **10.3 px against a 54 px lane** |

**A fourth frame buys this beat nothing.** It is not a missing row in the table; it is 27 rows that do
not go into 1080 px of height at a legible type size. That is worth saying plainly, because it moves
the decision: adding a row to the table would not have delivered this beat, so the beat is not
waiting on one.

## The instrument, and its stated limit

`size-budget.mjs` REPRODUCES the component's layout arithmetic at each candidate; it does not render
it. That limit is bounded in the one direction that keeps a refusal honest — the reproduction leaves
out the ring clearance and two small offsets the component really reserves, so it reports **more**
room than exists.

It is calibrated rather than trusted. Its last row is the beat's own shipped frame, where it reports
850 px of plot and a 31.5 px row pitch against the ~806 px / 29.9 px the shipped component lays out:
5% generous, in the stated direction. `../diverging-final-frame.png` is the picture those numbers
describe — 27 rows, every country name legible, at the one frame nobody chose.
