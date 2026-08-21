/**
 * The web beat of "le budget 2026 ne se partage pas" — one diverging bar per budget line.
 *
 * Same shape `stories/stress-k-flat-inspections/beats/1-flat-inspections/FlatInspectionsWeb.tsx`
 * teaches (a fluid frame: the `<svg>` carries geometry only, every WORD is HTML at a fixed pixel
 * size), with the departures a signed series forces:
 *
 *   1. THE ZERO LINE IS INSIDE THE PLOT, not at its left edge, and it is drawn in `ink` rather than
 *      in the gridline colour. It is the only thing in this chart every bar is measured from, so it
 *      is furniture that has to be read, not furniture that stays out of the way.
 *   2. THE SIX EXPENDITURE LABELS SIT JUST OUTSIDE THEIR BAR'S GROWING END, in a fixed-pixel track
 *      reserved on the right (`--r-gutter`, measured in node from the widest label actually drawn).
 *      THE WRITE-BACK'S LABEL DOES NOT. Its bar grows LEFT, and putting its label outside that end
 *      needs a second reserved track on the left — which, measured at 375px on this beat's second
 *      render, left the name column no room and collided the two. Its row is the one row whose
 *      whole positive half is empty, so the label is anchored just RIGHT of the zero line instead,
 *      on the row's own tint, where there is guaranteed space at every width. The minus sign
 *      (U+2212, `budget-geometry.ts`'s `fr`) carries the direction the position no longer does.
 *   3. THE ACCENT IS SPENT ON THE ONE ROW THAT RUNS THE OTHER WAY. Six expenditure bars take the
 *      furniture's own `muted`, derived from the ground; `Recettes exceptionnelles` takes the
 *      accent. Colour and direction say the same thing here, which is the case where a second
 *      encoding costs nothing — and the row the accent picks out is the row the takeaway is about.
 *
 * Read `chart-web/references/web-discipline.md` before changing this file, and this beat's own
 * `BRIEF.md` for why a part-to-whole treatment was refused rather than drawn.
 */

import { divergingGeometry, fr, type Row } from "./budget-geometry";

export type BudgetFrame = {
  width: number;
  height: number;
  title: { fontSize: number; fontWeight: number };
  subtitle: { fontSize: number; fontWeight: number };
  source: { fontSize: number; fontWeight: number };
  category: { fontSize: number; fontWeight: number };
  value: { fontSize: number; fontWeight: number };
  axis: { fontSize: number; fontWeight: number };
  rowLeadPx: number;
  rowAirPx: number;
  gapRatio: number;
  gap: number;
  xAxisRowPx: number;
};

export const FRAME: BudgetFrame = {
  width: 640,
  height: 300,
  title: { fontSize: 24, fontWeight: 700 },
  subtitle: { fontSize: 14, fontWeight: 400 },
  source: { fontSize: 13, fontWeight: 400 },
  category: { fontSize: 14, fontWeight: 500 },
  value: { fontSize: 14, fontWeight: 600 },
  axis: { fontSize: 12, fontWeight: 600 },
  rowLeadPx: 22,
  rowAirPx: 14,
  gapRatio: 0.32,
  gap: 8,
  xAxisRowPx: 24,
};

type Measure = (text: string, font: { fontSize: number; fontWeight?: number }) => number;

function pct(value: number, total: number): number {
  return total === 0 ? 0 : Math.round((value / total) * 10000) / 100;
}

/** The subject row's own background: the ground moved `ratio` of the way toward the accent. Copied
 *  from `proof/webz-diverging-bar-eu-per-capita/DivergingBarWeb.tsx` rather than imported — a story
 *  workspace is not a skill, and this project duplicates across that boundary. */
function blend(ground: string, accent: string, ratio: number): string {
  const read = (hex: string) => [1, 3, 5].map((at) => Number.parseInt(hex.slice(at, at + 2), 16));
  const [gr, gg, gb] = read(ground);
  const [ar, ag, ab] = read(accent);
  const mix = (a: number, b: number) => Math.round(a + (b - a) * ratio);
  return `#${[mix(gr, ar), mix(gg, ag), mix(gb, ab)]
    .map((c) => c.toString(16).padStart(2, "0"))
    .join("")}`;
}

