# Ferdio — 100.datavizproject.com #8 (vertical alluvial, stacked to a total)

## What it is

The same two-stage transition as `#42`, turned ninety degrees and **stacked**: the three ribbons run
top-to-bottom from a `2004` bar to a `2022` bar, sit flush against each other with no gutter, and
so the whole shape reads as one widening body — the Scandinavian total — divided into three parts.

**What was actually read**: the piece's own graphic, an `img` 823 × 823 at `documentTop: 172`
(`style.graphic`), photographed as an element and confirmed by eye to be the diagram with no site
chrome in frame. Both routes `ok`.

## What it does with information

Where `#42` separates the ribbons so each can be followed, `#8` fuses them so the **sum** can be
read. That single decision changes what the picture is about, and the labelling follows it:

- each ribbon carries its series name and **its own rate of change** (`SE +15%`, `DK +150%`,
  `NO +60%`), set inside the ribbon;
- the **total's** rate of change, `+77 %`, is set large and low across the whole body, in the
  position where the three ribbons have become one shape;
- the counts are printed **outside** the bars, above the 2004 bar (`13`, `4`, `5`) and below the
  2022 bar (`15`, `10`, `8`);
- the two stages are named in small grey above and below the diagram.

Both readings are stated as numbers — the percentages are printed, not left to the eye — so the
geometry is doing recognition and the type is doing arithmetic. The stacking costs what it always
costs: only the top band has a flat baseline, so the middle and bottom ribbons' thickness is harder
to compare than in `#42`. Ferdio pays that price deliberately in exchange for the total.

The two ends of the flow are capped by a **saturated bar** at full chroma while the ribbon between
them is a tint of the same hue. The ends are where the values are, and they are the only part of
the shape that is measured against a straight edge.

## What it does with style

Measured on `graphic.png` (`record.pixel`, `measuredFrom === "graphic.png"`):

- ground `#FFFFFF` at **82.14 %**;
- the ribbon bodies are **tints**: `#79B0F6` at **8.09 %** (SE) and `#F6988C` at **3.97 %** (DK),
  with the third body reading as the neutral `#5E657C` at **3.83 %** (NO);
- the end caps are the **same hues at full strength**: `#3274D8` at 0.47 %, `#F05440` at 0.23 %,
  and the neutral `#283250` at 0.22 % — a fifth to a twentieth of the area of the body they cap;
- `#578FE2`, `#6F9DE4`, `#69A2EF`, `#F37565`, `#F59D92`, `#C4DCFB` all sit at 0.01–0.03 % and are
  edge antialiasing between body and cap.

So a two-tone system per series — a tint for the area, the full hue for the terminal — costs three
colours and reads as three.

**And the white labels inside the tinted ribbons fail the text floor.** Computed from this record's
own hexes against its own white: `#79B0F6` is **2.25 : 1** and `#F6988C` is **2.15 : 1**, where 4.5
is the floor for body text and 3.0 for large. The saturated end caps would have held white —
`#3274D8` is 4.54 : 1 and `#EE5440` 3.51 : 1 — but the caps are not where the labels are. The
lightening that makes the ribbon read as a soft body is exactly what makes its label unreadable, and
the two decisions were plainly taken separately.

`record.style.type` is again the **Ferdio website**, not the chart: stevie-sans 16/400 uppercase,
Borgia Pro 18/400, stevie-sans 28/700 for the `#8` heading. The graphic is a raster image.

## What is transferable

- **Stack when the total is the story, separate when the ranking is.** `#8` and `#42` draw the same
  three numbers and are about different things. The choice between them is editorial, not
  aesthetic, and it is made by the gutter.
- **A tint for the body, the full hue for the terminal.** The end caps are where the value is read
  off, and giving them the saturated version of the same hue makes them the sharpest thing in the
  picture without adding a colour.
- **Print the rate of change inside the ribbon it belongs to, and the total's rate where the
  ribbons have merged.** Position states which number belongs to which shape.
- **State the derived number.** `+77 %` is not visible in a stacked flow — the reader would have to
  compare two thicknesses — so it is written.

## What was not verified

- **The graphic's own typography.** Raster `img`; the sizes and families of `SE +15%` and `+77 %`
  were seen and **not measured**. `record.style.type` describes the page around the graphic.
- **The label sizes.** The contrast ratios above are computed from the record's own measured hexes,
  which is sound; whether `SE +15%` counts as large text (and so is judged against 3.0 rather than
  4.5) depends on its rendered size, and that could not be measured because the graphic is a raster.
  Both values fail 4.5 either way; only `#79B0F6` at 2.25 and `#F6988C` at 2.15 against the 3.0
  large-text floor is unambiguous.
- **Whether the caps are separate marks or a stroke.** Only their colour and area were measured.
- **Independence.** One of three `100.datavizproject.com` references — one publication.
