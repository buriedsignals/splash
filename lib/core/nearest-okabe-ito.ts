// The way OUT of a non-CVD-safe house colour. D25's decision is to SHIP the newsroom's own
// hue and SAY it is not colour-blind-safe — and saying it without offering an alternative is
// telling a journalist about a problem you leave them no way to solve.
//
// Perceptual, on purpose: lib/verify/taste.ts:210's colourSeparation is a weighted RGB
// distance built for pairwise ADJACENCY, and RGB distance picks visually wrong "nearest"
// colours across hues. OKLCH already exists here (lib/core/house-ramp.ts), so the distance is
// taken in OKLab coordinates — L, and the (a, b) the chroma/hue pair projects to.
//
// This is a PROPOSAL. Nothing here applies it: a nearest accessible hue is a judgment dressed
// as a calculation (spec §7), and the newsroom's charter outranks it.
import { hexToOklch } from "./house-ramp";

export const OKABE_ITO: readonly string[] = [
  "#0072B2",
  "#E69F00",
  "#009E73",
  "#D55E00",
  "#CC79A7",
  "#56B4E9",
  "#F0E442",
  "#000000",
];

const SET = new Set(OKABE_ITO.map((h) => h.toUpperCase()));

export function isOkabeIto(hex: string): boolean {
  return SET.has(hex.toUpperCase());
}

function lab(hex: string): [number, number, number] {
  const { L, C, h } = hexToOklch(hex);
  // `h` is in RADIANS (house-ramp.ts:73 uses Math.atan2 and :77-78 Math.cos/Math.sin).
  return [L, C * Math.cos(h), C * Math.sin(h)];
}

/** The perceptually closest colour of the frozen set, and how far it is. Distance 0 means the
 *  colour already IS in the set. */
export function nearestOkabeIto(hex: string): {
  hex: string;
  distance: number;
} {
  if (isOkabeIto(hex))
    return {
      hex: OKABE_ITO.find((h) => h.toUpperCase() === hex.toUpperCase())!,
      distance: 0,
    };
  const [L, a, b] = lab(hex);
  let best = OKABE_ITO[0]!;
  let bestD = Infinity;
  for (const cand of OKABE_ITO) {
    const [L2, a2, b2] = lab(cand);
    const d = Math.hypot(L - L2, a - a2, b - b2);
    if (d < bestD) {
      bestD = d;
      best = cand;
    }
  }
  return { hex: best, distance: bestD };
}
