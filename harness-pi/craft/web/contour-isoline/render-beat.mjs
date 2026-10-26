// The generic half of a contour / isoline WEB beat, taken from
// proof/web-contour-europe-distance/render-directions-web.mjs with everything about ITS subject
// removed. The page is the worked example's: a LIVE MapTiler map — the field's bands (quantised once
// at a 25 km bin), its isolines (traced once at every multiple of 50 km) and each line's own printed
// break are MapLibre layers over MapTiler's tiles — over a frozen fallback photographed from that
// live map, and ONE control: the reader chooses THE STEP between the lines (50 / 100 / 200 / 400 km),
// the decision a contour map otherwise hides. Re-cutting repaints the bands, filters the lines,
// re-colours the chip row, swaps the step's sentence and dims the table rows the step does not draw
// (the last three in pure CSS). Hovering the land lights the WHOLE band the chosen step put that
// point in and answers the country, the measured distance and the band.
//
// ./field.mjs measures the field (beat.mjs calls it); this file draws it, computes every reading
// the interaction answers, the label anchors, what each step costs and what Web Mercator costs THIS
// subject; ./beat.mjs — the one file the model writes — gives the study area, the names and the
// WORDS. Copied into the beat by the harness; never edited by the model.
//
// Usage:  bun <beat>/render-beat.mjs
import { dirname, join } from "node:path";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { adjustToContrast, contrast } from "#shared/chart-beat/colour.mjs";
import { deriveFurniture } from "#shared/chart-beat/render-still.mjs";
import { guardColour } from "#shared/design-base/compose.mjs";
import { countryGround, plateGrounds, plateTints } from "#shared/map-beat/tints.mjs";
import { frameProjector, markOccupancy, occupancyLine } from "#shared/map-beat/occupancy.mjs";
import { applyStoryboard, assertHeadlineNumbersDrawn, assertNumbers } from "./guards.mjs";
import { ensurePlate, liveAssets, mapWeb, maptilerKey, renderLiveMapPage, verifyLiveMap } from "./map-web.mjs";
import { plateWaterField } from "./plate-water.mjs";
import { chartWeb, pickDirection, plain, plainRegisters, refusing, storyLanguage } from "./web.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));

/** The plate's own pixel box (the worked example's 1600x1216). */
const PLATE_FRAME = [1600, 1216];
/** The land's step off the ground toward the ink, measured on the worked example. */
const LAND_DOSE = 0.07;
/** The field is PAINTED four mesh cells at a time, as merged horizontal runs (the worked example's). */
const FILL = 4;
const BLEED = 0.4;
/** The marching cell, in mesh cells: a contour traced at 21 km is visually identical at every step. */
const LINE_STRIDE = 3;
/** Every point the level passes through, sampled every 5 cells — the pool an anchor is chosen from. */
const ANCHOR_SAMPLE = 5;
/** A break's box is ~34 CSS px; 40 px of clearance is one box plus a margin, at the delivered box. */
const LABEL_CLEARANCE_PX = 40;
const DELIVERED_BOX_PX = 1464;

