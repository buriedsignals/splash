// twin/skills/map-web/assets/live-locator.ts
//
// THE LOCATOR AS A LIVE MAP — every mark a MapLibre layer over MapTiler's own tiles, and the
// reader's own choice of REMOVE driving the camera.
//
// THE RULING (2026-09-15, the owner, on `proof/web-proportional-symbol-europe-capacity/renders/`):
// *"la map doit prendre toute la largeur quitte à afficher plus de map. Regarde le pilote qu'on a
// produit dans scrolly, c'est presque la même sauf qu'avec web on peut avoir des contrôles, zoom,
// déplacement et hover en plus directement dans MapTiler."* And, on the projection: *"oui une carte
// MapLibre plate pas un globe."* `proof/web-choropleth-europe-lowcarbon` is the arrangement the
// owner then validated, and this file copies its arrangement rather than inventing another.
//
// ─────────────────────────────────────────────────────────────────────────────────────────────
// WHAT THIS IS NOT: `live-choropleth.ts`.
//
// That file paints AREAS read from MapTiler's Countries tileset, joined by ISO A2, and its gesture
// repaints them. This one draws POINTS the beat froze itself — a power station is at a coordinate,
// not in a tileset — and its gesture moves the CAMERA. The two share the two-layer fallback, the
// `beneath: "water"` discipline and the `queryRenderedFeatures` hover, and nothing else.
//
// ─────────────────────────────────────────────────────────────────────────────────────────────
// A PIN IS NOT A MEASUREMENT — `radius: "fixed"`, and on this type it is the only lawful answer.
//
// `shared/map-beat/mount.mjs` names the three things a circle's radius can mean and gives the
// locator's: *"the same screen size at every zoom, exactly as the plate drew it: a locator has no
// magnitude, so there is nothing for a camera to encode."* `types/locator.md` calls sizing a marker
// the one thing that goes wrong with this type — *"sneaks a false data channel into a type that
// explicitly promised not to have one"*. So every circle below carries a literal `circle-radius` in
// screen pixels, identical at every zoom AND at every remove, and the only thing a value is allowed
// to decide is WHICH marks are drawn: the declared priority `types/locator.md` asks for.
//
// ─────────────────────────────────────────────────────────────────────────────────────────────
// THE WORDS INSIDE THE MAP ARE THE BEAT'S, NEVER MAPTILER'S.
//
// There is no `symbol` layer here and there will not be one. MapTiler answers 200 for a font family
// it does not have and serves Noto Sans instead (`KNOWN-STATE.md`, and `style.mjs` keeps a whole
// paragraph on the door it shut). §2 of `references/map-plan.md` says the beat writes every word
// inside the map. So the names are an HTML OVERLAY inside the live box, re-projected on every camera
// move — which means they are set in the direction's own register, cut into the page's own embedded
// faces by the font machine like every other word on the page, and PHOTOGRAPHED INTO THE FROZEN
// FALLBACK, because the fallback is a picture of that box.
//
// THE SCALE BAR IS THE SAME BARGAIN, AND IT IS THIS TYPE'S OWN INSTRUMENT. Its LENGTH is live — set
// from the camera on every move, so the distance it states stays true while the reader zooms. Its
// WORDS are baked, one per remove: a label assembled in the browser is a string whose glyphs were
// never cut into the page's faces, and this format's font machine refuses a page that names a
// character it did not embed.
//
// ─────────────────────────────────────────────────────────────────────────────────────────────
// WHAT WEB MERCATOR COSTS A LOCATOR, WHICH IS NOT WHAT IT COSTS A CHOROPLETH.
//
// A choropleth is read by AREA, so Mercator costs it areas, and the choropleth beat prints that. A
// locator is read by DISTANCE, so Mercator costs it THE SCALE BAR — ground scale runs as
// `cos(latitude)`, a bar that is true at the frame's centre is wrong at its edges, and how wrong is
// a function of the remove. The beat measures that ratio per remove and prints it; this file only
// insists that the number exists (`edgeError`), because a scale bar nobody has measured is a ruler
// nobody has checked.

import { vantageSlugOf, type VantageDeclaration } from "./vantage.ts";

/** Assembled, never written whole: this file's OUTPUT travels into a page that `deliver` rewrites
 *  every occurrence of the placeholder in. A literal here would be rewritten to the key itself and
 *  the "is this page still unkeyed" test would then read "does the style URL contain the key",
 *  which is true of every delivered page — so every delivered map would refuse to boot. */
export const KEY_PLACEHOLDER = "__MAPTILER" + "_KEY__";

/** One drawn thing. `kind` is a CATEGORY and nothing else — `types/locator.md`: colour is category
 *  if the markers are grouped, and there is no other channel this type may open. */
export type LocatorMark = {
  key: string;
  kind: "subject" | "station" | "place";
  lon: number;
  lat: number;
  /** The name drawn beside it, or null for a mark that answers only a pointer. */
  label: string | null;
};

