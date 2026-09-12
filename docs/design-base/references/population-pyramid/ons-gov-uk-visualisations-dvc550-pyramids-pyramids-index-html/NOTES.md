# Office for National Statistics — *Overview of the UK population*: two areas compared as a pair of pyramids

`https://www.ons.gov.uk/visualisations/dvc550/pyramids/pyramids/index.html` · harvested 2026-09-08 ·
archive `search`.

## What it is

A second ONS **chart-tool permalink**, and the same publication as
`ons-gov-uk-visualisations-dvc775-fig13-simplepyramid-index-html`. It is filed alongside it because
it draws a **different idiom for the same question**: where dvc775 lays a second state over the first
as an outline, this one puts **two whole pyramids side by side on a shared, mirrored, percentage
axis**.

The record's graphic is an `svg` 930 × 465 at `documentTop` 204, `nearTheTop: true`,
`routes.pixel.measuredFrom: "graphic.png"`, `consent: null`, `entry: null`.

> **A third ONS record was harvested and is not filed.** `dvc692/pyramids/pyramids.html` (2018-based
> national population projections) reached a real pyramid and reads cleanly. It is the *same
> component as this one* — identical mark colours (`fill rgb(95, 118, 130)` and `fill rgb(0, 128,
> 128)`, `stroke rgb(177, 177, 177)` × 4), identical type keys, identical layout — photographed under
> a different series, with counts on the axis instead of percentages. `METHOD.md` correction 18
> records exactly this case on two other ONS figures and the right answer there was to keep one. It
> is kept once here, and this is the one kept, because the percentage axis is what makes the two
> panels comparable and because it carries an open top band (`90+`) that the counts version does not.

## What it does with information

- **Two areas, two pyramids, one scale.** Left panel slate grey, right panel teal, both drawn from a
  shared zero, both axes reading `1 0.5 0 | 0 0.5 1` with the caption
  `Percentage of population in age band` under each.
- **The axis is a percentage precisely so that two populations of different size can be compared.**
  The counts version of this same component (dvc692, not filed) cannot do that, and the page's own
  headline numbers say why: the style route reports `Open Sans | 26 | 700`, sampled `"228,800"` — a
  large total set above each panel, on the page rather than on the plate.
- **Each half is named in words at its head**: `Male` left, `Female` right, `Open Sans | 15 | 600`
  × 4 — twice, once per panel. Not a swatch legend.
- **`Age` is written over the centre gutter** of each panel, and the age ticks run up inside the
  gutter, `10 20 … 80` and then `90+`.
- **The top band is an inequality**, `90+`.
- The panels are small multiples in the strict sense: same geometry, same scale, same furniture,
  different data and one colour each.

## What it does with style

Measured on `graphic.png`:

| role | measured |
| --- | --- |
| ground | `#FFFFFF` at 75.895 % |
| right panel (teal) | `#80BFBF` at 7.478 %, then `#8CC6C6` 1.657 %, `#83C1C1` 0.757 %, `#008080` 0.500 %, `#40A0A0` 0.130 % |
| left panel (slate) | `#AFBAC1` at 7.569 %, then `#B2BDC3` 0.916 % |
| palette shape | `sequential` |

**The fills are drawn at half strength, and the arithmetic says so exactly.** The style route reports
the two mark fills as `rgb(0, 128, 128)` and `rgb(95, 118, 130)`. The pixel route's leading entries
are `#80BFBF` and `#AFBAC1`, which are those two colours at **50 % over white** to the integer:
`(128 + 255) / 2 = 191 = 0xBF`, and `(95 + 255) / 2 = 175 = 0xAF`, `(118 + 255) / 2 = 186.5 → 0xBA`,
`(130 + 255) / 2 = 192.5 → 0xC1`. The full-strength colour appears only as `#008080` at 0.500 % —
which is the **silhouette stroke**, reported by the style route as `stroke rgb(0, 128, 128)` × 4 and
`stroke rgb(95, 118, 130)` × 4.

So the plate is a **half-opacity fill under a full-strength outline of the same hue**, in both
panels. The two panels carry near-identical coverage (7.478 % teal against 7.569 % slate), which is
what a shared percentage scale on two similar populations should produce.

Type comes from the page containing the graphic (`typeSource: "the page, which contains the graphic
— the two are not separated"`), and this page is an interactive: `Open Sans | 15 | 400` × 31 sampled
`"0.5"` for the ticks, `Open Sans | 16 | 400` × 25 sampled `"Choose an area"` for the controls,
`Open Sans | 15 | 600` × 4 for `Male` / `Female`, `Open Sans | 26 | 700` × 2 for the headline totals,
`Open Sans | 16 | 700` × 1 for `Office for National Statistics`. One family, five sizes, and the
largest thing on the page is a number rather than a title.

## What is transferable

- **Two populations as two whole pyramids on one shared percentage axis**, rather than overlaid. The
  cost is that a reader compares by eye across a gap; the gain is that neither silhouette is
  obscured.
- **A percentage axis is what makes two pyramids of different populations comparable.** The same
  component with counts on the axis cannot answer the same question.
- **Half-opacity fill under a full-strength stroke of the same hue.** The silhouette stays crisp
  while the mass stays quiet. Measured exactly, at 50 %.
- **One colour per panel, no legend.** The panel's colour is its identity, and the words `Male` /
  `Female` do the group labelling inside each panel.
- **`Age` written over the gutter it labels**, so the centre column is named rather than inferred.
- **An open top band as an inequality** (`90+`), corroborating ONS dvc775's `110 and over`.

## What was not verified

- **The headline totals.** `Open Sans | 26 | 700` sampled `"228,800"` is read from the page's style
  route; the graphic clip (930 × 465, starting at `documentTop` 204) does not contain it, so this
  note does not claim where on the page it sits or how it is set relative to the plate.
- **Which two areas are shown.** The page is an area picker; the record is of whatever state the
  harvester found, and nothing in it names the areas.
- **Whether the slate and teal pair is distinguishable by a colour-vision-deficient reader.** They
  are far apart in lightness as measured (`l` 0.72 against 0.63 at half strength) but this was not
  tested as a pair.
- **Whether either colour meets the WCAG non-text floor at half strength.** `#80BFBF` and `#AFBAC1`
  on `#FFFFFF` are both light; not measured.
