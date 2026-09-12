/**
 * Six countries' 2024 electricity mix drawn as a LEAN — fossil to the left, renewables to the right,
 * nuclear straddling the centre — THROUGH the design base, delivered as an interactive page.
 *
 * `the-neutral-straddles-the-centre` — this is the treatment the whole form turns on, and here the
 * neutral is not a judgement call: nuclear belongs to neither side BY DEFINITION (it is neither
 * fossil nor renewable), so it is drawn across the zero rather than assigned to a wing. A Likert
 * chart's "neither agree nor disagree" is exactly the same case.
 *
 * `name-each-half-in-words` — the two directions are named above the rows, because a reader who does
 * not already know which way is which cannot recover it from the bars.
 *
 * WHAT THE WEB ADDS. Three bands per country is three numbers; the mix they summarise is NINE. Every
 * row answers with the full breakdown — the three groups, and every source inside them that reaches
 * half a point — which is the question a three-way lean immediately raises and cannot answer.
 */

import { mix, adjustToContrast, contrast, TEXT_CONTRAST_MIN, NON_TEXT_CONTRAST_MIN } from "#shared/chart-beat/colour.mjs";
import { webRegisters, figureVars, noteAnchor } from "#shared/design-base/web.mjs";

const ROW = 54;
export const FRAME = { width: 860, height: 0, xAxisRowPx: 26 };

export type Row = {
  code: string;
  name: string;
  fossil: number;
  nuclear: number;
  renewable: number;
  labels: { fossil: string; nuclear: string; renewable: string };
  detail: string;
};

const pct = (value: number, extent: number) => (value / extent) * 100;

