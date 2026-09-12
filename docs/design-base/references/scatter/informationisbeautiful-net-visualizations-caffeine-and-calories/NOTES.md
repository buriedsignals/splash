# Information is Beautiful — "The Buzz vs The Bulge" (Caffeine and calories)

- url: https://informationisbeautiful.net/visualizations/caffeine-and-calories/
- archive: informationisbeautiful
- type: scatter — two quantitative axes, depicting marks, value axis running through the cloud
- export: static
- readAs: the poster as the page serves it, in the page screenshot; the graphic is a raster

## What it is

Drinks and foods placed on **x = caffeine** against **y = calories**, each drawn as a silhouette of
the thing itself — a mug, a takeaway cup, a chocolate bar, a portion of fries.

## What it does with information

**The value axis runs down the middle of the plot, not along its edge.** A single vertical rule
sits at the horizontal centre of the plate, titled `CALORIES` at its head, and carries its own
tick values (`600`, `500`, `400` …) **on** it. Marks sit on both sides of it. A scatter usually
banishes its scale to a gutter; here the scale is a landmark inside the cloud, which is what lets
a reader who is looking at one mark read its calories without travelling to an edge.

**The ticks are set in an opaque chip on the rule.** Each number sits in a small white pill so it
stays readable where the rule crosses a mark or the gradient darkens.

**Every mark is joined to its own row by a dotted leader running the width of the plate.** A reader
follows a horizontal dotted line from any mark to any other at the same calorie level — the
comparison the y axis exists for, drawn rather than left to the eye.

**The label is a filled chip whose colour is the class.** `Big Mac`, `Blueberry muffin` and `Fries`
sit in a cool blue-grey chip; `L. Hot Chocolate & whipped cream`, `Dark chocolate bar`,
`L. Mocha Frappucino & whipped cream` sit in a warm brown chip. Two classes, no key: the label
carries its own category, and the chip also guarantees the label reads against the mid-tone paper.
Where a label needs a qualifier it takes a second line inside the same chip, smaller
(`L. Hot Chocolate` / `& whipped cream`).

**A third column translates the y value into an everyday equivalent.** At the right edge, under the
heading `equivalent to 30 mins of`, white silhouettes of a runner and a skater sit at the calorie
heights they burn. The reader gets the number and, beside it, what the number costs.

## What it does with style

**Contaminated `measured.json` palette** — same mechanism as the sibling IIB records (the site's
promotional banner is in the page screenshot the pixel route fell back to). Re-measured on the plate
alone (`crop 80,172,1285,728`):

- **there is no single ground.** The plate is a vertical gradient, and the route returns five
  neutrals in a narrow warm band each holding a similar share: `#D5CDBB` 17.0 %, `#CDC2AD` 12.8 %,
  `#C2B69C` 10.8 %, `#C6BAA2` 10.6 %, `#D0C6B2` 10.0 %. The modal colour it reports as "ground"
  (`#D5CDBB`) is the lightest band, not a flat field, and reading it as a ground would be wrong.
- palette **monochrome, 1 hue cluster at 27°** (14 buckets, 1.8 % of the ink): the marks are one
  warm dark brown, `#987A61` at 1.43 %, against warm paper. There is no chromatic accent anywhere
  on the plate.
- the piece's one contrast move is **value, not hue**: near-black silhouettes for the subject,
  **white** silhouettes for the equivalence column.

## What is transferable

- **Put the value axis through the cloud** when the cloud is sparse and the reader will want to read
  one mark's value in place.
- **Set tick values in an opaque chip** wherever the axis crosses marks or a gradient.
- **Run a dotted leader from every mark across the plate** when same-level comparison is the point.
- **Make the label chip's fill the category key**, and let a qualifier take a second, smaller line
  inside the same chip.
- **Add a column that translates the axis into a consequence** ("equivalent to 30 mins of …").
- **A monochrome scatter is a legitimate choice**: one hue at 27°, contrast carried by value.

## What is this piece's own

The taupe gradient, the drawn objects, and the brand-specific drink names.

## What was not verified

- **The x axis.** `CALORIES` names the vertical rule; the caffeine axis and its ticks are below the
  captured 1440 × 900 fold and were **not** read. The x variable is known from the poster's
  subtitle (`Caffeine and calories`) and the page title (`Caffeine vs. Calories`), not from a
  measured axis.
- Whether the two label-chip colours are named anywhere as a key.
- No type measurement: the plate is a raster and the style route reached only the site's own type.
