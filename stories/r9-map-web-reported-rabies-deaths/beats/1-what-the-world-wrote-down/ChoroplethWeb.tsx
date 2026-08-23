/**
 * REPLACE ME. Do not parameterise me.
 *
 * The first WEB-format choropleth this project has built (`map-web/SKILL.md`'s own gap: "a map
 * beat could ship static or video, never a genuinely interactive one" — for the SYMBOL case; this
 * beat closes the CHOROPLETH cell of that same matrix). It draws a real claim: of the 41 European
 * countries this beat declares, the Faroe Islands' 2023 per-capita CO₂ emissions are the highest —
 * more than eight times Albania's, the lowest.
 *
 * TWO THINGS CHANGED HERE ON 2026-08-10, AND THEY ARE ONE CHANGE.
 *
 * 1. RULING R1 — *"une carte web qu'on ne peut pas parcourir est une image"*. The map is a LIVE
 *    MapTiler map with its own zoom and pan, leashed to the study area. The baked plate
 *    (`bake-plate.mjs`, `geo-discipline.md` rules 1-4, 6, 7, 9, 12) is still spent once and still
 *    shipped — as the FALLBACK layer, not as the display surface. So this component draws THREE
 *    layers in one box, exactly as `map-web/assets/MapWebSeed.tsx` does:
 *      - `#mw-map`, empty, FIRST — `live-map.mjs` (a byte-identical copy of the format's own boot
 *        script, in this folder) fills it and swaps it in on `map.on("load")`;
 *      - `#mw-fallback`, the SSR'd plate `<image>` and the 41 `<path>`s — what a reader gets with
 *        JavaScript off, offline, or on the day a key is rotated;
 *      - `.mw-overlay`, a SIBLING of both, carrying every hit target. It is a sibling because
 *        hiding the fallback would otherwise take every Tab stop with it — the defect
 *        `MapWebSeed.tsx`'s own header records, and the one `map-web-discipline.md`'s "Pan and
 *        zoom" states was found by looking at the live page rather than by any assertion.
 *
 * 2. B5.1 — THE PAGE FITS THE WINDOW. This beat used to SSR two whole frames, one per `WebLayout`,
 *    with every piece of furniture drawn as SVG `<text>` inside them and a media query choosing
 *    which was on screen. Measured at 1600×900 before this change: 1705px of page in a 900px
 *    window, and the widest visual using 54% of the width. That structure is gone. There is now ONE
 *    fluid SVG carrying GEOMETRY ONLY (the plate and the region paths) plus an HTML overlay and
 *    HTML furniture — the split `map-web-discipline.md` calls "Full width, genuinely": the SVG
 *    scales with its container, every glyph is a fixed CSS pixel size, and `render-web.mjs`'s own
 *    `buildCss` gives the map whatever height the window has left after the furniture.
 *
 * What this format adds on top of the static/video choropleth (`map-beat/assets/Co2MapStill.tsx`,
 * `Co2MapVideo.tsx`) is every region's own EXACT value on demand, without spending the frame's fixed
 * room printing all 41 — and, because a map is a spatial medium and not every reader has spatial
 * access to it, the SAME 41 values again as an ordered, linear, always-rendered table (`RegionTable`
 * below), so nothing this beat claims lives ONLY in a hover
 * (`references/map-web-discipline.md`, "The accessibility question").
 *
 * WHERE THE POINTER LANDS, in each of the two states this page can be in:
 *   - LIVE: the canvas is the target. `live-map.mjs` hit-tests the rendered FILL, so a reader gets a
 *     region's value on ENTERING the region, anywhere inside it — B6.14a, closed by construction
 *     rather than by tuning. The overlay's buttons keep their Tab stop and their `aria-label`; the
 *     format's own CSS drops their pointer-events (`html.mw-live .mw-overlay .pt`).
 *   - FALLBACK: the region's own filled `<path>` is the target, forwarded to that region's button by
 *     `interaction.mjs` — one reading, never a second competing target. Six regions are too small
 *     to land a pointer on at this camera (`needsPointerTarget` below); those, and only those, keep
 *     a pointer-active 28px button of their own.
 *
 * `geo-discipline.md` rule 8: the ramp is the one legitimate gradient here, carrying the quantity,
 * so it cannot also carry the accent — the SUBJECT (Faroe Islands) gets an outline in the accent,
 * and nothing else does. The comparison (Albania) is marked too — the claim names it by name — but
 * in INK, not a second accent, the same choice `Co2MapStill.tsx` makes ("the comparison in ink,
 * because it is not the subject").
 */