export function DirectedDivergingStackedWeb({
  rows,
  subject,
  xTicks,
  title,
  eyebrow,
  caveat,
  source,
  alt,
  reading,
  sideLabels,
  neutralLabel,
  direction,
  ground,
  accent,
  ink,
  muted,
  grid,
}: {
  rows: Row[];
  subject: string;
  xTicks: number[];
  title: string;
  eyebrow: string;
  caveat: string;
  source: string;
  alt: string;
  reading: string;
  sideLabels: { left: string; right: string };
  neutralLabel: string;
  direction: any;
  ground: string;
  accent: string;
  ink: string;
  muted: string;
  grid: string;
}) {
  const regs = webRegisters(direction, { ink: { ink, muted, accent } });
  const height = rows.length * ROW;

  // Three bands, one hue family, three strengths — the two wings are the direction's own accent at
  // two chromas and the neutral is a step off the ground. A second hue would make the neutral a
  // third category; it is not, it is the middle.
  let fossil = mix(ground, ink, 0.5);
  if (contrast(fossil, ground) < NON_TEXT_CONTRAST_MIN)
    fossil = adjustToContrast(fossil, ground, NON_TEXT_CONTRAST_MIN) ?? fossil;
  const renewable = accent;
  let neutral = mix(accent, ground, 0.55);
  if (contrast(neutral, ground) < NON_TEXT_CONTRAST_MIN)
    neutral = adjustToContrast(neutral, ground, NON_TEXT_CONTRAST_MIN) ?? neutral;
  const zeroInk = adjustToContrast(ink, ground, TEXT_CONTRAST_MIN) ?? ink;

  const centre = FRAME.width / 2;
  const x = (v: number) => centre + (v / 100) * (FRAME.width / 2);
  const barH = ROW * 0.42;

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

      <div style={{ display: "flex", flexWrap: "wrap", gap: "0 18px", margin: "10px 0 6px", flex: "0 0 auto" }}>
        {[
          { swatch: fossil, text: sideLabels.left },
          { swatch: neutral, text: neutralLabel },
          { swatch: renewable, text: sideLabels.right },
        ].map((k) => (
          <span key={k.text} style={{ ...regs.axis, display: "inline-flex", alignItems: "center", gap: 6 }}>
            <span style={{ width: 14, height: 14, background: k.swatch, display: "inline-block", borderRadius: 2 }} />
            {k.text}
          </span>
        ))}
      </div>

      <div
        className="chart-plot"
        style={{
          ["--y-gutter" as string]: "104px",
          ["--x-axis-h" as string]: `${FRAME.xAxisRowPx}px`,
          aspectRatio: `${FRAME.width + 104} / ${height + FRAME.xAxisRowPx}`,
        }}
      >
        <div className="y-axis">
          {rows.map((r, i) => (
            <span
              key={r.code}
              className="axis-label y"
              style={{
                ...regs.axis,
                color: r.code === subject ? accent : (regs.axis.color as string),
                fontWeight: r.code === subject ? 700 : regs.axis.fontWeight,
                top: `${pct(ROW * i + ROW / 2, height)}%`,
                whiteSpace: "normal",
              }}
            >
              {r.name}
            </span>
          ))}
        </div>

        <svg
          role="group"
          aria-label={title}
          xmlns="http://www.w3.org/2000/svg"
          className="chart"
          data-hit="cell"
          viewBox={`0 0 ${FRAME.width} ${height}`}
          preserveAspectRatio="none"
        >
          <desc>{alt}</desc>
          <rect x={0} y={0} width={FRAME.width} height={height} fill={ground} />

          {xTicks.filter((t) => t !== 0).map((t) => (
            <line key={t} x1={x(t)} x2={x(t)} y1={0} y2={height} stroke={grid} strokeWidth={1} vectorEffect="non-scaling-stroke" />
          ))}

          {rows.map((r, i) => {
            const cy = ROW * i + ROW / 2;
            const nucLeft = -r.nuclear / 2;
            const nucRight = r.nuclear / 2;
            return (
              <g key={r.code}>
                <rect x={x(nucLeft - r.fossil)} y={cy - barH / 2} width={Math.max(0, x(nucLeft) - x(nucLeft - r.fossil))} height={barH} fill={fossil} />
                <rect x={x(nucLeft)} y={cy - barH / 2} width={Math.max(0, x(nucRight) - x(nucLeft))} height={barH} fill={neutral} />
                <rect x={x(nucRight)} y={cy - barH / 2} width={Math.max(0, x(nucRight + r.renewable) - x(nucRight))} height={barH} fill={renewable} />
              </g>
            );
          })}

          <line x1={centre} x2={centre} y1={0} y2={height} stroke={zeroInk} strokeWidth={1.4} vectorEffect="non-scaling-stroke" />

          {rows.map((r, i) => (
            <circle
              key={r.code}
              className="pt"
              cx={centre}
              cy={ROW * i + ROW / 2}
              r={7}
              fill="transparent"
              stroke="none"
              tabIndex={0}
              role="img"
              aria-label={r.detail}
              data-detail={r.detail}
            />
          ))}
          <rect className="hit-area" x={0} y={0} width={FRAME.width} height={height} fill="transparent" pointerEvents="all" />
        </svg>

        <div className="overlay" aria-hidden="true">
          {rows.map((r, i) => {
            const cy = ROW * i + ROW / 2;
            const nucLeft = -r.nuclear / 2;
            const nucRight = r.nuclear / 2;
            const seat = (v: number, text: string, key: string, colour: string) => (
              <span
                key={key}
                className="end-label"
                style={{
                  ...regs.value,
                  fontSize: `${Math.max(11, Number.parseFloat(regs.value.fontSize as string) - 2)}px`,
                  color: colour,
                  left: `${pct(x(v), FRAME.width)}%`,
                  top: `${pct(cy + barH * 0.72, height)}%`,
                  transform: "translateX(-50%)",
                  background: "transparent",
                  padding: 0,
                }}
              >
                {text}
              </span>
            );
            const label = adjustToContrast(ink, ground, TEXT_CONTRAST_MIN) ?? ink;
            return (
              <span key={r.code}>
                {r.fossil >= 4 ? seat(nucLeft - r.fossil / 2, r.labels.fossil, `${r.code}-f`, label) : null}
                {r.nuclear >= 4 ? seat(0, r.labels.nuclear, `${r.code}-n`, label) : null}
                {r.renewable >= 4 ? seat(nucRight + r.renewable / 2, r.labels.renewable, `${r.code}-r`, label) : null}
              </span>
            );
          })}
        </div>

        <div className="x-axis">
          {xTicks.map((t) => (
            <span key={t} className="axis-label x" style={{ ...regs.axis, left: `${pct(x(t), FRAME.width)}%` }}>
              {t === 0 ? "0" : `${Math.abs(t)} %`}
            </span>
          ))}
        </div>
      </div>

      <p className="chart-reading" style={{ ...regs.body, margin: "10px 0 0" }}>
        {`← ${sideLabels.left} · ${neutralLabel} · ${sideLabels.right} →`}
      </p>
      <p className="chart-reading" style={{ ...regs.body, margin: "4px 0 0" }}>{reading}</p>
      <p className="chart-source" style={{ ...regs.body, margin: "6px 0 0" }}>{source}</p>
    </figure>
  );
}
