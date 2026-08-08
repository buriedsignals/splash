// Pure geometry core for the PICTOGRAM / isotype chart — framework-free (D3 =
// math). Magnitude is shown by a COUNT of equal icons: each icon stands for a
// fixed unit (e.g. 1 figure = 10,000 people), so the icon count ∝ value — a bar
// made of discrete, countable marks. Baseline 0 is implicit (no icons = 0). The
// last icon may be partial (clipped to the remainder). Every icon is the SAME
// size — the non-negotiable that keeps the count honest (a bigger icon would
// double-encode). One row per category; the icon size is chosen so the LONGEST
// row fills the width. The reveal fills icons left→right in the component.

import { scaleBand } from "d3-scale";

/**
 * The countability CEILING the produce-time guard refuses past. Counting is exact up to
 * roughly a dozen marks and becomes estimation well before twenty; past twenty icons a row
 * is read as a LENGTH — which is a bar, drawn worse. 20 is deliberately looser than the
 * chooser's target below so a journalist who states their own unit ("one figure = 1,000
 * households") is not forced onto the ladder; only the uncountable is refused.
 */
export const MAX_ICONS_PER_ROW = 20;

/**
 * The band `chooseUnitPerIcon` aims the LONGEST row at. Twelve keeps the row inside one
 * glance and matches the isotype convention of short rows (FT Visual Vocabulary's
 * magnitude/isotype examples; data-to-viz's "keep the number of icons low").
 */
export const TARGET_MAX_ICONS = 12;

/**
 * A remainder smaller than this is dropped rather than drawn: below ~2 % of an icon the
 * clip is a hairline that reads as an artefact, not as a quantity. Exported because the
 * produce-time guard uses the SAME number to refuse a range so wide that a positive value
 * would render as no icon at all (a chart drawing a real value as zero).
 */
export const MIN_VISIBLE_ICON_FRACTION = 0.02;

/**
 * Pick the unit ONE icon stands for, from the 1-2-5 ladder, so the longest row lands inside
 * `TARGET_MAX_ICONS`. The smallest such unit wins — it is the one that keeps the most
 * granularity (a coarser unit throws away the differences between rows), and the ladder's
 * ≤2.5× steps mean the longest row still holds several icons.
 *
 * The unit is a ROUND number on purpose: it is printed to the reader ("= 10 000 residents"),
 * and "= 8 437 residents" is a key nobody can hold in their head while counting.
 */
export function chooseUnitPerIcon(values: number[]): number {
  const max = Math.max(0, ...values.filter((v) => Number.isFinite(v)));
  // Also what BOUNDS the scan below: log10(0) is -Infinity, and a loop counter of
  // -Infinity never increments, so a non-positive max must be refused here or the
  // ladder spins forever. Do not relax this into a silent default.
  if (!(max > 0))
    throw new Error("chooseUnitPerIcon: needs at least one positive value");
  // start well below the max's decade so the ascending scan cannot skip past the answer
  const startDecade = Math.floor(Math.log10(max)) - 6;
  for (let k = startDecade; k <= startDecade + 12; k++)
    for (const mantissa of [1, 2, 5]) {
      const unit = mantissa * Math.pow(10, k);
      if (Math.ceil(max / unit - 1e-9) <= TARGET_MAX_ICONS) return unit;
    }
  throw new Error(`chooseUnitPerIcon: no ladder unit fits a maximum of ${max}`);
}

export interface PictogramData {
  categoryField: string;
  valueField: string;
  unitPerIcon: number; // how many real-world units ONE icon represents
  rows: Record<string, string | number>[];
}

export interface PictogramDims {
  width: number;
  height: number;
  padding: { top: number; right: number; bottom: number; left: number };
}

export interface PictogramRow {
  index: number;
  category: string;
  value: number;
  count: number; // value / unitPerIcon (fractional)
  fullIcons: number; // whole icons
  frac: number; // 0..1 remainder → a partial last icon
  y: number; // band centre
}

export interface PictogramLayout {
  innerWidth: number;
  innerHeight: number;
  rows: PictogramRow[];
  iconSize: number; // edge length of one square icon
  cellW: number; // iconSize + gap (horizontal advance per icon)
  maxCols: number; // columns in the longest row
  unitPerIcon: number;
}

export function computePictogramLayout(
  data: PictogramData,
  dims: PictogramDims,
): PictogramLayout {
  if (!data.rows.length)
    throw new Error("computePictogramLayout: data.rows is empty");
  if (!(data.unitPerIcon > 0))
    throw new Error("computePictogramLayout: unitPerIcon must be > 0");
  const { width, height, padding } = dims;
  const innerWidth = width - padding.left - padding.right;
  const innerHeight = height - padding.top - padding.bottom;
  if (innerWidth <= 0 || innerHeight <= 0)
    throw new Error("computePictogramLayout: padding exceeds dimensions");

  const parsed = data.rows.map((r) => {
    const value = Number(r[data.valueField]);
    if (Number.isNaN(value))
      throw new Error(`invalid pictogram value: ${r[data.valueField]}`);
    if (value < 0)
      throw new Error("pictogram cannot encode a negative value as a count");
    return { category: String(r[data.categoryField]), value };
  });

  const band = scaleBand<number>()
    .domain(parsed.map((_, i) => i))
    .range([0, innerHeight])
    .padding(0.3);
  const bandH = band.bandwidth();

  // columns = the longest row's icon count (round UP so a partial icon has a cell)
  const maxCount = Math.max(...parsed.map((d) => d.value / data.unitPerIcon));
  const maxCols = Math.max(1, Math.ceil(maxCount));

  // icon size: fit the longest row across the width, but never taller than the band
  const gapRatio = 0.16; // gap = 16% of the icon edge
  const cellFromWidth = innerWidth / maxCols;
  const iconSize = Math.min(bandH * 0.92, cellFromWidth / (1 + gapRatio));
  const cellW = iconSize * (1 + gapRatio);

  const rows: PictogramRow[] = parsed.map((d, i) => {
    const count = d.value / data.unitPerIcon;
    const fullIcons = Math.floor(count + 1e-9);
    const frac = count - fullIcons;
    return {
      index: i,
      category: d.category,
      value: d.value,
      count,
      fullIcons,
      frac: frac < MIN_VISIBLE_ICON_FRACTION ? 0 : frac, // ignore a sliver
      y: (band(i) ?? 0) + bandH / 2,
    };
  });

  return {
    innerWidth,
    innerHeight,
    rows,
    iconSize,
    cellW,
    maxCols,
    unitPerIcon: data.unitPerIcon,
  };
}

/**
 * The fill amount (0..1) of the icon at column `col` in a row, given the row's
 * total icon `count` and a global `reveal` (0..1) that fills columns left→right.
 * Pure → reproducible video frames. A column beyond the row's count stays 0.
 */
export function iconFill(
  col: number,
  count: number,
  reveal: number,
  maxCols: number,
): number {
  const r = reveal < 0 ? 0 : reveal > 1 ? 1 : reveal;
  // how much of THIS icon the data fills (1 for full, the remainder for the last)
  const dataFill = Math.max(0, Math.min(1, count - col));
  if (dataFill <= 0) return 0;
  // reveal sweeps columns left→right across the whole grid
  const revealed = Math.max(0, Math.min(1, r * maxCols - col));
  return dataFill * revealed;
}
