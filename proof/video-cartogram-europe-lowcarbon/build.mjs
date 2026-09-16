// EVERYTHING ONE DIRECTION'S RENDER IS HANDED, BUILT IN BUN — the words, the live map's plan and its camera, the key
// and where it stands on the MEASURED map, the shapes projected at that camera and the tiles they travel to, every
// colour and the states. The runner renders what this returns; the tests read the same object, so what is asserted is
// what is drawn.
//
// The map is MapTiler's, drawn live under the overlay (`DirectedCartogramVideo.tsx`). What it paints under a box is not
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
import { haloOf, keyFor, pillOf, registerAt, sourceCreditFor, titleCardFor, verticalInsetFor, widthOf, bandOf, BAND_PROBE, CREDIT_ONE_LINE, DRAWN_WIDER } from "../../skills/map-beat/scripts/shots.mjs";
import { cellAt, countOf, near, nearestOf } from "../video-locator-zaporizhzhia/build.mjs";
export { cellAt, nearestOf };
import { cameraOf, mapPlanFor, mapSeatsOf, projectorOf, unprojectorOf, withName } from "./map-plan.mjs";
import { planDigestOf } from "./measure.mjs";
import { meanText } from "./scene.mjs";
import { videoRegistersOf } from "../../skills/map-beat/scripts/video-registers.mjs";
import { statesFor } from "./states.mjs";
import { cartogramGeometry, loadSubject, YEAR } from "./subject.mjs";
import { CARTOGRAM_VIDEO_TIMING } from "./timing-contract.ts";

const HERE = dirname(fileURLToPath(import.meta.url));
export const ROOT = join(HERE, "..", "..");
export const DIRECTIONS = join(ROOT, "docs", "design-base", "directions");
export const SIZE = "landscape";
export const REGISTER_NAMES = ["display", "eyebrow", "body", "annot", "value", "axis"];
const NB = "\u00A0";
/** How far past the stage the rings are kept: the camera never moves, so a little. */
const MAP_MARGIN = 200;
/** The step, in stage pixels, of the positions the key and the credit are tried at. */
const SEAT_STEP = 10;
/** A tile's code keeps this share of its register's size as breath on either side. */
const CODE_BREATH = 0.15;
/** Between the key and the grid, × the axis lead. */
const KEY_GUTTER = 1;
/** The credit's one line holds in the corner the tiles leave at the bottom left: this share of the content width. */
const CREDIT_MEASURE = 0.55;
/** The balance's bins: forty, each 2,5 points of share wide. */
const BINS = 40;
/** The key stands in the top quarter of the frame, where the map is sea; the balance takes the height under it. */
const KEY_ZONE = 0.25;

// ── the subject and its words ─────────────────────────────────────────────────────────────────────────────

export function loadBeat() {
  const subject = loadSubject();
  return { subject, states: statesFor(), copy: copyOf(subject), mapSeats: mapSeatsOf() };
}

const one = (v) => v.toLocaleString("fr-FR", { minimumFractionDigits: 1, maximumFractionDigits: 1 }).replace(/[\u202F\u00A0\u2009]/g, " ");
const NAMES = { RUS: "Russie" };

export function copyOf(subject) {
  const { byCountry, byArea, widest, share, BREAKS } = subject;
  if (!NAMES[widest]) throw new Error(`the video names ${widest} and has no French name for it`);
  return {
    eyebrow: "Énergie · Europe",
    title: [`Par pays, ${one(byCountry)}${NB}% de bas-carbone ; au km², ${one(byArea)}${NB}%`, `Une tuile par pays`],
    /** The balance's two pivots, each a label and a mean — the area mean's fixed, the live one's `{n}` sliding. */
    means: { area: `au km² {n}${NB}%`, country: `par pays {n}${NB}%` },
    breaks: BREAKS.map((b) => `${b}${NB}%`),
    missingLabel: "sans donnée",
    widestName: `${NAMES[widest]} · ${Math.round(share.get(widest))}${NB}%`.toUpperCase(),
    // One line, with the map's attribution: the longest form the tiles' free corner holds is set.
    source: [
      `Ember, via OWID · ©${NB}MapTiler ©${NB}OpenStreetMap`,
      `Ember · ©${NB}MapTiler ©${NB}OpenStreetMap`,
    ].map((form) => form.replaceAll(" · ", `${NB}· `)),
    codes: subject.placed.map((p) => p.iso),
  };
}

