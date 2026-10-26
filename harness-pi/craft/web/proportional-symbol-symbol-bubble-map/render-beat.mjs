// The generic half of a proportional-symbol WEB beat, taken from
// proof/web-proportional-symbol-europe-capacity/render-directions-web.mjs with everything about ITS
// subject removed. The page is the worked example's: a LIVE MapTiler map (the countries drawn as
// neutral ground, one translucent circle per place, its AREA the value, held in screen pixels so a
// value never means two sizes at two zooms) over a frozen picture of that map, and ONE control — the
// reader picks the EXPONENT of the size scale (area law, the radius law the type sheet calls wrong,
// a flattened law), because the spread between the circles is the one thing a symbol map sets in
// silence. Every circle and the size legend re-scale; a sentence prints the area ratio each law
// shows between the largest and the median place against their true ratio, and how many places it
// erases. With no script the table's swatches follow the law in pure CSS. Hovering a circle answers
// its reading (the smallest circle under the pointer answers). This file computes the laws, the
// radii, the legend's magnitudes, the review camera, the zoom ceiling and the cost of Web Mercator
// for THIS subject; ./beat.mjs — the one file the model writes — gives the places and the WORDS.
// Copied into the beat by the harness; never edited by the model.
//
// Usage:  bun <beat>/render-beat.mjs
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { contrast, mix } from "#shared/chart-beat/colour.mjs";
import { deriveFurniture } from "#shared/chart-beat/render-still.mjs";
import { guardColour } from "#shared/design-base/compose.mjs";
import { assertNotFallback, maptilerGlyphs } from "#shared/map-beat/glyphs.mjs";
import { frameProjector, markOccupancy, occupancyLine } from "#shared/map-beat/occupancy.mjs";
import { countryGround, plateGrounds, plateTints } from "#shared/map-beat/tints.mjs";
import { applyStoryboard, assertDrawsClaimColumn, assertHeadlineNumbersDrawn, assertNumbers } from "./guards.mjs";
import { ensurePlate, liveAssets, mapWeb, maptilerKey, renderLiveMapPage, verifyLiveMap } from "./map-web.mjs";
import { plateWaterField } from "./plate-water.mjs";
import { chartWeb, pickDirection, plain, plainRegisters, refusing, storyLanguage } from "./web.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
/** The camera the radii are stated at: the box the frozen photograph is taken in (live scale 1). */
const REVIEW_BOX = { width: 1464, height: 520 };
/** What the largest place is drawn at, in review pixels. */
const R_MAX = 40;
/** The legibility floor, in review pixels: under it a circle reads as no data. */
const R_FLOOR = 1;
/** A labelled circle must hold two lines of 13 px text under the area law. */
const LABEL_MIN_RADIUS = 22;
const PLATE_SIZE = "1824x1216";
const LAND_DOSE = 0.07;
/** The three laws, in the order the control offers them; the first is the honest one and the default. */
const LAWS = [
  { key: "area", exponent: 0.5 },
  { key: "radius", exponent: 1 },
  { key: "flat", exponent: 1 / 3 },
];

