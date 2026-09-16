/**
 * The WEB format of a proportional-symbol map: the same seventeen events `proof/map-quake-symbol`
 * draws as a still and as a video, in the one format neither of those can be — a map a reader can
 * INTERROGATE.
 *
 * WHY THIS TYPE EARNS THE WEB FORMAT, and it is not decoration. Radius goes as √magnitude, rooted at
 * zero, because a reader compares circles by AREA. On a study set that runs from M7.8 to M9.1 that
 * makes every circle nearly the same size — the largest is under 3% wider than the second largest,
 * which is under a pixel at the size these are drawn. The still says so in words and the video says
 * so in words, and neither can do anything about it: the encoding is honest and the differences are
 * genuinely small. This format can. Hover or focus any circle and its exact magnitude, place and date
 * arrive; the accessible table below carries all seventeen at once. The picture states the claim;
 * the interaction supplies the precision the picture cannot.
 *
 * THE SPLIT THAT MAKES THIS RESPONSIVE (`map-web/references/map-web-discipline.md`, "Full
 * width, genuinely" and "Text is HTML, not SVG"): the SVG carries ONLY geometry — the baked plate
 * `<image>` and the value-sized `<circle>`s — and every word (title, source, legend, the subject's
 * own label, the caveat) plus every control (the per-point hit target, the filter chips) is HTML,
 * positioned over the SVG by PERCENTAGE so it tracks the geometry, at a font size fixed in CSS pixels
 * so the type never grows or shrinks with the container. The plate keeps its baked aspect at every
 * width — scaled uniformly, never stretched, because a stretched basemap is a lie about distance and
 * shape.
 *
 * WHAT IS NOT DRAWN, and why. Every point is NOT labelled. Label position is a percentage of a frame
 * that changes size while label WIDTH is a fixed number of CSS pixels, so any decluttering computed
 * once is wrong at every width but one — and three real clusters here (Sumatra, the Kurils, the
 * Solomons/PNG) sit close enough to stack. The one label drawn is the subject's, the point the
 * title's own claim names, and it is drawn unconditionally: no interaction, no filter and no
 * script can remove it. Everything else is reachable by pointer, by keyboard and in the table.
 */

import {
  drawOrder,
  targetOrder,
  labelPlacement,
  halfMagnitudeReferenceValues,
  radiusScale,
  readingOrder,
  groupsOf,
  slugOf,
  en,
  MARK_MAX_RADIUS_FRACTION,
  type ProjectedQuake,
} from "./geo-symbol";

// ===== CONFIG — this beat's own story =====
/** The event the claim is about: the 2011 Great Tohoku earthquake, `q0` in the frozen file's own
 *  row order. `render-web.mjs` checks against the data that this row really is the largest before it
 *  renders anything, so the key here can never quietly name a lesser event. */
export const SUBJECT_KEY = "q0";
const UNIT = "M";
// ==========================================

// ===== Format mechanics =====
/** `MARK_MAX_RADIUS_FRACTION` used to be declared here and a second literal `0.045` lived in
 *  `render-web.mjs`'s `livePlan` under a comment pointing at this one. It is now stated once, in
 *  `geo-symbol.ts` — the only module the component, the render script and the BAKE can all import.
 *
 *  There is no `LEGEND_MAX_RADIUS_PX` any more either, and its removal is the fix for this type's
 *  own defect. It was a flat 16 CSS pixels, "deliberately NOT derived from the frame", so the legend
 *  drew the M9.0 reference at 31.8px across at every window while the map drew the M9.1 event at
 *  41.3px (1024x768), 53.4px (1600x900) and 56.5px on the live layer. The two circles a reader is
 *  meant to hold against each other were the same FUNCTION at two different maxima. The swatches
 *  below now carry the mark's own radius in frame units and are sized by the page against the map's
 *  own drawn width (`legendSwatchRules` in `render-web.mjs`) and, live, against the camera scale the
 *  marks are actually painted at (`live-map.mjs`'s `sizeLegend`). */
