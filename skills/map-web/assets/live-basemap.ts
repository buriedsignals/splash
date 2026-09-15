// twin/skills/map-web/assets/live-basemap.ts
//
// THE BASEMAP IS ALIVE, AND ITS CONTROLS ARE MAPTILER'S OWN.
//
// THE RULING (2026-09-15, the owner, on this beat's `renders/nocturne.html`): *"utilise les vrais
// controls de maptiler pas des controls extérieurs"*. A rail of bespoke buttons over a baked plate
// was refused. It restates, on a directed beat, the ruling `live-map.mjs` already carries — R1
// (2026-08-10): *"la carte doit rester interactive tout le temps sinon il n'y a pas d'intérêt
// d'être sur le web si on peut pas naviguer dedans"*. A web map you cannot move through is a
// picture; a map you move through with somebody's hand-drawn buttons is a picture with buttons.
//
// So this file is the directed corpus's half of the arrangement `live-map.mjs` describes, and it
// keeps that file's two layers exactly:
//
//   1. THE PLATE. The SSR'd beat as it renders today — the baked MapTiler plate as a data URI, the
//      marks, the labels, the key, the legend, the whole editorial gesture in generated CSS with
//      no script at all. Complete, script-free, request-free. It is what stands there when the
//      MapTiler key lapses (MapTiler invalidates ALL of an account's keys at 100 % of its spending
//      limit — every published article's map going blank at once), when a tile request fails, and
//      when a reader has JavaScript off.
//   2. THE LIVE MAP. An empty box this file fills with a real MapTiler map carrying MapLibre's own
//      `NavigationControl`, its own drag, its own wheel and its own keyboard — revealed ONLY on
//      `map.on("load")`. Anything that can fail leaves layer 1 exactly where it is.
//
// ─────────────────────────────────────────────────────────────────────────────────────────────
// WHAT IS DIFFERENT HERE, AND WHY IT IS A BETTER ARRANGEMENT THAN THE ONE IT COPIES.
//
// `live-map.mjs` swaps the WHOLE fallback away and re-draws the marks as MapLibre layers, with an
// HTML overlay for the labels and the hit targets. That gives one mark two halves driven by two
// mechanisms — the very defect its own header names twice ("one mark, two halves, two mechanisms")
// and the reason `applyFilter` had to be written at all. A directed beat cannot afford it anyway:
// this corpus's editorial gesture is pure CSS over SSR'd SVG (`area-scale.ts` re-scales 41 circles
// and 3 key swatches with `:checked` and zero JavaScript), and a MapLibre circle layer cannot be
// reached by a stylesheet.
//
// So only the BASEMAP is swapped. The marks, the labels, the hit targets and the key stay exactly
// one drawing, in one `<svg>`, in both layers. What moves is the WINDOW, and the window is the
// `<svg>`'s own `viewBox` — the same mechanism `navigate.ts` proved, now driven by the LIVE
// camera instead of by buttons of ours:
//
//   - the plate is baked through `map.project()`, so its frame is linear in Web Mercator, and a
//     live MapLibre camera at zero bearing and zero pitch is linear in Web Mercator too. The
//     visible rectangle is therefore an exact affine image of the drawing's own box, computed from
//     `map.unproject()` on two corners. No approximation, no re-projection, no `cx`/`cy` touched.
//   - `getScreenCTM()` is derived from the viewBox at the moment it is called, so the client →
//     user-space mapping stays live for free and `interaction.mjs` — which reads every centre ONCE
//     at initialisation — is still answering off coordinates that are still true, after a zoom and
//     after a pan. That is the trap this tree has now paid for three times (radar, diverging
//     stacked, this map), and it is closed here by construction rather than by care.
//
// ─────────────────────────────────────────────────────────────────────────────────────────────
// A LENGTH FOLLOWS THE PLANE; A SHAPE NEVER DOES.
//
// `live-map.mjs` names three radius behaviours — `camera`, `ground`, `fixed`. This is the `camera`
// one, and on a proportional symbol map it is not a preference: a circle here encodes a VALUE, so
// it holds its SCREEN size as the reader zooms, because the same number must not mean two things
// at two zooms. The key is drawn outside the plate's coordinate system, in the cell's own pixels;
// a mark that grew with the window would leave the key stating a scale the map is no longer drawn
// in — which is, to the tenth of a factor, the defect this beat had just finished repairing (the
// key over-stated by ~2x).
//
// The mechanism is a counter-scale of `1/k` about each mark's OWN centre. The centre is the fixed
// point of a scale about itself, so the coordinate the pointer resolver compares against does not
// move — which is why the counter-scale and the live camera can share one page without the hover
// coming apart.
//
// ─────────────────────────────────────────────────────────────────────────────────────────────
// ONE BASEMAP, NOT TWO. `style.mjs`'s `assertNoDoubledBasemap` states the rule: repainting land or
// coastline from the beat's own shapefile lays a second geography over MapTiler's. The directed
// beats do exactly that today — a vector `land` path over the baked plate — and it is invisible
// only because the two were captured through the same camera. Live, it would be a second coast
// over a first, so everything tagged `data-plate` (the water backstop, the plate image, the land
// path) is hidden under `.mw-live` and MapTiler draws the ground, tinted by the SAME
// `styleDecisionFor` the bake used. Two applications of one rulebook, never two rulebooks.
//
// ─────────────────────────────────────────────────────────────────────────────────────────────
// ONE RESOLVER, AND THE POINTER GOES TO THE MAP.
//
// The `<svg>` sits on top of the map canvas, so with its own pointer-events on it would eat every
// drag and every wheel before MapLibre saw one — and a map you can only pan where you are not
// pointing is not a map with native controls. So the whole drawing gives up the pointer while live
// and the map receives everything natively; the hover is kept by RELAYING the pointer's position
// onto the drawing's own `.hit-area`, which is the one resolver `interaction.mjs` already has.
// Nothing is resolved twice and no second set of coordinates exists.
//
// Keyboard reach is untouched by this: focus is not a pointer, so the 41 `.pt` circles keep the
// Tab walk and the arrow walk they had, and MapLibre's canvas is one more stop with its own keys.