await refusing(HERE, async () => {
  const { default: beat } = await import("./beat.mjs");
  applyStoryboard(beat, HERE);
  const { renderWeb, MAP_DRAWING_SHARE } = await import(chartWeb(HERE, "scripts", "render-web.mjs"));
  const { niceReferenceValues } = await import(mapWeb(HERE, "assets", "geo-symbol.ts"));
  const { areaScaleFacts, areaScaleSlugOf, assertAreaScaleDeclaration, assertOneAreaScale, radiiUnder, radiusUnder, maxValueOf } = await import(mapWeb(HERE, "assets", "area-scale.ts"));
  const { assertSymbolLawsReachTheLayers, liveSymbolsPlan, liveSymbolsScript } = await import(mapWeb(HERE, "assets", "live-symbols.ts"));
  const { DirectedSymbolMapWeb, symbolPaint, ROW_SCALE } = await import("./DirectedSymbolMapWeb.tsx");

  // ── the fields ────────────────────────────────────────────────────────────────────────────────
  const REQUIRED = ["eyebrow", "symbols", "labelled", "figure", "number", "detail", "lawLabel", "laws", "callout", "mercator", "hint", "title", "limits", "reading", "source", "alt", "tableCaption", "columns", "check"];
  const missingFields = REQUIRED.filter((key) => beat[key] === undefined);
  if (missingFields.length) throw new Error(`beat.mjs is missing ${missingFields.join(", ")}: give each as a field of the default export (export default { …, ${missingFields[0]}: … }), not as a separate export (see CONTRACT.md)`);
  for (const fn of ["figure", "number", "detail", "callout", "mercator", "check"])
    if (typeof beat[fn] !== "function") throw new Error(`beat.mjs: ${fn} must be a function (see CONTRACT.md)`);
  for (const law of LAWS) {
    const w = beat.laws[law.key];
    if (!w || typeof w.label !== "string" || typeof w.announce !== "string" || (law.key !== "area" && typeof w.note !== "function"))
      throw new Error(`beat.mjs: laws.${law.key} must be { label, announce${law.key === "area" ? "" : ", note(f)"} } (see CONTRACT.md)`);
  }
  if (!Array.isArray(beat.columns) || beat.columns.length !== 3) throw new Error("columns must be the table's three headings: place, value, rank (see CONTRACT.md)");

  // ── the places, and the join that measures the land under them ─────────────────────────────
  const geo = JSON.parse(readFileSync(join(HERE, "shapes.geojson"), "utf8"));
  const featuresOf = (iso) => geo.features.filter((f) => f.properties.iso === iso);
  if (!Array.isArray(beat.symbols) || beat.symbols.length < 2) throw new Error("symbols must be one { iso, name, value, lon, lat } per place (at least two)");
  assertNumbers(beat.symbols.map((s) => [s.name, s.value]));
  beat.symbols.forEach((s, i) => {
    if (!(s.value > 0)) throw new Error(`symbols[${i}] (${s.name}) has value ${s.value}: a circle's area draws a positive quantity — leave out the places with none`);
    if (![s.lon, s.lat].every(Number.isFinite) || Math.abs(s.lon) > 180 || Math.abs(s.lat) > 90) throw new Error(`symbols[${i}] (${s.name}) needs numeric lon and lat read from data.json`);
    if (!String(s.name ?? "").trim()) throw new Error(`symbols[${i}] has no name`);
    if (!/^[A-Z]{3}$/.test(String(s.iso)) || !featuresOf(s.iso).length)
      throw new Error(`symbols[${i}] (${s.name}) has iso ${JSON.stringify(s.iso)}, which matches no country on the map: give the ISO alpha-3 code of the country the place is in (resolve names with countries.mjs) — this kit draws Europe and its neighbours only`);
  });
  if (new Set(beat.symbols.map((s) => s.name)).size !== beat.symbols.length) throw new Error("two symbols share one name: every circle must be named once");
  const rows = [...beat.symbols].sort((a, b) => b.value - a.value).map((s, i) => ({ ...s, key: `m${i}`, name: plain(s.name) }));
  const total = rows.reduce((t, r) => t + r.value, 0);
  const biggest = rows[0];
  const median = rows[Math.floor(rows.length / 2)];

  beat.check({ ranked: rows.map((r) => ({ name: r.name, iso: r.iso, value: r.value })), total, value: (name) => rows.find((r) => r.name === name)?.value ?? null });
  assertDrawsClaimColumn(rows.map((r) => r.value), HERE);

  // ── ONE direction, its plate (the camera's record) ─────────────────────────────────────────
  const number = (v, d) => plain(beat.number(v, d));
  const figure = (v) => plain(beat.figure(v));
  const keyValues = niceReferenceValues(biggest.value, 3).map((value, i) => ({ key: `k${i}`, value }));
  const keySizes = keyValues.map((k) => ({ key: k.key, label: figure(k.value) }));
  const lawWords = Object.fromEntries(LAWS.map((l) => [l.key, { label: plain(beat.laws[l.key].label), announce: plain(beat.laws[l.key].announce) }]));
  const titles = [beat.title].flat();
  const title = plain(titles[0]);
  const caveatHead = plain([beat.limits].flat()[0]);
  const reading = plain([beat.reading].flat()[0]);
  const source = plain(beat.source);
  const hint = plain(beat.hint);
  const eyebrow = plain(beat.eyebrow);
  const columns = beat.columns.map(plain);
  const callout = plain(beat.callout({ ranked: rows.map((r) => ({ name: r.name, value: r.value })), total }));
  const registersOf = (caveat, notes, tableCaption, symbols) => ({
    display: title,
    eyebrow,
    body: `${caveat} ${reading} ${source} ${plain(beat.lawLabel)} ${LAWS.map((l) => lawWords[l.key].label).join(" ")}`,
    axis: `${keySizes.map((k) => k.label).join(" ")} ${tableCaption} ${columns.join(" ")} ${symbols.map((s) => `${s.name} ${s.figure} ${s.rank}`).join(" ")}`,
    annot: `${callout} ${notes.join(" ")} ${hint}`,
    value: symbols.filter((s) => s.label).map((s) => `${s.name} ${s.figure}`).join(" "),
  });
  const draftSymbols = rows.map((r, i) => ({ name: r.name, figure: figure(r.value), rank: i + 1, label: null }));
  const { label, direction } = pickDirection(HERE, plainRegisters(registersOf(caveatHead, [], "", draftSymbols)), beat.evidenceLevels ?? 3);
  const base = direction;
  const plateTint = plateTints(base, { landDose: LAND_DOSE });
  const plateFacts = ensurePlate({ here: HERE, label, water: plateTint.water, land: plateTint.land, frame: PLATE_SIZE.split("x").map(Number), args: ["--countries", join(HERE, "shapes.geojson")] });
  const STUDY = { west: plateFacts.bounds[0][0], south: plateFacts.bounds[0][1], east: plateFacts.bounds[1][0], north: plateFacts.bounds[1][1] };

  // ── the review camera, computed the way MapLibre fits it ───────────────────────────────────
  const RAD = Math.PI / 180;
  const mercY = (lat) => Math.log(Math.tan(lat * RAD) + 1 / Math.cos(lat * RAD));
  const yUnit = (lat) => (1 - mercY(lat) / Math.PI) / 2;
  const REVIEW_WORLD = Math.min(REVIEW_BOX.width / ((STUDY.east - STUDY.west) / 360), REVIEW_BOX.height / (yUnit(STUDY.south) - yUnit(STUDY.north)));
  const REVIEW_LON_SHOWN = (REVIEW_BOX.width / REVIEW_WORLD) * 360;
  if (!(REVIEW_BOX.height / (yUnit(STUDY.south) - yUnit(STUDY.north)) < REVIEW_BOX.width / ((STUDY.east - STUDY.west) / 360)))
    throw new Error("the review camera is bound by its width, not its height: the size legend's script-free size would be wrong (a defect in the kit, not in beat.mjs)");

  // ── WHAT WEB MERCATOR COSTS THIS SUBJECT: the land under the circles, not the circles ────────
  const toReviewPx = ([lon, lat]) => [((lon - STUDY.west) / 360) * REVIEW_WORLD, (yUnit(lat) - yUnit(STUDY.north)) * REVIEW_WORLD];
  const shoelace = (ring) => {
    let sum = 0;
    for (let i = 0; i < ring.length; i += 1) {
      const [x1, y1] = ring[i];
      const [x2, y2] = ring[(i + 1) % ring.length];
      sum += x1 * y2 - x2 * y1;
    }
    return Math.abs(sum) / 2;
  };
  const sphericalArea = (ring) => {
    let sum = 0;
    for (let i = 0; i < ring.length; i += 1) {
      const [l1, p1] = ring[i];
      const [l2, p2] = ring[(i + 1) % ring.length];
      sum += (l2 - l1) * RAD * (2 + Math.sin(p1 * RAD) + Math.sin(p2 * RAD));
    }
    return Math.abs((sum * 6371.0088 * 6371.0088) / 2);
  };
  const REVIEW_FRAME = { west: (STUDY.west + STUDY.east) / 2 - REVIEW_LON_SHOWN / 2, east: (STUDY.west + STUDY.east) / 2 + REVIEW_LON_SHOWN / 2, south: STUDY.south, north: STUDY.north };
  // What the review camera really draws: a circle outside it is a circle nobody sees.
  const outside = rows.filter((r) => r.lon < REVIEW_FRAME.west || r.lon > REVIEW_FRAME.east || r.lat < REVIEW_FRAME.south || r.lat > REVIEW_FRAME.north);
  if (outside.length) throw new Error(`${outside.map((r) => r.name).join(", ")} sit outside the Europe camera (${REVIEW_FRAME.west.toFixed(1)}..${REVIEW_FRAME.east.toFixed(1)}°E, ${STUDY.south}..${STUDY.north}°N): leave them out of symbols`);
  const inFrame = ([lon, lat]) => lon >= REVIEW_FRAME.west && lon <= REVIEW_FRAME.east && lat >= REVIEW_FRAME.south && lat <= REVIEW_FRAME.north;
  // A country reaching far outside the frame (Russia) is most of the land the frame can draw and only
  // a slice of it is inside: every share computed with it in would be a share of it. Set aside.
  const heldWhole = (iso) =>
    featuresOf(iso).every((f) => {
      const polys = f.geometry.type === "Polygon" ? [f.geometry.coordinates] : f.geometry.coordinates;
      const ring = polys.map((p) => p[0]).sort((a, b) => b.length - a.length)[0];
      return ring.every(([lon, lat]) => lon >= STUDY.west - 15 && lon <= STUDY.east + 15);
    });
  const isos = [...new Set(rows.map((r) => r.iso))];
  const setAside = isos.filter((iso) => !heldWhole(iso));
  const areas = new Map();
  for (const iso of isos) {
    if (setAside.includes(iso)) continue;
    let page = 0;
    let real = 0;
    for (const f of featuresOf(iso)) {
      const polys = f.geometry.type === "Polygon" ? [f.geometry.coordinates] : f.geometry.coordinates;
      for (const poly of polys) {
        if (!poly[0].some(inFrame)) continue;
        page += shoelace(poly[0].map(toReviewPx));
        real += sphericalArea(poly[0]);
      }
    }
    if (page > 0) areas.set(iso, { page, real });
  }
  const PAGE_TOTAL = [...areas.values()].reduce((s, a) => s + a.page, 0);
  const REAL_TOTAL = [...areas.values()].reduce((s, a) => s + a.real, 0);
  const weightOf = (iso) => areas.get(iso).page / PAGE_TOTAL / (areas.get(iso).real / REAL_TOTAL);
  const inflated = beat.inflated ?? [...areas.keys()].sort((a, b) => weightOf(b) - weightOf(a)).slice(0, 3);
  const notMeasured = inflated.filter((iso) => !areas.has(iso));
  if (notMeasured.length) throw new Error(`inflated names ${notMeasured.join(", ")}, which no circle stands on (or which the frame does not draw whole): name iso codes from symbols, or leave inflated out`);
  const pageShare = (inflated.reduce((s, c) => s + areas.get(c).page, 0) / PAGE_TOTAL) * 100;
  const trueShare = (inflated.reduce((s, c) => s + areas.get(c).real, 0) / REAL_TOTAL) * 100;
  if (!(pageShare > trueShare)) throw new Error(`${inflated.join(", ")} cover ${pageShare.toFixed(1)} % of the drawn land for ${trueShare.toFixed(1)} % of the real land: Mercator does not inflate them — name northern countries in inflated, or leave it out`);
  const nameOfIso = (iso) => featuresOf(iso)[0]?.properties?.name ?? iso;
  const merc = { names: inflated.map((iso) => plain(beat.countryNames?.[iso] ?? nameOfIso(iso))), pageShare, trueShare, setAside: setAside.map((iso) => plain(beat.countryNames?.[iso] ?? nameOfIso(iso))) };
  const mercator = plain(beat.mercator(merc));
  for (const [what, v] of [["pageShare", pageShare], ["trueShare", trueShare]])
    if (!new RegExp(`(^|\\D)${Math.round(v)}(\\D|$)`).test(mercator)) throw new Error(`mercator(m) must state m.${what} rounded (${Math.round(v)}); it says "${mercator}"`);
  console.log(`what Mercator costs (the land under the circles; set aside: ${setAside.join(", ") || "none"}): ${inflated.join("+")} ${pageShare.toFixed(1)} % of the drawn land for ${trueShare.toFixed(1)} % of the real land`);

  // ── the zoom ceiling: never narrower than the largest place's own country ───────────────────
  let west = Infinity;
  let east = -Infinity;
  const walk = (node) => {
    if (typeof node[0] === "number") {
      if (node[0] < STUDY.west || node[0] > STUDY.east) return;
      west = Math.min(west, node[0]);
      east = Math.max(east, node[0]);
    } else node.forEach(walk);
  };
  for (const f of featuresOf(biggest.iso)) walk(f.geometry.coordinates);
  const SUBJECT_SPAN_DEG = east - west;

  // ── THE SCALE LAWS ─────────────────────────────────────────────────────────────────────────
  const baseScale = {
    label: plain(beat.lawLabel),
    values: rows.map((r) => ({ key: r.key, value: r.value })),
    keyValues,
    maxRadius: R_MAX,
    floor: R_FLOOR,
    subjectKey: biggest.key,
    referenceKey: median.key,
  };
  const lawOptions = LAWS.map((l) => ({ key: l.key, label: lawWords[l.key].label, exponent: l.exponent }));
  const lawFacts = lawOptions.map((option) => areaScaleFacts({ ...baseScale, options: lawOptions }, option));
  const notes = {};
  for (const [i, law] of LAWS.entries()) {
    if (law.key === "area") continue;
    const f = { shown: lawFacts[i].shown, truth: lawFacts[i].truth, erased: lawFacts[i].erased.length, total: rows.length, subject: biggest.name, reference: median.name };
    notes[law.key] = plain(beat.laws[law.key].note(f));
  }
  const scale = {
    ...baseScale,
    options: lawOptions.map((o) => ({ ...o, announce: lawWords[o.key].announce, ...(notes[o.key] ? { note: notes[o.key] } : {}) })),
  };
  // The vocabulary refuses a note that does not print the shown and true ratios (number(v, 1)) and
  // the count it erases (number(n, 0)), formatted as beat.number formats them.
  assertAreaScaleDeclaration(scale, { fr: number });
  for (const [i, law] of LAWS.entries())
    console.log(`law ${law.key.padEnd(6)} exponent ${law.exponent.toFixed(4)}: ${biggest.name} shown ${lawFacts[i].shown.toFixed(1)}x ${median.name}, for ${lawFacts[i].truth.toFixed(1)}x its value · ${lawFacts[i].erased.length} under the ${R_FLOOR} px floor`);
  const MAX_VALUE = maxValueOf(scale);
  const VALUE_OF = new Map(rows.map((r) => [r.key, r.value]));
  const EXPONENT_OF = new Map(LAWS.map((law) => [areaScaleSlugOf(law.key), law.exponent]));
  const radiusFor = (markKey, lawSlug) => radiusUnder(VALUE_OF.get(markKey), MAX_VALUE, R_MAX, EXPONENT_OF.get(lawSlug));

  // ── which places carry a label: the claim's own ────────────────────────────────────────────
  if (!Array.isArray(beat.labelled) || beat.labelled.length > 6) throw new Error("labelled must list at most 6 symbol names — the places the title is about");
  const unknown = beat.labelled.filter((n) => !rows.some((r) => r.name === plain(n)));
  if (unknown.length) throw new Error(`labelled names ${unknown.join(", ")}, which no symbol carries (use the symbols' names exactly)`);
  const LABELLED = new Set(rows.filter((r) => beat.labelled.map(plain).includes(r.name)).map((r) => r.key));
  for (const r of rows)
    if (LABELLED.has(r.key) && radiusFor(r.key, areaScaleSlugOf("area")) < LABEL_MIN_RADIUS)
      throw new Error(`${r.name} is labelled and its circle is ${radiusFor(r.key, areaScaleSlugOf("area")).toFixed(1)} px of radius, under the ${LABEL_MIN_RADIUS} px two lines of text need: leave it out of labelled`);

  const symbols = rows.map((r, index) => {
    const detail = plain(beat.detail({ ...r, rank: index + 1, of: rows.length, share: (r.value / total) * 100, total }));
    if (!detail.includes(r.name)) throw new Error(`detail() must name the place it answers for: ${r.name} → "${detail}"`);
    return { key: r.key, name: r.name, figure: figure(r.value), rank: index + 1, lon: r.lon, lat: r.lat, label: LABELLED.has(r.key) ? `${r.name}\n${figure(r.value)}` : null, detail };
  });
  const dupes = symbols.filter((s, i) => symbols.findIndex((o) => o.detail === s.detail) !== i);
  if (dupes.length) throw new Error(`detail() answers ${dupes[0].name} with the same sentence as another place`);
  // Every figure the legend, the labels and the table print is drawn.
  assertHeadlineNumbersDrawn(title, [...rows.map((r) => r.value), ...keyValues.map((k) => k.value)], "circles");

  // ── where the circles sit on the plate, at the largest radius any law gives them ─────────────
  const toFrame = frameProjector(plateFacts);
  const FRAME_PER_CSS = plateFacts.frame.width / REVIEW_BOX.width;
  const OCCUPANCY = markOccupancy(
    symbols.map((s) => {
      const [x, y] = toFrame([s.lon, s.lat]);
      return { kind: "disc", name: s.name, x, y, r: Math.max(...LAWS.map((law) => radiusFor(s.key, areaScaleSlugOf(law.key)))) * FRAME_PER_CSS };
    }),
    plateWaterField(join(HERE, "plate", label)),
  );
  console.log(occupancyLine(OCCUPANCY));
  const colourProblems = guardColour(base, plateGrounds(plateTint, OCCUPANCY));
  if (colourProblems.length) throw new Error(`the direction cannot carry this beat's colour: ${colourProblems.join("; ")} — change the accent in PALETTE.md`);

  const furniture = deriveFurniture(base.ground);
  const tints = { water: plateTint.water, land: mix(base.ground, furniture.ink, 0.1) };
  const paint = symbolPaint({ ground: base.ground, accent: base.accent, ink: furniture.ink });
  if (paint.landFill !== tints.land) throw new Error("the live land and the land every contrast was measured against differ (a defect in the kit)");
  const countries = countryGround({ ground: base.ground, land: tints.land, water: tints.water, ink: furniture.ink });
  const key = maptilerKey(HERE);
  // The map's own label face, probed: MapTiler answers 200 with Noto Sans for a family it lacks.
  const spec = direction.registers.value;
  const labelFont = [`${spec.family} ${Number(spec.weight) >= 600 ? "Bold" : "Regular"}`, `${spec.family} Regular`];
  const noto = await maptilerGlyphs("Noto Sans Regular", "0-255", key);
  for (const face of new Set(labelFont)) assertNotFallback(await maptilerGlyphs(face, "0-255", key), noto, face);

  const lang = beat.lang ?? storyLanguage(HERE) ?? "en";
  const live = {
    style: plateFacts.style,
    tints,
    countries,
    studyBounds: STUDY,
    reviewBox: REVIEW_BOX,
    marks: symbols.map((s) => ({ key: s.key, name: s.name, lon: s.lon, lat: s.lat, detail: s.detail, label: s.label })),
    laws: LAWS.map((law, i) => {
      const radii = radiiUnder(scale, scale.options[i]);
      return { slug: areaScaleSlugOf(law.key), radiusByKey: Object.fromEntries(symbols.map((s) => [s.key, radii.get(s.key)])) };
    }),
    defaultSlug: areaScaleSlugOf(LAWS[0].key),
    floorPx: R_FLOOR,
    paint: { fill: paint.symbolFill, fillOpacity: paint.opacity, ring: paint.symbolFill, ringWidth: paint.ringWidth, active: paint.markActive, labelInk: paint.labelInk, labelSize: 13, labelFont },
    locale: beat.mapLocale ?? (lang.startsWith("fr") ? { title: "Carte", zoomIn: "Zoom avant", zoomOut: "Zoom arrière" } : { title: "Map", zoomIn: "Zoom in", zoomOut: "Zoom out" }),
    changeMs: 380,
    subject: { name: biggest.name, spanDeg: SUBJECT_SPAN_DEG },
    hint,
  };
  console.log(`ground: land ${countries.measured.fillOnWater.toFixed(2)}:1 on the sea, ${countries.measured.fillOnGround.toFixed(2)}:1 on the page · a circle's ring ${contrast(live.paint.ring, countries.fill).toFixed(2)}:1 on that land`);
  const livePlan = liveSymbolsPlan(live);
  const { maplibreJs, maplibreCss, styleModule } = liveAssets(HERE);
  const liveScript = liveSymbolsScript(live, { scope: ".chart-figure", styleModule, lawName: "chart-stack" });

  const tableCaption = plain(typeof beat.tableCaption === "function" ? beat.tableCaption({ places: rows.length, rowScale: ROW_SCALE * 100 }) : beat.tableCaption);
  const caveat = `${caveatHead} ${mercator}`;
  const alt = plain(typeof beat.alt === "function" ? beat.alt({ ranked: rows.map((r) => ({ name: r.name, value: r.value })), total }) : beat.alt);
  // Metadata for the format's interaction plan (English is fine; it is not printed).
  const interaction = {
    earns: `A symbol map hides the exponent of its own scale; this page hands the reader three laws over the same ${rows.length} circles and prints what each makes the same map say.`,
    controls: [
      {
        question: `How much bigger is ${biggest.name} than ${median.name}, really?`,
        gesture: "toggle-a-comparison",
        changes: "Every circle changes radius and nothing else; the largest keeps its radius in all three states, the size legend re-scales with the marks, and the revealed sentence prints the area ratio shown, the true ratio, and how many places the law erases.",
        parameter: "the exponent of the size scale",
        authorPicked: "area",
        readerPicks: LAWS.map((l) => l.key),
        heldStill: [".chart-header", ".chart-source"],
      },
      {
        question: `And all ${rows.length}, without the map — or without JavaScript?`,
        gesture: "open-the-full-table",
        changes: `The ${rows.length} rows open under the map by value, each with its own swatch that follows the chosen law in pure CSS.`,
        parameter: "the form the readings are read in",
        authorPicked: "the map",
        readerPicks: ["the map", "the table"],
        heldStill: [".chart-header", ".chart-source"],
      },
      {
        question: "What is this circle worth, and what is it made of?",
        gesture: "ask-a-mark",
        changes: "The circle itself moves off its own fill and answers with its reading; in a cluster the smallest circle under the pointer answers.",
        parameter: "which circle is in question",
        authorPicked: biggest.name,
        readerPicks: "every mark",
        heldStill: [".chart-header", ".chart-source"],
      },
      {
        question: "Where exactly, inside its own country, does this circle sit?",
        gesture: "zoom-and-pan",
        changes: "The map is a real MapTiler map: drag, wheel, pinch, keyboard. Circles keep their screen size, so the size legend always tells the truth; the reader cannot zoom out past the published frame nor in past the largest place's own country.",
        parameter: "how far back the camera stands",
        authorPicked: "the whole frame",
        readerPicks: ["the whole frame", "any part, closer"],
        heldStill: [".chart-header", ".chart-source"],
      },
    ],
  };
  const pageOf = (plate, box) =>
    renderWeb({
      lang,
      drawing: { share: MAP_DRAWING_SHARE },
      component: DirectedSymbolMapWeb,
      props: {
        plate, symbols, keySizes, scale, reviewBox: REVIEW_BOX, livePlan, liveScript, liveHint: hint, maplibreCss, maplibreJs,
        tableCaption, columns, aspect: box.width / box.height, size: box.width,
        title, eyebrow, caveat, source, reading, claimNote: callout, alt,
        interaction, direction, ground: direction.ground, accent: direction.accent,
      },
      outDir: join(HERE, "renders"),
      name: `${label}.html`,
    });
  // What MapLibre's own collision kept of the labels, measured on the page photographed.
  const atView = async (page) => {
    const placed = await page.evaluate(() => {
      const map = window.__mwMap;
      if (!map.getLayer("mw-labels")) return [];
      const canvas = map.getCanvas();
      return map.queryRenderedFeatures([[0, 0], [canvas.clientWidth, canvas.clientHeight]], { layers: ["mw-labels"] }).map((f) => f.properties.name);
    });
    console.log(`labels placed by MapLibre's collision: ${new Set(placed).size}/${LABELLED.size}${placed.length ? ` (${[...new Set(placed)].join(", ")})` : ""}`);
  };
  // The picture leaves out the zoom buttons and the size legend: the page draws the HTML legend over the
  // map in every state, and a photographed copy reappears offset wherever the box's shape differs
  // from the photograph's (measured on the kit's no-JS frame: two legends, "10 GW" twice).
  const { outPath, keyedPath } = await renderLiveMapPage({ here: HERE, label, key, stamp: livePlan, pageOf, atView, hide: [".maplibregl-ctrl-group", ".key-layer"] });
  const written = readFileSync(outPath, "utf8");
  assertOneAreaScale(written, scale, `renders/${label}.html`);
  assertSymbolLawsReachTheLayers(written, live, radiusFor, plateFacts.style, { where: `renders/${label}.html` });
  console.log(`rendered renders/${label}.html (keyed copy for review: shots/${label}.local.html)`);

  await verifyLiveMap({
    here: HERE,
    label,
    keyedPath,
    waivers: [
      // Inherited from the worked example (its own keyed page fails these four on laptop-wide; on the kit page the same noise has also hit the phone run): the
      // live map is never still between two idle frames there, so verify-web's noise floor is higher
      // than the repaint a law makes and it cannot measure the control. The law reaching the layers
      // is held by assertSymbolLawsReachTheLayers above; control-chosen-1600x800.png shows it.
      { test: /^\s*FAIL (laptop-wide|phone): chart-area-scale: the drawing is still enough between two frames to compare at all\b/, why: "inherited from the worked example: the live map repaints between two idle frames at this size" },
      { test: /^\s*FAIL (laptop-wide|phone): chart-area-scale: (choosing "[^"]+" repaints the drawing|every value of this parameter paints its own picture)\b/, why: "inherited from the worked example: the noise floor above swallows the repaint (the plan's per-law radii are asserted by assertSymbolLawsReachTheLayers)" },
      { test: /^\s*FAIL phone 375x812: (no vertical scroll inside the visual|the source line is on screen)\b/, why: "inherited from the worked example: on a phone the map keeps its height and the page scrolls (full-width ruling)" },
    ],
    probe: {
      layers: ["mw-symbols"],
      keyProp: "key",
      expected: Object.fromEntries(symbols.map((s) => [s.key, s.detail])),
      subject: biggest.key,
      anchors: Object.fromEntries(symbols.map((s) => [s.key, [s.lon, s.lat]])),
      // The page answers with the SMALLEST circle under the pointer (the one whose edge is seen).
      order: Object.fromEntries(rows.map((r) => [r.key, r.value])),
    },
  });
});
