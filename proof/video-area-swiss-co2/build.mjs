// EVERYTHING ONE DIRECTION'S RENDER IS HANDED, BUILT IN BUN — the words, the plot, the surface's points, the ticks, the
// midpoint rule and every year it passes, each half's mean height, the halves' names seated in their blocks and on their
// curves, the stock and its gauge, every text measured, the colours and the states.
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
import { BAND_PROBE, bandOf, CREDIT_ONE_LINE, DRAWN_WIDER, haloOf, sourceCreditFor, titleCardFor, verticalInsetFor, widthOf } from "../../skills/chart-video/scripts/shots.mjs";
import { videoRegistersOf } from "../../skills/chart-video/scripts/video-registers.mjs";
import { statesFor } from "./states.mjs";
import { loadSubject } from "./subject.mjs";
import { AREA_VIDEO_TIMING } from "./timing-contract.ts";

const HERE = dirname(fileURLToPath(import.meta.url));
export const ROOT = join(HERE, "..", "..");
export const DIRECTIONS = join(ROOT, "docs", "design-base", "directions");
export const SIZE = "landscape";
export const REGISTER_NAMES = ["display", "eyebrow", "body", "annot", "value", "axis"];
const NB = "\u00A0";
const LABEL_GAP = 0.4;
const YEARS = [1858, 1875, 1900, 1925, 1950, 1975, 2000, 2024];
const VALUE_TICKS = [0, 25, 45];

export function loadBeat() {
  const subject = loadSubject();
  return { subject, states: statesFor(), copy: copyOf(subject) };
}

const n0 = (v) => Math.round(v).toLocaleString("fr-FR").replace(/[\u202F\u00A0\u2009]/g, NB);

export function copyOf(subject) {
  const first = subject.readings[0].year;
  const last = subject.readings.at(-1).year;
  return {
    eyebrow: "Climat · Suisse",
    title: [`La moitié du CO₂ suisse depuis ${first} a été émise après ${subject.midpoint}`, `Le CO₂ suisse depuis ${first}`],
    stock: (mt) => `${n0(mt)}${NB}Mt depuis ${first}`,
    // Two lines each — the years, then their length — so a half as narrow as 38 years still holds its name.
    before: [`${first}–${subject.midpoint}`, `${subject.before}${NB}ans`],
    after: [`${subject.midpoint + 1}–${last}`, `${subject.after}${NB}ans`],
    tick: (v, top) => `${v}${top ? `${NB}Mt` : ""}`,
    source: [`Source : Global Carbon Budget 2025, via Our World in Data · émissions territoriales`, `Source : Global Carbon Budget 2025, via Our World in Data`].map((f) => f.replace(" · ", `${NB}· `)),
  };
}

export function textPerRegisterOf(copy, subject) {
  return {
    display: copy.title.join(" "),
    eyebrow: copy.eyebrow,
    body: copy.source.join(" "),
    annot: [...copy.before, ...copy.after].join(" "),
    value: `${copy.stock(subject.total)} 0123456789`,
    axis: `${YEARS.join(" ")} 0123456789 Mt ${copy.source.join(" ")}`,
  };
}

