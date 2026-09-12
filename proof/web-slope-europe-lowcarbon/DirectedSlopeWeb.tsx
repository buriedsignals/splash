/**
 * Sixteen European countries' low-carbon share in 2000 and in 2024, drawn as a slopegraph THROUGH
 * the design base and delivered as an interactive page.
 *
 * `the-slope-carries-direction-and-the-number-carries-magnitude` — the angle says which way and how
 * fast; the two printed numbers say how much. Neither is asked to do the other's job, which is why
 * a slopegraph can afford exactly two rails and no axis between them.
 *
 * A CROSSING IS THE ONE THING A SLOPEGRAPH EXISTS TO SHOW, so it is the one thing that must not be
 * believed on sight: the crossings are derived — a pair crosses when the sign of their gap flips
 * between the rails — and the subject's own crossing is drawn as a ringed intersection.
 *
 * WHAT THE WEB ADDS. Sixteen lines converging on two rails means most labels have to be dropped or
 * stacked; the plate names the ends it can. Every line here answers with its country, both levels,
 * the gain in points, its rank among the sixteen gains, and who it crossed on the way.
 */

import { mix, adjustToContrast, contrast, TEXT_CONTRAST_MIN, NON_TEXT_CONTRAST_MIN } from "#shared/chart-beat/colour.mjs";
import { webRegisters, figureVars } from "#shared/design-base/web.mjs";

export const FRAME = { width: 900, height: 460 };
const RAIL_PAD = 168;

export type Line = {
  code: string;
  name: string;
  before: number;
  after: number;
  beforeLabel: string;
  afterLabel: string;
  highlight: boolean;
  detail: string;
};

