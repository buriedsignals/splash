/**
 * The web genre of "Where 2024's earthquakes clustered" — a HEX-GRID (spatial-binning) map beat,
 * the first one this project has built for the WEB genre (hex-grid existed only as static before
 * this beat: `proof/map-quake-density/HexGridStill.tsx`). Draws from the SAME baked-plate approach
 * every genre in this twin uses (`twin-doctrine/references/geo-discipline.md` rules 1, 2, 6, 7,
 * 12): the camera is spent ONCE by `bake-plate.mjs`, and this component draws an `<image>` and some
 * hex `<path>`s, never a live map.
 *
 * What this genre needs on top of the static frame — the same four things
 * `twin-map-web/assets/MapWebSeed.tsx`'s own header names for its point geometry, reworked for a
 * cell geometry that tiles the frame instead of floating points on it:
 *
 *   1. ONE component (`HexGridWeb`) called twice, once per `WebLayout` — both SSR'd at build time
 *      by `render-web.mjs`. No client-side layout math: a CSS media query alone swaps the two
 *      pre-rendered SVGs.
 *   2. `tabIndex={0}` and a per-cell `aria-label`, written on every NON-EMPTY cell at build time —
 *      not assembled by the inline script — so the no-JS frame is still keyboard-reachable, cell by
 *      cell, with the script absent entirely. Each cell also carries a nested `<title>`, which
 *      gives a native browser tooltip on hover even with the script absent. UNLIKE a symbol map's
 *      small circles, a hex cell's own visible fill IS its hit target — cells tile edge-to-edge
 *      with no gaps to miss, so no separate invisible larger hit shape is needed
 *      (`twin-map-beat/references/types/hex-grid.md`: cells "tessellate ... over the points' own
 *      bounding box").
 *   3. Nothing argument-bearing gated behind interaction. The title, the caveat, the source, and
 *      the class legend — WITH its printed numeric ranges and its explicit aggregate-mode caption,
 *      the type's own accessibility trap (`references/types/hex-grid.md`, "The accessibility
 *      trap") — are all drawn unconditionally. Hover and focus only ever add the per-cell EXACT
 *      count the legend's five class ranges can only bucket.
 *   4. A visible, always-rendered alternative to the spatial reading (`DensityTable`, below) — not
 *      a screen-reader-only trick, a real table any reader can use.
 *
 * THE ADAPTATION a hex-grid forces on `map-web-discipline.md`'s own accessibility answer: that
 * doctrine's "ordered, readable list of the regions and their values" assumes each row has a
 * meaningful NAME (`RegionTable`'s "Metro area" column). A hex cell has none — the type sheet
 * itself says a reader "can't name, can't look up" an arbitrary cell
 * (`references/types/hex-grid.md`, "When not to use it"). Reverse-geocoding a cell's CENTRE into a
 * place name is still rejected: it would invent a specificity the grid does not have.
 *
 * But the first version of this table drew the wrong conclusion from that, and shipped Rank /
 * Event count / Density class only — three facts that are real and checkable, and not one of them
 * spatial. On a map, whose entire subject is where, that left the table unable to answer the only
 * question a reader who cannot see it has. So there is now a fourth column, and it is neither a
 * guess nor a geocode: every event in the frozen catalogue carries USGS's OWN place string, so a
 * cell can be described by the regions ITS MEMBER EVENTS are filed under ("Fiji, Tonga"), computed
 * in `render-web.mjs` from the cell's members. That is a fact about the data, not a claim about
 * the cell's geometry, and the column header and the caption both say so. The sibling
 * `mapgen-choropleth-web`'s table carries names; this one now does too.
 *
 * The rows stay in the same densest-first order a sighted reader's own eye takes across the shaded
 * field, and the same order the keyboard's Home/End uses across the map's own cells. This preserves
 * the doctrine's two-channel principle (an exact per-cell count on hover/focus for a reader who can
 * point at a pixel; the same distribution, complete and linear, for a reader who cannot).
 *
 * This component never imports the rasteriser — `ink`/`muted`/`measure` are props, derived once in
 * node by `render-web.mjs`.
 */

import { Fragment } from "react";
import { binIndex, hexCorners, type HexCell } from "./geo-hex.ts";

type Measure = (
  text: string,
  font: { fontSize: number; fontWeight?: number },
) => number;

