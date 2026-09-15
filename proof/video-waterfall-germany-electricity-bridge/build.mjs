// EVERYTHING ONE DIRECTION'S RENDER IS HANDED, BUILT IN BUN — the words, the five slots on one scale from zero for the
// totals, their members and the steps, the running total the steps walk, every text a counter passes through, the names
// beside the 2015 total and in their slots, the bracket, the colours and the states.
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
import { tenthsKey } from "./scene.mjs";
import { statesFor } from "./states.mjs";
import { FROM, loadSubject, STACK, tenth, TO } from "./subject.mjs";
import { WATERFALL_VIDEO_TIMING } from "./timing-contract.ts";

const HERE = dirname(fileURLToPath(import.meta.url));
export const ROOT = join(HERE, "..", "..");
export const DIRECTIONS = join(ROOT, "docs", "design-base", "directions");
export const SIZE = "landscape";
export const REGISTER_NAMES = ["display", "eyebrow", "body", "annot", "value", "axis"];
const NB = "\u00A0";
const LABEL_GAP = 0.4;
/** The static plate's bar: 62 % of its slot. */
const BAR = 0.62;
const TICK_STEP = 200;
/** The bracket stands this share of the way down from the lower total's top to zero — the static plate's own. */
const BRACKET_DOWN = 0.42;

export function loadBeat() {
  const subject = loadSubject();
  return { subject, states: statesFor(), copy: copyOf(subject) };
}

/** A value to the tenth, a French comma, a true minus; a step always signed. */
export const valueText = (v, signed = false) => `${v < 0 ? "−" : signed ? "+" : ""}${Math.abs(tenth(v)).toFixed(1).replace(".", ",")}`;

export function copyOf(subject) {
  return {
    eyebrow: `Énergie${NB}· Allemagne`,
    title: [`L’Allemagne a produit ${Math.round(-subject.net)}${NB}TWh d’électricité de moins en ${TO} qu’en ${FROM}`, `L’Allemagne, ${Math.round(-subject.net)}${NB}TWh d’électricité de moins qu’en ${FROM}`],
    years: [String(FROM), String(TO)],
    bracket: (v) => `${valueText(v)}${NB}TWh`,
    source: ["Source : Ember, Energy Institute — Statistical Review of World Energy (2025), via Our World in Data", "Source : Ember, Energy Institute, via Our World in Data"],
  };
}

export function textPerRegisterOf(copy, subject) {
  return {
    display: copy.title.join(" "),
    eyebrow: copy.eyebrow,
    body: copy.source.join(" "),
    annot: "",
    value: `${subject.members.map((m) => valueText(m.change, true)).join(" ")} ${copy.bracket(subject.net)} 0123456789,`,
    axis: `${copy.years.join(" ")} ${subject.members.map((m) => m.name).join(" ")} 0 200 400 600 800 ${copy.source.join(" ")}`,
  };
}

