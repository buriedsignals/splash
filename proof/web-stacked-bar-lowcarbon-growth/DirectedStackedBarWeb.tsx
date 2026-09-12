/**
 * Sixteen European countries' low-carbon electricity in 2024, stacked by source, with each country's
 * 2000 total marked on its own bar — drawn THROUGH the design base and delivered as an interactive
 * page.
 *
 * `the-stack-gives-back-the-total-it-hides` — a stack's segments are easy to compare only at the
 * baseline; every one above it starts somewhere the reader cannot see. So each bar prints its own
 * total at its end, and that total is what the ranking is built on.
 *
 * `a-segment-not-starting-at-zero-carries-its-own-number` — every segment wide enough prints its own
 * TWh inside itself, because a segment that starts at 180 and ends at 240 is a length nobody can
 * read off an axis.
 *
 * THE EARLIER TOTAL IS A TICK ON THE BAR, NOT A SECOND BAR. What the headline is about is the
 * ADDITION, and an addition is the distance between a mark and the end of the bar it sits on.
 *
 * WHAT THE WEB ADDS. A stack hides its own arithmetic: seven segments, and a reader can compare the
 * first and guess at the rest. Every segment here answers with its source, its TWh, its share of that
 * country's low-carbon total, and how much of it was there in 2000 — the per-source history the plate
 * has no room for sixteen times over.
 */

import { mix, adjustToContrast, contrast, TEXT_CONTRAST_MIN, NON_TEXT_CONTRAST_MIN } from "#shared/chart-beat/colour.mjs";
import { webRegisters, figureVars } from "#shared/design-base/web.mjs";
import { inkOnFill } from "#shared/design-base/web.mjs";

const ROW = 30;
export const FRAME = { width: 820, height: 0, xAxisRowPx: 28 };
const RIGHT_GUTTER = 200;

export type Segment = { key: string; tone: number; from: number; to: number; label: string | null; detail: string };
export type Row = { code: string; name: string; total: number; before: number; totalLabel: string; segments: Segment[]; highlight: boolean };

const pct = (value: number, extent: number) => (value / extent) * 100;

