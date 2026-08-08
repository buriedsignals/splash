# Chart selection — intent → chart type

> Source: FT Visual Vocabulary (the canon) — https://github.com/Financial-Times/chart-doctor/tree/main/visual-vocabulary ·
> data-to-viz.com (caveats). Credited.

Pick by **intent first**, then the simplest type that serves it. DW type ids in `code`.

| Intent (FT) | Use | DW type |
|---|---|---|
| Change over time | trend over a continuous period | `d3-lines` (many points; works for ONE or SEVERAL series — data `period, seriesA, seriesB, …`, one column per line) · `column-chart` (few periods, one series) · `d3-area` (totals, use with care) |
| Magnitude | compare sizes | `column-chart` (vertical) · `d3-bars` (long labels / many items). Must start at 0. |
| Ranking | order matters | `d3-bars` sorted · `d3-dot-plot` |
| Correlation | relationship of 2 vars | `d3-scatter-plot` · `d3-scatter-plot` sized = bubble |
| Part-to-whole | components of one whole | `stacked-column-chart` · `d3-pies` (≤5 slices, else bars) |
| Distribution | spread of values | `column-chart` as histogram · `d3-range-plot` |

Caveats (data-to-viz): pie only with few slices and clear differences; area hides component change; never compare angles precisely.

## Multi-series & orientation (avoid the small-multiples trap)

- **Time trend with several series** (e.g. `year, France, Switzerland`): use **`d3-lines`** as-is — one line per value column. Do **NOT** use `multiple-lines` and do **NOT** set `transpose` — those turn a trend into a per-period small-multiples panel where the *series* sit on the x-axis. A spec can be valid (`validateChartSpec` passes) yet still wrong this way; the type/orientation must match the story.
- **`transpose: true` is ONLY for stacked/grouped categorical charts** where the CSV is `xCategory, seriesA, seriesB, …` and you want the x-category (not the series) on the axis (e.g. a stacked `year, Coal, Gas, Renewables`). Never transpose a line/time chart.
- `multiple-lines` / `multiple-columns` / `d3-multiple-*` = deliberate **small multiples** (one panel per series), only when you actually want separate panels — not for a single trend chart.

When in doubt → bars/columns on a common baseline (top of the perception hierarchy).

## Producer — static (Datawrapper) vs native (motion/interactive)

Type choice is independent of the **producer**. Default to `dw-chart` (a static, embeddable Datawrapper
chart). Switch to **`chart-native`** ONLY when the intent explicitly wants **motion** (a video / animated
reveal, mp4 in landscape/square/portrait) OR **rich interactivity** (keyboard focus, per-point tooltips
beyond DW hover). chart-native covers 41 FT-vocabulary types; the article→CSV mapper currently produces
**bar/column, line, scatter, pie** natively — any other type falls back to `dw-chart`. A plain static
chart with no motion/interaction need always stays `dw-chart`.

## Two-point comparisons (a value then vs now)

A claim that compares exactly two values (e.g. "12% in 2019 → 19% in 2024") is a
**slope**, a **dumbbell**, or **paired columns** — never a continuous line (two
points do not make a trend). This is common for prose-extracted figures, where the
article states a before and an after.

## Native chart type catalogue (chart-native) — per-type CSV shapes

> Moved verbatim from `suggest-chart/SKILL.md` (prose-slimming, 2026-07-17). These are the per-type
> spec/CSV shapes for the chart-native mapped families. Consult the entry for the chosen `nativeType`
> when emitting the Stage-2 `NativeSpec`. The mapped families are listed in the chart-native producer
> section of `suggest-chart/SKILL.md`; any type NOT mapped exits `FALLBACK_TO_DW` (route to `dw-chart`).