import { Fragment } from "react";
import {
  binIndexLowerInclusive,
  en,
  pathFromRings,
  scalePosition,
  contrastRamp,
  dataRampEnd,
  assertSurfacesRead,
  noDataFor,
  waterFor,
  type BakedShape,
} from "./geo-choropleth";

/** A shape merged with its joined value, its reader-facing name and the ONE anchor both halves of
 *  this beat place its hit target at: `[px, py]` in the bake's own frame units. `render-web.mjs`
 *  computes it once, from the baked rings; this component turns it into a percentage of the frame
 *  (what the fallback needs) and `livePlan` unprojects the same number into lon/lat (what the live
 *  camera needs). One anchor, two coordinate systems — never two centroids that can drift. */
export type NamedRegion = BakedShape & {
  value: number | null;
  anchor: [number, number];
};

/** What `RegionTable` needs, which is a `NamedRegion` minus its geometry. */
type NamedRow = { key: string; name: string; value: number | null };

// ===== CONFIG — edit for your story =====
const UNIT_WORD = "human rabies deaths reported to WHO, 2024";
const SUBJECT_KEY = "AFG";
const COMPARISON_KEY = "IND";
// TWO LABELS, because this beat has two silences and a reader must not read one as the other.
// MEASURED, 2026-08-23, and this is why the words carry it rather than the colour: the derived
// no-data fill sits 1.28:1 from the ramp's own first class on this ground — and 1.32:1 on the white
// ground the worked beat ships on, so it is not a property of this palette. `offRampLuminance` puts
// the no-data fill at the MIDPOINT between the ground and class 1, and a midpoint's contrast against
// the upper end tends to 2.00:1 from below however the ramp is stretched, so no palette reaches the
// 3:1 non-text floor. `assertSurfacesRead` cannot see it: it measures a LUMINANCE GAP against a
// 0.02 floor (here 0.0237, on white 0.2075 — both pass) and never a contrast ratio.
// So the distinction travels in WORDS, which is what `types/choropleth.md` asks for anyway: colour
// is never the only channel a value travels through. Written up for the maintainer.
const NO_DATA_LABEL = "No return filed";
const ZERO_LABEL = "0 — filed, reported none";
// =========================================

// ===== Format mechanics — not one story's numbers =====
/** The per-region hit target's own diameter, in real CSS pixels — a legitimate touch/pointer target
 *  at every width this format ships, which a shape sized in frame units is not (Andorra is 2.5 frame
 *  units across, a few physical pixels at any container size). Only the regions
 *  `needsPointerTarget` selects are pointer-active in the fallback; every other region is pointed at
 *  through its own painted `<path>`, which is a fairer target than a disc at its centroid. */
export const HIT_TARGET_PX = 28;
/** A region under this FRACTION OF THE FRAME'S OWN WIDTH on its longer side cannot be landed on
 *  reliably by pointing at its own shape, so it gets a `.pt` button of its own in the FALLBACK
 *  layer.
 *
 *  A FRACTION, and that is the fix. It was `26` ABSOLUTE frame units, and the comment claimed the
 *  number "survives the map becoming fluid". It survives a fluid CONTAINER; it does not survive a
 *  different CAMERA, which is the thing a beat actually changes. 26 was measured against this beat's
 *  own 496px European plate; at the 1200px frame a world map needs, the same 26 units is 7.8° of
 *  longitude and selects most of the world for a 28px pointer disc — an unmeasured set of regions
 *  chosen by a constant nobody re-derived. Measured on a real 241-region beat, 2026-08-22.
 *
 *  26/496 is that same threshold divided by the frame it was measured against, so this beat selects
 *  exactly the six regions it always did — Andorra, Liechtenstein, Malta, Luxembourg, Montenegro and
 *  the Faroe Islands — and a beat at any other frame width selects regions of the same VISUAL size
 *  rather than of the same coordinate size. `the-frame-is-the-cameras-shape.test.ts` measures the
 *  derived value at more than one frame width, which is the only way a frame-relative constant can
 *  be checked at all. */
export const SMALL_REGION_FRAME_FRACTION = 26 / 496;

