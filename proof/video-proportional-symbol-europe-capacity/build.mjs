// EVERYTHING ONE DIRECTION'S RENDER IS HANDED, BUILT IN BUN — the words, the colours, the live map's plan and its still
// camera, the hundred circles in rank order and the rest as points, the key and the credit placed on the MEASURED map,
// and the states.
//
// The map is MapTiler's, drawn live under the overlay (`DirectedProportionalSymbolVideo.tsx`). Where the sea is under a
// box is not computed here: `measure.mjs` read it once on the real map and froze it in `measured.json`, with the digest
// of the plan it was read on. A plan that changed since is refused.
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
import { cellAt, countOf, near } from "../video-dot-density-europe-stations/build.mjs";
import { camerasOf, mapPlanFor, mapSeatsOf, projectorOf } from "./map-plan.mjs";
import { planDigestOf } from "./measure.mjs";
import { statesFor } from "./states.mjs";
import { loadSubject, TOP } from "./subject.mjs";
import { SYMBOL_VIDEO_TIMING } from "./timing-contract.ts";

export { cellAt, countOf, near };

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
const ROW_GAP = 0.15;
const TO_KEY = 0.5;
const GAP = 0.35;
const SEAT_STEP = 10;

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
  const rest = subject.total - TOP;
  const attribution = `©${NB}MapTiler ©${NB}OpenStreetMap`;
  return {
    eyebrow: "Énergie · Europe",
    title: [`Un centième des sites porte plus d’un tiers de la puissance bas-carbone d’Europe`, `Un centième des sites, plus d’un tiers de la puissance`],
    /** The top count after `k` circles: whole percents while it climbs, one decimal at the hundredth. */
    top: (k) => `${k}${NB}centrales${NB}: ${k === TOP ? one(subject.cumulative[k - 1]) : k === 0 ? 0 : Math.round(subject.cumulative[k - 1])}${NB}%`,
    rest: `${n0(rest)}${NB}autres${NB}: ${one(100 - subject.shareTop)}${NB}%`,
    key: KEY_MW.map((mw) => `${n0(mw)}${NB}MW`),
    // One line, over open sea, with the map's attribution: the longest form the measured sea holds is set.
    source: [`Source${NB}: WRI Global Power Plant Database · ${attribution}`, `WRI Global Power Plant Database · ${attribution}`, `WRI · ${attribution}`, attribution].map((f) => f.replaceAll(" · ", `${NB}· `)),
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

const MEASURED = join(HERE, "measured.json");
let measuredCache = null;
/** `measured.json`, read once: what `measure.mjs` froze on the real map. */
export function readMeasured() {
  if (measuredCache) return measuredCache;
  if (!existsSync(MEASURED)) throw new Error("no measured.json beside the beat — run measure.mjs with the worktree's .env loaded");
  measuredCache = JSON.parse(readFileSync(MEASURED, "utf8"));
  return measuredCache;
}

const touches = (a, b, gap = 0) => a.x < b.x + b.width + gap && b.x < a.x + a.width + gap && a.y < b.y + b.height + gap && b.y < a.y + a.height + gap;
const r1 = (v) => Math.round(v * 10) / 10;

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
  const pad = haloOf(axis, k) / 2;
  const radiusOf = (mw) => R_MAX * Math.sqrt(Math.max(0, mw) / subject.maxMw);

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
  const strokes = { circle: (direction.stroke?.rule ?? 1) * k * 1.4, hairline: (direction.stroke?.hairline ?? 0.6) * k };

  // ── the live map: the hundred in rank order, the rest as points ─────────────────────────────────────────────
  const inTop = new Set(subject.ranked.slice(0, TOP).map((s) => s.index));
  const topStations = subject.ranked.slice(0, TOP).map((s) => ({ lon: s.lon, lat: s.lat, r: r1(radiusOf(s.mw)), mw: s.mw }));
  const restSeats = subject.stations.filter((_, i) => !inTop.has(i)).map((s) => [s.lon, s.lat]);
  const mapPlan = mapPlanFor({ top: topStations, rest: restSeats, colours, strokes, pointR: POINT_R, cameras });
  const project = projectorOf(cameras.whole, stage);
  const top = topStations.map((c) => {
    const [x, y] = project([c.lon, c.lat]);
    return { x: r1(x), y: r1(y), r: c.r, mw: c.mw };
  });
  /** What the frame's drive reads (`scene.mjs`): the live map's state needs no overlay. */
  const drive = { cameras, top, states, timing: SYMBOL_VIDEO_TIMING };
  if (measured === null) return { props: { mapPlan, ...drive } };
  measured ??= readMeasured();
  if (measured.planDigest?.[id] !== planDigestOf(mapPlan)) throw new Error(`${id}: the plan changed since it was measured — run measure.mjs again`);
  if (measured.size.width !== stage.width || measured.size.height !== stage.height)
    throw new Error(`${id}: measured at ${measured.size.width}×${measured.size.height}, drawn at ${stage.width}×${stage.height}`);
  const { grid, projected } = measured.cameras[id].whole;
  const measuredSea = cellAt(grid, ...projected.atlantic);
  if (!near(measuredSea, sea)) throw new Error(`${id}: the measured sea ${measuredSea} is not the plate's sea ${sea}`);
  /** Not sea: the land, and every station drawn over the sea (the measured frame is the last, every mark in). */
  const landIn = countOf(grid, (c) => !near(c, measuredSea));
  const landShare = (box) => {
    const { count, total } = landIn(box);
    return total ? count / total : 0;
  };
  const rest = restSeats.map(project);
  /** Whether any of the hundred's discs, or any of the rest's points, touches the box. */
  const discsIn = (box) =>
    top.some((c) => Math.hypot(c.x - Math.min(Math.max(c.x, box.x), box.x + box.width), c.y - Math.min(Math.max(c.y, box.y), box.y + box.height)) < c.r + 3) ||
    rest.some(([x, yy]) => x >= box.x - 3 && x <= box.x + box.width + 3 && yy >= box.y - 3 && yy <= box.y + box.height + 3);

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
    const rowTop = y + (i === 0 ? 0 : GAP * axis.lead);
    const cy = rowTop + h / 2;
    y = rowTop + h;
    const t = measure(copy.key[i], axis);
    return { r: r1(r), cx: pad + biggestR, cy, label: { ...t, x: pad + 2 * biggestR + GAP * axis.lead, y: cy + (axisBand.ascent - axisBand.descent) / 2 } };
  });
  y += axisBand.descent;
  const keyWidth = Math.ceil(pad + Math.max(...Object.values(topTexts).map((t) => t.width), restText.width, ...named.map((n) => n.label.x - pad + n.label.width)) * (1 + DRAWN_WIDER) + pad);
  const keyHeight = Math.ceil(y + pad);
  // At the left margin, the height whose box holds no station and the least measured land.
  let keyAt = null;
  for (let ky = vInset; ky + keyHeight <= stage.height - vInset; ky += SEAT_STEP) {
    const box = { x: inset, y: ky, width: keyWidth, height: keyHeight };
    if (discsIn(box)) continue;
    const share = landShare(box);
    if (!keyAt || share < keyAt.share - 1e-9) keyAt = { x: inset, y: ky, share };
  }
  if (!keyAt) throw new Error(`a ${keyWidth}×${keyHeight} key finds no place at the left margin clear of every station`);
  const keyBox = { x: keyAt.x, y: keyAt.y, width: keyWidth, height: keyHeight };

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
    legend: { at: { x: keyBox.x, y: keyBox.y }, width: keyWidth, height: keyHeight, topRow, restRow, topTexts, restText, named, halo: haloOf(axis, k), valueHalo: haloOf(value, k) },
    credit: { ...credit, at: creditAt },
    colours,
    strokes,
    shareTop: Number(subject.shareTop.toFixed(1)),
    layoutInset: { x: inset, y: vInset },
    mapPlan,
    ...drive,
  };
  return { id, direction, props, rest, report: { k, titleForm: titleCard.form, sourceText: credit.lines[0].text, keyLand: keyAt.share, shareTop: subject.shareTop, layers: mapPlan.layers.length } };
}
