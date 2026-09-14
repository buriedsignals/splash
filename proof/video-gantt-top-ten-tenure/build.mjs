// EVERYTHING ONE DIRECTION'S RENDER IS HANDED, BUILT IN BUN — the words, the rows and their names, the year axis, the
// counts, the colours and the states.
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
import { BAND_PROBE, bandOf, CREDIT_ONE_LINE, DRAWN_WIDER, haloOf, sourceCreditFor, titleCardFor, verticalInsetFor, widthOf } from "../../skills/chart-video/scripts/shots.mjs";
import { videoRegistersOf } from "../../skills/chart-video/scripts/video-registers.mjs";
import { statesFor } from "./states.mjs";
import { FIRST, LAST, loadSubject, SLOTS } from "./subject.mjs";
import { GANTT_VIDEO_TIMING } from "./timing-contract.ts";

const HERE = dirname(fileURLToPath(import.meta.url));
export const ROOT = join(HERE, "..", "..");
export const DIRECTIONS = join(ROOT, "docs", "design-base", "directions");
export const SIZE = "landscape";
export const REGISTER_NAMES = ["display", "eyebrow", "body", "annot", "value", "axis"];
const NB = "\u00A0";
const LABEL_GAP = 0.4;
const BAR = 0.62;

export function loadBeat() {
  const subject = loadSubject();
  return { subject, states: statesFor(), copy: copyOf(subject) };
}

const SPELLED = ["Zéro", "Un", "Deux", "Trois", "Quatre", "Cinq", "Six", "Sept", "Huit", "Neuf", "Dix"];

export function copyOf(subject) {
  return {
    eyebrow: `Climat${NB}· Monde`,
    title: [`${SPELLED[subject.throughout]} pays n’ont jamais quitté le top${NB}${SLOTS} des émetteurs depuis ${FIRST}`, `${SPELLED[subject.throughout]} pays jamais sortis du top${NB}${SLOTS} des émetteurs`],
    count: (n) => `${n}${NB}pays jamais sortis`,
    source: [`Source : Global Carbon Budget (2025), via Our World in Data${NB}· combustibles fossiles et industrie`, "Source : Global Carbon Budget (2025), via Our World in Data"],
  };
}

