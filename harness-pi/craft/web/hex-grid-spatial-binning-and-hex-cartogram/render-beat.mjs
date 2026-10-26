// The generic half of a hex-grid (hex cartogram) WEB beat, taken from
// proof/web-hex-grid-europe-protection/render-directions-web.mjs with everything about ITS subject
// removed. The page is the worked example's: one equal hexagon per unit on a designed layout (odd
// rows offset half a cell, so every neighbour is an EDGE neighbour), built in Web Mercator metres so
// the cells stay congruent, drawn as MapLibre layers over MapTiler's live tiles (no plate: the
// geometry IS the data), over a frozen fallback photographed from that live map, and ONE control:
// the reader holds THE GRAIN — over how many cells a cell sums its numerator and its denominator
// before it divides: the unit alone, the unit with its edge neighbours, or its named block. The
// cells' fills and printed rates, the rule's sentence and the table follow the grain (the table in
// pure CSS). Hovering a cell answers its three rates at once and its two ranks.
//
// This file computes every pooled rate, every class, the seams, the label fit, the ground the cells
// sit on and what Web Mercator costs THIS grid; ./beat.mjs — the one file the model writes — names
// the columns, the blocks and the WORDS. Copied into the beat by the harness; never edited by the
// model.
//
// Usage:  bun <beat>/render-beat.mjs
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import puppeteer from "puppeteer-core";
import { deriveFurniture, measureText } from "#shared/chart-beat/render-still.mjs";
import { resolveChrome } from "#shared/design-base/chrome.mjs";
import { guardColour } from "#shared/design-base/compose.mjs";
import { plateGrounds, plateTints } from "#shared/map-beat/tints.mjs";
import { frameProjector, markOccupancy, occupancyLine } from "#shared/map-beat/occupancy.mjs";
import { applyStoryboard, assertDrawsClaimColumn, assertHeadlineNumbersDrawn, assertNumbers } from "./guards.mjs";
import { liveAssets, mapWeb, maptilerKey, renderLiveMapPage, verifyLiveMap } from "./map-web.mjs";
import { waterFieldFromPng } from "./plate-water.mjs";
import { chartWeb, pickDirection, plain, plainRegisters, refusing, storyLanguage } from "./web.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));

/** The worked example's designed layout of Europe (32 cells). A story about other units passes its own. */
const EUROPE_GRID = [
  ".   ISL .   .   NOR SWE FIN .",
  ".   .   IRL DNK .   EST LVA .",
  ".   .   NLD DEU POL LTU UKR .",
  ".   BEL LUX CHE CZE SVK HUN ROU",
  "PRT ESP FRA LIE AUT SVN HRV BGR",
  ".   .   MLT ITA .   GRC CYP .",
];
const RADIUS = 44;
const PAD = 3;
const MAP_STYLE = "dataviz-light";
/** The stage the map gets at the 1512x860 review window (measured on the validated pattern). */
const STAGE = { width: 1464, height: 520 };
const LAND_DOSE = 0.07;
/** The grid sits over Europe: a SEATING, not a geolocation (the page says so). */
const ANCHOR = { lon: 14.5, lat: 53.5 };
const M_PER_UNIT = 8700;
const EARTH_R = 6378137;
const GRAIN_KEYS = ["country", "neighbourhood", "region"];

