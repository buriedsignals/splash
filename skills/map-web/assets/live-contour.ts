// twin/skills/map-web/assets/live-contour.ts
//
// THE CONTOUR AS A LIVE MAP — the field, its bands and its isolines are MapLibre layers over
// MapTiler's own tiles, and the READER CHOOSES THE STEP BETWEEN THE LINES.
//
// THE PATTERN THIS FOLLOWS is `live-choropleth.ts`, validated by the owner on 2026-09-15: marks as
// MapLibre layers and not SVG over a baked plate, a flat Mercator map, MapTiler's own controls and
// `queryRenderedFeatures` hover, the map taking the figure's whole width, two layers with a frozen
// image beneath the live one, and the key never entering a committed file. Read that file first; it
// carries the architecture's reasons. This one carries only what an ISOLINE map adds.
//
// ─────────────────────────────────────────────────────────────────────────────────────────────
// WHAT AN ISOLINE MAP HIDES, AND WHY THE STEP IS THE WHOLE ARGUMENT.
//
// A contour map turns a continuous surface into a set of CHOSEN levels. Every other decision on the
// page is visible — the camera, the palette, the levels' own numbers printed on the lines — but the
// STEP between them is not: the reader sees ten bands and reads ten facts, never that somebody
// picked ten. And the step is not a display preference. Too fine, and the map draws detail the field
// cannot support: here the mesh is 7 km and the equal-area camera's own scale error is near 3 %, so
// a 50 km step draws lines whose position is uncertain by a large fraction of the interval it claims
// to resolve. Too coarse, and the thing the story is about disappears into one band: at 400 km the
// whole claim — half the land within 133 km of the sea — falls inside the first band and the map
// says nothing the headline does not already say.
//
// So the step is the control. The bands re-cut, the lines the map draws change, and every one of
// them prints its own break; the answer a pointer gets keeps its measured distance AND names the
// band the chosen step put it in, so the reader watches the same point go from "entre 100 et 150 km"
// to "entre 0 et 400 km" without moving. That comparison is the gesture, and no still, video or
// scrolly can offer it: they must each pick one step and never say so.
//
// ─────────────────────────────────────────────────────────────────────────────────────────────
// ONE GEOMETRY, REPAINTED — the reason this is not four maps.
//
// The field is quantised ONCE, at a fine bin that divides every offered step, and every band cell
// carries its bin index. A step is then a `["step", ["get","b"], …]` expression over that index: the
// map re-cuts with `setPaintProperty` and no source ever reloads. A page that shipped four band
// geometries would be four derivations of one field, which is the "half the beat re-cuts and the
// other half keeps the step before it" defect one file over, wearing this type's face.
//
// The isolines are traced once at every multiple of the fine bin's own line set and filtered by
// `["==", ["%", ["get","level"], km], 0]`, so the lines a step draws are a SUBSET of the lines the
// page carries rather than a second tracing.
//
// ─────────────────────────────────────────────────────────────────────────────────────────────
// WHAT ANSWERS A POINTER IS THE BAND, NOT A DOT (the owner's second arbitration). The class the
// current step put the pointed-at cell in lights up WHOLE — every cell of it, across the continent —
// which is the step's own width made visible: at 400 km hovering Poland lights half of Europe, at
// 50 km a ribbon two counties wide. The darkening is searched off the band's own fill by the beat,
// never a fixed dose.
//
// THE BANDS GO BENEATH THE BASEMAP'S WATER, like the choropleth's fills: the field is defined on
// land only and its cells are quantised squares, so their seaward edge is coarser than MapTiler's
// coastline. Drawn beneath the sea, the coarse edge is hidden by the water and only the inland
// contour remains, which is what a reader is meant to see.

/** Assembled, never written whole — see `live-choropleth.ts` for why a literal here would be
 *  rewritten into the key itself by delivery and make every delivered page refuse to boot. */
export const KEY_PLACEHOLDER = "__MAPTILER" + "_KEY__";

