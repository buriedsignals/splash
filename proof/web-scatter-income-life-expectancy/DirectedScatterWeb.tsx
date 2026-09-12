/**
 * Income against life expectancy across every country with both readings in 2021, drawn as a scatter
 * THROUGH the design base and delivered as an interactive page.
 *
 * `the-distribution-is-furniture-and-the-case-is-ink` — the claim here is about the SHAPE of the
 * whole cloud, so there is no named subject: every point is one neutral, and the only ink that
 * carries an argument is the threshold rule and the two band edges it names.
 *
 * THE X AXIS IS LOGARITHMIC AND SAYS SO IN WORDS. A log axis is the single most common silent lie in
 * this family: it makes a tenfold difference look like a step, and a reader who has not noticed the
 * ticks reads the flattening as steeper than it is. The caveat names it; the ticks are decades.
 *
 * WHAT THE WEB ADDS. A cloud of 165 points has room for two or three labels, and the rest are
 * anonymous — which is exactly right for a claim about the shape and exactly wrong for the reader's
 * next question, which is always "which one is that". Every point answers with its country, both of
 * its readings, its region and its population.
 */

import { mix, adjustToContrast, contrast, TEXT_CONTRAST_MIN, NON_TEXT_CONTRAST_MIN } from "#shared/chart-beat/colour.mjs";
import { webRegisters, figureVars, noteAnchor, fitY } from "#shared/design-base/web.mjs";

export const FRAME = { width: 880, height: 420, xAxisRowPx: 30 };

export type Point = { code: string; x: number; y: number; r: number; detail: string };

const pct = (value: number, extent: number) => (value / extent) * 100;

export function DirectedScatterWeb({
  points,
  xTicks,
  yTicks,
  threshold,
  thresholdNote,
  bandNote,
  band,
  title,
  eyebrow,
  caveat,
  source,
  alt,
  reading,
  direction,
  ground,
  accent,
  ink,
  muted,
  grid,
}: {
  points: Point[];
  xTicks: { value: number; label: string }[];
  yTicks: number[];
  threshold: number;
  thresholdNote: string;
  bandNote: string;
  band: { low: number; high: number };
  title: string;
  eyebrow: string;
  caveat: string;
  source: string;
  alt: string;
  reading: string;
  direction: any;
  ground: string;
  accent: string;
  ink: string;
  muted: string;
  grid: string;
}) {
  const regs = webRegisters(direction, { ink: { ink, muted, accent } });

  let dot = mix(ground, ink, 0.4);
  if (contrast(dot, ground) < NON_TEXT_CONTRAST_MIN)
    dot = adjustToContrast(dot, ground, NON_TEXT_CONTRAST_MIN) ?? dot;
  const rule = adjustToContrast(accent, ground, NON_TEXT_CONTRAST_MIN) ?? accent;
  const label = adjustToContrast(ink, ground, TEXT_CONTRAST_MIN) ?? ink;

  const xLo = Math.log10(xTicks[0].value);
  const xHi = Math.log10(xTicks[xTicks.length - 1].value);
  const x = (v: number) => ((Math.log10(v) - xLo) / (xHi - xLo)) * FRAME.width;
  const y = fitY(yTicks[0], yTicks[yTicks.length - 1], FRAME.height, 0.04);
  // Every mark inside its own frame, proven rather than trusted — the defect the first render had.
  for (const p of points) {
    if (p.x < xTicks[0].value || p.x > xTicks[xTicks.length - 1].value)
      throw new Error(`${p.code} draws x=${p.x}, outside ${xTicks[0].value}-${xTicks[xTicks.length - 1].value}`);
    if (p.y < yTicks[0] || p.y > yTicks[yTicks.length - 1])
      throw new Error(`${p.code} draws y=${p.y}, outside ${yTicks[0]}-${yTicks[yTicks.length - 1]}`);
  }

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
            <line key={`v${t.value}`} x1={x(t.value)} x2={x(t.value)} y1={0} y2={FRAME.height} stroke={grid} strokeWidth={1} vectorEffect="non-scaling-stroke" />
          ))}

          {/* The band the headline measures, drawn as a band rather than described. */}
          <rect
            x={x(threshold)}
            y={y(band.high)}
            width={FRAME.width - x(threshold)}
            height={y(band.low) - y(band.high)}
            fill={rule}
            fillOpacity={0.08}
          />
          <line x1={x(threshold)} x2={x(threshold)} y1={0} y2={FRAME.height} stroke={rule} strokeWidth={direction.stroke?.rule ? direction.stroke.rule * 1.6 : 1.4} strokeDasharray="5 4" vectorEffect="non-scaling-stroke" />

          {points.map((p) => (
            <circle
              key={p.code}
              className="pt"
              cx={x(p.x)}
              cy={y(p.y)}
              r={p.r}
              fill={dot}
              fillOpacity={0.6}
              stroke="none"
              tabIndex={0}
              role="img"
              aria-label={p.detail}
              data-detail={p.detail}
            />
          ))}
          <rect className="hit-area" x={0} y={0} width={FRAME.width} height={FRAME.height} fill="transparent" pointerEvents="all" />
        </svg>

        <div className="overlay" aria-hidden="true">
          <span
            className="note"
            style={{ ...regs.annot, color: label, ...noteAnchor(pct(x(threshold), FRAME.width)), top: "2%" }}
          >
            {thresholdNote}
          </span>
          <span
            className="note"
            style={{
              ...regs.annot,
              color: label,
              right: "0%",
              top: `${pct((y(band.low) + y(band.high)) / 2, FRAME.height)}%`,
              transform: "translateY(-50%)",
              maxWidth: "34%",
              whiteSpace: "normal",
            }}
          >
            {bandNote}
          </span>
        </div>

        <div className="x-axis" style={{ pointerEvents: "none" }}>
          {xTicks.map((t, i) => {
            const centre = pct(x(t.value), FRAME.width);
            const anchor =
              i === xTicks.length - 1
                ? { right: "0%", transform: "translateX(0)" }
                : i === 0
                  ? { left: "0%", transform: "translateX(0)" }
                  : { left: `${centre}%` };
            return (
              <span key={t.value} className="axis-label x" style={{ ...regs.axis, ...anchor }}>
                {t.label}
              </span>
            );
          })}
        </div>
      </div>

      <p className="chart-reading" style={{ ...regs.body, margin: "10px 0 0" }}>{reading}</p>
      <p className="chart-source" style={{ ...regs.body, margin: "6px 0 0" }}>{source}</p>
    </figure>
  );
}
