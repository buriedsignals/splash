/**
 * Pure statistics + coordinates for the box plot web beat — France's per-capita CO2 emissions by
 * decade. Written fresh from `proof/more-boxplot-france-co2-decades/DecadeBoxplot.tsx`'s shape
 * (`references/types/boxplot.md`) — duplicated, not imported: a beat never imports another beat's
 * files (`chart-web/SKILL.md`, "duplicate, do not link").
 *
 * Two differences from the static beat's own `summarizeDecade`/`boxplotGeometry`, both there
 * because this format's hover/focus tooltip needs to say more than the static frame ever prints:
 *
 *   1. `summarizeDecade` here takes `{ year, value }` readings, not bare `number[]` — an outlier's
 *      own YEAR ("1 outlier: 9.54 t (1980)") is part of what hover reveals
 *      (`chart-web/references/web-discipline.md`: "every reading gets an exact, on-demand
 *      value"), and the static beat's summary never had to carry it because its own printed
 *      outlier label is just the value.
 *   2. `boxplotGeometry` returns each box's own band `x`/`width` (`bandLeft`/`bandWidth`), not just
 *      its narrower drawn box width — the web beat's hit target is the FULL band per decade, not
 *      the visually-narrower box (see `DecadeBoxplotWeb.tsx`'s own doc-comment for why a
 *      nearest-point hit area is the wrong mechanic for eight discrete categories).
 */

import { extent, quantile } from "d3-array";
import { scaleBand, scaleLinear } from "d3-scale";

export type YearValue = { year: number; value: number };
export type DecadeReadings = { label: string; readings: YearValue[] };

/**
 * One decade's raw readings to its five-number summary plus its Tukey outliers, each outlier
 * keeping its own year. `q1`/`median`/`q3` come from d3-array's `quantile` (linear interpolation,
 * "type 7"), matching the static beat's own choice. The whisker is clipped to the furthest reading
 * still inside the fence, never to the data's own extreme — `boxplot.md`'s one honesty rule: a
 * whisker that stretches to the most extreme point launders a lone outlier into looking like
 * ordinary spread.
 */
export function summarizeDecade(label: string, readings: YearValue[]) {
  if (readings.length < 2)
    throw new Error(
      `decade ${label} needs at least two readings to summarize, got ${readings.length}`,
    );
  const values = readings.map((r) => r.value);
  const q1 = quantile(values, 0.25) as number;
  const median = quantile(values, 0.5) as number;
  const q3 = quantile(values, 0.75) as number;
  const iqr = q3 - q1;
  const lowerFence = q1 - 1.5 * iqr;
  const upperFence = q3 + 1.5 * iqr;
  const inFence = readings.filter(
    (r) => r.value >= lowerFence && r.value <= upperFence,
  );
  const outliers = readings
    .filter((r) => r.value < lowerFence || r.value > upperFence)
    .sort((a, b) => a.value - b.value);
  const [whiskerLo, whiskerHi] = extent(
    (inFence.length > 0 ? inFence : readings).map((r) => r.value),
  ) as [number, number];
  return {
    label,
    n: readings.length,
    q1,
    median,
    q3,
    whiskerLo,
    whiskerHi,
    outliers,
  };
}

export type DecadeSummary = ReturnType<typeof summarizeDecade>;

/**
 * Summaries to pixels. The y domain is fitted to every reading that will actually be drawn — the
 * same POSITION-encoding rule the static beat follows (`boxplot.md`): `.nice()`d, never anchored at
 * zero. `y` itself is also returned (not just points already scaled) so a caller can place anything
 * else against the same fitted domain.
 */
export function boxplotGeometry(
  summaries: DecadeSummary[],
  allValues: number[],
  {
    width,
    height,
    padding,
    yTickHint,
    boxWidthRatio,
    bandPaddingInner,
    bandPaddingOuter,
  }: {
    width: number;
    height: number;
    padding: { top: number; right: number; bottom: number; left: number };
    yTickHint: number;
    boxWidthRatio: number;
    bandPaddingInner: number;
    bandPaddingOuter: number;
  },
) {
  const plot = {
    left: padding.left,
    top: padding.top,
    right: width - padding.right,
    bottom: height - padding.bottom,
  };
  const y = scaleLinear()
    .domain(extent(allValues) as [number, number])
    .nice()
    .range([plot.bottom, plot.top]);
  const x = scaleBand<string>()
    .domain(summaries.map((s) => s.label))
    .range([plot.left, plot.right])
    .paddingInner(bandPaddingInner)
    .paddingOuter(bandPaddingOuter);
  const bandWidth = x.bandwidth();
  const boxWidth = bandWidth * boxWidthRatio;

  const boxes = summaries.map((s) => {
    const bandLeft = x(s.label) as number;
    const cx = bandLeft + bandWidth / 2;
    return {
      ...s,
      cx,
      bandLeft,
      bandWidth,
      boxLeft: cx - boxWidth / 2,
      boxRight: cx + boxWidth / 2,
      yQ1: y(s.q1),
      yQ3: y(s.q3),
      yMedian: y(s.median),
      yWhiskerLo: y(s.whiskerLo),
      yWhiskerHi: y(s.whiskerHi),
      outlierPoints: s.outliers.map((o) => ({
        year: o.year,
        value: o.value,
        y: y(o.value),
      })),
    };
  });

  return {
    plot,
    boxWidth,
    bandWidth,
    boxes,
    ticksY: y.ticks(yTickHint).map((value) => ({ value, y: y(value) })),
  };
}
