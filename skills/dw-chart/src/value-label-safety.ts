import type { ChartType } from "./chart-spec";
import { contrastRatio, WHITE, INK, MIN_CONTRAST } from "./contrast";

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
//  • Horizontal BAR family (d3-bars*): direct value labels are ON by default (FT/
//    data-to-viz best-practice #3 — label the magnitude on the mark, don't make the
//    reader estimate off the gridlines; matches chart-native's labelled bars).
//    Datawrapper draws the label at the bar END (inside long bars, outside short ones)
//    with a crude luminance-threshold white/black auto-pick it offers NO placement or
//    colour override for (verified live — the only value-label keys are show-value-labels
//    / value-label-format / value-label-alignment / value-label-visibility). On darker
//    Okabe-Ito subject hues that auto-pick is WHITE below AA (white on #009E73 = 3.42:1,
//    on #D55E00 = 3.87:1). Since the inside label can't be recoloured, we ALSO keep the
//    value axis on (force-grid) as the contrast-clean redundant reading path — the direct
//    label reads for everyone else, the black-ink axis carries the value when the inside
//    label is marginal. checkValueLabelContrast records that marginal case as a render-
//    review concern (the axis fallback is present), never a hard failure that would strip
//    the direct labels. A cluttered chart can opt the direct labels out (valueLabels:false)
//    and fall back to the axis alone.

// Newer d3-column engine: value labels live in a `valueLabels` object.
export const COLUMN_TYPES = new Set<ChartType>([
  "column-chart",
  "grouped-column-chart",
  "multiple-columns",
]);

// d3-bars engine: direct value labels via `show-value-labels` (ON by default), the axis
// via `force-grid`. Stacked bars are EXCLUDED — their per-segment inside labels are a
// distinct concern (each segment is a different fill, so the auto white/black pick and the
// "which value goes where" question are per-segment; the single value axis can't recover a
// stacked breakdown), left at Datawrapper's default for now.
export const HORIZONTAL_BAR_TYPES = new Set<ChartType>([
  "d3-bars",
  "d3-bars-grouped",
  "d3-bars-split",
]);

// True when a chart type carries value labels we route through the safe path.
export function hasValueLabelControl(type: ChartType): boolean {
  return COLUMN_TYPES.has(type) || HORIZONTAL_BAR_TYPES.has(type);
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

  if (COLUMN_TYPES.has(type)) {
    // Datawrapper's column value labels default to `show:"hover"` → they print
    // NOTHING on the static PNG (the reader can only read the y-axis). Force them
    // visible AND outside the column, where they render in dark ink on the white
    // canvas (always ≥4.5:1) instead of white-on-colour inside the bar.
    visualize["valueLabels"] = {
      enabled: show,
      placement: "outside",
      show: show ? "always" : "hover",
      format: numberFormat ?? null,
    };
    return;
  }

  if (HORIZONTAL_BAR_TYPES.has(type)) {
    // DIRECT VALUE LABELS ON by default (FT/data-to-viz best-practice #3: label the
    // magnitude ON the mark — don't leave the reader estimating off the gridlines). This
    // matches chart-native's labelled bars. Datawrapper draws the label at the bar END:
    // INSIDE long bars, OUTSIDE short ones — auto-picking dark-on-light / white-on-dark by
    // a crude luminance threshold (VERIFIED live: grey/amber bars → dark labels, green/blue
    // bars → white labels), and it exposes NO placement or colour override (the only
    // value-label keys in the d3-bars schema are show-value-labels / value-label-format /
    // value-label-alignment / value-label-visibility — none control inside/outside or
    // colour). On a few mid-tone subject hues (green #009E73 → white 3.42:1, vermilion
    // #D55E00 → white 3.87:1) that auto-pick is white below WCAG AA — so we ALSO keep the
    // value axis on (force-grid) as the contrast-clean redundant reading path for exactly
    // that case: the direct label reads for everyone else, the axis carries the value in
    // black ink (17.8:1) when the inside label is marginal. checkValueLabelContrast records
    // the marginal inside label as a render-review CONCERN (not a hard failure) precisely
    // because this axis fallback is present. `value-label-format` is set by specToMetadata
    // from spec.numberFormat (and localizes via the chart language — verified: fr → "10 600").
    visualize["show-value-labels"] = show; // default ON; valueLabels:false opts out
    // The value axis is ALWAYS kept for a bar family (a value chart must carry a value
    // scale): the accessible fallback when labels are on, the sole reading path when the
    // journalist opts the direct labels out (valueLabels:false) for a cluttered chart.
    visualize["force-grid"] = true;
  }
}

// DATAWRAPPER'S INSIDE VALUE-LABEL COLOUR AUTO-PICK (verified live across the full
// Okabe-Ito palette — see the probes recorded in SKILL.md). DW chooses WHITE label text on
// darker fills and DARK ink on lighter ones by a PERCEIVED-BRIGHTNESS (YIQ) threshold — NOT
// WCAG relative luminance. The proof is sky #56B4E9 vs amber #E69F00: near-identical WCAG
// relative luminance (0.405 vs 0.416), yet DW renders WHITE on sky and DARK on amber — their
// YIQ brightness (158 vs 162) straddles the boundary. Modelling the ACTUAL metric is what
// lets checkValueLabelContrast flag only the genuinely marginal white-on-mid-tone labels
// (green 3.42:1, vermilion 3.87:1, pink 3.06:1, sky 2.31:1) WITHOUT false-flagging the light
// fills DW renders in safe dark ink (amber 7.9:1, grey 10:1, yellow 13:1). DW exposes no
// override for either the colour or the placement.
export const DW_WHITE_LABEL_YIQ_THRESHOLD = 160;

