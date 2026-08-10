/**
 * The web genre of "Where 2024's earthquakes clustered" — a HEX-GRID (spatial-binning) map beat.
 *
 * RULING R1 (2026-08-10), retrofitted here 2026-08-10: **map × web is a LIVE MapTiler map** —
 * *"une carte web qu'on ne peut pas parcourir est une image"*. The audit measured what the ruling
 * was worth to a reader of THIS beat: `hex-grid.html` contained no `maplibregl`, no
 * `api.maptiler.com` and no `NavigationControl` (`AUDIT-W5-W6-map.md` §5.6). It was a picture. So
 * this component now ships the same THREE LAYERS `twin-map-web/assets/MapWebSeed.tsx` ships, in the
 * same order and with the same reasons:
 *
 *   1. `#mw-map` — an empty box `live-map.mjs` fills with a live MapLibre map and swaps in on
 *      `map.on("load")`. FIRST, and its own container rather than a wrapper around the fallback, so
 *      the swap is one `hidden` flip and never a half-drawn state.
 *   2. `#mw-fallback` — the baked plate and every non-empty cell as its own hex `<path>`, complete
 *      and script-free: what a reader gets with JavaScript off, offline, or after MapTiler
 *      invalidates the account's keys at 100% of its spending limit.
 *   3. `.mw-overlay` — the per-cell hit targets, a SIBLING of both and never a child of either. The
 *      seed's own header records why: its first live draft nested the overlay inside the fallback,
 *      and hiding the fallback on `map.on("load")` took every Tab stop with it.
 *
 * B5.1, and this beat was the worst offender in the tree: **5127 px of page in a 900 px window**,
 * its widest visual using 56% of the width. The cause was the two-rung `layouts` API this file used
 * to carry — a 900px `DESKTOP_LAYOUT` and a 360px `NARROW_LAYOUT`, each an entire SSR'd SVG poster
 * with the title, the source, the legend and the caveat drawn as `<text>` inside it, swapped by a
 * media query. That is not responsive (`map-web-discipline.md`, "Full width, genuinely"), it made
 * the legend caption clip at 375px, and it fixed the frame's height at the plate's own aspect so the
 * beat could never fit a window. It is replaced by the seed's own single fluid render: ONE SVG
 * carrying only geometry (the plate `<image>` and the hex `<path>`s), every piece of furniture as
 * plain HTML sized in fixed CSS pixels, and `render-web.mjs`'s `buildCss` bounding the whole column
 * to one window (`.map-web` / `.mw-stage` / `.mw-viewport`).
 *
 * WHAT A HEX GRID CHANGES ABOUT THE SEED'S OVERLAY, and it is one thing. The seed's marks are
 * points, so its overlay carries a `.point-label` (a city name) and a `.pt` hit target per point.
 * A hex cell has no name — the type sheet says a reader "can't name, can't look up" an arbitrary
 * cell (`twin-map-beat/references/types/hex-grid.md`, "When not to use it") — so this beat renders
 * NO `.point-label` at all, and its overlay is the hit targets alone. `live-map.mjs`'s
 * `reposition()` walks `.pt, .point-label` and simply finds none of the latter.
 *
 * WHY THE HIT TARGET MOVED OUT OF THE SVG. It used to be the hex `<path>` itself, `tabIndex={0}`
 * with its own `aria-label` — an exact hit shape, and the right answer while the plate was the
 * display surface. It cannot stay there once the fallback is hidden: the plate's cells are
 * plate-pixel geometry, and the moment the live camera differs from the bake's the paths are in the
 * wrong place. So the keyboard path and the tooltip's own source move to HTML `<button>`s that
 * `live-map.mjs` repositions with `map.project()` on every camera move, and the exact hit SHAPE is
 * kept in both states by different means: live, `queryRenderedFeatures` answers anywhere inside the
 * rendered polygon (which is what B6.14a asked for, "as soon as you enter the cell"); in the
 * fallback, each button is `clip-path`ped to its own hexagon, so neighbouring buttons do not overlap
 * the way their bounding boxes would (a pointy-top hexagon's box is 2·size tall against a 1.5·size
 * row pitch — a quarter of every box belongs to the row above or below).
 *
 * The two capabilities the seed layers on top of that split apply here unchanged:
 *   - Nothing argument-bearing gated behind interaction. The title, the source, the caveat and the
 *     class legend — WITH its printed numeric ranges and its explicit aggregate-mode caption, the
 *     type's own accessibility trap (`references/types/hex-grid.md`, "The accessibility trap") — are
 *     all drawn unconditionally. Hover, focus and the live map only ever add the per-cell EXACT
 *     count the legend's five class ranges can only bucket.
 *   - A visible, always-rendered alternative to the spatial reading (`DensityTable`, below).
 *   - NO FILTER. This study set has no orthogonal subsetting dimension a reader would want to
 *     isolate — a hex cell belongs to no group — so this beat renders no `.mw-filter`, and its plan
 *     declares no `filterProperty`. `map-web-discipline.md`'s own test for whether a beat needs one
 *     ("most do not") is answered here by not having one.
 *
 * THE ADAPTATION `map-web-discipline.md`'s accessibility answer forces on this type: that doctrine's
 * "ordered, readable list of the regions and their values" assumes each row has a meaningful NAME
 * (`RegionTable`'s "Metro area" column). A hex cell has none, and reverse-geocoding a cell's CENTRE
 * into a place name is rejected — it would invent a specificity the grid does not have. But the
 * first version of this table drew the wrong conclusion from that and shipped Rank / Event count /
 * Density class only: three facts that are real and checkable, and not one of them spatial, on a map
 * whose entire subject is where. So there is a fourth column, and it is neither a guess nor a
 * geocode: every event in the frozen catalogue carries USGS's OWN place string, so a cell can be
 * described by the regions ITS MEMBER EVENTS are filed under ("Fiji, Tonga"), computed in
 * `render-web.mjs` from the cell's members. That is a fact about the data, not a claim about the
 * cell's geometry, and the column header and the caption both say so.
 *
 * This component never imports the rasteriser — `ink`/`muted` are props, derived once in node by
 * `render-web.mjs`.
 */

