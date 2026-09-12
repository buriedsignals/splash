# Results: parties by seats — BBC News, UK general election 2024

`https://www.bbc.co.uk/news/election/2024/uk/results` · harvested 2026-09-08 · archive `search`
Style route `ok`. **Pixel route `not-applicable`**, its own reason recorded in the record:
*"no graphic outside the site's own chrome — a palette read from the page would be the site's
navigation and banners, not this piece's design."* **No colour is quoted in this note**, because the
record carries none that was measured on the graphic.

## What it is

The bullet chart's newsroom costume, vertical, and drawn by a desk that has never called it that.
Six party columns — LAB 412, CON 121, LD 72, SNP 9, SF 7, OTH 29 — each growing from a shared zero
baseline, each sitting inside a **full-height neutral track**, with a **dashed rule crossing every
track** at 326, labelled **"326 seats for a majority"**, and a verdict beneath it: **"✓ 0 seats to
go"**. Under each column, its value in the party colour's tint band, and under that the change since
2019 (▲211, ▼251, ▲64, ▼39, –, ▲15).

Read at the top of the live results page, above the fold, before the headline. It is the page's
lead graphic, not an illustration.

Every element the type page names for a bullet is present except the qualitative bands: a measure
from zero, a neutral backdrop the measure is read against, a declared target rendered as a mark of a
different kind, and the target named in words on the plate.

## What it does with information

- **The target is a rule, not a per-row tick, and it is shared across all rows.** The dashed line at
  326 crosses every party's track at the same height. Because all six rows are in one unit (seats)
  on one scale, one rule serves where a bullet would draw six ticks — and the reader can see at a
  glance that exactly one column crosses it.
- **The target is named where it is drawn.** `"326 seats for a majority"` sits on the line, right-
  aligned at its end. Not in a caption, not in a legend, not in the standfirst.
- **The verdict is written out.** `"✓ 0 seats to go"` is the derived quantity — target minus
  leader's value, floored at zero — rendered as text with a tick glyph. The chart states whether the
  target was met rather than leaving the reader to compare two heights.
- **The track runs to the ceiling, not to the target.** Every column's neutral backdrop is the same
  full height, so the columns are also comparable with each other, and the winning column visibly
  overtops the rule rather than stopping at it.
- **The value label sits below the column, on the party's own pale tint,** with the change beneath
  it outside any band. Three registers per column: name (reversed out of the party colour), value
  (dark ink on a tint of it), change (dark ink on white).
- **The bar's colour is the party's, and it is categorical, not a hit/miss binary.** The type page's
  "one for hit, one for miss" is not what this chart does: colour identifies the party, and the
  hit/miss reading is carried entirely by the geometry against the rule.

## What it does with style

**No colour is quoted** — see the route note above. What the style route did read, on the page that
contains the graphic (`style.typeSource` is `null` on this record because no separate graphic
document was found):

```
ReithSans 14 / 400   rgb(24,24,24), rgb(96,96,96)   sample "326 seats for a majority"   ×337
ReithSans 16 / 700   rgb(255,255,255) on the party colour   sample "LAB"                ×10
ReithSans 13 / 400   rgb(24,24,24), rgb(248,248,248)   sample "33.7%"                   ×68
ReithSans 24 / 700   rgb(24,24,24)   sample "Nation results"                            ×3
ReithSans 28 / 700   rgb(24,24,24)   sample "Parliament results"                        ×3
```

The whole page is one family (ReithSans, with ReithSerif reserved for article links), and the
graphic's own lettering is at the bottom of the ladder: the target's own label is **14/400**, the
same size and weight as body text, in the page's ordinary ink — the target is stated, not shouted.
The party abbreviation is the only reversed-out type on the plate, at 16/700.

`style.marks` returns `fill rgb(24,24,24) ×8`, `fill rgb(0,0,0) ×3`, `fill rgb(255,255,255) ×3`,
`fill rgb(0,113,241) ×1`, `fill rgb(96,96,96) ×1` — those are the page's SVG icons (share, chevrons,
the search glass), **not the chart**. The chart is built from styled block elements, which is why
the pixel route found no graphic at all.

## What is transferable

- **Name the target on the line that draws it.** `"326 seats for a majority"` is the whole
  apparatus: no legend, no caption, no lookup.
- **Write the verdict as a derived number.** `"0 seats to go"` is what a reader wants and what a
  bullet leaves them to compute. A beat that carries a value and a target already carries this.
- **A single shared rule replaces per-row ticks whenever the rows share a unit and a scale.** The
  type page's per-row-own-scale rule is for KPIs in different units; when they are not, one rule is
  cheaper and reads faster.
- **The neutral track runs the full height of the plot, not to the target.** It keeps rows
  comparable and lets the winner visibly exceed the line.
- **Colour identifies the entity; geometry carries the verdict.** Where the reader already holds a
  colour convention (parties, teams, nations), spending it on hit/miss would destroy a convention to
  say something the picture already says.

## What was not verified

- **No colour, at all.** The pixel route is `not-applicable` and no palette was measured. The party
  colours, the track grey and the dashed rule's ink are all unmeasured; the description of them
  above is geometry and text, read by eye from `screenshot.png`.
- **This chart is invisible to the harvester's graphic picker.** It is composed of styled block
  elements rather than `<svg>`, `<canvas>`, `<img>` or `<iframe>`, so `findGraphic` correctly
  reported that the page's only graphics were site chrome — and the piece's lead visual was never
  photographed. This is a class of chart no rule in `METHOD.md` currently reaches, and it is
  recorded in the family's proposal.
- `style.title` is the document title, `"UK election results 2024 | Constituency map - BBC News"`.
  The graphic's own heading, **"Results: parties by seats"**, was read from the screenshot.
- The page is live and re-rendering (`LIVE next refresh in 46s`); this is one capture of it, on
  2026-09-08, showing the final 2024 result.
- Whether the track, the rule or the verdict change state before the target is met — the interesting
  case — was not observed, because the target had already been met when the page was read.
