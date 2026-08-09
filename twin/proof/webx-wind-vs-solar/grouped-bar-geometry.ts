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

export function fr(value: number, decimals = 1): string {
  return value.toFixed(decimals);
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
