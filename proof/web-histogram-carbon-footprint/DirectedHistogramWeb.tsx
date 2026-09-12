/**
 * The distribution of CO₂ per person across every country in 2023, drawn as a histogram THROUGH the
 * design base and delivered as an interactive page.
 *
 * `bin-named-by-both-edges-and-an-open-top` — a bin is an interval, so it is named by BOTH of its
 * edges, and the last one says it is open rather than pretending to end where the data happens to
 * stop. A histogram labelled `0 2 4 6` leaves the reader to guess which side of 4 a country at
 * exactly 4 t fell on; this one does not.
 *
 * `the-distribution-is-furniture-and-the-case-is-ink` — the shape is the argument, so the bars are
 * one neutral; the bins the headline counts are the ones that carry the accent.
 *
 * WHAT THE WEB ADDS. A histogram's bar says "this many fell here" and refuses to say WHO. That
 * refusal is the form working correctly — a distribution is not a ranking — but it is also the first
 * question every reader asks. Every bar here answers with its interval, its count, its share of the
 * whole, the running share up to its own top edge, and the countries inside it.
 */

import { mix, adjustToContrast, contrast, TEXT_CONTRAST_MIN, NON_TEXT_CONTRAST_MIN } from "#shared/chart-beat/colour.mjs";
import { webRegisters, figureVars, noteAnchor, fitY } from "#shared/design-base/web.mjs";

export const FRAME = { width: 880, height: 340, xAxisRowPx: 30 };

export type Bar = {
  from: number;
  to: number | null;
  count: number;
  inClaim: boolean;
  label: string;
  detail: string;
};

const pct = (value: number, extent: number) => (value / extent) * 100;

export function DirectedHistogramWeb({
  bars,
  yTicks,
  xTicks,
  binWidth,
  median,
  title,
  eyebrow,
  caveat,
  source,
  alt,
  reading,
  claimNote,
  medianNote,
  direction,
  ground,
  accent,
  ink,
  muted,
  grid,
}: {
  bars: Bar[];
  yTicks: number[];
  xTicks: number[];
  binWidth: number;
  median: number;
  title: string;
  eyebrow: string;
  caveat: string;
  source: string;
  alt: string;
  reading: string;
  claimNote: string;
  medianNote: string;
  direction: any;
  ground: string;
  accent: string;
  ink: string;
  muted: string;
  grid: string;
}) {
  const regs = webRegisters(direction, { ink: { ink, muted, accent } });

  let neutral = mix(ground, ink, 0.34);
  if (contrast(neutral, ground) < NON_TEXT_CONTRAST_MIN)
    neutral = adjustToContrast(neutral, ground, NON_TEXT_CONTRAST_MIN) ?? neutral;
  const rule = mix(ground, ink, 0.6);
  const baseline = mix(ground, ink, 0.75);
  const label = adjustToContrast(ink, ground, TEXT_CONTRAST_MIN) ?? ink;

  const lastEdge = bars[bars.length - 1].from + binWidth;
  const x = (v: number) => (v / lastEdge) * FRAME.width;
  const y = fitY(0, yTicks[yTicks.length - 1], FRAME.height);

  return (
    <figure
      className="chart-figure"
      style={{
        ["--ground" as string]: ground,
        ["--accent" as string]: accent,
        ["--ink" as string]: ink,
        ["--muted" as string]: muted,
        ...figureVars(regs),
      }}
    >
      <div className="chart-header">
        <p className="chart-eyebrow" style={{ ...regs.eyebrow, margin: "0 0 6px" }}>{eyebrow}</p>
        <h2 className="chart-title" style={{ ...regs.display, margin: "0 0 6px" }}>{title}</h2>
        <p className="chart-caveat" style={{ ...regs.body, margin: 0 }}>{caveat}</p>
      </div>

      <div
        className="chart-plot"
        style={{
          ["--y-gutter" as string]: "40px",
          ["--x-axis-h" as string]: `${FRAME.xAxisRowPx}px`,
          aspectRatio: `${FRAME.width + 40} / ${FRAME.height + FRAME.xAxisRowPx}`,
        }}
      >
        <div className="y-axis" style={{ pointerEvents: "none" }}>
          {yTicks.map((t) => (
            <span key={t} className="axis-label y" style={{ ...regs.axis, top: `${pct(y(t), FRAME.height)}%` }}>
              {t}
            </span>
          ))}
        </div>

        <svg
          role="group"
          aria-label={title}
          xmlns="http://www.w3.org/2000/svg"
          className="chart"
          viewBox={`0 0 ${FRAME.width} ${FRAME.height}`}
          preserveAspectRatio="none"
        >
          <desc>{alt}</desc>
          <rect x={0} y={0} width={FRAME.width} height={FRAME.height} fill={ground} />

          {yTicks.slice(1).map((t) => (
            <line key={t} x1={0} x2={FRAME.width} y1={y(t)} y2={y(t)} stroke={grid} strokeWidth={1} vectorEffect="non-scaling-stroke" />
          ))}

          {/* Bars TOUCH: a histogram's bins are contiguous intervals, and a gap between them says
              the scale is categorical. Only the 1px stroke separates one from the next. */}
          {bars.map((b) => (
            <rect
              key={b.from}
              x={x(b.from)}
              y={y(b.count)}
              width={x(b.from + binWidth) - x(b.from)}
              height={FRAME.height - y(b.count)}
              fill={b.inClaim ? accent : neutral}
              stroke={ground}
              strokeWidth={1}
              vectorEffect="non-scaling-stroke"
            />
          ))}

          <line x1={x(median)} x2={x(median)} y1={0} y2={FRAME.height} stroke={rule} strokeWidth={direction.stroke?.rule ?? 0.8} strokeDasharray="5 4" vectorEffect="non-scaling-stroke" />
          <line x1={0} x2={FRAME.width} y1={FRAME.height} y2={FRAME.height} stroke={baseline} strokeWidth={1} vectorEffect="non-scaling-stroke" />

          {bars.map((b) => (
            <circle
              key={`hit-${b.from}`}
              className="pt"
              cx={x(b.from + binWidth / 2)}
              cy={y(b.count)}
              r={7}
              fill="transparent"
              stroke="none"
              tabIndex={0}
              role="img"
              aria-label={b.detail}
              data-detail={b.detail}
            />
          ))}
          <rect className="hit-area" x={0} y={0} width={FRAME.width} height={FRAME.height} fill="transparent" pointerEvents="all" />
        </svg>

        <div className="overlay" aria-hidden="true">
          <span
            className="note"
            style={{ ...regs.annot, color: accent, ...noteAnchor(28), top: "3%" }}
          >
            {claimNote}
          </span>
          <span
            className="note"
            style={{ ...regs.annot, color: label, ...noteAnchor(pct(x(median), FRAME.width)), top: "22%" }}
          >
            {medianNote}
          </span>
        </div>

        <div className="x-axis">
          {xTicks.map((t) => (
            <span key={t} className="axis-label x" style={{ ...regs.axis, left: `${pct(x(t), FRAME.width)}%` }}>
              {t}
            </span>
          ))}
        </div>
      </div>

      <p className="chart-reading" style={{ ...regs.body, margin: "10px 0 0" }}>{reading}</p>
      <p className="chart-source" style={{ ...regs.body, margin: "6px 0 0" }}>{source}</p>
    </figure>
  );
}
