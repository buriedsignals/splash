/**
 * Switzerland's annual CO₂ since 1858 as a LINE, drawn THROUGH the design base and delivered as an
 * interactive page. The web sibling of this tree's first directed beat.
 *
 * A LINE CARRIES A RATE, AND THAT IS WHY IT REFUSES A FORCED ZERO. `proof/web-area-swiss-co2` draws
 * this same frozen file filled, and requires its zero: the moment a series is filled, every clipped
 * tonne becomes surface a reader integrates. Nothing here is measured by its length from a baseline —
 * the slope carries the reading — so the axis is fitted, and the caveat says so rather than leaving
 * a reader to notice. The two beats say opposite things about the same series for stated reasons.
 *
 * `the-target-is-named-on-the-line-that-draws-it` — the level the headline compares against is a
 * horizontal rule, and its name sits ON that rule, not in a key the reader has to look away to.
 *
 * `direct-end-label-in-the-series-colour` — the last reading is labelled at the end of the line in
 * the line's own colour, so no legend is needed for a single series.
 *
 * WHAT THE WEB ADDS, AND IT IS NOT THE TOOLTIP. A still prints four of the 167 readings and asserts
 * ONE comparison — today against 1967 — because a plate has room for one rule, and the reader has to
 * take that baseline because it is the only one on the frame. Here the baseline is theirs: every one
 * of the 167 years answers with its own value, its distance under the peak, how far back it winds
 * the series, and how far 2024 sits from it. The interaction is declared control by control in
 * `BRIEF.md` and carried into the render as `interaction`, so the prose and the page cannot drift
 * (`chart-web/references/directed-interaction.md`).
 *
 * EVERY READING IS FOCUSABLE AT BUILD TIME, so the keyboard reader is not on a thinner path: the
 * script adds Left/Right/Home/End and the same detail box hover shows, and with no script at all the
 * plate is complete — the whole curve, the rule, the peak, the end label and every word.
 */

import { mix, adjustToContrast, contrast, TEXT_CONTRAST_MIN, NON_TEXT_CONTRAST_MIN } from "#shared/chart-beat/colour.mjs";
import { webRegisters, figureVars, noteAnchor, fitY } from "#shared/design-base/web.mjs";

export const FRAME = { width: 880, height: 380, xAxisRowPx: 28 };

export type Reading = { year: number; value: number; label: string; detail: string };

const pct = (value: number, extent: number) => (value / extent) * 100;

export function DirectedLineWeb({
  readings,
  peakYear,
  referenceYear,
  referenceValue,
  referenceNote,
  peakNote,
  yTicks,
  xTicks,
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
  readings: Reading[];
  peakYear: number;
  referenceYear: number;
  referenceValue: number;
  referenceNote: string;
  peakNote: string;
  yTicks: number[];
  xTicks: number[];
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

  const rule = mix(ground, ink, 0.5);
  const label = adjustToContrast(ink, ground, TEXT_CONTRAST_MIN) ?? ink;
  const stroke = adjustToContrast(accent, ground, NON_TEXT_CONTRAST_MIN) ?? accent;

  const first = readings[0].year;
  const last = readings[readings.length - 1].year;
  const floor = yTicks[0];
  const top = yTicks[yTicks.length - 1];
  for (const r of readings)
    if (r.value < floor || r.value > top)
      throw new Error(`${r.year} draws ${r.value}, outside the fitted axis ${floor}–${top}`);
  const x = (year: number) => ((year - first) / (last - first)) * FRAME.width;
  const y = fitY(floor, top, FRAME.height);

  const points = readings.map((r) => ({ ...r, cx: x(r.year), cy: y(r.value) }));
  const peak = points.find((p) => p.year === peakYear)!;
  const end = points[points.length - 1];

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
          ["--y-gutter" as string]: "40px",
          ["--x-axis-h" as string]: `${FRAME.xAxisRowPx}px`,
          aspectRatio: `${FRAME.width + 40} / ${FRAME.height + FRAME.xAxisRowPx}`,
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

          {yTicks.map((t) =>
            t === yTicks[0] ? null : (
              <line key={t} x1={0} x2={FRAME.width} y1={y(t)} y2={y(t)} stroke={grid} strokeWidth={1} vectorEffect="non-scaling-stroke" />
            ),
          )}

          {/* THE LEVEL THE HEADLINE COMPARES AGAINST, drawn across the whole frame so the crossing
              is visible where it happens rather than asserted in the title alone. */}
          <line
            x1={0}
            x2={FRAME.width}
            y1={y(referenceValue)}
            y2={y(referenceValue)}
            stroke={rule}
            strokeWidth={direction.stroke?.rule ?? 0.8}
            strokeDasharray="5 4"
            vectorEffect="non-scaling-stroke"
          />

          <path
            d={`M ${points.map((p) => `${p.cx} ${p.cy}`).join(" L ")}`}
            fill="none"
            stroke={stroke}
            strokeWidth={direction.stroke?.series ?? 2}
            strokeLinejoin="round"
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
          />

          <circle cx={peak.cx} cy={peak.cy} r={3.5} fill={ground} stroke={stroke} strokeWidth={1.6} vectorEffect="non-scaling-stroke" />
          <circle cx={end.cx} cy={end.cy} r={4} fill={stroke} />

          {points.map((p) => (
            <circle
              key={p.year}
              className="pt"
              cx={p.cx}
              cy={p.cy}
              r={4}
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
          <span
            className="note"
            style={{
              ...regs.annot,
              color: label,
              ...noteAnchor(1),
              top: `${pct(y(referenceValue), FRAME.height)}%`,
              transform: "translateX(0) translateY(-115%)",
            }}
          >
            {referenceNote}
          </span>
          <span
            className="note"
            style={{
              ...regs.annot,
              color: label,
              ...noteAnchor(pct(peak.cx, FRAME.width)),
              top: `${pct(peak.cy, FRAME.height)}%`,
              transform: `${noteAnchor(pct(peak.cx, FRAME.width)).transform} translateY(-130%)`,
            }}
          >
            {peakNote}
          </span>
          <span
            className="end-label"
            style={{
              ...regs.value,
              color: stroke,
              left: `${pct(end.cx, FRAME.width)}%`,
              top: `${pct(end.cy, FRAME.height)}%`,
              transform: "translate(-100%, -50%) translateX(-10px)",
            }}
          >
            {`${end.year} · ${end.label} ${unit}`}
          </span>
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
