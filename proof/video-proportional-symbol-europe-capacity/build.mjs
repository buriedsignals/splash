// EVERYTHING ONE DIRECTION'S RENDER IS HANDED, BUILT IN BUN — the words, the key and where it stands, the land, the
// hundred circles in rank order and the rest as points, the colours and the states.
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
import { dotGeometry, loadSubject, TOP } from "./subject.mjs";
import { SYMBOL_VIDEO_TIMING } from "./timing-contract.ts";

const HERE = dirname(fileURLToPath(import.meta.url));
export const ROOT = join(HERE, "..", "..");
export const DIRECTIONS = join(ROOT, "docs", "design-base", "directions");
export const SIZE = "landscape";
export const REGISTER_NAMES = ["display", "eyebrow", "body", "annot", "value", "axis"];
const NB = "\u00A0";
/** The largest station's radius, in px: area proportional to capacity, the radius on a square root. */
export const R_MAX = 38;
/** The key's named circles, in MW (the still's two repères). */
export const KEY_MW = [4000, 400];
/** A station outside the hundred: a point. */
const POINT_R = 1.6;
const MAP_MARGIN = 200;
const ROW_GAP = 0.15;
const TO_KEY = 0.5;
const GAP = 0.35;

export function loadBeat() {
  const subject = loadSubject();
  return { subject, states: statesFor(), copy: copyOf(subject) };
}

const n0 = (v) => Math.round(v).toLocaleString("fr-FR").replace(/[\u202F\u00A0\u2009]/g, NB);
const one = (v) => v.toLocaleString("fr-FR", { minimumFractionDigits: 1, maximumFractionDigits: 1 }).replace(/[\u202F\u00A0\u2009]/g, NB);

export function copyOf(subject) {
  const rest = subject.total - TOP;
  return {
    eyebrow: "Énergie · Europe",
    title: [`Un centième des sites porte plus d’un tiers de la puissance bas-carbone d’Europe`, `Un centième des sites, plus d’un tiers de la puissance`],
    /** The top count after `k` circles: whole percents while it climbs, one decimal at the hundredth. */
    top: (k) => `${k}${NB}centrales${NB}: ${k === TOP ? one(subject.cumulative[k - 1]) : k === 0 ? 0 : Math.round(subject.cumulative[k - 1])}${NB}%`,
    rest: `${n0(rest)}${NB}autres${NB}: ${one(100 - subject.shareTop)}${NB}%`,
    key: KEY_MW.map((mw) => `${n0(mw)}${NB}MW`),
    source: ["Source : WRI Global Power Plant Database v1.3.0 · contours Natural Earth 50 m", "Source : WRI Global Power Plant Database · Natural Earth"].map((f) => f.replace(" · ", `${NB}· `)),
  };
}

