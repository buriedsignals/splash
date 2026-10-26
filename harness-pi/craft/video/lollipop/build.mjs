// EVERYTHING ONE DIRECTION'S RENDER IS HANDED, BUILT IN BUN — the words, the six pairs and their stems, every value text a
// head can count through, the ratio texts, the colours and the states.
//
// Runs in Bun only.
//
// ZONE KIT COPY of proof/video-lollipop-co2-per-person/build.mjs. What changed: the subject and the words come from the
// beat (`./subject.mjs` computes the subject from beat.mjs, render-beat.mjs builds `copy`), the direction is the one the
// run selects (handed in, not read from a filed id), the two compared pairs are the subject's, every value and ratio is
// printed with the story's number format and only the texts the scene can show are measured, and the chart-video
// skill's scripts are found through `skillScriptFrom` — a beat sits at stories/<slug>/beats/<id>/.

import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { adjustToContrast, contrast, mix, NON_TEXT_CONTRAST_MIN, TEXT_CONTRAST_MIN } from "#shared/chart-beat/colour.mjs";
import { deriveFurniture } from "#shared/chart-beat/render-still.mjs";
import { frameInsetFor, sizeFor, videoExportSize } from "#shared/chart-video/sizes.mjs";
import { EYEBROW_TO_DISPLAY, registerOf } from "#shared/design-base/register.mjs";
import { resolveDirectionFamilies } from "#shared/design-base/resolve-families.mjs";
import { skillScriptFrom } from "#shared/design-base/skill-script.mjs";
import { splashRoot } from "#shared/design-base/splash-root.mjs";
import { ratioText, sceneAt, valueText } from "./scene.mjs";
import { statesFor } from "./states.mjs";
import { LOLLIPOP_VIDEO_TIMING } from "./timing-contract.ts";

const HERE = dirname(fileURLToPath(import.meta.url));
const chartVideo = (...parts) => skillScriptFrom(HERE, "chart-video", "scripts", ...parts);
const { applyCase } = await import(chartVideo("registers.mjs"));
const { BAND_PROBE, bandOf, CREDIT_ONE_LINE, DRAWN_WIDER, haloOf, sourceCreditFor, titleCardFor, verticalInsetFor, widthOf } = await import(chartVideo("shots.mjs"));
const { videoRegistersOf } = await import(chartVideo("video-registers.mjs"));
export const ROOT = splashRoot(HERE);
/** The size this run exports at — `--size`, landscape when nothing asks. R2 names three and
 *  everything under it already answered per size; only this line pinned the beat to one. */
export const SIZE = videoExportSize();
export const REGISTER_NAMES = ["display", "eyebrow", "body", "annot", "value", "axis"];
const NB = "\u00A0";
const LABEL_GAP = 0.4;

/**
 * The beat one render is handed. `subject` is `subjectOf(beat)` (`./subject.mjs`); `copy` is the beat's words as
 * render-beat.mjs shapes them: `{ eyebrow, title: forms, unit, ratio(text), dates: [from, to], source: forms, format }`.
 */
export function loadBeat(subject, copy) {
  return { subject, states: statesFor(), copy };
}

/**
 * Every value text a head can show, and every ratio text the stack can show: the scene walked frame by frame on the
 * beat's own values. The proof enumerated every tenth from 0 to the tallest head, right for 15 t per person and
 * millions of strings for a story counted in thousands; a head only ever counts through these. `unit` matters to the
 * ratio only (the stack's heights are pixels).
 */
export function shownTexts(subject, states, format, unit = 1) {
  const props = {
    states,
    timing: LOLLIPOP_VIDEO_TIMING,
    subject: subject.subject,
    other: subject.other,
    baseline: 0,
    unit,
    copies: subject.copies,
    stackGap: 0,
    stackW: 0,
    pairs: subject.pairs.map((p) => ({ code: p.code, before: p.before, after: p.after, centreX: 0, pastX: 0, presentX: 0 })),
  };
  const values = new Set();
  const ratios = new Set();
  for (let frame = 0; frame < LOLLIPOP_VIDEO_TIMING.total; frame += 1) {
    const scene = sceneAt(props, frame);
    for (const p of scene.pairs) {
      values.add(valueText(p.present, format));
      values.add(valueText(p.past, format));
    }
    if (scene.ratioShown > 0) ratios.add(ratioText(scene.ratio, format));
  }
  return { values: [...values], ratios: [...ratios] };
}

export function textPerRegisterOf(copy, subject) {
  return {
    display: copy.title.join(" "),
    eyebrow: copy.eyebrow,
    body: copy.source.join(" "),
    annot: "",
    value: `${copy.ratio(ratioText(subject.ratio.before, copy.format))} 0123456789${copy.format.decimal}${copy.format.group}`,
    axis: `${copy.unit} ${subject.pairs.map((p) => p.name).join(" ")} ${copy.dates.join(" ")} ${copy.source.join(" ")}`,
  };
}

