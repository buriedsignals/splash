// The generic half of a dot-density WEB beat, taken from
// proof/web-dot-density-europe-stations/render-directions-web.mjs with everything about ITS subject
// removed. The page is the worked example's: a LIVE MapTiler map whose dots are MapLibre circle
// layers (one dot's ground radius held as the reader zooms), over a frozen fallback photographed
// from that live map, and ONE control — the reader chooses WHAT ONE DOT IS WORTH: one place, a value
// DERIVED from the file's own mean per place (rounded to 1, 2 or 5 × a power of ten), or ten times
// that. Under a value rule each place takes floor(value / dot value) dots plus the largest remainders
// (so the total is exact), laid on a phyllotaxis spiral one dot diameter apart around the place. The
// key line, the per-treatment counts, the rule's sentence and the table's dot column follow the rule
// (the last three in pure CSS). Hovering a dot lights every dot of the same place and answers its
// category, its quantity, its country, its share of that country and how many dots it got.
//
// This file computes every count, the dot value, the dot's ground size, the readings each word
// function receives and what Web Mercator costs THIS subject; ./beat.mjs — the one file the model
// writes — names the columns, the treatments and the WORDS. Copied into the beat by the harness;
// never edited by the model.
//
// Usage:  bun <beat>/render-beat.mjs
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { mix } from "#shared/chart-beat/colour.mjs";
import { deriveFurniture } from "#shared/chart-beat/render-still.mjs";
import { guardColour } from "#shared/design-base/compose.mjs";
import { ISO3_TO_ISO2 } from "#shared/map-beat/iso-codes.mjs";
import { countryGround, plateGrounds, plateTints } from "#shared/map-beat/tints.mjs";
import { frameProjector, markOccupancy, occupancyLine } from "#shared/map-beat/occupancy.mjs";
import { iso3Of } from "./countries.mjs";
import { applyStoryboard, assertHeadlineNumbersDrawn } from "./guards.mjs";
import { ensurePlate, liveAssets, mapWeb, maptilerKey, renderLiveMapPage, verifyLiveMap } from "./map-web.mjs";
import { plateWaterField } from "./plate-water.mjs";
import { readPoints, readTable } from "./points.mjs";
import { chartWeb, pickDirection, plain, plainRegisters, refusing, storyLanguage } from "./web.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));

/** The plate's own pixel box (the worked example's 1600x1216). */
const PLATE_FRAME = [1600, 1216];
const LAND_DOSE = 0.07;
/** A dot deposits 99 % of the ink its area claims at 1 px, 44 % at 0.5 px (measured on the worked
 *  example): the dot's ground size is derived so it lands exactly on this floor at the review box. */
const FLOOR_PX = 1.0;
/** The SHORTEST plot the worked example's directions take at the 1512x860 review window. */
const REVIEW_BOX = { width: 1464, height: 466 };
/** The format's hit target, CSS px. */
const HIT_PX = 28;
const GOLDEN = Math.PI * (3 - Math.sqrt(5));

