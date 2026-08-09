/**
 * The web genre of the locator beat: "eleven international organisations headquartered in and
 * around Geneva," interactive. Draws from the SAME baked-plate approach every genre in this twin
 * uses (`geo-discipline.md` rules 1, 2, 4, 6, 7, 9, 12): the camera is spent ONCE by
 * `bake-plate.mjs`, and this component draws an `<image>` and some `<circle>`s, never a live map.
 *
 * A locator has the least to say of any map type — position and, optionally, category, no
 * magnitude (`twin-map-beat/references/types/locator.md`). The one thing that goes wrong at this
 * type is marker SIZE implying importance, so unlike `twin-map-web/assets/MapWebSeed.tsx`'s
 * proportional-symbol circles (radius ∝ value), every marker here is drawn at the SAME fixed
 * radius (`layout.markerR`) regardless of anything — a declared `priority` field (not size) is
 * what decides which LABEL survives when markers crowd, via a deterministic declutter
 * (`geo-locator.ts`'s own `declutterLabels`).
 *
 * Two channels, not one (`twin-map-web/references/map-web-discipline.md`): the static declutter
 * controls which labels are ALWAYS visible on the plate; every marker, labelled or not, still
 * carries its own `tabIndex`, `aria-label`, a nested `<title>`, and a `data-detail` string reached
 * by hover or keyboard focus — so a marker whose static label was dropped by crowding is never
 * actually inaccessible, only quieter on the static frame. `OrgTable` below carries the same
 * eleven facts again, once, as a real HTML table, for the reader with no spatial access to the
 * map at all — the accessibility answer this genre's own doctrine requires, not a hover tooltip
 * standing in for it.
 *
 * This is this beat's OWN copy of the genre's mechanics (`WebLayout`, `wrap`) — nothing here
 * imports `twin-map-web/assets/MapWebSeed.tsx`, the same "a skill/beat builds after being copied
 * alone" rule that skill's own header states for its relationship to `twin-map-beat`.
 */

import { Fragment } from "react";
import {
  CATEGORY_COLOUR,
  CATEGORY_ORDER,
  declutterLabels,
  labelSide,
  readingOrder,
  type OrgRow,
} from "./geo-locator";

type Measure = (
  text: string,
  font: { fontSize: number; fontWeight?: number },
) => number;

export type WebLayout = {
  name: "desktop" | "narrow";
  width: number;
  pad: number;
  /** The square plate's own side length inside this layout — smaller than `width` on the narrow
   *  layout, where the map sits ABOVE the text column rather than beside it (no room for both
   *  side by side once the frame drops below ~480px). */
  mapSize: number;
  title: { fontSize: number; fontWeight: number; lead: number };
  source: { fontSize: number; fontWeight: number; lead: number };
  caption: { fontSize: number; fontWeight: number };
  note: { fontSize: number; lead: number };
  pointLabel: { fontSize: number; fontWeight: number };
  legendLabel: { fontSize: number };
  /** UNIFORM marker radius — never derived from a value. The one thing this type must never do
   *  is size a marker by importance; a `priority` field drives label survival instead, below. */
  markerR: number;
  /** The invisible hit target's radius — fixed, like `markerR`, never per-point or value-derived
   *  (`twin-map-web/references/map-web-discipline.md`, "Touch and hover share one target," minus
   *  the `max(r, 14)` that genre needs only because ITS circles vary in visible size). */
  hitR: number;
  bottomPad: number;
};

// ===== CONFIG — edit for your story =====
const CAVEAT =
  "A locator marks position only — marker size does not encode a value. Coordinates are each " +
  "organisation's own Wikidata point, not a street address; the World Economic Forum's is in " +
  "Cologny, east of the main cluster.";
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

/** One point's own detail string — name plus category, the ONLY two facts a locator is allowed to
 *  claim about a place. The single implementation the SSR'd `aria-label`/`data-detail` attributes
 *  AND `OrgTable` both draw from, never a second phrasing of the same fact. */
export function pointDetail(point: { name: string; category: string }): string {
  return `${point.name} — ${point.category}`;
}

