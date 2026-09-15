// twin/skills/map-web/assets/live-hex.ts
//
// THE HEX CARTOGRAM AS A LIVE MAP — every cell, every outline and every label a MapLibre layer over
// MapTiler's own tiles.
//
// THE RULING (2026-09-15, the owner, validated on `proof/web-choropleth-europe-lowcarbon/`): the map
// takes the whole width of the figure, zoom / pan / hover come from MapTiler rather than from a
// collision test of ours, the projection is flat Web Mercator and not a globe, and under the live
// map there is always a frozen second layer because MapTiler invalidates ALL of an account's keys at
// 100 % of its spending limit. `live-choropleth.ts` is the pattern; this file is the same
// architecture for a geometry that is NOT the provider's.
//
// ─────────────────────────────────────────────────────────────────────────────────────────────
// WHAT IS DIFFERENT FROM `live-choropleth.ts`, AND IT IS THE WHOLE REASON THIS FILE EXISTS.
//
// A choropleth's marks ARE MapTiler's Countries tiles, joined by `iso_a2`. A hex cartogram has no
// geography at all: its geometry IS the data — thirty-two equal cells at seats somebody drew. So
// there is no tileset to join to and nothing to filter; the beat hands over its own polygons as
// GeoJSON, built in WEB MERCATOR METRES and unprojected to lon/lat, which is what keeps every cell
// exactly congruent on the screen at every zoom. A grid laid out in DEGREES would be drawn taller in
// the north than in the south, and six equal edges is the entire purchase of this type.
//
// AND THE CELLS ARE DRAWN OVER THE BASEMAP, not beneath its water. The choropleth's fills go under
// the sea because they are the provider's own coarser coast and must not stand over the finer one.
// These cells are not geography, they are the argument, and the geography beneath them is what the
// type sheet says a cartogram HIDES — the real Europe around the grid is the reader's reminder of
// what was given up.
//
// ─────────────────────────────────────────────────────────────────────────────────────────────
// THE LABELS ARE MAPLIBRE SYMBOL LAYERS IN THE PAGE'S OWN FACES, which is a measurement rather than
// a compromise. MapTiler Cloud serves eighteen families and answers 200 WITH NOTO SANS for every
// other name — the same 83 352 bytes, with nothing to say so. Seventeen of the eighteen are Google
// Fonts, and `shared/design-base/resolve-families.mjs` resolves this tree's registers onto Google
// Fonts: measured on the three filed directions, every family a cell label needs (Open Sans,
// Montserrat, Merriweather) is one MapTiler serves. So the map's type and the page's type are the
// SAME face rather than cousins. The beat probes the glyph range and refuses the Noto sentinel
// instead of trusting it, because a silent 200 is the failure mode.
//
// ─────────────────────────────────────────────────────────────────────────────────────────────
// WHAT THE ARCHITECTURE COSTS THE GESTURE. The grain was pure CSS over SSR'd SVG. No stylesheet
// reaches a MapLibre layer, so the map's half is now script: one `setPaintProperty` and one
// `setLayoutProperty` per grain, over expressions built at BUILD time from the same pooled classes
// the markup carries. What a reader with no script keeps is the frozen picture, the legend (which is
// the same under every grain — that is this vocabulary's whole distinction from `classing.ts`), the
// derived sentence, and the value table whose own swatches still re-shade in pure CSS. The gesture
// moved from the picture to the table; it did not disappear.

import { poolSlugOf, pooledClasses, type PoolDeclaration } from "./pool.ts";

/** Assembled, never written whole: delivery rewrites every occurrence of the placeholder in the
 *  delivered file, and this file's output travels inside it. */
export const KEY_PLACEHOLDER = "__MAPTILER" + "_KEY__";

/** The Noto Sans range MapTiler answers with for a family it does not have. Measured 2026-09-12 and
 *  again here: Futura, Avenir Next and "Open Sans Semibold" all come back as these exact bytes. */
export const NOTO_SENTINEL_BYTES = 83352;

export type LiveHexCell = {
  /** The unit's code — the join key, the label, and what a pointer answers on. */
  code: string;
  /** The cell's hexagon, in lon/lat, closed ring. Built in Mercator metres by the beat. */
  ring: [number, number][];
  /** Outside the measure: drawn, named, pooled by nothing. */
  isOrigin: boolean;
  /** One printed magnitude per grain slug, plus its class — the same two the markup prints. */
  figures: Record<string, { text: string; klass: number }>;
};

