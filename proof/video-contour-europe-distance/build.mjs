// EVERYTHING ONE DIRECTION'S RENDER IS HANDED, BUILT IN BUN — the words, the colours, the live map's plan and its still
// camera, the sweep's raster on the map's grid, the key, the curve and the credit placed on the MEASURED map, every
// line's number seated on its own line, and the states.
//
// The map is MapTiler's, drawn live under the overlay (`DirectedContourVideo.tsx`). Where the sea is under a box is
// not computed here: `measure.mjs` read it once on the real map and froze it in `measured.json`, with the digest of
// the plan it was read on. A plan that changed since is refused.
//
// Runs in Bun only.

import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { adjustToContrast, contrast, mix, NON_TEXT_CONTRAST_MIN, TEXT_CONTRAST_MIN } from "#shared/chart-beat/colour.mjs";
import { deriveFurniture } from "#shared/chart-beat/render-still.mjs";
import { frameInsetFor, sizeFor, videoExportSize } from "#shared/chart-video/sizes.mjs";
import { readDirection } from "#shared/design-base/read-direction.mjs";
import { EYEBROW_TO_DISPLAY, registerOf } from "#shared/design-base/register.mjs";
import { resolveDirectionFamilies } from "#shared/design-base/resolve-families.mjs";
import { SEA_LAND_MIN } from "#shared/map-beat/tints.mjs";
import { applyCase } from "../../skills/map-beat/scripts/registers.mjs";
import { BAND_PROBE, bandOf, CREDIT_ONE_LINE, DRAWN_WIDER, haloOf, sourceCreditFor, titleCardFor, verticalInsetFor, widthOf } from "../../skills/map-beat/scripts/shots.mjs";
import { videoRegistersOf } from "../../skills/map-beat/scripts/video-registers.mjs";
import { camerasOf, kmPerPxAt, lonLatLinesOf, mapPlanFor, mapSeatsOf, projectorOf, sweepOf, withNumbers } from "./map-plan.mjs";
import { planDigestOf } from "./measure.mjs";
import { statesFor } from "./states.mjs";
import { loadSubject, lonLatOfFrame, NAMES } from "./subject.mjs";
import { CONTOUR_VIDEO_TIMING } from "./timing-contract.ts";

const HERE = dirname(fileURLToPath(import.meta.url));
export const ROOT = join(HERE, "..", "..");
export const DIRECTIONS = join(ROOT, "docs", "design-base", "directions");
/** The size this run exports at — `--size`, landscape when nothing asks. R2 names three and
 *  everything under it already answered per size; only this line pinned the beat to one. */
export const SIZE = videoExportSize();
export const REGISTER_NAMES = ["display", "eyebrow", "body", "annot", "value", "axis"];
const NB = "\u00A0";
const SEAT_STEP = 10;
/** The sea probes, in order: each is a seat `measure.mjs` projects on the real map, and the first that lands
 *  inside the frame on the plan's water tint says what the sea IS. */
const SEA_PROBES = ["atlantic", "biscay"];
/** The swatch beside « hors mesure », × the axis lead. */
const SWATCH_W = 1.2;
const SWATCH_H = 0.4;
const SWATCH_GAP = 0.3;
const ROW_GAP = 0.35;
/** The curve's panel height, × the axis lead; its inner margin, × the axis lead. */
const CHART_H = 7;
const CHART_PAD = 0.3;
/** The narrowest the curve may be, × the key's width. */
const CHART_MIN = 0.8;
/** The shortest the curve may be, × the axis lead — the floor of the ladder a frame that is not 16:9 steps down
 *  when `CHART_H` finds no water. Below it the curve is a stripe and its slope stops being an argument. */
const CHART_MIN_H = 4;
/** The share of land the key and the curve may stand over. */
export const PANEL_LAND = 0.03;
/** A line this close to the median gives way to it: at the scale of Europe the two run a few pixels apart. */
export const YIELD_KM = 50;
/** Two measured cells are one colour when no channel differs by more than this — the tolerance of a cell's mean. */
const SAME_CELL = 3;
/** The latitude the sweep's rim is sized at: the measuring projection's centre. */
const RIM_LAT = 52;
/** The farthest point's number stands this far from its centre, × the dot: past the ring (2.2) and its stroke. */
export const SUMMIT_OFFSET = 3.6;
/** The air a block in the ground band keeps from the band's edges and from the block above it, × the axis lead — the
 *  same `gap` every other pair of blocks in this beat is held apart by. */
const BAND_AIR = 0.25;
/** The least share of the frame the live map may be left with once the band has taken its room — the static map
 *  beat's `MIN_MAP_SHARE`, and its reasoning: below a third the map stops being the largest single thing in the
 *  frame and the beat is a caption with an illustration. */
const MIN_MAP_SHARE = 1 / 3;

