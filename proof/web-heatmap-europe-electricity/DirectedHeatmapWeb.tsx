/**
 * The seven European countries above the 94 % low-carbon floor against nine electricity sources,
 * drawn as a matrix heatmap THROUGH the design base and delivered as an interactive page.
 *
 * `the-cell-value-is-printed-or-the-region-is-named` — a heatmap cell is a colour, and a colour is a
 * bin. Either the number is printed in the cell or the reader is owed another way to get it. This
 * page does BOTH: the cells that carry the argument print their own share, and every cell — all
 * 63 — answers with its exact value under the pointer.
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
 * The pointer resolves by CELL (`data-hit="cell"`): seven rows share every x.
 *
 * AND THE READER IS GIVEN THE FLOOR ITSELF (`../../skills/chart-web/assets/filter.ts`, the
 * threshold-as-named-bands form). Colour ranks; it does not measure — and a sequential ramp's low
 * end is close to the ground by construction, which here is 29 cells under 0,5 % and 44 under 5 %.
 * Two thirds of this grid is a pale wash. The bands let a reader raise the floor and watch what
 * survives; the sentence each band reveals says how much of a country's electricity the survivors
 * still account for, which is the reading no cell and no ramp can draw. Pure CSS, so it works with
 * the script absent. `BRIEF.md`, "The interaction, written before the code".
 */

import { mix, adjustToContrast, contrast, TEXT_CONTRAST_MIN, NON_TEXT_CONTRAST_MIN } from "#shared/chart-beat/colour.mjs";
import { webRegisters, figureVars } from "#shared/design-base/web.mjs";
import { inkOnFill } from "#shared/design-base/web.mjs";
import { attrsFor } from "../../skills/chart-web/assets/filter.ts";

const CELL_W = 74;
const CELL_H = 28;
export const FRAME = { width: 0, height: 0, xAxisRowPx: 44 };

export type Cell = {
  row: number;
  col: number;
  /** This cell's identity in the filter vocabulary — derived once, in the runner. */
  key: string;
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
  rowFilters,
  colFilters,
  notes,
  filter = null,
  filterIndex = new Map<string, string[]>(),
  filterOptions = [],
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
  /** The token list an AXIS LABEL carries — the union of its row's nine cells, or its column's
   *  seven, derived in the runner from the same `keptAt` the options are. It carries no `data-key`
   *  because it is not drawn from one datum; `attrsFor` is for the elements that are. */
  rowFilters: string[];
  colFilters: string[];
  /** The sentence each band reveals, in the beat's own words and its own language — the derived
   *  reading the control owes the reader. `filterNotes` would give the same shape in English;
   *  `data-filter-note`, the slug and the CSS that reveals it are still the vocabulary's. */
  notes: { slug: string; text: string }[];
  filter?: { label: string } | null;
  filterIndex?: Map<string, string[]>;
  filterOptions?: { id: string; slug: string; label: string; isAll: boolean }[];
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
  /** The control's own words, read off the DECLARATION the runner handed down rather than typed
   *  here — so the legend, the slugs and the counts cannot be derived twice. */
  const filterLegend = filter?.label ?? "";
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

      {/* THE FLOOR. Native radios in a real `<fieldset>` with a `<legend>` — a radio group to the
          keyboard and to a screen reader before this page's stylesheet touches them — and the
          narrowing itself is one generated CSS rule per band over `[data-filter]`, so it works
          identically with the inline script absent. It sits directly under the key on purpose: the
          key is the frame a cell is measured against, the band is which part of that key the reader
          is keeping, and the two belong to each other. */}
      {filterOptions.length > 0 && (
        <fieldset className="chart-filter">
          <legend>{filterLegend}</legend>
          <div className="options">
            {filterOptions.map((option) => (
              <label key={option.id}>
                <input
                  id={option.id}
                  type="radio"
                  name="chart-filter"
                  value={option.slug}
                  defaultChecked={option.isAll}
                />
                {option.label}
              </label>
            ))}
          </div>
        </fieldset>
      )}

      {/* THE NARROWING NOTE — one per band, hidden by default and revealed by the same `:checked`
          that empties the cells. A filtered view is a partial view while the title above states the
          whole claim; and this is where the band's DERIVED reading lives — what the survivors still
          cover, and how few of them it takes — which is the only channel those numbers are on. The
          unfiltered option reveals none, because it is not a subset: it is the claim. */}
      {notes.map((note) => (
        <p className="filter-note" data-filter-note={note.slug} key={note.slug}>
          {note.text}
        </p>
      ))}

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
              data-filter={rowFilters[i]}
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
              {...attrsFor(filterIndex, c.key)}
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
              {...attrsFor(filterIndex, c.key)}
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
              {...attrsFor(filterIndex, c.key)}
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
              data-filter={colFilters[i]}
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
