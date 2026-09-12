# PopulationPyramid.net — *World Population Pyramid 2023*

`https://www.populationpyramid.net/world/2023/` · harvested 2026-09-08 (twice) · archive recorded
as `url-list` (found by search, not drawn from the url list file).

## What it is

A **real histogram, mirrored** — the whole page is one chart, and the chart is two histograms of the
same continuous variable (age) sharing a zero and facing outward. The record's graphic is an `svg`
595 × 536 at `documentTop` 158, `nearTheTop: true`, `routes.pixel.measuredFrom: "graphic.png"`.
Twenty-one contiguous five-year age bins from `0-4` to `100+`, males left, females right, each bar's
length the share of total population in that bin.

**The pixel route on this record is contaminated and none of its colours may be quoted.** A consent
dialog (in French, headed *Utilisation…*, with a *Refuser tout* button) sits over the right-hand
half of the plate on both harvests, and its page-dimming overlay covers all of it. The record's
`consent` field is `null` — the harvester's dismisser did not fire and does not know it failed. This
is `METHOD.md` correction 3 exactly, and the arithmetic gives it away: the reported ground is
`#C8C8C8` at 51.62 % on a plate whose ground is plainly white, with `#FFFFFF` filed second at
30.96 % — which is the *modal panel*, not the chart. Both routes reported `ok`.

The record is kept, with the contamination stated, on the precedent of the scatter family's
MicrobeScope entry: the graphic was genuinely reached and its geometry, labelling and type are
readable; only its palette is not.

## What it does with information

- **Bins are named by both edges**: `0-4`, `5-9`, `10-14`, … `95-99`, and then `100+` — an open top
  bin, named as an inequality rather than given a fictional ceiling.
- **The value axis is mirrored and repeated**: `10% 8% 6% 4% 2% 0% 2% 4% 6% 8% 10%`, counting
  *outward* from a shared zero in the middle. Both halves are on the same scale, which is what makes
  the mirroring readable rather than decorative.
- **The two populations are named in words at the head of their own half** — `Male` over the left,
  `Female` over the right (`sans-serif | 16 | 400`, ×2) — not in a legend and not by colour alone.
- **Every bin carries its own value label.** `style.type` holds `sans-serif | 10 | 400` ×106 with the
  sample `"3.9%"`: the percentage is printed at the end of each bar on both sides, so the chart is
  also a table. Nothing has to be estimated against the axis.
- Aggregates are set apart in bold at a larger size: `-apple-system | 11 | 700` ×3, sample `"24.4%"`,
  beside `-apple-system | 11 | 400` labels sampled `"Under 15"` — three roll-ups of the bins
  (under 15 / working age / 65+) stated under the plate rather than drawn on it.
- The source is on the plate: `-apple-system | 12 | 400`, sample
  `"Data source: (medium variant) — last updated July 2024."`

## What it does with style

**Colour, read from the style route's SVG fills (`record.style.marks`), because the pixel route is
contaminated:**

| role | measured |
| --- | --- |
| left half (Male) | `fill rgb(70, 130, 180)`, 19 marks |
| right half (Female) | `fill rgb(238, 121, 137)`, 20 marks |
| bar outline / ink | `stroke rgb(18, 22, 45)`, 4 marks |
| a third accent | `fill rgb(46, 139, 87)`, 1 mark |

`rgb(70, 130, 180)` is CSS `steelblue` and `rgb(46, 139, 87)` is CSS `seagreen` — named-colour
defaults, which is a fact about the site's authorship and worth recording. The pixel route's
`#6C8AA3` and `#C0858D` are those same two fills seen through the consent overlay's grey wash and
are **not** the chart's colours.

Type is read from the same document as the graphic (it is an inline `svg`): the bar value labels are
generic `sans-serif | 10 | 400` in `rgb(18, 22, 45)`, everything else on the page is
`-apple-system` at 10–30 in the same near-black ink. There is one ink for the whole page.

Bars all but touch, measured: at column x = 250 the runs of the male fill are
`193-215 216-239 240-263 264-287 …` — 22–24 px bars separated by **1 px**, which is the bar's own
`rgb(18, 22, 45)` stroke and not a designed gap. This is the only record in the family that draws
its bins the way `chart-beat/references/types/histogram.md` says to.

## What is transferable

- **Two distributions of the same variable, mirrored about a shared zero, with the axis counting
  outward on both sides.** The second publication in this family that does it is
  `ourworldindata-org-global-population-pyramid`.
- **Name each half in words at its head.** Colour distinguishes the halves; it does not have to
  carry their identity.
- **Bins named by both edges, and an open top bin named as an inequality** (`100+`) — the same
  convention Figure.NZ reaches independently (`$1m and over`).
- **A value label on every bin turns a histogram into a table without a second chart.** Twenty-one
  bins × two sides is the upper end of where this stays legible.
- **Roll-ups of the bins belong under the plate, not on it.** Under-15 / working-age / 65-plus are
  set in bold beneath the axis rather than as brackets or bands across the bars.
- **Bins separated only by their own stroke.** 22–24 px bar, 1 px stroke — contiguity preserved,
  bins still individually countable.

## What was not verified

- **Every colour the pixel route reports.** Contaminated by a consent overlay on both harvests; see
  above. No claim in this note or in the proposal rests on `record.pixel`.
- **Whether the plate has a second state.** The site offers year and country selectors; this is the
  world, 2023, as delivered.
- **The `fill rgb(46, 139, 87)` mark.** One mark, seagreen, and nothing in `graphic.png` identifies
  what it is. It may not be on the plate at all — `style.marks` is read from the whole page.
- **Anything behind the consent dialog on the right of the plate.** Roughly the right 40 % of the
  frame is covered by the panel; the female bars' value labels for the middle bins were read from the
  visible portion and from the type route, not from the picture.
