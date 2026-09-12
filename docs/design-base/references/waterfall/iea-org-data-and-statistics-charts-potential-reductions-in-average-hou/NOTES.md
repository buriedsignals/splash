# IEA — Potential reductions in average household electricity prices in the EU, by element, 2025-2030

- url: https://www.iea.org/data-and-statistics/charts/potential-reductions-in-average-household-electricity-prices-in-the-european-union-by-element-compared-with-the-counterfactual-case-2025-2030
- archive: url-list (drawn from the IEA chart library's FORM filter, `?type=waterfall`)
- readAs: the published chart page at 1440×900. `style.graphic` is an `svg` 1162×500 at
  `documentTop: 617`, `nearTheTop: true`; `routes.pixel.measuredFrom: "graphic.png"`.

## What it is

A policy bridge: the 2025 price, the 2030 counterfactual price, then four named levers walking that
counterfactual down to the 2030 price the report argues for. Seven bars, three of them totals.

## What it does with information

**One colour is the level and every other colour is a lever.** The three total bars — 2025, 2030
counterfactual, 2030 — are all `#3E7AD3` (10.30 %, the single largest chromatic reading in the
record). The four steps are four *different* hues (`#68F394` 0.749 %, `#FFB743` 0.633 %,
`#FFF45A` 0.323 %, `#00ADA1` 0.245 %). The steps are not "decreases"; they are named,
individually identifiable causes, and the palette says so.

**The bridge does not start at the first bar.** 2025 → 2030-counterfactual is a jump the chart
deliberately leaves un-bridged: no connector, no step, just two totals side by side. The walk begins
at the second total. The chart is therefore honest that its argument is about the 2030 gap, not
about 2025.

**Every step is a decrease and the chart still gives each its own hue** — which means hue here can
carry no sign information at all. Reading the direction depends entirely on geometry: each block
hangs from the previous level down to the next.

**The count axis starts at zero** (0 → 500 EUR/MWh), so the total bars are true full bars and the
step magnitudes can be compared against them.

## What it does with style

Ground `#FFFFFF` at **85.61 %**; palette read as **categorical**. `#3E7AD3` at 10.30 % is the three
total bars; the levers are `#68F394`, `#FFB743`, `#FFF45A`, `#00ADA1` at under 0.8 % each. Furniture
`#E6E6E6` at 0.83 % (gridlines), `#000000` at 0.245 %.

Type `Graphik` 12/400 for ticks and the axis title (`EUR/MWh (2025, MER)`) and 12/500 for category
labels (`Higher RES share`). Long category labels are **wrapped onto two lines and left horizontal**
rather than rotated — `Faster grid and storage / expansion`, `Nuclear lifetime extension` — which
keeps the plot rectangle undisturbed.

## What is transferable

- **When each step is a named lever rather than a signed delta, give each step its own hue and give
  every total one shared hue.** The reader then learns the palette once: blue is where you are,
  colour is what moves you.
- **Wrap a long category label onto two lines instead of rotating it.** Rotation is the fallback,
  not the first move.
- **Leave a gap un-bridged** when two totals are not connected by the steps the chart is about.

## What was not verified

Which of the two 2030 bars the source considers the baseline (both are labelled `2030`); the chart
distinguishes them by position only, and a reader arriving at the picture alone must infer it. The
values behind the bars (no data labels; tooltip not read). One publication.
