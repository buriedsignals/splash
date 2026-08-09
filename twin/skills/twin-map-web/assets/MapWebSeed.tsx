/**
 * REPLACE ME. Do not parameterise me.
 *
 * The web genre's seed: a proportional-symbol map, interactive. It draws a real claim — this
 * sample of thirteen European metro areas, sized by population, with Paris the largest — using the
 * same baked-plate approach `twin-map-beat` ships for static and video (`geo-discipline.md` rules
 * 1-4, 6): the camera is spent ONCE by `scripts/bake-plate.mjs`, and this component draws an
 * `<image>` and some `<circle>`s, never a live map. What THIS genre adds on top of that is the
 * thing static and video cannot have: every point's own exact value, on demand, without spending
 * the frame's fixed room printing all thirteen — and, because a map is a spatial medium and not
 * every reader has spatial access to it, the SAME thirteen values again as an ordered, linear,
 * always-rendered table (`RegionTable` below), so nothing this beat claims lives ONLY in a hover.
 * `references/map-web-discipline.md`'s own "The accessibility question" answers this in full —
 * read it before writing a second beat, the way `references/geo-discipline.md` is read before a
 * second static or video one.
 *
 * Four things this genre needs that a static frame does not, all four demonstrated here, mirroring
 * `twin-chart-web/assets/ChartWebSeed.tsx`'s own list:
 *
 *   1. ONE component (`MapWebSeed`) called twice, once per `WebLayout` — both SSR'd at build time
 *      by `scripts/render-web.mjs`. No client-side layout math: a CSS media query alone swaps the
 *      two pre-rendered SVGs.
 *   2. `tabIndex={0}` and a per-point `aria-label`, written on every circle at build time — not
 *      assembled by the inline script — so the no-JS frame is still keyboard-reachable, point by
 *      point, with the script absent entirely. Each circle also carries a nested `<title>`, which
 *      gives a native browser tooltip on hover even with the script absent.
 *   3. Nothing argument-bearing gated behind interaction. The title, the caveat, the source, the
 *      subject's own label, and the size legend are all drawn unconditionally — hover and focus
 *      only ever add the per-point EXACT figure the legend's three reference sizes can only
 *      approximate.
 *   4. A visible, always-rendered alternative to the spatial reading (`RegionTable`) — not a
 *      screen-reader-only trick, a real table any reader can use, because "hover the right pixel"
 *      is not a reading strategy every reader has available to them.
 *
 * `WebLayout` lives here for the same reason `ChartWebSeed.tsx`'s own copy does: it describes this
 * GENRE's mechanics (two frame widths, their own paddings) rather than any one story's numbers, and
 * there is no vendoring path a story could import it from outside this dev repository, so the next
 * real beat declares its own matching copy inline rather than importing this one.
 *
 * This component never imports the rasteriser — `ink`/`muted`/`measure` are props, derived once in
 * node by whatever runner calls it (`scripts/render-web.mjs`'s `renderMapWeb` for a real beat,
 * `scripts/render-preview.mjs` for this skill's own preview).
 */

import { Fragment } from "react";
import {
  drawOrder,
  labelPlacement,
  niceReferenceValues,
  radiusScale,
  readingOrder,
  fr,
  type ProjectedPoint,
} from "./geo-symbol";

type Measure = (
  text: string,
  font: { fontSize: number; fontWeight?: number },
) => number;

export type WebLayout = {
  name: "desktop" | "narrow";
  width: number;
  pad: number;
  /** The square plate's own side length — smaller than `width` on the narrow layout, where the
   *  map sits ABOVE the text column instead of beside it (there is no room for both side by side
   *  at 360px, the same reasoning `twin-map-beat/assets/Co2MapStill.tsx`'s own header gives for
   *  choosing a square plate over a stretched one). */
  mapSize: number;
  title: { fontSize: number; fontWeight: number; lead: number };
  source: { fontSize: number; fontWeight: number; lead: number };
  caption: { fontSize: number; fontWeight: number };
  note: { fontSize: number; lead: number };
  pointLabel: { fontSize: number; fontWeight: number };
  legendLabel: { fontSize: number };
  maxRadiusPx: number;
  /** The frame's own bottom margin — the last piece `frameHeight` is derived from, never a fixed
   *  guess (the same rule `twin-chart-web/assets/ChartWebSeed.tsx`'s own `bottomPad` follows). */
  bottomPad: number;
};

