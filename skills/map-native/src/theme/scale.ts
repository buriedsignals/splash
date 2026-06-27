// Monotonic-luminance sequential ramp (CVD-safe), 5 anchor steps, light→dark blue.
export const BLUES = ["#deebf7", "#9ecae1", "#4292c6", "#2171b5", "#084594"];
// Diverging CVD-safe (orange ↔ blue) around a midpoint.
export const DIVERGING = [
  "#b35806",
  "#f1a340",
  "#f7f7f7",
  "#92c5de",
  "#2166ac",
];
export function rampColor(t: number, ramp: string[]): string {
  const i = Math.max(
    0,
    Math.min(ramp.length - 1, Math.round(t * (ramp.length - 1))),
  );
  return ramp[i];
}
