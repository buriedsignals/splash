---
size: landscape
type: column
---

# Beat — The share of vacant homes fell every year, 2019-2022

**Type:** bar and column (vertical columns, one per year). **Medium/format:** chart / static.
**Size:** landscape (1920 x 1080).

## The takeaway this beat ships, and why it is not the journalist's

`source/article.md` (frozen, never edited) states the opposite of its own frozen data, twice, in
plain words: "has risen steadily over the last four years" and "the takeaway: vacancy is climbing,
year after year." It also asserts the figure is "the highest on record," a claim `source/data.csv`
cannot support at all — the file holds four years, so "on record" reaches past what was frozen.

`source/data.csv` itself:

| year | vacant_homes_pct |
|---|---|
| 2019 | 8.4 |
| 2020 | 8.1 |
| 2021 | 7.6 |
| 2022 | 7.2 |

The series **falls** every year. `render.mjs` checks this mechanically before drawing anything —
it walks the four frozen rows and throws if any year fails to be lower than the one before it —
so the direction below is verified against the frozen file, not asserted from reading the CSV by
eye.

**Decision taken here, explicitly:** this beat does not draw the journalist's takeaway. A visual
that carries a false headline over a truthful picture is the worst thing this toolchain can
produce — the chart and the words would contradict each other in the same frame, which is strictly
worse than either alone, because it dresses the false claim in the authority of "look, it's
charted." The title drawn here is the corrected, verified takeaway: **"The share of vacant homes
fell every year from 2019 to 2022, from 8.4% to 7.2%."** Nothing is shipped asserting a rise, and
"highest on record" is dropped entirely — it is not a claim four years of data can support in
either direction, so it is not repeated, corrected, or hedged; it is simply absent. This is a
"correct and ship" decision, not a "refuse" one: refusing to ship anything would have been an
equally defensible answer for a real newsroom pipeline (a false-takeaway story usually goes back to
the writer before any visual is made at all), but the brief for this beat asked for a delivered,
openable render, and a corrected title over accurate geometry is the version of that which cannot
mislead a reader — see the finding below for why nothing in the toolchain forced this decision;
it was taken by hand, reading the frozen data directly, because the automated guard that exists to
catch exactly this failed to fire.

## Finding: the grounding guard does not catch this takeaway

`skills/storyboard/scripts/ground-claim.mjs`'s own header states `groundTakeaway` exists to catch
"a number **or a direction** the frozen data itself contradicts" and that "it never returns
'supported' for something it did not verify." Re-run directly against this story's profile and the
journalist's own sentence:

```
takeaway: "The share of vacant homes has risen steadily over the last four years, from 8.4% to 7.2%."
=> [
  { claim: "8.4", verdict: "supported", detail: "within the range of column \"vacant_homes_pct\" [7.2, 8.4]" },
  { claim: "7.2", verdict: "supported", detail: "within the range of column \"vacant_homes_pct\" [7.2, 8.4]" }
]
```

Both numbers are individually inside the column's [7.2, 8.4] range, so `checkNumericRanges` marks
both `supported`. The word "risen" is never inspected: `extractComparisons`'s five patterns
(`SINCE_EN_RE`, `PAIR_EN_RE`, `PAIR_FR_RE`, `SUPERLATIVE_SINCE_RE`, `SUPERLATIVE_EVER_RE`) all
require an explicit four-digit year token next to the direction word ("less/more... in 2024...
than... in/since 1993"). A prose direction claim with no year numbers in it — "risen steadily",
"climbing, year after year" — matches none of them, so `extractComparisons` returns nothing and
the direction is never checked at all, in either direction.

Run on the article's own sentences ("...climbing, year after year.") the result is worse than a
false "supported": it is silence. `groundTakeaway(articleText, profile)` returns `[]` — no digit
appears anywhere near "climbing" or "risen" for `checkNumericRanges` to catch either, since the
prose carries no numeral at all in that sentence. Nothing is confirmed and nothing is refuted, and
the caller has no way to distinguish "checked, and fine" from "never checked."

Run through `resolveGrounding` + `groundingScalar` (`skills/storyboard/scripts/propose.mjs`) —
the functions that actually decide whether Gate 1 closes — the takeaway sentence above resolves to
`grounding: "supported"`. `skills/storyboard/SKILL.md` states plainly that "`contradicted` is
never a closing value: a takeaway the data refutes is corrected, or the journalist records the
override with their own reason" — but that safeguard only engages if the verdict IS
`contradicted`, and here it never gets there. A takeaway asserting the exact opposite of a
four-row CSV would close Gate 1 as `supported`, no override needed, no journalist prompted, on the
strength of two numbers happening to fall inside a range they belong to regardless of which
direction the series runs. This is Finding 1 in the render/report and it reproduces, byte for
byte, the measurement the task brief described before this beat was written.

## The framing

The takeaway is true and the picture almost does not show it. `render.mjs` now calls
`framingMeasurement` (`chart-beat/references/static-discipline.md`, `framing-serves-the-point`)
and prints both numbers before the geometry is chosen: the fall is **14.3%** of the column's own
0-8.4% extent (`spreadAgainstExtent`), and the largest reading is only **1.07x** the group's
median (`largestAgainstMedian`) — this is the "spread invisible on a zero baseline" shape, not the
"one mark dwarfs the rest" shape `stress-a-energy-bills` carries.

**Kept, not corrected.** A zero-baseline column is still the honest treatment for four annual
readings with nothing to interpolate between them (see "Type choice" below); breaking the axis to
exaggerate the fall would misstate its size the way a broken axis always does. What the printed
measurement adds is not a different chart — it is the number an author would otherwise have had to
compute by hand before deciding that a plain column chart, with every value printed above its own
bar, is the right call here despite the small on-axis spread.

## Type choice: column, not line, and the doctrine that said so unprompted

`skills/chart-beat/references/types/line.md`, "When not to reach for it": "A handful of periods
with nothing in-between to read — eight or fewer, no real trend between the points — is a
bar/column comparison wearing a line's clothes; columns compare those magnitudes more precisely
than a slope between dots." Four annual readings, nothing interpolated between them, is squarely
inside "eight or fewer" — so this beat draws columns, with a zero baseline
(`references/types/bar-and-column.md`), not a fitted-scale line. This is the one place the
toolchain's own prose steered correctly and unprompted; nothing enforces it mechanically (the only
programmatic floor found is `lineGeometry`'s `readings.length < 2` throw in `ChartSeed.tsx`, which
guards against a chart with one point, not against a chart with a "trend" that is really four
comb-teeth), so an agent who skipped reading `line.md` first would have shipped a line — the same
class of unenforced-guidance gap as the grounding check above, just caught by a human/agent
actually reading the file rather than by any assertion. Four points DOES make a legible chart
under this doctrine; it just is not a legible chart AS a line.

## Subject and accent

One accent, `#D4A853` (this newsroom's house colour, from `PALETTE.md`), reserved for all four
columns — the subject is the four-year series as a whole, not any single year, so nothing is
picked out from the group the way `bar-and-column.md`'s ranking convention would pick a winner.
Every column carries its own value printed directly above it (`bar-and-column.md`, "What the
drawing needs"), so there is no y-axis and no gridline — the same "every point IS named already"
reasoning `proof/static-bar-top-emitters-2024/TopEmittersColumns.tsx` uses.

## Source

`Source: story intake, source/data.csv (frozen) · stress test fixture, no external source cited`

This story's own `source/article.md` names no data source for the figures inside it — a further,
separate gap in the input, noted but not fixed (the frozen article is never edited).
