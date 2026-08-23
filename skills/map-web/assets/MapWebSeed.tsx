/**
 * REPLACE ME. Do not parameterise me.
 *
 * The web format's seed: a proportional-symbol map, interactive. It draws a real claim — this
 * sample of thirteen European metro areas, sized by population, with Paris the largest — using the
 * same baked-plate approach `map-beat` ships for static and video (`geo-discipline.md` rules
 * 1-4, 6): the camera is spent ONCE by `scripts/bake-plate.mjs`, and this component draws an
 * `<image>` and some `<circle>`s, never a live map. What THIS format adds on top of that is the
 * thing static and video cannot have: every point's own exact value, on demand, without spending
 * the frame's fixed room printing all thirteen. The ordered, linear table of the same values
 * (`RegionTable` below) is now OPT-IN per beat, not automatic — `renderMapWeb`'s own
 * `regionTable` option, off for this seed. `references/map-web-discipline.md`'s own "The
 * accessibility question" states exactly what a reader without spatial access loses when a beat
 * leaves it off, and it is not a small thing — read it before deciding.
 *
 * THE SPLIT THAT MAKES THIS GENUINELY RESPONSIVE (`references/map-web-discipline.md`, "Full width,
 * genuinely"): the SVG below carries ONLY geometry — the baked plate `<image>` and the decorative,
 * value-sized `<circle>`s — nothing that reads as text. Every piece of furniture (title, source,
 * legend, point-name labels, the subject note, the caveat) and every interactive control (the
 * per-point hit target, the filter, the zoom toggle) is plain HTML, absolutely positioned over the
 * SVG by PERCENTAGE (so it tracks the geometry as the container resizes) but sized in CSS pixels
 * (so a font, once set, never grows or shrinks with the container — the defect this whole rewrite
 * exists to remove). The SVG's own `viewBox` is the bake's native frame; the plate keeps that
 * frame's exact aspect at every size, and the `.mw-stage` wrapper below is what bounds it to the
 * room the WINDOW actually has left after the furniture — see `render-web.mjs`'s own `buildCss`
 * and `references/map-web-discipline.md`, "Fit the window". One render, no breakpoint, no second
 * layout to keep in sync with the first.
 *
 * Two capabilities layered on top of that split, both governed by the same rule this format has
 * always followed for interaction (`references/map-web-discipline.md`, "What must not become
 * interactive"): nothing the title claims may live ONLY behind them.
 *   - A FILTER (`.mw-filter`, radios drawn as chips) narrows which points are drawn, labelled and
 *     listed in the table — never which points exist. The "All regions" radio is checked by
 *     default, so the unfiltered view already shows the whole claim; a reader narrows past it,
 *     never into it. Each element carries its group as a SLUG (`slugOf`), the same string the
 *     radio's own `id` is built from, because the CSS that hides the other groups has to quote
 *     that value inside a selector — see `render-web.mjs`'s `buildCss` for the defect that taught
 *     this (an HTML-escaped `&amp;` inside a CSS string matched nothing, and one of this seed's
 *     own three filters emptied the map).
 *   - REAL ZOOM AND PAN, from MapTiler, constrained to the subject's area — ruling R1, 2026-08-10.
 *     The beat ships in two layers: `#mw-fallback` is this SSR'd markup over the baked plate, and
 *     `#mw-map` is an empty box that `assets/live-map.mjs` fills with a live MapLibre map and swaps
 *     in on `map.on("load")`. Everything below therefore still renders complete with JavaScript off,
 *     offline, and after a key is rotated — the ruling asked for a map a reader can move through, not
 *     for a page that breaks without a network. The bounded `ZOOM_SCALE` checkbox this format used to
 *     put ABOVE the map is gone (B6.14b asked for its removal by name).
 *   - The FILTER is still pure CSS: `:has()` + `:checked`, so it narrows the map, the labels and the
 *     table identically with the inline `<script>` never running. What `interaction.mjs` adds is the
 *     exact hover/focus VALUE — the legend's three rounded reference sizes can only approximate it,
 *     and the `title` attribute's native no-JS tooltip shows it one point at a time, slowly.
 */

