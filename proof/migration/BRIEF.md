---
size: square
type: line
---

# Beat — twice since 1991, more people left Switzerland than arrived

**Type:** line (single series, crossing a reference). **Medium/genre:** chart / video.
**Size:** square (1080 × 1080), 30 fps, **240 frames = 8.0 s**.

The size is in the front matter above as well as in that sentence, and the front matter is the one
that counts: `render.mjs` reads it with `readPinnedSize` and renders the composition of that name.
`Root.tsx` registers one composition per row of the table — before this it registered one, carrying
`width={1080} height={1080}` as literals, and the component carried the same two numbers again as
its own `const FRAME`.

## Claim

Switzerland's annual net migration balance has been negative exactly **twice** in the period the
committed data covers: **1996 (−5,807)** and **1997 (−6,834)**. Every other year from 1991 to 2024
is positive.

## Data

- Source: Federal Statistical Office · data 2024 (the `solde migratoire` of the permanent resident
  population, "Total" row, opendata.swiss).
- `data.csv`: **34 rows**, `year,value`, 1991 → 2024, no gaps, values in thousands.
- The table starts in 1991, which is why the title says "since 1991" and not "since 1990" — the
  window the frozen file can actually stand behind.

## Exact values — computed 2026-08-09 from `data.csv`

- **The only two negative years are 1996 (−5.807k) and 1997 (−6.834k).** Counted from the file, not
  read off the chart: 2 of 34.
- **1998 is positive, at +1.177k (+1,177).** This is the correction that mattered: an earlier version
  of this beat named 1997 and 1998 as the negative pair and carried callouts on a year that
  contradicted its own claim.
- Minimum of the series: 1997, −6.834k. Maximum: 2023, **+139.118k** — a peak more than twenty times
  the depth of the dip, which is why the dip needs a callout to be findable at all.
- 2024, the last row: +82.792k.
- The two callout strings on screen are built from the file (`year · value` through the beat's own
  formatter), so they cannot drift from it: the rendered still reads **"1996 · −5.8k"** and
  **"1997 · −6.8k"**.

## Subject and accent

One accent, `#0B7A75`, on the line and on the two subject points. The reference is zero — labelled
"Balance", not "0 people", because the axis already prints 0 on the tick the rule sits on. The area
between the line and zero is shaded only where the series is actually below it, with the crossing
points computed by linear interpolation between readings rather than a box drawn to about where the
dip looks like it is.

## Reveal order

