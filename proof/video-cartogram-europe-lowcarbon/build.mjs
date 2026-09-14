// EVERYTHING ONE DIRECTION'S RENDER IS HANDED, BUILT IN BUN — the words, the key and where it stands, the map's
// shapes and the tiles they travel to, every colour and the states. The runner renders what this returns; the
// tests read the same object, so what is asserted is what is drawn.
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
import { haloOf, keyFor, pillOf, registerAt, sourceCreditFor, titleCardFor, verticalInsetFor, widthOf, bandOf, BAND_PROBE, DRAWN_WIDER } from "../../skills/map-beat/scripts/shots.mjs";
import { videoRegistersOf } from "../../skills/map-beat/scripts/video-registers.mjs";
import { statesFor } from "./states.mjs";
import { cartogramGeometry, loadSubject, YEAR } from "./subject.mjs";
import { CARTOGRAM_VIDEO_TIMING } from "./timing-contract.ts";

const HERE = dirname(fileURLToPath(import.meta.url));
export const ROOT = join(HERE, "..", "..");
export const DIRECTIONS = join(ROOT, "docs", "design-base", "directions");
export const SIZE = "landscape";
export const REGISTER_NAMES = ["display", "eyebrow", "body", "annot", "value", "axis"];
const NB = "\u00a0";
/** How far past the stage the rings are kept: the camera never moves, so a little. */
const MAP_MARGIN = 200;
/** The step, in stage pixels, of the positions the key and the credit are tried at. */
const SEAT_STEP = 10;
/** The side, in stage pixels, of the cells the key's cover of land is sampled on. */
const LAND_CELL = 12;
/** A tile's code keeps this share of its register's size as breath on either side. */
const CODE_BREATH = 0.15;
/** Between the key and the grid, × the axis lead. */
const KEY_GUTTER = 1;

// ── the subject and its words ─────────────────────────────────────────────────────────────────────────────

export function loadBeat() {
  const subject = loadSubject();
  return { subject, states: statesFor(), copy: copyOf(subject) };
}

const one = (v) => v.toLocaleString("fr-FR", { minimumFractionDigits: 1, maximumFractionDigits: 1 }).replace(/[  ]/g, " ");
const NAMES = { RUS: "Russie" };

export function copyOf(subject) {
  const { byCountry, byArea, widest, share, BREAKS } = subject;
  if (!NAMES[widest]) throw new Error(`the video names ${widest} and has no French name for it`);
  return {
    eyebrow: "Énergie · Europe",
    title: [`Par pays, ${one(byCountry)}${NB}% de bas-carbone ; au km², ${one(byArea)}${NB}%`, `Une tuile par pays`],
    /** The two counts, each a label and a number — the value the template's `{n}` climbs to. */
    counts: {
      area: { template: `au km² {n}${NB}%`, value: Number(byArea.toFixed(1)) },
      country: { template: `par pays {n}${NB}%`, value: Number(byCountry.toFixed(1)) },
    },
    breaks: BREAKS.map((b) => `${b}${NB}%`),
    missingLabel: "sans donnée",
    widestName: `${NAMES[widest]} · ${Math.round(share.get(widest))}${NB}%`.toUpperCase(),
    source: [
      "Source : Ember, Energy Institute – Statistical Review of World Energy (2025), via Our World in Data · fonds Natural Earth 50 m",
      "Source : Ember, Energy Institute, via Our World in Data · Natural Earth",
    ].map((form) => form.replace(" · ", `${NB}· `)),
    codes: subject.placed.map((p) => p.iso),
  };
}

/** The words each register sets — the families are resolved on these. */
export function textPerRegisterOf(copy) {
  const final = (c) => c.template.replace("{n}", String(c.value).replace(".", ","));
  return {
    display: copy.title.join(" "),
    eyebrow: copy.eyebrow,
    body: copy.source.join(" "),
    annot: copy.widestName,
    value: `${final(copy.counts.area)} ${final(copy.counts.country)} 0123456789,`,
    axis: [...copy.codes, ...copy.breaks, copy.missingLabel, copy.widestName, ...copy.source].join(" "),
  };
}

// ── geometry helpers ─────────────────────────────────────────────────────────────────────────────────────

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

// ── one direction ──────────────────────────────────────────────────────────────────────────────────────────

