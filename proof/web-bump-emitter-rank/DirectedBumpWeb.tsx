/**
 * The world ranking of annual CO₂ emitters, 1990 to 2024, drawn as a bump chart THROUGH the design
 * base and delivered as an interactive page.
 *
 * `rank-is-printed-on-the-entry` — a bump's vertical position IS a rank, and a rank is a number, so
 * every entry carries it in words at both ends rather than leaving the reader to count rows.
 *
 * BOTH ENDS CARRY A NAME, and that is collision-free BY CONSTRUCTION rather than by luck: in any one
 * year the drawn countries hold DISTINCT ranks, so no two labels in one column can share a row. The
 * component asserts it on the real ranks at both ends and throws otherwise.
 *
 * WHAT THE WEB ADDS, AND WHAT IT COSTS. A bump chart trades the VALUE for the ORDER: that is the
 * whole bargain, and it is why a reader who sees a line cross cannot tell whether the country below
 * fell or the country above merely grew faster. This page gives the value back. One mark per YEAR —
 * never one per country per year, which would make a pointer resolving by x ambiguous between six
 * lines stacked in one column — answers with the subject's own rank that year, its emissions in that
 * year, and who sat immediately above and below it. Thirty-five readings the plate has no room for.
 */

import { mix, adjustToContrast, contrast, TEXT_CONTRAST_MIN, NON_TEXT_CONTRAST_MIN } from "#shared/chart-beat/colour.mjs";
import { webRegisters, figureVars, noteAnchor } from "#shared/design-base/web.mjs";

export const FRAME = { width: 1000, height: 330, xAxisRowPx: 28 };
/** The strip on the RIGHT of the viewBox that carries the finishing labels, in viewBox units.
 *  Measured, not chosen: the first render placed those labels at `left: 100%` of the plot cell and
 *  they hung outside the figure — 96px of horizontal document scroll at every one of the seven
 *  verified viewports. A label that names a line belongs inside the box the line is drawn in. */
const RIGHT_GUTTER = 250;
const PLOT_RIGHT = FRAME.width - RIGHT_GUTTER;

export type Line = {
  code: string;
  name: string;
  ranks: number[];
  startLabel: string;
  endLabel: string;
};

export type Crossing = { year: number; rank: number; text: string };

const pct = (value: number, extent: number) => (value / extent) * 100;