/**
 * THE GROUND BAND — WHAT A SQUARE FRAME MAKES POSSIBLE, AND WHAT THE OTHER FORMATS ALREADY DRAW.
 *
 * Everything this beat stands over the map — the key, the credit, the curve — is placed by the same rule: over open
 * water, or at worst over `PANEL_LAND` of land. At 16:9 Europe is fitted by its HEIGHT and the width left over is the
 * Atlantic, a band some 810 px wide and the whole height of the frame; at 9:16 it is fitted by its WIDTH and the
 * Norwegian Sea runs across the top. A SQUARE frame fits the same ground by its width and has no spare height at all:
 * measured 2026-09-24 on the square whole-map picture, the bottom 100 px of the frame are 72 % land and the top 100 px
 * are 27 % — the frame is Europe and nothing else. That is what the three directions refused with: « a 677x126 key
 * finds nowhere on a 1080x1080 stage over at most 3 % land », and the key cannot narrow, because its width is the
 * longest count « 100 % à moins de 682 km » set at the 36 px floor.
 *
 * So at square the frame overrides the rule that the live map takes the whole of it: a band of the direction's own
 * ground across the FOOT carries what the map has no room for, and the live map keeps the whole width and is fitted
 * and raised into the band above it (`map-plan.mjs`, `camerasOf`). This is a DIFFERENT DRAWING of the same argument,
 * not a degraded one — the key and the credit cross no coast because they cross no map at all.
 *
 * THE BAND CARRIES THE KEY, THE CURVE AND THE CREDIT — the whole column the landscape frame hangs down its left
 * margin — and it was MEASURED down to two of them first. The first band drawn here carried the key and the credit
 * alone, leaving the map 761-780 px of the 1080 and the curve its own search; measured 2026-09-24, all three
 * directions refused it: « the curve finds nowhere over at most 3 % land, 542-677 wide and 190-333 tall, on a
 * 1080x767 map ». A square map of Europe has no water for any of the three, so the band carries all three.
 *
 * THE CURVE JOINS AT THE FLOOR OF ITS OWN HEIGHT LADDER, not at its full height. In the band nothing competes with it
 * for water; the only thing it competes with is the map, and every pixel it takes above `CHART_MIN_H` is a pixel
 * Europe is drawn smaller by. `CHART_MIN_H` is already this beat's statement of how short the panel may be before
 * « the curve is a stripe and its slope stops being an argument » — so it is the honest rung to stand on here, and it
 * buys the map some 140 px back.
 *
 * THE MAP STAYS THE SUBJECT: a band that leaves it under `MIN_MAP_SHARE` of the frame is refused with the arithmetic.
 */
function bandFor({ stage, inset, vInset, air, gap, key, curveHeight, credit }) {
  const height = air + key.height + air + curveHeight + air + credit.height + vInset;
  const y = stage.height - height;
  const mapBand = { width: stage.width, height: y };
  if (mapBand.height < stage.height * MIN_MAP_SHARE)
    throw new Error(
      `the ground band is ${Math.round(height)}px tall and leaves the map ${Math.round(mapBand.height)}px of a ` +
        `${stage.height}px frame, under the ${Math.round(stage.height * MIN_MAP_SHARE)}px a map beat keeps for its map. ` +
        `Give the beat a shorter credit, or fewer rows in the key.`,
    );
  return {
    x: 0,
    y,
    width: stage.width,
    height,
    mapBand,
    keyAt: { x: inset, y: y + air },
    curveAt: { x: inset, y: y + air + key.height + air, width: key.width, height: curveHeight },
    creditAt: { x: inset, y: stage.height - vInset - credit.height },
  };
}

export function loadBeat() {
  const subject = loadSubject();
  const cameras = camerasOf(sizeFor(SIZE));
  return { subject, states: statesFor(subject), copy: copyOf(subject), cameras, mapSeats: mapSeatsOf(subject), sweep: sweepOf(subject, cameras.whole) };
}

const n0 = (v) => Math.round(v).toLocaleString("fr-FR").replace(/[\u202F\u00A0\u2009]/g, NB);

export function copyOf(subject) {
  const { field, MEDIAN, LEVELS } = subject;
  const attribution = `©${NB}MapTiler ©${NB}OpenStreetMap`;
  return {
    eyebrow: "Géographie · Europe",
    title: [`La moitié de l’Europe est à moins de ${n0(field.median)}${NB}km de la mer`, `L’Europe, mesurée depuis la mer`],
    count: `{p}${NB}% à moins de {km}${NB}km`,
    outside: "hors mesure",
    levels: LEVELS.map((level) => ({ level, label: `${level}${NB}km` })),
    summit: `${n0(field.deepest)}${NB}km`,
    // One line, over open sea, with the map's attribution: the longest form the measured sea holds is set. The
    // measured sea is about 810 px wide inside the margins (south of Iceland): the tracked nocturne keeps only the
    // attribution — provisional, the owner to rule, as on the choropleth pilot.
    source: [`Natural Earth · grille de 6${NB}km · ${attribution}`, `Natural Earth · ${attribution}`, attribution].map((form) => form.replaceAll(" · ", `${NB}· `)),
    medianLevel: MEDIAN,
    deepestName: NAMES[field.deepestIso],
  };
}

/** Every text the count can show, from 0 km to the farthest point — the widest sets the key's width. */
function countTexts(copy, subject) {
  const out = new Set();
  for (let km = 0; km <= Math.round(subject.field.deepest); km++) {
    const p = Math.round(subject.field.within[Math.min(km, subject.field.within.length - 1)]);
    out.add(copy.count.replace("{p}", p).replace("{km}", km));
  }
  out.add(copy.count.replace("{p}", 100).replace("{km}", Math.round(subject.field.deepest)));
  return [...out];
}

export function textPerRegisterOf(copy) {
  return {
    display: copy.title.join(" "),
    eyebrow: copy.eyebrow,
    body: copy.source.join(" "),
    annot: copy.summit,
    value: `${copy.count} 0123456789 ${copy.summit}`,
    axis: [...copy.levels.map((l) => l.label), copy.outside, ...copy.source].join(" "),
  };
}

const touches = (a, b, gap = 0) => a.x < b.x + b.width + gap && b.x < a.x + a.width + gap && a.y < b.y + b.height + gap && b.y < a.y + a.height + gap;

// ── the measured map ─────────────────────────────────────────────────────────────────────────────────

const MEASURED = join(HERE, "measured.json");
let measuredCache = null;
/** `measured.json` AT THIS SIZE, read once: what `measure.mjs` froze on the real map for this frame shape.
 *  The file is keyed by export size because the camera is fitted to the stage — a portrait camera is a different
 *  camera, over a different plan, with a different digest — so one frozen entry cannot serve three sizes. A size
 *  that has not been measured is named here with the command that measures it, rather than read as a plan drift. */
