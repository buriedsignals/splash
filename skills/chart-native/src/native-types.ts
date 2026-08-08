// The canonical native-chart-type registry: the SINGLE source of truth for which
// types the engine ships, replacing the un-exported literals previously duplicated
// in scripts/produce.mjs (PREFIX) and src/mount.tsx (the two component registries).
// `id` is the RENDER KEY (what produce.mjs looks up, what a NativeSpec.nativeType
// carries) — not a display name. `shape` documents the CSV shape a mapper expects;
// `family` = A (article-realistic, tidy-CSV) vs B (structural/specialist, deferred).
// `deferred` (a reason) marks a type NOT expected to be reachable+guarded yet; its
// absence means the type must satisfy the full contract (see tests/completeness.test.ts).

export type NativeShape =
  | "single"
  | "wide"
  | "paired"
  | "distribution"
  | "structural"
  // `flow` — a LINK LIST: one row per link, `source,target,value` (four languages;
  // src/flow-links.ts holds the contract and every refusal). The shape the whole flow
  // family reads: sankey, chord and arc are three marks over one table. It is its own
  // shape rather than `structural` because it is the one structural table a newsroom
  // actually exports, and `structural` means "no CSV reaches this" (shape-validation.ts).
  | "flow";

export interface NativeTypeEntry {
  id: string;
  family: "A" | "B";
  shape: NativeShape;
  /** reason a type is not yet expected mapped; absent ⇔ must meet the full contract */
  deferred?: string;
}

// The four types reachable today whose KB ref + native-family entry are a tracked
// backfill (Plan 2), NOT a silent gap. They ARE reachable and conformance-guarded
// (the hard invariant still applies to them); they are only exempt from the
// KB + family predicates of the full contract. This list must SHRINK, never grow.
export const LEGACY_KB_FAMILY_BACKFILL: readonly string[] = [
  "line",
  "bar",
  "scatter",
  "pie",
];

