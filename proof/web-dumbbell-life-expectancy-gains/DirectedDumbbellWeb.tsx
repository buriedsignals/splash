/**
 * Ten countries' life expectancy in 2000 and 2023, drawn as dumbbells THROUGH the design base and
 * delivered as an interactive page.
 *
 * `segment-between-two-named-states` — the bar between the two heads IS the gap, and both of its ends
 * are named states rather than an anonymous range. That is the whole difference from a lollipop pair:
 * a dumbbell answers "how far apart", not "how far from nothing", and the axis is fitted for exactly
 * that reason.
 *
 * `the-delta-is-its-own-register-beside-the-values` — the gain is printed in its own register at the
 * end of the row, never mixed in with the two levels it was computed from.
 *
 * WHAT THE WEB ADDS. A dumbbell row is three numbers and shows two; the third — the gap — is what the
 * bar draws and never states for every row. Here every row answers with both levels, the gain, its
 * rank among the ten gains, and how it sits against the group's own median gain. Ten rows have room
 * for one annotation; the pointer has room for ten.
 */

import { mix, adjustToContrast, contrast, TEXT_CONTRAST_MIN, NON_TEXT_CONTRAST_MIN } from "#shared/chart-beat/colour.mjs";
import { webRegisters, figureVars, noteAnchor } from "#shared/design-base/web.mjs";

const ROW = 40;
export const FRAME = { width: 860, height: 0, xAxisRowPx: 28 };
/** The delta's own column, inside the viewBox. A label placed at `left: 100.5 %` of the plot cell
 *  hangs outside the figure and scrolls the page sideways — the defect this base's bump beat paid
 *  for at all seven viewports. A column that belongs to the frame is drawn inside the frame. */
const DELTA_GUTTER = 96;
const PLOT_RIGHT = FRAME.width - DELTA_GUTTER;

export type Row = {
  code: string;
  name: string;
  before: number;
  after: number;
  gain: number;
  beforeLabel: string;
  afterLabel: string;
  gainLabel: string;
  detail: string;
};

const pct = (value: number, extent: number) => (value / extent) * 100;

