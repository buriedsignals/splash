/**
 * The change in CO₂ per person of the 27 EU member states between 1990 and 2024, drawn as a diverging
 * bar THROUGH the design base and delivered as an interactive page.
 *
 * `sign-is-direction-and-hue-only-doubles-it` — the SIDE of the zero line carries the sign. Colour is
 * allowed to say the same thing a second time, and it does, but a reader who cannot separate the two
 * hues still reads the chart correctly, because direction is the primary channel.
 *
 * `the-neutral-straddles-the-centre` — the zero rule is drawn in ink over the bars, not under them:
 * it is the only line on this page a reader measures against, and a bar crossing it would hide it.
 *
 * WHAT THE WEB ADDS. A diverging bar draws a DIFFERENCE, and a difference hides both of the numbers
 * it came from: a fall of five tonnes could be 25 → 20 or 7 → 2. Every row here answers with both
 * endpoints, the change, and where the country sits in the ranking of falls — three readings the
 * plate has no room for beside twenty-seven names.
 */

import { mix, adjustToContrast, contrast, TEXT_CONTRAST_MIN, NON_TEXT_CONTRAST_MIN } from "#shared/chart-beat/colour.mjs";
import { webRegisters, figureVars, noteAnchor } from "#shared/design-base/web.mjs";

const ROW = 21;
export const FRAME = { width: 720, height: 0, xAxisRowPx: 26 };

export type Row = {
  code: string;
  name: string;
  change: number;
  label: string;
  detail: string;
};

const pct = (value: number, extent: number) => (value / extent) * 100;

export function DirectedDivergingBarWeb({
  rows,
  subject,
  xTicks,
  span,
  title,
  eyebrow,
  caveat,
  source,
  alt,
  reading,
  sideLabels,
  subjectNote,
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
  span: number;
  title: string;
  eyebrow: string;
  caveat: string;
  source: string;
  alt: string;
  reading: string;
  sideLabels: { left: string; right: string };
  subjectNote: string;
  direction: any;
  ground: string;
  accent: string;
  ink: string;
  muted: string;
  grid: string;
}) {
  const regs = webRegisters(direction, { ink: { ink, muted, accent } });
  const height = rows.length * ROW;

  let fall = mix(ground, ink, 0.42);
  if (contrast(fall, ground) < NON_TEXT_CONTRAST_MIN)
    fall = adjustToContrast(fall, ground, NON_TEXT_CONTRAST_MIN) ?? fall;
  const rise = accent;
  const zeroInk = adjustToContrast(ink, ground, TEXT_CONTRAST_MIN) ?? ink;

  const centre = FRAME.width / 2;
  const x = (v: number) => centre + (v / span) * (FRAME.width / 2);
  const barH = ROW * 0.62;
  for (const r of rows)
    if (Math.abs(r.change) > span)
      throw new Error(`${r.name} changes by ${r.change}, past the ±${span} this frame draws`);

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
          ["--y-gutter" as string]: "132px",
          ["--x-axis-h" as string]: `${FRAME.xAxisRowPx}px`,
          aspectRatio: `${FRAME.width + 132} / ${height + FRAME.xAxisRowPx}`,
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
                lineHeight: 1.1,
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
            const isSubject = r.code === subject;
            const from = Math.min(x(0), x(r.change));
            return (
              <rect
                key={r.code}
                x={from}
                y={cy - barH / 2}
                width={Math.max(1.2, Math.abs(x(r.change) - x(0)))}
                height={barH}
                fill={isSubject ? rise : fall}
              />
            );
          })}

          {/* The zero rule, OVER the bars: it is the only line a reader measures against here. */}
          <line x1={centre} x2={centre} y1={0} y2={height} stroke={zeroInk} strokeWidth={1.4} vectorEffect="non-scaling-stroke" />

          {rows.map((r, i) => (
            <circle
              key={r.code}
              className="pt"
              cx={x(r.change)}
              cy={ROW * i + ROW / 2}
              r={6}
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
          {rows.map((r, i) => (
            <span
              key={r.code}
              className="end-label"
              style={{
                ...regs.value,
                fontSize: `${Math.max(11, Number.parseFloat(regs.value.fontSize as string) - 2)}px`,
                color: r.code === subject ? accent : adjustToContrast(ink, ground, TEXT_CONTRAST_MIN) ?? ink,
                left: `${pct(x(r.change), FRAME.width)}%`,
                top: `${pct(ROW * i + ROW / 2, height)}%`,
                transform:
                  r.change >= 0
                    ? "translateY(-50%) translateX(6px)"
                    : "translate(-100%, -50%) translateX(-6px)",
              }}
            >
              {r.label}
            </span>
          ))}
          <span
            className="note"
            style={{
              ...regs.annot,
              // INSIDE the plot box, not above it. A label lifted out of the svg's own rectangle
              // sits over the figure's padding, where the hit area cannot answer for it — measured
              // by the format's own "pointing at the overlay still resolves to a reading" check,
              // which went silent at two viewports.
              // On the EMPTY side, where it is the only thing to read: the subject's own row is at
              // the top of the frame and a note over the zero line landed on that row's own value.
              ...noteAnchor(70),
              top: "1%",
            }}
          >
            {subjectNote}
          </span>
        </div>

        <div className="x-axis">
          {xTicks.map((t) => (
            <span key={t} className="axis-label x" style={{ ...regs.axis, left: `${pct(x(t), FRAME.width)}%` }}>
              {t === 0 ? "0" : `${t > 0 ? "+" : "−"}${Math.abs(t)}`}
            </span>
          ))}
        </div>
      </div>

      <p className="chart-reading" style={{ ...regs.body, margin: "10px 0 0" }}>
        {`← ${sideLabels.left} · ${sideLabels.right} →`}
      </p>
      <p className="chart-reading" style={{ ...regs.body, margin: "4px 0 0" }}>{reading}</p>
      <p className="chart-source" style={{ ...regs.body, margin: "6px 0 0" }}>{source}</p>
    </figure>
  );
}