export function textPerRegisterOf(copy, subject) {
  return {
    display: copy.title.join(" "),
    eyebrow: copy.eyebrow,
    body: copy.source.join(" "),
    annot: "",
    value: `${copy.count(10)} 0123456789`,
    axis: `${subject.rows.map((r) => r.name).join(" ")} 1990 1995 2000 2005 2010 2015 2020 2024 ${copy.source.join(" ")}`,
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

  const titleCard = titleCardFor({ registers, eyebrow: copy.eyebrow, title: copy.title, size: SIZE, eyebrowToDisplay: EYEBROW_TO_DISPLAY });
  const { register: sourceRegister, ...credit } = sourceCreditFor({ registers, forms: copy.source, size: SIZE, k, ...CREDIT_ONE_LINE });
  const creditAt = { x: inset, y: stage.height - vInset - credit.height };

  // THE COUNT over the rows, at the left; the year ticks under them, the credit under the ticks.
  const counts = Object.fromEntries([...new Set(subject.neverLeft)].map((n) => [String(n), measure(copy.count(n), value)]));
  const countBaseline = vInset + valueBand.ascent;
  const names = subject.rows.map((r) => measure(r.name, axis));
  const nameRoom = Math.max(...names.map((n) => n.width)) * (1 + DRAWN_WIDER) + gap;
  const tickBaseline = creditAt.y - gap - band.descent;
  const plot = { left: inset + nameRoom, right: stage.width - inset, top: countBaseline + valueBand.descent + 1.5 * gap, bottom: tickBaseline - band.ascent - gap };
  const pitch = (plot.bottom - plot.top) / subject.rows.length;
  if (!(pitch >= band.ascent + band.descent)) throw new Error(`a row is ${pitch.toFixed(1)}px, shorter than its name`);
  const xOf = (year) => plot.left + ((year - FIRST) / (LAST + 1 - FIRST)) * (plot.right - plot.left);
  const yOf = (i) => plot.top + i * pitch;
  const tickYears = [1990, 1995, 2000, 2005, 2010, 2015, 2020, 2024];
  const ticks = tickYears.map((y) => {
    const t = measure(String(y), axis);
    const x = Math.min(plot.right - t.width * (1 + DRAWN_WIDER), Math.max(plot.left, xOf(y + 0.5) - t.width / 2));
    return { ...t, x, y: tickBaseline };
  });
  ticks.forEach((t, i) => {
    if (i > 0 && !(ticks[i - 1].x + ticks[i - 1].width * (1 + DRAWN_WIDER) + gap < t.x)) throw new Error(`the year ticks ${tickYears[i - 1]} and ${tickYears[i]} collide`);
  });

  const { ground, accent } = direction;
  const { ink, muted, grid } = deriveFurniture(ground);
  const walked = (c, floor, what) => {
    const w = adjustToContrast(c, ground, floor);
    if (!w) throw new Error(`${what} has no variant that reads at ${floor}:1 on ${ground}`);
    return w;
  };
  const colours = {
    ground,
    track: mix(ground, ink, 0.05),
    grid,
    bar: walked(mix(accent, ground, 0.42), NON_TEXT_CONTRAST_MIN, "a bar"),
    kept: walked(accent, NON_TEXT_CONTRAST_MIN, "a bar that never left"),
    faded: mix(ground, ink, 0.16),
    text: {
      eyebrow: walked(registers.eyebrow.fill ?? accent, TEXT_CONTRAST_MIN, "the eyebrow"),
      title: walked(registers.display.fill ?? ink, TEXT_CONTRAST_MIN, "the title"),
      name: walked(ink, TEXT_CONTRAST_MIN, "a name"),
      kept: walked(accent, TEXT_CONTRAST_MIN, "a name that never left"),
      axis: walked(muted, TEXT_CONTRAST_MIN, "the years"),
      count: walked(ink, TEXT_CONTRAST_MIN, "the count"),
    },
  };

  const r1 = (v) => Math.round(v * 10) / 10;
  const props = {
    frame: stage,
    registers: { display: titleCard.register, eyebrow: registers.eyebrow, value, axis, source: sourceRegister },
    titleCard,
    credit: { ...credit, at: creditAt },
    colours,
    plot,
    first: FIRST,
    last: LAST,
    yearWidth: (plot.right - plot.left) / (LAST + 1 - FIRST),
    rows: subject.rows.map((r, i) => ({
      key: r.entity,
      throughout: r.throughout,
      /** The first year a country of the 1990 ten was out of it; `null` for the six who never left, and for a country
       *  that was not among the ten in 1990 (it was never counted). */
      member: r.firstYear === FIRST,
      leftAt: r.firstYear === FIRST && !r.throughout ? (r.runs.length > 1 || r.runs[0].to < LAST ? r.runs[0].to + 1 : null) : null,
      runs: r.runs,
      y: r1(yOf(i) + (pitch * (1 - BAR)) / 2),
      h: r1(pitch * BAR),
      trackY: r1(yOf(i) + pitch * 0.1),
      trackH: r1(pitch * 0.8),
      name: { ...names[i], x: plot.left - gap - names[i].width * (1 + DRAWN_WIDER), y: yOf(i) + pitch / 2 + shift },
    })),
    ticks,
    yearTexts: Object.fromEntries(subject.years.map((y) => [String(y), measure(String(y), axis)])),
    tickY: tickBaseline,
    neverLeft: subject.neverLeft,
    counts,
    countAt: { x: inset, y: countBaseline },
    strokes: { grid: (direction.stroke?.hairline ?? 0.6) * k },
    halo: { value: haloOf(value, k) },
    states,
    timing: GANTT_VIDEO_TIMING,
  };
  return { id, direction, props, report: { k, titleForm: titleCard.form, sourceForm: credit.form, pitch: pitch.toFixed(1) } };
}
