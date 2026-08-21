/**
 * Beat 2, the WEB beat: the six networks ranked twice — by total trips, and by trips per resident.
 *
 * Read `chart-web/references/web-discipline.md` and `chart-beat/references/types/slope.md` before
 * changing this file.
 *
 * THE FLUID FRAME, as this format teaches it: the `<svg>` carries GEOMETRY ONLY — the two axis
 * rules and the six lines — scaled by `viewBox` + `preserveAspectRatio="none"`, and EVERY WORD is
 * plain HTML positioned by `%` over the same box, at a FIXED CSS pixel size. Geometry stretches;
 * type does not.
 *
 * NO ENDPOINT DOTS, and that is a consequence of the same stretch. `preserveAspectRatio="none"`
 * turns an SVG `<circle>` into an ellipse at every width where the box's proportions differ from
 * the geometry's. The scatter beat in `proof/` solves that by making its dots HTML; a slopegraph
 * does not need to — the line terminates ON its own axis rule and the label at that end names it,
 * which is how a slopegraph is normally drawn. One less thing to keep round.
 *
 * THE HOVERABLE LINE. Each visible line is followed by a transparent `.line-hit` twin — the
 * contract `chart-web`'s own stylesheet and `interaction.mjs`'s `initLines` share. `pointer-events:
 * stroke` (set in that stylesheet, not here) makes the STROKE the hit region rather than the
 * bounding box, which for a diagonal is mostly empty space. The twin is focusable and carries its
 * own `aria-label` and `data-detail`, so Tab reaches every city with the script absent entirely.
 */

import { scaleLinear } from "d3-scale";

export type SlopeRow = {
  city: string;
  /** 1 = most, on each of the two readings. */
  rankByTotal: number;
  rankByRate: number;
  trips: number;
  population: number;
  rate: number;
};

export type SlopeFrame = {
  /** The plot's canonical width/height in SVG user units. Not a pixel size and not a cap — it fixes
   *  the geometry's internal proportions, which become one `aspect-ratio`. */
  width: number;
  height: number;
  /** Where the two axis rules stand, in those same units. The space outside them is what the HTML
   *  labels occupy, so it is sized in geometry and the words inside it are sized in CSS. */
  leftAxis: number;
  rightAxis: number;
  /** Vertical inset for rank 1 and rank n, in user units. */
  topInset: number;
  bottomInset: number;
  /** Fixed CSS pixel row under the plot for the two column titles. */
  xAxisRowPx: number;
  title: { fontSize: number; fontWeight: number };
  subtitle: { fontSize: number; fontWeight: number };
  source: { fontSize: number; fontWeight: number };
  axis: { fontSize: number };
  label: { fontSize: number; fontWeight: number };
  /** The transparent twin's stroke width, in user units — generously wide so the reader aims at the
   *  line they can see and hits a target well past the touch-target floor. */
  hitWidth: number;
  lineWidth: number;
};

export const FRAME: SlopeFrame = {
  width: 1000,
  height: 560,
  // 30% of the frame each side, not 25%. The gutter is GEOMETRY (a fraction of a box that shrinks
  // with the window) while the label inside it is TYPE (a fixed CSS size that does not) — so the
  // narrow end is what decides this number. Measured at 375px: at 250/750 the widest left label,
  // "Coimbra  28 m", started at x≈4px and sat inside the frame's own 24px inset; at 300/700 it
  // clears it. Checked by looking at the 375x812 screenshot, not by arithmetic.
  leftAxis: 300,
  rightAxis: 700,
  topInset: 40,
  bottomInset: 40,
  xAxisRowPx: 30,
  title: { fontSize: 24, fontWeight: 700 },
  subtitle: { fontSize: 14, fontWeight: 400 },
  source: { fontSize: 13, fontWeight: 400 },
  axis: { fontSize: 13 },
  label: { fontSize: 14, fontWeight: 600 },
  hitWidth: 26,
  lineWidth: 2.5,
};

/**
 * Pure geometry: ranks to two endpoints per city. Knows no colour, no font and no label — the same
 * boundary every other beat in this story draws.
 */
export function slopeGeometry(
  rows: SlopeRow[],
  frame: Pick<SlopeFrame, "width" | "height" | "leftAxis" | "rightAxis" | "topInset" | "bottomInset">,
) {
  const ranks = rows.flatMap((r) => [r.rankByTotal, r.rankByRate]);
  const y = scaleLinear()
    .domain([Math.min(...ranks), Math.max(...ranks)])
    .range([frame.topInset, frame.height - frame.bottomInset]);
  return {
    y,
    lines: rows.map((r) => ({
      city: r.city,
      x1: frame.leftAxis,
      y1: y(r.rankByTotal),
      x2: frame.rightAxis,
      y2: y(r.rankByRate),
    })),
  };
}

const pct = (value: number, total: number) => (value / total) * 100;

