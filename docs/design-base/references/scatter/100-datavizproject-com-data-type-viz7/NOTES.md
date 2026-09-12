# 100 datavizproject — #7, the plain scatter

- url: https://100.datavizproject.com/data-type/viz7/
- archive: datavizproject
- type: scatter — two quantitative axes on one shared scale, three labelled points
- export: static
- readAs: the encoding as the page draws it, at rest

## What it is

The same three countries as everywhere in this archive, on **x = 2022** against **y = 2004**: the
one encoding among the hundred that makes the two dates two axes.

## What it does with information

**Both axes carry the same variable, so the plot is square and both scales run 0–15.** Four
gridlines each way, at 0 / 5 / 10 / 15, ticks labelled on both, no spines and no tick marks.
Equal scales are what makes "above or below the diagonal" mean "grew or shrank" — the diagonal
itself is not drawn here, which is this encoding's one omission.

**The point label is a filled pill in the point's own colour, white text, on a short stem of that
same colour.** `Sweden` in blue, `Norway` in navy, `Denmark` in red, each pill sitting a constant
distance directly above its dot and joined to it by a two-pixel stem. Direct labelling on a
scatter, solved without a leader line and without the label ever touching the mark.

**The axis titles are the variable itself** — `2004` rotated on the y, `2022` under the x — set in
grey, at a size larger than the tick values. When the axis's variable is a bare date, its name is
the date.

**Nothing else is on the plate.** Three points, six tick labels, two axis titles, three pills. No
legend, no title, no caption, no source line.

## What it does with style

The record's `measured.json` pixel read is dominated by the archive's own blue site header
(`#3274DA` at 8.7 % of the page shot); `largestGraphic` found no qualifying element and the route
fell back to the full page screenshot. Re-measured on the chart card alone
(`crop 308,170,824,730` of `screenshot.png`):

- ground **`#FFFFFF` at 96.8 %**, the card sitting on the site's `#F4F7F7`.
- chromatic **`#EE5440` at 0.47 %** (7°) and **`#3274D8` at 0.43 %** (216°).
- the third entity's colour, **`#283250` at 0.43 %**, is classed as a **neutral**, not as palette —
  its chroma is below the route's chromatic floor. So the route reports `diverging, 2 clusters`
  where a reader sees **three entities in three colours**. Worth recording: on a palette that uses a
  near-black as one of its categorical members, the chroma split that correctly separates tinted
  paper from ink (`METHOD.md` / spec §6.2 defect 3) also separates a legitimate mark from the
  palette.

**And the contamination here is not merely dilution.** The site header's `#3274DA` is **the same
hue as the chart's own blue entity** (`#3274D8`, 216° in both). On the uncropped page shot a 216°
cluster cannot be attributed to the chart at all. Every colour figure above is the cropped
re-measurement; nothing is quoted from this record's own `pixel` field.

## What is transferable

- **A filled pill in the mark's colour, on a short stem, at a constant offset** — a direct label for
  a scatter, where the line family's end label has nothing to attach to.
- **Equal scales and a square frame when both axes carry the same variable.**
- **Where the axis's variable is a date, the date is the axis title.**

## What is this piece's own

Ferdio's red/blue/navy triad and its house sans.

## What was not verified

- Whether the piece draws a diagonal anywhere below the captured fold. Nothing in the captured
  region suggests one, and its absence is noted above as an omission rather than measured.
- **One publication.** This and the three other `100.datavizproject.com` records in this family are
  one desk, one designer and one dataset. They corroborate nothing between themselves
  (`METHOD.md`, correction 4).
