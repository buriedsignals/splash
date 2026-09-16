// EVERYTHING ONE DIRECTION'S RENDER IS HANDED, BUILT IN BUN — the words, the seven rails on one scale and the camera's two
// spacings, Finland's bar and its pieces, every line's vertices, every name seated once at its highest vertex (and the
// close-up's names spread beside the nuclear rail), the two floors, every counter text measured and keyed, the colours
// and the states.
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
import { applyCase } from "../../skills/chart-video/scripts/registers.mjs";
import { BAND_PROBE, bandOf, CREDIT_ONE_LINE, DRAWN_WIDER, haloOf, sourceCreditFor, titleCardFor, verticalInsetFor, widthOf } from "../../skills/chart-video/scripts/shots.mjs";
import { videoRegistersOf } from "../../skills/chart-video/scripts/video-registers.mjs";
import { statesFor } from "./states.mjs";
import { AXES, loadSubject, NUCLEAR_FLOOR, WIND_FLOOR } from "./subject.mjs";
import { PARALLEL_VIDEO_TIMING } from "./timing-contract.ts";

const HERE = dirname(fileURLToPath(import.meta.url));
export const ROOT = join(HERE, "..", "..");
export const DIRECTIONS = join(ROOT, "docs", "design-base", "directions");
export const SIZE = "landscape";
export const REGISTER_NAMES = ["display", "eyebrow", "body", "annot", "value", "axis"];
const NB = "\u00A0";
/** The pitch between two close-up names, × the label band. */
export const PITCH = 1.08;

export function loadBeat() {
  const subject = loadSubject();
  return { subject, states: statesFor(), copy: copyOf(subject) };
}

export function copyOf(subject) {
  return {
    eyebrow: `Énergie${NB}· Europe`,
    title: [
      `${subject.both.length} pays sur ${subject.lines.length} ont plus de ${NUCLEAR_FLOOR}${NB}% de nucléaire et plus de ${WIND_FLOOR}${NB}% d’éolien`,
      `${subject.both.length} pays sur ${subject.lines.length} passent ${NUCLEAR_FLOOR}${NB}% de nucléaire et ${WIND_FLOOR}${NB}% d’éolien`,
    ],
    /** Where a full name is wider than the gap between two rails. */
    short: { GBR: "R.-U." },
    whole: `100${NB}%`,
    percent: (v) => `${v}${NB}%`,
    count: (n) => `${n}${NB}pays`,
    source: [
      "Source : Ember, Energy Institute – Statistical Review of World Energy (2025), via Our World in Data",
      "Source : Ember, Energy Institute – Statistical Review of World Energy, via Our World in Data",
      "Source : Ember, Energy Institute, via Our World in Data",
    ],
  };
}

export function textPerRegisterOf(copy, subject) {
  return {
    display: copy.title.join(" "),
    eyebrow: copy.eyebrow,
    body: copy.source.join(" "),
    annot: AXES.map((a) => a.name).join(" "),
    value: `${copy.count(16)} 0123456789`,
    axis: `${AXES.map((a) => a.name).join(" ")} ${subject.lines.map((l) => l.name).join(" ")} ${Object.values(copy.short).join(" ")} ${copy.whole} ${copy.percent(25)} 0123456789 ${copy.source.join(" ")}`,
  };
}

const overlaps = (a, b) => a.x0 < b.x1 && b.x0 < a.x1 && a.y0 < b.y1 && b.y0 < a.y1;

/** Open a stack of labels to a minimum pitch, keeping its order: down from the top, then up from the foot. Refuses
 *  rather than drawing a label off its rail. */