export const NATIVE_TYPES: readonly NativeTypeEntry[] = [
  // --- reachable today (Plan 1 keeps/loads them into the MAPPERS table) ---
  { id: "line", family: "A", shape: "single" },
  { id: "bar", family: "A", shape: "single" },
  { id: "scatter", family: "A", shape: "paired" },
  { id: "pie", family: "A", shape: "single" },
  // --- the Plan 1 witness (flipped to mapped in Task 10) ---
  { id: "grouped", family: "A", shape: "wide" },
  // --- Native Batch 2 wide (flipped to mapped) ---
  { id: "stacked", family: "A", shape: "wide" },
  { id: "stacked-area", family: "A", shape: "wide" },
  { id: "slope", family: "A", shape: "wide" },
  // --- Family A, deferred until their shape batch ---
  { id: "dumbbell", family: "A", shape: "paired" },
  { id: "histogram", family: "A", shape: "distribution" },
  { id: "diverging", family: "A", shape: "single" },
  { id: "waterfall", family: "A", shape: "single" },
  { id: "lollipop", family: "A", shape: "single" },
  { id: "pyramid", family: "A", shape: "wide" },
  { id: "bullet", family: "A", shape: "single" },
  { id: "connected-scatter", family: "A", shape: "paired" },
  { id: "boxplot", family: "A", shape: "distribution" },
  { id: "bump", family: "A", shape: "wide" },
  { id: "beeswarm", family: "A", shape: "distribution" },
  { id: "treemap", family: "A", shape: "single" },
  { id: "diverging-stacked", family: "A", shape: "wide" },
  { id: "waffle", family: "A", shape: "single" },
  { id: "fan", family: "A", shape: "wide" },
  { id: "dot-strip", family: "A", shape: "single" },
  { id: "violin", family: "A", shape: "distribution" },
  { id: "radial-bar", family: "A", shape: "single" },
  // heatmap — the FIRST type where COLOUR is the quantitative channel (continuous
  // value→colour). A wide matrix CSV: first column = the row dimension, every
  // following numeric column = the column dimension; each cell's value paints a
  // sequential CVD-safe ramp (heatmap-geometry.ts). Reachable via the wide shape
  // (a grid needs ≥2 columns) — QA Wave 7 er-wait proved a small newsroom does
  // supply day×hour matrices, so it is article-realistic (family A), not deferred.
  { id: "heatmap", family: "A", shape: "wide" },
  // pictogram / isotype — the same category,value CSV a bar takes, drawn as a COUNT of
  // equal icons so the reader verifies by counting instead of by trusting a length. It
  // sat in family B as "a stylistic variant of waffle" until a real newsroom asked for it
  // by name and met a refusal (docs/splash/defect-2026-08-07-…md). It is not a waffle
  // variant: a waffle divides ONE whole into shares, a pictogram compares SEVERAL
  // independent magnitudes — and it is family A, because a two-column count is the most
  // article-realistic CSV there is. What it needs beyond the CSV — what one icon is worth
  // — the mapper derives (chooseUnitPerIcon), and the produce guard refuses a count no
  // reader could count.
  { id: "pictogram", family: "A", shape: "single" },
  // --- Family B, deferred by design (structural/specialist data an article rarely yields) ---
  {
    id: "marimekko",
    family: "B",
    shape: "structural",
    deferred: "family-B: 2D width×height encoding",
  },
  {
    id: "radar",
    family: "B",
    shape: "wide",
    deferred: "family-B: rare in a small newsroom",
  },
  // --- THE FLOW FAMILY: three marks over ONE table (shape `flow`, a source,target,value
  // link list). They were deferred together, for one reason — "needs nodes+links", a data
  // shape the rest of the engine does not have — and they are reachable together, because
  // that reason was one decision, not three: the link list IS the newsroom-realistic form
  // (a register export, a customs table, a budget line per movement), and the nodes, the
  // stage layering, the chord matrix and the baseline order are all DERIVED from it in
  // flow-links.ts. What each one refuses is its own (see the KB sheets): a sankey cannot
  // draw a cycle, a chord is not a staged pipeline, an arc is a network on a line.
  { id: "sankey", family: "B", shape: "flow" },
  {
    id: "streamgraph",
    family: "B",
    shape: "wide",
    deferred: "family-B: rare in a small newsroom",
  },
  {
    id: "gantt",
    family: "B",
    shape: "structural",
    deferred: "family-B: needs start/end intervals",
  },
  {
    id: "calendar",
    family: "B",
    shape: "structural",
    deferred: "family-B: needs a dense date grid",
  },
  {
    id: "lorenz",
    family: "B",
    shape: "distribution",
    deferred: "family-B: specialist inequality curve",
  },
  {
    id: "candlestick",
    family: "B",
    shape: "structural",
    deferred: "family-B: needs OHLC",
  },
  { id: "chord", family: "B", shape: "flow" },
  {
    id: "sunburst",
    family: "B",
    shape: "structural",
    deferred: "family-B: needs a hierarchy",
  },
  {
    id: "parallel",
    family: "B",
    shape: "wide",
    deferred: "family-B: rare in a small newsroom",
  },
  { id: "arc", family: "B", shape: "flow" },
  // Reachable since the per-series encoding choice it was deferred for was MADE rather than
  // guessed: spec-to-config's `combo` mapper resolves the line from an explicit `comboLine`,
  // falls back to the one language-free marker that cannot mean a count (a `%` header), and
  // otherwise refuses at the gate naming both candidates. See knowledge/references/chart/
  // types/combo.md for when a dual axis is honest and when two charts are the better answer.
  { id: "combo", family: "B", shape: "wide" },
];

// type → Remotion composition prefix (XReveal/XSquare/XPortrait). Several keys don't
// PascalCase cleanly (pyramid → PopulationPyramid, grouped → GroupedBar). Consumed by
// scripts/produce.mjs; asserted equal to NATIVE_TYPES ids by tests/native-types.test.ts.
export const REMOTION_PREFIX: Record<string, string> = {
  line: "Line",
  bar: "Bar",
  scatter: "Scatter",
  pie: "Pie",
  stacked: "StackedBar",
  slope: "Slope",
  grouped: "GroupedBar",
  dumbbell: "Dumbbell",
  "stacked-area": "StackedArea",
  heatmap: "Heatmap",
  histogram: "Histogram",
  diverging: "DivergingBar",
  waterfall: "Waterfall",
  lollipop: "Lollipop",
  pyramid: "Pyramid",
  bullet: "Bullet",
  "connected-scatter": "ConnectedScatter",
  marimekko: "Marimekko",
  radar: "Radar",
  boxplot: "Boxplot",
  bump: "Bump",
  beeswarm: "Beeswarm",
  treemap: "Treemap",
  "diverging-stacked": "DivergingStacked",
  sankey: "Sankey",
  streamgraph: "Streamgraph",
  gantt: "Gantt",
  fan: "Fan",
  calendar: "Calendar",
  waffle: "Waffle",
  lorenz: "Lorenz",
  candlestick: "Candlestick",
  chord: "Chord",
  sunburst: "Sunburst",
  parallel: "Parallel",
  "dot-strip": "DotStrip",
  violin: "Violin",
  arc: "Arc",
  "radial-bar": "RadialBar",
  combo: "Combo",
  pictogram: "Pictogram",
};