export function DirectedBumpWeb({
  lines,
  years,
  marks,
  subject,
  maxRank,
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
  years: number[];
  marks: { year: number; rank: number; detail: string }[];
  subject: string;
  maxRank: number;
  crossings: Crossing[];
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

  let other = mix(ground, ink, 0.34);
  if (contrast(other, ground) < NON_TEXT_CONTRAST_MIN)
    other = adjustToContrast(other, ground, NON_TEXT_CONTRAST_MIN) ?? other;

  // Collision-free by construction, and proven rather than trusted.
  for (const column of [0, years.length - 1]) {
    const seen = new Set(lines.map((l) => l.ranks[column]));
    if (seen.size !== lines.length)
      throw new Error(
        `two labels would share a row in the ${years[column]} column: ranks ` +
          `${lines.map((l) => l.ranks[column]).join(", ")}`,
      );
  }

  const x = (i: number) => (i / (years.length - 1)) * PLOT_RIGHT;
  const y = (rank: number) => ((rank - 0.5) / maxRank) * FRAME.height;
  const path = (l: Line) => l.ranks.map((r, i) => `${i === 0 ? "M" : "L"} ${x(i)} ${y(r)}`).join(" ");

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
          ["--y-gutter" as string]: "112px",
          ["--x-axis-h" as string]: `${FRAME.xAxisRowPx}px`,
          aspectRatio: `${FRAME.width + 112} / ${FRAME.height + FRAME.xAxisRowPx}`,
        }}
      >
        <div className="y-axis">
          {lines.map((l) => (
            <span
              key={l.code}
              className="axis-label y"
              style={{
                ...regs.axis,
                color: l.code === subject ? accent : (regs.axis.color as string),
                fontWeight: l.code === subject ? 700 : regs.axis.fontWeight,
                top: `${pct(y(l.ranks[0]), FRAME.height)}%`,
                // A rank plus a country name is a long run, and the shared stylesheet sets
                // `white-space: nowrap` on an axis label. At 375px that ran off the frame.
                whiteSpace: "normal",
                lineHeight: 1.15,
              }}
            >
              {l.startLabel}
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

          {Array.from({ length: maxRank }, (_, i) => i + 1).map((r) => (
            <line key={r} x1={0} x2={PLOT_RIGHT} y1={y(r)} y2={y(r)} stroke={grid} strokeWidth={1} vectorEffect="non-scaling-stroke" />
          ))}

          {lines.filter((l) => l.code !== subject).map((l) => (
            <path key={l.code} d={path(l)} fill="none" stroke={other} strokeWidth={direction.stroke?.rule ? direction.stroke.rule * 2 : 1.6} strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
          ))}
          {lines.filter((l) => l.code === subject).map((l) => (
            <path key={l.code} d={path(l)} fill="none" stroke={accent} strokeWidth={direction.stroke?.series ?? 2.4} strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
          ))}

          {/* Each crossing the argument rests on, ringed on the subject's own line. */}
          {crossings.map((c) => (
            <circle
              key={c.year}
              cx={x(years.indexOf(c.year))}
              cy={y(c.rank)}
              r={5}
              fill={ground}
              stroke={accent}
              strokeWidth={2}
              vectorEffect="non-scaling-stroke"
            />
          ))}

          {marks.map((m) => (
            <circle
              key={m.year}
              className="pt"
              cx={x(years.indexOf(m.year))}
              cy={y(m.rank)}
              r={5}
              fill="transparent"
              stroke="none"
              tabIndex={0}
              role="img"
              aria-label={m.detail}
              data-detail={m.detail}
            />
          ))}
          <rect className="hit-area" x={0} y={0} width={FRAME.width} height={FRAME.height} fill="transparent" pointerEvents="all" />
        </svg>

        <div className="overlay" aria-hidden="true">
          {lines.map((l) => (
            <span
              key={l.code}
              className="end-label"
              style={{
                ...regs.value,
                color: l.code === subject ? accent : adjustToContrast(ink, ground, TEXT_CONTRAST_MIN) ?? ink,
                left: `${pct(PLOT_RIGHT + 10, FRAME.width)}%`,
                top: `${pct(y(l.ranks[l.ranks.length - 1]), FRAME.height)}%`,
                transform: "translateY(-50%)",
                whiteSpace: "normal",
                maxWidth: `${(RIGHT_GUTTER / FRAME.width) * 100}%`,
                overflowWrap: "anywhere",
                lineHeight: 1.15,
              }}
            >
              {l.endLabel}
            </span>
          ))}
          {crossings.map((c, i) => (
            <span
              key={c.year}
              className="note"
              style={{
                ...regs.annot,
                ...noteAnchor(pct(x(years.indexOf(c.year)), FRAME.width)),
                top: `${pct(y(c.rank) - FRAME.height / (maxRank * 2), FRAME.height)}%`,
                transform: `${noteAnchor(pct(x(years.indexOf(c.year)), FRAME.width)).transform} translateY(-100%)`,
              }}
            >
              {c.text}
            </span>
          ))}
        </div>

        <div className="x-axis">
          {[years[0], years[Math.floor(years.length / 2)], years[years.length - 1]].map((yr) => (
            <span key={yr} className="axis-label x" style={{ ...regs.axis, left: `${pct(x(years.indexOf(yr)), FRAME.width)}%` }}>
              {yr}
            </span>
          ))}
        </div>
      </div>

      <p className="chart-reading" style={{ ...regs.body, margin: "10px 0 0" }}>{reading}</p>
      <p className="chart-source" style={{ ...regs.body, margin: "6px 0 0" }}>{source}</p>
    </figure>
  );
}