export function LocatorWeb({
  geometry,
  plate,
  title,
  source,
  basemapCredit,
  legendCaption,
  caveat,
  alt,
  ground,
  ink,
  muted,
  measure,
  layout,
}: {
  geometry: {
    frame: { width: number; height: number };
    points: (OrgRow & { px: number; py: number })[];
  };
  plate: string;
  title: string;
  source: string;
  basemapCredit: string;
  legendCaption: string;
  caveat: string;
  alt: string;
  ground: string;
  /** Derived from `ground` by `deriveFurniture` in whatever node runner calls this component. */
  ink: string;
  muted: string;
  measure: Measure;
  layout: WebLayout;
}) {
  if (geometry.points.length < 1)
    throw new Error(
      `a locator needs at least one point, got ${geometry.points.length}`,
    );

  const { width, pad, mapSize, markerR, hitR } = layout;
  const stacked = layout.name === "narrow";
  const scale = mapSize / geometry.frame.width;

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

  const legendTop = sourceBottom + 34;
  const legendRowH = 22;
  const legendBottom =
    legendTop +
    layout.caption.fontSize +
    10 +
    CATEGORY_ORDER.length * legendRowH;

  const caveatTop = legendBottom + 18;

  const frameHeight = stacked
    ? caveatTop + (caveatLines.length - 1) * layout.note.lead + layout.bottomPad
    : Math.max(
        mapY + mapSize + layout.bottomPad,
        caveatTop +
          (caveatLines.length - 1) * layout.note.lead +
          layout.bottomPad,
      );
  // Loud, not silent — the same "column does not fit" invariant every static/web seed in this
  // twin asserts rather than lets clip.
  if (!stacked && legendTop < sourceBottom)
    throw new Error(
      `the column does not fit: source ends at ${sourceBottom}, legend starts at ${legendTop}. Shorten the title or the source.`,
    );

  // Declutter: a label's box, in the DRAWN (scaled) frame, at THIS layout's own font size — so
  // desktop and narrow can legitimately keep different label sets (`references/types/locator.md`'s
  // accessibility trap: the declutter only guarantees no label collides with ANOTHER label, so the
  // side is edge-aware FIRST, computed against the mapSize this layout actually draws at, not the
  // bake's own pixel space).
  const shown = declutterLabels(geometry.points, (p) => {
    const cx = p.px * scale;
    const cy = p.py * scale;
    const side = labelSide(cx, mapSize);
    const w = measure(p.name, layout.pointLabel) + 10;
    return {
      x: side === "right" ? cx + markerR + 4 : cx - markerR - 4 - w,
      y: cy - layout.pointLabel.fontSize / 2 - 2,
      width: w,
      height: layout.pointLabel.fontSize + 4,
    };
  });

  const drawn = readingOrder(geometry.points);

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
      {/* No root role="img" — it would flatten every child into one opaque image, silencing the
          per-point circles below. `<desc>` still carries the alt text. */}
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
          const cx = point.px * scale;
          const cy = point.py * scale;
          const fill = CATEGORY_COLOUR[point.category] ?? muted;
          const side = labelSide(cx, mapSize);
          const labelX = side === "right" ? cx + markerR + 4 : cx - markerR - 4;
          const anchor = side === "right" ? "start" : "end";
          const detail = pointDetail(point);
          return (
            <Fragment key={point.key}>
              {/* Decorative: UNIFORM radius, never scaled by anything — a locator's only channel
                  on the mark itself is CATEGORY colour. */}
              <circle
                cx={cx}
                cy={cy}
                r={markerR}
                fill={fill}
                stroke={ground}
                strokeWidth={1.4}
              />
              {shown.has(point.key) && (
                <>
                  <text
                    x={labelX}
                    y={cy + 4}
                    textAnchor={anchor}
                    fontSize={layout.pointLabel.fontSize}
                    fontWeight={layout.pointLabel.fontWeight}
                    stroke={ground}
                    strokeWidth={3}
                    strokeLinejoin="round"
                    fill="none"
                  >
                    {point.name}
                  </text>
                  <text
                    x={labelX}
                    y={cy + 4}
                    textAnchor={anchor}
                    fontSize={layout.pointLabel.fontSize}
                    fontWeight={layout.pointLabel.fontWeight}
                    fill={ink}
                  >
                    {point.name}
                  </text>
                </>
              )}
              {/* Interaction layer: EVERY marker gets one, labelled-or-not — the two-channel
                  principle (`map-web-discipline.md`): static declutter controls what is ALWAYS
                  visible, hover/focus/table always give the full fact for every marker regardless.
                  Fixed `hitR`, never value-derived (this type has no value to derive it from). */}
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

      {/* The category legend: a swatch per category, nothing sized by value — a locator's colour
          is category or nothing (`references/types/locator.md`, "What the drawing needs"). */}
      {CATEGORY_ORDER.map((category, i) => {
        const y = legendTop + layout.caption.fontSize + 10 + i * legendRowH;
        return (
          <Fragment key={category}>
            <circle
              cx={columnX + 6}
              cy={y - 4}
              r={markerR}
              fill={CATEGORY_COLOUR[category]}
              stroke={ground}
              strokeWidth={1}
            />
            <text
              x={columnX + 20}
              y={y}
              fill={muted}
              fontSize={layout.legendLabel.fontSize}
            >
              {category}
            </text>
          </Fragment>
        );
      })}

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
 * The accessibility answer this genre requires (`map-web-discipline.md`, "The accessibility
 * question"): the SAME eleven facts the map draws spatially, again, as one plain HTML table —
 * captioned, real `<th scope="row"/"col">`, ordered by PRIORITY (the same order the static
 * declutter placed labels in and a keyboard Home/End would reach markers in), ALWAYS rendered —
 * not behind a disclosure widget, not screen-reader-only CSS. Rendered ONCE (not per layout — the
 * same eleven facts do not read differently at 360px than at 860px).
 */
export function OrgTable({
  points,
  ink,
  muted,
}: {
  points: OrgRow[];
  ink: string;
  muted: string;
}) {
  const rows = readingOrder(points);
  return (
    <table className="org-table" style={{ color: ink, borderColor: muted }}>
      <caption>
        {
          "Every organisation behind the map above, in the same order as its keyboard Home/End."
        }
      </caption>
      <thead>
        <tr>
          <th scope="col">Organisation</th>
          <th scope="col">Category</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((point) => (
          <tr key={point.key}>
            <th scope="row">{point.name}</th>
            <td>{point.category}</td>
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
  markerR: 6,
  hitR: 14,
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
  markerR: 5,
  hitR: 13,
  bottomPad: 28,
};

export const LAYOUTS = [DESKTOP_LAYOUT, NARROW_LAYOUT];
