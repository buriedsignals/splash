/**
 * The pure core of the "wind vs solar" web beat: data to coordinates, and the number formatting
 * that labels them. No colour, no font, no React.
 */

import { extent } from "d3-array";
import { scaleLinear } from "d3-scale";

export type Group = {
  name: string;
  wind: number; // % of total generation
  solar: number; // % of total generation
  windTwh: number; // absolute TWh — printed nowhere on the static frame, hover-only detail
  solarTwh: number;
};

/** The language this beat's own page declares (`<html lang="en">`, set by its runner) and the ONLY
 *  thing `formatNumber` below takes its locale from. This beat's words are English throughout, so
 *  "28.6%" is what belongs on its bars; a French "28,6" under English prose is two number systems
 *  in one frame. */
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
 *  `skills/splash/test/helper-parity.test.ts` cross-checks every `fr` copy in the tree against
 *  every other to prove the rule has not silently drifted between them, and deleting this copy
 *  would blind that guard rather than satisfy it — the same reason `ChartWebSeed.tsx` still exports
 *  a `wrap` it no longer calls. This beat's own numbers go through `formatNumber` above. */
export function fr(value: number, decimals = 1): string {
  return new Intl.NumberFormat("fr-FR", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

/**
 * Pure geometry: groups -> bar rectangles. Value is a LENGTH from a shared zero baseline
 * (`references/types/grouped-bar.md`, inherited whole from the single-bar rule), so the scale
 * always includes zero and is `.nice()`d outward, never fitted to the data's own min/max.
 */
export function groupedBarGeometry(
  groups: Group[],
  {
    width,
    height,
    padding,
    groupGap,
    barGap,
    yTickHint = 5,
  }: {
    width: number;
    height: number;
    padding: { top: number; right: number; bottom: number; left: number };
    groupGap: number;
    barGap: number;
    yTickHint?: number;
  },
) {
  const plot = {
    left: padding.left,
    top: padding.top,
    right: width - padding.right,
    bottom: height - padding.bottom,
  };
  const values = groups.flatMap((g) => [g.wind, g.solar]);
  const y = scaleLinear()
    .domain([0, extent(values)[1] as number])
    .nice()
    .range([plot.bottom, plot.top]);

  const groupWidth =
    (plot.right - plot.left - groupGap * (groups.length - 1)) / groups.length;
  const barWidth = (groupWidth - barGap) / 2;

  const bars = groups.map((g, i) => {
    const groupLeft = plot.left + i * (groupWidth + groupGap);
    const windX = groupLeft;
    const solarX = groupLeft + barWidth + barGap;
    return {
      name: g.name,
      groupLeft,
      groupWidth,
      groupCenter: groupLeft + groupWidth / 2,
      wind: {
        x: windX,
        y: y(g.wind),
        width: barWidth,
        height: y(0) - y(g.wind),
        value: g.wind,
        twh: g.windTwh,
      },
      solar: {
        x: solarX,
        y: y(g.solar),
        width: barWidth,
        height: y(0) - y(g.solar),
        value: g.solar,
        twh: g.solarTwh,
      },
    };
  });

  return {
    plot,
    bars,
    ticksY: y.ticks(yTickHint).map((v) => ({ value: v, y: y(v) })),
    zeroY: y(0),
  };
}
