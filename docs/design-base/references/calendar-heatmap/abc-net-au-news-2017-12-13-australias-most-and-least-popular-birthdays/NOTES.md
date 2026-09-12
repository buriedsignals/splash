# ABC News (Australia) — "How common is your birthday?"

- url: https://www.abc.net.au/news/2017-12-13/australias-most-and-least-popular-birthdays-revealed/9241978
- archive: search
- type: calendar heatmap, day-of-month × month, one cell per calendar date, **rank printed in every cell**
- export: web (a static raster, `img 638 × 908`, at `documentTop` 1298 — inside the article, not the
  lead image)
- readAs: the graphic itself, photographed as the element (`graphic.png`).
  `routes.pixel.measuredFrom` is `graphic.png`. **`style.typeSource` is `the page only — the graphic
  is a raster and carries no type this route can read`**, so no typeface below is the graphic's
  voice; the page's own furniture is `abcsans`, and that is ABC News's masthead, not this chart's.

## What it is

The ABC data desk's answer to the same question the ONS asks, from Australian Bureau of Statistics
2017 data, and drawn on the same index: **rows are days of the month 1–31, columns are the twelve
months**. Where the ONS colours the count, ABC colours the **rank**, and prints it.

## What it does with information

**Every cell carries its number.** 366 rank values, `1` (most common) to `366` (least), set inside
the squares. The colour is a redundant encoding of the same rank — it gives the reader the shape at a
glance and the exact ordering on inspection. This is the opposite trade to the ONS chart, which
prints nothing in the cells and pays for it with a legend; ABC prints the value in every cell and
carries **no colour legend at all**, because the value is already there to read.

**One cell is a different hue, and it is the argument.** Rank `1` — 17 September — is `#FFCC01`, a
gold that appears nowhere else on the plate and is not a step of the blue ramp. One accent, spent
once, on the fact the headline is about. The blues run pale-to-dark with rank; the gold is outside
the scale and therefore reads as "this one", not "more of this".

**The impossible dates are blank.** Row 30 has no February cell; row 31 has no Feb, Apr, Jun, Sep or
Nov cell. Same answer as the ONS's, reached by leaving the slot empty rather than by painting it
white — visually identical on a white page, and the grid stays rectangular either way.

**The title asks the reader's own question** (`How common is your birthday?`) and the standfirst
tells them how to read the encoding in one sentence: `The numbers in the squares rank birthdays from
most common (1) to least common (366).` The convention is printed, not assumed.

**One source line, bottom left**: `Source: ABS 2017`.

## What it does with style

Pixel route on the graphic: ground `#FFFFFF` at **28.5 %** — again, a full calendar grid leaves the
page only its margins. The palette is a single-hue blue ramp, and the record's chromatic entries are
its steps with their coverage: `#B1D6EC` 5.33 %, `#95C5E1` 5.14 %, `#7DB3D7` 5.01 %, `#6BA1CA`
5.17 %, `#5B8FBC` 5.31 %, `#4B7DAC` 5.23 %, `#396C9D` 5.81 %, `#00417F` 5.68 %. Eight steps, each
taking about a twelfth of the picture — a ramp binned into roughly equal-count classes rather than
equal-value ones, which is why no step dominates. The palest step, `#CCE7F8` at 5.27 %, is filed
under `neutral` rather than `chromatic` because its chroma is too low to count as colour; that is the
measurement telling you the bottom of this ramp is not really a colour any more.

The pixel route classified the plate `shape: "sequential"`, `ramped: 1`, one hue cluster at hue 209
covering 45.8 %.

Type: **not readable from this graphic** — it is a raster. What the record's `style.type` holds is
`abcsans` at 12–16 px, which is `abc.net.au`'s page furniture, and the page's ground is `#F9F9F9`.
Neither describes the chart.

**A measured defect, and it is worth carrying.** The cell numerals are white. Against the darkest
steps that is fine — white on `#00417F` is **10.18 : 1**. Against the pale end it is not: white on
`#7DB3D7` is **2.26 : 1**, on `#95C5E1` **1.85**, on `#B1D6EC` **1.53**, on `#CCE7F8` **1.28**. More
than half the numbers on this plate are below the WCAG floor for text of any size, and the numbers
are the reading the chart exists for. The gold accent has the same problem in reverse: white on
`#FFCC01` is **1.51 : 1**.

## What is transferable

- **Print the value in the cell and drop the legend.** For a grid whose values are ranks or small
  integers, the number in the square is a better key than a strip of swatches — but only if the text
  contrast is solved, which here it is not.
- **One cell in a hue outside the ramp names the extreme.** The accent is not a step of the scale, so
  it cannot be misread as a value.
- **Print the reading convention in the standfirst**, in one sentence, in the reader's words.
- **Bin the ramp so the classes are roughly equal in count**, so no single step swamps the picture.
- **The counter-lesson, taken from this plate's own numbers**: text laid over a sequential ramp needs
  its colour to switch with the ramp — dark type on the pale half, light type on the dark half. A
  single fixed ink cannot serve both ends of a ramp that spans 1.28 : 1 to 10.18 : 1.

## What is this publication's own

`abcsans` (the page, not the chart), the ABS data, and the gold `#FFCC01`, which is close to ABC's
own house yellow.

## What was not verified

- The typeface inside the graphic. It is a raster; nothing in this record can name it, and no claim
  here does.
- Whether the article carries other figures. Only the largest graphic above the page's chrome was
  measured.
- Whether the blue steps are eight discrete classes or a continuous scale quantised by the renderer.
  The roughly equal shares are consistent with binning, and are not proof of it.
- The exact contrast of the *dark* numerals — there appear to be none; every numeral read as white,
  but this was judged by eye at 2× on one crop, not sampled across the plate.
- Any interactive or mobile version of the same chart.