export function BudgetPartsWeb({
  data,
  title,
  subtitle,
  source,
  alt,
  ground,
  accent,
  ink,
  muted,
  grid,
  frame,
  measure,
  zeroLabel,
  unit,
}: {
  /** Already sorted, largest amount first — this component draws the order it is handed. */
  data: Row[];
  title: string;
  subtitle: string;
  source: string;
  alt: string;
  ground: string;
  accent: string;
  ink: string;
  muted: string;
  grid: string;
  frame: BudgetFrame;
  measure: Measure;
  zeroLabel: string;
  unit: string;
}) {
  if (data.length < 1) throw new Error(`a budget-parts beat needs at least one row, got ${data.length}`);

  const rowHeight = frame.height / data.length;
  const g = divergingGeometry(data, {
    width: frame.width,
    height: frame.height,
    rowHeight,
    gapRatio: frame.gapRatio,
  });

  const valueLabels = data.map((r) => `${fr(r.amount)} ${unit}`);
  const positiveLabels = valueLabels.filter((_, i) => data[i].amount >= 0);

  // The measured width, plus the 8px the CSS insets the name by, plus 6px of slack: `measureText`
  // and the browser's own shaping of the same stack disagree by a pixel or two, and at full width
  // that difference was enough to wrap the longest name onto a second line for no reason. The slack
  // costs nothing — the track is capped as a percentage anyway, so a narrow frame still wraps.
  const categoryGutterPx =
    Math.ceil(Math.max(...data.map((r) => measure(r.name, frame.category)))) + frame.gap + 14;
  const rightGutterPx =
    (positiveLabels.length === 0
      ? 0
      : Math.ceil(Math.max(...positiveLabels.map((l) => measure(l, frame.value)))) + frame.gap) + 2;

  const minPlotHeightPx = data.length * (frame.rowLeadPx + frame.rowAirPx);
  const totalWidth = categoryGutterPx + frame.width + rightGutterPx;
  const subjectBand = blend(ground, accent, 0.10);

  return (
    <figure
      className="chart-figure"
      style={{
        ["--ground" as string]: ground,
        ["--accent" as string]: accent,
        ["--ink" as string]: ink,
        ["--muted" as string]: muted,
        ["--grid" as string]: grid,
        ["--subject-band" as string]: subjectBand,
        ["--title-size" as string]: `${frame.title.fontSize}px`,
        ["--title-weight" as string]: frame.title.fontWeight,
        ["--subtitle-size" as string]: `${frame.subtitle.fontSize}px`,
        ["--source-size" as string]: `${frame.source.fontSize}px`,
        ["--category-size" as string]: `${frame.category.fontSize}px`,
        ["--category-weight" as string]: frame.category.fontWeight,
        ["--value-size" as string]: `${frame.value.fontSize}px`,
        ["--value-weight" as string]: frame.value.fontWeight,
        ["--axis-size" as string]: `${frame.axis.fontSize}px`,
        ["--axis-weight" as string]: frame.axis.fontWeight,
      }}
    >
      <div className="chart-header" style={{ marginBottom: 18 }}>
        <h2 className="chart-title">{title}</h2>
        <p className="chart-caveat">{subtitle}</p>
      </div>

      <div
        className="chart-plot budget-plot"
        style={{
          ["--y-gutter" as string]: `${categoryGutterPx}px`,
          ["--r-gutter" as string]: `${rightGutterPx}px`,
          ["--x-axis-h" as string]: `${frame.xAxisRowPx}px`,
          ["--min-plot-h" as string]: `${minPlotHeightPx}px`,
          aspectRatio: `${totalWidth} / ${frame.height}`,
        }}
      >
        <div className="y-axis">
          {g.rows.map((row) => (
            <span
              key={row.name}
              className={row.negative ? "cat-label subject" : "cat-label"}
              style={{
                top: `${pct(row.centerY, frame.height)}%`,
                color: row.negative ? accent : muted,
              }}
            >
              {row.name}
            </span>
          ))}
        </div>

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

          {/* The subject's own row, tinted so its name, its bar and its two labels read as one
              thing even when the bar itself is short. */}
          {g.rows.map((row, i) =>
            row.negative ? (
              <rect
                key={`band-${row.name}`}
                x={0}
                y={i * rowHeight}
                width={frame.width}
                height={rowHeight}
                fill={subjectBand}
              />
            ) : null,
          )}

          {/* The bars. Two fills, one per sign: the furniture's own muted for the six expenditure
              lines, the accent for the single write-back the takeaway is about. */}
          {g.rows.map((row) => (
            <rect
              key={row.name}
              x={row.barStart}
              y={row.top}
              width={Math.max(row.barWidth, 0)}
              height={row.height}
              fill={row.negative ? accent : muted}
            />
          ))}

          {/* Zero. Every bar in this chart is a length measured from this line, so it is drawn in
              ink at full height and labelled below. */}
          <line
            x1={g.zeroX}
            x2={g.zeroX}
            y1={0}
            y2={frame.height}
            stroke={ink}
            strokeWidth={1}
            vectorEffect="non-scaling-stroke"
          />

          {g.rows.map((row, i) => (
            <rect
              key={`hit-${row.name}`}
              className="row-hit"
              x={0}
              y={i * rowHeight}
              width={frame.width}
              height={rowHeight}
              fill="transparent"
              pointerEvents="all"
              tabIndex={0}
              role="img"
              aria-label={`${row.name} : ${fr(row.amount)} ${unit}, ${fr(row.share)} % du budget primitif`}
              data-detail={`${row.name} · ${fr(row.amount)} ${unit} · ${fr(row.share)} % du budget primitif`}
            />
          ))}
        </svg>

        <div className="overlay" aria-hidden="true">
          {g.rows.map((row, i) => (
            <span
              key={`value-${row.name}`}
              /* The write-back's label is anchored to ZERO, not to its bar's own end — see this
                 file's own header, item 2. It lands on the row's own tint, so its chip is the band
                 rather than the ground: a --ground chip there punches a ragged hole through it. */
              className={row.negative ? "value-label from-zero on-band" : "value-label positive"}
              style={{
                left: `${pct(row.negative ? g.zeroX : row.barEnd, frame.width)}%`,
                top: `${pct(row.centerY, frame.height)}%`,
                color: row.negative ? accent : ink,
              }}
            >
              {valueLabels[i]}
            </span>
          ))}
        </div>

        <div className="x-axis" aria-hidden="true">
          <span className="zero" style={{ left: `${pct(g.zeroX, frame.width)}%` }}>
            {zeroLabel}
          </span>
        </div>
      </div>

      <p className="chart-source">{source}</p>
    </figure>
  );
}
