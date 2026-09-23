// EVERYTHING ONE DIRECTION'S RENDER IS HANDED, BUILT IN BUN — the words, the value axis and its ticks, the eight decades'
// slots, boxes and names, the 75 readings, the two printed medians, the colours and the states.
//
// Runs in Bun only.

import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { scaleBand, scaleLinear } from "d3-scale";
import { adjustToContrast, NON_TEXT_CONTRAST_MIN, TEXT_CONTRAST_MIN } from "#shared/chart-beat/colour.mjs";
import { deriveFurniture } from "#shared/chart-beat/render-still.mjs";
import { frameInsetFor, sizeFor, videoExportSize } from "#shared/chart-video/sizes.mjs";
import { readDirection } from "#shared/design-base/read-direction.mjs";
import { EYEBROW_TO_DISPLAY, registerOf } from "#shared/design-base/register.mjs";
import { resolveDirectionFamilies } from "#shared/design-base/resolve-families.mjs";
import { applyCase } from "../../skills/chart-video/scripts/registers.mjs";
import { BAND_PROBE, bandOf, CREDIT_ONE_LINE, DRAWN_WIDER, haloOf, registerAt, sourceCreditFor, titleCardFor, verticalInsetFor, widthOf } from "../../skills/chart-video/scripts/shots.mjs";
import { videoRegistersOf } from "../../skills/chart-video/scripts/video-registers.mjs";
import { statesFor } from "./states.mjs";
import { loadSubject } from "./subject.mjs";
import { BOXPLOT_VIDEO_TIMING } from "./timing-contract.ts";

const HERE = dirname(fileURLToPath(import.meta.url));
export const ROOT = join(HERE, "..", "..");
export const DIRECTIONS = join(ROOT, "docs", "design-base", "directions");
/** The size this run exports at — `--size`, landscape when nothing asks. R2 names three and
 *  everything under it already answered per size; only this line pinned the beat to one. */
export const SIZE = videoExportSize();
export const REGISTER_NAMES = ["display", "eyebrow", "body", "annot", "value", "axis"];
const NB = "\u00A0";
const LABEL_GAP = 0.4;
/** The static beat's slot proportions (`DirectedBoxplot.tsx`): the readings at 22 % of a slot, the box at 72 %, 42 % wide. */
const PADDING_INNER = 0.34;
const PADDING_OUTER = 0.2;
const SAMPLE_AT = 0.22;
const BOX_AT = 0.72;
const BOX_WIDTH = 0.42;
/** A reading's radius, of a slot: its diameter stays under a year's tenth of the slot. */
const DOT = 0.045;
const RING = 1.9;
const DIGITS = "0123456789,t";

export function loadBeat() {
  const subject = loadSubject();
  return { subject, states: statesFor(), copy: copyOf(subject) };
}

