# Information is Beautiful — "Hollywood Hits & Flops 2023"

- url: https://informationisbeautiful.net/visualizations/hollywood-2023-hits-flops/
- archive: informationisbeautiful
- type: scatter — two quantitative axes, size and colour channels, two verbal threshold lines
- export: web
- readAs: the interactive as the page serves it, in the page screenshot, at rest in its default
  configuration

## What it is

Every 2023 studio release as a triangle: **x = imdb rating**, **y = budget recovered (%)**,
**size = budget ($m)**, **colour = worldwide gross ($m)** on a continuous ramp. No time axis. The
strongest in-family reference in this harvest.

## What it does with information

**Every encoding channel is exposed as its own named control, above the plot.** Four pills sit in a
row: `colour: worldwide gross ($m)`, `x-axis: imdb rating`, `y-axis: budget recovered`,
`size: budget ($m)` — the channel name in bold, the variable it currently carries in regular. The
chart tells the reader what each channel means by making the channel a thing the reader could
change. It is the same bold-name / regular-variable construction Our World in Data uses on its axis
titles, arrived at from the other direction.

**The two thresholds that matter are drawn as rules with verbal, not numeric, chips.** A vertical
dotted rule carries a bordered chip reading `WORTH WATCHING>>>` at its top; a horizontal dotted
rule near the bottom carries `↓FLOP↓` at its left. Both chips are hairline-outlined, sit **on** the
rule they belong to, and say what crossing the line **means** rather than what value it is at. The
numbers are still on the axis for anyone who wants them.

**The colour key is a ramp bar labelled only at its ends** — `low` at the left, `max` at the right,
no intermediate values. It states the ramp's direction and refuses to imply a precision it has not
got.

**The size key is one outlined mark in the chart's own shape** — a triangle, not a circle — beside
the words `budget ($m)`, top right. The key is a specimen of the actual mark.

**The y axis title sits at the top-left of the plot in tracked grey capitals**, unrotated:
`BUDGET RECOVERED`. Its ticks (`0%`, `500%`, `1,000%`, `1,500%`) sit **inside** the plot at the
left, each on its own hairline, small and grey.

**Every mark is directly labelled in the mark's own colour**, at the mark's foot, with no
leader — the same rule the line family filed as `direct-end-label-in-the-series-colour`, here at
several dozen marks on a scatter.

## What it does with style

**The record's `measured.json` palette is contaminated** by the site's promotional gradient banner
(see the sibling *Best in Show* record for the mechanism). Re-measured by the pixel route on a crop
of the plate alone (`crop 0,160,1440,740`):

- ground **`#FFF0F0` at 80.1 %** — a pale pink paper, with `#F2E4E4` at 7.9 % and `#FFFFFF` at
  4.7 % (the control pills).
- chromatic buckets `#320000` 0.57 % (the near-black serif title ink, read as chromatic because it
  is warm), then the mark ramp: `#ED69B0` 0.19 %, `#F36FAB` 0.11 %, `#A3759B` 0.11 %, `#F1B136`
  0.10 %, `#BD73A1` 0.09 %.
- the route calls the palette **`diverging`, 2 clusters** (0° and 210°). **The eye disagrees and
  wins** (`METHOD.md`, correction 3): what the plate shows is a single continuous purple → pink →
  orange **sequential** ramp, labelled `low`→`max`, plus a warm near-black title. The 0° cluster is
  the title ink and the pink end of the ramp counted together. The route's shape classifier has no
  way to know that a ramp's ends are two ends of one thing when the ends are far apart in hue.

The title splits by ink on one line: `Hollywood Hits & Flops 2023` in a heavy near-black serif,
`so far` in grey at the same size.

## What is transferable

- **Expose each encoding channel as a named control** — `x-axis:`, `size:`, `colour:` — so the
  reader learns the mapping from the interface instead of a caption.
- **A threshold line's label can be a verdict** (`WORTH WATCHING`, `FLOP`) rather than a value, with
  the value left on the axis.
- **A ramp legend labelled only `low` / `max`** where the mapping is ordinal but the exact values
  are not the point.
- **A size key drawn in the mark's own shape**, outlined, beside the variable's name.
- **The y axis title as tracked capitals at the plot's top-left, unrotated**, with the ticks inside
  the plot.
- **Split a two-clause title by ink on one line.**

## What is this piece's own

The pink paper, the purple→orange ramp, the triangle as the mark, and the film titles.

## What was not verified

- **Below the fold.** The capture is 1440 × 900 and the plot continues; the x axis's own ticks and
  title, and any source line, were not read. The x variable is known only from its control pill.
- **What the size key's outlined triangle is worth** — it carries a variable name and no value, so
  the size channel is ordinal to the reader.
- Interactive states: the four controls are dropdowns and nothing but the default was read.
- The style route reached only the page's type, not the plate's; no type measurement is quoted from
  it.
