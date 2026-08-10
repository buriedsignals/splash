/**
 * The pure core of the "income vs life expectancy" scatter — data to coordinates, and the number
 * formatting the axis and the per-point detail speak. No colour, no font, no React: the same split
 * `proof/co2-suisse/crossing-geometry.ts` keeps for its own (line) beat.
 *
 * Structurally different from that sibling module, and from `twin-chart-web/assets/ChartWebSeed.tsx`,
 * for the reason `twin-chart-beat/references/types/scatter.md` names as this chart type's whole
 * point: BOTH axes here are measured values, not one measured value against time. x is GDP per
 * capita on a LOG scale (income is famously skewed — a linear axis crushes every poor country into
 * the left edge and hides the relationship's actual shape, the doctrine's own words); y is life
 * expectancy on a plain linear scale. Neither axis is forced to include zero — position is the
 * entire encoding here, unlike a bar's length.
 */

import { extent } from "d3-array";
import { scaleLinear, scaleLog } from "d3-scale";

export type CountryRow = {
  country: string;
  code: string;
  gdp: number;
  lifeExpectancy: number;
  /** OWID's own world-region column. Nothing in the geometry reads it — it exists solely so this
   *  beat's runner can declare a filter over a dimension orthogonal to both axes. */
  region?: string;
};

/**
 * English number formatting: comma thousands, no decimals — how a dollar figure is normally
 * written. Regex-based, the same technique `crossing-geometry.ts`'s `fr()` uses for its own
 * (French) convention, so this module carries no locale/Intl dependency either, and this beat's own
 * words are English throughout (this story, unlike the CO₂ one, has no reason to speak French).
 */
export function usd(value: number): string {
  const rounded = Math.round(value);
  return "$" + rounded.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

/** One decimal place — the precision this dataset is actually reported at. */
export function years(value: number, decimals = 1): string {
  return value.toFixed(decimals);
}

/**
 * Abbreviated tick label for a power-of-ten GDP value: 100 → "$100", 1 000 → "$1k",
 * 1 000 000 → "$1M" — exactly the "$1k" / "$10k" / "$100k" shape
 * `proof/web-income-life-expectancy/BRIEF.md` and the scatter doctrine both ask for. Only ever
 * called on what `logTicks` returns (a power of ten), so the division below is always exact.
 */
export function usdTickLabel(value: number): string {
  if (value >= 1_000_000) return `$${value / 1_000_000}M`;
  if (value >= 1_000) return `$${value / 1_000}k`;
  return `$${value}`;
}

/**
 * Rounds a value extent outward to the nearest power of ten on both ends — the log-scale
 * equivalent of `crossing-geometry.ts`'s `.nice()` call. Still a FITTED domain, per the doctrine
 * ("NOT forced to include zero"): this only rounds the data's own min/max out to a boundary a
 * reader can anchor to, the same job `.nice()` does for a linear axis.
 */
export function niceLogDomain(values: number[]): [number, number] {
  const [min, max] = extent(values) as [number, number];
  const lo = 10 ** Math.floor(Math.log10(min));
  const hi = 10 ** Math.ceil(Math.log10(max));
  return [lo, hi];
}

/**
 * Every power of ten between the domain's own ends, inclusive — not d3's default log ticks, which
 * crowd a log scale with a 1,2,3,4,5,6,7,8,9× minor tick per decade, unreadable at 900px let alone
 * 360. A scatter's log axis is meant to speak in orders of magnitude; that is the entire reason the
 * scale is log rather than linear in the first place.
 */
export function logTicks([lo, hi]: [number, number]): number[] {
  const ticks: number[] = [];
  for (let v = lo; v <= hi * 1.0000001; v *= 10) ticks.push(v);
  return ticks;
}

/**
 * Data to coordinates, and nothing else — no colour, no font, no label. Returns the two fitted
 * scales themselves (not just points), so the caller can place gridlines, tick labels and named
 * points' pixel positions from the same functions the points themselves were placed with.
 */
export function scatterGeometry(
  data: CountryRow[],
  {
    width,
    height,
    padding,
  }: {
    width: number;
    height: number;
    padding: { top: number; right: number; bottom: number; left: number };
  },
) {
  const plot = {
    left: padding.left,
    top: padding.top,
    right: width - padding.right,
    bottom: height - padding.bottom,
  };

  const xDomain = niceLogDomain(data.map((d) => d.gdp));
  const x = scaleLog().domain(xDomain).range([plot.left, plot.right]);

  const y = scaleLinear()
    .domain(extent(data.map((d) => d.lifeExpectancy)) as [number, number])
    .nice()
    .range([plot.bottom, plot.top]);

  const points = data.map((d) => ({
    ...d,
    x: x(d.gdp),
    y: y(d.lifeExpectancy),
  }));

  return {
    plot,
    points,
    x,
    y,
    xDomain,
    yDomain: y.domain() as [number, number],
  };
}
