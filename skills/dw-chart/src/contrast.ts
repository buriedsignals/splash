// WCAG contrast primitives (pure). Mirrors chart-native/src/core/conformance.ts
// so dw-chart applies the SAME "the label carries the value in ink, the mark
// carries the hue" discipline — sourced from shared core.
export {
  relativeLuminance,
  contrastRatio,
  MIN_CONTRAST,
} from "../../../lib/core/contrast";

/** Pure white / near-black used for label text on a light chart canvas. */
export const WHITE = "#ffffff";
export const INK = "#18181b";