/** One MapTiler style, one recorded camera, one subject, one pair of tints, and the words a reader
 *  is given. Everything else this file needs is DERIVED — see `assertLiveBasemapDeclaration`. */
export type LiveBasemapDeclaration = {
  /** The MapTiler style id the plate was baked from. The live map loads the same one, so the two
   *  layers cannot be two cartographies. */
  style: string;
  /** The extent the bake's camera ACTUALLY showed (`geometry.json`'s `frameCorners`), read back
   *  with `map.unproject()` after it settled — never the nominal bounds handed to `fitBounds`,
   *  which `fitBounds` widens to keep the frame's aspect. */
  corners: { west: number; east: number; north: number; south: number };
  /** The drawing's own viewBox, in its own units. */
  view: { width: number; height: number };
  /** The subject the claim names and how wide it is in those units. The zoom CEILING is derived
   *  from these two numbers and may not be typed: a reader can come close enough to see where
   *  inside the subject a mark falls, and no closer, because past that the map shows terrain the
   *  beat holds no datum for. */
  subject: { label: string; width: number };
  /** The two tints the plate was baked in, which are the two the live style is painted with. */
  tints: { water: string; land: string };
  /** MapLibre's own control names, in the page's own language. The library ships English defaults
   *  and a French page that leaves them hands a screen reader an English button. */
  locale: { title: string; zoomIn: string; zoomOut: string };
  /** The map's own accessible description, shown to everyone once the live layer is up. */
  hint: string;
};

/** THE PLACEHOLDER, NEVER A KEY. `deliver` substitutes the real key at the moment the file goes to
 *  a newsroom; `splash/test/no-key-in-the-repository.test.ts` reddens if one ever reaches a tracked
 *  file, and the committed artifact therefore never boots its own live layer — which is exactly
 *  right, a proof artifact must not spend a newsroom's tile quota. */
export const KEY_PLACEHOLDER = "__MAPTILER_KEY__";

/** THE CEILING, DERIVED FROM THE TWO NUMBERS THAT DECIDE IT and from nothing else. */
export function maxZoomHeadroomOf(declaration: LiveBasemapDeclaration): number {
  return Math.log2(declaration.view.width / declaration.subject.width);
}

const isHex = (value: unknown): boolean =>
  typeof value === "string" && /^#[0-9a-fA-F]{6}$/.test(value);
const words = (text: string): number =>
  String(text).trim().split(/\s+/).filter(Boolean).length;

/**
 * THE DECLARATION, REFUSED RATHER THAN DEFAULTED. Every branch here is a way this arrangement
 * ships with every attribute correct and lies in a browser.
 */
