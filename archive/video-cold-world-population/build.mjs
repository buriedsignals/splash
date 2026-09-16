// EVERYTHING ONE DIRECTION'S RENDER IS HANDED, BUILT IN BUN — the words, the plot, the surface's points, the ticks, the
// unit and its stack, the level, the crossing's ring, every text measured, the colours and the states.
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
import { loadSubject } from "./subject.mjs";
import { POPULATION_VIDEO_TIMING } from "./timing-contract.ts";

const HERE = dirname(fileURLToPath(import.meta.url));
export const ROOT = join(HERE, "..", "..");
export const DIRECTIONS = join(ROOT, "docs", "design-base", "directions");
export const SIZE = "landscape";
export const REGISTER_NAMES = ["display", "eyebrow", "body", "annot", "value", "axis"];
const NB = "\u00A0";
const LABEL_GAP = 0.4;
const YEARS = [1800, 1850, 1900, 1950, 2000, 2023];
const VALUE_TICKS = [0, 4, 8];
const DOMAIN_TOP = 8.5;

export function loadBeat() {
  const subject = loadSubject();
  return { subject, states: statesFor(), copy: copyOf(subject) };
}

const fr = (v, digits) => v.toFixed(digits).replace(".", ",");
const COUNTS = [1, 2, 3, 4, 5, 6, 7, 8];

export function copyOf(subject) {
  return {
    eyebrow: "Démographie · Monde",
    title: [`La population mondiale a dépassé 8${NB}milliards en ${subject.crossing.year}`, `La population mondiale a dépassé 8${NB}milliards`],
    counter: (pop) => `${fr(pop / 1e9, 2)}${NB}${pop < 2e9 ? "milliard" : "milliards"}`,
    count: (k) => `×${k}`,
    multiple: `×${fr(Math.floor(subject.multiple * 10) / 10, 1)}`,
    crossing: String(subject.crossing.year),
    end: String(subject.last.year),
    tick: (v, top) => `${v}${top ? `${NB}milliards` : ""}`,
    source: [
      `Source : HYDE (2023), Gapminder (2022) et ONU, World Population Prospects (2024), via Our World in Data`,
      `Source : HYDE, Gapminder et ONU (WPP 2024), via Our World in Data`,
    ],
  };
}

export function textPerRegisterOf(copy, subject) {
  return {
    display: copy.title.join(" "),
    eyebrow: copy.eyebrow,
    body: copy.source.join(" "),
    annot: `${copy.crossing} ${copy.end} ${COUNTS.map(copy.count).join(" ")} ${copy.multiple}`,
    value: `${copy.counter(subject.last.pop)} ${copy.counter(subject.first.pop)} 0123456789 ${COUNTS.map(copy.count).join(" ")} ${copy.multiple}`,
    axis: `${YEARS.join(" ")} 0123456789 ${copy.tick(8, true)} ${copy.source.join(" ")}`,
  };
}