const oneDecimal = (v) => v.toLocaleString("fr-FR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });

export function copyOf(subject) {
  const peakYear = subject.decades[subject.peak].start;
  return {
    eyebrow: `Climat${NB}· France`,
    title: [`Les émissions de CO2 par personne en France ont culminé dans les années${NB}${peakYear}`, `Le CO2 par personne en France a culminé dans les années${NB}${peakYear}`],
    decade: (d, i, all) => (i < all.length - 1 ? `${d.start}s` : `${d.start}–${String(subject.lastYear).slice(2)}`),
    /**
     * THE DECADE'S NAME IS A MEASURE, NOT A SPELLING.
     *
     * Eight names stand under eight slots, so the longest of them has to hold the STEP between two slots — and the step
     * is the frame's, not the beat's. Measured 2026-09-23: 198px of step at landscape against a 104px name, 102px of
     * step at portrait and at square against a 125px one, so the beat refused « 1950s runs into 1960s » on a frame its
     * names had never been measured against. Each rung drops a digit the ROW already carries — the run reads 50, 60,
     * 70 … in order under one continuous value axis, and the partial last decade keeps its two years however short the
     * rest goes, because that is the one name that is not a decade.
     */
    decadeForms: [
      (d, i, all) => (i < all.length - 1 ? `${d.start}s` : `${d.start}–${String(subject.lastYear).slice(2)}`),
      (d, i, all) => (i < all.length - 1 ? `${String(d.start % 100).padStart(2, "0")}s` : `${String(d.start % 100).padStart(2, "0")}–${String(subject.lastYear).slice(2)}`),
      (d, i, all) => (i < all.length - 1 ? String(d.start % 100).padStart(2, "0") : `${String(d.start % 100).padStart(2, "0")}–${String(subject.lastYear).slice(2)}`),
    ],
    tick: (v, top) => (top ? `${v}${NB}t` : `${v}`),
    value: oneDecimal,
    source: [`Source${NB}: Global Carbon Budget 2025, via Our World in Data · France, 1950-${subject.lastYear}`, `Source${NB}: Global Carbon Budget 2025, via Our World in Data`],
  };
}

export function textPerRegisterOf(copy, subject) {
  return {
    display: copy.title.join(" "),
    eyebrow: copy.eyebrow,
    body: copy.source.join(" "),
    annot: "",
    value: `${copy.value(subject.decades[subject.peak].median)} ${copy.value(subject.decades.at(-1).median)} 0123456789`,
    axis: `${subject.decades.map((d, i, all) => copy.decade(d, i, all)).join(" ")} 4 5 6 7 8 9 10${NB}t ${copy.source.join(" ")}`,
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
  const drawn = (w) => w * (1 + DRAWN_WIDER);
  const gap = LABEL_GAP * axis.lead;
  const nameBand = bandOf(BAND_PROBE, axis);
  const digits = bandOf(DIGITS, axis);
  // The two printed medians stand between the boxes, so they are set at the names' size in the value register's face.
  const figure = registerAt(value, axis.fontSize);
  const figureDigits = bandOf(DIGITS, figure);

  const titleCard = titleCardFor({ registers, eyebrow: copy.eyebrow, title: copy.title, size: SIZE, eyebrowToDisplay: EYEBROW_TO_DISPLAY });
  const { register: sourceRegister, ...credit } = sourceCreditFor({ registers, forms: copy.source, size: SIZE, k, ...CREDIT_ONE_LINE });
  const creditAt = { x: inset, y: stage.height - vInset - credit.height };

  // THE ROWS: the plot from the top inset, the decade names under it, the credit under those.
  const namesBaseline = creditAt.y - gap - nameBand.descent;
  const top = vInset + digits.ascent / 2;
  const bottom = namesBaseline - nameBand.ascent - gap;

  // THE VALUE AXIS: a position encoding, fitted to every reading and niced — never anchored at zero (the static beat's rule).
  const values = subject.readings.map((r) => r.value);
  const y = scaleLinear().domain([Math.min(...values), Math.max(...values)]).nice().range([bottom, top]);
  const tickValues = y.ticks(5);
  const tickTexts = tickValues.map((v, i) => measure(copy.tick(v, i === tickValues.length - 1), axis));
  const left = inset + drawn(Math.max(...tickTexts.map((t) => t.width))) + gap;
  const ticks = tickValues.map((v, i) => ({ value: v, ...tickTexts[i], gridY: y(v), x: left - gap - tickTexts[i].width, y: y(v) + digits.ascent / 2 }));

  // THE SLOTS: the right end pulled in until the last decade's printed median holds the frame beside its box.
  const valueGap = gap * 0.8;
  const lastValue = measure(copy.value(subject.decades.at(-1).median), figure);
  const slotsFor = (right) => {
    const band = scaleBand().domain(subject.decades.map((d) => d.label)).range([left, right]).paddingInner(PADDING_INNER).paddingOuter(PADDING_OUTER);
    return { band, slot: band.bandwidth() };
  };
  let right = stage.width - inset;
  for (let i = 0; i < 8; i++) {
    const { band, slot } = slotsFor(right);
    const lastRight = band(subject.decades.at(-1).label) + slot * (BOX_AT + BOX_WIDTH / 2) + valueGap + drawn(lastValue.width);
    const over = lastRight - (stage.width - inset);
    if (over <= 0.01) break;
    right -= over;
  }
  const { band, slot } = slotsFor(right);
  const boxWidth = slot * BOX_WIDTH;
  const dotR = slot * DOT;

  /** One rung of the decade-name ladder: every name clear of the next and the run inside the frame, or the pair that is not. */
  const seatNames = (form) => {
    const texts = subject.decades.map((d, i, all) => measure(form(d, i, all), axis));
    const seated = subject.decades.map((d, i) => {
      const slotLeft = band(d.label);
      return { ...texts[i], x: slotLeft + (slot * (SAMPLE_AT + BOX_AT)) / 2 - texts[i].width / 2, y: namesBaseline };
    });
    for (let i = 0; i + 1 < seated.length; i++)
      if (!(seated[i].x + drawn(seated[i].width) + gap / 2 <= seated[i + 1].x)) return { why: `${seated[i].text} runs into ${seated[i + 1].text}` };
    if (!(seated[0].x >= inset && seated.at(-1).x + drawn(seated.at(-1).width) <= stage.width - inset)) return { why: "a decade's name leaves the frame" };
    return { seated };
  };
  let namesSeat = null;
  const namesRefused = [];
  for (let form = 0; form < copy.decadeForms.length && !namesSeat; form++) {
    const got = seatNames(copy.decadeForms[form]);
    if (got.why) namesRefused.push(`form ${form + 1}: ${got.why}`);
    else namesSeat = { ...got, form };
  }
  if (!namesSeat) throw new Error(`no form of the decades' names stands apart on a ${slot.toFixed(1)}px slot at ${SIZE} — ${namesRefused.join("; ")}`);
  const names = namesSeat.seated;
  const decades = subject.decades.map((d, i) => {
    const slotLeft = band(d.label);
    const sampleX = slotLeft + slot * SAMPLE_AT;
    const cx = slotLeft + slot * BOX_AT;
    return {
      label: d.label,
      start: d.start,
      n: d.n,
      slotLeft,
      slot,
      sampleX,
      cx,
      boxWidth,
      yMedian: y(d.median),
      yQ1: y(d.q1),
      yQ3: y(d.q3),
      yLo: y(d.whiskerLo),
      yHi: y(d.whiskerHi),
      outliers: d.outliers.map((v) => ({ value: v, year: d.readings.find((r) => r.value === v).year, y: y(v) })),
      name: names[i],
    };
  });
  if (!(2 * dotR < slot / 10)) throw new Error("a reading is wider than its year");

  const readings = subject.readings.map((r, index) => {
    const decade = subject.decades.findIndex((d) => d.start === Math.floor(r.year / 10) * 10);
    const d = decades[decade];
    return { year: r.year, value: r.value, decade, index, x0: d.slotLeft + (slot * (r.year - d.start + 0.5)) / 10, y: y(r.value) };
  });

  /**
   * THE TWO PRINTED MEDIANS: the peak's and the last decade's, each on the first seat its own decade can pay for.
   *
   * BESIDE THE BOX is the first seat and the right one whenever the step has room for it: the figure stands at its own
   * median's height, so the line and the number are read as one. What that seat costs is the room between one box's
   * right edge and the next decade's readings, and that room is the frame's — measured 2026-09-23 it is 105px at
   * landscape and 39px at portrait and at square against a 91px figure, so the beat refused « 10,0 runs into the next
   * decade's readings » on a frame nobody had laid it out for. (The LAST decade's seat is not at risk: the slot loop
   * above already pulls the plot's right edge in until that one figure holds the frame beside its box.)
   *
   * OVER and UNDER THE DECADE are the seats that give up the shared height with the median line and keep the one thing
   * that has to survive — which decade the number belongs to — by standing over or under that decade's own column and
   * nothing else, in the halo the figure already carries. Over comes first because a number above a column reads as its
   * total; it is refused when the decade's top reading is already at the plot's top, which is exactly the peak's case,
   * the value axis being niced to the peak itself. Each of the two figures takes its own first holding seat: they carry
   * different roles already (the peak in the accent, the last one muted), and a seat neither decade can pay for is a
   * refusal for both.
   */
  const VALUE_SEATS = ["beside the box", "over the decade", "under the decade"];
  const seatValue = (i, seat) => {
    const d = decades[i];
    const m = measure(copy.value(subject.decades[i].median), figure);
    const ys = subject.decades[i].readings.map((r) => y(r.value));
    const v =
      seat === 0
        ? { decade: i, ...m, x: d.cx + boxWidth / 2 + valueGap, y: d.yMedian + figureDigits.ascent / 2 }
        : seat === 1
          ? { decade: i, ...m, x: d.cx - drawn(m.width) / 2, y: Math.min(...ys) - dotR - valueGap - figureDigits.descent }
          : { decade: i, ...m, x: d.cx - drawn(m.width) / 2, y: Math.max(...ys) + dotR + valueGap + figureDigits.ascent };
    const next = decades[i + 1];
    const prev = decades[i - 1];
    const rightWall = next ? next.sampleX - dotR - (seat === 0 ? valueGap : gap / 2) : stage.width - inset + 0.01;
    if (!(v.x + drawn(v.width) <= rightWall)) return { why: next ? `${v.text} runs into the next decade's readings` : `${v.text} runs out of the frame` };
    if (seat === 0) return { value: v };
    if (!(v.x >= (prev ? prev.cx + boxWidth / 2 + gap / 2 : inset))) return { why: `${v.text}, set ${VALUE_SEATS[seat]}, reaches the one before it` };
    if (seat === 1 && !(v.y - figureDigits.ascent >= top)) return { why: `${v.text}, set ${VALUE_SEATS[seat]}, leaves the plot's top` };
    if (seat === 2 && !(v.y + figureDigits.descent <= bottom)) return { why: `${v.text}, set ${VALUE_SEATS[seat]}, leaves the plot's foot` };
    return { value: v };
  };
  const printed = [subject.peak, subject.decades.length - 1].map((i) => {
    const refused = [];
    for (let seat = 0; seat < VALUE_SEATS.length; seat++) {
      const got = seatValue(i, seat);
      if (got.why) refused.push(`${VALUE_SEATS[seat]}: ${got.why}`);
      else return { ...got.value, seat: VALUE_SEATS[seat] };
    }
    throw new Error(`no seat holds ${subject.decades[i].label}'s printed median at ${SIZE} — ${refused.join("; ")}`);
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
    grid,
    neutral: walked(muted, NON_TEXT_CONTRAST_MIN, "a box"),
    accent: walked(accent, NON_TEXT_CONTRAST_MIN, "the peak's box"),
    median: walked(ink, NON_TEXT_CONTRAST_MIN, "a median"),
    ring: walked(ink, NON_TEXT_CONTRAST_MIN, "the outlier's ring"),
    text: {
      eyebrow: walked(registers.eyebrow.fill ?? accent, TEXT_CONTRAST_MIN, "the eyebrow"),
      title: walked(registers.display.fill ?? ink, TEXT_CONTRAST_MIN, "the title"),
      axis: walked(muted, TEXT_CONTRAST_MIN, "a tick"),
      name: walked(ink, TEXT_CONTRAST_MIN, "a decade's name"),
      peak: walked(accent, TEXT_CONTRAST_MIN, "the peak's median"),
      value: walked(muted, TEXT_CONTRAST_MIN, "the last median"),
    },
  };

  const rule = (direction.stroke?.rule ?? 1) * k;
  const props = {
    frame: stage,
    registers: { display: titleCard.register, eyebrow: registers.eyebrow, value, figure, axis, source: sourceRegister },
    titleCard,
    credit: { ...credit, at: creditAt },
    colours,
    inset,
    plot: { left, right, top, bottom },
    ticks,
    peak: subject.peak,
    decades,
    readings,
    dotR,
    ringR: dotR * RING,
    values: printed,
    fillOpacity: { neutral: 0.5, accent: 0.22 },
    strokes: { grid: (direction.stroke?.hairline ?? 0.6) * k, rule, median: rule * 2, walker: rule * 3 },
    halo: { figure: haloOf(figure, k) },
    states,
    timing: BOXPLOT_VIDEO_TIMING,
  };
  return { id, direction, props, report: { k, titleForm: titleCard.form, sourceForm: credit.form, nameForm: namesSeat.form, valueSeats: printed.map((v) => v.seat), slot: slot.toFixed(1), right: right.toFixed(1) } };
}