export function RankSlopeWeb({
  rows,
  title,
  subtitle,
  source,
  alt,
  leftColumnTitle,
  rightColumnTitle,
  leftLabel,
  rightLabel,
  detailFor,
  ground,
  accent,
  ink,
  muted,
  grid,
  subject,
  frame,
}: {
  rows: SlopeRow[];
  title: string;
  subtitle: string;
  source: string;
  alt: string;
  leftColumnTitle: string;
  rightColumnTitle: string;
  /** The words at each end of a city's own line, and the sentence its hover answers with. All three
   *  are built by the runner from the frozen data — this component formats no number. */
  leftLabel: (row: SlopeRow) => string;
  rightLabel: (row: SlopeRow) => string;
  detailFor: (row: SlopeRow) => string;
  ground: string;
  accent: string;
  ink: string;
  muted: string;
  grid: string;
  /** The one city the accent is reserved for. `slope.md`: at most two hues total, one neutral and
   *  one accent — a slope where every line is accented has no accent at all. */
  subject: string;
  frame: SlopeFrame;
}) {
  if (rows.length < 3)
    throw new Error(`a slope needs at least three categories to compare, got ${rows.length}`);
  if (!rows.some((r) => r.city === subject))
    throw new Error(`subject ${JSON.stringify(subject)} is not one of the lines drawn`);

  const g = slopeGeometry(rows, frame);
  const byCity = new Map(rows.map((r) => [r.city, r]));
  const totalHeight = frame.height + frame.xAxisRowPx;

  return (
    <figure
      className="chart-figure"
      style={{
        ["--ground" as string]: ground,
        ["--accent" as string]: accent,
        ["--ink" as string]: ink,
        ["--muted" as string]: muted,
        ["--title-size" as string]: `${frame.title.fontSize}px`,
        ["--title-weight" as string]: frame.title.fontWeight,
        ["--subtitle-size" as string]: `${frame.subtitle.fontSize}px`,
        ["--source-size" as string]: `${frame.source.fontSize}px`,
        ["--axis-size" as string]: `${frame.axis.fontSize}px`,
        ["--label-size" as string]: `${frame.label.fontSize}px`,
        ["--label-weight" as string]: frame.label.fontWeight,
        ["--note-size" as string]: `${frame.axis.fontSize}px`,
      }}
    >
      <div className="chart-header">
        <h2 className="chart-title">{title}</h2>
        <p className="chart-caveat">{subtitle}</p>
      </div>

      <div
        className="chart-plot"
        style={{
          ["--y-gutter" as string]: "0px",
          ["--x-axis-h" as string]: `${frame.xAxisRowPx}px`,
          aspectRatio: `${frame.width} / ${totalHeight}`,
        }}
      >
        <svg
          role="group"
          aria-label={title}
          xmlns="http://www.w3.org/2000/svg"
          className="chart"
          viewBox={`0 0 ${frame.width} ${frame.height}`}
          preserveAspectRatio="none"
        >
          <desc>{alt}</desc>
          <rect x={0} y={0} width={frame.width} height={frame.height} fill={ground} />

          {/* The two axis rules — the only furniture a slopegraph needs. */}
          {[frame.leftAxis, frame.rightAxis].map((x) => (
            <line
              key={`axis-${x}`}
              x1={x}
              x2={x}
              y1={frame.topInset - 18}
              y2={frame.height - frame.bottomInset + 18}
              stroke={grid}
              strokeWidth={1}
              vectorEffect="non-scaling-stroke"
            />
          ))}

          {g.lines.map((line) => {
            const row = byCity.get(line.city)!;
            const isSubject = line.city === subject;
            return (
              <g key={line.city}>
                <line
                  x1={line.x1}
                  y1={line.y1}
                  x2={line.x2}
                  y2={line.y2}
                  stroke={isSubject ? accent : muted}
                  strokeWidth={frame.lineWidth}
                  strokeLinecap="round"
                  vectorEffect="non-scaling-stroke"
                />
                {/* The transparent twin the reader actually aims at. Never painted; `.line-active`
                    is what the stylesheet may bring forward. */}
                <line
                  className="line-hit"
                  x1={line.x1}
                  y1={line.y1}
                  x2={line.x2}
                  y2={line.y2}
                  stroke="transparent"
                  strokeWidth={frame.hitWidth}
                  tabIndex={0}
                  role="img"
                  aria-label={detailFor(row)}
                  data-detail={detailFor(row)}
                  data-city={row.city}
                />
              </g>
            );
          })}
        </svg>

        {/* Every word, as HTML over the same grid cell. The inline `transform` overrides
            `.end-label`'s own — the class gives the type size and the ground-coloured pad, and each
            end needs to hang off its own side of its own axis rule. */}
        <div className="overlay">
          {g.lines.map((line) => {
            const row = byCity.get(line.city)!;
            const isSubject = line.city === subject;
            return (
              <span key={`l-${line.city}`}>
                <span
                  className="end-label"
                  style={{
                    left: `${pct(line.x1, frame.width)}%`,
                    top: `${pct(line.y1, frame.height)}%`,
                    transform: "translate(-100%, -50%) translateX(-12px)",
                    color: isSubject ? accent : ink,
                  }}
                >
                  {leftLabel(row)}
                </span>
                <span
                  className="end-label"
                  style={{
                    left: `${pct(line.x2, frame.width)}%`,
                    top: `${pct(line.y2, frame.height)}%`,
                    transform: "translate(0, -50%) translateX(12px)",
                    color: isSubject ? accent : ink,
                  }}
                >
                  {rightLabel(row)}
                </span>
              </span>
            );
          })}
        </div>

        <div className="x-axis">
          <span
            className="axis-label x"
            style={{ left: `${pct(frame.leftAxis, frame.width)}%`, color: muted }}
          >
            {leftColumnTitle}
          </span>
          <span
            className="axis-label x"
            style={{ left: `${pct(frame.rightAxis, frame.width)}%`, color: muted }}
          >
            {rightColumnTitle}
          </span>
        </div>
      </div>

      <p className="chart-source">{source}</p>
    </figure>
  );
}
