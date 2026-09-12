/**
 * Sixteen European countries between 2000 and 2024, each an arrow in a space whose two axes are two
 * INDEPENDENT shares — how clean a country's own electricity is, and how much of Europe's low-carbon
 * total it carries. Drawn THROUGH the design base and delivered as an interactive page.
 *
 * THE TWO AXES ARE NOT THE SAME QUANTITY TWICE, and that is the whole reason this form is here: a
 * country can move RIGHT (cleaner at home) and DOWN (a smaller share of the continent's low-carbon
 * electricity) in the same quarter century, because the others cleaned up faster. An arrow makes that
 * one gesture; two bar charts make it two facts a reader has to join.
 *
 * `the-connector-is-either-furniture-or-the-mark` — here the connector IS the mark. The segment
 * between a country's two states carries the argument, so it is drawn in ink weight with a head, not
 * as a hairline between two dots.
 *
 * WHAT THE WEB ADDS. Sixteen arrows crossing one another leave room for perhaps three labels. Every
 * endpoint here answers with its country, both of its shares at both dates, and the absolute
 * low-carbon generation behind them — the quantity two shares can never state between them.
 *
 * The pointer resolves in BOTH axes (`data-hit="cell"`): thirty-two endpoints scattered over a plane
 * are not a series, and an x-only answer would name the wrong country.
 */

import { mix, adjustToContrast, contrast, TEXT_CONTRAST_MIN, NON_TEXT_CONTRAST_MIN } from "#shared/chart-beat/colour.mjs";
import { webRegisters, figureVars, noteAnchor, fitY } from "#shared/design-base/web.mjs";

export const FRAME = { width: 820, height: 460, xAxisRowPx: 32 };

export type Arrow = {
  code: string;
  name: string;
  from: { x: number; y: number; detail: string };
  to: { x: number; y: number; detail: string };
  label: boolean;
};

const pct = (value: number, extent: number) => (value / extent) * 100;

