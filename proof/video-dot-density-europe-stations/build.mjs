// EVERYTHING ONE DIRECTION'S RENDER IS HANDED, BUILT IN BUN — the words, the key and where it stands, the land, every
// station's place and weight, the colours and the states.
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
import { plateTints } from "#shared/map-beat/tints.mjs";
import { applyCase } from "../../skills/map-beat/scripts/registers.mjs";
import { BAND_PROBE, bandOf, DRAWN_WIDER, haloOf, sourceCreditFor, titleCardFor, verticalInsetFor, widthOf } from "../../skills/map-beat/scripts/shots.mjs";
import { videoRegistersOf } from "../../skills/map-beat/scripts/video-registers.mjs";
import { statesFor } from "./states.mjs";
import { dotGeometry, loadSubject, SUBJECT } from "./subject.mjs";
import { DOT_VIDEO_TIMING } from "./timing-contract.ts";

const HERE = dirname(fileURLToPath(import.meta.url));
export const ROOT = join(HERE, "..", "..");
export const DIRECTIONS = join(ROOT, "docs", "design-base", "directions");
export const SIZE = "landscape";
export const REGISTER_NAMES = ["display", "eyebrow", "body", "annot", "value", "axis"];
const NB = " ";
const SEAT_STEP = 10;
const LAND_CELL = 12;
const MAP_MARGIN = 200;
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
const TO_SYMBOLS = 0.45;
const SYMBOL_GAP = 0.35;

export function loadBeat() {
  const subject = loadSubject();
  return { subject, states: statesFor(), copy: copyOf(subject) };
}

const n0 = (v) => Math.round(v).toLocaleString("fr-FR").replace(/[   ]/g, NB);
const one = (v) => v.toLocaleString("fr-FR", { minimumFractionDigits: 1, maximumFractionDigits: 1 }).replace(/[   ]/g, NB);

export function copyOf(subject) {
  const { total, nuclear, shareSites, shareCapacity } = subject;
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
    source: ["Source : WRI Global Power Plant Database v1.3.0 · contours Natural Earth 50 m", "Source : WRI Global Power Plant Database · Natural Earth"].map((f) => f.replace(" · ", `${NB}· `)),
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

function insideRing(ring, x, y) {
  let hit = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) hit = !hit;
  }
  return hit;
}
const touches = (a, b, gap = 0) => a.x < b.x + b.width + gap && b.x < a.x + a.width + gap && a.y < b.y + b.height + gap && b.y < a.y + a.height + gap;

export function buildDirection(id, { subject, states, copy }) {
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
  const { register: sourceRegister, ...credit } = sourceCreditFor({ registers, forms: copy.source, size: SIZE, k });

  // ── the map: the window fitted to the frame's content box, the land running past it to the frame's edges ─────
  const content = { x: inset, y: vInset, w: stage.width - 2 * inset, h: stage.height - 2 * vInset };
  const geometry = dotGeometry(subject, { box: content, stage, margin: MAP_MARGIN });
  const landAt = (x, y) => geometry.rings.some((ring) => insideRing(ring, x, y));
  const dotsIn = (box) => geometry.dots.some((d) => d.x >= box.x - 3 && d.x <= box.x + box.width + 3 && d.y >= box.y - 3 && d.y <= box.y + box.height + 3);
  const weightOf = (mw) => Math.max(WEIGHT_FLOOR_R, WEIGHT_R * Math.sqrt(mw / subject.maxMw));
  /** Whether any station's disc, at its largest (its weight, or the dot and its ring), touches the box. */
  const discsIn = (box) =>
    geometry.dots.some((d) => {
      const r = Math.max(weightOf(d.mw), 3.2 * DOT_R) + 2;
      const nx = Math.min(Math.max(d.x, box.x), box.x + box.width);
      const ny = Math.min(Math.max(d.y, box.y), box.y + box.height);
      return Math.hypot(d.x - nx, d.y - ny) < r;
    });
  const landShare = (box) => {
    let covered = 0;
    let total = 0;
    for (let y = box.y + LAND_CELL / 2; y < box.y + box.height; y += LAND_CELL)
      for (let x = box.x + LAND_CELL / 2; x < box.x + box.width; x += LAND_CELL) {
        total++;
        if (landAt(x, y)) covered++;
      }
    return total ? covered / total : 0;
  };

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
      source: onSea(muted, "the credit"),
    },
  };
  if (contrast(sea, land) < 1.05) throw new Error(`the land ${land} cannot be told from the sea ${sea}`);

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
  const rows = ["stations", "nuclear", "power"].map((name, i) => {
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
  };
  // At the left margin, the height whose box holds no station and the least land.
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

  // ── the credit: the lowest, leftmost sea corner that holds it, clear of the key and of every station ─────────
  let creditAt = null;
  search: for (let cy = stage.height - vInset - credit.height; cy >= vInset; cy -= SEAT_STEP)
    for (let cx = inset; cx + credit.width <= stage.width - inset; cx += SEAT_STEP) {
      const box = { x: cx, y: cy, width: credit.width, height: credit.height };
      if (touches(box, keyBox, gap) || landShare(box) > 0.03 || discsIn(box)) continue;
      creditAt = { x: cx, y: cy };
      break search;
    }
  if (!creditAt) throw new Error(`a ${credit.width}×${credit.height} credit finds no sea corner`);

  // ── the stations: the subject drawn last, so a nuclear dot is never under a common one ──────────────────────
  const fuels = subject.arrival.map((fuel) => ({ fuel, n: subject.byFuel[fuel].n }));
  const dots = [...geometry.dots].sort((a, b) => (a.fuel === SUBJECT) - (b.fuel === SUBJECT) || b.mw - a.mw);
  const byFuel = Object.fromEntries(fuels.map(({ fuel }) => [fuel, dots.filter((d) => d.fuel === fuel).map((d) => ({ x: d.x, y: d.y, w: Math.round(Math.max(WEIGHT_FLOOR_R, WEIGHT_R * Math.sqrt(d.mw / subject.maxMw)) * 10) / 10 }))]));

  const props = {
    frame: stage,
    registers: { display: titleCard.register, eyebrow: registers.eyebrow, value, axis, source: sourceRegister },
    titleCard,
    legend: { ...key, at: { x: keyBox.x, y: keyBox.y } },
    credit: { ...credit, at: creditAt },
    colours,
    strokes: { hairline: (direction.stroke?.hairline ?? 0.6) * k, ring: (direction.stroke?.rule ?? 1) * k },
    land: geometry.land,
    fuels,
    subjectFuel: SUBJECT,
    stations: byFuel,
    dotR: DOT_R,
    ringR: 3.2 * DOT_R,
    total: subject.total,
    shareCapacity: copy.shareCapacity,
    copyTexts: { nuclear: copy.nuclear },
    layoutInset: { x: inset, y: vInset },
    states,
    timing: DOT_VIDEO_TIMING,
  };
  return { id, direction, props, report: { k, titleForm: titleCard.form, sourceForm: credit.form, keyLand: keyAt.share, dots: dots.length } };
}
