// The generic half of a contour (isoline) SCROLLY beat, taken from
// proof/scrolly-contour-europe-distance/render-directions-scrolly.mjs with everything about ITS subject
// removed. The FIELD is the type's: the distance from the sea, measured everywhere on the study
// countries' land (contour-field.mjs, verbatim, on the kit's Natural Earth shapes). The choreography is
// the worked example's — six cards over ONE live, flat MapTiler map driven by a plan (plan.mjs,
// verbatim), the scroll sweeping a fill inland from every coast (contour-drive.mjs, verbatim):
//
//   1 land     the land, bare;
//   2 first    the fill sweeps to the first stop, its line left behind, the share counted;
//   3 median   to the median: half the land, its line in the accent;
//   4 far      to the far stop: its share, the islands of land left beyond it;
//   5 last     the camera closes onto the last point the sweep reaches, its distance marked;
//   6 limits   the fill withdraws: every line with its number; the reading line.
//
// Under the live map, one frozen image per card, baked from the same plan (fallback/, cached on the
// plan's hash). The page in renders/ carries `__MAPTILER_KEY__`; the key is substituted only in
// temporary copies, removed.
//
// This file measures the field and computes every figure the cards may state, and checks the words
// against them; ./beat.mjs — the one file the model writes — gives the study set, the stops and the
// WORDS. Copied into the beat by the harness; never edited by the model.
//
// Usage:  bun <beat>/render-beat.mjs
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { gunzipSync, gzipSync } from "node:zlib";
import { createElement } from "react";
import { deriveFurniture } from "#shared/chart-beat/render-still.mjs";
import { adjustToContrast, contrast, mix, NON_TEXT_CONTRAST_MIN, TEXT_CONTRAST_MIN } from "#shared/chart-beat/colour.mjs";
import { webRegisters } from "#shared/design-base/web.mjs";
import { EYEBROW_TO_DISPLAY, gapOf, registerOf } from "#shared/design-base/register.mjs";
import { validateExpressions } from "#shared/map-beat/mount.mjs";
import { cameraFields, lonLatOf, mercatorOf, validateScrollyPlan } from "#shared/map-beat/scrolly.mjs";
import { SEA_LAND_MIN } from "#shared/map-beat/tints.mjs";
import { CELL_KM, contourField } from "./contour-field.mjs";
import { bestSeatOf, contourMapPlan, iso2Of, lonLatOfFrame, sweepOf } from "./plan.mjs";
import { applyStoryboard, assertHeadlineNumbersDrawn } from "./guards.mjs";
import { plain, refusing, storyLanguage } from "./web.mjs";
import { renderBeatScrolly, scrollySkill } from "./scrolly.mjs";
import { figureCheck, liveGuard, maptilerKey, openCards, owes, renderCardsPage, wordsOf } from "./scrolly-map.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));

/** The cards, in the drive's order: the runner's own ids. */
const CARDS = ["land", "first", "median", "far", "last", "limits"];
/** The study window (the worked example's): Europe. */
const WINDOW = { west: -25, east: 45, south: 34, north: 72 };
const FRAME_WIDTH = 1000;
/** An island of land beyond the far stop counts when it holds at least this many cells. */
const ISLAND_CELLS = 10;