export function DirectedConnectedScatterWeb({
  arrows,
  subject,
  xTicks,
  yTicks,
  xLabel,
  yLabel,
  title,
  eyebrow,
  caveat,
  source,
  alt,
  reading,
  notes,
  direction,
  ground,
  accent,
  ink,
  muted,
  grid,
}: {
  arrows: Arrow[];
  subject: string;
  xTicks: number[];
  yTicks: number[];
  xLabel: string;
  yLabel: string;
  title: string;
  eyebrow: string;
  caveat: string;
  source: string;
  alt: string;
  reading: string;
  notes: { code: string; text: string }[];
  direction: any;
  ground: string;
  accent: string;
  ink: string;
  muted: string;
  grid: string;
}) {
  const regs = webRegisters(direction, { ink: { ink, muted, accent } });

  let other = mix(ground, ink, 0.4);
  if (contrast(other, ground) < NON_TEXT_CONTRAST_MIN)
    other = adjustToContrast(other, ground, NON_TEXT_CONTRAST_MIN) ?? other;

  const xFloor = xTicks[0];
  const xTop = xTicks[xTicks.length - 1];
  const x = (v: number) => ((v - xFloor) / (xTop - xFloor)) * FRAME.width;
  const y = fitY(yTicks[0], yTicks[yTicks.length - 1], FRAME.height);
  // Every mark inside its own frame, proven rather than trusted.
  for (const a of arrows)
    for (const p of [a.from, a.to]) {
      if (p.x < xFloor || p.x > xTop) throw new Error(`${a.name} draws x=${p.x}, outside ${xFloor}-${xTop}`);
      if (p.y < yTicks[0] || p.y > yTicks[yTicks.length - 1])
        throw new Error(`${a.name} draws y=${p.y}, outside ${yTicks[0]}-${yTicks[yTicks.length - 1]}`);
    }

  const marks = arrows.flatMap((a) => [
    { code: `${a.code}-from`, cx: x(a.from.x), cy: y(a.from.y), detail: a.from.detail },
    { code: `${a.code}-to`, cx: x(a.to.x), cy: y(a.to.y), detail: a.to.detail },
  ]);

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
          ["--y-gutter" as string]: "48px",
          ["--x-axis-h" as string]: `${FRAME.xAxisRowPx}px`,
          aspectRatio: `${FRAME.width + 48} / ${FRAME.height + FRAME.xAxisRowPx}`,
        }}
      >
        <div className="y-axis">
          {yTicks.map((t) => (
            <span key={t} className="axis-label y" style={{ ...regs.axis, top: `${pct(y(t), FRAME.height)}%` }}>
              {`${t} %`}
            </span>
          ))}
        </div>

        <svg
          role="group"
          aria-label={title}
          xmlns="http://www.w3.org/2000/svg"
          className="chart"
          data-hit="cell"
          viewBox={`0 0 ${FRAME.width} ${FRAME.height}`}
          preserveAspectRatio="none"
        >
          <desc>{alt}</desc>
          <rect x={0} y={0} width={FRAME.width} height={FRAME.height} fill={ground} />

          {yTicks.map((t) => (
            <line key={`h${t}`} x1={0} x2={FRAME.width} y1={y(t)} y2={y(t)} stroke={grid} strokeWidth={1} vectorEffect="non-scaling-stroke" />
          ))}
          {xTicks.map((t) => (
            <line key={`v${t}`} x1={x(t)} x2={x(t)} y1={0} y2={FRAME.height} stroke={grid} strokeWidth={1} vectorEffect="non-scaling-stroke" />
          ))}

          <defs>
            <marker id="cs-head-other" viewBox="0 0 8 8" refX={6} refY={4} markerWidth={6} markerHeight={6} orient="auto">
              <path d="M 0 0 L 8 4 L 0 8 z" fill={other} />
            </marker>
            <marker id="cs-head-subject" viewBox="0 0 8 8" refX={6} refY={4} markerWidth={6} markerHeight={6} orient="auto">
              <path d="M 0 0 L 8 4 L 0 8 z" fill={accent} />
            </marker>
          </defs>

          {arrows.map((a) => {
            const isSubject = a.code === subject;
            return (
              <g key={a.code}>
                <circle cx={x(a.from.x)} cy={y(a.from.y)} r={3} fill={ground} stroke={isSubject ? accent : other} strokeWidth={1.4} vectorEffect="non-scaling-stroke" />
                <line
                  x1={x(a.from.x)}
                  y1={y(a.from.y)}
                  x2={x(a.to.x)}
                  y2={y(a.to.y)}
                  stroke={isSubject ? accent : other}
                  strokeWidth={isSubject ? (direction.stroke?.series ?? 2.4) : 1.5}
                  markerEnd={`url(#cs-head-${isSubject ? "subject" : "other"})`}
                  vectorEffect="non-scaling-stroke"
                />
              </g>
            );
          })}

          {marks.map((m) => (
            <circle
              key={m.code}
              className="pt"
              cx={m.cx}
              cy={m.cy}
              r={7}
              fill="transparent"
              stroke="none"
              tabIndex={0}
              role="img"
              aria-label={m.detail}
              data-detail={m.detail}
            />
          ))}
          <rect className="hit-area" x={0} y={0} width={FRAME.width} height={FRAME.height} fill="transparent" pointerEvents="all" />
        </svg>

        <div className="overlay" aria-hidden="true">
          {arrows.filter((a) => a.label).map((a) => (
            <span
              key={a.code}
              className="end-label"
              style={{
                ...regs.value,
                color: a.code === subject ? accent : adjustToContrast(ink, ground, TEXT_CONTRAST_MIN) ?? ink,
                ...noteAnchor(pct(x(a.to.x), FRAME.width)),
                top: `${pct(y(a.to.y), FRAME.height)}%`,
                transform: `${noteAnchor(pct(x(a.to.x), FRAME.width)).transform} translateY(-140%)`,
              }}
            >
              {a.name}
            </span>
          ))}
          {notes.map((n) => {
            const a = arrows.find((z) => z.code === n.code)!;
            return (
              <span
                key={n.code}
                className="note"
                style={{
                  ...regs.annot,
                  ...noteAnchor(pct(x(a.to.x), FRAME.width)),
                  top: `${pct(y(a.to.y), FRAME.height)}%`,
                  transform: `${noteAnchor(pct(x(a.to.x), FRAME.width)).transform} translateY(40%)`,
                }}
              >
                {n.text}
              </span>
            );
          })}
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
        {`${yLabel} ↑ · ${xLabel} →`}
      </p>
      <p className="chart-reading" style={{ ...regs.body, margin: "4px 0 0" }}>{reading}</p>
      <p className="chart-source" style={{ ...regs.body, margin: "6px 0 0" }}>{source}</p>
    </figure>
  );
}