export function readMeasured() {
  if (measuredCache) return measuredCache;
  if (!existsSync(MEASURED)) throw new Error("no measured.json beside the beat — run measure.mjs with the worktree's .env loaded");
  const all = JSON.parse(readFileSync(MEASURED, "utf8"));
  if (!all[SIZE])
    throw new Error(
      `measured.json holds no ${SIZE} entry — measured so far: ${Object.keys(all).join(", ") || "nothing"}. ` +
        `Run: set -a && . ./.env && set +a && bun proof/video-contour-europe-distance/measure.mjs --size ${SIZE}`,
    );
  measuredCache = all[SIZE];
  return measuredCache;
}
/** The measured colour of the cell under a stage point. */
export const cellAt = (grid, x, y) => grid.colours[Math.min(grid.rows - 1, Math.max(0, Math.floor(y / grid.cell))) * grid.cols + Math.min(grid.cols - 1, Math.max(0, Math.floor(x / grid.cell)))];
export const near = (a, b, tolerance = SAME_CELL) => [1, 3, 5].every((k) => Math.abs(Number.parseInt(a.slice(k, k + 2), 16) - Number.parseInt(b.slice(k, k + 2), 16)) <= tolerance);
/** HOW MANY CELLS OF A KIND a box covers, in constant time: a summed-area table over the grid. */
export function countOf(grid, kind) {
  const { cols, rows } = grid;
  const sums = new Float64Array((cols + 1) * (rows + 1));
  for (let j = 0; j < rows; j++)
    for (let i = 0; i < cols; i++) sums[(j + 1) * (cols + 1) + i + 1] = (kind(grid.colours[j * cols + i]) ? 1 : 0) + sums[j * (cols + 1) + i + 1] + sums[(j + 1) * (cols + 1) + i] - sums[j * (cols + 1) + i];
  return (box) => {
    const i0 = Math.max(0, Math.floor(box.x / grid.cell));
    const i1 = Math.min(cols - 1, Math.floor((box.x + box.width) / grid.cell)) + 1;
    const j0 = Math.max(0, Math.floor(box.y / grid.cell));
    const j1 = Math.min(rows - 1, Math.floor((box.y + box.height) / grid.cell)) + 1;
    const at = (i, j) => sums[j * (cols + 1) + i];
    return { count: at(i1, j1) - at(i0, j1) - at(i1, j0) + at(i0, j0), total: (i1 - i0) * (j1 - j0) };
  };
}

// ── one direction ────────────────────────────────────────────────────────────────────────────────────

/**
 * @param {{ measured?: any }} [options]  `measured: null` builds the plan and the camera only — what `measure.mjs` reads.
 */
