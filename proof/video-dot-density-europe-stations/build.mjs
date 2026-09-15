// EVERYTHING ONE DIRECTION'S RENDER IS HANDED, BUILT IN BUN — the words, the colours, the live map's plan and its still
// camera, every station's weight, the key and the credit placed on the MEASURED map, and the states.
//
// The map is MapTiler's, drawn live under the overlay (`DirectedDotDensityVideo.tsx`). Where the sea is under a box is
// not computed here: `measure.mjs` read it once on the real map and froze it in `measured.json`, with the digest of
// the plan it was read on. A plan that changed since is refused.
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
import { BAND_PROBE, bandOf, CREDIT_ONE_LINE, DRAWN_WIDER, haloOf, sourceCreditFor, titleCardFor, verticalInsetFor, widthOf } from "../../skills/map-beat/scripts/shots.mjs";
import { videoRegistersOf } from "../../skills/map-beat/scripts/video-registers.mjs";
import { camerasOf, mapPlanFor, mapSeatsOf, projectorOf } from "./map-plan.mjs";
import { planDigestOf } from "./measure.mjs";
import { statesFor } from "./states.mjs";
import { loadSubject, SUBJECT } from "./subject.mjs";
import { DOT_VIDEO_TIMING } from "./timing-contract.ts";

const HERE = dirname(fileURLToPath(import.meta.url));
export const ROOT = join(HERE, "..", "..");
export const DIRECTIONS = join(ROOT, "docs", "design-base", "directions");
export const SIZE = "landscape";
export const REGISTER_NAMES = ["display", "eyebrow", "body", "annot", "value", "axis"];
const NB = "\u00A0";
const SEAT_STEP = 10;
/** Two measured cells are one colour when no channel differs by more than this — the tolerance of a cell's mean. */
const SAME_CELL = 3;
/** A station at the overview: the static plate's rule, a point that reads as texture in the densest region. */
const DOT_R = 2.2; // px
/** The largest station's radius once every dot has its weight: area ∝ capacity. */
const WEIGHT_R = 40; // px, for the largest capacity in the register
/** A dot never shrinks under this while it grows into its weight — a small solar park stays dust, not nothing. */
const WEIGHT_FLOOR_R = 1.2; // px
/** The size the key names. */
export const REFERENCE_MW = 1000;
// The key's rhythm, × the axis lead.
const ROW_GAP = 0.15;
/** The nuclear share's bar: its thickness and the air around it, × the axis lead. */
const BAR_H = 0.45;
const BAR_GAP = 0.3;
const TO_SYMBOLS = 0.45;
const SYMBOL_GAP = 0.35;

/** The stage's content box: the frame the whole-map camera fits. */
export function contentOf() {
  const { width, height } = sizeFor(SIZE);
  const inset = frameInsetFor(SIZE);
  const vInset = verticalInsetFor(SIZE);
  return { x: inset, y: vInset, w: width - 2 * inset, h: height - 2 * vInset };
}

export function loadBeat() {
  const subject = loadSubject();
  return { subject, states: statesFor(), copy: copyOf(subject), cameras: camerasOf(subject, contentOf()), mapSeats: mapSeatsOf(subject) };
}

const n0 = (v) => Math.round(v).toLocaleString("fr-FR").replace(/[\u202F\u00A0\u2009]/g, NB);
const one = (v) => v.toLocaleString("fr-FR", { minimumFractionDigits: 1, maximumFractionDigits: 1 }).replace(/[\u202F\u00A0\u2009]/g, NB);

export function copyOf(subject) {
  const { total, nuclear, shareSites, shareCapacity } = subject;
  const attribution = `©${NB}MapTiler ©${NB}OpenStreetMap`;
  return {
    eyebrow: "Énergie · Europe",
    title: [`${nuclear} réacteurs sur ${n0(total)} centrales bas-carbone — et un tiers de la puissance`, `${nuclear} sites nucléaires, un tiers de la puissance bas-carbone`],
    stations: (n) => `${n0(n)}${NB}centrales`,
    // Under « 8 900 centrales », « 0,8 % » is of the stations: the key does not say « des sites » twice over.
    nuclear: `${nuclear} nucléaires · ${one(shareSites)}${NB}%`,
    power: (p) => `${Number.isInteger(p) ? p : one(p)}${NB}% de la puissance`,
    dot: "une centrale",
    ring: "nucléaire",
    reference: `${n0(REFERENCE_MW)}${NB}MW`,
    // One line, over open sea, with the map's attribution: the longest form the measured sea holds is set.
    source: [`Source${NB}: WRI Global Power Plant Database · ${attribution}`, `WRI Global Power Plant Database · ${attribution}`, `WRI · ${attribution}`, attribution].map((f) => f.replaceAll(" · ", `${NB}· `)),
    shareCapacity: Number(shareCapacity.toFixed(1)),
  };
}

