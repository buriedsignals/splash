// Pure label-layout core for the proportional symbol map — no MapTiler, no React.
// Direct labeling (FT/NYT practice): each symbol carries its name + value so the data
// is legible WITHOUT hover. The component does the screen-space placement using these
// hints; this module decides the text and the inside-vs-beside choice deterministically.
import type { PlacedSymbol } from "./symbol-geo";
import { localizeDecimal, type Lang } from "./core/locale";

export interface SymbolLabel {
  lon: number;
  lat: number;
  name: string; // city label, "" when the symbol has none
  valueText: string; // formatted value, no unit (the unit lives in the legend)
  radius: number; // the symbol radius, for the component's offset math
}

// Compact numeric format for a direct label: integers below 1000, else k / M with a
// trimmed trailing ".0". The unit is NOT included (it belongs in the legend/description).
export function formatLabelValue(value: number, lang?: Lang): string {
  const abs = Math.abs(value);
  let s: string;
  if (abs >= 1_000_000) s = trimDot((value / 1_000_000).toFixed(1)) + "M";
  else if (abs >= 1_000) s = trimDot((value / 1_000).toFixed(1)) + "k";
  else s = String(Math.round(value));
  return localizeDecimal(s, lang); // FR: "1.2M" → "1,2M"
}

function trimDot(s: string): string {
  return s.endsWith(".0") ? s.slice(0, -2) : s;
}

// One label per symbol, in the input order (symbols arrive sorted value-descending).
export function symbolLabels(
  symbols: PlacedSymbol[],
  lang?: Lang,
): SymbolLabel[] {
  return symbols.map((s) => ({
    lon: s.lon,
    lat: s.lat,
    name: s.label ?? "",
    valueText: formatLabelValue(s.value, lang),
    radius: s.radius,
  }));
}

// Static-fallback-labels signal. An interactive symbol build serves TWO surfaces from one
// artifact: the LIVE interactive page (hover-only, no baked labels — tooltip XOR labels) and
// its no-JS STATIC a11y fallback (no hover → must carry direct labels). They differ only by
// this URL query flag: the snapshot that captures the static fallback appends `?staticLabels=1`;
// a real reader loading interactive.html never does, so the live page stays hover-only.
export function wantsStaticFallbackLabels(search: string): boolean {
  return new URLSearchParams(search).has("staticLabels");
}

// Radial offset (in ems) that places a label just OUTSIDE a circle of `radius` px,
// for MapLibre `text-radial-offset` (which is in ems). `text-radial-offset` needs a
// distance from the point centre; the circle edge is `radius` px out, plus a small
// `gap` of clearance, divided by the label's `textSize` to convert px → ems.
export function labelRadialOffset(
  radius: number,
  textSize: number,
  gap = 6,
): number {
  return (radius + gap) / textSize;
}

// ─── Edge-aware label placement ──────────────────────────────────────────────
// INVARIANT (engraved here so EVERY symbol map inherits it): a symbol's direct
// label never renders outside the map viewport. MapLibre's `text-variable-anchor`
// only re-anchors on label↔label collision — it is BLIND to the viewport edge — so a
// symbol near the right edge keeps its default RIGHT placement and its text runs off
// the canvas (reported: "Indonésie" clipped to "Indonés"). This mirrors the chart
// tooltip in-viewport clamp (core/tooltip-clamp.ts): compute the placement in screen
// space and flip/clamp it inward. Pure + framework-free so the invariant is
// unit-testable without a browser.

// MapLibre `text-anchor` value: which side of the TEXT touches the point, i.e. the
// text extends to the OPPOSITE side. "left" → text to the RIGHT of the point (the
// FT/NYT direct-label default); "right" → text to the LEFT; "bottom" → text ABOVE;
// "top" → text BELOW.
export type LabelAnchor = "left" | "right" | "top" | "bottom";

export interface LabelBox {
  left: number;
  right: number;
  top: number;
  bottom: number;
}

export interface PlaceLabelInput {
  cx: number; // symbol centre x (screen px)
  cy: number; // symbol centre y (screen px)
  offset: number; // radial gap centre → near text edge (px) = radius + clearance
  width: number; // rendered label box width (px)
  height: number; // rendered label box height (px)
  viewport: { width: number; height: number };
  margin?: number; // keep-in gutter (px), default 4
}

