// EVERYTHING ONE DIRECTION'S RENDER IS HANDED, BUILT IN BUN — the words, the six rows and their tracks, the insertion's
// steps, every gain text a row can count through, the key, the colours and the states.
//
// Runs in Bun only.

import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { adjustToContrast, mix, NON_TEXT_CONTRAST_MIN, TEXT_CONTRAST_MIN } from "#shared/chart-beat/colour.mjs";
import { deriveFurniture } from "#shared/chart-beat/render-still.mjs";
import { frameInsetFor, sizeFor } from "#shared/chart-video/sizes.mjs";
import { readDirection } from "#shared/design-base/read-direction.mjs";
import { EYEBROW_TO_DISPLAY, registerOf } from "#shared/design-base/register.mjs";
import { resolveDirectionFamilies } from "#shared/design-base/resolve-families.mjs";
import { applyCase } from "../../skills/chart-video/scripts/registers.mjs";
import { BAND_PROBE, bandOf, DRAWN_WIDER, haloOf, sourceCreditFor, titleCardFor, verticalInsetFor, widthOf } from "../../skills/chart-video/scripts/shots.mjs";
import { videoRegistersOf } from "../../skills/chart-video/scripts/video-registers.mjs";
import { gainText } from "./scene.mjs";
import { statesFor } from "./states.mjs";
import { AFTER, BEFORE, HALF, loadSubject } from "./subject.mjs";
import { BULLET_VIDEO_TIMING } from "./timing-contract.ts";

const HERE = dirname(fileURLToPath(import.meta.url));
export const ROOT = join(HERE, "..", "..");
export const DIRECTIONS = join(ROOT, "docs", "design-base", "directions");
export const SIZE = "landscape";
export const REGISTER_NAMES = ["display", "eyebrow", "body", "annot", "value", "axis"];
const NB = "\u00A0";
const LABEL_GAP = 0.4;
/** Of a row's pitch, the track; of the track, the 2015 bar; of the track, the 2024 bar. */
const TRACK = 0.56;
const PALE = 0.8;
const THIN = 0.3;

export function loadBeat() {
  const subject = loadSubject();
  return { subject, states: statesFor(), copy: copyOf(subject) };
}

const one = (v) => v.toFixed(1).replace(".", ",");

export function copyOf(subject) {
  const gain = subject.moved.after - subject.moved.before;
  return {
    eyebrow: `Énergie${NB}· Europe`,
    title: [`${subject.moved.name} : +${one(gain)} points de bas-carbone depuis ${BEFORE}, toujours la seule sous la moitié`, `${subject.moved.name} : +${one(gain)} points de bas-carbone depuis ${BEFORE}`],
    gain: (text) => `${text}${NB}pts`,
    dates: [String(BEFORE), String(AFTER)],
    unit: `part du bas-carbone dans l’électricité`,
    ticks: [0, HALF, 100].map((v) => (v === 100 ? `100${NB}%` : String(v))),
    source: ["Source : Ember, Energy Institute – Statistical Review of World Energy (2025), via Our World in Data", "Source : Ember, Energy Institute, via Our World in Data"],
  };
}

