/**
 * Germany's electricity between 2015 and 2024, drawn as a bridge THROUGH the design base and
 * delivered as an interactive page: two declared levels and the moves between them.
 *
 * `net-change-between-declared-levels` — a waterfall is only honest if both ENDS are levels the page
 * names. Otherwise the steps are a sequence of numbers floating over nothing, and a reader cannot
 * tell whether they add up.
 *
 * `sign-is-direction-and-hue-only-doubles-it` — a step's DIRECTION is up or down; colour repeats it.
 * A reader who cannot separate the two hues still reads the bridge correctly.
 *
 * `conservation-is-kept-visible` — the steps sum to the difference between the two levels, and the
 * runner checks it before drawing. A bridge that does not reconcile is a bar chart with connectors.
 *
 * WHAT THE WEB ADDS. A step's own bar starts wherever the previous one ended, so only the first and
 * the last are measured against anything a reader can see. Every step here answers with its own
 * value, the level it starts from, the level it ends at, and its share of the total move.
 */

import { mix, adjustToContrast, contrast, TEXT_CONTRAST_MIN, NON_TEXT_CONTRAST_MIN } from "#shared/chart-beat/colour.mjs";
import { webRegisters, figureVars, fitY, inkOnFill } from "#shared/design-base/web.mjs";

export const FRAME = { width: 860, height: 380, xAxisRowPx: 48 };

export type Step = {
  key: string;
  name: string;
  kind: "level" | "up" | "down";
  from: number;
  to: number;
  label: string;
  detail: string;
};

const pct = (value: number, extent: number) => (value / extent) * 100;

export function DirectedWaterfallWeb({
  steps,
  yTicks,
  unit,
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
  steps: Step[];
  yTicks: number[];
  unit: string;
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

  let level = mix(ground, ink, 0.55);
  if (contrast(level, ground) < NON_TEXT_CONTRAST_MIN)
    level = adjustToContrast(level, ground, NON_TEXT_CONTRAST_MIN) ?? level;
  const up = adjustToContrast(accent, ground, NON_TEXT_CONTRAST_MIN) ?? accent;
  let down = mix(ground, ink, 0.33);
  if (contrast(down, ground) < NON_TEXT_CONTRAST_MIN)
    down = adjustToContrast(down, ground, NON_TEXT_CONTRAST_MIN) ?? down;
  const label = adjustToContrast(ink, ground, TEXT_CONTRAST_MIN) ?? ink;
  const connector = mix(ground, ink, 0.4);

  // Enough headroom that a value printed above the tallest bar stays inside the plot at every
  // width — at 375px the geometry has shrunk and the fixed-size label has not.
  const y = fitY(0, yTicks[yTicks.length - 1], FRAME.height, 0.12);
  const band = FRAME.width / steps.length;
  const cx = (i: number) => band * i + band / 2;
  const barW = band * 0.58;
  const fillOf = (s: Step) => (s.kind === "level" ? level : s.kind === "up" ? up : down);

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
          ["--y-gutter" as string]: "44px",
          ["--x-axis-h" as string]: `${FRAME.xAxisRowPx}px`,
          aspectRatio: `${FRAME.width + 44} / ${FRAME.height + FRAME.xAxisRowPx}`,
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
          viewBox={`0 0 ${FRAME.width} ${FRAME.height}`}
          preserveAspectRatio="none"
        >
          <desc>{alt}</desc>
          <rect x={0} y={0} width={FRAME.width} height={FRAME.height} fill={ground} />

          {yTicks.slice(1).map((t) => (
            <line key={t} x1={0} x2={FRAME.width} y1={y(t)} y2={y(t)} stroke={grid} strokeWidth={1} vectorEffect="non-scaling-stroke" />
          ))}

          {/* The connectors: a step starts where the last one ended, and the eye needs to be told. */}
          {steps.slice(0, -1).map((s, i) => (
            <line
              key={`c-${s.key}`}
              x1={cx(i) + barW / 2}
              x2={cx(i + 1) - barW / 2}
              y1={y(s.to)}
              y2={y(s.to)}
              stroke={connector}
              strokeWidth={1}
              strokeDasharray="3 3"
              vectorEffect="non-scaling-stroke"
            />
          ))}

          {steps.map((s, i) => (
            <rect
              key={s.key}
              x={cx(i) - barW / 2}
              y={y(Math.max(s.from, s.to))}
              width={barW}
              height={Math.max(1.5, Math.abs(y(s.from) - y(s.to)))}
              fill={fillOf(s)}
            />
          ))}

          <line x1={0} x2={FRAME.width} y1={FRAME.height} y2={FRAME.height} stroke={mix(ground, ink, 0.75)} strokeWidth={1} vectorEffect="non-scaling-stroke" />

          {steps.map((s, i) => (
            <circle
              key={`hit-${s.key}`}
              className="pt"
              cx={cx(i)}
              cy={y(Math.max(s.from, s.to))}
              r={7}
              fill="transparent"
              stroke="none"
              tabIndex={0}
              role="img"
              aria-label={s.detail}
              data-detail={s.detail}
            />
          ))}
          <rect className="hit-area" x={0} y={0} width={FRAME.width} height={FRAME.height} fill="transparent" pointerEvents="all" />
        </svg>

        <div className="overlay" aria-hidden="true">
          {steps.map((s, i) => {
            // A VALUE GOES INSIDE ITS OWN BAR WHEN THE BAR CAN HOLD IT. Above the bar is the right
            // place for a short step and the wrong one for a tall bar whose top is already near the
            // frame: at 375px the plot is a hundred units tall, the label is a fixed fourteen
            // pixels, and it lifts clean out of the svg — where the hit area cannot answer for it.
            const top = y(Math.max(s.from, s.to));
            const tall = Math.abs(y(s.from) - y(s.to)) >= 46;
            return (
              <span
                key={`l-${s.key}`}
                className="end-label"
                style={{
                  ...regs.value,
                  color: tall
                    ? inkOnFill(fillOf(s), { ink, ground }, contrast, adjustToContrast, TEXT_CONTRAST_MIN)
                    : s.kind === "up"
                      ? up
                      : label,
                  left: `${pct(cx(i), FRAME.width)}%`,
                  top: `${pct(top, FRAME.height)}%`,
                  transform: tall
                    ? "translate(-50%, 0) translateY(6px)"
                    : "translate(-50%, -100%) translateY(-5px)",
                  ...(tall ? { background: "transparent", padding: 0 } : {}),
                }}
              >
                {s.label}
              </span>
            );
          })}
        </div>

        <div className="x-axis" style={{ pointerEvents: "none" }}>
          {steps.map((s, i) => (
            <span
              key={`x-${s.key}`}
              className="axis-label x"
              style={{
                ...regs.axis,
                left: `${pct(cx(i), FRAME.width)}%`,
                textAlign: "center",
                whiteSpace: "normal",
                lineHeight: 1.1,
                maxWidth: `${(band / FRAME.width) * 100}%`,
                fontWeight: s.kind === "level" ? 700 : regs.axis.fontWeight,
              }}
            >
              {s.name}
            </span>
          ))}
        </div>
      </div>

      <p className="chart-reading" style={{ ...regs.body, margin: "10px 0 0" }}>{reading}</p>
      <p className="chart-source" style={{ ...regs.body, margin: "6px 0 0" }}>{`${source} · ${unit}`}</p>
    </figure>
  );
}
