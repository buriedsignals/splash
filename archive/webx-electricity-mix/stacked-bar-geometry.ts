/**
 * The pure core of the "electricity mix" web beat: data to coordinates, and the number formatting
 * that labels them. No colour, no font, no React.
 *
 * IT TAKES AN ORDER NOW, AND THAT IS THE WHOLE OF THE RE-BASE. A 100 %-stacked column's bands are
 * drawn bottom-to-top in one fixed order, and only the BOTTOM one shares a real common reference
 * across countries (`references/types/stacked-bar.md`, "The one thing that goes wrong"). A still can
 * only suffer that. This page lets the reader put a different band on the floor, and the geometry of
 * that is one argument: the same six columns, laid out in a ROTATED order. Every column is still
 * exactly 100 units tall and still inside the frame — which is why the stack is rotated rather than
 * slid down, and the two alternatives were measured before this one was written: aligning the six on
 * a chosen band's own bottom needs 168 units of plot for 100 units of data, so the untouched plate
 * would have spent two fifths of its height on empty room it never uses.
 */

import { scaleLinear } from "d3-scale";

export type Segment = "renewables" | "nuclear" | "fossil";

export type Country = {
  code: string;
  name: string;
  renewables: number; // % of total generation
  nuclear: number; // %
  fossil: number; // %
  renewablesTwh: number; // absolute TWh — hover-only detail, printed nowhere on the frame
  nuclearTwh: number;
  fossilTwh: number;
  totalTwh: number;
};

/** `decimals` places, grouped and pointed the French way — the language this beat's own pages
 *  declare (`<html lang="fr">`, which `renderWeb` writes) and the one every word on them is in.
 *  `skills/splash/test/number-format-honest.test.ts` holds the name to the locale: a function called
 *  `fr` may not format in English, which is what an earlier `toFixed` copy in this tree did. */
export function fr(value: number, decimals = 1): string {
  return new Intl.NumberFormat("fr-FR", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

/** The order the plate ships in, bottom first. It is also the order `PALETTE.md` reasons about the
 *  three bands in, so a recorded colour can never land on the wrong band. */
export const STACK_ORDER: Segment[] = ["renewables", "nuclear", "fossil"];

/**
 * The order that puts `band` on the floor: a CYCLIC rotation of `STACK_ORDER`, never a re-sort.
 *
 * The distinction is the type sheet's own: reordering a stack per column breaks "same colour, same
 * series" and is worse than a grouped bar. A rotation is applied to all six columns at once and
 * preserves the ring — renewables still sits under nuclear, nuclear still under fossil — so the only
 * thing that changes is WHICH seam the reader is given as the common reference.
 */
export function rotatedOrder(band: Segment): Segment[] {
  const at = STACK_ORDER.indexOf(band);
  if (at < 0) throw new Error(`${band} is not one of the bands this beat draws`);
  return [...STACK_ORDER.slice(at), ...STACK_ORDER.slice(0, at)];
}

/**
 * Pure geometry: one 100 %-stacked column per country, in the order handed in (the plate's own by
 * default).
 */
export function stackedBarGeometry(
  countries: Country[],
  {
    width,
    height,
    padding,
    barWidth,
    barGap,
    order = STACK_ORDER,
  }: {
    width: number;
    height: number;
    padding: { top: number; right: number; bottom: number; left: number };
    barWidth: number;
    barGap: number;
    order?: Segment[];
  },
) {
  const plot = {
    left: padding.left,
    top: padding.top,
    right: width - padding.right,
    bottom: height - padding.bottom,
  };
  const y = scaleLinear().domain([0, 100]).range([plot.bottom, plot.top]);

  const bars = countries.map((c, i) => {
    const x = plot.left + i * (barWidth + barGap);
    let cursor = 0;
    const segments = order.map((key) => {
      const value = c[key];
      const twh = c[`${key}Twh` as const];
      const bottom = y(cursor);
      cursor += value;
      const top = y(cursor);
      return {
        key,
        value,
        twh,
        x,
        y: top,
        width: barWidth,
        height: bottom - top,
      };
    });
    return { code: c.code, name: c.name, x, center: x + barWidth / 2, segments };
  });

  return { plot, bars, ticksY: y.ticks(5).map((v) => ({ value: v, y: y(v) })) };
}