export type WebLayout = {
  name: "desktop" | "narrow";
  width: number;
  pad: number;
  /** The plate's own width/height inside this layout — NOT square (unlike the symbol seed's
   *  `mapSize`): a world camera is wide, not square, so this genre's own layout type carries both
   *  dimensions rather than one shared side. Both layouts draw from the ONE plate `bake-plate.mjs`
   *  bakes at the DESKTOP layout's own size — the narrow layout only ever scales it DOWN, the same
   *  "never upscale a raster" invariant `MapWebSeed.tsx`'s own `PLATE_SIZE` reuse follows. */
  mapWidth: number;
  mapHeight: number;
  title: { fontSize: number; fontWeight: number; lead: number };
  source: { fontSize: number; fontWeight: number; lead: number };
  caption: { fontSize: number; fontWeight: number };
  note: { fontSize: number; lead: number };
  legendLabel: { fontSize: number };
  bottomPad: number;
};

export function wrap(
  text: string,
  maxWidth: number,
  font: { fontSize: number; fontWeight: number },
  measure: Measure,
): string[] {
  const lines: string[] = [];
  let current = "";
  for (const word of text.split(/\s+/)) {
    const trial = current ? `${current} ${word}` : word;
    if (current && measure(trial, font) > maxWidth) {
      lines.push(current);
      current = word;
    } else current = trial;
  }
  return current ? [...lines, current] : lines;
}

/** The five fixed percentile bands `countBreaks` always produces (`geo-hex.ts`: four breaks at
 *  p50/p75/p90/p97 → five classes) — named here once, shared by the on-map legend, the per-cell
 *  `aria-label`, and `DensityTable`, so a reader never sees two different phrasings of the same
 *  class. */
const PERCENTILE_LABELS = [
  "up to the 50th percentile",
  "50th–75th percentile",
  "75th–90th percentile",
  "90th–97th percentile",
  "97th percentile and above",
];

/** The class's own printed numeric range, e.g. "12–27" or "63+" — the accessibility trap's own
 *  requirement (`references/types/hex-grid.md`: "the legend needs the bin's actual numeric range
 *  printed ... next to each colour class"). Byte-identical logic to
 *  `proof/map-quake-density/HexGridStill.tsx`'s own `classLabel`, this beat's own copy. */
export function classRangeLabel(index: number, breaks: number[]): string {
  const lower = index === 0 ? 1 : breaks[index - 1]! + 1;
  const upper = index === breaks.length ? null : breaks[index];
  return upper === null
    ? `${lower}+`
    : lower === upper
      ? `${lower}`
      : `${lower}–${upper}`;
}

/** One cell's own full class description — "Class 5 — 97th percentile and above, 63+ events" — the
 *  single implementation the SSR'd `aria-label`/`data-detail` attributes AND `DensityTable` both
 *  draw from. */
export function densityClassLabel(index: number, breaks: number[]): string {
  return `Class ${index + 1} — ${PERCENTILE_LABELS[index]}, ${classRangeLabel(index, breaks)} events`;
}

/** One cell's own detail string — rank, count, class — never a second formatting of the same
 *  numbers. */
export function cellDetail(
  cell: HexCell,
  rank: number,
  total: number,
  breaks: number[],
): string {
  return `Rank ${rank} of ${total} — ${cell.count} earthquakes — ${densityClassLabel(binIndex(cell.count, breaks), breaks)}`;
}

