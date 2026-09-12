/**
 * The ten countries that emitted the most CO₂ in 2024, drawn as columns THROUGH the design base and
 * delivered as an interactive page. The `bar and column` beat of this tree's web format.
 *
 * WHAT THE WEB ADDS TO A RANKING, AND WHY IT IS NOT THE PLATE REPEATED. Ten bars is few enough that
 * a static plate can label every one, so "hover to see the value" would be the same numbers a second
 * time — the repetition `web-discipline.md` refuses outright. The reading this page adds is a
 * DERIVED one the plate has no room for: for every country, how many of the countries BELOW it in
 * the same ranking you must add together before they match it. That is the headline's own arithmetic
 * — China against the next five — asked of all ten, and it is computed server-side over the full
 * 215-country ranking, not over the ten drawn.
 *
 * `every-bar-labelled-lets-the-axis-go` — every column prints its own number, so the page carries a
 * zero baseline and a stated unit instead of a value axis. A length encoding still needs its zero
 * and it has one; what it does not need is a ruler nobody reads once every bar is written.
 *
 * `accent-marks-the-thread` — one column is the subject and carries the direction's accent. The
 * other nine are one neutral step off the direction's own ground: they are the comparison, and a
 * ranking where every bar shouts has no subject.
 */

import { mix, adjustToContrast, TEXT_CONTRAST_MIN, NON_TEXT_CONTRAST_MIN } from "#shared/chart-beat/colour.mjs";
import { webRegisters, figureVars, noteAnchor } from "#shared/design-base/web.mjs";

export const FRAME = { width: 900, height: 420, xAxisRowPx: 34 };

export type Column = {
  code: string;
  name: string;
  gt: number;
  label: string;
  /** The detail this page exists to add — already a sentence, formatted in the runner. */
  detail: string;
};

const pct = (value: number, extent: number) => (value / extent) * 100;

export function DirectedColumnsWeb({
  columns,
  subject,
  bracket,
  top,
  title,
  eyebrow,
  caveat,
  source,
  alt,
  unit,
  reading,
  bracketNote,
  direction,
  ground,
  accent,
  ink,
  muted,
  grid,
}: {
  columns: Column[];
  subject: string;
  bracket: { from: number; to: number; label: string };
  top: number;
  title: string;
  eyebrow: string;
  caveat: string;
  source: string;
  alt: string;
  unit: string;
  reading: string;
  bracketNote: string;
  direction: any;
  ground: string;
  accent: string;
  ink: string;
  muted: string;
  grid: string;
}) {
  const regs = webRegisters(direction, { ink: { ink, muted, accent } });
  if (!columns.some((c) => c.code === subject))
    throw new Error(`the subject ${subject} is not among the columns drawn`);

  // The nine that are not the subject. One neutral, taken to the non-text floor against the ground
  // so a column is never a shape the reader has to guess at.
  let neutral = mix(ground, ink, 0.42);
  neutral = adjustToContrast(neutral, ground, NON_TEXT_CONTRAST_MIN) ?? neutral;
  const baseline = mix(ground, ink, 0.75);

  const band = FRAME.width / columns.length;
  const barW = band * 0.62;
  // HEADROOM for the printed value that sits on top of each column, and for the bracket above the
  // second group. Measured, not chosen: the value register's own size plus the bracket's two rows.
  const scaleTop = top * 1.22;
  const y = (gt: number) => FRAME.height - (gt / scaleTop) * FRAME.height;
  const cx = (i: number) => band * i + band / 2;

  const bracketY = Math.min(...columns.slice(bracket.from, bracket.to + 1).map((c) => y(c.gt))) - 26;

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
          viewBox={`0 0 ${FRAME.width} ${FRAME.height}`}
          preserveAspectRatio="none"
        >
          <desc>{alt}</desc>
          <rect x={0} y={0} width={FRAME.width} height={FRAME.height} fill={ground} />

          {columns.map((c, i) => (
            <rect
              key={c.code}
              x={cx(i) - barW / 2}
              y={y(c.gt)}
              width={barW}
              height={FRAME.height - y(c.gt)}
              fill={c.code === subject ? accent : neutral}
            />
          ))}

          {/* THE BRACKET — the headline's own comparison, drawn where it is made. It spans the
              columns it adds up and nothing else, so a reader can count the bars under it. */}
          <path
            d={
              `M ${cx(bracket.from) - barW / 2} ${bracketY + 8} L ${cx(bracket.from) - barW / 2} ${bracketY} ` +
              `L ${cx(bracket.to) + barW / 2} ${bracketY} L ${cx(bracket.to) + barW / 2} ${bracketY + 8}`
            }
            fill="none"
            stroke={mix(ground, ink, 0.55)}
            strokeWidth={direction.stroke?.rule ?? 0.8}
            vectorEffect="non-scaling-stroke"
          />

          <line
            x1={0}
            x2={FRAME.width}
            y1={FRAME.height}
            y2={FRAME.height}
            stroke={baseline}
            strokeWidth={1}
            vectorEffect="non-scaling-stroke"
          />

          {columns.map((c, i) => (
            <circle
              key={c.code}
              className="pt"
              cx={cx(i)}
              cy={y(c.gt)}
              r={5}
              fill="transparent"
              stroke="none"
              tabIndex={0}
              role="img"
              aria-label={`${c.name} : ${c.label} ${unit}. ${c.detail}`}
              data-detail={`${c.name} · ${c.label} ${unit} · ${c.detail}`}
            />
          ))}
          <rect className="hit-area" x={0} y={0} width={FRAME.width} height={FRAME.height} fill="transparent" pointerEvents="all" />
        </svg>

        <div className="overlay" aria-hidden="true">
          {columns.map((c, i) => (
            <span
              key={c.code}
              className="end-label"
              style={{
                ...regs.value,
                color: c.code === subject ? accent : adjustToContrast(ink, ground, TEXT_CONTRAST_MIN) ?? ink,
                left: `${pct(cx(i), FRAME.width)}%`,
                top: `${pct(y(c.gt), FRAME.height)}%`,
                transform: "translate(-50%, -100%) translateY(-4px)",
              }}
            >
              {c.label}
            </span>
          ))}
          <span
            className="note"
            style={{
              ...regs.annot,
              ...noteAnchor(pct((cx(bracket.from) + cx(bracket.to)) / 2, FRAME.width)),
              top: `${pct(bracketY, FRAME.height)}%`,
              transform: `${noteAnchor(pct((cx(bracket.from) + cx(bracket.to)) / 2, FRAME.width)).transform} translateY(-100%)`,
              textAlign: "center",
            }}
          >
            {bracketNote}
          </span>
        </div>

        <div className="x-axis">
          {columns.map((c, i) => (
            <span
              key={c.code}
              className="axis-label x"
              style={{
                ...regs.axis,
                left: `${pct(cx(i), FRAME.width)}%`,
                color: c.code === subject ? accent : (regs.axis.color as string),
                fontWeight: c.code === subject ? 700 : regs.axis.fontWeight,
              }}
            >
              {c.name}
            </span>
          ))}
        </div>
      </div>

      <p className="chart-reading" style={{ ...regs.body, margin: "10px 0 0" }}>{reading}</p>
      <p className="chart-source" style={{ ...regs.body, margin: "6px 0 0" }}>{source}</p>
    </figure>
  );
}