const r1 = (v) => Math.round(v * 10) / 10;

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
  const annotBand = bandOf(BAND_PROBE, annot);

  const titleCard = titleCardFor({ registers, eyebrow: copy.eyebrow, title: copy.title, size: SIZE, eyebrowToDisplay: EYEBROW_TO_DISPLAY });
  const { register: sourceRegister, ...credit } = sourceCreditFor({ registers, forms: copy.source, size: SIZE, k, ...CREDIT_ONE_LINE });

  // ── the plot, zero-based: the surface is the stock; the credit takes its own row under the years ─────────────
  const { readings, midpoint } = subject;
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
  const maxMt = Math.max(...readings.map((r) => r.mt));
  const top = Math.ceil(maxMt);
  const x = (year) => plot.left + ((year - first) / (last - first)) * (plot.right - plot.left);
  const y = (mt) => plot.bottom - (mt / top) * (plot.bottom - plot.top);
  const points = readings.map((r) => ({ year: r.year, x: r1(x(r.year)), y: r1(y(r.mt)), mt: r.mt }));
  const ticksY = VALUE_TICKS.map((v, i) => ({ ...tickTexts[i], x: plot.left - gap - tickTexts[i].width, y: y(v), baseline: y(v) + (axisBand.ascent - axisBand.descent) / 2 }));
  const ticksX = YEARS.map((year, i) => ({ ...yearTexts[i], x: x(year) - yearTexts[i].width / 2, y: plot.bottom + 1.6 * gap + axisBand.ascent, tickX: x(year) }));
  const ruleX = x(midpoint + 0.5);
  // Every year the swept rule names, from 2024 back to the midpoint.
  const ruleYears = Object.fromEntries(readings.filter((r) => r.year >= midpoint).map((r) => [String(r.year), measure(String(r.year), axis)]));
  const ruleYearY = plot.top - gap;

  // ── each half's mean height: the outline's surface on its side of the rule, over its width ───────────────────
  const cut = points.findIndex((p) => p.year > midpoint);
  const atRule = (points[cut - 1].y + points[cut].y) / 2;
  const surfaceOf = (top) => top.slice(1).reduce((s, p, i) => s + ((p.x - top[i].x) * (2 * plot.bottom - p.y - top[i].y)) / 2, 0);
  const halves = [
    [...points.slice(0, cut), { x: ruleX, y: atRule }],
    [{ x: ruleX, y: atRule }, ...points.slice(cut)],
  ];
  const means = halves.map((top) => plot.bottom - surfaceOf(top) / (top.at(-1).x - top[0].x));

  // ── colours: the later half in the accent, the earlier stepped back to its tint ─────────────────────────────
  const { ground, accent } = direction;
  const { ink, muted, grid } = deriveFurniture(ground);
  const floored = (c, floor, what) => {
    const w = adjustToContrast(c, ground, floor);
    if (!w) throw new Error(`${what} has no variant that reads at ${floor}:1 on ${ground}`);
    return w;
  };
  const later = floored(accent, NON_TEXT_CONTRAST_MIN, "the later surface");
  const earlier = floored(mix(muted, accent, 0.25), NON_TEXT_CONTRAST_MIN, "the earlier surface");
  const inkOn = (fill, what) => {
    const pole = contrast(ink, fill) >= contrast(ground, fill) ? ink : ground;
    const w = adjustToContrast(pole, fill, TEXT_CONTRAST_MIN);
    if (!w) throw new Error(`${what} has no ink that reads on ${fill}`);
    return w;
  };
  const colours = {
    ground,
    grid,
    later,
    earlier,
    rule: floored(ink, NON_TEXT_CONTRAST_MIN, "the midpoint rule"),
    text: {
      eyebrow: floored(registers.eyebrow.fill ?? accent, TEXT_CONTRAST_MIN, "the eyebrow"),
      title: floored(registers.display.fill ?? ink, TEXT_CONTRAST_MIN, "the title"),
      stock: floored(accent, TEXT_CONTRAST_MIN, "the stock"),
      axis: floored(muted, TEXT_CONTRAST_MIN, "the ticks"),
      rule: floored(ink, TEXT_CONTRAST_MIN, "the midpoint's year"),
      before: inkOn(earlier, "the earlier half's name"),
      after: inkOn(later, "the later half's name"),
    },
  };

  // ── the names inside their halves: the lowest baseline, inside the surface under its whole width ────────────
  const curveMinOver = (x0, x1) => Math.min(...readings.filter((r) => x(r.year) >= x0 - 3 && x(r.year) <= x1 + 3).map((r) => r.mt));
  /** A half's name: its lines centred in the half's span, the lowest baseline a gap above zero, the whole block inside
   *  the surface under its widest line. Refused if the span or the surface cannot hold it. */
  const seatInside = (texts, x0, x1, what) => {
    const lines = texts.map((t) => measure(t, annot));
    const w = Math.max(...lines.map((l) => l.width)) * (1 + DRAWN_WIDER);
    if (!(w + 2 * gap <= x1 - x0)) throw new Error(`« ${texts.join(" ")} » is wider than ${what}'s span`);
    const cx = (x0 + x1) / 2;
    const lastBaseline = plot.bottom - gap - annotBand.descent;
    const topNeeded = lastBaseline - (lines.length - 1) * annot.lead - annotBand.ascent - gap;
    if (!(y(curveMinOver(cx - w / 2, cx + w / 2)) <= topNeeded)) throw new Error(`« ${texts.join(" ")} » does not fit inside ${what}'s surface`);
    return lines.map((l, i) => ({ ...l, x: cx - l.width / 2, y: lastBaseline - (lines.length - 1 - i) * annot.lead }));
  };
  /** A half's name in its flattened block: centred in the block both ways, refused if the block cannot hold it. */
  const seatInBlock = (texts, x0, x1, meanY, what) => {
    const lines = texts.map((t) => measure(t, annot));
    const w = Math.max(...lines.map((l) => l.width)) * (1 + DRAWN_WIDER);
    const h = (lines.length - 1) * annot.lead + annotBand.ascent + annotBand.descent;
    if (!(w + 2 * gap <= x1 - x0 && h + 2 * gap <= plot.bottom - meanY)) throw new Error(`« ${texts.join(" ")} » does not fit inside ${what}'s block`);
    const cx = (x0 + x1) / 2;
    const firstBaseline = (meanY + plot.bottom) / 2 - h / 2 + annotBand.ascent;
    return lines.map((l, i) => ({ ...l, x: cx - l.width / 2, y: firstBaseline + i * annot.lead }));
  };
  // On the curve, the earlier name sits in its last decades, where its surface is tall; the later one across its span.
  const beforeLabel = { block: seatInBlock(copy.before, plot.left, ruleX, means[0], "the earlier half"), curve: seatInside(copy.before, x(1950), ruleX, "the earlier half") };
  const afterLabel = { block: seatInBlock(copy.after, ruleX, plot.right, means[1], "the later half"), curve: seatInside(copy.after, ruleX, plot.right, "the later half") };

  // ── the stock and its gauge, in the empty upper left: above the curve under their whole width ──────────────
  const stockTexts = Object.fromEntries(readings.map((r, i) => [String(r.year), measure(copy.stock(subject.cumulative[i]), value)]));
  const stockWidth = Math.max(...Object.values(stockTexts).map((t) => t.width)) * (1 + DRAWN_WIDER);
  // Under the top gridline, so no rule runs through the words.
  const stockAt = { x: plot.left + gap, y: y(VALUE_TICKS.at(-1)) + gap + valueBand.ascent };
  const gauge = { x: stockAt.x, y: stockAt.y + valueBand.descent + gap, width: stockWidth, height: 0.4 * value.lead };
  const highestUnder = (x0, x1) => Math.max(...readings.filter((r) => x(r.year) >= x0 - 3 && x(r.year) <= x1 + 3).map((r) => r.mt));
  if (!(y(highestUnder(gauge.x, gauge.x + gauge.width)) > gauge.y + 1.6 * gauge.height + gap)) throw new Error("the stock's gauge would sit on the curve");

  // ── the credit: one line, under the years ─────────────────────────────────────────────────────────────────
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
    midpoint,
    total: subject.total,
    means,
    ruleX,
    ruleYears,
    ruleYearY,
    ticksY,
    ticksX,
    stock: { at: stockAt, texts: stockTexts },
    gauge,
    beforeLabel,
    afterLabel,
    halo: haloOf(value, k),
    layoutInset: { x: inset, y: vInset },
    states,
    timing: AREA_VIDEO_TIMING,
  };
  return { id, direction, props, report: { k, titleForm: titleCard.form, sourceForm: credit.form, midpoint, shareAfter: subject.shareAfter } };
}