export function assertLiveBasemapDeclaration(
  declaration: LiveBasemapDeclaration,
  where = "this beat",
): void {
  const at = `live-basemap (${where})`;
  if (!declaration || typeof declaration !== "object")
    throw new Error(`${at}: no declaration at all.`);

  if (typeof declaration.style !== "string" || declaration.style.trim() === "")
    throw new Error(
      `${at}: names no MapTiler style. The live map has to load the SAME style the plate was baked ` +
        `from, or the swap on \`load\` is visibly two cartographies.`,
    );

  const c = declaration.corners;
  if (
    !c ||
    ![c.west, c.east, c.south, c.north].every((n) => Number.isFinite(n)) ||
    !(c.west < c.east) ||
    !(c.south < c.north) ||
    Math.abs(c.west) > 180 ||
    Math.abs(c.east) > 180 ||
    Math.abs(c.south) > 85.06 ||
    Math.abs(c.north) > 85.06
  )
    throw new Error(
      `${at}: the camera's recorded corners are not a box on the globe (${JSON.stringify(c)}). ` +
        `They are what places every mark on the plate AND what the live camera is fitted and ` +
        `leashed to; a bad box puts the live map and the drawing over it in two different places.`,
    );

  const v = declaration.view;
  if (!v || !(v.width > 0) || !(v.height > 0))
    throw new Error(
      `${at}: the drawing declares no viewBox (${JSON.stringify(v)}).`,
    );

  const s = declaration.subject;
  if (
    !s ||
    typeof s.label !== "string" ||
    s.label.trim() === "" ||
    !(s.width > 0)
  )
    throw new Error(
      `${at}: no subject. The zoom ceiling is the width of the thing the headline names, measured ` +
        `in the drawing's own units, so a beat that names none has no ceiling to derive.`,
    );
  if (!(s.width < v.width))
    throw new Error(
      `${at}: the subject "${s.label}" is ${s.width} units wide in a ${v.width}-unit drawing, so ` +
        `the derived ceiling is ${maxZoomHeadroomOf(declaration).toFixed(3)} zoom levels — the ` +
        `reader cannot get closer than the published framing and the live map is a picture again.`,
    );

  for (const typed of ["maxZoom", "minZoom", "zoom", "step", "scale"])
    if ((declaration as Record<string, unknown>)[typed] !== undefined)
      throw new Error(
        `${at}: the declaration types \`${typed}\`. The floor is the published framing and the ` +
          `ceiling is \`view.width / subject.width\` — both are DERIVED, and a typed one is a ` +
          `number that stops agreeing with the drawing the day the drawing changes.`,
      );

  const t = declaration.tints;
  if (!t || !isHex(t.water) || !isHex(t.land))
    throw new Error(
      `${at}: the live style's tints are not two #rrggbb colours (${JSON.stringify(t)}). They are ` +
        `the two the PLATE was baked in; a live map that keeps the provider's own near-grey water ` +
        `under a fallback painted blue makes the swap visible.`,
    );
  if (t.water.toLowerCase() === t.land.toLowerCase())
    throw new Error(
      `${at}: water and land are both ${t.water}. A basemap whose sea and ground are one colour ` +
        `draws no coast, and the coast is the only geography this beat's marks are placed against.`,
    );

  const l = declaration.locale;
  const named = [l?.title, l?.zoomIn, l?.zoomOut];
  if (!l || named.some((n) => typeof n !== "string" || n.trim().length < 2))
    throw new Error(
      `${at}: MapLibre's own controls are not named (${JSON.stringify(l)}). They are the controls ` +
        `the owner asked for, so they are the ones that have to speak this page's language — the ` +
        `library's defaults are English and nothing warns you.`,
    );
  if (l.zoomIn.trim() === l.zoomOut.trim())
    throw new Error(
      `${at}: zoom in and zoom out carry the same name, "${l.zoomIn}".`,
    );

  if (typeof declaration.hint !== "string" || words(declaration.hint) < 10)
    throw new Error(
      `${at}: the map's accessible description is ${words(declaration.hint ?? "")} words. A reader ` +
        `who has just tabbed onto a live map is told what it does and what it does NOT do — here, ` +
        `that the window moves and the scale of the areas does not.`,
    );
}

/** The plan the page carries as JSON and the script reads back. Derived, never typed twice. */
export function liveBasemapPlan(
  declaration: LiveBasemapDeclaration,
): Record<string, unknown> {
  assertLiveBasemapDeclaration(declaration);
  return {
    styleUrl: `https://api.maptiler.com/maps/${declaration.style}/style.json?key=${KEY_PLACEHOLDER}`,
    styleName: declaration.style,
    corners: declaration.corners,
    view: declaration.view,
    subject: declaration.subject,
    tints: declaration.tints,
    locale: declaration.locale,
    /** The ceiling, in zoom levels above the fitted floor. Written into the plan rather than
     *  recomputed in the browser so the number the build argued is the number the reader gets. */
    maxZoomHeadroom: maxZoomHeadroomOf(declaration),
  };
}

