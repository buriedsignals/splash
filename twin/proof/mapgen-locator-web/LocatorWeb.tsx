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
  type LabelBox,
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

// There is no fallback caveat here on purpose. There used to be, and it was the typed sentence the
// render script has since replaced with a measured one — a default that says something false about
// the data is worse than no default, because nothing makes it go red.

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

export type LabelPlacement = {
  /** The `x` the `<text>` is drawn at, with `anchor` deciding which end of the box it is. */
  textX: number;
  baselineY: number;
  anchor: "start" | "middle" | "end";
  box: LabelBox;
  /** False when every candidate placement would cover another marker, or leave the plate. */
  clears: boolean;
};

/**
 * Where every label goes, in the DRAWN (scaled) frame at THIS layout's font size — so desktop and
 * narrow can legitimately reach different answers, and so the declutter and the drawing read the
 * same decision instead of each computing a side of their own.
 *
 * Four candidates in order: the edge-aware side, the other side, centred above, centred below. The
 * first that stays inside the plate AND touches no other marker wins. A label crossing another
 * marker is a real defect this beat shipped — see the caller's own comment — and no amount of
 * label-vs-label declutter can see it, because a marker is not a label.
 */
export function labelPlacements(
  points: (OrgRow & { px: number; py: number })[],
  {
    scale,
    mapSize,
    markerR,
    font,
    measure,
  }: {
    scale: number;
    mapSize: number;
    markerR: number;
    font: { fontSize: number; fontWeight: number };
    measure: Measure;
  },
): Map<string, LabelPlacement> {
  const dots = points.map((p) => ({
    key: p.key,
    cx: p.px * scale,
    cy: p.py * scale,
  }));
  const out = new Map<string, LabelPlacement>();

  for (const p of points) {
    const cx = p.px * scale;
    const cy = p.py * scale;
    const width = measure(p.name, font) + 10;
    const height = font.fontSize + 4;
    const preferred = labelSide(cx, mapSize);
    const other = preferred === "right" ? "left" : "right";

    const beside = (
      side: "left" | "right",
      dy: number,
    ): Omit<LabelPlacement, "clears"> => {
      const textX = side === "right" ? cx + markerR + 4 : cx - markerR - 4;
      return {
        textX,
        baselineY: cy + 4 + dy,
        anchor: side === "right" ? "start" : "end",
        box: {
          x: side === "right" ? textX : textX - width,
          y: cy - font.fontSize / 2 - 2 + dy,
          width,
          height,
        },
      };
    };
    const centred = (dy: number): Omit<LabelPlacement, "clears"> => ({
      textX: cx,
      baselineY: cy + 4 + dy,
      anchor: "middle",
      box: {
        x: cx - width / 2,
        y: cy - font.fontSize / 2 - 2 + dy,
        width,
        height,
      },
    });

    const stack = height + markerR;
    const candidates = [
      beside(preferred, 0),
      beside(other, 0),
      centred(-stack),
      centred(stack),
    ];
    const fits = (c: Omit<LabelPlacement, "clears">) =>
      c.box.x >= 0 &&
      c.box.x + c.box.width <= mapSize &&
      c.box.y >= 0 &&
      c.box.y + c.box.height <= mapSize &&
      !dots.some(
        (d) =>
          d.key !== p.key &&
          d.cx + markerR + 2 > c.box.x &&
          d.cx - markerR - 2 < c.box.x + c.box.width &&
          d.cy + markerR + 2 > c.box.y &&
          d.cy - markerR - 2 < c.box.y + c.box.height,
      );

    const chosen = candidates.find(fits);
    // `clears: false` means no placement on this plate leaves the label off every other marker.
    // The caller drops those labels rather than printing words across other organisations' dots —
    // the marker is still named by hover, by keyboard focus and in the table, which is the whole
    // point of this genre's two channels. On this data 7 of the 11 have no clear placement at
    // either layout, which is a statement about how tight the cluster is, not about the words.
    out.set(p.key, {
      ...(chosen ?? candidates[0]),
      clears: chosen !== undefined,
    });
  }
  return out;
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
  mustLabel = [],
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
  /** Keys the furniture names in words, which must therefore be labelled in the picture — checked
   *  per layout, because desktop and narrow keep different label sets. The delivered file named the
   *  World Economic Forum in both its caveat and its alt while the declutter had dropped its label
   *  in BOTH layouts, so a reader was sent looking for something that was not drawn. */
  mustLabel?: string[];
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

  if (!caveat.trim())
    throw new Error("this beat draws no caveat of its own — pass one.");
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

  // WHERE each label goes, decided ONCE and read by both the declutter and the drawing — they used
  // to compute the side separately, which is how the two could ever disagree.
  //
  // The declutter only guarantees a label does not collide with another LABEL. It says nothing
  // about a label crossing another MARKER, and on this plate that is not hypothetical: the World
  // Economic Forum sits 105 px from the right edge of a 420 px map and its label needs 139, so the
  // edge-aware side sends it back across the cluster and prints the words over three other
  // organisations' dots. Placement now tries the edge-aware side, then the other side, then centred
  // above and centred below, and takes the first candidate that stays inside the plate and clears
  // every other marker. A marker with no clear placement is left UNLABELLED on the frame rather
  // than printed across its neighbours — it keeps its hover, its keyboard focus and its row in the
  // table, which is what the two-channel principle above is for.
  const placements = labelPlacements(geometry.points, {
    scale,
    mapSize,
    markerR,
    font: layout.pointLabel,
    measure,
  });
  const placeable = geometry.points.filter(
    (p) => placements.get(p.key)!.clears,
  );
  const shown = declutterLabels(placeable, (p) => placements.get(p.key)!.box);

  const missing = mustLabel.filter((key) => !shown.has(key));
  if (missing.length > 0) {
    const named = missing
      .map((key) => geometry.points.find((p) => p.key === key)?.name ?? key)
      .join(", ");
    throw new Error(
      `the furniture names ${named}, but the ${layout.name} layout left ` +
        `${missing.length === 1 ? "it" : "them"} unlabelled — either no placement clears the other ` +
        "markers, or a higher-priority label took the space. Raise the priority, shorten the label, or stop " +
        "naming it in the words.",
    );
  }

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
          const placement = placements.get(point.key)!;
          const labelX = placement.textX;
          const labelY = placement.baselineY;
          const anchor = placement.anchor;
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
                    y={labelY}
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
                    y={labelY}
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
