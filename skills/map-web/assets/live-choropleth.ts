// twin/skills/map-web/assets/live-choropleth.ts
//
// THE CHOROPLETH AS A LIVE MAP — every mark a MapLibre layer over MapTiler's own tiles.
//
// THE RULING (2026-09-15, the owner, on `proof/web-proportional-symbol-europe-capacity/renders/`):
// *"la map doit prendre toute la largeur quitte à afficher plus de map. Regarde le pilote qu'on a
// produit dans scrolly, c'est presque la même sauf qu'avec web on peut avoir des contrôles, zoom,
// déplacement et hover en plus directement dans MapTiler."* And, on the projection: *"oui une carte
// MapLibre plate pas un globe."*
//
// It is an ARCHITECTURAL ruling, not a cosmetic one. The directed web map beats drew their marks as
// SVG over a baked plate. An SVG has a `viewBox`, so it has a ratio, so the width it may take is
// something somebody has to arbitrate — and the owner has now refused every answer that arbitration
// produced. A LIVE map has no viewBox. It fills its container and shows what that container gives
// it, and the question stops existing rather than being settled. Zoom, pan and hover then come from
// MapTiler instead of from a collision test of ours.
//
// ─────────────────────────────────────────────────────────────────────────────────────────────
// WHAT THIS IS NOT: `live-basemap.ts`.
//
// That file, written for the proportional-symbol beat one day earlier, swaps only the BASEMAP and
// keeps its marks in one SVG across both layers. It had to: its editorial gesture re-scales 41
// circles with `:checked` and generated CSS, and no stylesheet can reach a MapLibre circle layer.
// This beat pays that price deliberately and states it out loud — see THE COST, below.
//
// ─────────────────────────────────────────────────────────────────────────────────────────────
// TWO LAYERS, AND THE SECOND ONE IS THE ONE THAT MAY FAIL.
//
//   1. THE PLATE — the baked MapTiler raster as a data URI, drawn from the SAME camera and the SAME
//      tints as the live map, with the legend, the control, the derived sentences and the 41-row
//      table around it. Complete, script-free, request-free.
//   2. THE LIVE MAP — a real MapTiler map carrying MapLibre's own `NavigationControl`, its drag, its
//      wheel and its keyboard, revealed ONLY on `map.on("load")`.
//
// This is not decoration: MapTiler invalidates ALL of an account's keys at 100 % of its spending
// limit, so the failure mode is every published map on the site going blank at the same moment.
// Layer 1 is what stands there when it does — and it is what the COMMITTED artifact always is,
// because the key never enters a file in the repository.
//
// ─────────────────────────────────────────────────────────────────────────────────────────────
// THE COST OF THE ARCHITECTURE, STATED RATHER THAN DISCOVERED.
//
// The editorial gesture — the reader chooses the RULE that cuts the classes — was pure CSS over
// SSR'd SVG: four native radios, generated rules, no script at all. A MapLibre fill layer cannot be
// reached by a stylesheet, so the map's half of that gesture is now SCRIPT: one `setPaintProperty`
// per rule, over a `["match", ["get","iso_a2"], …]` expression built at BUILD time from the same
// index the markup carries. What the reader loses with JavaScript off is the map re-shading; what
// they keep is the plate, the legend under every rule, and the 41-row table whose own swatches
// re-shade with the rule in pure CSS exactly as before. The gesture is not gone without script; it
// has moved from the picture to the table, and the table says so.
//
// AND THE TWO HALVES DERIVE FROM ONE INDEX. A rule that painted the table one way and the map
// another is the "half the map re-shades and the other half keeps the rule before it" defect
// `assertOneClassing` was written for, now able to happen ACROSS two mechanisms rather than inside
// one. `assertClassingReachesTheLayers` below is the guard for that crossing, and it is the reason
// this file takes the fills as a map from code to colour rather than building them itself.
//
// ─────────────────────────────────────────────────────────────────────────────────────────────
// WHERE THE GEOGRAPHY COMES FROM: MapTiler's own Countries tileset, joined by ISO A2 — the same
// source and the same join the scrolly pilot the owner validated uses. Measured on
// `https://api.maptiler.com/tiles/countries/tiles.json` (2026-09-15): source layer `administrative`
// carrying `level` (0 = country … 4) and `iso_a2`.
//
// MALTA IS NOT A LEVEL-0 POLYGON AT A CONTINENTAL ZOOM, and below tile zoom 2 it is not in these
// tiles AT ALL — measured here at 375x812, where the camera fits this study set at zoom 1.40 and
// Malta simply left the map with no error anywhere. That is the join failure `types/choropleth.md`
// names by hand, wearing its other face: not a key that fails to match, but a key that matches
// nothing AT THIS ZOOM. So a beat hands over its OWN polygon for such a country (`smallShapes`) and
// it is drawn at every zoom from the beat's own frozen file, never from the provider's
// generalisation. It is a MARK and not ground, so it is not the doubled basemap `style.mjs` refuses.
//
// AND THE FILLS GO BENEATH THE BASEMAP'S WATER. Countries' coast is generalised per zoom and stands
// over the basemap's finer one — measured on the scrolly pilot at 1.5–3.6 CSS px at the Norwegian
// fjords, Dalmatia and the Aegean. Drawn beneath the sea, the coarser coast is hidden by the water
// and only the inland borders remain, which is what a reader is meant to see.

