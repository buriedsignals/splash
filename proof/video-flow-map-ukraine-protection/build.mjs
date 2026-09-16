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
import { frameInsetFor, sizeFor } from "#shared/chart-video/sizes.mjs";
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
export const SIZE = "landscape";
export const REGISTER_NAMES = ["display", "eyebrow", "body", "annot", "value", "axis"];
const NB = "\u00A0";
/** The widest band, the largest host's, in px. */
export const WIDEST = 36;
/** A band narrower than this is not drawn; its people still count. */
export const BAND_FLOOR = 2;
const SEAT_STEP = 10;
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
/** `measured.json`, read once: what `measure.mjs` froze on the real map. */
export function readMeasured() {
  if (measuredCache) return measuredCache;
  if (!existsSync(MEASURED)) throw new Error("no measured.json beside the beat — run measure.mjs with the worktree's .env loaded");
  measuredCache = JSON.parse(readFileSync(MEASURED, "utf8"));
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

  // ── the camera: the box the ten largest hosts need, fitted to the stage to the right of the key column ─────────
  const seatOf = (iso) => {
    if (!seats[iso]) throw new Error(`${iso} has no seat inside the window`);
    return seats[iso];
  };
  const mapBox = { x: inset + keyWidth + axis.lead, y: vInset, w: stage.width - 2 * inset - keyWidth - axis.lead, h: stage.height - 2 * vInset };
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
    // A host is drawn only when its seat is inside the frame's margins: a band running off the edge ends nowhere.
    const inStage = sx >= inset && sx <= stage.width - inset && sy >= vInset && sy <= stage.height - vInset;
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
  const mapPlan = mapPlanFor({ bands, node: { seat: seatOf(ORIGIN), r: nodeR, text: originText.text }, colours, strokes, registers: { axis }, camera });
  /** What the frame's drive reads (`scene.mjs`): the live map's state needs no overlay. */
  const drive = { cameras: { whole: camera }, bands: bands.map(({ samples, seat, coordinates, cumulative, ...b }) => b), topTwoShare: copy.topTwoShare, total, states, timing: FLOW_VIDEO_TIMING };
  if (measured === null) return { props: { mapPlan, ...drive } };
  measured ??= readMeasured();
  if (measured.planDigest?.[id] !== planDigestOf(mapPlan)) throw new Error(`${id}: the plan changed since it was measured — run measure.mjs again`);
  if (measured.size.width !== stage.width || measured.size.height !== stage.height)
    throw new Error(`${id}: measured at ${measured.size.width}×${measured.size.height}, drawn at ${stage.width}×${stage.height}`);
  const { grid, projected } = measured.cameras[id].whole;
  const measuredSea = cellAt(grid, ...projected.biscay);
  if (!near(measuredSea, ground)) throw new Error(`${id}: the measured sea ${measuredSea} is not the direction's ground ${ground}`);
  /** Not sea: the land, the node and every band drawn over the sea (the measured frame is the last, every band in). */
  const landIn = countOf(grid, (c) => !near(c, measuredSea));
  const landShare = (box) => {
    const { count, total: cells } = landIn(box);
    return cells ? count / cells : 0;
  };

  // ── the key column: at the left margin, the height over the least measured land clear of every band ────────────
  const keyAt = (() => {
    let best = null;
    for (let ky = vInset; ky + keyHeight <= stage.height - vInset; ky += SEAT_STEP) {
      const box = { x: inset, y: ky, width: keyWidth, height: keyHeight };
      if (bandsIn(bands, box, gap)) continue;
      const share = landShare(box);
      if (!best || share < best.share - 1e-9 || (Math.abs(share - best.share) < 1e-9 && Math.abs(ky + keyHeight / 2 - stage.height / 2) < Math.abs(best.y + keyHeight / 2 - stage.height / 2))) best = { x: inset, y: ky, share };
    }
    if (!best) throw new Error(`a ${keyWidth}×${keyHeight} key finds no height at the left margin clear of every band`);
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
    { width: stage.width, height: stage.height },
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

  // ── the credit: one line over open sea, in the lowest, leftmost corner clear of the key, the node, the names ────
  let creditAt = null;
  let credit = null;
  for (const form of credits) {
    search: for (let cy = stage.height - vInset - form.height; cy >= vInset; cy -= SEAT_STEP)
      for (let cx = inset; cx + form.width <= stage.width - inset; cx += SEAT_STEP) {
        const box = { x: cx, y: cy, width: form.width, height: form.height };
        if (landIn(box).count || touches(box, keyBox, gap) || touches(box, nodeBox, gap) || names.some((n) => touches(box, n.box, gap)) || bandsIn(bands, box, gap)) continue;
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