export type LiveLocatorDeclaration = {
  /** The MapTiler style the plate was baked from. The live map loads the same one, so the two
   *  layers cannot be two cartographies. */
  style: string;
  /** The two tints the plate was baked in, and the two the live style is repainted with. */
  tints: { water: string; land: string };
  /** The removes the reader may stand at — the same object the markup's radios are built from, so
   *  the camera and the pills cannot be two ladders. */
  vantage: VantageDeclaration;
  marks: LocatorMark[];
  /** What the pointer answers for each mark key. */
  details: Record<string, string>;
  /** The three treatments, measured by the beat against the LAND the plate actually paints. */
  paint: {
    subject: string;
    subjectRing: string;
    station: string;
    place: string;
    /** What a pointed-at mark becomes — searched off its OWN fill by the beat, never a fixed dose
     *  (the owner refused a fixed dose at 1,104:1 one beat over). One per kind. */
    active: { subject: string; station: string; place: string };
  };
  /** Screen radii, in CSS pixels, identical at every zoom and at every remove. */
  radius: { subject: number; station: number; place: number; ring: number };
  /** The country outlines, drawn from MapTiler's own Countries tileset rather than from a second
   *  shapefile: `style.mjs` refuses a doubled basemap by name, and a locator with no borders at a
   *  continental remove is a field of dots. */
  border: { colour: string; width: number };
  /** The two marks the map draws that are CLOSEST together, and how far apart in degrees. The zoom
   *  CEILING is derived from them and may not be typed — see `fitToRemove` in the script. */
  closest: { a: string; b: string; degrees: number };
  /** MapLibre's own control names, in the page's language: the library ships English defaults and a
   *  French page that leaves them hands a screen reader an English button. */
  locale: { title: string; zoomIn: string; zoomOut: string };
  /** How long the camera takes to travel from one remove to the next, in ms — the same number the
   *  stylesheet cross-fades the frozen pictures over, so the two halves of one gesture move on one
   *  clock rather than on two. */
  changeMs: number;
  /** How wrong the scale bar is between the two edges of the frame, per remove slug. Measured by
   *  the beat; this file only refuses a declaration that carries none. */
  edgeError: Record<string, number>;
};

