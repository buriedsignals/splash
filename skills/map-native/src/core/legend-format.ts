// legend-format — fmtBin: decimal-aware bin-boundary label formatting, shared by every
// binned legend (Hex/Cartogram now; Choropleth in a later task). Extracted from the
// identical inline `fmt` in HexGridMap.tsx and CartogramMap.tsx.
//
// Default (no minGap): integers print bare, everything else rounds to 1 decimal — exactly
// the prior inline behaviour, so migrating existing callers is a no-op.
//
// With `minGap` (the smallest gap between adjacent bin boundaries): if that gap is under 1,
// a flat 1-decimal format can round two DISTINCT boundaries to the same printed label (e.g.
// boundaries 0, 0.02, 0.04 with a 1-decimal format all print "0.0"). Derive enough decimal
// places from minGap so adjacent boundaries stay visually distinct, and apply that precision
// uniformly across the whole bin scale (consistent decimal count reads as one system).
//
// `lang` localizes the separators (French "12 000" / "0,02"); English is grouped too
// ("12,000"), matching the tooltip number formatting. Absent → English.
import { labelWithUnit, localizeNumberString, type Lang } from "./locale";
export function fmtBin(
  n: number,
  opts?: { minGap?: number; lang?: Lang },
): string {
  const minGap = opts?.minGap;
  const lang = opts?.lang;
  let ascii: string;
  if (minGap !== undefined && minGap > 0 && minGap < 1) {
    const decimals = clamp(Math.ceil(-Math.log10(minGap)), 1, 4);
    ascii = n.toFixed(decimals);
  } else {
    ascii = Number.isInteger(n) ? n.toFixed(0) : n.toFixed(1);
  }
  // Localize thousands grouping + decimal separator (English groups too — matches the
  // .toLocaleString() the tooltips use; French uses U+202F + comma). Deterministic.
  return localizeNumberString(ascii, lang);
}

function clamp(x: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, x));
}

// fmtBinRange — a binned-legend range label ("16–30") with the value UNIT appended once
// at the end ("16–30%"). Fixes the choropleth legend showing bare numbers ("9.8") when the
// scale carries a unit (the tooltip already appended `valueUnit`, but the legend bins never
// did — a static reader saw "9.8", not "9.8%"). The unit is appended ONCE (range convention)
// and only the suffix — NOT a numeral multiply — so a percentage-point value (29) stays "29%"
// (map-native never multiplies; the value must already be in display units). Pure + unit-tested.
//
// The suffix is composed through `labelWithUnit` (core/locale) — NOT raw string
// concatenation — so a word unit ("CHF") is spaced ("1,316 CHF", never "1,316CHF") and
// French/German get the narrow no-break space (U+202F) before the unit, the same rule
// map-native's direct-label path already applies (fixed a `7magnitude` defect, the
// identical class; a rendered map showed "1,200–1,316CHF" from the old bare
// `${lo}–${hi}${unit}` before this fix).
export function fmtBinRange(
  min: number,
  max: number,
  opts?: { unit?: string; minGap?: number; lang?: Lang },
): string {
  const lo = fmtBin(min, { minGap: opts?.minGap, lang: opts?.lang });
  const hi = fmtBin(max, { minGap: opts?.minGap, lang: opts?.lang });
  return `${lo}–${labelWithUnit(hi, opts?.unit, opts?.lang)}`;
}