/** The words each register sets — the families are resolved on these. */
export function textPerRegisterOf(copy) {
  return {
    display: copy.title.join(" "),
    eyebrow: copy.eyebrow,
    body: copy.source.join(" "),
    annot: copy.widestName,
    value: `${copy.means.area} ${copy.means.country} 0123456789,`,
    axis: [...copy.codes, ...copy.breaks, copy.missingLabel, copy.widestName, ...copy.source].join(" "),
  };
}

// ── geometry helpers ─────────────────────────────────────────────────────────────────────────────────────

// ── the measured map ─────────────────────────────────────────────────────────────────────────────────────

const MEASURED = join(HERE, "measured.json");
let measuredCache = null;
/** `measured.json`, read once: what `measure.mjs` froze on the real map. */
export function readMeasured() {
  if (measuredCache) return measuredCache;
  if (!existsSync(MEASURED)) throw new Error("no measured.json beside the beat — run measure.mjs with the worktree's .env loaded");
  measuredCache = JSON.parse(readFileSync(MEASURED, "utf8"));
  return measuredCache;
}

export function insideRing(ring, x, y) {
  let hit = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) hit = !hit;
  }
  return hit;
}
const touches = (a, b, gap = 0) => a.x < b.x + b.width + gap && b.x < a.x + a.width + gap && a.y < b.y + b.height + gap && b.y < a.y + a.height + gap;

// ── one direction ──────────────────────────────────────────────────────────────────────────────────────────


/**
 * @param {{ measured?: any }} [options]  `measured: null` builds the plan and the camera only — what `measure.mjs` reads.
 */
