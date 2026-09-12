/**
 * Switzerland's population by age band and sex in 2023, drawn as a pyramid THROUGH the design base
 * and delivered as an interactive page.
 *
 * `mirrored-halves-cross-at-a-named-band` — the two halves meet at a centre line, and the band where
 * the shape stops widening is NAMED, because that band is the whole reading: a pyramid that is
 * widest in the middle is an ageing population, not an expanding one, and nothing but the named band
 * says which.
 *
 * `name-each-half-in-words` — left and right are named above the halves. A mirrored chart with two
 * unlabelled sides is a Rorschach test.
 *
 * `the-neutral-straddles-the-centre` is NOT spent here, and the refusal is worth stating: the centre
 * of this chart is a boundary between two populations, not a category that belongs to neither. There
 * is nothing to straddle it with.
 *
 * WHAT THE WEB ADDS. A pyramid's bars are lengths from a shared centre, so a reader can compare two
 * bands and cannot read either. Every band answers with both counts, the total, the difference
 * between the sexes, and the band's share of the whole population — and the SHARE is the reading
 * that turns a silhouette into a claim about how many people are where.
 */

import { mix, adjustToContrast, contrast, TEXT_CONTRAST_MIN, NON_TEXT_CONTRAST_MIN } from "#shared/chart-beat/colour.mjs";
import { webRegisters, figureVars, noteAnchor } from "#shared/design-base/web.mjs";

const ROW = 20;
export const FRAME = { width: 780, height: 0, xAxisRowPx: 28 };

export type Band = {
  key: string;
  left: number;
  right: number;
  peak: boolean;
  detail: string;
};

const pct = (value: number, extent: number) => (value / extent) * 100;

export function DirectedPyramidWeb({
  bands,
  span,
  xTicks,
  sideLabels,
  peakNote,
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
  bands: Band[];
  span: number;
  xTicks: number[];
  sideLabels: { left: string; right: string };
  peakNote: string;
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
  const height = bands.length * ROW;

  let left = mix(ground, ink, 0.42);
  if (contrast(left, ground) < NON_TEXT_CONTRAST_MIN)
    left = adjustToContrast(left, ground, NON_TEXT_CONTRAST_MIN) ?? left;
  let right = mix(accent, ground, 0.25);
  if (contrast(right, ground) < NON_TEXT_CONTRAST_MIN)
    right = adjustToContrast(right, ground, NON_TEXT_CONTRAST_MIN) ?? right;
  const centreInk = adjustToContrast(ink, ground, TEXT_CONTRAST_MIN) ?? ink;

  const centre = FRAME.width / 2;
  const x = (v: number) => centre + (v / span) * (FRAME.width / 2);
  const cy = (i: number) => height - ROW * i - ROW / 2;
  const barH = ROW * 0.72;

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

      <div style={{ display: "flex", flexWrap: "wrap", gap: "0 18px", margin: "8px 0 4px", flex: "0 0 auto" }}>
        {[{ c: left, t: sideLabels.left }, { c: right, t: sideLabels.right }].map((k) => (
          <span key={k.t} style={{ ...regs.axis, display: "inline-flex", alignItems: "center", gap: 6 }}>
            <span style={{ width: 14, height: 14, background: k.c, display: "inline-block", borderRadius: 2 }} />
            {k.t}
          </span>
        ))}
      </div>

      <div
        className="chart-plot"
        style={{
          ["--y-gutter" as string]: "56px",
          ["--x-axis-h" as string]: `${FRAME.xAxisRowPx}px`,
          aspectRatio: `${FRAME.width + 56} / ${height + FRAME.xAxisRowPx}`,
        }}
      >
        <div className="y-axis" style={{ pointerEvents: "none" }}>
          {bands.map((b, i) => (
            <span
              key={b.key}
              className="axis-label y"
              style={{
                ...regs.axis,
                color: b.peak ? accent : (regs.axis.color as string),
                fontWeight: b.peak ? 700 : regs.axis.fontWeight,
                top: `${pct(cy(i), height)}%`,
              }}
            >
              {b.key}
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

          {bands.map((b, i) => (
            <g key={b.key}>
              <rect x={x(-b.left)} y={cy(i) - barH / 2} width={centre - x(-b.left)} height={barH} fill={left} opacity={b.peak ? 1 : 0.9} />
              <rect x={centre} y={cy(i) - barH / 2} width={x(b.right) - centre} height={barH} fill={right} opacity={b.peak ? 1 : 0.9} />
            </g>
          ))}

          <line x1={centre} x2={centre} y1={0} y2={height} stroke={centreInk} strokeWidth={1.2} vectorEffect="non-scaling-stroke" />

          {bands.map((b, i) => (
            <circle
              key={b.key}
              className="pt"
              cx={centre}
              cy={cy(i)}
              r={ROW / 2}
              fill="transparent"
              stroke="none"
              tabIndex={0}
              role="img"
              aria-label={b.detail}
              data-detail={b.detail}
            />
          ))}
          <rect className="hit-area" x={0} y={0} width={FRAME.width} height={height} fill="transparent" pointerEvents="all" />
        </svg>

        <div className="overlay" aria-hidden="true">
          {bands.filter((b) => b.peak).map((b, k) => {
            const i = bands.indexOf(b);
            return (
              <span
                key={b.key}
                className="note"
                style={{
                  ...regs.annot,
                  color: accent,
                  ...noteAnchor(pct(x(b.right) + 12, FRAME.width)),
                  top: `${pct(cy(i), height)}%`,
                  transform: `${noteAnchor(pct(x(b.right) + 12, FRAME.width)).transform} translateY(-50%)`,
                }}
              >
                {peakNote}
              </span>
            );
          })}
        </div>

        <div className="x-axis" style={{ pointerEvents: "none" }}>
          {xTicks.map((t) => (
            <span key={t} className="axis-label x" style={{ ...regs.axis, left: `${pct(x(t), FRAME.width)}%` }}>
              {t === 0 ? "0" : `${Math.abs(t) / 1000}k`}
            </span>
          ))}
        </div>
      </div>

      <p className="chart-reading" style={{ ...regs.body, margin: "10px 0 0" }}>{reading}</p>
      <p className="chart-source" style={{ ...regs.body, margin: "6px 0 0" }}>{source}</p>
    </figure>
  );
}
