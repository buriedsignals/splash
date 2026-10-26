// The generic half of a choropleth SCROLLY beat, taken from
// proof/scrolly-choropleth-europe-lowcarbon/render-directions-scrolly.mjs with everything about ITS
// subject removed. The choreography is the worked example's and is not the model's to change — six
// cards over ONE live, flat (Web Mercator) MapTiler map driven by a plan (plan.mjs, verbatim), the
// scroll moving its camera and every paint (choropleth-drive.mjs, verbatim):
//
//   1 countries  Europe, empty: sea and land in the plate's tints;
//   2 classes    the classes arrive one by one, lowest first, with the key;
//   3 floor      every country under the top class steps back to bare land; the header counts the rest;
//   4 named      the countries the title is about, named on the map (all in the top class);
//   5 subject    the camera travels onto the subject: ringed and named with its value, its neighbours
//                (derived from the shapes) named with theirs;
//   6 limits     back to Europe, every class, the named countries and the subject ringed; a country
//                with no value keeps the key's neutral and no word on the map.
//
// Under the live map, one frozen image per card, baked from the same plan at the card's own camera
// (fallback/, cached on the plan's hash): what a reader without a key or a script sees. The page in
// renders/ carries `__MAPTILER_KEY__`; the key is substituted only in temporary copies, removed.
//
// This file computes every figure the cards may state (the study set, the classes, the top class,
// the subject's neighbours) and checks the words against them; ./beat.mjs — the one file the model
// writes — gives the rows and the WORDS of each card. Copied into the beat by the harness; never
// edited by the model.
//
// Usage:  bun <beat>/render-beat.mjs
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createElement } from "react";
import { deriveFurniture } from "#shared/chart-beat/render-still.mjs";
import { adjustToContrast, mix, TEXT_CONTRAST_MIN } from "#shared/chart-beat/colour.mjs";
import { webRegisters } from "#shared/design-base/web.mjs";
import { EYEBROW_TO_DISPLAY, gapOf, registerOf } from "#shared/design-base/register.mjs";
import { ISO3_TO_ISO2 } from "#shared/map-beat/iso-codes.mjs";
import { validateExpressions } from "#shared/map-beat/mount.mjs";
import { cameraFields, validateScrollyPlan, zoomShiftFor } from "#shared/map-beat/scrolly.mjs";
import { plateTints, WATER_HUE } from "#shared/map-beat/tints.mjs";
import { choroplethPlan, ISO, LAYER, LEVEL } from "./plan.mjs";
import { computeSeats } from "./seats.mjs";
import { applyStoryboard, assertNumbers, assertLegibleLabels, assertHeadlineNumbersDrawn, assertDrawsClaimColumn } from "./guards.mjs";
import { plain, refusing, storyLanguage } from "./web.mjs";
import { renderBeatScrolly, scrollySkill } from "./scrolly.mjs";
import { figureCheck, liveGuard, maptilerKey, openCards, owes, renderCardsPage, wordsOf } from "./scrolly-map.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));

/** The cards, in the drive's order: the runner's own ids (never the model's words in an id). */
const CARDS = ["countries", "classes", "floor", "named", "subject", "limits"];
/** One state per card, the worked example's, verbatim; each card's camera is added below. */
const BASE_STATES = [
  { classes: 0, filter: 0, top: 0, zoom: 0, odd: 0 },
  { classes: 1, filter: 0, top: 0, zoom: 0, odd: 0 },
  { classes: 1, filter: 1, top: 0, zoom: 0, odd: 0 },
  { classes: 1, filter: 1, top: 1, zoom: 0, odd: 0 },
  { classes: 1, filter: 0, top: 0, zoom: 1, odd: 1 },
  { classes: 1, filter: 0, top: 1, zoom: 0, odd: 1 },
];
/** The static plate's own bake bounds and camera aspect: the whole-map camera holds Europe. */
const BOUNDS = [[-25, 34], [42, 68]];
const FRAME = { width: 1000, height: 760 };
/** The close-up comes this many zoom levels in, centred on the subject (the worked example's). */
const CLOSE_UP = 2.3;
/** The seas' name seats, in [lon, lat] (the worked example's). */
const SEA_SEATS = { northSea: [3.0, 56.5], mediterranean: [15.0, 36.0], baltic: [19.5, 58.0] };
/** The view the join is asserted at: a desktop stage. */
const JOIN_VIEW = { width: 1168, height: 566 };
/** Neighbours from the frozen rings, in degrees: a vertex within a tenth of a degree of another's. */
const NEAR = 0.1;

