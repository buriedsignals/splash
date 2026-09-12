/**
 * Sixteen European countries on two ruled strips — the low-carbon share of their electricity in 2000
 * and in 2024 — drawn THROUGH the design base and delivered as an interactive page.
 *
 * WHAT A DOT STRIP IS FOR, AND WHAT IT REFUSES. It draws a DISTRIBUTION as positions on one rail:
 * where the floor is, where the ceiling is, how tight the middle is. It refuses to draw the
 * trajectory of any one country — that is a slope chart's job, and a dot strip that grows connecting
 * lines has become one. So the two rails are read as two SHAPES, and the movement of a single
 * country is a reading the pointer gives, never a line the page draws.
 *
 * `each-rail-is-headed-by-what-it-is` — each strip carries its own date, its own floor, its own
 * median and its own ceiling as printed numbers, so the two shapes can be compared without counting
 * chips.
 *
 * WHAT THE WEB ADDS. Sixteen chips on a rail, several of them overlapping, leave room for two or
 * three names. Every chip here answers with its country, its share on THIS rail, its share on the
 * other, and its rank on both — the four readings that turn a shape back into countries.
 */

import { mix, adjustToContrast, contrast, TEXT_CONTRAST_MIN, NON_TEXT_CONTRAST_MIN } from "#shared/chart-beat/colour.mjs";
import { webRegisters, figureVars, noteAnchor } from "#shared/design-base/web.mjs";

export const FRAME = { width: 880, height: 260, xAxisRowPx: 28 };

export type Chip = {
  code: string;
  name: string;
  value: number;
  row: number;
  detail: string;
};

export type Rail = {
  key: string;
  heading: string;
  floor: { value: number; label: string };
  median: { value: number; label: string };
  ceiling: { value: number; label: string };
  chips: Chip[];
};

const pct = (value: number, extent: number) => (value / extent) * 100;

export function DirectedDotStripWeb({
  rails,
  subject,
  xTicks,
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
  rails: Rail[];
  subject: string;
  xTicks: number[];
  title: string;
  eyebrow: string;
  caveat: string;
  source: string;
  alt: string;
  reading: string;
  notes: { rail: string; code: string; text: string }[];
  direction: any;
  ground: string;
  accent: string;
  ink: string;
  muted: string;
  grid: string;
}) {
  const regs = webRegisters(direction, { ink: { ink, muted, accent } });

  let chipInk = mix(ground, ink, 0.42);
  if (contrast(chipInk, ground) < NON_TEXT_CONTRAST_MIN)
    chipInk = adjustToContrast(chipInk, ground, NON_TEXT_CONTRAST_MIN) ?? chipInk;
  const rule = mix(ground, ink, 0.55);
  const label = adjustToContrast(ink, ground, TEXT_CONTRAST_MIN) ?? ink;

  const x = (v: number) => (v / 100) * FRAME.width;
  const railH = FRAME.height / rails.length;
  const railY = (i: number) => railH * i + railH * 0.62;
  const R = 6.5;

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
          data-hit="cell"
          viewBox={`0 0 ${FRAME.width} ${FRAME.height}`}
          preserveAspectRatio="none"
        >
          <desc>{alt}</desc>
          <rect x={0} y={0} width={FRAME.width} height={FRAME.height} fill={ground} />

          {xTicks.map((t) => (
            <line key={t} x1={x(t)} x2={x(t)} y1={0} y2={FRAME.height} stroke={grid} strokeWidth={1} vectorEffect="non-scaling-stroke" />
          ))}

          {rails.map((rail, i) => (
            <g key={rail.key}>
              <line x1={0} x2={FRAME.width} y1={railY(i)} y2={railY(i)} stroke={rule} strokeWidth={1} vectorEffect="non-scaling-stroke" />
              {/* The rail's own three statistics, drawn as ticks on the rail itself. */}
              {[rail.floor, rail.median, rail.ceiling].map((s) => (
                <line
                  key={s.label}
                  x1={x(s.value)}
                  x2={x(s.value)}
                  y1={railY(i) - 22}
                  y2={railY(i) + 10}
                  stroke={rule}
                  strokeWidth={direction.stroke?.rule ?? 0.8}
                  strokeDasharray="3 3"
                  vectorEffect="non-scaling-stroke"
                />
              ))}
              {rail.chips.map((c) => (
                <circle
                  key={c.code}
                  cx={x(c.value)}
                  cy={railY(i) - c.row * (R * 1.7)}
                  r={R}
                  fill={c.code === subject ? accent : chipInk}
                  fillOpacity={c.code === subject ? 1 : 0.85}
                  stroke={ground}
                  strokeWidth={1}
                  vectorEffect="non-scaling-stroke"
                />
              ))}
            </g>
          ))}

          {rails.flatMap((rail, i) =>
            rail.chips.map((c) => (
              <circle
                key={`${rail.key}-${c.code}`}
                className="pt"
                cx={x(c.value)}
                cy={railY(i) - c.row * (R * 1.7)}
                r={R}
                fill="transparent"
                stroke="none"
                tabIndex={0}
                role="img"
                aria-label={c.detail}
                data-detail={c.detail}
              />
            )),
          )}
          <rect className="hit-area" x={0} y={0} width={FRAME.width} height={FRAME.height} fill="transparent" pointerEvents="all" />
        </svg>

        <div className="overlay" aria-hidden="true">
          {rails.map((rail, i) => (
            <span key={rail.key}>
              <span
                className="note"
                style={{
                  ...regs.annot,
                  color: label,
                  // ABOVE its own rail. Below it, the date and the rail's own floor statistic are
                  // both anchored at 0 % and printed one on top of the other — measured on the
                  // first render, where "2000" read as "20".
                  left: "0%",
                  top: `${pct(railY(i) - 40, FRAME.height)}%`,
                  background: "transparent",
                  padding: 0,
                  fontWeight: 700,
                }}
              >
                {rail.heading}
              </span>
              {[rail.floor, rail.median, rail.ceiling].map((s) => (
                <span
                  key={s.label}
                  className="end-label"
                  style={{
                    ...regs.value,
                    fontSize: `${Math.max(11, Number.parseFloat(regs.value.fontSize as string) - 3)}px`,
                    color: label,
                    ...noteAnchor(pct(x(s.value), FRAME.width)),
                    top: `${pct(railY(i) + 12, FRAME.height)}%`,
                  }}
                >
                  {s.label}
                </span>
              ))}
            </span>
          ))}
          {notes.map((n) => {
            const i = rails.findIndex((r) => r.key === n.rail);
            const c = rails[i].chips.find((z) => z.code === n.code)!;
            return (
              <span
                key={`${n.rail}-${n.code}`}
                className="note"
                style={{
                  ...regs.annot,
                  color: accent,
                  ...noteAnchor(pct(x(c.value), FRAME.width)),
                  top: `${pct(railY(i) - c.row * (R * 1.7) - R * 2, FRAME.height)}%`,
                  transform: `${noteAnchor(pct(x(c.value), FRAME.width)).transform} translateY(-100%)`,
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

      <p className="chart-reading" style={{ ...regs.body, margin: "10px 0 0" }}>{reading}</p>
      <p className="chart-source" style={{ ...regs.body, margin: "6px 0 0" }}>{source}</p>
    </figure>
  );
}
