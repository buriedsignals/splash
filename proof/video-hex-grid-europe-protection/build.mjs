// EVERYTHING ONE DIRECTION'S RENDER IS HANDED, BUILT IN BUN — the words, the key column, every hexagon and its code, the
// two classings' colours, the rings and the states.
//
// Runs in Bun only.

import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { adjustToContrast, contrast, mix, NON_TEXT_CONTRAST_MIN, TEXT_CONTRAST_MIN } from "#shared/chart-beat/colour.mjs";
import { deriveFurniture } from "#shared/chart-beat/render-still.mjs";
import { frameInsetFor, sizeFor } from "#shared/chart-video/sizes.mjs";
import { readDirection } from "#shared/design-base/read-direction.mjs";
import { EYEBROW_TO_DISPLAY, registerOf } from "#shared/design-base/register.mjs";
import { resolveDirectionFamilies } from "#shared/design-base/resolve-families.mjs";
import { applyCase } from "../../skills/map-beat/scripts/registers.mjs";
import { BAND_PROBE, bandOf, DRAWN_WIDER, haloOf, registerAt, sourceCreditFor, titleCardFor, verticalInsetFor, widthOf } from "../../skills/map-beat/scripts/shots.mjs";
import { videoRegistersOf } from "../../skills/map-beat/scripts/video-registers.mjs";
import { statesFor } from "./states.mjs";
import { COUNT_BREAKS, loadSubject, NAMES, RATE_BREAKS } from "./subject.mjs";
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

export function loadBeat() {
  const subject = loadSubject();
  return { subject, states: statesFor(), copy: copyOf(subject) };
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
    source: [`Sources : Eurostat (migr_asytpsm), ${subject.month} · population 2023, via Our World in Data`, `Sources : Eurostat, ${subject.month} · Our World in Data`].map((f) => f.replace(" · ", `${NB}· `)),
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

export function buildDirection(id, { subject, states, copy }) {
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
  const { register: sourceRegister, ...credit } = sourceCreditFor({ registers, forms: copy.source, size: SIZE, k: kk });

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
  const keyAt = { x: inset, y: Math.round((stage.height - keyHeight) / 2) };

  // ── the grid: pointy-top hexagons, odd rows offset by half a cell, as large as the box right of the key allows ──
  const cols = Math.max(...subject.cells.map((c) => c.col)) + 1;
  const rows = Math.max(...subject.cells.map((c) => c.row)) + 1;
  const box = { x: inset + keyWidth + axis.lead, y: vInset, w: stage.width - inset - (inset + keyWidth + axis.lead), h: stage.height - 2 * vInset };
  const R = Math.min(box.w / (cols * SQRT3 + SQRT3 / 2), box.h / ((rows - 1) * 1.5 + 2));
  const W = SQRT3 * R;
  const gx = box.x + (box.w - (cols * W + W / 2)) / 2;
  const gy = box.y + (box.h - ((rows - 1) * 1.5 * R + 2 * R)) / 2;
  const centreOf = (c) => ({ x: gx + W / 2 + c.col * W + (c.row % 2 ? W / 2 : 0), y: gy + R + c.row * 1.5 * R });
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
  const { ink, muted } = deriveFurniture(ground);
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
  const colours = {
    ground,
    neutral,
    origin: ground,
    originEdge: text(muted, "the origin's edge"),
    classFills,
    ring: ringInk,
    text: { eyebrow: text(registers.eyebrow.fill ?? accent, "the eyebrow"), title: text(registers.display.fill ?? ink, "the title"), figure: text(mix(accent, ink, 0.45), "a figure"), key: text(muted, "the key"), source: text(muted, "the credit") },
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
    return {
      code: c.code,
      origin: c.origin,
      countClass: c.countClass,
      rateClass: c.rateClass,
      d: hexPath(x, cy, R),
      ring: hexPath(x, cy, R * 1.12),
      label: { ...t, x, y: cy + (codeBand.ascent - codeBand.descent) / 2, inks },
    };
  });

  // ── the credit: the lowest, leftmost corner clear of the key and of every cell ───────────────────────────────
  const touches = (a, b, g = 0) => a.x < b.x + b.width + g && b.x < a.x + a.width + g && a.y < b.y + b.height + g && b.y < a.y + a.height + g;
  const cellBoxes = subject.cells.map((c) => {
    const { x, y: cy } = centreOf(c);
    return { x: x - W / 2, y: cy - R, width: W, height: 2 * R };
  });
  const keyBox = { ...keyAt, width: keyWidth, height: keyHeight };
  let creditAt = null;
  search: for (let cy = stage.height - vInset - credit.height; cy >= vInset; cy -= 10)
    for (let cx = inset; cx + credit.width <= stage.width - inset; cx += 10) {
      const b = { x: cx, y: cy, width: credit.width, height: credit.height };
      if (touches(b, keyBox, pad) || cellBoxes.some((c) => touches(b, c, pad))) continue;
      creditAt = { x: cx, y: cy };
      break search;
    }
  if (!creditAt) throw new Error(`a ${credit.width}×${credit.height} credit finds no free corner`);

  const props = {
    frame: stage,
    registers: { display: titleCard.register, eyebrow: registers.eyebrow, value, axis, code: codeR, source: sourceRegister },
    titleCard,
    legend: { at: keyAt, width: keyWidth, height: keyHeight, largestRow, leaderRow, unitRow, swatches, bornes: borneLines, originSwatch, originLabel, halo: haloOf(axis, kk), valueHalo: haloOf(value, kk) },
    credit: { ...credit, at: creditAt },
    colours,
    strokes: { gap: CELL_GAP * R, ring: (direction.stroke?.rule ?? 1) * kk * 1.6, originDash: [3 * kk, 2 * kk], hairline: (direction.stroke?.hairline ?? 0.6) * kk },
    cells,
    largest: subject.largest,
    leader: subject.leader,
    hex: { R, W },
    layoutInset: { x: inset, y: vInset },
    states,
    timing: HEX_VIDEO_TIMING,
  };
  return { id, direction, props, report: { k: kk, titleForm: titleCard.form, sourceForm: credit.form, R: r1(R), codeSize: codeR.fontSize } };
}