import { classingSlugOf } from "./classing.ts";

/** Assembled, never written whole: this file's OUTPUT travels into a page that `deliver` rewrites
 *  every occurrence of the placeholder in. A literal here would be rewritten to the key itself and
 *  the "is this page still unkeyed" test would then read "does the style URL contain the key",
 *  which is true of every delivered page — so every delivered map would refuse to boot. */
export const KEY_PLACEHOLDER = "__MAPTILER" + "_KEY__";

export type LiveChoroplethRule = {
  /** The rule's own key, the same string the classing declaration carries. */
  key: string;
  /** Every studied country's fill under this rule, keyed by ISO A2. */
  fillByCode: Record<string, string>;
  /** What a pointed-at country becomes under this rule, keyed by ISO A2 — searched off its OWN
   *  fill by the beat, never a fixed dose (the owner refused a fixed dose at 1,104:1). */
  activeByCode: Record<string, string>;
};

export type LiveChoroplethDeclaration = {
  /** The MapTiler style the plate was baked from. The live map loads the same one, so the two
   *  layers cannot be two cartographies. */
  style: string;
  /** The two tints the plate was baked in, and the two the live style is repainted with. */
  tints: { water: string; land: string };
  /** What the camera fits to at runtime — the study set's own box, never the plate's frame corners
   *  (those were computed for the plate's aspect, not for the reader's container). */
  studyBounds: { west: number; east: number; south: number; north: number };
  /** The plate's own drawn size and ground scale, recorded by the bake. */
  frame: { width: number; height: number };
  degreesPerPixel: number;
  /** ISO A2 of every country with a reading, and of every country drawn hollow for want of one. */
  studied: string[];
  missing: string[];
  /** The countries MapTiler's Countries tiles do not carry as a level-0 polygon at every zoom this
   *  page can open at, drawn from the BEAT'S OWN frozen shapes instead. Keyed by ISO A2, one
   *  GeoJSON feature each, with `iso_a2` in its properties. */
  smallShapes: { type: "FeatureCollection"; features: any[] };
  /** The four rules, in the order the control offers them, and which one the page opens on. */
  rules: LiveChoroplethRule[];
  defaultKey: string;
  /** The outline a studied country carries, the one every other country carries, and its width. */
  border: { studied: string; other: string; width: number };
  /** What the pointer answers for each studied code, and for each missing one. */
  details: Record<string, string>;
  /** MapLibre's own control names, in the page's language: the library ships English defaults and a
   *  French page that leaves them hands a screen reader an English button. */
  locale: { title: string; zoomIn: string; zoomOut: string };
  /** How long a country takes to cross from one class's colour to the next, in ms. The same number
   *  the stylesheet gives the table's swatches, so the two halves cross together. */
  changeMs: number;
  /** The narrowest country the map counts, in degrees of longitude, and the name it goes by. The
   *  zoom CEILING is derived from it and may not be typed — see `fitToStudy` in the script. */
  smallest: { name: string; spanDeg: number };
};

const A2 = /^[A-Z]{2}$/;

