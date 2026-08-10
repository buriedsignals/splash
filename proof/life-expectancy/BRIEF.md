---
size: square
type: line
---

# Beat — Switzerland lost 8.6 months of life expectancy in 2020 and took until 2023 to get it back

**Type:** line (single series, dipping below and returning to a reference). **Medium/genre:** chart
/ video. **Size:** square (1080 × 1080), 30 fps, **240 frames = 8.0 s**.

The size is in the front matter above as well as in that sentence, and the front matter is the one
that counts: `render.mjs` reads it with `readPinnedSize` and renders the composition of that name.
`Root.tsx` registers one composition per row of the table — before this it registered one, carrying
`width={1080} height={1080}` as literals, and the component carried the same two numbers again as
its own `const FRAME`.

## Claim

Swiss life expectancy at birth fell in 2020 for the first time in the modern series, from **83.78
years in 2019 to 83.06 in 2020**, and did not exceed the 2019 level again until **2023 (83.95)** —
three years later.

## Data

- Source: UN World Population Prospects (2024 revision), via Our World in Data — the
  `life-expectancy` grapher, fetched `&csvType=filtered&country=~CHE`, verified single-entity.
- `data.csv`: **147 rows**, `Entity, Code, Year, Life expectancy`, Switzerland only, **1876 → 2023**,
  with **no year gaps**. The beat draws its own window from 2000 (24 readings); the file keeps the
  raw fetch.
- The credit matters here. This beat previously credited the Federal Statistical Office, which
  publishes only sex-split series (Hommes / Femmes) — averaging them by hand would have been an
  invented number wearing a real institution's name. OWID/UN WPP carries the combined series that is
  actually plotted.

## Exact values — computed 2026-08-09 from `data.csv`

| Year | Life expectancy |
| --- | --- |
| 2018 | 83.5639 |
| **2019** | **83.7804** |
| **2020** | **83.0626** |
| 2021 | 83.6477 |
| 2022 | 83.2003 |
| **2023** | **83.9536** |

- **The 2020 fall is 83.7804 − 83.0626 = 0.7178 years** — about 8.6 months.
- **First year at or above the 2019 reading: 2023** (83.9536 > 83.7804). 2021 (83.6477) and 2022
  (83.2003) both fall short, so the recovery really does take three years, and 2022's second dip is
  why it is not two.
- 2020 is the largest single-year fall since 2000 (−0.72), ahead of 2022 (−0.45) and 2015 (−0.24).
  Across the whole file, 1918 dwarfs it: **−9.47 years**, the influenza pandemic — visible only if
  the window is opened, which is why the window choice is part of the claim.
- Window minimum 79.834 (2000), maximum 83.9536 (2023). No 2024 row exists, which is why the source
  line says "data 2023".

## Subject and accent

One accent, `#0B7A75`, on the line and on the single subject point (2020). The reference is a dashed
rule at the 2019 level, labelled **"2019 level"** and not "83.8 years", because the y axis already
prints 83.8 on the tick the rule sits on — printing it twice is the repeated-value anti-pattern. One
bracket annotation carries "3 years to regain it".

## Reveal order

30 fps, 240 frames. `establish` 0–26 (title, source) → `reference` 32–54 (the 2019 rule, laid down
before the dip so the reader has the level to measure against) → `reveal` 72–150 (the 2000–2023
readings drawn left to right) → `subject` 150–168 (2020 landing as its own point, labelled
"2020 · 83.1 yrs") → `conclusion` 168–198 (the three-year bracket) → `hold` 198–240 (1.4 s of
stillness). Contract-checked; `hold` ends exactly on frame 240.

## Anti-patterns for this case

- **Do not zero-baseline this axis.** The whole quantity lives between 79.8 and 84.0; a zero
  baseline would compress the argument to a flat line. A line chart measures POSITION, not length,
  so a truncated axis is legitimate — but only with every tick labelled, which is the price.
- Do not present the 2020 dip as unprecedented. The file itself carries 1918 at −9.47 years. The
  window starts in 2000 for editorial reasons, and the claim is worded about the recovery, not about
  a record.
- Do not smooth or interpolate. 2022's dip back to 83.20 is real and is what makes the recovery
  three years rather than two; a smoothed curve would erase the reason for the number in the title.
- Do not name an institution that does not publish the figure shown. That was this beat's own
  original defect.

## Defects found while deriving this brief — BOTH CORRECTED 2026-08-09

1. **"Nearly a year" overstated a 0.7178-year fall by about 39%.** It was the headline, and it
   rounded 0.72 up to 1 in a reader's ear. The title now states the fall the data actually carries,
   in months: **8.6** — computed as (83.7804 − 83.0626) × 12 by `claimsFrom()` in `render.mjs`,
   printed on every run.

2. **The reference level was hand-typed.** `BEAT.reference` was the literal `83.8` against a 2019
   reading of **83.7804**, so the dashed rule sat 0.02 years above the year it is labelled for. It
   is now read out of the series, along with everything around it: the subject year is the year with
   the largest single-year fall in the window (**2020**), the reference is the reading of the year
   before it (**83.7804**, labelled "2019 level" from the same year), the recovery year is the first
   year afterwards at or above that level (**2023**), and the bracket's "three years" is that span
   spelled from a small word table. `claimsFrom` throws rather than guess if the series never
   recovers, or if the span is longer than the table.

