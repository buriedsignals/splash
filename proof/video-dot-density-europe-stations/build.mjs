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
import { frameInsetFor, sizeFor, videoExportSize } from "#shared/chart-video/sizes.mjs";
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
/** The size this run exports at — `--size`, landscape when nothing asks. R2 names three and
 *  everything under it already answered per size; only this line pinned the beat to one. */
export const SIZE = videoExportSize();
export const REGISTER_NAMES = ["display", "eyebrow", "body", "annot", "value", "axis"];
const NB = "\u00A0";
const SEAT_STEP = 10;
/** The sea probes, in order: each is a seat `measure.mjs` projects on the real map, and the first that lands
 *  inside the frame on the plan's water tint says what the sea IS. */
const SEA_PROBES = ["atlantic"];
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

/** THE BAND THE KEY KEEPS, at a frame that is not 16:9 — a share of the stage's height reserved at the TOP, which
 *  the whole-map camera is fitted BELOW.
 *
 *  At 1920x1080 the key stands at the left margin, on the Atlantic, clear of every station, and the map takes the
 *  whole frame. Measured at 1080x1920: the same map fitted to the whole stage puts its widest open water in the
 *  Norwegian Sea across the top, 280 px deep, while the key is 473 px tall — and no box of the key's size anywhere
 *  on the stage is clear of every station. Reserving the band instead puts the key OUTSIDE the stations' own bounds,
 *  where nothing is drawn, rather than over the picture it explains. The seat search still refuses loudly when the
 *  key does not find the band, so this number is a budget and not a promise. */
const KEY_BAND = { landscape: 0, portrait: 0.3, square: 0.45 };

/**
 * THE BAND OF THE DIRECTION'S OWN GROUND THE CREDIT KEEPS, across the FOOT of the frame — a share of the stage's
 * height the whole-map camera is fitted ABOVE, painted in the direction's ground and carrying nothing but the credit.
 *
 * At 1920x1080 the credit stands on the open Atlantic and crosses no coast, which is the whole of the rule
 * (« posé sur l'eau et loin de tout mot »): ONE uninterrupted surface under the line, so the halo does its work.
 * At 1080x1080 that surface does not exist. Europe is fitted there by its WIDTH, so the frame is Europe and nothing
 * else — measured 2026-09-24 on the square whole-map picture, the bottom 100 px of the frame are some 72 % land and
 * the top 100 px some 27 %, and every direction refused with « no one-line form of the source finds open sea clear
 * of the key and every station on the measured map ». The key already has a band of map reserved for it at the top
 * (`KEY_BAND`), and at square that band is 486 px of the 1080 with a 473 px key standing in it: there is nothing
 * left up there either.
 *
 * So the frame overrides « the live map over the whole frame » the way the static twin does
 * (`proof/static-choropleth-europe-lowcarbon/DirectedChoroplethMap.tsx`, `STACKED`): the map keeps the full width
 * and gives up the foot, and the credit crosses no coast because it crosses no map at all. It is a DIFFERENT
 * drawing of the same argument, not a degraded one.
 *
 * THE BAND CARRIES THE CREDIT AND NOTHING ELSE. The key still seats on the map, clear of every station, over the
 * least measured land — the band carries what the map has NO room for, not everything it could hold, because every
 * pixel the band takes is a pixel the stations are drawn smaller in.
 *
 * THE NUMBER IS A BUDGET AND NOT A PROMISE, as `KEY_BAND` is: 0.13 × 1080 is 140 px against the 132 px the credit
 * needs at square (the frame's own 72 px bottom margin, a quarter of the axis lead of air, and a 48 px line), and
 * `buildDirection` refuses loudly with the arithmetic if a direction's credit does not fit the band it was given.
 * Portrait is 0 because portrait already seats its credit on the map (measured 2026-09-24, all three directions).
 */
const CREDIT_BAND = { landscape: 0, portrait: 0, square: 0.13 };

/** The band of ground at the foot, or `null` at a frame whose credit stands on the map's own surface. */
export function creditBandOf() {
  const { width, height } = sizeFor(SIZE);
  const foot = Math.round(CREDIT_BAND[SIZE] * height);
  return foot ? { x: 0, y: height - foot, width, height: foot } : null;
}

/** The stage's content box: the frame the whole-map camera fits, below the band the key keeps and above the band the
 *  credit keeps. A frame with no credit band spends its own bottom margin there, which is what it always did. */
export function contentOf() {
  const { width, height } = sizeFor(SIZE);
  const inset = frameInsetFor(SIZE);
  const vInset = verticalInsetFor(SIZE);
  const band = Math.round(KEY_BAND[SIZE] * height);
  const foot = Math.round(CREDIT_BAND[SIZE] * height);
  return { x: inset, y: vInset + band, w: width - 2 * inset, h: height - vInset - band - Math.max(foot, vInset) };
}

