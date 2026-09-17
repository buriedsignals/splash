---
size: landscape
type: dumbbell
format: static
medium: chart
grounding: supported
derived: v1
---

# Beat — Life expectancy gains, ten countries, 2000-2023

**Type:** dumbbell (range plot). **Medium/format:** chart / static. **Size:** landscape (1920 x 1080).

The size is in the front matter above as well as in that sentence, and the front matter is the one
that counts: `render.mjs` reads it with `readPinnedSize`. The per-story `900 x 860` frame this beat
used to state in prose is gone — it was a third statement of a size nothing downstream read, beside
the component's own `const FRAME` and the two literals in the render script.

## Claim

Every one of these ten countries added years of life expectancy between 2000 and 2023 — Poland
gained the most, +5.0 years; the United States gained the least, +2.5 years.

## Subject and accent

No single "subject" hue here — a dumbbell has two colour ROLES instead, one per series being
compared, not one accent plus neutrals. Two CVD-safe Okabe-Ito hues, capped at exactly two per
`references/types/dumbbell.md`: `#0072B2` (blue) for 2000, `#D55E00` (vermillion) for 2023, this
codebase's existing pair. Because there is no positional convention here telling a reader which
dot is which series (unlike a slope chart's left-is-earlier reading), the small legend naming the
two colours is load-bearing, not decorative — the deliberate exception to this discipline's usual
"direct end labels, not a legend." Rows are sorted by gap size, descending, so Poland's 5.0-year
gain sits at the top and the United States' 2.5-year gain at the bottom. The value scale is one
shared linear scale across all rows, fitted to the data's own extent and NOT anchored at zero —
position encoding, like a slope chart, not length encoding like a bar.

## Source

UN, World Population Prospects (2024), via Our World in Data ·
`life-expectancy.csv?country=~FRA~DEU~ITA~JPN~NLD~POL~ESP~CHE~GBR~USA&csvType=filtered`, ten
countries, filtered to Year 2000 and Year 2023 in code (`render.mjs`), 20 rows used out of 1,418
fetched (the endpoint returns every year 1816-2023 for the ten filtered countries, not just the
two years the beat needs).

## What went wrong, caught by looking

Nothing needed fixing after the first render. The category-label gutter (measured against
`United Kingdom`/`United States`, the widest names in this set) and both value-label gutters
(measured against the widest `XX.X` string in each column) left every label clear of both the
frame edge and its neighbour on first render — no truncation, no overlap. Looking at the PNG
confirmed: rows run top-to-bottom in gap-size order (Poland 4.99 down to United States 2.50); the
legend swatches read as "2000" (blue) / "2023" (vermillion) above the plot; every value label sits
in black ink outside its own dot, never inside either accent colour; the connector line is a
muted, thin, neutral grey that reads as scaffolding under the two dots, not a third mark competing
for attention.

## The three export sizes — one ships, two are refused, and the refusal is measured

Rendered at all three and opened. **Landscape 1920x1080 is what this beat delivers.** Portrait and
square are refused by `assertRowsFit`, on measurement rather than preference:

| size | band | title + legend | credit | value axis | left for 10 rows | one name's ink |
|---|---|---|---|---|---|---|
| landscape | 910 px | 48 px x 3 lines = 295 | 31 px x 1 = 53 | 75 | **487 px → 48.7 px pitch** | 29.6 px |
| square | 936 px | 66 px x 7 lines = 738 | 42 px x 3 = 192 | 102 | **−96 px** | 40.1 px |
| portrait | 979 px (Meta's safe band) | 66 px x 7 = 738 | 42 px x 3 = 192 | 102 | **−53 px** | 40.1 px |

**What binds is the TITLE, and that is the finding.** Ten rows need 401 px of ink between them and
portrait's band has 685 px once the credit and the value axis are paid for — the rows fit. What does
not fit is a 160-character claim sentence set at 66 px, which takes seven lines and 738 px on its
own. Three lines would ship. **The removal ladder has no rung for it**: R3 and R7 remove a
*standfirst*, and this beat has none — its title IS the claim, carrying "gained the most, +5.0
years; United States gained the least, +2.5 years" inside the sentence. Shortening it is an
editorial decision about what the beat says, which is the journalist's, so the producer refuses and
says which size it does ship rather than quietly rewriting the claim to fit a phone.

R8 is not available either: the claim is "every one of these **ten** countries", so dropping rows
drops it.

**What landscape cost.** The 900 x 860 frame this beat was tuned at is 1.05:1; landscape is 1.78:1
with its type at 2.2x. Ten rows that sat under 14 px names now sit 48.7 px apart under 31 px names,
with 19 px of air — comfortable. Two things had to move to get there, both invisible at the old
frame: the credit now WRAPS (one 900 px line became three at a phone's scale and ran off the frame),
and the legend's second entry is laid out from the measured width of the first instead of the
literal `PAD + 90`, which was the width of the word "2000" at 13 px and overlapped once that word
was 39 px tall.

## The choreography

The rows are sorted by gap, descending, so the sort is already the ranking the headline makes and
the eye enters at the top of it — Poland, outlined in the accent. From there the reading runs down
the column of bars: length is the gain, and the two dots are only its ends. The legend at the top
is the one place this discipline's rule against legends is deliberately broken, because nothing
positional says which dot is 2000 and which is 2023. The gains are printed in their own column at
the right, and the claim closes on the two ends of it, +5,0 against +2,5.

**The eye enters at** `the Poland row`. **The claim lands at** `conclusion`.

| station | carries | subordinate to |
| --- | --- | --- |
| establish | `the sorted column` | `the Poland row` |
| reference | `the two-series legend` | `the sorted column` |
| reveal | `the connecting bars` | `the sorted column` |
| subject | `the Poland row` | — |
| conclusion | `the gain column` | `the Poland row` |

```json splash:choreography
{
  "kind": "frame",
  "entry": "the Poland row",
  "stations": [
    {
      "station": "establish",
      "carries": "the sorted column",
      "subordinateTo": "the Poland row"
    },
    {
      "station": "reference",
      "carries": "the two-series legend",
      "subordinateTo": "the sorted column"
    },
    {
      "station": "reveal",
      "carries": "the connecting bars",
      "subordinateTo": "the sorted column"
    },
    {
      "station": "subject",
      "carries": "the Poland row",
      "subordinateTo": null
    },
    {
      "station": "conclusion",
      "carries": "the gain column",
      "subordinateTo": "the Poland row"
    }
  ],
  "claimLands": "conclusion"
}
```

## Precision

- **Both ends of the sort are named** — +5,0 for Poland and +2,5 for the United States are the first and last rows of the computed sort, and the headline names both.
- **Bar length is the gain itself** — the drawn length equals the difference between the two dots; no bar is scaled, padded or given a minimum.
- **The sort is the gain, computed** — the row order is the ranking by change, not by level, and the standfirst says so because the two orders differ here.
- **A country missing either year throws** — the beat refuses to draw a row that has no 2000 or no 2023 reading rather than shorten its bar to what it has.
- **Ten gains stand in one frame** — every gain is printed at rest beside its own bar, so the ranking and the sizes are read in the same glance.

```json splash:precision
{
  "kind": "frame",
  "rounding": null,
  "asserts": [
    "both-ends-of-the-sort-are",
    "bar-length-is-the-gain-itself",
    "the-sort-is-the-gain-computed",
    "a-country-missing-either-year-throws",
    "ten-gains-stand-in-one-frame"
  ],
  "values": {},
  "labels": [],
  "covers": {
    "claim-datum": "both-ends-of-the-sort-are",
    "the-drawn-bar-length-equals-the": "bar-length-is-the-gain-itself",
    "the-rows-order-is-the-computed": "the-sort-is-the-gain-computed",
    "the-beat-throws-if-any-category": "a-country-missing-either-year-throws",
    "asserted-in-the-one-frame": "ten-gains-stand-in-one-frame"
  }
}
```
