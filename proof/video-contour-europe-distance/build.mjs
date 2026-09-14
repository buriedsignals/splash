// EVERYTHING ONE DIRECTION'S RENDER IS HANDED, BUILT IN BUN — the words, the key and where it stands, the land, the
// field's raster and lines, every line's number seated on its own line, the farthest point, the colours, the states.
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
import { SEA_LAND_MIN } from "#shared/map-beat/tints.mjs";
import { applyCase } from "../../skills/map-beat/scripts/registers.mjs";
import { BAND_PROBE, bandOf, CREDIT_ONE_LINE, DRAWN_WIDER, haloOf, sourceCreditFor, titleCardFor, verticalInsetFor, widthOf } from "../../skills/map-beat/scripts/shots.mjs";
import { videoRegistersOf } from "../../skills/map-beat/scripts/video-registers.mjs";
import { fitViewBox } from "../../skills/scrolly/assets/reveal.mjs";
import { statesFor } from "./states.mjs";
import { loadSubject, NAMES } from "./subject.mjs";
import { CONTOUR_VIDEO_TIMING } from "./timing-contract.ts";

const HERE = dirname(fileURLToPath(import.meta.url));
export const ROOT = join(HERE, "..", "..");
export const DIRECTIONS = join(ROOT, "docs", "design-base", "directions");
export const SIZE = "landscape";
export const REGISTER_NAMES = ["display", "eyebrow", "body", "annot", "value", "axis"];
const NB = "\u00A0";
const SEAT_STEP = 10;
const LAND_CELL = 12;
/** The swatch beside « hors mesure », × the axis lead. */
const SWATCH_W = 1.2;
const SWATCH_H = 0.4;
const SWATCH_GAP = 0.3;
const ROW_GAP = 0.35;
/** The curve's panel height, × the axis lead; its inner margin, × the axis lead. */
const CHART_H = 7;
const CHART_PAD = 0.3;
/** The share of land the key and the chart may stand over. */
const PANEL_LAND = 0.03;
/** The side, in stage pixels, of the cells the credit's line is checked for measured land on. */
const CREDIT_PROBE = 6;
/** A line this close to the median gives way to it: at the scale of Europe the two run a few pixels apart. */
export const YIELD_KM = 50;

export function loadBeat() {
  const subject = loadSubject();
  return { subject, states: statesFor(subject), copy: copyOf(subject) };
}

const n0 = (v) => Math.round(v).toLocaleString("fr-FR").replace(/[\u202F\u00A0\u2009]/g, NB);

export function copyOf(subject) {
  const { field, MEDIAN, LEVELS } = subject;
  return {
    eyebrow: "Géographie · Europe",
    title: [`La moitié de l’Europe est à moins de ${n0(field.median)}${NB}km de la mer`, `L’Europe, mesurée depuis la mer`],
    count: `{p}${NB}% à moins de {km}${NB}km`,
    outside: "hors mesure",
    levels: LEVELS.map((level) => ({ level, label: `${level}${NB}km` })),
    summit: `${n0(field.deepest)}${NB}km`,
    source: [
      `Contours Natural Earth 50 m · champ mesuré sur une grille de 6${NB}km en projection équivalente (LAEA)`,
      `Natural Earth 50 m · grille de 6${NB}km, projection équivalente`,
      `Natural Earth · grille de 6${NB}km`,
    ].map((form) => form.replace(" · ", `${NB}· `)),
    medianLevel: MEDIAN,
    deepestName: NAMES[field.deepestIso],
  };
}

/** Every text the count can show, from 0 km to the farthest point — the widest sets the key's width. */
function countTexts(copy, subject) {
  const out = new Set();
  for (let km = 0; km <= Math.round(subject.field.deepest); km++) {
    const p = Math.round(subject.field.within[Math.min(km, subject.field.within.length - 1)]);
    out.add(copy.count.replace("{p}", p).replace("{km}", km));
  }
  out.add(copy.count.replace("{p}", 100).replace("{km}", Math.round(subject.field.deepest)));
  return [...out];
}

