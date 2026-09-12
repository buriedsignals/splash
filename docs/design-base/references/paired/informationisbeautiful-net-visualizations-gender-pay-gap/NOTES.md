# Information is Beautiful — "Gender Pay Gap"

- url: https://informationisbeautiful.net/visualizations/gender-pay-gap/
- archive: informationisbeautiful
- type: dumbbell chart, 81 pairs, grouped by sector
- export: interactive (two controls: `Plot By`, `Sort By`; a US | UK toggle in the title)
- readAs: the live SVG the page draws, at rest, in its default state (`Plot By: Salary`,
  `Sort By: Job Category`, US); the pixel route measured the SVG element itself (`graphic.png`)

## What it is

Eighty-one occupations, each drawn as two dots joined by a rule: the female median salary in dark
plum and the male median in olive, on one shared horizontal salary axis headed
`yearly salary (thousands)` and ticked `$0, 10, 20 … 120`. Rows are grouped into eight named sectors
(`admin & organisation`, `Care & education`, `Creative & media`, `Law & justice`, `Manual Work`,
`Sales & serving others`, `Science, tech & engineering`, `Senior managers & execs`), and the corpus
closes on a bold `All occupations` row.

## What it does with information

**The connector is furniture and the endpoints are the marks.** The rule between the two dots is a
thin neutral grey — the pixel route measures `#B2B2B2` at **1.37 %** of the graphic against the two
poles at **0.23 % each**, so by coverage the connector is the largest non-ground ink on the plate and
by hue it belongs to nothing. It says only "these two are the same job". Compare Ferdio's `#19`,
where the connector is the loudest thing on the row and carries the label; both are coherent, and
they are opposite choices about who owns the space between the pair.

**The aggregate is drawn in the same mark as the parts.** Each sector's own dumbbell sits at the head
of its block in bold, and `All occupations` at the foot. A reader can compare a job to its sector and
its sector to the country without changing encoding, scale or eye.

**The two states are named once, as two dots, above the plot** — `● Female  ● Male` — beside the
controls. No repeated key, no direct labels; with 81 rows there is nowhere to put them.

**The row-label column names itself.** `job / category of job` is set at the same baseline as the
axis ticks, in the same family a step bolder. The label gutter is treated as a variable, not as
margin.

**The comparison is a group difference, not a time difference**, and the picture still answers "how
big is the gap" everywhere at once because both dots share one axis: the reader compares 81 gaps by
their lengths without a single derived number being computed.

## What it does with style

Measured on the SVG itself. Ground `#FFFFFF` at **95.2 %**; the palette reads **diverging, two
clusters** at **323°** (`#6A2A51`, plum) and **65°** (`#C6CC7D`, olive), both ramped, each at
**0.23 %** coverage. Neutral furniture: `#B2B2B2` (1.37 %), `#CCCCCC` (0.77 %), `#EEEEEE` (0.65 %) —
connector, gridlines, group separators, three greys for three jobs.

The style route counts **81 fills of `rgb(198, 204, 125)` and 81 of `rgb(106, 42, 81)`** — the pairs,
exactly.

Type, four families on the page and three in the graphic: **Varela Round 48 / 400, tracking −2.4**
for the title (with `US` set in the plum `rgb(106, 42, 81)` and `UK` in `rgb(204, 204, 204)`);
**Varela Round 14 / 400, tracking −0.7** for the control labels; **Cabin Condensed 13 / 400** for the
81 row labels (72 runs), **14 / 400** for the axis ticks (27 runs), **13 / 700** for the eight sector
headers (9 runs) and **14 / 700** for the column header (4 runs); IBM Plex Sans 18 / 400 for the
page's prose. **Zero italic runs**; 16 tracked runs and 8 case-transformed runs across the whole
page, nearly all of them site chrome. The graphic itself uses no italic, no tracking and no case
transform — its hierarchy is entirely size, weight and one condensed/rounded contrast.

Column measure 1380 px / **197 ch** — that is the graphic's width, not a prose measure.

## What is transferable

- **Draw the connector as neutral furniture, thinner and lighter than either endpoint.** It groups
  the pair without becoming a third mark, which is what lets a hundred pairs sit on one plate.
- **Draw the group total in the same mark as its members, bold-labelled, at the head of the group.**
  One encoding for part and whole means no second chart and no scale change.
- **Head the label gutter.** A column of row names is a variable and can say what it is.
- **Set the two states as two dots above the plot** when there are too many rows to label directly.

## What is this piece's own

Plum and olive; Varela Round and Cabin Condensed; the US/UK toggle built into the display line.

## What was not verified

Whether the salary figures are medians or means, and their year — the page names
`US Bureau of Labor Statistics, UK Office of National Statistics` as sources but the reading here is
of the encoding, not the claim. What the `Plot By` and `Sort By` controls do to the layout: only the
default state was read. Whether the dark plum against `#FFFFFF` clears any contrast floor — not
measured.
