/**
 * The pure core of the "electricity mix" web beat: data to coordinates, and the number formatting
 * that labels them. No colour, no font, no React.
 */

import { scaleLinear } from "d3-scale";

export type Segment = "renewables" | "nuclear" | "fossil";

export type Country = {
  name: string;
  renewables: number; // % of total generation
  nuclear: number; // %
  fossil: number; // %
  renewablesTwh: number; // absolute TWh — hover-only detail, printed nowhere on the static frame
  nuclearTwh: number;
  fossilTwh: number;
};

export function fr(value: number, decimals = 1): string {
  return value.toFixed(decimals);
}

export const STACK_ORDER: Segment[] = ["renewables", "nuclear", "fossil"];

/**
 * Pure geometry: one 100%-stacked column per country, bottom-to-top order fixed across every
 * column (`references/types/stacked-bar.md`: reordering a stack shifts every segment above the
 * swap, breaking the "same colour, same series" contract worse than a grouped bar would).
 */
export function stackedBarGeometry(
  countries: Country[],
  {
    width,
    height,
    padding,
    barWidth,
    barGap,
  }: {
    width: number;
    height: number;
    padding: { top: number; right: number; bottom: number; left: number };
    barWidth: number;
    barGap: number;
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
    const segments = STACK_ORDER.map((key) => {
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
    return { name: c.name, x, center: x + barWidth / 2, segments };
  });

  return { plot, bars, ticksY: y.ticks(5).map((v) => ({ value: v, y: y(v) })) };
}