export function textPerRegisterOf(copy) {
  return {
    display: copy.title.join(" "),
    eyebrow: copy.eyebrow,
    body: copy.source.join(" "),
    annot: copy.ring,
    value: `${copy.stations(8900)} ${copy.nuclear} ${copy.power(copy.shareCapacity)} 0123456789`,
    axis: [copy.dot, copy.ring, copy.reference, ...copy.source].join(" "),
  };
}

const touches = (a, b, gap = 0) => a.x < b.x + b.width + gap && b.x < a.x + a.width + gap && a.y < b.y + b.height + gap && b.y < a.y + a.height + gap;

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

/** A station's radius once every dot has its weight: area ∝ capacity, never under the floor. */
export const weightRadiusOf = (mw, maxMw) => Math.max(WEIGHT_FLOOR_R, WEIGHT_R * Math.sqrt(mw / maxMw));

/**
 * @param {{ measured?: any }} [options]  `measured: null` builds the plan and the camera only — what `measure.mjs` reads.
 */
export function buildDirection(id, { subject, states, copy, cameras }, { measured = undefined } = {}) {
  const direction = resolveDirectionFamilies(readDirection(join(DIRECTIONS, `${id}.md`)), textPerRegisterOf(copy));
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

  const titleCard = titleCardFor({ registers, eyebrow: copy.eyebrow, title: copy.title, size: SIZE, eyebrowToDisplay: EYEBROW_TO_DISPLAY });
  /** The credit on one line, in every form that holds one — the longest that finds a corner is set. */
  const credits = copy.source.flatMap((form) => {
    try {
      return [sourceCreditFor({ registers, forms: [form], size: SIZE, k, ...CREDIT_ONE_LINE })];
    } catch {
      return [];
    }
  });
  if (!credits.length) throw new Error("no form of the source holds one line");
  const sourceRegister = credits[0].register;

  // ── colours ─────────────────────────────────────────────────────────────────────────────────────────────────
  const { ground, accent } = direction;
  const { ink, muted } = deriveFurniture(ground);
  const { water: sea, land } = plateTints(direction);
  const walked = (c, on, floor, what) => {
    const w = adjustToContrast(c, on, floor);
    if (!w) throw new Error(`${what} has no variant that reads at ${floor}:1 on ${on}`);
    return w;
  };
  const dot = walked(accent, land, NON_TEXT_CONTRAST_MIN, "a station");
  const subjectInk = walked(mix(accent, ink, 0.35), land, NON_TEXT_CONTRAST_MIN, "a nuclear station");
  const onSea = (c, what) => walked(c, sea, TEXT_CONTRAST_MIN, what);
  const colours = {
    ground,
    sea,
    land,
    dot,
    back: mix(land, dot, 0.18),
    subject: subjectInk,
    text: {
      eyebrow: walked(registers.eyebrow.fill ?? accent, ground, TEXT_CONTRAST_MIN, "the eyebrow"),
      title: walked(registers.display.fill ?? ink, ground, TEXT_CONTRAST_MIN, "the title"),
      count: onSea(accent, "a count"),
      subject: onSea(subjectInk, "the nuclear count"),
      key: onSea(muted, "the key"),
      // The credit stands on the open sea.
      source: onSea(muted, "the credit"),
    },
  };
  if (contrast(sea, land) < 1.05) throw new Error(`the land ${land} cannot be told from the sea ${sea}`);
  const strokes = { hairline: (direction.stroke?.hairline ?? 0.6) * k, ring: (direction.stroke?.rule ?? 1) * k };

  // ── the live map: every station at its place, split by fuel and by the size it grows to ──────────────────────
  const fuels = subject.arrival.map((fuel) => ({ fuel, n: subject.byFuel[fuel].n }));
  const stations = Object.fromEntries(fuels.map(({ fuel }) => [fuel, subject.stations.filter((s) => s.fuel === fuel).map((s) => ({ lon: s.lon, lat: s.lat, mw: s.mw, w: weightRadiusOf(s.mw, subject.maxMw) }))]));
  const mapPlan = mapPlanFor({ fuels, stations, colours, strokes, dotR: DOT_R, ringR: 3.2 * DOT_R, cameras });
  /** What the frame's drive reads (`scene.mjs`): the live map's state needs no overlay. */
  const drive = { cameras, fuels, subjectFuel: SUBJECT, total: subject.total, shareCapacity: copy.shareCapacity, shareCapacityExact: subject.shareCapacity, shareSites: subject.shareSites, states, timing: DOT_VIDEO_TIMING };
  if (measured === null) return { props: { mapPlan, ...drive } };
  measured ??= readMeasured();
  if (measured.planDigest?.[id] !== planDigestOf(mapPlan)) throw new Error(`${id}: the plan changed since it was measured — run measure.mjs again`);
  if (measured.size.width !== stage.width || measured.size.height !== stage.height)
    throw new Error(`${id}: measured at ${measured.size.width}×${measured.size.height}, drawn at ${stage.width}×${stage.height}`);
  const { grid, projected } = measured.cameras[id].whole;
  const measuredSea = cellAt(grid, ...projected.atlantic);
  if (!near(measuredSea, sea)) throw new Error(`${id}: the measured sea ${measuredSea} is not the plate's sea ${sea}`);
  /** Not sea: the land, and every station drawn over the sea (the measured frame is the last, every dot at its weight). */
  const landIn = countOf(grid, (c) => !near(c, measuredSea));
  const landShare = (box) => {
    const { count, total } = landIn(box);
    return total ? count / total : 0;
  };
  const project = projectorOf(cameras.whole, stage);
  const dots = subject.stations.map((s) => {
    const [x, y] = project([s.lon, s.lat]);
    return { x, y, fuel: s.fuel, mw: s.mw };
  });
  /** Whether any station's disc, at its largest (its weight, or the dot and its ring), touches the box. */
  const discsIn = (box) =>
    dots.some((d) => {
      const r = Math.max(weightRadiusOf(d.mw, subject.maxMw), 3.2 * DOT_R) + 2;
      const nx = Math.min(Math.max(d.x, box.x), box.x + box.width);
      const ny = Math.min(Math.max(d.y, box.y), box.y + box.height);
      return Math.hypot(d.x - nx, d.y - ny) < r;
    });

  // ── the key: three counts, then the dot, the ring and the size reference ────────────────────────────────────
  const pad = haloOf(axis, k) / 2;
  const measureAll = (texts, r) => Object.fromEntries(texts.map((t) => { const cased = applyCase(t, r.transform); return [t, { text: cased, width: widthOf(cased, r) }]; }));
  const stationSteps = [...new Set([...Array.from({ length: Math.floor(subject.total / 100) + 1 }, (_, i) => i * 100), subject.total])];
  const powerSteps = [...Array.from({ length: Math.floor(copy.shareCapacity) + 1 }, (_, i) => i), copy.shareCapacity];
  // Keyed by the number each shows, so the composition picks one by its count and types no word.
  const byStep = (steps, form) => Object.fromEntries(steps.map((n) => [String(n), measureAll([form(n)], value)[form(n)]]));
  const stationTexts = byStep(stationSteps, copy.stations);
  const powerTexts = byStep(powerSteps, copy.power);
  const nuclearText = measureAll([copy.nuclear], value)[copy.nuclear];
  const valueBand = bandOf(BAND_PROBE, value);
  const axisBand = bandOf(BAND_PROBE, axis);
  let y = pad;
  let barY = 0;
  const rows = ["stations", "nuclear", "power"].map((name, i) => {
    // The bar stands between the nuclear count and the power count: the sliver of the sites, then the share of the power.
    if (name === "power") {
      barY = y + BAR_GAP * axis.lead;
      y = barY + BAR_H * axis.lead + BAR_GAP * axis.lead - ROW_GAP * axis.lead;
    }
    y += (i ? ROW_GAP * axis.lead : 0) + valueBand.ascent;
    const at = { x: pad, y };
    y += valueBand.descent;
    return [name, at];
  });
  const refR = Math.max(WEIGHT_FLOOR_R, WEIGHT_R * Math.sqrt(REFERENCE_MW / subject.maxMw));
  const symbolW = 2 * refR;
  const symbolRows = ["dot", "ring", "reference"].map((name, i) => {
    const h = name === "reference" ? Math.max(2 * refR, axisBand.ascent + axisBand.descent) : axisBand.ascent + axisBand.descent;
    const top = y + (i === 0 ? TO_SYMBOLS : SYMBOL_GAP) * axis.lead;
    y = top + h;
    const cy = top + h / 2;
    const text = measureAll([copy[name]], axis)[copy[name]];
    return [name, { cx: pad + symbolW / 2, cy, label: { ...text, x: pad + symbolW + SYMBOL_GAP * axis.lead, y: cy + (axisBand.ascent - axisBand.descent) / 2 } }];
  });
  const widest = Math.max(...Object.values(stationTexts).map((t) => t.width), ...Object.values(powerTexts).map((t) => t.width), nuclearText.width, ...symbolRows.map(([, s]) => s.label.x - pad + s.label.width));
  const key = {
    width: Math.ceil(pad + widest * (1 + DRAWN_WIDER) + pad),
    height: Math.ceil(y + pad),
    rows: Object.fromEntries(rows),
    symbols: Object.fromEntries(symbolRows),
    stationTexts,
    powerTexts,
    nuclearText,
    halo: haloOf(axis, k),
    valueHalo: haloOf(value, k),
    referenceR: refR,
    bar: { x: pad, y: barY, width: widest, height: BAR_H * axis.lead },
  };
  // At the left margin, the height whose box holds no station and the least measured land.
  let keyAt = null;
  for (let ky = vInset; ky + key.height <= stage.height - vInset; ky += SEAT_STEP) {
    const box = { x: inset, y: ky, width: key.width, height: key.height };
    // Clear of every station at its weight too: the discs grow under the key.
    if (discsIn(box)) continue;
    const share = landShare(box);
    if (!keyAt || share < keyAt.share - 1e-9) keyAt = { x: inset, y: ky, share };
  }
  if (!keyAt) throw new Error(`a ${key.width}×${key.height} key finds no place at the left margin clear of every station`);
  const keyBox = { x: keyAt.x, y: keyAt.y, width: key.width, height: key.height };

  // ── the credit: one line over open sea, in the lowest, leftmost corner clear of the key and every station ─────
  let creditAt = null;
  let credit = null;
  for (const form of credits) {
    search: for (let cy = stage.height - vInset - form.height; cy >= vInset; cy -= SEAT_STEP)
      for (let cx = inset; cx + form.width <= stage.width - inset; cx += SEAT_STEP) {
        const box = { x: cx, y: cy, width: form.width, height: form.height };
        if (landIn(box).count || touches(box, keyBox, gap) || discsIn(box)) continue;
        creditAt = { x: cx, y: cy };
        break search;
      }
    if (creditAt) {
      const { register, ...rest } = form;
      credit = rest;
      break;
    }
  }
  if (!creditAt) throw new Error(`${id}: no one-line form of the source finds open sea clear of the key and every station on the measured map`);

  const props = {
    frame: stage,
    registers: { display: titleCard.register, eyebrow: registers.eyebrow, value, axis, source: sourceRegister },
    titleCard,
    legend: { ...key, at: { x: keyBox.x, y: keyBox.y } },
    credit: { ...credit, at: creditAt },
    colours,
    strokes,
    dotR: DOT_R,
    ringR: 3.2 * DOT_R,
    copyTexts: { nuclear: copy.nuclear },
    layoutInset: { x: inset, y: vInset },
    mapPlan,
    ...drive,
  };
  return { id, direction, props, dots, report: { k, titleForm: titleCard.form, sourceText: credit.lines[0].text, keyLand: keyAt.share, dots: dots.length, layers: mapPlan.layers.length } };
}