/** The threshold in this frame's own units. */
export function smallRegionFrameUnits(frame: { width: number }): number {
  return frame.width * SMALL_REGION_FRAME_FRACTION;
}
// =======================================================

/** One region's own detail string — the single implementation the SSR'd `aria-label`/`data-detail`
 *  attributes, the accessible table AND the live layer's own features all draw from, never a second
 *  formatting of the same number (`references/map-web-discipline.md`, "One value, one formatting, in
 *  one place"). */
export function regionDetail(region: {
  name: string;
  value: number | null;
}): string {
  return region.value === null
    ? `${region.name} : ${NO_DATA_LABEL}`
    : `${region.name} : ${en(region.value, 0)} ${UNIT_WORD}`;
}

/** The beat's class ramp, in ONE place: this component paints its `<path>`s from it and
 *  `render-web.mjs`'s `livePlan` writes the SAME colours onto the live layer's own features, so the
 *  swap from plate to live map cannot change what class a country reads as. Two ramps derived
 *  independently would be exactly the "one mark, two halves, two mechanisms" class
 *  `map-web-discipline.md` names, in colour instead of in radius.
 *
 *  It takes the ACCENT, not the ink pole, and that is the change of 2026-08-10. The shading is the
 *  only thing on this map a reader reads a quantity off, and it used to be derived between the
 *  ground and the ink — grey, whatever the newsroom recorded, with one accent outline on top
 *  (`AUDIT-W2-palette-credits.md` H3). `dataRampEnd` walks the accent toward the pole the ground is
 *  not.
 *
 *  NOTHING HERE IS TYPED ANY MORE, and that is the change of 2026-08-23. This used to hand
 *  `sequentialRamp` a low end and a high end as bare positional numbers — `0.20`, raised once from
 *  `0.10`, then `0.24` on one beat — under a comment explaining that the low end has to leave room
 *  for the two surfaces that are NOT the data. It never knew how much room that was: on this
 *  newsroom's own dark ground `0.20` missed the old floor by 0.0015 of relative luminance, fourteen
 *  times out of fourteen, and the refusal's advice ("raise the ramp's own low end") named no file
 *  and no number. `contrastRamp` derives both ends and every step from the one thing that decides
 *  them — how much contrast this ground and this accent have between them — and starts the ramp
 *  exactly where the sea and the no-data fill leave off. See `geo-choropleth.ts`. */
export function choroplethRamp(
  ground: string,
  accent: string,
  breaks: number[],
): string[] {
  return contrastRamp(
    ground,
    dataRampEnd(accent, ground),
    breaks.length + 1,
    "the reported-rabies-deaths choropleth ramp",
  );
}

/** THE THREE COLOUR DECISIONS OF A CHOROPLETH, MADE TOGETHER AND MEASURED TOGETHER: the ramp that
 *  carries the data, the fill for a region with no reading, and the tint the sea is painted in.
 *
 *  Together, because the last two are only correct RELATIVE to the first — see `assertSurfacesRead`
 *  in `geo-choropleth.ts` for the measurement that used to be missing and what it cost on both of
 *  this format's shipped grounds. Every call site comes through here, so the bake, the SSR'd page
 *  and the live plan cannot disagree about what colour the ocean is. */
export function choroplethSurfaces(
  ground: string,
  accent: string,
  breaks: number[],
): { ramp: string[]; noData: string; water: string } {
  const ramp = choroplethRamp(ground, accent, breaks);
  const { noData, water } = assertSurfacesRead(
    ramp,
    ground,
    { noData: noDataFor(ramp, ground), water: waterFor(ramp, ground) },
    "the reported-rabies-deaths choropleth",
  );
  return { ramp, noData, water };
}

/** The exact colour one value is painted in — no-data included, explicitly, never by falling through
 *  to the ramp's own first class. */
export function fillFor(
  value: number | null,
  ramp: string[],
  breaks: number[],
  noData: string,
): string {
  return value === null
    ? noData
    : ramp[binIndexLowerInclusive(value, breaks)]!;
}

/** Whether a region needs a pointer-active button of its own in the FALLBACK state — see
 *  `SMALL_REGION_FRAME_UNITS`. Live, nothing needs one: the canvas hit-tests the rendered fill. */
export function needsPointerTarget(
  box: {
    minX: number;
    maxX: number;
    minY: number;
    maxY: number;
  },
  frame: { width: number },
): boolean {
  return (
    Math.max(box.maxX - box.minX, box.maxY - box.minY) <
    smallRegionFrameUnits(frame)
  );
}

