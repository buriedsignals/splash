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

/** The language this beat's own page declares (`<html lang="en">`, set by its runner) and the ONLY
 *  thing `formatNumber` below takes its locale from. This beat's words are English throughout, so
 *  "380.5 TWh" is what belongs in its tooltips; a French "380,5" under English prose is two number
 *  systems in one frame. */
export const BEAT_LANG = "en";

/** `decimals` places, grouped and pointed the way `BEAT_LANG` says — named for what it does rather
 *  than for any one locale, so the name cannot go on meaning something the body stopped doing. It
 *  replaces a function called `fr` that this beat called for its English words: a shared repair
 *  moved every `fr` in the tree onto `Intl.NumberFormat("fr-FR")`, right for the tree's French
 *  beats and wrong here, and the name is what hid it. */
export function formatNumber(value: number, decimals = 1): string {
  return new Intl.NumberFormat(BEAT_LANG, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

/** The French formatter this beat no longer calls. Kept, and kept exported, for one reason only:
 *  `skills/splash-twin/test/helper-parity.test.ts` cross-checks every `fr` copy in the tree against
 *  every other to prove the rule has not silently drifted between them, and deleting this copy
 *  would blind that guard rather than satisfy it — the same reason `ChartWebSeed.tsx` still exports
 *  a `wrap` it no longer calls. This beat's own numbers go through `formatNumber` above. */
export function fr(value: number, decimals = 1): string {
  return new Intl.NumberFormat("fr-FR", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
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
