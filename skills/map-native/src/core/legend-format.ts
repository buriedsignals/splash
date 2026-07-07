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
export function fmtBin(n: number, opts?: { minGap?: number }): string {
  const minGap = opts?.minGap;
  if (minGap !== undefined && minGap > 0 && minGap < 1) {
    const decimals = clamp(Math.ceil(-Math.log10(minGap)), 1, 4);
    return n.toFixed(decimals);
  }
  return Number.isInteger(n) ? String(n) : n.toFixed(1);
}

function clamp(x: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, x));
}