/** The per-point hit target's FLOOR, in real CSS pixels — not its size. The target is an HTML
 *  `<button>` whose own extent is derived from the mark it sits on: `max(this floor, the circle's
 *  own drawn diameter)`, the diameter written as the same fraction of the frame the circle is drawn
 *  at, so the two scale together at every width. The floor is what a frame-unit target alone could
 *  not give — at 375px a small mark is a few physical pixels across and unhittable.
 *
 *  It used to be the SIZE. Measured in Chrome at 1400x900 the drawn circles here are 49-53px across
 *  and the target was 28x28 on the same centre: a probe four pixels inside a circle's right edge
 *  got no answer, and the tooltip fired only on a small inner disc. */
const HIT_TARGET_PX = 28;
/**
 * THE OUTLINE, IN FRAME UNITS, so it survives the plate-to-drawn-size reduction the same way the
 * radius does. An absolute CSS pixel length does not: the plate is drawn between ~460 and ~930px
 * wide inside a 1000px frame, so a 1px stroke stated in real pixels is 2.2x heavier relative to its
 * own circle at the small end than at the large. The live layer had exactly that — a flat
 * `circle-stroke-width: 1` against this SVG's frame-unit strokes — so the same circle was outlined
 * at two different weights on the two sides of one swap.
 *
 * ONE WEIGHT FOR EVERY MARK, AND THAT IS THE FIX FOR A DEFECT IN THE BEAT'S OWN HEADLINE.
 *
 * The subject's outline used to be 0.0035 of the frame against every other mark's 0.0016 — 2.2x
 * heavier, as a third channel identifying it beside the accent hue and the heavier fill. An outline
 * is drawn OUTSIDE (MapLibre) or ASTRIDE (SVG) the radius, so a heavier outline makes a mark's
 * PAINTED disc wider than the radius that encodes its value — and by more, for the one mark the
 * comparison is about. Measured on this beat's own numbers, subject against second:
 *
 *     radii                      45.000 vs 43.746  →  +2.87%   ← what the title says
 *     painted, fallback plate    46.750 vs 44.546  →  +4.95%
 *     painted, live layer        48.500 vs 45.346  →  +6.95%
 *
 * The title of this beat is that number. A picture overstating it by 72% on the plate and by 142%
 * live is the claim failing in the one channel it is made in. With one weight the painted difference
 * is +2.81% on the plate and +2.76% live — inside a tenth of a point of the encoded radius.
 *
 * What identifies the subject is what this beat's own subject note already says identifies it: the
 * ACCENT, plus the heavier fill below. `PALETTE.md` records that decision and spends the accent on
 * exactly this one mark.
 */
export const MARK_STROKE_FRAME_UNITS = 0.0016;
/** How much ink a circle puts on the basemap. Exported because the legend's reference circles have
 *  to be the same MARK, not only the same size: at 16px a hollow ring read as a schematic swatch,
 *  and at the mark's real size a hollow ring beside a filled disc is visibly a different object. */
export const SUBJECT_FILL_OPACITY = 0.42;
export const MARK_FILL_OPACITY = 0.26;
// ===========================

/** One event's own detail string: the ONE implementation the hit target's `aria-label`,
 *  `data-detail` and native `title` all draw from, so a hovering reader and a screen-reader user are
 *  never told two different things about the same circle. */
export function quakeDetail(point: {
  mag: number;
  place: string;
  time: string;
}): string {
  return `${UNIT}${en(point.mag)} · ${point.place} · ${point.time.slice(0, 10)}`;
}