// ===== CONFIG — edit for your story =====
const UNIT = "M";
const UNIT_WORD = "million inhabitants";
const CAVEAT = "Sample data for demonstration purposes, not a census figure.";
const SUBJECT_KEY = "paris";
const SUBJECT_NOTE = "the largest metro area in this sample";
// =========================================

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

/** One point's own detail string, the single implementation the SSR'd `aria-label`/`data-detail`
 *  attributes AND the accessible table both draw from — never a second formatting of the same
 *  number. */
export function pointDetail(point: { name: string; value: number }): string {
  return `${point.name} : ${fr(point.value)} ${UNIT_WORD}`;
}

export function MapWebSeed({
  geometry,
  plate,
  title,
  source,
  basemapCredit,
  legendCaption,
  caveat,
  alt,
  ground,
  accent,
  ink,
  muted,
  measure,
  layout,
}: {
  geometry: {
    frame: { width: number; height: number };
    points: ProjectedPoint[];
  };
  plate: string;
  title: string;
  source: string;
  basemapCredit: string;
  legendCaption: string;
  caveat: string;
  alt: string;
  ground: string;
  accent: string;
  /** Derived from `ground` by `deriveFurniture` in whatever node runner calls this component. */
  ink: string;
  muted: string;
  measure: Measure;
  layout: WebLayout;
}) {
  if (geometry.points.length < 2)
    throw new Error(
      `a symbol map needs at least two points, got ${geometry.points.length}`,
    );

  const { width, pad, mapSize } = layout;
  const stacked = layout.name === "narrow";
  const scale = mapSize / geometry.frame.width;
  const maxValue = Math.max(...geometry.points.map((p) => p.value));
  const radiusOf = radiusScale(maxValue, layout.maxRadiusPx);
  const drawn = drawOrder(geometry.points); // largest first, so smaller circles paint on top

  // ── The map's own box: top-left of the frame on both layouts. Desktop puts the text column
  //    beside it; narrow stacks the column below it (no room for both side by side at 360px).
  const mapX = pad;
  const mapY = pad;
  const columnX = stacked ? pad : pad + mapSize + pad;
  const columnWidth = stacked ? width - pad * 2 : width - columnX - pad;
  const columnTop = stacked ? mapY + mapSize + 28 : mapY;

  const CAVEAT_TEXT = caveat || CAVEAT;
  const titleLines = wrap(title, columnWidth, layout.title, measure);
  const sourceLines = wrap(
    `${source} · ${basemapCredit}`,
    columnWidth,
    layout.source,
    measure,
  );
  const caveatLines = wrap(CAVEAT_TEXT, columnWidth, layout.note, measure);

  const titleTop = columnTop + layout.title.fontSize;
  const sourceTop = titleTop + (titleLines.length - 1) * layout.title.lead + 26;
  const sourceBottom =
    sourceTop + (sourceLines.length - 1) * layout.source.lead;

  const legend = niceReferenceValues(maxValue);
  const legendMaxR = Math.max(...legend.map((v) => radiusOf(v)));
  const legendTop = sourceBottom + 34;
  const legendBaseline = legendTop + legendMaxR * 2 + 22;
  // The subject note sits on its own line below the legend, and the caveat starts a full line
  // height below THAT — not a fixed small offset, which is what let the two collide the first
  // time this beat was actually rendered and looked at (`references/map-web-discipline.md`'s own
  // gotcha: a static render can be checked with a PNG, and this is exactly the defect only a
  // rendered pixel shows).
  const subjectY = legendBaseline + layout.legendLabel.fontSize + 12;
  const caveatTop = subjectY + layout.note.lead + 6;

  // Loud, not silent — the same "column does not fit" invariant every static seed in this twin
  // asserts rather than lets clip (`geo-discipline.md`'s own defect log, and
  // `twin-map-beat/assets/Co2MapStill.tsx`'s identical check).
  const frameHeight = stacked
    ? caveatTop + (caveatLines.length - 1) * layout.note.lead + layout.bottomPad
    : Math.max(
        mapY + mapSize + layout.bottomPad,
        caveatTop +
          (caveatLines.length - 1) * layout.note.lead +
          layout.bottomPad,
      );
  if (!stacked && legendTop < sourceBottom)
    throw new Error(
      `the column does not fit: source ends at ${sourceBottom}, legend starts at ${legendTop}. Shorten the title or the source.`,
    );

  const subject = geometry.points.find((p) => p.key === SUBJECT_KEY);
  if (!subject) throw new Error(`no point for the subject ${SUBJECT_KEY}`);

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
          silencing the per-point circles below. `<desc>` still carries the alt text. */}
      <desc>{alt}</desc>
      <defs>
        <clipPath id="plate-clip">
          <rect x={0} y={0} width={mapSize} height={mapSize} />
        </clipPath>
      </defs>
      <rect x={0} y={0} width={width} height={frameHeight} fill={ground} />

      {/* ── The map ─────────────────────────────────────────────────────────────────────── */}
      <g transform={`translate(${mapX},${mapY})`} clipPath="url(#plate-clip)">
        <image href={plate} x={0} y={0} width={mapSize} height={mapSize} />
        {drawn.map((point) => {
          const isSubject = point.key === SUBJECT_KEY;
          const r = radiusOf(point.value) * scale;
          const cx = point.px * scale;
          const cy = point.py * scale;
          const { side, dy } = labelPlacement(
            point.px,
            point.py,
            geometry.frame,
          );
          const dx = side === "right" ? r + 6 : -(r + 6);
          const anchor = side === "right" ? "start" : "end";
          const fill = isSubject ? accent : muted;
          const hitR = Math.max(r, 14);
          const detail = pointDetail(point);
          return (
            <Fragment key={point.key}>
              {/* Decorative: sized by value, never itself the interaction target — a circle this
                  small is not a fair touch target (`references/map-web-discipline.md`,
                  "Touch and hover share one target"). */}
              <circle
                cx={cx}
                cy={cy}
                r={r}
                fill={fill}
                fillOpacity={isSubject ? 0.55 : 0.38}
                stroke={fill}
                strokeWidth={1.4}
              />
              <text
                x={cx + dx}
                y={cy + dy}
                textAnchor={anchor}
                fontSize={layout.pointLabel.fontSize}
                fontWeight={isSubject ? 700 : layout.pointLabel.fontWeight}
                stroke={ground}
                strokeWidth={3}
                strokeLinejoin="round"
                fill="none"
              >
                {point.name}
              </text>
              <text
                x={cx + dx}
                y={cy + dy}
                textAnchor={anchor}
                fontSize={layout.pointLabel.fontSize}
                fontWeight={isSubject ? 700 : layout.pointLabel.fontWeight}
                fill={isSubject ? accent : ink}
              >
                {point.name}
              </text>
              {/* Interaction layer: an invisible, larger hit target — transparent at rest, only
                  CSS toggles it to `muted` on hover/focus (never inlined per-point). Every point is
                  `tabIndex={0}` with its own `aria-label`/`data-detail` baked in at build time, and
                  a nested `<title>` gives a native browser tooltip that works with the inline
                  script absent entirely. `assets/interaction.mjs` (unchanged by a new beat) wires
                  hover, tap and keyboard once `scripts/render-web.mjs` inlines this markup. */}
              <circle
                className="pt"
                cx={cx}
                cy={cy}
                r={hitR}
                fill="transparent"
                stroke="none"
                tabIndex={0}
                role="img"
                aria-label={detail}
                data-key={point.key}
                data-detail={detail}
              >
                <title>{detail}</title>
              </circle>
            </Fragment>
          );
        })}
      </g>

      {/* ── The column ──────────────────────────────────────────────────────────────────── */}
      {titleLines.map((line, i) => (
        <text
          key={line}
          x={columnX}
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
          x={columnX}
          y={sourceTop + i * layout.source.lead}
          fill={muted}
          fontSize={layout.source.fontSize}
        >
          {line}
        </text>
      ))}

      <text
        x={columnX}
        y={legendTop}
        fill={muted}
        fontSize={layout.caption.fontSize}
        fontWeight={layout.caption.fontWeight}
      >
        {legendCaption}
      </text>

      {/* The size legend: reference circles, smallest to largest left to right, sharing one
          baseline. A short unit ("M", not "million inhabitants") on every mark, so the legend box
          this loop draws into never has to reserve room for a word-length string —
          `geo-discipline.md`'s own open problem ("a legend can still clip a long unit word") is a
          known trap this beat sidesteps by keeping the per-mark unit short; the full word is spent
          once, in the caption above. */}
      {(() => {
        const ordered = [...legend].reverse(); // smallest first
        const gap = legendMaxR * 0.55 + 20;
        let cx = columnX + radiusOf(ordered[0]!);
        return ordered.map((v) => {
          const r = radiusOf(v);
          const mark = (
            <Fragment key={v}>
              <circle
                cx={cx}
                cy={legendBaseline - r}
                r={r}
                fill="none"
                stroke={muted}
                strokeWidth={1}
              />
              <text
                x={cx}
                y={legendBaseline - r * 2 - 8}
                textAnchor="middle"
                fill={muted}
                fontSize={layout.legendLabel.fontSize}
              >
                {`${fr(v)} ${UNIT}`}
              </text>
            </Fragment>
          );
          cx += r + gap;
          return mark;
        });
      })()}

      {/* The subject: context, not shouted — its own label above is already in the accent, so
          this note only adds the one editorial sentence a script cannot derive from the numbers. */}
      <text
        x={columnX}
        y={subjectY}
        fill={accent}
        fontSize={layout.legendLabel.fontSize}
        fontWeight={700}
      >
        {`${subject.name} — ${SUBJECT_NOTE}`}
      </text>

      {caveatLines.map((line, i) => (
        <text
          key={line}
          x={columnX}
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
 * The accessibility answer this beat is built to demonstrate
 * (`references/map-web-discipline.md`, "The accessibility question"): the SAME thirteen readings
 * the map draws spatially, again, as one plain HTML table — captioned, ordered largest first,
 * ALWAYS rendered (not behind a disclosure widget, not screen-reader-only CSS), so a reader with no
 * spatial access to the map has a complete, linear, exact account of everything the map claims.
 * Rendered ONCE by `scripts/render-web.mjs` (not per layout — the same data does not need saying
 * twice), as plain semantic HTML rather than SVG text, because a `<table>` with real `<th>` cells
 * is what a screen reader's own table navigation understands; an SVG `<text>` grid is not a table
 * to assistive technology no matter how it is laid out visually.
 */
export function RegionTable({
  points,
  ink,
  muted,
}: {
  points: ProjectedPoint[];
  ink: string;
  muted: string;
}) {
  const rows = readingOrder(points);
  return (
    <table className="region-table" style={{ color: ink, borderColor: muted }}>
      <caption>{`Every reading behind the map above, ${UNIT_WORD}, largest first.`}</caption>
      <thead>
        <tr>
          <th scope="col">Metro area</th>
          <th scope="col">{`Population (${UNIT_WORD})`}</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((point) => (
          <tr
            key={point.key}
            className={point.key === SUBJECT_KEY ? "subject" : undefined}
          >
            <th scope="row">{point.name}</th>
            <td>{`${fr(point.value)} ${UNIT}`}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export const DESKTOP_LAYOUT: WebLayout = {
  name: "desktop",
  width: 860,
  pad: 32,
  mapSize: 420,
  title: { fontSize: 21, fontWeight: 700, lead: 27 },
  source: { fontSize: 13, fontWeight: 400, lead: 17 },
  caption: { fontSize: 12.5, fontWeight: 600 },
  note: { fontSize: 11.5, lead: 15 },
  pointLabel: { fontSize: 11.5, fontWeight: 600 },
  legendLabel: { fontSize: 12 },
  maxRadiusPx: 26,
  bottomPad: 40,
};

export const NARROW_LAYOUT: WebLayout = {
  name: "narrow",
  width: 360,
  pad: 18,
  mapSize: 324,
  title: { fontSize: 16, fontWeight: 700, lead: 21 },
  source: { fontSize: 11, fontWeight: 400, lead: 15 },
  caption: { fontSize: 11, fontWeight: 600 },
  note: { fontSize: 10, lead: 13 },
  pointLabel: { fontSize: 9.5, fontWeight: 600 },
  legendLabel: { fontSize: 10.5 },
  maxRadiusPx: 15,
  bottomPad: 28,
};

export const LAYOUTS = [DESKTOP_LAYOUT, NARROW_LAYOUT];

/** The single layout `scripts/render-preview.mjs` renders — this skill's own static PNG preview
 *  needs only one of `LAYOUTS`, the same call `ChartWebSeed.tsx` makes for its own preview. */
export const SEED_LAYOUT = DESKTOP_LAYOUT;