import { binIndexUpperInclusive, hexCorners, type HexCell } from "./geo-hex.ts";

// ===== Genre mechanics — not one story's numbers =====
/** How much smaller than its own lattice cell a hexagon is DRAWN, so the field reads as a grid of
 *  cells rather than one continuous stain. The bins themselves are unchanged — this is a drawing
 *  gap, not a binning gap. Exported because `render-web.mjs`'s `livePlan` emits the SAME shrunk
 *  hexagon as a geographic polygon: if the live layer and the plate disagreed about how big a cell
 *  is drawn, the swap on `map.on("load")` would be visible. */
export const HEX_DRAW_SHRINK = 0.97;
/** The per-cell hit target's FLOOR, in real CSS pixels — not its size. The target is an HTML
 *  `<button>` whose extent is the cell's own hexagon written as a percentage of the frame, so the
 *  two scale together at every container width; `max()` keeps this floor for a cell too small to
 *  hit. Measured on this beat: at 1600px wide the map box is ~884 CSS px and a cell's box is
 *  ~50 × 58 px, comfortably above the floor; at 375px it is ~20 × 23 px, below it, and the floor is
 *  what keeps the grid operable on a phone. The same number and the same reasoning as
 *  `MapWebSeed.tsx`'s own `HIT_TARGET_PX`. */
export const HIT_TARGET_PX = 28;
// =======================================================

/** The five fixed percentile bands `countBreaks` always produces (`geo-hex.ts`: four breaks at
 *  p50/p75/p90/p97 → five classes) — named here once, shared by the legend, the per-cell
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
 *  numbers. The hit target's `aria-label`/`title`/`data-detail`, the live layer's tooltip (which
 *  reads `data-detail` off the matching `.pt`) and the plan's own `detail` property are all this
 *  one string. */
export function cellDetail(
  cell: HexCell,
  rank: number,
  total: number,
  breaks: number[],
): string {
  return `Rank ${rank} of ${total} — ${cell.count} earthquakes — ${densityClassLabel(binIndexUpperInclusive(cell.count, breaks), breaks)}`;
}