/**
 * THE RULES. Everything here is generated, scoped to the beat's own figure, and every one of them
 * is conditional on `.mw-live` except the resting value of the counter-scale — so a page whose
 * script never runs is drawn exactly as it was before this file existed.
 */
export function liveBasemapCss(
  declaration: LiveBasemapDeclaration,
  { scope }: { scope: string },
): string {
  assertLiveBasemapDeclaration(declaration);
  const live = `.mw-live ${scope}`;
  return [
    // THE WINDOW'S OWN NUMBER, 1 at rest. The script writes it on every camera frame.
    `${scope} { --live-inverse: 1; }`,
    // WHAT DOES NOT FOLLOW THE PLANE. A uniform scale about the element's OWN centre, which the
    // beat sets as this element's `transform-origin` — so the centre is the fixed point and the
    // coordinate `interaction.mjs` read at init is still true at every zoom.
    `${scope} [data-map-fixed] { transform-box: view-box; transform: scale(var(--live-inverse)); }`,
    // ONE CLOCK, AND IT IS THE MAP'S. The camera and the viewBox move in the same frame; a
    // transition here would give the marks a second clock and they would slide off their own
    // places for the length of every flight the reader takes.
    `${scope} [data-map-fixed] { transition: none; }`,
    // THE LIVE BOX IS EMPTY AND INVISIBLE UNTIL IT IS NOT. Sized by the format's own `-layer`
    // rule, which hands it the plot cell exactly.
    `${scope} .map-layer { visibility: hidden; }`,
    `${live} .map-layer { visibility: visible; }`,
    // ONE BASEMAP. Everything the beat drew of the ground gives way to MapTiler's own, and ONLY
    // when the live map is actually up: with no script the plate is the whole page.
    `${live} [data-plate] { display: none; }`,
    // THE DRAWING PAINTS OVER THE CANVAS, AND UNDER THE CONTROLS. MapLibre's canvas is
    // `position: absolute`, so a non-positioned grid item beside it paints UNDERNEATH it however
    // late it comes in the DOM — the marks would simply be gone. The controls carry MapLibre's own
    // `z-index: 2` and stay on top of both.
    `${live} svg.chart { position: relative; z-index: 1; }`,
    `${live} .key-layer { z-index: 2; }`,
    // THE POINTER BELONGS TO THE MAP WHILE THE MAP IS LIVE. The drawing sits over the canvas, so
    // with its own pointer-events on it would swallow every drag and every wheel before MapLibre
    // saw one. The hover is not lost: the script relays the pointer's position onto `.hit-area`,
    // which is the same and only resolver.
    `${live} svg.chart, ${live} svg.chart * { pointer-events: none; }`,
    // WITH NO SCRIPT THERE IS NO DESCRIPTION EITHER — a sentence about dragging a map that cannot
    // be dragged is the dead control this arrangement exists to not ship. `[hidden]` is a UA rule,
    // so it is restated here as an author rule that no author rule can outrank by accident.
    `${scope} .live-hint[hidden] { display: none; }`,
  ].join("\n\n");
}

/**
 * THE SCRIPT, authored as a classic `<script>` body — no module, no bundler, so it keeps working
 * in a CMS iframe or a sandboxed embed that refuses module scripts. It derives no geometry of its
 * own beyond the affine map between the live camera and the drawing's box, and it formats no WORD:
 * every glyph a reader can be shown was cut into the page's own embedded faces at build time.
 *
 * `styleModule` is `assets/style.mjs`'s own source with its `export` keywords stripped, handed in
 * by the beat. The sweep that decides what a basemap layer becomes is stated ONCE, in that file,
 * and applied twice — to the style document the plate is baked from, and to the live style here.
 * Inlining a second copy of its regexes is the "two rulebooks" failure it exists to end.
 */
