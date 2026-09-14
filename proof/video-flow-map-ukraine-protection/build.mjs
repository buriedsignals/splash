// EVERYTHING ONE DIRECTION'S RENDER IS HANDED, BUILT IN BUN — the words, the key column, the land, the node, every band's
// path, width and length, every host's name placed, the colours and the states.
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
import { BAND_PROBE, bandOf, DRAWN_WIDER, haloOf, pillOf, sourceCreditFor, titleCardFor, verticalInsetFor, widthOf } from "../../skills/map-beat/scripts/shots.mjs";
import { videoRegistersOf } from "../../skills/map-beat/scripts/video-registers.mjs";
import { laea } from "../scrolly-cartogram-europe-lowcarbon/cartogram-geometry.mjs";
import { clipRing } from "../video-choropleth-europe-lowcarbon/geometry.mjs";
import { placePills } from "../video-choropleth-europe-lowcarbon/scene.mjs";
import { statesFor } from "./states.mjs";
import { FOCUS_HOSTS, loadSubject, NAMES, ORIGIN, SUBJECT } from "./subject.mjs";
import { FLOW_VIDEO_TIMING } from "./timing-contract.ts";

const HERE = dirname(fileURLToPath(import.meta.url));
export const ROOT = join(HERE, "..", "..");
export const DIRECTIONS = join(ROOT, "docs", "design-base", "directions");
export const SIZE = "landscape";
export const REGISTER_NAMES = ["display", "eyebrow", "body", "annot", "value", "axis"];
const NB = "\u00A0";
/** The static beat's window, [west, south, east, north]; a seat is the centre of a country's part inside it. */
const WINDOW = [-25, 34, 45, 72];
/** The focus box's padding, × its span (the static beat's 16 %). */
const FOCUS_PAD = 0.16;
/** The widest band, the largest host's, in px. */
export const WIDEST = 36;
/** A band narrower than this is not drawn; its people still count. */
export const BAND_FLOOR = 2;
const SEAT_STEP = 10;
const MAP_MARGIN = 300;
// The key's rhythm, × the axis lead.
const ROW_GAP = 0.15;
const TO_SCALE = 0.5;
const SCALE_GAP = 0.35;

export function loadBeat() {
  const subject = loadSubject();
  return { subject, states: statesFor(), copy: copyOf(subject) };
}

const n0 = (v) => Math.round(v).toLocaleString("fr-FR").replace(/[\u202F\u00A0\u2009]/g, NB);
const one = (v) => v.toLocaleString("fr-FR", { minimumFractionDigits: 1, maximumFractionDigits: 1 }).replace(/[\u202F\u00A0\u2009]/g, NB);
const amount = (p) => (p >= 1e6 ? `${(p / 1e6).toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}${NB}M` : `${Math.round(p / 1000)}${NB}k`);

export function copyOf(subject) {
  return {
    eyebrow: "Migrations · Europe",
    title: [`${one(subject.total / 1e6)} millions d’Ukrainiens sous protection temporaire — l’Allemagne et la Pologne en accueillent la moitié`, `${one(subject.total / 1e6)} millions d’Ukrainiens sous protection temporaire`],
    people: (p) => `${n0(p)}${NB}personnes`,
    share: (s) => `${NAMES[subject.topTwo[0]]} + ${NAMES[subject.topTwo[1]]}${NB}: ${Number.isInteger(s) ? s : one(s)}${NB}%`,
    scale: [
      { people: 1e6, text: `1${NB}million` },
      { people: 1e5, text: `100${NB}000` },
    ],
    origin: "Ukraine",
    host: (code, people) => `${NAMES[code]} ${amount(people)}`,
    source: [`Source : Eurostat, protection temporaire (migr_asytpsm), ${subject.month} · Natural Earth`, `Source : Eurostat (migr_asytpsm), ${subject.month}`].map((f) => f.replace(" · ", `${NB}· `)),
    topTwoShare: Number(subject.topTwoShare.toFixed(1)),
  };
}