export type LiveHexDeclaration = {
  style: string;
  tints: { water: string; land: string };
  /** The box the camera fits at load — the grid's own extent, so the frozen picture and the live map
   *  are one camera rather than two that agree today. */
  studyBounds: { west: number; east: number; south: number; north: number };
  cells: LiveHexCell[];
  /** The block outline, one feature per (grain, segment). Empty for a grain that is a moving window:
   *  overlapping windows have no boundary, and a drawn one would be a partition that is not there. */
  seams: { grain: string; line: [number, number][] }[];
  /** Grain slugs in the order the control offers them, and the one the page opens on. */
  slugs: string[];
  defaultSlug: string;
  /** Per class: the fill, the fill a pointed-at cell becomes, and the ink its label is written in. */
  ramp: string[];
  activeRamp: string[];
  inkRamp: string[];
  /** The seat outside the count: the ground itself, an empty seat with an outline that clears the
   *  non-text floor. Held there by the beat's own separation refusal. */
  origin: {
    fill: string;
    active: string;
    ink: string;
    edge: string;
    text: string;
  };
  /** The hairline between two cells, and the block outline's own ink and width. */
  cellEdge: string;
  seam: { ink: string; width: number };
  /** The two symbol layers: family and weight resolved to a stack MapTiler really serves. */
  labels: {
    code: { font: string; size: number; offsetEm: number };
    value: { font: string; size: number; offsetEm: number };
  };
  /** What a pointer answers for each code. */
  details: Record<string, string>;
  locale: { title: string; zoomIn: string; zoomOut: string };
  /** How long a cell takes to run from one grain's class to the next — the same number the table's
   *  swatches are given, so the two halves of the gesture cross together. */
  changeMs: number;
};

