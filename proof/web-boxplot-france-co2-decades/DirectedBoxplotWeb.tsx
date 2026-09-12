/**
 * France's CO₂ per person by decade since 1950, drawn as box plots THROUGH the design base and
 * delivered as an interactive page. The `box plot` beat of this tree's web format.
 *
 * `the-sample-is-drawn-beside-its-own-summary` — and on the web that treatment is not a nicety, it
 * is the whole reason to build this form here. A box is a five-number SUMMARY: it hides the ten
 * readings it was computed from, and a reader has no way to tell a decade that fell steadily from
 * one that swung and happened to land on the same median. So every year is drawn as its own dot
 * beside its box, and every dot answers: its year, its value, and where it sits inside its own
 * decade. The static plate could draw the dots; it could not name any of them.
 *
 * `every-band-names-its-own-statistic` — each box prints its own median and its own n under it, so
 * a partial decade cannot be read as a full one by mistake.
 *
 * THE WHISKERS ARE TUKEY'S, AND THE FENCE IS COMPUTED, NEVER DRAWN TO THE EXTREME. A whisker that
 * always reaches the minimum and maximum is a range plot wearing a box plot's clothes.
 */

import { mix, adjustToContrast, contrast, TEXT_CONTRAST_MIN, NON_TEXT_CONTRAST_MIN } from "#shared/chart-beat/colour.mjs";
import { webRegisters, figureVars, noteAnchor, fitY } from "#shared/design-base/web.mjs";

export const FRAME = { width: 880, height: 400, xAxisRowPx: 44 };

export type Box = {
  key: string;
  label: string;
  n: number;
  min: number;
  q1: number;
  median: number;
  q3: number;
  max: number;
  medianLabel: string;
  outliers: { year: number; value: number; label: string }[];
  readings: { year: number; value: number; detail: string }[];
};

const pct = (value: number, extent: number) => (value / extent) * 100;

