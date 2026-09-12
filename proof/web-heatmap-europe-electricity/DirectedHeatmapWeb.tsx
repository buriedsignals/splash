/**
 * Twelve European countries against nine electricity sources, drawn as a matrix heatmap THROUGH the
 * design base and delivered as an interactive page.
 *
 * `the-cell-value-is-printed-or-the-region-is-named` — a heatmap cell is a colour, and a colour is a
 * bin. Either the number is printed in the cell or the reader is owed another way to get it. This
 * page does BOTH: the cells that carry the argument print their own share, and every cell — all
 * 108 — answers with its exact value under the pointer.
 *
 * `a-sequential-grid-is-one-hue-cluster` — one hue, the direction's own accent, at increasing
 * strength against the direction's own ground. Nine sources are nine columns, not nine colours: a
 * qualitative palette here would say the sources differ in KIND along the axis that is supposed to
 * carry magnitude.
 *
 * `order-is-chosen-from-the-answer` — rows are ordered by low-carbon share and columns are grouped
 * renewables-first, so the three routes the headline names are three shapes a reader can see rather
 * than three facts they have to assemble.
 *
 * The pointer resolves by CELL (`data-hit="cell"`): twelve rows share every x.
 */

import { mix, adjustToContrast, contrast, TEXT_CONTRAST_MIN, NON_TEXT_CONTRAST_MIN } from "#shared/chart-beat/colour.mjs";
import { webRegisters, figureVars } from "#shared/design-base/web.mjs";
import { inkOnFill } from "#shared/design-base/web.mjs";

const CELL_W = 74;
const CELL_H = 28;
export const FRAME = { width: 0, height: 0, xAxisRowPx: 44 };

export type Cell = {
  row: number;
  col: number;
  value: number;
  bin: number;
  label: string | null;
  detail: string;
};

export type Bin = { label: string };

const pct = (value: number, extent: number) => (value / extent) * 100;

export function DirectedHeatmapWeb({
  cells,
  rowLabels,
  colLabels,
  bins,
  routes,
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
  cells: Cell[];
  rowLabels: { name: string; route: string }[];
  colLabels: string[];
  bins: Bin[];
  routes: { key: string; text: string }[];
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
  const width = colLabels.length * CELL_W;
  const height = rowLabels.length * CELL_H;

  // ONE HUE, MONOTONE IN LIGHTNESS, AND NOT FORCED TO A FLOOR. The first pass lifted every bin to
  // the non-text contrast floor against the ground, which is the right rule for a MARK and the wrong
  // one for a RAMP: `adjustToContrast` darkens toward the ground's own opposite pole, so the two
  // lightest bins came out grey while the rest stayed blue — a sequential scale that changes hue
  // halfway is not a sequential scale. A ramp's low end is *supposed* to be close to the ground;
  // what it owes the reader is a key, which this page prints, and a cell edge, which it draws.
  const ramp = bins.map((_, i) => mix(ground, accent, 0.10 + (i / (bins.length - 1)) * 0.90));
  const cellEdge = mix(ground, ink, 0.22);
  const label = adjustToContrast(ink, ground, TEXT_CONTRAST_MIN) ?? ink;

  /** A printed number sits ON its own cell, so it is measured against that cell's fill, never
   *  against the plate's ground. */
  const onCell = (bin: number) => inkOnFill(ramp[bin], { ink, ground }, contrast, adjustToContrast, TEXT_CONTRAST_MIN);

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

      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "0 12px", margin: "8px 0 4px", flex: "0 0 auto" }}>
        {bins.map((b, i) => (
          <span key={b.label} style={{ ...regs.axis, display: "inline-flex", alignItems: "center", gap: 5 }}>
            <span style={{ width: 14, height: 14, background: ramp[i], display: "inline-block", borderRadius: 2, border: `1px solid ${cellEdge}` }} />
            {b.label}
          </span>
        ))}
      </div>

      <div
        className="chart-plot"
        style={{
          ["--y-gutter" as string]: "128px",
          ["--x-axis-h" as string]: `${FRAME.xAxisRowPx}px`,
          aspectRatio: `${width + 128} / ${height + FRAME.xAxisRowPx}`,
        }}
      >
        <div className="y-axis" style={{ pointerEvents: "none" }}>
          {rowLabels.map((r, i) => (
            <span
              key={r.name}
              className="axis-label y"
              style={{
                ...regs.axis,
                top: `${pct(CELL_H * i + CELL_H / 2, height)}%`,
                whiteSpace: "normal",
                lineHeight: 1.05,
              }}
            >
              {r.name}
            </span>
          ))}
        </div>

        <svg
          role="group"
          aria-label={title}
          xmlns="http://www.w3.org/2000/svg"
          className="chart"
          data-hit="cell"
          viewBox={`0 0 ${width} ${height}`}
          preserveAspectRatio="none"
        >
          <desc>{alt}</desc>
          <rect x={0} y={0} width={width} height={height} fill={ground} />

          {cells.map((c) => (
            <rect
              key={`${c.row}-${c.col}`}
              x={c.col * CELL_W}
              y={c.row * CELL_H}
              width={CELL_W}
              height={CELL_H}
              fill={ramp[c.bin]}
              stroke={cellEdge}
              strokeWidth={0.6}
              vectorEffect="non-scaling-stroke"
            />
          ))}

          {cells.map((c) => (
            <circle
              key={`hit-${c.row}-${c.col}`}
              className="pt"
              cx={c.col * CELL_W + CELL_W / 2}
              cy={c.row * CELL_H + CELL_H / 2}
              r={Math.min(CELL_W, CELL_H) / 2 - 1}
              fill="transparent"
              stroke="none"
              tabIndex={0}
              role="img"
              aria-label={c.detail}
              data-detail={c.detail}
            />
          ))}
          <rect className="hit-area" x={0} y={0} width={width} height={height} fill="transparent" pointerEvents="all" />
        </svg>

        <div className="overlay" aria-hidden="true">
          {cells.filter((c) => c.label !== null).map((c) => (
            <span
              key={`l-${c.row}-${c.col}`}
              className="end-label"
              style={{
                ...regs.value,
                fontSize: `${Math.max(10, Number.parseFloat(regs.value.fontSize as string) - 4)}px`,
                color: onCell(c.bin),
                left: `${pct(c.col * CELL_W + CELL_W / 2, width)}%`,
                top: `${pct(c.row * CELL_H + CELL_H / 2, height)}%`,
                transform: "translate(-50%, -50%)",
                background: "transparent",
                padding: 0,
              }}
            >
              {c.label}
            </span>
          ))}
        </div>

        <div className="x-axis">
          {colLabels.map((c, i) => (
            <span
              key={c}
              className="axis-label x"
              style={{
                ...regs.axis,
                left: `${pct(CELL_W * i + CELL_W / 2, width)}%`,
                whiteSpace: "normal",
                lineHeight: 1.05,
                maxWidth: `${(CELL_W / width) * 100}%`,
                textAlign: "center",
              }}
            >
              {c}
            </span>
          ))}
        </div>
      </div>

      {routes.map((r) => (
        <p key={r.key} className="chart-reading" style={{ ...regs.annot, margin: "6px 0 0" }}>
          {r.text}
        </p>
      ))}
      <p className="chart-reading" style={{ ...regs.body, margin: "6px 0 0" }}>{reading}</p>
      <p className="chart-source" style={{ ...regs.body, margin: "4px 0 0" }}>{source}</p>
    </figure>
  );
}
