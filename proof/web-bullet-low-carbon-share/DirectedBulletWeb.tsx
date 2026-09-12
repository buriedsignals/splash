/**
 * Low-carbon electricity as a share of six countries' own generation, 2015 against 2024, drawn as
 * bullets THROUGH the design base and delivered as an interactive page.
 *
 * `the-track-runs-the-full-scale-so-the-remainder-is-legible` — every track runs the full 0–100 %,
 * because the remainder is the reading a bare bar cannot give, and here the remainder IS the story.
 *
 * `two-states-of-one-measure-are-one-hue-at-two-chromas` — the 2015 share is not a target and no
 * policy is being scored: it is the same measure at an earlier date, so it is a tick in a tint of
 * the same accent, never a second hue and never a "goal" marker.
 *
 * `the-verdict-is-written-as-a-derived-number` — the change in points is printed on the row rather
 * than left as a subtraction between two marks.
 *
 * WHAT THE WEB ADDS. A bullet compresses a whole generation mix into one share, and the share is all
 * the plate can show. The frozen file carries the nine sources that share was computed FROM, so
 * every row here answers with them: which sources make up the low-carbon share, in order, with their
 * own percentages. That is the question a bullet raises and cannot answer on paper.
 */

import { mix, adjustToContrast, contrast, TEXT_CONTRAST_MIN, NON_TEXT_CONTRAST_MIN } from "#shared/chart-beat/colour.mjs";
import { webRegisters, figureVars } from "#shared/design-base/web.mjs";

export const FRAME = { width: 880, height: 300, xAxisRowPx: 28 };

export type Row = {
  code: string;
  name: string;
  before: number;
  after: number;
  change: number;
  afterLabel: string;
  beforeLabel: string;
  changeLabel: string;
  detail: string;
};

const pct = (value: number, extent: number) => (value / extent) * 100;