export function assertLiveHexDeclaration(
  d: LiveHexDeclaration,
): LiveHexDeclaration {
  const say = (message: string) => {
    throw new Error(`live-hex: ${message}`);
  };
  if (!d || typeof d.style !== "string" || !d.style)
    say(
      "the declaration names no MapTiler style, so the live map and the frozen picture would be two cartographies",
    );
  for (const key of ["water", "land"] as const)
    if (!/^#[0-9a-fA-F]{6}$/.test(d.tints?.[key] ?? ""))
      say(
        `the ${key} tint is ${JSON.stringify(d.tints?.[key])}; the live style is painted with the two tints the frozen picture was taken in`,
      );
  const b = d.studyBounds;
  if (!b || !(b.west < b.east) || !(b.south < b.north))
    say(
      `the study bounds are ${JSON.stringify(b)} — \`fitBounds\` answers an inverted box by framing the rest of the world`,
    );
  if (!d.cells?.length)
    say(
      "no cell is declared, so the live map would draw the basemap and nothing else",
    );
  if (!d.slugs?.length || !d.slugs.includes(d.defaultSlug))
    say(
      `the page opens on the grain ${JSON.stringify(d.defaultSlug)} and the declaration carries ${JSON.stringify(d.slugs)}`,
    );
  const seen = new Set<string>();
  for (const cell of d.cells) {
    if (seen.has(cell.code))
      say(
        `${cell.code} is declared twice — MapLibre would answer a pointer with whichever it drew second`,
      );
    seen.add(cell.code);
    if (!Array.isArray(cell.ring) || cell.ring.length < 7)
      say(
        `${cell.code} carries ${cell.ring?.length ?? 0} vertices. A hexagon is six plus the closing one, in lon/lat`,
      );
    const [fx, fy] = cell.ring[0];
    const [lx, ly] = cell.ring[cell.ring.length - 1];
    if (fx !== lx || fy !== ly)
      say(
        `${cell.code}'s ring does not close. MapLibre closes it for you and the seat stops being congruent with its neighbours`,
      );
    for (const slug of d.slugs) {
      const figure = cell.figures?.[slug];
      if (!figure || typeof figure.text !== "string" || !figure.text)
        say(
          `${cell.code} prints nothing under the grain ${JSON.stringify(slug)} — a cell that goes blank when a pill is pressed reads as a cell with no reading`,
        );
      if (
        !cell.isOrigin &&
        !(figure.klass >= 0 && figure.klass < d.ramp.length)
      )
        say(
          `${cell.code} is class ${JSON.stringify(figure.klass)} under ${JSON.stringify(slug)} and the ramp has ${d.ramp.length} steps`,
        );
    }
    if (!d.details?.[cell.code])
      say(
        `${cell.code} is drawn and answers nothing. A cell a reader can point at and get silence from is a cell they read as having no data`,
      );
  }
  for (const list of ["ramp", "activeRamp", "inkRamp"] as const)
    if (!d[list]?.length || d[list].length !== d.ramp.length)
      say(
        `\`${list}\` and \`ramp\` must be the same length — one class, one fill, one pointed-at fill and one ink`,
      );
  for (const key of ["title", "zoomIn", "zoomOut"] as const)
    if (!d.locale?.[key])
      say(
        `MapLibre's ${key} control is left with the library's English default on a French page`,
      );
  for (const which of ["code", "value"] as const) {
    const label = d.labels?.[which];
    if (!label?.font || !(label.size > 0))
      say(
        `the ${which} label names no served fontstack and no size. MapTiler answers 200 WITH NOTO SANS for a family it does not have, so a stack is probed and named, never assumed`,
      );
  }
  if (!(d.changeMs >= 0))
    say(
      "the class change needs a duration (the owner's fourth arbitration: a state change interpolates rather than jumps)",
    );
  return d;
}

const CELLS_SOURCE = "mw-cells";
const SEAMS_SOURCE = "mw-seams";

const byCode = <T>(
  d: LiveHexDeclaration,
  pick: (cell: LiveHexCell) => T,
  fallback: T,
): unknown[] => [
  "match",
  ["get", "code"],
  ...d.cells.flatMap((cell) => [[cell.code], pick(cell)] as unknown[]),
  fallback,
];

const fillFor = (d: LiveHexDeclaration, slug: string) =>
  byCode(
    d,
    (c) => (c.isOrigin ? d.origin.fill : d.ramp[c.figures[slug].klass]),
    d.tints.land,
  );
const activeFor = (d: LiveHexDeclaration, slug: string) =>
  byCode(
    d,
    (c) => (c.isOrigin ? d.origin.active : d.activeRamp[c.figures[slug].klass]),
    d.tints.land,
  );
const inkFor = (d: LiveHexDeclaration, slug: string) =>
  byCode(
    d,
    (c) => (c.isOrigin ? d.origin.ink : d.inkRamp[c.figures[slug].klass]),
    d.tints.land,
  );

/** The cell geometry, as a FeatureCollection. Every grain's printed magnitude travels as a property
 *  so the value layer changes grain with one `text-field` swap and no re-source. */
function cellCollection(d: LiveHexDeclaration) {
  return {
    type: "FeatureCollection",
    features: d.cells.map((cell) => ({
      type: "Feature",
      properties: {
        code: cell.code,
        origin: cell.isOrigin ? 1 : 0,
        ...Object.fromEntries(
          d.slugs.map((slug) => [`v_${slug}`, cell.figures[slug].text]),
        ),
      },
      geometry: { type: "Polygon", coordinates: [cell.ring] },
    })),
  };
}

function seamCollection(d: LiveHexDeclaration) {
  return {
    type: "FeatureCollection",
    features: (d.seams ?? []).map((seam) => ({
      type: "Feature",
      properties: { grain: seam.grain },
      geometry: { type: "LineString", coordinates: seam.line },
    })),
  };
}

/** THE PLAN THE PAGE CARRIES, as JSON, read back by a script that never met the code that wrote it. */
export function liveHexPlan(d: LiveHexDeclaration): Record<string, unknown> {
  assertLiveHexDeclaration(d);
  const opening = d.defaultSlug;
  const layers: Record<string, unknown>[] = [
    // THE CELLS. One fill layer repainted per grain, not one layer per class: the reader changes
    // grain with a click, and one layer is one place a colour is decided.
    {
      id: "mw-cells",
      type: "fill",
      source: CELLS_SOURCE,
      paint: { "fill-color": fillFor(d, opening), "fill-opacity": 1 },
      hover: true,
    },
    // THE HAIRLINE BETWEEN TWO SEATS, so a run of cells in one class is still a run of cells.
    {
      id: "mw-cell-edge",
      type: "line",
      source: CELLS_SOURCE,
      paint: {
        "line-color": [
          "case",
          ["==", ["get", "origin"], 1],
          d.origin.edge,
          d.cellEdge,
        ],
        "line-width": 2,
      },
      hover: false,
    },
    // WHAT A POINTED-AT CELL BECOMES — a layer of its own, above its neighbours, because a darkened
    // cell under the cell beside it answers where the reader is not looking. Filtered to nothing
    // until a pointer lands. The shape itself is what answers (the owner's second arbitration).
    {
      id: "mw-active",
      type: "fill",
      source: CELLS_SOURCE,
      filter: ["==", ["get", "code"], "--"],
      paint: { "fill-color": activeFor(d, opening), "fill-opacity": 1 },
      hover: false,
    },
    // THE BLOCK OUTLINE. Every grain's segments are in the source at once and it is `line-opacity`
    // that moves, so the element set never changes and the appearance interpolates rather than jumps.
    {
      id: "mw-seam",
      type: "line",
      source: SEAMS_SOURCE,
      paint: {
        "line-color": d.seam.ink,
        "line-width": d.seam.width,
        "line-opacity": ["case", ["==", ["get", "grain"], opening], 1, 0],
      },
      hover: false,
    },
    // THE CODE IS FURNITURE: written once, identical under every grain, and the type sheet's own
    // rule — a cell too narrow to hold it is a refusal, not a smaller type size.
    {
      id: "mw-code",
      type: "symbol",
      source: CELLS_SOURCE,
      layout: {
        "text-field": ["get", "code"],
        "text-font": [d.labels.code.font],
        "text-size": d.labels.code.size,
        "text-offset": [0, d.labels.code.offsetEm],
        // NO LABEL MAY BE DROPPED. MapLibre's default placement hides a label that collides, and a
        // cell whose code is gone is a cell this type no longer names. The build-time refusal is
        // what keeps them from colliding; this makes a collision visible instead of silent.
        "text-allow-overlap": true,
        "text-ignore-placement": true,
      },
      paint: { "text-color": inkFor(d, opening) },
      hover: false,
    },
    // THE NUMBER: one property per grain on the same feature, and the layer swaps which one it
    // reads. Digits cannot interpolate and this does not pretend they can.
    {
      id: "mw-value",
      type: "symbol",
      source: CELLS_SOURCE,
      layout: {
        "text-field": ["get", `v_${opening}`],
        "text-font": [d.labels.value.font],
        "text-size": d.labels.value.size,
        "text-offset": [0, d.labels.value.offsetEm],
        "text-allow-overlap": true,
        "text-ignore-placement": true,
      },
      paint: { "text-color": inkFor(d, opening) },
      hover: false,
    },
  ];

  return {
    styleUrl: `https://api.maptiler.com/maps/${d.style}/style.json?key=${KEY_PLACEHOLDER}`,
    styleName: d.style,
    projection: "mercator",
    tints: d.tints,
    studyBounds: d.studyBounds,
    changeMs: d.changeMs,
    locale: d.locale,
    defaultSlug: d.defaultSlug,
    slugs: d.slugs,
    sources: {
      [CELLS_SOURCE]: cellCollection(d),
      [SEAMS_SOURCE]: seamCollection(d),
    },
    /** One repaint per grain, keyed by the slug the radio's own value carries — one vocabulary, three
     *  readers (the radio, the stylesheet, this plan), which is what keeps the table and the map from
     *  answering two different partitions. */
    fills: Object.fromEntries(d.slugs.map((slug) => [slug, fillFor(d, slug)])),
    actives: Object.fromEntries(
      d.slugs.map((slug) => [slug, activeFor(d, slug)]),
    ),
    inks: Object.fromEntries(d.slugs.map((slug) => [slug, inkFor(d, slug)])),
    /** The narrowest cell, in degrees of longitude at the equator's scale — the zoom ceiling is
     *  derived from it in the browser, where the container's width is finally known. */
    layers,
    cellSpanDeg: Math.max(
      ...d.cells.map(
        (c) =>
          Math.max(...c.ring.map((p) => p[0])) -
          Math.min(...c.ring.map((p) => p[0])),
      ),
    ),
  };
}

/**
 * THE RULES. Every one of them is conditional on `.mw-live` except the live box's own resting state,
 * so a page whose script never runs is drawn exactly as it was before this file existed.
 */
export function liveHexCss({ scope }: { scope: string }): string {
  const live = `.mw-live ${scope}`;
  return [
    // BOTH LAYERS ARE ONE BOX, AND THE BOX IS THE STAGE — the ruling. The format's cell carries the
    // drawing's own viewBox ratio so `preserveAspectRatio="none"` cannot stretch it; neither of these
    // two is stretched (the frozen picture is `slice`, and a live map has no ratio to protect), so
    // both take the whole track instead of the cell inside it.
    `${scope} .map-layer, ${scope} svg.chart { grid-column: 1 / -1; grid-row: 1; width: 100%; height: 100%; min-width: 0; min-height: 0; margin: 0; }`,
    `${scope} .map-layer { visibility: hidden; }`,
    `${live} .map-layer { visibility: visible; }`,
    `${live} [data-plate] { display: none; }`,
    // WITH NO SCRIPT THERE IS NO DESCRIPTION EITHER — a sentence about dragging a map that cannot be
    // dragged is the dead control this arrangement exists not to ship.
    `${scope} .live-hint[hidden] { display: none; }`,
    `${scope} tr[data-mark] { transition: background-color 120ms linear; }`,
  ].join("\n\n");
}

/**
 * THE SCRIPT, authored as a classic `<script>` body — no module, no bundler, so it keeps working in
 * a CMS iframe or a sandboxed embed that refuses module scripts. `styleModule` is
 * `assets/style.mjs`'s own source with its `export` keywords stripped, handed in by the beat: the
 * sweep that decides what a basemap layer becomes is stated ONCE and applied twice.
 */
export function liveHexScript(
  d: LiveHexDeclaration,
  {
    scope,
    styleModule,
    poolName,
  }: { scope: string; styleModule: string; poolName: string },
): string {
  assertLiveHexDeclaration(d);
  if (
    typeof styleModule !== "string" ||
    !/function\s+applyLiveStyle/.test(styleModule)
  )
    throw new Error(
      "live-hex: the style sweep is handed in by the beat (the source of `skills/map-web/assets/" +
        "style.mjs`, with its `export` keywords stripped) because a page script cannot import. What " +
        "it was given does not define `applyLiveStyle`.",
    );
  if (/\bexport\s/.test(styleModule))
    throw new Error(
      "live-hex: the style sweep still carries `export`, which is a syntax error in a classic " +
        "script. The whole live layer would fail to parse and the frozen picture would stand with no " +
        "error anyone could see — the one failure mode this arrangement cannot report.",
    );
  liveHexPlan(d);
  const NAME = JSON.stringify(poolName);
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
  // format writes its "#tooltip" AFTER it: captured at init it is null for the life of the page,
  // and every hover then lit a cell and said nothing.
  function tip() { return doc.getElementById("tooltip"); }

  // THE PLAN IS VALIDATED BY WHOEVER DRAWS FROM IT. It reached here as JSON, from a render that ran
  // on another machine on another day: a duplicate layer id or a truncated plan is something
  // MapLibre reports by drawing a map that is quietly wrong.
  var seen = {};
  for (var i = 0; i < PLAN.layers.length; i++) {
    if (seen[PLAN.layers[i].id])
      throw new Error('two layers share the id "' + PLAN.layers[i].id + '" - MapLibre keeps the first and drops the second without an error');
    seen[PLAN.layers[i].id] = true;
  }
  if (!PLAN.studyBounds || !(PLAN.studyBounds.west < PLAN.studyBounds.east))
    throw new Error("this page's live plan carries no usable studyBounds - the camera has nothing to fit to");
  if (!PLAN.fills || !PLAN.fills[PLAN.defaultSlug])
    throw new Error("this page's live plan carries no fill expression for the grain it opens on");

  // NO PADDING, AND THAT IS NOT A SAVING — IT IS THE SAME CAMERA. The frozen picture under this map
  // was photographed from this map fitted to these bounds with padding 0.
  var FIT_PADDING_PX = 0;

  var map = new window.maplibregl.Map({
    container: box,
    style: PLAN.styleUrl,
    bounds: [[PLAN.studyBounds.west, PLAN.studyBounds.south], [PLAN.studyBounds.east, PLAN.studyBounds.north]],
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
  // MAPTILER'S OWN CONTROLS, by the owner's instruction. The compass is off: nothing here rotates,
  // and a control that changes nothing is a dead one.
  map.addControl(new window.maplibregl.NavigationControl({ showCompass: false }), "top-right");

  function mountLayers() {
    for (var key in PLAN.sources) map.addSource(key, { type: "geojson", data: PLAN.sources[key] });
    for (var i = 0; i < PLAN.layers.length; i++) {
      var layer = PLAN.layers[i];
      var spec = { id: layer.id, type: layer.type, source: layer.source, paint: layer.paint };
      if (layer.layout) spec.layout = layer.layout;
      if (layer.filter) spec.filter = layer.filter;
      map.addLayer(spec);
      // ONE CLOCK FOR THE GRAIN CHANGE, AND IT IS THE BEAT'S. MapLibre eases every paint change over
      // its own default 300 ms; the table's swatches are eased by the stylesheet over the beat's own
      // number, and two clocks on one gesture is two halves of one reading coming apart mid-travel.
      if (layer.type === "fill")
        map.setPaintProperty(layer.id, "fill-color-transition", { duration: PLAN.changeMs, delay: 0 }, { validate: false });
      if (layer.id === "mw-seam")
        map.setPaintProperty(layer.id, "line-opacity-transition", { duration: PLAN.changeMs, delay: 0 }, { validate: false });
    }
  }

  function currentSlug() {
    var checked = doc.querySelector("input[name=" + ${NAME} + "]:checked");
    return (checked && checked.value) || PLAN.defaultSlug;
  }
  function paintGrain(slug) {
    if (!PLAN.fills[slug]) return;
    map.setPaintProperty("mw-cells", "fill-color", PLAN.fills[slug]);
    map.setPaintProperty("mw-active", "fill-color", PLAN.actives[slug]);
    map.setPaintProperty("mw-code", "text-color", PLAN.inks[slug]);
    map.setPaintProperty("mw-value", "text-color", PLAN.inks[slug]);
    map.setLayoutProperty("mw-value", "text-field", ["get", "v_" + slug]);
    map.setPaintProperty("mw-seam", "line-opacity", ["case", ["==", ["get", "grain"], slug], 1, 0]);
    figure.setAttribute("data-live-grain", slug);
  }

  map.on("style.load", function () {
    // A FLAT WEB MERCATOR MAP (the owner, 2026-09-15: "oui une carte MapLibre plate pas un globe").
    if (map.setProjection) map.setProjection({ type: PLAN.projection || "mercator" });
    // The trunk's own sweep, ASSERTED rather than assumed: a sweep that re-tinted nothing did not
    // find the style it was written against, and the cells would sit on the provider's own colours
    // while every contrast on this page was measured against the beat's.
    assertLiveStyleAnswered(applyLiveStyle(map, { tints: PLAN.tints }), PLAN.styleName || PLAN.styleUrl);
    mountLayers();
    paintGrain(currentSlug());
  });

  function fitToStudy() {
    map.setMaxBounds(null);
    map.setMinZoom(-2);
    map.fitBounds(
      [[PLAN.studyBounds.west, PLAN.studyBounds.south], [PLAN.studyBounds.east, PLAN.studyBounds.north]],
      { padding: FIT_PADDING_PX, animate: false }
    );
    var fitted = map.getZoom();
    var visible = map.getBounds();
    var visibleSpan = Math.abs(visible.getEast() - visible.getWest());
    // THE FLOOR IS THE PUBLISHED FRAMING: a reader can never pull back past the view the title makes
    // its claim about. Set AFTER the fit, because a bound set before it constrains the fit itself.
    map.setMinZoom(fitted);
    // THE CEILING IS WHERE ONE CELL FILLS THE FRAME, derived and not typed. Past it the reader is
    // looking at a single seat and the map has stopped being the comparison it exists to be. The
    // choropleth's ceiling (the smallest country reaching a 28 px hit target) cannot be borrowed:
    // every cell here is the same size on purpose, which is the whole purchase of the type.
    map.setMaxZoom(fitted + Math.max(Math.log2(visibleSpan / Math.max(PLAN.cellSpanDeg, 1e-6)), 0));
    if (visibleSpan < 360) map.setMaxBounds(visible); else map.setMaxBounds(null);
    figure.setAttribute("data-live-view", map.getCenter().lng.toFixed(4) + "," + map.getCenter().lat.toFixed(4) + "@" + fitted.toFixed(3));
    figure.setAttribute("data-live-span", visibleSpan.toFixed(2));
  }

  map.on("load", function () {
    var plates = figure.querySelectorAll("[data-plate]");
    for (var i = 0; i < plates.length; i++) plates[i].setAttribute("aria-hidden", "true");
    doc.documentElement.classList.add("mw-live");
    var hint = figure.querySelector(".live-hint");
    if (hint) hint.hidden = false;
    map.resize();
    fitToStudy();
  });
  map.on("resize", function () {
    if (!doc.documentElement.classList.contains("mw-live")) return;
    fitToStudy();
  });
  // AND THE STAGE CAN CHANGE SIZE WITHOUT THE WINDOW, which MapLibre never hears about: the figure
  // is a flex column with a header whose height settles when its faces load, and this box is the one
  // shrinkable item in it. A MapLibre "resize" fires only when MapLibre resizes ITSELF.
  if (window.ResizeObserver)
    new window.ResizeObserver(function () {
      if (!doc.documentElement.classList.contains("mw-live")) return;
      map.resize();
      fitToStudy();
    }).observe(box);

  // THE CONTROL. One listener on the document rather than one per radio: the pills are real radios
  // in a real fieldset, so "change" bubbles and nothing here counts them.
  doc.addEventListener("change", function (event) {
    if (!event.target || event.target.name !== ${NAME}) return;
    paintGrain(event.target.value);
    hide();
  });

  // THE POINTER IS RESOLVED ON THE LAYER'S OWN FEATURES, never on a collision test of ours: a fill
  // layer answers anywhere inside the polygon, and it keeps answering after a zoom and after a drag
  // because there is no coordinate read once at initialisation to go stale. That is the trap this
  // tree has paid for three times.
  var hovering = null;
  // THE ANSWER IS READ OFF THE ROW THE READING ALREADY HAS. One string, one place: the table's row
  // carries data-detail, the format's own contract for "what this mark answers", and the live map
  // reads it rather than carrying a second copy in the plan.
  function rowFor(code) { return figure.querySelector('tr[data-mark="' + code + '"]'); }
  function detailFor(code) { var row = rowFor(code); return row && row.getAttribute("data-detail"); }
  function hide() {
    hovering = null;
    var tooltip = tip();
    if (tooltip) tooltip.hidden = true;
    if (map.getLayer("mw-active")) map.setFilter("mw-active", ["==", ["get", "code"], "--"]);
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
  function show(code, event) {
    if (code !== hovering) {
      hovering = code;
      if (map.getLayer("mw-active")) map.setFilter("mw-active", ["==", ["get", "code"], code]);
      var rows = figure.querySelectorAll("tr[data-mark]");
      for (var i = 0; i < rows.length; i++)
        rows[i].classList.toggle("mark-active", rows[i].getAttribute("data-mark") === code);
      var tooltip = tip();
      if (tooltip) { tooltip.textContent = detailFor(code); tooltip.hidden = false; }
    }
    place(event);
  }
  var hoverLayers = [];
  for (var h = 0; h < PLAN.layers.length; h++) if (PLAN.layers[h].hover) hoverLayers.push(PLAN.layers[h].id);
  map.on("mousemove", function (event) {
    var live = [];
    for (var i = 0; i < hoverLayers.length; i++) if (map.getLayer(hoverLayers[i])) live.push(hoverLayers[i]);
    var hits = map.queryRenderedFeatures(event.point, { layers: live });
    var code = hits.length && hits[0].properties ? hits[0].properties.code : null;
    if (!code || !detailFor(code)) { map.getCanvas().style.cursor = ""; hide(); return; }
    map.getCanvas().style.cursor = "pointer";
    show(code, event);
  });
  map.on("mouseout", hide);
  map.on("movestart", hide);
})();`;
}

/**
 * THE GUARD THAT READS THE WRITTEN PAGE BACK — the half no declaration-level check can make.
 *
 * `assertOnePool` holds the MARKUP's half of the gesture (the table's swatches) against the pooled
 * classes. This one holds the LAYERS' half against the same pooled classes, which is the crossing
 * this architecture created: the table re-shading under a grain the map does not paint, or the
 * reverse, is a page where half the beat answers one grouping and half answers the one before it.
 *
 * It derives what each cell SHOULD wear the way the markup derives it — `pooledClasses`, then the
 * ramp — rather than comparing the plan against the object it was built from. Two readings of one
 * variable is not a check: on the choropleth that mistake passed a mutation green.
 */
export function assertPoolReachesTheLayers(
  html: string,
  d: LiveHexDeclaration,
  pool: PoolDeclaration,
  ramp: string[],
  plateStyle: string,
  { where = "this page" }: { where?: string } = {},
): void {
  assertLiveHexDeclaration(d);
  const node = /<script[^>]+id="mw-live-plan"[^>]*>([\s\S]*?)<\/script>/.exec(
    String(html),
  );
  if (!node)
    throw new Error(
      `${where}: the page carries no live plan, so its map is a picture and its control moves the table only`,
    );
  let plan: any;
  try {
    plan = JSON.parse(node[1]);
  } catch (err) {
    throw new Error(
      `${where}: the live plan in the page is not JSON — MapLibre would never boot and the frozen picture would stand with nothing to say why`,
    );
  }
  if (
    String(html).indexOf(
      `https://api.maptiler.com/maps/${d.style}/style.json?key=${KEY_PLACEHOLDER}`,
    ) < 0
  )
    throw new Error(
      `${where}: the committed page does not carry the delivery placeholder in its style URL — a real key has reached a file in the repository`,
    );
  if (d.style !== plateStyle || plan.styleName !== plateStyle)
    throw new Error(
      `${where}: the live map loads the MapTiler style ${JSON.stringify(plan.styleName)} and the ` +
        `frozen picture under it was taken from ${JSON.stringify(plateStyle)}. The two layers are one ` +
        `cartography or they are a visible swap.`,
    );
  const origins = new Set(d.cells.filter((c) => c.isOrigin).map((c) => c.code));
  for (const grain of pool.grains) {
    const slug = poolSlugOf(grain.key);
    const expression = plan.fills?.[slug];
    if (!Array.isArray(expression))
      throw new Error(
        `${where}: the live plan carries no fill expression for the grain ${JSON.stringify(slug)}. ` +
          `The table's swatches would re-shade under it and the map would keep the grain before it — ` +
          `one control, two groupings.`,
      );
    const painted = new Map<string, string>();
    for (let i = 2; i + 1 < expression.length; i += 2)
      for (const code of expression[i] as string[])
        painted.set(code, expression[i + 1] as string);
    const classes = pooledClasses(pool, grain);
    for (const [code, klass] of classes) {
      const want = ramp[klass];
      if (painted.get(code) !== want)
        throw new Error(
          `${where}: under the grain ${JSON.stringify(slug)} the live map paints ${code} ` +
            `${JSON.stringify(painted.get(code) ?? null)} where the pooled classes the markup carries ` +
            `say ${JSON.stringify(want)}. Two derivations of one grouping is how half a beat re-shades ` +
            `and the other half keeps the grain before it.`,
        );
    }
    for (const code of origins)
      if (painted.get(code) !== d.origin.fill)
        throw new Error(
          `${where}: under the grain ${JSON.stringify(slug)} the seat outside the count is painted ` +
            `${JSON.stringify(painted.get(code) ?? null)}. It is the ground and no class of the ramp, ` +
            `or the key teaches a reader that a unit nobody counted has the lowest rate.`,
        );
    if (painted.size !== classes.size + origins.size)
      throw new Error(
        `${where}: under the grain ${JSON.stringify(slug)} the live map paints ${painted.size} cells ` +
          `and the page draws ${classes.size + origins.size}. A cell the layer does not name keeps ` +
          `the basemap's own land and reads as a cell with no reading.`,
      );
  }
  if (!/class="map-layer"/.test(String(html)))
    throw new Error(
      `${where}: the page carries a live plan and no box to draw it in`,
    );
  if (!/<p class="live-hint" hidden/.test(String(html)))
    throw new Error(
      `${where}: the sentence describing the live map's controls is not hidden in the delivered ` +
        `markup. With JavaScript off it is a description of a map that cannot be dragged — the dead ` +
        `control this arrangement exists not to ship.`,
    );
}