export function buildDirection(id, { subject, states, copy, cameras: beatCameras, sweep: beatSweep }, { measured = undefined } = {}) {
  const direction = resolveDirectionFamilies(readDirection(join(DIRECTIONS, `${id}.md`)), textPerRegisterOf(copy));
  const resolved = Object.fromEntries(REGISTER_NAMES.map((name) => [name, registerOf(direction, name)]));
  const registers = videoRegistersOf(resolved, SIZE);
  const k = registers.axis.fontSize / resolved.axis.fontSize;
  const row = sizeFor(SIZE);
  const stage = { width: row.width, height: row.height };
  const inset = frameInsetFor(SIZE);
  const vInset = verticalInsetFor(SIZE);
  for (const [name, r] of Object.entries(registers))
    if (!(r.fontSize >= row.minTypePx)) throw new Error(`register ${name} is ${r.fontSize}px, under the ${row.minTypePx}px floor`);
  const { field } = subject;
  const { axis, value } = registers;
  const gap = 0.25 * axis.lead;

  // ── the shots every type shares ──────────────────────────────────────────────────────────────────────────
  const titleCard = titleCardFor({ registers, eyebrow: copy.eyebrow, title: copy.title, size: SIZE, eyebrowToDisplay: EYEBROW_TO_DISPLAY });
  /** The credit on one line, in every form that holds one — the longest that finds open sea is set. */
  const credits = copy.source.flatMap((form) => {
    try {
      return [sourceCreditFor({ registers, forms: [form], size: SIZE, k, ...CREDIT_ONE_LINE })];
    } catch {
      return [];
    }
  });
  if (!credits.length) throw new Error("no form of the source holds one line");
  const sourceRegister = credits[0].register;

  // ── colours: the scrolly's measured land step, the fill a tint of the accent, lines and numbers floored ──────
  const { ground, accent } = direction;
  const { ink, muted } = deriveFurniture(ground);
  let dose = 0.085;
  while (contrast(mix(ground, ink, dose), ground) < SEA_LAND_MIN && dose < 0.4) dose += 0.005;
  if (contrast(mix(ground, ink, dose), ground) < SEA_LAND_MIN) throw new Error(`no step of the ink separates land from sea by ${SEA_LAND_MIN}:1 on ${ground}`);
  const land = mix(ground, ink, dose);
  const outside = mix(ground, ink, dose / 2);
  const tint = mix(land, accent, 0.22);
  const floorOn = (colour, floor, what) => {
    let c = colour;
    for (const bg of [land, tint]) if (contrast(c, bg) < floor) c = adjustToContrast(c, bg, floor) ?? c;
    for (const bg of [land, tint]) if (contrast(c, bg) < floor - 1e-9) throw new Error(`${what} clears ${floor}:1 on one of the land and the fill, not on both`);
    return c;
  };
  const plain = copy.levels.filter((l) => l.level !== copy.medianLevel);
  const lineInk = Object.fromEntries(
    copy.levels.map((l) => [
      l.level,
      l.level === copy.medianLevel
        ? floorOn(accent, NON_TEXT_CONTRAST_MIN, "the median line")
        : floorOn(mix(mix(ground, ink, 0.35), accent, plain.length > 1 ? plain.indexOf(l) / (plain.length - 1) : 1), NON_TEXT_CONTRAST_MIN, `the ${l.level} km line`),
    ]),
  );
  const onGround = (c) => adjustToContrast(c, ground, TEXT_CONTRAST_MIN);
  const colours = {
    ground,
    land,
    outside,
    tint,
    rim: floorOn(accent, NON_TEXT_CONTRAST_MIN, "the sweep's front"),
    lines: lineInk,
    text: {
      eyebrow: onGround(registers.eyebrow.fill ?? accent),
      title: onGround(registers.display.fill ?? ink),
      count: onGround(accent),
      key: onGround(muted),
      label: floorOn(ink, TEXT_CONTRAST_MIN, "a line's number"),
      median: floorOn(accent, TEXT_CONTRAST_MIN, "the median's number"),
      // The credit stands on the open sea, which is the ground.
      source: onGround(muted),
      axis: onGround(muted),
    },
  };
  for (const [slot, c] of Object.entries(colours.text)) if (!c) throw new Error(`the ${slot} has no ink that reads`);
  const dot = 0.14 * axis.lead;
  const strokes = { line: (direction.stroke?.rule ?? 1) * k, median: 1.6 * (direction.stroke?.rule ?? 1) * k, dot };
  const pad = haloOf(axis, k) / 2;

  // ── the key: the count over « hors mesure » ─────────────────────────────────────────────────────────────
  /** Every text the count can show, keyed by its uncased form, cased by its register, with the width Bun measured —
   *  the composition draws the cased text and checks that width back. */
  const countWidths = Object.fromEntries(
    countTexts(copy, subject).map((t) => {
      const cased = applyCase(t, value.transform);
      return [t, { text: cased, width: widthOf(cased, value) }];
    }),
  );
  const countBand = bandOf(BAND_PROBE, value);
  const keyBand = bandOf(BAND_PROBE, axis);
  const countWidth = Math.max(...Object.values(countWidths).map((c) => c.width));
  const countBaseline = pad + countBand.ascent;
  const swatch = { x: pad, y: countBaseline + countBand.descent + ROW_GAP * axis.lead, width: SWATCH_W * axis.lead, height: SWATCH_H * axis.lead };
  const outsideText = applyCase(copy.outside, axis.transform);
  const outsideLine = { text: outsideText, x: pad + swatch.width + SWATCH_GAP * axis.lead, y: swatch.y + swatch.height / 2 + (keyBand.ascent - keyBand.descent) / 2, width: widthOf(outsideText, axis) };
  const key = {
    width: Math.ceil(pad + Math.max(countWidth, outsideLine.x - pad + outsideLine.width) * (1 + DRAWN_WIDER) + pad),
    height: Math.ceil(Math.max(swatch.y + swatch.height, outsideLine.y + keyBand.descent) + pad),
    count: { x: pad, y: countBaseline },
    swatch,
    outside: outsideLine,
    halo: haloOf(axis, k),
    valueHalo: haloOf(value, k),
  };
  let chartHeight = Math.round(CHART_H * axis.lead);
  const columnHeight = key.height + gap + chartHeight;

  /**
   * THE GROUND BAND AT SQUARE, and the camera fitted into what it leaves (`bandFor` above). The band is as tall as
   * what it carries, so it is a DIRECTION's band — nocturne's key is 712x117 and rapport's 704x131 — which is why the
   * camera is rebuilt here per direction rather than taken from the beat, and the sweep's raster with it: both are
   * read off the camera, and `measure.mjs` measures one plan per direction anyway.
   */
  const band = SIZE === "square" ? bandFor({ stage, inset, vInset, air: BAND_AIR * axis.lead, gap, key, curveHeight: Math.round(CHART_MIN_H * axis.lead), credit: credits[0] }) : null;
  const cameras = band ? camerasOf(stage, band.mapBand) : beatCameras;
  const sweep = band ? sweepOf(subject, cameras.whole) : beatSweep;
  /** WHERE THE LIVE MAP STOPS: the band's top edge at square, the frame's own foot everywhere else. The map is still
   *  MOUNTED on the whole frame — the measurement is a picture of that frame and its seats are its pixels — so
   *  anything seated below this floor would be drawn under the band. */
  const mapFloor = band ? band.y : stage.height;

  // ── the live map: the land, the lines and the farthest point, measured before anything is placed over it ───
  const summitSeat = lonLatOfFrame(field, field.summit);
  const summitText = applyCase(copy.summit, value.transform);
  const study = [...subject.study].sort();
  // WHICH SIDE THE FARTHEST POINT'S NUMBER STANDS ON, decided before the plan is built and therefore offline: the
  // projector is the same one `map-plan.test.ts` holds to a tenth of a pixel against the measured map. To the right
  // while the number clears the margin there, to the left when it does not — at 1080x1920 the point sits against the
  // east edge and the number ran off the frame.
  //
  // THE DECISION COUNTS THE SAME PIXELS THE ASSERTION DOES. It used to weigh the number's letters alone while the
  // refusal below measures the number's BOX, which carries the halo's pad on its right — so a point that cleared the
  // margin by less than the pad chose the right and was then refused for running 5 px past it (measured 2026-09-24,
  // nocturne at square, 772..1013 against a margin at 1008). The pad is in both now, or the two never agreed.
  const summitAtX = projectorOf(cameras.whole, stage)(summitSeat)[0];
  const summitWidth = widthOf(summitText, value);
  const summitSide = summitAtX + SUMMIT_OFFSET * dot + summitWidth + pad <= stage.width - inset ? "right" : "left";
  const basePlan = mapPlanFor({ subject, study, colours, strokes, registers, cameras, summit: { seat: summitSeat, text: summitText, halo: haloOf(value, k), offset: SUMMIT_OFFSET * dot, side: summitSide }, stage });
  const levels = copy.levels.map(({ level }) => ({ level }));
  const yielding = copy.levels.filter(({ level }) => level !== copy.medianLevel && Math.abs(level - copy.medianLevel) < YIELD_KM).map(({ level }) => level);
  /** What the frame's drive reads (`scene.mjs`): the live map's state needs no overlay. */
  const drive = { cameras, levels, medianLevel: copy.medianLevel, yielding, within: field.within, deepest: field.deepest, states, timing: CONTOUR_VIDEO_TIMING };
  if (measured === null) return { props: { mapPlan: basePlan, ...drive } };
  measured ??= readMeasured();
  if (measured.planDigest?.[id] !== planDigestOf(basePlan)) throw new Error(`${id}: the plan changed since it was measured — run measure.mjs again`);
  if (measured.size.width !== stage.width || measured.size.height !== stage.height)
    throw new Error(`${id}: measured at ${measured.size.width}×${measured.size.height}, drawn at ${stage.width}×${stage.height}`);
  const m = measured.cameras[id].whole;
  const { grid } = m;
  // THE SEA, READ OFF THE MEASURED MAP AND NOT OFF A CLAMPED CELL. `cellAt` clamps a point outside the grid to the
  // nearest column, so a probe that falls off the frame reads whatever sits at the edge and the WHOLE map is then
  // classified against it — silently, with no refusal, and the key and the credit are placed on that lie. Measured
  // at 1080x1920: a probe tuned for a 16:9 frame can sit west of a width-fitted one. So the probe is a LADDER, a
  // rung counts only when it lands INSIDE the frame and reads the plan's own water tint, and no rung qualifying is
  // a refusal. A rung the measurement predates is skipped, so landscape keeps rung 0 and nothing delivered moves.
  const seaProbe = (grid, water) => {
    const tried = [];
    for (const name of SEA_PROBES) {
      const at = m.projected[name];
      if (!at) continue;
      const [px, py] = at;
      if (px < 0 || py < 0 || px >= stage.width || py >= stage.height) {
        tried.push(`${name} falls off the ${stage.width}x${stage.height} frame at ${Math.round(px)},${Math.round(py)}`);
        continue;
      }
      const colour = cellAt(grid, px, py);
      if (near(colour, water)) return colour;
      tried.push(`${name} reads ${colour} at ${Math.round(px)},${Math.round(py)}`);
    }
    throw new Error(`${id}: no sea probe reads the water tint ${water} inside the frame — ${tried.join("; ")}`);
  };
  const sea = seaProbe(grid, ground);
  const landIn = countOf(grid, (c) => !near(c, sea));
  const seaIn = countOf(grid, (c) => near(c, sea));
  const landShare = (box) => {
    const { count, total } = landIn(box);
    return total ? count / total : 0;
  };


  // ── the credit, the key and the curve, on the measured sea ───────────────────────────────────────────────
  // AT LANDSCAPE they are ONE COLUMN down the left margin: the Atlantic there is a band ~810 px wide and the whole
  // height of the frame, so the credit takes the highest row of open sea and the key and the curve hang under it.
  //
  // AT A FRAME THAT IS NOT 16:9 that band is gone. Measured at 1080x1920 on the stage-fitted camera: the only sea
  // wide enough for a ~700 px key is the Norwegian Sea across the top, and between Greenland and the Scandinavian
  // coast it is 291 px of open water — while the credit, the key and the curve stack 550. Every ordering of the
  // three as one column was searched and none holds, at any rung of the curve's height ladder. What does hold is
  // seating them in reading order but each on its own sea: the KEY first, because it is the widest block and the
  // one that cannot be narrowed (its width is the longest count « 100 % à moins de 1 234 km » set at `value`);
  // then the CREDIT, still over open water and nothing else; then the CURVE, as wide and as tall as the water it
  // finds. Each block still stands over at most `PANEL_LAND` of land — the assertion does not move, only the search.
  //
  // AT SQUARE even that fails, and the frame answers instead of the search: the key and the credit stand in a band of
  // the direction's own ground across the foot (`bandFor`), and only the curve is still seated on the map. Nothing is
  // searched for a block in the band, because a band is not water to be found — it is ground the composition is built
  // on, and the blocks in it cross no coast because they cross no map.
  // WHAT THE CREDIT MAY STAND ON. At 1920x1080: open sea, every cell of it — "so it crosses no coast". The property
  // being protected is the SECOND half of that sentence: one uninterrupted surface under the line, so the halo does
  // its work and no coastline runs through the words. At 1080x1920 and 1080x1080 the sea wide enough to hold a
  // credit is gone — measured, no row of open water anywhere on the stage clears the marks — while whole countries
  // are. So a frame that is not 16:9 accepts EITHER surface, as long as it is one: all sea, or all land. Landscape
  // keeps the sea and nothing delivered moves.
  const landOnly = (box) => {
    const { count, total } = landIn(box);
    return count === 0 || (SIZE !== "landscape" && count === total);
  };
  let credit = null;
  let creditAt = null;
  let keyAt = null;
  let creditBox = null;

  /** The curve under the key at (x, y), as wide as the key when the sea allows, narrowed to `CHART_MIN` of it. */
  const seatColumn = (x, y) => {
    const keyB = { x, y, width: key.width, height: key.height };
    if (y < vInset || landShare(keyB) > PANEL_LAND) return null;
    if (y + key.height + gap + chartHeight > stage.height - vInset) return null;
    const widths = [];
    for (let w = key.width; w >= Math.ceil(CHART_MIN * key.width); w -= SEAT_STEP) widths.push(w);
    const chartAt = (w) => ({ x, y: y + key.height + gap, width: w, height: chartHeight });
    // No coast under the curve when a width allows it, else at most `PANEL_LAND`.
    const w = widths.find((w) => landIn(chartAt(w)).count === 0) ?? widths.find((w) => landShare(chartAt(w)) <= PANEL_LAND);
    return w === undefined ? null : { x, y, chartWidth: w, chartX: x, chartY: y + key.height + gap };
  };

  if (SIZE === "landscape") {
    // THE CREDIT FIRST, ON ONE LINE AND ON THE OPEN SEA: every cell under it is sea, so it crosses no coast. The
    // longest form that finds a row is set, in the highest row from the top-left.
    for (const form of credits) {
      search: for (let y = vInset; y + form.height <= stage.height - vInset; y += SEAT_STEP / 2)
        for (let x = inset; x + form.width <= stage.width - inset; x += SEAT_STEP) {
          if (!landOnly({ x, y, width: form.width, height: form.height })) continue;
          creditAt = { x, y };
          break search;
        }
      if (creditAt) {
        const { register, ...rest } = form;
        credit = rest;
        break;
      }
    }
    if (!creditAt) throw new Error(`${id}: no one-line form of the source (the shortest ${credits.at(-1).width}×${credits.at(-1).height}) finds a row of open sea on the measured map`);
    creditBox = { x: creditAt.x, y: creditAt.y, width: credit.width, height: credit.height };
    // THE KEY AND THE CURVE UNDER IT, each over at most `PANEL_LAND` of land. The curve is as wide as the key when
    // the sea allows, narrowed down to `CHART_MIN` of it when a coast would run under its corner (the tracked
    // nocturne's key is wider than the Atlantic south of Iceland). Hung under the credit when that column seats;
    // otherwise the column at the left margin with the widest curve, the highest first, clear of the credit.
    keyAt = seatColumn(creditBox.x, creditBox.y + creditBox.height + gap);
    if (!keyAt)
      for (let y = vInset; y + columnHeight <= stage.height - vInset; y += SEAT_STEP)
        for (let x = inset; x <= inset + 4 * SEAT_STEP; x += SEAT_STEP) {
          if (touches({ x, y, width: key.width, height: columnHeight }, creditBox, gap)) continue;
          const seat = seatColumn(x, y);
          if (seat && (!keyAt || seat.chartWidth > keyAt.chartWidth)) keyAt = seat;
        }
    if (!keyAt)
      throw new Error(
        `${id}: no place at the left margin seats the key and the curve over at most ${PANEL_LAND * 100} % land — ` +
          `the column is ${key.width}x${Math.round(columnHeight)} (key ${key.height} + gap ${Math.round(gap)} + curve ${chartHeight}) ` +
          `on a ${stage.width}x${stage.height} stage inset ${inset}/${vInset}`,
      );
  } else if (band) {
    // THE BAND SEATS THEM, AND NOTHING IS SEARCHED FOR. The key is the widest block this beat has and the one that
    // cannot be narrowed — its width is the longest count « 100 % à moins de 682 km » set at the frame's own type
    // floor — and on a square map of Europe no place over 3 % land holds it (measured 2026-09-24, all three
    // directions). Its place is the band's own, the credit's is under it on the frame's margin, and the credit is the
    // LONGEST form the frame's line budget holds rather than the shortest that happened to fit a sea.
    keyAt = { x: band.keyAt.x, y: band.keyAt.y, chartWidth: band.curveAt.width, chartX: band.curveAt.x, chartY: band.curveAt.y };
    chartHeight = band.curveAt.height;
    const { register, ...rest } = credits[0];
    credit = rest;
    creditAt = { x: band.creditAt.x, y: band.creditAt.y };
    creditBox = { x: creditAt.x, y: creditAt.y, width: credit.width, height: credit.height };
  } else {
    // THE KEY FIRST, the highest seat and then the leftmost.
    for (let y = vInset; y + key.height <= stage.height - vInset && !keyAt; y += SEAT_STEP)
      for (let x = inset; x + key.width <= stage.width - inset; x += SEAT_STEP)
        if (landShare({ x, y, width: key.width, height: key.height }) <= PANEL_LAND) {
          keyAt = { x, y, chartWidth: null, chartX: null, chartY: null };
          break;
        }
    if (!keyAt)
      throw new Error(
        `${id}: a ${key.width}x${key.height} key finds nowhere on a ${stage.width}x${stage.height} stage over at ` +
          `most ${PANEL_LAND * 100} % land. The key is as wide as « ${Object.values(countWidths).reduce((a, b) => (a.width > b.width ? a : b)).text} » ` +
          `set at ${value.fontSize}px, which the ${row.minTypePx}px floor for ${JSON.stringify(SIZE)} does not let it narrow.`,
      );
    const keyB = { x: keyAt.x, y: keyAt.y, width: key.width, height: key.height };
    // THE CREDIT NEXT, still the longest form over open water and nothing else, clear of the key.
    for (const form of credits) {
      search: for (let y = vInset; y + form.height <= stage.height - vInset; y += SEAT_STEP / 2)
        for (let x = inset; x + form.width <= stage.width - inset; x += SEAT_STEP) {
          const box = { x, y, width: form.width, height: form.height };
          if (touches(box, keyB, gap) || !landOnly(box)) continue;
          creditAt = { x, y };
          break search;
        }
      if (creditAt) {
        const { register, ...rest } = form;
        credit = rest;
        break;
      }
    }
    if (!creditAt) throw new Error(`${id}: no one-line form of the source (the shortest ${credits.at(-1).width}×${credits.at(-1).height}) finds a row of open sea clear of the key on the measured map`);
    creditBox = { x: creditAt.x, y: creditAt.y, width: credit.width, height: credit.height };
    seatCurve();
  }
  // THE CURVE LAST, clear of both: as tall as the water allows down a ladder from `CHART_H`, and as wide as the key
  // allows at that height. A shorter panel is the same argument drawn in the room a tall frame leaves; a panel that
  // stood on a coast would not be. It stays ON THE MAP at every frame, the band included: the band carries what the
  // map has no room for, and the curve still finds its own water above the band's floor.
  function seatCurve() {
    const keyB = { x: keyAt.x, y: keyAt.y, width: key.width, height: key.height };
    const full = chartHeight;
    const floor = Math.round(CHART_MIN_H * axis.lead);
    let curve = null;
    for (let h = full; h >= floor && !curve; h -= SEAT_STEP)
      for (let y = vInset; y + h <= mapFloor - vInset && !curve; y += SEAT_STEP)
        for (let x = inset; x + Math.ceil(CHART_MIN * key.width) <= stage.width - inset; x += SEAT_STEP) {
          for (let w = Math.min(key.width, stage.width - inset - x); w >= Math.ceil(CHART_MIN * key.width); w -= SEAT_STEP) {
            const box = { x, y, width: w, height: h };
            if (touches(box, keyB, gap) || touches(box, creditBox, gap)) continue;
            if (landShare(box) <= PANEL_LAND) {
              curve = { x, y, width: w, height: h };
              break;
            }
          }
          if (curve) break;
        }
    if (!curve)
      throw new Error(
        `${id}: the curve finds nowhere over at most ${PANEL_LAND * 100} % land clear of the key and the credit — ` +
          `${Math.ceil(CHART_MIN * key.width)}-${key.width} wide and ${floor}-${full} tall, on a ${stage.width}x${Math.round(mapFloor)} map` +
          (band ? `. Grow the ground band to carry the curve too (\`bandFor\`) and measure the beat again` : ``),
      );
    chartHeight = curve.height;
    keyAt = { ...keyAt, chartWidth: curve.width, chartX: curve.x, chartY: curve.y };
  }
  const keyBox = { x: keyAt.x, y: keyAt.y, width: key.width, height: key.height };
  // THE CURVE: the share of the land within each distance of the sea, 0 to the farthest point, on one scale — every
  // kilometre's share from the field's own `within` table. Under the key at landscape, on its own sea elsewhere.
  const chartBox = { x: keyAt.chartX, y: keyAt.chartY, width: keyAt.chartWidth, height: chartHeight };
  const chartPad = CHART_PAD * axis.lead;
  const plot = { left: chartBox.x + chartPad, right: chartBox.x + chartBox.width - chartPad, top: chartBox.y + chartPad, bottom: chartBox.y + chartBox.height - chartPad };
  const maxKm = field.deepest;
  const cx = (km) => plot.left + ((plot.right - plot.left) * km) / maxKm;
  const cy = (p) => plot.bottom - ((plot.bottom - plot.top) * p) / 100;
  const r1 = (v) => Math.round(v * 10) / 10;
  const curve = [];
  for (let km = 0; km < maxKm; km++) curve.push([r1(cx(km)), r1(cy(field.within[Math.min(km, field.within.length - 1)]))]);
  curve.push([r1(cx(maxKm)), r1(cy(100))]);
  const chart = {
    x: chartBox.x,
    y: chartBox.y,
    width: chartBox.width,
    height: chartBox.height,
    plot,
    maxKm,
    path: curve.map(([x, y], i) => `${i ? "L" : "M"}${x} ${y}`).join(""),
    area: `M${r1(cx(0))} ${r1(plot.bottom)}${curve.map(([x, y]) => `L${x} ${y}`).join("")}L${r1(cx(maxKm))} ${r1(plot.bottom)}Z`,
    median: { x: cx(copy.medianLevel), y: cy(field.within[copy.medianLevel]) },
  };

  // ── the farthest point: where the measured map drew it, its number beside it ─────────────────────────────
  const [sx, sy] = m.projected.summit;
  const summitBand = bandOf(summitText, value);
  const summitLine = { text: summitText, x: summitSide === "left" ? sx - SUMMIT_OFFSET * dot - summitWidth : sx + SUMMIT_OFFSET * dot, y: sy + (summitBand.ascent - summitBand.descent) / 2, width: summitWidth, side: summitSide };
  const summitLeft = Math.min(sx - 2.2 * dot, summitLine.x - pad);
  const summitBox = { x: summitLeft, y: summitLine.y - summitBand.ascent - pad, width: Math.max(sx + 2.2 * dot, summitLine.x + summitLine.width + pad) - summitLeft, height: summitBand.ascent + summitBand.descent + 2 * pad };
  if (summitBox.x < inset || summitBox.x + summitBox.width > stage.width - inset)
    throw new Error(`${id}: the farthest point's number runs outside the margins — ${Math.round(summitBox.x)}..${Math.round(summitBox.x + summitBox.width)} on a ${stage.width} wide stage inset ${inset}`);
  // THE FARTHEST POINT IS THE SHOT'S OWN CLAIM, so a ground band that covered it would take the argument with it. The
  // band is drawn over the live map, and the map is fitted and raised into what the band leaves — this says so.
  if (band && summitBox.y + summitBox.height > mapFloor)
    throw new Error(
      `${id}: the farthest point's number reaches ${Math.round(summitBox.y + summitBox.height)} and the ground band ` +
        `starts at ${Math.round(mapFloor)} — the band would be drawn over the one point the shot is about. Shorten the band.`,
    );

  // ── the numbers, one per line, each on its own line and never across another ────────────────────────────
  // The scrolly's seats (`contour-field.mjs`), taken to the map's stage through the camera. Among the seats inside the
  // margins and clear of the key, the curve, the credit, the farthest point and every number already set, the one
  // crossing the fewest other lines wins, then the one farthest from those numbers. The median first, then from the
  // inside out. A line within `YIELD_KM` of the median gives way to it: the two never carry numbers at once.
  const project = projectorOf(cameras.whole, stage);
  const yields = (a, b) => a.level !== b.level && (a.level === copy.medianLevel || b.level === copy.medianLevel) && Math.abs(a.level - b.level) < YIELD_KM;
  const BUCKET = 40;
  const buckets = field.lines.map(({ d }) => {
    const map = new Map();
    for (const part of lonLatLinesOf(field, d)) {
      const pts = part.map(project);
      for (let i = 1; i < pts.length; i++) {
        const [a, b] = [pts[i - 1], pts[i]];
        const n = Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / 3));
        for (let t = 0; t <= n; t++) {
          const px = a[0] + ((b[0] - a[0]) * t) / n;
          const py = a[1] + ((b[1] - a[1]) * t) / n;
          const cell = `${Math.floor(px / BUCKET)},${Math.floor(py / BUCKET)}`;
          if (!map.has(cell)) map.set(cell, []);
          map.get(cell).push([px, py]);
        }
      }
    }
    return map;
  });
  const pointsIn = (lj, box) => {
    for (let bx = Math.floor(box.x / BUCKET); bx <= Math.floor((box.x + box.width) / BUCKET); bx++)
      for (let by = Math.floor(box.y / BUCKET); by <= Math.floor((box.y + box.height) / BUCKET); by++)
        for (const [px, py] of buckets[lj].get(`${bx},${by}`) ?? []) if (px >= box.x && px <= box.x + box.width && py >= box.y && py <= box.y + box.height) return true;
    return false;
  };
  const order = [copy.levels.find((l) => l.level === copy.medianLevel), ...copy.levels.filter((l) => l.level !== copy.medianLevel).reverse()];
  const placed = [];
  const labels = {};
  const unlabelled = [];
  for (const l of order) {
    const li = copy.levels.indexOf(l);
    const text = applyCase(l.label, axis.transform);
    const width = widthOf(text, axis);
    const band = bandOf(BAND_PROBE, axis);
    const w = width + 2 * pad;
    const h = band.ascent + band.descent + 2 * pad;
    let best = null;
    for (const [fx, fy] of field.seats[li]) {
      const seat = lonLatOfFrame(field, [fx, fy]);
      const [cx, cy] = project(seat);
      const box = { x: cx - w / 2, y: cy - h / 2, width: w, height: h };
      // Held inside the margins AND above the map's floor: a number seated under the ground band is drawn under it.
      if (box.x < inset || box.y < vInset || box.x + w > stage.width - inset || box.y + h > mapFloor - vInset) continue;
      if (touches(box, keyBox, gap) || touches(box, summitBox, gap) || touches(box, chartBox, gap) || touches(box, creditBox, gap) || placed.some((p) => touches(box, p, gap))) continue;
      // AT THE VIDEO'S FLOOR A NUMBER IS TALLER THAN THE GAP BETWEEN TWO LINES: its halo, struck in the land's colour,
      // masks what it crosses, and the seat crossing the fewest other lines wins.
      // A number whose halo would stand on the sea reads as a patch of land off the coast: a seat wholly over land wins
      // first.
      const wet = seaIn(box).count > 0 ? 1 : 0;
      const crossed = copy.levels.filter((other, lj) => lj !== li && !yields(l, other) && pointsIn(lj, box)).length;
      const spread = Math.min(Math.hypot(cx - sx, cy - sy), ...placed.map((p) => Math.hypot(cx - (p.x + p.width / 2), cy - (p.y + p.height / 2))));
      if (!best || wet < best.wet || (wet === best.wet && (crossed < best.crossed || (crossed === best.crossed && spread > best.spread)))) best = { box, cx, cy, seat, spread, crossed, wet };
    }
    if (!best) {
      if (l.level === copy.medianLevel) throw new Error(`the median line has no seat where its number clears every other line`);
      unlabelled.push(l.level);
      continue;
    }
    placed.push(best.box);
    const median = l.level === copy.medianLevel;
    labels[l.level] = {
      text,
      width,
      x: best.cx,
      y: best.cy + (band.ascent - band.descent) / 2,
      seat: best.seat.map((v) => Math.round(v * 1e5) / 1e5),
      halo: haloOf(axis, k),
      ink: median ? colours.text.median : colours.text.label,
      crossed: best.crossed,
      wet: best.wet,
    };
  }
  const mapPlan = withNumbers(basePlan, { labels, colours, axis });

  const props = {
    frame: stage,
    registers: { display: titleCard.register, eyebrow: registers.eyebrow, value, axis, source: sourceRegister },
    titleCard,
    legend: { ...key, at: { x: keyBox.x, y: keyBox.y }, template: copy.count, widths: countWidths, final: applyCase(copy.count.replace("{p}", 100).replace("{km}", Math.round(field.deepest)), value.transform), finalWidth: widthOf(applyCase(copy.count.replace("{p}", 100).replace("{km}", Math.round(field.deepest)), value.transform), value) },
    credit: { ...credit, at: creditAt },
    chart,
    layoutInset: { x: inset, y: vInset },
    /** The ground band under the map at square — `null` at a frame whose map has water for every block. */
    band,
    colours,
    strokes,
    labels,
    summit: { x: sx, y: sy, line: summitLine },
    mapPlan,
    sweep: { ...sweep, rimKm: Math.max(sweep.stepKm * 2, 2.5 * kmPerPxAt(cameras.whole, RIM_LAT)) },
    ...drive,
  };
  return {
    id,
    direction,
    props,
    report: { k, band: band && { height: Math.round(band.height), map: Math.round(band.mapBand.height) }, titleForm: titleCard.form, sourceForm: credit.form, sourceText: credit.lines[0].text, keyLand: band ? null : landShare(keyBox), chartLand: landShare(chartBox), chartWidth: chartBox.width / key.width, labels: Object.keys(labels).map(Number), unlabelled, crossed: Object.fromEntries(Object.entries(labels).map(([l, v]) => [l, v.crossed])) },
  };
}