export function DirectedStackedBarWeb({
  rows,
  tones,
  toneLabels,
  span,
  xTicks,
  beforeLabel,
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
  rows: Row[];
  tones: number;
  toneLabels: string[];
  span: number;
  xTicks: number[];
  beforeLabel: string;
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
  const height = rows.length * ROW;
  const plotRight = FRAME.width - RIGHT_GUTTER;

  const ramp = Array.from({ length: tones }, (_, i) => {
    const c = mix(ground, accent, 0.2 + ((tones - 1 - i) / (tones - 1)) * 0.8);
    return contrast(c, ground) < NON_TEXT_CONTRAST_MIN
      ? (adjustToContrast(c, ground, NON_TEXT_CONTRAST_MIN) ?? c)
      : c;
  });
  const label = adjustToContrast(ink, ground, TEXT_CONTRAST_MIN) ?? ink;
  const tick = adjustToContrast(ink, ground, TEXT_CONTRAST_MIN) ?? ink;

  const x = (v: number) => (v / span) * plotRight;
  const cy = (i: number) => ROW * i + ROW / 2;
  const barH = ROW * 0.62;

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

      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "0 12px", margin: "8px 0 4px", flex: "0 0 auto" }}>
        {toneLabels.map((t, i) => (
          <span key={t} style={{ ...regs.axis, display: "inline-flex", alignItems: "center", gap: 5 }}>
            <span style={{ width: 13, height: 13, background: ramp[i], display: "inline-block", borderRadius: 2 }} />
            {t}
          </span>
        ))}
        <span style={{ ...regs.axis, display: "inline-flex", alignItems: "center", gap: 5 }}>
          <span style={{ width: 2, height: 14, background: tick, display: "inline-block" }} />
          {beforeLabel}
        </span>
      </div>

      <div
        className="chart-plot"
        style={{
          ["--y-gutter" as string]: "92px",
          ["--x-axis-h" as string]: `${FRAME.xAxisRowPx}px`,
          aspectRatio: `${FRAME.width + 92} / ${height + FRAME.xAxisRowPx}`,
        }}
      >
        <div className="y-axis" style={{ pointerEvents: "none" }}>
          {rows.map((r, i) => (
            <span
              key={r.code}
              className="axis-label y"
              style={{
                ...regs.axis,
                color: r.highlight ? accent : (regs.axis.color as string),
                fontWeight: r.highlight ? 700 : regs.axis.fontWeight,
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

          {xTicks.filter((t) => t > 0).map((t) => (
            <line key={t} x1={x(t)} x2={x(t)} y1={0} y2={height} stroke={grid} strokeWidth={1} vectorEffect="non-scaling-stroke" />
          ))}

          {rows.map((r, i) =>
            r.segments.map((s) => (
              <rect
                key={`${r.code}-${s.key}`}
                x={x(s.from)}
                y={cy(i) - barH / 2}
                width={Math.max(0.6, x(s.to) - x(s.from))}
                height={barH}
                fill={ramp[s.tone]}
                stroke={ground}
                strokeWidth={0.6}
                vectorEffect="non-scaling-stroke"
              />
            )),
          )}

          {/* The earlier total, as a tick ON the bar: the addition is the distance from here to the
              end, which is what the headline is about. */}
          {rows.map((r, i) => (
            <line
              key={`b-${r.code}`}
              x1={x(r.before)}
              x2={x(r.before)}
              y1={cy(i) - barH * 0.8}
              y2={cy(i) + barH * 0.8}
              stroke={tick}
              strokeWidth={2}
              vectorEffect="non-scaling-stroke"
            />
          ))}

          {rows.flatMap((r, i) =>
            r.segments.map((s) => (
              <circle
                key={`hit-${r.code}-${s.key}`}
                className="pt"
                cx={(x(s.from) + x(s.to)) / 2}
                cy={cy(i)}
                r={Math.max(3, Math.min(10, (x(s.to) - x(s.from)) / 2))}
                fill="transparent"
                stroke="none"
                tabIndex={0}
                role="img"
                aria-label={s.detail}
                data-detail={s.detail}
              />
            )),
          )}
          <rect className="hit-area" x={0} y={0} width={FRAME.width} height={height} fill="transparent" pointerEvents="all" />
        </svg>

        <div className="overlay" aria-hidden="true">
          {rows.map((r, i) => (
            <span key={r.code}>
              <span
                className="end-label"
                style={{
                  ...regs.value,
                  color: r.highlight ? accent : label,
                  left: `${pct(plotRight + 10, FRAME.width)}%`,
                  top: `${pct(cy(i), height)}%`,
                  transform: "translateY(-50%)",
                  whiteSpace: "normal",
                  maxWidth: `${(RIGHT_GUTTER / FRAME.width) * 100}%`,
                  lineHeight: 1.1,
                }}
              >
                {r.totalLabel}
              </span>
              {r.segments.filter((s) => s.label !== null).map((s) => (
                <span
                  key={`sl-${s.key}`}
                  className="end-label"
                  style={{
                    ...regs.value,
                    fontSize: `${Math.max(10, Number.parseFloat(regs.value.fontSize as string) - 4)}px`,
                    color: inkOnFill(ramp[s.tone], { ink, ground }, contrast, adjustToContrast, TEXT_CONTRAST_MIN),
                    left: `${pct((x(s.from) + x(s.to)) / 2, FRAME.width)}%`,
                    top: `${pct(cy(i), height)}%`,
                    transform: "translate(-50%, -50%)",
                    background: "transparent",
                    padding: 0,
                  }}
                >
                  {s.label}
                </span>
              ))}
            </span>
          ))}
        </div>

        <div className="x-axis" style={{ pointerEvents: "none" }}>
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