export function DirectedBoxplotWeb({
  boxes,
  peakKey,
  yTicks,
  title,
  eyebrow,
  caveat,
  source,
  alt,
  unit,
  reading,
  peakNote,
  direction,
  ground,
  accent,
  ink,
  muted,
  grid,
}: {
  boxes: Box[];
  peakKey: string;
  yTicks: number[];
  title: string;
  eyebrow: string;
  caveat: string;
  source: string;
  alt: string;
  unit: string;
  reading: string;
  peakNote: string;
  direction: any;
  ground: string;
  accent: string;
  ink: string;
  muted: string;
  grid: string;
}) {
  const regs = webRegisters(direction, { ink: { ink, muted, accent } });

  let sample = mix(ground, ink, 0.36);
  if (contrast(sample, ground) < NON_TEXT_CONTRAST_MIN)
    sample = adjustToContrast(sample, ground, NON_TEXT_CONTRAST_MIN) ?? sample;
  const boxFill = mix(accent, ground, 0.72);
  const boxStroke = adjustToContrast(accent, ground, NON_TEXT_CONTRAST_MIN) ?? accent;
  const baseline = mix(ground, ink, 0.7);

  // A BOX PLOT IS A POSITION ENCODING, SO THE AXIS IS FITTED AND NOT ANCHORED AT ZERO — nothing
  // here is measured by its length from a baseline. What IS checked is that the fitted window
  // actually contains every mark drawn inside it, outliers included: an axis that clips a reading
  // is worse than one that wastes space, because the clipped mark is silently gone.
  const floor = yTicks[0];
  const top = yTicks[yTicks.length - 1];
  for (const b of boxes)
    for (const v of [b.min, b.max, ...b.outliers.map((o) => o.value)])
      if (v < floor || v > top)
        throw new Error(`${b.label} draws ${v}, outside the fitted axis ${floor}–${top}`);
  const y = fitY(floor, top, FRAME.height);
  const band = FRAME.width / boxes.length;
  const cx = (i: number) => band * i + band / 2;
  const boxW = band * 0.30;
  const stripX = (i: number) => cx(i) + boxW * 0.85;

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
          ["--y-gutter" as string]: "34px",
          ["--x-axis-h" as string]: `${FRAME.xAxisRowPx}px`,
          aspectRatio: `${FRAME.width + 34} / ${FRAME.height + FRAME.xAxisRowPx}`,
        }}
      >
        <div className="y-axis">
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

          {boxes.map((b, i) => {
            const isPeak = b.key === peakKey;
            return (
              <g key={b.key}>
                {/* whiskers */}
                <line x1={cx(i)} x2={cx(i)} y1={y(b.min)} y2={y(b.q1)} stroke={boxStroke} strokeWidth={1} vectorEffect="non-scaling-stroke" />
                <line x1={cx(i)} x2={cx(i)} y1={y(b.q3)} y2={y(b.max)} stroke={boxStroke} strokeWidth={1} vectorEffect="non-scaling-stroke" />
                <line x1={cx(i) - boxW / 3} x2={cx(i) + boxW / 3} y1={y(b.min)} y2={y(b.min)} stroke={boxStroke} strokeWidth={1} vectorEffect="non-scaling-stroke" />
                <line x1={cx(i) - boxW / 3} x2={cx(i) + boxW / 3} y1={y(b.max)} y2={y(b.max)} stroke={boxStroke} strokeWidth={1} vectorEffect="non-scaling-stroke" />
                {/* the box */}
                <rect
                  x={cx(i) - boxW / 2}
                  y={y(b.q3)}
                  width={boxW}
                  height={Math.max(1, y(b.q1) - y(b.q3))}
                  fill={isPeak ? accent : boxFill}
                  fillOpacity={isPeak ? 1 : 1}
                  stroke={boxStroke}
                  strokeWidth={direction.stroke?.rule ?? 0.8}
                  vectorEffect="non-scaling-stroke"
                />
                {/* the median, in ink — never the box's own fill or stroke colour */}
                <line
                  x1={cx(i) - boxW / 2}
                  x2={cx(i) + boxW / 2}
                  y1={y(b.median)}
                  y2={y(b.median)}
                  stroke={isPeak ? ground : ink}
                  strokeWidth={2}
                  vectorEffect="non-scaling-stroke"
                />
                {/* the sample the box hides */}
                {b.readings.map((r, k) => (
                  <circle
                    key={r.year}
                    cx={stripX(i) + ((k % 3) - 1) * 3.2}
                    cy={y(r.value)}
                    r={2.1}
                    fill={sample}
                  />
                ))}
                {b.outliers.map((o) => (
                  <circle key={o.year} cx={cx(i)} cy={y(o.value)} r={3} fill={ground} stroke={boxStroke} strokeWidth={1.2} vectorEffect="non-scaling-stroke" />
                ))}
              </g>
            );
          })}

          {/* The axis floor, drawn as a rule and NOT as a baseline: it is where the window starts,
              not where the quantity starts, and the caveat says so in words. */}
          <line x1={0} x2={FRAME.width} y1={FRAME.height} y2={FRAME.height} stroke={baseline} strokeWidth={1} vectorEffect="non-scaling-stroke" />

          {/* Every reading is reachable: 75 years, each answering with its own decade's position. */}
          {boxes.flatMap((b, i) =>
            b.readings.map((r, k) => (
              <circle
                key={`${b.key}-${r.year}`}
                className="pt"
                cx={stripX(i) + ((k % 3) - 1) * 3.2}
                cy={y(r.value)}
                r={4.5}
                fill="transparent"
                stroke="none"
                tabIndex={0}
                role="img"
                aria-label={`${r.year} : ${r.detail}`}
                data-detail={`${r.year} · ${r.detail}`}
              />
            )),
          )}
          <rect className="hit-area" x={0} y={0} width={FRAME.width} height={FRAME.height} fill="transparent" pointerEvents="all" />
        </svg>

        <div className="overlay" aria-hidden="true">
          {boxes.map((b, i) => (
            <span
              key={b.key}
              className="end-label"
              style={{
                ...regs.value,
                color: b.key === peakKey ? accent : adjustToContrast(ink, ground, TEXT_CONTRAST_MIN) ?? ink,
                left: `${pct(cx(i), FRAME.width)}%`,
                top: `${pct(y(b.max), FRAME.height)}%`,
                transform: "translate(-50%, -100%) translateY(-6px)",
              }}
            >
              {b.medianLabel}
            </span>
          ))}
          <span
            className="note"
            style={{
              ...regs.annot,
              // Anchored at the LEFT EDGE, not over the peak: the peak's own box already carries
              // its median as a printed value, and a note centred on it landed on that number.
              // The accent, and the accented decade label under the axis, are what point at it.
              ...noteAnchor(0),
              top: "1%",
            }}
          >
            {peakNote}
          </span>
        </div>

        <div className="x-axis">
          {boxes.map((b, i) => (
            <span
              key={b.key}
              className="axis-label x"
              style={{
                ...regs.axis,
                left: `${pct(cx(i), FRAME.width)}%`,
                color: b.key === peakKey ? accent : (regs.axis.color as string),
                textAlign: "center",
              }}
            >
              {b.label}
              <br />
              <span style={{ opacity: 0.75 }}>{`n=${b.n}`}</span>
            </span>
          ))}
        </div>
      </div>

      <p className="chart-reading" style={{ ...regs.body, margin: "10px 0 0" }}>{reading}</p>
      <p className="chart-source" style={{ ...regs.body, margin: "6px 0 0" }}>{source}</p>
    </figure>
  );
}