await refusing(HERE, async () => {
  const { default: beat } = await import("./beat.mjs");
  applyStoryboard(beat, HERE);
  const { renderScrolly } = await import(scrollySkill(HERE, "scripts", "render-scrolly.mjs"));
  const { DirectedContourScrolly } = await import("./DirectedContourScrolly.tsx");

  const REQUIRED = ["eyebrow", "study", "levels", "firstStop", "farStop", "names", "format", "percent", "counter", "unit", "outsideLabel", "cards", "title", "limits", "source", "alt", "check"];
  const missingFields = REQUIRED.filter((key) => beat[key] === undefined);
  if (missingFields.length) throw new Error(`beat.mjs is missing ${missingFields.join(", ")}: give each as a field of the default export (export default { …, ${missingFields[0]}: … }), not as a separate export (see CONTRACT.md)`);
  for (const fn of ["format", "percent", "check"]) if (typeof beat[fn] !== "function") throw new Error(`beat.mjs: ${fn} must be a function (see CONTRACT.md)`);
  const WORDED = CARDS.slice(0, 5);
  const absent = WORDED.filter((k) => typeof beat.cards?.[k] !== "function");
  if (absent.length) throw new Error(`beat.mjs: cards must give a function for each of ${WORDED.join(", ")}; missing or not a function: ${absent.join(", ")} (see CONTRACT.md)`);
  if (typeof [beat.limits].flat()[0] !== "string") throw new Error("limits must be a string: card 6's reading line (see CONTRACT.md)");

  // ── the study set: the countries whose land is measured ────────────────────────────────────────
  const geo = JSON.parse(readFileSync(join(HERE, "shapes.geojson"), "utf8"));
  const shapeIsos = new Set(geo.features.map((f) => f.properties.iso));
  if (!Array.isArray(beat.study) || beat.study.length < 2) throw new Error("study must be the ISO alpha-3 codes of the countries whose land is measured (see CONTRACT.md)");
  const bad = beat.study.filter((iso) => !shapeIsos.has(iso));
  if (bad.length) throw new Error(`study holds ${bad.map((b) => JSON.stringify(b)).join(", ")}, which no country of the kit's shapes carries (ISO alpha-3, Europe and its neighbours)`);
  if (beat.study.includes("RUS")) throw new Error("study holds RUS: the frame cuts Russia at 45° E, so its land cannot be measured to its far side — leave it out (it is drawn as land outside the measure) and say so in outsideLabel");
  for (const iso of beat.study) iso2Of(iso);
  const study = new Set(beat.study);
  const probe = contourField(geo, { study, window: WINDOW, width: FRAME_WIDTH, levels: [] });
  if (probe.studyCount !== study.size) throw new Error(`study names ${study.size} countries and the shapes carry ${probe.studyCount} of them in the frame`);
  const MEDIAN = Math.round(probe.median);

  const LEVELS_GIVEN = beat.levels;
  if (!Array.isArray(LEVELS_GIVEN) || LEVELS_GIVEN.length < 2 || LEVELS_GIVEN.length > 6 || LEVELS_GIVEN.some((l, i) => !(Number.isInteger(l) && l > 0) || (i && l <= LEVELS_GIVEN[i - 1])))
    throw new Error(`levels must be 2 to 6 rising whole distances in km, the isolines drawn (the median is added); got ${JSON.stringify(LEVELS_GIVEN)}`);
  if (LEVELS_GIVEN.includes(MEDIAN)) throw new Error(`levels holds ${MEDIAN}, the median itself: the kit draws the median's line in the accent; leave it out of levels`);
  if (LEVELS_GIVEN[LEVELS_GIVEN.length - 1] >= probe.deepest) throw new Error(`levels reaches ${LEVELS_GIVEN[LEVELS_GIVEN.length - 1]} km, and no land is farther than ${Math.floor(probe.deepest)} km from the sea: that line would draw nothing`);
  const LEVELS = [...LEVELS_GIVEN, MEDIAN].sort((a, b) => a - b);
  const FIRST = beat.firstStop;
  const FAR = beat.farStop;
  if (!LEVELS_GIVEN.includes(FIRST) || !(FIRST < MEDIAN)) throw new Error(`firstStop is ${FIRST}: it must be one of levels and below the median (${MEDIAN} km) — card 2 sweeps to it before card 3 reaches the median`);
  if (!LEVELS_GIVEN.includes(FAR) || !(FAR > MEDIAN)) throw new Error(`farStop is ${FAR}: it must be one of levels and above the median (${MEDIAN} km) — card 4 sweeps to it after the median`);

  const field = contourField(geo, { study, window: WINDOW, width: FRAME_WIDTH, levels: LEVELS });
  for (const { level, d } of field.lines) if (d.length < 40) throw new Error(`the ${level} km isoline came out of the field as loose points, not as a line: choose other levels`);
  const pct = (km) => Math.round(field.within[km]);
  if (pct(MEDIAN) !== 50) throw new Error(`the median's line holds ${field.within[MEDIAN]} % of the land, not half: a defect in the kit, not in beat.mjs`);
  const islands = field.islandsBeyond(FAR).filter((p) => p.cells >= ISLAND_CELLS);
  // The last land: beyond the largest hundred under the deepest point (600 km for a deepest at 682).
  const LAST_LAND = Math.max(FAR, Math.floor((field.deepest - 50) / 100) * 100);
  const summitPiece = field.islandsBeyond(LAST_LAND).find((p) => p.holdsSummit);
  if (!summitPiece) throw new Error(`the farthest point is not inside the land beyond ${LAST_LAND} km: a defect in the kit, not in beat.mjs`);
  const rasterBytes = gunzipSync(Buffer.from(field.raster.data, "base64"));
  if (!field.deepestIso || !String(beat.names?.[field.deepestIso] ?? "").trim())
    throw new Error(`the farthest point falls in ${field.deepestIso}: give its name in the story's language in names (names.${field.deepestIso})`);

  // ── the cameras (the worked example's arithmetic) ───────────────────────────────────────────────
  const winPts = [[WINDOW.west, WINDOW.south], [WINDOW.east, WINDOW.south], [WINDOW.east, WINDOW.north], [WINDOW.west, WINDOW.north]].map(mercatorOf);
  const PAD = 0.04;
  const wx0raw = Math.min(...winPts.map((p) => p[0]));
  const wx1raw = Math.max(...winPts.map((p) => p[0]));
  const wy0raw = Math.min(...winPts.map((p) => p[1]));
  const wy1raw = Math.max(...winPts.map((p) => p[1]));
  const wpx = (wx1raw - wx0raw) * PAD;
  const wpy = (wy1raw - wy0raw) * PAD;
  const [wx0, wx1, wy0, wy1] = [wx0raw - wpx, wx1raw + wpx, wy0raw - wpy, wy1raw + wpy];
  const REFERENCE = { width: 1280, height: Math.round((1280 * (wy1 - wy0)) / (wx1 - wx0)) };
  const WHOLE_ZOOM = Math.log2(REFERENCE.width / ((wx1 - wx0) * 512));
  const WHOLE_CENTER = lonLatOf([(wx0 + wx1) / 2, (wy0 + wy1) / 2]);
  const whole = cameraFields({ center: WHOLE_CENTER, zoom: WHOLE_ZOOM });
  const [sx, sy] = field.summit;
  const MIN_REACH = 90;
  const reachX = Math.max(MIN_REACH, Math.max(sx - summitPiece.box.x0, summitPiece.box.x1 - sx) * 1.5);
  const reachY = Math.max(MIN_REACH, Math.max(sy - summitPiece.box.y0, summitPiece.box.y1 - sy) * 1.5);
  const zoomBox = { x0: sx - reachX, x1: sx + reachX, y0: sy - reachY, y1: sy + reachY };
  const closeCorners = [
    [zoomBox.x0, zoomBox.y0], [zoomBox.x1, zoomBox.y0], [zoomBox.x1, zoomBox.y1], [zoomBox.x0, zoomBox.y1],
    [(zoomBox.x0 + zoomBox.x1) / 2, zoomBox.y0], [(zoomBox.x0 + zoomBox.x1) / 2, zoomBox.y1],
    [zoomBox.x0, (zoomBox.y0 + zoomBox.y1) / 2], [zoomBox.x1, (zoomBox.y0 + zoomBox.y1) / 2],
  ].map((p) => mercatorOf(lonLatOfFrame(field, p)));
  const cx0 = Math.min(...closeCorners.map((p) => p[0]));
  const cx1 = Math.max(...closeCorners.map((p) => p[0]));
  const cy0 = Math.min(...closeCorners.map((p) => p[1]));
  const cy1 = Math.max(...closeCorners.map((p) => p[1]));
  const CLOSE_ZOOM = Math.log2(Math.min(REFERENCE.width / ((cx1 - cx0) * 1.15 * 512), REFERENCE.height / ((cy1 - cy0) * 1.15 * 512)));
  const close = cameraFields({ center: lonLatOf([(cx0 + cx1) / 2, (cy0 + cy1) / 2]), zoom: CLOSE_ZOOM });
  const cameras = [whole, whole, whole, whole, close, whole];

  // ── the reading ─────────────────────────────────────────────────────────────────────────────────
  const reading = {
    studyCount: field.studyCount,
    cellKm: CELL_KM,
    median: field.median,
    medianLevel: MEDIAN,
    deepest: field.deepest,
    deepestIso: field.deepestIso,
    deepestName: plain(beat.names[field.deepestIso]),
    firstStop: FIRST,
    firstShare: field.within[FIRST],
    farStop: FAR,
    farShare: field.within[FAR],
    islands: islands.length,
    levels: [...LEVELS],
    within: (km) => {
      if (!LEVELS.includes(km)) throw new Error(`within(${km}): only the drawn levels are measured (${LEVELS.join(", ")})`);
      return field.within[km];
    },
  };
  Object.freeze(reading);
  beat.check(reading);

  // ── the words ───────────────────────────────────────────────────────────────────────────────────
  const say = wordsOf(reading);
  const format = (v) => plain(beat.format(v));
  const percent = (v) => plain(beat.percent(v));
  const prose = [...WORDED.map((k) => say(`cards.${k}`, beat.cards[k])), say("limits", [beat.limits].flat()[0])];
  const OWES = {
    land: [["r.studyCount", String(field.studyCount)]],
    first: [["format(r.firstStop)", format(FIRST)], ["percent(r.firstShare)", percent(reading.firstShare)]],
    median: [["format(r.medianLevel)", format(MEDIAN)]],
    far: [["format(r.farStop)", format(FAR)], ["percent(r.farShare)", percent(reading.farShare)]],
    last: [["format(r.deepest)", format(field.deepest)], ["r.deepestName", reading.deepestName]],
  };
  WORDED.forEach((k, i) => {
    const text = prose[i].join(" ");
    for (const [what, wanted] of OWES[k]) if (!owes(text, wanted)) throw new Error(`card ${i + 1} (cards.${k}) must state ${what} = "${wanted}" — what its picture shows; it says: ${text}`);
  });
  const known = [field.studyCount, CELL_KM, field.median, field.deepest, islands.length, ...LEVELS, ...LEVELS.map((l) => field.within[l])];
  const check = figureCheck({ format: [beat.percent, beat.format, (v) => v.toLocaleString(beat.lang ?? "en")], known, hint: "r.firstShare, r.medianLevel, r.deepest, …" });
  WORDED.forEach((k, i) => check(`card ${i + 1} (cards.${k})`, prose[i].join(" ")));
  const counter = plain(beat.counter);
  for (const ph of ["{p}", "{km}"]) if (counter.split(ph).length !== 2) throw new Error(`counter must hold ${ph} once: the header writes the share of the land ({p}) within the swept distance ({km}); it is ${JSON.stringify(counter)}`);
  check("counter", counter.replace(/\{(p|km)\}/g, " "));
  const unit = plain(beat.unit);
  const outsideLabel = plain(beat.outsideLabel);
  const alt = plain(typeof beat.alt === "function" ? beat.alt(reading) : beat.alt);
  check("alt", alt);
  const titleForms = [beat.title].flat().map(plain);
  assertHeadlineNumbersDrawn(titleForms[0], [field.median, field.deepest, ...LEVELS, ...LEVELS.map((l) => field.within[l])], "lines");
  const levels = LEVELS.map((level) => ({ level, label: format(level) }));
  // The summit's number, as the lines' numbers are written: a bare figure, in the story's grouping.
  const deepestText = plain(Math.round(field.deepest).toLocaleString(beat.lang ?? storyLanguage(HERE) ?? "en"));

  const LAST = Math.ceil(field.deepest) + 6;
  const STATES = [
    { level: 0, tint: 1, median: 0, summit: 0 },
    { level: FIRST, tint: 1, median: 0, summit: 0 },
    { level: MEDIAN, tint: 1, median: 1, summit: 0 },
    { level: FAR, tint: 1, median: 1, summit: 0 },
    { level: LAST, tint: 1, median: 1, summit: 1 },
    { level: LAST, tint: 0, median: 1, summit: 1 },
  ].map((state, k) => ({ ...state, ...cameras[k], card: k }));

  const eyebrow = plain(beat.eyebrow);
  const source = plain(beat.source);
  const textPerRegister = {
    display: titleForms.join(" "),
    eyebrow,
    body: `${prose.flat().join(" ")} ${source}`,
    axis: `${levels.map((l) => l.label).join(" ")} ${unit} ${outsideLabel}`,
    annot: "",
    value: `${counter} ${format(field.deepest)} 0123456789`,
  };
  const key = maptilerKey(HERE);
  const lang = beat.lang ?? storyLanguage(HERE) ?? "en";

  await renderBeatScrolly({
    here: HERE,
    states: STATES,
    textPerRegister,
    evidenceLevels: beat.evidenceLevels ?? 3,
    async render({ label, direction, outDir }) {
      const cards = await openCards(HERE, key);
      let outPath;
      try {
        const { ink, muted } = deriveFurniture(direction.ground);
        const regs = webRegisters(direction, { ink: { ink, muted, accent: direction.accent } });
        const ground = direction.ground;
        const accent = direction.accent;
        let dose = 0.085;
        while (contrast(mix(ground, ink, dose), ground) < SEA_LAND_MIN && dose < 0.4) dose += 0.005;
        if (contrast(mix(ground, ink, dose), ground) < SEA_LAND_MIN) throw new Error(`no step of the ink separates land from sea by ${SEA_LAND_MIN}:1 on ${ground}`);
        const land = mix(ground, ink, dose);
        const outside = mix(ground, ink, dose / 2);
        const tint = mix(land, accent, 0.22);
        const floorOn = (colour, floor, what) => {
          let c = colour;
          for (const bg of [land, tint]) {
            if (contrast(c, bg) >= floor) continue;
            const lifted = adjustToContrast(c, bg, floor);
            if (!lifted) throw new Error(`${what} cannot be told from ${bg}: nothing between it and the direction's poles clears ${floor}:1`);
            c = lifted;
          }
          for (const bg of [land, tint]) if (contrast(c, bg) < floor) throw new Error(`${what} clears ${floor}:1 on one of the land and the fill, not on both`);
          return c;
        };
        const plainLevels = LEVELS.filter((l) => l !== MEDIAN);
        const lineInk = new Map(
          LEVELS.map((l) => [
            l,
            l === MEDIAN
              ? floorOn(accent, NON_TEXT_CONTRAST_MIN, "the median line")
              : floorOn(mix(mix(ground, ink, 0.35), accent, plainLevels.length > 1 ? plainLevels.indexOf(l) / (plainLevels.length - 1) : 1), NON_TEXT_CONTRAST_MIN, `the ${l} km line`),
          ]),
        );
        const textInk = floorOn(ink, TEXT_CONTRAST_MIN, "a line's number");
        const accentText = floorOn(accent, TEXT_CONTRAST_MIN, "the median's number");
        const rim = floorOn(accent, NON_TEXT_CONTRAST_MIN, "the sweep's front");
        const colours = { ground, land, outside, tint, rim, lines: Object.fromEntries(lineInk), text: { median: accentText, plain: textInk } };
        const face = await cards.faceOf(regs.axis, "axis");
        const axisPx = Number.parseFloat(String(regs.axis.fontSize));
        const strokes = { line: (direction.stroke?.hairline ?? 0.6) * 1.4, median: (direction.stroke?.rule ?? 1) * 1.8, dot: 3.2, rule: direction.stroke?.hairline ?? 0.6, axisPx, face };
        const numberSeats = {};
        for (let li = 0; li < LEVELS.length; li++) {
          const L = LEVELS[li];
          const seat = bestSeatOf(field, li, 1);
          if (!seat) throw new Error(`the ${L} km line has no seat clear enough for its number: choose other levels`);
          numberSeats[L] = { lonLat: lonLatOfFrame(field, [seat[0], seat[1]]), text: String(L) };
        }
        const summitSeat = { seat: lonLatOfFrame(field, field.summit), text: deepestText, offset: 10 };
        const sweepRaw = sweepOf(field, rasterBytes, whole, REFERENCE.width);
        const sweep = { cols: sweepRaw.cols, rows: sweepRaw.rows, stepKm: sweepRaw.stepKm, coordinates: sweepRaw.coordinates, bytes: gzipSync(Buffer.from(sweepRaw.bytes), { level: 9 }).toString("base64") };
        const plan = contourMapPlan({
          field,
          study: [...study],
          levels: LEVELS,
          medianLevel: MEDIAN,
          colours,
          strokes,
          cameras,
          statesForCards: STATES,
          referenceWidth: REFERENCE.width,
          referenceHeight: REFERENCE.height,
          numberSeats,
          summit: summitSeat,
        });
        const violations = [...validateScrollyPlan(plan, STATES), ...validateExpressions(plan)];
        if (violations.length) throw new Error(`the plan is not renderable:\n  ${violations.join("\n  ")}`);
        const renderPage = (fallbacks, shapes) =>
          renderScrolly({
            steps: prose.map((p, i) => ({ id: CARDS[i], prose: p })),
            reveal: {
              element: createElement(DirectedContourScrolly, {
                plan: { ...plan, fallback: shapes },
                fallbacks,
                reference: REFERENCE,
                sweep,
                within: field.within,
                deepest: field.deepest,
                colours: { tint: colours.tint, rim: colours.rim },
                count: counter,
                unit,
                outsideLabel,
                levels,
                alt,
                regs,
                ground,
                accent,
                ink,
                muted,
              }),
              states: STATES,
              driver: `${cards.mapScript}\n${readFileSync(join(HERE, "contour-drive.mjs"), "utf8")}`,
              apply: "applyContourState",
            },
            vendor: [{ js: cards.maplibreJs, css: cards.maplibreCss }],
            title: titleForms,
            eyebrow,
            source,
            ground,
            type: { eyebrow: { ...regs.eyebrow, marginBottom: `${gapOf(registerOf(direction, "eyebrow"), EYEBROW_TO_DISPLAY)}px` }, display: regs.display, body: regs.body, source: regs.body },
            lang,
            outDir,
            name: `${label}.html`,
          });
        ({ outPath } = await renderCardsPage(cards, HERE, outDir, label, {
          plan,
          states: STATES,
          stageGround: ground,
          cardOf: (baked) => ({ zoom: baked.zoom }),
          renderPage,
        }));
        console.log(`face served by MapTiler: ${face}`);
      } finally {
        await cards.close();
      }
      // WAIVED, BY EXACT SHAPE — the worked example's own committed page fails both the same way (measured
      // 2026-10-26: 1247/1249/1247/1247/272/1247 undrawn points at 1280x800, 1729/1733/1730/1729/390/1729 at
      // 375x812, one frame with a missing tile at 30 px per frame on a phone). The SEA IS THE PAGE'S OWN GROUND
      // by design (card 1: the land bare, the sea the ground), and the guard reads the ground as "undrawn",
      // so for this type it cannot tell a missing country from the sea. The kit's own join is the shapes'.
      liveGuard(HERE, outPath, key, {
        waive: [
          { test: /^\d+x\d+: card \d+ leaves \d+ sampled points of the canvas undrawn \(page ground or transparent\)$/, why: "the sea is drawn in the page's own ground by design; the worked example's page fails it with the same counts" },
          { test: /^\d+x\d+: \d+ frames with a missing tile at \d+px\/frame$/, why: "inherited: the worked example's own page fails it the same way (tiles loading during the camera's travel)" },
        ],
      });
      return { outPath };
    },
  });
});