export function QuakeSymbolWeb({
  geometry,
  plate,
  title,
  source,
  basemapCredit,
  legendCaption,
  subjectNote,
  caveat,
  alt,
  ground,
  accent,
  ink,
  muted,
  filterLegend,
}: {
  geometry: {
    frame: { width: number; height: number };
    points: ProjectedQuake[];
  };
  plate: string;
  title: string;
  source: string;
  basemapCredit: string;
  legendCaption: string;
  subjectNote: string;
  caveat: string;
  alt: string;
  ground: string;
  accent: string;
  /** Derived from `ground` by `deriveFurniture` in the node runner that calls this component. */
  ink: string;
  muted: string;
  /** The filter fieldset's own legend, handed in by the render script — which also resolves the
   *  eyebrow register against these very characters, so the face that sets it is chosen for what it
   *  sets rather than for a string typed twice. */
  filterLegend: string;
}) {
  const { frame, points } = geometry;
  if (points.length < 2)
    throw new Error(
      `a symbol map needs at least two points, got ${points.length}`,
    );
  const subject = points.find((p) => p.key === SUBJECT_KEY);
  if (!subject) throw new Error(`no point for the subject ${SUBJECT_KEY}`);

  const maxMag = Math.max(...points.map((p) => p.mag));
  const radiusOf = radiusScale(maxMag, frame.width * MARK_MAX_RADIUS_FRACTION);
  const drawn = drawOrder(points); // largest first, so smaller circles paint on top
  const targets = targetOrder(points); // smallest first, so the largest are never covered
  const groups = groupsOf(points);
  const legend = halfMagnitudeReferenceValues(maxMag);

  // The subject's own label, placed against the FRAME edge rather than the data — the flip margin is
  // a fraction of the real frame, so it scales with whatever size the plate was baked at instead of
  // silently shrinking as a fraction of a bigger bake.
  const subjectRadius = radiusOf(subject.mag);
  const { side, dy } = labelPlacement(
    subject.px,
    subject.py,
    frame,
    frame.width * 0.18,
  );
  const gapPct = ((subjectRadius + frame.width * 0.012) / frame.width) * 100;
  const subjectX = (subject.px / frame.width) * 100;
  const subjectY = (subject.py / frame.height) * 100;
  const subjectLabelStyle: Record<string, string> = {
    top: `${subjectY + (dy / frame.height) * 100}%`,
    transform: "translateY(-50%)",
  };
  if (side === "right") {
    subjectLabelStyle.left = `${subjectX + gapPct}%`;
    subjectLabelStyle.textAlign = "left";
  } else {
    subjectLabelStyle.right = `${100 - (subjectX - gapPct)}%`;
    subjectLabelStyle.textAlign = "right";
  }

  return (
    <div className="map-web">
      <p className="mw-title">{title}</p>
      <p className="mw-source">{`${source} · ${basemapCredit}`}</p>

      {/* The filter: real radios in a real fieldset, drawn as chips by CSS and never replaced by
          divs, so Tab reaches the group, Arrow keys move within it, the native <label> makes the
          whole chip clickable and none of it needs a line of JavaScript. "All arcs" is checked in
          the SSR'd markup, so a reader who never touches this — and a reader whose browser runs no
          script at all — sees every event the title counts. */}
      {groups.length > 1 && (
        <fieldset className="mw-filter">
          <legend>{filterLegend}</legend>
          <div className="mw-filter-options">
            <label className="mw-chip">
              <input
                type="radio"
                name="mw-filter"
                id="mw-filter-all"
                defaultChecked
              />
              <span>All arcs</span>
            </label>
            {groups.map((g) => (
              <label className="mw-chip" key={g}>
                <input
                  type="radio"
                  name="mw-filter"
                  id={`mw-filter-${slugOf(g)}`}
                />
                <span>{g}</span>
              </label>
            ))}
          </div>
        </fieldset>
      )}

      {/* THE MAP AND ITS READING, SIDE BY SIDE. The legend, the subject's line and the caveat used to
          sit BELOW the map in one column, which took the height that made the stage short — and on
          this type a short wide stage is not only a small map, it is the WRONG MAP: the live camera
          is fitted to the study set at runtime, so a 1568x593 stage opened about 150 degrees of
          longitude to hold 59 of latitude and half the live frame carried no mark at all.
          `@media (max-aspect-ratio: 1/1)` puts the column back underneath when the room the window
          leaves is vertical. */}
      <div className="mw-body">
        <div className="mw-stage">
        <div
          className="mw-viewport"
          style={{ aspectRatio: `${frame.width} / ${frame.height}` }}
        >
          {/* LAYER 2 — the live MapTiler map (ruling R1). Empty and invisible until
              `live-map.mjs` gets a `map.on("load")`; a style failure, a dead key, no network or no
              JavaScript at all leaves layer 1 below exactly where it is. Its own container, never a
              wrapper around the fallback, so the swap is one `hidden` flip and never a half-drawn
              state. */}
          <div id="mw-map" className="mw-live-map" />
          {/* LAYER 1 — the baked plate, complete and script-free: what a reader gets with
              JavaScript off, offline, or after the account's keys are invalidated at 100% of its
              spending limit. The unzoomed state is not a preview of the real view, it IS the full
              claim. */}
          <div id="mw-fallback" className="mw-fallback">
            {/* Geometry only — no <text> anywhere inside this SVG. `role="group"` rather than
                `role="img"`: nothing inside is focusable, and the meaningful description is the
                `aria-label`, while the real interaction lives in the HTML overlay. */}
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
                {drawn.map((point) => {
                  const isSubject = point.key === SUBJECT_KEY;
                  return (
                    <circle
                      key={point.key}
                      cx={point.px}
                      cy={point.py}
                      r={radiusOf(point.mag)}
                      fill={isSubject ? accent : muted}
                      fillOpacity={
                        isSubject ? SUBJECT_FILL_OPACITY : MARK_FILL_OPACITY
                      }
                      stroke={isSubject ? accent : muted}
                      strokeWidth={Math.max(
                        1,
                        frame.width * MARK_STROKE_FRAME_UNITS,
                      )}
                      // The filter has to reach the decorative mark too, or a narrowed view leaves
                      // every other arc's circle on the map with no hit target — an ambiguous ghost
                      // rather than a genuinely narrower map. The SLUG, because this value is quoted
                      // inside a generated CSS selector.
                      data-group={slugOf(point.arc)}
                      // The hit target below reads its own extent off this circle, and the guard
                      // that probes the target's edges pairs the two by this key.
                      data-key={point.key}
                    />
                  );
                })}
              </g>
            </svg>
          </div>

          {/* LAYER 3 — the overlay: the subject's label and the per-point hit targets. A SIBLING of
              the two map layers, never a child of either, because it belongs to BOTH: it is the only
              keyboard path to the data. Nested inside the fallback, hiding the fallback on
              `map.on("load")` would take every Tab stop with it — a total loss of keyboard reach on
              the exact path the ruling was supposed to improve. Positioned in PERCENTAGES here,
              which is what the fallback needs; `live-map.mjs` repositions the same nodes with
              `map.project()` on every camera move, which is what the live map needs. */}
          <div className="mw-overlay">
            {/* The subject's own label: HTML, positioned by percentage of the frame, sized in fixed
                CSS pixels. Drawn unconditionally — it is the claim, not an interaction result.
                `data-key`/`data-side`/`data-gap`/`data-dy` are what `reposition()` needs to place
                this node against the LIVE camera; without them the label sits at its baked
                percentage while the circle it names has moved.
                `data-group` closes B6.18b: a filter that hides the subject's circle must hide the
                subject's label with it, or the reader is left with a magnitude floating over a mark
                that is no longer on the map. */}
            <span
              className="point-label subject"
              data-key={subject.key}
              data-side={side}
              data-gap={subjectRadius + frame.width * 0.012}
              data-dy={dy}
              data-group={slugOf(subject.arc)}
              style={subjectLabelStyle}
            >{`${UNIT}${en(subject.mag)}`}</span>

            {/* The interaction layer: one HTML <button> per event, positioned by percentage, sized
                in FIXED CSS pixels. `title` gives a native tooltip with no script at all;
                `aria-label`/`data-detail` are baked into the markup rather than assembled by the
                inline script, so the no-JS page is still keyboard-reachable and still announces the
                value. Laid down SMALLEST FIRST (`targetOrder`): where two events sit closer than a
                target is wide, the later button covers the earlier one's centre, and this order
                guarantees the covered one is the smaller event rather than the M8.6 the claim is
                measured against. */}
            {targets.map((point) => {
              const detail = quakeDetail(point);
              // The target is the MARK, with a floor — the circle's own drawn diameter as the same
              // fraction of the frame the circle is drawn at. Never a second radius constant.
              const markRadius = radiusOf(point.mag);
              const hitDiameter = markRadius * 2;
              return (
                <button
                  key={point.key}
                  type="button"
                  className="pt"
                  style={{
                    left: `${(point.px / frame.width) * 100}%`,
                    top: `${(point.py / frame.height) * 100}%`,
                    // ONE dimension. The height comes from `.pt { aspect-ratio: 1 }`, never from a
                    // second percentage: a percentage height resolves against the CONTAINER's
                    // height while a percentage width resolves against its width, so the same
                    // fraction is two different numbers as soon as the overlay stops being the
                    // plate's own square — which is what the live swap did. Measured here at
                    // 1600x900: the M9.1 button was 140.9 x 53.2 px, a wide flat grey ellipse
                    // painted behind a 60 px disc (B6.20, the owner's "c'est chelou").
                    width: `max(${HIT_TARGET_PX}px, ${(hitDiameter / frame.width) * 100}%)`,
                  }}
                  aria-label={detail}
                  title={detail}
                  data-key={point.key}
                  data-detail={detail}
                  // The mark's OWN radius, in the bake's frame units — the same number `livePlan`
                  // hands the circle layer as `r`. `live-map.mjs`'s `reposition` multiplies it by
                  // the camera scale to size the painted halo, so the halo and the circle under it
                  // are one number seen once, not two that can drift.
                  data-r={markRadius}
                  data-group={slugOf(point.arc)}
                />
              );
            })}
          </div>
        </div>
      </div>

      {/* The reading column: the reference circles, the subject's own line and the caveat. */}
      <div className="mw-reading">
        {/* The legend: entirely HTML, and its circles are THE MAP'S CIRCLES at the map's own drawn
            size — not a second, smaller schematic scale. `data-value` is what the generated rule in
            `render-web.mjs` keys the width off (a fraction of `--map-w`, the map's drawn width) and
            `data-r` is the mark's own radius in the bake's frame units, the same number `livePlan`
            puts on the circle layer's features — so `live-map.mjs` can re-size these from the camera
            scale the marks are actually painted at, exactly as it does the hit targets. One radius
            scale, one number per circle, three places that draw it.
            The per-mark unit is short ("M9.0") and the full sentence is spent once, in the caption
            above it. */}
        <div className="mw-legend">
          <p className="mw-legend-caption">{legendCaption}</p>
          <div className="mw-legend-marks">
            {[...legend].reverse().map((v) => (
              <div key={v} className="mw-legend-item">
                <span
                  className="mw-legend-swatch"
                  data-value={v}
                  data-r={radiusOf(v)}
                />
                <span className="mw-legend-value">{`${UNIT}${en(v)}`}</span>
              </div>
            ))}
          </div>
        </div>

        <p className="mw-subject">{subjectNote}</p>
        <p className="mw-caveat">{caveat}</p>
      </div>
      {/* /.mw-body */}
      </div>
    </div>
  );
}

