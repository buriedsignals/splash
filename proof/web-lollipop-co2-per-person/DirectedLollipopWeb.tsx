/**
 * The six largest CO₂ emitters, per person, in 2000 and 2023, drawn as paired lollipops THROUGH the
 * design base and delivered as an interactive page.
 *
 * WHAT A LOLLIPOP PAIR SAYS THAT A DUMBBELL DOES NOT. A dumbbell draws the GAP between two states and
 * says nothing about how far either end is from nothing; a lollipop pair draws each state as its own
 * stem FROM ZERO, so the two LEVELS are the first reading and the gap the second. On this data that
 * is the claim — the American and Chinese averages are now within a factor of two, which is a
 * sentence about levels.
 *
 * `two-states-of-one-measure-are-one-hue-at-two-chromas` — the earlier state is a lighter tint of the
 * later state's own hue. Not grey, not a second hue: the same hue, lighter, so a pair reads as one
 * subject in two states rather than as two subjects.
 *
 * `every-bar-labelled-lets-the-axis-go` — both values are printed above their own heads, so the page
 * carries a zero line and its unit rather than a full value axis.
 *
 * WHAT THE WEB ADDS. Twelve stems and twelve printed numbers already say a lot; what they cannot say
 * is the WEIGHT behind them — a per-person figure is a ratio, and the population it was divided by is
 * exactly what the reader needs to know before comparing China with Japan. Every pair answers with
 * both levels, the change, the population, the country's total emissions and its share of the world.
 */

import { mix, adjustToContrast, contrast, TEXT_CONTRAST_MIN, NON_TEXT_CONTRAST_MIN } from "#shared/chart-beat/colour.mjs";
import { webRegisters, figureVars, noteAnchor, fitY } from "#shared/design-base/web.mjs";

export const FRAME = { width: 840, height: 360, xAxisRowPx: 52 };

export type Pair = {
  code: string;
  name: string;
  before: number;
  after: number;
  beforeLabel: string;
  afterLabel: string;
  changeLabel: string;
  rising: boolean;
  detail: string;
};

const pct = (value: number, extent: number) => (value / extent) * 100;

export function DirectedLollipopWeb({
  pairs,
  subject,
  yTicks,
  unit,
  stateLabels,
  title,
  eyebrow,
  caveat,
  source,
  alt,
  reading,
  rule,
  direction,
  ground,
  accent,
  ink,
  muted,
  grid,
}: {
  pairs: Pair[];
  subject: string;
  yTicks: number[];
  unit: string;
  stateLabels: { before: string; after: string };
  title: string;
  eyebrow: string;
  caveat: string;
  source: string;
  alt: string;
  reading: string;
  rule: string;
  direction: any;
  ground: string;
  accent: string;
  ink: string;
  muted: string;
  grid: string;
}) {
  const regs = webRegisters(direction, { ink: { ink, muted, accent } });

  let tint = mix(accent, ground, 0.58);
  if (contrast(tint, ground) < NON_TEXT_CONTRAST_MIN)
    tint = adjustToContrast(tint, ground, NON_TEXT_CONTRAST_MIN) ?? tint;
  const baseline = mix(ground, ink, 0.75);
  const label = adjustToContrast(ink, ground, TEXT_CONTRAST_MIN) ?? ink;

  if (yTicks[0] !== 0)
    throw new Error(`a lollipop stem is a LENGTH from zero; the ticks handed in start at ${yTicks[0]}`);
  const y = fitY(0, yTicks[yTicks.length - 1], FRAME.height, 0.14);
  const band = FRAME.width / pairs.length;
  const cx = (i: number) => band * i + band / 2;
  const off = band * 0.13;

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
        {[{ c: tint, t: stateLabels.before }, { c: accent, t: stateLabels.after }].map((k) => (
          <span key={k.t} style={{ ...regs.axis, display: "inline-flex", alignItems: "center", gap: 6 }}>
            <span style={{ width: 12, height: 12, background: k.c, display: "inline-block", borderRadius: "50%" }} />
            {k.t}
          </span>
        ))}
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

          {yTicks.slice(1).map((t) => (
            <line key={t} x1={0} x2={FRAME.width} y1={y(t)} y2={y(t)} stroke={grid} strokeWidth={1} vectorEffect="non-scaling-stroke" />
          ))}

          {pairs.map((p, i) => {
            const isSubject = p.code === subject;
            return (
              <g key={p.code}>
                <line x1={cx(i) - off} x2={cx(i) - off} y1={FRAME.height} y2={y(p.before)} stroke={tint} strokeWidth={3} vectorEffect="non-scaling-stroke" />
                <circle cx={cx(i) - off} cy={y(p.before)} r={7} fill={tint} />
                <line x1={cx(i) + off} x2={cx(i) + off} y1={FRAME.height} y2={y(p.after)} stroke={accent} strokeWidth={3} vectorEffect="non-scaling-stroke" />
                <circle
                  cx={cx(i) + off}
                  cy={y(p.after)}
                  r={7}
                  fill={accent}
                  stroke={isSubject ? label : "none"}
                  strokeWidth={isSubject ? 2 : 0}
                  vectorEffect="non-scaling-stroke"
                />
              </g>
            );
          })}

          <line x1={0} x2={FRAME.width} y1={FRAME.height} y2={FRAME.height} stroke={baseline} strokeWidth={1.2} vectorEffect="non-scaling-stroke" />

          {pairs.map((p, i) => (
            <circle
              key={p.code}
              className="pt"
              cx={cx(i)}
              cy={y(Math.max(p.before, p.after))}
              r={9}
              fill="transparent"
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
          {pairs.map((p, i) => (
            <span key={p.code}>
              <span
                className="end-label"
                style={{
                  ...regs.value,
                  fontSize: `${Math.max(11, Number.parseFloat(regs.value.fontSize as string) - 2)}px`,
                  color: label,
                  left: `${pct(cx(i) - off, FRAME.width)}%`,
                  top: `${pct(y(p.before), FRAME.height)}%`,
                  transform: "translate(-50%, -100%) translateY(-6px)",
                }}
              >
                {p.beforeLabel}
              </span>
              <span
                className="end-label"
                style={{
                  ...regs.value,
                  fontSize: `${Math.max(11, Number.parseFloat(regs.value.fontSize as string) - 2)}px`,
                  color: p.code === subject ? accent : label,
                  left: `${pct(cx(i) + off, FRAME.width)}%`,
                  top: `${pct(y(p.after), FRAME.height)}%`,
                  transform: "translate(-50%, -100%) translateY(-6px)",
                }}
              >
                {p.afterLabel}
              </span>
            </span>
          ))}
          <span className="note" style={{ ...regs.annot, color: label, ...noteAnchor(1), top: "1%" }}>
            {rule}
          </span>
        </div>

        <div className="x-axis">
          {pairs.map((p, i) => (
            <span
              key={p.code}
              className="axis-label x"
              style={{
                ...regs.axis,
                left: `${pct(cx(i), FRAME.width)}%`,
                color: p.code === subject ? accent : (regs.axis.color as string),
                fontWeight: p.code === subject ? 700 : regs.axis.fontWeight,
                textAlign: "center",
                whiteSpace: "normal",
              }}
            >
              {p.name}
              <br />
              <span style={{ opacity: 0.8 }}>{p.changeLabel}</span>
            </span>
          ))}
        </div>
      </div>

      <p className="chart-reading" style={{ ...regs.body, margin: "10px 0 0" }}>{reading}</p>
      <p className="chart-source" style={{ ...regs.body, margin: "6px 0 0" }}>{`${source} · ${unit}`}</p>
    </figure>
  );
}
