# 100 datavizproject — #40, a numbered staircase with the start position left behind

- url: https://100.datavizproject.com/data-type/viz40/
- archive: datavizproject
- type: ordinal staircase, ghosted start position, signed change on the connector
- export: static
- readAs: the encoding as the page draws it, read at rest, in the 1440×900 page screenshot.
  The chart is a raster image inside Ferdio's page shell, so the **style route reached the shell,
  not the chart**; its type tuples are Ferdio's site furniture.

## What it is

A staircase whose steps are numbered 1 to 15. Each country's 2022 value is a solid flag standing on
its step; its 2004 value is **the same flag, several steps lower, drawn in a pale tint**; and an arc
springs from the pale mark to the solid one carrying the signed change — `+6`, `+3`, `+2` — set in
that country's own colour above the arc's apex.

The page captions its own encoding directly: "Staircase steps represent the number of World …"
(read from the style route's `Borgia Pro | 18 | 400` run).

## What it does with information

**The start position is not deleted, it is dimmed.** Both states of every entity stay on the canvas
at their true positions, and the earlier one is distinguished by tint rather than by shape, colour
or placement. The reader sees where an entity was, where it is, and — because the ghost is the same
glyph — that the two are the same entity. Consistent with this reading, the pixel route separates a
pale `#FACBC5` at 0.047 % from the saturated `#EE5440` at 0.044 %: two coral marks of comparable
area, one washed out.

**The change is printed, not left to be subtracted.** The arc is labelled with the delta and the
delta carries its sign. A reader who wants "how far did it move" does not count steps.

**The scale's own tick lights up where an entity lands.** The step numbers 1–15 are set in a neutral
grey — except the three that an entity occupies, which are set bold in that entity's colour. The
axis stops being uniform furniture and becomes a readout.

## What it does with style

Ground: the pixel route read the page, `#FFFFFF` at 45.48 % against `#F4F7F7` at 44.72 %; again the
white is the chart card and the grey the page, and no graphic element was isolated. `#3274DA` at
8.54 % is the site's navigation bar, not the graphic.

The staircase itself is drawn as a single thin grey line — no fills, no shading, no gridlines. Every
saturated pixel on the plate belongs to a flag, a delta or an occupied tick.

## What is transferable

- **Ghost the earlier state in the same glyph** rather than dropping it or re-drawing it as a
  different mark.
- **Label the connector with the signed change**, so movement is a number and not an inference.
- **Give the occupied ticks the entity's own colour** and leave the rest neutral, so the scale
  doubles as the value labels.

## What is this piece's own

The staircase metaphor, which spends a large diagonal on what a single axis would carry, and the
national flags as identity marks (already covered by the corpus's `mark-depicts-its-subject`).
Ferdio's palette.

## What was not verified

The graphic's own typography. Whether the pale marks are an opacity of the same fill or a separately
specified tint — the pixel route reports two distinct hexes and cannot tell those apart. The delta
values against the underlying data.
