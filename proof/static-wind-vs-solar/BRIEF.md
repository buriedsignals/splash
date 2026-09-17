---
size: landscape
type: grouped-bar
format: static
medium: chart
grounding: supported
derived: v1
---

# Beat — Switzerland is the outlier: solar beats wind

**Type:** grouped bar. **Medium/format:** chart / static. **Channel:** article web —
**size: landscape (1920 x 1080)**.

The size is in the front matter above as well as in that sentence, and the front matter is the one
that counts: `render.mjs` reads it with `readPinnedSize`. The prose line used to be the only record
of gate 2c's decision, checked by nothing, while the component carried its own `const FRAME` and the
render script repeated the same two literals — so the delivered PNG measured 1800 x 1120, a size
nobody chose.

## The other two sizes, looked at

`bun render.mjs --size square` and `--size portrait` draw into `sizes/`. This beat is a band-scale
type, so `type-at-size.mjs` answers **transpose**: at a tall or square frame the columns become rows
running down the frame, each country's name horizontal on one line. Both of those renders **refuse
at rung R9** and say so, which is the honest outcome and is recorded in "What the other sizes do"
below.

## Claim

Switzerland is the only one of six countries where solar generates a larger share of electricity
than wind; in France, Germany, Norway, Poland and Sweden, wind's share is the larger of the two.

## Subject and accent

No single hue is reserved as "the subject" here — the claim compares two series across six
categories, so colour carries series identity (wind vs solar), per `references/types/grouped-
bar.md`'s own carve-out for a legend when direct labelling can't do the whole job alone. The
Switzerland reversal is named directly with an ink annotation and leader line, not a third colour.

## Source

Ember & Energy Institute, Statistical Review of World Energy (2025), via Our World in Data ·
`electricity-mix.csv`, filtered client-side to Switzerland, France, Germany, Norway, Poland,
Sweden — the URL-level `country=` filter param does not reliably filter every OWID indicator
variant (`intake/references/ourworldindata-csv-filter-trap.md`), confirmed by checking
distinct entity counts before trusting any of tonight's fetches.

## What went wrong, caught by looking

The first render clipped the source-date line and ran the Switzerland annotation off the right
edge of the frame — both fixed by wrapping the source line on measured width and clamping the
callout's anchor inside the plot instead of centring it on a bar that sits at the very edge.

## What the other sizes do — opened, not assumed

**Landscape (1920 x 1080), the pin.** Columns, `as-is`. The title runs to two lines, the standfirst
to one, the credit to two; the plot keeps 6 groups x 2 columns across a 1750px band and every value
label sits clear above its own column at 29px — 12 CSS px in a 900px article column. No ladder rung
fires.

**Square (1080 x 1080) and portrait (1080 x 1920): REFUSED at rung R9, and the refusal is the
finding.** Both take the twin form (rows). Both fire R2 (ticks 5 -> 3) and R3 (the standfirst keeps
its first sentence). Both still run out of frame, and the numbers are not close:

| size | plot height left for 12 bars | each bar | floor |
|---|---|---|---|
| square | **-15 px** | -42.3 px | 36 px |
| portrait | **28 px** | -38.7 px | 36 px |

At a phone frame the type floor is 36 px, which puts the headline at 78 px — three lines, 306 px —
and the credit at 42 px, another three lines. Portrait's safe band is 979 px total. The header, the
standfirst, the legend and the credit spend all of it. R4 has no annotation to drop that is not the
claim; R8 (show fewer countries) would remove the word "only" from "the only reversal in this
group", which is the claim itself. So the beat refuses, names the size that works, and says why —
`WindVsSolarBar.tsx`'s `barSpan < minTypePx` throw.

Nothing in the toolchain could have caught this on its own: `assertPlotAspect` only clamps types
that HAVE a measured aspect range, and a band-scale type has none — its answer is the twin form.
The twin form is right and it is still not enough, which is a fact about twelve marks and a phone,
not about the transpose.

## The choreography

Six pairs, separated by hairline rules, and the rules are what the eye reads first: they make the
comparison a within-group one rather than a twelve-bar ranking. Five pairs have the same silhouette
— tall blue, short grey — and the sixth does not. Switzerland is named in ink with a short
annotation above it, because the exception is the claim and a colour alone would not carry it. The
legend at the top left is this type's own carve-out: with two series interleaved, nothing
positional says which bar is which.

**The eye enters at** `the group boundaries`. **The claim lands at** `subject`.

| station | carries | subordinate to |
| --- | --- | --- |
| establish | `the group boundaries` | `the Switzerland group` |
| reference | `the series legend` | `the Switzerland group` |
| subject | `the Switzerland group` | — |
| conclusion | `the reversal note` | `the Switzerland group` |

```json splash:choreography
{
  "kind": "frame",
  "entry": "the group boundaries",
  "stations": [
    {
      "station": "establish",
      "carries": "the group boundaries",
      "subordinateTo": "the Switzerland group"
    },
    {
      "station": "reference",
      "carries": "the series legend",
      "subordinateTo": "the Switzerland group"
    },
    {
      "station": "subject",
      "carries": "the Switzerland group",
      "subordinateTo": null
    },
    {
      "station": "conclusion",
      "carries": "the reversal note",
      "subordinateTo": "the Switzerland group"
    }
  ],
  "claimLands": "subject"
}
```

## Precision

- **Five and one is a count** — which countries put wind ahead of solar is computed pair by pair, and the headline's five and its one exception are that count.
- **One zero-based scale across six groups** — every bar in every group is measured from the same zero, because a group that rescaled itself would make its own pair look decisive.
- **The beat throws on a wrong count** — if the number of countries where wind leads is not what the title says, the render is refused rather than corrected in the caption.
- **Each share comes from national production** — wind and solar are shares of each country's own 2024 generation, computed from the frozen file, never of a European total.
- **Twelve values printed beside their bars** — every figure is on the plate at rest; the ordering by gap is stated in the standfirst because a reader cannot see a sort key.

```json splash:precision
{
  "kind": "frame",
  "rounding": null,
  "asserts": [
    "five-and-one-is-a-count",
    "one-zero-based-scale-across-six",
    "the-beat-throws-on-a-wrong",
    "each-share-comes-from-national-production",
    "twelve-values-printed-beside-their-bars"
  ],
  "values": {},
  "labels": [],
  "covers": {
    "claim-datum": "five-and-one-is-a-count",
    "one-shared-value-scale-from-zero": "one-zero-based-scale-across-six",
    "the-beat-throws-if-the-number": "the-beat-throws-on-a-wrong",
    "the-shares-are-computed-from-the": "each-share-comes-from-national-production",
    "asserted-in-the-one-frame": "twelve-values-printed-beside-their-bars"
  }
}
```
