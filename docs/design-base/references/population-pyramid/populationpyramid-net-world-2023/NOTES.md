# PopulationPyramid.net — *World Population Pyramid 2023*

`https://www.populationpyramid.net/world/2023/` · harvested 2026-09-08 · archive `search`.

## What it is

**The canonical case of this family**: the whole page is one chart, and the chart is two age
distributions mirrored about a shared centre, males left, females right, age running up in
twenty-one contiguous five-year bands from `0-4` to `100+`.

The record's graphic is an `svg` 595 × 536 at `documentTop` 158, `nearTheTop: true`,
`routes.pixel.measuredFrom: "graphic.png"`, `entry: null`.

**This page is also filed under `histogram`, deliberately.** It carries one form that answers to two
families — a mirrored pair of histograms *is* a population pyramid — and `METHOD.md`'s guard already
allows one page two records (`two-records-that-agree-exactly-are-both-wrong` exempts pages that are
the same page). The histogram record reads it as a histogram, for its bins; this one reads it as a
pyramid, for its mirroring. **It is one publication either way, and it counts once.** The record here
is an independent re-harvest, not a copy, and the numbers below are this harvest's own.

## The palette is contaminated and none of it may be quoted

A French consent dialog — headed *Utilisation de Cookies et de Données Personnelles*, buttons
*Refuser tout* / *Paramètres* / *Tout accepter* — sits over the right-hand half of the plate, and its
page-dimming overlay covers **all** of it. `record.consent` is `null`: the harvester's dismisser did
not fire and does not know it failed. Both routes report `ok`.

This is now the **third** harvest of this url to come back the same way (two under `histogram`,
this one), so it is not a transient. The arithmetic gives it away: the record's ground is `#C8C8C8`
at **51.619 %** on a plate that is plainly white, with `#FFFFFF` filed second at 30.961 % — which is
the *modal panel*, not the chart. The wash **multiplies** every colour on the plate, so no
five-decimal guard can see it: `#6C8AA3` at 5.211 % and `#C0858D` at 0.734 % are the two bar fills
seen through grey.

The record is kept, on the same precedent as the histogram entry: the graphic was genuinely reached,
and its geometry, labelling and axis are readable. Only its colour is not.

## What it does with information

- **Both halves count outward from a shared zero, and both read as positive**:
  `10% 8% 6% 4% 2% 0% 2% 4% 6% 8% 10%`, one axis drawn once along the foot.
- **The two groups are named in words at the head of their own half** — `Male` over the left,
  `Female` over the right (`sans-serif | 16 | 400`, × 2). No swatch legend anywhere.
- **Bins are named by both edges** (`0-4`, `5-9`, … `95-99`) and the top band is an **inequality**,
  `100+`.
- **The band names sit in the LEFT margin, not in a centre gutter.** The centre of the plate is
  occupied by the value labels instead.
- **Every band carries its own value label**, printed at the end of the bar on both sides:
  `sans-serif | 10 | 400` × 106, sample `"3.9%"`. Twenty-one bands × two sides ≈ 42 labels, plus the
  axis. The chart is also a table; nothing has to be estimated.
- Roll-ups are set apart beneath the plate rather than drawn on it:
  `-apple-system | 11 | 700` × 3 sampled `"24.4%"` beside `-apple-system | 11 | 400` sampled
  `"Under 15"` — three aggregates (under 15 / working age / 65+).
- The source is on the plate: `-apple-system | 12 | 400`, sample
  `"Data source: (medium variant) — last updated July 2024."`

## What it does with style

**Read from the style route's SVG fills (`record.style.marks`) only, because `record.pixel` is
contaminated:**

| role | measured |
| --- | --- |
| left half (Male) | `fill rgb(70, 130, 180)` |
| right half (Female) | `fill rgb(238, 121, 137)` |
| bar outline / page ink | `stroke rgb(18, 22, 45)` |

`rgb(70, 130, 180)` is CSS `steelblue` — a named-colour default, which is a fact about the site's
authorship and worth recording rather than reading as a decision.

Type comes from the same document as the graphic (`typeSource: "the page, which contains the graphic
— the two are not separated"`, and here that is literally true: the chart is an inline `svg` in a
page that is nothing else). The band value labels are generic `sans-serif | 10 | 400` in
`rgb(18, 22, 45)`; everything around them is `-apple-system` at 10–30 in the same near-black. **One
ink for the whole page.**

## What is transferable

- **Two distributions mirrored about a shared zero with the axis counting outward on both sides,
  drawn once along the foot.** The corpus's plainest statement of the form.
- **Name each half in words at its head.** Colour distinguishes the halves; it does not have to carry
  their identity. Corroborated by Our World in Data (`Men` / `Women`) and by ONS (`Male` / `Female`).
- **Bands named by both edges, with an open top band as an inequality** (`100+`). Corroborated by
  ONS (`90+`, `110 and over`) and PopulationPyramids.org (`100+`).
- **A value label on every band turns a pyramid into a table without a second chart.** Twenty-one
  bands × two sides is the upper end of where this stays legible.
- **Roll-ups belong under the plate, not on it.** Under-15 / working-age / 65-plus are set in bold
  beneath the axis rather than as brackets or bands across the bars.
- **The band names do not have to be in the centre.** This plate puts them in the left margin and
  gives the centre to the value labels — the opposite of the arrangement
  `chart-beat/references/types/population-pyramid.md` prescribes, and it works because every value is
  printed anyway.

## What was not verified

- **Every colour the pixel route reports.** Contaminated by an unhandled consent overlay on all three
  harvests of this url. No claim in this note or in the proposal rests on `record.pixel`.
- **The `fill rgb(46, 139, 87)` mark** (CSS `seagreen`, one mark). Nothing in `graphic.png`
  identifies what it is; `style.marks` reads the whole page, so it may not be on the plate at all.
- **Anything behind the consent dialog.** Roughly the right 40 % of the frame is covered. The female
  bands' value labels for the middle bins were read from the visible margin and the type route, not
  from the picture.
- **Whether the plate has a second state.** The site offers year and country selectors; this is the
  world, 2023, as delivered.