export type LiveContourStep = {
  /** The interval, in the data's own units. */
  km: number;
  /** The slug the radio's id and value carry, and the key every per-step map in the plan is on. */
  slug: string;
  /** What the pill says, and what a screen reader is told instead. */
  label: string;
  announce: string;
  /** The sentence this step owes the reader, with its own measured numbers in it. */
  note: string;
  /** The colour every fine bin wears under this step — one entry per bin, so a band is a run of
   *  equal colours and the expression built from it is a `step` over the bin index. */
  fillByBin: string[];
  /** What the pointed-at band becomes, per fine bin. Searched off its own fill by the beat. */
  activeByBin: string[];
  /** The class each fine bin falls in under this step, so the script can light a WHOLE band. */
  classByBin: number[];
  /** What the answer says about the band, per class: "la bande 150–200 km", and so on. */
  bandDetail: string[];
};

export type LiveContourDeclaration = {
  /** The MapTiler style the plate was baked from; the live map loads the same one. */
  style: string;
  tints: { water: string; land: string };
  studyBounds: { west: number; east: number; south: number; north: number };
  frame: { width: number; height: number };
  degreesPerPixel: number;
  /** The fine quantum the field is binned at, in km, and how many bins there are. Every offered
   *  step must be a whole multiple of it, or a band edge would fall inside a bin and the map would
   *  paint one cell two classes. */
  binKm: number;
  bins: number;
  /** The field, as quantised cells. Each feature carries `b` (fine bin index) and `o` (the index of
   *  the country it falls in), and nothing else: the words are in the plan, once. */
  bands: { type: "FeatureCollection"; features: any[] };
  /** Every traceable level, once. Each feature carries `level` in the data's own units. */
  isolines: { type: "FeatureCollection"; features: any[] };
  /** Where each level prints its own break, as a marker in the page's own embedded faces. */
  labels: { level: number; lon: number; lat: number; text: string }[];
  steps: LiveContourStep[];
  defaultSlug: string;
  /** The isoline's own ink and weight. */
  line: { colour: string; width: number };
  /** The names a pointer can answer with, by owner index, and what each fine bin reads as. */
  countries: string[];
  binDetail: string[];
  locale: { title: string; zoomIn: string; zoomOut: string };
  changeMs: number;
  /** The narrowest thing the map counts, for the derived zoom ceiling — see `fitToStudy`. */
  smallest: { name: string; spanDeg: number };
};