await refusing(HERE, async () => {
  const { default: beat } = await import("./beat.mjs");
  applyStoryboard(beat, HERE);
  const { renderWeb, MAP_DRAWING_SHARE } = await import(chartWeb(HERE, "scripts", "render-web.mjs"));
  const { liveContourPlan, liveContourScript, assertSteppingReachesTheLayers } = await import(mapWeb(HERE, "assets", "live-contour.ts"));
  const { CHANGE_MS, STEP_ID_PREFIX, DirectedContourWeb, contourRamp } = await import("./DirectedContourWeb.tsx");

  // ── the fields ────────────────────────────────────────────────────────────────────────────────
  const REQUIRED = ["eyebrow", "field", "names", "stepLabel", "stepAnnounce", "stepNote", "bandDetail", "binDetail", "levelDetail", "percent", "stepLegend", "nearLabel", "farLabel", "tableCaption", "columns", "claimNote", "limitNote", "mercator", "reading", "hint", "title", "limits", "source", "alt", "check"];
  const missingFields = REQUIRED.filter((key) => beat[key] === undefined);
  if (missingFields.length) throw new Error(`beat.mjs is missing ${missingFields.join(", ")}: give each as a field of the default export (export default { …, ${missingFields[0]}: … }), not as a separate export (see CONTRACT.md)`);
  for (const fn of ["stepLabel", "stepAnnounce", "stepNote", "bandDetail", "binDetail", "levelDetail", "percent", "farLabel", "tableCaption", "mercator", "check"])
    if (typeof beat[fn] !== "function") throw new Error(`beat.mjs: ${fn} must be a function (see CONTRACT.md)`);
  // THE ONE FIELD THIS KIT DRAWS. Anything else — elevation, temperature, travel time, a distance to
  // the nearest record — has no frozen source in a story folder, and a field built from records is
  // the type's own prohibition: a missing record rewrites every cell around it, unseen.
  if (beat.field?.kind !== "distance-to-sea" || !beat.field?._grid)
    throw new Error(
      "field must be measureSeaDistance(import.meta.dirname, { study }) from ./field.mjs — distance to the sea " +
        "is the only field this kit can draw honestly. A story whose field is something else (elevation, " +
        "temperature, distance to records) is not a contour beat this kit can make: say so, do not fake the field",
    );
  if (!Array.isArray(beat.columns) || beat.columns.length !== 2) throw new Error("columns must be the table's two headings: the line (km), the share of land beyond it (see CONTRACT.md)");
  const field = beat.field;
  const { nx, ny, owner, km, landKm, codes, kmPerCell: KM_PER_CELL, toLonLat } = field._grid;
  const nameless = codes.filter((c) => typeof beat.names?.[c] !== "string" || !beat.names[c].trim());
  if (nameless.length) throw new Error(`names must give every study country its name in the story's language; missing: ${nameless.join(", ")}`);
  const NAME = (code) => plain(beat.names[code]);

  // ── the claim, against the measured field ─────────────────────────────────────────────────────
  assertNumbers([["median", field.median], ["deepest", field.deepest]], "field figures");
  beat.check(field);
  const title = plain([beat.title].flat()[0]);
  const STEPS_KM = field.steps;
  const LEVELS = field.levels;
  const within = (v) => field.within(v);
  // The headline's figures are the field's: its median, its farthest point, a drawn level, a step, a
  // quantile, or the share within a drawn level or a step.
  const figures = [field.median, field.deepest, ...LEVELS, ...STEPS_KM, ...[0.1, 0.25, 0.75, 0.9].map((p) => field.quantile(p)), ...[...LEVELS, ...STEPS_KM].map(within)];
  assertHeadlineNumbersDrawn(title, figures.map((v) => Math.round(v)), "field figures");

  // A number a sentence prints is one the reading it was given carries, at the precision printed.
  const digits = (text) => plain(text).replace(/(\d)[\s  ](?=\d{3}(\D|$))/g, "$1");
  const numbersIn = (text) => [...digits(text).matchAll(/\d+(?:[.,]\d+)?/g)].map((m) => m[0]);
  const carries = (token, v) => {
    const n = Number(token.replace(",", "."));
    const d = (token.split(/[.,]/)[1] ?? "").length;
    return Number.isFinite(v) && Math.abs(Number(v.toFixed(d)) - n) < 1e-9;
  };
  const foreign = (text, allowed) => numbersIn(text).filter((t) => {
    const n = Number(t.replace(",", "."));
    if (Number.isInteger(n) && n >= 1900 && n <= 2100) return false;
    return !allowed.some((v) => carries(t, v));
  });
  const states = (text, v) => numbersIn(text).some((t) => carries(t, v));
  const fieldNumbers = [
    field.median, field.deepest, field.cellKm, field.binKm, field.topKm, field.errorKm, field.scaleErrorPc, field.study.length, field.cells,
    ...LEVELS, ...STEPS_KM, ...STEPS_KM.map((s) => field.topKm / s), ...[...LEVELS, ...STEPS_KM].map(within), ...[0.1, 0.25, 0.5, 0.75, 0.9].map((p) => field.quantile(p)),
  ];
  for (const key of ["claimNote", "limitNote", "alt"]) {
    const text = plain([beat[key]].flat()[0]);
    const bad = foreign(text, fieldNumbers);
    if (bad.length) throw new Error(`${key} prints ${bad.join(", ")}, which the field does not hold (field.median ${field.median.toFixed(1)}, field.deepest ${field.deepest.toFixed(1)}, field.within(km), field.cellKm ${field.cellKm.toFixed(1)}…): compute every number from field; it says "${text}"`);
  }

  // ── THE FIELD, QUANTISED ONCE ─────────────────────────────────────────────────────────────────
  const BIN_KM = field.binKm;
  const COARSEST = Math.max(...STEPS_KM);
  const FINEST = Math.min(...STEPS_KM);
  const TOP_KM = field.topKm;
  const BINS = Math.round(TOP_KM / BIN_KM);
  for (const s of STEPS_KM)
    if (s % BIN_KM !== 0 || TOP_KM % s !== 0) throw new Error(`the ${s} km step does not tile the ${TOP_KM} km range in whole ${BIN_KM} km bins: a defect in the kit, not in beat.mjs`);
  const binOf = (value) => Math.min(BINS - 1, Math.floor(value / BIN_KM));
  const classOf = (bin, step) => Math.floor(((bin + 0.5) * BIN_KM) / step);
  const round3 = (v) => Math.round(v * 1000) / 1000;

  /** The fill, four mesh cells at a time, as merged horizontal runs broken wherever the bin OR the
   *  country changes (the answer names the country). `k` is the (country, bin) pair the answer is
   *  keyed on — read only by the live-mark probe. */
  const bandFeatures = [];
  {
    const emit = (c0, c1, r, b, o) => {
      const x0 = c0 - BLEED;
      const x1 = Math.min(nx, c1) + BLEED;
      const y0 = r - BLEED;
      const y1 = Math.min(ny, r + FILL) + BLEED;
      const ring = [[x0, y0], [x1, y0], [x1, y1], [x0, y1], [x0, y0]].map((p) => {
        const [lon, lat] = toLonLat(p);
        return [round3(lon), round3(lat)];
      });
      bandFeatures.push({ type: "Feature", properties: { b, o, k: `${o}:${b}` }, geometry: { type: "Polygon", coordinates: [ring] } });
    };
    for (let r = 0; r < ny; r += FILL) {
      let start = -1;
      let curB = -1;
      let curO = -1;
      for (let c = 0; c < nx + FILL; c += FILL) {
        const k = r * nx + c;
        const on = c < nx && owner[k] >= 0;
        const b = on ? binOf(km[k]) : -1;
        const o = on ? owner[k] : -1;
        if (on && start >= 0 && b === curB && o === curO) continue;
        if (start >= 0) emit(start, c, r, curB, curO);
        start = on ? c : -1;
        curB = b;
        curO = o;
      }
    }
  }
  if (!(bandFeatures.length > 100)) throw new Error(`the field quantised to ${bandFeatures.length} cells — the study area is too small to draw (study more countries)`);

  /** Marching squares at three mesh cells; the ambiguous cases drawn as two segments. */
  const isolineFor = (level) => {
    const seg = [];
    const at = (c, r) => (owner[r * nx + c] < 0 ? -1 : km[r * nx + c] - level);
    for (let r = 0; r < ny - LINE_STRIDE; r += LINE_STRIDE)
      for (let c = 0; c < nx - LINE_STRIDE; c += LINE_STRIDE) {
        const a = at(c, r);
        const b = at(c + LINE_STRIDE, r);
        const d = at(c + LINE_STRIDE, r + LINE_STRIDE);
        const e = at(c, r + LINE_STRIDE);
        if ([a, b, d, e].some((v) => v === -1)) continue;
        const t = (p, q) => p / (p - q);
        const push = (p1, p2) => {
          const [ax, ay] = toLonLat(p1);
          const [bx, by] = toLonLat(p2);
          seg.push([[round3(ax), round3(ay)], [round3(bx), round3(by)]]);
        };
        const cell = LINE_STRIDE;
        const top_ = [c + cell * t(a, b), r];
        const right = [c + cell, r + cell * t(b, d)];
        const bottom = [c + cell * t(e, d), r + cell];
        const left = [c, r + cell * t(a, e)];
        const code = (a > 0 ? 1 : 0) | (b > 0 ? 2 : 0) | (d > 0 ? 4 : 0) | (e > 0 ? 8 : 0);
        if (code === 1 || code === 14) push(left, top_);
        else if (code === 2 || code === 13) push(top_, right);
        else if (code === 3 || code === 12) push(left, right);
        else if (code === 4 || code === 11) push(right, bottom);
        else if (code === 6 || code === 9) push(top_, bottom);
        else if (code === 7 || code === 8) push(left, bottom);
        else if (code === 5 || code === 10) {
          push(left, top_);
          push(right, bottom);
        }
      }
    return seg;
  };
  const isolineFeatures = [];
  const candidates = [];
  for (const level of LEVELS) {
    const coordinates = isolineFor(level);
    if (!coordinates.length) continue;
    isolineFeatures.push({ type: "Feature", properties: { level }, geometry: { type: "MultiLineString", coordinates } });
    const cells = [];
    for (let r = 0; r < ny; r += ANCHOR_SAMPLE)
      for (let c = 0; c < nx; c += ANCHOR_SAMPLE) {
        const k = r * nx + c;
        if (owner[k] >= 0 && Math.abs(km[k] - level) <= KM_PER_CELL) cells.push([c, r]);
      }
    candidates.push({ level, cells });
  }
  if (!isolineFeatures.length) throw new Error("no isoline was traced — the field is flat or empty (study more inland countries)");

  // ── what each step costs, in the field's own units ────────────────────────────────────────────
  const CELL_AREA_KM2 = KM_PER_CELL * KM_PER_CELL;
  const beyondCount = (level) => landKm.length - landKm.filter((v) => v <= level).length;
  const ERROR_KM = field.errorKm;
  const fmt = (v) => plain(beat.percent(v));
  const STEPS = STEPS_KM.map((step) => {
    const classes = TOP_KM / step;
    const drawn = LEVELS.filter((l) => l % step === 0).length;
    const s = { km: step, classes, drawn, half: step / 2, finest: step === FINEST, coarsest: step === COARSEST, isDefault: step === field.defaultStep, cellKm: KM_PER_CELL, errorKm: ERROR_KM, median: field.median, withinStep: within(step), topKm: TOP_KM };
    const label = plain(beat.stepLabel(step));
    const announce = plain(beat.stepAnnounce(step));
    if (!states(label, step)) throw new Error(`stepLabel(${step}) must print the step (${step}); it says "${label}"`);
    if (!announce.includes(label)) throw new Error(`stepAnnounce(${step}) must contain stepLabel(${step}) ("${label}"); it says "${announce}"`);
    const note = plain(beat.stepNote(s));
    for (const [what, n] of [["how many bands (s.classes)", classes], ["how many lines it draws (s.drawn)", drawn]])
      if (!new RegExp(`(^|\\D)${n}(\\D|$)`).test(digits(note))) throw new Error(`stepNote for the ${step} km step must state ${what} = ${n}; it says "${note}"`);
    const bad = foreign(note, [step, classes, drawn, step / 2, KM_PER_CELL, ERROR_KM, field.median, within(step), TOP_KM, BIN_KM, field.deepest, field.scaleErrorPc]);
    if (bad.length) throw new Error(`stepNote for the ${step} km step prints ${bad.join(", ")}, which its reading s does not carry (s.classes ${classes}, s.drawn ${drawn}, s.half ${step / 2}, s.errorKm ${ERROR_KM.toFixed(1)}, s.median ${field.median.toFixed(1)}, s.withinStep ${within(step).toFixed(1)}): take every number from s; it says "${note}"`);
    return { km: step, slug: `pas-${step}`, label, announce, note, isDefault: s.isDefault, classes };
  });
  if (!STEPS.some((s) => s.isDefault)) throw new Error(`no offered step is the default ${field.defaultStep}: a defect in the kit`);
  const CHIPS = Math.max(...STEPS.map((s) => s.classes));
  const bandDetailFor = (step) =>
    Array.from({ length: TOP_KM / step }, (_, k) => {
      const text = plain(beat.bandDetail({ lower: k * step, upper: (k + 1) * step, step }));
      for (const [what, v] of [["lower", k * step], ["upper", (k + 1) * step], ["step", step]])
        if (!states(text, v)) throw new Error(`bandDetail({ lower: ${k * step}, upper: ${(k + 1) * step}, step: ${step} }) must print its ${what} (${v}); it says "${text}"`);
      return text;
    });
  const binDetail = Array.from({ length: BINS }, (_, b) => {
    const text = plain(beat.binDetail({ lower: b * BIN_KM, upper: (b + 1) * BIN_KM }));
    for (const v of [b * BIN_KM, (b + 1) * BIN_KM]) if (!states(text, v)) throw new Error(`binDetail({ lower: ${b * BIN_KM}, upper: ${(b + 1) * BIN_KM} }) must print ${v}; it says "${text}"`);
    return text;
  });
  if (new Set(binDetail).size !== BINS) throw new Error("binDetail answers two distances with the same sentence: print lower and upper");
  const levelRows = LEVELS.map((level) => {
    const cells = beyondCount(level);
    const l = { level, areaKm2: cells * CELL_AREA_KM2, beyondPc: (cells / landKm.length) * 100, drawnBy: STEPS_KM.filter((s) => level % s === 0) };
    const detail = plain(beat.levelDetail(l));
    if (!states(detail, level)) throw new Error(`levelDetail must print the line's own level (${level}); it says "${detail}"`);
    if (!states(detail, l.areaKm2)) throw new Error(`levelDetail must print l.areaKm2 rounded (${Math.round(l.areaKm2)}); it says "${detail}"`);
    return { level, beyond: fmt(l.beyondPc), detail };
  });
  const stepLegend = plain(beat.stepLegend);
  const nearLabel = plain(beat.nearLabel);
  const farLabel = plain(beat.farLabel(TOP_KM));
  if (!states(farLabel, TOP_KM)) throw new Error(`farLabel(${TOP_KM}) must print the ramp's top, ${TOP_KM}; it says "${farLabel}"`);
  const tableCaption = plain(beat.tableCaption({ levels: LEVELS.length }));
  if (!states(tableCaption, LEVELS.length) && /\d/.test(tableCaption)) throw new Error(`tableCaption({ levels }) prints a number other than levels (${LEVELS.length}); it says "${tableCaption}"`);
  const columns = beat.columns.map(plain);
  const eyebrow = plain(beat.eyebrow);
  const caveatHead = plain([beat.limits].flat()[0]);
  const source = plain(beat.source);
  const hint = plain(beat.hint);
  const reading = plain([beat.reading].flat()[0]);
  const claimNote = plain([beat.claimNote].flat()[0]);
  const limitNote = plain([beat.limitNote].flat()[0]);
  const alt = plain([beat.alt].flat()[0]);

  // ── WHAT WEB MERCATOR COSTS THIS SUBJECT ─────────────────────────────────────────────────────
  // The field is MEASURED on the equal-area grid, so no printed number moves; the PICTURE does.
  // Page area against true area, cell by cell (an equal-area cell drawn at 1/cos² of its latitude).
  const RAD = Math.PI / 180;
  const stretch = new Map();
  let pageArea = 0;
  let trueArea = 0;
  for (let i = 0; i < km.length; i += 1) {
    if (owner[i] < 0) continue;
    const r = Math.floor(i / nx);
    const [, lat] = toLonLat([i - r * nx, r]);
    const drawn = (1 / Math.cos(lat * RAD)) ** 2;
    pageArea += drawn;
    trueArea += 1;
    const s = stretch.get(codes[owner[i]]) ?? { page: 0, real: 0 };
    s.page += drawn;
    s.real += 1;
    stretch.set(codes[owner[i]], s);
  }
  const weightOf = (c) => stretch.get(c).page / stretch.get(c).real;
  const inflated = beat.inflated ?? [...stretch.keys()].sort((a, b) => weightOf(b) - weightOf(a)).slice(0, 4);
  const notMeasured = inflated.filter((c) => !stretch.has(c));
  if (notMeasured.length) throw new Error(`inflated names ${notMeasured.join(", ")}, which the field does not cover: name study countries (or leave inflated out)`);
  const pageShare = (inflated.reduce((s, c) => s + stretch.get(c).page, 0) / pageArea) * 100;
  const trueShare = (inflated.reduce((s, c) => s + stretch.get(c).real, 0) / trueArea) * 100;
  if (!(pageShare > trueShare)) throw new Error(`${inflated.join(", ")} cover ${pageShare.toFixed(1)} % of the drawn land for ${trueShare.toFixed(1)} % of the real land: Mercator does not inflate them — name the northernmost countries in inflated, or leave it out`);
  const merc = { names: inflated.map(NAME), pageShare, trueShare, factor: pageShare / trueShare };
  const mercator = plain(beat.mercator(merc));
  for (const [what, v] of [["pageShare", pageShare], ["trueShare", trueShare]])
    if (!states(mercator, v)) throw new Error(`mercator(m) must state m.${what} (${v.toFixed(1)}, rounded as you print it); it says "${mercator}"`);
  console.log(`what Mercator costs: ${merc.names.join(" + ")} ${pageShare.toFixed(1)} % of the drawn land for ${trueShare.toFixed(1)} % of the land measured (×${merc.factor.toFixed(2)}); the field is measured in LAEA and no printed number moves`);
  const caveat = `${caveatHead} ${mercator}`;
  console.log(`${field.cells} land cells · median ${field.median.toFixed(1)} km · farthest ${field.deepest.toFixed(1)} km (${NAME(field.deepestIso)}) · mesh ${KM_PER_CELL.toFixed(1)} km`);

  // ── ONE direction, its plate ──────────────────────────────────────────────────────────────────
  const registers = {
    display: title,
    eyebrow,
    body: `${caveat} ${reading} ${source} ${hint}`,
    axis: `${stepLegend} ${nearLabel} ${farLabel} ${tableCaption} ${columns.join(" ")} ${STEPS.map((s) => `${s.label} ${s.announce}`).join(" ")} ${levelRows.map((r) => `${r.level} ${r.beyond}`).join(" ")}`,
    annot: `${claimNote} ${limitNote} ${STEPS.map((s) => s.note).join(" ")}`,
    value: LEVELS.map(String).join(" "),
  };
  const { label, direction } = pickDirection(HERE, plainRegisters(registers), beat.evidenceLevels ?? 3);
  const tints = plateTints(direction, { landDose: LAND_DOSE });
  const plateFacts = ensurePlate({ here: HERE, label, water: tints.water, land: tints.land, frame: PLATE_FRAME, args: ["--countries", join(HERE, "shapes.geojson")] });
  const FRAME = plateFacts.frame;
  const CORNERS = plateFacts.frameCorners;
  const MID_LAT = (CORNERS.north + CORNERS.south) / 2;

  // WHICH GROUNDS THE BANDS OCCUPY, measured on the plate's own pixels: the accent paints the bands
  // (the isolines are the direction's ink, walked to 3:1 against the land).
  const toFrame = frameProjector(plateFacts);
  const OCCUPANCY = markOccupancy(
    bandFeatures.map((f) => ({ kind: "area", rings: f.geometry.coordinates.map((ring) => ring.map(toFrame)) })),
    plateWaterField(join(HERE, "plate", label)),
  );
  console.log(occupancyLine(OCCUPANCY));
  const colourProblems = guardColour(direction, plateGrounds(tints, OCCUPANCY));
  if (colourProblems.length) throw new Error(`the direction cannot carry this beat's colour: ${colourProblems.join("; ")} — change the accent in PALETTE.md`);

  // ── WHERE EACH LEVEL PRINTS ITS OWN BREAK — chosen, not named ────────────────────────────────
  // For each level in turn, the candidate on its own line farthest from every break already placed;
  // the tightest pair a step draws together is held to a floor derived from the label's own box at
  // the delivered scale.
  const KM_PER_DEG_LON = 111.32 * Math.cos((MID_LAT * Math.PI) / 180);
  const ANCHOR_MIN_KM = LABEL_CLEARANCE_PX * plateFacts.degreesPerPixel * (FRAME.width / DELIVERED_BOX_PX) * KM_PER_DEG_LON;
  const labels = [];
  const placed = [];
  for (const { level, cells } of candidates) {
    if (!cells.length) continue;
    let best = null;
    for (const [c, r] of cells) {
      let nearest = Infinity;
      for (const [pc, pr] of placed) nearest = Math.min(nearest, Math.hypot(c - pc, r - pr));
      if (!best || nearest > best.nearest) best = { c, r, nearest };
    }
    placed.push([best.c, best.r]);
    const [lon, lat] = toLonLat([best.c, best.r]);
    labels.push({ level, lon: round3(lon), lat: round3(lat), text: `${level}` });
  }
  for (const step of STEPS_KM) {
    const on = labels.map((l, i) => ({ level: l.level, at: placed[i] })).filter((x) => x.level % step === 0);
    let worst = Infinity;
    let pair = null;
    for (let i = 0; i < on.length; i += 1)
      for (let j = i + 1; j < on.length; j += 1) {
        const gap = Math.hypot(on[i].at[0] - on[j].at[0], on[i].at[1] - on[j].at[1]) * KM_PER_CELL;
        if (gap < worst) {
          worst = gap;
          pair = [on[i].level, on[j].level];
        }
      }
    console.log(`step ${step} km · ${on.length} breaks · tightest pair ${pair ? pair.join(" / ") : "—"} at ${worst === Infinity ? "—" : `${worst.toFixed(0)} km`} (floor ${ANCHOR_MIN_KM.toFixed(0)} km)`);
    if (worst < ANCHOR_MIN_KM)
      throw new Error(`at the ${step} km step the breaks of the ${pair.join(" and ")} km lines stand ${worst.toFixed(0)} km apart, under the ${ANCHOR_MIN_KM.toFixed(0)} km their own boxes need: the map would print one number on top of another. This study area's field is too tight for the kit's label placement — study more countries, or tell the journalist`);
  }

  // ── the ramp, read by both halves ────────────────────────────────────────────────────────────
  const furniture = deriveFurniture(direction.ground);
  const { ramp, activeRamp } = contourRamp({ ground: direction.ground, accent: direction.accent, ink: furniture.ink, plateLand: tints.land, tones: CHIPS });
  const spread = (r, classes) => Array.from({ length: classes }, (_, k) => r[Math.min(r.length - 1, Math.round((k * (r.length - 1)) / Math.max(1, classes - 1)))]);
  const rampFor = (step) => spread(ramp, TOP_KM / step);
  const activeFor = (step) => spread(activeRamp, TOP_KM / step);
  const rampOf = (slug) => rampFor(STEPS.find((s) => s.slug === slug).km);
  for (const step of STEPS) {
    const r = rampFor(step.km);
    let worst = Infinity;
    for (let i = 1; i < r.length; i += 1) worst = Math.min(worst, contrast(r[i], r[i - 1]));
    console.log(`step ${step.km} km · ${r.length} bands · neighbours at ${worst === Infinity ? "—" : `${worst.toFixed(3)}:1`}`);
  }

  // ── the live plan ─────────────────────────────────────────────────────────────────────────────
  const lang = beat.lang ?? storyLanguage(HERE) ?? "en";
  const live = {
    style: plateFacts.style,
    tints,
    countryGround: countryGround({ ground: direction.ground, land: tints.land, water: tints.water, ink: furniture.ink }),
    studyBounds: { west: plateFacts.bounds[0][0], south: plateFacts.bounds[0][1], east: plateFacts.bounds[1][0], north: plateFacts.bounds[1][1] },
    frame: FRAME,
    degreesPerPixel: plateFacts.degreesPerPixel,
    binKm: BIN_KM,
    bins: BINS,
    bands: { type: "FeatureCollection", features: bandFeatures },
    isolines: { type: "FeatureCollection", features: isolineFeatures },
    labels,
    steps: STEPS.map((step) => {
      const fills = rampFor(step.km);
      const actives = activeFor(step.km);
      return {
        km: step.km,
        slug: step.slug,
        label: step.label,
        announce: step.announce,
        note: step.note,
        fillByBin: Array.from({ length: BINS }, (_, b) => fills[classOf(b, step.km)]),
        activeByBin: Array.from({ length: BINS }, (_, b) => actives[classOf(b, step.km)]),
        classByBin: Array.from({ length: BINS }, (_, b) => classOf(b, step.km)),
        bandDetail: bandDetailFor(step.km),
      };
    }),
    defaultSlug: STEPS.find((s) => s.isDefault).slug,
    line: { colour: adjustToContrast(furniture.ink, tints.land, 3) ?? furniture.ink, width: 1.1 },
    countries: codes.map(NAME),
    binDetail,
    locale: beat.mapLocale ?? (lang.startsWith("fr") ? { title: "Carte", zoomIn: "Zoomer", zoomOut: "Dézoomer" } : { title: "Map", zoomIn: "Zoom in", zoomOut: "Zoom out" }),
    changeMs: CHANGE_MS,
    smallest: { name: plain(beat.smallestLabel ?? "one painted cell"), spanDeg: (FILL * KM_PER_CELL) / KM_PER_DEG_LON },
  };
  const livePlan = liveContourPlan(live);
  const { maplibreJs, maplibreCss, styleModule } = liveAssets(HERE);
  const liveScript = liveContourScript(live, { scope: ".chart-figure", styleModule, controlName: STEP_ID_PREFIX });
  // The second derivation the read-back guard holds the plan against — walked from the BREAKS.
  const expected = (slug) => {
    const step = STEPS.find((s) => s.slug === slug);
    const fills = rampFor(step.km);
    const breaks = Array.from({ length: fills.length }, (_, k) => (k + 1) * step.km);
    return Array.from({ length: BINS }, (_, b) => {
      const mid = (b + 0.5) * BIN_KM;
      for (let k = 0; k < breaks.length; k += 1) if (mid < breaks[k]) return fills[k];
      return fills[fills.length - 1];
    });
  };

  // Metadata for the format's interaction plan (English is fine; it is not printed).
  const interaction = {
    earns: `A still must pick one contour interval and can only say that it did; this page puts ${STEPS.length} intervals on the same measured field and lets the reader watch the same point go from a ${FINEST} km band to a ${COARSEST} km one without moving.`,
    controls: [
      {
        question: `${TOP_KM / field.defaultStep} bands — cut at which interval, and what disappears if the cut is wider?`,
        gesture: "toggle-a-comparison",
        changes: `The field re-cuts between ${CHIPS} bands and ${TOP_KM / COARSEST} without any measurement changing; the lines the interval does not keep stop being drawn and their table rows dim in place; a sentence says what this interval costs against the ${KM_PER_CELL.toFixed(1)} km mesh.`,
        parameter: "the interval between two lines",
        authorPicked: String(field.defaultStep),
        readerPicks: STEPS_KM.map(String),
        heldStill: [".chart-header", ".chart-source"],
      },
      {
        question: "How far is this point exactly — and which band does the interval put it in?",
        gesture: "ask-a-mark",
        changes: `The WHOLE band the chosen interval puts this point in lights up across the map, and the answer gives the country, the measured distance to the ${BIN_KM} km bin, and the band.`,
        parameter: "which point of the field is in question",
        authorPicked: NAME(field.deepestIso),
        readerPicks: "every mark",
        heldStill: [".chart-header", ".chart-source"],
      },
      {
        question: "And every line, without the map — or without JavaScript?",
        gesture: "open-the-full-table",
        changes: `The ${LEVELS.length} traceable lines open under the map, each with the share of land beyond it; the ones the chosen interval does not draw are dimmed in pure CSS.`,
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
      component: DirectedContourWeb,
      props: {
        plate,
        plateLand: tints.land,
        steps: STEPS,
        levelRows,
        chips: CHIPS,
        rampOf,
        livePlan,
        liveScript,
        liveHint: hint,
        maplibreCss,
        maplibreJs,
        stepLegendLabel: stepLegend,
        nearLabel,
        farLabel,
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
        limitNote,
        alt,
        interaction,
        direction,
        ground: direction.ground,
        accent: direction.accent,
      },
      outDir: join(HERE, "renders"),
      name: `${label}.html`,
    });

  // The photograph is of the map's own BOX, which is what the words leave: the stamp carries them
  // too, so a sentence that changes height re-photographs (the flow worked example paid for this).
  const { outPath, keyedPath } = await renderLiveMapPage({ here: HERE, label, key, stamp: { livePlan, registers }, pageOf });
  assertSteppingReachesTheLayers(readFileSync(outPath, "utf8"), live, expected, plateFacts.style, { where: `renders/${label}.html` });
  console.log(`rendered renders/${label}.html (keyed copy for review: shots/${label}.local.html)`);

  // What a pointer on the land answers, per (country, bin) under the opening step — the tooltip the
  // live script builds: country · measured distance · band. Keyed "o:b" — a string, because an object
  // with integer keys iterates them in numeric order and would undo the order below. ORDERED so that two consecutive probes
  // never share a bin: the worked example's script refreshes its tooltip only when the BIN changes
  // (live-contour.ts `show`), so a pointer crossing a border inside one bin keeps the previous
  // country's name — an inherited defect, reported, not patched here (skills/ is not the kit's).
  const opening = live.steps.find((s) => s.slug === live.defaultSlug);
  const pairs = [...new Set(bandFeatures.map((f) => f.properties.o * BINS + f.properties.b))].sort((a, b) => a - b);
  const ordered = [];
  const pool = [...pairs];
  while (pool.length) {
    const last = ordered.length ? ordered[ordered.length - 1] % BINS : -1;
    const at = pool.findIndex((k) => k % BINS !== last);
    ordered.push(pool.splice(at < 0 ? 0 : at, 1)[0]);
  }
  const expectedTips = Object.fromEntries(
    ordered.map((k) => {
      const o = Math.floor(k / BINS);
      const b = k % BINS;
      return [`${o}:${b}`, `${live.countries[o]} · ${binDetail[b]} · ${opening.bandDetail[opening.classByBin[b]]}`];
    }),
  );
  // The hover shot points at the deepest country's farthest bin — the claim's own point.
  const deepestOwner = codes.indexOf(field.deepestIso);
  const farthestCell = `${deepestOwner}:` + Math.max(...bandFeatures.filter((f) => f.properties.o === deepestOwner).map((f) => f.properties.b));
  // The value table's column headings are set bold, in a weight the trunk's subsetter does not embed
  // for this component (the worked example's own page fails the same three checks). Waived only for
  // exactly the characters those headings carry, so a word elsewhere that misses its face still fails.
  const headingChars = new Set(columns.join("").replace(/\s/g, "")).size;
  let notFound = 0;
  await verifyLiveMap({
    here: HERE,
    label,
    keyedPath,
    waivers: [
      // The type's design: the table rows the opening step does NOT draw are dimmed on the spot, so
      // verify-web reads them as marks the default view dims (measured on the worked example too).
      { test: /^\s*FAIL [a-z-]+( \(no JS\))?: the default view dims nothing — the full claim is on screen\b/, why: "inherited from the worked example: the table dims the levels the opening step does not draw — that dimming IS the step control's no-script half" },
      { test: /^\s*FAIL phone 375x812: no vertical scroll inside the visual\b/, why: "inherited from the worked example: on a phone the map keeps its height and the page scrolls (full-width ruling)" },
      { test: /^\s*FAIL phone 375x812: the source line is on screen\b/, why: "inherited from the worked example: the same phone scroll puts the source line below the fold" },
      { test: /^\s*FAIL phone: chart-stack: choosing "pas-\d+" does not move the drawing\s+— \d+,\d+ \d+x\d+ → \d+,\d+ \d+x\d+\s*$/, why: "inherited from the worked example (its own page fails it too): on a phone the step's sentence wraps to another height and the map box moves by a few pixels" },
      { test: /^\s*FAIL typeface: .+ 700 normal is carried at that weight and style\s*$/, why: "inherited from the worked example: the table's column headings are bold in a weight the subsetter does not embed for this component" },
      { test: new RegExp(`^\\s*FAIL typeface: .+ covers all ${headingChars} characters this beat sets in it\\b`), why: "inherited from the worked example: the same column headings, the only text set in that weight" },
      { test: new RegExp(`^\\s*FAIL interaction: .+ sets all ${headingChars} characters this beat can reveal\\b`), why: "inherited from the worked example: the same column headings, the only text set in that weight" },
    ],
    probe: {
      layers: ["mw-bands"],
      keyProp: "k",
      expected: expectedTips,
      subject: farthestCell,
      // A (country, bin) run narrower than the probe's 3 px grid may be missed; every one FOUND must
      // answer its own reading, and most must be found (held below).
      mayMiss: () => {
        notFound += 1;
        return true;
      },
    },
  });
  const total = Object.keys(expectedTips).length;
  if (notFound > total * 0.25)
    throw new Error(`the live-mark probe found only ${total - notFound} of ${total} (country, distance) cells on screen at 1600x800: the live map did not draw the field where the plan puts it`);
});