export function buildDirection(id, chosen, { subject, states, copy }) {
  const direction = resolveDirectionFamilies(chosen, textPerRegisterOf(copy, subject));
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
  const { register: sourceRegister, ...credit } = sourceCreditFor({ registers, forms: copy.source, size: SIZE, k, ...CREDIT_ONE_LINE });
  const creditAt = { x: inset, y: stage.height - vInset - credit.height };

  // THE BAND OVER THE PAIRS: the ratio at the left, the unit at the right.
  const top = Math.max(...subject.pairs.flatMap((p) => [p.before, p.after]));
  const shown = shownTexts(subject, states, copy.format);
  const bandBaseline = vInset + valueBand.ascent;
  const unitWord = measure(copy.unit, axis);
  const unitLine = { ...unitWord, x: inset, y: bandBaseline };
  if (!(inset + unitWord.width * (1 + DRAWN_WIDER) <= stage.width - inset)) throw new Error(`the unit « ${copy.unit} » runs past the frame: shorten unit`);


  // THE PAIRS: in each slot, the 2000 stem then the 2023 stem, a head's width apart plus its value's; the dates under
  // the first pair only, the name under every pair.
  //
  // HOW MANY SLOTS PER ROW IS A MEASURE, NOT THE NUMBER SIX. A slot has to carry a pair's two values side by side and
  // its country's name under it. Measured 2026-09-23 on nocturne: the pair wants 224.2px and the widest name 199.1px,
  // against a 291.7px slot at 1920 — six in a row, which is the picture this beat was cut as. At 1080 the same two
  // measures are 269.1px and 238.8px against a 156.0px slot, so six in a row is not a tighter drawing of this argument
  // but an unreadable one. The columns are therefore stepped down until both measures hold and the six pairs wrap into
  // rows that share one scale and one unit — three columns at 1080, six at 1920, and landscape does not move.
  const content = stage.width - 2 * inset;
  const valueWidths = Object.fromEntries(shown.values.map((t) => [t, widthOf(applyCase(t, value.transform), value)]));
  const widest = Math.max(...Object.values(valueWidths)) * (1 + DRAWN_WIDER);
  const apart = widest + gap;
  const names = subject.pairs.map((p) => measure(p.name, axis));
  const widestName = Math.max(...names.map((n) => n.width)) * (1 + DRAWN_WIDER);
  let columns = 0;
  const triedColumns = [];
  for (let cols = subject.pairs.length; cols >= 1; cols--) {
    const trial = content / cols - gap;
    if (!(apart + widest < trial)) triedColumns.push(`${cols}: a pair's two values do not fit side by side in its slot (${(apart + widest).toFixed(1)}px in ${trial.toFixed(1)}px)`);
    else if (!(widestName < trial)) triedColumns.push(`${cols}: a name does not hold under its pair (${widestName.toFixed(1)}px in ${trial.toFixed(1)}px)`);
    else { columns = cols; break; }
  }
  if (!columns) throw new Error(`no number of columns fits this frame: ${triedColumns.join("; ")}`);
  const rows = Math.ceil(subject.pairs.length / columns);
  const slot = content / columns;
  const rowOf = (i) => Math.floor(i / columns);
  // THE STACK IS A COMPARISON BETWEEN TWO STEMS, so the two countries the title names have to stand on one zero line.
  // They are the two largest emitters and sort first, but a data year that changed that would silently break the shot.
  const subjectRow = rowOf(subject.pairs.findIndex((p) => p.code === subject.subject));
  const otherRow = rowOf(subject.pairs.findIndex((p) => p.code === subject.other));
  if (subjectRow !== otherRow)
    throw new Error(`the stack compares ${subject.subject} with ${subject.other}, and ${columns} columns put them on rows ${subjectRow} and ${otherRow} — two zero lines the eye cannot measure across: put the two pairs next to each other at the start of pairs`);

  const R = 0.3 * axis.lead;
  /** The air over the tallest head a row keeps for its value text, and the air under a zero line for the dates and the name. */
  const headroom = R + gap / 2 + valueBand.descent + valueBand.ascent;
  const belowZero = 2 * band.ascent + 2 * band.descent + 1.25 * gap;
  const plotTop = bandBaseline + valueBand.descent + 1.5 * gap;
  const rowSpan = (creditAt.y - gap - plotTop) / rows;
  const unit = (rowSpan - headroom - belowZero) / top;
  if (!(unit > 0)) throw new Error(`${rows} rows of pairs leave ${(rowSpan - headroom - belowZero).toFixed(1)}px for the tallest stem: shorten the names in pairs or the source forms`);
  const baselineOf = (r) => plotTop + headroom + unit * top + r * rowSpan;
  const baseline = baselineOf(subjectRow);
  const dateBaselineOf = (r) => baselineOf(r) + band.ascent + gap;
  const nameBaselineOf = (r) => dateBaselineOf(r) + band.ascent + band.descent + 0.25 * gap;
  const centre = (i) => inset + slot * ((i % columns) + 0.5);
  // THE STACK of China's copies stands just left of the American stem, its ratio centred over it; while the ratio shows the
  // American head's own value gives way. At 2023 the stack must stay clear of the 2000 tint on the pair's left.
  const copies = subject.copies;
  // Every copy of the subject's stem reads as a block: past its seam it still has the height of a head.
  const seam = Math.max(2 * k, 0.08 * axis.lead);
  const shortest = Math.min(subject.focus.before, subject.focus.after) * unit;
  if (!(shortest - seam >= R))
    throw new Error(`a copy of ${subject.subject}'s stem is ${shortest.toFixed(1)}px tall, too short to read as a block in the stack: the ratio is too large for this video — compare ${subject.subject} with a pair nearer its level`);
  const ratioWidths = Object.fromEntries(shownTexts(subject, states, copy.format, unit).ratios.map((t) => [t, widthOf(applyCase(copy.ratio(t), value.transform), value)]));
  const stackGap = R + gap / 3;
  const stackW = 2 * R;
  if (!(apart - stackGap - stackW > R + gap / 3)) throw new Error(`the stack runs into the ${copy.dates[0]} tint`);

  const { ground, accent } = direction;
  const { ink, muted, grid } = deriveFurniture(ground);
  const walked = (c, floor, what) => {
    const w = adjustToContrast(c, ground, floor);
    if (!w) throw new Error(`${what} has no variant that reads at ${floor}:1 on ${ground}`);
    return w;
  };
  /** ONE HUE, TWO CHROMAS — the static plate's rule: the past a tint of the present, as far toward the ground as still reads. */
  let past = mix(accent, ground, 0.6);
  if (contrast(past, ground) < NON_TEXT_CONTRAST_MIN) past = walked(past, NON_TEXT_CONTRAST_MIN, `the tint for ${copy.dates[0]}`);
  const colours = {
    ground,
    grid: mix(ground, ink, 0.75),
    past,
    present: walked(accent, NON_TEXT_CONTRAST_MIN, `the hue for ${copy.dates[1]}`),
    faded: mix(ground, ink, 0.14),
    ring: walked(ink, NON_TEXT_CONTRAST_MIN, "the subject's ring"),
    text: {
      eyebrow: walked(registers.eyebrow.fill ?? accent, TEXT_CONTRAST_MIN, "the eyebrow"),
      title: walked(registers.display.fill ?? ink, TEXT_CONTRAST_MIN, "the title"),
      past: walked(past, TEXT_CONTRAST_MIN, `a ${copy.dates[0]} value`),
      present: walked(accent, TEXT_CONTRAST_MIN, `a ${copy.dates[1]} value`),
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
    subject: subject.subject,
    other: subject.other,
    valueFormat: copy.format,
    pairs: subject.pairs.map((p, i) => {
      const pastX = centre(i) - apart / 2;
      const presentX = centre(i) + apart / 2;
      const row = rowOf(i);
      return {
        centreX: r1(centre(i)),
        code: p.code,
        before: p.before,
        after: p.after,
        pastX: r1(pastX),
        presentX: r1(presentX),
        /** Every row shares one unit and one headroom, so a stem's height still reads across rows; only its zero moves. */
        baseline: r1(baselineOf(row)),
        name: { ...names[i], x: centre(i) - names[i].width / 2, y: nameBaselineOf(row) },
        dates: i === 0 ? [pastX, presentX].map((x, j) => ({ ...dates[j], x: x - dates[j].width / 2, y: dateBaselineOf(row) })) : [],
      };
    }),
    baseline: r1(baseline),
    unit,
    R: r1(R),
    zero: { left: inset, right: stage.width - inset },
    /** One zero line per row of pairs; one line at 16:9, where every pair stands on the same one. */
    zeroLines: Array.from({ length: rows }, (_, r) => r1(baselineOf(r))),
    ratioWidths,
    copies,
    stackGap: r1(stackGap),
    stackW: r1(stackW),
    seam: r1(seam),
    unitLine,
    valueWidths,
    valueRise: R + gap / 2 + valueBand.descent,
    strokes: { stem: (direction.stroke?.rule ?? 1) * k * 2, ring: (direction.stroke?.rule ?? 1) * k * 1.4, grid: (direction.stroke?.hairline ?? 0.6) * k },
    halo: { value: haloOf(value, k) },
    states,
    timing: LOLLIPOP_VIDEO_TIMING,
  };
  return { id, direction, props, report: { k, titleForm: titleCard.form, sourceForm: credit.form, apart: apart.toFixed(1), columns, rows } };
}
