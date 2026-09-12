/**
 * Who held a place in the world's ten largest CO₂ emitters, and for how long, 1990–2024 — drawn as a
 * gantt THROUGH the design base and delivered as an interactive page.
 *
 * `an-open-span-says-it-is-open` — a span still running at the last year of the record does not end;
 * it is drawn open at its right edge, because a bar that stops where the DATA stops reads as an exit
 * that never happened.
 *
 * `both-dates-in-the-row-label` — every row states its own entry and exit years in words, so a reader
 * gets the span's arithmetic without measuring it against the axis.
 *
 * WHAT THE WEB ADDS. A gantt answers "how long" and refuses "how high": the whole point of reading
 * tenure rather than rank is that the vertical axis is no longer a position. So the reading a gantt
 * cannot give on paper — how far up the ranking a country actually got while it was there — is
 * exactly what every span answers here, along with its total years held and whether its tenure was
 * interrupted.
 */

import { mix, adjustToContrast, contrast, TEXT_CONTRAST_MIN, NON_TEXT_CONTRAST_MIN } from "#shared/chart-beat/colour.mjs";
import { webRegisters, figureVars, noteAnchor } from "#shared/design-base/web.mjs";

const ROW = 26;
export const FRAME = { width: 780, height: 0, xAxisRowPx: 26 };

export type Span = { from: number; to: number; open: boolean };
export type Row = {
  code: string;
  name: string;
  spans: Span[];
  years: number;
  tenureLabel: string;
  detail: string;
  whole: boolean;
};

const pct = (value: number, extent: number) => (value / extent) * 100;

export function DirectedGanttWeb({
  rows,
  years,
  xTicks,
  title,
  eyebrow,
  caveat,
  source,
  alt,
  reading,
  wholeNote,
  direction,
  ground,
  accent,
  ink,
  muted,
  grid,
}: {
  rows: Row[];
  years: number[];
  xTicks: number[];
  title: string;
  eyebrow: string;
  caveat: string;
  source: string;
  alt: string;
  reading: string;
  wholeNote: string;
  direction: any;
  ground: string;
  accent: string;
  ink: string;
  muted: string;
  grid: string;
}) {
  const regs = webRegisters(direction, { ink: { ink, muted, accent } });
  const height = rows.length * ROW;

  let partial = mix(ground, ink, 0.34);
  if (contrast(partial, ground) < NON_TEXT_CONTRAST_MIN)
    partial = adjustToContrast(partial, ground, NON_TEXT_CONTRAST_MIN) ?? partial;
  const label = adjustToContrast(ink, ground, TEXT_CONTRAST_MIN) ?? ink;

  const first = years[0];
  const last = years[years.length - 1];
  const x = (year: number) => ((year - first) / (last + 1 - first)) * FRAME.width;
  const cy = (i: number) => ROW * i + ROW / 2;
  const barH = ROW * 0.52;

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
          ["--y-gutter" as string]: "116px",
          ["--x-axis-h" as string]: `${FRAME.xAxisRowPx}px`,
          aspectRatio: `${FRAME.width + 116} / ${height + FRAME.xAxisRowPx}`,
        }}
      >
        <div className="y-axis" style={{ pointerEvents: "none" }}>
          {rows.map((r, i) => (
            <span
              key={r.code}
              className="axis-label y"
              style={{
                ...regs.axis,
                color: r.whole ? accent : (regs.axis.color as string),
                fontWeight: r.whole ? 700 : regs.axis.fontWeight,
                top: `${pct(cy(i), height)}%`,
                whiteSpace: "normal",
                lineHeight: 1.05,
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

          {xTicks.map((t) => (
            <line key={t} x1={x(t)} x2={x(t)} y1={0} y2={height} stroke={grid} strokeWidth={1} vectorEffect="non-scaling-stroke" />
          ))}

          {rows.map((r, i) =>
            r.spans.map((s) => (
              <g key={`${r.code}-${s.from}`}>
                <rect
                  x={x(s.from)}
                  y={cy(i) - barH / 2}
                  width={Math.max(2, x(s.to + 1) - x(s.from))}
                  height={barH}
                  fill={r.whole ? accent : partial}
                />
                {/* AN OPEN SPAN SAYS IT IS OPEN. Not a squared end at the edge of the record — a
                    notched one, so the bar reads as "still running" rather than "left in 2024". */}
                {s.open ? (
                  <path
                    d={
                      `M ${x(s.to + 1)} ${cy(i) - barH / 2} l 7 ${barH / 2} l -7 ${barH / 2} z`
                    }
                    fill={r.whole ? accent : partial}
                  />
                ) : null}
              </g>
            )),
          )}

          {rows.map((r, i) => (
            <circle
              key={r.code}
              className="pt"
              cx={(x(r.spans[0].from) + x(r.spans[r.spans.length - 1].to + 1)) / 2}
              cy={cy(i)}
              r={8}
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
            const endPct = pct(x(r.spans[r.spans.length - 1].to + 1), FRAME.width);
            const flip = endPct > 86;
            return (
              <span
                key={r.code}
                className="end-label"
                style={{
                  ...regs.value,
                  fontSize: `${Math.max(11, Number.parseFloat(regs.value.fontSize as string) - 3)}px`,
                  color: r.whole ? accent : label,
                  left: `${endPct}%`,
                  top: `${pct(cy(i), height)}%`,
                  transform: flip
                    ? "translate(-100%, -50%) translateX(-12px)"
                    : "translateY(-50%) translateX(12px)",
                  whiteSpace: "nowrap",
                }}
              >
                {r.tenureLabel}
              </span>
            );
          })}
        </div>

        <div className="x-axis">
          {xTicks.map((t) => (
            <span key={t} className="axis-label x" style={{ ...regs.axis, left: `${pct(x(t), FRAME.width)}%` }}>
              {t}
            </span>
          ))}
        </div>
      </div>

      {/* The note that names the accented group sits UNDER the plot, not in it: every row at the top
          of this frame is a full-width bar, so an overlay note there lands on a bar whatever its
          anchor. */}
      <p className="chart-reading" style={{ ...regs.annot, margin: "10px 0 0" }}>{wholeNote}</p>
      <p className="chart-reading" style={{ ...regs.body, margin: "4px 0 0" }}>{reading}</p>
      <p className="chart-source" style={{ ...regs.body, margin: "6px 0 0" }}>{source}</p>
    </figure>
  );
}
