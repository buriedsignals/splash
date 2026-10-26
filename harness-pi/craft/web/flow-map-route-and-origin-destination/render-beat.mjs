// The generic half of a flow-map WEB beat, taken from
// proof/web-flow-map-ukraine-protection/render-directions-web.mjs with everything about ITS subject
// removed. The page is the worked example's: a LIVE MapTiler map — one origin, one band per
// destination (Minard reversed), every band a MapLibre line whose WIDTH is the quantity, a curve of
// fixed bow that carries no datum — over a frozen fallback photographed from that live map, and ONE
// control: the reader picks WHAT THE WIDTH IS DIVIDED BY — nothing (the count), the destination's
// population (per 1,000 inhabitants), or its land area measured on the kit's shapes (per 1,000 km²).
// A band thinner than the floor is COUNTED, not drawn. The key's rungs, the sentence under the
// control, the table's ranks and width samples follow the measure (the last two in pure CSS).
// Hovering a band redraws it at full strength above the others and answers its own reading.
//
// This file computes every width, rank, remainder, the seats, the fan, the camera window, what Web
// Mercator costs this fan and the readings each word function receives; ./beat.mjs — the one file
// the model writes — names the columns and gives the WORDS. Copied into the beat by the harness;
// never edited by the model.
//
// Usage:  bun <beat>/render-beat.mjs
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { contrast } from "#shared/chart-beat/colour.mjs";
import { deriveFurniture } from "#shared/chart-beat/render-still.mjs";
import { guardColour } from "#shared/design-base/compose.mjs";
import { ISO3_TO_ISO2 } from "#shared/map-beat/iso-codes.mjs";
import { countryGround, plateGrounds, plateTints } from "#shared/map-beat/tints.mjs";
import { frameProjector, markOccupancy, occupancyLine } from "#shared/map-beat/occupancy.mjs";
import { applyStoryboard, assertDrawsClaimColumn, assertHeadlineNumbersDrawn, assertNumbers } from "./guards.mjs";
import { ensurePlate, liveAssets, mapWeb, maptilerKey, renderLiveMapPage, verifyLiveMap } from "./map-web.mjs";
import { plateWaterField } from "./plate-water.mjs";
import { chartWeb, pickDirection, plain, plainRegisters, refusing, storyLanguage } from "./web.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));

const PLATE_FRAME = [1600, 1216];
const LAND_DOSE = 0.07;
/** The widest band and the floor under which a band is counted rather than drawn, CSS px (the
 *  worked example's; under ~1 px a stroke at the ribbon's opacity is a grey hair, not a band). */
const W_MAX = 30;
const MIN_W = 1.2;
/** How far a band bows off its own chord, as a fraction of it, in the map's projected plane. */
const BULGE = 0.12;
const CURVE_SAMPLES = 48;
/** The camera holds the fan with this much air on every side, in degrees (the worked example's). */
const AIR_DEG = 1;
/** The worked example's own raster width for the drawn-plate width conversion. */
const SIZE = 900;
const RIBBON_OPACITY = 0.55;
const MEASURE_KEYS = ["count", "perCapita", "perArea"];

