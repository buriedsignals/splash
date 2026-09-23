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
import { frameInsetFor, sizeFor, videoExportSize } from "#shared/chart-video/sizes.mjs";
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
/** The size this run exports at — `--size`, landscape when nothing asks. R2 names three and
 *  everything under it already answered per size; only this line pinned the beat to one. */
export const SIZE = videoExportSize();
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
/** The sea probes, in order: each is a seat `measure.mjs` projects on the real map, and the first that lands
 *  inside the frame on the plan's water tint says what the sea IS. */
const SEA_PROBES = ["atlantic"];

/** THE BAND THE KEY KEEPS, at a frame that is not 16:9 — a share of the stage's height reserved at the TOP, which
 *  the whole-map camera is fitted BELOW.
 *
 *  At 1920x1080 the key stands at the left margin, on the Atlantic, clear of every station, and the map takes the
 *  whole frame. Measured at 1080x1920: the same map fitted to the whole stage puts its widest open water in the
 *  Norwegian Sea across the top, 280 px deep, while the key is 473 px tall — and no box of the key's size anywhere
 *  on the stage is clear of every station. Reserving the band instead puts the key OUTSIDE the stations' own bounds,
 *  where nothing is drawn, rather than over the picture it explains. The seat search still refuses loudly when the
 *  key does not find the band, so this number is a budget and not a promise. */
const KEY_BAND = { landscape: 0, portrait: 0.3, square: 0 };

/**
 * THE GROUND BAND — A SQUARE FRAME DOES NOT LEAVE THE MAP ANYWHERE TO PUT ITS WORDS, so it stops asking.
 *
 * Reserving a band at the top was enough at 1080x1920: it kept the key off the stations, and the credit still found
 * a surface of its own lower down the tall frame. At 1080x1080 it is not. Europe is fitted there by its WIDTH, so
 * the frame IS Europe — measured 2026-09-24 on the square whole-map picture, the bottom 100 px of the frame are
 * about 72 % land and the top 100 px about 27 %, and there is no sky and no sea anywhere to stand a line on. All
 * three directions refused with « no one-line form of the source finds open sea clear of the key and every station
 * on the measured map », and that refusal was right: the surface does not exist.
 *
 * So at square the frame carries a band of the DIRECTION'S OWN GROUND across its foot, and the key and the credit
 * stand on it. They cross no coast because they cross no map at all. The live map keeps the whole width above,
 * fitted into the band that is left (`contentOf` → `camerasOf`), which is the same fit the tall frame already used,
 * flipped to the other edge: the credit belongs at the foot of a frame, and the key reads above it.
 *
 * THE SHARE, MEASURED RATHER THAN CHOSEN: the band has to hold the key over the credit with the frame's own margin
 * under it, and the tallest of the three is rapport's — 12 + 314 + 12 + 48 + 72 = 458 px (2026-09-24). 0.43 of 1080
 * is 464. It is a budget and not a promise: `buildDirection` refuses with the arithmetic when a direction's blocks
 * do not fit it, exactly as the seat search refuses at the other frames.
 */
const GROUND_BAND = { landscape: 0, portrait: 0, square: 0.43 };
/** THE AIR BETWEEN THE LAST STATION'S SEAT AND THE BAND. `camerasOf` fits the bounds of every station's SEAT into the
 *  content box, and a station is drawn as a disc around its seat — up to `R_MAX` of it. Measured 2026-09-24: with the
 *  content box running to the band's own edge, the southernmost mark's seat landed on y 616 and the mark itself
 *  reached 618, two pixels under the band. So the box stops a whole largest-radius short of it, and the guard in
 *  `buildDirection` then holds for every mark rather than for most of them. */
const MARK_AIR = R_MAX + 2;
/** The least share of the frame the live map keeps once the band has taken its room — the static twin's
 *  `MIN_MAP_SHARE` (`proof/static-choropleth-europe-lowcarbon/DirectedChoroplethMap.tsx`) and its reasoning: below a
 *  third the map stops being the largest single thing in the frame. */
const MIN_MAP_SHARE = 1 / 3;