`grouped` expects a **wide CSV**: the first column is the category, and every following numeric column
is a series (≤3 — beyond that use small multiples). Example: `region,urban,rural` then a row like
`North,2400,1900`.
`stacked` expects a **wide CSV**: the first column is the category/time, and every following numeric
column is a series that stacks bottom→top (≤5 — beyond that group into "Other" or use small
multiples); a composition/part-to-whole story. Example: `year,hydro,wind,solar` then a row like
`2024,130,110,90`.
`stacked-area` expects a **wide CSV** with a **numeric time key** first column (e.g. `year`) and 2–5
numeric series columns that stack bottom→top over that continuous time axis; a composition-over-time
story (the continuous sibling of `stacked`). Example: `year,gas,coal,renewables` then a row like
`2024,45,55,150`.
`histogram` expects **one numeric column of RAW individual observations** (not pre-binned counts); the
engine bins them.
`lollipop` expects **category + one value** (a ranking/magnitude dot-and-stem); `highlight` names the
category to accent.
`connected-scatter` expects the **first column as the ordering/time key, then TWO numeric measure
columns**; rows must be ordered by that key (the path follows row order).
`beeswarm` expects **one numeric value column** (raw observations) + an **optional low-cardinality
grouping column** (≤5 groups → colours) + an optional per-point label column. A SINGLE-HUE swarm (no
grouping column) honours `baseColor` — a housing rent-dispersion swarm is amber, never the default blue;
set `subject` so the produce guard enforces it. Name the outliers that "break away" via `highlights`
(an array, e.g. `["Cologny","Genthod"]`; the single `highlight` also works) — they render larger with a
direct name+value label so they read without a hover.
`dot-strip` expects **category + one value, with MANY rows per category** (raw observations, NOT
pre-aggregated) — shows the spread of individual values within a few groups, one horizontal strip per
category plus a mean marker; a single category with only one observation per row is still valid, but the
type earns its keep when several rows share a category.
`waffle` expects **category + one value, ≤6 categories** (a part-to-whole composition made countable,
one square per unit) — group any tail beyond 6 into "Other"; `unit` must name what one square represents
(e.g. "each square = 1%"), it renders as the subtitle. Not for change over time (use `stacked-area`)
or for more than ~6 slices (use `pie` or `bar`).
`pictogram` expects **category + one value, 2-8 categories** — the same CSV a `bar` takes, drawn as a
COUNT of equal icons so the reader verifies by counting instead of trusting a length. Route it when the
unit is a countable THING (people, beds, medals) and the magnitudes are human-scale. `unitPerIcon` is
OPTIONAL: omit it and the mapper derives a round 1-2-5 value keeping the longest row inside ~12 icons;
state it only when the journalist chose how coarse the count should read. NOT for precise comparison
(the last icon is a clipped fraction — use `bar`), NOT for a wide range of magnitudes (one unit cannot
serve a 12-icon row and a row that rounds to none; the produce guard refuses it by name), and NOT for a
share of one whole (that is `waffle` — a filling container, not several independent rows).
`radial-bar` expects **category + one value**; use it ONLY when the category axis is CYCLICAL (hours
of the day, months of the year, compass points) and the cycle itself is part of the story — keep rows
in **CSV order** (do NOT sort by value; angle encodes the category's cyclical position, unlike every
other single-value type above). For a non-cyclical magnitude/ranking, prefer plain `bar`.
`diverging` expects **category + one signed value that CROSSES zero** (gain↔loss / above↔below a
midpoint). Route it ONLY when values span both negative and positive — otherwise use `bar`.
`waterfall` expects **ordered label + one signed value** (a bridge of increases/decreases); an optional
`total` column (1/true) marks opening/closing running-total bars. Route it for step-by-step build-up to
a final figure.
`dumbbell` expects **category + exactly two numeric columns** (start/end, e.g. `2019`,`2024`); the two
column headers become the series labels. Route it for a two-point comparison per category — never a line
(two points imply no trend).
`slope` expects **category + exactly TWO time-point columns** (e.g. `2019`,`2024`); the two column headers
become the period captions. Route it for a two-point change/comparison per category — NOT for 3+ points
(use `line`). **A slope asserts a MONOTONIC change between its two points** — if the underlying series
reverses in between (a peak or dip the two endpoints hide), the slope misrepresents the trend: keep a
`line`, or disclose the dropped middle to the journalist. `highlight` names the one line that bucks the trend.
`bullet` expects **category + a measure value + a `target`** (a column named `target`, or the last numeric
column). Route it ONLY when there's a target to measure against (a KPI vs its goal). The measure is coloured
by hit (blue) / miss (vermillion); by default it sits on a single neutral track — qualitative range bands
require explicit threshold columns (deferred), never invent them.
`treemap` expects **label + one value, with an OPTIONAL grouping category column** (`label,value` or
`label,value,category`) — a part-to-whole layout where each cell's AREA is proportional to value; when a
grouping column has **≤5 distinct values**, cells are coloured and clustered by group. Past 5 distinct
values, the mapper degrades to a **flat single-hue treemap** (grouping dropped, no legend) rather than
wrapping the 5-colour palette. For a flat ranking with few items, prefer `bar`/`waffle`; for ≤6 shares with
no hierarchy, prefer `pie`.
`boxplot` expects **category + one numeric value column, with MANY raw observations per category**
(not pre-aggregated summary stats — the engine computes the five-number summary itself); shows the
distribution spread (median, IQR, whiskers, outliers) per group. For a single ungrouped distribution,
or to see every individual point, prefer `histogram`/`beeswarm`/`dot-strip` instead.
`violin` expects the **same CSV shape as `boxplot`**: category + one numeric value column, with MANY
raw observations per category (not pre-aggregated). Unlike `boxplot`, it draws a density silhouette (a
KDE) so multimodal/skewed shapes are visible, not just the five-number summary — route it when the
distribution's SHAPE is the story, not only its centre/spread. Needs at least 2 observations per
category (a density is undefined below that). For very few categories or small n, prefer `boxplot`,
`dot-strip`, or `beeswarm` instead.
`diverging-stacked` expects a **wide CSV**: the first column is the item/statement, and every following
numeric column is an ORDERED Likert response (negative → neutral → positive) that sums to ~100% per row
(e.g. `item,stronglyDisagree,disagree,neutral,agree,stronglyAgree`). With an ODD response count, the
middle column straddles the centre (half each side, grey) — a genuine neutral bucket; an EVEN count has
no true middle and splits evenly with no straddle. Do NOT reorder responses — order encodes sign. Route
it for survey/opinion composition per item; for a plain (non-signed) composition use `stacked`.
`pyramid` expects **band + exactly two numeric columns** (e.g. `ageBand,male,female`); the two column
headers become the mirrored side labels, drawn back-to-back from a shared central axis on the SAME
magnitude scale. Route it for a paired age/sex (or any two-group) population breakdown — for a plain
two-point comparison per category (not mirrored/centred), prefer `dumbbell`.
`fan` is NOT a tidy wide CSV — it expects **forecast-style columns with MAGIC names**: a time column
first, then `actual` (the historical series), `central` (the forecast's point estimate), and paired
`lo{n}`/`hi{n}` confidence-band columns for each level (e.g. `year,actual,central,lo80,hi80,lo95,hi95`).
The first column must be a **numeric time axis** (e.g. a year). History rows populate `actual` and leave
`central`/the bands blank; forecast rows are the mirror (blank `actual`, populated `central`+bands).
Levels are derived from whichever `lo{n}`/`hi{n}` pairs are present (**≥2 confidence-band pairs required**,
e.g. `lo80`/`hi80` AND `lo95`/`hi95` — a single pair fails shape-validation). Route it ONLY for a
forecast/projection story where the UNCERTAINTY itself is the point — never invent bands for a plain
point forecast (use `line`).
`bump` expects a **wide CSV**: the first column is the item's label, and every following numeric column
is an ORDERED period holding that item's RANK at that period (1 = top), e.g. `team,2021,2022,2023`. Route
it for a ranking-over-time race where the CROSSINGS are the story (who overtook whom) — for a magnitude/
value trend over time, prefer `line`; for a single before/after comparison, prefer `slope`. `highlight`
names the ONE item to accent (others render as neutral grey context); at most a few highlights keep the
tangle of lines readable. A `highlight` is **effectively required** — without it every line renders the
same colour (all-blue) and the chart is an indistinguishable tangle.
`heatmap` expects a **wide MATRIX CSV**: the first column is the ROW dimension, and every following
numeric column is a value of the COLUMN dimension — a value over TWO categorical/temporal dimensions
where **colour encodes the value** (e.g. `day,06-10,10-14,14-18,18-22` then `Mon,52,38,41,60`). Route it
when the story is a PATTERN over two dimensions — activity by day×hour, intensity over region×year, a
correlation matrix — and the eye should scan the grid for hot/cold clusters. This is the ONE native type
where colour is the quantitative channel: it paints a **sequential CVD-safe ramp** with monotonic
luminance, NOT the Okabe-Ito categorical palette — the ramp IS the encoding; a colourbar legend +
optional in-cell value labels come built in. For a value
over ONE dimension prefer `bar` (length reads more precisely than colour); for too-fine grids, aggregate
the bins first. `unit` names the value the colour encodes (e.g. "median wait (minutes)"). Ships static +
interactive (per-cell hover/focus) + video (a diagonal fade-in reveal).