export function buildDirection(id, { subject, states, copy }) {
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
  const finalCount = (c) => c.template.replace("{n}", String(c.value).replace(".", ","));
  const key = keyFor({ registers, k, counters: [[finalCount(copy.counts.area)], [finalCount(copy.counts.country)]], breaks: copy.breaks, missingLabel: copy.missingLabel });
  const { register: sourceRegister, ...credit } = sourceCreditFor({ registers, forms: copy.source, size: SIZE, k });

  // ── the map and the tiles ────────────────────────────────────────────────────────────────────────────────
  // The window is fitted to the frame's content box and the map runs past it to the frame's edges. The grid is
  // laid out to the right of the key, so the key stands in one place for the whole story and covers no tile.
  const content = { x: inset, y: vInset, w: stage.width - 2 * inset, h: stage.height - 2 * vInset };
  const gutter = KEY_GUTTER * registers.axis.lead;
  const tileBox = { x: inset + key.width + gutter, y: vInset, w: stage.width - inset - (inset + key.width + gutter), h: stage.height - 2 * vInset };
  const geometry = cartogramGeometry(subject, { mapBox: content, tileBox, stage, margin: MAP_MARGIN });

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
  const sea = plateTints(direction).water;
  /** A word read on both grounds the key stands on — the sea on the map, the ground under the tiles. */
  const readsOnBoth = (colour, floor = TEXT_CONTRAST_MIN) => {
    for (const on of [sea, ground]) {
      const walked = adjustToContrast(colour, on, floor);
      if (walked && contrast(walked, sea) >= floor - 1e-9 && contrast(walked, ground) >= floor - 1e-9) return walked;
    }
    throw new Error(`no variant of ${colour} reads at ${floor}:1 on both ${sea} and ${ground}`);
  };
  const mutedEdge = adjustToContrast(muted, ground, TEXT_CONTRAST_MIN) ?? muted;
  const colours = {
    ground,
    sea,
    neutral: floorOnGround(mix(ground, ink, 0.22), "the neutral country"),
    context: mix(ground, ink, 0.07),
    border: grid,
    classFills,
    missingEdge: mutedEdge,
    text: {
      eyebrow: adjustToContrast(registers.eyebrow.fill ?? accent, ground, TEXT_CONTRAST_MIN),
      title: adjustToContrast(registers.display.fill ?? ink, ground, TEXT_CONTRAST_MIN),
      count: readsOnBoth(accent),
      key: readsOnBoth(muted),
      source: adjustToContrast(muted, ground, TEXT_CONTRAST_MIN),
    },
  };
  for (const [slot, c] of Object.entries(colours.text)) if (!c) throw new Error(`the ${slot} has no ink that reads on ${ground}`);

  // ── the tiles' codes: the axis voice, as large as every tile holds, never under the floor ───────────────────
  const tile = geometry.countries[0].tile;
  let codeR = registers.axis;
  const widestCode = () => Math.max(...copy.codes.map((c) => widthOf(applyCase(c, codeR.transform), codeR)));
  const fitsTile = () => widestCode() * (1 + DRAWN_WIDER) + 2 * CODE_BREATH * codeR.fontSize <= tile.w && bandOf(BAND_PROBE, codeR).ascent + bandOf(BAND_PROBE, codeR).descent <= tile.h;
  while (!fitsTile() && codeR.fontSize - 0.5 >= row.minTypePx) codeR = registerAt(codeR, codeR.fontSize - 0.5);
  if (!fitsTile()) throw new Error(`a ${tile.w}×${tile.h}px tile cannot hold its code at the ${row.minTypePx}px floor`);
  const codeBand = bandOf(BAND_PROBE, codeR);

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
      classIndex,
      code: { text, width: widthOf(text, codeR), x: c.tile.x + c.tile.w / 2, y: c.tile.y + c.tile.h / 2 + (codeBand.ascent - codeBand.descent) / 2, ink: codeInk },
    };
  });

  // ── the key: at the left margin, where it covers the least land on the map ──────────────────────────────────
  const allRings = [...geometry.countries, ...geometry.context].flatMap((c) => c.rings);
  const landAt = (x, y) => allRings.some((ring) => insideRing(ring, x, y));
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
  let keyAt = null;
  for (let y = vInset; y + key.height <= stage.height - vInset; y += SEAT_STEP) {
    const share = landShare({ x: inset, y, width: key.width, height: key.height });
    if (!keyAt || share < keyAt.share - 1e-9) keyAt = { x: inset, y, share };
  }
  const keyBox = { x: keyAt.x, y: keyAt.y, width: key.width, height: key.height };

  // ── the widest country's name, on the map: inside its drawn shape, clear of the key ────────────────────────
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

  const drawn = { display: titleCard.register, eyebrow: registers.eyebrow, value: registers.value, axis: registers.axis, area, code: codeR, source: sourceRegister };
  const props = {
    frame: { width: stage.width, height: stage.height },
    stage,
    registers: drawn,
    titleCard,
    // `legend`, not `key`: React keeps `key` for itself and never hands it to the component.
    legend: { ...key, counters: undefined, at: { x: keyBox.x, y: keyBox.y }, counts: [{ ...copy.counts.area, line: key.counters[0][0] }, { ...copy.counts.country, line: key.counters[1][0] }] },
    credit: { ...credit, at: creditAt },
    widest: subject.widest,
    widestName: { ...name, x: nameAt.x, y: nameAt.y, ink: widestInk, halo: haloOf(area, k), haloColour: widestFill },
    colours,
    strokes: { border: (direction.stroke?.hairline ?? 0.6) * k, missingDash: [3 * k, 2 * k] },
    countries,
    context: geometry.context.map(({ rings, ...c }) => c),
    layoutInset: { x: inset, y: vInset },
    states,
    timing: CARTOGRAM_VIDEO_TIMING,
  };
  delete props.legend.counters;
  return {
    id,
    direction,
    props,
    report: { k, titleForm: titleCard.form, titleSize: titleCard.register.fontSize, sourceForm: credit.form, keyLand: keyAt.share, codeSize: codeR.fontSize, tile: { w: tile.w, h: tile.h }, year: YEAR },
  };
}
