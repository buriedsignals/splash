// EVERYTHING ONE DIRECTION'S RENDER IS HANDED, BUILT IN BUN — the direction, its registers at the video's size, the
// title card, the credit, the colours floored, the states and the timing; and, in THE LAYOUT section, this beat's own
// picture, measured. The runner renders what `buildDirection` returns; the tests read the same object.
//
// THE DIRECTION IS COMPOSED FROM THE EDITORIAL SIDE, NOT PICKED FROM THE DEMO SET. `directionsFor` reads the
// newsroom's identity (the root's NEWSROOM.md), composes candidates with the design base (`composeDirections`) and
// returns the best one — exactly one. `candidates: N` returns the top N for the journalist to choose between;
// `filed: true` returns every filed direction, for a catalogue or demo proof only.
//
// Runs in Bun only.

import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { adjustToContrast, mix, NON_TEXT_CONTRAST_MIN, TEXT_CONTRAST_MIN } from "#shared/chart-beat/colour.mjs";
import { deriveFurniture } from "#shared/chart-beat/render-still.mjs";
import { frameInsetFor, sizeFor } from "#shared/chart-video/sizes.mjs";
import { composeDirections, report as reportComposition } from "#shared/design-base/compose.mjs";
import { readDirection } from "#shared/design-base/read-direction.mjs";
import { EYEBROW_TO_DISPLAY, registerOf } from "#shared/design-base/register.mjs";
import { resolveDirectionFamilies } from "#shared/design-base/resolve-families.mjs";
import { isDeclinedProfile, parseNewsroom, validateNewsroom } from "../../skills/splash/scripts/newsroom.mjs";
import { applyCase } from "../../skills/chart-video/scripts/registers.mjs";
import { BAND_PROBE, bandOf, CREDIT_ONE_LINE, DRAWN_WIDER, haloOf, sourceCreditFor, titleCardFor, verticalInsetFor, widthOf } from "../../skills/chart-video/scripts/shots.mjs";
import { videoRegistersOf } from "../../skills/chart-video/scripts/video-registers.mjs";
import { statesFor } from "./states.mjs";
import { assertClaim, loadSubject } from "./subject.mjs";
import { WORLD_POPULATION_VIDEO_TIMING } from "./timing-contract.ts";

const HERE = import.meta.dir;
export const ROOT = join(HERE, "../..");
export const DIRECTIONS = join(ROOT, "docs", "design-base", "directions");
export const SIZE = "landscape";
export const REGISTER_NAMES = ["display", "eyebrow", "body", "annot", "value", "axis"];
/** The no-break space, written as its escape. */
export const NB = "\u00A0";
/** The surface, the stack and the crossing's name: three levels of evidence. */
export const BEAT_FACTS = Object.freeze({ evidenceLevels: 3 });
const LABEL_GAP = 0.4;
const YEARS = [1800, 1850, 1900, 1950, 2000, 2023];
const VALUE_TICKS = [0, 2, 4, 6, 8];
/** The value axis runs to this many billion: room above 8 for the crossing's name. */
const TOP_BILLION = 9.4;
/** The mark every scaffold placeholder in the copy carries; `assertWritten` refuses a render while one is left. */
export const SCAFFOLD_MARK = "SCAFFOLD";

export function loadBeat() {
  const subject = loadSubject();
  return { subject, states: statesFor(), copy: copyOf(subject) };
}

const bn = (pop, digits) => (pop / 1e9).toFixed(digits);

/** The words, every number derived from the subject. */
export function copyOf(subject) {
  const { crossing, first, last, times } = subject;
  return {
    eyebrow: "World population",
    /** The title's forms, longest first: the title card takes the first that holds its lines. */
    title: [`The world passed 8${NB}billion people in ${crossing.year}`, `8${NB}billion people in ${crossing.year}`],
    counter: (pop) => `${bn(pop, 2)}${NB}billion`,
    times: (n) => `×${n}`,
    timesMax: times,
    counterLast: `${bn(last.pop, 2)}${NB}billion`,
    crossing: `${Math.floor(crossing.pop / 1e9)}${NB}billion${NB}· ${crossing.year}`,
    tick: (v, top) => `${v}${top ? `${NB}billion` : ""}`,
    range: [first.year, last.year],
    /** The credit's forms, longest first: the first that holds one line. */
    source: [
      `Source: HYDE (2023), Gapminder (2022) & UN World Population Prospects (2024), via Our World in Data`,
      `Source: HYDE, Gapminder & UN WPP, via Our World in Data`,
    ],
  };
}

