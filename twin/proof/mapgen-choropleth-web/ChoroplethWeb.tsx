/**
 * REPLACE ME. Do not parameterise me.
 *
 * The first WEB-genre choropleth this project has built (`twin-map-web/SKILL.md`'s own gap: "a map
 * beat could ship static or video, never a genuinely interactive one" — for the SYMBOL case; this
 * beat closes the CHOROPLETH cell of that same matrix). It draws a real claim: of the 41 European
 * countries this beat declares, the Faroe Islands' 2023 per-capita CO₂ emissions are the highest —
 * more than eight times Albania's, the lowest — using the same baked-plate approach every map beat
 * in this project draws from (`geo-discipline.md` rules 1-4, 6, 7, 9, 12): the camera is spent ONCE
 * by `bake-plate.mjs`, and this component draws an `<image>` and some `<path>`s, never a live map.
 *
 * What THIS genre adds on top of the static/video choropleth (`twin-map-beat/assets/Co2MapStill.tsx`,
 * `Co2MapVideo.tsx`) is every region's own EXACT value on demand, without spending the frame's fixed
 * room printing all 41 — and, because a map is a spatial medium and not every reader has spatial
 * access to it, the SAME 41 values again as an ordered, linear, always-rendered table (`RegionTable`
 * below), so nothing this beat claims lives ONLY in a hover
 * (`references/map-web-discipline.md`, "The accessibility question").
 *
 * Four things this genre needs that a static frame does not, mirroring
 * `twin-map-web/assets/MapWebSeed.tsx`'s own list, adapted from circles to polygons:
 *
 *   1. ONE component (`ChoroplethWeb`) called twice, once per `WebLayout` — both SSR'd at build
 *      time by `render-web.mjs`. No client-side layout math: a CSS media query alone swaps the two
 *      pre-rendered SVGs.
 *   2. `tabIndex={0}` and a per-region `aria-label`, written on every region's own `<path>` at build
 *      time — not assembled by the inline script — so the no-JS frame is still keyboard-reachable,
 *      region by region, with the script absent entirely. Each region also carries a nested
 *      `<title>`, a native browser tooltip on hover even with the script absent.
 *   3. Nothing argument-bearing gated behind interaction. The title, the caveat, the source, the
 *      class legend (with printed bin-boundary numbers, not colour alone — the type's own
 *      accessibility trap, `types/choropleth.md`) and the subject/comparison notes are all drawn
 *      unconditionally; hover and focus only ever add the per-region EXACT figure.
 *   4. A visible, always-rendered alternative to the spatial reading (`RegionTable`) — a real table
 *      any reader can use, because "hover the right pixel" is not a reading strategy every reader
 *      has available to them.
 *
 * A region's own hit target is normally its own filled `<path>` — unlike a proportional symbol,
 * whose visible mark can be a few px across at the small end of a value scale, a region's own shape
 * IS the fair target for most of the 41. A handful are genuinely too small to land a pointer on
 * reliably at this camera (Liechtenstein is ~1×3px on the baked plate) — those get one extra,
 * invisible, larger circular hit target on top (`needsHitProxy`, below), forwarding to the SAME
 * `.pt` path's own interaction, never a second, competing target
 * (`references/map-web-discipline.md`, "Touch and hover share one target", adapted from a circle's
 * `hitR` to a polygon's own bounding box).
 *
 * `geo-discipline.md` rule 8: the ramp is the one legitimate gradient here, carrying the quantity,
 * so it cannot also carry the accent — the SUBJECT (Faroe Islands) gets an outline and a direct
 * label in the accent, and nothing else does. The comparison (Albania) is marked too — an outline
 * and a direct label, because the claim names it by name — but in INK, not the accent, the same
 * choice `Co2MapStill.tsx` makes for its own comparison mark ("the comparison in ink, because it is
 * not the subject").
 */

