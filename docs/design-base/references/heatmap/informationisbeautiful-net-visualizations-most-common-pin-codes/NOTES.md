# Information is Beautiful — "Pin Point"

- url: https://informationisbeautiful.net/visualizations/most-common-pin-codes/
- archive: informationisbeautiful
- type: heatmap (matrix), 100 × 100, sequential
- export: static
- readAs: the published poster as the page serves it, read at rest inside the 1440 × 900 page shot;
  the poster is a raster, so nothing inside it was measured by the style route

## What it is

A single heatmap of every four-digit PIN. The vertical axis is the first two digits (00–99), the
horizontal the second two; each of the ten thousand cells is filled by how often that PIN occurs in
a corpus the page states as "3.4 million data points visualized from several data breaches"
(measured on the page as `IBM Plex Sans | 18 | 400`). It is the family in its purest form: one
value, two categorical axes, colour as the only encoding.

## What it does with information

**The ends of the scale are named in words and there are no numbers on it at all.** The key is a
stepped ramp under the title, labelled `most common` at one end and `least` at the other. No unit,
no tick values, no midpoint — because the quantity being shown is a rank, and a frequency count of
"1234" against "8347" would tell the reader nothing they could use. **Naming the ends is the honest
alternative to a unit the scale does not have.**

**The ramp runs away from the ground, not toward it.** The poster's ground is black (pixel route:
`#000000`, 42.0 % of the page shot). The most common end is **white**; the least common end is
near-black. Sampled along the legend bar in `screenshot.png` at y = 325, the ramp reads
`#FFFFFF` → `#FFF394` → `#FBE184` → `#F5CE72` → `#E9A951` → `#DB8136` → `#CF581F` → `#C94317` →
`#9D7152` → `#434342` → `#242423`. Against a dark ground the loud class is the light one, which is
the reverse of the convention on white paper and is right here.

**The scale is stepped, not continuous.** The legend is drawn as separate swatches with visible
edges. (The exact number of steps was not counted and is not asserted.)

**The annotation is on REGIONS of the grid, not on cells.** Two dashed rectangles bracket blocks and
name what the block means — `Those using their birth date in DD/MM or MM/DD formats` around the
low-number quadrant, `using same two pairs of numbers` along the top. This is the treatment a matrix
needs and a line chart does not: the finding in a heatmap is almost always a shape, and a callout on
one cell cannot say it.

**Individual cells are still called out where the cell itself is the story**, with a small leader
label: `7410`, `4321`, `2580`, `1234`. Two annotation scales, region and cell, on one graphic.

**The diagonal reads without being drawn.** Repeated-pair PINs (1212, 3434) form a bright diagonal
that the reader sees before the annotation names it. The layout was chosen so the pattern would fall
somewhere the eye already looks.

**The axis says which way it increases.** `FIRST TWO DIGITS` is set in tracked grey capitals beside
a downward arrow, with ticks at 99, 95, 90, 85, 80, 75 — a label that states its own direction
rather than leaving the reader to infer it from two tick values.

## What it does with style

Ground `#000000` at 42.0 % and a warm ramp whose dominant class is `#D15F23` at 16.6 %; the pixel
route classifies the palette as **sequential**. Both figures are measurements of the **page shot**,
not of the poster — `routes.pixel.measuredFrom` is `screenshot.png` — so they include the site nav
and its promotional banner, and the classification is not a reading of the scale. It happens to
agree with the eye here; that agreement is not evidence. The type is a light geometric
sans throughout, the title set very large against a much smaller subtitle. Annotation is in the
ramp's own orange-red rather than in a neutral, so a callout reads as part of the encoding.

## What is transferable

- **Name the ends of a scale in words when the quantity has no unit a reader can use.**
- **Set the ramp's direction from the ground**: the extreme class is the one furthest from the
  ground in luminance, so on a dark ground more is lighter.
- **Annotate a REGION of a matrix** — bracket the block and name it in prose — because the finding in
  a heatmap is a shape more often than a cell.
- **Two annotation scales on one graphic**, region and cell, kept apart by their own geometry
  (dashed rectangle versus leader label).
- **An axis label that carries its own direction**, with an arrow, not only its tick values.

## What is this piece's own

The black ground and the specific warm ramp; the decision to give the "least common" tail three
greys, which reads as "off" rather than as a further step of the same scale.

## What was not verified

- **The poster's own type is entirely unmeasured.** It is a raster; the style route reached only the
  Information is Beautiful page's chrome (`IBM Plex Sans`, `Quicksand`). No family, size, weight or
  tracking inside the graphic is recorded, and none is asserted. **No direction can be measured off
  this reference for that reason.**
- **The pixel measurement includes the page's chrome.** `largestGraphic` returned nothing here, so
  the pixel route measured `screenshot.png` — 1440 × 900, of which roughly the top 152 px is the
  site nav and a yellow-to-pink promotional banner. The black ground and the orange ramp dominate
  regardless, but the shares above are shares of the page, not of the poster.
- The bottom of the poster is below the 900 px fold and was not read. Whatever sits under the matrix
  — source line, further annotation — is not in this record.
- The number of steps in the ramp was not counted.
- No claim is made about the underlying breach corpus or its representativeness.