export function textPerRegisterOf(copy) {
  return {
    display: copy.title.join(" "),
    eyebrow: copy.eyebrow,
    body: copy.source.join(" "),
    annot: copy.key.join(" "),
    value: `${copy.top(TOP)} ${copy.rest} 0123456789`,
    axis: [...copy.key, ...copy.source].join(" "),
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
const r1 = (v) => Math.round(v * 10) / 10;

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
  const pad = haloOf(axis, k) / 2;
  const radiusOf = (mw) => R_MAX * Math.sqrt(Math.max(0, mw) / subject.maxMw);

  const titleCard = titleCardFor({ registers, eyebrow: copy.eyebrow, title: copy.title, size: SIZE, eyebrowToDisplay: EYEBROW_TO_DISPLAY });
  const { register: sourceRegister, ...credit } = sourceCreditFor({ registers, forms: copy.source, size: SIZE, k });

  const content = { x: inset, y: vInset, w: stage.width - 2 * inset, h: stage.height - 2 * vInset };
  const geometry = dotGeometry(subject, { box: content, stage, margin: MAP_MARGIN });
  const landAt = (x, y) => geometry.rings.some((ring) => insideRing(ring, x, y));

  // ── the marks: the hundred in rank order, the rest as points ─────────────────────────────────────────────────
  const top = subject.ranked.slice(0, TOP).map((s) => {
    const d = geometry.dots[s.index];
    return { x: d.x, y: d.y, r: r1(radiusOf(s.mw)), mw: s.mw };
  });
  const inTop = new Set(subject.ranked.slice(0, TOP).map((s) => s.index));
  const rest = geometry.dots.filter((_, i) => !inTop.has(i)).map((d) => [d.x, d.y]);

  // ── colours ─────────────────────────────────────────────────────────────────────────────────────────────────
  const { ground, accent } = direction;
  const { ink, muted } = deriveFurniture(ground);
  const { water: sea, land } = plateTints(direction);
  const walked = (c, on, floor, what) => {
    const w = adjustToContrast(c, on, floor);
    if (!w) throw new Error(`${what} has no variant that reads at ${floor}:1 on ${on}`);
    return w;
  };
  const circle = walked(mix(accent, ink, 0.2), land, NON_TEXT_CONTRAST_MIN, "a circle");
  const colours = {
    ground,
    sea,
    land,
    circle,
    point: mix(land, muted, 0.55),
    text: {
      eyebrow: walked(registers.eyebrow.fill ?? accent, ground, TEXT_CONTRAST_MIN, "the eyebrow"),
      title: walked(registers.display.fill ?? ink, ground, TEXT_CONTRAST_MIN, "the title"),
      top: walked(circle, sea, TEXT_CONTRAST_MIN, "the top count"),
      rest: walked(muted, sea, TEXT_CONTRAST_MIN, "the rest's count"),
      key: walked(muted, sea, TEXT_CONTRAST_MIN, "the key"),
    },
  };
  if (contrast(sea, land) < 1.05) throw new Error(`the land ${land} cannot be told from the sea ${sea}`);

  // ── the key: the two counts, the named circles ──────────────────────────────────────────────────────────────
  const measure = (t, r) => {
    const cased = applyCase(t, r.transform);
    return { text: cased, width: widthOf(cased, r) };
  };
  const topTexts = Object.fromEntries(Array.from({ length: TOP + 1 }, (_, i) => [String(i), measure(copy.top(i), value)]));
  const restText = measure(copy.rest, value);
  const valueBand = bandOf(BAND_PROBE, value);
  const axisBand = bandOf(BAND_PROBE, axis);
  let y = pad + valueBand.ascent;
  const topRow = { x: pad, y };
  y += valueBand.descent + ROW_GAP * axis.lead + valueBand.ascent;
  const restRow = { x: pad, y };
  y += valueBand.descent + TO_KEY * axis.lead;
  // One row per named circle: the circle in a column as wide as the largest, its label beside it — two labels set side
  // by side under two circles of different sizes ran into each other.
  const biggestR = radiusOf(KEY_MW[0]);
  const named = KEY_MW.map((mw, i) => {
    const r = radiusOf(mw);
    const h = Math.max(2 * r, axisBand.ascent + axisBand.descent);
    const top = y + (i === 0 ? 0 : GAP * axis.lead);
    const cy = top + h / 2;
    y = top + h;
    const t = measure(copy.key[i], axis);
    return { r: r1(r), cx: pad + biggestR, cy, label: { ...t, x: pad + 2 * biggestR + GAP * axis.lead, y: cy + (axisBand.ascent - axisBand.descent) / 2 } };
  });
  y += axisBand.descent;
  const keyWidth = Math.ceil(pad + Math.max(...Object.values(topTexts).map((t) => t.width), restText.width, ...named.map((n) => n.label.x - pad + n.label.width)) * (1 + DRAWN_WIDER) + pad);
  const keyHeight = Math.ceil(y + pad);
  const discsIn = (box) =>
    top.some((c) => Math.hypot(c.x - Math.min(Math.max(c.x, box.x), box.x + box.width), c.y - Math.min(Math.max(c.y, box.y), box.y + box.height)) < c.r + 3) ||
    rest.some(([x, yy]) => x >= box.x - 3 && x <= box.x + box.width + 3 && yy >= box.y - 3 && yy <= box.y + box.height + 3);
  let keyAt = null;
  for (let ky = vInset; ky + keyHeight <= stage.height - vInset; ky += 10) {
    const box = { x: inset, y: ky, width: keyWidth, height: keyHeight };
    if (discsIn(box)) continue;
    let covered = 0;
    let cells = 0;
    for (let yy = box.y + 6; yy < box.y + box.height; yy += 12)
      for (let x = box.x + 6; x < box.x + box.width; x += 12) {
        cells++;
        if (landAt(x, yy)) covered++;
      }
    const share = covered / cells;
    if (!keyAt || share < keyAt.share - 1e-9) keyAt = { x: inset, y: ky, share };
  }
  if (!keyAt) throw new Error(`a ${keyWidth}×${keyHeight} key finds no place at the left margin clear of every station`);
  const keyBox = { x: keyAt.x, y: keyAt.y, width: keyWidth, height: keyHeight };

  let creditAt = null;
  search: for (let cy = stage.height - vInset - credit.height; cy >= vInset; cy -= 10)
    for (let cx = inset; cx + credit.width <= stage.width - inset; cx += 10) {
      const box = { x: cx, y: cy, width: credit.width, height: credit.height };
      if (touches(box, keyBox, gap) || discsIn(box) || landAt(cx + credit.width / 2, cy + credit.height / 2)) continue;
      creditAt = { x: cx, y: cy };
      break search;
    }
  if (!creditAt) throw new Error(`a ${credit.width}×${credit.height} credit finds no sea corner`);

  const props = {
    frame: stage,
    registers: { display: titleCard.register, eyebrow: registers.eyebrow, value, axis, source: sourceRegister },
    titleCard,
    legend: { at: { x: keyBox.x, y: keyBox.y }, width: keyWidth, height: keyHeight, topRow, restRow, topTexts, restText, named, halo: haloOf(axis, k), valueHalo: haloOf(value, k) },
    credit: { ...credit, at: creditAt },
    colours,
    strokes: { circle: (direction.stroke?.rule ?? 1) * k * 1.4, hairline: (direction.stroke?.hairline ?? 0.6) * k },
    land: geometry.land,
    top,
    rest: rest.map(([x, yy]) => `M${r1(x)} ${r1(yy)}h0`).join(""),
    pointR: POINT_R,
    shareTop: Number(subject.shareTop.toFixed(1)),
    layoutInset: { x: inset, y: vInset },
    states,
    timing: SYMBOL_VIDEO_TIMING,
  };
  return { id, direction, props, report: { k, titleForm: titleCard.form, sourceForm: credit.form, keyLand: keyAt.share, shareTop: subject.shareTop } };
}