const overlaps = (a, b) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;

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
  const drawn = (w) => w * (1 + DRAWN_WIDER);
  const gap = LABEL_GAP * axis.lead;
  const band = bandOf(BAND_PROBE, axis);
  const valueBand = bandOf(BAND_PROBE, value);
  const boxOf = (line, b) => ({ x: line.x, y: line.y - b.ascent, w: drawn(line.width), h: b.ascent + b.descent });

  const titleCard = titleCardFor({ registers, eyebrow: copy.eyebrow, title: copy.title, size: SIZE, eyebrowToDisplay: EYEBROW_TO_DISPLAY });
  const { register: sourceRegister, ...credit } = sourceCreditFor({ registers, forms: copy.source, size: SIZE, k, ...CREDIT_ONE_LINE });
  const creditAt = { x: inset, y: stage.height - vInset - credit.height };

  // THE RUNNING TOTAL the steps walk, in the bridge's order.
  let running = subject.opening;
  const steps = subject.members.map((m) => {
    const step = { key: m.key, from: running, to: running + m.change };
    running = step.to;
    return step;
  });
  if (Math.abs(running - subject.closing) > 1e-9) throw new Error(`the walk ends at ${running}, the closing total is ${subject.closing}`);
  const peak = Math.max(subject.opening, ...steps.flatMap((s) => [s.from, s.to]));
  const topTick = Math.ceil(peak / TICK_STEP) * TICK_STEP;

  // THE VERTICAL: the credit at the bottom, the names over it, the zero line over them; the scale the largest that holds
  // the top tick's word and the highest step's value under the frame's top margin.
  const namesBaseline = creditAt.y - gap - band.descent;
  const baseline = namesBaseline - band.ascent - gap;
  const shift = (band.ascent - band.descent) / 2;
  const unit = Math.min((baseline - vInset - band.ascent + shift) / topTick, (baseline - vInset - valueBand.ascent - valueBand.descent - gap / 2) / peak);
  const yOf = (v) => baseline - v * unit;

  // THE HORIZONTAL: the ticks at the left, five slots across the rest.
  const ticks = Array.from({ length: topTick / TICK_STEP + 1 }, (_, i) => i * TICK_STEP);
  const tickWords = ticks.map((t) => measure(String(t), axis));
  const tickRoom = drawn(Math.max(...tickWords.map((w) => w.width)));
  const left = inset + tickRoom + gap;
  const right = stage.width - inset;
  const slotW = (right - left) / 5;
  const barW = slotW * BAR;
  const slots = Array.from({ length: 5 }, (_, i) => ({ x: left + slotW * i + (slotW - barW) / 2, centre: left + slotW * i + slotW / 2 }));
  const centred = (word, x, y) => ({ ...word, x: x - drawn(word.width) / 2, y });

  const tickLines = ticks.map((t, i) => ({ value: t, y: yOf(t), label: { ...tickWords[i], x: inset + tickRoom - drawn(tickWords[i].width), y: yOf(t) + shift } }));
  const years = copy.years.map((y, i) => centred(measure(y, axis), slots[i * 4].centre, namesBaseline));

  // THE NAMES: beside the 2015 total at the middle of their member while it is a mix, then under their slot.
  const stack2015 = {};
  let base = 0;
  for (const key of STACK) {
    const m = subject.members.find((x) => x.key === key);
    stack2015[key] = { lo: base, hi: base + m.from };
    base += m.from;
  }
  const members = subject.members.map((m, i) => {
    const word = measure(m.name, axis);
    if (!(drawn(word.width) <= slotW - gap)) throw new Error(`« ${m.name} » does not hold in its slot`);
    const seg = stack2015[m.key];
    if (!((seg.hi - seg.lo) * unit >= band.ascent + band.descent)) throw new Error(`« ${m.name} » is taller than its member in 2015`);
    const beside = { x: slots[0].x + barW + gap, y: yOf((seg.lo + seg.hi) / 2) + shift };
    if (!(beside.x + drawn(word.width) < slots[4].x)) throw new Error(`« ${m.name} » beside the 2015 total runs into the 2024 slot`);
    return { key: m.key, from: m.from, to: m.to, change: m.change, name: { ...word, beside, seat: { x: slots[i + 1].centre - drawn(word.width) / 2, y: namesBaseline } } };
  });

  // EVERY TEXT A COUNTER PASSES THROUGH: the 2024 copy counts from the opening to the closing total, in tenths.
  const lo = Math.round(Math.min(subject.opening, subject.closing) * 10);
  const hi = Math.round(Math.max(subject.opening, subject.closing) * 10);
  const counts = {};
  for (let t = lo; t <= hi; t++) counts[String(t)] = measure(valueText(t / 10), value);
  if (!counts[tenthsKey(subject.opening)] || !counts[tenthsKey(subject.closing)]) throw new Error("the counter's ends are not measured");
  const widest = drawn(Math.max(...Object.values(counts).map((c) => c.width)));
  if (!(widest <= slotW - gap)) throw new Error("a counter text does not hold in its slot");
  const totalGap = gap / 2 + valueBand.descent;

  // THE STEPS' VALUES, outside the growing edge: above a rise, below a fall.
  const stepLabels = steps.map((s, i) => {
    const word = measure(valueText(subject.members[i].change, true), value);
    const rises = s.to > s.from;
    const y = rises ? yOf(s.to) - totalGap : yOf(s.to) + gap / 2 + valueBand.ascent;
    return centred(word, slots[i + 1].centre, y);
  });

  // THE BRACKET between the two totals' inner edges, under the lower top.
  const bracketY = yOf(Math.min(subject.opening, subject.closing)) + (baseline - yOf(Math.min(subject.opening, subject.closing))) * BRACKET_DOWN;
  const bracketWord = measure(copy.bracket(subject.closing - subject.opening), value);
  const bracket = { left: slots[0].x + barW, right: slots[4].x, y: bracketY, tick: gap / 2, label: centred(bracketWord, (slots[0].x + barW + slots[4].x) / 2, bracketY - totalGap) };

  // WHAT THE LAST SHOT HOLDS, asserted apart: no word on a bar or on another word, nothing above the top margin.
  const bars = [
    { what: "the 2015 total", x: slots[0].x, y: yOf(subject.opening), w: barW, h: subject.opening * unit },
    { what: "the 2024 total", x: slots[4].x, y: yOf(subject.closing), w: barW, h: subject.closing * unit },
    ...steps.map((s, i) => ({ what: `the ${s.key} step`, x: slots[i + 1].x, y: yOf(Math.max(s.from, s.to)), w: barW, h: Math.abs(s.to - s.from) * unit })),
  ];
  const openingLabel = centred(counts[tenthsKey(subject.opening)], slots[0].centre, yOf(subject.opening) - totalGap);
  const closingLabel = centred(counts[tenthsKey(subject.closing)], slots[4].centre, yOf(subject.closing) - totalGap);
  const words = [
    ...[openingLabel, closingLabel, bracket.label, ...stepLabels].map((l) => ({ what: `« ${l.text} »`, box: boxOf(l, valueBand) })),
    ...[...years, ...members.map((m) => ({ ...m.name, ...m.name.seat })), ...tickLines.map((t) => t.label)].map((l) => ({ what: `« ${l.text} »`, box: boxOf(l, band) })),
  ];
  words.forEach((a, i) => {
    if (a.box.y < vInset - gap) throw new Error(`${a.what} rises above the frame's top margin`);
    for (const b of words.slice(i + 1)) if (overlaps(a.box, b.box)) throw new Error(`${a.what} runs into ${b.what}`);
    for (const bar of bars) if (overlaps(a.box, bar)) throw new Error(`${a.what} runs into ${bar.what}`);
  });
  const bracketBox = { x: bracket.left, y: bracket.y - bracket.tick, w: bracket.right - bracket.left, h: 2 * bracket.tick };
  for (const w of words) if (w.what !== `« ${bracket.label.text} »` && overlaps(w.box, bracketBox)) throw new Error(`${w.what} runs into the bracket`);

  const { ground, accent } = direction;
  const { ink, muted, grid } = deriveFurniture(ground);
  const walked = (c, floor, what) => {
    const w = adjustToContrast(c, ground, floor);
    if (!w) throw new Error(`${what} has no variant that reads at ${floor}:1 on ${ground}`);
    return w;
  };
  const colours = {
    ground,
    grid,
    zero: walked(muted, NON_TEXT_CONTRAST_MIN, "the zero line"),
    connector: walked(mix(ground, ink, 0.45), NON_TEXT_CONTRAST_MIN, "a connector"),
    total: walked(muted, NON_TEXT_CONTRAST_MIN, "a total"),
    step: walked(accent, NON_TEXT_CONTRAST_MIN, "a step"),
    text: {
      eyebrow: walked(registers.eyebrow.fill ?? accent, TEXT_CONTRAST_MIN, "the eyebrow"),
      title: walked(registers.display.fill ?? ink, TEXT_CONTRAST_MIN, "the title"),
      name: walked(ink, TEXT_CONTRAST_MIN, "a name"),
      axis: walked(muted, TEXT_CONTRAST_MIN, "a muted word"),
      total: walked(ink, TEXT_CONTRAST_MIN, "a total"),
      step: walked(accent, TEXT_CONTRAST_MIN, "a step's value"),
    },
  };

  const rule = direction.stroke?.rule ?? 1;
  const props = {
    frame: stage,
    registers: { display: titleCard.register, eyebrow: registers.eyebrow, value, axis, source: sourceRegister },
    titleCard,
    credit: { ...credit, at: creditAt },
    colours,
    baseline,
    unit,
    barW,
    slots,
    plot: { left, right },
    stack: STACK,
    opening: subject.opening,
    closing: subject.closing,
    members,
    steps,
    ticks: tickLines,
    years,
    counts,
    totalGap,
    stepLabels,
    bracket,
    strokes: { grid: rule * k, zero: rule * k * 1.4, seam: rule * k * 2.5, connector: rule * k * 1.4, dash: [2 * k, 3 * k], bracket: rule * k * 1.4 },
    halo: { value: haloOf(value, k), axis: haloOf(axis, k) },
    states,
    timing: WATERFALL_VIDEO_TIMING,
  };
  return { id, direction, props, report: { k, titleForm: titleCard.form, sourceForm: credit.form, unit: unit.toFixed(3), slotW: slotW.toFixed(1) } };
}
