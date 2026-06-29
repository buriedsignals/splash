// Pure label-layout core for the proportional symbol map — no MapTiler, no React.
// Direct labeling (FT/NYT practice): each symbol carries its name + value so the data
// is legible WITHOUT hover. The component does the screen-space placement using these
// hints; this module decides the text and the inside-vs-beside choice deterministically.
import type { PlacedSymbol } from "./symbol-geo";

// Minimum radius (px) for the value text to sit legibly INSIDE the circle.
export const LABEL_INSIDE_MIN_RADIUS = 14;

export interface SymbolLabel {
  lon: number;
  lat: number;
  name: string; // city label, "" when the symbol has none
  valueText: string; // formatted value, no unit (the unit lives in the legend)
  placement: "inside" | "beside"; // value INSIDE the circle, or BESIDE a small one
  radius: number; // the symbol radius, for the component's offset math
}

// Compact numeric format for a direct label: integers below 1000, else k / M with a
// trimmed trailing ".0". The unit is NOT included (it belongs in the legend/description).
export function formatLabelValue(value: number): string {
  const abs = Math.abs(value);
  if (abs >= 1_000_000) return trimDot((value / 1_000_000).toFixed(1)) + "M";
  if (abs >= 1_000) return trimDot((value / 1_000).toFixed(1)) + "k";
  return String(Math.round(value));
}

function trimDot(s: string): string {
  return s.endsWith(".0") ? s.slice(0, -2) : s;
}

// One label per symbol, in the input order (symbols arrive sorted value-descending).
export function symbolLabels(symbols: PlacedSymbol[]): SymbolLabel[] {
  return symbols.map((s) => ({
    lon: s.lon,
    lat: s.lat,
    name: s.label ?? "",
    valueText: formatLabelValue(s.value),
    placement: s.radius >= LABEL_INSIDE_MIN_RADIUS ? "inside" : "beside",
    radius: s.radius,
  }));
}