export function loadBeat() {
  const subject = loadSubject();
  return { subject, states: statesFor(), copy: copyOf(subject), cameras: camerasOf(subject, contentOf(), sizeFor(SIZE)), mapSeats: mapSeatsOf(subject) };
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
        `Run: set -a && . ./.env && set +a && bun proof/video-dot-density-europe-stations/measure.mjs --size ${SIZE}`,
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
  /** The ground band at the foot (`CREDIT_BAND`), or `null` at a frame that seats its credit on the map itself. */
  const creditBand = creditBandOf();
  /** WHERE THE MAP STOPS. The map is still MOUNTED on the whole frame — the measurement is a picture of that frame
   *  and every seat in it is one of its pixels — so the band is painted OVER the map's foot, and nothing of the
   *  overlay's may be seated below this line or it would be drawn under the band. */
  const mapFloor = creditBand ? creditBand.y : stage.height;
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
      // The credit stands on the open sea — or, where the frame gives it a band of the direction's own ground at the
      // foot, on that ground, which is what the band is FOR: ink read off the page rather than off water.
      source: creditBand ? walked(muted, ground, TEXT_CONTRAST_MIN, "the credit") : onSea(muted, "the credit"),
    },
    /** The band's own fill, and what the credit inside it is read against — `null` where there is no band. */
    band: creditBand ? ground : null,
  };
  if (contrast(sea, land) < 1.05) throw new Error(`the land ${land} cannot be told from the sea ${sea}`);
  const strokes = { hairline: (direction.stroke?.hairline ?? 0.6) * k, ring: (direction.stroke?.rule ?? 1) * k };

  // ── the live map: every station at its place, split by fuel and by the size it grows to ──────────────────────
  const fuels = subject.arrival.map((fuel) => ({ fuel, n: subject.byFuel[fuel].n }));
  const stations = Object.fromEntries(fuels.map(({ fuel }) => [fuel, subject.stations.filter((s) => s.fuel === fuel).map((s) => ({ lon: s.lon, lat: s.lat, mw: s.mw, w: weightRadiusOf(s.mw, subject.maxMw) }))]));
  const mapPlan = mapPlanFor({ fuels, stations, colours, strokes, dotR: DOT_R, ringR: 3.2 * DOT_R, cameras, stage });
  /** What the frame's drive reads (`scene.mjs`): the live map's state needs no overlay. */
  const drive = { cameras, fuels, subjectFuel: SUBJECT, total: subject.total, shareCapacity: copy.shareCapacity, shareCapacityExact: subject.shareCapacity, shareSites: subject.shareSites, states, timing: DOT_VIDEO_TIMING };
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
  const measuredSea = seaProbe(grid, sea);
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
  // WHERE THE KEY MAY STAND. At 1920x1080 it is the LEFT MARGIN: the Atlantic there is a band the whole height of
  // the frame and the composition was tuned on it. At 1080x1920 and 1080x1080 that band is gone — the same map is
  // fitted to a narrow frame, so the left margin runs down the middle of the ocean's stations and no height of it is
  // clear. So a frame that is not 16:9 sweeps the WHOLE stage and takes the place with the least measured land clear
  // of every station; the rule (least land, clear of every disc) does not change, only how far it may look.
  const keyColumns = [];
  for (let kx = inset; kx + key.width <= stage.width - inset; kx += SEAT_STEP) {
    keyColumns.push(kx);
    if (SIZE === "landscape") break;
  }
  let keyAt = null;
  for (let ky = vInset; ky + key.height <= mapFloor - (creditBand ? 0 : vInset); ky += SEAT_STEP)
    for (const kx of keyColumns) {
      const box = { x: kx, y: ky, width: key.width, height: key.height };
      // Clear of every station at its weight too: the discs grow under the key.
      if (discsIn(box)) continue;
      const share = landShare(box);
      if (!keyAt || share < keyAt.share - 1e-9) keyAt = { x: kx, y: ky, share };
    }
  if (!keyAt)
    throw new Error(
      `a ${key.width}×${key.height} key finds no place clear of every station on a ${stage.width}x${mapFloor} ` +
        `map, stage inset ${inset}/${vInset}, over ${keyColumns.length} column(s) from x ${keyColumns[0]} to ${keyColumns.at(-1)}`,
    );
  const keyBox = { x: keyAt.x, y: keyAt.y, width: key.width, height: key.height };

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
  // ── the credit: in its band of ground at the foot, or one line over open sea in the lowest, leftmost corner ────
  let creditAt = null;
  let credit = null;
  // THE BAND SEATS IT, AND NOTHING IS SEARCHED FOR. Where the frame gives the credit a band of the direction's own
  // ground (`CREDIT_BAND`), it is not looking for a surface: its place is the band's own, on the left margin where
  // every other block of this beat stands, on the frame's own bottom margin. The form is the LONGEST that holds ONE
  // line at this frame's measure, rather than the shortest that happened to fit a stretch of sea — at square
  // « WRI · © MapTiler © OpenStreetMap » rather than the bare attribution.
  if (creditBand) {
    const form = credits.find((f) => f.lines.length === 1) ?? credits[0];
    const room = creditBand.height - vInset - gap;
    if (form.width > stage.width - 2 * inset || form.height > room)
      throw new Error(
        `${id}: the ${form.width.toFixed(0)}×${form.height.toFixed(0)} credit does not fit the ${creditBand.height}px band of ground at ` +
          `the foot — the band holds ${(stage.width - 2 * inset).toFixed(0)}×${room.toFixed(0)} between the frame's margins. ` +
          `Give the beat a shorter form of the source, or grow CREDIT_BAND and measure the beat again.`,
      );
    creditAt = { x: inset, y: stage.height - vInset - form.height };
    const { register, ...rest } = form;
    credit = rest;
  }
  for (const form of creditAt ? [] : credits) {
    search: for (let cy = stage.height - vInset - form.height; cy >= vInset; cy -= SEAT_STEP)
      for (let cx = inset; cx + form.width <= stage.width - inset; cx += SEAT_STEP) {
        const box = { x: cx, y: cy, width: form.width, height: form.height };
        if (!oneSurface(box) || touches(box, keyBox, gap) || discsIn(box)) continue;
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
    /** The ground band at the foot — `null` at a frame whose credit stands on the map's own surface. */
    band: creditBand,
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
