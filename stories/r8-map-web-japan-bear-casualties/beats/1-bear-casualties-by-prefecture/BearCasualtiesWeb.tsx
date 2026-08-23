/**
 * Bear casualties in Japan, fiscal 2025 — the web format of this story's one map beat.
 *
 * Written from `skills/map-web/assets/MapWebSeed.tsx`, which is marked REPLACE ME. Everything the
 * format owns — the three layers, the percentage-positioned HTML overlay, the fixed-pixel hit
 * targets, the CSS-only filter, the accessible table — is kept as the format wrote it. What is this
 * beat's own is below the CONFIG marker and in four places where this data needs something the
 * seed's thirteen tidy metro areas never did:
 *
 *   1. NOT EVERY POINT IS LABELLED. The seed labels all thirteen of its points because thirteen
 *      labels fit. This beat has 39, seventeen of which are zero, and Tohoku's six sit in a vertical
 *      strip about a fifth of the frame wide. `LABEL_FLOOR` names the value a label is worth; every
 *      other prefecture's exact number is on hover, on keyboard focus, in its `title` with
 *      JavaScript off, and in the table. Nothing the title claims is behind an interaction: the
 *      title's claim is Tohoku's concentration and all six Tohoku prefectures are above the floor.
 *   2. A ZERO DRAWS NOTHING, AND THAT IS THE HONEST MARK. `radiusScale` gives a zero-valued point
 *      a radius of zero, and this beat does not floor it: a visible disc over Osaka would say
 *      "some", and some is not what the ministry reported. The seventeen reported zeros keep their
 *      hit target, their keyboard stop and their table row, which the format guarantees and which
 *      `marksStrandedWithNoChannel` refuses a page for dropping.
 *   3. THE EIGHT PREFECTURES THAT ARE NOT ZERO ARE NOT HERE AT ALL. Fukuoka, Saga, Nagasaki,
 *      Kumamoto, Oita, Miyazaki, Kagoshima and Okinawa never appear in the ministry's table.
 *      `prepare-inputs.mjs` declares them and drops them; they get no mark, no row and no zero, and
 *      the caveat names all eight. This is the rule lifted from the reference loop: the part that
 *      cannot be placed is excluded from the marks and declared, never folded into a residual.
 *   4. THE SUBJECT NOTE CARRIES THE DENOMINATOR THE TABLE DOES NOT HAVE. The ministry publishes no
 *      population column, so nothing here is a rate, and the subject note says what the number is
 *      (a count of people) rather than letting a reader infer a risk.
 */

import {
  drawOrder,
  labelPlacement,
  radiusScale,
  readingOrder,
  groupsOf,
  groupAttrOf,
  slugOf,
  type ProjectedPoint,
} from "./geo-symbol.ts";
import { decollide } from "./decollide.mjs";

// ===== CONFIG — edit for your story =====
const UNIT = "";
const UNIT_WORD = "people hurt";
const CAVEAT =
  "Preliminary figures (速報値); the ministry says they may still change. Casualties include the " +
  "13 deaths and the two must not be added. Seventeen prefectures reported zero and draw no " +
  "circle. Eight — Fukuoka, Saga, Nagasaki, Kumamoto, Oita, Miyazaki, Kagoshima and Okinawa — are " +
  "absent from the ministry's table entirely and are not drawn: absent is not zero. No population " +
  "figure is published beside these counts, so nothing here is a rate.";
const SUBJECT_KEY = "jp-05";
const SUBJECT_NOTE =
  "67 of the 238 people hurt by bears in Japan in fiscal 2025 — more than any other prefecture, " +
  "and 37 of them in October alone";
/** The value a printed label is worth on this frame. Below it a prefecture's number is on hover,
 *  on keyboard focus, in its own `title` with JavaScript off, and in the table — never nowhere.
 *  Set at 5 rather than higher so that all six Tohoku prefectures, which are what the title claims,
 *  are labelled on the unfiltered map without a reader having to ask for any of them. */
const LABEL_FLOOR = 5;

/** THIS BEAT'S OWN NUMBER FORMAT, and it is here because the format's own is wrong for it twice.
 *  `fr` in `geo-symbol.ts` is `Intl.NumberFormat("fr-FR", { minimumFractionDigits: 1 })` — a hard
 *  locale and a mandatory decimal — and it is the single formatter behind the legend, the tooltip,
 *  the aria-label, the no-JS `title` and every cell of the accessible table. This story records
 *  `language: en` and the page it renders declares `<html lang="en">`; its numbers are counts of
 *  people. Through `fr`, Akita reads "67,0 people hurt" on a page in English, and a screen reader
 *  says "sixty-seven comma zero". A count has no tenths and this page has no French. */
const count = (value: number): string => new Intl.NumberFormat("en-GB").format(Math.round(value));

/** The legend's own reference sizes. `niceReferenceValues` divides the maximum into equal parts and
 *  rounds to a tenth — right for "11.0 M inhabitants", wrong for 67 people, where it produced
 *  67,0 / 44,7 / 22,3. These are whole people, chosen from the beat's own maximum. */
function referenceCounts(maxValue: number, wanted = 3): number[] {
  const step = Math.max(1, Math.round(maxValue / wanted / 5) * 5);
  const values: number[] = [];
  for (let i = wanted; i >= 1; i--) values.push(Math.min(Math.round(maxValue), i * step));
  return [...new Set(values)].sort((a, b) => b - a);
}

