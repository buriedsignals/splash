# Office for National Statistics — *Our population*, figure 13: UK population pyramid, 2018 and 2043

`https://www.ons.gov.uk/visualisations/dvc775/fig13/simplepyramid/index.html` · harvested 2026-09-08
· archive `search`.

## What it is

A **chart-tool permalink**, which is the cleanest kind of target this corpus has
(`METHOD.md` correction 18): one published chart on one page, no masthead, no consent wall, no hero,
no second graphic. The record's graphic is an `svg` 550 × 425 at `documentTop` 0, `nearTheTop: true`,
`routes.pixel.measuredFrom: "graphic.png"`, `consent: null`, `entry: null`. Nothing was dismissed and
nothing was clicked, because there was nothing in the way.

It is a UK population pyramid at one-year resolution: **males left, females right**, age running up
from `1` to `101` and then an open band `110 and over`. Two states are on one plate — **2018 drawn as
filled bars, 2043 drawn as a bare outline over the same geometry**.

The figure belongs to the article *Our population — Where are we? How did we get here? Where are we
going?* (2020-03-27); the permalink is the embedded figure itself.

## What it does with information

- **Both halves count outward from a shared zero, and both tick sets read as positive**:
  `400k 300k 200k 100k 0 | 0 100k 200k 300k 400k`. The left side is not negative; it is the other
  group.
- **The age axis is a reserved gutter down the centre**, labelled every five years
  (`1 6 11 16 … 96 101`) and then `110 and over` above it. No label sits on a bar.
- **The open top band is named as an inequality** — `110 and over`, not a fictional ceiling.
- **The second date is an outline, not a second pair of bars.** The SVG carries `fill rgb(5, 61, 88)`
  × 199 (one path per one-year band, 2018) and `stroke rgb(36, 167, 155)` × 2 — **exactly two
  strokes, one per half**. The projection is a single continuous silhouette per side, so it reads as
  a shape laid over a shape rather than as 200 more marks.
- **The legend is two marks that look like what they label**: a filled square for `2018`, a bare line
  for `2043`. It is the only legend on the plate.
- `Males` and `Females` are set small and grey **inside the plate**, either side of the gutter at
  mid-height, rather than as headings above it.
- The source is on the page under the plate: `Source: National Population …` (`Open Sans | 16 | 700`).

## What it does with style

Measured on `graphic.png` (`routes.pixel.measuredFrom === "graphic.png"`):

| role | measured |
| --- | --- |
| ground | `#FFFFFF` at 58.439 % |
| the 2018 fill | `#053D58` at 22.824 %, hue 199.5 |
| its antialiased edges | `#7493A2` 3.336 %, `#6A8B9B` 1.534 %, `#3A667B` 1.005 %, `#144962` 0.928 %, `#24556D` 0.867 % — all hue 199.5–199.7 |
| furniture | `#F3F3F3` 0.388 %, `#EBEBEB` 0.273 %, `#DADADA` 0.252 % |
| palette shape | `sequential` |

The classifier says `sequential` because **every chromatic pixel on the plate is one hue**: the six
leading entries sit inside 0.2° of each other at 199.5. The plate is one navy and white, and the
whole of its second colour — the teal of the 2043 projection — is carried by two hairline strokes too
thin to enter the pixel route's top six. The style route has it: `stroke rgb(36, 167, 155)` and one
`fill rgb(36, 167, 155)` (the legend's line swatch).

Type is read from the same document as the graphic (`typeSource: "the page, which contains the
graphic — the two are not separated"`, and on a permalink page the two really are the same
document): `Open Sans | 12 | 400` × 107 in `rgb(0, 0, 0)`, sample `"2018"` — **one size for every
label on the plate**, ticks and age bands and legend alike. The only two exceptions are
`Open Sans | 12 | 500` × 2, sampled `"Males"`, and `Open Sans | 16 | 700` × 2 for the source line.

## What is transferable

- **A comparison state drawn as an outline over the filled bars.** Corroborated independently by
  Statistics Canada's *Comparison Age and Gender Pyramid*, which does the same thing with a grey fill
  and a purple outline and also uses exactly two strokes.
- **Two strokes, not two hundred.** The outline is one path per half. That is what makes the second
  state legible as a silhouette instead of as noise on top of the first.
- **A legend whose marks look like the marks they label** — a square for a fill, a line for an
  outline.
- **Both magnitude axes positive, counting outward from a shared zero.**
- **The ordered category in a reserved centre gutter**, never over a bar.
- **An open top band named as an inequality** (`110 and over`).
- **One hue for the whole plate, with the second colour spent entirely on the comparison.** 22.8 % of
  the picture is one navy; the teal is two strokes and a legend swatch. The accent is not decoration,
  it is the argument.
- **One type size for every label on the plate.** Twelve point, one weight, one ink.

## What was not verified

- **Whether the 2043 outline's teal `rgb(36, 167, 155)` meets the WCAG non-text floor against white.**
  Not measured here, and it is a hairline, which is the hardest case.
- **Whether the article this figure belongs to repeats or contradicts these choices.** Only the
  permalink was read.
- **The `fill rgb(255, 255, 255)` × 4 marks.** Four white fills; nothing in the picture identifies
  them, and they may be the plate's own background rectangles.
- **The interactive behaviour, if any.** The permalink is named `simplepyramid` and nothing in the
  record says whether the figure responds to a reader.