function boxOf(rings: [number, number][][]): {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
} {
  let minX = Infinity,
    maxX = -Infinity,
    minY = Infinity,
    maxY = -Infinity;
  for (const ring of rings)
    for (const [x, y] of ring) {
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
  return { minX, maxX, minY, maxY };
}

export function ChoroplethWeb({
  geometry,
  plate,
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
}: {
  geometry: {
    frame: { width: number; height: number };
    shapes: NamedRegion[];
  };
  plate: string;
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
}) {
  const { frame, shapes } = geometry;
  if (shapes.length < 2)
    throw new Error(
      `a choropleth needs at least two shapes, got ${shapes.length}`,
    );

  const { ramp, noData } = choroplethSurfaces(ground, accent, breaks);
  const anyNoData = shapes.some((r) => r.value === null);

  const subject = shapes.find((r) => r.key === SUBJECT_KEY);
  const comparison = shapes.find((r) => r.key === COMPARISON_KEY);
  if (!subject) throw new Error(`no shape for the subject ${SUBJECT_KEY}`);
  if (!comparison)
    throw new Error(`no shape for the comparison ${COMPARISON_KEY}`);
  if (subject.value === null)
    throw new Error("the subject must have a joined value");
  // THE COMPARISON MAY BE AN ABSENCE, and on this beat it is. This file shipped requiring BOTH ends
  // of the claim to carry a value — correct for the range claim it was written for (highest against
  // lowest), and structurally unable to express the claim this story actually makes: the second end
  // is India, which filed NOTHING, and a country that filed nothing has no value by definition.
  // Refusing it would have meant either dropping the half of the argument the takeaway is about or
  // painting a silence as a number. Recorded in NOTES-FOR-MAINTAINER.md, phase `production`.
  const comparisonIsSilent = comparison.value === null;

  // Reading order: highest value first, shared by DOM order (so Tab/Home/End reach the hit targets
  // in this order), the accessible table, and nothing recomputed twice
  // (`references/map-web-discipline.md`, "The accessibility question").
  const drawn = [...shapes].sort(
    (a, b) => (b.value ?? -Infinity) - (a.value ?? -Infinity),
  );

  return (
    <div className="map-web">
      <p className="mw-title">{title}</p>
      <p className="mw-source">{`${source} · ${basemapCredit}`}</p>

      {/* The stage: the one box that gets whatever vertical room the window has left once every
          piece of furniture above and below has taken its own (`render-web.mjs`'s `buildCss`,
          `.mw-stage`). The viewport inside it keeps the bake's own aspect EXACTLY while the plate
          is what is on screen — a plate stretched to a shape it was not baked for is a lie about
          distance and shape (`geo-discipline.md`). Once the LIVE map is in, that constraint is
          released by the format's own `html.mw-live` rule: a live camera has no plate aspect to
          preserve, so it takes the whole stage. */}
      <div className="mw-stage">
        <div
          className="mw-viewport"
          style={{ aspectRatio: `${frame.width} / ${frame.height}` }}
        >
          {/* LAYER 1 — the live MapTiler map (R1). Empty and invisible until `live-map.mjs` gets a
              `map.on("load")`; laid out from the first frame all the same, because MapLibre reads
              its container's box at construction and a `display:none` box is a 0×0 map. Its own
              container, never a wrapper around the fallback, so the swap is one `hidden` flip. */}
          <div id="mw-map" className="mw-live-map" />

          {/* LAYER 2 — the baked plate: complete, script-free, request-free. What a reader gets with
              JavaScript off, offline, or after the account's keys are invalidated at 100% of its
              spending limit. The format's rule survives verbatim here — the un-zoomed state is not a
              preview of the real view, it IS the full claim. */}
          <div id="mw-fallback" className="mw-fallback">
            {/* Geometry only: the plate and the 41 shaded regions. No text — every glyph is HTML,
                so it never scales with the container (this file's own header note). `role="group"`
                rather than `role="img"`: measured in Chrome on a delivered artifact, a nameless
                root came back from `Accessibility.getFullAXTree` as `SvgRoot`, `name: ""`, carrying
                its `<desc>` with nothing to announce it against — hence the name; `group` was
                chosen over `img` because `img` raises the ARIA children-presentational question for
                the region paths below. */}
            <svg
              className="map"
              viewBox={`0 0 ${frame.width} ${frame.height}`}
              preserveAspectRatio="xMidYMid meet"
              xmlns="http://www.w3.org/2000/svg"
              role="group"
              aria-label={title}
            >
              <desc>{alt}</desc>
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
                {drawn.map((region) => (
                  <path
                    key={region.key}
                    className="region"
                    d={pathFromRings(region.rings)}
                    fill={fillFor(region.value, ramp, breaks, noData)}
                    fillRule="evenodd"
                    stroke={ground}
                    strokeWidth={0.8}
                    strokeLinejoin="round"
                    // The DRAWN MARK, keyed. `interaction.mjs` forwards a pointer that lands here to
                    // this region's own button, and `splash`'s own
                    // `interaction-promises-are-kept.test.ts` pairs mark and target by exactly this
                    // attribute when it probes four points inside the painted shape.
                    data-key={region.key}
                  >
                    <title>{regionDetail(region)}</title>
                  </path>
                ))}
                {/* The subject's outline: a ground-coloured halo so it separates from whatever class
                    its neighbours landed in, then the accent itself — spent HERE and nowhere else on
                    the map (rule 8). The comparison gets the same two-pass outline, in ink, because
                    it is not the subject.
                    `pointerEvents="none"` on both passes: a decorative overlay drawn ON TOP of the
                    real region path would otherwise intercept the pointer itself — measured on the
                    actual rendered page, not assumed: the Faroe Islands' own outline stroke covers
                    nearly the whole 7×14px shape at this camera and swallowed every hover before
                    this was added. Outline pixels are never a target; the region underneath is. */}
                {[
                  { region: comparison, colour: ink },
                  { region: subject, colour: accent },
                ].map(({ region, colour }) => (
                  <Fragment key={region.key}>
                    <path
                      d={pathFromRings(region.rings)}
                      fill="none"
                      stroke={ground}
                      strokeWidth={4.2}
                      strokeLinejoin="round"
                      pointerEvents="none"
                    />
                    <path
                      d={pathFromRings(region.rings)}
                      fill="none"
                      stroke={colour}
                      strokeWidth={2}
                      strokeLinejoin="round"
                      pointerEvents="none"
                    />
                  </Fragment>
                ))}
              </g>
            </svg>
          </div>

          {/* LAYER 3 — the overlay: one button per region, and it is a SIBLING of the two map layers
              rather than a child of either, because it belongs to BOTH. It is the only keyboard path
              to the 41 readings, so hiding it with the fallback at `map.on("load")` would cost every
              Tab stop on exactly the path ruling R1 was meant to improve. Positioned in PERCENTAGES
              here, which is what the fallback needs; `live-map.mjs` repositions the same nodes with
              `map.project()` on every camera move, which is what the live map needs — off the SAME
              anchor, unprojected into lon/lat by `livePlan`. */}
          <div className="mw-overlay">
            {drawn.map((region) => {
              const detail = regionDetail(region);
              const [ax, ay] = region.anchor;
              const small = needsPointerTarget(boxOf(region.rings), frame);
              return (
                <button
                  key={region.key}
                  type="button"
                  className={`pt${small ? " pt-small" : ""}`}
                  style={{
                    // CLAMPED TO ITS OWN HALF-WIDTH at each edge, exactly the way the legend's own
                    // markers already are. A region hard against the frame — New Zealand at 174°E,
                    // Kiribati either side of the antimeridian — gets a target centred on it that
                    // hangs half of itself outside the viewport. Measured on a real world beat
                    // before this line: 869px of content inside an 857px box at 1600x900, which
                    // turned "nothing scrolls inside the visual" red at all four widths. The
                    // European beat this file is the seed for has no region within half a target of
                    // an edge, which is why nothing here ever exercised it.
                    left: `clamp(${HIT_TARGET_PX / 2}px, ${(ax / frame.width) * 100}%, calc(100% - ${HIT_TARGET_PX / 2}px))`,
                    top: `clamp(${HIT_TARGET_PX / 2}px, ${(ay / frame.height) * 100}%, calc(100% - ${HIT_TARGET_PX / 2}px))`,
                    // ONE dimension; the height comes from `.pt { aspect-ratio: 1 }` (B6.20). This
                    // beat was never anisotropic — both numbers were already fixed pixels — but the
                    // rule is stated once for the format, so nothing here can drift back into two
                    // numbers describing one circle.
                    width: `${HIT_TARGET_PX}px`,
                  }}
                  aria-label={detail}
                  title={detail}
                  data-key={region.key}
                  data-detail={detail}
                />
              );
            })}
          </div>
        </div>
      </div>

      {/* The legend: one horizontal class bar with the bin boundaries printed as numbers underneath —
          the type's own accessibility trap (`types/choropleth.md`): colour alone is never the only
          channel a value travels through. Entirely HTML, at fixed CSS pixel sizes, so the numbers
          read the same however wide the map beside them is drawn. The two triangles are where the
          subject and the comparison sit on the SAME continuous scale the class bar only shows in
          discrete steps — the argument made visible as a distance, not merely asserted in the notes
          below it. */}
      <div className="mw-legend">
        <p className="mw-legend-caption">{legendCaption}</p>
        <div className="mw-legend-bar">
          {[
            // A silent comparison has no position on a value scale — there is no value to place —
            // so it gets no triangle here and is carried by its own line below and by the no-data
            // swatch. A triangle at 0 would say "India reported zero", which is the one reading
            // this beat exists to refuse.
            ...(comparisonIsSilent ? [] : [{ region: comparison, colour: ink }]),
            { region: subject, colour: accent },
          ].map(({ region, colour }) => (
            <span
              key={region.key}
              className="mw-legend-marker"
              style={{
                // Clamped to its own half-width at each end: the subject's value sits past the top
                // break, so `scalePosition` returns exactly 1 and a centred triangle would hang half
                // of itself outside the bar — and outside the column every other line of furniture
                // is flush with.
                left: `clamp(5px, ${scalePosition(region.value as number, breaks) * 100}%, calc(100% - 5px))`,
                borderBottomColor: colour,
              }}
            />
          ))}
          {ramp.map((shade) => (
            <span
              key={shade}
              className="mw-legend-class"
              style={{ background: shade }}
            />
          ))}
        </div>
        <div className="mw-legend-ticks">
          {[0, ...breaks].map((tick, i) => (
            <span key={tick} className="mw-legend-tick">
              <span>
                {i === 0
                  ? ZERO_LABEL
                  : i === breaks.length
                    ? `${en(tick, 0)}+`
                    : en(tick, 0)}
              </span>
            </span>
          ))}
        </div>
        {anyNoData ? (
          <p className="mw-legend-nodata">
            <span
              className="mw-legend-swatch"
              style={{ background: noData, borderColor: muted }}
            />
            {`${NO_DATA_LABEL} — ${shapes.filter((r) => r.value === null).length} countries. Not a zero.`}
          </p>
        ) : null}
      </div>

      {/* The two marks the argument is made of, each with its own direct note — the subject in the
          accent, the comparison in ink, because it is not the subject (rule 8). */}
      <p className="mw-subject">
        {`${subject.name} — highest of the ${shapes.length} countries drawn, ${en(subject.value, 0)} ${UNIT_WORD}`}
      </p>
      <p className="mw-comparison">
        {comparisonIsSilent
          ? `${comparison.name} — filed nothing for this year. Not zero: no return.`
          : `${comparison.name} — lowest of the ${shapes.length}, ${en(comparison.value)} ${UNIT_WORD}`}
      </p>
      <p className="mw-caveat">{caveat}</p>
    </div>
  );
}

/**
 * The accessibility answer this beat is built to demonstrate
 * (`references/map-web-discipline.md`, "The accessibility question"): the SAME 41 readings the map
 * draws spatially, again, as one plain HTML table — captioned, ordered largest first, ALWAYS
 * rendered (not behind a disclosure widget, not screen-reader-only CSS), so a reader with no spatial
 * access to the map has a complete, linear, exact account of everything the map claims. Rendered
 * ONCE by `render-web.mjs`, as plain semantic HTML rather than SVG text, because a `<table>` with
 * real `<th>` cells is what a screen reader's own table navigation understands.
 *
 * It sits BELOW the one-window-tall map column rather than inside it, and that is a deliberate,
 * stated trade: 41 rows cannot be shown inside a 900px window beside a map without either shrinking
 * the map to a stamp or putting the table behind a widget this format forbids. The claim, the legend,
 * the two named extremes and the caveat all fit above the fold; the linear reading of all 41
 * follows.
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
                : `${en(region.value, 0)} ${UNIT_WORD}`}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