export function textPerRegisterOf(copy) {
  return {
    display: copy.title.join(" "),
    eyebrow: copy.eyebrow,
    body: copy.source.join(" "),
    annot: copy.summit,
    value: `${copy.count} 0123456789 ${copy.summit}`,
    axis: [...copy.levels.map((l) => l.label), copy.outside, ...copy.source].join(" "),
  };
}

const ringsOf = (d) =>
  d
    .split("Z")
    .filter(Boolean)
    .map((ring) => ring.replace(/^M/, "").split("L").map((p) => p.split(" ").map(Number)));
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
  for (const [name, r] of Object.entries(registers))
    if (!(r.fontSize >= row.minTypePx)) throw new Error(`register ${name} is ${r.fontSize}px, under the ${row.minTypePx}px floor`);
  const { field } = subject;
  const { axis, value } = registers;
  const gap = 0.25 * axis.lead;

  // ── the shots every type shares ──────────────────────────────────────────────────────────────────────────
  const titleCard = titleCardFor({ registers, eyebrow: copy.eyebrow, title: copy.title, size: SIZE, eyebrowToDisplay: EYEBROW_TO_DISPLAY });
  /** The credit on one line, in every form that holds one — the longest that finds a row is set. */
  const credits = copy.source.flatMap((form) => {
    try {
      return [sourceCreditFor({ registers, forms: [form], size: SIZE, k, ...CREDIT_ONE_LINE })];
    } catch {
      return [];
    }
  });
  if (!credits.length) throw new Error("no form of the source holds one line");
  const sourceRegister = credits[0].register;

  // ── the camera: the field's frame fitted to the stage and widened to it ─────────────────────────────────────
  const vb = fitViewBox({ x: 0, y: 0, w: field.width, h: field.height }, stage, { top: 0, right: 0, bottom: 0, left: 0 });
  const ppu = stage.width / vb.w;
  const toStage = ([x, y]) => [(x - vb.x) * ppu, (y - vb.y) * ppu];
  const landRings = [...field.shapes.study, ...field.shapes.other].flatMap(ringsOf).map((ring) => ring.map(toStage));
  const landAt = (x, y) => landRings.some((ring) => insideRing(ring, x, y));
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

  // ── colours: the scrolly's measured land step, the fill a tint of the accent, lines and numbers floored ──────
  const { ground, accent } = direction;
  const { ink, muted } = deriveFurniture(ground);
  let dose = 0.085;
  while (contrast(mix(ground, ink, dose), ground) < SEA_LAND_MIN && dose < 0.4) dose += 0.005;
  if (contrast(mix(ground, ink, dose), ground) < SEA_LAND_MIN) throw new Error(`no step of the ink separates land from sea by ${SEA_LAND_MIN}:1 on ${ground}`);
  const land = mix(ground, ink, dose);
  const outside = mix(ground, ink, dose / 2);
  const tint = mix(land, accent, 0.22);
  const floorOn = (colour, floor, what) => {
    let c = colour;
    for (const bg of [land, tint]) if (contrast(c, bg) < floor) c = adjustToContrast(c, bg, floor) ?? c;
    for (const bg of [land, tint]) if (contrast(c, bg) < floor - 1e-9) throw new Error(`${what} clears ${floor}:1 on one of the land and the fill, not on both`);
    return c;
  };
  const plain = copy.levels.filter((l) => l.level !== copy.medianLevel);
  const lineInk = Object.fromEntries(
    copy.levels.map((l) => [
      l.level,
      l.level === copy.medianLevel
        ? floorOn(accent, NON_TEXT_CONTRAST_MIN, "the median line")
        : floorOn(mix(mix(ground, ink, 0.35), accent, plain.length > 1 ? plain.indexOf(l) / (plain.length - 1) : 1), NON_TEXT_CONTRAST_MIN, `the ${l.level} km line`),
    ]),
  );
  const onGround = (c) => adjustToContrast(c, ground, TEXT_CONTRAST_MIN);
  const colours = {
    ground,
    land,
    outside,
    tint,
    rim: floorOn(accent, NON_TEXT_CONTRAST_MIN, "the sweep's front"),
    lines: lineInk,
    text: {
      eyebrow: onGround(registers.eyebrow.fill ?? accent),
      title: onGround(registers.display.fill ?? ink),
      count: onGround(accent),
      key: onGround(muted),
      label: floorOn(ink, TEXT_CONTRAST_MIN, "a line's number"),
      median: floorOn(accent, TEXT_CONTRAST_MIN, "the median's number"),
      // The credit may cross land outside the measurement: its ink reads on the sea and on that land.
      source: [ground, outside].map((on) => adjustToContrast(muted, on, TEXT_CONTRAST_MIN)).find((c) => c && contrast(c, ground) >= TEXT_CONTRAST_MIN && contrast(c, outside) >= TEXT_CONTRAST_MIN),
      axis: onGround(muted),
    },
  };
  for (const [slot, c] of Object.entries(colours.text)) if (!c) throw new Error(`the ${slot} has no ink that reads`);

  // ── the key: the count over « hors mesure », at the left margin, over the least land ────────────────────────
  const pad = haloOf(axis, k) / 2;
  /** Every text the count can show, keyed by its uncased form, cased by its register, with the width Bun measured —
   *  the composition draws the cased text and checks that width back. */
  const countWidths = Object.fromEntries(countTexts(copy, subject).map((t) => {
    const cased = applyCase(t, value.transform);
    return [t, { text: cased, width: widthOf(cased, value) }];
  }));
  const countBand = bandOf(BAND_PROBE, value);
  const keyBand = bandOf(BAND_PROBE, axis);
  const countWidth = Math.max(...Object.values(countWidths).map((c) => c.width));
  const countBaseline = pad + countBand.ascent;
  const swatch = { x: pad, y: countBaseline + countBand.descent + ROW_GAP * axis.lead, width: SWATCH_W * axis.lead, height: SWATCH_H * axis.lead };
  const outsideText = applyCase(copy.outside, axis.transform);
  const outsideLine = { text: outsideText, x: pad + swatch.width + SWATCH_GAP * axis.lead, y: swatch.y + swatch.height / 2 + (keyBand.ascent - keyBand.descent) / 2, width: widthOf(outsideText, axis) };
  const key = {
    width: Math.ceil(pad + Math.max(countWidth, outsideLine.x - pad + outsideLine.width) * (1 + DRAWN_WIDER) + pad),
    height: Math.ceil(Math.max(swatch.y + swatch.height, outsideLine.y + keyBand.descent) + pad),
    count: { x: pad, y: countBaseline },
    swatch,
    outside: outsideLine,
    halo: haloOf(axis, k),
    valueHalo: haloOf(value, k),
  };
  // ── the credit, the key and the curve: one column at the left ────────────────────────────────────────────────
  // THE CREDIT FIRST: one line is wider than the Atlantic the land leaves, so it takes the first row from the top whose
  // line crosses no measured land (it may cross Greenland, which is not measured), in an ink that reads on the sea and
  // on that land. The longest one-line form that finds a row is set.
  const studyRings = field.shapes.study.flatMap(ringsOf).map((ring) => ring.map(toStage));
  const probeCols = Math.ceil(stage.width / CREDIT_PROBE);
  const probeRows = Math.ceil(stage.height / CREDIT_PROBE);
  const measured = new Uint8Array(probeCols * probeRows);
  for (let j = 0; j < probeRows; j++)
    for (let i = 0; i < probeCols; i++) measured[j * probeCols + i] = studyRings.some((ring) => insideRing(ring, (i + 0.5) * CREDIT_PROBE, (j + 0.5) * CREDIT_PROBE)) ? 1 : 0;
  const overMeasured = (box) => {
    for (let j = Math.max(0, Math.floor(box.y / CREDIT_PROBE)); j < Math.min(probeRows, Math.ceil((box.y + box.height) / CREDIT_PROBE)); j++)
      for (let i = Math.max(0, Math.floor(box.x / CREDIT_PROBE)); i < Math.min(probeCols, Math.ceil((box.x + box.width) / CREDIT_PROBE)); i++) if (measured[j * probeCols + i]) return true;
    return false;
  };
  let credit = null;
  let creditAt = null;
  for (const form of credits) {
    search: for (let y = vInset; y + form.height <= stage.height - vInset; y += SEAT_STEP / 2)
      for (let x = inset; x + form.width <= stage.width - inset; x += SEAT_STEP) {
        if (overMeasured({ x, y, width: form.width, height: form.height })) continue;
        creditAt = { x, y };
        break search;
      }
    if (creditAt) {
      const { register, ...rest } = form;
      credit = rest;
      break;
    }
  }
  if (!creditAt) throw new Error(`no one-line form of the source finds a row that crosses no measured land`);
  const creditBox = { x: creditAt.x, y: creditAt.y, width: credit.width, height: credit.height };
  // THE KEY, hung under the credit when that place is over the sea; otherwise at the left margin over the least land.
  let keyAt = null;
  const underCredit = { x: creditBox.x, y: creditBox.y + creditBox.height + gap, width: key.width, height: key.height };
  if (landShare(underCredit) <= PANEL_LAND) keyAt = { x: underCredit.x, y: underCredit.y, share: landShare(underCredit) };
  if (!keyAt)
    for (let y = vInset; y + key.height <= stage.height - vInset; y += SEAT_STEP)
      for (let x = inset; x <= inset + 4 * SEAT_STEP; x += SEAT_STEP) {
        const box = { x, y, width: key.width, height: key.height };
        if (touches(box, creditBox, gap)) continue;
        const share = landShare(box);
        if (!keyAt || share < keyAt.share - 1e-9) keyAt = { x, y, share };
      }
  const keyBox = { x: keyAt.x, y: keyAt.y, width: key.width, height: key.height };
  // THE CURVE, under the key, as wide as it: the share of the land within each distance of the sea, 0 to the farthest
  // point, on one scale — every kilometre's share from the field's own `within` table.
  const chartBox = { x: keyBox.x, y: keyBox.y + keyBox.height + gap, width: keyBox.width, height: Math.round(CHART_H * axis.lead) };
  if (chartBox.y + chartBox.height > stage.height - vInset) throw new Error("the curve does not fit under the key");
  if (landShare(chartBox) > PANEL_LAND) throw new Error(`the curve would stand over ${(100 * landShare(chartBox)).toFixed(1)} % land`);
  const chartPad = CHART_PAD * axis.lead;
  const plot = { left: chartBox.x + chartPad, right: chartBox.x + chartBox.width - chartPad, top: chartBox.y + chartPad, bottom: chartBox.y + chartBox.height - chartPad };
  const maxKm = field.deepest;
  const cx = (km) => plot.left + ((plot.right - plot.left) * km) / maxKm;
  const cy = (p) => plot.bottom - ((plot.bottom - plot.top) * p) / 100;
  const r1 = (v) => Math.round(v * 10) / 10;
  const curve = [];
  for (let km = 0; km < maxKm; km++) curve.push([r1(cx(km)), r1(cy(field.within[Math.min(km, field.within.length - 1)]))]);
  curve.push([r1(cx(maxKm)), r1(cy(100))]);
  const chart = {
    x: chartBox.x,
    y: chartBox.y,
    width: chartBox.width,
    height: chartBox.height,
    plot,
    maxKm,
    path: curve.map(([x, y], i) => `${i ? "L" : "M"}${x} ${y}`).join(""),
    area: `M${r1(cx(0))} ${r1(plot.bottom)}${curve.map(([x, y]) => `L${x} ${y}`).join("")}L${r1(cx(maxKm))} ${r1(plot.bottom)}Z`,
    median: { x: cx(copy.medianLevel), y: cy(field.within[copy.medianLevel]) },
  };

  // ── the farthest point: a dot and its number beside it ───────────────────────────────────────────────────────
  const [sx, sy] = toStage(field.summit);
  const summitText = applyCase(copy.summit, value.transform);
  const summitBand = bandOf(summitText, value);
  const dot = 0.14 * axis.lead;
  const summitLine = { text: summitText, x: sx + 2.5 * dot, y: sy + (summitBand.ascent - summitBand.descent) / 2, width: widthOf(summitText, value) };
  const summitBox = { x: sx - 2 * dot, y: summitLine.y - summitBand.ascent - pad, width: summitLine.x + summitLine.width + pad - (sx - 2 * dot), height: summitBand.ascent + summitBand.descent + 2 * pad };

  // ── the numbers, one per line, each on its own line and never across another ────────────────────────────────
  // The scrolly's seats (`contour-field.mjs`): for each seat, the room a horizontal number has against every OTHER
  // level's lines at three half-widths. A number takes the smallest half-width covering it and asks for half its
  // height; among the seats that allow it, inside the margins and clear of the key, the farthest point's number and
  // every number already set, the one farthest from those numbers wins. The median first, then from the inside out.
  // A line within `YIELD_KM` of the median gives way to it (the scrolly's rule): the two never carry numbers at once.
  const yields = (a, b) => a.level !== b.level && (a.level === copy.medianLevel || b.level === copy.medianLevel) && Math.abs(a.level - b.level) < YIELD_KM;
  /** Every level's lines as stage points no more than 3 px apart, bucketed — what a number's box is checked against. */
  const BUCKET = 40;
  const buckets = field.lines.map(({ d }) => {
    const map = new Map();
    for (const part of d.split("M").filter(Boolean)) {
      const pts = part.split("L").map((q) => toStage(q.split(" ").map(Number)));
      for (let i = 1; i < pts.length; i++) {
        const [a, b] = [pts[i - 1], pts[i]];
        const n = Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / 3));
        for (let t = 0; t <= n; t++) {
          const px = a[0] + ((b[0] - a[0]) * t) / n;
          const py = a[1] + ((b[1] - a[1]) * t) / n;
          const key = `${Math.floor(px / BUCKET)},${Math.floor(py / BUCKET)}`;
          if (!map.has(key)) map.set(key, []);
          map.get(key).push([px, py]);
        }
      }
    }
    return map;
  });
  const pointsIn = (lj, box) => {
    for (let bx = Math.floor(box.x / BUCKET); bx <= Math.floor((box.x + box.width) / BUCKET); bx++)
      for (let by = Math.floor(box.y / BUCKET); by <= Math.floor((box.y + box.height) / BUCKET); by++)
        for (const [px, py] of buckets[lj].get(`${bx},${by}`) ?? []) if (px >= box.x && px <= box.x + box.width && py >= box.y && py <= box.y + box.height) return true;
    return false;
  };
  const order = [copy.levels.find((l) => l.level === copy.medianLevel), ...copy.levels.filter((l) => l.level !== copy.medianLevel).reverse()];
  const placed = [];
  const labels = {};
  const unlabelled = [];
  for (const l of order) {
    const li = copy.levels.indexOf(l);
    const r = axis;
    const text = applyCase(l.label, r.transform);
    const width = widthOf(text, r);
    const band = bandOf(BAND_PROBE, r);
    const w = width + 2 * pad;
    const h = band.ascent + band.descent + 2 * pad;
    let best = null;
    for (const seat of field.seats[li]) {
      const [ux, uy] = seat;
      const [cx, cy] = toStage([ux, uy]);
      const box = { x: cx - w / 2, y: cy - h / 2, width: w, height: h };
      if (box.x < inset || box.y < vInset || box.x + w > stage.width - inset || box.y + h > stage.height - vInset) continue;
      if (touches(box, keyBox, gap) || touches(box, summitBox, gap) || touches(box, chartBox, gap) || touches(box, creditBox, gap) || placed.some((p) => touches(box, p, gap))) continue;
      // AT THE VIDEO'S FLOOR A NUMBER IS TALLER THAN THE GAP BETWEEN TWO LINES: 100 km is about 24 px here, a 30 px
      // number with its halo about 50. So the still's « never across another line » becomes « across as few as the
      // line allows »: the halo, struck in the land's colour, masks what it crosses, and the seat crossing the fewest
      // other lines wins, then the one farthest from every number already set.
      const crossed = copy.levels.filter((other, lj) => lj !== li && !yields(l, other) && pointsIn(lj, box)).length;
      const spread = Math.min(Math.hypot(cx - sx, cy - sy), ...placed.map((p) => Math.hypot(cx - (p.x + p.width / 2), cy - (p.y + p.height / 2))));
      if (!best || crossed < best.crossed || (crossed === best.crossed && spread > best.spread)) best = { box, cx, cy, spread, crossed };
    }
    // A line with no seat where a number clears every other line carries none — the still's own ladder drops a
    // number rather than lay it across the next line. The median's is the claim, and is refused rather than dropped.
    if (!best) {
      if (l.level === copy.medianLevel) throw new Error(`the median line has no seat where its number clears every other line`);
      unlabelled.push(l.level);
      continue;
    }
    placed.push(best.box);
    labels[l.level] = { text, width, x: best.cx, y: best.cy + (band.ascent - band.descent) / 2, halo: haloOf(r, k), crossed: best.crossed };
  }


  const raster = field.raster;
  const [rx, ry] = toStage([raster.x, raster.y]);
  const props = {
    frame: stage,
    viewBox: vb,
    registers: { display: titleCard.register, eyebrow: registers.eyebrow, value, axis, source: sourceRegister },
    titleCard,
    legend: { ...key, at: { x: keyBox.x, y: keyBox.y }, template: copy.count, widths: countWidths, final: applyCase(copy.count.replace("{p}", 100).replace("{km}", Math.round(field.deepest)), value.transform), finalWidth: widthOf(applyCase(copy.count.replace("{p}", 100).replace("{km}", Math.round(field.deepest)), value.transform), value) },
    credit: { ...credit, at: creditAt },
    chart,
    layoutInset: { x: inset, y: vInset },
    colours,
    strokes: { line: (direction.stroke?.rule ?? 1) * k, median: 1.6 * (direction.stroke?.rule ?? 1) * k, dot },
    land: { study: field.shapes.study, other: field.shapes.other },
    lines: field.lines,
    levels: copy.levels.map(({ level }) => ({ level })),
    medianLevel: copy.medianLevel,
    yielding: copy.levels.filter(({ level }) => level !== copy.medianLevel && Math.abs(level - copy.medianLevel) < YIELD_KM).map(({ level }) => level),
    labels,
    summit: { x: sx, y: sy, line: summitLine },
    raster: { x: rx, y: ry, width: raster.w * ppu, height: raster.h * ppu, cols: raster.cols, rows: raster.rows, stepKm: raster.stepKm, bytes: Buffer.from(subject.bytes).toString("base64"), rimKm: Math.max(raster.stepKm * 2, 2.5 / (ppu * field.unitsPerKm)) },
    within: field.within,
    deepest: field.deepest,
    states,
    timing: CONTOUR_VIDEO_TIMING,
  };
  return { id, direction, props, report: { k, titleForm: titleCard.form, sourceForm: credit.form, keyLand: keyAt.share, chartLand: landShare(chartBox), ppu, labels: Object.keys(labels).map(Number), unlabelled } };
}