export function assertLiveLocatorDeclaration(
  d: LiveLocatorDeclaration,
): LiveLocatorDeclaration {
  if (!d || typeof d.style !== "string" || !d.style)
    throw new Error(
      "live-locator: the declaration names no MapTiler style, so the live map and the baked plate " +
        "would be two cartographies",
    );
  for (const key of ["water", "land"] as const)
    if (!/^#[0-9a-fA-F]{6}$/.test(d.tints?.[key] ?? ""))
      throw new Error(
        `live-locator: the ${key} tint is ${JSON.stringify(d.tints?.[key])}; the live style is ` +
          `painted with the plate's own two tints, read back from its geometry.json`,
      );
  if (!d.marks?.length) throw new Error("live-locator: the map draws no marks");
  const byKey = new Map(d.marks.map((mark) => [mark.key, mark]));
  if (byKey.size !== d.marks.length)
    throw new Error("live-locator: two marks share a key — one would answer for the other");
  for (const mark of d.marks) {
    if (!Number.isFinite(mark.lon) || !Number.isFinite(mark.lat))
      throw new Error(
        `live-locator: ${JSON.stringify(mark.key)} is at ` +
          `${JSON.stringify([mark.lon, mark.lat])}. A locator encodes POSITION and nothing else; a ` +
          `mark with no position has nothing left to say.`,
      );
    if (!d.details?.[mark.key])
      throw new Error(
        `live-locator: ${JSON.stringify(mark.key)} is drawn and answers nothing. A mark a reader can ` +
          `point at and get silence from is a mark they read as a place the story forgot.`,
      );
  }
  for (const key of d.vantage?.removes?.flatMap((r) => r.marks) ?? [])
    if (!byKey.has(key))
      throw new Error(
        `live-locator: a remove draws ${JSON.stringify(key)} and no mark carries that key`,
      );
  for (const key of ["subject", "subjectRing", "station", "place"] as const)
    if (!/^#[0-9a-fA-F]{6}$/.test(d.paint?.[key] ?? ""))
      throw new Error(`live-locator: \`paint.${key}\` is ${JSON.stringify(d.paint?.[key])}`);
  for (const key of ["subject", "station", "place"] as const) {
    if (!/^#[0-9a-fA-F]{6}$/.test(d.paint?.active?.[key] ?? ""))
      throw new Error(
        `live-locator: \`paint.active.${key}\` is ${JSON.stringify(d.paint?.active?.[key])}. The ` +
          `shape itself is what answers a pointer (the owner's second arbitration), darkened from ` +
          `ITS OWN fill and searched until a measured separation is cleared.`,
      );
    if (!(d.radius?.[key] > 0))
      throw new Error(
        `live-locator: \`radius.${key}\` is ${JSON.stringify(d.radius?.[key])}. Every radius here is ` +
          `a literal in screen pixels: a locator has no magnitude, so nothing may scale a pin.`,
      );
  }
  if (!(d.radius?.ring > 0))
    throw new Error("live-locator: the subject's ring has no width, so it is not ringed");
  if (!(d.border?.width > 0) || !/^#[0-9a-fA-F]{6}$/.test(d.border?.colour ?? ""))
    throw new Error(
      "live-locator: no border is declared. At a continental remove a locator with no country " +
        "outlines is a field of dots on a blank ground, and the reader has nothing to place them on.",
    );
  if (!d.closest?.a || !d.closest?.b || !(d.closest.degrees > 0))
    throw new Error(
      "live-locator: the zoom ceiling is derived from the two marks that sit closest together, and " +
        "the declaration names none. A ceiling typed instead of derived is a number nobody can " +
        "defend, and a ceiling derived from the WIDTH of the frame is no ceiling at all on a box " +
        "the owner's ruling has already made wider than the subject.",
    );
  for (const key of ["title", "zoomIn", "zoomOut"] as const)
    if (!d.locale?.[key])
      throw new Error(
        `live-locator: MapLibre's ${key} control is left with the library's English default on a ` +
          `French page — a screen reader would read it out in the wrong language`,
      );
  if (!(d.changeMs >= 0))
    throw new Error(
      "live-locator: the camera's travel between two removes needs a duration (the owner's fourth " +
        "arbitration: a state change interpolates rather than jumps). On a map it is not a nicety — " +
        "a camera that teleports leaves the reader unable to tell whether the second frame contains " +
        "the first or is somewhere else entirely.",
    );
  for (const remove of d.vantage.removes) {
    const slug = vantageSlugOf(remove.key);
    if (!(d.edgeError?.[slug] >= 1))
      throw new Error(
        `live-locator: no scale-bar edge error is measured for the remove ${JSON.stringify(slug)}. ` +
          `Web Mercator's ground scale runs as cos(latitude), so a bar true at the centre of the ` +
          `frame is wrong at its edges — a scale bar nobody has measured is a ruler nobody checked, ` +
          `and on this type the ruler is the whole instrument.`,
      );
  }
  return d;
}

const collectionOf = (marks: LocatorMark[]) => ({
  type: "FeatureCollection",
  features: marks.map((mark) => ({
    type: "Feature",
    properties: { k: mark.key },
    geometry: { type: "Point", coordinates: [mark.lon, mark.lat] },
  })),
});

/** The filter one remove puts on every mark layer: a `match` over the keys it draws, built at BUILD
 *  time from the same declaration the markup's rows are built from. */
const drawnFilterFor = (keys: string[]): unknown[] => [
  "match",
  ["get", "k"],
  keys,
  true,
  false,
];

/** THE PLAN THE PAGE CARRIES, as JSON, read back by a script that never met the code that wrote it.
 *  It is a FILE before it is an object, so what is checked here is checked again in the browser. */
export function liveLocatorPlan(d: LiveLocatorDeclaration): Record<string, unknown> {
  assertLiveLocatorDeclaration(d);
  const source = {
    type: "vector",
    url: `https://api.maptiler.com/tiles/countries/tiles.json?key=${KEY_PLACEHOLDER}`,
  };
  const of = (kind: LocatorMark["kind"]) => d.marks.filter((mark) => mark.kind === kind);

  const layers: Record<string, unknown>[] = [
    // THE BORDERS, FROM MAPTILER'S OWN COUNTRIES TILESET — generalised per zoom, which is what makes
    // a four-remove ladder possible at all: a frozen outline good enough for 260 km is a smear at
    // 5 000, and one good enough for 5 000 is a straight line through a river at 260. Drawn BENEATH
    // THE WATER because Countries' coast is coarser than the basemap's own and stands over it
    // otherwise — measured on the scrolly pilot at 1,5–3,6 CSS px.
    {
      id: "mw-borders",
      type: "line",
      beneath: "water",
      source,
      sourceLayer: "administrative",
      filter: ["==", ["get", "level"], 0],
      paint: { "line-color": d.border.colour, "line-width": d.border.width },
      hover: false,
    },
    // THE OTHER STATIONS, then the cities, then the subject: plan order is draw order, and the one
    // mark the map is about may never be painted over by a mark that is only context.
    {
      id: "mw-stations",
      type: "circle",
      data: collectionOf(of("station")),
      paint: {
        "circle-radius": d.radius.station,
        "circle-color": d.paint.station,
        "circle-stroke-width": 0.8,
        "circle-stroke-color": d.tints.land,
      },
      hover: true,
    },
    {
      id: "mw-places",
      type: "circle",
      data: collectionOf(of("place")),
      paint: {
        "circle-radius": d.radius.place,
        "circle-color": d.paint.place,
        "circle-stroke-width": 0.8,
        "circle-stroke-color": d.tints.land,
      },
      hover: true,
    },
    {
      id: "mw-subject",
      type: "circle",
      data: collectionOf(of("subject")),
      paint: {
        "circle-radius": d.radius.subject,
        "circle-color": d.paint.subject,
        "circle-stroke-width": d.radius.ring,
        "circle-stroke-color": d.paint.subjectRing,
      },
      hover: true,
    },
    // WHAT A POINTED-AT MARK BECOMES: the mark itself, re-coloured, drawn in a layer of its own so
    // it is above its neighbours — a darkened dot under the dot beside it answers where the reader
    // is not looking. Filtered to nothing until a pointer lands. NEVER a ring plaqued over the mark:
    // the owner refused that three times, and on this type it would also be a second circle of a
    // different size on a map whose whole promise is that every circle is the same size.
    {
      id: "mw-active",
      type: "circle",
      data: collectionOf(d.marks),
      filter: ["==", ["get", "k"], "--"],
      paint: {
        "circle-radius": [
          "match",
          ["get", "k"],
          of("subject").map((m) => m.key),
          d.radius.subject,
          of("place").map((m) => m.key),
          d.radius.place,
          d.radius.station,
        ],
        "circle-color": [
          "match",
          ["get", "k"],
          of("subject").map((m) => m.key),
          d.paint.active.subject,
          of("place").map((m) => m.key),
          d.paint.active.place,
          d.paint.active.station,
        ],
        "circle-stroke-width": 0.8,
        "circle-stroke-color": d.tints.land,
      },
      hover: false,
    },
  ];

  const removes = d.vantage.removes.map((remove) => ({
    slug: vantageSlugOf(remove.key),
    bounds: [
      [remove.window.west, remove.window.south],
      [remove.window.east, remove.window.north],
    ],
    barKm: remove.barKm,
    drawn: drawnFilterFor(remove.marks),
  }));

  return {
    styleUrl: `https://api.maptiler.com/maps/${d.style}/style.json?key=${KEY_PLACEHOLDER}`,
    styleName: d.style,
    projection: "mercator",
    tints: d.tints,
    changeMs: d.changeMs,
    locale: d.locale,
    closest: d.closest,
    /** Every mark the map draws. What each one ANSWERS is not here: it is the `data-detail` the
     *  table's own row carries, so the page holds one copy of one string and the guard that walks
     *  `[data-detail]` sees the live map's answers as well as the table's. */
    keys: d.marks.map((mark) => mark.key),
    defaultSlug: vantageSlugOf(d.vantage.defaultKey),
    /** The widest remove, which is the reader's own leash: they may pull back to the framing the
     *  page's furthest answer stands at, and no further — past it the map is showing ground this
     *  beat holds no datum for. */
    widestSlug: vantageSlugOf(d.vantage.removes[d.vantage.removes.length - 1].key),
    /** The marks that answer a pointer, by layer — every circle layer, never the borders. */
    markLayers: ["mw-stations", "mw-places", "mw-subject"],
    removes,
    layers,
  };
}

/**
 * THE RULES. Every one of them is conditional on `.mw-live` except the live box's own resting state,
 * so a page whose script never runs is drawn exactly as it was before this file existed.
 */
export function liveLocatorCss({ scope }: { scope: string }): string {
  const live = `.mw-live ${scope}`;
  return [
    // BOTH LAYERS ARE ONE BOX, AND THE BOX IS THE STAGE — the ruling, copied from the validated
    // choropleth rather than re-decided. The format's cell carries the drawing's own viewBox ratio
    // so `preserveAspectRatio="none"` cannot stretch it; neither of these is stretched (the frozen
    // pictures are `slice`, and a live map has no ratio to protect), so both take the whole track
    // instead of the cell inside it, which is how the scrolly sizes its stage.
    `${scope} .map-layer, ${scope} svg.chart { grid-column: 1 / -1; grid-row: 1; width: 100%; height: 100%; min-width: 0; min-height: 0; margin: 0; }`,
    `${scope} .map-layer { visibility: hidden; position: relative; }`,
    `${live} .map-layer { visibility: visible; }`,
    // ONE BASEMAP, NOT TWO. Every frozen picture gives way to MapTiler's own, and only once the live
    // map is actually up: with no script the plates are the whole gesture.
    `${live} [data-plate] { display: none; }`,
    // WITH NO SCRIPT THERE IS NO DESCRIPTION EITHER — a sentence about dragging a map that cannot be
    // dragged is exactly the dead control this arrangement exists not to ship. `[hidden]` is a UA
    // rule, so it is restated as an author rule no author rule can outrank by accident.
    `${scope} .live-hint[hidden] { display: none; }`,
    // THE NAMES INSIDE THE MAP. Absolutely placed and moved only by a transform the script writes
    // from `map.project`: the element's own left/top stay 0, so nothing here is a second coordinate
    // system that could disagree with the camera's.
    // ABOVE MAPLIBRE'S OWN CANVAS, AND THAT IS A MEASUREMENT RATHER THAN A PRECAUTION. The overlay is
    // written into the box BEFORE `new maplibregl.Map()` appends its own container, so in document
    // order MapLibre comes second and paints over it: measured on the first render of this beat, the
    // names and the scale bar were present, laid out, reported visible by `offsetParent` — and
    // invisible in the picture. A z-index above MapLibre's own control layer is what puts the beat's
    // words back on top of the beat's map.
    `${scope} .mw-overlay { position: absolute; inset: 0; pointer-events: none; overflow: hidden; z-index: 3; }`,
    `${scope} .mw-label { position: absolute; left: 0; top: 0; white-space: nowrap; will-change: transform; }`,
    // THE SCALE BAR — this type's own instrument, and the only furniture in the box. Bottom-left,
    // out of the way of MapTiler's own controls at top-right.
    `${scope} .mw-bars { position: absolute; left: 12px; bottom: 12px; }`,
    `${scope} .mw-bar { display: flex; flex-direction: column; gap: 2px; }`,
    `${scope} .mw-bar-line { display: block; height: 0; border-top: 2px solid currentColor; border-left: 2px solid currentColor; border-right: 2px solid currentColor; height: 6px; width: 0; }`,
    // The table follows the gesture too: a row the current remove does not draw says so, in words,
    // in its own cell — never by leaving the table, which would take the reading with it.
    `${scope} tr[data-mark] { transition: background-color 120ms linear; }`,
  ].join("\n\n");
}

/**
 * THE SCRIPT, authored as a classic `<script>` body — no module, no bundler, so it keeps working in
 * a CMS iframe or a sandboxed embed that refuses module scripts. It derives no geometry and formats
 * no WORD: every glyph a reader can be shown was cut into the page's own embedded faces at build
 * time, which is why the details, the control names and the scale-bar labels travel in the markup
 * or in the plan's JSON rather than being assembled here.
 *
 * `styleModule` is `assets/style.mjs`'s own source with its `export` keywords stripped, handed in by
 * the beat: the sweep that decides what a basemap layer becomes is stated ONCE, in that file, and
 * applied twice — to the style document the plate is baked from, and to the live style here.
 */
export function liveLocatorScript(
  d: LiveLocatorDeclaration,
  {
    scope,
    styleModule,
    vantageName,
  }: { scope: string; styleModule: string; vantageName: string },
): string {
  assertLiveLocatorDeclaration(d);
  if (typeof styleModule !== "string" || !/function\s+applyLiveStyle/.test(styleModule))
    throw new Error(
      "live-locator: the style sweep is handed in by the beat (the source of " +
        "`skills/map-web/assets/style.mjs`, with its `export` keywords stripped) because a page " +
        "script cannot import. What it was given does not define `applyLiveStyle`.",
    );
  if (/\bexport\s/.test(styleModule))
    throw new Error(
      "live-locator: the style sweep still carries `export`, which is a syntax error in a classic " +
        "script. The whole live layer would fail to parse and the fallback would stand with no error " +
        "anyone could see — the one failure mode this arrangement cannot report.",
    );
  liveLocatorPlan(d);
  const NAME = JSON.stringify(vantageName);
  const SCOPE = JSON.stringify(scope);
  return `${styleModule}
(function () {
  var doc = document;
  var planNode = doc.getElementById("mw-live-plan");
  if (!planNode) return;
  var PLAN;
  try { PLAN = JSON.parse(planNode.textContent); } catch (err) { return; }
  // THE SENTINEL IS ASSEMBLED IN TWO HALVES, never written whole: delivery substitutes every
  // occurrence of the placeholder in the delivered file, and THIS SCRIPT IS IN THAT FILE.
  var SENTINEL = "__MAPTILER" + "_KEY__";
  if (!PLAN || !PLAN.styleUrl || PLAN.styleUrl.indexOf(SENTINEL) >= 0) return;
  if (!window.maplibregl) return;
  var figure = doc.querySelector(${SCOPE});
  var box = figure && figure.querySelector(".map-layer");
  if (!box) return;
  // THE TOOLTIP IS LOOKED UP LATE, ON PURPOSE. This script is inlined INSIDE the figure and the
  // format writes its "#tooltip" AFTER the figure, so at the moment this runs the element does not
  // exist yet. Captured at init it is null for the life of the page: every hover then lit the mark
  // and said nothing — the shape of a defect that survives every unit test.
  function tip() { return doc.getElementById("tooltip"); }

  // THE PLAN IS VALIDATED BY WHOEVER DRAWS FROM IT. It reached here as JSON, from a render that ran
  // on another machine on another day: nothing the writer checked survived the journey. A duplicate
  // layer id, a missing remove, a plan truncated by a broken render — MapLibre reports none of them,
  // it simply draws a map that is quietly wrong.
  var seen = {};
  for (var i = 0; i < PLAN.layers.length; i++) {
    if (seen[PLAN.layers[i].id])
      throw new Error('two layers share the id "' + PLAN.layers[i].id + '" - MapLibre keeps the first and drops the second without an error');
    seen[PLAN.layers[i].id] = true;
  }
  if (!PLAN.removes || PLAN.removes.length < 2)
    throw new Error("this page's live plan carries fewer than two removes - the pills would move the pictures and leave the camera where it was");
  var REMOVE = {};
  for (var r = 0; r < PLAN.removes.length; r++) REMOVE[PLAN.removes[r].slug] = PLAN.removes[r];
  if (!REMOVE[PLAN.defaultSlug])
    throw new Error("this page's live plan opens on a remove it does not carry");

  // NO PADDING, AND THAT IS NOT A SAVING — IT IS THE SAME CAMERA. Each remove's window is the box
  // the frozen picture for that remove was photographed at; a live fit that padded it would be a
  // second camera, and the swap from picture to live map would be visible as a jump.
  var FIT_PADDING_PX = 0;

  var map = new window.maplibregl.Map({
    container: box,
    style: PLAN.styleUrl,
    bounds: REMOVE[PLAN.defaultSlug].bounds,
    fitBoundsOptions: { padding: FIT_PADDING_PX, animate: false },
    maxZoom: 22,
    attributionControl: false,
    locale: {
      "NavigationControl.ZoomIn": PLAN.locale.zoomIn,
      "NavigationControl.ZoomOut": PLAN.locale.zoomOut,
      "Map.Title": PLAN.locale.title
    }
  });
  window.__mwMap = map;
  // MAPTILER'S OWN CONTROLS, by the owner's instruction — not a rail of buttons beside the map. The
  // compass is off: nothing in this beat rotates, and a control that changes nothing is a dead one.
  map.addControl(new window.maplibregl.NavigationControl({ showCompass: false }), "top-right");

  function waterId() {
    var layers = map.getStyle().layers;
    for (var i = 0; i < layers.length; i++)
      if (styleDecisionFor(layers[i]).tint === "water") return layers[i].id;
    throw new Error("the style carries no water fill for this beat's borders to be drawn beneath, so MapTiler Countries' coarser coast would stand over the basemap's own");
  }

  function mountLayers() {
    var before = waterId();
    for (var i = 0; i < PLAN.layers.length; i++) {
      var layer = PLAN.layers[i];
      var sourceId = "mw-src-" + i;
      if (layer.source) {
        if (!layer.sourceLayer)
          throw new Error('layer "' + layer.id + '" reads a vector source and names no source layer - it would draw nothing, silently');
        map.addSource(sourceId, { type: layer.source.type, url: layer.source.url });
      } else {
        map.addSource(sourceId, { type: "geojson", data: layer.data });
      }
      var spec = { id: layer.id, type: layer.type, source: sourceId, paint: layer.paint };
      if (layer.sourceLayer) spec["source-layer"] = layer.sourceLayer;
      if (layer.filter) spec.filter = layer.filter;
      map.addLayer(spec, layer.beneath === "water" ? before : undefined);
    }
  }

  function currentSlug() {
    var checked = doc.querySelector("input[name=" + ${NAME} + "]:checked");
    return (checked && REMOVE[checked.value]) ? checked.value : PLAN.defaultSlug;
  }

  // WHICH MARKS THIS REMOVE DRAWS. The filter is built at BUILD time from the same declaration the
  // table's own rows are built from, so the picture and the table cannot answer two different
  // questions — the crossing assertVantageReachesTheLayers is written for.
  function drawRemove(slug) {
    var remove = REMOVE[slug];
    if (!remove) return;
    for (var i = 0; i < PLAN.markLayers.length; i++)
      if (map.getLayer(PLAN.markLayers[i])) map.setFilter(PLAN.markLayers[i], remove.drawn);
    figure.setAttribute("data-live-remove", slug);
  }

  map.on("style.load", function () {
    // A FLAT WEB MERCATOR MAP (the owner, 2026-09-15: "oui une carte MapLibre plate pas un globe").
    if (map.setProjection) map.setProjection({ type: PLAN.projection || "mercator" });
    // The trunk's own sweep, ASSERTED rather than assumed: a sweep that re-tinted nothing did not
    // find the style it was written against, and the reader would keep the provider's own water
    // under pictures painted in the beat's, with nothing to say so.
    assertLiveStyleAnswered(applyLiveStyle(map, { tints: PLAN.tints }), PLAN.styleName || PLAN.styleUrl);
    mountLayers();
    drawRemove(currentSlug());
  });

  // ─────────────────────────────────────────────────────────────────────────────────────────
  // THE OVERLAY. Every name the beat writes inside the map, re-projected on every camera move —
  // never a MapTiler symbol layer, which would hand the typography to the provider (and MapTiler
  // answers 200 for a family it does not have and serves Noto Sans).
  var labels = [];
  var nodes = figure.querySelectorAll(".mw-label");
  for (var n = 0; n < nodes.length; n++) {
    var at = (nodes[n].getAttribute("data-at") || "").split(",");
    labels.push({ el: nodes[n], lngLat: [parseFloat(at[0]), parseFloat(at[1])] });
  }
  var bars = figure.querySelectorAll(".mw-bar-line");

  function placeOverlay() {
    for (var i = 0; i < labels.length; i++) {
      var p = map.project(labels[i].lngLat);
      labels[i].el.style.transform = "translate(" + Math.round(p.x) + "px," + Math.round(p.y) + "px)";
    }
    // THE BAR'S LENGTH IS LIVE AND ITS WORDS ARE BAKED. Measured on the map itself rather than from
    // a formula: two points a hundred pixels apart across the middle of the canvas, unprojected,
    // and the great-circle distance between them. That is the scale the reader is actually looking
    // at, at the latitude they are actually looking at it.
    var c = map.getCanvas();
    var y = c.clientHeight / 2;
    var a = map.unproject([c.clientWidth / 2 - 50, y]);
    var b = map.unproject([c.clientWidth / 2 + 50, y]);
    var kmPerPx = a.distanceTo(b) / 1000 / 100;
    for (var j = 0; j < bars.length; j++) {
      var km = parseFloat(bars[j].getAttribute("data-km"));
      if (!(kmPerPx > 0) || !(km > 0)) continue;
      bars[j].style.width = Math.round(km / kmPerPx) + "px";
    }
  }

  // THE READER'S LEASH, and neither end of it is typed.
  //
  // THE FLOOR IS THE WIDEST REMOVE THE PAGE ARGUES FOR. A reader may pull back to the furthest
  // answer the beat publishes and no further: past it the map is showing ground this beat holds no
  // datum about, and the frozen picture under it shows none of it either.
  //
  // THE CEILING IS WHERE THE TWO CLOSEST MARKS COME APART. Two pins that share a pixel are one pin
  // as far as a reader is concerned, and no declutter separates them — only a camera can. So the
  // ceiling is the zoom at which those two stand a pin's width plus a gutter apart, derived from
  // their own separation in degrees and from the radius the pins are actually drawn at.
  var leashed = false;
  function leash() {
    if (leashed) return;
    // THE OUTER VIEW IS FITTED FIRST, AND THE LEASH IS THE VIEW RATHER THAN THE WINDOW. Set from the
    // declared window, setMaxBounds jams the camera into a corner the moment the fitted view is
    // WIDER than that window — which it always is here, because the format hands the plot the
    // figure's whole width and a near-square window fitted into a 3:1 box is height-bound and spills
    // in longitude. Measured on the first render of this beat: at the widest remove the map came
    // back showing north-western Europe with the subject off the frame entirely, and nothing was
    // red. So the widest remove is fitted, the view that RESULTS is the leash, and the reader can
    // reach every remove the page argues for and nothing past it.
    map.setMaxBounds(null);
    map.setMinZoom(-2);
    fitToRemove(PLAN.widestSlug, false);
    var outerZoom = map.getZoom();
    var outer = map.getBounds();
    var outerSpan = Math.abs(outer.getEast() - outer.getWest());
    map.setMinZoom(outerZoom);
    // THE CEILING IS WHERE THE TWO CLOSEST MARKS COME APART. Two pins that share a pixel are one pin
    // as far as a reader is concerned, and no declutter separates them — only a camera can. Derived
    // from their own separation in degrees and from the radius the pins are actually drawn at, at a
    // camera whose span has just been measured rather than guessed.
    var px = (PLAN.closest.degrees / outerSpan) * map.getCanvas().clientWidth;
    var need = ${d.radius.station * 2 + 8};
    map.setMaxZoom(outerZoom + Math.max(Math.log2(need / Math.max(px, 0.01)), 0));
    if (outerSpan < 360) map.setMaxBounds(outer);
    figure.setAttribute("data-live-leash", outerZoom.toFixed(3) + ".." + map.getMaxZoom().toFixed(3));
    leashed = true;
  }

  function fitToRemove(slug, animate) {
    var remove = REMOVE[slug];
    if (!remove) return;
    map.fitBounds(remove.bounds, { padding: FIT_PADDING_PX, animate: !!animate, duration: PLAN.changeMs });
  }

  map.on("load", function () {
    var plates = figure.querySelectorAll("[data-plate]");
    for (var i = 0; i < plates.length; i++) plates[i].setAttribute("aria-hidden", "true");
    doc.documentElement.classList.add("mw-live");
    var hint = figure.querySelector(".live-hint");
    if (hint) hint.hidden = false;
    map.resize();
    leash();
    fitToRemove(currentSlug(), false);
    placeOverlay();
  });
  map.on("move", placeOverlay);
  map.on("render", placeOverlay);
  // AND THE STAGE CAN CHANGE SIZE WITHOUT THE WINDOW, which MapLibre never hears about. The figure
  // is a flex column with a header whose height settles when its faces load, and this box is the one
  // shrinkable item in it: measured on the choropleth while baking its frozen fallback, the camera
  // was fitted for a 1112 px box, the box then settled at 520, and the picture came back showing
  // half the latitude the page claims, with nothing red. A MapLibre "resize" event fires only when
  // MapLibre resizes ITSELF, so the observer is what turns a settling layout into a re-fit.
  if (window.ResizeObserver)
    new window.ResizeObserver(function () {
      if (!doc.documentElement.classList.contains("mw-live")) return;
      map.resize();
      fitToRemove(currentSlug(), false);
      placeOverlay();
    }).observe(box);

  // THE CONTROL. One listener on the document rather than one per radio: the pills are real radios
  // in a real fieldset, so "change" bubbles and nothing here counts them.
  doc.addEventListener("change", function (event) {
    if (!event.target || event.target.name !== ${NAME}) return;
    hide();
    drawRemove(event.target.value);
    fitToRemove(event.target.value, true);
  });

  // THE POINTER IS RESOLVED ON THE LAYER'S OWN FEATURES, never on a collision test of ours: the
  // circle answers wherever it is drawn, and it keeps answering after a zoom, after a pan and after
  // a change of remove, because there is no coordinate read once at initialisation to go stale.
  // That is the trap this tree has paid for three times.
  var hovering = null;
  function rowFor(key) { return figure.querySelector('tr[data-mark="' + key + '"]'); }
  function detailFor(key) { var row = rowFor(key); return row && row.getAttribute("data-detail"); }
  var NOTHING = ["==", ["get", "k"], "--"];
  function hide() {
    hovering = null;
    var tooltip = tip();
    if (tooltip) tooltip.hidden = true;
    if (map.getLayer("mw-active")) map.setFilter("mw-active", NOTHING);
    var lit = figure.querySelectorAll("tr[data-mark].mark-active");
    for (var i = 0; i < lit.length; i++) lit[i].classList.remove("mark-active");
  }
  function place(event) {
    var tooltip = tip();
    if (!tooltip || tooltip.hidden) return;
    var e = event && event.originalEvent;
    if (!e) return;
    var pad = 14;
    var x = Math.min(e.clientX + pad, window.innerWidth - tooltip.offsetWidth - 8);
    var y = Math.min(e.clientY + pad, window.innerHeight - tooltip.offsetHeight - 8);
    tooltip.style.left = Math.max(8, x) + "px";
    tooltip.style.top = Math.max(8, y) + "px";
  }
  function show(key, event) {
    if (key !== hovering) {
      hovering = key;
      if (map.getLayer("mw-active")) map.setFilter("mw-active", ["==", ["get", "k"], key]);
      var rows = figure.querySelectorAll("tr[data-mark]");
      for (var i = 0; i < rows.length; i++)
        rows[i].classList.toggle("mark-active", rows[i].getAttribute("data-mark") === key);
      var tooltip = tip();
      if (tooltip) { tooltip.textContent = detailFor(key); tooltip.hidden = false; }
    }
    place(event);
  }
  map.on("mousemove", function (event) {
    var live = [];
    for (var i = 0; i < PLAN.markLayers.length; i++)
      if (map.getLayer(PLAN.markLayers[i])) live.push(PLAN.markLayers[i]);
    var hits = map.queryRenderedFeatures(event.point, { layers: live });
    var key = hits.length && hits[0].properties ? hits[0].properties.k : null;
    if (!key || !detailFor(key)) { map.getCanvas().style.cursor = ""; hide(); return; }
    map.getCanvas().style.cursor = "pointer";
    show(key, event);
  });
  map.on("mouseout", hide);
  map.on("movestart", hide);
})();`;
}

/**
 * THE GUARD THAT READS THE WRITTEN PAGE BACK — the half no declaration-level check can make.
 *
 * `assertOneVantage` (in `vantage.ts`) holds the MARKUP's half of the gesture: the frozen picture,
 * the legend line and the scale bar for every remove, and the source order that swaps them. This one
 * holds the LAYERS' half against the same page, which is the crossing this architecture created — a
 * page whose pills swap pictures the live map does not agree with is a page where the reader, with
 * script, sees one answer and, without it, another. Neither guard alone can see that, because each
 * reads only its own mechanism.
 *
 * AND IT DERIVES THE EXPECTED ANSWER FROM THE MARKUP, NEVER FROM THE OBJECT THE PLAN WAS BUILT FROM.
 * That is the lesson the choropleth paid for: its first version compared the plan's expressions
 * against the very object they were built from, and a mutation that mis-classed a country passed it
 * GREEN because both sides were wrong together. Here the expected key list per remove is rebuilt off
 * the TABLE'S OWN ROWS — `data-mark` plus `data-vantage` — which is a genuinely separate path from
 * the plan's JSON.
 */
export function assertVantageReachesTheLayers(
  html: string,
  d: LiveLocatorDeclaration,
  plateStyle: string,
  { where = "this page" }: { where?: string } = {},
): void {
  assertLiveLocatorDeclaration(d);
  const page = String(html);
  const node = /<script[^>]+id="mw-live-plan"[^>]*>([\s\S]*?)<\/script>/.exec(page);
  if (!node)
    throw new Error(
      `${where}: the page carries no live plan, so its map is a picture and its control moves the ` +
        `frozen pictures only`,
    );
  let plan: any;
  try {
    plan = JSON.parse(node[1]);
  } catch (err) {
    throw new Error(
      `${where}: the live plan in the page is not JSON — MapLibre would never boot and the fallback ` +
        `would stand with nothing to say why`,
    );
  }
  if (
    page.indexOf(
      `https://api.maptiler.com/maps/${d.style}/style.json?key=${KEY_PLACEHOLDER}`,
    ) < 0
  )
    throw new Error(
      `${where}: the committed page does not carry the delivery placeholder in its style URL — a ` +
        `real key has reached a file in the repository`,
    );
  if (d.style !== plateStyle || plan.styleName !== plateStyle)
    throw new Error(
      `${where}: the live map loads the MapTiler style ${JSON.stringify(plan.styleName)} and the ` +
        `plate this beat's camera facts come from was baked from ${JSON.stringify(plateStyle)}. The ` +
        `two layers are one cartography or they are a visible swap.`,
    );

  // THE TABLE'S OWN ANSWER, rebuilt from the written markup: which removes draw which mark.
  const wanted = new Map<string, Set<string>>();
  for (const tag of page.matchAll(/<tr\b[^>]*>/g)) {
    const mark = /\sdata-mark="([^"]*)"/.exec(tag[0]);
    const removes = /\sdata-vantage="([^"]*)"/.exec(tag[0]);
    if (!mark) continue;
    if (!removes)
      throw new Error(
        `${where}: the row for ${JSON.stringify(mark[1])} carries no data-vantage, so the table ` +
          `cannot say at which removes that mark is drawn and this guard has nothing to hold the ` +
          `live plan against`,
      );
    for (const slug of removes[1].split(/\s+/).filter(Boolean)) {
      if (!wanted.has(slug)) wanted.set(slug, new Set());
      wanted.get(slug)!.add(mark[1]);
    }
  }
  if (wanted.size === 0)
    throw new Error(`${where}: the page carries no table rows to hold the live plan against`);

  for (const remove of plan.removes ?? []) {
    const expression = remove.drawn;
    if (!Array.isArray(expression) || expression[0] !== "match")
      throw new Error(
        `${where}: the remove ${JSON.stringify(remove.slug)} carries no key filter, so the live map ` +
          `would draw every mark at every remove while the frozen pictures under it draw the right ` +
          `ones — one control, two maps.`,
      );
    const drawn = new Set<string>(expression[2] as string[]);
    const want = wanted.get(remove.slug);
    if (!want)
      throw new Error(
        `${where}: the live plan carries the remove ${JSON.stringify(remove.slug)} and no table row ` +
          `is drawn at it`,
      );
    const missing = [...want].filter((key) => !drawn.has(key));
    const extra = [...drawn].filter((key) => !want.has(key));
    if (missing.length || extra.length)
      throw new Error(
        `${where}: at the remove ${JSON.stringify(remove.slug)} the live map draws ` +
          `${drawn.size} mark(s) and the table says ${want.size}` +
          `${missing.length ? ` — missing ${missing.join(", ")}` : ""}` +
          `${extra.length ? ` — extra ${extra.join(", ")}` : ""}. Two derivations of one framing is ` +
          `how the picture answers one question and the words beside it answer the one before it.`,
      );
  }
  if ((plan.removes ?? []).length !== wanted.size)
    throw new Error(
      `${where}: the live plan carries ${(plan.removes ?? []).length} remove(s) and the table names ` +
        `${wanted.size}`,
    );

  if (!/class="map-layer"/.test(page))
    throw new Error(`${where}: the page carries a live plan and no box to draw it in`);
  if (!/<p class="live-hint" hidden/.test(page))
    throw new Error(
      `${where}: the sentence describing the live map's controls is not hidden in the delivered ` +
        `markup. With JavaScript off it is a description of a map that cannot be dragged — the dead ` +
        `control this arrangement exists not to ship.`,
    );
  if (/"type":\s*"symbol"/.test(node[1]))
    throw new Error(
      `${where}: the live plan carries a MapTiler symbol layer. Every word inside this map is the ` +
        `beat's own, set in the direction's register and cut into the page's embedded faces — ` +
        `MapTiler answers 200 for a family it does not have and serves Noto Sans, with nothing to ` +
        `say so.`,
    );
}