export function HexGridWeb({
  geometry,
  plate,
  cells,
  hexSize,
  breaks,
  ramp,
  title,
  source,
  basemapCredit,
  legendCaption,
  caveat,
  alt,
  subjectKey,
  ground,
  accent,
  ink,
  muted,
  measure,
  layout,
}: {
  geometry: { frame: { width: number; height: number } };
  plate: string;
  cells: HexCell[];
  hexSize: number;
  breaks: number[];
  ramp: string[];
  title: string;
  source: string;
  basemapCredit: string;
  legendCaption: string;
  caveat: string;
  alt: string;
  subjectKey: string;
  ground: string;
  accent: string;
  /** Derived from `ground` by `deriveFurniture` in whatever node runner calls this component. */
  ink: string;
  muted: string;
  measure: Measure;
  layout: WebLayout;
}) {
  if (cells.length < 2)
    throw new Error(
      `a hex-grid map needs at least two nonempty cells, got ${cells.length}`,
    );

  const { width, pad, mapWidth, mapHeight } = layout;
  const scale = mapWidth / geometry.frame.width;
  // Same order as `DensityTable`'s own rows — densest first — so the DOM order the keyboard's
  // Arrow/Home/End cycles through (`interaction.mjs`, unchanged) matches the table's rank order.
  // Hex cells never overlap (unlike a symbol map's circles), so this order affects nothing about
  // paint correctness, only tab order.
  const ranked = [...cells].sort((a, b) => b.count - a.count);
  const total = ranked.length;

  const subject = cells.find((c) => c.key === subjectKey);
  if (!subject) throw new Error(`no cell for the subject ${subjectKey}`);

  const mapX = pad;
  const columnWidth = width - pad * 2;

  const titleLines = wrap(title, columnWidth, layout.title, measure);
  const sourceLines = wrap(
    `${source} · ${basemapCredit}`,
    columnWidth,
    layout.source,
    measure,
  );
  const caveatLines = wrap(caveat, columnWidth, layout.note, measure);

  const titleTop = pad + layout.title.fontSize;
  const sourceTop = titleTop + (titleLines.length - 1) * layout.title.lead + 20;
  const sourceBottom =
    sourceTop + (sourceLines.length - 1) * layout.source.lead;
  // Computed FROM the wrapped header's own real bottom, never a fixed guess — a title or a source
  // line that wraps to more lines than the layout's designer assumed must push the map down with
  // it, not clip under it. This is exactly the bug this beat's own first render caught: a fixed
  // formula for `mapY`, written before the wrap was known, undercounted a two-line title.
  const mapY = sourceBottom + 18;

  const legendSwatch = layout.name === "desktop" ? 16 : 12;
  const legendY = mapY + mapHeight + 30;
  const legendSwatchY = legendY + 16;

  const caveatTop = legendSwatchY + legendSwatch + 26;
  const frameHeight =
    caveatTop + (caveatLines.length - 1) * layout.note.lead + layout.bottomPad;

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={width}
      height={frameHeight}
      viewBox={`0 0 ${width} ${frameHeight}`}
      className="map"
      data-layout={layout.name}
      fontFamily="Helvetica, Arial, sans-serif"
    >
      {/* No root role="img" — the same one deliberate departure the chart genre's own doctrine
          names (`web-discipline.md`): that role would flatten every child into one opaque image,
          silencing the per-cell paths below. `<desc>` still carries the alt text. */}
      <desc>{alt}</desc>
      <defs>
        <clipPath id="plate-clip">
          <rect x={0} y={0} width={mapWidth} height={mapHeight} />
        </clipPath>
      </defs>
      <rect x={0} y={0} width={width} height={frameHeight} fill={ground} />

      {titleLines.map((line, i) => (
        <text
          key={line}
          x={pad}
          y={titleTop + i * layout.title.lead}
          fill={ink}
          fontSize={layout.title.fontSize}
          fontWeight={layout.title.fontWeight}
        >
          {line}
        </text>
      ))}
      {sourceLines.map((line, i) => (
        <text
          key={line}
          x={pad}
          y={sourceTop + i * layout.source.lead}
          fill={muted}
          fontSize={layout.source.fontSize}
        >
          {line}
        </text>
      ))}

      {/* ── The map: the baked plate, and every NON-EMPTY cell as its own hex <path>, filled by
          class, and its own hit target (no separate invisible shape — cells tile with no gaps to
          miss). ─────────────────────────────────────────────────────────────────────────────── */}
      <g transform={`translate(${mapX},${mapY})`} clipPath="url(#plate-clip)">
        <image href={plate} x={0} y={0} width={mapWidth} height={mapHeight} />
        {ranked.map((cell, i) => {
          const rank = i + 1;
          const isSubject = cell.key === subjectKey;
          const classIndex = binIndex(cell.count, breaks);
          const fill = ramp[classIndex]!;
          const corners = hexCorners(
            cell.cx * scale,
            cell.cy * scale,
            hexSize * scale * 0.97,
          );
          const d = `M${corners.map(([x, y]) => `${x.toFixed(1)} ${y.toFixed(1)}`).join("L")}Z`;
          const detail = cellDetail(cell, rank, total, breaks);
          return (
            <path
              key={cell.key}
              className="pt"
              d={d}
              fill={fill}
              stroke={isSubject ? accent : ground}
              strokeWidth={isSubject ? 2.4 : 0.6}
              tabIndex={0}
              role="img"
              aria-label={detail}
              data-key={cell.key}
              data-detail={detail}
            >
              <title>{detail}</title>
            </path>
          );
        })}
      </g>

      {/* ── The legend: a horizontal row of swatches, each with its own printed count range, plus
          the aggregate-mode caption the type's own "one thing that goes wrong" requires stating
          explicitly, every time (`references/types/hex-grid.md`). ────────────────────────────── */}
      <text
        x={pad}
        y={legendY}
        fill={muted}
        fontSize={layout.caption.fontSize}
        fontWeight={layout.caption.fontWeight}
      >
        {legendCaption}
      </text>
      {(() => {
        let x = pad;
        const y = legendSwatchY;
        return ramp.map((shade, i) => {
          const label = classRangeLabel(i, breaks);
          const labelWidth = measure(label, layout.legendLabel);
          const node = (
            <Fragment key={shade}>
              <rect
                x={x}
                y={y}
                width={legendSwatch}
                height={legendSwatch}
                fill={shade}
                stroke={muted}
                strokeWidth={0.5}
              />
              <text
                x={x + legendSwatch + 4}
                y={y + legendSwatch - 4}
                fill={muted}
                fontSize={layout.legendLabel.fontSize}
              >
                {label}
              </text>
            </Fragment>
          );
          x +=
            legendSwatch +
            4 +
            labelWidth +
            (layout.name === "desktop" ? 22 : 14);
          return node;
        });
      })()}

      {caveatLines.map((line, i) => (
        <text
          key={line}
          x={pad}
          y={caveatTop + i * layout.note.lead}
          fill={muted}
          fontSize={layout.note.fontSize}
        >
          {line}
        </text>
      ))}
    </svg>
  );
}