import {
  drawOrder,
  labelPlacement,
  niceReferenceValues,
  radiusScale,
  readingOrder,
  groupsOf,
  groupAttrOf,
  slugOf,
  fr,
  type ProjectedPoint,
} from "./geo-symbol";

// ===== CONFIG — edit for your story =====
const UNIT = "M";
const UNIT_WORD = "million inhabitants";
const CAVEAT = "Sample data for demonstration purposes, not a census figure.";
const SUBJECT_KEY = "paris";
const SUBJECT_NOTE = "the largest metro area in this sample";
// =========================================

// ===== Format mechanics — not one story's numbers =====
/** The on-map mark's largest radius, as a FRACTION of the bake's own frame width — not a fixed
 *  pixel count. Because the SVG's `viewBox` equals the frame and the whole SVG then scales with
 *  the container via CSS, a fraction of the frame is what stays a fraction of the container at
 *  every width; a fixed pixel count would not (it would be one specific fraction at the one width
 *  it was tuned for, and a different fraction everywhere else). */
const MARK_MAX_RADIUS_FRACTION = 0.062;
/** The legend's own reference-circle radius, in real CSS pixels, deliberately NOT derived from the
 *  frame — a legend is a fixed schematic scale, not a second copy of the map's own sizing, so it
 *  reads the same regardless of how big or small the map itself is drawn at. */
const LEGEND_MAX_RADIUS_PX = 22;
/** The per-point hit target's FLOOR, in real CSS pixels — not its size. The target is an HTML
 *  `<button>` overlay whose own extent is derived from the mark it sits on: `max(this floor, the
 *  circle's own drawn diameter)`, the diameter expressed as the same fraction of the frame the
 *  circle itself is drawn at, so the two scale together at every container width. The floor is what
 *  a frame-unit target alone could not give — at 375px a small mark is a few physical pixels across
 *  and unhittable (`references/map-web-discipline.md`, "Touch and hover share one target").
 *
 *  It used to be the SIZE, and being only that was the defect: measured in Chrome at 1400x900 the
 *  drawn circles are 49-53px across and the target was 28x28 on the same centre, so a probe four
 *  pixels inside a circle's own right edge got no answer and the tooltip only fired on a small
 *  inner disc. The owner reported exactly that, on the symbol map and on the dot map. */
const HIT_TARGET_PX = 28;
/* THE BOUNDED ZOOM STEP IS GONE. `ZOOM_SCALE = 1.4` scaled a raster plate inside a scrollable box
   and put an out-of-map checkbox above the beat reading "Zoom in (1.4×, bounded) — arrow keys or
   scroll to pan". Ruling R1 (2026-08-10) replaced it with MapTiler's own zoom and pan, constrained
   to the subject's area (`assets/live-map.mjs`), and B6.14b asked for exactly that removal. The
   plate is still baked and still shipped — as the FALLBACK layer, not as the display surface. */
// =======================================================