/** The band of the direction's own ground across the frame's foot, or `null` at a frame whose map has room for its
 *  own words. Direction-independent, because the camera is fitted to what it leaves and one camera serves all three. */
export function groundBandOf() {
  const { width, height } = sizeFor(SIZE);
  const share = GROUND_BAND[SIZE];
  if (!share) return null;
  const h = Math.round(share * height);
  if (height - h < height * MIN_MAP_SHARE)
    throw new Error(`the ground band is ${h}px of a ${height}px frame and leaves the map ${height - h}px, under the ${Math.round(height * MIN_MAP_SHARE)}px a map beat keeps for its map`);
  return { x: 0, y: height - h, width, height: h };
}

/** The stage's content box: the frame the whole-map camera fits — above the ground band where there is one, below
 *  the band the key keeps where there is not. */
export function contentOf() {
  const { width, height } = sizeFor(SIZE);
  const inset = frameInsetFor(SIZE);
  const vInset = verticalInsetFor(SIZE);
  const ground = groundBandOf();
  if (ground) return { x: inset, y: vInset, w: width - 2 * inset, h: ground.y - MARK_AIR - vInset };
  const band = Math.round(KEY_BAND[SIZE] * height);
  return { x: inset, y: vInset + band, w: width - 2 * inset, h: height - 2 * vInset - band };
}

