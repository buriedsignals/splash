---
size: landscape
type: marimekko
format: static
medium: chart
grounding: supported
derived: v1
---

# Beat — Coal is 12 % of these six countries' electricity, and it sits in two columns

**Type:** marimekko (variable-width stacked columns). **Medium/format:** chart / **static**.
**Size:** landscape (1920 x 1080), pinned in the front matter above.

## Claim

Six European countries, 2024, 1 637.5 TWh. **Coal is 200.9 TWh — 12.3 % of the six — and 99.2 % of
it is generated in two countries, Germany and Poland.** Every other column's coal band is a hairline
or nothing at all: France's is 0.2 % of its own mix, Sweden's, Norway's and Switzerland's round to
zero.

Column WIDTH is the country's own generation, column HEIGHT is its mix, so a band's AREA is a real
quantity in TWh — which is what this form is for and what a set of six percentage columns could not
say.

Every figure is computed in `render-directions.mjs` and asserted before the render: the coal share of
the six, the two countries holding it, and — because a marimekko's areas are a product of two
scales — that each column's bands sum to its own total.

## Why this form, and the refusal it carries

`references/types/` and this base's own harvest agree on the failure: **a variable-width chart whose
narrowest units fall below a few pixels has stopped encoding its second dimension**, and the IEA's
marginal cost curve is the corpus's worked negative case. This beat measures its own narrowest
column before drawing — Switzerland, 4.8 % of the total, 39 px at this frame — and refuses rather
than draws when that falls under the floor a reader could see.

## What the harvest gave it

Seven references, three independent publications: the IEA's four cost curves, Ferdio's two
specimens, and Visual Capitalist's smoking-rates plate. Two rules two or more of them agree on are
filed — the width dimension is named on the plate, and a narrow cell degrades its label instead of
dropping it — and the palette question they answer differently is settled in `PALETTE.md`.

## Source

Ember, Energy Institute — Statistical Review of World Energy (2025), via Our World in Data ·
electricity generation by source, TWh, 2024, frozen beside this beat as `data.csv`.

## The choreography

Area is the reading, so the eye goes to the two largest areas of the darkest band: Poland's 54 %
in a column 172 TWh wide, Germany's 21 % in one nearly three times wider. Those two blocks ARE the
headline's "two columns". The second half of the claim is everything else — in France, Sweden,
Norway and Switzerland the same band is a hairline or absent, which is why 12 % of the whole can
live in two places. The widths are given a number once, under the columns; the sources are named
once, in the right gutter, in the order they stack.

**The eye enters at** `the two coal blocks`. **The claim lands at** `establish`.

| station | carries | subordinate to |
| --- | --- | --- |
| establish | `the two coal blocks` | — |
| reference | `the column widths` | `the two coal blocks` |
| reveal | `the hairline coal bands` | `the two coal blocks` |
| conclusion | `the source gutter` | `the two coal blocks` |

```json splash:choreography
{
  "kind": "frame",
  "entry": "the two coal blocks",
  "stations": [
    {
      "station": "establish",
      "carries": "the two coal blocks",
      "subordinateTo": null
    },
    {
      "station": "reference",
      "carries": "the column widths",
      "subordinateTo": "the two coal blocks"
    },
    {
      "station": "reveal",
      "carries": "the hairline coal bands",
      "subordinateTo": "the two coal blocks"
    },
    {
      "station": "conclusion",
      "carries": "the source gutter",
      "subordinateTo": "the two coal blocks"
    }
  ],
  "claimLands": "establish"
}
```

## Precision

- **12 % is an area, computed** — 200,9 TWh of coal over 1 638 TWh of production, and the 99,5 % in Germany and Poland is the same arithmetic restricted to two columns.
- **Width is TWh on one scale** — column width is one unit-per-value scale and band height a share of the same 100 %, so a cell's area really is a quantity.
- **Bands sum to the column, widths to the whole** — every column's bands sum to its own total and the six widths sum to the grand total; either failing would make an area meaningless.
- **The 78 TWh column is measured first** — the narrowest column is measured against a stated legibility floor before the render, because a mosaic whose thinnest column cannot be read is a bar chart with extra steps.
- **Mix and size in one mosaic** — the share and the scale it applies to are the same mark here; a reader who could see only one of them could not check the headline.

```json splash:precision
{
  "kind": "frame",
  "rounding": null,
  "asserts": [
    "12-is-an-area-computed",
    "width-is-twh-on-one-scale",
    "bands-sum-to-the-column-widths",
    "the-78-twh-column-is-measured",
    "mix-and-size-in-one-mosaic"
  ],
  "values": {},
  "labels": [],
  "covers": {
    "claim-datum": "12-is-an-area-computed",
    "column-width-is-on-one-unit": "width-is-twh-on-one-scale",
    "every-column-bands-sum-to-that": "bands-sum-to-the-column-widths",
    "the-narrowest-column-is-measured-against": "the-78-twh-column-is-measured",
    "asserted-in-the-one-frame": "mix-and-size-in-one-mosaic"
  }
}
```
