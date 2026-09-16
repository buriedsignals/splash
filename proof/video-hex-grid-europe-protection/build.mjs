// EVERYTHING ONE DIRECTION'S RENDER IS HANDED, BUILT IN BUN — the words, the live map's plan and its camera, the key
// column and where it stands on the MEASURED map, every country's shape projected at that camera and the hexagon it
// travels to with its code, the two classings' colours, the rings and the states.
//
// The map is MapTiler's, drawn live under the overlay (`DirectedHexGridVideo.tsx`). What it paints under a box is not
// computed here: `measure.mjs` read it once on the real map and froze it in `measured.json`, with the digest of the plan
// it was read on. A plan that changed since is refused.
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
import { plateTints } from "#shared/map-beat/tints.mjs";
import { applyCase } from "../../skills/map-beat/scripts/registers.mjs";
import { BAND_PROBE, bandOf, CREDIT_ONE_LINE, DRAWN_WIDER, haloOf, registerAt, sourceCreditFor, titleCardFor, verticalInsetFor, widthOf } from "../../skills/map-beat/scripts/shots.mjs";
import { videoRegistersOf } from "../../skills/map-beat/scripts/video-registers.mjs";
import { cellAt, countOf, near, nearestOf } from "../video-locator-zaporizhzhia/build.mjs";
import { cameraOf, mapPlanFor, mapSeatsOf, projectorOf } from "./map-plan.mjs";
import { planDigestOf } from "./measure.mjs";
import { statesFor } from "./states.mjs";
import { COUNT_BREAKS, loadSubject, NAMES, RATE_BREAKS, shapesOf } from "./subject.mjs";
import { HEX_VIDEO_TIMING } from "./timing-contract.ts";

const HERE = dirname(fileURLToPath(import.meta.url));
export const ROOT = join(HERE, "..", "..");
export const DIRECTIONS = join(ROOT, "docs", "design-base", "directions");
export const SIZE = "landscape";
export const REGISTER_NAMES = ["display", "eyebrow", "body", "annot", "value", "axis"];
const NB = "\u00A0";
/** A cell's code keeps this share of the hexagon's width free: the hexagon narrows toward its points. */
export const CODE_SHARE = 0.78;
/** The gap between two cells, × the circumradius — drawn as a stroke in the ground's colour. */
const CELL_GAP = 0.08;
const SQRT3 = Math.sqrt(3);
// The key column's rhythm, × the axis lead.
const ROW_GAP = 0.15;
const TO_KEY = 0.6;
const SWATCH_H = 0.4;
const SWATCH_AIR = 0.5;
const GAP = 0.3;
/** How far past the stage the shapes' rings are kept: the camera never moves, so a little. */
const MAP_MARGIN = 200;
/** The step, in stage pixels, of the positions the key and the credit are tried at. */
const SEAT_STEP = 10;
/** The credit's one line: the longest form that finds a free corner of the grid, tried at these shares of the content. */
const CREDIT_MEASURES = [1, 0.8, 0.65, 0.5, 0.4];

export function loadBeat() {
  const subject = loadSubject();
  return { subject, states: statesFor(), copy: copyOf(subject), mapSeats: mapSeatsOf() };
}

const one = (v) => v.toLocaleString("fr-FR", { minimumFractionDigits: 1, maximumFractionDigits: 1 }).replace(/[\u202F\u00A0\u2009]/g, NB);
const two = (v) => v.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).replace(/[\u202F\u00A0\u2009]/g, NB);
const k = (v) => `${Math.round(v / 1000)}${NB}k`;

export function copyOf(subject) {
  const rank = (n) => (n === 1 ? "1re" : `${n}e`);
  return {
    eyebrow: "Migrations · Europe",
    title: [`Par habitant, ce n’est pas l’Allemagne : la Tchéquie accueille ${one(subject.leaderRate)} Ukrainiens pour 1${NB}000 habitants`, `Par habitant, la Tchéquie accueille ${one(subject.leaderRate)} Ukrainiens pour 1${NB}000 habitants`],
    units: { count: "Ukrainiens accueillis", rate: `pour 1${NB}000 habitants` },
    bornes: { count: COUNT_BREAKS.map(k), rate: RATE_BREAKS.map((b) => one(b)) },
    largest: {
      count: `${NAMES[subject.largest]} : ${two(subject.largestPeople / 1e6)}${NB}M, ${rank(1)}`,
      rate: `${NAMES[subject.largest]} : ${one(subject.largestRate)} pour 1${NB}000, ${rank(subject.largestRank)}`,
    },
    leader: `${NAMES[subject.leader]} : ${one(subject.leaderRate)} pour 1${NB}000, ${rank(1)}`,
    origin: "origine",
    // One line, with the map's attribution: the longest form a free corner of the grid holds is set.
    source: [
      `Sources : Eurostat (migr_asytpsm), ${subject.month} · population 2023, via Our World in Data · ©${NB}MapTiler ©${NB}OpenStreetMap`,
      `Eurostat, ${subject.month} · population via OWID · ©${NB}MapTiler ©${NB}OpenStreetMap`,
      `Eurostat · OWID · ©${NB}MapTiler ©${NB}OpenStreetMap`,
    ].map((f) => f.replaceAll(" · ", `${NB}· `)),
  };
}

