// EVERYTHING ONE DIRECTION'S RENDER IS HANDED, BUILT IN BUN — the words, the six pairs and their stems, every value text a
// head can count through, the ratio texts, the colours and the states.
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
import { BAND_PROBE, bandOf, DRAWN_WIDER, haloOf, sourceCreditFor, titleCardFor, verticalInsetFor, widthOf } from "../../skills/chart-video/scripts/shots.mjs";
import { videoRegistersOf } from "../../skills/chart-video/scripts/video-registers.mjs";
import { oneText } from "./scene.mjs";
import { statesFor } from "./states.mjs";
import { FROM, loadSubject, OTHER, SUBJECT, TO } from "./subject.mjs";
import { LOLLIPOP_VIDEO_TIMING } from "./timing-contract.ts";

const HERE = dirname(fileURLToPath(import.meta.url));
export const ROOT = join(HERE, "..", "..");
export const DIRECTIONS = join(ROOT, "docs", "design-base", "directions");
export const SIZE = "landscape";
export const REGISTER_NAMES = ["display", "eyebrow", "body", "annot", "value", "axis"];
const NB = "\u00A0";
const LABEL_GAP = 0.4;

export function loadBeat() {
  const subject = loadSubject();
  return { subject, states: statesFor(), copy: copyOf(subject) };
}

export function copyOf(subject) {
  return {
    eyebrow: `Climat${NB}· Monde`,
    title: [`La Chine a triplé son CO₂ par personne, l’écart avec les États-Unis est passé de ${oneText(subject.ratio.before)} à ${oneText(subject.ratio.after)}`, "La Chine a triplé son CO₂ par personne depuis 2000"],
    /** The unit is said once, beside the zero line; the heads print bare. */
    unit: `tonnes de CO₂ par personne`,
    ratio: (text) => `États-Unis / Chine${NB}: ×${text}`,
    dates: [String(FROM), String(TO)],
    source: [`Source : Global Carbon Budget 2025, population (${TO}), via Our World in Data`, "Source : Global Carbon Budget 2025, via Our World in Data"],
  };
}

