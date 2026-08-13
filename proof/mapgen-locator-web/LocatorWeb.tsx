/**
 * The web format of the locator beat: "eleven international organisations headquartered in and
 * around Geneva," interactive — and, since ruling R1 (2026-08-10), a LIVE MapTiler map a reader can
 * actually move through, with the baked plate kept as the layer underneath it.
 *
 * A locator has the least to say of any map type — position and, optionally, category, no magnitude
 * (`map-beat/references/types/locator.md`). The one thing that goes wrong at this type is
 * marker SIZE implying importance, so unlike `map-web/assets/MapWebSeed.tsx`'s
 * proportional-symbol circles (radius ∝ value), every marker here is drawn at the SAME fixed radius
 * — `MARKER_RADIUS_PX`, ONE number, read by the fallback SVG, by the live layer's own features and
 * by the hit target that derives from it. A declared `priority` field (never size) is what decides
 * which LABEL survives when markers crowd.
 *
 * THREE LAYERS IN ONE BOX (`map-web/references/map-web-discipline.md`, "Pan and zoom", as
 * overturned by R1) — the same order and the same three ids `MapWebSeed.tsx` uses, because the
 * format's own boot script (`live-map.mjs`, a byte-identical copy in this folder) addresses them by
 * name:
 *   1. `#mw-map` — empty, FIRST, its own container. `live-map.mjs` fills it with a live MapLibre map
 *      and shows it only on `map.on("load")`.
 *   2. `#mw-fallback` — the baked plate and the markers, complete and script-free: what a reader
 *      gets with JavaScript off, offline, or after the account's keys are invalidated.
 *   3. `.mw-overlay` — the point labels and the per-point hit targets, a SIBLING of both and never a
 *      child of either. It carries every point name and every Tab stop; nesting it inside the
 *      fallback (the seed's own first draft) took all of them away the moment the live map arrived.
 *
 * WHAT THE LIVE MAP FIXES FOR *THIS* BEAT, which is why R1 matters more here than anywhere else in
 * the format. `AUDIT-W5-W6-map.md` §4.2 measured this page drawing **3 labels for 11 organisations**
 * — 73% dropped — while the family's own video title says "All 11 of these international
 * organisations sit inside 4.4 km". The cause is not the label rule: the closest pair is 13.3 m
 * apart, which is **0.53 px** on this beat's own 420 px plate, and no amount of decluttering
 * separates two names that share a pixel. A static frame cannot show eleven names here. A map the
 * reader can zoom can: `render-web.mjs`'s `livePlan` puts every one of the eleven into `anchors`, so
 * every label and every hit target follows the live camera, and `interaction.mjs` re-runs this same
 * priority declutter against the boxes the browser actually measured — so a name that has no room at
 * the fitted view appears the moment its neighbour moves away. The SSR'd `hidden` state below is the
 * no-JS answer; the live one is re-decided at every camera move.
 *
 * ONE RENDER, NO SECOND LAYOUT (B5.1). This file used to SSR two whole SVG frames — a 860 px
 * "desktop" and a 360 px "narrow" — with the title, the source, the legend, the caveat and every
 * point label drawn as SVG `<text>` inside each. Both shipped in the file; a media query chose one.
 * That is gone. There is now ONE fluid SVG carrying GEOMETRY ONLY (the plate and the markers) and
 * one HTML overlay carrying everything that reads as text, positioned by PERCENTAGE (so it tracks
 * the geometry as the container resizes) and sized in CSS pixels (so a font never grows with the
 * box). `render-web.mjs`'s own `buildCss` is what bounds the whole beat to the reader's window.
 *
 * This is this beat's OWN copy of the format's mechanics — nothing here imports
 * `map-web/assets/MapWebSeed.tsx`, the same "a skill/beat builds after being copied alone" rule
 * that skill's own header states for its relationship to `map-beat`.
 */

import {
  CATEGORY_ORDER,
  declutterLabels,
  labelSide,
  readingOrder,
  slugOf,
  type LabelBox,
  type OrgRow,
} from "./geo-locator";

type Measure = (
  text: string,
  font: { fontSize: number; fontWeight?: number },
) => number;