export function liveBasemapScript(
  declaration: LiveBasemapDeclaration,
  { scope, styleModule }: { scope: string; styleModule: string },
): string {
  assertLiveBasemapDeclaration(declaration);
  if (
    typeof styleModule !== "string" ||
    !/function\s+applyLiveStyle/.test(styleModule)
  )
    throw new Error(
      "live-basemap: the style sweep is handed in by the beat (the source of " +
        "`skills/map-web/assets/style.mjs`, with its `export` keywords stripped) because a page " +
        "script cannot import. What it was given does not define `applyLiveStyle`.",
    );
  if (/\bexport\s/.test(styleModule))
    throw new Error(
      "live-basemap: the style sweep still carries `export`, which is a syntax error in a classic " +
        "script. The whole live layer would fail to parse and the fallback would stand with no " +
        "error anyone could see — which is the one failure mode this arrangement cannot report.",
    );

  liveBasemapPlan(declaration);
  return `${styleModule}
(function () {
  var doc = document;
  // THE PLAN IS READ OUT OF THE PAGE, not baked into this script. It travels as an
  // "application/json" payload because that is what the font machine reads when it decides which
  // characters this page can display — MapLibre's own control names are in it, and a glyph that
  // only ever appears on a live control is in no text node and in no attribute.
  var planNode = doc.getElementById("mw-live-plan");
  if (!planNode) return;
  var PLAN;
  try { PLAN = JSON.parse(planNode.textContent); } catch (err) { return; }
  var figure = doc.querySelector(${JSON.stringify(scope)});
  var container = doc.getElementById("mw-map");
  var svg = figure && figure.querySelector("svg.chart");
  var hint = doc.getElementById("mw-hint");
  if (!figure || !container || !svg) return;

  // THE COMMITTED ARTIFACT NEVER BOOTS, and that is the design. The sentinel is ASSEMBLED rather
  // than written whole: \`deliver\` substitutes every occurrence of the placeholder in the
  // delivered file, and this script is IN that file, so a literal here would be rewritten to the
  // key itself and every delivered map would refuse to start. (Found in a real browser after
  // substitution, not by reading: the fallback rendered perfectly and nothing was red.)
  var sentinel = "__MAPTILER" + "_KEY__";
  if (!PLAN.styleUrl || PLAN.styleUrl.indexOf(sentinel) >= 0) return;
  if (!window.maplibregl) return;

  var C = PLAN.corners;
  var V = PLAN.view;
  function mercY(lat) { return Math.log(Math.tan(Math.PI / 4 + (lat * Math.PI) / 360)); }
  var YN = mercY(C.north);
  var YS = mercY(C.south);
  // THE DRAWING'S BOX, AS A FUNCTION OF THE GLOBE. The plate was baked through \`map.project()\`,
  // so its frame is linear in Web Mercator; a live camera at zero bearing and zero pitch is too.
  // These two are therefore EXACT, not an approximation of the bake.
  function X(lon) { return ((lon - C.west) / (C.east - C.west)) * V.width; }
  function Y(lat) { return ((mercY(lat) - YN) / (YS - YN)) * V.height; }

  var map = new window.maplibregl.Map({
    container: container,
    style: PLAN.styleUrl,
    bounds: [[C.west, C.south], [C.east, C.north]],
    fitBoundsOptions: { padding: 0, animate: false },
    attributionControl: false,
    // NO ROTATION AND NO PITCH. The viewBox above is an axis-aligned rectangle in Mercator; a
    // bearing or a pitch would make the live camera and the drawing over it two different cameras,
    // and every mark would be in the wrong place. Nothing in this format rotates anyway.
    dragRotate: false,
    pitchWithRotate: false,
    maxZoom: 22,
    locale: {
      "Map.Title": PLAN.locale.title,
      "NavigationControl.ZoomIn": PLAN.locale.zoomIn,
      "NavigationControl.ZoomOut": PLAN.locale.zoomOut
    }
  });
  if (map.touchZoomRotate && map.touchZoomRotate.disableRotation) map.touchZoomRotate.disableRotation();
  // THE OWNER'S INSTRUCTION, BY NAME: MapTiler's own zoom control, not a button beside the map.
  // The compass is off because no beat in this format rotates.
  map.addControl(new window.maplibregl.NavigationControl({ showCompass: false }), "top-right");
  window.__mwMap = map;

  map.on("style.load", function () {
    // THE BAKE'S OWN RULEBOOK, APPLIED TO THE LIVE STYLE — the same \`styleDecisionFor\` the plate
    // was transformed with. And ASSERTED rather than assumed: a sweep that re-tinted nothing did
    // not find the style it was written against, and the reader would keep the provider's water
    // under a plate painted in the beat's.
    assertLiveStyleAnswered(applyLiveStyle(map, { tints: PLAN.tints }), PLAN.styleName);
  });

  /** THE FLOOR IS THE PUBLISHED FRAMING. The plot cell carries the plate's own ratio by
   *  construction, so the corners fit the container exactly and there is only ONE window at the
   *  floor: it is the one the newsroom published. \`maxBounds\` then makes zooming out past the
   *  argued frame and pushing the geography off it the same clamp rather than two rules that can
   *  disagree — and unlike \`live-map.mjs\`'s own warning about it, the plate's box and the
   *  container's box are the same box here, so the leash cannot crop the claim. */
  function fit() {
    map.setMaxBounds(null);
    map.setMinZoom(-2);
    map.fitBounds([[C.west, C.south], [C.east, C.north]], { padding: 0, animate: false });
    var floor = map.getZoom();
    map.setMinZoom(floor);
    map.setMaxZoom(floor + PLAN.maxZoomHeadroom);
    map.setMaxBounds([[C.west, C.south], [C.east, C.north]]);
  }

  /** THE WINDOW IS THE viewBox, and nothing else on the page moves. Not one \`cx\`, not one
   *  \`cy\`, not one label anchor — which is exactly what \`interaction.mjs\` needs, since it read
   *  every centre once at initialisation and \`getScreenCTM()\` is derived from the viewBox at the
   *  moment it is called. */
  function frame() {
    var canvas = map.getCanvas();
    var w = canvas.clientWidth;
    var h = canvas.clientHeight;
    if (!(w > 0) || !(h > 0)) return;
    var tl = map.unproject([0, 0]);
    var br = map.unproject([w, h]);
    var x0 = X(tl.lng);
    var x1 = X(br.lng);
    var y0 = Y(tl.lat);
    var y1 = Y(br.lat);
    var vw = x1 - x0;
    if (!(vw > 0)) return;
    svg.setAttribute("viewBox", x0.toFixed(4) + " " + y0.toFixed(4) + " " + vw.toFixed(4) + " " + (y1 - y0).toFixed(4));
    // A CIRCLE ENCODES A VALUE, SO IT HOLDS ITS SCREEN SIZE. The key is drawn outside this
    // coordinate system, in the cell's own pixels; a mark that grew with the window would leave
    // the key stating a scale the map is no longer drawn in.
    figure.style.setProperty("--live-inverse", String(vw / V.width));
  }

  map.on("load", function () {
    fit();
    frame();
    doc.documentElement.classList.add("mw-live");
    if (hint) {
      hint.hidden = false;
      svg.setAttribute("aria-describedby", "mw-hint");
    }
    map.resize();
    frame();
  });
  map.on("move", frame);
  // THE CONTAINER CHANGED SHAPE, so the camera is re-fitted rather than cropped. Web is a range of
  // shapes, not a fourth export size.
  map.on("resize", function () {
    if (!doc.documentElement.classList.contains("mw-live")) return;
    fit();
    frame();
  });

  // ── THE POINTER, RELAYED TO THE ONE RESOLVER ────────────────────────────────────────────────
  // The drawing has given up the pointer (see the stylesheet) so the map can be dragged and
  // wheeled anywhere, including over a mark. The reading is kept by handing \`.hit-area\` the
  // pointer's own client position: \`interaction.mjs\` converts it through the LIVE
  // \`getScreenCTM()\` and answers with the nearest centre, exactly as it did before.
  var hit = svg.querySelector(".hit-area");
  var dragging = false;
  function relay(type, ev) {
    if (!hit || dragging) return;
    hit.dispatchEvent(new PointerEvent(type, { clientX: ev.clientX, clientY: ev.clientY, bubbles: false, cancelable: false }));
  }
  var surface = map.getCanvasContainer();
  surface.addEventListener("pointermove", function (ev) { relay("pointermove", ev); });
  surface.addEventListener("pointerleave", function (ev) { relay("pointerleave", ev); });
  // A TAP IS NOT A HOVER. On touch there is no pointermove to relay, so the click is what asks;
  // and it arrives AFTER the document-level pointerdown that clears the box, which is why the
  // pointerdown itself is deliberately not relayed.
  surface.addEventListener("click", function (ev) { relay("pointermove", ev); });
  // AN ANSWER ABOUT A MARK MUST NOT OUTLIVE THE MARK'S POSITION. The box is anchored on the mark's
  // own client rect; the moment the camera starts moving that rect is stale, so it goes.
  map.on("movestart", function () {
    if (hit) hit.dispatchEvent(new PointerEvent("pointerleave", { clientX: 0, clientY: 0 }));
  });
  map.on("dragstart", function () { dragging = true; });
  map.on("dragend", function () { dragging = false; });
})();
`;
}

