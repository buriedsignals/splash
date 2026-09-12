# Ferdio / 100.datavizproject.com — #84, a group of two where one member is itself a stack

- url: https://100.datavizproject.com/data-type/viz84/
- archive: datavizproject
- type: grouped column chart — 2 series (SE, DK+NO) × 2 categories (2004, 2022); the second series
  is a two-part stack
- export: static raster (`img` 823 × 823) served in the page
- readAs: `graphic.png`, picked at `documentTop` 172, photographed at 824 × 823. Both routes `ok`;
  `routes.pixel.measuredFrom === "graphic.png"`. `style.typeSource` is **"the page only — the graphic
  is a raster and carries no type this route can read"**.

## What it is

The same dataset, re-framed as an argument: **Sweden against the other two combined.** Each of the
two year-groups holds two bars — `SE` alone (13, then 15) and `DK + NO` stacked (4 + 5 = 9, then
10 + 8 = 18) — so the chart is about one comparison, made twice.

## What it does with information

**The grouping encodes the editorial claim.** Which entities are placed side by side inside a group
*is* the sentence the chart makes. Putting DK and NO into one bar says "these two are a bloc"; the
data did not say that, the editor did, and the chart is honest about it by labelling that bar
`DK + NO` rather than inventing a name for it.

**A group total is printed above every bar, and the stacked bar's parts are printed inside it.**
`13` and `9` above; `SE 13`, `DK 4`, `NO 5` inside. So the stack does not hide its own sum — the one
real defect of stacking — and no number in the picture has to be added or subtracted by the reader.

**Mixing a stack into a group is legible here for exactly one reason:** every segment is labelled.
Remove those labels and the composite bar reads as a single value with a stripe in it.

**The two groups are separated by a full-height hairline**, not by whitespace alone. With only two
bars per group, whitespace alone is ambiguous — a rule states which two bars belong together
without depending on the reader measuring gaps.

**Category labels are doubled:** the year sits above each group in large grey, and each bar's own
identity (flag + `SE` / `DK + NO`) sits below it. The group is named once at the top, the series
twice at the bottom, and there is still no legend.

## What it does with style

Measured on `graphic.png` (`record.pixel`): ground `#FFFFFF` at **83.404 %**. Chromatic
`#3274D8` at **7.439 %** (216°) and `#EE5440` at **3.756 %** (7°); neutral `#283250` at **3.386 %**
— Norway's near-black navy again — then `#EAEEEF` **0.216 %** and `#7A8092` **0.078 %**. Shape
**diverging**, clusters at 216° (7.686 %, 8 members) and 7° (3.995 %, 14).

The blue's share is the highest of the five Ferdio grouped plates (7.439 %) because Sweden gets a
whole bar to itself in both groups. The three fills are the same three values as in #25 and #84's
siblings; only their proportions move.

## What is transferable

- **The grouping is an editorial claim; make the composite bar say so in its own label** (`DK + NO`),
  not in a footnote.
- **A stack inside a group is readable only if every segment carries its printed value, and the
  group total sits outside the stack.**
- **Separate groups with a hairline when there are only two bars per group.** Whitespace alone does
  not distinguish "two groups of two" from "one group of four".
- **Name the group once above and the series once below** — the vertical split removes the legend
  and the ambiguity together.

## What is this piece's own

The Sweden-versus-the-rest framing, the flag roundels, and Ferdio's house triple.

## What was not verified

The graphic's typography (raster; page-only type source). Whether the hairline is full-height or
stops at the plot — it reads full-height on the plate but the top and bottom terminations are within
a few pixels of the crop. One publication.
