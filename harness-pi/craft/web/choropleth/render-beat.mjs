// The generic half of a choropleth WEB beat, taken from
// proof/web-choropleth-europe-lowcarbon/render-directions-web.mjs with everything about ITS subject
// removed. The page is the worked example's: a LIVE MapTiler map (every country a MapLibre fill over
// MapTiler's own Countries tiles, joined on ISO A2) over a frozen fallback photographed from that
// live map, and ONE control — the reader picks the CLASSING RULE (the threshold the beat states,
// quantiles, equal intervals, Fisher-Jenks natural breaks), because what a choropleth hides is that
// the partition was a choice. The legend's bounds and counts, the note under the control, the map's
// fills and the value table's swatches all follow the rule; with no script the table still does.
// Hovering a country answers its own reading. This file computes every rule, every count, every
// reading and the cost of Web Mercator for THIS subject; ./beat.mjs — the one file the model
// writes — gives the rows, the stated breaks and the WORDS. Copied into the beat by the harness;
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
import { plateGrounds, plateTints } from "#shared/map-beat/tints.mjs";
import { applyStoryboard, assertDrawsClaimColumn, assertHeadlineNumbersDrawn, assertLegibleLabels, assertNumbers } from "./guards.mjs";
import { ensurePlate, liveAssets, mapWeb, maptilerKey, renderLiveMapPage, verifyLiveMap } from "./map-web.mjs";
import { chartWeb, pickDirection, plain, plainRegisters, refusing, storyLanguage } from "./web.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));

/** The plate's own pixel box (the worked example's 1600x1216). */
const PLATE_FRAME = [1600, 1216];
/** The land's step off the ground toward the ink, measured on the worked example. */
const LAND_DOSE = 0.07;
/** The four rules, in the order the control offers them; `stated` is the one the plate opens on. */
const RULE_KEYS = ["stated", "quantiles", "equal", "jenks"];
/** Countries MapTiler's Countries tiles do not carry at every zoom the page opens at — drawn from the
 *  kit's own shapes instead (Malta measured missing at 375x812 on the worked example; the
 *  micro-states are smaller still). Only when the story gives them a value. */
const OWN_SHAPES = ["MLT", "AND", "MCO", "SMR", "LIE", "VAT"];