export interface PlacedLabel {
  anchor: LabelAnchor;
  box: LabelBox;
}

// Estimate the rendered pixel box of a direct label. Open Sans Semibold at `textSize`
// px averages ~0.6·textSize per glyph; we bias slightly HIGH (never under-estimate — an
// under-estimate would fail to flip and re-clip the edge label) and cap the line width at
// MapLibre's `text-max-width` (8 ems, the same value the layer uses). Height counts the
// lines at the layer's 1.3 line-height. Pure so the placement geometry stays testable.
export function estimateLabelBox(
  labelText: string,
  textSize: number,
): { width: number; height: number } {
  const CHAR_RATIO = 0.62; // generous avg glyph width (bias high → flip early, never late)
  const HALO = 4; // white halo padding, both sides
  const MAX_EM = 8; // MapLibre text-max-width
  const LINE_HEIGHT = 1.3; // matches the symbol-labels layer
  const lines = labelText.split("\n");
  const longest = lines.reduce((m, l) => Math.max(m, l.length), 0);
  const width = Math.min(longest * CHAR_RATIO, MAX_EM) * textSize + HALO;
  const height = lines.length * textSize * LINE_HEIGHT + HALO;
  return { width, height };
}

// The label box for a given anchor, in screen px. `offset` is the radial gap from the
// point centre to the near edge of the text; left/right placements sit vertically centred
// on the point, top/bottom placements sit horizontally centred.
function boxForAnchor(anchor: LabelAnchor, i: PlaceLabelInput): LabelBox {
  const { cx, cy, offset, width: w, height: h } = i;
  switch (anchor) {
    case "left": // text to the RIGHT of the point
      return {
        left: cx + offset,
        right: cx + offset + w,
        top: cy - h / 2,
        bottom: cy + h / 2,
      };
    case "right": // text to the LEFT of the point
      return {
        left: cx - offset - w,
        right: cx - offset,
        top: cy - h / 2,
        bottom: cy + h / 2,
      };
    case "bottom": // text ABOVE the point
      return {
        left: cx - w / 2,
        right: cx + w / 2,
        top: cy - offset - h,
        bottom: cy - offset,
      };
    case "top": // text BELOW the point
      return {
        left: cx - w / 2,
        right: cx + w / 2,
        top: cy + offset,
        bottom: cy + offset + h,
      };
  }
}

// Choose the anchor whose label box stays fully inside the viewport, preferring the
// FT/NYT direct-label default (RIGHT of the point) and only deviating when the default
// would clip: flip to the LEFT, then try ABOVE/BELOW. When a label is genuinely larger
// than the room on every side (a viewport-spanning label), fall back to the anchor with
// the LEAST total overflow so the choice is still deterministic and as-inside as possible
// — "clamp as a last resort". Preserving the default for every non-edge symbol keeps the
// existing layout (and its label↔label collision behaviour) unchanged.
export function placeSymbolLabel(input: PlaceLabelInput): PlacedLabel {
  const margin = input.margin ?? 4;
  const { width: W, height: H } = input.viewport;
  const order: LabelAnchor[] = ["left", "right", "bottom", "top"];

  const fits = (b: LabelBox): boolean =>
    b.left >= margin &&
    b.right <= W - margin &&
    b.top >= margin &&
    b.bottom <= H - margin;

  for (const anchor of order) {
    const box = boxForAnchor(anchor, input);
    if (fits(box)) return { anchor, box };
  }

  // Last resort: least-overflowing anchor (deterministic; keeps an oversized label as
  // inside as the four placements allow).
  const overflow = (b: LabelBox): number =>
    Math.max(0, margin - b.left) +
    Math.max(0, b.right - (W - margin)) +
    Math.max(0, margin - b.top) +
    Math.max(0, b.bottom - (H - margin));
  let best: LabelAnchor = "left";
  let bestOverflow = Infinity;
  for (const anchor of order) {
    const o = overflow(boxForAnchor(anchor, input));
    if (o < bestOverflow) {
      bestOverflow = o;
      best = anchor;
    }
  }
  return { anchor: best, box: boxForAnchor(best, input) };
}
