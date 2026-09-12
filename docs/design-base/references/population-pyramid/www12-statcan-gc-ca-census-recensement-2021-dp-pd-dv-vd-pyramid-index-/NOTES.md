# Statistics Canada — *Age Pyramids*: Comparison Age and Gender Pyramid, 2021 Census

`https://www12.statcan.gc.ca/census-recensement/2021/dp-pd/dv-vd/pyramid/index-eng.cfm` · harvested
2026-09-08 · archive `search`.

## What it is

Statistics Canada's own census data-visualisation tool. The page carries the title *Age Pyramids*,
the sub-head *Comparison Age and Gender Pyramid*, and the standing text: *"Compares the age and
gender structure of the population at three different levels of geography (Canada, provinces,
territories, census metropolitan areas, census agglomerations and census subdivisions) through the
pull-down menus below."* Release date 2022-04-27, updated 2024-06-26.

The record's graphic is an `svg` 1080 × 396 at `documentTop` 992, `nearTheTop: true`,
`routes.pixel.measuredFrom: "graphic.png"`, `consent: null`, `entry: null`. The state harvested is
the tool's default, *Canada vs Canada — 2021*.

**Two things about this record's picture, both stated rather than glossed.**

1. **The clip is short.** The `svg` is 396 px tall and the chart drawn inside it is taller: the
   picture runs from the `100` band at the top down to roughly age 8 and stops. **The magnitude axis
   and the group names are not in the picture**, and nothing in this note is claimed from them
   except where the style route is named as the source.
2. **A "Website Survey" panel was open on the page**, visible in `screenshot.png` between viewport
   y ≈ 620 and y ≈ 865, offering *Yes* / *No, thank you*. The graphic begins at `documentTop` 992 and
   `graphic.png` shows no panel and no dimming wash — unlike two other records in this family, this
   one's pixels are clean. It is recorded because a page read with a modal open is a page in a state
   the harvester found it in, and because `consent` is `null`: the dismisser did not fire.

## What it does with information

- **One geography filled, the other outlined, on one mirrored geometry.** The style route reports
  `fill rgb(175, 175, 175)` × 202 — one path per one-year band, both halves — and
  `stroke rgb(110, 78, 163)` × **2**. Two strokes: one continuous silhouette per side. This is the
  same construction as ONS's dvc775, from an unrelated agency on another continent.
- **The comparison state carries no fill at all.** Where the two geographies agree, there is nothing
  to see; where they differ, the purple line leaves the grey edge. The chart is built so that
  *difference* is the only thing drawn twice.
- **The age axis is a reserved gutter down the centre**, labelled every ten years (`10 20 … 100`)
  in `Noto Sans | 12 | 700`, and no label sits on a bar.
- **Bands are one year wide** and separated by a hairline of ground, so 100+ bands stay individually
  countable across a 1 080 px plate.
- The magnitude axis is read from the style route, not the picture: `sans-serif | 10 | 700` × 8,
  sample `"0%"`. Eight tick labels, in percent — so the two geographies are compared on **share of
  population**, which is what lets Canada be compared with a census subdivision.
- Two `<select>` controls (`Geography 1`, `Geography 2`) and three visualisation modes
  (`Comparison`, `Historical`, `Population of interest`) sit above the plate.

## What it does with style

Measured on `graphic.png`:

| role | measured |
| --- | --- |
| ground | `#FFFFFF` at 39.194 % |
| the filled geography | `#AFAFAF` at 32.501 % — a pure neutral, `s: 0`, `chroma: 0` |
| the outline | `#6E4EA3` at 0.717 %, hue 262.6 |
| the outline's antialiasing | `#7E66A6` 0.127 %, `#927ABA` 0.095 %, `#8A72B2` 0.061 % |
| band separators / plate furniture | `#EBEBEB` 3.178 %, `#F4F4F4` 3.121 %, `#DCDCDC` 3.101 % |
| palette shape | `sequential` |

**The plate has one colour and it is spent entirely on the comparison.** Thirty-two and a half per
cent of the picture is achromatic grey; the only chromatic ink in it is 0.717 % of purple, and that
purple is a line. The mass of the chart is deliberately colourless, and the reader's eye is taken to
the one place a decision was made.

That is a stronger version of what ONS dvc775 does with navy and teal, and it works because **the
mirrored layout already carries the male/female distinction through position**, so no colour pair is
needed for the groups at all. The type sheet
(`skills/chart-beat/references/types/population-pyramid.md`) says the redundancy is why this form
stays legible in greyscale; StatCan simply takes the consequence and draws it in greyscale.

Type is `typeSource: "the page, which contains the graphic — the two are not separated"`, and this
page is a full government site: `Noto Sans` at 14/16/20 for the Government of Canada masthead and
breadcrumb, `Noto Sans | 20 | 700` for `Change visualization`, `Lato | 16 | 400` for the mode tabs.
Only two entries are plausibly the plate's own — `Noto Sans | 12 | 700` × 13, sample `"100"`, and
`sans-serif | 10 | 700` × 8, sample `"0%"` — and because the route cannot separate the two documents,
**that attribution is inference, not measurement**.

## What is transferable

- **A comparison state as a bare outline over a filled pyramid.** Two publications now do this
  independently — ONS (UK, 2018 filled / 2043 outlined) and Statistics Canada (geography 1 filled /
  geography 2 outlined) — and both use **exactly two strokes**, one continuous path per side.
- **The mirrored position can carry the two groups without any colour pair.** Both halves are the
  same grey; nothing is lost, because left-versus-right already says which is which.
- **Spend the only colour on the comparison, not on the mass.** 32.5 % neutral, 0.7 % chromatic.
- **A percentage axis is what makes two geographies of different size comparable** — corroborating
  ONS dvc550.
- **One-year bands at plate width.** Two hundred and two paths, separated by a hairline of ground,
  still read as a silhouette and still let a reader count a cohort.

## What was not verified

- **The magnitude axis, the group names, and the bottom of the chart.** Cut off by the 396 px clip.
  `"0%"` × 8 is the style route's reading of the page, not something visible in `graphic.png`.
- **Which two geographies are shown.** The screenshot's heading reads `Canada vs Canada—2021`, which
  is the tool's default and means the two states are identical — so the purple outline in this
  picture traces the grey fill exactly and **this record does not show the treatment doing its job on
  two different populations**. It shows that the treatment exists and how it is built.
- **Whether `#6E4EA3` on `#AFAFAF` meets the WCAG non-text floor.** Not measured, and it is a
  hairline over a mid grey, which is the hardest case in this family.
- **Anything the "Website Survey" panel covered.** It sat above the graphic, not over it, but the
  page was read with it open.
- **The other two modes** (`Historical`, `Population of interest`). The harvester does not click.