export function loadBeat() {
  const subject = loadSubject();
  return { subject, states: statesFor(), copy: copyOf(subject), cameras: camerasOf(subject, contentOf(), sizeFor(SIZE)), mapSeats: mapSeatsOf(subject) };
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
        `Run: set -a && . ./.env && set +a && bun proof/video-proportional-symbol-europe-capacity/measure.mjs --size ${SIZE}`,
    );
  measuredCache = all[SIZE];
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
  /** The band of the direction's own ground across the foot, where the frame has one (`groundBandOf`). */
  const band = groundBandOf();
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
    /** The band's fill, and the surface its words are read against — `null` at a frame whose words stand on the map. */
    band: band ? ground : null,
    text: {
      eyebrow: walked(registers.eyebrow.fill ?? accent, ground, TEXT_CONTRAST_MIN, "the eyebrow"),
      title: walked(registers.display.fill ?? ink, ground, TEXT_CONTRAST_MIN, "the title"),
      // The counts, the key and the credit stand on the measured sea — or, where the frame carries a ground band
      // under the map, on the direction's own ground, which is what the band is FOR: ink read off the page.
      top: walked(circle, band ? ground : sea, TEXT_CONTRAST_MIN, "the top count"),
      rest: walked(muted, band ? ground : sea, TEXT_CONTRAST_MIN, "the rest's count"),
      key: walked(muted, band ? ground : sea, TEXT_CONTRAST_MIN, "the key"),
    },
  };
  if (contrast(sea, land) < 1.05) throw new Error(`the land ${land} cannot be told from the sea ${sea}`);
  const strokes = { circle: (direction.stroke?.rule ?? 1) * k * 1.4, hairline: (direction.stroke?.hairline ?? 0.6) * k };

  // ── the live map: the hundred in rank order, the rest as points ─────────────────────────────────────────────
  const inTop = new Set(subject.ranked.slice(0, TOP).map((s) => s.index));
  const topStations = subject.ranked.slice(0, TOP).map((s) => ({ lon: s.lon, lat: s.lat, r: r1(radiusOf(s.mw)), mw: s.mw }));
  const restSeats = subject.stations.filter((_, i) => !inTop.has(i)).map((s) => [s.lon, s.lat]);
  const mapPlan = mapPlanFor({ top: topStations, rest: restSeats, colours, strokes, pointR: POINT_R, cameras, stage });
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
  // WHERE THE KEY MAY STAND. At 1920x1080 it is the LEFT MARGIN: the Atlantic there is a band the whole height of
  // the frame and the composition was tuned on it. At 1080x1920 and 1080x1080 that band is gone — the same map is
  // fitted to a narrow frame, so the left margin runs down the middle of the ocean's stations and no height of it is
  // clear. So a frame that is not 16:9 sweeps the WHOLE stage and takes the place with the least measured land clear
  // of every station; the rule (least land, clear of every disc) does not change, only how far it may look.
  const keyColumns = [];
  for (let kx = inset; kx + keyWidth <= stage.width - inset; kx += SEAT_STEP) {
    keyColumns.push(kx);
    if (SIZE === "landscape") break;
  }
  let keyAt = null;
  /** THE BAND SEATS THE KEY, AND NOTHING IS SEARCHED FOR IT: its place is the band's own, at the left margin where
   *  every other block of this beat stands, with the credit under it on the frame's own margin. The share reserved
   *  for the band is a budget (`GROUND_BAND`), so the blocks are measured against it here and the frame is refused
   *  with the arithmetic rather than drawn with the credit off the bottom edge. */
  const creditInBand = band ? (credits.find((c) => c.lines.length === 1) ?? credits[0]) : null;
  if (band) {
    const needed = gap + keyHeight + gap + creditInBand.height + vInset;
    if (needed > band.height)
      throw new Error(
        `${id}: the ground band is ${band.height}px and the key over the credit needs ${Math.ceil(needed)}px ` +
          `(${gap.toFixed(0)} + ${keyHeight} + ${gap.toFixed(0)} + ${Math.round(creditInBand.height)} + ${vInset}). ` +
          `Raise GROUND_BAND for ${SIZE}, or give the beat a shorter key.`,
      );
    const widest = Math.max(keyWidth, creditInBand.width);
    if (widest > stage.width - 2 * inset)
      throw new Error(`${id}: the band holds ${stage.width - 2 * inset}px of content and its widest block is ${Math.ceil(widest)}px`);
    keyAt = { x: inset, y: band.y + gap, share: 0 };
  } else {
    for (let ky = vInset; ky + keyHeight <= stage.height - vInset; ky += SEAT_STEP)
      for (const kx of keyColumns) {
        const box = { x: kx, y: ky, width: keyWidth, height: keyHeight };
        if (discsIn(box)) continue;
        const share = landShare(box);
        if (!keyAt || share < keyAt.share - 1e-9) keyAt = { x: kx, y: ky, share };
      }
  }
  if (!keyAt)
    throw new Error(
      `a ${keyWidth}×${keyHeight} key finds no place clear of every station on a ${stage.width}x${stage.height} ` +
        `stage inset ${inset}/${vInset}, over ${keyColumns.length} column(s) from x ${keyColumns[0]} to ${keyColumns.at(-1)}`,
    );
  const keyBox = { x: keyAt.x, y: keyAt.y, width: keyWidth, height: keyHeight };
  // NOTHING THE BAND COVERS IS EVIDENCE, and that is the camera's contract rather than a hope: `camerasOf` fits the
  // bounds of EVERY station into the content box, and the content box stops where the band starts (`contentOf`).
  // Checked here on the projected marks, because a band drawn over a station would hide a reading the beat counts.
  if (band) {
    const lowest = Math.max(...top.map((c) => c.y + c.r), ...rest.map(([, y]) => y + POINT_R));
    if (lowest > band.y)
      throw new Error(`${id}: the ground band starts at y ${band.y} and a station reaches ${lowest.toFixed(0)} — the band would cover a mark`);
  }

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
  // ── the credit: one line over open sea, in the lowest, leftmost corner clear of the key and every station ─────
  let creditAt = null;
  let credit = null;
  if (band) {
    // THE BAND SETS THE CREDIT on the frame's own bottom margin, and the form is the longest that holds ONE line at
    // this measure rather than the longest a sea happened to hold: a credit given two lines takes its second line
    // out of the map's own height. Measured 2026-09-24 at square: « WRI · © MapTiler © OpenStreetMap » at 669 px
    // (creme) and « WRI Global Power Plant Database · © MapTiler © OpenStreetMap » at 792 px (nocturne).
    const { register, ...form } = creditInBand;
    credit = form;
    creditAt = { x: inset, y: stage.height - vInset - form.height };
  } else {
    for (const form of credits) {
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
  }
  if (!creditAt) throw new Error(`${id}: no one-line form of the source finds open sea clear of the key and every station on the measured map`);

  const props = {
    frame: stage,
    /** The ground band across the foot — `null` at a frame that seats its words on the map's own surfaces. */
    band,
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
