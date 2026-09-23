// EVERYTHING ONE DIRECTION'S RENDER IS HANDED, BUILT IN BUN — the words, the key column, the live map's plan and its
// still camera, every band's arc and width, every host's name and the credit placed on the MEASURED map, the colours
// and the states.
//
// The map is MapTiler's, drawn live under the overlay (`DirectedFlowMapVideo.tsx`). Where the sea is under a box is not
// computed here: `measure.mjs` read it once on the real map and froze it in `measured.json`, with the digest of the
// plan it was read on. A plan that changed since is refused.
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
import { BAND_PROBE, bandOf, CREDIT_ONE_LINE, DRAWN_WIDER, haloOf, pillOf, sourceCreditFor, titleCardFor, verticalInsetFor, widthOf } from "../../skills/map-beat/scripts/shots.mjs";
import { videoRegistersOf } from "../../skills/map-beat/scripts/video-registers.mjs";
import { placePills } from "../video-choropleth-europe-lowcarbon/scene.mjs";
import { cameraOf, mapPlanFor, mapSeatsOf, projectorOf, seatsOf, unprojectorOf, withNames } from "./map-plan.mjs";
import { planDigestOf } from "./measure.mjs";
import { statesFor } from "./states.mjs";
import { FOCUS_HOSTS, loadSubject, NAMES, ORIGIN, SUBJECT } from "./subject.mjs";
import { FLOW_VIDEO_TIMING } from "./timing-contract.ts";

const HERE = dirname(fileURLToPath(import.meta.url));
export const ROOT = join(HERE, "..", "..");
export const DIRECTIONS = join(ROOT, "docs", "design-base", "directions");
/** The size this run exports at — `--size`, landscape when nothing asks. R2 names three and
 *  everything under it already answered per size; only this line pinned the beat to one. */
export const SIZE = videoExportSize();
export const REGISTER_NAMES = ["display", "eyebrow", "body", "annot", "value", "axis"];
const NB = "\u00A0";
/** The widest band, the largest host's, in px. */
export const WIDEST = 36;
/** A band narrower than this is not drawn; its people still count. */
export const BAND_FLOOR = 2;
const SEAT_STEP = 10;
/** The sea probes, in order: each is a seat `measure.mjs` projects on the real map, and the first that lands
 *  inside the frame on the plan's water tint says what the sea IS. */
const SEA_PROBES = ["biscay"];
/** Two measured cells are one colour when no channel differs by more than this — the tolerance of a cell's mean. */
const SAME_CELL = 3;
/** A named host's seat dot, × the axis size. */
const SEAT_DOT = 0.16;
// The key's rhythm, × the axis lead.
const ROW_GAP = 0.15;
const TO_SCALE = 0.5;
const SCALE_GAP = 0.35;

export function loadBeat() {
  const subject = loadSubject();
  const seats = seatsOf(subject.geo);
  return { subject, states: statesFor(), copy: copyOf(subject), seats, mapSeats: mapSeatsOf(seats) };
}

const n0 = (v) => Math.round(v).toLocaleString("fr-FR").replace(/[\u202F\u00A0\u2009]/g, NB);
const one = (v) => v.toLocaleString("fr-FR", { minimumFractionDigits: 1, maximumFractionDigits: 1 }).replace(/[\u202F\u00A0\u2009]/g, NB);
const amount = (p) => (p >= 1e6 ? `${(p / 1e6).toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}${NB}M` : `${Math.round(p / 1000)}${NB}k`);

export function copyOf(subject) {
  const attribution = `©${NB}MapTiler ©${NB}OpenStreetMap`;
  return {
    eyebrow: "Migrations · Europe",
    title: [`${one(subject.total / 1e6)} millions d’Ukrainiens sous protection temporaire — l’Allemagne et la Pologne en accueillent la moitié`, `${one(subject.total / 1e6)} millions d’Ukrainiens sous protection temporaire`],
    people: (p) => `${n0(p)}${NB}personnes`,
    share: (s) => `${NAMES[subject.topTwo[0]]} + ${NAMES[subject.topTwo[1]]}${NB}: ${Number.isInteger(s) ? s : one(s)}${NB}%`,
    scale: [
      { people: 1e6, text: `1${NB}million` },
      { people: 1e5, text: `100${NB}000` },
    ],
    origin: "Ukraine",
    host: (code, people) => `${NAMES[code]} ${amount(people)}`,
    // One line, over open sea, with the map's attribution: the longest form the measured sea holds is set.
    source: [
      `Source${NB}: Eurostat, protection temporaire (migr_asytpsm), ${subject.month} · ${attribution}`,
      `Source${NB}: Eurostat (migr_asytpsm), ${subject.month} · ${attribution}`,
      `Eurostat, ${subject.month} · ${attribution}`,
      `Eurostat · ${attribution}`,
    ].map((f) => f.replace(" · ", `${NB}· `)),
    topTwoShare: Number(subject.topTwoShare.toFixed(1)),
  };
}