await refusing(HERE, async () => {
  const { default: beat } = await import("./beat.mjs");
  applyStoryboard(beat, HERE);
  const { renderWeb, MAP_DRAWING_SHARE } = await import(chartWeb(HERE, "scripts", "render-web.mjs"));
  const { assertOneClassing, buildClassingIndex, classOf, classingCounts } = await import(mapWeb(HERE, "assets", "classing.ts"));
  const { assertClassingReachesTheLayers, liveChoroplethPlan, liveChoroplethScript } = await import(mapWeb(HERE, "assets", "live-choropleth.ts"));
  const { CHANGE_MS, DirectedChoroplethWeb, choroplethRamp } = await import("./DirectedChoroplethWeb.tsx");

  // ── the fields ────────────────────────────────────────────────────────────────────────────────
  const REQUIRED = ["eyebrow", "rows", "breaks", "format", "bound", "ruleLabel", "rules", "detail", "missingLabel", "callout", "hint", "reading", "tableCaption", "columns", "mercator", "title", "limits", "source", "alt", "check"];
  const missingFields = REQUIRED.filter((key) => beat[key] === undefined);
  if (missingFields.length) throw new Error(`beat.mjs is missing ${missingFields.join(", ")}: give each as a field of the default export (export default { …, ${missingFields[0]}: … }), not as a separate export (see CONTRACT.md)`);
  for (const fn of ["format", "bound", "detail", "mercator", "check"])
    if (typeof beat[fn] !== "function") throw new Error(`beat.mjs: ${fn} must be a function (see CONTRACT.md)`);
  for (const key of RULE_KEYS) {
    const r = beat.rules[key];
    if (!r || typeof r.label !== "string" || typeof r.announce !== "string")
      throw new Error(`beat.mjs: rules.${key} must be { label, announce${key === "stated" ? "" : ", note(r)"} } (see CONTRACT.md)`);
    if (key !== "stated" && typeof r.note !== "function") throw new Error(`beat.mjs: rules.${key}.note must be a function (r) => sentence`);
  }
  if (!Array.isArray(beat.columns) || beat.columns.length !== 4)
    throw new Error("columns must be the table's four headings: country, value, rank, class (see CONTRACT.md)");

  // ── THE JOIN, loud: every row an ISO alpha-3 code the shapes carry and MapTiler keys on ────────
  const geo = JSON.parse(readFileSync(join(HERE, "shapes.geojson"), "utf8"));
  const featureOf = new Map(geo.features.map((f) => [f.properties.iso, f]));
  if (!Array.isArray(beat.rows) || !beat.rows.length) throw new Error("rows must be one { iso, name, value } per country of the study set (see CONTRACT.md)");
  const seen = new Set();
  const badJoin = [];
  for (const row of beat.rows) {
    if (!/^[A-Z]{3}$/.test(String(row.iso)) || !featureOf.has(row.iso)) badJoin.push(`${JSON.stringify(row.iso)} (${row.name})`);
    else if (!/^[A-Z]{2}$/.test(ISO3_TO_ISO2[row.iso] ?? "")) badJoin.push(`${row.iso} (${row.name}) has no ISO A2 code, so the live map would paint it nothing`);
    if (seen.has(row.iso)) throw new Error(`rows hold ${row.iso} twice: keep ONE row per country (filter to one year or one series first)`);
    seen.add(row.iso);
    if (!String(row.name ?? "").trim()) throw new Error(`rows: ${row.iso} has no name`);
  }
  if (badJoin.length)
    throw new Error(`these rows match no country on the map: ${badJoin.join(", ")}. iso must be an ISO 3166 alpha-3 code of a European or neighbouring country (resolve names with countries.mjs); this kit cannot draw anywhere else`);
  assertNumbers(beat.rows.filter((r) => r.value !== null).map((r) => [r.iso, r.value]));
  const ISO2 = Object.fromEntries(beat.rows.map((r) => [r.iso, ISO3_TO_ISO2[r.iso]]));
  const NAME = Object.fromEntries(beat.rows.map((r) => [r.iso, plain(r.name)]));
  const ranked = beat.rows.filter((r) => r.value !== null).sort((a, b) => b.value - a.value);
  const unreported = beat.rows.filter((r) => r.value === null);
  if (unreported.length && typeof beat.missingDetail !== "function")
    throw new Error(`${unreported.map((r) => r.iso).join(", ")} carry no value: give missingDetail(row), the sentence a pointer on a country with no data answers`);

  // ── THE FOUR RULES, ALL DERIVED ─────────────────────────────────────────────────────────────────
  const STATED = beat.breaks;
  if (!Array.isArray(STATED) || STATED.length < 1 || STATED.length > 3 || STATED.some((b, i) => typeof b !== "number" || (i && b <= STATED[i - 1])))
    throw new Error(`breaks must be 1 to 3 rising numbers (2 to 4 classes) — the takeaway's own threshold among them; got ${JSON.stringify(STATED)}. One hue over the basemap's land carries four classes at most`);
  const CLASSES = STATED.length + 1;
  const values = ranked.map((r) => r.value).sort((a, b) => a - b);
  const N = values.length;
  if (N < CLASSES * 2) throw new Error(`${N} countries carry a value: a ${CLASSES}-class map needs at least ${CLASSES * 2} (use fewer breaks)`);
  assertLegibleLabels(values, beat.format);

  const quantileBreaks = Array.from({ length: CLASSES - 1 }, (_, i) => {
    const pos = Math.floor(((i + 1) * N) / CLASSES);
    return (values[pos - 1] + values[pos]) / 2;
  });
  // Each stated class must hold a reading. A 12B beat set the lowest value itself (18.4) as the first limit, so the
  // class below it was empty; the classing refusal said so but not which field to change.
  const statedCounts = Array.from({ length: CLASSES }, (_, k) =>
    values.filter((v) => (k === 0 || v >= STATED[k - 1]) && (k === CLASSES - 1 || v < STATED[k])).length);
  const empty = statedCounts.findIndex((c) => c === 0);
  if (empty >= 0)
    throw new Error(`breaks ${JSON.stringify(STATED)} leave class ${empty + 1} of ${CLASSES} empty: a value equal to a limit goes to the class above it, and the readings run from ${values[0]} to ${values[N - 1]}. Give breaks strictly above the lowest reading and at or below the highest, each class holding a country (quantile limits for this data: ${quantileBreaks.map((b) => +b.toFixed(1)).join(", ")}), or use fewer breaks`);
  const RANGE_MIN = values[0];
  const STEP = (values[N - 1] - RANGE_MIN) / CLASSES;
  const equalBreaks = Array.from({ length: CLASSES - 1 }, (_, i) => RANGE_MIN + (i + 1) * STEP);
  function jenksBreaks(sorted, k) {
    const n = sorted.length;
    const at = Array.from({ length: n + 1 }, () => new Array(k + 1).fill(0));
    const cost = Array.from({ length: n + 1 }, () => new Array(k + 1).fill(Infinity));
    for (let j = 1; j <= k; j += 1) {
      at[1][j] = 1;
      cost[1][j] = 0;
    }
    for (let l = 2; l <= n; l += 1) {
      let sum = 0;
      let sumSq = 0;
      let count = 0;
      let variance = 0;
      for (let m = 1; m <= l; m += 1) {
        const start = l - m + 1;
        const value = sorted[start - 1];
        sumSq += value * value;
        sum += value;
        count += 1;
        variance = sumSq - (sum * sum) / count;
        if (start - 1 !== 0)
          for (let j = 2; j <= k; j += 1)
            if (cost[l][j] >= variance + cost[start - 1][j - 1]) {
              at[l][j] = start;
              cost[l][j] = variance + cost[start - 1][j - 1];
            }
      }
      at[l][1] = 1;
      cost[l][1] = variance;
    }
    const breaks = [];
    let end = n;
    for (let j = k; j >= 2; j -= 1) {
      breaks.unshift(sorted[at[end][j] - 1]);
      end = at[end][j] - 1;
    }
    return breaks;
  }
  const jenksCuts = jenksBreaks(values, CLASSES);
  // Natural breaks are DEFINED as the minimum within-class variance: losing to another rule is a
  // transcription error, asserted rather than trusted (as the worked example does).
  const withinSS = (breaks) => {
    const groups = Array.from({ length: CLASSES }, () => []);
    for (const v of values) groups[classOf(v, breaks)].push(v);
    return groups.reduce((t, g) => (g.length ? t + g.reduce((s, v) => s + (v - g.reduce((a, b) => a + b, 0) / g.length) ** 2, 0) : t), 0);
  };
  for (const breaks of [STATED, quantileBreaks, equalBreaks])
    if (withinSS(jenksCuts) > withinSS(breaks) + 1e-9) throw new Error("Fisher-Jenks lost to another rule: a defect in the kit, not in beat.mjs");

  const BREAKS = { stated: STATED, quantiles: quantileBreaks, equal: equalBreaks, jenks: jenksCuts };
  const countsFor = (breaks) => {
    const counts = new Array(CLASSES).fill(0);
    for (const r of ranked) counts[classOf(r.value, breaks)] += 1;
    return counts;
  };
  const statedClass = new Map(ranked.map((r) => [r.iso, classOf(r.value, STATED)]));
  const pub = (r) => ({ iso: r.iso, name: NAME[r.iso], value: r.value });
  const topOf = (breaks) => ranked.filter((r) => classOf(r.value, breaks) === CLASSES - 1);
  const ruleReading = (key) => {
    const breaks = BREAKS[key];
    const top = topOf(breaks);
    return {
      key,
      classes: CLASSES,
      total: N,
      breaks,
      counts: countsFor(breaks),
      opensAt: breaks[CLASSES - 2],
      top: top.map(pub),
      statedTop: topOf(STATED).map(pub),
      newcomers: top.filter((r) => statedClass.get(r.iso) !== CLASSES - 1).map(pub),
      moved: ranked.filter((r) => classOf(r.value, breaks) !== statedClass.get(r.iso)).length,
      step: key === "equal" ? STEP : null,
    };
  };
  const READ = Object.fromEntries(RULE_KEYS.map((k) => [k, ruleReading(k)]));

  // ── the claim, against the drawn data ─────────────────────────────────────────────────────────
  beat.check({
    value: (iso) => beat.rows.find((r) => r.iso === iso)?.value ?? null,
    ranked: ranked.map(pub),
    rule: (key) => {
      if (!READ[key]) throw new Error(`check(): no rule ${JSON.stringify(key)} — the rules are ${RULE_KEYS.join(", ")}`);
      return READ[key];
    },
  });
  assertDrawsClaimColumn(ranked.map((r) => r.value), HERE);
  const titles = [beat.title].flat();
  const title = plain(titles[0]);
  // Every break and every class population is printed in the legend under its rule, so a title that
  // counts countries ("7 … — or 13") states figures the plate carries.
  assertHeadlineNumbersDrawn(title, [...values, ...RULE_KEYS.flatMap((k) => [...READ[k].breaks, ...READ[k].counts])], "classes");

  // ── the words, each one checked against the number it carries ─────────────────────────────────
  const fmt = (v) => plain(beat.format(v));
  const boundsFor = (key) =>
    READ[key].counts.map((count, index) => {
      const lower = index === 0 ? null : READ[key].breaks[index - 1];
      const upper = index === CLASSES - 1 ? null : READ[key].breaks[index];
      const text = plain(beat.bound({ index, lower, upper, count }));
      for (const [what, v] of [["lower", lower], ["upper", upper]])
        if (v !== null && !text.includes(fmt(v))) throw new Error(`bound() for class ${index + 1} of rule ${key} must print its ${what} limit as format() prints it ("${fmt(v)}"); it says "${text}"`);
      if (!new RegExp(`(^|\\D)${count}(\\D|$)`).test(text)) throw new Error(`bound() for class ${index + 1} of rule ${key} must say how many countries it holds (${count}); it says "${text}"`);
      return text;
    });
  // Every number a note prints must be one its reading carries (at the precision printed), so a
  // note cannot state a count the rule does not produce.
  const carried = (r) => {
    const ints = [r.classes, r.total, r.total / r.classes, r.top.length, r.statedTop.length, r.newcomers.length, r.moved, ...r.counts];
    return [...ints, ...ints.map((n) => (n / r.total) * 100), ...r.breaks, ...STATED, r.step ?? NaN, ...r.top.map((c) => c.value), ...r.newcomers.map((c) => c.value)];
  };
  const foreignNumbers = (text, allowed) =>
    [...text.matchAll(/\d+(?:[.,]\d+)?/g)]
      .map((m) => m[0])
      .filter((t) => {
        const n = Number(t.replace(",", "."));
        const d = (t.split(/[.,]/)[1] ?? "").length;
        if (Number.isInteger(n) && n >= 1900 && n <= 2100) return false;
        return !allowed.some((v) => Number.isFinite(v) && Math.abs(Number(v.toFixed(d)) - n) < 1e-9);
      });
  const notes = {};
  for (const key of RULE_KEYS.slice(1)) {
    const text = plain(beat.rules[key].note(READ[key]));
    for (const [what, n] of [["the darkest class's count (r.top.length)", READ[key].top.length], ["how many countries change class (r.moved)", READ[key].moved]])
      if (!new RegExp(`(^|\\D)${n}(\\D|$)`).test(text)) throw new Error(`rules.${key}.note must state ${what} = ${n}; it says "${text}"`);
    const foreign = foreignNumbers(text, carried(READ[key]));
    if (foreign.length) throw new Error(`rules.${key}.note prints ${foreign.join(", ")}, which its reading r does not carry (r.top.length = ${READ[key].top.length}, r.moved = ${READ[key].moved}, r.counts = ${READ[key].counts.join("/")}): take every number from r; it says "${text}"`);
    notes[key] = text;
  }
  const classing = {
    label: plain(beat.ruleLabel),
    classes: CLASSES,
    defaultKey: "stated",
    rules: RULE_KEYS.map((key) => ({
      key,
      label: plain(beat.rules[key].label),
      announce: plain(beat.rules[key].announce),
      breaks: BREAKS[key],
      note: key === "stated" ? null : notes[key],
      bounds: boundsFor(key),
    })),
  };
  // Keyed on ISO A2 — the key BOTH halves speak: the table's data-mark and MapTiler's iso_a2.
  const classingReadings = ranked.map((r) => ({ key: ISO2[r.iso], value: r.value }));
  const COUNTS = classingCounts(classing, classingReadings);
  const CLASSING_INDEX = buildClassingIndex(classing, classingReadings);

  const classesSeen = (value) => [...new Set(RULE_KEYS.map((k) => classOf(value, BREAKS[k])))].sort().map((c) => c + 1);
  const readings = [
    ...ranked.map((r, i) => {
      const seenIn = classesSeen(r.value);
      return {
        code: r.iso,
        iso2: ISO2[r.iso],
        name: NAME[r.iso],
        classed: true,
        sharePc: fmt(r.value),
        rank: `${i + 1}`,
        detail: plain(beat.detail({ ...r, name: NAME[r.iso], rank: i + 1, of: N, classesSeen: seenIn, sameUnderAll: seenIn.length === 1, rules: RULE_KEYS.length, classes: CLASSES })),
      };
    }),
    ...unreported.map((r) => ({ code: r.iso, iso2: ISO2[r.iso], name: NAME[r.iso], classed: false, sharePc: "—", rank: "—", detail: plain(beat.missingDetail({ ...r, name: NAME[r.iso] })) })),
  ];
  const dupes = readings.filter((r, i) => readings.findIndex((o) => o.detail === r.detail) !== i);
  if (dupes.length) throw new Error(`detail() answers ${dupes[0].name} with the same sentence as another country — start it with the country's name`);
  const nameless = readings.filter((r) => !r.detail.includes(r.name));
  if (nameless.length) throw new Error(`detail() must name the country it answers for: ${nameless[0].name} → "${nameless[0].detail}"`);

  // ── THE STUDY SET'S OWN BOX, and the countries the Europe camera cannot hold whole ───────────
  const largestPart = (f) => {
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
  const studySet = new Map(beat.rows.map((r) => [r.iso, largestPart(featureOf.get(r.iso))]));

  // ── ONE direction, its plate ────────────────────────────────────────────────────────────────
  const caveatHead = plain([beat.limits].flat()[0]);
  const source = plain(beat.source);
  const hint = plain(beat.hint);
  const reading = plain([beat.reading].flat()[0]);
  const callout = plain([beat.callout].flat()[0]);
  const tableCaption = plain(beat.tableCaption);
  const columns = beat.columns.map(plain);
  const missingLabel = plain(beat.missingLabel);
  const eyebrow = plain(beat.eyebrow);
  // The direction is fitted to the words; the Mercator sentence is not known before the camera, so
  // the head of the caveat stands in for it here (same register, same face).
  const registersOf = (caveat) => ({
    display: title,
    eyebrow,
    body: `${caveat} ${reading} ${source} ${hint}`,
    axis: `${classing.rules.flatMap((r) => r.bounds).join(" ")} ${missingLabel} ${classing.label} ${classing.rules.map((r) => `${r.label} ${r.announce}`).join(" ")} ${tableCaption} ${columns.join(" ")}`,
    annot: `${callout} ${classing.rules.map((r) => r.note ?? "").join(" ")}`,
    value: ranked.map((r) => fmt(r.value)).join(" "),
  });
  const { label, direction: picked } = pickDirection(HERE, plainRegisters(registersOf(caveatHead)), beat.evidenceLevels ?? CLASSES);
  const tints = plateTints(picked, { landDose: LAND_DOSE });
  // A choropleth's marks ARE the countries: they sit on the basemap's land, never on its water.
  const colourProblems = guardColour(picked, plateGrounds(tints, { land: true, water: false }));
  if (colourProblems.length) throw new Error(`the direction cannot carry this beat's colour: ${colourProblems.join("; ")} — change the accent in PALETTE.md`);
  // The component's ramp refuses two neighbouring classes a reader cannot tell apart (1.2:1). How many
  // classes this palette carries over this land is measured here, so the refusal says what to change.
  let tellable = 0;
  for (let tones = CLASSES; tones >= 2 && !tellable; tones -= 1) {
    try {
      choroplethRamp({ ground: picked.ground, accent: picked.accent, ink: deriveFurniture(picked.ground).ink, plateLand: tints.land, tones });
      tellable = tones;
    } catch {}
  }
  if (!tellable) throw new Error(`the accent ${picked.accent} cannot shade even two classes a reader can tell from the basemap's land ${tints.land}: change the accent in PALETTE.md`);
  if (tellable < CLASSES)
    throw new Error(`on this story's palette (accent ${picked.accent} over the land ${tints.land}) a reader can tell only ${tellable} classes apart, and breaks asks for ${CLASSES}: give breaks ${tellable - 1} number${tellable - 1 > 1 ? "s" : ""} (keep the takeaway's own threshold) and fix the words that count classes`);

  const heldWhole = (b, bounds) => b.west >= bounds[0][0] && b.east <= bounds[1][0] && b.south >= bounds[0][1] && b.north <= bounds[1][1];
  const plateFacts = ensurePlate({
    here: HERE,
    label,
    water: tints.water,
    land: tints.land,
    frame: PLATE_FRAME,
    args: ["--countries", join(HERE, "shapes.geojson")],
  });
  const FRAME = plateFacts.frame;
  const CORNERS = plateFacts.frameCorners;
  const B = plateFacts.bounds;
  const setAside = beat.rows.filter((r) => !heldWhole(studySet.get(r.iso), B)).map((r) => r.iso);
  const offFrame = setAside.filter((iso) => {
    const b = studySet.get(iso);
    return b.east < CORNERS.west || b.west > CORNERS.east || b.north < CORNERS.south || b.south > CORNERS.north;
  });
  if (offFrame.length) throw new Error(`${offFrame.map((iso) => NAME[iso]).join(", ")} lie outside the Europe camera entirely: leave them out of rows`);
  if (setAside.length) console.log(`drawn only in part by the Europe camera (set aside from the Mercator measure): ${setAside.map((iso) => NAME[iso]).join(", ")}`);

  // ── WHAT WEB MERCATOR COSTS THIS SUBJECT, measured at the plate's own camera ─────────────────
  const RAD = Math.PI / 180;
  const mercY = (lat) => Math.log(Math.tan(Math.PI / 4 + (lat * RAD) / 2));
  const toFramePx = ([lon, lat]) => [
    ((lon - CORNERS.west) / (CORNERS.east - CORNERS.west)) * FRAME.width,
    ((mercY(lat) - mercY(CORNERS.north)) / (mercY(CORNERS.south) - mercY(CORNERS.north))) * FRAME.height,
  ];
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
  for (const r of beat.rows) {
    if (setAside.includes(r.iso)) continue;
    const f = featureOf.get(r.iso);
    const polys = f.geometry.type === "Polygon" ? [f.geometry.coordinates] : f.geometry.coordinates;
    let page = 0;
    let real = 0;
    for (const poly of polys) {
      if (!poly[0].some(inFrame)) continue;
      page += shoelace(poly[0].map(toFramePx));
      real += sphericalArea(poly[0]);
    }
    if (page > 0) areas.set(r.iso, { page, real });
  }
  const PAGE_TOTAL = [...areas.values()].reduce((s, a) => s + a.page, 0);
  const REAL_TOTAL = [...areas.values()].reduce((s, a) => s + a.real, 0);
  const weightOf = (iso) => areas.get(iso).page / PAGE_TOTAL / (areas.get(iso).real / REAL_TOTAL);
  const inflated = beat.inflated ?? [...areas.keys()].sort((a, b) => weightOf(b) - weightOf(a)).slice(0, 3);
  const notMeasured = inflated.filter((iso) => !areas.has(iso));
  if (notMeasured.length) throw new Error(`inflated names ${notMeasured.join(", ")}, which the map does not draw whole: name countries from rows (or leave inflated out)`);
  const pageShare = (inflated.reduce((s, c) => s + areas.get(c).page, 0) / PAGE_TOTAL) * 100;
  const trueShare = (inflated.reduce((s, c) => s + areas.get(c).real, 0) / REAL_TOTAL) * 100;
  if (!(pageShare > trueShare)) throw new Error(`${inflated.join(", ")} cover ${pageShare.toFixed(1)} % of the drawn land for ${trueShare.toFixed(1)} % of the real land: Mercator does not inflate them — name the northernmost countries in inflated, or leave it out`);
  const merc = { names: inflated.map((iso) => NAME[iso]), pageShare, trueShare, setAside: setAside.map((iso) => NAME[iso]) };
  const mercator = plain(beat.mercator(merc));
  for (const [what, v] of [["pageShare", pageShare], ["trueShare", trueShare]])
    if (!new RegExp(`(^|\\D)${Math.round(v)}(\\D|$)`).test(mercator)) throw new Error(`mercator(m) must state m.${what} rounded (${Math.round(v)}); it says "${mercator}"`);
  console.log(
    `what Mercator costs: ${merc.names.join(" + ")} ${pageShare.toFixed(1)} % of the drawn land for ${trueShare.toFixed(1)} % of the real land · per km² vs the median: ` +
      [...areas.keys()].sort((a, b) => weightOf(b) - weightOf(a)).slice(0, 4).map((c) => `${NAME[c]} ×${weightOf(c).toFixed(2)}`).join(" · "),
  );
  const caveat = `${caveatHead} ${mercator}`;
  for (const [key, rule] of classing.rules.entries())
    console.log(`rule ${rule.key.padEnd(9)} breaks ${rule.breaks.map((b) => b.toFixed(1)).join(" / ").padEnd(20)} counts ${COUNTS[key].join("/")} · ${READ[rule.key].moved} change class vs the stated rule`);

  // ── the live plan ───────────────────────────────────────────────────────────────────────────
  const base = picked;
  const furniture = deriveFurniture(base.ground);
  const { ramp, activeRamp } = choroplethRamp({ ground: base.ground, accent: base.accent, ink: furniture.ink, plateLand: tints.land, tones: CLASSES });
  const smallCodes = OWN_SHAPES.filter((iso) => ranked.some((r) => r.iso === iso));
  const SMALL_SHAPES = {
    type: "FeatureCollection",
    features: smallCodes.map((iso) => ({ type: "Feature", properties: { iso_a2: ISO2[iso] }, geometry: featureOf.get(iso).geometry })),
  };
  const smallest = [...studySet].map(([iso, b]) => ({ name: NAME[iso], spanDeg: b.east - b.west })).sort((a, b) => a.spanDeg - b.spanDeg)[0];
  const lang = beat.lang ?? storyLanguage(HERE) ?? "en";
  const live = {
    style: plateFacts.style,
    tints,
    studyBounds: { west: B[0][0], south: B[0][1], east: B[1][0], north: B[1][1] },
    frame: FRAME,
    degreesPerPixel: plateFacts.degreesPerPixel,
    studied: ranked.map((r) => ISO2[r.iso]),
    missing: unreported.map((r) => ISO2[r.iso]),
    smallShapes: SMALL_SHAPES,
    rules: classing.rules.map((rule, i) => ({
      key: rule.key,
      fillByCode: Object.fromEntries(ranked.map((r) => [ISO2[r.iso], ramp[CLASSING_INDEX.get(ISO2[r.iso])[i]]])),
      activeByCode: Object.fromEntries(ranked.map((r) => [ISO2[r.iso], activeRamp[CLASSING_INDEX.get(ISO2[r.iso])[i]]])),
    })),
    defaultKey: classing.defaultKey,
    border: { studied: mix(base.ground, furniture.ink, 0.35), other: mix(tints.land, furniture.ink, 0.18), width: 0.8 },
    details: Object.fromEntries(readings.map((r) => [r.iso2, r.detail])),
    locale: beat.mapLocale ?? (lang.startsWith("fr") ? { title: "Carte", zoomIn: "Zoomer", zoomOut: "Dézoomer" } : { title: "Map", zoomIn: "Zoom in", zoomOut: "Zoom out" }),
    changeMs: CHANGE_MS,
    smallest,
  };
  const livePlan = liveChoroplethPlan(live);
  const { maplibreJs, maplibreCss, styleModule } = liveAssets(HERE);
  const liveScript = liveChoroplethScript(live, { scope: ".chart-figure", styleModule, classingName: "chart-stack" });

  // Metadata for the format's interaction plan (English is fine; it is not printed).
  const subjectRow = ranked[0];
  const interaction = {
    earns:
      `A still can say that a choropleth's classes are a choice; only this page lets the reader cut the same ${N} readings by four standard rules and watch the darkest class go from ${READ.stated.top.length} to ${Math.max(...RULE_KEYS.map((k) => READ[k].top.length))} countries.`,
    controls: [
      {
        question: `${READ.stated.top.length} countries in the darkest class — under which rule, and who changes colour if the cut moves?`,
        gesture: "toggle-a-comparison",
        changes: `The ${N} countries re-shade to the class the chosen rule gives them without moving; the legend's bounds and counts rewrite in place, and a sentence says how many enter the darkest class and how many of the ${N} changed class.`,
        parameter: "the rule that cuts the readings into classes",
        authorPicked: "stated",
        readerPicks: [...RULE_KEYS],
        heldStill: [".chart-header", ".chart-source"],
      },
      {
        question: `And all ${readings.length} readings, without the map — or without JavaScript?`,
        gesture: "open-the-full-table",
        changes: `The ${readings.length} rows open under the map in rank order, each with a swatch of its class that follows the chosen rule in pure CSS.`,
        parameter: "the form the readings are read in",
        authorPicked: "the map",
        readerPicks: ["the map", "the table"],
        heldStill: [".chart-header", ".chart-source"],
      },
      {
        question: "How much is this country exactly, and does it change class with the rule?",
        gesture: "ask-a-mark",
        changes: "The pointed-at country darkens from its own fill and answers with its exact reading, its rank and how many classes it occupies across the rules.",
        parameter: "which country is in question",
        authorPicked: NAME[subjectRow.iso],
        readerPicks: "every mark",
        heldStill: [".chart-header", ".chart-source"],
      },
    ],
  };

  const key = maptilerKey(HERE);
  const direction = picked;
  const pageOf = (plate, box) =>
    renderWeb({
      lang,
      drawing: { share: MAP_DRAWING_SHARE },
      component: DirectedChoroplethWeb,
      props: {
        plate,
        plateLand: tints.land,
        readings,
        classingReadings,
        classing,
        missingLabel,
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
        claimNote: callout,
        alt: plain(beat.alt),
        interaction,
        direction,
        ground: direction.ground,
        accent: direction.accent,
      },
      outDir: join(HERE, "renders"),
      name: `${label}.html`,
    });

  const { outPath, keyedPath } = await renderLiveMapPage({ here: HERE, label, key, stamp: livePlan, pageOf });
  const written = readFileSync(outPath, "utf8");
  assertOneClassing(written, classing, CLASSING_INDEX, { where: `renders/${label}.html` });
  assertClassingReachesTheLayers(written, live, CLASSING_INDEX, ramp, plateFacts.style, { where: `renders/${label}.html` });
  console.log(`rendered renders/${label}.html (keyed copy for review: shots/${label}.local.html)`);

  await verifyLiveMap({
    here: HERE,
    label,
    keyedPath,
    waivers: [
      // Inherited from the worked example: on a phone the map keeps its height and the page runs
      // past the fold (the full-width ruling chose scrolling over a shrunken map). Desktop first.
      { test: /^\s*FAIL phone 375x812: no vertical scroll inside the visual\b/, why: "inherited from the worked example: on a phone the map keeps its height and the page scrolls (full-width ruling)" },
      { test: /^\s*FAIL phone 375x812: the source line is on screen\b/, why: "inherited from the worked example: the same phone scroll puts the source line below the fold" },
    ],
    probe: {
      layers: ["mw-classes", "mw-classes-small", "mw-missing-hit"],
      keyProp: "iso_a2",
      expected: Object.fromEntries(readings.map((r) => [r.iso2, r.detail])),
      subject: ISO2[subjectRow.iso],
      // Each country's own largest part, averaged: where a mark too small for the grid is looked for.
      anchors: Object.fromEntries(
        beat.rows.map((r) => {
          const f = featureOf.get(r.iso);
          const polys = f.geometry.type === "Polygon" ? [f.geometry.coordinates] : f.geometry.coordinates;
          const ring = polys.map((p) => p[0]).sort((a, b) => b.length - a.length)[0];
          return [ISO2[r.iso], [ring.reduce((s, p) => s + p[0], 0) / ring.length, ring.reduce((s, p) => s + p[1], 0) / ring.length]];
        }),
      ),
    },
  });
});