30 fps, 240 frames. `establish` 0–26 (title, source) → `reference` 32–54 (the zero rule and its
"Balance" label, laid down before any data, because the whole claim is "below this line") →
`reveal` 72–150 (the 34 readings drawn left to right, in the data's own order) → `subject` 150–174
(the two negative years landing as their own event, with the sub-zero area shading in) →
`conclusion` 174–200 (a callout with a leader line carrying both values) → `hold` 200–240 (1.33 s of
stillness). Contract-checked; `hold` ends exactly on frame 240.

## Anti-patterns for this case

- **Never rescale the y axis to make the dip look bigger.** The dip is −6.8k against a peak of
  +139.1k, and the axis is fitted to the readings with every tick labelled. Cropping the axis to
  flatter the moment would be the exact anti-pattern this beat's claim depends on not committing.
- Do not shade "roughly" the negative region. The crossings are interpolated exactly; a shaded box
  that starts a year early would assert a third negative year.
- Do not print a value twice. The reference rule says "Balance" because the axis already carries 0;
  the callout carries the two figures because nothing else does.
- Do not widen the window past the data. "Since 1991" is the file's own first year; "since 1990"
  would be a claim about a year that is not in it.

## The pre-correction wording, and where it survived (closed 2026-08-09)

`MigrationVideo.tsx`'s header comment used to describe this beat as *"Twice since 1990, more people
left Switzerland than arrived."* — the pre-correction wording. It was fixed; this note was left
saying it had not been, and, worse, **it named the wrong file**. The residue was in
`timing-contract.ts`, which was still describing the subject as "1997, 1998" at "−1.9 and −3.4"
against "swings up to +84.1" — the invented series, verbatim, with no marker of any kind — while the
component beside it had been corrected. Both are now right, and `timing-contract.ts` carries a
retraction naming what it used to say. Recomputed from `data.csv` (34 rows, 1991–2024): the only
negative years are **1996 (−5.807)** and **1997 (−6.834)**, **1998 is positive** at +1.177, and the
peak is **2023 (+139.118)**.

The lesson worth keeping: a correction that fixes the render and leaves the contract beside it
leaves a reader two internally consistent documents that disagree, and the note recording the debt
pointed at the file that had already been paid.

## Source line

`Source: Federal Statistical Office · data 2024`

## The three export sizes — all three render, and one is delivered

`Root.tsx` registers **one composition per row of the table** (`migration-landscape` / `-square` /
`-portrait`); `render.mjs` reads the pin out of the front matter above, renders that composition,
and then reads the artifact's own dimensions back — the PNG from its IHDR, the mp4 from **`ffprobe`**.
That check holds for all three sizes.

| size | still (`--frame=-1`), from the file | mp4, from ffprobe |
|---|---|---|
| **square (pinned)** | **1080 x 1080** | **1080 x 1080** |
| portrait | 1080 x 1920 (`sizes/`) | not rendered — a looking arm, not a deliverable |
| landscape | 1920 x 1080 (`sizes/`) | not rendered — a looking arm, not a deliverable |

## What the type floor forced — the callout had nowhere to stand

**The shipped tokens were 40 / 26 / 22 px on a 1080 x 1080 frame**, and a square video is watched
full-bleed on a phone: a 22 px axis label is **7.3 CSS px** at 360 dp. The base is set from the
smallest token (22 → 12) with every other token keeping its ratio to it, so the axis lands on 36 px
at the square row's 3.0. Everything grew 1.64x, and two things broke.

**The credit wrapped** (one line at 22 px is two at 36 px), so the x-axis label band is now derived
from where the credit's first line of ink sits rather than from a literal.

**The callout block landed on the x-axis labels and then on the credit** — and the fix is the one
worth recording, because it is a property of this beat's own claim rather than of its type. The
callout names the two years the balance went NEGATIVE, and it hung a fixed distance below the zero
rule. Those two points sit **8 % of the plot's height above the domain floor**, so "below the pair"
had 37 px of room for a block that is 94 px tall at the phone's floor. Moving it ABOVE the pair
instead put it straight through the rising curve — rendered, looked at, rejected. What it needed was
ground of its own, so `migrationGeometry` gained a **`bottomReserve`**: pixels of the plot's bottom
edge the data curve may not draw into, sized from the block that will stand there. It is the exact
mirror of the sibling beat's `topReserve`
(`../life-expectancy/LifeExpectancyVideo.tsx`), at the other end of the frame and for the same
reason — an annotation whose room is reserved out of the plotted range cannot be crowded out by what
the data happens to do.

Two smaller derivations came with it: the callout's x is clamped into the frame by its **own
measured half-width** (`g.plot.right - 20` reserved twenty pixels for a block ~280 px wide), and the
right gutter reserves **half** the last x-tick label rather than all of it, because that label is
centred on the plot's right edge and only its right half hangs outside.

**Portrait renders and is not refused**, and the empty band at its foot is correct: the content sits
inside Meta's published safe band (269–1248), and the 672 px below it is where the platform's
caption, buttons and progress bar go.

## The plot's own shape is now asked about, not only the frame's

This beat and `../life-expectancy` are the only two in the corpus that pin a size `formForSize`
does not exempt — everything else pins landscape, where the verdict is `as-is` and a clamp is a
documented no-op. Until 2026-08-11 neither of them asked whether the plot the frame left them was a
shape a line argues in: `assertPlotAspect` existed and reached no video beat, because wiring it
while `MEASURED_ASPECT.line` recorded 0.8–1.8 would have refused the sibling beat's **delivered**
artifact at 2.01:1.

The range was re-measured first (`proof/aspect-range-probe/`, swept and opened, **0.7–3.6**), and
both guards are now wired here against the size the composition was registered from. **This beat's
square plot measures 788 x 507 — 1.55:1** — comfortably inside, so nothing it delivers changes. That
it is wired rather than merely present was proved by mutation: with the ceiling dropped to 1.0 in a
copy of the tree, this render refuses and names its own numbers.