// Two decimals: the close-up magnifies the plot about sixty times, so a tenth of a pixel would show as a kink.
const r2 = (v) => Math.round(v * 100) / 100;

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
  const { axis, value, annot } = registers;
  const measure = (t, r) => {
    const cased = applyCase(t, r.transform);
    return { text: cased, width: widthOf(cased, r) };
  };
  const gap = LABEL_GAP * axis.lead;
  const axisBand = bandOf(BAND_PROBE, axis);
  const valueBand = bandOf(BAND_PROBE, value);

  const titleCard = titleCardFor({ registers, eyebrow: copy.eyebrow, title: copy.title, size: SIZE, eyebrowToDisplay: EYEBROW_TO_DISPLAY });
  const { register: sourceRegister, ...credit } = sourceCreditFor({ registers, forms: copy.source, size: SIZE, k, ...CREDIT_ONE_LINE });

  // ── the plot, zero-based: a population is a level read from zero; the credit takes its own row under the years ──
  const { readings } = subject;
  const tickTexts = VALUE_TICKS.map((v, i) => measure(copy.tick(v, i === VALUE_TICKS.length - 1), axis));
  const tickWidth = Math.max(...tickTexts.map((t) => t.width)) * (1 + DRAWN_WIDER);
  const yearTexts = YEARS.map((y) => measure(String(y), axis));
  const plot = {
    left: inset + tickWidth + gap,
    right: stage.width - inset - yearTexts.at(-1).width / 2,
    top: vInset + axisBand.ascent + axisBand.descent + gap,
    bottom: stage.height - vInset - credit.height - gap - axisBand.ascent - axisBand.descent - 1.6 * gap,
  };
  const first = readings[0].year;
  const last = readings.at(-1).year;
  const x = (year) => plot.left + ((year - first) / (last - first)) * (plot.right - plot.left);
  const y = (bn) => plot.bottom - (bn / DOMAIN_TOP) * (plot.bottom - plot.top);
  if (!(subject.last.pop / 1e9 <= DOMAIN_TOP)) throw new Error(`the last reading is above the plot's ${DOMAIN_TOP} billion top`);
  const points = readings.map((r) => ({ year: r.year, x: r2(x(r.year)), y: r2(y(r.pop / 1e9)), pop: r.pop }));
  const ticksY = VALUE_TICKS.map((v, i) => ({ ...tickTexts[i], x: plot.left - gap - tickTexts[i].width, y: y(v), baseline: y(v) + (axisBand.ascent - axisBand.descent) / 2 }));
  const ticksX = YEARS.map((year, i) => ({ ...yearTexts[i], x: x(year) - yearTexts[i].width / 2, y: plot.bottom + 1.6 * gap + axisBand.ascent, tickX: x(year) }));

  // ── the unit: the 1800 reading on the plot's own scale, a column standing on the first years ────────────────
  const unitHeight = plot.bottom - y(subject.first.pop / 1e9);
  const stackWidth = 1.4 * value.lead;
  const stack = { x: plot.left, width: stackWidth };
  const lastY = y(subject.last.pop / 1e9);
  if (!(Math.abs(plot.bottom - subject.multiple * unitHeight - lastY) < 0.01)) throw new Error("the stack's top does not meet the last reading");
  const level = { x0: stack.x + stack.width, x1: points.at(-1).x, y: lastY };

  // ── the population counter, then the count, in the empty upper left beside the stack, under the top gridline ──
  const counterTexts = Object.fromEntries(readings.map((r) => [String(r.year), measure(copy.counter(r.pop), value)]));
  const countTexts = { ...Object.fromEntries(COUNTS.map((c) => [String(c), measure(copy.count(c), value)])), final: measure(copy.multiple, value) };
  const counterWidth = Math.max(...[...Object.values(counterTexts), ...Object.values(countTexts)].map((t) => t.width)) * (1 + DRAWN_WIDER);
  const counterAt = { x: stack.x + stack.width + 2 * gap, y: y(VALUE_TICKS.at(-1)) + gap + valueBand.ascent };
  const highestUnder = (x0, x1) => Math.max(...readings.filter((r) => x(r.year) >= x0 - 3 && x(r.year) <= x1 + 3).map((r) => r.pop / 1e9));
  if (!(y(highestUnder(counterAt.x, counterAt.x + counterWidth)) > counterAt.y + valueBand.descent + gap)) throw new Error("the counter would sit on the curve");
  if (!(lastY < y(VALUE_TICKS.at(-1)) - 1)) throw new Error("the level would lie on the top gridline");

  // ── the crossing: the drawn line meets 8 billion between 2021 and 2022, a year the overview draws a few pixels wide.
  //    The camera closes in on the crossing and the last reading, centred on the stage, magnified until the two stand
  //    well apart; the ring, its year and the gridline's name are placed in screen space at their measured size. ──
  const annotBand = bandOf(BAND_PROBE, annot);
  const ring = { x: x(subject.crossingYear), y: y(subject.threshold / 1e9), r: 0.7 * annot.lead };
  const focus = { x: (ring.x + points.at(-1).x) / 2, y: (ring.y + lastY) / 2 };
  const target = { x: stage.width / 2, y: stage.height / 2 };
  const scale = Math.min((0.4 * stage.width) / (points.at(-1).x - ring.x), (0.45 * stage.height) / (ring.y - lastY));
  const camera = { focus, target, scale };
  const onScreen = (p) => ({ x: target.x + scale * (p.x - focus.x), y: target.y + scale * (p.y - focus.y) });
  const ringAt = onScreen(ring);
  const endAt = onScreen({ x: points.at(-1).x, y: lastY });
  const crossingText = measure(copy.crossing, annot);
  const crossingLabel = { ...crossingText, dx: -crossingText.width / 2, dy: -ring.r - gap - annotBand.descent };
  const endText = measure(copy.end, annot);
  const endLabel = { ...endText, dx: 2 * gap, dy: (annotBand.ascent - annotBand.descent) / 2 };
  if (!(endAt.x + endLabel.dx + endText.width * (1 + DRAWN_WIDER) < stage.width - inset)) throw new Error("the last year does not fit right of its reading in the close-up");
  const gridText = measure(copy.tick(VALUE_TICKS.at(-1), true), axis);
  const gridLabel = { ...gridText, x: inset, dy: -gap - axisBand.descent };
  // In the close-up the curve left of the crossing lies under the gridline, so the gridline's name above it stands on ground.
  const yearAtScreen = (sx) => first + ((focus.x + (sx - target.x) / scale - plot.left) / (plot.right - plot.left)) * (last - first);
  const popAt = (yr) => {
    const i = Math.min(Math.max(Math.floor(yr - first), 0), readings.length - 2);
    return (readings[i].pop + (readings[i + 1].pop - readings[i].pop) * (yr - first - i)) / 1e9;
  };
  if (!(popAt(yearAtScreen(inset + gridText.width * (1 + DRAWN_WIDER))) < subject.threshold / 1e9)) throw new Error("in the close-up the curve would cross under the gridline's name");
  if (!(ringAt.y + crossingLabel.dy - annotBand.ascent > vInset && endAt.x < stage.width - inset && ringAt.x + crossingLabel.dx > gridLabel.x + gridText.width + gap))
    throw new Error("the close-up does not hold the ring, its year and the last reading inside the frame");

  // ── colours: one accent; the surface steps back to its tint while the unit and its copies carry the accent ────
  const { ground, accent } = direction;
  const { ink, muted, grid } = deriveFurniture(ground);
  const floored = (c, floor, what) => {
    const w = adjustToContrast(c, ground, floor);
    if (!w) throw new Error(`${what} has no variant that reads at ${floor}:1 on ${ground}`);
    return w;
  };
  const surface = floored(accent, NON_TEXT_CONTRAST_MIN, "the surface");
  const colours = {
    ground,
    grid,
    surface,
    tint: floored(mix(muted, accent, 0.25), NON_TEXT_CONTRAST_MIN, "the tinted surface"),
    stack: surface,
    rule: floored(ink, NON_TEXT_CONTRAST_MIN, "the level"),
    text: {
      eyebrow: floored(registers.eyebrow.fill ?? accent, TEXT_CONTRAST_MIN, "the eyebrow"),
      title: floored(registers.display.fill ?? ink, TEXT_CONTRAST_MIN, "the title"),
      counter: floored(accent, TEXT_CONTRAST_MIN, "the counter"),
      axis: floored(muted, TEXT_CONTRAST_MIN, "the ticks"),
      crossing: floored(ink, TEXT_CONTRAST_MIN, "the crossing's year"),
    },
  };

  const creditAt = { x: inset, y: stage.height - vInset - credit.height };

  const props = {
    frame: stage,
    registers: { display: titleCard.register, eyebrow: registers.eyebrow, value, axis, annot, source: sourceRegister },
    titleCard,
    credit: { ...credit, at: creditAt },
    colours,
    strokes: { grid: (direction.stroke?.hairline ?? 0.6) * k, rule: (direction.stroke?.rule ?? 1) * k * 1.5 },
    plot,
    points,
    baseY: plot.bottom,
    multiple: subject.multiple,
    unitHeight,
    stack,
    level,
    ring,
    camera,
    crossingLabel,
    endLabel,
    gridLabel,
    ticksY,
    ticksX,
    counter: { at: counterAt, texts: counterTexts, counts: countTexts },
    halo: haloOf(value, k),
    states,
    timing: POPULATION_VIDEO_TIMING,
  };
  return { id, direction, props, report: { k, titleForm: titleCard.form, sourceForm: credit.form, multiple: subject.multiple, crossingYear: subject.crossingYear } };
}
