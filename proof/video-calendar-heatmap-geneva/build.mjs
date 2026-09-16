// EVERYTHING ONE DIRECTION'S RENDER IS HANDED, BUILT IN BUN — the words, the calendar's cells, the month names and the day
// ticks, the key, the counters, the streak's runs, the colours and the states.
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
import { BAND_PROBE, bandOf, CREDIT_ONE_LINE, DRAWN_WIDER, haloOf, keyFor, sourceCreditFor, titleCardFor, verticalInsetFor, widthOf } from "../../skills/chart-video/scripts/shots.mjs";
import { videoRegistersOf } from "../../skills/chart-video/scripts/video-registers.mjs";
import { statesFor } from "./states.mjs";
import { daysInMonth, loadSubject, MONTHS, THRESHOLD, YEAR } from "./subject.mjs";
import { CALENDAR_VIDEO_TIMING } from "./timing-contract.ts";

const HERE = dirname(fileURLToPath(import.meta.url));
export const ROOT = join(HERE, "..", "..");
export const DIRECTIONS = join(ROOT, "docs", "design-base", "directions");
export const SIZE = "landscape";
export const REGISTER_NAMES = ["display", "eyebrow", "body", "annot", "value", "axis"];
const NB = "\u00A0";
const LABEL_GAP = 0.4;
const DAY_TICKS = [1, 5, 10, 15, 20, 25, 31];

export function loadBeat() {
  const subject = loadSubject();
  return { subject, states: statesFor(), copy: copyOf(subject) };
}

const days = (n) => `${n}${NB}jour${n > 1 ? "s" : ""}`;

export function copyOf(subject) {
  return {
    eyebrow: `Climat${NB}· Genève`,
    title: [`${subject.streak.length} jours d’affilée au-dessus de ${THRESHOLD}${NB}°C à Genève en ${YEAR}`, `${subject.streak.length} jours d’affilée au-dessus de ${THRESHOLD}${NB}°C à Genève`],
    warm: (n) => `${days(n)} au-dessus de ${THRESHOLD}${NB}°C`,
    run: (n) => `${days(n)} d’affilée`,
    threshold: `${THRESHOLD}${NB}°C`,
    breaks: subject.breaks.map((b, i) => (i === subject.breaks.length - 1 ? `${b}${NB}°C` : String(b))),
    source: [`Source : Open-Meteo (réanalyse ERA5), moyenne journalière à 2${NB}m, Genève`, "Source : Open-Meteo (réanalyse ERA5), Genève"],
  };
}

export function textPerRegisterOf(copy) {
  return {
    display: copy.title.join(" "),
    eyebrow: copy.eyebrow,
    body: copy.source.join(" "),
    annot: "",
    value: `${copy.warm(59)} ${copy.run(31)} 0123456789`,
    axis: `${MONTHS.join(" ")} ${DAY_TICKS.join(" ")} ${copy.breaks.join(" ")} ${copy.threshold} ${copy.source.join(" ")}`,
  };
}