import { Fragment } from "react";
import {
  binIndex,
  bboxCenter,
  boundingBoxOf,
  en,
  pathFromRings,
  scalePosition,
  sequentialRamp,
  NO_DATA_FILL,
  type BakedShape,
} from "./geo-choropleth";

type Measure = (
  text: string,
  font: { fontSize: number; fontWeight?: number },
) => number;

/** A shape merged with its joined value — what both `ChoroplethWeb`'s own `rows` prop and
 *  `RegionTable`'s own `rows` prop actually carry (a `JoinedRow`'s `{key, value}` plus the shape's
 *  own `name`, which the table needs and a bare `JoinedRow` does not have). */
type NamedRow = { key: string; name: string; value: number | null };

export type WebLayout = {
  name: "desktop" | "narrow";
  width: number;
  pad: number;
  /** The square plate's own side length — smaller than `width` on the narrow layout, where the map
   *  sits ABOVE the text column instead of beside it (no room for both side by side at 360px). */
  mapSize: number;
  title: { fontSize: number; fontWeight: number; lead: number };
  source: { fontSize: number; fontWeight: number; lead: number };
  caption: { fontSize: number; fontWeight: number };
  note: { fontSize: number; lead: number };
  tick: { fontSize: number };
  markerLabel: { fontSize: number; fontWeight: number };
  regionLabel: { fontSize: number; fontWeight: number };
  legendBarHeight: number;
  bottomPad: number;
};

// ===== CONFIG — edit for your story =====
const UNIT = "t";
const UNIT_WORD = "tonnes of CO₂ per person";
const SUBJECT_KEY = "FRO";
const COMPARISON_KEY = "ALB";
const NO_DATA_LABEL = "No data";
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

/** One region's own detail string — the single implementation the SSR'd `aria-label`/`data-detail`
 *  attributes AND the accessible table both draw from, never a second formatting of the same
 *  number (`references/map-web-discipline.md`, "One value, one formatting, in one place"). */
export function regionDetail(region: {
  name: string;
  value: number | null;
}): string {
  return region.value === null
    ? `${region.name} : ${NO_DATA_LABEL}`
    : `${region.name} : ${en(region.value)} ${UNIT_WORD}`;
}

/** A region's own filled path is normally a fair pointer target; a handful of the 41 are not —
 *  under 22px on a side at THIS layout's own map scale is the threshold this beat measured against
 *  the actual baked geometry (Andorra, Liechtenstein, Malta, Luxembourg, Montenegro and the Faroe
 *  Islands themselves all fall under it). */
function needsHitProxy(
  box: { minX: number; maxX: number; minY: number; maxY: number },
  scale: number,
): boolean {
  const w = (box.maxX - box.minX) * scale;
  const h = (box.maxY - box.minY) * scale;
  return Math.max(w, h) < 22;
}