/** What each register sets on this beat — the faces are resolved to cover it. */
export function textPerRegisterOf(copy) {
  return {
    display: copy.title.join(" "),
    eyebrow: copy.eyebrow,
    body: copy.source.join(" "),
    annot: `${copy.crossing} ${copy.times(copy.timesMax)} 0123456789`,
    value: `${copy.counterLast} ${copy.times(copy.timesMax)} 0123456789.`,
    axis: `${YEARS.join(" ")} ${copy.tick(8, true)} 0123456789 ${copy.source.join(" ")}`,
  };
}

/** Refuses a beat still carrying a scaffold placeholder: the copy, and the claim's assertions. */
export function assertWritten(beat) {
  if (JSON.stringify(beat.copy).includes(SCAFFOLD_MARK)) throw new Error(`the copy still carries ${SCAFFOLD_MARK} placeholders — write it (build.mjs, copyOf)`);
  assertClaim(beat.subject);
}

// ── the direction ─────────────────────────────────────────────────────────────────────────────────────────────

/** The newsroom's identity: its ground and primary accent, or null when it has none on record — and why. */
export function newsroomOf(root = ROOT) {
  const path = join(root, "NEWSROOM.md");
  if (!existsSync(path)) return { newsroom: null, note: "no NEWSROOM.md at the root: composed without a newsroom palette" };
  const profile = parseNewsroom(readFileSync(path, "utf8"));
  if (isDeclinedProfile(profile)) return { newsroom: null, note: "the newsroom declined a house profile: composed without a newsroom palette" };
  const errors = validateNewsroom(profile);
  if (errors.length) throw new Error(`NEWSROOM.md is not a complete profile (${errors.join("; ")}) — complete it, or record a decline`);
  return { newsroom: { ground: profile.ground, accent: profile.brandColor }, note: `composed for ${profile.name}: ground ${profile.ground}, accent ${profile.brandColor} (NEWSROOM.md)` };
}

export const filedDirections = () =>
  readdirSync(DIRECTIONS)
    .filter((f) => f.endsWith(".md"))
    .sort()
    .map((f) => readDirection(join(DIRECTIONS, f)));

const labelOf = (id) => id.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

/**
 * The direction(s) this beat renders in, each `{ label, direction }`.
 *   default           ONE — the composer's best candidate for the newsroom and this beat's own text
 *   { candidates: N } the composer's top N, for the journalist to choose between
 *   { filed: true }   every filed demo direction — a catalogue or demo proof, never a production render
 */
export function directionsFor(beat, { candidates = 1, filed = false, root = ROOT } = {}) {
  const all = filedDirections();
  if (filed) return { directions: all.map((d) => ({ label: labelOf(d.id), direction: d })), composition: null, note: "every filed demo direction (--filed): a catalogue proof, not a production render" };
  if (!(Number.isInteger(candidates) && candidates >= 1)) throw new Error(`candidates is a count of at least 1, got ${JSON.stringify(candidates)}`);
  const { newsroom, note } = newsroomOf(root);
  const composition = composeDirections({ newsroom, filed: all, beat: BEAT_FACTS, textPerRegister: textPerRegisterOf(beat.copy), limit: Math.max(3, candidates) });
  if (!composition.offered.length) throw new Error(`no composed direction holds up for this beat:\n${reportComposition(composition, { beat: BEAT_FACTS })}`);
  const directions = composition.offered.slice(0, candidates).map((d) => ({ label: labelOf(d.id), direction: d }));
  return { directions, composition, note };
}

/** The runner's direction flags: `--candidates <N>` and `--filed` are opt-in, and exclusive; `--only <label>`. */
export function parseDirectionArgs(args) {
  const valueOf = (name) => {
    const i = args.indexOf(name);
    if (i === -1) return null;
    if (!args[i + 1] || args[i + 1].startsWith("--")) throw new Error(`${name} takes a value`);
    return args[i + 1];
  };
  const raw = valueOf("--candidates");
  if (raw !== null && !/^[1-9]\d*$/.test(raw)) throw new Error(`--candidates takes a count of at least 1, got ${JSON.stringify(raw)}`);
  const filed = args.includes("--filed");
  if (filed && raw !== null) throw new Error("--filed and --candidates are exclusive: --filed renders the demo directions, --candidates the composed ones");
  return { candidates: raw === null ? 1 : Number(raw), filed, only: valueOf("--only"), still: args.includes("--still"), look: valueOf("--look") };
}

// ── the build ─────────────────────────────────────────────────────────────────────────────────────────────────

