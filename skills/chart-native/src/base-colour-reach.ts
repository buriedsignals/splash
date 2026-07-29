// Does this type paint its MARKS with the house hue, or only its furniture?
//
// The answer was written eleven times in spec-to-config.ts, in a comment — "FURNITURE only.
// The house hue tints the greys and the frame band; this type encodes with a fixed
// categorical/role palette, which the hue must never touch." — and was never once
// interrogable. So the announcement was made upstream regardless, and a journalist confirmed
// a magenta waterfall that shipped in increase/decrease/total colours (D26, 5/83).
//
// Correcting AT THE CAUSE means making the fact available WHERE THE COLOUR IS ANNOUNCED, not
// discovering it at the render. Widening a colour check's tolerance, or diffing pixels after
// the fact, both arrive after the journalist has already confirmed.
export const FURNITURE_ONLY_TYPES: readonly string[] = [
  "grouped",
  "stacked",
  "stacked-area",
  "pie",
  "diverging",
  "dumbbell",
  "slope",
  "bullet",
  "diverging-stacked",
  "pyramid",
  "waterfall",
];

const SET = new Set(FURNITURE_ONLY_TYPES);

/** True when the hue reaches the marks a reader sees. An UNKNOWN type answers true: the
 *  conservative direction is to keep announcing (the fallback the 16 other types share),
 *  never to silence an announcement for a type nobody listed. */
export function honoursBaseColor(nativeType: string | undefined): boolean {
  return typeof nativeType === "string" ? !SET.has(nativeType) : true;
}
