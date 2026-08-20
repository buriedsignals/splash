/**
 * The web beat of "six regions, one number" — flat-inspections. Same shape
 * `proof/web-co2-ranking/RankingWeb.tsx` teaches (a fluid frame: `<svg>` carries geometry only, HTML
 * carries every word at a fixed pixel size), with ONE deliberate departure: `RankingWeb.tsx` picks
 * a single subject row and mutes the rest, because its argument is a COMPARISON (Switzerland against
 * nine peers). This beat has no comparison to draw — every row reports the same number — so there is
 * no subject to pick out and no group to mute it against. All six bars carry the SAME accent ink:
 * the flat set, together, is what this beat is proving. Muting five of six and highlighting one
 * would invent a distinction the data does not carry.
 *
 * Read `chart-web/references/web-discipline.md` before changing this file. See this beat's own
 * `BRIEF.md`, "The decision", for why this beat draws at all rather than refusing the form.
 */

import { rankingGeometry, en, type Row } from "./bar-geometry";

const UNIT = "";

export type FlatFrame = {
  width: number;
  height: number;
  title: { fontSize: number; fontWeight: number };
  subtitle: { fontSize: number; fontWeight: number };
  source: { fontSize: number; fontWeight: number };
  category: { fontSize: number; fontWeight: number };
  value: { fontSize: number; fontWeight: number };
  rowLeadPx: number;
  rowAirPx: number;
  gapRatio: number;
  gap: number;
};

export const FRAME: FlatFrame = {
  width: 640,
  height: 280,
  title: { fontSize: 24, fontWeight: 700 },
  subtitle: { fontSize: 14, fontWeight: 400 },
  source: { fontSize: 13, fontWeight: 400 },
  category: { fontSize: 14, fontWeight: 500 },
  value: { fontSize: 14, fontWeight: 500 },
  rowLeadPx: 18,
  rowAirPx: 8,
  gapRatio: 0.3,
  gap: 8,
};

type Measure = (text: string, font: { fontSize: number; fontWeight?: number }) => number;

function pct(value: number, total: number): number {
  return total === 0 ? 0 : Math.round((value / total) * 1000) / 10;
}

export function FlatInspectionsWeb({
  data,
  title,
  subtitle,
  source,
  alt,
  ground,
  accent,
  ink,
  muted,
  frame,
  measure,
}: {
  /** Every row reports the same value — this component draws rows in the order it is handed, it
   *  does not sort by value (there is nothing to rank). */
  data: Row[];
  title: string;
  subtitle: string;
  source: string;
  alt: string;
  ground: string;
  accent: string;
  ink: string;
  muted: string;
  frame: FlatFrame;
  measure: Measure;
}) {
  if (data.length < 1) throw new Error(`a flat-inspections beat needs at least one row, got ${data.length}`);

  const printedLabels = data.map((r) => en(r.value, 0) + UNIT);
  const preciseLabels = data.map((r) => en(r.value, 0) + UNIT);

  const categoryGutterPx =
    Math.ceil(Math.max(...data.map((r) => measure(r.name, frame.category)))) + frame.gap + 2;
  const valueGutterPx =
    Math.ceil(Math.max(...printedLabels.map((l) => measure(l, frame.value)))) + frame.gap + 2;

  const minPlotHeightPx = data.length * (frame.rowLeadPx + frame.rowAirPx);

  const rowHeight = frame.height / data.length;
  const g = rankingGeometry(data, {
    width: frame.width,
    height: frame.height,
    padding: { top: 0, right: 0, bottom: 0, left: 0 },
    rowHeight,
    gapRatio: frame.gapRatio,
  });

  const totalWidth = categoryGutterPx + frame.width + valueGutterPx;

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
        ["--category-size" as string]: `${frame.category.fontSize}px`,
        ["--category-weight" as string]: frame.category.fontWeight,
        ["--value-size" as string]: `${frame.value.fontSize}px`,
        ["--value-weight" as string]: frame.value.fontWeight,
      }}
    >
      <div className="chart-header" style={{ marginBottom: 18 }}>
        <h2 className="chart-title">{title}</h2>
        <p className="chart-caveat">{subtitle}</p>
      </div>

      <div
        className="chart-plot ranking-plot"
        style={{
          ["--y-gutter" as string]: `${categoryGutterPx}px`,
          ["--r-gutter" as string]: `${valueGutterPx}px`,
          ["--x-axis-h" as string]: "0px",
          ["--min-plot-h" as string]: `${minPlotHeightPx}px`,
          aspectRatio: `${totalWidth} / ${frame.height}`,
        }}
      >
        <div className="y-axis">
          {g.rows.map((row) => (
            <span
              key={row.name}
              className="cat-label"
              style={{
                top: `${pct(row.centerY, frame.height)}%`,
                color: muted,
                fontWeight: frame.category.fontWeight,
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
          fontFamily="Helvetica, Arial, sans-serif"
        >
          <desc>{alt}</desc>
          <rect x={0} y={0} width={frame.width} height={frame.height} fill={ground} />

          <line
            x1={0}
            x2={0}
            y1={0}
            y2={frame.height}
            stroke={muted}
            strokeWidth={1}
            vectorEffect="non-scaling-stroke"
          />

          {/* Every bar in the SAME accent ink — see this file's own header doc-comment for why
              nothing here is muted: the flat set is the subject, together. */}
          {g.rows.map((row) => (
            <rect
              key={row.name}
              x={row.x0}
              y={row.top}
              width={Math.max(row.barWidth, 0)}
              height={row.height}
              fill={accent}
            />
          ))}

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
              aria-label={`${row.name}: ${preciseLabels[i]} failed inspections`}
              data-detail={`${row.name} · ${preciseLabels[i]} failed inspections`}
            />
          ))}
        </svg>

        <div className="overlay" aria-hidden="true">
          {g.rows.map((row, i) => (
            <span
              key={`value-${row.name}`}
              className="value-label"
              style={{
                left: `${pct(row.x1, frame.width)}%`,
                top: `${pct(row.centerY, frame.height)}%`,
                color: accent,
                fontWeight: frame.value.fontWeight,
              }}
            >
              {printedLabels[i]}
            </span>
          ))}
        </div>
      </div>

      <p className="chart-source">{source}</p>
    </figure>
  );
}