/** @param {{ label: string, direction: object }} entry  one of `directionsFor(beat).directions` */
export function buildDirection({ label, direction: chosen }, { subject, states, copy }) {
  const direction = resolveDirectionFamilies(chosen, textPerRegisterOf(copy));
  const resolved = Object.fromEntries(REGISTER_NAMES.map((name) => [name, registerOf(direction, name)]));
  const registers = videoRegistersOf(resolved, SIZE);
  const k = registers.axis.fontSize / resolved.axis.fontSize;
  const row = sizeFor(SIZE);
  const stage = { width: row.width, height: row.height };
  const inset = frameInsetFor(SIZE);
  const vInset = verticalInsetFor(SIZE);
  for (const [name, r] of Object.entries(registers)) if (!(r.fontSize >= row.minTypePx)) throw new Error(`${label}: register ${name} is ${r.fontSize}px, under the ${row.minTypePx}px floor`);
  /** A word as drawn: cased by its register, measured on the face the composition embeds. */
  const measure = (text, r) => {
    const cased = applyCase(text, r.transform);
    return { text: cased, width: widthOf(cased, r) };
  };
  const axisBand = bandOf(BAND_PROBE, registers.axis);

  // ── the shots every directed video shares: the title card from frame 0, the credit on one line at the bottom ──
  const titleCard = titleCardFor({ registers, eyebrow: copy.eyebrow, title: copy.title, size: SIZE, eyebrowToDisplay: EYEBROW_TO_DISPLAY });
  const { register: sourceRegister, ...credit } = sourceCreditFor({ registers, forms: copy.source, size: SIZE, k, ...CREDIT_ONE_LINE });
  const creditAt = { x: inset, y: stage.height - vInset - credit.height };

  // ── colours: every text held to the text floor, every mark to the non-text floor, on the direction's ground ──
  const { ground, accent } = direction;
  const { ink, muted, grid } = deriveFurniture(ground);
  const floored = (colour, floor, what) => {
    const walked = adjustToContrast(colour, ground, floor);
    if (!walked) throw new Error(`${label}: ${what} has no variant that reads at ${floor}:1 on ${ground}`);
    return walked;
  };
  const mark = (colour, what) => floored(colour, NON_TEXT_CONTRAST_MIN, what);
  const text = (colour, what) => floored(colour, TEXT_CONTRAST_MIN, what);
  const colours = {
    ground,
    grid,
    accent: mark(accent, "the accent"),
    text: {
      eyebrow: text(registers.eyebrow.fill ?? accent, "the eyebrow"),
      title: text(registers.display.fill ?? ink, "the title"),
      source: text(muted, "the credit"),
    },
    tint: mark(mix(ground, accent, 0.4), "the tinted surface"),
    ink: mark(ink, "the slice's outline"),
  };
  colours.text.axis = text(muted, "the ticks");
  colours.text.value = text(accent, "the counter");
  colours.text.ink = text(ink, "the names");

  // ════ THE LAYOUT ══════════════════════════════════════════════════════════════════════════════════════════════
  const { axis, value, annot } = registers;
  const gap = LABEL_GAP * axis.lead;
  const valueBand = bandOf(BAND_PROBE, value);
  const annotBand = bandOf(BAND_PROBE, annot);
  const { readings, crossing, first, times } = subject;

  // The plot, zero-based, with a column reserved right of 2023 for the stack and its count from frame 0.
  const tickTexts = VALUE_TICKS.map((v, i) => measure(copy.tick(v, i === VALUE_TICKS.length - 1), axis));
  const tickWidth = Math.max(...tickTexts.map((t) => t.width)) * (1 + DRAWN_WIDER);
  const yearTexts = YEARS.map((yr) => measure(String(yr), axis));
  const countTexts = Array.from({ length: times + 1 }, (_, n) => measure(copy.times(n), value));
  const blockWidth = Math.max(1.5 * value.lead, Math.max(...countTexts.map((t) => t.width)) * (1 + DRAWN_WIDER));
  const plot = {
    left: inset + tickWidth + gap,
    right: stage.width - inset - blockWidth - 2 * gap,
    top: vInset + gap,
    bottom: creditAt.y - gap - axisBand.ascent - axisBand.descent - 1.6 * gap,
  };
  if (!(plot.left + yearTexts[0].width / 2 >= inset)) throw new Error(`${label}: the first year would leave the frame`);
  const firstYear = readings[0].year;
  const lastYear = readings.at(-1).year;
  const x = (year) => plot.left + ((year - firstYear) / (lastYear - firstYear)) * (plot.right - plot.left);
  const y = (pop) => plot.bottom - (pop / (TOP_BILLION * 1e9)) * (plot.bottom - plot.top);
  const r1 = (v) => Math.round(v * 10) / 10;
  const points = readings.map((r) => ({ year: r.year, x: r1(x(r.year)), y: r1(y(r.pop)), pop: r.pop }));
  const highestOver = (x0, x1) => Math.max(...readings.filter((r) => x(r.year) >= x0 - 3 && x(r.year) <= x1 + 3).map((r) => r.pop), 0);
  const ticksY = VALUE_TICKS.map((v, i) => ({ ...tickTexts[i], x: plot.left - gap - tickTexts[i].width, y: axisBand.ascent / 2 - axisBand.descent / 2 + y(v * 1e9), rule: y(v * 1e9) }));
  const ticksX = YEARS.map((yr, i) => ({ ...yearTexts[i], x: x(yr) - yearTexts[i].width / 2, y: plot.bottom + 1.6 * gap + axisBand.ascent, tickX: x(yr) }));
  if (!(ticksX.at(-1).x + ticksX.at(-1).width <= stage.width - inset)) throw new Error(`${label}: the last year would leave the frame`);

  // The running population, upper left, under the top gridline, above the curve under its whole width.
  const counterTexts = Object.fromEntries(readings.map((r) => [String(r.year), measure(copy.counter(r.pop), value)]));
  const counterWidth = Math.max(...Object.values(counterTexts).map((t) => t.width)) * (1 + DRAWN_WIDER);
  const counterAt = { x: plot.left + gap, y: y(8e9) + gap + valueBand.ascent };
  if (!(y(highestOver(counterAt.x, counterAt.x + counterWidth)) > counterAt.y + valueBand.descent + gap)) throw new Error(`${label}: the counter would sit on the curve`);

  // The 1800 slice and the eight seats beside 2023, on the plot's own scale.
  const sliceHeight = plot.bottom - y(first.pop);
  const origin = { x: plot.left, y: plot.bottom - sliceHeight };
  const column = plot.right + gap;
  const seats = Array.from({ length: times }, (_, i) => ({ x: column, y: plot.bottom - (i + 1) * sliceHeight }));
  if (!(seats.at(-1).y > points.at(-1).y)) throw new Error(`${label}: the stack would rise above the curve's end`);
  const countAt = { x: column + blockWidth / 2, y: seats.at(-1).y - gap - valueBand.descent };
  if (!(countAt.y - valueBand.ascent >= vInset)) throw new Error(`${label}: the count would leave the frame`);

  // The crossing: a dot on the curve, its name right-aligned to the dot, above the curve under its width.
  const dot = { x: x(crossing.year), y: y(crossing.pop), r: 0.28 * annot.lead };
  const crossingText = measure(copy.crossing, annot);
  const crossingLabel = { ...crossingText, x: dot.x - crossingText.width * (1 + DRAWN_WIDER), y: dot.y - dot.r - gap - annotBand.descent };
  if (!(y(highestOver(crossingLabel.x, dot.x)) > crossingLabel.y + annotBand.descent)) throw new Error(`${label}: the crossing's name would sit on the curve`);
  if (!(crossingLabel.y - annotBand.ascent >= vInset)) throw new Error(`${label}: the crossing's name would leave the frame`);

  const layout = {
    plot,
    points,
    baseY: plot.bottom,
    ticksY,
    ticksX,
    counter: { at: counterAt, texts: counterTexts },
    stack: { origin, seats, width: blockWidth, height: sliceHeight, count: { at: countAt, texts: countTexts } },
    crossing: { year: crossing.year, dot, label: crossingLabel },
  };
  // ════ END OF THE LAYOUT ═══════════════════════════════════════════════════════════════════════════════════════

  const props = {
    frame: stage,
    registers: { display: titleCard.register, eyebrow: registers.eyebrow, value: registers.value, axis: registers.axis, annot: registers.annot, source: sourceRegister },
    titleCard,
    credit: { ...credit, at: creditAt },
    colours,
    strokes: { grid: (direction.stroke?.hairline ?? 0.6) * k, rule: (direction.stroke?.rule ?? 1) * k },
    halo: haloOf(registers.value, k),
    ...layout,
    states,
    timing: WORLD_POPULATION_VIDEO_TIMING,
  };
  return { label, direction, props, report: { k, titleForm: titleCard.form, sourceForm: credit.form } };
}
