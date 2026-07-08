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