export function buildDirection(id, { subject, states, copy }, { measured = undefined } = {}) {
  const direction = resolveDirectionFamilies(readDirection(join(DIRECTIONS, `${id}.md`)), textPerRegisterOf(copy));
  const resolved = Object.fromEntries(REGISTER_NAMES.map((name) => [name, registerOf(direction, name)]));
  const scaled = videoRegistersOf(resolved, SIZE);
  const k = scaled.axis.fontSize / resolved.axis.fontSize;
  const row = sizeFor(SIZE);
  const stage = { x: 0, y: 0, width: row.width, height: row.height };
  const inset = frameInsetFor(SIZE);
  const vInset = verticalInsetFor(SIZE);
  for (const [name, r] of Object.entries(scaled))
    if (!(r.fontSize >= row.minTypePx)) throw new Error(`register ${name} is ${r.fontSize}px, under the ${row.minTypePx}px floor`);
  // The still's map treatment for a name on the map: the axis voice tracked to at least 0.8 px of the still.
  const area = { ...scaled.axis, letterSpacing: Math.max(Number(scaled.axis.letterSpacing ?? 0), 0.8 * k), transform: "none" };
  const registers = { ...scaled, area };

  // ── the shots every type shares: the title card, the key, the credit ──────────────────────────────────────
  const titleCard = titleCardFor({ registers, eyebrow: copy.eyebrow, title: copy.title, size: SIZE, eyebrowToDisplay: EYEBROW_TO_DISPLAY });
  // The key is the classes alone: the two means are the balance's, under it.
  const key = keyFor({ registers, k, counters: [], breaks: copy.breaks, missingLabel: copy.missingLabel });
  const { register: sourceRegister, ...credit } = sourceCreditFor({ registers, forms: copy.source, size: SIZE, k, ...CREDIT_ONE_LINE, measure: CREDIT_MEASURE });

  // ── the camera, the shapes and the tiles ─────────────────────────────────────────────────────────────────
  // The window is fitted "meet" to the frame's content box and the map runs past it to the frame's edges; the shapes
  // are projected at that camera. The grid is laid out to the right of the key, so the key stands in one place for the
  // whole story and covers no tile.
  const content = { x: inset, y: vInset, w: stage.width - 2 * inset, h: stage.height - 2 * vInset };
  const gutter = KEY_GUTTER * registers.axis.lead;
  const tileBox = { x: inset + key.width + gutter, y: vInset, w: stage.width - inset - (inset + key.width + gutter), h: stage.height - 2 * vInset };
  const camera = cameraOf(content);
  const project = projectorOf(camera, stage);
  const unproject = unprojectorOf(camera, stage);
  const geometry = cartogramGeometry(subject, { project, tileBox, stage, margin: MAP_MARGIN });

  // ── colours, every one from the direction (the still's rules) ─────────────────────────────────────────────
  const { ground, accent } = direction;
  const { ink, muted, grid } = deriveFurniture(ground);
  const floorOnGround = (colour, what) => {
    if (contrast(colour, ground) >= NON_TEXT_CONTRAST_MIN) return colour;
    const lifted = adjustToContrast(colour, ground, NON_TEXT_CONTRAST_MIN);
    if (!lifted) throw new Error(`${what} cannot be told from the ground: nothing clears ${NON_TEXT_CONTRAST_MIN}:1 against ${ground}`);
    return lifted;
  };
  const low = floorOnGround(mix(accent, ground, 0.9), "the lowest class of the ramp");
  const high = mix(accent, ink, 0.3);
  const classCount = subject.BREAKS.length + 1;
  const classFills = Array.from({ length: classCount }, (_, i) => mix(low, high, i / (classCount - 1)));
  const { water: sea, land } = plateTints(direction);
  /** A word read on every ground the key and the balance stand on — the sea and the land on the map, the ground under
   *  the tiles. */
  const readsOnAll = (colour, floor = TEXT_CONTRAST_MIN) => {
    const on = [sea, land, ground];
    for (const base of on) {
      const walked = adjustToContrast(colour, base, floor);
      if (walked && on.every((g) => contrast(walked, g) >= floor - 1e-9)) return walked;
    }
    throw new Error(`no variant of ${colour} reads at ${floor}:1 on ${on.join(", ")}`);
  };
  const mutedEdge = adjustToContrast(muted, ground, TEXT_CONTRAST_MIN) ?? muted;
  const colours = {
    ground,
    sea,
    land,
    neutral: floorOnGround(mix(ground, ink, 0.22), "the neutral country"),
    border: grid,
    classFills,
    missingEdge: mutedEdge,
    text: {
      eyebrow: adjustToContrast(registers.eyebrow.fill ?? accent, ground, TEXT_CONTRAST_MIN),
      title: adjustToContrast(registers.display.fill ?? ink, ground, TEXT_CONTRAST_MIN),
      count: readsOnAll(accent),
      key: readsOnAll(muted),
      source: adjustToContrast(muted, ground, TEXT_CONTRAST_MIN),
    },
  };
  for (const [slot, c] of Object.entries(colours.text)) if (!c) throw new Error(`the ${slot} has no ink that reads on ${ground}`);
  const strokes = { border: (direction.stroke?.hairline ?? 0.6) * k, missingDash: [3 * k, 2 * k] };

  // ── the tiles' codes: the axis voice, as large as every tile holds, never under the floor ───────────────────
  const tile = geometry.countries[0].tile;
  let codeR = registers.axis;
  const widestCode = () => Math.max(...copy.codes.map((c) => widthOf(applyCase(c, codeR.transform), codeR)));
  const fitsTile = () => widestCode() * (1 + DRAWN_WIDER) + 2 * CODE_BREATH * codeR.fontSize <= tile.w && bandOf(BAND_PROBE, codeR).ascent + bandOf(BAND_PROBE, codeR).descent <= tile.h;
  while (!fitsTile() && codeR.fontSize - 0.5 >= row.minTypePx) codeR = registerAt(codeR, codeR.fontSize - 0.5);
  if (!fitsTile()) throw new Error(`a ${tile.w}×${tile.h}px tile cannot hold its code at the ${row.minTypePx}px floor`);
  const codeBand = bandOf(BAND_PROBE, codeR);

  /** The territory every country with a share takes, together — the map's weights are shares of it. */
  const areaSum = [...subject.share].filter(([, v]) => v !== null).reduce((s, [iso]) => s + (subject.area[iso] ?? 0), 0);
  const countries = geometry.countries.map((c) => {
    const value = subject.share.get(c.iso);
    const classIndex = subject.classOf(value);
    const onTile = classIndex === null ? ground : classFills[classIndex];
    const text = applyCase(c.iso, codeR.transform);
    const codeInk = adjustToContrast(ink, onTile, TEXT_CONTRAST_MIN);
    if (!codeInk) throw new Error(`${c.iso}'s code has no ink that reads on ${onTile}`);
    return {
      iso: c.iso,
      path: c.path,
      box: c.box,
      tile: c.tile,
      value: value ?? null,
      weight: value == null ? null : subject.area[c.iso] / areaSum,
      bin: value == null ? null : Math.min(BINS - 1, Math.floor((value / 100) * BINS)),
      classIndex,
      code: { text, width: widthOf(text, codeR), x: c.tile.x + c.tile.w / 2, y: c.tile.y + c.tile.h / 2 + (codeBand.ascent - codeBand.descent) / 2, ink: codeInk },
    };
  });

  const mapPlan = mapPlanFor({ countries, widest: subject.widest, colours, strokes, camera });
  /** What the live map's drive reads (`scene.mjs`, `mapStateAt`): it needs no overlay. */
  const drive = { camera, colours, states, timing: CARTOGRAM_VIDEO_TIMING };
  if (measured === null) return { props: { mapPlan, ...drive } };
  measured ??= readMeasured();
  if (measured.planDigest?.[id] !== planDigestOf(mapPlan)) throw new Error(`${id}: the plan changed since it was measured — run measure.mjs again`);
  if (measured.size.width !== stage.width || measured.size.height !== stage.height)
    throw new Error(`${id}: measured at ${measured.size.width}×${measured.size.height}, drawn at ${stage.width}×${stage.height}`);
  const { grid: cells, projected } = measured.cameras[id].whole;
  const measuredSea = cellAt(cells, ...projected.sea);
  if (!near(measuredSea, sea)) throw new Error(`${id}: the measured sea ${measuredSea} is not the direction's water tint ${sea}`);
  const seaIn = countOf(cells, (c) => near(c, measuredSea));
  /** What the measured map mostly paints under a box, for a halo: the sea, or the land. */
  const groundUnder = (box) => {
    const { count, total } = seaIn(box);
    return { halo: count >= total / 2 ? sea : land, land: total ? 1 - count / total : 0 };
  };

  /** The cells the measured map paints as a studied country — neither the basemap's sea nor its land. */
  const studiedIn = countOf(cells, (c) => ![sea, land].includes(nearestOf(c, [sea, land, colours.neutral, ...classFills])));

  // ── the key: at the left margin, in the top quarter, over no studied country and the least land ─────────────────
  // In Web Mercator Iceland stands in the key's column and Greenland above it: the key keeps clear of Iceland and may
  // stand partly on Greenland, which is context, so the balance under it keeps its height.
  let keyAt = null;
  for (let y = vInset; y <= vInset + KEY_ZONE * stage.height; y += SEAT_STEP) {
    const box = { x: inset, y, width: key.width, height: key.height };
    if (studiedIn(box).count) continue;
    const { land: share } = groundUnder(box);
    if (!keyAt || share < keyAt.share - 1e-9) keyAt = { x: inset, y, share };
  }
  if (!keyAt) throw new Error(`${id}: the key finds no place in the top quarter clear of every studied country`);
  const keyBox = { x: keyAt.x, y: keyAt.y, width: key.width, height: key.height };
  /** Each word of the key haloed in what the measured map paints under it. */
  const axisBand = bandOf(BAND_PROBE, registers.axis);
  const haloUnderLine = (line) => groundUnder({ x: keyBox.x + line.x, y: keyBox.y + line.y - axisBand.ascent, width: line.width, height: axisBand.ascent + axisBand.descent }).halo;

  // ── the widest country's name, on the map: inside its projected shape, clear of the key ────────────────────
  const widest = countries.find((c) => c.iso === subject.widest);
  const widestRings = geometry.countries.find((c) => c.iso === subject.widest).rings;
  const name = pillOf(copy.widestName, area, haloOf(area, k) / 2);
  let nameAt = null;
  for (let y = vInset; y + name.height <= stage.height - vInset; y += SEAT_STEP)
    for (let x = inset; x + name.width <= stage.width - inset; x += SEAT_STEP) {
      const box = { x, y, width: name.width, height: name.height };
      if (touches(box, keyBox)) continue;
      const cy = y + name.height / 2;
      const inside = [0, 0.25, 0.5, 0.75, 1].every((t) => widestRings.some((ring) => insideRing(ring, x + name.width * t, cy)));
      if (!inside) continue;
      // The most interior place: the one furthest from the frame's edges, towards the country's visible middle.
      const score = Math.abs(x + name.width / 2 - (widest.box.x + Math.min(widest.box.w, stage.width - widest.box.x) / 2)) + Math.abs(cy - (widest.box.y + widest.box.h / 2));
      if (!nameAt || score < nameAt.score) nameAt = { x, y, score };
    }
  if (!nameAt) throw new Error(`« ${copy.widestName} » finds no place wholly inside ${subject.widest}`);
  const widestFill = classFills[widest.classIndex];
  const nameCentre = [nameAt.x + name.width / 2, nameAt.y + name.height / 2];
  const underName = nearestOf(cellAt(cells, ...nameCentre), [sea, land, colours.neutral, ...classFills]);
  if (underName !== widestFill) throw new Error(`${id}: the measured map paints ${underName} under « ${copy.widestName} », not ${subject.widest}'s ${widestFill}`);
  const widestInk = adjustToContrast(muted, widestFill, TEXT_CONTRAST_MIN);
  if (!widestInk) throw new Error(`no ink reads « ${copy.widestName} » on ${widestFill}`);

  // ── the credit: in the lowest, leftmost free corner of the cartogram the video ends on ──────────────────────
  const tileBoxes = countries.map((c) => ({ x: c.tile.x, y: c.tile.y, width: c.tile.w, height: c.tile.h }));
  const gap = 0.25 * registers.axis.lead;
  let creditAt = null;
  search: for (let y = stage.height - vInset - credit.height; y >= vInset; y -= SEAT_STEP)
    for (let x = inset; x + credit.width <= stage.width - inset; x += SEAT_STEP) {
      const box = { x, y, width: credit.width, height: credit.height };
      if (touches(box, keyBox, gap) || tileBoxes.some((t) => touches(box, t, gap))) continue;
      creditAt = { x, y };
      break search;
    }
  if (!creditAt) throw new Error(`a ${credit.width}×${credit.height} credit finds no free corner of the cartogram`);

  // ── the balance: under the key, above the credit, as wide as the key ─────────────────────────────────────
  // Every country with a share is a column on a 0–100 % beam, in the bin of its share; its height is its weight —
  // its territory's share on the map, one in forty on the tiles — so the columns always fill the beam's height once
  // stacked. Under the beam, the two pivots: the area mean « au km² », and the live mean the morph slides.
  const valueBand = bandOf(BAND_PROBE, registers.value);
  const block = { x: keyBox.x, y: keyBox.y + keyBox.height + gutter, width: keyBox.width, height: 0 };
  block.height = creditAt.y - gap - block.y;
  const liveBaseline = block.y + block.height - valueBand.descent;
  const areaBaseline = liveBaseline - registers.value.lead;
  const pivotSize = 0.45 * registers.axis.lead;
  const beamY = areaBaseline - valueBand.ascent - gap - pivotSize;
  const beamHeight = beamY - block.y - gap;
  if (!(beamHeight >= 4 * registers.axis.lead)) throw new Error(`the balance has ${beamHeight.toFixed(0)}px of height between the key and the credit`);
  const valueTexts = (template, values) => Object.fromEntries(values.map((v) => meanText(template, v)).map((t) => [t, widthOf(applyCase(t, registers.value.transform), registers.value)]));
  const tenths = [];
  for (let t = Math.floor(subject.byArea * 10) - 1; t <= Math.ceil(subject.byCountry * 10) + 1; t++) tenths.push(t / 10);
  const beam = {
    x: block.x,
    y: beamY,
    width: block.width,
    height: beamHeight,
    binWidth: block.width / BINS,
    pivotSize,
    block,
    areaValue: subject.byArea,
    areaText: (() => {
      const text = meanText(copy.means.area, subject.byArea);
      return { text, width: widthOf(applyCase(text, registers.value.transform), registers.value), baseline: areaBaseline };
    })(),
    liveTemplate: copy.means.country,
    liveTexts: valueTexts(copy.means.country, tenths),
    liveBaseline,
  };
  const pivotBand = { x: block.x, y: beamY, width: block.width, height: liveBaseline + valueBand.descent - beamY };

  const drawn = { display: titleCard.register, eyebrow: registers.eyebrow, value: registers.value, axis: registers.axis, code: codeR, source: sourceRegister };
  const props = {
    frame: { width: stage.width, height: stage.height },
    stage,
    registers: drawn,
    titleCard,
    // `legend`, not `key`: React keeps `key` for itself and never hands it to the component.
    legend: { ...key, counters: undefined, at: { x: keyBox.x, y: keyBox.y }, halos: { bornes: key.bornes.map(haloUnderLine), missing: haloUnderLine(key.missingLabel) } },
    beam,
    credit: { ...credit, at: creditAt },
    widest: subject.widest,
    ...drive,
    colours: { ...colours, beamHalo: groundUnder(pivotBand).halo },
    strokes,
    countries,
    layoutInset: { x: inset, y: vInset },
    mapPlan: withName(mapPlan, { at: unproject(nameCentre), text: applyCase(copy.widestName, area.transform), register: area, ink: widestInk, halo: haloOf(area, k), haloColour: widestFill }),
  };
  delete props.legend.counters;
  return {
    id,
    direction,
    props,
    nameBox: { x: nameAt.x, y: nameAt.y, width: name.width, height: name.height },
    report: { k, titleForm: titleCard.form, titleSize: titleCard.register.fontSize, sourceForm: credit.form, keyLand: keyAt.share, codeSize: codeR.fontSize, tile: { w: tile.w, h: tile.h }, year: YEAR },
  };
}