export function textPerRegisterOf(copy, subject) {
  return {
    display: copy.title.join(" "),
    eyebrow: copy.eyebrow,
    body: copy.source.join(" "),
    annot: copy.origin,
    value: `${copy.people(subject.total)} ${copy.share(copy.topTwoShare)} 0123456789`,
    axis: [...subject.ranked.slice(0, FOCUS_HOSTS).map((f) => copy.host(f.code, f.people)), copy.origin, ...copy.scale.map((s) => s.text), ...copy.source].join(" "),
  };
}

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
        `Run: set -a && . ./.env && set +a && bun proof/video-flow-map-ukraine-protection/measure.mjs --size ${SIZE}`,
    );
  measuredCache = all[SIZE];
  return measuredCache;
}
export const near = (a, b, tolerance = SAME_CELL) => [1, 3, 5].every((k) => Math.abs(Number.parseInt(a.slice(k, k + 2), 16) - Number.parseInt(b.slice(k, k + 2), 16)) <= tolerance);
/** The measured colour of the cell under a stage point. */
export const cellAt = (grid, x, y) => grid.colours[Math.min(grid.rows - 1, Math.max(0, Math.floor(y / grid.cell))) * grid.cols + Math.min(grid.cols - 1, Math.max(0, Math.floor(x / grid.cell)))];
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

/** Whether any drawn band, at its width, comes within `gap` of the box (its samples densified to a quarter step). */
export const bandsIn = (bands, box, gap = 0, minWidth = 0) =>
  bands.some((b) => b.drawn && b.width >= minWidth && b.samples.some(([x, y], i) => {
    if (i === 0) return false;
    const [x0, y0] = b.samples[i - 1];
    return [0.25, 0.5, 0.75, 1].some((t) => {
      const qx = x0 + (x - x0) * t;
      const qy = y0 + (y - y0) * t;
      const r = b.width / 2 + gap;
      return qx >= box.x - r && qx <= box.x + box.width + r && qy >= box.y - r && qy <= box.y + box.height + r;
    });
  }));

const touches = (a, b, gap = 0) => a.x < b.x + b.width + gap && b.x < a.x + a.width + gap && a.y < b.y + b.height + gap && b.y < a.y + a.height + gap;
const r1 = (v) => Math.round(v * 10) / 10;

/**
 * @param {{ measured?: any }} [options]  `measured: null` builds the plan and the camera only — what `measure.mjs` reads.
 */
