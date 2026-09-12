# Ferdio / 100.datavizproject.com — #27, the overlapped group: hue is the category, tint is the series

- url: https://100.datavizproject.com/data-type/viz27/
- archive: datavizproject
- type: overlapped grouped column chart — 2 series ('04, '22) × 3 categories (Norway, Denmark, Sweden)
- export: static raster (`img` 823 × 823) served in the page
- readAs: `graphic.png`, picked at `documentTop` 172, photographed at 824 × 823. Both routes `ok`;
  `routes.pixel.measuredFrom === "graphic.png"`. `style.typeSource` is **"the page only — the graphic
  is a raster and carries no type this route can read"**.

## What it is

The same dataset drawn as three groups of two bars, except the two bars in each group **overlap**:
the '04 bar sits in front, the '22 bar behind and offset about half a bar-width to the right, so
only its right-hand sliver and its cap are visible.

## What it does with information

**The colour assignment is inverted from the usual grouped bar.** Normally hue carries the series
and position carries the category. Here **hue carries the category** — Norway navy, Denmark coral,
Sweden blue, one hue per country — and **lightness carries the series**: the darker tint is '04, the
lighter is '22, in all three groups. A reader who has learned "darker is the older year" once
carries it across all six bars without a legend.

**So there is no legend.** Each bar names its own series in white type on its own fill — `'04` low
on the dark bar, `'22` high on the light one. Six labels replace one key, and the labels sit where
the ambiguity is.

**The within-group gap is negative.** The bars are not merely touching, they are stacked in z. That
buys width — three groups fit in the space two would otherwise take — and it costs the ability to
compare the two series' *lengths* directly, because the shorter one is occluded from its own left
edge. It works here only because both bars share the same zero and the same axis, so the comparison
survives as a comparison of *caps* rather than of areas.

**The frame is present but faint.** Left axis at `0 / 5 / 10 / 15`, dotted horizontal gridlines, no
axis rule, country names in grey under a flag icon at the baseline. Where #25 dropped the frame and
labelled every bar, this one keeps the frame and drops the per-bar values — a different, coherent
answer to the same trade.

## What it does with style

Measured on `graphic.png` (`record.pixel`): ground `#FFFFFF` at **81.437 %**. Chromatic
`#3274D8` **5.793 %** (216°), `#F37666` **3.067 %** (7°), `#5495EC` **2.197 %** (214°),
`#EE5440` **1.771 %** (7°); neutrals `#283250` **2.160 %** and `#424B65` **1.765 %**. Shape
**diverging**, clusters at 216° (8.148 %, 9 members) and 7° (4.980 %, 14).

Read those six numbers as three pairs and the design is legible in the palette alone:

| category | series '04 (front, dark) | series '22 (behind, light) |
| --- | --- | --- |
| Sweden | `#3274D8` 5.793 % | `#5495EC` 2.197 % |
| Denmark | `#EE5440` 1.771 % | `#F37666` 3.067 % |
| Norway | `#283250` 2.160 % | `#424B65` 1.765 % |

Each pair is one hue at two lightnesses. The lighter member is never a wash — `#5495EC` against
`#3274D8` is a real step, not a 20 % opacity — which is what keeps the occluded sliver readable.

## What is transferable

- **When the series is a before/after and the categories are the subject, invert the usual mapping**:
  hue for the category, lightness for the series. The reader learns one rule instead of *n*.
- **A tint pair must be a real step in lightness, not an opacity knock-back**, or the back bar
  disappears into the ground where it is thin.
- **Overlapping the group buys horizontal room and costs length comparison.** It is only honest when
  both bars share one zero and one scale, so that caps can be compared even when bodies cannot.
- **Six in-bar series labels can replace one legend** when the labels are short (`'04`, `'22`).

## What is this piece's own

The flag roundels at the baseline, and Ferdio's three house hues.

## What was not verified

The graphic's typography (raster; `typeSource` says page only). The exact overlap fraction. Whether
the '22 bar is behind or in front where '22 < '04 — no group in this dataset decreases, so the
piece never had to answer it, and that is the case where the treatment would break. One publication.