await refusing(HERE, async () => {
  const { default: beat } = await import("./beat.mjs");
  applyStoryboard(beat, HERE);
  const { renderWeb, MAP_DRAWING_SHARE } = await import(chartWeb(HERE, "scripts", "render-web.mjs"));
  const { assertMeasuresReachTheLayers, assertOneMeasure, flowKeyForMarkup, flowWidthOf, liveFlowPlan, liveFlowScript } = await import(mapWeb(HERE, "assets", "live-flow.ts"));
  const { CHANGE_MS, DirectedFlowMapWeb, MEASURE_ID_PREFIX, flowInks } = await import("./DirectedFlowMapWeb.tsx");

  // ── the fields ────────────────────────────────────────────────────────────────────────────────
  const REQUIRED = ["eyebrow", "key", "value", "population", "origin", "names", "measures", "controlLabel", "note", "rank", "detail", "countedLabel", "tableCaption", "columns", "claimNote", "mercator", "reading", "hint", "title", "limits", "source", "alt", "check"];
  const missingFields = REQUIRED.filter((k) => beat[k] === undefined);
  if (missingFields.length) throw new Error(`beat.mjs is missing ${missingFields.join(", ")} (see CONTRACT.md)`);
  for (const fn of ["note", "rank", "detail", "tableCaption", "claimNote", "mercator", "reading", "alt", "check"])
    if (typeof beat[fn] !== "function") throw new Error(`beat.mjs: ${fn} must be a function (see CONTRACT.md)`);
  for (const k of MEASURE_KEYS) {
    const m = beat.measures?.[k];
    if (!m || typeof m.label !== "string" || typeof m.unit !== "string" || typeof m.announce !== "string" || typeof m.format !== "function")
      throw new Error(`beat.mjs: measures.${k} must be { label, unit, announce, format(v) } (see CONTRACT.md)`);
    if (!m.announce.includes(m.label)) throw new Error(`measures.${k}.announce must CONTAIN its label "${m.label}" (a screen reader hears the name it can see)`);
  }
  if (!Array.isArray(beat.columns) || beat.columns.length !== 6) throw new Error("columns must be the table's six headings: destination, count, per inhabitants, per area, rank, width (see CONTRACT.md)");

  // ── THE ROWS, AND THE JOIN ────────────────────────────────────────────────────────────────────
  const table = JSON.parse(readFileSync(join(HERE, "data.json"), "utf8"));
  const at = (name) => {
    const i = table.columns.findIndex((c) => c.name === name);
    if (i < 0) throw new Error(`data.json has no column ${JSON.stringify(name)}; its columns are ${table.columns.map((c) => c.name).join(", ")}`);
    return i;
  };
  const [CI, VI, PI] = [at(beat.key), at(beat.value), at(beat.population)];
  const filters = Object.entries(beat.where ?? {}).map(([c, v]) => [at(c), String(v)]);
  const num = (raw) => Number(String(raw).replace(/\s/g, "").replace(",", "."));
  const ORIGIN = String(beat.origin);
  const flows = [];
  for (const r of table.rows) {
    if (!filters.every(([i, v]) => String(r[i]) === v)) continue;
    const code = String(r[CI]).trim().toUpperCase();
    const people = num(r[VI]);
    if (!/^[A-Z]{3}$/.test(code)) throw new Error(`${beat.key} holds ${JSON.stringify(r[CI])}: it must be an ISO 3166 alpha-3 code (resolve names with countries.mjs)`);
    if (code === ORIGIN) throw new Error(`${code} is the origin and also a destination row: leave the origin out of the rows (or filter it with where)`);
    if (!Number.isFinite(people) || people <= 0) throw new Error(`${code}: ${beat.value} = ${JSON.stringify(r[VI])} — a band's width is a positive quantity; leave out rows with none (say so)`);
    const inhabitants = num(r[PI]);
    if (!(inhabitants > 0)) throw new Error(`${code}: ${beat.population} = ${JSON.stringify(r[PI])} — the per-inhabitant measure needs every destination's population`);
    if (flows.some((f) => f.code === code)) throw new Error(`two rows for ${code}: keep ONE row per destination (filter to one month or category with where)`);
    flows.push({ code, people, inhabitants });
  }
  if (flows.length < 4) throw new Error(`${flows.length} destinations: a fan needs at least four`);
  flows.sort((a, b) => b.people - a.people);
  assertNumbers(flows.map((f) => [f.code, f.people]));
  const nameless = [ORIGIN, ...flows.map((f) => f.code)].filter((c) => typeof beat.names?.[c] !== "string" || !beat.names[c].trim());
  if (nameless.length) throw new Error(`names must give the origin and every destination its name in the story's language; missing: ${nameless.join(", ")}`);
  const NAME = (c) => plain(beat.names[c]);
  for (const f of flows) f.name = NAME(f.code);
  const total = flows.reduce((s, f) => s + f.people, 0);

  // ── THE GEOGRAPHY: every seat a point on its own largest part, every area on the shapes ───────
  const geo = JSON.parse(readFileSync(join(HERE, "shapes.geojson"), "utf8"));
  const RAD = Math.PI / 180;
  const EARTH_KM = 6371.0088;
  const mercY = (lat) => Math.log(Math.tan(Math.PI / 4 + (lat * RAD) / 2));
  const mercYdeg = (lat) => (mercY(lat) * 180) / Math.PI;
  const unmercYdeg = (y) => (2 * Math.atan(Math.exp((y * Math.PI) / 180)) - Math.PI / 2) / RAD;
  const ringArea = (ring) => {
    let sum = 0;
    for (let i = 0; i < ring.length; i += 1) {
      const [x1, y1] = ring[i];
      const [x2, y2] = ring[(i + 1) % ring.length];
      sum += x1 * y2 - x2 * y1;
    }
    return sum / 2;
  };
  const ringCentroid = (ring) => {
    let cx = 0;
    let cy = 0;
    let a = 0;
    for (let i = 0; i < ring.length; i += 1) {
      const [x1, y1] = ring[i];
      const [x2, y2] = ring[(i + 1) % ring.length];
      const f = x1 * y2 - x2 * y1;
      a += f;
      cx += (x1 + x2) * f;
      cy += (y1 + y2) * f;
    }
    a /= 2;
    return [cx / (6 * a), cy / (6 * a)];
  };
  const inRing = (p, ring) => {
    let inside = false;
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      const [xi, yi] = ring[i];
      const [xj, yj] = ring[j];
      if (yi > p[1] !== yj > p[1] && p[0] < ((xj - xi) * (p[1] - yi)) / (yj - yi) + xi) inside = !inside;
    }
    return inside;
  };
  const pointOnFeature = (ring) => {
    const centre = ringCentroid(ring);
    if (inRing(centre, ring)) return centre;
    const y = centre[1];
    const crossings = [];
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      const [xi, yi] = ring[i];
      const [xj, yj] = ring[j];
      if (yi > y !== yj > y) crossings.push(xi + ((xj - xi) * (y - yi)) / (yj - yi));
    }
    crossings.sort((a, b) => a - b);
    let best = null;
    for (let i = 0; i + 1 < crossings.length; i += 2) {
      const span = crossings[i + 1] - crossings[i];
      if (!best || span > best.span) best = { span, x: (crossings[i] + crossings[i + 1]) / 2 };
    }
    return best ? [best.x, y] : centre;
  };
  const sphericalArea = (ring) => {
    let sum = 0;
    for (let i = 0; i < ring.length; i += 1) {
      const [l1, p1] = ring[i];
      const [l2, p2] = ring[(i + 1) % ring.length];
      sum += (l2 - l1) * RAD * (2 + Math.sin(p1 * RAD) + Math.sin(p2 * RAD));
    }
    return Math.abs((sum * EARTH_KM * EARTH_KM) / 2);
  };
  const wanted = new Set([ORIGIN, ...flows.map((f) => f.code)]);
  const seats = {};
  const areaKm2 = {};
  for (const feature of geo.features) {
    const code = feature.properties.iso;
    if (!wanted.has(code)) continue;
    const polys = feature.geometry.type === "Polygon" ? [feature.geometry.coordinates] : feature.geometry.coordinates;
    let best = null;
    let area = 0;
    for (const poly of polys) {
      area += sphericalArea(poly[0]);
      const size = Math.abs(ringArea(poly[0]));
      if (!best || size > best.size) best = { size, ring: poly[0] };
    }
    seats[code] = pointOnFeature(best.ring);
    if (!inRing(seats[code], best.ring)) throw new Error(`the seat computed for ${NAME(code)} falls outside its own largest part: a defect in the kit`);
    areaKm2[code] = area;
  }
  const noShape = [...wanted].filter((c) => !seats[c]);
  if (noShape.length) throw new Error(`these codes match no country on the map: ${noShape.join(", ")}. Use ISO 3166 alpha-3 codes of European or neighbouring countries (Kosovo and Northern Cyprus have none); this kit cannot draw anywhere else`);
  const noA2 = flows.filter((f) => !/^[A-Z]{2}$/.test(ISO3_TO_ISO2[f.code] ?? ""));
  if (noA2.length) throw new Error(`${noA2.map((f) => f.code).join(", ")} have no ISO A2 code: leave them out`);
  const origin = seats[ORIGIN];

  // ── THE FAN, and the camera it asks for ───────────────────────────────────────────────────────
  const bandBetween = (from, to) => {
    const a = [from[0], mercYdeg(from[1])];
    const b = [to[0], mercYdeg(to[1])];
    const dx = b[0] - a[0];
    const dy = b[1] - a[1];
    const length = Math.hypot(dx, dy) || 1;
    const control = [(a[0] + b[0]) / 2 + (-dy / length) * length * BULGE, (a[1] + b[1]) / 2 + (dx / length) * length * BULGE];
    const points = [];
    for (let i = 0; i <= CURVE_SAMPLES; i += 1) {
      const t = i / CURVE_SAMPLES;
      const u = 1 - t;
      const x = u * u * a[0] + 2 * u * t * control[0] + t * t * b[0];
      const y = u * u * a[1] + 2 * u * t * control[1] + t * t * b[1];
      points.push([Number(x.toFixed(5)), Number(unmercYdeg(y).toFixed(5))]);
    }
    return points;
  };
  const bandLines = Object.fromEntries(flows.map((f) => [f.code, bandBetween(origin, seats[f.code])]));
  const fanPoints = Object.values(bandLines).flat();
  const STUDY = {
    west: Math.min(...fanPoints.map((p) => p[0])),
    east: Math.max(...fanPoints.map((p) => p[0])),
    south: Math.min(...fanPoints.map((p) => p[1])),
    north: Math.max(...fanPoints.map((p) => p[1])),
  };
  const r2 = (v) => Math.round(v * 100) / 100;
  const WINDOW = [[r2(STUDY.west - AIR_DEG), r2(STUDY.south - AIR_DEG)], [r2(STUDY.east + AIR_DEG), r2(STUDY.north + AIR_DEG)]];
  if (WINDOW[1][1] > 80 || WINDOW[0][1] < 20 || WINDOW[1][0] - WINDOW[0][0] > 120) throw new Error(`the fan spans ${JSON.stringify(STUDY)}: this kit's camera holds a European fan, not one that wide`);

  // ── THE THREE MEASURES, all derived ───────────────────────────────────────────────────────────
  const MEASURES = [
    { key: "count", of: (f) => f.people },
    { key: "perCapita", of: (f) => (f.people / f.inhabitants) * 1000 },
    { key: "perArea", of: (f) => (f.people / areaKm2[f.code]) * 1000 },
  ].map((m) => ({ ...m, ...beat.measures[m.key], label: plain(beat.measures[m.key].label), unit: plain(beat.measures[m.key].unit), announce: plain(beat.measures[m.key].announce) }));
  const fmtValue = (i, v) => plain(MEASURES[i].format(v));
  const READINGS = flows.map((f) => ({ code: f.code, values: MEASURES.map((m) => m.of(f)) }));
  const TOPS = MEASURES.map((_, i) => Math.max(...READINGS.map((r) => r.values[i])));
  const widthOf = (code, i) => flowWidthOf(READINGS.find((r) => r.code === code).values[i], TOPS[i], W_MAX);
  const RANKS = MEASURES.map((_, i) => Object.fromEntries([...READINGS].sort((a, b) => b.values[i] - a.values[i]).map((r, k) => [r.code, k + 1])));
  const LEADERS = MEASURES.map((_, i) => [...READINGS].sort((a, b) => b.values[i] - a.values[i])[0].code);
  if (new Set(LEADERS).size !== MEASURES.length)
    throw new Error(`the three measures crown ${LEADERS.map(NAME).join(", ")}: this page exists so the reader can watch the lead change hands with the denominator, and on this data it does not — this kit is not the right map for it (tell the journalist)`);
  const REMAINDERS = MEASURES.map((_, i) => {
    const under = flows.filter((f) => widthOf(f.code, i) < MIN_W).map((f) => f.code);
    const people = under.reduce((s, c) => s + flows.find((f) => f.code === c).people, 0);
    return { count: under.length, people, share: (people / total) * 100, codes: under };
  });

  // ── the claim, against the drawn data ─────────────────────────────────────────────────────────
  const pub = (f, i = 0) => ({ code: f.code, name: f.name, people: f.people, value: READINGS.find((r) => r.code === f.code).values[i], rank: RANKS[i][f.code] });
  const measureReading = (i) => {
    const ordered = [...flows].sort((a, b) => RANKS[i][a.code] - RANKS[i][b.code]);
    return {
      key: MEASURES[i].key,
      top: TOPS[i],
      podium: ordered.slice(0, 3).map((f) => pub(f, i)),
      countLeader: { ...pub(flows[0], i) },
      remainder: { count: REMAINDERS[i].count, people: REMAINDERS[i].people, share: REMAINDERS[i].share },
      destinations: flows.length,
    };
  };
  const READ = MEASURES.map((_, i) => measureReading(i));
  const claim = {
    total,
    destinations: flows.length,
    ranked: flows.map((f) => pub(f)),
    topShare: (n) => (flows.slice(0, n).reduce((s, f) => s + f.people, 0) / total) * 100,
    leaders: LEADERS.map((c) => ({ code: c, name: NAME(c) })),
    measure: (key) => {
      const i = MEASURE_KEYS.indexOf(key);
      if (i < 0) throw new Error(`check(): no measure ${JSON.stringify(key)} — the measures are ${MEASURE_KEYS.join(", ")}`);
      return READ[i];
    },
  };
  beat.check(claim);
  assertDrawsClaimColumn(flows.map((f) => f.people), HERE);
  const title = plain([beat.title].flat()[0]);
  const shares = [1, 2, 3, 4, 5].map((n) => claim.topShare(n));
  assertHeadlineNumbersDrawn(title, [...flows.map((f) => f.people), total, total / 1e6, ...shares, ...READ.flatMap((r) => r.podium.map((p) => p.value))], "bands");

  // ── the words, each checked against the numbers it must carry ────────────────────────────────
  // A date (2026-06) is the data's own label, not a figure a sentence states.
  const digits = (text) => plain(text).replace(/\b\d{4}-\d{2}(-\d{2})?\b/g, "").replace(/(\d)[\s  ](?=\d{3}(\D|$))/g, "$1");
  const numbersIn = (text) => [...digits(text).matchAll(/\d+(?:[.,]\d+)?/g)].map((m) => m[0]);
  const carries = (token, v) => {
    const n = Number(token.replace(",", "."));
    const d = (token.split(/[.,]/)[1] ?? "").length;
    return Number.isFinite(v) && Math.abs(Number(v.toFixed(d)) - n) < 1e-9;
  };
  const states = (text, v) => numbersIn(text).some((t) => carries(t, v));
  const holdWords = (what, text, allowed, must = []) => {
    for (const [name, v] of must) if (!states(text, v)) throw new Error(`${what} must state ${name} (${Number.isInteger(v) ? v : v.toFixed(2)}, rounded as you print it); it says "${text}"`);
    const bad = numbersIn(text).filter((t) => {
      const n = Number(t.replace(",", "."));
      if (Number.isInteger(n) && n >= 1900 && n <= 2100) return false;
      return !allowed.some((v) => carries(t, v));
    });
    if (bad.length) throw new Error(`${what} prints ${bad.join(", ")}, which the reading it receives does not carry: take every number from it; it says "${text}"`);
    return text;
  };
  const readingNumbers = (r) => [r.top, r.destinations, r.remainder.count, r.remainder.people, r.remainder.share, ...r.podium.flatMap((p) => [p.value, p.people, p.rank]), r.countLeader.value, r.countLeader.rank, r.countLeader.people, 1000];
  const notes = [null, 1, 2].map((i) =>
    i === null ? null : holdWords(`note(r) for ${MEASURE_KEYS[i]}`, plain(beat.note({ ...READ[i], label: MEASURES[i].label, unit: MEASURES[i].unit, format: (v) => fmtValue(i, v) })), readingNumbers(READ[i]), [["r.remainder.count", READ[i].remainder.count]]),
  );
  const measureDeclaration = {
    label: plain(beat.controlLabel),
    defaultKey: "count",
    maxWidth: W_MAX,
    minWidth: MIN_W,
    measures: MEASURES.map((m, i) => ({
      key: m.key,
      label: m.label,
      announce: m.announce,
      note: notes[i],
      keyLabels: [1, 0.5, 0.25].map((s) => `${fmtValue(i, TOPS[i] * s)} ${m.unit}`),
      widthByCode: Object.fromEntries(READINGS.map((r) => [r.code, flowWidthOf(r.values[i], TOPS[i], W_MAX)])),
    })),
  };
  const KEY_RUNGS = flowKeyForMarkup(measureDeclaration).map((variants, rung) => ({ width: [W_MAX, W_MAX / 2, W_MAX / 4][rung], variants }));
  const rankWord = (n) => plain(beat.rank(n));
  const tableRows = flows.map((f) => {
    const values = READINGS.find((r) => r.code === f.code).values;
    const r = { code: f.code, name: f.name, people: f.people, sharePc: (f.people / total) * 100, ranks: MEASURES.map((_, i) => RANKS[i][f.code]), inhabitants: f.inhabitants, areaKm2: areaKm2[f.code], values };
    const detail = plain(beat.detail(r));
    if (!detail.includes(f.name)) throw new Error(`detail() must name the destination it answers for: ${f.name} → "${detail}"`);
    holdWords(`detail() for ${f.name}`, detail, [r.people, r.sharePc, ...r.ranks, r.inhabitants, r.areaKm2, ...values, 1000], [["r.people", r.people]]);
    return { code: f.code, name: f.name, cells: MEASURES.map((_, i) => fmtValue(i, values[i])), ranks: MEASURES.map((_, i) => rankWord(RANKS[i][f.code])), detail };
  });
  const dupes = tableRows.filter((r, i) => tableRows.findIndex((o) => o.detail === r.detail) !== i);
  if (dupes.length) throw new Error(`detail() answers ${dupes[0].name} with the same sentence as another destination`);
  const claimNumbers = [total, total / 1e6, flows.length, ...shares, ...flows.map((f) => f.people), ...READ.flatMap(readingNumbers)];
  const claimNote = holdWords("claimNote(c)", plain(beat.claimNote({ ...claim, remainder: READ[0].remainder })), claimNumbers);

  // ── what Web Mercator costs THIS fan: the arms' drawn length per real kilometre ───────────────
  const drawnChord = (a, b) => Math.hypot(b[0] - a[0], mercYdeg(b[1]) - mercYdeg(a[1]));
  const greatCircle = ([lon1, lat1], [lon2, lat2]) => EARTH_KM * Math.acos(Math.min(1, Math.sin(lat1 * RAD) * Math.sin(lat2 * RAD) + Math.cos(lat1 * RAD) * Math.cos(lat2 * RAD) * Math.cos((lon2 - lon1) * RAD)));
  const stretch = flows.map((f) => ({ code: f.code, ratio: drawnChord(origin, seats[f.code]) / greatCircle(origin, seats[f.code]) })).sort((a, b) => b.ratio - a.ratio);
  const SPREAD = stretch[0].ratio / stretch[stretch.length - 1].ratio;
  if (!(SPREAD > 1.05)) throw new Error(`Web Mercator stretches this fan's arms by at most ${SPREAD.toFixed(3)}×: the kit's Mercator sentence would be false — a defect to report`);
  const merc = { longest: NAME(stretch[0].code), shortest: NAME(stretch[stretch.length - 1].code), spread: SPREAD };
  const mercator = holdWords("mercator(m)", plain(beat.mercator(merc)), [SPREAD], [["m.spread", SPREAD]]);
  const caveat = `${plain([beat.limits].flat()[0])} ${mercator}`;
  const reading = holdWords("reading(r)", plain(beat.reading({ destinations: flows.length })), [flows.length]);
  const altReading = { drawn: flows.length - REMAINDERS[0].count, destinations: flows.length, origin: NAME(ORIGIN), first: pub(flows[0]), second: pub(flows[1]), topTwoShare: shares[1], leaders: claim.leaders };
  const alt = holdWords("alt(a)", plain(beat.alt(altReading)), [altReading.drawn, altReading.destinations, flows[0].people, flows[1].people, shares[1], ...claimNumbers]);
  const tableCaption = holdWords("tableCaption({ destinations })", plain(beat.tableCaption({ destinations: flows.length })), [flows.length]);
  const columns = beat.columns.map(plain);
  const eyebrow = plain(beat.eyebrow);
  const source = plain(beat.source);
  const hint = plain(beat.hint);
  const countedLabel = plain(beat.countedLabel);

  for (const [i, m] of MEASURES.entries())
    console.log(`measure ${m.key.padEnd(10)} leader ${NAME(LEADERS[i]).padEnd(14)} ${fmtValue(i, TOPS[i]).padStart(10)} ${m.unit} · ${flows.length - REMAINDERS[i].count} bands drawn, ${REMAINDERS[i].count} counted (${REMAINDERS[i].share.toFixed(1)} %)`);
  console.log(`what Mercator costs this fan: the arm to ${merc.longest} is drawn ${SPREAD.toFixed(2)}× longer per real km than the arm to ${merc.shortest}`);

  // ── ONE direction, its plate ──────────────────────────────────────────────────────────────────
  const registers = {
    display: title,
    eyebrow,
    body: `${caveat} ${reading} ${source} ${hint}`,
    axis: `${KEY_RUNGS.flatMap((r) => r.variants.map((v) => v.text)).join(" ")} ${countedLabel} ${measureDeclaration.label} ${measureDeclaration.measures.map((m) => `${m.label} ${m.announce}`).join(" ")} ${tableCaption} ${columns.join(" ")} ${tableRows.flatMap((r) => [...r.cells, ...r.ranks]).join(" ")}`,
    annot: `${claimNote} ${measureDeclaration.measures.map((m) => m.note ?? "").join(" ")}`,
    value: tableRows.map((r) => r.cells[0]).join(" "),
  };
  const { label, direction } = pickDirection(HERE, plainRegisters(registers), beat.evidenceLevels ?? 3);
  const tints = plateTints(direction, { landDose: LAND_DOSE });
  const sameWindow = (facts) => JSON.stringify(facts.bounds) === JSON.stringify(WINDOW);
  const plateFacts = ensurePlate({ here: HERE, label, water: tints.water, land: tints.land, frame: PLATE_FRAME, args: ["--countries", join(HERE, "shapes.geojson"), "--bounds", WINDOW.flat().join(",")], current: sameWindow });
  const FRAME = plateFacts.frame;
  const ASKED = { west: plateFacts.bounds[0][0], south: plateFacts.bounds[0][1], east: plateFacts.bounds[1][0], north: plateFacts.bounds[1][1] };
  const cut = flows.filter((f) => bandLines[f.code].some(([lon, lat]) => lon < ASKED.west || lon > ASKED.east || lat < ASKED.south || lat > ASKED.north));
  if (cut.length) throw new Error(`the camera's window cuts ${cut.map((f) => f.name).join(", ")}: a defect in the kit`);

  // Which grounds the fan occupies, on the plate's own pixels, at each band's widest width.
  const toFrame = frameProjector(plateFacts);
  const OCCUPANCY = markOccupancy(
    Object.entries(bandLines).map(([code, line]) => ({ kind: "band", name: code, points: line.map(toFrame), width: Math.max(...MEASURES.map((_, i) => widthOf(code, i))) * (FRAME.width / SIZE) })),
    plateWaterField(join(HERE, "plate", label)),
  );
  console.log(occupancyLine(OCCUPANCY));
  const colourProblems = guardColour(direction, plateGrounds(tints, OCCUPANCY));
  if (colourProblems.length) throw new Error(`the direction cannot carry this beat's colour: ${colourProblems.join("; ")} — the bands cross the sea as well as the land, so the accent must stand off both: change the accent in PALETTE.md (a hue further from the water's blue)`);

  const furniture = deriveFurniture(direction.ground);
  const inks = flowInks({ ground: direction.ground, accent: direction.accent, ink: furniture.ink, water: tints.water, land: tints.land, opacity: RIBBON_OPACITY });
  const countries = countryGround({ ground: direction.ground, land: tints.land, water: tints.water, ink: furniture.ink });
  console.log(`ground: land ${countries.measured.fillOnWater.toFixed(2)}:1 on the sea · the pointed band reads ${contrast(inks.active, countries.fill).toFixed(2)}:1 on the land`);
  const bandFeatures = [...flows]
    .sort((a, b) => Math.max(...MEASURES.map((_, i) => widthOf(b.code, i))) - Math.max(...MEASURES.map((_, i) => widthOf(a.code, i))))
    .map((f) => ({ type: "Feature", properties: { code: f.code }, geometry: { type: "LineString", coordinates: bandLines[f.code] } }));
  const CLOSEST = (() => {
    let best = null;
    for (let i = 0; i < flows.length; i += 1)
      for (let j = i + 1; j < flows.length; j += 1) {
        const degrees = drawnChord(seats[flows[i].code], seats[flows[j].code]);
        if (!best || degrees < best.degrees) best = { a: flows[i].code, b: flows[j].code, degrees };
      }
    return best;
  })();
  const lang = beat.lang ?? storyLanguage(HERE) ?? "en";
  const live = {
    style: plateFacts.style,
    tints,
    countries,
    studyBounds: ASKED,
    frame: FRAME,
    degreesPerPixel: plateFacts.degreesPerPixel,
    bands: { type: "FeatureCollection", features: bandFeatures },
    origin: { lon: origin[0], lat: origin[1], radius: 6, fill: inks.node, edge: inks.nodeEdge },
    ribbon: { colour: inks.ribbon, opacity: RIBBON_OPACITY, active: inks.active },
    measures: measureDeclaration,
    details: Object.fromEntries(tableRows.map((r) => [r.code, r.detail])),
    locale: beat.mapLocale ?? (lang.startsWith("fr") ? { title: "Carte", zoomIn: "Zoomer", zoomOut: "Dézoomer" } : { title: "Map", zoomIn: "Zoom in", zoomOut: "Zoom out" }),
    changeMs: CHANGE_MS,
    closest: CLOSEST,
  };
  const livePlan = liveFlowPlan(live);
  const { maplibreJs, maplibreCss, styleModule } = liveAssets(HERE);
  const liveScript = liveFlowScript(live, { scope: ".chart-figure", styleModule, measureName: MEASURE_ID_PREFIX });

  const interaction = {
    earns: `A still can only SAY that a band's width is a count rather than a count per inhabitant; this page lets the reader change the denominator and watch the lead pass from ${LEADERS.map(NAME).join(" to ")} while the two ends of every band stay where they are, and the set of bands too thin to draw go from ${REMAINDERS.map((r) => r.count).join(" to ")}.`,
    controls: [
      {
        question: `${NAME(LEADERS[0])} is the widest. Wide with what — people, or room?`,
        gesture: "toggle-a-comparison",
        changes: `The ${flows.length} bands cross to the width the chosen measure gives them without either end moving; the key's three rungs rewrite in the measure's unit, the table renumbers its ranks in place, and a sentence says who takes the lead and how many destinations fall under the floor.`,
        parameter: "the denominator a band's width is read in",
        authorPicked: "count",
        readerPicks: [...MEASURE_KEYS],
        heldStill: [".chart-header", ".chart-source"],
      },
      {
        question: "How much is this band exactly, and where does it stand in the three rankings?",
        gesture: "ask-a-mark",
        changes: "The pointed-at band redraws in its own ink at full strength above the bands it crosses, and answers with its destination, its count, its share of the total, its three ranks and the population and area that divide it.",
        parameter: "which band is in question",
        authorPicked: flows[0].name,
        readerPicks: "every mark",
        heldStill: [".chart-header", ".chart-source"],
      },
      {
        question: `And all ${flows.length}, without the map — or without JavaScript?`,
        gesture: "open-the-full-table",
        changes: `The ${flows.length} rows open under the map, by count, each with its three measures; its width sample and its rank follow the chosen measure in pure CSS.`,
        parameter: "the form the readings are read in",
        authorPicked: "the map",
        readerPicks: ["the map", "the table"],
        heldStill: [".chart-header", ".chart-source"],
      },
    ],
  };

  const key = maptilerKey(HERE);
  const pageOf = (plate, box) =>
    renderWeb({
      lang,
      drawing: { share: MAP_DRAWING_SHARE },
      component: DirectedFlowMapWeb,
      props: {
        plate,
        plateWater: tints.water,
        plateLand: tints.land,
        ribbonOpacity: RIBBON_OPACITY,
        rows: tableRows,
        measures: measureDeclaration,
        keyRungs: KEY_RUNGS,
        countedLabel,
        livePlan,
        liveScript,
        liveHint: hint,
        maplibreCss,
        maplibreJs,
        tableCaption,
        columns,
        aspect: box.width / box.height,
        size: box.width,
        title,
        eyebrow,
        caveat,
        source,
        reading,
        claimNote,
        alt,
        interaction,
        direction,
        ground: direction.ground,
        accent: direction.accent,
      },
      outDir: join(HERE, "renders"),
      name: `${label}.html`,
    });

  // The photograph is of the map's own BOX, and the box is what the chrome leaves: the stamp carries
  // the words too, so a sentence that loses a line re-photographs (the worked example paid for this).
  const stamp = { livePlan, registers };
  const { outPath, keyedPath } = await renderLiveMapPage({ here: HERE, label, key, stamp, pageOf });
  const written = readFileSync(outPath, "utf8");
  assertOneMeasure(written, measureDeclaration, MEASURE_ID_PREFIX, flows.map((f) => f.code), { where: `renders/${label}.html` });
  assertMeasuresReachTheLayers(written, live, READINGS, plateFacts.style, { where: `renders/${label}.html` });
  console.log(`rendered renders/${label}.html (keyed copy for review: shots/${label}.local.html)`);

  await verifyLiveMap({
    here: HERE,
    label,
    keyedPath,
    waivers: [
      { test: /^\s*FAIL phone 375x812: no vertical scroll inside the visual\b/, why: "inherited from the worked example: on a phone the map keeps its height and the page scrolls (full-width ruling)" },
      { test: /^\s*FAIL phone 375x812: the source line is on screen\b/, why: "inherited from the worked example: the same phone scroll puts the source line below the fold" },
    ],
    probe: {
      layers: ["mw-bands"],
      keyProp: "code",
      expected: live.details,
      subject: flows[0].code,
      // A band under the floor is counted, not drawn: it cannot be found on screen, by design.
      mayMiss: REMAINDERS[0].codes,
    },
  });
});