export function spread(wants, pitch, top, foot) {
  const order = wants.map((want, i) => ({ i, want })).sort((a, b) => a.want - b.want);
  const got = order.map((o) => Math.max(o.want, top));
  for (let k = 1; k < got.length; k++) got[k] = Math.max(got[k], got[k - 1] + pitch);
  got[got.length - 1] = Math.min(got[got.length - 1], foot);
  for (let k = got.length - 2; k >= 0; k--) got[k] = Math.min(got[k], got[k + 1] - pitch);
  if (got[0] < top - 0.5) throw new Error(`${wants.length} close-up names need ${((wants.length - 1) * pitch).toFixed(0)}px and the rail allows ${(foot - top).toFixed(0)}px`);
  const out = new Array(wants.length);
  order.forEach((o, k) => (out[o.i] = got[k]));
  return out;
}

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
  const measure = (t, r) => {
    const cased = applyCase(t, r.transform);
    return { text: cased, width: widthOf(cased, r) };
  };
  const wider = (w) => w * (1 + DRAWN_WIDER);
  const gap = 0.4 * axis.lead;
  const band = bandOf(BAND_PROBE, axis);
  const valueBand = bandOf(BAND_PROBE, value);
  const labelH = band.ascent + band.descent;
  const shift = (band.ascent - band.descent) / 2;
  const pad = 0.12 * axis.fontSize;

  const titleCard = titleCardFor({ registers, eyebrow: copy.eyebrow, title: copy.title, size: SIZE, eyebrowToDisplay: EYEBROW_TO_DISPLAY });
  const { register: sourceRegister, ...credit } = sourceCreditFor({ registers, forms: copy.source, size: SIZE, k, ...CREDIT_ONE_LINE });
  const creditAt = { x: inset, y: stage.height - vInset - credit.height };
  const creditBox = { x0: creditAt.x, y0: creditAt.y, x1: creditAt.x + credit.width, y1: creditAt.y + credit.height };

  // THE HEADER ROW (the rail names, and the close-up's count between them) AND THE PLOT UNDER IT, ON ONE SCALE.
  const headerBaseline = vInset + Math.max(band.ascent, valueBand.ascent);
  const headerBottom = headerBaseline + Math.max(band.descent, valueBand.descent);
  const top = headerBottom + gap + labelH / 2;
  const foot = creditAt.y - gap - labelH / 2;
  const scale = (foot - top) / subject.ceiling;
  const yOf = (v) => foot - v * scale;

  // THE CAMERA'S TWO SPACINGS. The whole: the outer rails inset by their own names. The close-up: the nuclear rail
  // inset by the names spread beside it, the wind rail by its own name.
  const railNames = AXES.map((a) => measure(a.name, axis));
  const wholeLeft = inset + wider(railNames[0].width) / 2;
  const wholeRight = stage.width - inset - wider(railNames.at(-1).width) / 2;
  const closeLines = subject.lines.filter((l) => l.values[0] > 0);
  const closeTexts = closeLines.map((l) => measure(l.name, axis));
  const connector = 1.2 * gap;
  const closeLeft = inset + Math.max(...closeTexts.map((t) => wider(t.width))) + connector + gap;
  const closeRight = stage.width - inset - wider(railNames[1].width) / 2;
  if (!(closeLeft - wider(railNames[0].width) / 2 >= inset)) throw new Error("the nuclear rail's name hangs off the close-up");
  const camera = { whole: { left: wholeLeft, step: (wholeRight - wholeLeft) / (AXES.length - 1) }, close: { left: closeLeft, step: closeRight - closeLeft } };
  const railX = (i) => camera.whole.left + i * camera.whole.step;

  // THE BAR: Finland's whole along the foot, its pieces in the rails' order, then the rest.
  const shown = subject.shown;
  const thickness = 0.45 * axis.lead;
  const splitGap = 0.35 * gap;
  let cum = 0;
  const pieces = [...shown.values.map((v, i) => ({ axis: i, v })), { axis: null, v: shown.rest }].map((p) => {
    const piece = { axis: p.axis, cum, len: p.v * scale };
    cum += p.v;
    return piece;
  });
  const hundred = measure(copy.whole, axis);
  const barEnd = wholeLeft + 100 * scale + (pieces.length - 1) * splitGap;
  const hundredLine = { ...hundred, x: wholeLeft + 100 * scale + gap / 2, y: foot + shift };
  if (!(barEnd <= stage.width - inset && hundredLine.x + wider(hundred.width) <= stage.width - inset)) throw new Error(`the whole bar (${(100 * scale).toFixed(0)}px) and its « 100 % » run off the frame`);
  const barName = { ...measure(shown.name, axis), x: wholeLeft + thickness / 2 + gap / 2, y: foot - thickness / 2 - gap / 2 - band.descent };

  // THE FLOORS: a tick across the rail, the value beside it — right of the nuclear rail, left of the wind rail.
  const tick = 1.6 * gap;
  const floorTexts = (max) => Object.fromEntries(Array.from({ length: max + 1 }, (_, v) => [String(v), measure(copy.percent(v), axis)]));
  const floors = [
    { axis: 0, value: NUCLEAR_FLOOR, side: "right", texts: floorTexts(NUCLEAR_FLOOR) },
    { axis: 1, value: WIND_FLOOR, side: "left", texts: floorTexts(WIND_FLOOR) },
  ];
  const floorBox = (f, x) => {
    const w = wider(f.texts[String(f.value)].width);
    const left = f.side === "right" ? x + tick / 2 + gap / 2 : x - tick / 2 - gap / 2 - w;
    return { x0: left - pad, x1: left + w + pad, y0: yOf(f.value) - labelH / 2 - pad, y1: yOf(f.value) + labelH / 2 + pad };
  };
  const floorBoxes = floors.map((f) => floorBox(f, railX(f.axis)));

  // EVERY LINE NAMED ONCE, AT ITS HIGHEST VERTEX (the static's rule); where the seat is taken, its next highest.
  const pairCodes = new Set(subject.both.map((l) => l.code));
  const placed = [...floorBoxes, creditBox];
  const seats = new Map();
  const off = 0.3 * gap;
  for (const l of [...subject.lines].sort((a, b) => Number(pairCodes.has(b.code)) - Number(pairCodes.has(a.code)))) {
    const order = l.values.map((v, i) => ({ i, v })).sort((a, b) => b.v - a.v);
    let seat = null;
    // The full name on every rail first; the short form only where the full name crosses a neighbour everywhere.
    for (const name of [l.name, copy.short[l.code]].filter(Boolean)) {
      const t = measure(name, axis);
      const w = wider(t.width);
      for (const { i } of order) {
        const y = yOf(l.values[i]);
        for (const anchor of ["start", "end"]) {
          const x0 = anchor === "start" ? railX(i) + off : railX(i) - off - w;
          const box = { x0: x0 - pad, x1: x0 + w + pad, y0: y - labelH / 2 - pad / 2, y1: y + labelH / 2 + pad / 2 };
          if (box.x0 < inset || box.x1 > stage.width - inset || box.y0 < headerBottom) continue;
          if (placed.some((p) => overlaps(p, box))) continue;
          if (AXES.some((_, j) => j !== i && railX(j) > box.x0 - pad && railX(j) < box.x1 + pad)) continue;
          seat = { ...t, axis: i, anchor, off, y: y + shift, box };
          break;
        }
        if (seat) break;
      }
      if (seat) break;
    }
    if (!seat) throw new Error(`${l.name} finds no seat for its name on any of its seven rails`);
    placed.push(seat.box);
    seats.set(l.code, seat);
  }

  // THE CLOSE-UP'S NAMES: every line with some nuclear, spread beside the nuclear rail, a hairline back to its vertex.
  const pitch = PITCH * labelH;
  const closeYs = spread(closeLines.map((l) => yOf(l.values[0])), pitch, top, foot);
  const closeOf = new Map(closeLines.map((l, i) => [l.code, { ...closeTexts[i], dx: connector + gap / 2 + closeTexts[i].width, cy: closeYs[i], y: closeYs[i] + shift }]));

  // THE ORDER THE OTHERS ARE DRAWN IN: the largest nuclear share first.
  const others = subject.lines.filter((l) => l !== shown).sort((a, b) => b.values[0] - a.values[0]);
  const lines = subject.lines.map((l) => ({
    code: l.code,
    name: l.name,
    values: l.values,
    pair: pairCodes.has(l.code),
    shown: l === shown,
    drawRank: l === shown ? null : others.indexOf(l),
    ys: l.values.map(yOf),
    seat: seats.get(l.code),
    close: closeOf.get(l.code) ?? null,
  }));

  // THE COUNT, between the two close rails in the header row.
  const counts = Object.fromEntries(Array.from({ length: lines.length + 1 }, (_, n) => [String(n), measure(copy.count(n), value)]));
  const widest = Math.max(...Object.values(counts).map((t) => wider(t.width)));
  const counter = { texts: counts, x: (closeLeft + closeRight) / 2 - widest / 2, y: headerBaseline };
  if (!(counter.x > closeLeft + wider(railNames[0].width) / 2 + gap && counter.x + widest < closeRight - wider(railNames[1].width) / 2 - gap)) throw new Error("the count touches a close rail's name");

  // COLOURS: the field a tint of the accent, the pair the accent, the rails and the floors steps off the ground.
  const { ground, accent } = direction;
  const { ink, muted } = deriveFurniture(ground);
  const walked = (c, floor, what) => {
    const w = adjustToContrast(c, ground, floor);
    if (!w) throw new Error(`${what} has no variant that reads at ${floor}:1 on ${ground}`);
    return w;
  };
  let field = mix(accent, ground, 0.55);
  if (contrast(field, ground) < NON_TEXT_CONTRAST_MIN) field = walked(field, NON_TEXT_CONTRAST_MIN, "the field's lines");
  const colours = {
    ground,
    rail: walked(mix(ground, ink, 0.35), NON_TEXT_CONTRAST_MIN, "a rail"),
    field,
    lit: walked(mix(ink, ground, 0.2), NON_TEXT_CONTRAST_MIN, "the bar"),
    pair: walked(accent, NON_TEXT_CONTRAST_MIN, "the pair's lines"),
    floor: walked(ink, NON_TEXT_CONTRAST_MIN, "a floor"),
    text: {
      eyebrow: walked(registers.eyebrow.fill ?? accent, TEXT_CONTRAST_MIN, "the eyebrow"),
      title: walked(registers.display.fill ?? ink, TEXT_CONTRAST_MIN, "the title"),
      name: walked(muted, TEXT_CONTRAST_MIN, "a name"),
      pair: walked(accent, TEXT_CONTRAST_MIN, "the pair's names"),
      rail: walked(muted, TEXT_CONTRAST_MIN, "a rail's name"),
      count: walked(ink, TEXT_CONTRAST_MIN, "the count"),
    },
  };
  const rule = (direction.stroke?.rule ?? 1) * k;

  const props = {
    frame: stage,
    registers: { display: titleCard.register, eyebrow: registers.eyebrow, axis, value, source: sourceRegister },
    titleCard,
    credit: { ...credit, at: creditAt },
    colours,
    strokes: { line: rule * 1.1, pair: rule * 2.6, rail: rule, floor: rule * 2.6, connector: rule * 0.6 },
    camera,
    scale,
    top,
    foot,
    headerBaseline,
    axes: railNames,
    bar: { x0: wholeLeft, splitGap, thickness, pieces, name: barName, hundred: hundredLine },
    floors: floors.map(({ axis: a, value: v, side, texts }) => ({ axis: a, value: v, side, texts })),
    tick,
    gap,
    shift,
    lines,
    counter,
    halo: haloOf(axis, k),
    states,
    timing: PARALLEL_VIDEO_TIMING,
  };
  return {
    id,
    direction,
    props,
    report: { k, titleForm: titleCard.form, sourceForm: credit.form, scale: scale.toFixed(2), seated: [...seats.values()].map((s) => s.axis).join(""), short: [...seats.values()].filter((s) => Object.values(copy.short).includes(s.text)).length },
  };
}