export function buildDirection(id, { subject, states, copy }) {
  const direction = resolveDirectionFamilies(readDirection(join(DIRECTIONS, `${id}.md`)), textPerRegisterOf(copy));
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

  // THE BAND OVER THE CALENDAR: the two counts at the left, the key at the right, no plate.
  const valueHalo = haloOf(value, k);
  const counterTexts = {
    warm: Object.fromEntries(Array.from({ length: subject.warm + 1 }, (_, i) => [String(i), measure(copy.warm(i), value)])),
    run: Object.fromEntries(Array.from({ length: subject.streak.length + 1 }, (_, i) => [String(i), measure(copy.run(i), value)])),
  };
  const warmBaseline = vInset + valueBand.ascent;
  const runBaseline = warmBaseline + valueBand.descent + 0.4 * axis.lead + valueBand.ascent;
  const counters = { x: inset, warm: warmBaseline, run: runBaseline };
  const key = keyFor({ registers, k, counters: [], breaks: copy.breaks });
  const counterRight = inset + Math.max(...[...Object.values(counterTexts.warm), ...Object.values(counterTexts.run)].map((t) => t.width)) * (1 + DRAWN_WIDER);
  const keyAt = { x: stage.width - inset - key.width, y: vInset - key.halo / 2 };
  if (!(counterRight + 2 * gap < keyAt.x)) throw new Error("the counts and the key do not fit side by side over the calendar");
  const bandBottom = Math.max(runBaseline + valueBand.descent, keyAt.y + key.height) + 1.5 * gap;

  // THE CALENDAR: a row a month, a column a day of the month, the month names at the left, the day ticks under it.
  const tickBaseline = creditAt.y - gap - band.descent;
  const monthNames = MONTHS.map((m) => measure(m, axis));
  const monthRoom = Math.max(...monthNames.map((m) => m.width)) * (1 + DRAWN_WIDER) + gap;
  const grid = { left: inset + monthRoom, right: stage.width - inset, top: bandBottom, bottom: tickBaseline - band.ascent - gap };
  const cellW = (grid.right - grid.left) / 31;
  const cellH = (grid.bottom - grid.top) / 12;
  if (!(cellH >= 0.9 * axis.lead)) throw new Error(`a month's row is ${cellH.toFixed(1)}px, too short to carry its name`);
  const cellGap = Math.max(Math.min(cellW, cellH) * 0.08, k);
  const xOf = (day) => grid.left + (day - 1) * cellW;
  const yOf = (month) => grid.top + month * cellH;
  const r1 = (v) => Math.round(v * 10) / 10;
  const cellOf = (month, day) => ({ x: r1(xOf(day) + cellGap / 2), y: r1(yOf(month) + cellGap / 2), w: r1(cellW - cellGap), h: r1(cellH - cellGap) });
  const binOf = (v) => subject.breaks.filter((b) => v >= b).length;
  // THE CURVE the calendar is rolled up from: the year across the grid's width, the temperature across its height.
  const values = subject.days.map((d) => d.value);
  const lo = Math.floor(Math.min(...values)) - 1;
  const hi = Math.ceil(Math.max(...values)) + 1;
  const curveX = (i) => grid.left + (i / (subject.days.length - 1)) * (grid.right - grid.left);
  const curveY = (v) => grid.bottom - ((v - lo) / (hi - lo)) * (grid.bottom - grid.top);
  const dot = Math.max(2 * k, 0.12 * axis.lead);
  const thresholdWord = measure(copy.threshold, axis);

  const missing = [];
  for (let m = 0; m < 12; m++) for (let d = daysInMonth(m) + 1; d <= 31; d++) missing.push(cellOf(m, d));
  const { from, to } = subject.streak;
  const runs = [];
  let before = 0;
  for (let month = from.month; month <= to.month; month++) {
    const a = month === from.month ? from.day : 1;
    const b = month === to.month ? to.day : daysInMonth(month);
    runs.push({ month, from: a, to: b, before, x: r1(xOf(a)), y: r1(yOf(month)), cellW, h: r1(cellH) });
    before += b - a + 1;
  }

  const { ground, accent } = direction;
  const { ink, muted } = deriveFurniture(ground);
  const walked = (c, floor, what) => {
    const w = adjustToContrast(c, ground, floor);
    if (!w) throw new Error(`${what} has no variant that reads at ${floor}:1 on ${ground}`);
    return w;
  };
  const cold = mix(accent, ground, 0.88);
  const warm = mix(accent, ink, 0.25);
  const bins = subject.breaks.length + 1;
  const colours = {
    ground,
    ramp: Array.from({ length: bins }, (_, i) => mix(cold, warm, i / (bins - 1))),
    /** An empty day before the fill, and a date that does not exist: the pale step off the ground. */
    empty: mix(ground, ink, 0.05),
    /** A day on the curve: the accent at or over the threshold, the muted under it. */
    hot: walked(accent, NON_TEXT_CONTRAST_MIN, "a warm day on the curve"),
    cool: walked(mix(muted, ground, 0.3), NON_TEXT_CONTRAST_MIN, "a day on the curve"),
    stepped: mix(ground, ink, 0.1),
    /** The run's outline is the ink, struck over a halo of the ground so it parts from the darkest bin it runs along. */
    outline: walked(ink, NON_TEXT_CONTRAST_MIN, "the run's outline"),
    text: {
      eyebrow: walked(registers.eyebrow.fill ?? accent, TEXT_CONTRAST_MIN, "the eyebrow"),
      title: walked(registers.display.fill ?? ink, TEXT_CONTRAST_MIN, "the title"),
      axis: walked(muted, TEXT_CONTRAST_MIN, "the months and days"),
      count: walked(ink, TEXT_CONTRAST_MIN, "the counts"),
    },
  };

  const props = {
    frame: stage,
    registers: { display: titleCard.register, eyebrow: registers.eyebrow, value, axis, source: sourceRegister },
    titleCard,
    credit: { ...credit, at: creditAt },
    colours,
    days: subject.days.map((d, i) => ({ value: d.value, bin: binOf(d.value), ...cellOf(d.month, d.day), cx: r1(curveX(i)), cy: r1(curveY(d.value)) })),
    dot: r1(dot),
    thresholdLine: { y: r1(curveY(THRESHOLD)), left: grid.left, right: grid.right, label: { ...thresholdWord, x: grid.left - gap - thresholdWord.width * (1 + DRAWN_WIDER), y: curveY(THRESHOLD) + shift } },
    missing,
    months: monthNames.map((m, i) => ({ ...m, x: grid.left - gap - m.width * (1 + DRAWN_WIDER), y: yOf(i) + cellH / 2 + shift })),
    ticks: DAY_TICKS.map((d) => {
      const t = measure(String(d), axis);
      return { ...t, x: xOf(d) + cellW / 2 - t.width / 2, y: tickBaseline };
    }),
    counters: { ...counters, texts: counterTexts },
    legend: { ...key, at: keyAt },
    runs,
    threshold: THRESHOLD,
    streakLength: subject.streak.length,
    strokes: { outline: (direction.stroke?.rule ?? 1) * k * 1.6 },
    halo: { value: valueHalo, axis: haloOf(axis, k) },
    states,
    timing: CALENDAR_VIDEO_TIMING,
  };
  return { id, direction, props, report: { k, titleForm: titleCard.form, sourceForm: credit.form, cell: `${cellW.toFixed(1)}×${cellH.toFixed(1)}` } };
}