export function textPerRegisterOf(copy, subject) {
  return {
    display: copy.title.join(" "),
    eyebrow: copy.eyebrow,
    body: copy.source.join(" "),
    annot: copy.origin,
    value: `${copy.largest.count} ${copy.largest.rate} ${copy.leader}`,
    axis: [copy.units.count, copy.units.rate, ...copy.bornes.count, ...copy.bornes.rate, copy.origin, ...subject.cells.map((c) => c.code), ...copy.source].join(" "),
  };
}

const r1 = (v) => Math.round(v * 10) / 10;

const MEASURED = join(HERE, "measured.json");
let measuredCache = null;
/** `measured.json`, read once: what `measure.mjs` froze on the real map. */
export function readMeasured() {
  if (measuredCache) return measuredCache;
  if (!existsSync(MEASURED)) throw new Error("no measured.json beside the beat — run measure.mjs with the worktree's .env loaded");
  measuredCache = JSON.parse(readFileSync(MEASURED, "utf8"));
  return measuredCache;
}

/**
 * @param {{ measured?: any }} [options]  `measured: null` builds the plan and the camera only — what `measure.mjs` reads.
 */
export function buildDirection(id, { subject, states, copy }, { measured = undefined } = {}) {
  const direction = resolveDirectionFamilies(readDirection(join(DIRECTIONS, `${id}.md`)), textPerRegisterOf(copy, subject));
  const resolved = Object.fromEntries(REGISTER_NAMES.map((name) => [name, registerOf(direction, name)]));
  const registers = videoRegistersOf(resolved, SIZE);
  const kk = registers.axis.fontSize / resolved.axis.fontSize;
  const row = sizeFor(SIZE);
  const stage = { width: row.width, height: row.height };
  const inset = frameInsetFor(SIZE);
  const vInset = verticalInsetFor(SIZE);
  for (const [name, r] of Object.entries(registers)) if (!(r.fontSize >= row.minTypePx)) throw new Error(`register ${name} is ${r.fontSize}px, under the ${row.minTypePx}px floor`);
  const { axis, value } = registers;
  const pad = haloOf(axis, kk) / 2;
  const measure = (t, r) => {
    const cased = applyCase(t, r.transform);
    return { text: cased, width: widthOf(cased, r) };
  };

  const titleCard = titleCardFor({ registers, eyebrow: copy.eyebrow, title: copy.title, size: SIZE, eyebrowToDisplay: EYEBROW_TO_DISPLAY });

  // ── the key column: the two figures, the measure, its bornes (two sets, one place), the origin ────────────────
  const valueBand = bandOf(BAND_PROBE, value);
  const axisBand = bandOf(BAND_PROBE, axis);
  let y = pad + valueBand.ascent;
  const largestRow = { x: pad, y, count: measure(copy.largest.count, value), rate: measure(copy.largest.rate, value) };
  y += valueBand.descent + ROW_GAP * axis.lead + valueBand.ascent;
  const leaderRow = { x: pad, y, ...measure(copy.leader, value) };
  y += valueBand.descent + TO_KEY * axis.lead + axisBand.ascent;
  const unitRow = { x: pad, y, count: measure(copy.units.count, axis), rate: measure(copy.units.rate, axis) };
  y += axisBand.descent + GAP * axis.lead;
  const bornes = { count: copy.bornes.count.map((b) => measure(b, axis)), rate: copy.bornes.rate.map((b) => measure(b, axis)) };
  const swatchW = Math.max(...bornes.count.map((b) => b.width), ...bornes.rate.map((b) => b.width)) + SWATCH_AIR * axis.lead;
  const classCount = RATE_BREAKS.length + 1;
  const swatches = Array.from({ length: classCount }, (_, i) => ({ x: pad + i * swatchW, y, width: swatchW - 0.05 * axis.lead, height: SWATCH_H * axis.lead }));
  y += SWATCH_H * axis.lead + axisBand.ascent;
  const borneY = y;
  const place = (set) => set.map((b, i) => ({ ...b, x: pad + (i + 1) * swatchW - b.width / 2, y: borneY }));
  const borneLines = { count: place(bornes.count), rate: place(bornes.rate) };
  y += axisBand.descent + GAP * axis.lead;
  const originSwatch = { x: pad, y, width: swatchW - 0.05 * axis.lead, height: axisBand.ascent };
  const originLabel = { ...measure(copy.origin, axis), x: pad + swatchW + GAP * axis.lead, y: y + axisBand.ascent * 0.9 };
  y += axisBand.ascent + axisBand.descent;
  const keyWidth = Math.ceil(pad + Math.max(largestRow.count.width, largestRow.rate.width, leaderRow.width, unitRow.count.width, unitRow.rate.width, classCount * swatchW + swatchW / 2, originLabel.x - pad + originLabel.width) * (1 + DRAWN_WIDER) + pad);
  const keyHeight = Math.ceil(y + pad);

  // ── the grid: pointy-top hexagons, odd rows offset by half a cell, as large as the box right of the key allows ──
  const cols = Math.max(...subject.cells.map((c) => c.col)) + 1;
  const rows = Math.max(...subject.cells.map((c) => c.row)) + 1;
  const box = { x: inset + keyWidth + axis.lead, y: vInset, w: stage.width - inset - (inset + keyWidth + axis.lead), h: stage.height - 2 * vInset };
  const R = Math.min(box.w / (cols * SQRT3 + SQRT3 / 2), box.h / ((rows - 1) * 1.5 + 2));
  const W = SQRT3 * R;
  const gx = box.x + (box.w - (cols * W + W / 2)) / 2;
  const gy = box.y + (box.h - ((rows - 1) * 1.5 * R + 2 * R)) / 2;
  const centreOf = (c) => ({ x: gx + W / 2 + c.col * W + (c.row % 2 ? W / 2 : 0), y: gy + R + c.row * 1.5 * R });
  /** A pointy-top hexagon filling a box: under a country's morph at its end, exactly its cell. */
  const hexInBox = (b) => {
    const pts = [[b.x + b.w / 2, b.y], [b.x + b.w, b.y + b.h / 4], [b.x + b.w, b.y + (3 * b.h) / 4], [b.x + b.w / 2, b.y + b.h], [b.x, b.y + (3 * b.h) / 4], [b.x, b.y + b.h / 4]];
    // Kept to a thousandth: the smallest boxes (Liechtenstein, Luxembourg) are scaled some sixty times on their way.
    const r3 = (v) => Math.round(v * 1000) / 1000;
    return `M${pts.map((p) => `${r3(p[0])} ${r3(p[1])}`).join("L")}Z`;
  };

  // ── the camera and the shapes: the hosts' window fitted "meet" in the grid's own box ─────────────────────────────
  const camera = cameraOf(box, stage);
  const project = projectorOf(camera, stage);
  const shapes = shapesOf({ project, stage, margin: MAP_MARGIN, codes: subject.cells.map((c) => c.code) });
  const hexPath = (cx, cy, rr) => `M${Array.from({ length: 6 }, (_, i) => {
    const a = ((60 * i - 30) * Math.PI) / 180;
    return `${r1(cx + rr * Math.cos(a))} ${r1(cy + rr * Math.sin(a))}`;
  }).join("L")}Z`;

  // The code register: the axis voice, stepped down until the widest code fits, refused under the floor.
  let codeR = axis;
  const widest = () => Math.max(...subject.cells.map((c) => widthOf(applyCase(c.code, codeR.transform), codeR)));
  while (widest() * (1 + DRAWN_WIDER) > CODE_SHARE * W && codeR.fontSize - 0.5 >= row.minTypePx) codeR = registerAt(codeR, codeR.fontSize - 0.5);
  if (widest() * (1 + DRAWN_WIDER) > CODE_SHARE * W) throw new Error(`a ${W.toFixed(0)}px hexagon cannot hold its code at the ${row.minTypePx}px floor`);
  const codeBand = bandOf(BAND_PROBE, codeR);

  // ── colours: the still's ramp, floored against the ground ─────────────────────────────────────────────────────
  const { ground, accent } = direction;
  const { ink, muted, grid } = deriveFurniture(ground);
  const { water: sea, land } = plateTints(direction);
  const floored = (c, what) => {
    if (contrast(c, ground) >= NON_TEXT_CONTRAST_MIN) return c;
    const w = adjustToContrast(c, ground, NON_TEXT_CONTRAST_MIN);
    if (!w) throw new Error(`${what} cannot be told from the ground ${ground}`);
    return w;
  };
  const low = floored(mix(accent, ground, 0.88), "the lowest class");
  const high = mix(accent, ink, 0.3);
  const classFills = Array.from({ length: classCount }, (_, i) => mix(low, high, i / (classCount - 1)));
  const neutral = floored(mix(ground, ink, 0.2), "a cell not yet classed");
  const text = (c, what) => {
    const w = adjustToContrast(c, ground, TEXT_CONTRAST_MIN);
    if (!w) throw new Error(`${what} has no ink that reads on ${ground}`);
    return w;
  };
  const ringInk = floored(mix(accent, ink, 0.45), "a ring");
  /** A word read on every ground the key column stands on — the sea and the land on the map, the ground under the cells. */
  const readsOnAll = (c, what) => {
    const on = [sea, land, ground];
    for (const base of on) {
      const walked = adjustToContrast(c, base, TEXT_CONTRAST_MIN);
      if (walked && on.every((g) => contrast(walked, g) >= TEXT_CONTRAST_MIN - 1e-9)) return walked;
    }
    throw new Error(`${what} has no ink that reads on ${on.join(", ")}`);
  };
  const colours = {
    ground,
    sea,
    land,
    border: grid,
    neutral,
    origin: ground,
    originEdge: text(muted, "the origin's edge"),
    classFills,
    ring: ringInk,
    text: { eyebrow: text(registers.eyebrow.fill ?? accent, "the eyebrow"), title: text(registers.display.fill ?? ink, "the title"), figure: text(mix(accent, ink, 0.45), "a figure"), key: readsOnAll(muted, "the key"), source: text(muted, "the credit") },
  };

  /** A CODE'S INK FOLLOWS ITS CELL: the pole that reads best on each fill the cell takes — the neutral, its count class,
   *  its rate class — walked to the text floor there. No one ink reads on a pale class and a dark one, so the frame
   *  switches as the cell's fill passes the middle of its change. */
  const inkOn = (fill) => {
    const pole = contrast(ink, fill) >= contrast(ground, fill) ? ink : ground;
    const w = adjustToContrast(pole, fill, TEXT_CONTRAST_MIN);
    if (!w) throw new Error(`no code ink reads on ${fill}`);
    return w;
  };
  const cells = subject.cells.map((c) => {
    const { x, y: cy } = centreOf(c);
    const t = measure(c.code, codeR);
    const inks = c.origin ? { neutral: inkOn(ground), count: inkOn(ground), rate: inkOn(ground) } : { neutral: inkOn(neutral), count: inkOn(classFills[c.countClass]), rate: inkOn(classFills[c.rateClass]) };
    const cellBox = { x: r1(x - W / 2), y: r1(cy - R), w: r1(W), h: r1(2 * R) };
    return {
      code: c.code,
      origin: c.origin,
      countClass: c.countClass,
      rateClass: c.rateClass,
      shape: shapes[c.code].path,
      box: shapes[c.code].box,
      cellBox,
      travelHex: hexInBox(shapes[c.code].box),
      d: hexPath(x, cy, R),
      ring: hexPath(x, cy, R * 1.12),
      label: { ...t, x, y: cy + (codeBand.ascent - codeBand.descent) / 2, inks },
    };
  });

  const strokes = { gap: CELL_GAP * R, ring: (direction.stroke?.rule ?? 1) * kk * 1.6, originDash: [3 * kk, 2 * kk], hairline: (direction.stroke?.hairline ?? 0.6) * kk };
  const mapPlan = mapPlanFor({ cells, colours, strokes, camera });
  /** What the live map's drive reads (`scene.mjs`, `mapStateAt`): it needs no overlay. */
  const drive = { camera, states, timing: HEX_VIDEO_TIMING };
  if (measured === null) return { props: { mapPlan, ...drive } };
  measured ??= readMeasured();
  if (measured.planDigest?.[id] !== planDigestOf(mapPlan)) throw new Error(`${id}: the plan changed since it was measured — run measure.mjs again`);
  if (measured.size.width !== stage.width || measured.size.height !== stage.height)
    throw new Error(`${id}: measured at ${measured.size.width}×${measured.size.height}, drawn at ${stage.width}×${stage.height}`);
  const { grid: mapCells, projected } = measured.cameras[id].whole;
  const measuredSea = cellAt(mapCells, ...projected.sea);
  if (!near(measuredSea, sea)) throw new Error(`${id}: the measured sea ${measuredSea} is not the direction's water tint ${sea}`);
  /** The cells the measured map paints as a host — neither the basemap's sea nor its land. */
  const hostsIn = countOf(mapCells, (c) => nearestOf(c, [sea, land, neutral]) === neutral);
  const landIn = countOf(mapCells, (c) => nearestOf(c, [sea, land, neutral]) === land);

  // ── the key column: at the left margin, over no host on the measured map, as near the middle as that allows ────────
  // (the still's place). West of the window it stands on the Atlantic, Greenland's tip and Labrador: context, each word
  // haloed in what lies under it.
  let keyAt = null;
  for (let ky = vInset; ky + keyHeight <= stage.height - vInset; ky += SEAT_STEP) {
    const b = { x: inset, y: ky, width: keyWidth, height: keyHeight };
    if (hostsIn(b).count) continue;
    const off = Math.abs(ky + keyHeight / 2 - stage.height / 2);
    const l = landIn(b);
    if (!keyAt || off < keyAt.off) keyAt = { x: inset, y: ky, off, land: Math.round((100 * l.count) / l.total) };
  }
  if (!keyAt) throw new Error(`${id}: the key column finds no place at the left margin clear of every host`);
  const keyBox = { x: keyAt.x, y: keyAt.y, width: keyWidth, height: keyHeight };
  /** What the measured map mostly paints under a word of the key: its halo while the basemap is up. */
  const seaIn = countOf(mapCells, (c) => near(c, measuredSea));
  const haloUnder = (line, band) => {
    const { count, total } = seaIn({ x: keyBox.x + line.x, y: keyBox.y + line.y - band.ascent, width: line.width, height: band.ascent + band.descent });
    return count >= total / 2 ? sea : land;
  };

  // ── the credit: one line, the longest form that holds the lowest, leftmost corner clear of the key and every cell ──
  const touches = (a, b, g = 0) => a.x < b.x + b.width + g && b.x < a.x + a.width + g && a.y < b.y + b.height + g && b.y < a.y + a.height + g;
  const cellBoxes = cells.map((c) => ({ x: c.cellBox.x, y: c.cellBox.y, width: c.cellBox.w, height: c.cellBox.h }));
  let credit = null;
  let sourceRegister = null;
  let creditAt = null;
  for (const measure of CREDIT_MEASURES) {
    const { register, ...tried } = sourceCreditFor({ registers, forms: copy.source, size: SIZE, k: kk, ...CREDIT_ONE_LINE, measure });
    search: for (let cy = stage.height - vInset - tried.height; cy >= vInset; cy -= SEAT_STEP)
      for (let cx = inset; cx + tried.width <= stage.width - inset; cx += SEAT_STEP) {
        const b = { x: cx, y: cy, width: tried.width, height: tried.height };
        if (touches(b, keyBox, pad) || cellBoxes.some((c) => touches(b, c, pad))) continue;
        creditAt = { x: cx, y: cy };
        break search;
      }
    if (creditAt) {
      credit = tried;
      sourceRegister = register;
      break;
    }
  }
  if (!creditAt) throw new Error(`${id}: no one-line form of the credit finds a free corner`);

  const props = {
    frame: stage,
    registers: { display: titleCard.register, eyebrow: registers.eyebrow, value, axis, code: codeR, source: sourceRegister },
    titleCard,
    legend: {
      at: { x: keyBox.x, y: keyBox.y },
      width: keyWidth,
      height: keyHeight,
      largestRow,
      leaderRow,
      unitRow,
      swatches,
      bornes: borneLines,
      originSwatch,
      originLabel,
      halo: haloOf(axis, kk),
      valueHalo: haloOf(value, kk),
      halos: { unit: haloUnder({ x: unitRow.x, y: unitRow.y, width: Math.max(unitRow.count.width, unitRow.rate.width) }, axisBand), origin: haloUnder(originLabel, axisBand) },
    },
    credit: { ...credit, at: creditAt },
    colours,
    strokes,
    cells,
    largest: subject.largest,
    leader: subject.leader,
    hex: { R, W },
    layoutInset: { x: inset, y: vInset },
    stage,
    gridBox: box,
    mapPlan,
    ...drive,
  };
  return { id, direction, props, report: { k: kk, titleForm: titleCard.form, sourceForm: credit.form, R: r1(R), codeSize: codeR.fontSize, keyLand: keyAt.land } };
}