await refusing(HERE, async () => {
  const { default: beat } = await import("./beat.mjs");
  applyStoryboard(beat, HERE);
  const { renderScrolly } = await import(scrollySkill(HERE, "scripts", "render-scrolly.mjs"));
  const { DirectedChoroplethScrolly } = await import("./DirectedChoroplethScrolly.tsx");

  const REQUIRED = ["eyebrow", "rows", "breaks", "named", "subject", "unit", "missingLabel", "format", "counter", "cards", "title", "limits", "source", "alt", "check"];
  const missingFields = REQUIRED.filter((key) => beat[key] === undefined);
  if (missingFields.length) throw new Error(`beat.mjs is missing ${missingFields.join(", ")}: give each as a field of the default export (export default { …, ${missingFields[0]}: … }), not as a separate export (see CONTRACT.md)`);
  for (const fn of ["format", "counter", "check"])
    if (typeof beat[fn] !== "function") throw new Error(`beat.mjs: ${fn} must be a function (see CONTRACT.md)`);
  const WORDED = CARDS.slice(0, 5);
  const absent = WORDED.filter((k) => typeof beat.cards?.[k] !== "function");
  if (absent.length) throw new Error(`beat.mjs: cards must give a function for each of ${WORDED.join(", ")}; missing or not a function: ${absent.join(", ")} (see CONTRACT.md)`);
  if (typeof [beat.limits].flat()[0] !== "string") throw new Error("limits must be a string: the last card's sentence, the accounting the map rests on (see CONTRACT.md)");

  // ── THE JOIN, loud: every row an ISO alpha-3 code the shapes carry and MapTiler keys on ──────────
  const geo = JSON.parse(readFileSync(join(HERE, "shapes.geojson"), "utf8"));
  const shapeIsos = new Set(geo.features.map((f) => f.properties.iso));
  if (!Array.isArray(beat.rows) || !beat.rows.length) throw new Error("rows must be one { iso, name, value } per country of the study set (see CONTRACT.md)");
  const seen = new Set();
  const badJoin = [];
  for (const row of beat.rows) {
    if (!/^[A-Z]{3}$/.test(String(row.iso)) || !shapeIsos.has(row.iso)) badJoin.push(`${JSON.stringify(row.iso)} (${row.name})`);
    else if (!/^[A-Z]{2}$/.test(ISO3_TO_ISO2[row.iso] ?? "")) badJoin.push(`${row.iso} (${row.name}) has no ISO A2 code, so the live map would paint it nothing`);
    if (seen.has(row.iso)) throw new Error(`rows hold ${row.iso} twice: keep ONE row per country (filter to one year or one series first)`);
    seen.add(row.iso);
    if (!String(row.name ?? "").trim()) throw new Error(`rows: ${row.iso} has no name`);
    if (row.value !== null && row.value !== undefined && typeof row.value !== "number") throw new Error(`rows: ${row.iso}'s value is ${JSON.stringify(row.value)}: a number, or null for a country the source does not report`);
  }
  if (badJoin.length)
    throw new Error(`these rows match no country on the map: ${badJoin.join(", ")}. iso must be an ISO 3166 alpha-3 code of a European or neighbouring country (resolve names with countries.mjs); this kit cannot draw anywhere else`);
  const withValue = beat.rows.filter((r) => r.value !== null && r.value !== undefined);
  assertNumbers(withValue.map((r) => [r.iso, r.value]));
  const ISO2 = Object.fromEntries(beat.rows.map((r) => [r.iso, ISO3_TO_ISO2[r.iso]]));
  const NAME = Object.fromEntries(beat.rows.map((r) => [r.iso, plain(r.name)]));
  const value = new Map(withValue.map((r) => [r.iso, r.value]));
  const ranked = [...withValue].sort((a, b) => b.value - a.value);
  const unreported = beat.rows.filter((r) => !value.has(r.iso));
  const pub = (iso) => ({ iso, name: NAME[iso], value: value.has(iso) ? value.get(iso) : null });

  // Every study country needs its seat, where its name sits on the live map; the search is the
  // worked example's, on the kit's frozen shapes. A country whose rings lie outside the camera refuses.
  let seats;
  try {
    seats = await computeSeats({ geo, study: new Set(beat.rows.map((r) => r.iso)) });
  } catch (error) {
    throw new Error(`${error.message}: the camera holds Europe from 25° W to 42° E and 34° N to 68° N; this kit cannot place a country outside it`);
  }
  const seatOf = (iso) => {
    if (!seats[iso]) throw new Error(`check(): ${iso} is not a row of the study set, so it has no seat`);
    return seats[iso];
  };
  const lonLatOf = (iso) => geo.features.filter((f) => f.properties.iso === iso).flatMap((f) => (f.geometry.type === "Polygon" ? [f.geometry.coordinates] : f.geometry.coordinates).flat(2));
  const neighboursOf = (iso) => {
    const mine = lonLatOf(iso);
    return [...shapeIsos]
      .filter((o) => o !== iso && value.has(o))
      .filter((o) => lonLatOf(o).some(([x, y]) => mine.some(([u, v]) => Math.abs(x - u) < NEAR && Math.abs(y - v) < NEAR)));
  };

  // ── THE CLASSES ─────────────────────────────────────────────────────────────────────────────────
  const BREAKS = beat.breaks;
  if (!Array.isArray(BREAKS) || BREAKS.length < 2 || BREAKS.length > 5 || BREAKS.some((b, i) => typeof b !== "number" || (i && b <= BREAKS[i - 1])))
    throw new Error(`breaks must be 2 to 5 rising numbers (3 to 6 classes), the takeaway's own threshold LAST — card 3 keeps only the top class; got ${JSON.stringify(BREAKS)}`);
  const classCount = BREAKS.length + 1;
  const FLOOR = BREAKS[BREAKS.length - 1];
  const classOf = (v) => BREAKS.filter((b) => v >= b).length;
  const classCounts = Array.from({ length: classCount }, (_, k) => ranked.filter((r) => classOf(r.value) === k).length);
  const top = ranked.filter((r) => classOf(r.value) === classCount - 1).map((r) => pub(r.iso));
  if (top.length < 1) throw new Error(`no country reaches the top class (${FLOOR} and above): card 3 would keep nothing on the map. The last break must be the takeaway's own threshold, which some countries clear`);
  if (top.length === ranked.length) throw new Error(`every country is in the top class (${FLOOR} and above): card 3 would filter nothing out`);
  assertLegibleLabels(ranked.map((r) => r.value), beat.format);

  // ── who is named and who is the subject ─────────────────────────────────────────────────────────
  if (!Array.isArray(beat.named)) throw new Error("named must be an array of iso codes: the countries card 4 names on the map ([] if none)");
  const namedOff = beat.named.filter((iso) => !top.some((t) => t.iso === iso));
  if (namedOff.length)
    throw new Error(`named holds ${namedOff.join(", ")}, which ${namedOff.length > 1 ? "are" : "is"} not in the top class (${FLOOR} and above): card 4 names countries ON the top class's fill (their ink is measured against it). Name only top-class countries, or lower the last break`);
  if (beat.named.length > 12) throw new Error(`named holds ${beat.named.length} countries: at most 12 names fit on the whole map`);
  if (!value.has(beat.subject))
    throw new Error(`subject is ${JSON.stringify(beat.subject)}, which is not a row with a value: card 5 travels onto ONE country of the study set and prints its value`);
  if (beat.named.includes(beat.subject)) throw new Error(`subject ${beat.subject} is also in named: card 5 names the subject in its own chip; leave it out of named`);
  const neighbours = neighboursOf(beat.subject).map(pub).sort((a, b) => b.value - a.value);
  if (!neighbours.length) throw new Error(`${NAME[beat.subject]} has no neighbour with a value on the shapes: card 5 names the subject's neighbours with theirs, and an island has none — pick another subject`);
  const ceiling = beat.neighbourCeiling;
  if (ceiling !== undefined) {
    if (typeof ceiling !== "number") throw new Error("neighbourCeiling must be a number: the round figure every neighbour of the subject stays under");
    const over = neighbours.filter((n) => n.value >= ceiling);
    if (over.length) throw new Error(`neighbourCeiling is ${ceiling}, but ${over.map((n) => `${n.name} (${n.value})`).join(", ")} ${over.length > 1 ? "are" : "is"} not under it`);
  }
  const subjectRank = ranked.findIndex((r) => r.iso === beat.subject) + 1;

  const reading = {
    count: ranked.length,
    rowCount: beat.rows.length,
    breaks: [...BREAKS],
    floor: FLOOR,
    lowestBreak: BREAKS[0],
    classCount,
    classCounts,
    top,
    topCount: top.length,
    named: beat.named.map(pub),
    namedCount: beat.named.length,
    subject: { ...pub(beat.subject), rank: subjectRank },
    neighbours,
    neighbourCount: neighbours.length,
    neighbourMax: neighbours[0].value,
    neighbourCeiling: ceiling ?? null,
    missing: unreported.map((r) => ({ iso: r.iso, name: NAME[r.iso] })),
    missingCount: unreported.length,
    highest: pub(ranked[0].iso),
    lowest: pub(ranked[ranked.length - 1].iso),
    ranked: ranked.map((r) => pub(r.iso)),
    value: (iso) => (value.has(iso) ? value.get(iso) : null),
    seatOf,
    neighboursOf,
  };
  Object.freeze(reading);

  beat.check(reading);
  assertDrawsClaimColumn(ranked.map((r) => r.value), HERE);

  // ── the words, each passed through plain(); every number they state is checked ───────────────────
  const say = wordsOf(reading);
  const format = (v) => plain(beat.format(v));
  const prose = [...WORDED.map((k) => say(`cards.${k}`, beat.cards[k])), say("limits", [beat.limits].flat()[0])];

  // What each card is ABOUT, so it must say it: the figure or the names its picture shows.
  const OWES = {
    countries: [["count", String(reading.count)]],
    classes: [["lowestBreak", format(BREAKS[0])], ["floor", format(FLOOR)]],
    floor: [["floor", format(FLOOR)]],
    named: reading.named.map((n) => [`the name of ${n.iso}`, n.name]),
    subject: [["subject.name", reading.subject.name], ["neighbourCount", String(reading.neighbourCount)]],
  };
  WORDED.forEach((k, i) => {
    const text = prose[i].join(" ");
    for (const [what, wanted] of OWES[k])
      if (!owes(text, wanted)) throw new Error(`card ${i + 1} (cards.${k}) must state ${what} = "${wanted}" — what its picture shows; it says: ${text}`);
  });

  // Every other figure a card, the counter or the alt states must be one this kit computed, at the
  // precision it is written with. A year (1900–2100) and a figure glued to letters (CO2, 10e) pass.
  const known = [
    reading.count, reading.rowCount, classCount, ...BREAKS, ...classCounts, top.length, reading.namedCount, neighbours.length,
    unreported.length, reading.subject.value, subjectRank, ...neighbours.map((n) => n.value), ...top.map((t) => t.value),
    ...reading.named.map((n) => n.value), reading.highest.value, reading.lowest.value, ...(ceiling !== undefined ? [ceiling] : []),
  ];
  const checkFigures = figureCheck({ format: [beat.format, (v) => v.toLocaleString(beat.lang ?? storyLanguage(HERE) ?? "en")], known, hint: "r.count, r.floor, r.topCount, r.subject.value, r.neighbourCount, …" });
  WORDED.forEach((k, i) => checkFigures(`card ${i + 1} (cards.${k})`, prose[i].join(" ")));

  const counterText = plain(beat.counter(reading));
  if (counterText.split("{n}").length !== 2) throw new Error(`counter must return a phrase holding "{n}" once — the header counts the countries card 3 keeps into it; it returned ${JSON.stringify(counterText)}`);
  checkFigures("counter", counterText.replace("{n}", ""));
  const alt = plain(typeof beat.alt === "function" ? beat.alt(reading) : beat.alt);
  checkFigures("alt", alt);

  const titleForms = [beat.title].flat().map(plain);
  // The title may count the countries the filter keeps — the header writes that count — beside the
  // values and the class limits the key prints.
  assertHeadlineNumbersDrawn(titleForms[0], [...ranked.map((r) => r.value), ...BREAKS, top.length], "countries");

  const eyebrow = plain(beat.eyebrow);
  const source = plain(beat.source);
  const unit = plain(beat.unit);
  const missingLabel = plain(beat.missingLabel);
  const seas = Object.entries(beat.seas ?? {}).map(([k, text]) => {
    if (!SEA_SEATS[k]) throw new Error(`seas.${k}: the seas this map can name are ${Object.keys(SEA_SEATS).join(", ")}`);
    return { text: plain([text].flat()[0]), seat: SEA_SEATS[k] };
  });
  const chip = (n) => `${n.name} · ${format(n.value)}`;
  const names = [
    ...reading.named.map((n) => ({ iso: n.iso, text: n.name, role: "top" })),
    { iso: beat.subject, text: chip(reading.subject), role: "odd" },
    ...neighbours.map((n) => ({ iso: n.iso, text: chip(n), role: "neighbour" })),
  ];
  const breakLabels = BREAKS.map(format);
  const topCount = { template: counterText, value: top.length };

  const textPerRegister = {
    display: titleForms.join(" "),
    eyebrow,
    body: `${prose.flat().join(" ")} ${source}`,
    axis: `${names.map((n) => n.text).join(" ")} ${breakLabels.join(" ")} ${unit} ${missingLabel} 0123456789`,
    annot: seas.map((w) => w.text).join(" "),
    value: `${counterText} 0123456789`,
  };

  // ── THE CAMERAS, from the static plate's own fit (the worked example's arithmetic) ──────────────
  const worldX = (lon) => (lon + 180) / 360;
  const worldY = (lat) => (1 - Math.log(Math.tan(Math.PI / 4 + (lat * Math.PI) / 360)) / Math.PI) / 2;
  const latOfWorldY = (y) => (2 * Math.atan(Math.exp((1 - 2 * y) * Math.PI)) * 180) / Math.PI - 90;
  const frameWorldPx = Math.min(FRAME.width / (worldX(BOUNDS[1][0]) - worldX(BOUNDS[0][0])), FRAME.height / (worldY(BOUNDS[0][1]) - worldY(BOUNDS[1][1])));
  const REFERENCE = { width: 1280, height: Math.round((1280 * FRAME.height) / FRAME.width) };
  const WHOLE_ZOOM = Math.log2((frameWorldPx * (REFERENCE.width / FRAME.width)) / 512);
  const WHOLE_CENTER = [(BOUNDS[0][0] + BOUNDS[1][0]) / 2, latOfWorldY((worldY(BOUNDS[0][1]) + worldY(BOUNDS[1][1])) / 2)];
  const whole = cameraFields({ center: WHOLE_CENTER, zoom: WHOLE_ZOOM });
  const closeUp = cameraFields({ center: seatOf(beat.subject), zoom: WHOLE_ZOOM + CLOSE_UP });
  const cameras = [whole, whole, whole, whole, closeUp, whole];
  const ODD_RING_DEGREES = (22 * 360) / frameWorldPx;
  const STATES = BASE_STATES.map((state, k) => ({ ...state, ...cameras[k], card: k }));

  const shares = Object.fromEntries(beat.rows.map((r) => [ISO2[r.iso], value.has(r.iso) ? value.get(r.iso) : null]));
  const key = maptilerKey(HERE);
  const trackingEm = (register) => Number.parseFloat(register.letterSpacing ?? "0") / Number.parseFloat(register.fontSize);
  const lang = beat.lang ?? storyLanguage(HERE) ?? "en";

  await renderBeatScrolly({
    here: HERE,
    states: STATES,
    textPerRegister,
    evidenceLevels: classCount,
    async render({ label, direction, outDir }) {
      const cards = await openCards(HERE, key);
      let outPath;
      try {
        // THE JOIN, AGAINST THE TILES: every study country must be a polygon MapTiler Countries really
        // serves at the whole-map camera, under the code this beat joins it on (Malta among level-1 units).
        const joinPage = await cards.mapPage();
        try {
          await joinPage.setViewport({ ...JOIN_VIEW, deviceScaleFactor: 1 });
          const zoom = WHOLE_ZOOM + zoomShiftFor({ referenceWidth: REFERENCE.width, referenceHeight: REFERENCE.height }, JOIN_VIEW.width, JOIN_VIEW.height);
          const found = await joinPage.evaluate(
            async (style, url, sourceLayer, center, zoom) => {
              const map = new maplibregl.Map({ container: "map", style, center, zoom, interactive: false, fadeDuration: 0 });
              await new Promise((r) => map.once("style.load", r));
              map.setProjection({ type: "mercator" });
              map.addSource("countries", { type: "vector", url });
              map.addLayer({ id: "countries", type: "fill", source: "countries", "source-layer": sourceLayer, paint: { "fill-opacity": 0 } });
              await new Promise((r) => map.once("idle", r));
              const out = map.querySourceFeatures("countries", { sourceLayer }).map((f) => [f.properties.level, f.properties.iso_a2]);
              map.remove();
              return out;
            },
            cards.styleDoc,
            `https://api.maptiler.com/tiles/countries/tiles.json?key=${key}`,
            LAYER,
            WHOLE_CENTER,
            zoom,
          );
          const codes = new Set(found.filter(([level, code]) => level === 0 || (level === 1 && code === "MT")).map(([, code]) => code));
          const dropped = Object.keys(shares).filter((code) => !codes.has(code));
          if (dropped.length)
            throw new Error(`the join dropped rows: MapTiler Countries (${LAYER}, ${LEVEL}, ${ISO}) serves no polygon for ${dropped.join(", ")} at the whole-map camera — this kit cannot paint ${dropped.length > 1 ? "them" : "it"}; leave ${dropped.length > 1 ? "them" : "it"} out of rows and say so in limits`);
          console.log(`join: ${Object.keys(shares).length} study countries found among ${codes.size} codes in MapTiler Countries`);
        } finally {
          await joinPage.close();
        }

        const { ink, muted, grid } = deriveFurniture(direction.ground);
        const regs = webRegisters(direction, { ink: { ink, muted, accent: direction.accent } });
        const tints = plateTints(direction);
        const low = mix(direction.accent, direction.ground, 0.88);
        const high = mix(direction.accent, ink, 0.3);
        const classFills = Array.from({ length: classCount }, (_, i) => mix(low, high, i / (classCount - 1)));
        const missingFill = mix(direction.ground, ink, 0.13);
        const accentInk = adjustToContrast(direction.accent, direction.ground, TEXT_CONTRAST_MIN) ?? direction.accent;
        const inkOnGround = adjustToContrast(ink, direction.ground, TEXT_CONTRAST_MIN) ?? ink;
        const fonts = {
          axis: await cards.faceOf(regs.axis, "axis"),
          axisSize: Number.parseFloat(regs.axis.fontSize),
          axisTracking: trackingEm(regs.axis),
          annot: await cards.faceOf(regs.annot, "annot"),
          annotSize: Number.parseFloat(regs.annot.fontSize),
          annotTracking: trackingEm(regs.annot),
          ink: inkOnGround,
          accentInk,
          waterInk: adjustToContrast(WATER_HUE, tints.water, TEXT_CONTRAST_MIN) ?? inkOnGround,
          // The named countries sit on the top class's fill: their ink is the accent walked to 7:1 on it.
          topInk: adjustToContrast(direction.accent, classFills[classCount - 1], 7) ?? deriveFurniture(classFills[classCount - 1]).ink,
          topHalo: classFills[classCount - 1],
        };
        const nameAt = (n) => ({ iso2: ISO2[n.iso], text: n.text, seat: seatOf(n.iso) });
        const plan = choroplethPlan({
          tints: { water: tints.water, land: tints.land },
          classFills,
          missingFill,
          border: { studied: grid, other: mix(tints.land, grid, 0.4), width: direction.stroke?.hairline ?? 0.6 },
          shares,
          breaks: BREAKS,
          top: top.map((t) => ISO2[t.iso]),
          odd: nameAt(names.find((n) => n.role === "odd")),
          neighbours: names.filter((n) => n.role === "neighbour").map(nameAt),
          missing: unreported.map((r) => ({ iso2: ISO2[r.iso] })),
          waters: seas,
          words: { top: names.filter((n) => n.role === "top").map(nameAt) },
          cameras,
          statesForCards: STATES,
          fonts,
          referenceWidth: REFERENCE.width,
          referenceHeight: REFERENCE.height,
          ringDegrees: ODD_RING_DEGREES,
        });
        plan.oddRingDegrees = ODD_RING_DEGREES;
        const violations = [...validateScrollyPlan(plan, STATES), ...validateExpressions(plan)];
        if (violations.length) throw new Error(`the plan is not renderable:\n  ${violations.join("\n  ")}`);

        const renderPage = (fallbacks, shapes) =>
          renderScrolly({
            steps: prose.map((p, i) => ({ id: CARDS[i], prose: p })),
            reveal: {
              element: createElement(DirectedChoroplethScrolly, {
                plan: { ...plan, fallback: shapes },
                first: STATES[0],
                reference: REFERENCE,
                fallbacks,
                classFills,
                missingFill,
                breaks: breakLabels,
                odd: names.find((n) => n.role === "odd"),
                topCount,
                unit,
                missingLabel,
                alt,
                regs,
                stroke: direction.stroke ?? {},
                ground: direction.ground,
                accent: direction.accent,
                ink,
                muted,
                water: tints,
              }),
              states: STATES,
              driver: `${cards.mapScript}\n${readFileSync(join(HERE, "choropleth-drive.mjs"), "utf8")}`,
              apply: "applyChoroplethState",
            },
            vendor: [{ js: cards.maplibreJs, css: cards.maplibreCss }],
            title: titleForms,
            eyebrow,
            source,
            ground: direction.ground,
            type: { eyebrow: { ...regs.eyebrow, marginBottom: `${gapOf(registerOf(direction, "eyebrow"), EYEBROW_TO_DISPLAY)}px` }, display: regs.display, body: regs.body, source: regs.body },
            lang,
            outDir,
            name: `${label}.html`,
          });

        ({ outPath } = await renderCardsPage(cards, HERE, outDir, label, {
          plan,
          states: STATES,
          stageGround: tints.water,
          project: [plan.oddSeat],
          cardOf: (baked) => ({ odd: baked.projected[0].map((v) => Math.round(v * 10) / 10), zoom: baked.zoom }),
          blankCard: { odd: [0, 0], zoom: 0 },
          renderPage,
        }));
        console.log(`faces served by MapTiler: ${fonts.axis} / ${fonts.annot}`);
      } finally {
        await cards.close();
      }

      liveGuard(HERE, outPath, key);
      return { outPath };
    },
  });
});
