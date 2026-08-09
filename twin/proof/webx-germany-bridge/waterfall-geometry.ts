/**
 * The pure core of the "Germany electricity bridge" web beat: data to coordinates. No colour, no
 * font, no React.
 */

import { scaleLinear } from "d3-scale";

/** The language this beat's own page declares (`<html lang="en">`, set by its runner) and the ONLY
 *  thing the formatters below take their locale from. Named after the beat's declared language, not
 *  after a formatter: this beat used to reach for `toLocaleString("en-US")` at each call site, one
 *  hard-coded locale per label, with nothing tying any of them to what the page says it is. */
export const BEAT_LANG = "en";

/** `decimals` places, grouped and pointed the way `BEAT_LANG` says. Through `Intl` rather than
 *  `toFixed`, and that is not cosmetic: `toFixed` rounds the DOUBLE — it rounds 380.449999… down to
 *  380.4 — while `Intl` rounds the decimal value the source published. */
export function formatNumber(value: number, decimals = 1): string {
  return new Intl.NumberFormat(BEAT_LANG, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

/** A signed step, with a real minus sign (U+2212) rather than a hyphen — this is a number, and a
 *  hyphen at a value label's own size reads as a dash. */
export function formatSigned(value: number, decimals = 1): string {
  return `${value > 0 ? "+" : "−"}${formatNumber(Math.abs(value), decimals)}`;
}

export type Step = {
  label: string;
  value: number;
  kind: "total" | "increase" | "decrease";
};

/**
 * Pure geometry: each step floats on the running total the steps before it produced. The first and
 * last bars are full bars from zero (the true totals); every bar between floats from the previous
 * bar's end to its own (`references/types/waterfall.md`).
 */
export function waterfallGeometry(
  steps: Step[],
  {
    width,
    height,
    padding,
    barGap,
  }: {
    width: number;
    height: number;
    padding: { top: number; right: number; bottom: number; left: number };
    barGap: number;
  },
) {
  const plot = {
    left: padding.left,
    top: padding.top,
    right: width - padding.right,
    bottom: height - padding.bottom,
  };

  let running = 0;
  const runningAfter: number[] = [];
  for (const s of steps) {
    running = s.kind === "total" ? s.value : running + s.value;
    runningAfter.push(running);
  }
  const maxLevel = Math.max(0, ...runningAfter);

  const y = scaleLinear()
    .domain([0, maxLevel])
    .nice()
    .range([plot.bottom, plot.top]);
  const barWidth =
    (plot.right - plot.left - barGap * (steps.length - 1)) / steps.length;

  let cursor = 0;
  const bars = steps.map((s, i) => {
    const x = plot.left + i * (barWidth + barGap);
    let bottomValue: number;
    let topValue: number;
    if (s.kind === "total") {
      bottomValue = 0;
      topValue = s.value;
      cursor = s.value;
    } else {
      bottomValue = cursor;
      topValue = cursor + s.value;
      cursor = topValue;
    }
    return {
      label: s.label,
      value: s.value,
      kind: s.kind,
      runningAfter: runningAfter[i],
      x,
      center: x + barWidth / 2,
      width: barWidth,
      top: y(Math.max(bottomValue, topValue)),
      bottom: y(Math.min(bottomValue, topValue)),
    };
  });

  return { plot, bars, ticksY: y.ticks(5).map((v) => ({ value: v, y: y(v) })) };
}
