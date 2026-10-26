// EVERYTHING ONE DIRECTION'S RENDER IS HANDED, BUILT IN BUN — the words, the rows, every track's points, the end names,
// India's rank texts, the passes, the colours and the states.
//
// Runs in Bun only.
//
// ZONE KIT COPY of proof/video-bump-emitter-rank/build.mjs. What changed: the subject and the words come from the beat
// (`./subject.mjs` ranks beat.mjs's values per year and finds every member the subject passed, render-beat.mjs builds
// `copy`), the direction is the one the run selects (handed in, not read from a filed id), the proof's constants (the
// years, the ten slots, India, the French names) are the subject's, the years named under the axis are a round step of
// the series' span, and the chart-video skill's scripts are found through `skillScriptFrom` — a beat sits at
// stories/<slug>/beats/<id>/, and an installed root has no skills/ beside it.

import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { adjustToContrast, mix, NON_TEXT_CONTRAST_MIN, TEXT_CONTRAST_MIN } from "#shared/chart-beat/colour.mjs";
import { deriveFurniture } from "#shared/chart-beat/render-still.mjs";
import { frameInsetFor, sizeFor, videoExportSize } from "#shared/chart-video/sizes.mjs";
import { EYEBROW_TO_DISPLAY, registerOf } from "#shared/design-base/register.mjs";
import { resolveDirectionFamilies } from "#shared/design-base/resolve-families.mjs";
import { skillScriptFrom } from "#shared/design-base/skill-script.mjs";
import { splashRoot } from "#shared/design-base/splash-root.mjs";
import { statesFor } from "./states.mjs";
import { BUMP_VIDEO_TIMING } from "./timing-contract.ts";

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
 * render-beat.mjs shapes them (the proof's `copyOf`): `{ eyebrow, title: forms, end(rank, entity), tip(rank), name(entity),
 * source: forms }`.
 */
export function loadBeat(subject, copy) {
  return { subject, states: statesFor(), copy };
}

/** The years named under the axis: the proof's every fifth year and the last (1990 … 2020, 2024), as a round step of
 *  the span; a multiple too close to the last year is left to it. */
export function yearTicksOf(first, last) {
  const step = last - first <= 40 ? 5 : last - first <= 80 ? 10 : 25;
  const ticks = [];
  for (let y = Math.ceil(first / step) * step; y < last; y += step) if (last - y > 0.4 * step) ticks.push(y);
  return [...ticks, last];
}

export function textPerRegisterOf(copy, subject) {
  return {
    display: copy.title.join(" "),
    eyebrow: copy.eyebrow,
    body: copy.source.join(" "),
    annot: subject.tracks.map((t) => copy.name(t.entity)).join(" "),
    value: `${copy.tip(subject.from)} 0123456789`,
    axis: `${subject.tracks.map((t) => copy.end(subject.slots, t.entity)).join(" ")} ${yearTicksOf(subject.years[0], subject.years.at(-1)).join(" ")} ${copy.source.join(" ")}`,
  };
}

export function buildDirection(id, chosen, { subject, states, copy }) {
  const direction = resolveDirectionFamilies(chosen, textPerRegisterOf(copy, subject));
  // Zone kit: the proof's constants are the subject's.
  const FIRST = subject.years[0];
  const LAST = subject.years.at(-1);
  const SLOTS = subject.slots;
  const SUBJECT = subject.subject;
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

  const { years, tracks, top } = subject;
  const leftNames = top.get(FIRST).map((e, i) => ({ entity: e, ...measure(copy.end(i + 1, e), axis) }));
  const rightNames = top.get(LAST).map((e, i) => ({ entity: e, ...measure(copy.end(i + 1, e), axis) }));
  const leftWidth = Math.max(...leftNames.map((t) => t.width)) * (1 + DRAWN_WIDER);
  const rightWidth = Math.max(...rightNames.map((t) => t.width)) * (1 + DRAWN_WIDER);
  const tipTexts = Object.fromEntries([...new Set(tracks.find((t) => t.entity === SUBJECT).ranks.filter(Boolean))].map((r) => [String(r), measure(copy.tip(r), value)]));
  const plot = {
    left: inset + leftWidth + gap,
    right: stage.width - inset - rightWidth - gap,
    top: vInset + band.ascent,
    bottom: stage.height - vInset - credit.height - gap - band.ascent - band.descent - 1.6 * gap,
  };
  const xs = years.map((y) => plot.left + ((y - FIRST) / (LAST - FIRST)) * (plot.right - plot.left));
  const yOf = (rank) => plot.top + ((rank - 1) / (SLOTS - 1)) * (plot.bottom - plot.top);
  const shift = (band.ascent - band.descent) / 2;

  const { ground, accent } = direction;
  const { ink, muted, grid } = deriveFurniture(ground);
  const walked = (c, floor, what) => {
    const w = adjustToContrast(c, ground, floor);
    if (!w) throw new Error(`${what} has no variant that reads at ${floor}:1 on ${ground}`);
    return w;
  };
  const passedKeys = new Set(subject.stillIn.map((p) => p.entity));
  const roleOf = (e) => (e === SUBJECT ? "subject" : passedKeys.has(e) ? "passed" : "other");
  const colours = {
    ground,
    grid,
    subject: walked(accent, NON_TEXT_CONTRAST_MIN, "the subject's line"),
    passed: walked(mix(ink, muted, 0.35), NON_TEXT_CONTRAST_MIN, "a passed country's line"),
    other: walked(mix(muted, ground, 0.25), NON_TEXT_CONTRAST_MIN, "a line"),
    text: {
      eyebrow: walked(registers.eyebrow.fill ?? accent, TEXT_CONTRAST_MIN, "the eyebrow"),
      title: walked(registers.display.fill ?? ink, TEXT_CONTRAST_MIN, "the title"),
      subject: walked(accent, TEXT_CONTRAST_MIN, "the subject's name"),
      passed: walked(ink, TEXT_CONTRAST_MIN, "a passed country's name"),
      other: walked(muted, TEXT_CONTRAST_MIN, "a name"),
      axis: walked(muted, TEXT_CONTRAST_MIN, "the years"),
    },
  };

  const index = new Map(years.map((y, i) => [y, i]));
  const india = tracks.find((t) => t.entity === SUBJECT);
  const props = {
    frame: stage,
    registers: { display: titleCard.register, eyebrow: registers.eyebrow, value, axis, source: sourceRegister },
    titleCard,
    credit: { ...credit, at: { x: inset, y: stage.height - vInset - credit.height } },
    colours,
    strokes: { line: (direction.stroke?.data ?? 2) * k * 0.9, subject: (direction.stroke?.data ?? 2) * k * 1.6, grid: (direction.stroke?.hairline ?? 0.6) * k },
    plot,
    xs: xs.map((x) => Math.round(x * 10) / 10),
    rows: Array.from({ length: SLOTS }, (_, i) => yOf(i + 1)),
    tracks: tracks.map((t) => ({ key: t.entity, role: roleOf(t.entity), ys: t.ranks.map((r) => (r === null ? null : yOf(r))) })),
    subject: SUBJECT,
    leftNames: leftNames.map((t, i) => ({ ...t, role: roleOf(t.entity), x: plot.left - gap - t.width, y: yOf(i + 1) + shift })),
    rightNames: rightNames.map((t, i) => ({ ...t, role: roleOf(t.entity), x: plot.right + gap, y: yOf(i + 1) + shift })),
    tipTexts,
    /** While the camera tracks India, every line in the top ten carries its name at its tip. */
    tipNames: Object.fromEntries(tracks.filter((t) => t.entity !== SUBJECT).map((t) => [t.entity, measure(copy.name(t.entity), axis)])),
    nameShift: shift,
    /** While the camera tracks, the years are out of the frame: the year the clock stands at, in the top right corner. */
    yearTexts: Object.fromEntries(years.map((y) => [String(y), measure(String(y), value)])),
    yearAt: { right: stage.width - inset, y: vInset + valueBand.ascent },
    firstYear: FIRST,
    gap,
    tipRanks: india.ranks,
    tipOffset: gap / 2,
    tipRise: valueBand.descent + gap / 2,
    passes: subject.passed.map((p) => ({ entity: p.entity, index: index.get(p.year), x: xs[index.get(p.year)], y: yOf(india.ranks[index.get(p.year)]) })),
    ticks: yearTicksOf(FIRST, LAST).map((y) => {
      const t = measure(String(y), axis);
      return { ...t, x: xs[index.get(y)] - t.width / 2, y: plot.bottom + 1.6 * gap + band.ascent };
    }),
    dotR: 0.14 * axis.lead,
    halo: haloOf(value, k),
    layoutInset: { x: inset, y: vInset },
    states,
    timing: BUMP_VIDEO_TIMING,
  };
  return { id, direction, props, report: { k, titleForm: titleCard.form, sourceForm: credit.form, tracks: tracks.length, passes: subject.passed.length } };
}