export function ChoroplethWeb({
  geometry,
  plate,
  rows,
  breaks,
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
    shapes: BakedShape[];
  };
  plate: string;
  rows: NamedRow[];
  breaks: number[];
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
  if (geometry.shapes.length < 2)
    throw new Error(
      `a choropleth needs at least two shapes, got ${geometry.shapes.length}`,
    );

  const { width, pad, mapSize } = layout;
  const stacked = layout.name === "narrow";
  const scale = mapSize / geometry.frame.width;
  const ramp = sequentialRamp(ground, ink, breaks.length + 1);
  const valueByKey = new Map(rows.map((r) => [r.key, r.value]));
  const named = geometry.shapes.map((shape) => ({
    ...shape,
    value: valueByKey.get(shape.key) ?? null,
  }));
  const anyNoData = named.some((r) => r.value === null);

  const fillOf = (value: number | null): string =>
    value === null ? NO_DATA_FILL : ramp[binIndex(value, breaks)]!;

  const mapX = pad;
  const mapY = pad;
  const columnX = stacked ? pad : pad + mapSize + pad;
  const columnWidth = stacked ? width - pad * 2 : width - columnX - pad;
  const columnTop = stacked ? mapY + mapSize + 28 : mapY;

  const titleLines = wrap(title, columnWidth, layout.title, measure);
  const sourceLines = wrap(
    `${source} · ${basemapCredit}`,
    columnWidth,
    layout.source,
    measure,
  );
  const caveatLines = wrap(caveat, columnWidth, layout.note, measure);

  const titleTop = columnTop + layout.title.fontSize;
  const sourceTop = titleTop + (titleLines.length - 1) * layout.title.lead + 26;
  const sourceBottom =
    sourceTop + (sourceLines.length - 1) * layout.source.lead;

  // ── The legend: one horizontal class bar, the bin boundaries printed as numbers underneath —
  //    the type's own accessibility trap (`types/choropleth.md`): colour alone is never the only
  //    channel a value travels through.
  const legendCaptionY = sourceBottom + 34;
  const barTop = legendCaptionY + 16;
  const barHeight = layout.legendBarHeight;
  const barBottom = barTop + barHeight;
  const segmentWidth = columnWidth / ramp.length;
  const markerRowY = barBottom + 22;
  const noDataY = markerRowY + (anyNoData ? layout.note.lead + 8 : 0);
  const notesTop = noDataY + layout.markerLabel.fontSize + 14;

  const subject = named.find((r) => r.key === SUBJECT_KEY);
  const comparison = named.find((r) => r.key === COMPARISON_KEY);
  if (!subject) throw new Error(`no shape for the subject ${SUBJECT_KEY}`);
  if (!comparison)
    throw new Error(`no shape for the comparison ${COMPARISON_KEY}`);
  if (subject.value === null || comparison.value === null)
    throw new Error(
      "the subject and the comparison must both have a joined value",
    );

  const subjectLines = wrap(
    `${subject.name} — highest of the 41, ${en(subject.value)} ${UNIT_WORD}`,
    columnWidth,
    layout.note,
    measure,
  );
  const comparisonLines = wrap(
    `${comparison.name} — lowest of the 41, ${en(comparison.value)} ${UNIT_WORD}`,
    columnWidth,
    layout.note,
    measure,
  );
  const subjectNoteTop = notesTop;
  const comparisonNoteTop =
    subjectNoteTop +
    (subjectLines.length - 1) * layout.note.lead +
    layout.note.lead +
    2;
  const caveatTop =
    comparisonNoteTop +
    (comparisonLines.length - 1) * layout.note.lead +
    layout.note.lead +
    10;

  const frameHeight = stacked
    ? caveatTop + (caveatLines.length - 1) * layout.note.lead + layout.bottomPad
    : Math.max(
        mapY + mapSize + layout.bottomPad,
        caveatTop +
          (caveatLines.length - 1) * layout.note.lead +
          layout.bottomPad,
      );

  if (!stacked && legendCaptionY < sourceBottom)
    throw new Error(
      `the column does not fit: source ends at ${sourceBottom}, legend starts at ${legendCaptionY}. Shorten the title or the source.`,
    );

  // Reading order: highest value first, shared by DOM order (so Tab/Home/End reach it in this
  // order), the accessible table, and nothing recomputed twice
  // (`references/map-web-discipline.md`, "The accessibility question").
  const drawn = [...named].sort(
    (a, b) => (b.value ?? -Infinity) - (a.value ?? -Infinity),
  );

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
      {/* No root role="img" — the same deliberate departure `web-discipline.md` names: that role
          would flatten every child into one opaque image, silencing the per-region paths below.
          `<desc>` still carries the alt text. */}
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
        <g transform={`scale(${scale})`}>
          {drawn.map((region) => {
            const isSubject = region.key === SUBJECT_KEY;
            const isComparison = region.key === COMPARISON_KEY;
            const detail = regionDetail(region);
            const box = boundingBoxOf(region.rings);
            const proxy = needsHitProxy(box, scale);
            const [cx, cy] = bboxCenter(box);
            return (
              <Fragment key={region.key}>
                <path
                  className="pt"
                  d={pathFromRings(region.rings)}
                  fill={fillOf(region.value)}
                  fillRule="evenodd"
                  stroke={ground}
                  strokeWidth={0.8 / scale}
                  strokeLinejoin="round"
                  tabIndex={0}
                  role="img"
                  aria-label={detail}
                  data-key={region.key}
                  data-detail={detail}
                >
                  <title>{detail}</title>
                </path>
                {/* Touch/hover share one target (`references/map-web-discipline.md`): a region this
                    small on the baked plate is not a fair pointer target on its own filled shape
                    alone, so it gets one extra, invisible, larger circular proxy that forwards to
                    the SAME path above rather than competing with it (no second tab stop —
                    `assets/interaction.mjs` resolves the proxy back to its `.pt` sibling). */}
                {proxy ? (
                  <circle
                    className="hit-proxy"
                    cx={cx}
                    cy={cy}
                    r={14 / scale}
                    fill="transparent"
                    stroke="none"
                    aria-hidden="true"
                    data-target={region.key}
                  />
                ) : null}
              </Fragment>
            );
          })}
          {/* The subject's outline: a ground-coloured halo so it separates from whatever class its
              neighbours landed in, then the accent itself — spent HERE and nowhere else on the map
              (rule 8). The comparison gets the same two-pass outline, in ink, because it is not the
              subject.
              `pointerEvents="none"` on both passes: a decorative overlay drawn ON TOP of the real
              `.pt` path (and, for a shape this small, its `.hit-proxy`) would otherwise intercept
              the pointer itself — measured on the actual rendered page, not assumed: the Faroe
              Islands' own outline stroke (a few px wide) covers nearly the whole 7×14px shape at
              this camera, and swallowed every hover before this was added. Outline pixels are
              never a target; the region underneath always is. */}
          {[
            { region: comparison, colour: ink },
            { region: subject, colour: accent },
          ].map(({ region, colour }) => (
            <Fragment key={region.key}>
              <path
                d={pathFromRings(region.rings)}
                fill="none"
                stroke={ground}
                strokeWidth={4.2 / scale}
                strokeLinejoin="round"
                pointerEvents="none"
              />
              <path
                d={pathFromRings(region.rings)}
                fill="none"
                stroke={colour}
                strokeWidth={2 / scale}
                strokeLinejoin="round"
                pointerEvents="none"
              />
            </Fragment>
          ))}
        </g>
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
        y={legendCaptionY}
        fill={muted}
        fontSize={layout.caption.fontSize}
        fontWeight={layout.caption.fontWeight}
      >
        {legendCaption}
      </text>

      {/* The class bar: `ramp.length` flat segments, lightest to darkest, left to right — and the
          bin boundaries printed as numbers underneath, never colour alone
          (`types/choropleth.md`, "The accessibility trap"). */}
      {ramp.map((shade, i) => (
        <rect
          key={shade}
          x={columnX + i * segmentWidth}
          y={barTop}
          width={segmentWidth}
          height={barHeight}
          fill={shade}
        />
      ))}
      {[0, ...breaks].map((tick, i) => (
        <text
          key={tick}
          x={columnX + i * segmentWidth}
          y={barBottom + layout.tick.fontSize + 6}
          fill={muted}
          fontSize={layout.tick.fontSize}
          textAnchor="middle"
        >
          {i === breaks.length ? `${en(tick, 0)}+` : en(tick, 0)}
        </text>
      ))}

      {/* Where the subject and the comparison sit on the SAME continuous scale the class bar only
          shows in discrete steps — the argument made visible as a distance, not just asserted in
          the two notes below. */}
      {[
        { region: comparison, colour: ink },
        { region: subject, colour: accent },
      ].map(({ region, colour }) => {
        const x =
          columnX + scalePosition(region.value as number, breaks) * columnWidth;
        return (
          <path
            key={region.key}
            d={`M${x} ${barTop - 5}L${x - 5} ${barTop - 12}L${x + 5} ${barTop - 12}Z`}
            fill={colour}
          />
        );
      })}

      {anyNoData ? (
        <g transform={`translate(${columnX},${markerRowY})`}>
          <rect
            x={0}
            y={-10}
            width={18}
            height={13}
            fill={NO_DATA_FILL}
            stroke={muted}
            strokeWidth={0.5}
          />
          <text x={26} y={0} fill={muted} fontSize={layout.tick.fontSize}>
            {NO_DATA_LABEL}
          </text>
        </g>
      ) : null}

      {/* The two marks the argument is made of, each with its own direct note — the subject in the
          accent, the comparison in ink, because it is not the subject (rule 8). */}
      {subjectLines.map((line, i) => (
        <text
          key={line}
          x={columnX}
          y={subjectNoteTop + i * layout.note.lead}
          fill={accent}
          fontSize={layout.markerLabel.fontSize}
          fontWeight={layout.markerLabel.fontWeight}
        >
          {line}
        </text>
      ))}
      {comparisonLines.map((line, i) => (
        <text
          key={line}
          x={columnX}
          y={comparisonNoteTop + i * layout.note.lead}
          fill={ink}
          fontSize={layout.markerLabel.fontSize}
          fontWeight={layout.markerLabel.fontWeight}
        >
          {line}
        </text>
      ))}

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
 * (`references/map-web-discipline.md`, "The accessibility question"): the SAME 41 readings the map
 * draws spatially, again, as one plain HTML table — captioned, ordered largest first, ALWAYS
 * rendered (not behind a disclosure widget, not screen-reader-only CSS), so a reader with no spatial
 * access to the map has a complete, linear, exact account of everything the map claims. Rendered
 * ONCE by `render-web.mjs` (not per layout — the same 41 facts do not need saying twice), as plain
 * semantic HTML rather than SVG text, because a `<table>` with real `<th>` cells is what a screen
 * reader's own table navigation understands.
 */
export function RegionTable({
  rows,
  ink,
  muted,
}: {
  rows: NamedRow[];
  ink: string;
  muted: string;
}) {
  const ordered = [...rows].sort(
    (a, b) => (b.value ?? -Infinity) - (a.value ?? -Infinity),
  );
  return (
    <table className="region-table" style={{ color: ink, borderColor: muted }}>
      <caption>{`Every reading behind the map above, ${UNIT_WORD}, largest first.`}</caption>
      <thead>
        <tr>
          <th scope="col">Country</th>
          <th scope="col">{`CO₂ per capita (${UNIT_WORD})`}</th>
        </tr>
      </thead>
      <tbody>
        {ordered.map((region) => (
          <tr
            key={region.key}
            className={
              region.key === SUBJECT_KEY || region.key === COMPARISON_KEY
                ? "subject"
                : undefined
            }
          >
            <th scope="row">{region.name}</th>
            <td>
              {region.value === null
                ? NO_DATA_LABEL
                : `${en(region.value)} ${UNIT}`}
            </td>
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
  tick: { fontSize: 11 },
  markerLabel: { fontSize: 12.5, fontWeight: 700 },
  regionLabel: { fontSize: 11.5, fontWeight: 600 },
  legendBarHeight: 22,
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
  tick: { fontSize: 9.5 },
  markerLabel: { fontSize: 11, fontWeight: 700 },
  regionLabel: { fontSize: 9.5, fontWeight: 600 },
  legendBarHeight: 18,
  bottomPad: 28,
};

export const LAYOUTS = [DESKTOP_LAYOUT, NARROW_LAYOUT];

export const SEED_LAYOUT = DESKTOP_LAYOUT;
