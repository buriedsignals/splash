// EVERYTHING ONE DIRECTION'S RENDER IS HANDED, BUILT IN BUN — the words, the twelve rows and their scale, both orders,
// every counter text a row or the copies can show, the key, the colours and the states.
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
import { BAND_PROBE, bandOf, CREDIT_ONE_LINE, DRAWN_WIDER, sourceCreditFor, titleCardFor, verticalInsetFor, widthOf } from "../../skills/chart-video/scripts/shots.mjs";
import { videoRegistersOf } from "../../skills/chart-video/scripts/video-registers.mjs";
import { copyText, countText } from "./scene.mjs";
import { statesFor } from "./states.mjs";
import { FROM, loadSubject, TO } from "./subject.mjs";
import { STACKED_BAR_VIDEO_TIMING } from "./timing-contract.ts";

const HERE = dirname(fileURLToPath(import.meta.url));
export const ROOT = join(HERE, "..", "..");
export const DIRECTIONS = join(ROOT, "docs", "design-base", "directions");
/** The size this run exports at — `--size`, landscape when nothing asks. R2 names three and
 *  everything under it already answered per size; only this line pinned the beat to one. */
export const SIZE = videoExportSize();
export const REGISTER_NAMES = ["display", "eyebrow", "body", "annot", "value", "axis"];
const NB = "\u00A0";
const LABEL_GAP = 0.4;
/** Of a row's pitch, the bar. */
const TRACK = 0.6;
const TICK_STEP = 100;

export function loadBeat() {
  const subject = loadSubject();
  return { subject, states: statesFor(), copy: copyOf(subject) };
}

const whole = (v) => String(Math.round(v));

export function copyOf(subject) {
  return {
    eyebrow: `Énergie${NB}· Europe`,
    title: [
      `${subject.adder.name} a ajouté plus d’électricité bas-carbone que la ${subject.incumbent.name} depuis ${FROM}`,
      `${subject.adder.name} a ajouté plus de bas-carbone que la ${subject.incumbent.name} depuis ${FROM}`,
    ].map((t) => `L’${t}`),
    unit: `électricité bas-carbone, en TWh`,
    key: [String(FROM), `ajouté d’ici ${TO}`],
    source: ["Source : Ember, Energy Institute – Statistical Review of World Energy (2025), via Our World in Data", "Source : Ember, Energy Institute, via Our World in Data"],
  };
}