export function assertLiveContourDeclaration(
  d: LiveContourDeclaration,
): LiveContourDeclaration {
  if (!d || typeof d.style !== "string" || !d.style)
    throw new Error(
      "live-contour: the declaration names no MapTiler style, so the live map and the baked plate " +
        "would be two cartographies",
    );
  for (const key of ["water", "land"] as const)
    if (!/^#[0-9a-fA-F]{6}$/.test(d.tints?.[key] ?? ""))
      throw new Error(
        `live-contour: the ${key} tint is ${JSON.stringify(d.tints?.[key])}; the live style is ` +
          `painted with the plate's own two tints, read back from its geometry.json`,
      );
  const b = d.studyBounds;
  if (!b || !(b.west < b.east) || !(b.south < b.north))
    throw new Error(
      `live-contour: the study bounds are ${JSON.stringify(b)} — \`fitBounds\` answers an inverted ` +
        `or empty box by framing the rest of the world`,
    );
  if (
    !(d.frame?.width > 0) ||
    !(d.frame?.height > 0) ||
    !(d.degreesPerPixel > 0)
  )
    throw new Error(
      "live-contour: this plate predates the camera facts (frame + degreesPerPixel): re-bake it",
    );
  if (!(d.binKm > 0) || !(d.bins > 1))
    throw new Error(
      "live-contour: the field is quantised once, at a fine bin every offered step is a multiple " +
        "of; the declaration carries no usable bin",
    );
  if (!d.bands?.features?.length)
    throw new Error(
      "live-contour: the field carries no cells, so the map would draw its isolines over a basemap " +
        "with no field under them — a contour map of nothing",
    );
  if (!d.isolines?.features?.length)
    throw new Error(
      "live-contour: no isoline was traced. The bands alone are a choropleth of a continuous " +
        "surface; the LINE is what makes this form an isoline map",
    );
  if (!d.steps?.length)
    throw new Error(
      "live-contour: no step reaches the layers, so the reader's control would move the sentence " +
        "and leave the map on the step it opened with",
    );
  if (!d.steps.some((s) => s.slug === d.defaultSlug))
    throw new Error(
      `live-contour: the page opens on the step ${JSON.stringify(d.defaultSlug)} and no step ` +
        `carries that slug`,
    );
  const levels = new Set(
    d.isolines.features.map((f: any) => Number(f.properties?.level)),
  );
  for (const step of d.steps) {
    if (!(step.km > 0) || step.km % d.binKm !== 0)
      throw new Error(
        `live-contour: the step ${step.km} km is not a whole multiple of the ${d.binKm} km bin the ` +
          `field is quantised at. A band edge inside a bin paints one cell two classes, and the ` +
          `reader is shown a boundary the field never had.`,
      );
    for (const arr of [step.fillByBin, step.activeByBin, step.classByBin])
      if (!Array.isArray(arr) || arr.length !== d.bins)
        throw new Error(
          `live-contour: the step ${JSON.stringify(step.slug)} carries ${arr?.length} entries for ` +
            `${d.bins} bins. A bin with no colour under a step is a hole in the partition that ` +
            `step claims to make.`,
        );
    for (const colour of [...step.fillByBin, ...step.activeByBin])
      if (!/^#[0-9a-fA-F]{6}$/.test(colour))
        throw new Error(
          `live-contour: the step ${JSON.stringify(step.slug)} gives a bin the colour ` +
            `${JSON.stringify(colour)}, which is not a hex colour`,
        );
    for (let i = 0; i < d.bins; i += 1) {
      const klass = step.classByBin[i];
      if (!(klass >= 0) || !step.bandDetail[klass])
        throw new Error(
          `live-contour: bin ${i} falls in class ${klass} under ${JSON.stringify(step.slug)} and ` +
            `that class answers nothing. A band a reader can point at and get silence from is a ` +
            `band they read as having no reading.`,
        );
    }
    // THE STEP MUST ACTUALLY BE DRAWABLE. A step whose multiples were never traced would move the
    // sentence, re-cut the bands, and leave the map with the lines of the step before it.
    let drawn = 0;
    for (const level of levels) if (level % step.km === 0) drawn += 1;
    if (drawn === 0)
      throw new Error(
        `live-contour: no traced isoline is a multiple of the ${step.km} km step, so choosing it ` +
          `would re-shade the bands and draw no line at all`,
      );
  }
  if (d.binDetail?.length !== d.bins)
    throw new Error(
      `live-contour: ${d.binDetail?.length} bin readings for ${d.bins} bins. The measured distance ` +
        `is what the web adds to this form; a bin that answers nothing hands the reader the band ` +
        `they can already see.`,
    );
  if (!d.countries?.length)
    throw new Error(
      "live-contour: the answer names no country, so a pointer answers half a reading",
    );
  if (!/^#[0-9a-fA-F]{6}$/.test(d.line?.colour ?? "") || !(d.line?.width > 0))
    throw new Error("live-contour: the isoline has no ink or no weight");
  for (const label of d.labels ?? [])
    if (
      !label.text ||
      !Number.isFinite(label.lon) ||
      !Number.isFinite(label.lat)
    )
      throw new Error(
        `live-contour: a level's own break is printed at ${JSON.stringify([label.lon, label.lat])} ` +
          `— a contour set's value only exists if the reader knows what one band represents`,
      );
  for (const key of ["title", "zoomIn", "zoomOut"] as const)
    if (!d.locale?.[key])
      throw new Error(
        `live-contour: MapLibre's ${key} control is left with the library's English default on a ` +
          `French page — a screen reader would read it out in the wrong language`,
      );
  if (!(d.smallest?.spanDeg > 0) || !d.smallest?.name)
    throw new Error(
      "live-contour: the zoom ceiling is derived from the narrowest thing the map counts, and the " +
        "declaration names none. A ceiling derived from the WIDTH of the frame is no ceiling at " +
        "all on a box the owner's full-width ruling has already made wider than the subject.",
    );
  if (!(d.changeMs >= 0))
    throw new Error(
      "live-contour: the re-cut needs a duration (the owner's fourth arbitration: a state change " +
        "interpolates rather than jumps)",
    );
  return d;
}

/** A `step` expression over the fine bin index — the whole re-cut, as one paint property. */
function binExpression(colours: string[]): unknown[] {
  const out: unknown[] = ["step", ["get", "b"], colours[0]];
  for (let i = 1; i < colours.length; i += 1) out.push(i, colours[i]);
  return out;
}

/** THE PLAN THE PAGE CARRIES, as JSON, read back by a script that never met the code that wrote it.
 *  It is a FILE before it is an object, so what is checked here is checked again in the browser. */
export function liveContourPlan(
  d: LiveContourDeclaration,
): Record<string, unknown> {
  assertLiveContourDeclaration(d);
  const opening = d.steps.find((s) => s.slug === d.defaultSlug)!;

  const layers: Record<string, unknown>[] = [
    // THE FIELD. One fill layer over one quantised geometry, repainted per step — never one layer
    // per band and never one geometry per step: the field is measured once and cut four ways.
    {
      id: "mw-bands",
      type: "fill",
      beneath: "water",
      data: d.bands,
      paint: {
        "fill-color": binExpression(opening.fillByBin),
        "fill-opacity": 1,
      },
      hover: true,
    },
    // THE BAND THE POINTER IS IN, WHOLE. Above the field so the lit band is not covered by its
    // neighbours, filtered to nothing until a pointer lands. What it shows is the STEP'S OWN WIDTH:
    // the extent of the class the chosen step put this point in.
    {
      id: "mw-active",
      type: "fill",
      beneath: "water",
      // THE SAME SOURCE AS THE FIELD, NAMED RATHER THAN COPIED. Handing this layer its own `data`
      // put a second copy of every quantised cell in the page's JSON — measured at 1,07 MB of the
      // plan's 2,13 — and a second copy is also a second thing that can drift from the field the
      // answer is read off. One geometry means one source.
      sameSourceAs: "mw-bands",
      paint: {
        "fill-color": binExpression(opening.activeByBin),
        "fill-opacity": 1,
      },
      filter: ["==", ["get", "b"], -1],
      hover: false,
    },
    // THE ISOLINES, traced once and filtered per step. Drawn ABOVE the water rather than beneath it,
    // because a contour line is the beat's own mark and not a coastline: it stops at the coast on
    // its own (the field is defined on land only) and it must not be hidden by the sea it stops at.
    {
      id: "mw-lines",
      type: "line",
      data: d.isolines,
      filter: ["==", ["%", ["get", "level"], opening.km], 0],
      paint: {
        "line-color": d.line.colour,
        "line-width": d.line.width,
        "line-opacity": 0.85,
      },
      layout: { "line-cap": "round", "line-join": "round" },
      hover: false,
    },
  ];

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
    binKm: d.binKm,
    bins: d.bins,
    labels: d.labels,
    countries: d.countries,
    binDetail: d.binDetail,
    defaultSlug: d.defaultSlug,
    /** One re-cut per step, keyed by the SLUG the radio's own id and value carry — one vocabulary,
     *  three readers (the radio, the stylesheet, this plan), which is what keeps the sentence, the
     *  table and the map from answering three different partitions of one field. */
    steps: Object.fromEntries(
      d.steps.map((step) => [
        step.slug,
        {
          km: step.km,
          fill: binExpression(step.fillByBin),
          active: binExpression(step.activeByBin),
          classByBin: step.classByBin,
          bandDetail: step.bandDetail,
        },
      ]),
    ),
    layers,
  };
}

/**
 * THE RULES. Every one is conditional on `.mw-live` except the live box's own resting state, so a
 * page whose script never runs is drawn exactly as it was before this file existed.
 */
export function liveContourCss({ scope }: { scope: string }): string {
  const live = `.mw-live ${scope}`;
  return [
    // BOTH LAYERS ARE ONE BOX, AND THE BOX IS THE STAGE — the owner's full-width ruling. The
    // format's cell carries the drawing's own viewBox ratio so `preserveAspectRatio="none"` cannot
    // stretch it; neither of these two is stretched (the fallback is `slice`, and a live map has no
    // ratio to protect), so both take the plot's whole track rather than the cell inside it.
    `${scope} .map-layer, ${scope} svg.chart { grid-column: 1 / -1; grid-row: 1; width: 100%; height: 100%; min-width: 0; min-height: 0; margin: 0; }`,
    `${scope} .map-layer { visibility: hidden; }`,
    `${live} .map-layer { visibility: visible; }`,
    // ONE BASEMAP, NOT TWO, and only once the live map is actually up.
    `${live} [data-plate] { display: none; }`,
    // WITH NO SCRIPT THERE IS NO DESCRIPTION EITHER — a sentence about dragging a map that cannot be
    // dragged is the dead control this arrangement exists not to ship.
    `${scope} .live-hint[hidden] { display: none; }`,
    // EVERY LEVEL PRINTS ITS OWN BREAK, ON THE LINE, in the page's own embedded faces — a MapLibre
    // symbol layer would fetch its glyphs from a second host and in a typeface nobody here chose.
    // The marker is a DOM element MapLibre keeps anchored through every zoom and every drag.
    `${scope} .mw-level { font: 700 12px var(--value-family, inherit); color: var(--ink); background: var(--ground); border-radius: 2px; padding: 1px 4px; pointer-events: none; white-space: nowrap; }`,
    `${scope} .mw-level[hidden] { display: none; }`,
    // THE TABLE'S ROW FOR A LEVEL THE CHOSEN STEP DOES NOT DRAW. Not removed — the reader is meant
    // to SEE which levels the step drops, which is the half of the gesture that survives with no
    // script at all.
    `${scope} tr[data-mark] { transition: opacity 120ms linear, color 120ms linear; }`,
  ].join("\n\n");
}

/**
 * THE SCRIPT, authored as a classic `<script>` body — no module, no bundler, so it keeps working in
 * a CMS iframe or a sandboxed embed that refuses module scripts. It derives no geometry and formats
 * no WORD: every glyph a reader can be shown was cut into the page's own embedded faces at build
 * time, which is why the answers, the level labels and the control names travel in the plan's JSON.
 *
 * `styleModule` is `assets/style.mjs`'s own source with its `export` keywords stripped, handed in by
 * the beat: the sweep that decides what a basemap layer becomes is stated ONCE, in that file, and
 * applied twice — to the style document the plate is baked from, and to the live style here.
 */
export function liveContourScript(
  d: LiveContourDeclaration,
  {
    scope,
    styleModule,
    controlName,
  }: { scope: string; styleModule: string; controlName: string },
): string {
  assertLiveContourDeclaration(d);
  if (
    typeof styleModule !== "string" ||
    !/function\s+applyLiveStyle/.test(styleModule)
  )
    throw new Error(
      "live-contour: the style sweep is handed in by the beat (the source of " +
        "`skills/map-web/assets/style.mjs`, with its `export` keywords stripped) because a page " +
        "script cannot import. What it was given does not define `applyLiveStyle`.",
    );
  if (/\bexport\s/.test(styleModule))
    throw new Error(
      "live-contour: the style sweep still carries `export`, which is a syntax error in a classic " +
        "script. The whole live layer would fail to parse and the fallback would stand with no " +
        "error anyone could see — the one failure mode this arrangement cannot report.",
    );
  liveContourPlan(d);
  const NAME = JSON.stringify(controlName);
  const SCOPE = JSON.stringify(scope);
  return `${styleModule}
(function () {
  var doc = document;
  var planNode = doc.getElementById("mw-live-plan");
  if (!planNode) return;
  var PLAN;
  try { PLAN = JSON.parse(planNode.textContent); } catch (err) { return; }
  // ASSEMBLED IN TWO HALVES, never written whole: delivery substitutes every occurrence of the
  // placeholder in the delivered file, and THIS SCRIPT IS IN THAT FILE.
  var SENTINEL = "__MAPTILER" + "_KEY__";
  if (!PLAN || !PLAN.styleUrl || PLAN.styleUrl.indexOf(SENTINEL) >= 0) return;
  if (!window.maplibregl) return;
  var figure = doc.querySelector(${SCOPE});
  var box = figure && figure.querySelector(".map-layer");
  if (!box) return;
  // LOOKED UP LATE, ON PURPOSE: this script is inlined INSIDE the figure and the format writes its
  // "#tooltip" AFTER the figure, so at the moment this runs the element does not exist yet.
  function tip() { return doc.getElementById("tooltip"); }

  // THE PLAN IS VALIDATED BY WHOEVER DRAWS FROM IT. It reached here as JSON, from a render that ran
  // on another machine on another day: nothing the writer checked survived the journey.
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
  if (!PLAN.steps || !PLAN.steps[PLAN.defaultSlug])
    throw new Error("this page's live plan carries no step for the interval it opens on");

  // NO PADDING, AND THAT IS NOT A SAVING — IT IS THE SAME CAMERA. The plate beneath this map was
  // baked by fitting the BEAT'S OWN declared window into its frame with padding 0; a live fit that
  // padded the same window would be a second camera, and the swap from plate to live map would be
  // visible as a jump.
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

  function waterId() {
    var layers = map.getStyle().layers;
    for (var i = 0; i < layers.length; i++)
      if (styleDecisionFor(layers[i]).tint === "water") return layers[i].id;
    throw new Error("the style carries no water fill for this beat's field to be drawn beneath, so the quantised cells' coarse seaward edge would stand over MapTiler's own coastline");
  }

  function mountLayers() {
    var before = waterId();
    var sources = {};
    for (var i = 0; i < PLAN.layers.length; i++) {
      var layer = PLAN.layers[i];
      var src;
      if (layer.sameSourceAs) {
        src = sources[layer.sameSourceAs];
        if (!src)
          throw new Error('layer "' + layer.id + '" names the source of "' + layer.sameSourceAs + '", which is not mounted yet - MapLibre would draw nothing and report nothing');
      } else {
        src = "mw-src-" + i;
        sources[layer.id] = src;
        map.addSource(src, { type: "geojson", data: layer.data });
      }
      var spec = { id: layer.id, type: layer.type, source: src, paint: layer.paint };
      if (layer.layout) spec.layout = layer.layout;
      if (layer.filter) spec.filter = layer.filter;
      map.addLayer(spec, layer.beneath === "water" ? before : undefined);
      // ONE CLOCK FOR THE RE-CUT, AND IT IS THE BEAT'S. MapLibre eases every paint change over its
      // own default 300 ms; the page's own sentences and rows are eased by the stylesheet over the
      // beat's number, and two clocks on one gesture is two halves of one reading coming apart.
      if (layer.type === "fill")
        map.setPaintProperty(layer.id, "fill-color-transition", { duration: PLAN.changeMs, delay: 0 }, { validate: false });
    }
  }

  // EVERY LEVEL'S OWN BREAK, PRINTED ON ITS LINE, as a MapLibre marker in the page's own faces.
  var markers = [];
  function mountLabels() {
    for (var i = 0; i < PLAN.labels.length; i++) {
      var label = PLAN.labels[i];
      var el = doc.createElement("span");
      el.className = "mw-level";
      el.setAttribute("data-level", String(label.level));
      el.textContent = label.text;
      markers.push({ level: label.level, el: el, marker: new window.maplibregl.Marker({ element: el }).setLngLat([label.lon, label.lat]).addTo(map) });
    }
  }

  function currentSlug() {
    var checked = doc.querySelector("input[name=" + ${NAME} + "]:checked");
    return (checked && checked.value) || PLAN.defaultSlug;
  }
  var STEP = PLAN.steps[PLAN.defaultSlug];
  function applyStep(slug) {
    var step = PLAN.steps[slug];
    if (!step) return;
    STEP = step;
    if (map.getLayer("mw-bands")) map.setPaintProperty("mw-bands", "fill-color", step.fill);
    if (map.getLayer("mw-active")) map.setPaintProperty("mw-active", "fill-color", step.active);
    // THE LINES A STEP DRAWS ARE A SUBSET OF THE LINES THE PAGE CARRIES, never a second tracing.
    if (map.getLayer("mw-lines")) map.setFilter("mw-lines", ["==", ["%", ["get", "level"], step.km], 0]);
    for (var i = 0; i < markers.length; i++) markers[i].el.hidden = markers[i].level % step.km !== 0;
    figure.setAttribute("data-live-step", String(step.km));
  }

  map.on("style.load", function () {
    // A FLAT WEB MERCATOR MAP (the owner, 2026-09-15: "oui une carte MapLibre plate pas un globe").
    if (map.setProjection) map.setProjection({ type: PLAN.projection || "mercator" });
    // The trunk's own sweep, ASSERTED rather than assumed: a sweep that re-tinted nothing did not
    // find the style it was written against.
    assertLiveStyleAnswered(applyLiveStyle(map, { tints: PLAN.tints }), PLAN.styleName || PLAN.styleUrl);
    mountLayers();
    mountLabels();
    applyStep(currentSlug());
  });

  function fitToStudy() {
    map.setMaxBounds(null);
    map.setMinZoom(-2);
    map.fitBounds(
      [[PLAN.studyBounds.west, PLAN.studyBounds.south], [PLAN.studyBounds.east, PLAN.studyBounds.north]],
      { padding: FIT_PADDING_PX, animate: false }
    );
    // THE READER'S LEASH, set once the camera has actually fitted. The floor is the published
    // framing; the ceiling is where the narrowest thing the map counts becomes pointable, DERIVED
    // from the view that resulted rather than typed. Set AFTER the fit: a bound set before it
    // constrains the fit itself.
    var fitted = map.getZoom();
    var visible = map.getBounds();
    var visibleSpan = Math.abs(visible.getEast() - visible.getWest());
    map.setMinZoom(fitted);
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
    applyStep(event.target.value);
    hide();
  });

  // THE POINTER IS RESOLVED ON THE LAYER'S OWN FEATURES, never on a collision test of ours: a fill
  // layer answers anywhere inside the cell, and it keeps answering after a zoom and after a pan
  // because there is no coordinate read once at initialisation to go stale.
  var hovering = -1;
  var NOTHING = ["==", ["get", "b"], -1];
  function hide() {
    hovering = -1;
    var tooltip = tip();
    if (tooltip) tooltip.hidden = true;
    if (map.getLayer("mw-active")) map.setFilter("mw-active", NOTHING);
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
  function show(bin, owner, event) {
    if (bin !== hovering) {
      hovering = bin;
      // THE WHOLE BAND LIGHTS UP, which is the step's own width made visible: every bin the chosen
      // step put in the same class, across the continent.
      var klass = STEP.classByBin[bin];
      var lo = STEP.classByBin.indexOf(klass);
      var hi = STEP.classByBin.lastIndexOf(klass);
      if (map.getLayer("mw-active"))
        map.setFilter("mw-active", ["all", [">=", ["get", "b"], lo], ["<=", ["get", "b"], hi]]);
      var tooltip = tip();
      if (tooltip) {
        tooltip.textContent = PLAN.countries[owner] + " \\u00b7 " + PLAN.binDetail[bin] + " \\u00b7 " + STEP.bandDetail[klass];
        tooltip.hidden = false;
      }
    }
    place(event);
  }
  var hoverLayers = [];
  for (var h = 0; h < PLAN.layers.length; h++) if (PLAN.layers[h].hover) hoverLayers.push(PLAN.layers[h].id);
  map.on("mousemove", function (event) {
    var live = [];
    for (var i = 0; i < hoverLayers.length; i++) if (map.getLayer(hoverLayers[i])) live.push(hoverLayers[i]);
    var hits = map.queryRenderedFeatures(event.point, { layers: live });
    var props = hits.length ? hits[0].properties : null;
    if (!props || !(props.b >= 0) || !PLAN.binDetail[props.b]) { map.getCanvas().style.cursor = ""; hide(); return; }
    map.getCanvas().style.cursor = "crosshair";
    show(props.b, props.o, event);
  });
  map.on("mouseout", hide);
  map.on("movestart", hide);
})();`;
}

/**
 * THE GUARD THAT READS THE WRITTEN PAGE BACK — the half no declaration-level check can make.
 *
 * The page's three halves of one gesture are the radios' own sentences (pure CSS), the table rows a
 * step dims (pure CSS), and the map's layers (script). This holds the LAYERS' half against the same
 * derivation the markup was drawn from: a step that re-writes the sentence and leaves the map on the
 * interval before it is a page where half the beat answers one partition of the field.
 */
export function assertSteppingReachesTheLayers(
  html: string,
  d: LiveContourDeclaration,
  /** What each bin SHOULD wear under each step, derived the way the MARKUP derives it rather than
   *  read back off the object the plan was built from — two readings of one variable is not a
   *  check, and a mutation that wronged both sides together would pass it green. */
  expected: (slug: string) => string[],
  /** The plate's own recorded style, read from `geometry.json`. */
  plateStyle: string,
  { where = "this page" }: { where?: string } = {},
): void {
  assertLiveContourDeclaration(d);
  const node = /<script[^>]+id="mw-live-plan"[^>]*>([\s\S]*?)<\/script>/.exec(
    String(html),
  );
  if (!node)
    throw new Error(
      `${where}: the page carries no live plan, so its map is a picture and its control moves the ` +
        `sentence only`,
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
        `cartography or they are a visible swap.`,
    );
  for (const step of d.steps) {
    const shipped = plan.steps?.[step.slug];
    if (!shipped)
      throw new Error(
        `${where}: the live plan carries no re-cut for the ${step.km} km step. The sentence would ` +
          `change under it and the map would keep the step before it — one control, two fields.`,
      );
    if (shipped.km !== step.km)
      throw new Error(
        `${where}: the ${JSON.stringify(step.slug)} pill says ${step.km} km and the plan draws its ` +
          `lines at ${shipped.km} km`,
      );
    const want = expected(step.slug);
    const painted: string[] = [];
    const expr = shipped.fill as unknown[];
    if (!Array.isArray(expr) || expr[0] !== "step")
      throw new Error(
        `${where}: the ${JSON.stringify(step.slug)} re-cut is not a step expression over the bin ` +
          `index, so the field would be painted one colour`,
      );
    let colour = expr[2] as string;
    let cut = 3;
    for (let bin = 0; bin < d.bins; bin += 1) {
      while (cut + 1 < expr.length && (expr[cut] as number) <= bin) {
        colour = expr[cut + 1] as string;
        cut += 2;
      }
      painted.push(colour);
    }
    for (let bin = 0; bin < d.bins; bin += 1)
      if (painted[bin] !== want[bin])
        throw new Error(
          `${where}: under the ${step.km} km step the live map paints bin ${bin} ` +
            `${JSON.stringify(painted[bin])} where the page's own derivation says ` +
            `${JSON.stringify(want[bin])}. Two derivations of one field is how half a beat re-cuts ` +
            `and the other half keeps the step before it.`,
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
