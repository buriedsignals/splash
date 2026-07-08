// WCAG contrast primitives (pure). Mirrors chart-native/src/core/conformance.ts
// so dw-chart applies the SAME "the label carries the value in ink, the mark
// carries the hue" discipline — kept local so dw-chart has no cross-skill import.

/** WCAG AA minimum contrast for normal text. */
export const MIN_CONTRAST = 4.5;

/** Pure white / near-black used for label text on a light chart canvas. */
export const WHITE = "#ffffff";
export const INK = "#18181b";

function channel(c: number): number {
  const s = c / 255;
  return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
}

/** WCAG relative luminance of a #rrggbb colour. */
export function relativeLuminance(hex: string): number {
  const m = /^#([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) throw new Error(`not a #rrggbb colour: ${hex}`);
  const n = parseInt(m[1], 16);
  return (
    0.2126 * channel((n >> 16) & 255) +
    0.7152 * channel((n >> 8) & 255) +
    0.0722 * channel(n & 255)
  );
}

/** WCAG contrast ratio between two #rrggbb colours (1..21). */
export function contrastRatio(a: string, b: string): number {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  const hi = Math.max(la, lb);
  const lo = Math.min(la, lb);
  return (hi + 0.05) / (lo + 0.05);
}