// ===== Format mechanics — not one story's numbers =====
/**
 * THE marker radius, in the bake's own frame units (which are CSS pixels at the plate's own 420 px
 * size). ONE number, and that is the point: this file used to carry FOUR values for one type —
 * `markerR: 6` / `hitR: 14` on the desktop layout and `markerR: 5` / `hitR: 13` on the narrow one —
 * so a marker was two sizes and its hit target two more, and the live layer would have had to pick a
 * fifth. Now the live circle (`render-web.mjs`'s `livePlan`), the fallback circle below and the hit
 * target all read this, and `HIT_TARGET_PX` is derived from it rather than typed beside it.
 *
 * A locator marker is a PIN, not a measurement — `live-map.mjs` draws it with `radius: "fixed"`, the
 * same screen size at every zoom, exactly as the plate draws it. Growing it with the camera would be
 * the proportional-symbol rule applied to a type that has no magnitude to encode.
 */
export const MARKER_RADIUS_PX = 6;
/** The halo that keeps a marker legible over whatever the basemap paints under it — the same width
 *  in the SVG and in the live layer's `circle-stroke-width`, so the swap cannot change the mark. */
export const MARKER_STROKE_PX = 1.4;
/** The pointer/touch target's FLOOR, in real CSS pixels (`map-web-discipline.md`, "Touch and hover
 *  share one target"). A 12 px-wide pin is not a touch target at any width, so the floor is what
 *  actually applies here — but it is written as a floor, and the target is DERIVED, so a beat that
 *  raises the marker radius past 14 gets a target that grows with it instead of one that silently
 *  stays smaller than its own mark. */
const HIT_TARGET_FLOOR_PX = 28;
export const HIT_TARGET_PX = Math.max(
  HIT_TARGET_FLOOR_PX,
  MARKER_RADIUS_PX * 2,
);
/** The label's own type, fixed in CSS pixels — see this file's header note on why nothing in the
 *  overlay is sized in frame units. Declared here because the SSR declutter has to MEASURE the label
 *  at exactly the size the stylesheet will draw it at. */
export const LABEL_FONT = { fontSize: 11.5, fontWeight: 600 };
/** How far the label's near edge sits from the marker's CENTRE, in frame units. Derived from the
 *  marker rather than typed beside it, so a bigger pin pushes its own name clear. */
export const LABEL_GAP_FRAME = MARKER_RADIUS_PX + 4;
/** The label chip's own padding and line box, in CSS pixels — the numbers `render-web.mjs`'s
 *  `.point-label` rule draws, kept here because the declutter measures the box the reader sees, not
 *  the glyphs alone. */
export const LABEL_PAD_X = 4;
export const LABEL_PAD_Y = 3;
/* THE OUT-OF-MAP ZOOM CONTROL IS GONE (B6.14b, by name). There is no `ZOOM_SCALE`, no
   `mw-zoom-toggle` checkbox and no "Zoom in (1.4×, bounded)" label anywhere in this beat: the reader
   zooms with MapTiler's own NavigationControl, which `live-map.mjs` adds to the map itself. */
// =======================================================

/** One point's own detail string — name plus category, the ONLY two facts a locator is allowed to
 *  claim about a place. The single implementation the SSR'd `aria-label`/`data-detail` attributes,
 *  the live layer's own tooltip AND `OrgTable` all draw from, never a second phrasing. */
export function pointDetail(point: { name: string; category: string }): string {
  return `${point.name} — ${point.category}`;
}

export type LabelPlacement = {
  /** Which side of its own marker the label prefers. Travels to the live layer as `data-side`. */
  side: "left" | "right";
  /** Which CSS edge of the label the SSR'd percentage position anchors — the edge NEAREST its own
   *  marker, which is the opposite of the side it sits on: a label to the RIGHT of a marker is
   *  anchored by its `left`, one to the LEFT by its `right`. That is not a detail. The label's glyphs
   *  are a fixed CSS size while the frame around them is a percentage, so anchoring the far edge lets
   *  the near one drift off the marker as the container resizes — and getting it backwards (this
   *  file did, for one render) throws every left-hand name clear across the plate and off the page,
   *  where the browser clips it: "…iamentary Union". Visible only in the picture. */
  anchor: "left" | "right" | "centre";
  /** The vertical offset from the marker, in frame units — 0 beside it, one stack above or below. */
  dy: number;
  /** The box it occupies in FRAME units, at the plate's own 1:1 size — what the declutter reads. */
  box: LabelBox;
  /** False when NO candidate placement both stays on the plate and clears every other
   *  organisation's marker. The declutter cannot see either condition: it compares a label with
   *  another LABEL, and a marker is not a label. This beat shipped that defect once — the World
   *  Economic Forum sits 105 px from the right edge of a 420 px plate and its name needs 138, so the
   *  edge-aware side sent it back across the cluster and printed the words over three other
   *  organisations' dots. A name with no clear placement is left OFF the script-free frame rather
   *  than drawn over someone else's position; it keeps its hover, its keyboard focus, its row in the
   *  table, and — live — three more placements to try. */
  clears: boolean;
};

