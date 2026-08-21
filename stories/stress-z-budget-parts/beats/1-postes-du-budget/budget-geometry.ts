/**
 * The pure core of the budget-parts beat: data to coordinates, and the number formatting that
 * labels them. No colour, no font, no React — the same split
 * `stories/stress-k-flat-inspections/beats/1-flat-inspections/bar-geometry.ts` and
 * `proof/webz-diverging-bar-eu-per-capita/diverging-geometry.ts` keep for their own beats, copied
 * here rather than imported (a story workspace is not a skill, and this project duplicates rather
 * than links across a story boundary).
 *
 * WHY A SIGNED DOMAIN AND NOT A PART-TO-WHOLE ONE. This table's seven members do not partition a
 * whole: six are expenditure, one (`Recettes exceptionnelles`) is a provision write-back booked as
 * NEGATIVE expenditure, which the accounting nomenclature allows. Any geometry that maps a value
 * onto an angle, an area or a cumulative length has no representation for a negative member, so the
 * only honest encoding left is a length from a SHARED ZERO that may run either way. That is what
 * this file computes and the only thing it computes.
 */

import { scaleLinear } from "d3-scale";

export type Row = { name: string; amount: number; share: number };

/** French, as the story is (`STORYBOARD.md`'s `language: fr`): a comma decimal separator and a
 *  narrow no-break space for thousands, which is what `Intl` gives for `fr-FR`. A MINUS SIGN
 *  (U+2212), never a hyphen-minus: on a diverging bar the sign is the reading, and a hyphen at
 *  13px next to a digit is a dash a reader can lose. */
export function fr(value: number, decimals = 1): string {
  const text = new Intl.NumberFormat("fr-FR", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(Math.abs(value));
  return value < 0 ? `−${text}` : text;
}

export type PositionedRow = Row & {
  barStart: number;
  barEnd: number;
  barWidth: number;
  top: number;
  height: number;
  centerY: number;
  negative: boolean;
};

/**
 * Data to coordinates for a DIVERGING horizontal bar chart, one row per budget line, a shared zero
 * that sits inside the plot rather than at its left edge.
 *
 * The domain is `[min(0, smallest), max(0, largest)]` — zero is always inside it, because a bar's
 * length is the whole encoding and a length has to be measured from somewhere the reader can see.
 * The zero is returned as `zeroX` so the caller can draw it and label it; nothing here decides what
 * colour anything is, or which row is the subject.
 */
export function divergingGeometry(
  rows: Row[],
  {
    width,
    height,
    rowHeight,
    gapRatio,
  }: {
    width: number;
    height: number;
    rowHeight: number;
    gapRatio: number;
  },
) {
  if (rows.length === 0) throw new Error("a budget-parts beat needs at least one row, got 0");
  const amounts = rows.map((r) => r.amount);
  const lo = Math.min(0, ...amounts);
  const hi = Math.max(0, ...amounts);
  if (lo === hi) throw new Error(`every amount is ${lo} — there is nothing to diverge from`);
  const x = scaleLinear().domain([lo, hi]).range([0, width]);
  const zeroX = x(0);
  const barHeight = rowHeight * (1 - gapRatio);
  const positioned: PositionedRow[] = rows.map((r, i) => {
    const bandTop = i * rowHeight;
    const top = bandTop + (rowHeight - barHeight) / 2;
    const end = x(r.amount);
    return {
      ...r,
      barStart: Math.min(zeroX, end),
      barEnd: end,
      barWidth: Math.abs(end - zeroX),
      top,
      height: barHeight,
      centerY: top + barHeight / 2,
      negative: r.amount < 0,
    };
  });
  return { rows: positioned, x, zeroX, lo, hi, width, height };
}
