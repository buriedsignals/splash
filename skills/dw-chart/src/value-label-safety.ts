import type { ChartType } from "./chart-spec";
import { contrastRatio, WHITE, MIN_CONTRAST } from "./contrast";

// VALUE-LABEL CONTRAST SAFETY.
//
// Datawrapper renders bar/column value labels through two different engines, each
// with its own contrast trap (both verified against the live API — see SKILL.md):
//
//  • Vertical COLUMN family: `valueLabels` defaults to `show:"hover"` → the numbers
//    are INVISIBLE on the static PNG (a reader can only read the y-axis). Setting
//    `placement:"outside", show:"always"` prints them ABOVE the column in dark ink
//    on the white canvas — always ≥4.5:1, and readable on the static export.
//
//  • Horizontal BAR family (d3-bars*): value labels are drawn INSIDE the bar with a
//    crude white/black auto-pick that Datawrapper offers NO override for (no colour
//    field, no outside placement — confirmed by dumping every d3-bars metadata key
//    and by the Academy docs). For darker Okabe-Ito subject hues that auto-pick is
//    WHITE and fails WCAG (white on #009E73 = 3.42:1, on #D55E00 = 3.87:1). Because
//    the inside label cannot be made safe, we turn it OFF and show the numeric value
//    axis instead: the bar keeps its hue, the axis carries the value in black ink.
//
// This is the dw-chart equivalent of chart-native's rule "the label carries the
// value, the mark carries the hue".

// Newer d3-column engine: value labels live in a `valueLabels` object.
export const COLUMN_TYPES = new Set<ChartType>([
  "column-chart",
  "grouped-column-chart",
  "multiple-columns",
]);

// d3-bars engine: value labels are inside-only via `show-value-labels`. Stacked
// bars are excluded — their per-segment inside labels are a distinct concern the
// value axis cannot recover, left at Datawrapper's default for now.
export const HORIZONTAL_BAR_TYPES = new Set<ChartType>([
  "d3-bars",
  "d3-bars-grouped",
  "d3-bars-split",
]);

// True when a chart type carries value labels we route through the safe path.
export function hasValueLabelControl(type: ChartType): boolean {
  return HORIZONTAL_BAR_TYPES.has(type);
}

// Emit the contrast-safe value-label metadata for a bar/column chart, mutating
// `visualize` in place. `wanted` is whether the caller asked for value labels
// (spec.valueLabels; undefined means "yes, by default" for readability).
export function applyValueLabels(
  type: ChartType,
  visualize: Record<string, unknown>,
  wanted: boolean | undefined,
  numberFormat: string | undefined,
): void {
  const show = wanted !== false; // default ON so the numbers are readable

  if (HORIZONTAL_BAR_TYPES.has(type)) {
    // Datawrapper cannot render a contrast-safe INSIDE label on a coloured bar, so
    // never ship one: kill the inside auto-white label and show the value axis
    // (black tick labels + gridlines) whenever the numbers are wanted.
    visualize["show-value-labels"] = false;
    if (show) visualize["force-grid"] = true;
  }
}

export interface ValueLabelViolation {
  type: string;
  color: string;
  ratio: number;
  message: string;
}

// GUARD (contrast discipline, in the spirit of chart-native's snap-contrast): fail
// loud if the emitted metadata would ship a value label the reader cannot read —
// i.e. a white label placed INSIDE a coloured bar/column below 4.5:1. The safe
// paths above never trip it; it exists so a future edit that re-enables inside
// labels on a coloured mark is caught before publish instead of shipping silently.
export function checkValueLabelContrast(patch: {
  type: string;
  metadata: { visualize: Record<string, unknown> };
}): ValueLabelViolation[] {
  const vis = patch.metadata.visualize;
  const out: ValueLabelViolation[] = [];

  // Every fill colour the marks could use (single base colour + any per-series).
  const fills: string[] = [];
  const base = vis["base-color"];
  if (typeof base === "string" && /^#[0-9a-f]{6}$/i.test(base))
    fills.push(base);
  const custom = vis["custom-colors"];
  if (custom && typeof custom === "object")
    for (const v of Object.values(custom as Record<string, unknown>))
      if (typeof v === "string" && /^#[0-9a-f]{6}$/i.test(v)) fills.push(v);
  if (fills.length === 0) return out; // theme default colour — nothing to assert

  const isHorizontalBar = HORIZONTAL_BAR_TYPES.has(patch.type as ChartType);
  const isColumn = COLUMN_TYPES.has(patch.type as ChartType);

  // A horizontal-bar inside label is unsafe unless it has been turned off.
  const insideBarLabel = isHorizontalBar && vis["show-value-labels"] !== false;

  // A column value label is unsafe only when placed INSIDE (outside = dark on white).
  const vl = vis["valueLabels"] as
    { enabled?: boolean; placement?: string } | undefined;
  const insideColumnLabel =
    isColumn &&
    !!vl &&
    vl.enabled !== false &&
    vl.placement !== undefined &&
    vl.placement !== "outside";

  if (!insideBarLabel && !insideColumnLabel) return out;

  for (const fill of fills) {
    const ratio = contrastRatio(WHITE, fill);
    if (ratio < MIN_CONTRAST)
      out.push({
        type: patch.type,
        color: fill,
        ratio,
        message:
          `${patch.type}: a white value label inside a ${fill} mark is ` +
          `${ratio.toFixed(2)}:1 (< ${MIN_CONTRAST}:1, WCAG AA). ` +
          (isHorizontalBar
            ? "Set visualize['show-value-labels']=false and show the value axis (force-grid)."
            : "Set visualize.valueLabels.placement='outside' so the label sits in dark ink."),
      });
  }
  return out;
}