export function textPerRegisterOf(copy, subject) {
  return {
    display: copy.title.join(" "),
    eyebrow: copy.eyebrow,
    body: copy.source.join(" "),
    annot: "",
    value: `${copy.ratio("7,5")} 0123456789,`,
    axis: `${copy.unit} ${subject.pairs.map((p) => p.name).join(" ")} ${copy.dates.join(" ")} ${copy.source.join(" ")}`,
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

  const titleCard = titleCardFor({ registers, eyebrow: copy.eyebrow, title: copy.title, size: SIZE, eyebrowToDisplay: EYEBROW_TO_DISPLAY });
  const { register: sourceRegister, ...credit } = sourceCreditFor({ registers, forms: copy.source, size: SIZE, k });
  const creditAt = { x: inset, y: stage.height - vInset - credit.height };

  // THE BAND OVER THE PAIRS: the ratio at the left, the unit at the right.
  const top = Math.max(...subject.pairs.flatMap((p) => [p.before, p.after]));
  const ratios = new Set();
  for (let d = 10; d <= Math.ceil(Math.max(subject.ratio.before, subject.ratio.after) * 10) + 1; d++) ratios.add(oneText(d / 10));
  const ratioWidths = Object.fromEntries([...ratios].map((t) => [t, widthOf(applyCase(copy.ratio(t), value.transform), value)]));
  const bandBaseline = vInset + valueBand.ascent;
  const unitWord = measure(copy.unit, axis);
  const unitLine = { ...unitWord, x: stage.width - inset - unitWord.width * (1 + DRAWN_WIDER), y: bandBaseline };
  if (!(inset + Math.max(...Object.values(ratioWidths)) * (1 + DRAWN_WIDER) + 2 * gap < unitLine.x)) throw new Error("the ratio and the unit do not fit on one line");

  // THE PAIRS: six slots; in each, the 2000 stem then the 2023 stem, a head's width apart plus its value's; the dates under
  // the first pair only, the name under every pair.
  const slot = (stage.width - 2 * inset) / subject.pairs.length;
  const values = new Set();
  for (let d = 0; d <= Math.ceil(top * 10); d++) values.add(oneText(d / 10));
  const valueWidths = Object.fromEntries([...values].map((t) => [t, widthOf(applyCase(t, value.transform), value)]));
  const widest = Math.max(...Object.values(valueWidths)) * (1 + DRAWN_WIDER);
  const apart = widest + gap;
  if (!(apart + widest < slot - gap)) throw new Error("a pair's two values do not fit side by side in its slot");
  const names = subject.pairs.map((p) => measure(p.name, axis));
  for (const [i, n] of names.entries()) if (!(n.width * (1 + DRAWN_WIDER) < slot - gap)) throw new Error(`${subject.pairs[i].name} does not hold under its pair`);
  const nameBaseline = creditAt.y - gap - band.descent;
  const dateBaseline = nameBaseline - band.ascent - band.descent - 0.25 * gap;
  const baseline = dateBaseline - band.ascent - gap;
  const R = 0.3 * axis.lead;
  const plotTop = bandBaseline + valueBand.descent + 1.5 * gap + valueBand.ascent + valueBand.descent + gap / 2 + R;
  const unit = (baseline - plotTop) / top;
  const centre = (i) => inset + slot * (i + 0.5);

  const { ground, accent } = direction;
  const { ink, muted, grid } = deriveFurniture(ground);
  const walked = (c, floor, what) => {
    const w = adjustToContrast(c, ground, floor);
    if (!w) throw new Error(`${what} has no variant that reads at ${floor}:1 on ${ground}`);
    return w;
  };
  /** ONE HUE, TWO CHROMAS — the static plate's rule: the past a tint of the present, as far toward the ground as still reads. */
  let past = mix(accent, ground, 0.6);
  if (contrast(past, ground) < NON_TEXT_CONTRAST_MIN) past = walked(past, NON_TEXT_CONTRAST_MIN, `the tint for ${FROM}`);
  const colours = {
    ground,
    grid: mix(ground, ink, 0.75),
    past,
    present: walked(accent, NON_TEXT_CONTRAST_MIN, `the hue for ${TO}`),
    faded: mix(ground, ink, 0.14),
    ring: walked(ink, NON_TEXT_CONTRAST_MIN, "China's ring"),
    text: {
      eyebrow: walked(registers.eyebrow.fill ?? accent, TEXT_CONTRAST_MIN, "the eyebrow"),
      title: walked(registers.display.fill ?? ink, TEXT_CONTRAST_MIN, "the title"),
      past: walked(past, TEXT_CONTRAST_MIN, `a ${FROM} value`),
      present: walked(accent, TEXT_CONTRAST_MIN, `a ${TO} value`),
      name: walked(ink, TEXT_CONTRAST_MIN, "a name"),
      axis: walked(muted, TEXT_CONTRAST_MIN, "a muted word"),
      count: walked(ink, TEXT_CONTRAST_MIN, "the ratio"),
    },
  };

  const r1 = (v) => Math.round(v * 10) / 10;
  const dates = copy.dates.map((d) => measure(d, axis));
  const props = {
    frame: stage,
    registers: { display: titleCard.register, eyebrow: registers.eyebrow, value, axis, source: sourceRegister },
    titleCard,
    credit: { ...credit, at: creditAt },
    colours,
    subject: SUBJECT,
    other: OTHER,
    pairs: subject.pairs.map((p, i) => {
      const pastX = centre(i) - apart / 2;
      const presentX = centre(i) + apart / 2;
      return {
        code: p.code,
        before: p.before,
        after: p.after,
        pastX: r1(pastX),
        presentX: r1(presentX),
        name: { ...names[i], x: centre(i) - names[i].width / 2, y: nameBaseline },
        dates: i === 0 ? [pastX, presentX].map((x, j) => ({ ...dates[j], x: x - dates[j].width / 2, y: dateBaseline })) : [],
      };
    }),
    baseline: r1(baseline),
    unit,
    R: r1(R),
    zero: { left: inset, right: stage.width - inset },
    ratioWidths,
    ratioAt: { x: inset, y: bandBaseline },
    unitLine,
    valueWidths,
    valueRise: R + gap / 2 + valueBand.descent,
    strokes: { stem: (direction.stroke?.rule ?? 1) * k * 2, ring: (direction.stroke?.rule ?? 1) * k * 1.4, grid: (direction.stroke?.hairline ?? 0.6) * k },
    halo: { value: haloOf(value, k) },
    states,
    timing: LOLLIPOP_VIDEO_TIMING,
  };
  return { id, direction, props, report: { k, titleForm: titleCard.form, sourceForm: credit.form, apart: apart.toFixed(1) } };
}