function yiqBrightness(hex: string): number {
  const m = /^#([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return 255; // unparseable → treat as light (safe dark ink) — never false-flag
  const n = parseInt(m[1], 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return (r * 299 + g * 587 + b * 114) / 1000;
}

// True when Datawrapper renders the INSIDE value label WHITE on a mark of this fill (dark
// fill); false when it renders DARK ink (light fill). Exported for tests.
export function dwInsideLabelIsWhite(fill: string): boolean {
  return yiqBrightness(fill) < DW_WHITE_LABEL_YIQ_THRESHOLD;
}

export interface ValueLabelViolation {
  type: string;
  color: string;
  ratio: number;
  message: string;
  // F2 — set when `color` is a journalist-chosen brand colour (policy b): the label
  // is KEPT and this is a recorded render-review concern, not a hard failure.
  concern?: boolean;
}

// GUARD (contrast discipline, in the spirit of chart-native's snap-contrast): fail
// loud if the emitted metadata would ship a value label the reader cannot read —
// i.e. a white label placed INSIDE a coloured bar/column below 4.5:1. The safe
// paths above never trip it; it exists so a future edit that re-enables inside
// labels on a coloured mark is caught before publish instead of shipping silently.
export function checkValueLabelContrast(
  patch: {
    type: string;
    metadata: { visualize: Record<string, unknown> };
  },
  // F2 — the house colours the journalist set via the brand profile (policy b). A
  // failing label in one of these is flagged `concern:true` (kept, recorded) instead
  // of a hard violation. Absent/empty → every failure is hard, as before.
  opts: { brandColors?: readonly string[] } = {},
): ValueLabelViolation[] {
  const vis = patch.metadata.visualize;
  const out: ValueLabelViolation[] = [];
  const brand = new Set((opts.brandColors ?? []).map((c) => c.toUpperCase()));

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
  // The value AXIS (force-grid) is the contrast-clean fallback the mapper keeps on for the
  // bar family. When it is present, a sub-AA white inside label — which Datawrapper draws
  // with NO colour/placement override — is a recorded render-review CONCERN, not a hard
  // failure (the axis carries the value in black ink). Without it, the inside label is the
  // only reading path, so an unreadable one stays a HARD violation.
  const barAxisFallback = insideBarLabel && vis["force-grid"] === true;

  // A column value label is unsafe only when placed INSIDE (outside = dark on white).
  const vl = vis["valueLabels"] as
    { enabled?: boolean; placement?: string } | undefined;
  // Absent placement is treated as UNSAFE (Datawrapper defaults column labels inside),
  // mirroring the bar path's defensive default — so a re-enabled label with no explicit
  // `placement:"outside"` cannot slip past the guard.
  const insideColumnLabel =
    isColumn && !!vl && vl.enabled !== false && vl.placement !== "outside";

  if (!insideBarLabel && !insideColumnLabel) return out;

  for (const fill of fills) {
    // The contrast of the label colour DW ACTUALLY renders inside a mark of this fill:
    // white on dark fills, dark ink on light ones (its YIQ auto-pick, above). Checking the
    // real rendered colour — instead of an always-white assumption — is what stops the guard
    // false-flagging light fills (grey/amber/yellow) where DW's dark ink clears AA easily.
    const isWhite = dwInsideLabelIsWhite(fill);
    const ratio = isWhite
      ? contrastRatio(WHITE, fill)
      : contrastRatio(INK, fill);
    if (ratio < MIN_CONTRAST) {
      const isBrand = brand.has(fill.toUpperCase());
      // A failure is a recorded CONCERN (kept, not thrown) when either the colour is a
      // journalist-chosen brand hue (policy b) OR it is a horizontal-bar inside label with
      // the value axis kept on as the accessible fallback. Everything else is hard.
      const isConcern = isBrand || barAxisFallback;
      out.push({
        type: patch.type,
        color: fill,
        ratio,
        ...(isConcern ? { concern: true } : {}),
        message: isBrand
          ? `${patch.type}: a value label inside the ${fill} brand mark is ` +
            `${ratio.toFixed(2)}:1 (< ${MIN_CONTRAST}:1, WCAG AA) — kept per the ` +
            `newsroom's house style (render-review concern).`
          : barAxisFallback
            ? `${patch.type}: Datawrapper auto-draws a white value label inside the ${fill} ` +
              `bar at ${ratio.toFixed(2)}:1 (< ${MIN_CONTRAST}:1, WCAG AA) and offers no ` +
              `colour/placement override — kept because the value axis (force-grid) carries ` +
              `the value in black ink as the accessible fallback (render-review concern).`
            : `${patch.type}: a white value label inside a ${fill} mark is ` +
              `${ratio.toFixed(2)}:1 (< ${MIN_CONTRAST}:1, WCAG AA). ` +
              (isHorizontalBar
                ? "Keep the value axis on (visualize['force-grid']=true) as the accessible fallback."
                : "Set visualize.valueLabels.placement='outside' so the label sits in dark ink."),
      });
    }
  }
  return out;
}