/** One point's own detail string, the single implementation the hit-target's `aria-label`/
 *  `data-detail`/`title` AND the accessible table both draw from — never a second formatting of
 *  the same number. */
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
}: {
  geometry: {
    frame: { width: number; height: number };
    /** The band a label has to stay inside — see `labelSafeFrame`. Optional: a plate baked before
     *  2026-08-23 has none, and the frame is then the box it was drawn against. */
    labelFrame?: { width: number; height: number; safeWidth?: number; safeHeight?: number };
    /** Where the camera's own bounds landed inside the plate — the unit every mark size and gap on
     *  this page is a fraction of. Optional for a plate baked before 2026-08-23. */
    studySet?: { x: number; y: number; width: number; height: number };
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
}) {
  const { frame, points } = geometry;
  // THE UNIT EVERY MARK AND GAP IS A FRACTION OF, and it is the STUDY SET's width, not the frame's.
  // These fractions were calibrated when the plate's frame WAS the study set — `fitBounds` with no
  // padding, so the geography filled the picture. Since 2026-08-23 the plate carries real basemap
  // around the study set so the delivered box can be filled by cover (`delivery-frame.mjs`), and a
  // radius written as a fraction of the FRAME then grows with the ocean: measured on this skill's
  // own seed, the study set went from 878 of 1000 plate px to 328, so a `frame.width * 0.062`
  // maximum radius went from 7.1% of the drawn geography to 18.9% of it, and Paris's own hit target
  // covered London. A mark is a fraction of the SUBJECT, and the subject is the study set.
  // An older plate with no `studySet` falls back to the frame, which is what it was calibrated on.
  const markUnit = geometry.studySet?.width ?? frame.width;

  // THE BOX A LABEL IS FLIPPED AGAINST IS THE PICTURE'S EDGE, NOT THE PLATE'S. Under the 2026-08-23
  // rule the delivered box takes the whole container and the plate is drawn to COVER it, so the
  // reader sees a BAND of the plate and a run that clears the plate's own edge by 300px of ocean can
  // still be cut. `labelFrame` is the intersection of every band this beat is delivered into
  // (`delivery-frame.mjs`, `labelSafeFrame`), recorded by the bake; the flip margin scales with the
  // SAFE width for the same reason it used to scale with the frame's. An older plate with no
  // `labelFrame` falls back to the frame, which is what it was drawn against.
  const labelFrame = geometry.labelFrame ?? frame;
  const flipMargin = (labelFrame.safeWidth ?? labelFrame.width) * 0.18;

  if (points.length < 2)
    throw new Error(
      `a symbol map needs at least two points, got ${points.length}`,
    );

  const subject = points.find((p) => p.key === SUBJECT_KEY);
  if (!subject) throw new Error(`no point for the subject ${SUBJECT_KEY}`);

  const maxValue = Math.max(...points.map((p) => p.value));
  const maxRadius = markUnit * MARK_MAX_RADIUS_FRACTION;
  const radiusOf = radiusScale(maxValue, maxRadius);
  const legendRadiusOf = radiusScale(maxValue, LEGEND_MAX_RADIUS_PX);
  const drawn = drawOrder(points); // largest first, so smaller circles paint on top
  const groups = groupsOf(points);
  const legend = niceReferenceValues(maxValue);

  const CAVEAT_TEXT = caveat || CAVEAT;

  return (
    <div className="map-web">
      <p className="mw-title">{title}</p>
      <p className="mw-source">{`${source} · ${basemapCredit}`}</p>

      {/* The filter, drawn as a row of chips rather than bare radios. Every input below is a REAL
          radio in a REAL `<fieldset>` — it is only moved out of sight by CSS (`render-web.mjs`'s
          `.mw-chip input` rule), never replaced by a div pretending to be one: Tab still reaches
          the group, Arrow keys still move within it, clicking the chip still activates the input
          through the native `<label>` association, and with JavaScript off the whole thing still
          works because nothing here is script-driven (`:has()` + `:checked` do the hiding). The
          chip order is the reading order: "All regions" first, because that is the state the beat
          renders in and the one that carries the whole claim. */}
      {groups.length > 1 && (
        <fieldset className="mw-filter">
          <legend>Filter by region</legend>
          <div className="mw-filter-options">
            <label className="mw-chip">
              <input
                type="radio"
                name="mw-filter"
                id="mw-filter-all"
                defaultChecked
              />
              <span>All regions</span>
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

      {/* The stage: the one box that gets whatever vertical room the window has left once every
          piece of furniture above and below has taken its own (`render-web.mjs`'s `buildCss`,
          `.mw-stage`). The viewport inside it keeps the bake's own aspect EXACTLY — it is bounded
          by the stage's height as well as its width, so a wide, short window shrinks the map and
          centres it rather than pushing it past the fold, and a stretched plate (a lie about
          distance and shape) is never one of the outcomes. */}
      <div className="mw-stage">
        {/* NO INLINE SHAPE HERE. The viewport's width AND its height are the FORMAT's, emitted by
            `render-web.mjs`'s own `buildCss` from this same plate's frame. This element used to
            carry an inline `aspect-ratio`, which meant the height travelled in the file a beat is
            told to replace: a beat that wrote its own component and did not copy that one style got
            a box with no height at all (round six, `stress-ab-emigration-flows`: a 451x2 px map). */}
        <div className="mw-viewport">
          {/* LAYER 2 — the live MapTiler map (R1). Empty and hidden until `live-map.mjs` gets a
              `map.on("load")`; a style failure, a dead key, no network or no JavaScript at all
              leaves layer 1 below exactly where it is. Its own container, not a wrapper around the
              fallback, so the swap is one `hidden` flip and never a half-drawn state. */}
          <div id="mw-map" className="mw-live-map" />
          {/* LAYER 1 — the baked plate, complete and script-free: what a reader gets with
              JavaScript off, offline, or after the account's keys are invalidated at 100% of its
              spending limit. `map-web-discipline.md`'s rule survives verbatim here — the unzoomed
              state is not a preview of the real view, it IS the full claim. */}
          <div id="mw-fallback" className="mw-fallback">
            {/* Geometry only: the baked plate and the decorative, value-sized circles. No text — see
                this file's own header note. `role="group"`, not `role="img"`: an `img` role would
                flatten the (decorative-only, now) children into one opaque image, which is harmless
                here since nothing inside is focusable any more, but `group` keeps the door open
                without asserting a stronger claim than "here is a cluster of shapes" — the meaningful
                description is `aria-label` below, and the real interaction lives in the HTML
                overlay, not in this SVG. */}
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
                {/* The baked plate, inlined as a `data:` URI, is the heaviest single asset
                    this format produces and what makes the delivered page an order of
                    magnitude heavier than a chart-web one. `weightAgainstCeiling`
                    (`scripts/detect-weight-has-a-ceiling.mjs`) is the capability
                    `doctrine/references/guard-catalogue.json` names `weight-has-a-ceiling`,
                    measured against this format's own 4 delivered pages. */}
                <image
                  href={plate}
                  x={0}
                  y={0}
                  width={frame.width}
                  height={frame.height}
                />
                {drawn.map((point) => {
                  const isSubject = point.key === SUBJECT_KEY;
                  const r = radiusOf(point.value);
                  const fill = isSubject ? accent : muted;
                  return (
                    <circle
                      key={point.key}
                      cx={point.px}
                      cy={point.py}
                      r={r}
                      fill={fill}
                      fillOpacity={isSubject ? 0.55 : 0.38}
                      stroke={fill}
                      strokeWidth={Math.max(1, markUnit * 0.0016)}
                      // The filter (render-web.mjs's own CSS, `:has()`) has to reach this decorative
                      // mark too, or a narrowed view still leaves every OTHER region's circle sitting
                      // on the map unlabelled — ambiguous ghosts, not a genuinely narrower map. The
                      // SLUG, not the raw name: this value is quoted inside a generated CSS selector.
                      data-group={groupAttrOf(point, groups)}
                      // The hit target below reads its own extent off this circle, and the guard
                      // that probes the target's edges pairs the two by this key.
                      data-key={point.key}
                    />
                  );
                })}
              </g>
            </svg>
          </div>

          {/* LAYER 3 — the overlay: the point labels and the per-point hit targets. A SIBLING of
              the two map layers, never a child of either, because it belongs to BOTH: it is the
              only keyboard path to the data and the only place the point names are written. Its
              first draft lived inside the fallback, and hiding the fallback on `map.on("load")`
              took every label and every Tab stop with it — visible only by looking at the live
              page, invisible to every assertion, and a total loss of keyboard reach on the exact
              path the ruling was supposed to improve. Positioned in PERCENTAGES here, which is what
              the fallback needs; `live-map.mjs` repositions the same nodes with `map.project()` on
              every camera move, which is what the live map needs. */}
          <div className="mw-overlay">
            {/* Point-name labels: HTML, positioned by PERCENTAGE of the frame (so they track the
                geometry as the container resizes) with a font-size fixed in CSS (so the text itself
                never grows or shrinks). The offset from the circle's own edge is ALSO a percentage
                of the frame, not a fixed pixel gap — so the gap scales together with the circle it is
                labelling, the same way the circle itself scales with the container, while only the
                GLYPHS stay a constant size. A small opaque "chip" (`background: var(--ground)` in
                CSS) stands in for the old SVG halo-stroke trick, keeping the label legible over
                whatever the plate paints underneath it. */}
            {drawn.map((point) => {
              const isSubject = point.key === SUBJECT_KEY;
              const r = radiusOf(point.value);
              // `labelPlacement`'s own `margin` default (90) is an ABSOLUTE frame-unit number tuned
              // for the OLD 496px bake — at this format's now much bigger PLATE_SIZE (1000) that same
              // default is barely 9% of the frame, not nearly enough room for a right-anchored label
              // like "Athens" to avoid spilling past the container's own right edge at the NARROWEST
              // width this format ships (375px, where every frame-unit percent is only a few real CSS
              // pixels). Passed explicitly, AS a fraction of the actual frame (`0.18`, the exact
              // fraction — 90/496 — the old fixed bake used to get "for free"), so the flip threshold
              // scales with whatever `PLATE_SIZE` a future bake picks instead of silently shrinking as
              // a fraction the way the hardcoded default just did. Render-verified against this seed's
              // own thirteen points at 375px: enough to flip Athens before it clips, not so much that
              // it over-flips Warsaw into colliding with Berlin's own label.
              const { side, dy } = labelPlacement(
                point.px,
                point.py,
                labelFrame,
                flipMargin,
              );
              const gap = r + markUnit * 0.014;
              const xPct = (point.px / frame.width) * 100;
              const yPct = (point.py / frame.height) * 100;
              const gapPct = (gap / frame.width) * 100;
              const dyPct = (dy / frame.height) * 100;
              const style: Record<string, string> = {
                top: `${yPct + dyPct}%`,
                transform: "translateY(-50%)",
              };
              if (side === "right") {
                style.left = `${xPct + gapPct}%`;
                style.textAlign = "left";
              } else {
                style.right = `${100 - (xPct - gapPct)}%`;
                style.textAlign = "right";
              }
              return (
                <span
                  key={point.key}
                  className={`point-label${isSubject ? " subject" : ""}`}
                  data-key={point.key}
                  // The side it flipped to and the gap it keeps from its own circle, in CSS pixels
                  // at the bake's own frame size. `live-map.mjs` repositions this node with
                  // `map.project()` and needs the SAME two numbers `labelPlacement` computed here —
                  // without them the live label sits ON its circle instead of beside it, which is
                  // how the first live render drew "Paris" across the Paris disc.
                  data-side={side}
                  data-gap={gap}
                  data-dy={dy}
                  data-group={groupAttrOf(point, groups)}
                  style={style}
                >
                  {point.name}
                </span>
              );
            })}

            {/* The interaction layer: one HTML `<button>` per point, positioned by percentage,
                sized in FIXED CSS pixels (`HIT_TARGET_PX`) — a legitimate touch/pointer target at
                every container width this format ships, which an SVG-scaled hit circle is not (it
                would be a few physical pixels across at 375px). `title` gives a native, no-JS
                tooltip on hover — the HTML equivalent of the SVG `<title>` this format used to nest;
                `aria-label`/`data-detail` are baked in at build time, not assembled by the inline
                script, so the no-JS page is still keyboard-reachable and its value is still
                announced with the script absent entirely. `assets/interaction.mjs` (unchanged by a
                new beat) wires hover, tap and keyboard once `scripts/render-web.mjs` inlines this
                markup. This is the capability `doctrine/references/guard-catalogue.json` names
                `reachable-by-keyboard` (`scripts/detect-reachable-by-keyboard.mjs`'s
                `keyboardReachesEveryMark`) — carried here since a `<button>` is natively focusable
                and needs no `tabIndex`, measured against every delivered beat rather than assumed
                from this comment. The same "baked in at build time, not assembled by the inline
                script" fact is also `degrades-without-javascript`
                (`scripts/detect-degrades-without-javascript.mjs`'s `staticFrameSurvives`): the
                population of `data-detail` marks a no-JS reader gets is the same population
                scripting would have wired for interaction. */}
            {drawn.map((point) => {
              const detail = pointDetail(point);
              const xPct = (point.px / frame.width) * 100;
              const yPct = (point.py / frame.height) * 100;
              // The target is the MARK, with a floor. Its diameter is the circle's own drawn
              // diameter written as the same fraction of the frame the circle is drawn at, so the
              // two scale together however wide the container is; `max()` keeps HIT_TARGET_PX as
              // the floor for a mark too small to hit. Never a second radius constant.
              const markRadius = radiusOf(point.value);
              const hitDiameter = markRadius * 2;
              const wPct = (hitDiameter / frame.width) * 100;
              return (
                <button
                  key={point.key}
                  type="button"
                  className="pt"
                  style={{
                    left: `${xPct}%`,
                    top: `${yPct}%`,
                    // ONE dimension. The height comes from `.pt { aspect-ratio: 1 }`, never from a
                    // second percentage: a percentage height resolves against the CONTAINER's
                    // height while a percentage width resolves against its width, so the same
                    // fraction is two different numbers as soon as the overlay stops being the
                    // plate's own square — which is what the live swap did (B6.20: 194 x 72 px of
                    // painted halo behind a circle a fraction of that size).
                    width: `max(${HIT_TARGET_PX}px, ${wPct}%)`,
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
                  data-group={groupAttrOf(point, groups)}
                />
              );
            })}
          </div>
        </div>
      </div>

      {/* The legend: entirely HTML, fixed-CSS-pixel swatches (`LEGEND_MAX_RADIUS_PX`) — a
          schematic reference scale that reads the same size regardless of how big the map itself
          is drawn, closing `geo-discipline.md`'s own open problem (a legend box sized for the
          widest circle, not the longest unit word) the same way the prior two-layout version did:
          a short per-mark unit ("M"), the full word spent once in the caption above. */}
      <div className="mw-legend">
        <p className="mw-legend-caption">{legendCaption}</p>
        <div className="mw-legend-marks">
          {[...legend].reverse().map((v) => {
            const d = legendRadiusOf(v) * 2;
            return (
              <div key={v} className="mw-legend-item">
                <span
                  className="mw-legend-swatch"
                  style={{ width: `${d}px`, height: `${d}px` }}
                />
                <span className="mw-legend-value">{`${fr(v)} ${UNIT}`}</span>
              </div>
            );
          })}
        </div>
      </div>

      <p className="mw-subject">{`${subject.name} — ${SUBJECT_NOTE}`}</p>
      <p className="mw-caveat">{CAVEAT_TEXT}</p>
    </div>
  );
}

/**
 * The accessibility answer this format offers, now OPT-IN per beat
 * (`references/map-web-discipline.md`, "The accessibility question"): the SAME thirteen readings
 * the map draws spatially, again, as one plain HTML table — captioned, ordered largest first, and
 * when a beat asks for it, rendered plainly and visibly (never behind a disclosure widget, never
 * screen-reader-only CSS), so a reader with no spatial access to the map has a complete, linear,
 * exact account of everything the map claims. Rendered by `scripts/render-web.mjs` ONLY when that
 * beat passes `regionTable: true` — this seed does not, and the discipline file names exactly what
 * that costs. As plain semantic HTML rather than SVG text, because a `<table>` with real `<th>`
 * cells is what a screen reader's own table navigation understands.
 *
 * Every row also carries `data-group` (the slug, the same string the map's own marks carry) — the
 * SAME filter that narrows the map's own points narrows this table too (`render-web.mjs`'s CSS, one
 * `:has()` rule per group, reaches both). This is not an inconsistency with "the table, when
 * present, renders complete": with the default "All regions" radio checked, every row is present. A
 * reader who narrows the filter gets the SAME narrower reading on both channels, never a map that
 * agrees with itself but disagrees with the table — the "two channels, not one" rule in
 * `map-web-discipline.md` applied to filtering as much as to hover.
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
  // The table's own reading of the SAME dimension the map reads. One group (or none) is no
  // dimension, so the rows carry no attribute — a row tagged for a filter nobody can operate is
  // the dead half of the machinery this format shipped before.
  const groups = groupsOf(points);
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
            data-group={groupAttrOf(point, groups)}
            className={point.key === SUBJECT_KEY ? "subject" : undefined}
          >
            <th scope="row">{point.name}</th>
            <td>{`${fr(point.value)} ${UNIT_WORD}`}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