/**
 * THE HALF NO DECLARATION-LEVEL CHECK CAN MAKE: the page that was actually written.
 *
 * Every refusal below is a way this arrangement ships with every attribute perfectly correct and
 * lies in a browser — a fallback that was deleted, a plate hidden with no script to replace it, a
 * mark that grows with the zoom, a bespoke rail left standing, a script that never writes the
 * window.
 */
export function assertOneLiveBasemap(
  html: string,
  declaration: LiveBasemapDeclaration,
  where = "this page",
): void {
  assertLiveBasemapDeclaration(declaration, where);
  const page = String(html);
  const at = `live-basemap (${where})`;

  // 1 — BOTH LAYERS, OR IT IS NOT THIS ARRANGEMENT.
  if (!/<image\b[^>]*\bdata-plate\b/.test(page))
    throw new Error(
      `${at} carries no <image data-plate> inside its drawing. Layer 1 is the whole claim: it is ` +
        `what a reader gets with no script, with no network, and on the day MapTiler invalidates ` +
        `every key on the account at 100 % of its spending limit.`,
    );
  if (!/\bid="mw-map"/.test(page))
    throw new Error(
      `${at} carries no #mw-map box, so there is nowhere for the live map to go.`,
    );

  // 2 — THE PLATE IS HIDDEN ONLY WHEN SOMETHING REPLACED IT.
  if (!/\.mw-live\s+[^{]*\[data-plate\][^{]*\{[^}]*display:\s*none/.test(page))
    throw new Error(
      `${at} never hides the plate under \`.mw-live\`, so the baked basemap and the live one are ` +
        `drawn on top of each other the moment the map loads.`,
    );
  for (const rule of page.matchAll(/([^{}]*)\{([^}]*)\}/g)) {
    const selector = rule[1];
    if (!/\[data-plate\]/.test(selector)) continue;
    if (/\.mw-live/.test(selector)) continue;
    if (/display:\s*none/.test(rule[2]))
      throw new Error(
        `${at} hides \`[data-plate]\` unconditionally ("${selector.trim()}"). A reader with no ` +
          `JavaScript would then get a map with no basemap at all — the fallback removed by the ` +
          `very rule that was meant to reveal its replacement.`,
      );
  }

  // 3 — EVERY MARK IS COUNTER-SCALED ABOUT ITS OWN CENTRE.
  const fixedGroups = [...page.matchAll(/<g\b[^>]*\bdata-map-fixed\b[^>]*>/g)];
  if (fixedGroups.length === 0)
    throw new Error(
      `${at} has no [data-map-fixed] group. Every mark, every label and every hit target would ` +
        `then follow the plane: a circle encoding a value would mean two different things at two ` +
        `zooms, and the size key beside it would be calibrated to neither.`,
    );
  for (const group of fixedGroups) {
    const origin = /transform-origin:\s*([-\d.]+)px\s+([-\d.]+)px/.exec(
      group[0],
    );
    if (!origin)
      throw new Error(
        `${at} carries a [data-map-fixed] group with no explicit transform-origin: ${group[0]}. ` +
          `The centre is the FIXED POINT of a scale about itself, and it is the only reason the ` +
          `coordinate \`interaction.mjs\` read once at initialisation is still true at every zoom. ` +
          `Scaled about anything else — the frame's corner, the group's bounding box — the mark ` +
          `travels and the pointer answers about its neighbour.`,
      );
  }
  // …AND IT IS THE MARK'S OWN CENTRE, not merely SOME point. Read the first `cx`/`cy` inside each
  // group back against the origin the group declares: a group scaled about the frame's corner, or
  // about the wrong mark's centre, carries a perfectly well-formed `transform-origin` and moves
  // the mark anyway.
  for (const group of page.matchAll(
    /<g\b[^>]*\bdata-map-fixed\b[^>]*style="[^"]*transform-origin:\s*([-\d.]+)px\s+([-\d.]+)px[^"]*"[^>]*>([\s\S]*?)<\/g>/g,
  )) {
    const child = /\bcx="([-\d.]+)"[\s\S]*?\bcy="([-\d.]+)"/.exec(group[3]);
    if (!child) continue;
    const offBy = Math.max(
      Math.abs(Number(child[1]) - Number(group[1])),
      Math.abs(Number(child[2]) - Number(group[2])),
    );
    if (offBy > 0.01)
      throw new Error(
        `${at} counter-scales a group about ${group[1]} ${group[2]} while the mark inside it sits ` +
          `at ${child[1]} ${child[2]}. That is a scale about a point the mark is not at, so the ` +
          `mark MOVES as the reader zooms and the pointer resolves to whatever is now nearest.`,
      );
  }

  // 4 — THE COUNTER-SCALE ITSELF, AND ITS RESTING VALUE.
  if (
    !/\[data-map-fixed\][^{]*\{[^}]*transform:\s*scale\(var\(--live-inverse\)\)/.test(
      page,
    )
  )
    throw new Error(
      `${at} emits no counter-scale for [data-map-fixed]. Every mark and every label would grow ` +
        `with the window, and the key — which is drawn in the CELL's pixels and not in the map's — ` +
        `would state a scale nothing on the page is drawn in.`,
    );
  if (!/--live-inverse:\s*1\s*;/.test(page))
    throw new Error(
      `${at} gives \`--live-inverse\` no resting value of 1, so a page whose script never runs is ` +
        `drawn at whatever the property falls back to.`,
    );
  if (!/\[data-map-fixed\][^{]*\{[^}]*transition:\s*none/.test(page))
    throw new Error(
      `${at} lets [data-map-fixed] take a transition. The camera and the viewBox move in one frame ` +
        `and the marks would be on a second clock, sliding off their own places for the length of ` +
        `every flight.`,
    );

  // 5 — THE SCRIPT ACTUALLY MOVES THE WINDOW, AND ONLY ON `load`.
  if (!/setAttribute\("viewBox"/.test(page))
    throw new Error(
      `${at}'s script never writes the svg's viewBox. The live camera would move under a drawing ` +
        `that stayed exactly where it was — two maps, one box, and no error.`,
    );
  if (
    !/map\.on\("load"/.test(page) ||
    !/classList\.add\("mw-live"\)/.test(page)
  )
    throw new Error(
      `${at} does not reveal the live layer on \`map.on("load")\`. Anything earlier shows the ` +
        `reader a frame the beat did not choose, and anything that fails after it leaves them with ` +
        `an empty box where the map was.`,
    );
  if (/<(?:html|figure)\b[^>]*\bclass="[^"]*\bmw-live\b/.test(page))
    throw new Error(
      `${at} ships \`mw-live\` in the markup. The class is the script's own statement that a live ` +
        `map is up; baked in, it hides the plate for a reader who has no script.`,
    );

  // 6 — THE CONTROLS ARE MAPTILER'S OWN, AND THERE IS NO SECOND SET.
  if (!/\bmaplibregl\b/.test(page))
    throw new Error(
      `${at} does not carry MapLibre. The page would show a plate and call itself live.`,
    );
  if (!/new window\.maplibregl\.NavigationControl\(/.test(page))
    throw new Error(
      `${at} adds no \`NavigationControl\`. The owner's ruling names it: *"utilise les vrais ` +
        `controls de maptiler pas des controls extérieurs"*.`,
    );
  if (/\bdata-nav-do=/.test(page) || /\bclass="nav-pill"/.test(page))
    throw new Error(
      `${at} still ships a bespoke navigation rail (\`data-nav-do\` / \`.nav-pill\`) beside the ` +
        `map's own controls. That is the control the owner refused, and two sets of zoom buttons ` +
        `on one map is worse than either alone.`,
    );

  // 7 — THE SWEEP IS ASSERTED, NOT HOPED FOR — AND IT IS THE CALL THAT IS READ, NOT THE NAME.
  //
  // THIS REFUSAL SHIPPED VACUOUS AND A MUTATION CAUGHT IT. It looked for `assertLiveStyleAnswered(`
  // anywhere in the page; `style.mjs` DEFINES that function and travels into the page as source, so
  // the name is there whether it is called or not. Dropping the call left the refusal perfectly
  // green. What is read now is the one expression `style.mjs`'s own comment asks for —
  // `assert…(apply…(map, …))`, with no second variable for the two to come apart in — so a page
  // that sweeps without asserting cannot satisfy it.
  if (!/assertLiveStyleAnswered\(\s*applyLiveStyle\(/.test(page))
    throw new Error(
      `${at} applies the live style without asserting that it answered. A sweep that matched no ` +
        `water layer leaves MapTiler's own near-grey sea under a fallback painted in the beat's, ` +
        `and nothing reports it. It must read \`assertLiveStyleAnswered(applyLiveStyle(map, …))\` ` +
        `— one expression, so there is no second variable for the two to come apart in.`,
    );
}
