/**
 * REPLACE ME. Do not parameterise me.
 *
 * The web genre's seed: a proportional-symbol map, interactive. It draws a real claim — this
 * sample of thirteen European metro areas, sized by population, with Paris the largest — using the
 * same baked-plate approach `twin-map-beat` ships for static and video (`geo-discipline.md` rules
 * 1-4, 6): the camera is spent ONCE by `scripts/bake-plate.mjs`, and this component draws an
 * `<image>` and some `<circle>`s, never a live map. What THIS genre adds on top of that is the
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
 * Two capabilities layered on top of that split, both governed by the same rule this genre has
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
 *   - An optional bounded ZOOM (`zoomable` prop, off for this seed's own data — see `SKILL.md`'s
 *     "When to use" for the test). Off, the frame shows exactly the full claim. On, a checkbox lets
 *     a reader scale the plate up by a fixed, capped factor (`ZOOM_SCALE`) inside a viewport that
 *     becomes natively scrollable — no unbounded zoom into raster blur, and no JavaScript: `:has()`
 *     drives both the filter and the zoom toggle directly off `:checked` state, so every one of
 *     these controls, and the map/legend/table they narrow, is exactly as complete with the page's
 *     own inline `<script>` never running as with it running. What the script (`interaction.mjs`)
 *     still adds on top is the exact hover/focus VALUE — the legend's own three rounded reference
 *     sizes can only approximate it, and the `title` attribute's native no-JS tooltip only shows it
 *     one point at a time, slowly.
 */

import {
  drawOrder,
  labelPlacement,
  niceReferenceValues,
  radiusScale,
  readingOrder,
  groupsOf,
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

// ===== Genre mechanics — not one story's numbers =====
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
/** The per-point hit target's own diameter, in real CSS pixels — an HTML `<button>` overlay, NOT
 *  an SVG shape sized in frame units. A frame-unit hit target would shrink to a few physical pixels
 *  at 375px wide and balloon at 1600px; a fixed CSS size is a legitimate touch target at every
 *  width this genre ships (`references/map-web-discipline.md`, "Full width, genuinely"). */
const HIT_TARGET_PX = 28;
/** The one bounded zoom step this genre ships when a beat opts in — a reader cannot zoom further
 *  than this, so the plate never degrades into unreadable blur (`references/map-web-discipline.md`,
 *  "Pan and zoom"). */
export const ZOOM_SCALE = 1.4;
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
  zoomable = false,
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
  /** Off by default — see `SKILL.md`'s "When to use" for the test this seed's own data fails
   *  (spread across a continent, legible and reachable at every width without it). Exercised with
   *  `true` by a dedicated fixture in `test/render-web.test.ts` so the mechanism itself is proven
   *  even though the shipped seed does not turn it on. */
  zoomable?: boolean;
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

      {zoomable && (
        <label className="mw-zoom-toggle-label" htmlFor="mw-zoom-toggle">
          <input
            type="checkbox"
            id="mw-zoom-toggle"
            className="mw-zoom-toggle"
          />
          {` Zoom in (${ZOOM_SCALE}×, bounded) — arrow keys or scroll to pan`}
        </label>
      )}

      {/* The stage: the one box that gets whatever vertical room the window has left once every
          piece of furniture above and below has taken its own (`render-web.mjs`'s `buildCss`,
          `.mw-stage`). The viewport inside it keeps the bake's own aspect EXACTLY — it is bounded
          by the stage's height as well as its width, so a wide, short window shrinks the map and
          centres it rather than pushing it past the fold, and a stretched plate (a lie about
          distance and shape) is never one of the outcomes. */}
      <div className="mw-stage">
        <div
          className="mw-viewport"
          style={{ aspectRatio: `${frame.width} / ${frame.height}` }}
          {...(zoomable
            ? {
                tabIndex: 0,
                "aria-label":
                  "Pannable map area — arrow keys or scroll to pan when zoomed in.",
              }
            : {})}
        >
          <div className="mw-zoomable">
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
                      data-group={slugOf(point.group)}
                    />
                  );
                })}
              </g>
            </svg>

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
              // for the OLD 496px bake — at this genre's now much bigger PLATE_SIZE (1000) that same
              // default is barely 9% of the frame, not nearly enough room for a right-anchored label
              // like "Athens" to avoid spilling past the container's own right edge at the NARROWEST
              // width this genre ships (375px, where every frame-unit percent is only a few real CSS
              // pixels). Passed explicitly, AS a fraction of the actual frame (`0.18`, the exact
              // fraction — 90/496 — the old fixed bake used to get "for free"), so the flip threshold
              // scales with whatever `PLATE_SIZE` a future bake picks instead of silently shrinking as
              // a fraction the way the hardcoded default just did. Render-verified against this seed's
              // own thirteen points at 375px: enough to flip Athens before it clips, not so much that
              // it over-flips Warsaw into colliding with Berlin's own label.
              const { side, dy } = labelPlacement(
                point.px,
                point.py,
                frame,
                frame.width * 0.18,
              );
              const gap = r + frame.width * 0.014;
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
                  data-group={slugOf(point.group)}
                  style={style}
                >
                  {point.name}
                </span>
              );
            })}

            {/* The interaction layer: one HTML `<button>` per point, positioned by percentage,
                sized in FIXED CSS pixels (`HIT_TARGET_PX`) — a legitimate touch/pointer target at
                every container width this genre ships, which an SVG-scaled hit circle is not (it
                would be a few physical pixels across at 375px). `title` gives a native, no-JS
                tooltip on hover — the HTML equivalent of the SVG `<title>` this genre used to nest;
                `aria-label`/`data-detail` are baked in at build time, not assembled by the inline
                script, so the no-JS page is still keyboard-reachable and its value is still
                announced with the script absent entirely. `assets/interaction.mjs` (unchanged by a
                new beat) wires hover, tap and keyboard once `scripts/render-web.mjs` inlines this
                markup. */}
            {drawn.map((point) => {
              const detail = pointDetail(point);
              const xPct = (point.px / frame.width) * 100;
              const yPct = (point.py / frame.height) * 100;
              return (
                <button
                  key={point.key}
                  type="button"
                  className="pt"
                  style={{ left: `${xPct}%`, top: `${yPct}%` }}
                  aria-label={detail}
                  title={detail}
                  data-key={point.key}
                  data-detail={detail}
                  data-group={slugOf(point.group)}
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
 * The accessibility answer this genre offers, now OPT-IN per beat
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
            data-group={slugOf(point.group)}
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