await refusing(HERE, async () => {
  const { default: beat } = await import("./beat.mjs");
  applyStoryboard(beat, HERE);
  const { renderWeb, MAP_DRAWING_SHARE } = await import(chartWeb(HERE, "scripts", "render-web.mjs"));
  const { assertOnePool, assertPoolDeclaration, poolFiguresForMarkup, poolPartitionOf, poolSlugOf, pooledValues } = await import(mapWeb(HERE, "assets", "pool.ts"));
  const { NOTO_SENTINEL_BYTES, assertPoolReachesTheLayers, liveHexPlan, liveHexScript } = await import(mapWeb(HERE, "assets", "live-hex.ts"));
  const { DirectedHexGridWeb, POOL_MS, hexRamp } = await import("./DirectedHexGridWeb.tsx");

  // ── the fields ────────────────────────────────────────────────────────────────────────────────
  const REQUIRED = ["eyebrow", "key", "value", "per", "perBase", "names", "regions", "breaks", "format", "count", "classLabel", "poolLabel", "unit", "grains", "neighbourhoodNote", "regionNote", "detail", "tableCaption", "columns", "claimNote", "mercator", "reading", "hint", "title", "limits", "source", "alt", "check"];
  const missingFields = REQUIRED.filter((k) => beat[k] === undefined);
  if (missingFields.length) throw new Error(`beat.mjs is missing ${missingFields.join(", ")} (see CONTRACT.md)`);
  for (const fn of ["format", "count", "classLabel", "neighbourhoodNote", "regionNote", "detail", "tableCaption", "claimNote", "mercator", "reading", "alt", "check"])
    if (typeof beat[fn] !== "function") throw new Error(`beat.mjs: ${fn} must be a function (see CONTRACT.md)`);
  for (const g of GRAIN_KEYS) {
    const w = beat.grains?.[g];
    if (!w || typeof w.label !== "string" || typeof w.announce !== "string") throw new Error(`beat.mjs: grains.${g} must be { label, announce } (see CONTRACT.md)`);
    if (!w.announce.includes(w.label)) throw new Error(`grains.${g}.announce must CONTAIN its label "${w.label}"`);
  }
  if (!Array.isArray(beat.columns) || beat.columns.length !== 4) throw new Error("columns must be the table's four headings: unit, rate at the chosen grain, count, class (see CONTRACT.md)");
  const UNMEASURED = beat.unmeasured ?? [];
  const DROP = new Set(beat.drop ?? []);
  if (UNMEASURED.length && (typeof beat.unmeasuredLabel !== "string" || typeof beat.unmeasuredWord !== "string" || typeof beat.unmeasuredDetail !== "function"))
    throw new Error("with unmeasured cells give unmeasuredLabel (the key's swatch), unmeasuredWord (printed in the cell) and unmeasuredDetail(c) (its tooltip)");

  // ── THE READINGS ──────────────────────────────────────────────────────────────────────────────
  const table = JSON.parse(readFileSync(join(HERE, "data.json"), "utf8"));
  const at = (name) => {
    const i = table.columns.findIndex((c) => c.name === name);
    if (i < 0) throw new Error(`data.json has no column ${JSON.stringify(name)}; its columns are ${table.columns.map((c) => c.name).join(", ")}`);
    return i;
  };
  const [CI, VI, PI] = [at(beat.key), at(beat.value), at(beat.per)];
  const filters = Object.entries(beat.where ?? {}).map(([c, v]) => [at(c), String(v)]);
  const num = (raw) => Number(String(raw).replace(/\s/g, "").replace(",", "."));
  const numerator = {};
  const denominator = {};
  for (const r of table.rows) {
    if (!filters.every(([i, v]) => String(r[i]) === v)) continue;
    const code = String(r[CI]).trim().toUpperCase();
    if (DROP.has(code)) continue;
    if (code in numerator) throw new Error(`two rows for ${code}: keep ONE row per unit (filter with where)`);
    numerator[code] = num(r[VI]);
    denominator[code] = num(r[PI]);
    if (!Number.isFinite(numerator[code]) || numerator[code] < 0) throw new Error(`${code}: ${beat.value} = ${JSON.stringify(r[VI])} is not a usable count`);
    if (!(denominator[code] > 0)) throw new Error(`${code}: ${beat.per} = ${JSON.stringify(r[PI])} — a pooled rate divides by the SUM of the denominators, so every unit needs one`);
  }
  const hosts = Object.keys(numerator);
  if (hosts.length < 6) throw new Error(`${hosts.length} units: a hex cartogram with a grain to pool needs at least six`);
  const SCALE = Number(beat.perBase);
  if (!(SCALE > 0)) throw new Error("perBase must be the rate's base (1000, 100000…)");
  const rate = (c) => (numerator[c] / denominator[c]) * SCALE;
  assertNumbers(hosts.map((c) => [c, rate(c)]));

  // ── the layout, checked both ways ─────────────────────────────────────────────────────────────
  const GRID = beat.grid ?? EUROPE_GRID;
  if (!Array.isArray(GRID) || !GRID.every((r) => typeof r === "string")) throw new Error("grid must be an array of strings, one per row, codes separated by spaces and . for an empty place");
  const seats = [];
  GRID.forEach((row, r) =>
    row.trim().split(/\s+/).forEach((code, c) => {
      if (code !== "." && !DROP.has(code)) seats.push({ code, row: r, col: c });
    }),
  );
  const laidOut = new Set(seats.map((s) => s.code));
  const noCell = hosts.filter((c) => !laidOut.has(c));
  if (noCell.length) throw new Error(`data.json reports ${noCell.join(", ")}, which the layout has no cell for: filter those rows out with where (say so), or pass a grid that places them`);
  const noReading = seats.filter((s) => !hosts.includes(s.code) && !UNMEASURED.includes(s.code)).map((s) => s.code);
  if (noReading.length) throw new Error(`the layout places ${noReading.join(", ")}, which data.json does not report: list each in unmeasured (kept, neutral) or in drop (removed)`);
  const nameless = seats.filter((s) => typeof beat.names?.[s.code] !== "string").map((s) => s.code);
  if (nameless.length) throw new Error(`names must give every cell its name in the story's language; missing: ${nameless.join(", ")}`);
  const NAME = (c) => plain(beat.names[c]);

  // ── the blocks, checked both ways ─────────────────────────────────────────────────────────────
  const regionOf = {};
  for (const [name, members] of Object.entries(beat.regions)) {
    if (!Array.isArray(members) || !members.length) throw new Error(`regions.${name} must list codes`);
    for (const code of members) {
      if (!hosts.includes(code)) throw new Error(`the block ${JSON.stringify(name)} names ${code}, which has no reading`);
      if (regionOf[code]) throw new Error(`${code} sits in two blocks: ${regionOf[code]} and ${name}`);
      regionOf[code] = name;
    }
  }
  const unblocked = hosts.filter((c) => !regionOf[c]);
  if (unblocked.length) throw new Error(`${unblocked.join(", ")} sit in no block of regions: every measured unit belongs to exactly one`);

  // ── the grid, in its own units, then in Web Mercator metres ──────────────────────────────────
  const DX = RADIUS * Math.sqrt(3);
  const DY = RADIUS * 1.5;
  const HALF_W = DX / 2;
  const rawX = (s) => s.col * DX + (s.row % 2 ? HALF_W : 0);
  const rawY = (s) => s.row * DY;
  const minX = Math.min(...seats.map((s) => rawX(s) - HALF_W));
  const maxX = Math.max(...seats.map((s) => rawX(s) + HALF_W));
  const minY = Math.min(...seats.map((s) => rawY(s) - RADIUS));
  const maxY = Math.max(...seats.map((s) => rawY(s) + RADIUS));
  const gridW = Number((maxX - minX + PAD * 2).toFixed(2));
  const gridH = Number((maxY - minY + PAD * 2).toFixed(2));
  const centreOf = (s) => ({ cx: Number((rawX(s) - minX + PAD).toFixed(2)), cy: Number((rawY(s) - minY + PAD).toFixed(2)) });
  const mercX = (lon) => (EARTH_R * lon * Math.PI) / 180;
  const mercY = (lat) => EARTH_R * Math.log(Math.tan(Math.PI / 4 + (lat * Math.PI) / 360));
  const lonOf = (x) => (x / EARTH_R) * (180 / Math.PI);
  const latOf = (y) => (2 * Math.atan(Math.exp(y / EARTH_R)) - Math.PI / 2) * (180 / Math.PI);
  const X0 = mercX(ANCHOR.lon) - (gridW / 2) * M_PER_UNIT;
  const Y0 = mercY(ANCHOR.lat) + (gridH / 2) * M_PER_UNIT;
  const geo = (cx, cy) => [Number(lonOf(X0 + cx * M_PER_UNIT).toFixed(6)), Number(latOf(Y0 - cy * M_PER_UNIT).toFixed(6))];
  const STUDY = { west: geo(0, 0)[0], east: geo(gridW, 0)[0], north: geo(0, 0)[1], south: geo(0, gridH)[1] };
  const vertexOf = (cx, cy, i) => {
    const a = (Math.PI / 180) * (60 * i - 30);
    return [cx + RADIUS * Math.cos(a), cy + RADIUS * Math.sin(a)];
  };
  const ringOf = (s) => {
    const { cx, cy } = centreOf(s);
    const ring = Array.from({ length: 6 }, (_, i) => geo(...vertexOf(cx, cy, i)));
    return [...ring, ring[0]];
  };

  // ── what Mercator costs THIS grid: the ground under the top cell against the bottom one ──────
  const centreLat = (s) => geo(centreOf(s).cx, centreOf(s).cy)[1];
  const northSeat = seats.reduce((a, s) => (centreLat(s) > centreLat(a) ? s : a));
  const southSeat = seats.reduce((a, s) => (centreLat(s) < centreLat(a) ? s : a));
  const inflate = (lat) => 1 / Math.cos((lat * Math.PI) / 180);
  const MERCATOR_COST = (inflate(centreLat(northSeat)) / inflate(centreLat(southSeat))) ** 2;

  // ── the grain ─────────────────────────────────────────────────────────────────────────────────
  const EDGE_DIRS = { even: [[0, 1], [1, 0], [1, -1], [0, -1], [-1, -1], [-1, 0]], odd: [[0, 1], [1, 1], [1, 0], [0, -1], [-1, 0], [-1, 1]] };
  const seatAt = new Map(seats.map((s) => [`${s.row},${s.col}`, s]));
  const neighbourAcross = (s, edge) => {
    const [dr, dc] = EDGE_DIRS[s.row % 2 ? "odd" : "even"][edge];
    return seatAt.get(`${s.row + dr},${s.col + dc}`) ?? null;
  };
  const seatOf = new Map(seats.map((s) => [s.code, s]));
  const neighbourhoodOf = (code) => {
    const out = [code];
    for (let edge = 0; edge < 6; edge += 1) {
      const n = neighbourAcross(seatOf.get(code), edge);
      if (n && hosts.includes(n.code)) out.push(n.code);
    }
    return out;
  };
  const BREAKS = beat.breaks;
  if (!Array.isArray(BREAKS) || BREAKS.length < 2 || BREAKS.some((b, i) => typeof b !== "number" || (i && b <= BREAKS[i - 1])))
    throw new Error(`breaks must be 2 or more rising numbers in the rate's units (4 breaks make 5 classes); got ${JSON.stringify(BREAKS)}`);
  const klassOf = (v) => {
    let i = 0;
    while (i < BREAKS.length && v >= BREAKS[i]) i += 1;
    return i;
  };
  const fmt = (v) => plain(beat.format(v));
  const digits = (text) => plain(text).replace(/\b\d{4}-\d{2}(-\d{2})?\b/g, "").replace(/(\d)[\s  ](?=\d{3}(\D|$))/g, "$1");
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
  const classes = Array.from({ length: BREAKS.length + 1 }, (_, index) => {
    const lower = index === 0 ? null : BREAKS[index - 1];
    const upper = index === BREAKS.length ? null : BREAKS[index];
    const text = plain(beat.classLabel({ index, lower, upper }));
    for (const [w, v] of [["lower", lower], ["upper", upper]]) if (v !== null && !states(text, v)) throw new Error(`classLabel for class ${index + 1} must print its ${w} limit ${v}; it says "${text}"`);
    return { label: text };
  });

  const words = (g) => ({ key: g, label: plain(beat.grains[g].label), announce: plain(beat.grains[g].announce) });
  const pool = {
    label: plain(beat.poolLabel),
    unit: plain(beat.unit),
    scale: SCALE,
    breaks: BREAKS,
    cells: hosts.map((code) => ({ key: code, numerator: numerator[code], denominator: denominator[code] })),
    grains: [
      { ...words("country"), note: null, windows: hosts.map((code) => ({ cell: code, with: [code] })) },
      { ...words("neighbourhood"), note: null, windows: hosts.map((code) => ({ cell: code, with: neighbourhoodOf(code) })) },
      { ...words("region"), note: null, windows: hosts.map((code) => ({ cell: code, with: beat.regions[regionOf[code]] })) },
    ],
  };
  const classesUnder = (grain) => new Map([...pooledValues(pool, grain)].map(([k, v]) => [k, klassOf(v)]));
  const baseClasses = classesUnder(pool.grains[0]);
  const movedUnder = (grain) => [...baseClasses.keys()].filter((k) => classesUnder(grain).get(k) !== baseClasses.get(k)).length;
  const valueUnder = (grain, code) => pooledValues(pool, grain).get(code);
  const hoodMoved = movedUnder(pool.grains[1]);
  const regionMoved = movedUnder(pool.grains[2]);
  const swing = hosts.map((code) => ({ code, from: rate(code), to: valueUnder(pool.grains[1], code) })).sort((a, b) => Math.abs(b.to - b.from) - Math.abs(a.to - a.from))[0];
  const swingNeighbour = neighbourhoodOf(swing.code).filter((c) => c !== swing.code).sort((a, b) => denominator[b] - denominator[a])[0];
  const blocks = Object.keys(beat.regions).map((name) => {
    const members = beat.regions[name];
    const pooled = valueUnder(pool.grains[2], members[0]);
    const mean = members.reduce((a, c) => a + rate(c), 0) / members.length;
    return { name, pooled, mean, members: members.length, gap: Math.abs(mean - pooled) };
  });
  const widest = [...blocks].sort((a, b) => b.gap - a.gap)[0];
  const wholeRate = (hosts.reduce((a, c) => a + numerator[c], 0) / hosts.reduce((a, c) => a + denominator[c], 0)) * SCALE;
  const meanOfRates = hosts.reduce((a, c) => a + rate(c), 0) / hosts.length;
  const byRate = [...hosts].sort((a, b) => rate(b) - rate(a));
  const byCount = [...hosts].sort((a, b) => numerator[b] - numerator[a]);
  const hoodReading = { moved: hoodMoved, cells: hosts.length, swing: { name: NAME(swing.code), from: swing.from, to: swing.to, denominator: denominator[swing.code], neighbour: { name: NAME(swingNeighbour), denominator: denominator[swingNeighbour] } } };
  const regionReading = { moved: regionMoved, cells: hosts.length, blocks: blocks.length, blockNames: blocks.map((b) => b.name), widest: { name: widest.name, pooled: widest.pooled, mean: widest.mean, members: widest.members } };
  pool.grains[1].note = holdWords("neighbourhoodNote(r)", plain(beat.neighbourhoodNote(hoodReading)), [hoodMoved, hosts.length, swing.from, swing.to, denominator[swing.code], denominator[swingNeighbour], SCALE], [["r.moved", hoodMoved]]);
  pool.grains[2].note = holdWords("regionNote(r)", plain(beat.regionNote(regionReading)), [regionMoved, hosts.length, blocks.length, widest.pooled, widest.mean, widest.members, SCALE], [["r.moved", regionMoved]]);
  assertPoolDeclaration(pool, hosts, { where: "beat.mjs", changeFloor: 4 });

  // ── the claim, against the drawn data ─────────────────────────────────────────────────────────
  const pub = (c) => ({ code: c, name: NAME(c), rate: rate(c), numerator: numerator[c], denominator: denominator[c], rateRank: byRate.indexOf(c) + 1, countRank: byCount.indexOf(c) + 1 });
  const claim = {
    byRate: byRate.map(pub),
    byCount: byCount.map(pub),
    wholeRate,
    meanOfRates,
    grain: (key) => {
      const i = GRAIN_KEYS.indexOf(key);
      if (i < 0) throw new Error(`check(): no grain ${JSON.stringify(key)} — the grains are ${GRAIN_KEYS.join(", ")}`);
      const g = pool.grains[i];
      return { moved: i === 0 ? 0 : movedUnder(g), classesUsed: new Set(classesUnder(g).values()).size, value: (code) => valueUnder(g, code) };
    },
  };
  beat.check(claim);
  assertDrawsClaimColumn(hosts.map(rate), HERE);
  const title = plain([beat.title].flat()[0]);
  assertHeadlineNumbersDrawn(title, [...hosts.map(rate), ...hosts.map((c) => numerator[c]), wholeRate, meanOfRates], "cells");

  // ── the cells and the words ───────────────────────────────────────────────────────────────────
  const unmeasuredWord = UNMEASURED.length ? plain(beat.unmeasuredWord) : "";
  const cells = seats.map((s) => {
    const isOrigin = !hosts.includes(s.code);
    if (isOrigin)
      return { code: s.code, name: NAME(s.code), isOrigin, ring: ringOf(s), figures: pool.grains.map((g, i) => ({ slug: poolSlugOf(g.key), text: unmeasuredWord, klass: 0, isDefault: i === 0 })), people: "—", detail: plain(beat.unmeasuredDetail({ code: s.code, name: NAME(s.code) })) };
    const r = { ...pub(s.code), alone: rate(s.code), neighbourhood: valueUnder(pool.grains[1], s.code), region: valueUnder(pool.grains[2], s.code), regionName: regionOf[s.code] };
    const detail = plain(beat.detail(r));
    if (!detail.includes(r.name)) throw new Error(`detail() must name the unit it answers for: ${r.name} → "${detail}"`);
    holdWords(`detail() for ${r.name}`, detail, [r.alone, r.neighbourhood, r.region, r.numerator, r.denominator, r.rateRank, r.countRank, SCALE], [["r.alone", r.alone]]);
    return { code: s.code, name: r.name, isOrigin, ring: ringOf(s), figures: poolFiguresForMarkup(pool, s.code, fmt), people: plain(beat.count(numerator[s.code])), detail };
  });
  const dupes = cells.filter((c, i) => cells.findIndex((o) => o.detail === c.detail) !== i);
  if (dupes.length) throw new Error(`detail() answers ${dupes[0].name} with the same sentence as another cell`);
  const merc = { north: { name: NAME(northSeat.code), lat: centreLat(northSeat) }, south: { name: NAME(southSeat.code), lat: centreLat(southSeat) }, factor: MERCATOR_COST };
  const mercator = holdWords("mercator(m)", plain(beat.mercator(merc)), [merc.north.lat, merc.south.lat, MERCATOR_COST], [["m.factor", MERCATOR_COST]]);
  const caveat = `${plain([beat.limits].flat()[0])} ${mercator}`;
  const claimNumbers = [...hosts.flatMap((c) => [rate(c), numerator[c], denominator[c], byRate.indexOf(c) + 1, byCount.indexOf(c) + 1]), wholeRate, meanOfRates, hosts.length, SCALE, 1];
  const claimNote = holdWords("claimNote(c)", plain(beat.claimNote(claim)), claimNumbers);
  const readingR = { cells: seats.length, measured: hosts.length, moved: hoodMoved, wholeRate, meanOfRates };
  const reading = holdWords("reading(r)", plain(beat.reading(readingR)), [seats.length, hosts.length, hoodMoved, wholeRate, meanOfRates, SCALE]);
  const altR = { cells: seats.length, measured: hosts.length, first: pub(byRate[0]), largest: pub(byCount[0]), moved: hoodMoved, swing: hoodReading.swing, unmeasured: UNMEASURED.map(NAME) };
  const alt = holdWords("alt(a)", plain(beat.alt(altR)), [...claimNumbers, seats.length, hoodMoved, swing.from, swing.to]);
  const tableCaption = holdWords("tableCaption({ cells })", plain(beat.tableCaption({ cells: seats.length })), [seats.length]);
  const columns = beat.columns.map(plain);
  const eyebrow = plain(beat.eyebrow);
  const source = plain(beat.source);
  const hint = plain(beat.hint);
  const originLabel = UNMEASURED.length ? plain(beat.unmeasuredLabel) : null;
  // No magnitude a sentence prints may round to nothing ("for 0 million inhabitants").
  for (const said of [title, caveat, claimNote, reading, alt, hint, ...pool.grains.map((g) => g.note ?? ""), ...cells.map((c) => c.detail)]) {
    const hit = /(^|[^\d.,])0\s+(millions?|milliers?|milliards?|thousand|million|billion)\b/i.exec(said);
    if (hit) throw new Error(`a sentence reads ${JSON.stringify(hit[0].trim())}: a quantity printed in a scale it is smaller than reads as none — print it in a smaller unit: "${said.slice(0, 120)}"`);
  }

  console.log(`${hosts.length} measured units · by rate ${NAME(byRate[0])} ${rate(byRate[0]).toFixed(1)} · by count ${NAME(byCount[0])} · neighbourhood moves ${hoodMoved}/${hosts.length}, region ${regionMoved}/${hosts.length} · pooled over all ${wholeRate.toFixed(2)} against a mean of rates ${meanOfRates.toFixed(2)}`);
  console.log(`what Mercator costs this grid: the ground under ${merc.north.name} is drawn ${MERCATOR_COST.toFixed(2)}× larger than under ${merc.south.name}`);

  // ── the seams: a wall between two neighbours that are not pooled together, never a box ───────
  const seamFeatures = [];
  for (const grain of pool.grains) {
    const partition = poolPartitionOf(grain);
    if (!partition) continue;
    const slug = poolSlugOf(grain.key);
    for (const s of seats) {
      const mine = partition.get(s.code) ?? null;
      if (mine === null || grain.windows.find((w) => w.cell === s.code).with.length < 2) continue;
      const { cx, cy } = centreOf(s);
      for (let edge = 0; edge < 6; edge += 1) {
        const n = neighbourAcross(s, edge);
        if (!n || (partition.get(n.code) ?? null) === mine) continue;
        seamFeatures.push({ grain: slug, line: [geo(...vertexOf(cx, cy, edge)), geo(...vertexOf(cx, cy, edge + 1))] });
      }
    }
  }

  // ── ONE direction ─────────────────────────────────────────────────────────────────────────────
  const registers = {
    display: title,
    eyebrow,
    body: `${caveat} ${reading} ${source}`,
    axis: `${classes.map((c) => c.label).join(" ")} ${originLabel ?? ""} ${unmeasuredWord} ${seats.map((s) => s.code).join(" ")} ${tableCaption} ${columns.join(" ")} ${seats.map((s) => NAME(s.code)).join(" ")} Zoomer Dézoomer Carte Zoom in Zoom out Map`,
    annot: `${claimNote} ${hint} ${pool.label} ${pool.grains.map((g) => `${g.label} ${g.announce} ${g.note ?? ""}`).join(" ")}`,
    value: cells.flatMap((c) => c.figures.map((f) => f.text)).join(" "),
  };
  const { label, direction } = pickDirection(HERE, plainRegisters(registers), beat.evidenceLevels ?? 3);
  const tints = plateTints(direction, { landDose: LAND_DOSE });
  const key = maptilerKey(HERE);
  const { maplibreJs, maplibreCss, styleModule } = liveAssets(HERE);

  // THE GROUND UNDER THE CARTOGRAM, PHOTOGRAPHED — this type bakes no plate: the same style, the same
  // window the page fits, the same stage, water and land painted in two marker colours.
  const MASK = { water: "#0000FF", land: "#FF0000" };
  const groundDir = mkdtempSync(join(tmpdir(), "mw-ground-"));
  let groundMask;
  let maskCorners;
  try {
    const out = join(groundDir, "ground.png");
    const pagePath = join(groundDir, "ground.html");
    writeFileSync(pagePath, `<!doctype html><meta charset="utf-8"><style>${maplibreCss}html,body{margin:0}#map{width:${STAGE.width}px;height:${STAGE.height}px}</style><div id="map"></div><script>${maplibreJs}<\/script>`);
    const browser = await puppeteer.launch({ headless: "new", executablePath: resolveChrome(), args: ["--no-sandbox", "--use-gl=swiftshader", "--enable-unsafe-swiftshader"] });
    try {
      const page = await browser.newPage();
      await page.setViewport({ width: STAGE.width, height: STAGE.height, deviceScaleFactor: 2 });
      await page.goto(`file://${pagePath}`, { waitUntil: "networkidle0", timeout: 120000 });
      maskCorners = await page.evaluate(
        async (styleUrl, bounds, mask) => {
          const map = new maplibregl.Map({ container: "map", style: styleUrl, bounds, fitBoundsOptions: { padding: 0, animate: false }, interactive: false, attributionControl: false, fadeDuration: 0 });
          await new Promise((r) => map.once("style.load", r));
          for (const layer of map.getStyle().layers) {
            if (layer.type === "background") map.setPaintProperty(layer.id, "background-color", mask.land);
            else if (layer.type === "fill" && /water|ocean|sea|river|lake/i.test(layer.id)) map.setPaintProperty(layer.id, "fill-color", mask.water);
            else if (layer.type === "fill" && /land|background|earth/i.test(layer.id)) map.setPaintProperty(layer.id, "fill-color", mask.land);
            else if (layer.type !== "background") map.setLayoutProperty(layer.id, "visibility", "none");
          }
          await new Promise((r) => (map.loaded() && map.areTilesLoaded() ? r() : map.once("idle", r)));
          const b = map.getBounds();
          return { west: b.getWest(), east: b.getEast(), south: b.getSouth(), north: b.getNorth() };
        },
        `https://api.maptiler.com/maps/${MAP_STYLE}/style.json?key=${key}`,
        [[STUDY.west, STUDY.south], [STUDY.east, STUDY.north]],
        MASK,
      );
      await page.screenshot({ path: out, clip: { x: 0, y: 0, width: STAGE.width, height: STAGE.height } });
    } finally {
      await browser.close();
    }
    groundMask = waterFieldFromPng({ path: out, water: MASK.water, land: MASK.land, frame: STAGE });
  } finally {
    rmSync(groundDir, { recursive: true, force: true });
  }
  const toFrame = frameProjector({ frame: STAGE, frameCorners: maskCorners });
  const OCCUPANCY = markOccupancy(cells.map((c) => ({ kind: "area", name: c.code, rings: [c.ring.map(toFrame)] })), groundMask);
  console.log(occupancyLine(OCCUPANCY));
  const colourProblems = guardColour(direction, plateGrounds(tints, OCCUPANCY));
  if (colourProblems.length) throw new Error(`the direction cannot carry this beat's colour: ${colourProblems.join("; ")} — change the accent in PALETTE.md`);

  const furniture = deriveFurniture(direction.ground);
  const { ramp, activeRamp, inkRamp, origin, seamInk } = hexRamp({ ground: direction.ground, accent: direction.accent, ink: furniture.ink, plateLand: tints.land, plateWater: tints.water, tones: classes.length });

  // ── a cell too narrow to hold its own code is a refusal, not a smaller type size ──────────────
  const axisReg = direction.registers.axis;
  const valueReg = direction.registers.value;
  const CODE_SIZE = { fontSize: 13, fontWeight: axisReg.weight ?? 500, fontFamily: axisReg.family };
  const VALUE_SIZE = { fontSize: 14, fontWeight: valueReg.weight ?? 700, fontFamily: valueReg.family };
  const pxPerUnit = Math.min(STAGE.width / gridW, STAGE.height / gridH);
  const cellWidthPx = DX * pxPerUnit;
  const cellHeightPx = 2 * RADIUS * pxPerUnit;
  const codeOwes = Math.max(...cells.map((c) => measureText(c.code, CODE_SIZE))) + 6;
  const valueOwes = Math.max(...cells.flatMap((c) => c.figures.map((f) => measureText(f.text, VALUE_SIZE)))) + 6;
  if (cellWidthPx < codeOwes || cellWidthPx < valueOwes)
    throw new Error(`at the published framing a hexagon is ${cellWidthPx.toFixed(1)} px wide and must hold a code owing ${codeOwes.toFixed(1)} px and a number owing ${valueOwes.toFixed(1)} px: shorten format() (fewer decimals) or unmeasuredWord, or pass a grid with fewer columns`);
  const CODE_OFFSET_EM = -0.55;
  const VALUE_OFFSET_EM = 0.8;
  const stackedHeight = VALUE_OFFSET_EM * VALUE_SIZE.fontSize + VALUE_SIZE.fontSize - CODE_OFFSET_EM * CODE_SIZE.fontSize;
  if (stackedHeight > cellHeightPx) throw new Error(`a cell is ${cellHeightPx.toFixed(1)} px tall and its two labels stack to ${stackedHeight.toFixed(1)} px: pass a grid with fewer rows`);

  // The fontstack a cell label is drawn in, PROBED: MapTiler answers 200 with Noto Sans for any name.
  const variantFor = (weight) => (weight >= 600 ? "Bold" : weight >= 500 ? "Medium" : "Regular");
  const servedStack = async (family, weight, what) => {
    const stack = `${family} ${variantFor(weight)}`;
    const url = new URL(`https://api.maptiler.com/fonts/${encodeURIComponent(stack)}/0-255.pbf`);
    url.searchParams.set("key", key);
    const response = await fetch(url);
    const bytes = response.ok ? (await response.arrayBuffer()).byteLength : 0;
    if (response.ok && bytes !== NOTO_SENTINEL_BYTES) return stack;
    throw new Error(`MapTiler does not serve the fontstack ${JSON.stringify(stack)} for ${what} (it answered with its Noto Sans fallback): the direction's face cannot label the cells — a defect to report, not a beat.mjs fix`);
  };

  const lang = beat.lang ?? storyLanguage(HERE) ?? "en";
  const live = {
    style: MAP_STYLE,
    tints,
    studyBounds: STUDY,
    cells: cells.map((c) => ({ code: c.code, ring: c.ring, isOrigin: c.isOrigin, figures: Object.fromEntries(c.figures.map((f) => [f.slug, { text: f.text, klass: f.klass }])) })),
    seams: seamFeatures,
    slugs: pool.grains.map((g) => poolSlugOf(g.key)),
    defaultSlug: poolSlugOf(pool.grains[0].key),
    ramp,
    activeRamp,
    inkRamp,
    origin: { ...origin, text: unmeasuredWord || "—" },
    cellEdge: direction.ground,
    seam: { ink: seamInk, width: 2.5 },
    labels: {
      code: { font: await servedStack(axisReg.family, CODE_SIZE.fontWeight, "a cell's code"), size: CODE_SIZE.fontSize, offsetEm: CODE_OFFSET_EM },
      value: { font: await servedStack(valueReg.family, VALUE_SIZE.fontWeight, "a cell's number"), size: VALUE_SIZE.fontSize, offsetEm: VALUE_OFFSET_EM },
    },
    details: Object.fromEntries(cells.map((c) => [c.code, c.detail])),
    locale: beat.mapLocale ?? (lang.startsWith("fr") ? { title: "Carte", zoomIn: "Zoomer", zoomOut: "Dézoomer" } : { title: "Map", zoomIn: "Zoom in", zoomOut: "Zoom out" }),
    changeMs: POOL_MS,
  };
  const livePlan = liveHexPlan(live);
  const liveScript = liveHexScript(live, { scope: ".chart-figure", styleModule, poolName: "mw-stack" });

  const interaction = {
    earns: `A still must choose the scale at which it pools its cells and ask to be trusted; here the reader holds the grain, over a grid where no cell moves and under a key that does not change, and ${hoodMoved} of ${hosts.length} cells change class.`,
    controls: [
      {
        question: "What exactly is this rate computed over?",
        gesture: "toggle-a-comparison",
        changes: "Every cell keeps its place and its code and changes fill and figure: the rate is recomputed over the unit alone, the unit with its edge neighbours, or its named block — and at the block grain a heavy line falls wherever two neighbours are not in the same block.",
        parameter: "the scale at which a cell pools its value",
        authorPicked: "country",
        readerPicks: [...GRAIN_KEYS],
        heldStill: [".chart-header", ".chart-source"],
      },
      {
        question: `And the ${seats.length} readings in full?`,
        gesture: "open-the-full-table",
        changes: `The ${seats.length} rows open under the map, each with its rate at the chosen grain, its count and its class swatch, both following the grain in pure CSS.`,
        parameter: "the form the readings are read in",
        authorPicked: "the map",
        readerPicks: ["the map", "the table"],
        heldStill: [".chart-header", ".chart-source"],
      },
      {
        question: "Which unit is this, and what does it make at the three grains?",
        gesture: "ask-a-mark",
        changes: "The cell darkens from its own fill and answers with its three rates at once, its count, its denominator and its two ranks.",
        parameter: "which cell is in question",
        authorPicked: NAME(byRate[0]),
        readerPicks: "every mark",
        heldStill: [".chart-header", ".chart-source"],
      },
    ],
  };

  const pageOf = (plate, box) =>
    renderWeb({
      lang,
      drawing: { share: MAP_DRAWING_SHARE },
      component: DirectedHexGridWeb,
      props: { cells, pool, classes, originLabel, plate, plateLand: tints.land, plateWater: tints.water, aspect: box.width / box.height, size: box.width, livePlan, liveScript, liveHint: hint, maplibreCss, maplibreJs, tableCaption, columns, title, eyebrow, caveat, source, reading, claimNote, alt, interaction, direction, ground: direction.ground, accent: direction.accent },
      outDir: join(HERE, "renders"),
      name: `${label}.html`,
    });

  const { outPath, keyedPath } = await renderLiveMapPage({ here: HERE, label, key, stamp: { livePlan, registers }, pageOf });
  const written = readFileSync(outPath, "utf8");
  assertOnePool(written, pool, { where: `renders/${label}.html`, property: "background-color" });
  assertPoolReachesTheLayers(written, live, pool, ramp, MAP_STYLE, { where: `renders/${label}.html` });
  console.log(`rendered renders/${label}.html (keyed copy for review: shots/${label}.local.html)`);

  await verifyLiveMap({
    here: HERE,
    label,
    keyedPath,
    waivers: [
      { test: /^\s*FAIL phone 375x812: no vertical scroll inside the visual\b/, why: "inherited from the worked example: on a phone the map keeps its height and the page scrolls (full-width ruling)" },
      { test: /^\s*FAIL phone 375x812: the source line is on screen\b/, why: "inherited from the worked example: the same phone scroll puts the source line below the fold" },
    ],
    probe: { layers: ["mw-cells"], keyProp: "code", expected: live.details, subject: byRate[0] },
  });
});
