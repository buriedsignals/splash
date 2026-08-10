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

The binding constraint is not the columns, not the band and not this beat's furniture. It is the one
the static lot already wrote down and left open:

> **The ladder has no rung for a TITLE, and on these beats the title is the claim.** At a 36 px
> floor the headline takes 72–78 px over 3–4 lines and the credit 42 px over 3. This is the real
> reason the refusals happen, and it is a design decision — a claim cannot be shortened without
> changing what the beat states.

27 rows is that finding at its most extreme, because the rows are a MEMBERSHIP LIST: the EU has 27
member states, and R8 (reclassify — "rows 10 → 6, and say so") destroys the sentence rather than
shortening it. So the beat is left refused, deliberately, and `BEATS_OWING_A_PIN` keeps counting it.

## The instrument, and its stated limit

`size-budget.mjs` REPRODUCES the component's layout arithmetic at each candidate; it does not render
it. That limit is bounded in the one direction that keeps a refusal honest — the reproduction leaves
out the ring clearance and two small offsets the component really reserves, so it reports **more**
room than exists.

It is calibrated rather than trusted. Its last row is the beat's own shipped frame, where it reports
850 px of plot and a 31.5 px row pitch against the ~806 px / 29.9 px the shipped component lays out:
5% generous, in the stated direction. `../diverging-final-frame.png` is the picture those numbers
describe — 27 rows, every country name legible, at the one frame nobody chose.