/**
 * Where every label goes on the PLATE, in the bake's own frame units — one placement, read by the
 * declutter, by the SSR'd percentage position and (through `data-side`/`data-gap`/`data-dy`) by
 * `live-map.mjs`'s own `reposition`. Three readers, one decision: they used to compute the side
 * separately, which is how two of them could ever disagree.
 *
 * Four candidates in order — the edge-aware side, the other side, centred above, centred below — and
 * the first that stays on the plate AND touches no other marker wins. `interaction.mjs` offers the
 * same four live, re-tried at every camera move, because the answer changes with the camera.
 *
 * THE FLIP MARGIN IS DERIVED, and that closes an audit finding of its own. `labelSide`'s default
 * margin is a typed 170 px, measured by `AUDIT-W5-W6-map.md` §4.2 at **40% of this beat's 420 px
 * map** with exactly 1 of 11 markers ever landing in the band — mis-sized and idle at once. What a
 * label actually needs on its right is its own width plus its own gap, so that is what is passed:
 * a long name flips early, a short one flips late, and no constant decides it.
 */
export function labelPlacements(
  points: (OrgRow & { px: number; py: number })[],
  {
    frame,
    measure,
  }: {
    frame: { width: number; height: number };
    measure: Measure;
  },
): Map<string, LabelPlacement> {
  const out = new Map<string, LabelPlacement>();
  for (const point of points) {
    const width = measure(point.name, LABEL_FONT) + LABEL_PAD_X * 2;
    const height = LABEL_FONT.fontSize + LABEL_PAD_Y * 2;
    const preferred = labelSide(point.px, frame.width, LABEL_GAP_FRAME + width);
    const other = preferred === "right" ? "left" : "right";
    const beside = (side: "left" | "right"): Omit<LabelPlacement, "clears"> => ({
      side,
      anchor: side === "right" ? "left" : "right",
      dy: 0,
      box: {
        x:
          side === "right"
            ? point.px + LABEL_GAP_FRAME
            : point.px - LABEL_GAP_FRAME - width,
        y: point.py - height / 2,
        width,
        height,
      },
    });
    const centred = (dy: number): Omit<LabelPlacement, "clears"> => ({
      side: preferred,
      anchor: "centre",
      dy,
      box: {
        x: point.px - width / 2,
        y: point.py + dy - height / 2,
        width,
        height,
      },
    });
    const stack = height / 2 + LABEL_GAP_FRAME;
    const candidates = [beside(preferred), beside(other), centred(-stack), centred(stack)];
    const fits = (candidate: Omit<LabelPlacement, "clears">) =>
      candidate.box.x >= 0 &&
      candidate.box.x + candidate.box.width <= frame.width &&
      candidate.box.y >= 0 &&
      candidate.box.y + candidate.box.height <= frame.height &&
      !points.some(
        (mark) =>
          mark.key !== point.key &&
          mark.px + MARKER_RADIUS_PX > candidate.box.x &&
          mark.px - MARKER_RADIUS_PX < candidate.box.x + candidate.box.width &&
          mark.py + MARKER_RADIUS_PX > candidate.box.y &&
          mark.py - MARKER_RADIUS_PX < candidate.box.y + candidate.box.height,
      );
    const chosen = candidates.find(fits);
    out.set(point.key, { ...(chosen ?? candidates[0]), clears: chosen !== undefined });
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
  alt,
  ground,
  ink,
  muted,
  categoryColour,
  measure,
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
  alt: string;
  ground: string;
  /** Derived from `ground` by `deriveFurniture` in whatever node runner calls this component. */
  ink: string;
  muted: string;
  /** One colour per category, in the order `CATEGORY_ORDER` lists them — read from the beat's
   *  recorded `PALETTE.md` and handed in. See `geo-locator.ts` for why a locator's category colours
   *  are its whole data encoding and therefore may not be typed into a component. */
  categoryColour: Record<string, string>;
  measure: Measure;
  /** Keys the furniture names in words, which must therefore be labelled in the picture — checked
   *  against the SSR'd (no-JS) label set, which is the one a reader can be left with. The delivered
   *  file once named the World Economic Forum in both its caveat and its alt while the declutter had
   *  dropped its label, so a reader was sent looking for something that was not drawn. */
  mustLabel?: string[];
}) {
  const { frame, points } = geometry;
  if (points.length < 1)
    throw new Error(`a locator needs at least one point, got ${points.length}`);

  const placements = labelPlacements(points, { frame, measure });
  // The SSR'd label set: the deterministic priority declutter over the placements that clear the
  // plate and every other organisation's marker, computed at the plate's own 1:1 size. It is the
  // answer a reader with no JavaScript keeps, and the starting point the live declutter in
  // `interaction.mjs` re-decides from real measured boxes at every camera move — where a name that
  // has no room here can take one of four placements and usually finds one.
  const shown = declutterLabels(
    points.filter((p) => placements.get(p.key)!.clears),
    (p) => placements.get(p.key)!.box,
  );

  const missing = mustLabel.filter((key) => !shown.has(key));
  if (missing.length > 0) {
    const named = missing
      .map((key) => points.find((p) => p.key === key)?.name ?? key)
      .join(", ");
    throw new Error(
      `the furniture names ${named}, but the script-free render left ` +
        `${missing.length === 1 ? "it" : "them"} unlabelled — either no placement clears the other ` +
        "markers, or a higher-priority label took the space. Raise the priority, shorten the label, " +
        "or stop naming it in the words.",
    );
  }

  const drawn = readingOrder(points);

  return (
    <div className="map-web">
      <p className="mw-title">{title}</p>
      <p className="mw-source">{`${source} · ${basemapCredit}`}</p>

      {/* THE LEGEND AND THE FILTER ARE ONE CONTROL, and that is a decision rather than a saving.
          A locator's colour carries exactly one categorical variable (`references/types/locator.md`)
          — so the thing a legend has to say ("blue is the UN system") and the thing a filter has to
          offer ("show me only the UN system") are the same three facts. Drawn twice they cost this
          beat about 80 px of the reader's window twice over, and B5.1 is measured in exactly that
          currency. Every chip carries its category's own swatch, so the colour key is still drawn
          unconditionally, still readable with JavaScript off, and still there when `:has()` is not
          supported — only the narrowing stops working, which is the same graceful floor the rest of
          this format's filter has.

          Every input is a REAL radio in a REAL `<fieldset>`, moved out of sight by CSS and never
          replaced: Tab reaches the group, Arrow keys move within it, the native `<label>`
          association makes the whole chip clickable, and nothing here is script-driven. "All
          categories" is first and checked, so the unfiltered view — the whole claim — is what the
          beat renders in; a reader narrows past it, never into it. */}
      <fieldset className="mw-filter">
        <legend>{legendCaption}</legend>
        <div className="mw-filter-options">
          <label className="mw-chip">
            <input
              type="radio"
              name="mw-filter"
              id="mw-filter-all"
              defaultChecked
            />
            <span
              className="mw-chip-swatch mw-chip-swatch-all"
              aria-hidden="true"
            />
            <span>All categories</span>
          </label>
          {CATEGORY_ORDER.map((category) => (
            <label className="mw-chip" key={category}>
              <input
                type="radio"
                name="mw-filter"
                id={`mw-filter-${slugOf(category)}`}
              />
              <span
                className="mw-chip-swatch"
                aria-hidden="true"
                style={{ background: categoryColour[category] }}
              />
              <span>{category}</span>
            </label>
          ))}
        </div>
      </fieldset>

      {/* The stage: the one box that gets whatever room the window has left once every piece of
          furniture has taken its own (`render-web.mjs`'s `buildCss`). The viewport inside it keeps
          the bake's own square aspect exactly while the FALLBACK is showing — a stretched plate is a
          lie about distance and shape — and gives that up once the live map arrives, because a live
          camera has no plate aspect to preserve. */}
      <div className="mw-stage">
        <div
          className="mw-viewport"
          style={{ aspectRatio: `${frame.width} / ${frame.height}` }}
        >
          {/* LAYER 2 — the live MapTiler map (R1). Empty until `live-map.mjs` gets its
              `map.on("load")`; a style failure, a dead key, no network or no JavaScript at all
              leaves layer 1 below exactly where it is. Its own container, never a wrapper around the
              fallback, so the swap is one `hidden` flip and never a half-drawn state. */}
          <div id="mw-map" className="mw-live-map" />
          {/* LAYER 1 — the baked plate, complete and script-free. `map-web-discipline.md`'s rule
              survives verbatim: the unzoomed state is not a preview of the real view, it IS the full
              claim. Geometry only — no `<text>` anywhere inside this SVG. */}
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
                {drawn.map((point) => (
                  <circle
                    key={point.key}
                    cx={point.px}
                    cy={point.py}
                    r={MARKER_RADIUS_PX}
                    fill={categoryColour[point.category] ?? muted}
                    stroke={ground}
                    strokeWidth={MARKER_STROKE_PX}
                    // The filter has to reach this decorative mark too, or a narrowed view leaves
                    // every other category's marker sitting on the map unlabelled — an ambiguous
                    // ghost rather than a genuinely narrower map. The SLUG, not the raw name: this
                    // value is quoted inside a generated CSS selector.
                    data-group={slugOf(point.category)}
                    data-key={point.key}
                  />
                ))}
              </g>
            </svg>
          </div>

          {/* LAYER 3 — the overlay: the names and the hit targets, a SIBLING of both map layers. */}
          <div className="mw-overlay">
            {drawn.map((point) => {
              const { side, anchor, dy, box } = placements.get(point.key)!;
              const xPct = (point.px / frame.width) * 100;
              const gapPct = (LABEL_GAP_FRAME / frame.width) * 100;
              const style: Record<string, string> = {
                top: `${((point.py + dy) / frame.height) * 100}%`,
                transform: "translateY(-50%)",
              };
              if (anchor === "right") style.right = `${100 - (xPct - gapPct)}%`;
              else if (anchor === "left") style.left = `${xPct + gapPct}%`;
              else style.left = `${(box.x / frame.width) * 100}%`;
              return (
                <span
                  key={point.key}
                  className="point-label"
                  data-key={point.key}
                  // The side it took and the gap it keeps from its own marker, in frame units.
                  // `live-map.mjs` repositions this node with `map.project()` and needs the SAME
                  // numbers this component placed it with — without them a live label sits ON its
                  // own marker. `data-dy` is 0 because a locator's label is vertically centred on
                  // its pin (the CSS `translateY(-50%)` above does it) rather than nudged off a
                  // circle whose size varies.
                  data-side={side}
                  data-gap={LABEL_GAP_FRAME}
                  data-dy={dy}
                  data-group={slugOf(point.category)}
                  // What the live declutter sorts by, so the browser reaches the same answer this
                  // render does rather than a DOM-order one.
                  data-priority={point.priority}
                  hidden={!shown.has(point.key)}
                  style={style}
                >
                  {point.name}
                </span>
              );
            })}

            {drawn.map((point) => {
              const detail = pointDetail(point);
              return (
                <button
                  key={point.key}
                  type="button"
                  className="pt"
                  style={{
                    left: `${(point.px / frame.width) * 100}%`,
                    top: `${(point.py / frame.height) * 100}%`,
                  }}
                  aria-label={detail}
                  title={detail}
                  data-key={point.key}
                  data-detail={detail}
                  data-group={slugOf(point.category)}
                />
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * The caveat, and WHY IT IS NOT INSIDE THE MAP COLUMN.
 *
 * "A locator marks position only" is the sentence that stops a reader inventing a magnitude from
 * eleven identical dots, so it is drawn unconditionally, never behind a disclosure widget and never
 * behind interaction — `BRIEF.md`'s own anti-pattern list says so. What it is NOT is part of the
 * picture's own column: it is 155 px of prose at 375 px wide, and the map above it was left with
 * 150. So it sits at the top of the reading pane instead — beside the map on a wide window, directly
 * under it on a narrow one, always rendered, always the first thing under the frame it qualifies.
 * It lives beside the table because they are the same thing: the reading a reader does after
 * looking.
 */
export function LocatorCaveat({ caveat }: { caveat: string }) {
  if (!caveat.trim())
    throw new Error("this beat draws no caveat of its own — pass one.");
  return <p className="mw-caveat">{caveat}</p>;
}

/**
 * The accessibility answer this format requires (`map-web-discipline.md`, "The accessibility
 * question"): the SAME eleven facts the map draws spatially, again, as one plain HTML table —
 * captioned, real `<th scope="row"/"col">`, ordered by PRIORITY (the same order the declutter places
 * labels in and a keyboard Home/End reaches markers in), ALWAYS rendered — not behind a disclosure
 * widget, not screen-reader-only CSS. Rendered ONCE, and unchanged by this task: whether it should
 * become something more compact is B5.2, which is the owner's decision and not this one.
 *
 * Every row carries `data-group` (the slug, the same string the map's own marks carry), so the ONE
 * filter narrows the map and the table together — never a map that agrees with itself and disagrees
 * with the table.
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
          <tr key={point.key} data-group={slugOf(point.category)}>
            <th scope="row">{point.name}</th>
            <td>{point.category}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