await refusing(HERE, async () => {
  const { default: beat } = await import("./beat.mjs");
  applyStoryboard(beat, HERE);
  const { renderWeb, MAP_DRAWING_SHARE } = await import(chartWeb(HERE, "scripts", "render-web.mjs"));
  const { assertDotValueReachesTheLayers, dotSlugOf, liveDotDensityPlan, liveDotDensityScript } = await import(mapWeb(HERE, "assets", "live-dot-density.ts"));
  const { CHANGE_MS, DOT_ID_PREFIX, DirectedDotMapWeb, dotTones } = await import("./DirectedDotMapWeb.tsx");

  // ── the fields ────────────────────────────────────────────────────────────────────────────────
  const REQUIRED = ["eyebrow", "lon", "lat", "value", "country", "subject", "second", "categoryNames", "names", "kinds", "placeRule", "valueRule", "unitNote", "coarseNote", "kindCount", "count", "unitValue", "share", "countWord", "sep", "tail", "capacity", "countryDetail", "keyLabel", "controlLabel", "tableCaption", "columns", "claimNote", "mercator", "reading", "hint", "title", "limits", "source", "alt", "check"];
  const missingFields = REQUIRED.filter((key) => beat[key] === undefined);
  if (missingFields.length) throw new Error(`beat.mjs is missing ${missingFields.join(", ")}: give each as a field of the default export (export default { …, ${missingFields[0]}: … }), not as a separate export (see CONTRACT.md)`);
  for (const fn of ["unitNote", "coarseNote", "kindCount", "count", "unitValue", "share", "countWord", "capacity", "countryDetail", "tableCaption", "claimNote", "mercator", "reading", "alt", "check"])
    if (typeof beat[fn] !== "function") throw new Error(`beat.mjs: ${fn} must be a function (see CONTRACT.md)`);
  for (const k of ["label", "announce", "keyLine"]) {
    if (typeof beat.placeRule?.[k] !== "string") throw new Error(`beat.mjs: placeRule.${k} must be a string (see CONTRACT.md)`);
    if (typeof beat.valueRule?.[k] !== "function") throw new Error(`beat.mjs: valueRule.${k} must be a function (v) => words (see CONTRACT.md)`);
  }
  if (!Array.isArray(beat.kinds) || beat.kinds.length !== 3 || beat.kinds.some((k) => typeof k !== "string" || !k.trim()))
    throw new Error("kinds must be the legend's three labels: the quiet treatment, the second, the subject (see CONTRACT.md)");
  if (!Array.isArray(beat.columns) || beat.columns.length !== 4) throw new Error("columns must be the table's four headings: country, places, total quantity, dots (see CONTRACT.md)");

  // ── THE PLACES, and THE JOIN ──────────────────────────────────────────────────────────────────
  const places = readPoints(readTable(HERE), beat);
  const countryValues = [...new Set(places.map((p) => p.country))];
  const resolved = iso3Of(countryValues, HERE, beat.rename ?? {});
  const iso3 = new Map(countryValues.map((c, i) => [c, resolved[i]]));
  for (const p of places) p.iso = iso3.get(p.country);
  const codes = [...new Set(places.map((p) => p.iso))];
  const noA2 = codes.filter((c) => !/^[A-Z]{2}$/.test(ISO3_TO_ISO2[c] ?? ""));
  if (noA2.length) throw new Error(`${noA2.join(", ")} have no ISO A2 code, so the live map would draw them no outline: leave their rows out with exclude`);
  const nameless = codes.filter((c) => typeof beat.names?.[c] !== "string" || !beat.names[c].trim());
  if (nameless.length) throw new Error(`names must give every country with a place its name in the story's language, keyed by ISO-3; missing: ${nameless.join(", ")}`);
  const NAME = (c) => plain(beat.names[c]);
  const COUNTRIES = [...codes].sort((a, b) => NAME(a).localeCompare(NAME(b), beat.lang ?? storyLanguage(HERE) ?? "en"));
  const ISO2 = (c) => ISO3_TO_ISO2[c];
  const categories = [...new Set(places.map((p) => p.category))];
  const unnamedCat = categories.filter((c) => typeof beat.categoryNames?.[c] !== "string");
  if (unnamedCat.length) throw new Error(`categoryNames must give every category kept its word in the story's language; missing: ${unnamedCat.join(", ")}`);

  const totalValue = places.reduce((s, p) => s + p.value, 0);
  const perCategory = categories
    .map((key) => {
      const set = places.filter((p) => p.category === key);
      const total = set.reduce((s, p) => s + p.value, 0);
      return { key, name: plain(beat.categoryNames[key]), kind: set[0].kind, sites: set.length, total, perSite: total / set.length };
    })
    .sort((a, b) => b.total - a.total);
  const subjectCat = perCategory.find((c) => c.kind === 2);
  const subjectPlaces = places.filter((p) => p.kind === 2);
  const subjectTotal = subjectPlaces.reduce((s, p) => s + p.value, 0);
  const densest = [...perCategory].sort((a, b) => b.perSite - a.perSite)[0];

  // ── THE DOT VALUES, DERIVED — the file's own mean per place, rounded to a legible step ────────
  const meanValue = totalValue / places.length;
  const legibleStep = (v) => {
    const power = Math.pow(10, Math.floor(Math.log10(v)));
    return [1, 2, 5, 10].map((m) => m * power).reduce((best, c) => (Math.abs(Math.log(c / v)) < Math.abs(Math.log(best / v)) ? c : best));
  };
  const DOT_VALUE = legibleStep(meanValue);
  const COARSE_VALUE = DOT_VALUE * 10;
  function apportion(dotValue) {
    const quota = places.map((p) => p.value / dotValue);
    const whole = quota.map((q) => Math.floor(q));
    let left = Math.round(totalValue / dotValue) - whole.reduce((a, b) => a + b, 0);
    const order = quota.map((q, i) => ({ i, rest: q - whole[i] })).sort((a, b) => b.rest - a.rest || a.i - b.i);
    for (let k = 0; k < order.length && left > 0; k += 1, left -= 1) whole[order[k].i] += 1;
    return whole;
  }
  function scatter(p, k, groundMetres, index) {
    if (k === 1) return [[p.lon, p.lat]];
    const R = 2 * groundMetres * Math.sqrt(k);
    const metrePerLon = 111320 * Math.cos((p.lat * Math.PI) / 180);
    const spin = index * GOLDEN;
    const out = [];
    for (let i = 0; i < k; i += 1) {
      const r = R * Math.sqrt(i / k);
      const a = i * GOLDEN + spin;
      out.push([p.lon + (r * Math.cos(a)) / metrePerLon, p.lat + (r * Math.sin(a)) / 111320]);
    }
    return out;
  }

  // ── the words that come before the direction (they decide its faces) ──────────────────────────
  const digits = (text) => plain(text).replace(/(\d)[\s  ](?=\d{3}(\D|$))/g, "$1");
  const numbersIn = (text) => [...digits(text).matchAll(/\d+(?:[.,]\d+)?/g)].map((m) => m[0]);
  const carries = (token, v) => {
    const n = Number(token.replace(",", "."));
    const d = (token.split(/[.,]/)[1] ?? "").length;
    return Number.isFinite(v) && Math.abs(Number(v.toFixed(d)) - n) < 1e-9;
  };
  const states = (text, v) => numbersIn(text).some((t) => carries(t, v));
  const foreign = (text, allowed) =>
    numbersIn(text).filter((t) => {
      const n = Number(t.replace(",", "."));
      if (Number.isInteger(n) && n >= 1900 && n <= 2100) return false;
      return !allowed.some((v) => carries(t, v));
    });
  const holdWords = (what, text, allowed, must = []) => {
    for (const [name, v] of must) if (!states(text, v)) throw new Error(`${what} must state ${name} (${Number.isInteger(v) ? v : v.toFixed(2)}, rounded as you print it); it says "${text}"`);
    const bad = foreign(text, allowed);
    if (bad.length) throw new Error(`${what} prints ${bad.join(", ")}, which the reading it receives does not carry: take every number from it; it says "${text}"`);
    return text;
  };

  // ── ONE direction, its plate ──────────────────────────────────────────────────────────────────
  // The direction is fitted to the words; the words that need the dot's ground size are only known
  // after the plate, so a stand-in of the same register is measured here (the faces are chosen per
  // register, and every digit is in the stand-in).
  const lang = beat.lang ?? storyLanguage(HERE) ?? "en";
  const eyebrow = plain(beat.eyebrow);
  const title = plain([beat.title].flat()[0]);
  const caveatHead = plain([beat.limits].flat()[0]);
  const source = plain(beat.source);
  const hint = plain(beat.hint);
  const keyLabel = plain(beat.keyLabel);
  const controlLabel = plain(beat.controlLabel);
  const columns = beat.columns.map(plain);
  const tableCaption = holdWords("tableCaption({ countries })", plain(beat.tableCaption({ countries: COUNTRIES.length })), [COUNTRIES.length]);
  const kindLabels = beat.kinds.map(plain);
  const ruleWords = [
    { key: "places", value: null, label: plain(beat.placeRule.label), announce: plain(beat.placeRule.announce), keyLine: plain(beat.placeRule.keyLine) },
    ...[DOT_VALUE, COARSE_VALUE].map((v) => {
      const label = plain(beat.valueRule.label(v));
      const announce = plain(beat.valueRule.announce(v));
      const keyLine = plain(beat.valueRule.keyLine(v));
      for (const [what, text] of [["label", label], ["announce", announce], ["keyLine", keyLine]]) holdWords(`valueRule.${what}(${v})`, text, [v, 1], [["the dot value v", v]]);
      return { key: `${v} unit`, value: v, label, announce, keyLine };
    }),
  ];
  if (!ruleWords[1].keyLine.includes("1")) throw new Error(`valueRule.keyLine must read as "1 dot = ${DOT_VALUE} …"`);
  const standIn = { display: title, eyebrow, body: `${caveatHead} ${source} ${hint} 0123456789`, axis: `${keyLabel} ${controlLabel} ${tableCaption} ${columns.join(" ")} ${kindLabels.join(" ")} ${ruleWords.map((r) => `${r.label} ${r.announce} ${r.keyLine}`).join(" ")} ${COUNTRIES.map(NAME).join(" ")} 0123456789`, annot: "0123456789", value: "0123456789" };
  const first = pickDirection(HERE, plainRegisters(standIn), beat.evidenceLevels ?? 3);
  const label = first.label;
  let direction = first.direction;
  const tints = plateTints(direction, { landDose: LAND_DOSE });
  const plateFacts = ensurePlate({ here: HERE, label, water: tints.water, land: tints.land, frame: PLATE_FRAME, args: ["--countries", join(HERE, "shapes.geojson")] });
  const FRAME = plateFacts.frame;
  const CORNERS = plateFacts.frameCorners;
  if (!(plateFacts.zoom > 0) || !(plateFacts.metresPerPixel > 0)) throw new Error("this plate predates the camera facts: delete plate/ and render again");
  const ASKED = { west: plateFacts.bounds[0][0], south: plateFacts.bounds[0][1], east: plateFacts.bounds[1][0], north: plateFacts.bounds[1][1] };

  // ── THE CAMERA HOLDS EVERY PLACE; a country it cannot hold whole is drawn in part ────────────
  const outside = places.filter((p) => p.lon < ASKED.west || p.lon > ASKED.east || p.lat < ASKED.south || p.lat > ASKED.north);
  if (outside.length)
    throw new Error(
      `${outside.length} of the ${places.length} places fall outside this kit's Europe window (${ASKED.west}..${ASKED.east}°E, ${ASKED.south}..${ASKED.north}°N), e.g. ${[...new Set(outside.map((p) => p.country))].slice(0, 5).join(", ")}: ` +
        "leave those rows out with exclude (and say so in the standfirst) — the count would say one number and the map would draw another",
    );
  const geo = JSON.parse(readFileSync(join(HERE, "shapes.geojson"), "utf8"));
  const featureOf = new Map(geo.features.map((f) => [f.properties.iso, f]));
  const largest = (f) => {
    const polys = f.geometry.type === "Polygon" ? [f.geometry.coordinates] : f.geometry.coordinates;
    let best = null;
    for (const poly of polys) {
      const xs = poly[0].map((p) => p[0]);
      const ys = poly[0].map((p) => p[1]);
      const box = { west: Math.min(...xs), east: Math.max(...xs), south: Math.min(...ys), north: Math.max(...ys) };
      const span = (box.east - box.west) * (box.north - box.south);
      if (!best || span > best.span) best = { ...box, span };
    }
    return best;
  };
  const inPart = codes.filter((c) => {
    const b = largest(featureOf.get(c));
    return b.west < ASKED.west || b.east > ASKED.east || b.south < ASKED.south || b.north > ASKED.north;
  });
  if (inPart.length) console.log(`drawn only in part by the Europe camera (set aside from the Mercator measure): ${inPart.map(NAME).join(", ")}`);

  // ── WHAT A DOT IS ON THE GROUND, derived from the framing the beat publishes ──────────────────
  const mercFraction = (lat) => (180 - (180 / Math.PI) * Math.log(Math.tan(Math.PI / 4 + (lat * Math.PI) / 360))) / 360;
  const fitZoomFor = (box) => {
    const dx = (ASKED.east - ASKED.west) / 360;
    const dy = Math.abs(mercFraction(ASKED.north) - mercFraction(ASKED.south));
    return Math.log2(Math.min(box.width / dx, box.height / dy) / 512);
  };
  const FIT_ZOOM = fitZoomFor(REVIEW_BOX);
  const DOT_BAKE_PX = FLOOR_PX * Math.pow(2, plateFacts.zoom - FIT_ZOOM);
  const DOT_GROUND_M = DOT_BAKE_PX * plateFacts.metresPerPixel;

  // ── THE THREE FIELDS ──────────────────────────────────────────────────────────────────────────
  const RULE_DEFS = ruleWords;
  const fields = RULE_DEFS.map((def) => {
    const counts = def.value === null ? places.map(() => 1) : apportion(def.value);
    const xy = [];
    const kind = [];
    const site = [];
    for (const wanted of [0, 1, 2])
      places.forEach((p, i) => {
        if (p.kind !== wanted || counts[i] === 0) return;
        for (const [lon, lat] of scatter(p, counts[i], DOT_GROUND_M, i)) {
          xy.push(Number(lon.toFixed(3)), Number(lat.toFixed(3)));
          kind.push(wanted);
          site.push(i);
        }
      });
    return { ...def, counts, xy, kind, site, dots: kind.length };
  });
  const toFrame = frameProjector(plateFacts);
  const OCCUPANCY = markOccupancy(
    fields.flatMap((f) =>
      Array.from({ length: f.dots }, (_, i) => {
        const [x, y] = toFrame([f.xy[i * 2], f.xy[i * 2 + 1]]);
        return { kind: "disc", x, y, r: DOT_BAKE_PX };
      }),
    ),
    plateWaterField(join(HERE, "plate", label)),
  );
  console.log(occupancyLine(OCCUPANCY));
  const colourProblems = guardColour(direction, plateGrounds(tints, OCCUPANCY));
  if (colourProblems.length) throw new Error(`the direction cannot carry this beat's colour: ${colourProblems.join("; ")} — change the accent in PALETTE.md`);
  const perKind = fields.map((f) => [0, 1, 2].map((k) => f.kind.filter((x) => x === k).length));
  const silent = fields.map((f) => f.counts.filter((n) => n === 0).length);

  // ── WHAT MERCATOR COSTS THIS SUBJECT: the ground under the dots, drawn larger in the north ────
  const RAD = Math.PI / 180;
  const mercY = (lat) => Math.log(Math.tan(Math.PI / 4 + (lat * RAD) / 2));
  const toFramePx = ([lon, lat]) => [((lon - CORNERS.west) / (CORNERS.east - CORNERS.west)) * FRAME.width, ((mercY(lat) - mercY(CORNERS.north)) / (mercY(CORNERS.south) - mercY(CORNERS.north))) * FRAME.height];
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
  const inFrame = ([lon, lat]) => lon >= CORNERS.west && lon <= CORNERS.east && lat >= CORNERS.south && lat <= CORNERS.north;
  const areas = new Map();
  for (const c of codes) {
    if (inPart.includes(c)) continue;
    const f = featureOf.get(c);
    const polys = f.geometry.type === "Polygon" ? [f.geometry.coordinates] : f.geometry.coordinates;
    let page = 0;
    let real = 0;
    for (const poly of polys) {
      if (!poly[0].some(inFrame)) continue;
      page += shoelace(poly[0].map(toFramePx));
      real += sphericalArea(poly[0]);
    }
    if (page > 0) areas.set(c, { page, real });
  }
  const PAGE_TOTAL = [...areas.values()].reduce((s, a) => s + a.page, 0);
  const REAL_TOTAL = [...areas.values()].reduce((s, a) => s + a.real, 0);
  const weightOf = (c) => areas.get(c).page / PAGE_TOTAL / (areas.get(c).real / REAL_TOTAL);
  const inflated = beat.inflated ?? [...areas.keys()].sort((a, b) => weightOf(b) - weightOf(a)).slice(0, 3);
  const notMeasured = inflated.filter((c) => !areas.has(c));
  if (notMeasured.length) throw new Error(`inflated names ${notMeasured.join(", ")}, which the map does not draw whole or holds no place: name countries with places (or leave inflated out)`);
  const pageShare = (inflated.reduce((s, c) => s + areas.get(c).page, 0) / PAGE_TOTAL) * 100;
  const trueShare = (inflated.reduce((s, c) => s + areas.get(c).real, 0) / REAL_TOTAL) * 100;
  if (!(pageShare > trueShare)) throw new Error(`${inflated.join(", ")} cover ${pageShare.toFixed(1)} % of the drawn land for ${trueShare.toFixed(1)} % of the real land: Mercator does not inflate them — name the northernmost countries in inflated, or leave it out`);
  const dilution = pageShare / trueShare;

  const coverageOf = (f) => (Math.PI * Math.pow(DOT_GROUND_M / 1000, 2) * f.dots) / REAL_TOTAL;
  const COVERAGE = coverageOf(fields[1]);
  if (!(COVERAGE > 0.02 && COVERAGE < 0.5))
    throw new Error(
      `under the ${DOT_VALUE} value rule the dots cover ${(COVERAGE * 100).toFixed(1)} % of the studied countries' ground in ink: under 2 % the map reads as empty, over 50 % it closes into a blob. ` +
        "This file's places are too few or too many for this kit's one dot size over Europe — tell the journalist this is not a dot-density map",
    );

  // ── THE READINGS the word functions receive ──────────────────────────────────────────────────
  const dotsOf = (f, pred) => places.reduce((s, p, i) => s + (pred(p) ? f.counts[i] : 0), 0);
  const subjectDots = fields.map((f) => dotsOf(f, (p) => p.kind === 2));
  const ink = fields.map((f, i) => (subjectDots[i] / f.dots) * 100);
  if (!(ink[1] > ink[0]))
    throw new Error(`under the ${DOT_VALUE} value rule the subject takes ${ink[1].toFixed(2)} % of the dots against ${ink[0].toFixed(2)} % under one dot per place: the gesture (what one dot is worth changes the picture of the subject) shows nothing for this subject — this kit is not the right map for it`);
  const ruleReading = (i) => ({
    key: ["places", "unit", "coarse"][i],
    value: fields[i].value,
    dots: fields[i].dots,
    placeDots: fields[0].dots,
    sites: places.length,
    silent: silent[i],
    silentPc: (silent[i] / places.length) * 100,
    subjectDots: subjectDots[i],
    subjectInk: ink[i],
    subjectInkPlaces: ink[0],
    subjectName: subjectCat.name,
    perKind: perKind[i],
  });
  const READ = [0, 1, 2].map(ruleReading);
  const ruleNumbers = (r) => [r.value ?? NaN, r.dots, r.placeDots, r.sites, r.silent, r.silentPc, r.subjectDots, r.subjectInk, r.subjectInkPlaces, DOT_VALUE, COARSE_VALUE, 10, 1, ...r.perKind];
  const claim = {
    sites: places.length,
    total: totalValue,
    categories: perCategory.map(({ key, name, sites, total, perSite }) => ({ key, name, sites, total, perSite })),
    subject: { key: subjectCat.key, name: subjectCat.name, sites: subjectPlaces.length, total: subjectTotal, perSite: subjectTotal / subjectPlaces.length, siteShare: (subjectPlaces.length / places.length) * 100, valueShare: (subjectTotal / totalValue) * 100 },
    densest: densest.key,
    rules: { places: READ[0], unit: READ[1], coarse: READ[2] },
  };
  beat.check(claim);
  const claimNumbers = [claim.sites, claim.total, ...perCategory.flatMap((c) => [c.sites, c.total, c.perSite, (c.sites / places.length) * 100, (c.total / totalValue) * 100]), claim.subject.siteShare, claim.subject.valueShare, claim.subject.perSite, ...READ.flatMap(ruleNumbers)];
  assertHeadlineNumbersDrawn(title, claimNumbers, "readings");

  const notes = {
    unit: holdWords("unitNote(r)", plain(beat.unitNote(READ[1])), ruleNumbers(READ[1]), [["r.dots", READ[1].dots], ["r.silent", READ[1].silent]]),
    coarse: holdWords("coarseNote(r)", plain(beat.coarseNote(READ[2])), ruleNumbers(READ[2]), [["r.dots", READ[2].dots], ["r.silent", READ[2].silent]]),
  };
  const RULES = fields.map((f, i) => ({ key: f.key, label: f.label, announce: f.announce, keyLine: f.keyLine, note: i === 0 ? null : i === 1 ? notes.unit : notes.coarse, xy: f.xy, kind: f.kind, site: f.site }));
  const groundKm = DOT_GROUND_M / 1000;
  const reading = holdWords("reading(r)", plain(beat.reading({ groundKm, unit: DOT_VALUE })), [groundKm, DOT_VALUE, 1], [["r.groundKm", groundKm]]);
  const merc = { names: inflated.map(NAME), pageShare, trueShare, dilution, subjectInkPlaces: ink[0], subjectInk: ink[1], unit: DOT_VALUE, subjectName: subjectCat.name };
  const mercator = holdWords("mercator(m)", plain(beat.mercator(merc)), [pageShare, trueShare, dilution, ink[0], ink[1], DOT_VALUE, 1], [["m.dilution", dilution]]);
  const caveat = `${caveatHead} ${mercator}`;
  const claimNote = holdWords("claimNote(c)", plain(beat.claimNote(claim)), claimNumbers);
  const altReading = { placeDots: fields[0].dots, unitDots: fields[1].dots, subjectSites: subjectPlaces.length, subjectDotsUnit: subjectDots[1], unit: DOT_VALUE, subjectName: subjectCat.name, rules: RULES.length };
  const alt = holdWords("alt(a)", plain(beat.alt(altReading)), [...Object.values(altReading).filter((v) => typeof v === "number"), ...claimNumbers]);

  // ── WHAT THE POINTER ANSWERS, cut into pieces the browser only joins ─────────────────────────
  const byCountry = new Map(codes.map((c) => [c, { total: 0, sites: 0, subject: 0 }]));
  for (const p of places) {
    const b = byCountry.get(p.iso);
    b.total += p.value;
    b.sites += 1;
    if (p.kind === 2) b.subject += 1;
  }
  const catIndex = new Map(categories.map((c, i) => [c, i]));
  const parts = places.map((p) => {
    const amount = plain(beat.unitValue(p.value));
    const pc = (p.value / byCountry.get(p.iso).total) * 100;
    const shareWord = plain(beat.share(pc));
    return [catIndex.get(p.category), amount, COUNTRIES.indexOf(p.iso), shareWord, p.value, pc];
  });
  for (const [, amount, , shareWord, v, pc] of parts.slice(0, 50)) {
    holdWords("unitValue(v)", amount, [v], [["v", v]]);
    holdWords("share(v)", shareWord, [pc], [["v", pc]]);
  }
  const countWords = {};
  for (const f of fields)
    for (const n of f.counts)
      if (n > 0 && !countWords[n]) countWords[n] = holdWords(`countWord(${n})`, plain(beat.countWord(n)), [n], [["n", n]]);
  const answers = {
    sep: plain(beat.sep),
    tail: plain(beat.tail),
    fuelWords: categories.map((c) => plain(beat.categoryNames[c])),
    countryWords: COUNTRIES.map(NAME),
    parts: parts.map(([a, b, c, d]) => [a, b, c, d]),
    counts: Object.fromEntries(fields.map((f) => [dotSlugOf(f.key), f.counts])),
    countWords,
  };
  const kinds = kindLabels.map((lab, k) => ({
    label: lab,
    counts: fields.map((f, i) => ({ slug: dotSlugOf(f.key), text: holdWords("kindCount(n)", plain(beat.kindCount(perKind[i][k])), [perKind[i][k]], [["n", perKind[i][k]]]) })),
  }));
  const rows = COUNTRIES.map((c) => {
    const b = byCountry.get(c);
    const reading = { name: NAME(c), sites: b.sites, total: b.total, sharePc: (b.total / totalValue) * 100, perSite: b.total / b.sites, subjectSites: b.subject };
    const detail = plain(beat.countryDetail(reading));
    if (!detail.includes(reading.name)) throw new Error(`countryDetail must name the country it answers for: ${reading.name} → "${detail}"`);
    holdWords(`countryDetail (${reading.name})`, detail, [reading.sites, reading.total, reading.sharePc, reading.perSite, reading.subjectSites]);
    return {
      code: ISO2(c),
      name: reading.name,
      sites: plain(beat.count(b.sites)),
      capacity: plain(beat.capacity(b.total)),
      dots: fields.map((f) => ({ slug: dotSlugOf(f.key), text: plain(beat.count(dotsOf(f, (p) => p.iso === c))) })),
      detail,
    };
  });
  const dupes = rows.filter((r, i) => rows.findIndex((o) => o.detail === r.detail) !== i);
  if (dupes.length) throw new Error(`countryDetail answers ${dupes[0].name} with the same sentence as another country`);

  console.log(
    `${places.length} places · ${subjectPlaces.length} ${subjectCat.name} (${claim.subject.siteShare.toFixed(1)} % of the places) carrying ${claim.subject.valueShare.toFixed(1)} % of the total · ` +
      `dot value DERIVED: mean ${meanValue.toFixed(1)} per place → ${DOT_VALUE} · coarse ${COARSE_VALUE}`,
  );
  for (const [i, f] of fields.entries())
    console.log(`rule ${f.key.padEnd(10)} ${String(f.dots).padStart(6)} dots · ${subjectCat.name} ${perKind[i][2]} (${ink[i].toFixed(2)} % of the ink) · ${silent[i]} places get no dot · coverage ${(coverageOf(f) * 100).toFixed(1)} %`);
  console.log(`one dot: ${DOT_BAKE_PX.toFixed(2)} px on the plate = ${groundKm.toFixed(1)} km of ground radius · what Mercator costs: ${merc.names.join(" + ")} ${pageShare.toFixed(1)} % of the drawn land for ${trueShare.toFixed(1)} % of the real land (the same field looks ${dilution.toFixed(2)}× less dense there)`);

  // ── the live plan ─────────────────────────────────────────────────────────────────────────────
  const registers = {
    display: title,
    eyebrow,
    body: `${caveat} ${reading} ${source} ${hint}`,
    axis: `${keyLabel} ${RULES.map((r) => r.keyLine).join(" ")} ${kinds.map((k) => `${k.label} ${k.counts.map((c) => c.text).join(" ")}`).join(" ")} ${controlLabel} ${RULES.map((r) => `${r.label} ${r.announce}`).join(" ")} ${tableCaption} ${columns.join(" ")} ${rows.map((r) => `${r.name} ${r.sites} ${r.capacity} ${r.dots.map((d) => d.text).join(" ")}`).join(" ")}`,
    annot: `${claimNote} ${RULES.map((r) => r.note ?? "").join(" ")}`,
    value: perCategory.map((c) => plain(beat.unitValue(c.perSite))).join(" "),
  };
  const picked = pickDirection(HERE, plainRegisters(registers), beat.evidenceLevels ?? 3);
  if (picked.label !== label) throw new Error(`the direction fitted to the final words (${picked.label}) is not the one the plate was baked for (${label}): a defect in the kit`);
  // The faces fitted to the FINAL words (the colours are the same direction's).
  direction = picked.direction;
  const furniture = deriveFurniture(direction.ground);
  const { tones, activeTones } = dotTones({ ground: direction.ground, accent: direction.accent, ink: furniture.ink, plateLand: tints.land });
  const live = {
    style: plateFacts.style,
    tints,
    countries: { ...countryGround({ ground: direction.ground, land: tints.land, water: tints.water, ink: furniture.ink }), border: null },
    studyBounds: ASKED,
    frame: FRAME,
    degreesPerPixel: plateFacts.degreesPerPixel,
    bakeZoom: plateFacts.zoom,
    studyCodes: COUNTRIES.map(ISO2),
    tones,
    activeTones,
    radius: { bakePx: DOT_BAKE_PX, floorPx: FLOOR_PX, groundMetres: DOT_GROUND_M },
    hitPx: HIT_PX,
    rules: RULES,
    defaultKey: RULES[0].key,
    border: { studied: mix(direction.ground, furniture.ink, 0.35), other: mix(tints.land, furniture.ink, 0.18), width: 0.8 },
    answers,
    locale: beat.mapLocale ?? (lang.startsWith("fr") ? { title: "Carte", zoomIn: "Zoomer", zoomOut: "Dézoomer" } : { title: "Map", zoomIn: "Zoom in", zoomOut: "Zoom out" }),
    changeMs: CHANGE_MS,
  };
  const livePlan = liveDotDensityPlan(live);
  const { maplibreJs, maplibreCss, styleModule } = liveAssets(HERE);
  const liveScript = liveDotDensityScript(live, { scope: ".chart-figure", styleModule, controlName: DOT_ID_PREFIX });

  const biggest = places.reduce((b, p, i) => (p.kind === 2 && (b < 0 || p.value > places[b].value) ? i : b), -1);
  const interaction = {
    earns: `A still has exactly one dot value, baked into the drawing; only here can the reader put the same ${places.length} places at three resolutions and watch the subject go from ${ink[0].toFixed(1)} % of the ink to ${ink[1].toFixed(1)} % with nothing added and nothing removed.`,
    controls: [
      {
        question: "What is one dot worth — and what if it were worth something else?",
        gesture: "toggle-a-comparison",
        changes: `The field is laid again at the chosen resolution (${fields.map((f) => f.dots).join(" / ")} dots): the key line and the per-treatment counts rewrite, and a sentence says how many places no longer reach one dot. The camera and the scale do not change — only where the ink sits.`,
        parameter: "what one dot is worth",
        authorPicked: "places",
        readerPicks: ["places", "value"],
        heldStill: [".chart-header", ".chart-source"],
      },
      {
        question: "And country by country, without the map — or without JavaScript?",
        gesture: "open-the-full-table",
        changes: `The ${COUNTRIES.length} countries open under the map with their places, their total and the dots the chosen rule gives them; that column follows the rule in pure CSS.`,
        parameter: "the form the readings are read in",
        authorPicked: "the map",
        readerPicks: ["the map", "the table"],
        heldStill: [".chart-header", ".chart-source"],
      },
      {
        question: "What is this dot — and how many dots did this place get?",
        gesture: "ask-a-mark",
        changes: "Every dot of the same place lights up at once, none changing size, and the answer gives its category, its quantity, its country, its share of that country and how many dots it got at this resolution.",
        parameter: "which place is in question",
        authorPicked: NAME(places[biggest].iso),
        readerPicks: "every mark",
        heldStill: [".chart-header", ".chart-source"],
      },
    ],
  };

  const key = maptilerKey(HERE);
  const pageOf = (plate, box) =>
    renderWeb({
      lang,
      drawing: { share: MAP_DRAWING_SHARE },
      component: DirectedDotMapWeb,
      props: { plate, live, livePlan, liveScript, liveHint: hint, maplibreCss, maplibreJs, kinds, rows, tableCaption, columns, controlLabel, keyLabel, aspect: box.width / box.height, size: box.width, title, eyebrow, caveat, source, reading, claimNote, alt, interaction, direction, ground: direction.ground, accent: direction.accent },
      outDir: join(HERE, "renders"),
      name: `${label}.html`,
    });

  // The photograph is asked whether it has dots on it, whether the plot is as tall as the dot's
  // ground size was derived for, and whether the browser fitted the zoom this file predicted.
  const atView = async (page) => {
    const seen = await page.evaluate(() => {
      const figure = document.querySelector(".chart-figure");
      const map = window.__mwMap;
      const rule = figure.getAttribute("data-live-rule");
      const layer = "mw-dots-" + rule;
      const box = document.querySelector(".map-layer").getBoundingClientRect();
      return { view: figure.getAttribute("data-live-view"), mounted: !!map.getLayer(layer), drawn: map.getLayer(layer) ? map.queryRenderedFeatures({ layers: [layer] }).length : 0, width: box.width, height: box.height };
    });
    if (!seen.mounted || !seen.drawn) throw new Error(`the live map has ${seen.drawn} of its dots drawn (layer mounted: ${seen.mounted}): a dot map with no dots is a basemap`);
    if (seen.height < REVIEW_BOX.height - 1)
      throw new Error(`the map is ${Math.round(seen.height)} px tall at the review window and the dot's ground size is derived for ${REVIEW_BOX.height}: the words above the map are too long — shorten limits, mercator() or the rule notes`);
    const fitted = Number(String(seen.view ?? "").split("@")[1]);
    const predicted = fitZoomFor(seen);
    if (Math.abs(fitted - predicted) > 0.02)
      throw new Error(`the browser fitted the study at zoom ${fitted.toFixed(3)} where this kit predicts ${predicted.toFixed(3)}: every dot would stand for a piece of ground the page does not claim (a defect in the kit)`);
    console.log(`fallback: ${Math.round(seen.width)}x${Math.round(seen.height)} CSS px · fitted zoom ${fitted.toFixed(3)} (predicted ${predicted.toFixed(3)}) · ${seen.drawn} dots rendered`);
  };
  // The photograph is of the map's own BOX, which is what the words leave: the stamp carries them
  // too, so a sentence that changes height re-photographs (the flow worked example paid for this).
  const { outPath, keyedPath } = await renderLiveMapPage({ here: HERE, label, key, stamp: { livePlan, registers }, pageOf, atView });
  assertDotValueReachesTheLayers(readFileSync(outPath, "utf8"), live, plateFacts.style, plateFacts.zoom, { where: `renders/${label}.html` });
  console.log(`rendered renders/${label}.html (keyed copy for review: shots/${label}.local.html)`);

  // The probe holds a sample of places to their own answer under the opening rule: every place of
  // the subject plus the largest place of each country, among those whose nearest neighbouring place
  // is far enough to be told apart at the probe's 1600x800 window (≈ 0.35° ≈ 8 px). Each is looked
  // for pixel by pixel around its own coordinates (the dots are ~1 px).
  const answerOf = (i) => {
    const [c, amount, country, shareWord] = answers.parts[i];
    const n = answers.counts[dotSlugOf(RULES[0].key)][i];
    const text = answers.fuelWords[c] + answers.sep + amount + answers.sep + answers.countryWords[country] + answers.sep + shareWord + answers.tail;
    return n && countWords[n] ? text + answers.sep + countWords[n] : text;
  };
  const SEPARATION_DEG = 0.35;
  const alone = (i) => places.every((q, j) => j === i || Math.hypot((q.lon - places[i].lon) * Math.cos(places[i].lat * RAD), q.lat - places[i].lat) >= SEPARATION_DEG);
  const sample = new Set();
  places.forEach((p, i) => {
    if (p.kind === 2 && alone(i)) sample.add(i);
  });
  for (const c of codes) {
    const best = places.map((p, i) => [p, i]).filter(([p, i]) => p.iso === c && alone(i)).sort((a, b) => b[0].value - a[0].value)[0];
    if (best) sample.add(best[1]);
  }
  if (sample.size < 5) throw new Error(`only ${sample.size} places stand far enough from every other to be probed one by one: the field is too dense for this kit's check (a defect to report, not a beat.mjs fix)`);
  const subjectSample = [...sample].sort((a, b) => places[b].value - places[a].value)[0];
  console.log(`live-mark probe sample: ${sample.size} isolated places (${[...sample].filter((i) => places[i].kind === 2).length} of the subject)`);
  await verifyLiveMap({
    here: HERE,
    label,
    keyedPath,
    waivers: [
      { test: /^\s*FAIL phone 375x812: no vertical scroll inside the visual\b/, why: "inherited from the worked example: on a phone the map keeps its height and the page scrolls (full-width ruling)" },
      { test: /^\s*FAIL phone 375x812: the source line is on screen\b/, why: "inherited from the worked example: the same phone scroll puts the source line below the fold" },
    ],
    probe: {
      layers: [`mw-dots-${dotSlugOf(RULES[0].key)}`],
      keyProp: "s",
      expected: Object.fromEntries([...sample].map((i) => [i, answerOf(i)])),
      subject: subjectSample,
      anchors: Object.fromEntries([...sample].map((i) => [i, [places[i].lon, places[i].lat]])),
    },
  });
});