export function DirectedBulletWeb({
  rows,
  subject,
  threshold,
  thresholdNote,
  xTicks,
  title,
  eyebrow,
  caveat,
  source,
  alt,
  reading,
  stateLabels,
  direction,
  ground,
  accent,
  ink,
  muted,
  grid,
}: {
  rows: Row[];
  subject: string;
  threshold: number;
  thresholdNote: string;
  xTicks: number[];
  title: string;
  eyebrow: string;
  caveat: string;
  source: string;
  alt: string;
  reading: string;
  stateLabels: { before: string; after: string };
  direction: any;
  ground: string;
  accent: string;
  ink: string;
  muted: string;
  grid: string;
}) {
  const regs = webRegisters(direction, { ink: { ink, muted, accent } });

  let track = mix(ground, ink, 0.14);
  const trackEdge = mix(ground, ink, 0.3);
  let tint = mix(accent, ground, 0.55);
  if (contrast(tint, ground) < NON_TEXT_CONTRAST_MIN)
    tint = adjustToContrast(tint, ground, NON_TEXT_CONTRAST_MIN) ?? tint;
  const rule = mix(ground, ink, 0.6);

  // The first row's own NAME sits above its track, so the band of rows starts below the top of the
  // frame — measured on the first render, where "Pologne" landed on the caveat line above the plot.
  const TOP_PAD = 24;
  const rowH = (FRAME.height - TOP_PAD) / rows.length;
  const barH = rowH * 0.34;
  const cyOf = (i: number) => TOP_PAD + rowH * i + rowH / 2;
  const x = (share: number) => (share / 100) * FRAME.width;

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
          ["--y-gutter" as string]: "0px",
          ["--x-axis-h" as string]: `${FRAME.xAxisRowPx}px`,
          aspectRatio: `${FRAME.width} / ${FRAME.height + FRAME.xAxisRowPx}`,
        }}
      >
        <div className="y-axis" />
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

          {rows.map((r, i) => {
            const cy = cyOf(i);
            const isSubject = r.code === subject;
            return (
              <g key={r.code}>
                {/* the full scale, so the remainder is legible */}
                <rect x={0} y={cy - barH / 2} width={FRAME.width} height={barH} fill={track} />
                <rect x={0} y={cy - barH / 2} width={FRAME.width} height={barH} fill="none" stroke={trackEdge} strokeWidth={0.6} vectorEffect="non-scaling-stroke" />
                {/* the measure */}
                <rect x={0} y={cy - barH / 2} width={x(r.after)} height={barH} fill={isSubject ? accent : tint} />
                {/* the comparative state: the same measure at an earlier date */}
                <line
                  x1={x(r.before)}
                  x2={x(r.before)}
                  y1={cy - barH * 0.78}
                  y2={cy + barH * 0.78}
                  stroke={isSubject ? ink : rule}
                  strokeWidth={2}
                  vectorEffect="non-scaling-stroke"
                />
              </g>
            );
          })}

          {/* The threshold the headline names, drawn once across every row. */}
          <line
            x1={x(threshold)}
            x2={x(threshold)}
            y1={0}
            y2={FRAME.height}
            stroke={rule}
            strokeWidth={direction.stroke?.rule ?? 0.8}
            strokeDasharray="5 4"
            vectorEffect="non-scaling-stroke"
          />

          {rows.map((r, i) => (
            <circle
              key={r.code}
              className="pt"
              cx={x(r.after)}
              cy={cyOf(i)}
              r={6}
              fill="transparent"
              stroke="none"
              tabIndex={0}
              role="img"
              aria-label={`${r.name} : ${r.detail}`}
              data-detail={`${r.name} · ${r.detail}`}
            />
          ))}
          <rect className="hit-area" x={0} y={0} width={FRAME.width} height={FRAME.height} fill="transparent" pointerEvents="all" />
        </svg>

        <div className="overlay" aria-hidden="true">
          {rows.map((r, i) => {
            const cy = cyOf(i);
            const isSubject = r.code === subject;
            return (
              <span key={r.code}>
                <span
                  className="note"
                  style={{
                    ...regs.axis,
                    color: isSubject ? accent : (regs.axis.color as string),
                    fontWeight: isSubject ? 700 : regs.axis.fontWeight,
                    left: "0%",
                    top: `${pct(cy - barH, FRAME.height)}%`,
                    transform: "translateY(-100%)",
                    background: "transparent",
                    padding: 0,
                  }}
                >
                  {r.name}
                </span>
                <span
                  className="end-label"
                  style={{
                    ...regs.value,
                    color: isSubject ? accent : adjustToContrast(ink, ground, TEXT_CONTRAST_MIN) ?? ink,
                    left: `${pct(x(r.after), FRAME.width)}%`,
                    top: `${pct(cy, FRAME.height)}%`,
                    transform: r.after > 80 ? "translate(-100%, -50%) translateX(-8px)" : "translateX(8px) translateY(-50%)",
                  }}
                >
                  {`${r.afterLabel} · ${r.changeLabel}`}
                </span>
              </span>
            );
          })}
          {/* The rule's own name, at its TOP — not at its foot, where it landed on the axis's own
              "50 %" tick and printed the same number twice. A threshold is named in words here
              because the axis already gives the number. */}
          <span
            className="note"
            style={{
              ...regs.annot,
              left: `${pct(x(threshold), FRAME.width)}%`,
              top: "0%",
              transform: "translate(-50%, -100%)",
            }}
          >
            {thresholdNote}
          </span>
        </div>

        <div className="x-axis">
          {xTicks.map((t) => (
            <span key={t} className="axis-label x" style={{ ...regs.axis, left: `${pct(x(t), FRAME.width)}%` }}>
              {`${t} %`}
            </span>
          ))}
        </div>
      </div>

      <p className="chart-reading" style={{ ...regs.body, margin: "10px 0 0" }}>
        {reading}
      </p>
      <p className="chart-source" style={{ ...regs.body, margin: "6px 0 0" }}>{source}</p>
    </figure>
  );
}