/** THE ONE PLACE A CELL'S COLOUR IS DECIDED. The SVG hex below and the live `fill` layer's own
 *  `["get","color"]` both call this — never a second binning of the same count against the same
 *  breaks. `map-web-discipline.md`'s "one mark, two halves, two mechanisms" is written after two
 *  incidents of exactly that shape (a mark's SIZE, then its FILTER membership), so a third — its
 *  COLOUR — is closed by construction rather than by remembering. */
export function cellFill(
  cell: HexCell,
  breaks: number[],
  ramp: string[],
): string {
  return ramp[binIndexUpperInclusive(cell.count, breaks)]!;
}

/** And the same for a cell's own edge: the subject cell carries the beat's single accent, every
 *  other cell carries a hairline of the ground colour that separates it from its neighbours. Read
 *  by the SVG `<path>` and by the plan's `line` layer alike. The widths are CSS pixels in both
 *  (`geo-discipline`'s rule that a stroke is screen-sized, never ground-sized). */
export function cellEdge(
  cell: HexCell,
  subjectKey: string,
  accent: string,
  ground: string,
): { color: string; width: number } {
  return cell.key === subjectKey
    ? { color: accent, width: 2.4 }
    : { color: ground, width: 0.6 };
}

/** The cells in the order everything reads them: densest first. The DOM order the keyboard's
 *  Arrow/Home/End cycles through, the table's row order and the plan's own feature order are all
 *  this one order, so a reader who tabs the map and a reader who reads the table are moving through
 *  the same list. Hex cells never overlap, so this order affects nothing about paint correctness. */