The y-axis tick still prints **83.8** — that is the rounded DISPLAY of the true value, on the tick
the rule sits on, which is why the rule is labelled "2019 level" rather than repeating a number the
axis already gives.

Re-rendered and looked at: `life-expectancy-still.png` and `life-expectancy.mp4` (240 frames,
frames extracted with ffmpeg and read — the title in the encoded video says 8.6 months).

## Source line

`Source: UN World Population Prospects (2024), via Our World in Data · data 2023`

## The three export sizes — all three render, and one is delivered

`Root.tsx` registers **one composition per row of the table** (`life-expectancy-landscape` /
`-square` / `-portrait`); `render.mjs` reads the pin out of the front matter above, renders that
composition, and then reads the artifact's own dimensions back — the PNG from its IHDR, the mp4 from
**`ffprobe`**. That check holds for all three sizes; the original Splash exempts landscape from its
own equivalent, which is the mistake being avoided rather than the model being copied.

| size | still (`--frame=-1`), from the file | mp4, from ffprobe |
|---|---|---|
| **square (pinned)** | **1080 x 1080** | **1080 x 1080** |
| portrait | 1080 x 1920 (`sizes/`) | not rendered — a looking arm, not a deliverable |
| landscape | 1920 x 1080 (`sizes/`) | not rendered — a looking arm, not a deliverable |

## What the type floor forced, and it was not cosmetic

**The shipped tokens were 40 / 28 / 22 px on a 1080 x 1080 frame.** A square video is watched
full-bleed on a phone — 360 dp — so one frame pixel is one third of a CSS pixel and a **22 px axis
label is 7.3 CSS px**, against the 11–12 px floor three independent sources converge on. The base is
now set from the smallest token (22 → 12) with every other token keeping its ratio to it, so at the
square row's 3.0 the axis lands on **36 px exactly**: the floor, not a margin over it. Everything
grew by 1.64x, and three things broke that had been invisible at 22 px. All three were fixed by
deriving a position rather than by shrinking type — the floor is never lowered.

1. **The credit ran off the frame.** One line at 22 px is three at 36 px. It wraps now, and the
   x-axis label band is derived from where the credit's first line of ink sits rather than from a
   literal.
2. **Two y-axis labels were printed on top of each other.** This axis carries three values — the
   fitted floor, the 2019 reference and the fitted ceiling — and the reference (83.78) sits 0.22
   years under the ceiling (84) on a 4.5-year range: **6 px apart at 22 px type, overlapping at
   36 px**. A label is now drawn only if its baseline clears the last drawn one by a line of its own
   type, and **the unit travels to whichever label is topmost among those actually drawn** (it used
   to be hard-coded to the ceiling's, so it would have vanished with it). The ceiling's *gridline*
   goes with its label, because unlabelled it ran straight through "3 years to regain it" — a
   gridline is decoration and the bracket's sentence is the fact, and this codebase's own rule is
   that the two never share a pixel.
3. **"3 years to regain it" was clipped by the right frame edge, and "2020 · 83.1 yrs" ran through
   the curve.** Both were centred on their own marks, and both marks sit at the right of the plot
   because the span *is* the last three years of the series. The bracket's label now clamps its
   centre into the frame's margins by its own measured half-width — the text moves, never the
   bracket. The subject's value label is placed against the mark instead of centred under it: to
   the LEFT of the dot when the dot is in the right half of the plot, to the right when it is not,
   which is derived from where the subject is rather than from an offset.

**Portrait renders and is not refused, and the empty band at its foot is correct**: the content sits
inside Meta's published safe band (269–1248), and the 672 px below it is where the platform's
caption, buttons and progress bar go. A credit drawn there is at risk of being covered, which is an
attribution failure rather than a cosmetic one.

## The finding this beat raised, and how it was closed

The delivered square plot measures roughly **808 x 402, or 2.01:1**, and portrait's is 2.55:1 —
both outside `MEASURED_ASPECT.line`'s then-recorded **0.8–1.8**. No guard fired, because
`assertPlotAspect` was not wired into the video path, and wiring it as the table stood would have
refused this beat's own **delivered** artifact. The order this beat argued for was: the range, not
the beat, is what needs re-measuring.

**That is what happened, 2026-08-11, and in that order.** `proof/aspect-range-probe/` swept a line
across ten aspects at the article's regime and six more at the phone's, opened every arm, and
corrected the range to **0.7–3.6** with both ends bracketed by an arm that reads and one that does
not (`ASPECT-VERDICT.md` §6). Both of this beat's delivered plots sit inside it. So the guard is now
wired here — `assertTypeMayEnter` and `assertPlotAspect`, both against the size the composition was
registered from — and both delivered arms were re-rendered and pass.

**It is wired, not merely present.** Run against a copy of the tree with the ceiling put back to
1.8, this beat's square render REFUSES with `the plot is too FLAT at square — 808 x 402 is 2.01:1`.
`proof/migration` is the only other beat in the corpus that pins a size `formForSize` does not
exempt; its square plot is 1.55:1, inside both ranges, so it needs the ceiling dropped to 1.0 before
it refuses — which it then does, naming `788 x 507`. Every other beat pins landscape, where the
verdict is `as-is` and this guard is a documented no-op; `delivered-size-matches-the-pin.test.ts`
walks the briefs rather than listing those two names, so a third tall pin arrives already guarded.
