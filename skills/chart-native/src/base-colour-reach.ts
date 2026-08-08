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
  // combo: the two series carry the fixed AXIS-CODED Okabe-Ito pair (column hue == left axis,
  // line hue == right axis). That pairing is the only cue telling a reader which series reads
  // against which scale, so the house hue must never repaint either mark — it tints the
  // furniture and the frame band and stops there.
  "combo",
  // The FLOW family. All three encode with a fixed categorical palette the house hue must not
  // repaint: sankey colours a ribbon by its ORIGIN (six hues, so a ribbon stays traceable
  // across the stages), chord gives each entity on the ring its own hue, and arc gives each
  // node group one — in every case a single house hue would collapse exactly the distinction
  // the palette is carrying. The hue tints the furniture greys and the frame band and stops.
  "sankey",
  "chord",
  "arc",
  // gantt: bars carry the Okabe-Ito WORKSTREAM palette, one hue per group. A house hue over
  // them would collapse the very grouping the colour exists to encode — with one group the
  // question is moot, with two it destroys the chart. Furniture and the frame band only.
  "gantt",
  // candlestick: the two marks carry the fixed DIRECTION pair (up hue / down hue), and that
  // pair plus its legend is the only thing telling a reader which way a period moved. A house
  // hue over the candles would erase the distinction the type exists to draw.
  "candlestick",
];

const SET = new Set(FURNITURE_ONLY_TYPES);

/** True when the hue reaches the marks a reader sees. An UNKNOWN type answers true: the
 *  conservative direction is to keep announcing (the fallback the 16 other types share),
 *  never to silence an announcement for a type nobody listed. */
export function honoursBaseColor(nativeType: string | undefined): boolean {
  return typeof nativeType === "string" ? !SET.has(nativeType) : true;
}