export function rankedCells(cells: HexCell[]): HexCell[] {
  return [...cells].sort((a, b) => b.count - a.count);
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
}) {
  if (cells.length < 2)
    throw new Error(
      `a hex-grid map needs at least two nonempty cells, got ${cells.length}`,
    );

  const { frame } = geometry;
  const ranked = rankedCells(cells);
  const total = ranked.length;

  if (!ranked.some((c) => c.key === subjectKey))
    throw new Error(`no cell for the subject ${subjectKey}`);

  // The hexagon actually drawn, and its own bounding box, in the bake's own frame units. A
  // pointy-top hexagon of side `size` is `√3·size` wide and `2·size` tall — the two numbers the
  // overlay's own buttons are sized from, and the same shape `livePlan` unprojects into geographic
  // polygons.
  const drawnSize = hexSize * HEX_DRAW_SHRINK;
  const cellWidth = Math.sqrt(3) * drawnSize;
  const cellHeight = 2 * drawnSize;

  return (
    <div className="map-web">
      <p className="mw-title">{title}</p>
      <p className="mw-source">{`${source} · ${basemapCredit}`}</p>

      {/* The stage: the one box handed whatever vertical room the window has left once every piece
          of furniture above and below has taken its own (`render-web.mjs`'s `buildCss`,
          `.mw-stage`). The viewport inside it keeps the bake's own aspect EXACTLY while the
          fallback is what is showing — a stretched plate is a lie about distance and shape
          (`geo-discipline.md`) and is never one of the outcomes. Live, the canvas IS the container
          and the CSS releases the aspect. */}
      <div className="mw-stage">
        <div
          className="mw-viewport"
          style={{ aspectRatio: `${frame.width} / ${frame.height}` }}
        >
          {/* LAYER 2 — the live MapTiler map (R1). */}
          <div id="mw-map" className="mw-live-map" />

          {/* LAYER 1 — the baked plate and its cells. Geometry only: no `<text>` anywhere inside
              this SVG, because text in a fluid SVG scales with the geometry
              (`map-web-discipline.md`, "Text is HTML, not SVG") — which is exactly how this beat's
              own legend caption came to be clipped at 375px. `role="group"`, not `role="img"`: an
              `img` role would flatten the children into one opaque image. */}
          <div id="mw-fallback" className="mw-fallback">
            <svg
              className="map"
              viewBox={`0 0 ${frame.width} ${frame.height}`}
              preserveAspectRatio="xMidYMid meet"
              role="group"
              aria-label={alt}
            >
              <defs>
                <clipPath id="plate-clip">
                  <rect x={0} y={0} width={frame.width} height={frame.height} />
                </clipPath>
              </defs>
              <g clipPath="url(#plate-clip)">
                <image
                  href={plate}
                  x={0}
                  y={0}
                  width={frame.width}
                  height={frame.height}
                />
                {ranked.map((cell) => {
                  const corners = hexCorners(cell.cx, cell.cy, drawnSize);
                  const d = `M${corners.map(([x, y]) => `${x.toFixed(1)} ${y.toFixed(1)}`).join("L")}Z`;
                  const edge = cellEdge(cell, subjectKey, accent, ground);
                  return (
                    <path
                      key={cell.key}
                      d={d}
                      fill={cellFill(cell, breaks, ramp)}
                      stroke={edge.color}
                      strokeWidth={edge.width}
                      // Decorative geometry, exactly like the seed's own `<circle>`s: the reading,
                      // the keyboard path and the pointer target all live on the overlay's button
                      // for this cell, which is the only one of the three that survives the live
                      // swap. `data-key` stays so a person auditing the file can pair a drawn
                      // hexagon with its own button and its own plan feature.
                      data-key={cell.key}
                    />
                  );
                })}
              </g>
            </svg>
          </div>

          {/* LAYER 3 — the overlay: one hit target per non-empty cell, a SIBLING of the two map
              layers and never a child of either, because it belongs to BOTH. It is the only
              keyboard path to the data. Positioned in PERCENTAGES here, which is what the fallback
              needs; `live-map.mjs` repositions the same nodes with `map.project()` on every camera
              move, which is what the live map needs. No `.point-label` — a hex cell has no name to
              print (see this file's own header). */}
          <div className="mw-overlay">
            {ranked.map((cell, i) => {
              const detail = cellDetail(cell, i + 1, total, breaks);
              return (
                <button
                  key={cell.key}
                  type="button"
                  className="pt"
                  style={{
                    left: `${(cell.cx / frame.width) * 100}%`,
                    top: `${(cell.cy / frame.height) * 100}%`,
                    width: `max(${HIT_TARGET_PX}px, ${(cellWidth / frame.width) * 100}%)`,
                    height: `max(${HIT_TARGET_PX}px, ${(cellHeight / frame.height) * 100}%)`,
                  }}
                  aria-label={detail}
                  // The native, no-JS tooltip: this string is readable on hover with the inline
                  // script absent entirely, exactly as it was when it lived in the path's `<title>`.
                  title={detail}
                  data-key={cell.key}
                  data-detail={detail}
                />
              );
            })}
          </div>
        </div>
      </div>

      {/* The legend: entirely HTML, fixed-CSS-pixel swatches — a schematic class scale that reads
          the same size regardless of how big the map itself is drawn, and that can no longer be
          clipped by an SVG frame the way its caption was at 375px. The aggregate-mode caption the
          type's own "one thing that goes wrong" requires stating explicitly is the caption here,
          wrapping as normal prose. */}
      <div className="mw-legend">
        <p className="mw-legend-caption">{legendCaption}</p>
        <div className="mw-legend-marks">
          {ramp.map((shade, i) => (
            <div key={shade} className="mw-legend-item">
              <span
                className="mw-legend-swatch"
                style={{ background: shade }}
              />
              <span className="mw-legend-value">
                {classRangeLabel(i, breaks)}
              </span>
            </div>
          ))}
        </div>
      </div>

      <p className="mw-caveat">{caveat}</p>
    </div>
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
 * Rendered ONCE by `render-web.mjs`, as plain semantic HTML with real `<th scope="row">`/`<th
 * scope="col">` so a screen reader's own table navigation works on it, exactly the reasoning
 * `RegionTable` gives for its own shape.
 *
 * IT SITS BELOW THE FITTED COLUMN, and that is a stated cost rather than an oversight. The beat
 * itself — title, source, map, legend, caveat — fits one window (B5.1). This table's 156 rows do
 * not, and the page scrolls by their height. Turning them into a disclosure widget is B5.2, the
 * owner's own call, and it is deliberately not taken here: "rendered plainly and visibly, never
 * behind a toggle" is the discipline's own rule, and the reader who most needs this table is the
 * one an extra interaction step costs most.
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
  const ranked = rankedCells(cells);
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
          const classIndex = binIndexUpperInclusive(cell.count, breaks);
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
