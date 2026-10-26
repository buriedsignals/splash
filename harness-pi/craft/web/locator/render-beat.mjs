// The generic half of a locator WEB beat, taken from proof/web-locator-zaporizhzhia/render-directions-web.mjs
// with everything about ITS subject removed. The page is the worked example's: a LIVE MapTiler map
// (the countries drawn as neutral ground, the subject ringed in the accent, its peers one chroma down,
// settlements as furniture — every pin the same screen size, nothing sized by a value) over one frozen
// picture per REMOVE, and ONE control — the reader picks HOW FAR BACK to stand (the `vantage`
// vocabulary), because a locator's every word is decided by that distance. Each remove re-frames the
// camera, redraws only what still places the subject from there, prints its census and its scale bar,
// and says in a sentence who the subject's largest neighbour is at that distance. With no script the
// pictures swap in pure CSS. Hovering a pin answers what it is and how far it is from the subject.
// This file computes every distance, window, census, scale bar and Mercator error; ./beat.mjs — the
// one file the model writes — gives the subject, its peers, the places, the removes and the WORDS.
// Copied into the beat by the harness; never edited by the model.
//
// Usage:  bun <beat>/render-beat.mjs
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { NON_TEXT_CONTRAST_MIN, adjustToContrast, contrast, mix } from "#shared/chart-beat/colour.mjs";
import { deriveFurniture } from "#shared/chart-beat/render-still.mjs";
import { guardColour } from "#shared/design-base/compose.mjs";
import { frameProjector, markOccupancy, occupancyLine } from "#shared/map-beat/occupancy.mjs";
import { countryGround, plateGrounds, plateTints } from "#shared/map-beat/tints.mjs";
import { applyStoryboard, assertHeadlineNumbersDrawn } from "./guards.mjs";
import { ensurePlate, liveAssets, mapWeb, maptilerKey, renderLiveMapPage, verifyLiveMap } from "./map-web.mjs";
import { plateWaterField } from "./plate-water.mjs";
import { chartWeb, pickDirection, plain, plainRegisters, refusing, storyLanguage } from "./web.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const EARTH_KM = 6371.0088;
const RAD = Math.PI / 180;
/** How many peers one remove may draw, however many its frame holds — a declared priority decides
 *  which survive, never a size (`types/locator.md`). */
const OTHERS_DRAWN = 12;
/** How many settlements one remove may draw. */
const PLACES_DRAWN = 6;
/** The round distances a scale bar may state: the largest under a third of the frame. */
const BAR_LADDER = [10, 20, 50, 100, 200, 500, 1000, 2000];
/** Room a remove leaves around what it draws, as a fraction of its own box. */
const WINDOW_PAD = 0.1;
const PLATE_FRAME = [1600, 1216];
const LAND_DOSE = 0.07;
/** Screen radii, CSS px, identical at every zoom and every remove. */
const PIN_RADIUS = { subject: 8, station: 5, place: 4 };
const SUBJECT = "subject";

const kmBetween = (a, b) => {
  const dLat = (b.lat - a.lat) * RAD;
  const dLon = (b.lon - a.lon) * RAD;
  const s = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * RAD) * Math.cos(b.lat * RAD) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_KM * Math.asin(Math.min(1, Math.sqrt(s)));
};