/** The vertical air one label needs from the next, in the bake's own frame units. The labels are
 *  sized in FIXED CSS pixels while they are POSITIONED as a percentage of the frame, so this is
 *  exact at one container size and approximate everywhere else — chosen against the widest layout
 *  this beat is verified at (1600x900) and stated rather than hidden. */
const LABEL_MIN_GAP_FRACTION = 0.030;
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
  // One person is not "1 people hurt". The singular is spelled here rather than in three places.
  const noun = point.value === 1 ? "person hurt" : UNIT_WORD;
  return `${point.name} : ${count(point.value)} ${noun}`;
}

export function BearCasualtiesWeb({
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
  if (points.length < 2)
    throw new Error(
      `a symbol map needs at least two points, got ${points.length}`,
    );

  const subject = points.find((p) => p.key === SUBJECT_KEY);
  if (!subject) throw new Error(`no point for the subject ${SUBJECT_KEY}`);

  const maxValue = Math.max(...points.map((p) => p.value));
  const maxRadius = frame.width * MARK_MAX_RADIUS_FRACTION;
  const radiusOf = radiusScale(maxValue, maxRadius);
  const legendRadiusOf = radiusScale(maxValue, LEGEND_MAX_RADIUS_PX);
  const drawn = drawOrder(points); // largest first, so smaller circles paint on top
  const groups = groupsOf(points);
  const legend = referenceCounts(maxValue);

  // THE LABELS ARE DE-COLLIDED, and `decollide` is the format's OWN module doing it.
  // `skills/map-web/scripts/decollide.mjs` ships with this format and is called by nothing in it —
  // not the seed component, not the renderer, not its SKILL.md (measured 2026-08-23: zero
  // references outside the module and its own detectors). The seed's thirteen European metro areas
  // never needed it. Tohoku's six prefectures sit in a strip about a fifth of this frame wide, and
  // the first render of this beat put "Iwate" through "Akita", "Miyagi" through "Yamagata" and
  // clipped "Fukushima" to "ukushima".
  //
  // Each SIDE is its own stack, because a left-anchored label and a right-anchored one at the same
  // height do not touch. `moved` is kept per point so a displaced label can be drawn with a leader
  // back to the mark it belongs to — a label that has been moved and does not say so is a label
  // pointing at the wrong prefecture.
  const labelled = drawn.filter((point) => point.value >= LABEL_FLOOR);
  const placements = new Map<string, { side: "left" | "right"; dy: number; y: number; moved: boolean }>();
  for (const side of ["left", "right"] as const) {
    const stack = labelled
      .map((point) => ({ point, ...labelPlacement(point.px, point.py, frame, frame.width * 0.18) }))
      .filter((one) => one.side === side);
    if (stack.length === 0) continue;
    const laid = decollide(
      stack.map((one) => one.point.py + one.dy),
      {
        minGap: frame.height * LABEL_MIN_GAP_FRACTION,
        top: frame.height * 0.02,
        bottom: frame.height * 0.98,
      },
    );
    // `decollide` hands back a ROW per label — `{ anchor, y, moved }` — not a bare number, and it
    // reports `moved` itself rather than leaving a caller to re-derive it with an epsilon.
    stack.forEach((one, at) => {
      const row = laid[at] as { y: number; moved: boolean };
      placements.set(one.point.key, { side, dy: one.dy, y: row.y, moved: row.moved });
    });
  }

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
                      strokeWidth={Math.max(1, frame.width * 0.0016)}
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
                {/* THE LEADERS. Drawn only for a label `decollide` had to move, from the mark's own
                    edge to the height the label ended up at. Without them a moved label is a label
                    naming the wrong circle, which is worse than two labels overlapping. */}
                {drawn
                  .filter((point) => placements.get(point.key)?.moved)
                  .map((point) => {
                    const placed = placements.get(point.key)!;
                    const r = radiusOf(point.value);
                    const gap = r + frame.width * 0.014;
                    const x2 = placed.side === "right" ? point.px + gap : point.px - gap;
                    return (
                      <line
                        key={`leader-${point.key}`}
                        x1={placed.side === "right" ? point.px + r : point.px - r}
                        y1={point.py}
                        x2={x2}
                        y2={placed.y}
                        stroke={muted}
                        strokeWidth={Math.max(1, frame.width * 0.0012)}
                        data-group={groupAttrOf(point, groups)}
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
            {drawn
              .filter((point) => point.value >= LABEL_FLOOR)
              .map((point) => {
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
              // Read back from the de-collided stacks above rather than computed here, so the
              // label's own `top` and the leader drawn to it are one number seen once.
              const placed = placements.get(point.key)!;
              const { side, dy } = placed;
              const gap = r + frame.width * 0.014;
              const xPct = (point.px / frame.width) * 100;
              const gapPct = (gap / frame.width) * 100;
              const style: Record<string, string> = {
                top: `${(placed.y / frame.height) * 100}%`,
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
                <span className="mw-legend-value">{UNIT ? `${count(v)} ${UNIT}` : count(v)}</span>
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
      <caption>{`Every reading behind the map above — people hurt by bears in each prefecture the ministry lists, fiscal 2025, largest first. Eight prefectures are absent from the ministry\u2019s table and from this list.`}</caption>
      <thead>
        <tr>
          <th scope="col">Prefecture</th>
          <th scope="col">People hurt</th>
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
            <td>{count(point.value)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