export function textPerRegisterOf(copy, subject) {
  return {
    display: copy.title.join(" "),
    eyebrow: copy.eyebrow,
    body: copy.source.join(" "),
    annot: copy.origin,
    value: `${copy.people(subject.total)} ${copy.share(copy.topTwoShare)} 0123456789`,
    axis: [...subject.ranked.slice(0, FOCUS_HOSTS).map((f) => copy.host(f.code, f.people)), copy.origin, ...copy.scale.map((s) => s.text), ...copy.source].join(" "),
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
  const direction = resolveDirectionFamilies(readDirection(join(DIRECTIONS, `${id}.md`)), textPerRegisterOf(copy, subject));
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

  const titleCard = titleCardFor({ registers, eyebrow: copy.eyebrow, title: copy.title, size: SIZE, eyebrowToDisplay: EYEBROW_TO_DISPLAY });
  const { register: sourceRegister, ...credit } = sourceCreditFor({ registers, forms: copy.source, size: SIZE, k });

  // ── the key column: the people count, the top two's share, the width scale ────────────────────────────────────
  const { ranked, total } = subject;
  const perPixel = ranked[0].people / WIDEST;
  const widthOfPeople = (p) => p / perPixel;
  const measure = (t, r) => {
    const cased = applyCase(t, r.transform);
    return { text: cased, width: widthOf(cased, r) };
  };
  let cumulative = 0;
  const peopleTexts = { 0: measure(copy.people(0), value) };
  ranked.forEach((f, i) => {
    cumulative += f.people;
    peopleTexts[i + 1] = measure(copy.people(cumulative), value);
  });
  const shareSteps = [...Array.from({ length: Math.floor(copy.topTwoShare) + 1 }, (_, i) => i), copy.topTwoShare];
  const shareTexts = Object.fromEntries(shareSteps.map((s) => [String(s), measure(copy.share(s), value)]));
  const valueBand = bandOf(BAND_PROBE, value);
  const axisBand = bandOf(BAND_PROBE, axis);
  let y = pad + valueBand.ascent;
  const peopleRow = { x: pad, y };
  y += valueBand.descent + ROW_GAP * axis.lead + valueBand.ascent;
  const shareRow = { x: pad, y };
  y += valueBand.descent;
  const barLength = 1.4 * axis.lead;
  const scale = copy.scale.map((s, i) => {
    const h = Math.max(widthOfPeople(s.people), axisBand.ascent + axisBand.descent);
    const top = y + (i === 0 ? TO_SCALE : SCALE_GAP) * axis.lead;
    y = top + h;
    const cy = top + h / 2;
    return { width: widthOfPeople(s.people), x: pad, cy, length: barLength, label: { ...measure(s.text, axis), x: pad + barLength + SCALE_GAP * axis.lead, y: cy + (axisBand.ascent - axisBand.descent) / 2 } };
  });
  const keyWidth = Math.ceil(pad + Math.max(...Object.values(peopleTexts).map((t) => t.width), ...Object.values(shareTexts).map((t) => t.width), ...scale.map((s) => s.label.x - pad + s.label.width)) * (1 + DRAWN_WIDER) + pad);
  const keyHeight = Math.ceil(y + axisBand.descent + pad);

  // ── the camera: the box the ten largest hosts need, fitted to the stage to the right of the key column ─────────
  const [west, south, east, north] = WINDOW;
  const inWindow = ([lon, lat]) => lon >= west && lon <= east && lat >= south && lat <= north;
  const seatsUnit = {};
  for (const f of subject.geo.features) {
    const pts = f.geometry.coordinates.flat(2).filter(inWindow).map(([lon, lat]) => laea(lon, lat));
    if (!pts.length) continue;
    const prev = seatsUnit[f.properties.iso];
    const sum = pts.reduce((s, p) => [s[0] + p[0], s[1] + p[1]], [0, 0]);
    seatsUnit[f.properties.iso] = prev ? { sx: prev.sx + sum[0], sy: prev.sy + sum[1], n: prev.n + pts.length } : { sx: sum[0], sy: sum[1], n: pts.length };
  }
  const unitSeat = (iso) => {
    const s = seatsUnit[iso];
    if (!s) throw new Error(`${iso} has no seat inside the window`);
    return [s.sx / s.n, s.sy / s.n];
  };
  const focusSeats = [ORIGIN, ...ranked.slice(0, FOCUS_HOSTS).map((f) => f.code)].map(unitSeat);
  let fx0 = Math.min(...focusSeats.map((p) => p[0]));
  let fx1 = Math.max(...focusSeats.map((p) => p[0]));
  let fy0 = Math.min(...focusSeats.map((p) => p[1]));
  let fy1 = Math.max(...focusSeats.map((p) => p[1]));
  const px = (fx1 - fx0) * FOCUS_PAD;
  const py = (fy1 - fy0) * FOCUS_PAD;
  fx0 -= px;
  fx1 += px;
  fy0 -= py;
  fy1 += py;
  const mapBox = { x: inset + keyWidth + axis.lead, y: vInset, w: stage.width - 2 * inset - keyWidth - axis.lead, h: stage.height - 2 * vInset };
  const unitScale = Math.min(mapBox.w / (fx1 - fx0), mapBox.h / (fy1 - fy0));
  const offX = mapBox.x + (mapBox.w - (fx1 - fx0) * unitScale) / 2;
  const offY = mapBox.y + (mapBox.h - (fy1 - fy0) * unitScale) / 2;
  const toStage = ([x, y]) => [offX + (x - fx0) * unitScale, offY + (y - fy0) * unitScale];

  // ── the land ─────────────────────────────────────────────────────────────────────────────────────────────────
  const clip = { x0: -MAP_MARGIN, x1: stage.width + MAP_MARGIN, y0: -MAP_MARGIN, y1: stage.height + MAP_MARGIN };
  const rings = [];
  const land = [];
  for (const f of subject.geo.features) {
    const parts = [];
    for (const poly of f.geometry.coordinates)
      for (const ring of poly) {
        const cut = clipRing(ring.map(([lon, lat]) => toStage(laea(lon, lat))), clip);
        if (cut.length < 3) continue;
        const kept = [cut[0]];
        for (const p of cut.slice(1)) if (Math.abs(p[0] - kept.at(-1)[0]) + Math.abs(p[1] - kept.at(-1)[1]) >= 1) kept.push(p);
        if (kept.length < 3) continue;
        rings.push(kept);
        parts.push(`M${kept.map((p) => `${r1(p[0])} ${r1(p[1])}`).join("L")}Z`);
      }
    if (parts.length) land.push(parts.join(""));
  }
  const onLand = (x, y) => rings.some((ring) => insideRing(ring, x, y));

  // ── colours: the sea the bare ground, the land one measured step off it, the bands the accent ─────────────────
  const { ground, accent } = direction;
  const { ink, muted } = deriveFurniture(ground);
  let dose = 0.06;
  while (contrast(mix(ground, ink, dose), ground) < SEA_LAND_MIN && dose < 0.4) dose += 0.005;
  const landFill = mix(ground, ink, dose);
  const onBoth = (c, floor, what) => {
    for (const on of [landFill, ground]) {
      const w = adjustToContrast(c, on, floor);
      if (w && contrast(w, landFill) >= floor - 1e-9 && contrast(w, ground) >= floor - 1e-9) return w;
    }
    throw new Error(`${what} has no variant that reads at ${floor}:1 on both the land and the sea`);
  };
  const colours = {
    ground,
    land: landFill,
    band: onBoth(accent, NON_TEXT_CONTRAST_MIN, "a band"),
    subjectBand: onBoth(mix(accent, ink, 0.35), NON_TEXT_CONTRAST_MIN, "the subject's band"),
    node: onBoth(ink, NON_TEXT_CONTRAST_MIN, "the node's edge"),
    text: {
      eyebrow: adjustToContrast(registers.eyebrow.fill ?? accent, ground, TEXT_CONTRAST_MIN),
      title: adjustToContrast(registers.display.fill ?? ink, ground, TEXT_CONTRAST_MIN),
      count: onBoth(accent, TEXT_CONTRAST_MIN, "a count"),
      subject: onBoth(mix(accent, ink, 0.35), TEXT_CONTRAST_MIN, "the subject's name"),
      name: onBoth(ink, TEXT_CONTRAST_MIN, "a host's name"),
      key: onBoth(muted, TEXT_CONTRAST_MIN, "the key"),
    },
  };
  for (const [slot, c] of Object.entries(colours.text)) if (!c) throw new Error(`the ${slot} has no ink that reads`);

  // ── the node and the bands ────────────────────────────────────────────────────────────────────────────────────
  const [ox, oy] = toStage(unitSeat(ORIGIN));
  const originText = measure(copy.origin, axis);
  const nodeR = originText.width / 2 + 2 * pad;
  const nodeBox = { x: ox - nodeR, y: oy - nodeR, width: 2 * nodeR, height: 2 * nodeR };
  const bands = ranked.map((f) => {
    const [sx, sy] = toStage(unitSeat(f.code));
    const dx = sx - ox;
    const dy = sy - oy;
    const len = Math.hypot(dx, dy);
    const width = widthOfPeople(f.people);
    // A host is drawn only when its seat is inside the frame's margins: a band running off the edge ends nowhere.
    const inStage = sx >= inset && sx <= stage.width - inset && sy >= vInset && sy <= stage.height - vInset;
    const drawn = width >= BAND_FLOOR && inStage && len > nodeR * 1.5;
    const start = [ox + (dx / len) * nodeR, oy + (dy / len) * nodeR];
    const bow = Math.min(len * 0.1, 44) * (sy < oy ? -1 : 1);
    const control = [(start[0] + sx) / 2 - (dy / len) * bow, (start[1] + sy) / 2 + (dx / len) * bow];
    const quad = (t) => [(1 - t) ** 2 * start[0] + 2 * (1 - t) * t * control[0] + t * t * sx, (1 - t) ** 2 * start[1] + 2 * (1 - t) * t * control[1] + t * t * sy];
    const samples = Array.from({ length: 41 }, (_, i) => quad(i / 40));
    const length = samples.slice(1).reduce((s, p, i) => s + Math.hypot(p[0] - samples[i][0], p[1] - samples[i][1]), 0);
    return {
      code: f.code,
      people: f.people,
      top: subject.topTwo.includes(f.code),
      subject: f.code === SUBJECT,
      drawn,
      width: r1(width),
      d: `M${r1(start[0])} ${r1(start[1])}Q${r1(control[0])} ${r1(control[1])} ${r1(sx)} ${r1(sy)}`,
      length: Math.ceil(length) + 2,
      seat: { x: sx, y: sy },
      samples,
    };
  });

  // ── the key column: at the left margin, the height over the least land clear of every band ────────────────────
  const keyAt = (() => {
    let best = null;
    for (let ky = vInset; ky + keyHeight <= stage.height - vInset; ky += SEAT_STEP) {
      const box = { x: inset, y: ky, width: keyWidth, height: keyHeight };
      if (bands.some((b) => b.drawn && b.samples.some(([x, yy]) => x >= box.x - b.width && x <= box.x + box.width + b.width && yy >= box.y - b.width && yy <= box.y + box.height + b.width))) continue;
      let covered = 0;
      let totalCells = 0;
      for (let yy = box.y + 6; yy < box.y + box.height; yy += 12)
        for (let x = box.x + 6; x < box.x + box.width; x += 12) {
          totalCells++;
          if (onLand(x, yy)) covered++;
        }
      const share = covered / totalCells;
      if (!best || share < best.share - 1e-9 || (Math.abs(share - best.share) < 1e-9 && Math.abs(ky + keyHeight / 2 - stage.height / 2) < Math.abs(best.y + keyHeight / 2 - stage.height / 2))) best = { x: inset, y: ky, share };
    }
    if (!best) throw new Error(`a ${keyWidth}×${keyHeight} key finds no height at the left margin clear of every band`);
    return best;
  })();
  const keyBox = { x: keyAt.x, y: keyAt.y, width: keyWidth, height: keyHeight };

  // ── the names: the ten largest hosts, each at its band's end, kept apart and clear of the node and the key ─────
  const named = bands.filter((b) => b.drawn).slice(0, FOCUS_HOSTS);
  const crossesBand = (box) =>
    bands.some((b) => b.drawn && b.width >= WIDEST / 4 && b.samples.some(([x, yy], i) => {
      if (i === 0) return false;
      const [x0, y0] = b.samples[i - 1];
      // Densified: a quarter of the way between two samples as well as at each.
      return [0.25, 0.5, 0.75, 1].some((t) => {
        const qx = x0 + (x - x0) * t;
        const qy = y0 + (yy - y0) * t;
        return qx >= box.x - b.width / 2 && qx <= box.x + box.width + b.width / 2 && qy >= box.y - b.width / 2 && qy <= box.y + box.height + b.width / 2;
      });
    }));
  const pills = named.map((b) => ({ ...b, pill: pillOf(copy.host(b.code, b.people), axis, pad) }));
  const placed = placePills(
    pills.map((b) => ({ key: b.code, cx: b.seat.x, cy: b.seat.y, width: b.pill.width, height: b.pill.height })),
    { width: stage.width, height: stage.height },
    gap,
    // A name never sits across one of the wide bands (a quarter of the widest or more) — the thin ones pass under its halo.
    { obstacles: [nodeBox, { ...keyBox, x: 0, width: keyBox.x + keyBox.width }], allowed: (box) => !crossesBand(box) },
  );
  const names = Object.fromEntries(
    pills.map((b) => {
      const at = placed[b.code];
      const cx = at.x + b.pill.width / 2;
      const cy = at.y + b.pill.height / 2;
      return [b.code, { text: b.pill.text, width: b.pill.textWidth, x: at.x + b.pill.textX, y: at.y + b.pill.baseline, halo: haloOf(axis, k), haloColour: onLand(cx, cy) ? landFill : ground, box: { x: at.x, y: at.y, width: b.pill.width, height: b.pill.height } }];
    }),
  );

  // ── the credit: the lowest, leftmost free corner — no land, no band, no name, not the key ─────────────────────
  let creditAt = null;
  search: for (let cy = stage.height - vInset - credit.height; cy >= vInset; cy -= SEAT_STEP)
    for (let cx = inset; cx + credit.width <= stage.width - inset; cx += SEAT_STEP) {
      const box = { x: cx, y: cy, width: credit.width, height: credit.height };
      if (touches(box, keyBox, gap) || touches(box, nodeBox, gap) || Object.values(names).some((n) => touches(box, n.box, gap))) continue;
      if (bands.some((b) => b.drawn && b.samples.some(([x, yy]) => x >= box.x - b.width && x <= box.x + box.width + b.width && yy >= box.y - b.width && yy <= box.y + box.height + b.width))) continue;
      creditAt = { x: cx, y: cy };
      break search;
    }
  if (!creditAt) throw new Error(`a ${credit.width}×${credit.height} credit finds no free corner`);

  const props = {
    frame: stage,
    registers: { display: titleCard.register, eyebrow: registers.eyebrow, value, axis, source: sourceRegister },
    titleCard,
    legend: { at: { x: keyBox.x, y: keyBox.y }, width: keyWidth, height: keyHeight, peopleRow, shareRow, peopleTexts, shareTexts, scale, halo: haloOf(axis, k), valueHalo: haloOf(value, k) },
    credit: { ...credit, at: creditAt },
    colours,
    strokes: { node: (direction.stroke?.rule ?? 1) * k },
    land,
    node: { x: ox, y: oy, r: nodeR, label: { ...originText, x: ox, y: oy + (axisBand.ascent - axisBand.descent) / 2 } },
    bands: bands.map(({ samples, seat, ...b }) => b),
    names: Object.fromEntries(Object.entries(names).map(([c, { box, ...n }]) => [c, n])),
    topTwoShare: copy.topTwoShare,
    total,
    layoutInset: { x: inset, y: vInset },
    states,
    timing: FLOW_VIDEO_TIMING,
  };
  return { id, direction, props, report: { k, titleForm: titleCard.form, sourceForm: credit.form, keyLand: keyAt.share, drawn: bands.filter((b) => b.drawn).length, named: named.length } };
}