export function textPerRegisterOf(copy, subject) {
  return {
    display: copy.title.join(" "),
    eyebrow: copy.eyebrow,
    body: copy.source.join(" "),
    annot: "",
    value: `${countText(119)} ${copyText(5)} 0123456789`,
    axis: `${copy.unit} ${copy.key.join(" ")} ${subject.rows.map((r) => `${r.name} ${whole(r.level)}`).join(" ")} ${copy.source.join(" ")}`,
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

  // THE BAND OVER THE ROWS: the unit at the left; the key at the right — two swatches, each followed by its word.
  const bandBaseline = vInset + band.ascent;
  const unitLine = { ...measure(copy.unit, axis), x: inset, y: bandBaseline };
  const words = copy.key.map((d) => measure(d, axis));
  const swatchW = band.ascent;
  const keyWidth = words.reduce((w, d, i) => w + swatchW + gap / 2 + d.width * (1 + DRAWN_WIDER) + (i < words.length - 1 ? 1.5 * gap : 0), 0);
  const keyX = stage.width - inset - keyWidth;
  // THE KEY DROPS TO A LINE OF ITS OWN WHEN THE BAND CANNOT HOLD BOTH. At 1920 the unit and the two
  // swatches sit at opposite ends of one baseline with room to spare. At 1080 the band is 936px of
  // content and the two together want more than it: side by side they would touch, which is the one
  // arrangement that makes a key read as part of the unit. Stacked — the unit on the band's own
  // baseline, the key right-aligned under it — the reading is the same and the picture pays one
  // line of height for it. Landscape never drops, so nothing there moves.
  const keyOnTheBand = unitLine.x + unitLine.width * (1 + DRAWN_WIDER) + 2 * gap < keyX;
  if (!keyOnTheBand && !(keyX >= inset)) throw new Error("the unit and the key do not fit on one line, and the key does not fit on a line of its own either");
  const keyBaseline = keyOnTheBand ? bandBaseline : bandBaseline + band.descent + gap + band.ascent;
  let cursor = keyX;
  const legend = words.map((d) => {
    const swatch = { x: cursor, y: keyBaseline - band.ascent, w: swatchW, h: band.ascent };
    const word = { ...d, x: cursor + swatchW + gap / 2, y: keyBaseline };
    cursor = word.x + d.width * (1 + DRAWN_WIDER) + 1.5 * gap;
    return { swatch, word };
  });

  // THE ROWS: names at the left, the stack on one scale to the largest total, the gains in a column of their own at the
  // right, the ticks under.
  const names = subject.rows.map((r) => measure(r.name, axis));
  const counts = new Set();
  for (const r of subject.rows) for (let v = 0; v <= Math.round(r.growth); v++) counts.add(countText(v));
  const countWidths = Object.fromEntries([...counts].map((t) => [t, widthOf(applyCase(t, value.transform), value)]));
  const copyWidths = Object.fromEntries(Array.from({ length: subject.copies }, (_, i) => copyText(i + 1)).map((t) => [t, widthOf(applyCase(t, value.transform), value)]));
  const countRoom = Math.max(...Object.values(countWidths)) * (1 + DRAWN_WIDER);
  const max = Math.max(...subject.rows.map((r) => r.total));
  // THE AIR ON EITHER SIDE OF THE TRACK IS A LADDER. A full gap between the names and the track, and
  // between the track and the gains, is what 1920 wide wants and what it can afford. At 1080 the
  // names alone take 310px of a 936px band, the track is left 465, and the copy of the adder's level
  // — the block « ×5 » has to be written inside — measures 84 where the word needs 86. Two pixels,
  // and nothing on the frame is in the wrong place; there is simply a gap's worth of air the narrow
  // frame cannot spend twice. The rungs give it back a quarter at a time, and the refusal below
  // still fires when the closest the track may stand is not close enough. Landscape holds at the
  // first rung.
  const nameRoom = Math.max(...names.map((m) => m.width)) * (1 + DRAWN_WIDER);
  const holdsCopy = (l, r) => Math.max(...Object.values(copyWidths)) * (1 + DRAWN_WIDER) + gap < (subject.adder.level / max) * (r - l);
  const air = [gap, 0.75 * gap, 0.5 * gap].find((a) => holdsCopy(inset + nameRoom + a, stage.width - inset - countRoom - a)) ?? 0.5 * gap;
  const left = inset + nameRoom + air;
  const right = stage.width - inset - countRoom - air;
  const xOf = (v) => left + (v / max) * (right - left);
  const tickBaseline = creditAt.y - gap - band.descent;
  const top = keyBaseline + band.descent + 1.5 * gap;
  const bottom = tickBaseline - band.ascent - gap;
  const pitch = (bottom - top) / subject.rows.length;
  const trackH = pitch * TRACK;
  const ticks = [];
  for (let v = 0; v <= max; v += TICK_STEP) {
    const m = measure(String(v), axis);
    ticks.push({ ...m, x: v === 0 ? xOf(0) : xOf(v) - m.width / 2, y: tickBaseline });
  }

  // THE LEVELS' NUMBERS, past each level's end: the widest reach must stay inside the frame.
  const levelTexts = subject.rows.map((r) => ({ ...measure(whole(r.level), axis), x: xOf(r.level) + gap / 2 }));
  for (const t of levelTexts) if (!(t.x + t.width * (1 + DRAWN_WIDER) <= stage.width - inset)) throw new Error(`the level ${t.text} runs out of the frame`);
  // Each copy must be wide enough to hold « × 5 » inside it.
  const copyW = xOf(subject.adder.level) - xOf(0);
  if (!(Math.max(...Object.values(copyWidths)) * (1 + DRAWN_WIDER) + gap < copyW)) throw new Error(`a copy of the adder's level is ${copyW.toFixed(0)}px, too short to hold its count's ${(Math.max(...Object.values(copyWidths)) * (1 + DRAWN_WIDER) + gap).toFixed(0)}px, at the closest the track may stand to the names and the gains`);

  const { ground, accent } = direction;
  const { ink, muted } = deriveFurniture(ground);
  const walked = (c, floor, what) => {
    const w = adjustToContrast(c, ground, floor);
    if (!w) throw new Error(`${what} has no variant that reads at ${floor}:1 on ${ground}`);
    return w;
  };
  const pale = mix(accent, ground, 0.62);
  const colours = {
    ground,
    pale,
    full: walked(accent, NON_TEXT_CONTRAST_MIN, `the part added by ${TO}`),
    ring: walked(ink, NON_TEXT_CONTRAST_MIN, "the ring"),
    text: {
      eyebrow: walked(registers.eyebrow.fill ?? accent, TEXT_CONTRAST_MIN, "the eyebrow"),
      title: walked(registers.display.fill ?? ink, TEXT_CONTRAST_MIN, "the title"),
      name: walked(ink, TEXT_CONTRAST_MIN, "a name"),
      axis: walked(muted, TEXT_CONTRAST_MIN, "a muted word"),
      accent: walked(accent, TEXT_CONTRAST_MIN, "a thread word"),
      onPale: (() => {
        const w = adjustToContrast(ink, pale, TEXT_CONTRAST_MIN);
        if (!w) throw new Error(`the copies' count has no ink that reads on ${pale}`);
        return w;
      })(),
    },
  };

  const r1 = (v) => Math.round(v * 10) / 10;
  const thread = new Set([subject.adder.key, subject.incumbent.key]);
  const props = {
    frame: stage,
    registers: { display: titleCard.register, eyebrow: registers.eyebrow, value, axis, source: sourceRegister },
    titleCard,
    credit: { ...credit, at: creditAt },
    colours,
    adder: subject.adder.key,
    incumbent: subject.incumbent.key,
    rings: [subject.adder.key, subject.incumbent.key],
    copies: subject.copies,
    before: subject.before,
    byGain: subject.byGain,
    rows: subject.rows.map((r, i) => ({
      key: r.key,
      level: r.level,
      growth: r.growth,
      total: r.total,
      thread: thread.has(r.key),
      name: { ...names[i], x: left - gap - names[i].width * (1 + DRAWN_WIDER) },
      levelText: levelTexts[i],
    })),
    top,
    pitch,
    trackH: r1(trackH),
    left: r1(left),
    right: r1(right),
    max,
    countX: r1(right + gap),
    nameShift: pitch / 2 + shift,
    countShift: pitch / 2 + valueShift,
    countWidths,
    copyWidths,
    ticks,
    ringX: r1(inset - gap),
    ringW: r1(stage.width - 2 * inset + 2 * gap),
    unitLine,
    legend,
    strokes: { ring: (direction.stroke?.rule ?? 1) * k * 1.4, seam: (direction.stroke?.rule ?? 1) * k * 2 },
    states,
    timing: STACKED_BAR_VIDEO_TIMING,
  };
  return { id, direction, props, report: { k, titleForm: titleCard.form, sourceForm: credit.form, copies: subject.copies, pitch: pitch.toFixed(1) } };
}
