// Maps an editorial intent family → the DW chart types that legitimately serve it.
// Every type here MUST be in dw-chart's CHART_TYPES (the producer's truth) — enforced by a unit test.
// Source families follow FT Visual Vocabulary (chart-selection.md). No tiers.

export const FAMILY_TYPES: Record<string, string[]> = {
  "change-over-time": [
    "d3-lines",
    "d3-area",
    "column-chart",
    "multiple-lines",
    "multiple-columns",
  ],
  magnitude: [
    "column-chart",
    "d3-bars",
    "grouped-column-chart",
    "d3-bars-grouped",
  ],
  ranking: ["d3-bars", "column-chart", "d3-dot-plot"],
  correlation: ["d3-scatter-plot"],
  distribution: ["column-chart", "d3-dot-plot", "d3-range-plot"],
  "part-to-whole": [
    "d3-pies",
    "d3-donuts",
    "stacked-column-chart",
    "d3-bars-stacked",
    "election-donut-chart",
  ],
  deviation: ["d3-bars", "column-chart"],
};
