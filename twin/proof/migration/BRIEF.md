# Beat — twice since 1991, more people left Switzerland than arrived

**Type:** line (single series, crossing a reference). **Medium/genre:** chart / video. **Channel:**
`migration.mp4`, 1080 × 1080, 30 fps, **240 frames = 8.0 s**, plus `migration-still.png` as the
frame a reader actually reads.

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