export function assertLiveChoroplethDeclaration(
  d: LiveChoroplethDeclaration,
): LiveChoroplethDeclaration {
  if (!d || typeof d.style !== "string" || !d.style)
    throw new Error(
      "live-choropleth: the declaration names no MapTiler style, so the live map and the baked " +
        "plate would be two cartographies",
    );
  for (const key of ["water", "land"] as const)
    if (!/^#[0-9a-fA-F]{6}$/.test(d.tints?.[key] ?? ""))
      throw new Error(
        `live-choropleth: the ${key} tint is ${JSON.stringify(d.tints?.[key])}; the live style is ` +
          `painted with the plate's own two tints, read back from its geometry.json`,
      );
  const b = d.studyBounds;
  if (!b || !(b.west < b.east) || !(b.south < b.north))
    throw new Error(
      `live-choropleth: the study bounds are ${JSON.stringify(b)} — \`fitBounds\` answers an ` +
        `inverted or empty box by framing the rest of the world`,
    );
  if (
    !(d.frame?.width > 0) ||
    !(d.frame?.height > 0) ||
    !(d.degreesPerPixel > 0)
  )
    throw new Error(
      "live-choropleth: this plate predates the camera facts (frame + degreesPerPixel): re-bake it",
    );
  if (!d.studied?.length)
    throw new Error(
      "live-choropleth: no country is studied, so every class layer would match nothing and " +
        "MapLibre would report none of it",
    );
  const smallCodes: string[] = (d.smallShapes?.features ?? []).map(
    (f: any) => f.properties?.iso_a2,
  );
  for (const code of [...d.studied, ...(d.missing ?? []), ...smallCodes])
    if (!A2.test(code))
      throw new Error(
        `live-choropleth: ${JSON.stringify(code)} is not an ISO A2 code. The Countries tileset keys ` +
          `on \`iso_a2\`, and a key that does not match paints nothing — which renders as a country ` +
          `quietly outside the study rather than as an error`,
      );
  for (const code of smallCodes)
    if (!d.studied.includes(code))
      throw new Error(
        `live-choropleth: ${code} is drawn from the beat's own shapes and is not one of the studied ` +
          `countries, so it would be painted the class of a reading it does not have`,
      );
  const overlap = d.studied.filter((c) => (d.missing ?? []).includes(c));
  if (overlap.length)
    throw new Error(
      `live-choropleth: ${overlap.join(", ")} is both studied and missing. A country painted by two ` +
        `layers is painted by whichever MapLibre drew second`,
    );
  if (!d.rules?.length)
    throw new Error(
      "live-choropleth: no classing rule reaches the layers, so the reader's control would move the " +
        "legend and leave the map on the rule it opened with",
    );
  if (!d.rules.some((r) => r.key === d.defaultKey))
    throw new Error(
      `live-choropleth: the page opens on rule ${JSON.stringify(d.defaultKey)} and no rule carries ` +
        `that key`,
    );
  for (const rule of d.rules)
    for (const code of d.studied) {
      if (!/^#[0-9a-fA-F]{6}$/.test(rule.fillByCode[code] ?? ""))
        throw new Error(
          `live-choropleth: rule ${JSON.stringify(rule.key)} gives ${code} the fill ` +
            `${JSON.stringify(rule.fillByCode[code])} — a studied country with no colour under a ` +
            `rule is a hole in the partition that rule claims to make`,
        );
      if (!/^#[0-9a-fA-F]{6}$/.test(rule.activeByCode[code] ?? ""))
        throw new Error(
          `live-choropleth: rule ${JSON.stringify(rule.key)} gives ${code} no pointed-at colour. ` +
            `The shape itself is what answers a pointer (the owner's second arbitration), darkened ` +
            `from ITS OWN fill — which travels with the rule, so the darkening travels with it too`,
        );
    }
  for (const code of [...d.studied, ...(d.missing ?? [])])
    if (!d.details?.[code])
      throw new Error(
        `live-choropleth: ${code} is drawn and answers nothing. A country a reader can point at and ` +
          `get silence from is a country they read as having no data`,
      );
  for (const key of ["title", "zoomIn", "zoomOut"] as const)
    if (!d.locale?.[key])
      throw new Error(
        `live-choropleth: MapLibre's ${key} control is left with the library's English default on a ` +
          `French page — a screen reader would read it out in the wrong language`,
      );
  if (!(d.smallest?.spanDeg > 0) || !d.smallest?.name)
    throw new Error(
      "live-choropleth: the zoom ceiling is derived from the narrowest country the map counts, and " +
        "the declaration names none. A ceiling typed instead of derived is a number nobody can " +
        "defend, and a ceiling derived from the WIDTH of the frame is no ceiling at all on a box " +
        "the owner's ruling has already made wider than the subject.",
    );
  if (!(d.changeMs >= 0))
    throw new Error(
      "live-choropleth: the class change needs a duration (the owner's fourth arbitration: a state " +
        "change interpolates rather than jumps)",
    );
  return d;
}

const SOURCE_LAYER = "administrative";

function fillExpressionFor(
  d: LiveChoroplethDeclaration,
  rule: LiveChoroplethRule,
): unknown[] {
  return [
    "match",
    ["get", "iso_a2"],
    ...d.studied.flatMap(
      (code) => [[code], rule.fillByCode[code]] as unknown[],
    ),
    d.tints.land,
  ];
}

function activeExpressionFor(
  d: LiveChoroplethDeclaration,
  rule: LiveChoroplethRule,
): unknown[] {
  return [
    "match",
    ["get", "iso_a2"],
    ...d.studied.flatMap(
      (code) => [[code], rule.activeByCode[code]] as unknown[],
    ),
    d.tints.land,
  ];
}

/** THE PLAN THE PAGE CARRIES, as JSON, read back by a script that never met the code that wrote it.
 *  It is a FILE before it is an object, so what is checked here is checked again in the browser. */
export function liveChoroplethPlan(
  d: LiveChoroplethDeclaration,
): Record<string, unknown> {
  assertLiveChoroplethDeclaration(d);
  const source = {
    type: "vector",
    url: `https://api.maptiler.com/tiles/countries/tiles.json?key=${KEY_PLACEHOLDER}`,
  };
  const level0 = ["==", ["get", "level"], 0];
  const byCode = (codes: string[]) => [
    "match",
    ["get", "iso_a2"],
    codes,
    true,
    false,
  ];
  const smallCodes: string[] = (d.smallShapes?.features ?? []).map((f: any) => f.properties?.iso_a2);
  const openingRule = d.rules.find((r) => r.key === d.defaultKey)!;
  const opening = fillExpressionFor(d, openingRule);

  const layers: Record<string, unknown>[] = [
    // THE CLASSES. ONE fill layer, repainted per rule — not one layer per class: the reader changes
    // rule with a click, not with a scroll, so there is no per-frame tile reload to avoid here, and
    // one layer is one place a colour is decided.
    {
      id: "mw-classes",
      type: "fill",
      beneath: "water",
      source,
      sourceLayer: SOURCE_LAYER,
      filter: ["all", level0, byCode(d.studied.filter((code) => !smallCodes.includes(code)))],
      paint: { "fill-color": opening, "fill-opacity": 1 },
      hover: true,
    },
  ];
  // THE COUNTRIES THE TILESET DOES NOT CARRY AT EVERY ZOOM THIS PAGE OPENS AT, drawn from the beat's
  // own frozen shapes. MEASURED, not anticipated: at 375x812 the camera fits this study set at zoom
  // 1.40, the Countries tiles at that tile zoom carry NOTHING for Malta — not its level-0 polygon and
  // not its level-1 councils — and a reporting country simply left the map with no error anywhere.
  // That is the join failure `types/choropleth.md` names by hand, wearing its other face: not a key
  // that fails to match, but a key that matches nothing AT THIS ZOOM.
  //
  // A level-1 fallback below zoom 4 was the first answer and it is not enough, because below zoom 2
  // there is no level 1 either. One polygon of this beat's own, always drawn, is a fact that does not
  // depend on the provider's generalisation — and it is a MARK, not ground, so it is not the doubled
  // basemap `style.mjs` refuses.
  if (smallCodes.length)
    layers.push({
      id: "mw-classes-small",
      type: "fill",
      beneath: "water",
      data: d.smallShapes,
      paint: { "fill-color": opening, "fill-opacity": 1 },
      hover: true,
    });
  layers.push(
    // WHAT A POINTED-AT COUNTRY BECOMES. A layer of its own rather than a paint on the class layer,
    // because the answer has to be drawn ABOVE its neighbours: a darkened country under the country
    // beside it answers where the reader is not looking. Filtered to nothing until a pointer lands.
    {
      id: "mw-active",
      type: "fill",
      beneath: "water",
      source,
      sourceLayer: SOURCE_LAYER,
      filter: ["all", level0, ["==", ["get", "iso_a2"], "--"]],
      paint: {
        "fill-color": activeExpressionFor(d, openingRule),
        "fill-opacity": 1,
      },
      hover: false,
    },
    // …AND IT IS STILL POINTABLE. A hollow country is a LINE, and `queryRenderedFeatures` answers a
    // line only within a pixel or two of the stroke — so the one country with no reading answered
    // nothing anywhere inside itself, which reads exactly like a country outside the study. Measured
    // by driving a pointer into the middle of Ukraine and getting Poland's answer back from the
    // previous hover. An invisible fill is the hit area, disjoint from the classes by construction.
    {
      id: "mw-missing-hit",
      type: "fill",
      beneath: "water",
      source,
      sourceLayer: SOURCE_LAYER,
      filter: ["all", level0, byCode(d.missing)],
      paint: { "fill-color": d.tints.land, "fill-opacity": 0 },
      hover: true,
    },
    // A COUNTRY WITH NO READING IS DRAWN HOLLOW — the basemap's own land shows through it, which is
    // what it is: a country the study carries no number for looks like the world outside the study.
    // Its outline is dashed so it is not mistaken for a country outside the frame.
    {
      id: "mw-missing",
      type: "line",
      beneath: "water",
      source,
      sourceLayer: SOURCE_LAYER,
      filter: ["all", level0, byCode(d.missing)],
      paint: {
        "line-color": d.border.studied,
        "line-width": d.border.width,
        "line-dasharray": [2, 2],
      },
      hover: false,
    },
    // THE BORDERS. Countries carries polygons only, so its outlines trace coast as well as border:
    // beneath the water too, or the coarser coast is drawn back over the sea as a line.
    {
      id: "mw-borders",
      type: "line",
      beneath: "water",
      source,
      sourceLayer: SOURCE_LAYER,
      filter: level0,
      paint: {
        "line-color": [
          "case",
          byCode(d.studied),
          d.border.studied,
          d.border.other,
        ],
        "line-width": d.border.width,
      },
      hover: false,
    },
  );

  return {
    styleUrl: `https://api.maptiler.com/maps/${d.style}/style.json?key=${KEY_PLACEHOLDER}`,
    styleName: d.style,
    projection: "mercator",
    tints: d.tints,
    studyBounds: d.studyBounds,
    frame: d.frame,
    degreesPerPixel: d.degreesPerPixel,
    changeMs: d.changeMs,
    smallest: d.smallest,
    locale: d.locale,
    /** Every country the map draws. What each one ANSWERS is not here: it is the `data-detail` the
     *  table's own row carries, so the page holds one copy of one string and the guard that walks
     *  `[data-detail]` sees the live map's answers as well as the table's. */
    codes: [...d.studied, ...d.missing],
    defaultSlug: classingSlugOf(d.defaultKey),
    /** One repaint per rule, keyed by the SLUG the radio's own id and value carry — one vocabulary,
     *  three readers (the radio, the stylesheet, this plan), which is what keeps the table and the
     *  map from answering two different partitions. */
    fills: Object.fromEntries(
      d.rules.map((rule) => [
        classingSlugOf(rule.key),
        fillExpressionFor(d, rule),
      ]),
    ),
    actives: Object.fromEntries(
      d.rules.map((rule) => [
        classingSlugOf(rule.key),
        activeExpressionFor(d, rule),
      ]),
    ),
    layers,
  };
}

/**
 * THE RULES. Every one of them is conditional on `.mw-live` except the live box's own resting state,
 * so a page whose script never runs is drawn exactly as it was before this file existed.
 */
export function liveChoroplethCss({ scope }: { scope: string }): string {
  const live = `.mw-live ${scope}`;
  return [
    // THE LIVE BOX TAKES THE PLOT'S WHOLE TRACK, not the cell inside it — and that IS the ruling. The
    // cell carries the drawing's own viewBox ratio because an SVG must not be stretched; a live map
    // has no viewBox to protect, so it fills the width the figure has and shows the ground that width
    // gives it.
    // BOTH LAYERS ARE ONE BOX, AND THE BOX IS THE STAGE. The format's cell carries the drawing's own
    // viewBox ratio so `preserveAspectRatio="none"` cannot stretch it; neither of these two is
    // stretched — the fallback is `slice` (cover) and a live map has no ratio to protect — so both
    // take the whole track instead of the cell inside it, which is how the scrolly sizes its stage.
    `${scope} .map-layer, ${scope} svg.chart { grid-column: 1 / -1; grid-row: 1; width: 100%; height: 100%; min-width: 0; min-height: 0; margin: 0; }`,
    `${scope} .map-layer { visibility: hidden; }`,
    `${live} .map-layer { visibility: visible; }`,
    // ONE BASEMAP, NOT TWO. Everything the page drew of the ground gives way to MapTiler's own, and
    // only once the live map is actually up: with no script the plate is the whole picture.
    `${live} [data-plate] { display: none; }`,
    // WITH NO SCRIPT THERE IS NO DESCRIPTION EITHER — a sentence about dragging a map that cannot be
    // dragged is exactly the dead control this arrangement exists not to ship. `[hidden]` is a UA
    // rule, so it is restated here as an author rule no author rule can outrank by accident.
    `${scope} .live-hint[hidden] { display: none; }`,
    // THE ANSWER A POINTER GETS IS THE COUNTRY ITSELF, never a dot on top of it (the owner's second
    // arbitration). The map darkens the country from its own fill; the table's row for the same
    // country answers at the same moment, so one reading has one answer in both halves.
    `${scope} tr[data-mark] { transition: background-color 120ms linear; }`,
  ].join("\n\n");
}

/**
 * THE SCRIPT, authored as a classic `<script>` body — no module, no bundler, so it keeps working in
 * a CMS iframe or a sandboxed embed that refuses module scripts. It derives no geometry and formats
 * no WORD: every glyph a reader can be shown was cut into the page's own embedded faces at build
 * time, which is why the details and the control names travel in the plan's JSON rather than being
 * assembled here.
 *
 * `styleModule` is `assets/style.mjs`'s own source with its `export` keywords stripped, handed in by
 * the beat: the sweep that decides what a basemap layer becomes is stated ONCE, in that file, and
 * applied twice — to the style document the plate is baked from, and to the live style here.
 */
export function liveChoroplethScript(
  d: LiveChoroplethDeclaration,
  {
    scope,
    styleModule,
    classingName,
  }: { scope: string; styleModule: string; classingName: string },
): string {
  assertLiveChoroplethDeclaration(d);
  if (
    typeof styleModule !== "string" ||
    !/function\s+applyLiveStyle/.test(styleModule)
  )
    throw new Error(
      "live-choropleth: the style sweep is handed in by the beat (the source of " +
        "`skills/map-web/assets/style.mjs`, with its `export` keywords stripped) because a page " +
        "script cannot import. What it was given does not define `applyLiveStyle`.",
    );
  if (/\bexport\s/.test(styleModule))
    throw new Error(
      "live-choropleth: the style sweep still carries `export`, which is a syntax error in a classic " +
        "script. The whole live layer would fail to parse and the fallback would stand with no error " +
        "anyone could see — the one failure mode this arrangement cannot report.",
    );
  liveChoroplethPlan(d);
  const NAME = JSON.stringify(classingName);
  const SCOPE = JSON.stringify(scope);
  return `${styleModule}
(function () {
  var doc = document;
  var planNode = doc.getElementById("mw-live-plan");
  if (!planNode) return;
  var PLAN;
  try { PLAN = JSON.parse(planNode.textContent); } catch (err) { return; }
  // THE SENTINEL IS ASSEMBLED IN TWO HALVES, never written whole: delivery substitutes every
  // occurrence of the placeholder in the delivered file, and THIS SCRIPT IS IN THAT FILE. A literal
  // would be rewritten to the key itself and the test would become "does the style URL contain the
  // key", which is true of every delivered page.
  var SENTINEL = "__MAPTILER" + "_KEY__";
  if (!PLAN || !PLAN.styleUrl || PLAN.styleUrl.indexOf(SENTINEL) >= 0) return;
  if (!window.maplibregl) return;
  var figure = doc.querySelector(${SCOPE});
  var box = figure && figure.querySelector(".map-layer");
  if (!box) return;
  // THE TOOLTIP IS LOOKED UP LATE, ON PURPOSE. This script is inlined INSIDE the figure, and the
  // format writes its "#tooltip" AFTER the figure — so at the moment this runs the element does not
  // exist yet. Captured at init it is null for the life of the page: every hover then set a class on
  // the table's row, returned no answer, and reported nothing at all. Measured in a real browser as
  // "the country lights up and says nothing", which is exactly the shape of a defect that survives
  // a unit test.
  function tip() { return doc.getElementById("tooltip"); }

  // THE PLAN IS VALIDATED BY WHOEVER DRAWS FROM IT. It reached here as JSON, from a render that ran
  // on another machine on another day: nothing the writer checked survived the journey. A duplicate
  // layer id, a missing camera fact, a plan truncated by a broken render — MapLibre reports none of
  // them, it simply draws a map that is quietly wrong.
  var seen = {};
  for (var i = 0; i < PLAN.layers.length; i++) {
    if (seen[PLAN.layers[i].id])
      throw new Error('two layers share the id "' + PLAN.layers[i].id + '" - MapLibre keeps the first and drops the second without an error');
    seen[PLAN.layers[i].id] = true;
  }
  if (!PLAN.studyBounds || !(PLAN.studyBounds.west < PLAN.studyBounds.east))
    throw new Error("this page's live plan carries no usable studyBounds - the camera has nothing to fit to");
  if (!(PLAN.degreesPerPixel > 0))
    throw new Error("this page's live plan predates the camera facts");
  if (!PLAN.fills || !PLAN.fills[PLAN.defaultSlug])
    throw new Error("this page's live plan carries no fill expression for the rule it opens on");

  // NO PADDING, AND THAT IS NOT A SAVING — IT IS THE SAME CAMERA. The plate under this map was baked
  // by fitting the BEAT'S OWN declared window into its frame with padding 0; a live fit that padded
  // the same window would be a second camera, and the swap from plate to live map would be visible as
  // a jump. The window itself is where the room around the study set lives, and the bake refuses one
  // too small for it. (A wide, short box is HEIGHT-bound, so a pixel of padding is also paid back at
  // the box's own aspect in longitude: on this beat at 1512x860 the 9 % of the shorter side that
  // live-map.mjs uses would have cost tens of degrees of extra ocean on top of what the width already
  // costs.)
  var FIT_PADDING_PX = 0;

  var map = new window.maplibregl.Map({
    container: box,
    style: PLAN.styleUrl,
    // THE CAMERA IS FITTED AT RUNTIME, TO THE STUDY SET — never restored from the bake's own zoom.
    // Web is a RANGE of shapes, so the container's aspect is not known when the plate is baked.
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
  // MAPTILER'S OWN CONTROLS, by the owner's instruction — not a rail of buttons beside the map. The
  // compass is off: nothing in this beat rotates, and a control that changes nothing is a dead one.
  map.addControl(new window.maplibregl.NavigationControl({ showCompass: false }), "top-right");

  function waterId() {
    var layers = map.getStyle().layers;
    for (var i = 0; i < layers.length; i++)
      if (styleDecisionFor(layers[i]).tint === "water") return layers[i].id;
    throw new Error("the style carries no water fill for this beat's fills to be drawn beneath, so MapTiler Countries' coarser coast would stand over the basemap's own");
  }

  function mountLayers() {
    var before = waterId();
    var sources = {};
    for (var i = 0; i < PLAN.layers.length; i++) {
      var layer = PLAN.layers[i];
      var key;
      if (layer.source) {
        if (!layer.sourceLayer)
          throw new Error('layer "' + layer.id + '" reads a vector source and names no source layer - it would draw nothing, silently');
        key = layer.source.url.replace(/[?#].*$/, "");
        if (!sources[key]) {
          sources[key] = "mw-src-" + i;
          map.addSource(sources[key], { type: layer.source.type, url: layer.source.url });
        }
      } else {
        // A layer carrying its OWN geometry: the countries the tileset does not draw at every zoom.
        key = layer.id;
        sources[key] = "mw-src-" + i;
        map.addSource(sources[key], { type: "geojson", data: layer.data });
      }
      var spec = {
        id: layer.id,
        type: layer.type,
        source: sources[key],
        paint: layer.paint
      };
      if (layer.sourceLayer) spec["source-layer"] = layer.sourceLayer;
      if (layer.filter) spec.filter = layer.filter;
      if (layer.maxzoom !== undefined) spec.maxzoom = layer.maxzoom;
      map.addLayer(spec, layer.beneath === "water" ? before : undefined);
      // ONE CLOCK FOR THE CLASS CHANGE, AND IT IS THE BEAT'S. MapLibre eases every paint change over
      // its own default 300 ms; the table's swatches are eased by the stylesheet over the beat's own
      // number, and two clocks on one gesture is two halves of one reading coming apart mid-travel.
      if (layer.type === "fill")
        map.setPaintProperty(layer.id, "fill-color-transition", { duration: PLAN.changeMs, delay: 0 }, { validate: false });
    }
  }

  function currentSlug() {
    var checked = doc.querySelector("input[name=" + ${NAME} + "]:checked");
    return (checked && checked.value) || PLAN.defaultSlug;
  }
  function paintRule(slug) {
    if (!PLAN.fills[slug]) return;
    if (map.getLayer("mw-classes")) map.setPaintProperty("mw-classes", "fill-color", PLAN.fills[slug]);
    if (map.getLayer("mw-classes-small")) map.setPaintProperty("mw-classes-small", "fill-color", PLAN.fills[slug]);
    if (map.getLayer("mw-active")) map.setPaintProperty("mw-active", "fill-color", PLAN.actives[slug]);
    figure.setAttribute("data-live-rule", slug);
  }

  map.on("style.load", function () {
    // A FLAT WEB MERCATOR MAP (the owner, 2026-09-15: "oui une carte MapLibre plate pas un globe").
    if (map.setProjection) map.setProjection({ type: PLAN.projection || "mercator" });
    // The trunk's own sweep, ASSERTED rather than assumed: a sweep that re-tinted nothing did not
    // find the style it was written against, and the reader would keep the provider's own water
    // under a plate painted in the beat's, with nothing to say so.
    assertLiveStyleAnswered(applyLiveStyle(map, { tints: PLAN.tints }), PLAN.styleName || PLAN.styleUrl);
    mountLayers();
    paintRule(currentSlug());
  });

  function fitToStudy() {
    map.setMaxBounds(null);
    map.setMinZoom(-2);
    map.fitBounds(
      [[PLAN.studyBounds.west, PLAN.studyBounds.south], [PLAN.studyBounds.east, PLAN.studyBounds.north]],
      { padding: FIT_PADDING_PX, animate: false }
    );
    // THE READER'S LEASH, set once the camera has actually fitted. The floor is the published
    // framing — a reader can never pull back past the view the title makes its claim about — and the
    // ceiling is where the study set stops filling the frame, DERIVED from the view that resulted
    // rather than typed. Set AFTER the fit: a bound set before it constrains the fit itself.
    var fitted = map.getZoom();
    var visible = map.getBounds();
    var visibleSpan = Math.abs(visible.getEast() - visible.getWest());
    map.setMinZoom(fitted);
    // THE CEILING IS WHERE THE SMALLEST COUNTRY THE MAP COUNTS BECOMES POINTABLE, and it is derived
    // from two numbers the beat already has: that country's own width in degrees, and the 28 px hit
    // target this format uses everywhere else. Past it the reader is looking at terrain this beat
    // holds no datum for; short of it Malta is under four pixels wide and "zoom and pan" is a
    // promise the page does not keep.
    //
    // WHAT IT REPLACES, AND WHY. The ceiling used to be log2(visible longitude / study longitude) —
    // "where the study stops filling the frame". That reads the frame's WIDTH, and the owner's
    // full-width ruling has already made the frame wider than the subject, so the two spans are
    // nearly equal and the derivation answered +0.43 zoom levels. Measured on this page: a reader
    // could not move through the map at all, on a map whose whole reason to be live is that they can.
    var smallestPx = (PLAN.smallest.spanDeg / visibleSpan) * map.getCanvas().clientWidth;
    map.setMaxZoom(fitted + Math.max(Math.log2(28 / Math.max(smallestPx, 0.01)), 0));
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
  // The CONTAINER changed shape, so the camera re-fits: web is a range of shapes, and a beat embedded
  // in a column that reflows answers the new shape with a new fit rather than with a cropped old one.
  map.on("resize", function () {
    if (!doc.documentElement.classList.contains("mw-live")) return;
    fitToStudy();
  });
  // AND THE STAGE CAN CHANGE SIZE WITHOUT THE WINDOW, which MapLibre never hears about. The figure is
  // a flex column with a header whose height settles when its faces load, and this box is the one
  // shrinkable item in it: measured while baking the frozen fallback, the camera was fitted for a
  // 1112 px box, the box then settled at 520, and the picture came back showing half the latitude the
  // page claims - the north kept, the Mediterranean gone, and nothing red. A MapLibre "resize" event
  // fires only when MapLibre resizes ITSELF, so the observer is what turns a settling layout into a
  // re-fit.
  if (window.ResizeObserver)
    new window.ResizeObserver(function () {
      if (!doc.documentElement.classList.contains("mw-live")) return;
      map.resize();
      fitToStudy();
    }).observe(box);

  // THE CONTROL. One listener on the document rather than one per radio: the pills are real radios in
  // a real fieldset, so "change" bubbles and nothing here counts them.
  doc.addEventListener("change", function (event) {
    if (!event.target || event.target.name !== ${NAME}) return;
    paintRule(event.target.value);
    hide();
  });

  // THE POINTER IS RESOLVED ON THE LAYER'S OWN FEATURES, never on a collision test of ours: a fill
  // layer answers anywhere inside the polygon, which is what "as soon as you enter the country"
  // means, and it keeps answering after a zoom and after a pan because there is no coordinate read
  // once at initialisation to go stale. That is the trap this tree has paid for three times.
  var hovering = null;
  // THE ANSWER IS READ OFF THE ROW THE READING ALREADY HAS. One string, one place: the table's row
  // for a country carries data-detail, the format's own contract for "what this mark answers", and
  // the live map reads it rather than carrying a second copy in the plan.
  function rowFor(code) { return figure.querySelector('tr[data-mark="' + code + '"]'); }
  function detailFor(code) { var row = rowFor(code); return row && row.getAttribute("data-detail"); }
  var NOTHING = ["all", ["==", ["get", "level"], 0], ["==", ["get", "iso_a2"], "--"]];
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
  function show(code, event) {
    if (code !== hovering) {
      hovering = code;
      if (map.getLayer("mw-active"))
        map.setFilter("mw-active", ["all", ["==", ["get", "level"], 0], ["==", ["get", "iso_a2"], code]]);
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
    var code = hits.length && hits[0].properties ? hits[0].properties.iso_a2 : null;
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
 * `assertOneClassing` (in `classing.ts`) holds the MARKUP's half of the gesture against the index.
 * This one holds the LAYERS' half against the same index, which is the crossing this architecture
 * created: the table re-shading under a rule the map does not paint, or the reverse, is a page where
 * half the beat answers one partition and half answers the one before it — and neither guard alone
 * can see it, because each reads only its own mechanism.
 */
export function assertClassingReachesTheLayers(
  html: string,
  d: LiveChoroplethDeclaration,
  index: Map<string, number[]>,
  /** THE RAMP THE MARKUP IS DRAWN IN, and the reason this argument exists. The first version of this
   *  guard compared the plan's expressions against `rule.fillByCode` — the very object the plan was
   *  built from. Two readings of one variable is not a check: a mutation that gave one country the
   *  wrong class in the plan passed it, GREEN, because both sides were wrong together. It now derives
   *  what each country SHOULD wear the way the markup derives it — the index, then the ramp — so the
   *  two halves are genuinely two derivations of one partition. */
  ramp: string[],
  /** The plate's own recorded style, read from `geometry.json`. The live map must load the style the
   *  plate was baked from, or the swap from one to the other is a swap between two cartographies. */
  plateStyle: string,
  { where = "this page" }: { where?: string } = {},
): void {
  assertLiveChoroplethDeclaration(d);
  const node = /<script[^>]+id="mw-live-plan"[^>]*>([\s\S]*?)<\/script>/.exec(
    String(html),
  );
  if (!node)
    throw new Error(
      `${where}: the page carries no live plan, so its map is a picture and its control moves the ` +
        `legend only`,
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
    String(html).indexOf(
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
        `plate under it was baked from ${JSON.stringify(plateStyle)}. The two layers are one ` +
        `cartography or they are a visible swap: the fallback is the live map's own picture, frozen.`,
    );
  for (const rule of d.rules) {
    const slug = classingSlugOf(rule.key);
    const expression = plan.fills?.[slug];
    if (!Array.isArray(expression))
      throw new Error(
        `${where}: the live plan carries no fill expression for the rule ${JSON.stringify(slug)}. ` +
          `The table's swatches would re-shade under it and the map would keep the rule before it — ` +
          `one control, two partitions.`,
      );
    const painted = new Map<string, string>();
    for (let i = 2; i + 1 < expression.length; i += 2)
      for (const code of expression[i] as string[])
        painted.set(code, expression[i + 1] as string);
    const which = d.rules.findIndex((r) => r.key === rule.key);
    for (const [mark, classes] of index) {
      const code = mark;
      const want = ramp[classes[which]];
      if (painted.get(code) !== want)
        throw new Error(
          `${where}: under the rule ${JSON.stringify(slug)} the live map paints ${code} ` +
            `${JSON.stringify(painted.get(code) ?? null)} where the index the markup carries says ` +
            `${JSON.stringify(want)}. Two derivations of one partition is how half a beat re-shades ` +
            `and the other half keeps the rule before it.`,
        );
    }
    if (painted.size !== index.size)
      throw new Error(
        `${where}: under the rule ${JSON.stringify(slug)} the live map paints ${painted.size} ` +
          `countries and the markup classes ${index.size}. A country the layer does not name keeps ` +
          `the basemap's own land and reads as a country with no data.`,
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