export function textPerRegisterOf(copy, subject) {
  return {
    display: copy.title.join(" "),
    eyebrow: copy.eyebrow,
    body: copy.source.join(" "),
    annot: "",
    value: `${copy.gain("+17,3")} 0123456789`,
    axis: `${copy.unit} ${copy.dates.join(" ")} ${copy.ticks.join(" ")} ${subject.countries.map((c) => c.name).join(" ")} ${copy.source.join(" ")}`,
  };
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
  const gap = LABEL_GAP * axis.lead;
  const band = bandOf(BAND_PROBE, axis);
  const valueBand = bandOf(BAND_PROBE, value);
  const shift = (band.ascent - band.descent) / 2;
  const valueShift = (valueBand.ascent - valueBand.descent) / 2;

  const titleCard = titleCardFor({ registers, eyebrow: copy.eyebrow, title: copy.title, size: SIZE, eyebrowToDisplay: EYEBROW_TO_DISPLAY });
  const { register: sourceRegister, ...credit } = sourceCreditFor({ registers, forms: copy.source, size: SIZE, k });
  const creditAt = { x: inset, y: stage.height - vInset - credit.height };

  // THE BAND OVER THE ROWS: the unit at the left; the key — a pale thick swatch for 2015, a thin saturated one for 2024 —
  // at the right.
  const bandBaseline = vInset + band.ascent;
  const unitLine = { ...measure(copy.unit, axis), x: inset, y: bandBaseline };
  const dates = copy.dates.map((d) => measure(d, axis));
  const swatchW = 1.4 * axis.lead;
  const keyH = band.ascent;
  const keyWidth = swatchW + gap / 2 + dates[0].width * (1 + DRAWN_WIDER) + 2 * gap + swatchW + gap / 2 + dates[1].width * (1 + DRAWN_WIDER);
  const keyX = stage.width - inset - keyWidth;
  if (!(unitLine.x + unitLine.width * (1 + DRAWN_WIDER) + 2 * gap < keyX)) throw new Error("the unit and the key do not fit on one line");
  const key = {
    pale: { x: keyX, y: bandBaseline - 0.4 * band.ascent - (keyH * PALE) / 2, w: swatchW, h: keyH * PALE },
    thin: { x: keyX + swatchW + gap / 2 + dates[0].width * (1 + DRAWN_WIDER) + 2 * gap, y: bandBaseline - 0.4 * band.ascent - (keyH * THIN) / 2, w: swatchW, h: keyH * THIN },
    dates: [
      { ...dates[0], x: keyX + swatchW + gap / 2, y: bandBaseline },
      { ...dates[1], x: keyX + 2 * swatchW + gap + dates[0].width * (1 + DRAWN_WIDER) + 2 * gap, y: bandBaseline },
    ],
  };

  // THE ROWS: names at the left, the track to 100 %, the gains in a column of their own at the right, the ticks under.
  const names = subject.countries.map((c) => measure(c.name, axis));
  const gains = new Set();
  for (const c of subject.countries) for (let d = 0; d <= Math.ceil((c.after - c.before) * 10); d++) gains.add(copy.gain(gainText(d / 10)));
  const gainWidths = Object.fromEntries([...gains].map((t) => [t, widthOf(applyCase(t, value.transform), value)]));
  const gainRoom = Math.max(...Object.values(gainWidths)) * (1 + DRAWN_WIDER);
  const left = inset + Math.max(...names.map((n) => n.width)) * (1 + DRAWN_WIDER) + gap;
  const right = stage.width - inset - gainRoom - gap;
  const tickBaseline = creditAt.y - gap - band.descent;
  const top = bandBaseline + band.descent + 1.5 * gap;
  const bottom = tickBaseline - band.ascent - gap;
  const pitch = (bottom - top) / subject.countries.length;
  const trackH = pitch * TRACK;
  const slotY = (slot) => top + slot * pitch + (pitch - trackH) / 2;
  const xOf = (v) => left + (v / 100) * (right - left);
  const ticks = copy.ticks.map((t, i) => {
    const m = measure(t, axis);
    const x = xOf([0, HALF, 100][i]);
    return { ...m, x: i === 0 ? x : i === 2 ? x - m.width * (1 + DRAWN_WIDER) : x - m.width / 2, y: tickBaseline };
  });

  const { ground, accent } = direction;
  const { ink, muted } = deriveFurniture(ground);
  const walked = (c, floor, what) => {
    const w = adjustToContrast(c, ground, floor);
    if (!w) throw new Error(`${what} has no variant that reads at ${floor}:1 on ${ground}`);
    return w;
  };
  const colours = {
    ground,
    track: mix(ground, ink, 0.07),
    pale: mix(accent, ground, 0.62),
    thin: walked(accent, NON_TEXT_CONTRAST_MIN, `the ${AFTER} bar`),
    faded: mix(ground, ink, 0.16),
    half: walked(ink, NON_TEXT_CONTRAST_MIN, "the half line"),
    text: {
      eyebrow: walked(registers.eyebrow.fill ?? accent, TEXT_CONTRAST_MIN, "the eyebrow"),
      title: walked(registers.display.fill ?? ink, TEXT_CONTRAST_MIN, "the title"),
      name: walked(ink, TEXT_CONTRAST_MIN, "a name"),
      axis: walked(muted, TEXT_CONTRAST_MIN, "a muted word"),
      gain: walked(accent, TEXT_CONTRAST_MIN, "a gain"),
    },
  };

  const r1 = (v) => Math.round(v * 10) / 10;
  const props = {
    frame: stage,
    registers: { display: titleCard.register, eyebrow: registers.eyebrow, value, axis, source: sourceRegister },
    titleCard,
    credit: { ...credit, at: creditAt },
    colours,
    moved: subject.moved.key,
    steps: subject.steps,
    rows: subject.countries.map((c, i) => ({ key: c.key, before: c.before, after: c.after, name: { ...names[i], x: left - gap - names[i].width * (1 + DRAWN_WIDER) } })),
    top,
    pitch,
    trackH: r1(trackH),
    paleH: r1(trackH * PALE),
    thinH: r1(trackH * THIN),
    left: r1(left),
    right: r1(right),
    gainX: r1(right + gap),
    nameShift: pitch / 2 + shift,
    gainShift: pitch / 2 + valueShift,
    gainWidths,
    ticks,
    halfX: r1(xOf(HALF)),
    unitLine,
    legend: key,
    strokes: { half: (direction.stroke?.rule ?? 1) * k * 1.4 },
    dash: [0.2 * axis.lead, 0.14 * axis.lead].map(r1),
    halo: { value: haloOf(value, k) },
    states,
    timing: BULLET_VIDEO_TIMING,
  };
  return { id, direction, props, report: { k, titleForm: titleCard.form, sourceForm: credit.form, steps: subject.steps.length - 1, pitch: pitch.toFixed(1) } };
}