export function buildDirection(id, { subject, states, copy, seats }, { measured = undefined } = {}) {
  const direction = resolveDirectionFamilies(readDirection(join(DIRECTIONS, `${id}.md`)), textPerRegisterOf(copy, subject));
  const resolved = Object.fromEntries(REGISTER_NAMES.map((name) => [name, registerOf(direction, name)]));
  const registers = videoRegistersOf(resolved, SIZE);
  const k = registers.axis.fontSize / resolved.axis.fontSize;
  const row = sizeFor(SIZE);
  const stage = { width: row.width, height: row.height };
  const inset = frameInsetFor(SIZE);
  const vInset = verticalInsetFor(SIZE);
  for (const [name, r] of Object.entries(registers)) if (!(r.fontSize >= row.minTypePx)) throw new Error(`register ${name} is ${r.fontSize}px, under the ${row.minTypePx}px floor`);
  const { axis, value } = registers;
  const gap = 0.25 * axis.lead;
  const pad = haloOf(axis, k) / 2;

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

  // ── the key column: the people count, the top two's share, the width scale ────────────────────────────────────
  const { ranked, total } = subject;
  const perPixel = ranked[0].people / WIDEST;
  const widthOfPeople = (p) => p / perPixel;
  const measure = (t, r) => {
    const cased = applyCase(t, r.transform);
    return { text: cased, width: widthOf(cased, r) };
  };
  let cumulative = 0;
  const peopleTexts = { 0: measure(copy.people(0), value) };
  ranked.forEach((f, i) => {
    cumulative += f.people;
    peopleTexts[i + 1] = measure(copy.people(cumulative), value);
  });
  const shareSteps = [...Array.from({ length: Math.floor(copy.topTwoShare) + 1 }, (_, i) => i), copy.topTwoShare];
  const shareTexts = Object.fromEntries(shareSteps.map((s) => [String(s), measure(copy.share(s), value)]));
  const valueBand = bandOf(BAND_PROBE, value);
  const axisBand = bandOf(BAND_PROBE, axis);
  let y = pad + valueBand.ascent;
  const peopleRow = { x: pad, y };
  y += valueBand.descent + ROW_GAP * axis.lead + valueBand.ascent;
  const shareRow = { x: pad, y };
  y += valueBand.descent;
  const barLength = 1.4 * axis.lead;
  const scale = copy.scale.map((s, i) => {
    const h = Math.max(widthOfPeople(s.people), axisBand.ascent + axisBand.descent);
    const top = y + (i === 0 ? TO_SCALE : SCALE_GAP) * axis.lead;
    y = top + h;
    const cy = top + h / 2;
    return { width: widthOfPeople(s.people), x: pad, cy, length: barLength, label: { ...measure(s.text, axis), x: pad + barLength + SCALE_GAP * axis.lead, y: cy + (axisBand.ascent - axisBand.descent) / 2 } };
  });
  const keyWidth = Math.ceil(pad + Math.max(...Object.values(peopleTexts).map((t) => t.width), ...Object.values(shareTexts).map((t) => t.width), ...scale.map((s) => s.label.x - pad + s.label.width)) * (1 + DRAWN_WIDER) + pad);
  const keyHeight = Math.ceil(y + axisBand.descent + pad);

  // ── the ground band: the square frame's own composition ───────────────────────────────────────────────────────
  /**
   * WHAT A SQUARE FRAME MAKES POSSIBLE, AND WHAT THE OTHER TWO DO NOT NEED.
   *
   * Careful with the word: a FLOW band is an arc out of Ukraine (`bands`, `bandsIn`). The GROUND band is this — a
   * strip of the direction's own ground across the foot of the frame, under the live map rather than over it.
   *
   * The key stands over the map at 16:9 and at 9:16, and it can: at 1920x1080 it is a column at the left margin
   * with the map fitted right of it, and at 1080x1920 it is a strip across the top with 840 px of height left under
   * it. A SQUARE frame has neither. The map is fitted by its WIDTH, so the frame is the subject's ground and
   * nothing else, and the flow bands radiate out of Ukraine PAST the box the camera was fitted on — a host outside
   * the ten reaches anywhere. Measured 2026-09-24, all three directions, over every seat on a 10 px step: a
   * 780x291 key (creme; 815x302 rapport, 815x268 nocturne) found NO place on the whole 1080x1080 stage clear of
   * every flow band. « in its band across the top » was a reservation on the map, and a reservation the arcs cross
   * is not room.
   *
   * So at square the key stops standing on the map. A band of ground takes the foot of the frame, the key stands in
   * it on the left margin, and the map is fitted into what is left — still the whole width, edge to edge across it.
   * This is a different drawing of the same argument, not a degraded one: the key crosses no band because it
   * crosses no map. `cameraOf` already fits its seats into a BOX inside the stage and offsets the camera by that
   * box's centre, so the map raises itself into the band above; nothing new computes a camera here.
   *
   * THE BAND CARRIES THE CREDIT TOO, and it was measured down to the key alone first. The credit is one line of
   * type that asks for one uninterrupted surface (`oneSurface`) — a far weaker ask than a 300 px key — so the first
   * band drawn here left it on the map, which kept the map 705 px of the 1080. Measured 2026-09-24, all three
   * directions: no form of the source found a surface there either, clear of the key, the node, the ten names and
   * every flow band. The band carries what the map has NO room for, and here that is both.
   *
   * THE MAP STAYS THE SUBJECT — the static twin's `MIN_MAP_SHARE` (« a third is a statement about what a map beat
   * IS »): a band that leaves the map less than a third of the frame is refused with the number it fell short by.
   */
  const MIN_MAP_SHARE = 1 / 3;
  const groundBand = (() => {
    if (SIZE !== "square") return null;
    const content = stage.width - 2 * inset;
    if (keyWidth > content) throw new Error(`the ${keyWidth}px key is wider than the ${content}px of content the ground band holds between the frame's margins`);
    // The longest form of the source the band's own width holds: the band is not looking for sea, so the credit is
    // set at the fullest the frame can read rather than at the shortest a patch of water would have allowed.
    const form = credits.find((c) => c.width <= content);
    if (!form) throw new Error(`no one-line form of the source is narrower than the ${content}px the ground band holds (the shortest is ${Math.round(credits.at(-1).width)}px)`);
    const height = gap + keyHeight + gap + form.height + vInset;
    const y = stage.height - height;
    if (y < stage.height * MIN_MAP_SHARE)
      throw new Error(
        `the ground band is ${Math.round(height)}px tall and leaves the map ${Math.round(y)}px of a ${stage.height}px frame, under the ` +
          `${Math.round(stage.height * MIN_MAP_SHARE)}px a map beat keeps for its map. Give the beat a shorter key, or a shorter credit.`,
      );
    return {
      x: 0,
      y,
      width: stage.width,
      height,
      /** The key at the band's top, the credit at its foot on the frame's own bottom margin, both on the left one. */
      keyAt: { x: inset, y: y + gap },
      credit: form,
      creditAt: { x: inset, y: stage.height - vInset - form.height },
    };
  })();
  /** WHERE THE LIVE MAP STOPS: the ground band's top edge at square, the frame's own foot everywhere else. The map is
   *  still MOUNTED on the whole frame and MEASURED there, so a seat, a name or a credit below this floor is drawn
   *  under the band — which is why every placement below reads this and not `stage.height`. */
  const mapFloor = groundBand ? groundBand.y : stage.height;

  // ── the camera: the box the ten largest hosts need, fitted to the stage to the right of the key column ─────────
  const seatOf = (iso) => {
    if (!seats[iso]) throw new Error(`${iso} has no seat inside the window`);
    return seats[iso];
  };
  // WHERE THE MAP IS FITTED, AND WHERE THE KEY STANDS. At 1920x1080 the key is a COLUMN at the left margin and the
  // map takes the rest of the width: a 16:9 frame has width to spare and Europe is wider than it is tall. At
  // 1080x1920 and 1080x1080 the same column eats two thirds of the width — measured at 1080x1920, it left the map
  // 300 px wide and the Bay of Biscay, the seat that tells the build what the sea IS, fell inside a cell of land.
  // So at a frame that is not 16:9 the key becomes a BAND across the top and the map takes the whole width below it:
  // the same two blocks, turned through a right angle, which is what a tall frame asks of a side-by-side.
  //
  // AND AT SQUARE, NEITHER: the key is off the map entirely, in the ground band at the foot, so the map box is the
  // whole frame above that band — the widest of the three fits, and the one that keeps the map edge to edge.
  const keyBeside = SIZE === "landscape";
  const mapBox = keyBeside
    ? { x: inset + keyWidth + axis.lead, y: vInset, w: stage.width - 2 * inset - keyWidth - axis.lead, h: stage.height - 2 * vInset }
    : groundBand
      ? { x: inset, y: vInset, w: stage.width - 2 * inset, h: mapFloor - vInset }
      : { x: inset, y: vInset + keyHeight + axis.lead, w: stage.width - 2 * inset, h: stage.height - 2 * vInset - keyHeight - axis.lead };
  const camera = cameraOf([ORIGIN, ...ranked.slice(0, FOCUS_HOSTS).map((f) => f.code)].map(seatOf), mapBox, stage);
  const project = projectorOf(camera, stage);
  const unproject = unprojectorOf(camera, stage);

  // ── colours: the sea the bare ground, the land one measured step off it, the bands the accent ─────────────────
  const { ground, accent } = direction;
  const { ink, muted } = deriveFurniture(ground);
  let dose = 0.06;
  while (contrast(mix(ground, ink, dose), ground) < SEA_LAND_MIN && dose < 0.4) dose += 0.005;
  const landFill = mix(ground, ink, dose);
  const onBoth = (c, floor, what) => {
    for (const on of [landFill, ground]) {
      const w = adjustToContrast(c, on, floor);
      if (w && contrast(w, landFill) >= floor - 1e-9 && contrast(w, ground) >= floor - 1e-9) return w;
    }
    throw new Error(`${what} has no variant that reads at ${floor}:1 on both the land and the sea`);
  };
  const colours = {
    ground,
    land: landFill,
    band: onBoth(accent, NON_TEXT_CONTRAST_MIN, "a band"),
    subjectBand: onBoth(mix(accent, ink, 0.35), NON_TEXT_CONTRAST_MIN, "the subject's band"),
    node: onBoth(ink, NON_TEXT_CONTRAST_MIN, "the node's edge"),
    text: {
      eyebrow: adjustToContrast(registers.eyebrow.fill ?? accent, ground, TEXT_CONTRAST_MIN),
      title: adjustToContrast(registers.display.fill ?? ink, ground, TEXT_CONTRAST_MIN),
      count: onBoth(accent, TEXT_CONTRAST_MIN, "a count"),
      subject: onBoth(mix(accent, ink, 0.35), TEXT_CONTRAST_MIN, "the subject's name"),
      name: onBoth(ink, TEXT_CONTRAST_MIN, "a host's name"),
      key: onBoth(muted, TEXT_CONTRAST_MIN, "the key"),
    },
  };
  for (const [slot, c] of Object.entries(colours.text)) if (!c) throw new Error(`the ${slot} has no ink that reads`);
  const strokes = { node: (direction.stroke?.rule ?? 1) * k };

  // ── the node and the bands: each arc a bow in stage px, sampled and taken back to lon/lat ──────────────────────
  const [ox, oy] = project(seatOf(ORIGIN));
  const originText = measure(copy.origin, axis);
  const nodeR = originText.width / 2 + 2 * pad;
  const nodeBox = { x: ox - nodeR, y: oy - nodeR, width: 2 * nodeR, height: 2 * nodeR };
  const bands = ranked.map((f) => {
    const [sx, sy] = project(seatOf(f.code));
    const dx = sx - ox;
    const dy = sy - oy;
    const len = Math.hypot(dx, dy);
    const width = widthOfPeople(f.people);
    // A host is drawn only when its seat is inside the frame's margins — and above the map's own floor, because a
    // band whose end is drawn under the ground band ends nowhere just as surely as one running off the edge.
    const inStage = sx >= inset && sx <= stage.width - inset && sy >= vInset && sy <= mapFloor - vInset;
    const drawn = width >= BAND_FLOOR && inStage && len > nodeR * 1.5;
    const start = [ox + (dx / len) * nodeR, oy + (dy / len) * nodeR];
    const bow = Math.min(len * 0.1, 44) * (sy < oy ? -1 : 1);
    const control = [(start[0] + sx) / 2 - (dy / len) * bow, (start[1] + sy) / 2 + (dx / len) * bow];
    const quad = (t) => [(1 - t) ** 2 * start[0] + 2 * (1 - t) * t * control[0] + t * t * sx, (1 - t) ** 2 * start[1] + 2 * (1 - t) * t * control[1] + t * t * sy];
    const samples = Array.from({ length: 41 }, (_, i) => quad(i / 40));
    const lengths = [0];
    for (let i = 1; i < samples.length; i++) lengths.push(lengths[i - 1] + Math.hypot(samples[i][0] - samples[i - 1][0], samples[i][1] - samples[i - 1][1]));
    return {
      code: f.code,
      people: f.people,
      top: subject.topTwo.includes(f.code),
      subject: f.code === SUBJECT,
      drawn,
      width: r1(width),
      seat: { x: sx, y: sy },
      samples,
      coordinates: samples.map(unproject),
      cumulative: lengths,
    };
  });
  const mapPlan = mapPlanFor({ bands, node: { seat: seatOf(ORIGIN), r: nodeR, text: originText.text }, colours, strokes, registers: { axis }, camera, stage });
  /** What the frame's drive reads (`scene.mjs`): the live map's state needs no overlay. */
  const drive = { cameras: { whole: camera }, bands: bands.map(({ samples, seat, coordinates, cumulative, ...b }) => b), topTwoShare: copy.topTwoShare, total, states, timing: FLOW_VIDEO_TIMING };
  if (measured === null) return { props: { mapPlan, ...drive } };
  measured ??= readMeasured();
  if (measured.planDigest?.[id] !== planDigestOf(mapPlan)) throw new Error(`${id}: the plan changed since it was measured — run measure.mjs again`);
  if (measured.size.width !== stage.width || measured.size.height !== stage.height)
    throw new Error(`${id}: measured at ${measured.size.width}×${measured.size.height}, drawn at ${stage.width}×${stage.height}`);
  const { grid, projected } = measured.cameras[id].whole;
  // THE SEA, READ OFF THE MEASURED MAP AND NOT OFF A CLAMPED CELL. `cellAt` clamps a point outside the grid to the
  // nearest column, so a probe that falls off the frame reads whatever sits at the edge and the WHOLE map is then
  // classified against it — silently, with no refusal, and the key and the credit are placed on that lie. Measured
  // at 1080x1920: a probe tuned for a 16:9 frame can sit west of a width-fitted one. So the probe is a LADDER, a
  // rung counts only when it lands INSIDE the frame and reads the plan's own water tint, and no rung qualifying is
  // a refusal. A rung the measurement predates is skipped, so landscape keeps rung 0 and nothing delivered moves.
  const seaProbe = (grid, water) => {
    const tried = [];
    for (const name of SEA_PROBES) {
      const at = projected[name];
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
  const measuredSea = seaProbe(grid, ground);
  /** Not sea: the land, the node and every band drawn over the sea (the measured frame is the last, every band in). */
  const landIn = countOf(grid, (c) => !near(c, measuredSea));
  const landShare = (box) => {
    const { count, total: cells } = landIn(box);
    return cells ? count / cells : 0;
  };

  // ── the key: down the left margin at 16:9, in the ground band at 1:1, across its own strip at the top otherwise ─
  // The rule does not change where the key still stands ON the map — the place over the least measured land that no
  // flow band crosses — only the line it is searched along: a height at the left margin when the key stands beside
  // the map, an offset along the reserved strip when it stands above it.
  //
  // AT SQUARE THERE IS NOTHING TO SEARCH. The key stands in the ground band, on the left margin, where every other
  // block of this beat stands; it is over no land and no flow band because it is over no map (see `groundBand`).
  const keyAt = (() => {
    if (groundBand) return { ...groundBand.keyAt, share: 0 };
    let best = null;
    const seats = [];
    if (keyBeside) for (let ky = vInset; ky + keyHeight <= stage.height - vInset; ky += SEAT_STEP) seats.push({ x: inset, y: ky });
    // The band across the top is where the map leaves room, but the bands radiate from Ukraine past the map's own
    // box — hosts outside the ten the camera is fitted on reach anywhere — so the whole stage is searched and the
    // band is a reservation, not a cage.
    else
      for (let ky = vInset; ky + keyHeight <= stage.height - vInset; ky += SEAT_STEP)
        for (let kx = inset; kx + keyWidth <= stage.width - inset; kx += SEAT_STEP) seats.push({ x: kx, y: ky });
    const middle = keyBeside ? stage.height / 2 : stage.width / 2;
    const off = (seat) => (keyBeside ? Math.abs(seat.y + keyHeight / 2 - middle) : Math.abs(seat.x + keyWidth / 2 - middle) + seat.y);
    for (const seat of seats) {
      const box = { ...seat, width: keyWidth, height: keyHeight };
      if (bandsIn(bands, box, gap)) continue;
      const share = landShare(box);
      if (!best || share < best.share - 1e-9 || (Math.abs(share - best.share) < 1e-9 && off(seat) < off(best))) best = { ...seat, share };
    }
    if (!best)
      throw new Error(
        `a ${keyWidth}×${keyHeight} key finds no place ${keyBeside ? "at the left margin" : "in its band across the top"} ` +
          `clear of every band, over ${seats.length} seat(s) on a ${stage.width}x${stage.height} stage`,
      );
    return best;
  })();
  const keyBox = { x: keyAt.x, y: keyAt.y, width: keyWidth, height: keyHeight };

  // ── the names: the ten largest hosts, each at its band's end, kept apart and clear of the node and the key ─────
  const named = bands.filter((b) => b.drawn).slice(0, FOCUS_HOSTS);
  const pills = named.map((b) => ({ ...b, pill: pillOf(copy.host(b.code, b.people), axis, pad) }));
  const dotR = SEAT_DOT * axis.fontSize;
  // A name never covers a named host's seat dot, its own included: the dot says where the band ends.
  const dots = named.map((b) => ({ x: b.seat.x - dotR, y: b.seat.y - dotR, width: 2 * dotR, height: 2 * dotR }));
  const placed = placePills(
    pills.map((b) => ({ key: b.code, cx: b.seat.x, cy: b.seat.y, width: b.pill.width, height: b.pill.height, avoid: dots })),
    { width: stage.width, height: mapFloor },
    gap,
    // A name never sits across one of the wide bands (a quarter of the widest or more) — the thin ones pass under its halo.
    { obstacles: [nodeBox, { ...keyBox, x: 0, width: keyBox.x + keyBox.width }], allowed: (box) => !bandsIn(bands, box, 0, WIDEST / 4) },
  );
  const halo = haloOf(axis, k);
  const names = pills.map((b) => {
    const at = placed[b.code];
    const box = { x: at.x, y: at.y, width: b.pill.width, height: b.pill.height };
    return {
      code: b.code,
      text: b.pill.text,
      width: b.pill.textWidth,
      box,
      seat: seatOf(b.code),
      at: unproject([box.x + box.width / 2, box.y + box.height / 2]),
      ink: b.top ? colours.text.subject : colours.text.name,
      halo,
      // The halo is the colour under most of the name on the measured map.
      haloColour: landShare(box) > 0.5 ? landFill : ground,
    };
  });

  // WHAT THE CREDIT MAY STAND ON. At 1920x1080: open sea, every cell of it — "so it crosses no coast". The property
  // being protected is the SECOND half of that sentence: one uninterrupted surface under the line, so the halo does
  // its work and no coastline runs through the words. At 1080x1920 and 1080x1080 the sea wide enough to hold a
  // credit is gone — measured, no row of open water anywhere on the stage clears the marks — while whole countries
  // are. So a frame that is not 16:9 accepts EITHER surface, as long as it is one: all sea, or all land. Landscape
  // keeps the sea and nothing delivered moves.
  const oneSurface = (box) => {
    const { count, total } = landIn(box);
    return count === 0 || (SIZE !== "landscape" && count === total);
  };
  // ── the credit: one line over open sea, in the lowest, leftmost corner clear of the key, the node, the names ────
  // WHERE THERE IS A GROUND BAND, NOTHING IS SEARCHED FOR: the credit's place is the band's own, under the key, and
  // its form is the longest the band's width holds rather than the shortest that fitted a patch of water.
  let creditAt = groundBand ? groundBand.creditAt : null;
  let credit = groundBand ? (({ register, ...rest }) => rest)(groundBand.credit) : null;
  for (const form of creditAt ? [] : credits) {
    search: for (let cy = stage.height - vInset - form.height; cy >= vInset; cy -= SEAT_STEP)
      for (let cx = inset; cx + form.width <= stage.width - inset; cx += SEAT_STEP) {
        const box = { x: cx, y: cy, width: form.width, height: form.height };
        if (!oneSurface(box) || touches(box, keyBox, gap) || touches(box, nodeBox, gap) || names.some((n) => touches(box, n.box, gap)) || bandsIn(bands, box, gap)) continue;
        creditAt = { x: cx, y: cy };
        break search;
      }
    if (creditAt) {
      const { register, ...rest } = form;
      credit = rest;
      break;
    }
  }
  if (!creditAt) throw new Error(`${id}: no one-line form of the source finds open sea clear of the key, the node, the names and every band on the measured map`);

  const props = {
    frame: stage,
    /** The ground band under the map at square — `null` at a frame that stands its key on the map itself. */
    band: groundBand,
    registers: { display: titleCard.register, eyebrow: registers.eyebrow, value, axis, source: sourceRegister },
    titleCard,
    legend: { at: { x: keyBox.x, y: keyBox.y }, width: keyWidth, height: keyHeight, peopleRow, shareRow, peopleTexts, shareTexts, scale, halo, valueHalo: haloOf(value, k) },
    credit: { ...credit, at: creditAt },
    colours,
    strokes,
    layoutInset: { x: inset, y: vInset },
    mapPlan: withNames(mapPlan, { names, colours, axis, dotR }),
    ...drive,
  };
  return { id, direction, props, bands, names, dots, report: { k, titleForm: titleCard.form, sourceText: credit.lines[0].text, keyLand: keyAt.share, drawn: bands.filter((b) => b.drawn).length, named: named.length } };
}