export function DirectedSlopeWeb({
  lines,
  railLabels,
  yTicks,
  crossings,
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
  lines: Line[];
  railLabels: { left: string; right: string };
  yTicks: number[];
  crossings: { at: number; text: string }[];
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

  let thread = mix(ground, ink, 0.34);
  if (contrast(thread, ground) < NON_TEXT_CONTRAST_MIN)
    thread = adjustToContrast(thread, ground, NON_TEXT_CONTRAST_MIN) ?? thread;
  const lit = adjustToContrast(accent, ground, NON_TEXT_CONTRAST_MIN) ?? accent;
  const label = adjustToContrast(ink, ground, TEXT_CONTRAST_MIN) ?? ink;
  const rail = mix(ground, ink, 0.5);

  const left = RAIL_PAD;
  const right = FRAME.width - RAIL_PAD;
  const lo = yTicks[0];
  const hi = yTicks[yTicks.length - 1];
  const y = (v: number) => FRAME.height - 30 - ((v - lo) / (hi - lo)) * (FRAME.height - 60);

  /** Labels on a rail are stacked apart when two countries sit within a line's height of each
   *  other. Deterministic: ordered by value, each pushed just clear of the one below it. */
  const seat = (values: { code: string; v: number }[]) => {
    const MIN = 15;
    // TOP DOWN, never bottom up. Pushing crowded labels UPWARD lifts the highest one past the top of
    // the rail and into the rail's own heading — measured on the first render, where "99 % Suède"
    // printed over "2024". Pushing them DOWN cannot leave the frame: sixteen labels at 15 units
    // apart are 240 units in a plot 400 tall.
    const ordered = [...values].sort((a, b) => b.v - a.v);
    const out = new Map<string, number>();
    let last = Number.NEGATIVE_INFINITY;
    for (const item of ordered) {
      const wanted = y(item.v);
      const placed = Math.max(wanted, last + MIN);
      out.set(item.code, placed);
      last = placed;
    }
    return out;
  };
  const leftSeat = seat(lines.map((l) => ({ code: l.code, v: l.before })));
  const rightSeat = seat(lines.map((l) => ({ code: l.code, v: l.after })));

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
          ["--x-axis-h" as string]: "0px",
          aspectRatio: `${FRAME.width} / ${FRAME.height}`,
          margin: "10px 0 0",
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
          preserveAspectRatio="xMidYMid meet"
        >
          <desc>{alt}</desc>
          <rect x={0} y={0} width={FRAME.width} height={FRAME.height} fill={ground} />

          <line x1={left} x2={left} y1={y(hi)} y2={y(lo)} stroke={rail} strokeWidth={1} vectorEffect="non-scaling-stroke" />
          <line x1={right} x2={right} y1={y(hi)} y2={y(lo)} stroke={rail} strokeWidth={1} vectorEffect="non-scaling-stroke" />

          {lines.map((l) => (
            <line
              key={l.code}
              x1={left}
              y1={y(l.before)}
              x2={right}
              y2={y(l.after)}
              stroke={l.highlight ? lit : thread}
              strokeWidth={l.highlight ? 2.4 : 1.2}
              strokeOpacity={l.highlight ? 1 : 0.75}
              vectorEffect="non-scaling-stroke"
            />
          ))}

          {crossings.map((c) => (
            <circle key={c.text} cx={(left + right) / 2} cy={y(c.at)} r={5} fill="none" stroke={lit} strokeWidth={2} vectorEffect="non-scaling-stroke" />
          ))}

          {lines.flatMap((l) => [
            <circle key={`a-${l.code}`} cx={left} cy={y(l.before)} r={3.4} fill={l.highlight ? lit : thread} />,
            <circle key={`b-${l.code}`} cx={right} cy={y(l.after)} r={3.4} fill={l.highlight ? lit : thread} />,
          ])}

          {lines.map((l) => (
            <circle
              key={`hit-${l.code}`}
              className="pt"
              cx={(left + right) / 2}
              cy={(y(l.before) + y(l.after)) / 2}
              r={7}
              fill="transparent"
              stroke="none"
              tabIndex={0}
              role="img"
              aria-label={l.detail}
              data-detail={l.detail}
            />
          ))}
          <rect className="hit-area" x={0} y={0} width={FRAME.width} height={FRAME.height} fill="transparent" pointerEvents="all" />

          {/* Words inside the viewBox: this beat letterboxes rather than stretching, so an HTML
              overlay in percentages of the grid cell would not land on the rails. */}
          <text pointerEvents="none" x={left} y={y(hi) - 22} fill={label} fontFamily={String(regs.value.fontFamily)} fontSize={14} fontWeight={700} textAnchor="middle">
            {railLabels.left}
          </text>
          <text pointerEvents="none" x={right} y={y(hi) - 22} fill={label} fontFamily={String(regs.value.fontFamily)} fontSize={14} fontWeight={700} textAnchor="middle">
            {railLabels.right}
          </text>
          {lines.map((l) => (
            <text
              pointerEvents="none"
              key={`ll-${l.code}`}
              x={left - 10}
              y={leftSeat.get(l.code)}
              fill={l.highlight ? lit : label}
              fontFamily={String(regs.axis.fontFamily)}
              fontSize={12}
              fontWeight={l.highlight ? 700 : (regs.axis.fontWeight as number)}
              textAnchor="end"
              dominantBaseline="middle"
            >
              {`${l.name} ${l.beforeLabel}`}
            </text>
          ))}
          {lines.map((l) => (
            <text
              pointerEvents="none"
              key={`rl-${l.code}`}
              x={right + 10}
              y={rightSeat.get(l.code)}
              fill={l.highlight ? lit : label}
              fontFamily={String(regs.axis.fontFamily)}
              fontSize={12}
              fontWeight={l.highlight ? 700 : (regs.axis.fontWeight as number)}
              textAnchor="start"
              dominantBaseline="middle"
            >
              {`${l.afterLabel} ${l.name}`}
            </text>
          ))}
        </svg>
        <div className="overlay" aria-hidden="true" />
        <div className="x-axis" />
      </div>

      {crossings.map((c) => (
        <p key={c.text} className="chart-reading" style={{ ...regs.annot, margin: "8px 0 0" }}>{c.text}</p>
      ))}
      <p className="chart-reading" style={{ ...regs.body, margin: "6px 0 0" }}>{reading}</p>
      <p className="chart-source" style={{ ...regs.body, margin: "6px 0 0" }}>{source}</p>
    </figure>
  );
}