/**
 * THE ADAPTATION `map-web-discipline.md`'s "The accessibility question" is written to for this
 * type (see this file's own header comment for the full reasoning): one row per NON-EMPTY cell,
 * ranked densest first — not a name column, because an arbitrary hex cell has no name to print.
 * Rank and class are real, checkable facts about each cell; sorting them densest-first means "the
 * first row" carries the same meaning it does in `RegionTable`, and the order matches both the
 * map's own densest-first visual reading and the keyboard's Home/End cycling order.
 *
 * Rendered ONCE by `render-web.mjs` (not per layout — the same rows do not need saying twice), as
 * plain semantic HTML with real `<th scope="row">`/`<th scope="col">` so a screen reader's own
 * table navigation works on it, exactly the reasoning `RegionTable` gives for its own shape.
 */
export function DensityTable({
  cells,
  breaks,
  subjectKey,
  whereOf,
  ink,
  muted,
}: {
  cells: HexCell[];
  breaks: number[];
  subjectKey: string;
  /** The regions a cell's OWN member events are catalogued under — see the WHERE column below. */
  whereOf: (key: string) => string;
  ink: string;
  muted: string;
}) {
  const ranked = [...cells].sort((a, b) => b.count - a.count);
  return (
    <table className="density-table" style={{ color: ink, borderColor: muted }}>
      <caption>
        {`Every reading behind the map above — one row per non-empty cell, ${ranked.length} cells, ranked by earthquake count, densest first. The last column names the regions each cell's own events are catalogued under, not the cell's position.`}
      </caption>
      <thead>
        <tr>
          <th scope="col">Rank</th>
          <th scope="col">Event count</th>
          <th scope="col">Density class</th>
          <th scope="col">Where its events are catalogued</th>
        </tr>
      </thead>
      <tbody>
        {ranked.map((cell, i) => {
          const rank = i + 1;
          const classIndex = binIndex(cell.count, breaks);
          return (
            <tr
              key={cell.key}
              className={cell.key === subjectKey ? "subject" : undefined}
            >
              <th scope="row">{rank}</th>
              <td>{cell.count}</td>
              <td>{densityClassLabel(classIndex, breaks)}</td>
              <td>{whereOf(cell.key)}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

export const DESKTOP_LAYOUT: WebLayout = {
  name: "desktop",
  width: 900,
  pad: 32,
  mapWidth: 836,
  mapHeight: 520,
  title: { fontSize: 20, fontWeight: 700, lead: 26 },
  source: { fontSize: 13, fontWeight: 400, lead: 17 },
  caption: { fontSize: 12.5, fontWeight: 600 },
  note: { fontSize: 11.5, lead: 15 },
  legendLabel: { fontSize: 11 },
  bottomPad: 40,
};

export const NARROW_LAYOUT: WebLayout = {
  name: "narrow",
  width: 360,
  pad: 16,
  mapWidth: 328,
  mapHeight: 204,
  title: { fontSize: 15, fontWeight: 700, lead: 20 },
  source: { fontSize: 10.5, fontWeight: 400, lead: 14 },
  caption: { fontSize: 10.5, fontWeight: 600 },
  note: { fontSize: 10, lead: 13 },
  legendLabel: { fontSize: 9.5 },
  bottomPad: 28,
};

export const LAYOUTS = [DESKTOP_LAYOUT, NARROW_LAYOUT];
