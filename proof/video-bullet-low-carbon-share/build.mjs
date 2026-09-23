// EVERYTHING ONE DIRECTION'S RENDER IS HANDED, BUILT IN BUN — the words, the six rows and their tracks, the insertion's
// steps, every gain text a row can count through, the key, the colours and the states.
//
// Runs in Bun only.

import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { adjustToContrast, mix, NON_TEXT_CONTRAST_MIN, TEXT_CONTRAST_MIN } from "#shared/chart-beat/colour.mjs";
import { deriveFurniture } from "#shared/chart-beat/render-still.mjs";
import { frameInsetFor, sizeFor, videoExportSize } from "#shared/chart-video/sizes.mjs";
import { readDirection } from "#shared/design-base/read-direction.mjs";
import { EYEBROW_TO_DISPLAY, registerOf } from "#shared/design-base/register.mjs";
import { resolveDirectionFamilies } from "#shared/design-base/resolve-families.mjs";
import { applyCase } from "../../skills/chart-video/scripts/registers.mjs";
import { BAND_PROBE, bandOf, CREDIT_ONE_LINE, DRAWN_WIDER, haloOf, sourceCreditFor, titleCardFor, verticalInsetFor, widthOf } from "../../skills/chart-video/scripts/shots.mjs";
import { videoRegistersOf } from "../../skills/chart-video/scripts/video-registers.mjs";
import { gainText } from "./scene.mjs";
import { statesFor } from "./states.mjs";
import { AFTER, BEFORE, HALF, loadSubject } from "./subject.mjs";
import { BULLET_VIDEO_TIMING } from "./timing-contract.ts";

const HERE = dirname(fileURLToPath(import.meta.url));
export const ROOT = join(HERE, "..", "..");
export const DIRECTIONS = join(ROOT, "docs", "design-base", "directions");
/** The size this run exports at — `--size`, landscape when nothing asks. R2 names three and
 *  everything under it already answered per size; only this line pinned the beat to one. */
export const SIZE = videoExportSize();
export const REGISTER_NAMES = ["display", "eyebrow", "body", "annot", "value", "axis"];
const NB = "\u00A0";
const LABEL_GAP = 0.4;
/** Of a row's pitch, the bar of the whole electricity. */
const TRACK = 0.56;

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
    /** The key: the low-carbon part in 2015, the part gained by 2024, the fossil rest. */
    dates: [String(BEFORE), String(AFTER), "fossile"],
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
  const { register: sourceRegister, ...credit } = sourceCreditFor({ registers, forms: copy.source, size: SIZE, k, ...CREDIT_ONE_LINE });
  const creditAt = { x: inset, y: stage.height - vInset - credit.height };

  // THE BAND OVER THE ROWS: the unit at the left; the key at the right — three swatches, each followed by its word.
  const bandBaseline = vInset + band.ascent;
  const unitLine = { ...measure(copy.unit, axis), x: inset, y: bandBaseline };
  const dates = copy.dates.map((d) => measure(d, axis));
  const swatchW = band.ascent;
  const keyWidth = dates.reduce((w, d, i) => w + swatchW + gap / 2 + d.width * (1 + DRAWN_WIDER) + (i < dates.length - 1 ? 1.5 * gap : 0), 0);
  /**
   * THE HEADER IS ONE LINE OR TWO, AND THE FRAME DECIDES WHICH.
   *
   * Side by side is the right header when the frame can pay for it: one line, the unit read first and the key answering
   * it from the right edge. Measured 2026-09-23 that costs 1233px — a 700px unit, a 497px key and the air between them
   * — against 1750px of landscape content width and 936px of portrait and square, so the beat refused « the unit and
   * the key do not fit on one line » on every narrow frame. The second rung drops the key onto its own line under the
   * unit, set from the same left edge so the two read as one header block, and the rows begin a lead lower.
   */
  const seatHeader = (stacked) => {
    const keyBaseline = stacked ? bandBaseline + axis.lead : bandBaseline;
    const keyLeft = stacked ? inset : stage.width - inset - keyWidth;
    if (!(keyLeft + keyWidth <= stage.width - inset)) return { why: `the key is ${Math.round(keyWidth)}px on a ${Math.round(stage.width - 2 * inset)}px content width` };
    if (!stacked && !(unitLine.x + unitLine.width * (1 + DRAWN_WIDER) + 2 * gap < keyLeft)) return { why: "the unit and the key do not fit on one line" };
    let cursor = keyLeft;
    const seated = dates.map((d) => {
      const swatch = { x: cursor, y: keyBaseline - band.ascent, w: swatchW, h: band.ascent };
      const word = { ...d, x: cursor + swatchW + gap / 2, y: keyBaseline };
      cursor = word.x + d.width * (1 + DRAWN_WIDER) + 1.5 * gap;
      return { swatch, word };
    });
    return { key: seated, keyBaseline };
  };
  let header = null;
  const headerRefused = [];
  for (const stacked of [false, true]) {
    const got = seatHeader(stacked);
    if (got.why) headerRefused.push(`${stacked ? "stacked" : "side by side"}: ${got.why}`);
    else {
      header = { ...got, stacked };
      break;
    }
  }
  if (!header) throw new Error(`neither header holds the unit and the key at ${SIZE} — ${headerRefused.join("; ")}`);
  const key = header.key;

  // THE ROWS: names at the left, the track to 100 %, the gains in a column of their own at the right, the ticks under.
  const names = subject.countries.map((c) => measure(c.name, axis));
  const gains = new Set();
  for (const c of subject.countries) for (let d = 0; d <= Math.ceil((c.after - c.before) * 10); d++) gains.add(copy.gain(gainText(d / 10)));
  const gainWidths = Object.fromEntries([...gains].map((t) => [t, widthOf(applyCase(t, value.transform), value)]));
  const gainRoom = Math.max(...Object.values(gainWidths)) * (1 + DRAWN_WIDER);
  const left = inset + Math.max(...names.map((n) => n.width)) * (1 + DRAWN_WIDER) + gap;
  const right = stage.width - inset - gainRoom - gap;
  const tickBaseline = creditAt.y - gap - band.descent;
  const top = header.keyBaseline + band.descent + 1.5 * gap;
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
    fossil: mix(ground, ink, 0.16),
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

    left: r1(left),
    right: r1(right),
    gainX: r1(right + gap),
    nameShift: pitch / 2 + shift,
    gainShift: pitch / 2 + valueShift,
    gainWidths,
    ticks,
    halfX: r1(xOf(HALF)),
    ringX: r1(inset - gap / 2),
    ringW: r1(stage.width - 2 * inset + gap),
    unitLine,
    legend: key,
    strokes: { half: (direction.stroke?.rule ?? 1) * k * 1.4 },
    dash: [0.2 * axis.lead, 0.14 * axis.lead].map(r1),
    halo: { value: haloOf(value, k) },
    states,
    timing: BULLET_VIDEO_TIMING,
  };
  return { id, direction, props, report: { k, titleForm: titleCard.form, sourceForm: credit.form, header: header.stacked ? "stacked" : "side by side", steps: subject.steps.length - 1, pitch: pitch.toFixed(1) } };
}