/**
 * The accessibility answer, and on THIS beat it is not optional.
 *
 * A map is a spatial medium and a screen-reader user has no spatial access to it; a hover tooltip is
 * not an answer, because it requires knowing where on the canvas to point before you can ask. The
 * format makes this table opt-in per beat (`renderMapWeb`'s `regionTable`) and this beat opts IN,
 * deliberately: the claim is a comparison of seventeen magnitudes whose circles differ by less than
 * 3% at the top, so "which is largest" is not readable from the picture at all without asking each
 * circle in turn. A table makes it checkable in one pass. It also carries the two events whose hit
 * targets overlap at map scale — 33 km apart, closer than a pointer target is wide — which is the
 * one reading the spatial channel genuinely cannot deliver.
 *
 * Ordered by `readingOrder` (largest first), the same order the keyboard's Home/End uses, and each
 * row carries the same `data-group` slug the map's marks do, so one filter narrows both channels
 * together rather than leaving a map that says one thing and a table that still says another.
 */
export function QuakeTable({
  points,
  ink,
  muted,
}: {
  points: ProjectedQuake[];
  ink: string;
  muted: string;
}) {
  const rows = readingOrder(points);
  return (
    <table className="region-table" style={{ color: ink, borderColor: muted }}>
      <caption>
        Every event behind the map above, strongest first — the exact magnitudes
        the circles cannot separate.
      </caption>
      <thead>
        <tr>
          <th scope="col">Where</th>
          <th scope="col">Magnitude</th>
          <th scope="col">Date</th>
          <th scope="col">Arc</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((point) => (
          <tr
            key={point.key}
            data-group={slugOf(point.arc)}
            className={point.key === SUBJECT_KEY ? "subject" : undefined}
          >
            <th scope="row">{point.place}</th>
            <td>{`${UNIT}${en(point.mag)}`}</td>
            <td>{point.time.slice(0, 10)}</td>
            <td>{point.arc}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