await refusing(HERE, async () => {
  const { default: beat } = await import("./beat.mjs");
  applyStoryboard(beat, HERE);
  const { renderWeb, MAP_DRAWING_SHARE } = await import(chartWeb(HERE, "scripts", "render-web.mjs"));
  const { assertOneVantage, vantageSlugOf } = await import(mapWeb(HERE, "assets", "vantage.ts"));
  const { assertVantageReachesTheLayers, liveLocatorPlan, liveLocatorScript } = await import(mapWeb(HERE, "assets", "live-locator.ts"));
  const { CHANGE_MS, DirectedLocatorWeb, VANTAGE_ID_PREFIX } = await import("./DirectedLocatorWeb.tsx");

  // ── the fields ────────────────────────────────────────────────────────────────────────────────
  const REQUIRED = ["eyebrow", "subject", "others", "places", "removes", "defaultKey", "vantageLabel", "rule", "note", "detail", "distance", "kinds", "callout", "mercator", "title", "limits", "reading", "hint", "source", "alt", "tableCaption", "columns", "drawnWord", "outWord", "check"];
  const missingFields = REQUIRED.filter((key) => beat[key] === undefined);
  if (missingFields.length) throw new Error(`beat.mjs is missing ${missingFields.join(", ")}: give each as a field of the default export (export default { …, ${missingFields[0]}: … }), not as a separate export (see CONTRACT.md)`);
  for (const fn of ["rule", "note", "detail", "distance", "callout", "mercator", "check"])
    if (typeof beat[fn] !== "function") throw new Error(`beat.mjs: ${fn} must be a function (see CONTRACT.md)`);
  if (!Array.isArray(beat.columns) || beat.columns.length !== 4) throw new Error("columns must be the table's four headings: mark, what it is, distance, at this remove (see CONTRACT.md)");
  if (!Array.isArray(beat.kinds) || beat.kinds.length !== 3) throw new Error("kinds must be the legend's three words: the subject, its peers, the settlements (see CONTRACT.md)");

  const where = (what, p) => {
    if (!p || typeof p.lon !== "number" || typeof p.lat !== "number" || !Number.isFinite(p.lon) || !Number.isFinite(p.lat) || Math.abs(p.lon) > 180 || Math.abs(p.lat) > 90)
      throw new Error(`${what} needs numeric lon and lat read from data.json (got ${JSON.stringify(p && { lon: p.lon, lat: p.lat })})`);
    if (!String(p.name ?? "").trim() || !String(p.kind ?? "").trim()) throw new Error(`${what} needs a name and a kind (what the table prints)`);
  };
  const subject = beat.subject;
  where("subject", subject);
  if (typeof subject.priority !== "number" || !(subject.priority > 0)) throw new Error("subject.priority must be the positive number its peers are ranked by (the same column as others' priority)");
  if (!Array.isArray(beat.others) || !beat.others.length) throw new Error("others must be the subject's peers (every row of the same kind but the subject), each { lon, lat, name, kind, priority }");
  beat.others.forEach((o, i) => {
    where(`others[${i}]`, o);
    if (typeof o.priority !== "number" || !Number.isFinite(o.priority)) throw new Error(`others[${i}].priority must be a number (it decides which peers a remove draws)`);
  });
  if (beat.others.some((o) => o.lon === subject.lon && o.lat === subject.lat && o.priority === subject.priority))
    throw new Error("others still holds the subject's own row: leave it out");
  if (!Array.isArray(beat.places)) throw new Error("places must be the settlements, each { lon, lat, name, kind, priority }");
  beat.places.forEach((p, i) => {
    where(`places[${i}]`, p);
    if (typeof p.priority !== "number" || !Number.isFinite(p.priority)) throw new Error(`places[${i}].priority must be a number (e.g. the population)`);
  });

  // ── THE LADDER OF REMOVES, DERIVED ──────────────────────────────────────────────────────────
  if (!Array.isArray(beat.removes) || beat.removes.length < 2 || beat.removes.length > 5)
    throw new Error("removes must be 2 to 5 { key, label, announce, radius, places } — radius in km around the subject, rising, null for the last one to frame every peer");
  beat.removes.forEach((r, i) => {
    if (!/^[a-z][a-z0-9-]*$/.test(String(r.key))) throw new Error(`removes[${i}].key must be a short lowercase word (it becomes an id), got ${JSON.stringify(r.key)}`);
    if (r.radius !== null && !(typeof r.radius === "number" && r.radius > 0)) throw new Error(`removes[${i}].radius must be kilometres (a positive number) or null`);
    if (r.radius === null && i !== beat.removes.length - 1) throw new Error("only the last remove may have radius null (every peer in frame)");
    if (i && r.radius !== null && !(r.radius > beat.removes[i - 1].radius)) throw new Error("removes must rise: each radius larger than the one before");
  });
  if (!beat.removes.some((r) => r.key === beat.defaultKey)) throw new Error(`defaultKey ${JSON.stringify(beat.defaultKey)} names no remove`);

  const kmPerDegLon = 111.32 * Math.cos(subject.lat * RAD);
  const kmPerDegLat = 110.574;
  const boxAround = (radiusKm) => ({
    west: subject.lon - radiusKm / kmPerDegLon,
    east: subject.lon + radiusKm / kmPerDegLon,
    south: subject.lat - radiusKm / kmPerDegLat,
    north: subject.lat + radiusKm / kmPerDegLat,
  });
  const EXTENT = {
    west: Math.min(subject.lon, ...beat.others.map((s) => s.lon)),
    east: Math.max(subject.lon, ...beat.others.map((s) => s.lon)),
    south: Math.min(subject.lat, ...beat.others.map((s) => s.lat)),
    north: Math.max(subject.lat, ...beat.others.map((s) => s.lat)),
  };
  const inWindow = (w, p) => p.lon >= w.west && p.lon <= w.east && p.lat >= w.south && p.lat <= w.north;
  const barFor = (spanKm) => [...BAR_LADDER].reverse().find((km) => km <= spanKm / 3) ?? BAR_LADDER[0];

  const removes = beat.removes.map((rung) => {
    const selection = rung.radius === null ? EXTENT : boxAround(rung.radius);
    const heldOthers = beat.others.filter((s) => inWindow(selection, s)).sort((a, b) => b.priority - a.priority);
    const heldPlaces = beat.places.filter((p) => inWindow(selection, p)).sort((a, b) => b.priority - a.priority);
    const drawnOthers = heldOthers.slice(0, OTHERS_DRAWN);
    const drawnPlaces = rung.places === false ? [] : heldPlaces.slice(0, PLACES_DRAWN);
    const drawn = [subject, ...drawnOthers, ...drawnPlaces];
    const raw = {
      west: Math.min(...drawn.map((m) => m.lon)),
      east: Math.max(...drawn.map((m) => m.lon)),
      south: Math.min(...drawn.map((m) => m.lat)),
      north: Math.max(...drawn.map((m) => m.lat)),
    };
    const padLon = Math.max((raw.east - raw.west) * WINDOW_PAD, 0.25);
    const padLat = Math.max((raw.north - raw.south) * WINDOW_PAD, 0.25);
    const window = { west: raw.west - padLon, east: raw.east + padLon, south: raw.south - padLat, north: raw.north + padLat };
    const spanKm = (window.east - window.west) * kmPerDegLon;
    // What Mercator costs THIS type, per remove: ground scale runs as cos(latitude), so a bar true at
    // the centre of the frame is wrong at its edges by the ratio of the two cosines.
    const edgeError = Math.max(Math.cos(window.south * RAD), Math.cos(window.north * RAD)) / Math.min(Math.cos(window.south * RAD), Math.cos(window.north * RAD));
    return { ...rung, slug: vantageSlugOf(rung.key), window, spanKm, edgeError, barKm: barFor(spanKm), heldOthers, heldPlaces, drawnOthers, drawnPlaces };
  });
  if (new Set(removes.map((r) => r.slug)).size !== removes.length) throw new Error("two removes share one key");

  // ── the marks ───────────────────────────────────────────────────────────────────────────────
  const markIndex = new Map();
  markIndex.set(SUBJECT, { key: SUBJECT, kind: "subject", role: "subject", row: subject, lon: subject.lon, lat: subject.lat, label: plain(subject.label ?? subject.name), km: 0, removes: [] });
  for (const remove of removes) {
    markIndex.get(SUBJECT).removes.push(remove.slug);
    for (const s of remove.drawnOthers) {
      const key = `s-${beat.others.indexOf(s)}`;
      if (!markIndex.has(key)) markIndex.set(key, { key, kind: "station", role: "other", row: s, lon: s.lon, lat: s.lat, label: null, km: kmBetween(subject, s), removes: [] });
      markIndex.get(key).removes.push(remove.slug);
    }
    for (const p of remove.drawnPlaces) {
      const key = `p-${beat.places.indexOf(p)}`;
      if (!markIndex.has(key)) markIndex.set(key, { key, kind: "place", role: "place", row: p, lon: p.lon, lat: p.lat, label: plain(p.label ?? p.name), km: kmBetween(subject, p), removes: [] });
      markIndex.get(key).removes.push(remove.slug);
    }
  }
  const marks = [...markIndex.values()].sort((a, b) => a.km - b.km);
  const readingOf = (mark) => ({ ...mark.row, role: mark.role, km: mark.km, share: mark.role === "other" ? (mark.row.priority / subject.priority) * 100 : null });
  for (const mark of marks) {
    mark.name = plain(mark.row.name);
    mark.kindWord = plain(mark.row.kind);
    mark.detail = plain(beat.detail(readingOf(mark)));
    mark.distance = plain(beat.distance(readingOf(mark)));
    if (mark.role !== "subject" && !mark.distance.replace(/\D/g, "").includes(String(Math.round(mark.km))))
      throw new Error(`distance() must print the distance in km, rounded (${Math.round(mark.km)}), for ${mark.name}; it says "${mark.distance}"`);
  }
  const dupes = marks.filter((m, i) => marks.findIndex((o) => o.detail === m.detail) !== i);
  if (dupes.length) throw new Error(`detail() answers "${dupes[0].detail}" for two marks — every pin must answer differently (name it, give its distance)`);

  let closest = null;
  for (let i = 0; i < marks.length; i += 1)
    for (let j = i + 1; j < marks.length; j += 1) {
      const degrees = Math.hypot(marks[i].lon - marks[j].lon, marks[i].lat - marks[j].lat);
      if (!closest || degrees < closest.degrees) closest = { a: marks[i].key, b: marks[j].key, degrees };
    }
  if (!closest) throw new Error("the map draws one mark: give others at least one peer inside a remove");
  if (!(closest.degrees > 0)) throw new Error(`two marks sit at the same coordinates (${closest.a}, ${closest.b}): leave the duplicate out of others or places`);

  // ── the claim ───────────────────────────────────────────────────────────────────────────────
  const geo = JSON.parse(readFileSync(join(HERE, "shapes.geojson"), "utf8"));
  const ringHolds = (ring, [x, y]) => {
    let inside = false;
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i, i += 1) {
      const [xi, yi] = ring[i];
      const [xj, yj] = ring[j];
      if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
    }
    return inside;
  };
  const countryOf = (lon, lat) => {
    for (const f of geo.features) {
      const polys = f.geometry.type === "Polygon" ? [f.geometry.coordinates] : f.geometry.coordinates;
      if (polys.some((poly) => ringHolds(poly[0], [lon, lat]))) return f.properties.iso ?? null;
    }
    return null;
  };
  const pub = (r) => ({ key: r.key, radius: r.radius, heldOthers: r.heldOthers.length, drawnOthers: r.drawnOthers.length, heldPlaces: r.heldPlaces.length, drawnPlaces: r.drawnPlaces.length, spanKm: r.spanKm, edgeError: r.edgeError, rival: r.heldOthers[0] ? { ...r.heldOthers[0], km: kmBetween(subject, r.heldOthers[0]) } : null });
  beat.check({ countryOf, km: kmBetween, removes: removes.map(pub) });

  // ── the words each remove owes ──────────────────────────────────────────────────────────────
  const fmtCheck = (text, n, what) => {
    if (!text.replace(/\D/g, " ").split(/\s+/).includes(String(n)) && !text.replace(/[\s  ]/g, "").includes(String(n)))
      throw new Error(`${what} must state ${n}; it says "${text}"`);
  };
  const ruleReading = (r) => ({ key: r.key, radius: r.radius, drawnOthers: r.drawnOthers.length, heldOthers: r.heldOthers.length, drawnPlaces: r.drawnPlaces.length, heldPlaces: r.heldPlaces.length, places: r.places !== false, barKm: r.barKm });
  const vantage = {
    label: plain(beat.vantageLabel),
    defaultKey: beat.defaultKey,
    subject: SUBJECT,
    positions: Object.fromEntries(marks.map((mark) => [mark.key, [mark.lon, mark.lat]])),
    removes: removes.map((remove) => {
      const rule = plain(beat.rule(ruleReading(remove)));
      for (const [n, what] of [[remove.drawnOthers.length, "the peers drawn"], [remove.heldOthers.length, "the peers in frame"], [remove.barKm, "the scale bar (km)"]]) fmtCheck(rule, n, `rule() for remove ${remove.key} (${what})`);
      let note = null;
      if (remove.key !== beat.defaultKey) {
        const reading = { ...pub(remove), totalOthers: beat.others.length, subject };
        if (!reading.rival) throw new Error(`remove ${remove.key} frames no peer, so its note has no neighbour to name: widen its radius`);
        note = plain(beat.note(reading));
        fmtCheck(note, Math.round(reading.rival.km), `note() for remove ${remove.key} (the largest peer's distance, rounded)`);
      }
      return { key: remove.key, label: plain(remove.label), announce: plain(remove.announce), window: remove.window, spanKm: remove.spanKm, marks: marks.filter((m) => m.removes.includes(remove.slug)).map((m) => m.key), rule, barKm: remove.barKm, note };
    }),
  };
  const published = removes.find((r) => r.key === beat.defaultKey);
  const widest = removes[removes.length - 1];
  const nearest = beat.others.map((s) => ({ ...s, km: kmBetween(subject, s) })).sort((a, b) => a.km - b.km)[0];
  const callout = plain(beat.callout({ nearest, others: beat.others.length, subject }));
  fmtCheck(callout, Math.round(nearest.km), "callout() (the nearest peer's distance, rounded)");
  const merc = { published: published.edgeError, widest: widest.edgeError };
  const mercator = plain(beat.mercator(merc));
  for (const [what, v] of Object.entries(merc))
    if (![v.toFixed(2), v.toFixed(2).replace(".", ",")].some((t) => mercator.includes(t))) throw new Error(`mercator(m) must state m.${what} to two decimals (${v.toFixed(2)}); it says "${mercator}"`);
  const title = plain([beat.title].flat()[0]);
  assertHeadlineNumbersDrawn(title, [subject.priority, ...marks.map((m) => Math.round(m.km)), ...marks.filter((m) => m.role === "other").map((m) => m.row.priority)], "marks");
  const caveat = `${plain([beat.limits].flat()[0])} ${mercator}`;
  const reading = plain([beat.reading].flat()[0]);
  const hint = plain(beat.hint);
  const source = plain(beat.source);
  const eyebrow = plain(beat.eyebrow);
  const tableCaption = plain(typeof beat.tableCaption === "function" ? beat.tableCaption({ marks: marks.length }) : beat.tableCaption);
  const columns = beat.columns.map(plain);
  const drawnWord = plain(beat.drawnWord);
  const outWord = plain(beat.outWord);
  const kindLabels = beat.kinds.map(plain);
  const alt = plain(typeof beat.alt === "function" ? beat.alt({ published: ruleReading(published), removes: removes.map(ruleReading) }) : beat.alt);

  const textPerRegister = {
    display: title,
    eyebrow,
    body: `${caveat} ${reading} ${source} ${hint}`,
    axis:
      `${vantage.label} ${vantage.removes.map((r) => `${r.label} ${r.announce} ${r.rule}`).join(" ")} ${tableCaption} ${columns.join(" ")} ${drawnWord} ${outWord} ` +
      `${marks.map((m) => `${m.name} ${m.kindWord} ${m.distance}`).join(" ")} ${removes.map((r) => `${r.barKm} km`).join(" ")} ${kindLabels.join(" ")}`,
    annot: `${callout} ${vantage.removes.map((r) => r.note ?? "").join(" ")}`,
    value: marks.filter((m) => m.label).map((m) => m.label).join(" "),
  };
  const { label, direction } = pickDirection(HERE, plainRegisters(textPerRegister), beat.evidenceLevels ?? 3);
  const base = direction;

  // ── the plate (the camera facts and the tints), and where the accent's marks sit ─────────────
  const tints = plateTints(base, { landDose: LAND_DOSE });
  const PLATE_BOUNDS = [published.window.west, published.window.south, published.window.east, published.window.north].map((v) => v.toFixed(4)).join(",");
  const plateFacts = ensurePlate({
    here: HERE,
    label,
    water: tints.water,
    land: tints.land,
    frame: PLATE_FRAME,
    args: ["--countries", join(HERE, "shapes.geojson"), "--bounds", PLATE_BOUNDS],
    current: (facts) => [facts.bounds[0][0], facts.bounds[0][1], facts.bounds[1][0], facts.bounds[1][1]].map((v) => v.toFixed(4)).join(",") === PLATE_BOUNDS,
  });
  // Measured, not assumed: the accent's marks (subject and peers) over the plate's own pixels.
  const toFrame = frameProjector(plateFacts);
  const FRAME_PER_CSS = plateFacts.frame.width / 1512;
  const OCCUPANCY = markOccupancy(
    marks
      .filter((m) => m.kind === "subject" || m.kind === "station")
      .map((m) => {
        const [x, y] = toFrame([m.lon, m.lat]);
        return { kind: "disc", name: m.name, x, y, r: PIN_RADIUS[m.kind] * FRAME_PER_CSS };
      }),
    plateWaterField(join(HERE, "plate", label)),
  );
  console.log(occupancyLine(OCCUPANCY));
  const colourProblems = guardColour(base, plateGrounds(tints, OCCUPANCY));
  if (colourProblems.length) throw new Error(`the direction cannot carry this beat's colour: ${colourProblems.join("; ")} — change the accent in PALETTE.md`);

  // The three treatments, measured against the land the page actually paints (the proof's paletteFor).
  const furniture = deriveFurniture(base.ground);
  const ink = furniture.ink;
  const land = tints.land;
  const floorAgainstLand = (colour) => (contrast(colour, land) >= NON_TEXT_CONTRAST_MIN ? colour : adjustToContrast(colour, land, NON_TEXT_CONTRAST_MIN) ?? colour);
  const subjectFill = floorAgainstLand(base.accent);
  let station = mix(subjectFill, land, 0.45);
  if (contrast(station, land) < NON_TEXT_CONTRAST_MIN) station = adjustToContrast(station, land, NON_TEXT_CONTRAST_MIN) ?? station;
  const place = floorAgainstLand(mix(land, ink, 0.6));
  const ring = (() => {
    for (const anchor of [base.ground, ink])
      for (let dose = 0; dose <= 1.0001; dose += 0.04) {
        const candidate = mix(anchor, anchor === ink ? base.ground : ink, dose);
        if (contrast(candidate, subjectFill) >= 2.2 && contrast(candidate, land) >= 1.6) return candidate;
      }
    throw new Error(`no ring stands 2.2:1 off the subject's fill ${subjectFill} while staying 1.6:1 off the land ${land}: change the accent in PALETTE.md`);
  })();
  const activeFor = (fill) => {
    for (const toward of [ink, base.ground])
      for (let dose = 0.06; dose <= 0.94; dose += 0.02) {
        const candidate = mix(fill, toward, dose);
        if (contrast(candidate, fill) >= 1.4 && contrast(candidate, land) >= NON_TEXT_CONTRAST_MIN) return candidate;
      }
    throw new Error(`no dose separates a pointed-at mark from its own fill ${fill}: change the accent in PALETTE.md`);
  };
  const border = adjustToContrast(mix(land, ink, 0.4), land, 1.6) ?? mix(land, ink, 0.4);

  const lang = beat.lang ?? storyLanguage(HERE) ?? "en";
  const live = {
    style: plateFacts.style,
    tints,
    countries: countryGround({ ground: base.ground, land: tints.land, water: tints.water, ink }),
    vantage,
    marks: marks.map((m) => ({ key: m.key, kind: m.kind, lon: m.lon, lat: m.lat, label: m.label })),
    details: Object.fromEntries(marks.map((m) => [m.key, m.detail])),
    paint: { subject: subjectFill, subjectRing: ring, station, place, active: { subject: activeFor(subjectFill), station: activeFor(station), place: activeFor(place) } },
    radius: { ...PIN_RADIUS, ring: 2.6 },
    border: { colour: border, width: 0.8 },
    closest,
    locale: beat.mapLocale ?? (lang.startsWith("fr") ? { title: "Carte", zoomIn: "Zoomer", zoomOut: "Dézoomer" } : { title: "Map", zoomIn: "Zoom in", zoomOut: "Zoom out" }),
    changeMs: CHANGE_MS,
    edgeError: Object.fromEntries(removes.map((r) => [r.slug, r.edgeError])),
  };
  const livePlan = liveLocatorPlan(live);
  const { maplibreJs, maplibreCss, styleModule } = liveAssets(HERE);
  const liveScript = liveLocatorScript(live, { scope: ".chart-figure", styleModule, vantageName: VANTAGE_ID_PREFIX });

  const rows = marks.map((m) => ({ key: m.key, name: m.name, kind: m.kindWord, distance: m.distance, detail: m.detail, removes: m.removes }));
  const labels = marks.filter((m) => m.label).map((m) => ({ key: m.key, text: m.label, lon: m.lon, lat: m.lat, removes: m.removes, emphasis: m.kind === "subject" }));
  const kinds = [
    { label: kindLabels[0], fill: subjectFill, ring, r: 6 },
    { label: kindLabels[1], fill: station, ring: null, r: 5 },
    { label: kindLabels[2], fill: place, ring: null, r: 4 },
  ];
  // Metadata for the format's interaction plan (English is fine; it is not printed).
  const interaction = {
    earns: `A still stands at one distance and cannot say there were others; this page hands the reader ${removes.length} authored removes and says what each one costs.`,
    controls: [
      {
        question: "Near what, exactly? It depends where one stands — so where does one stand?",
        gesture: "toggle-a-comparison",
        changes: "The camera travels to the chosen frame, the frozen picture under it cross-fades to that remove's own, the drawing rule and the census rewrite in place, the scale bar takes its length again, and a sentence names the largest peer at that distance.",
        parameter: "the distance the map is seen from",
        authorPicked: beat.defaultKey,
        readerPicks: removes.map((r) => r.key),
        heldStill: [".chart-header", ".chart-source"],
      },
      {
        question: "What is this pin, and how far from the subject?",
        gesture: "ask-a-mark",
        changes: "The pointed-at pin recolours from its own fill and answers what it is and its distance to the subject, measured on the sphere.",
        parameter: "which landmark is in question",
        authorPicked: "the subject",
        readerPicks: "every mark",
        heldStill: [".chart-header", ".chart-source"],
      },
      {
        question: "And everything the map does not draw at this remove?",
        gesture: "open-the-full-table",
        changes: "The marks open under the map by distance, each with a word that says whether the current remove draws it — that column follows the remove in pure CSS.",
        parameter: "the form the readings are read in",
        authorPicked: "the map",
        readerPicks: ["the map", "the table"],
        heldStill: [".chart-header", ".chart-source"],
      },
    ],
  };

  const key = maptilerKey(HERE);
  const pageOf = (plates, box) =>
    renderWeb({
      lang,
      drawing: { share: MAP_DRAWING_SHARE },
      component: DirectedLocatorWeb,
      props: {
        plates, vantage, rows, labels, kinds, livePlan, liveScript, liveHint: hint, maplibreCss, maplibreJs,
        tableCaption, columns, drawnWord, outOfFrameWord: outWord,
        aspect: box.width / box.height, size: box.width,
        title, eyebrow, caveat, source, reading, claimNote: callout, alt,
        interaction, direction, ground: direction.ground, accent: direction.accent,
      },
      outDir: join(HERE, "renders"),
      name: `${label}.html`,
    });

  // Names are measured on the rendered rectangles at every remove, never judged by eye.
  const atView = async (page, slug) => {
    const overlaps = await page.evaluate(() => {
      const shown = [...document.querySelectorAll(".mw-label")].filter((el) => el.offsetParent !== null);
      const rects = shown.map((el) => ({ name: el.textContent, r: el.getBoundingClientRect() }));
      const bad = [];
      for (let i = 0; i < rects.length; i += 1)
        for (let j = i + 1; j < rects.length; j += 1) {
          const a = rects[i].r;
          const b = rects[j].r;
          if (a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom) bad.push(`${rects[i].name} / ${rects[j].name}`);
        }
      return bad;
    });
    if (overlaps.length) throw new Error(`at the remove "${slug}" these place names overlap on the page: ${overlaps.join(", ")} — leave one of each pair out of places (or shorten its label)`);
  };
  const { outPath, keyedPath } = await renderLiveMapPage({
    here: HERE,
    label,
    key,
    stamp: livePlan,
    pageOf,
    views: removes.map((r) => ({ slug: r.slug, input: `${VANTAGE_ID_PREFIX}-${r.slug}` })),
    atView,
    // The frozen picture must not carry MapLibre's zoom buttons: inert in an image (the proof's own rule).
    hide: [".maplibregl-ctrl-group"],
  });
  const written = readFileSync(outPath, "utf8");
  assertOneVantage(written, vantage, { where: `renders/${label}.html` });
  assertVantageReachesTheLayers(written, live, plateFacts.style, { where: `renders/${label}.html` });
  console.log(`rendered renders/${label}.html (keyed copy for review: shots/${label}.local.html)`);

  const atLanding = marks.filter((m) => m.removes.includes(published.slug));
  await verifyLiveMap({
    here: HERE,
    label,
    keyedPath,
    waivers: [
      // Inherited from the worked example: its own keyed page fails these the same way.
      { test: /^\s*FAIL [a-z-]+: chart-vantage: choosing "[^"]+" again restores the landing picture\b/, why: "inherited from the worked example (its own keyed page fails it): after travelling away and back the live camera does not land on the exact landing frame" },
      { test: /^\s*FAIL (laptop 1280x720|tablet-landscape 1024x768|phone 375x812): (no vertical scroll inside the visual|the source line is on screen|the x-axis is on screen)\b/, why: "inherited from the worked example (its own keyed page fails it): the remove control's rule line and the scale bar push the page past short windows" },
    ],
    probe: {
      layers: ["mw-subject", "mw-stations", "mw-places"],
      keyProp: "k",
      expected: Object.fromEntries(atLanding.map((m) => [m.key, m.detail])),
      subject: SUBJECT,
      anchors: Object.fromEntries(atLanding.map((m) => [m.key, [m.lon, m.lat]])),
      // Two pins closer than a pin's width cannot both be on top; only the subject must answer.
      mayMiss: (k) => k !== SUBJECT,
    },
  });
});