export function DirectedDumbbellWeb({
  rows,
  subject,
  xTicks,
  stateLabels,
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
  subject: string;
  xTicks: number[];
  stateLabels: { before: string; after: string };
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
  const height = rows.length * ROW + 14;

  // ONE HUE, TWO CHROMAS: the two heads are two STATES of one measure, never two categories.
  let early = mix(accent, ground, 0.6);
  if (contrast(early, ground) < NON_TEXT_CONTRAST_MIN)
    early = adjustToContrast(early, ground, NON_TEXT_CONTRAST_MIN) ?? early;
  const late = accent;
  let connector = mix(ground, ink, 0.28);
  if (contrast(connector, ground) < NON_TEXT_CONTRAST_MIN)
    connector = adjustToContrast(connector, ground, NON_TEXT_CONTRAST_MIN) ?? connector;
  const label = adjustToContrast(ink, ground, TEXT_CONTRAST_MIN) ?? ink;

  const floor = xTicks[0];
  const top = xTicks[xTicks.length - 1];
  for (const r of rows)
    for (const v of [r.before, r.after])
      if (v < floor || v > top) throw new Error(`${r.name} draws ${v}, outside the fitted axis ${floor}–${top}`);
  const x = (v: number) => ((v - floor) / (top - floor)) * PLOT_RIGHT;
  // The first row's own value labels sit ABOVE its bar, so the band of rows starts below the top of
  // the frame — without this they lift out of the svg's rectangle, where the hit area cannot answer
  // for them and the format's own overlay probe goes silent.
  const TOP_PAD = 14;
  const cy = (i: number) => TOP_PAD + ROW * i + ROW / 2;

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

      <div style={{ display: "flex", flexWrap: "wrap", gap: "0 18px", margin: "10px 0 4px", flex: "0 0 auto" }}>
        {[{ c: early, t: stateLabels.before }, { c: late, t: stateLabels.after }].map((k) => (
          <span key={k.t} style={{ ...regs.axis, display: "inline-flex", alignItems: "center", gap: 6 }}>
            <span style={{ width: 12, height: 12, background: k.c, display: "inline-block", borderRadius: "50%" }} />
            {k.t}
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
        {/* The row labels are furniture, not controls. Without this the gutter's own <span>s are
            the topmost element wherever a value label slides over them at a narrow width, and the
            plot's hit area never sees the pointer — the format's overlay probe caught it at 375px. */}
        <div className="y-axis" style={{ pointerEvents: "none" }}>
          {rows.map((r, i) => (
            <span
              key={r.code}
              className="axis-label y"
              style={{
                ...regs.axis,
                color: r.code === subject ? accent : (regs.axis.color as string),
                fontWeight: r.code === subject ? 700 : regs.axis.fontWeight,
                top: `${pct(cy(i), height)}%`,
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

          {xTicks.map((t) => (
            <line key={t} x1={x(t)} x2={x(t)} y1={0} y2={height} stroke={grid} strokeWidth={1} vectorEffect="non-scaling-stroke" />
          ))}

          {rows.map((r, i) => (
            <g key={r.code}>
              <line
                x1={x(r.before)}
                x2={x(r.after)}
                y1={cy(i)}
                y2={cy(i)}
                stroke={connector}
                strokeWidth={6}
                strokeLinecap="round"
                vectorEffect="non-scaling-stroke"
              />
              <circle cx={x(r.before)} cy={cy(i)} r={6} fill={early} stroke={ground} strokeWidth={1} vectorEffect="non-scaling-stroke" />
              <circle cx={x(r.after)} cy={cy(i)} r={6} fill={late} stroke={ground} strokeWidth={1} vectorEffect="non-scaling-stroke" />
            </g>
          ))}

          {rows.map((r, i) => (
            <circle
              key={r.code}
              className="pt"
              cx={(x(r.before) + x(r.after)) / 2}
              cy={cy(i)}
              r={9}
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
            // A LABEL THAT WOULD LEAVE THE FRAME FLIPS TO THE INSIDE. Beside the head is the right
            // place until the head is near an edge; then the label slides out of the plot's own
            // column into the label gutter, where the hit area cannot answer for it and, at 375px,
            // out of the figure entirely. `.end-label` carries a ground chip, so a flipped label
            // sits legibly over the connector it now covers.
            const beforePct = pct(x(r.before), FRAME.width);
            const afterPct = pct(x(r.after), FRAME.width);
            const flipBefore = beforePct < 14;
            const flipAfter = afterPct > 86;
            return (
            <span key={r.code}>
              <span
                className="end-label"
                style={{
                  ...regs.value,
                  fontSize: `${Math.max(11, Number.parseFloat(regs.value.fontSize as string) - 2)}px`,
                  color: label,
                  // BESIDE the head, never above it. A label lifted by a percentage of its own
                  // (fixed-pixel) height clears the row at desktop scale and lifts clean out of the
                  // svg's rectangle at 375px, where the geometry has shrunk and the type has not —
                  // measured by the format's own overlay probe, which went silent at the phone.
                  left: `${pct(x(r.before), FRAME.width)}%`,
                  top: `${pct(cy(i), height)}%`,
                  transform: flipBefore
                    ? "translateY(-50%) translateX(9px)"
                    : "translate(-100%, -50%) translateX(-9px)",
                }}
              >
                {r.beforeLabel}
              </span>
              <span
                className="end-label"
                style={{
                  ...regs.value,
                  fontSize: `${Math.max(11, Number.parseFloat(regs.value.fontSize as string) - 2)}px`,
                  color: label,
                  left: `${pct(x(r.after), FRAME.width)}%`,
                  top: `${pct(cy(i), height)}%`,
                  transform: flipAfter
                    ? "translate(-100%, -50%) translateX(-9px)"
                    : "translateY(-50%) translateX(9px)",
                }}
              >
                {r.afterLabel}
              </span>
              {/* THE DELTA, in its own register, in its own column, past the end of every bar. */}
              <span
                className="note"
                style={{
                  ...regs.annot,
                  color: r.code === subject ? accent : label,
                  left: `${pct(PLOT_RIGHT + 10, FRAME.width)}%`,
                  top: `${pct(cy(i), height)}%`,
                  transform: "translateY(-50%)",
                  background: "transparent",
                  padding: 0,
                  whiteSpace: "nowrap",
                }}
              >
                {r.gainLabel}
              </span>
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

      <p className="chart-reading" style={{ ...regs.body, margin: "10px 0 0" }}>{reading}</p>
      <p className="chart-source" style={{ ...regs.body, margin: "6px 0 0" }}>{source}</p>
    </figure>
  );
}
