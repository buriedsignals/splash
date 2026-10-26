// EVERYTHING ONE DIRECTION'S RENDER IS HANDED, BUILT IN BUN — the words, the plot, the surface's points, the ticks, the
// midpoint rule and every year it passes, each half's mean height, the halves' names seated in their blocks and on their
// curves, the stock and its gauge, every text measured, the colours and the states.
//
// Runs in Bun only.
//
// ZONE KIT COPY of proof/video-area-swiss-co2/build.mjs. What changed: the subject and the words come from the beat
// (`./subject.mjs` computes the subject from beat.mjs, render-beat.mjs builds `copy`), the direction is the one the run
// selects (handed in, not read from a filed id), the year ladder and the value ticks are derived from the series
// (`yearFormsOf`, `valueTicksOf`) instead of typed for 1858–2024 and 0–45 Mt, the earlier half's name is seated over the
// same share of its span as the proof's 1950 (`EARLIER_NAME_FROM`), and the chart-video skill's scripts are found through
// `skillScriptFrom` — a beat sits at stories/<slug>/beats/<id>/, and an installed root has no skills/ beside it.

import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { adjustToContrast, contrast, mix, NON_TEXT_CONTRAST_MIN, TEXT_CONTRAST_MIN } from "#shared/chart-beat/colour.mjs";
import { deriveFurniture } from "#shared/chart-beat/render-still.mjs";
import { frameInsetFor, sizeFor, videoExportSize } from "#shared/chart-video/sizes.mjs";
import { EYEBROW_TO_DISPLAY, registerOf } from "#shared/design-base/register.mjs";
import { resolveDirectionFamilies } from "#shared/design-base/resolve-families.mjs";
import { skillScriptFrom } from "#shared/design-base/skill-script.mjs";
import { splashRoot } from "#shared/design-base/splash-root.mjs";
import { statesFor } from "./states.mjs";
import { AREA_VIDEO_TIMING } from "./timing-contract.ts";

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
 * THE YEARS NAMED UNDER THE AXIS ARE A LADDER, NOT A LIST.
 *
 * Eight years are eight labels of the same width whatever the frame, and the frame they clear is the one they were
 * chosen on (measured 2026-09-23 on the proof: « 18581875 » printed as one word at portrait). Each rung keeps the first
 * year, the last year and the round ones between them, so the scale a reader reads off is the same scale;
 * `buildDirection` steps down until no pair collides and refuses naming the pair when even two years will not stand apart.
 *
 * Zone kit: the proof typed its rungs for 1858–2024 (its first rung is the 25-year one, its second the 50-year one);
 * here every rung is a round step of the series' own span, at most nine years, densest first, then the two ends.
 */
export function yearFormsOf(first, last) {
  const forms = [];
  for (const step of [5, 10, 25, 50, 100, 200]) {
    const inner = [];
    for (let yy = Math.ceil(first / step) * step; yy < last; yy += step) if (yy - first > 0.4 * step && last - yy > 0.4 * step) inner.push(yy);
    const form = [first, ...inner, last];
    if (form.length <= 9 && !forms.some((f) => f.join() === form.join())) forms.push(form);
  }
  if (!forms.some((f) => f.length === 2)) forms.push([first, last]);
  return forms;
}

/** The value ticks: zero, about half the highest reading and the highest half-power-of-ten step under it — the proof's
 *  0, 25, 45 over a 46,2 Mt peak. */
export function valueTicksOf(max) {
  const step = 10 ** Math.floor(Math.log10(max)) / 2;
  const clean = (v) => +v.toFixed(10);
  const top = clean(Math.floor(max / step) * step);
  const mid = clean(Math.round(max / 2 / step) * step);
  return mid > 0 && mid < top ? [0, mid, top] : [0, top];
}

/** Where the earlier half's name starts on the curve, as a share of that half's span — the proof's 1950 in 1858–1986. */
const EARLIER_NAME_FROM = 0.72;

/**
 * The beat one render is handed. `subject` is `subjectOf(beat)` (`./subject.mjs`); `copy` is the beat's words as
 * render-beat.mjs shapes them (the proof's `copyOf`): `{ eyebrow, title: forms, stock, stockForms, before, after,
 * halfForms, tick(v, top), unitWord, source: forms }`.
 */
export function loadBeat(subject, copy) {
  return { subject, states: statesFor(), copy };
}

export function textPerRegisterOf(copy, subject) {
  return {
    display: copy.title.join(" "),
    eyebrow: copy.eyebrow,
    body: copy.source.join(" "),
    annot: [...copy.before, ...copy.after].join(" "),
    value: `${copy.stock(subject.total)} 0123456789`,
    axis: `${yearFormsOf(subject.readings[0].year, subject.readings.at(-1).year)[0].join(" ")} 0123456789 ${copy.unitWord} ${copy.source.join(" ")}`,
  };
}

const r1 = (v) => Math.round(v * 10) / 10;

export function buildDirection(id, chosen, { subject, states, copy }) {
  const direction = resolveDirectionFamilies(chosen, textPerRegisterOf(copy, subject));
  const YEAR_FORMS = yearFormsOf(subject.readings[0].year, subject.readings.at(-1).year);
  const YEARS = YEAR_FORMS[0];
  const VALUE_TICKS = valueTicksOf(Math.max(...subject.readings.map((r) => r.mt)));
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
  // Every rung of the ladder ends on the same last year, so the plot's right edge is the same whichever one is drawn.
  const lastYearText = measure(String(YEARS.at(-1)), axis);
  const plot = {
    left: inset + tickWidth + gap,
    right: stage.width - inset - lastYearText.width / 2,
    top: vInset + axisBand.ascent + axisBand.descent + gap,
    bottom: stage.height - vInset - credit.height - gap - axisBand.ascent - axisBand.descent - 1.6 * gap,
  };
  const first = readings[0].year;
  const last = readings.at(-1).year;
  const maxMt = Math.max(...readings.map((r) => r.mt));
  // Zone kit: the proof's ceiling (47 over 46,2); under 10 a whole-number ceiling would leave the curve a fraction of the plot.
  const top = maxMt >= 10 ? Math.ceil(maxMt) : maxMt * 1.02;
  const x = (year) => plot.left + ((year - first) / (last - first)) * (plot.right - plot.left);
  const y = (mt) => plot.bottom - (mt / top) * (plot.bottom - plot.top);
  const points = readings.map((r) => ({ year: r.year, x: r1(x(r.year)), y: r1(y(r.mt)), mt: r.mt }));
  const ticksY = VALUE_TICKS.map((v, i) => ({ ...tickTexts[i], x: plot.left - gap - tickTexts[i].width, y: y(v), baseline: y(v) + (axisBand.ascent - axisBand.descent) / 2 }));
  const yearBaseline = plot.bottom + 1.6 * gap + axisBand.ascent;
  /** One rung of the year ladder: every pair of neighbours clearing each other by a gap, or the pair that does not. */
  const seatYears = (years) => {
    const texts = years.map((yy) => measure(String(yy), axis));
    for (let i = 0; i + 1 < years.length; i++) {
      const clear = ((texts[i].width + texts[i + 1].width) / 2) * (1 + DRAWN_WIDER) + gap;
      if (!(x(years[i + 1]) - x(years[i]) >= clear)) return { why: `${years[i]} runs into ${years[i + 1]}` };
    }
    return { ticks: years.map((yy, i) => ({ ...texts[i], x: x(yy) - texts[i].width / 2, y: yearBaseline, tickX: x(yy) })) };
  };
  let yearSeat = null;
  const yearsRefused = [];
  for (let form = 0; form < YEAR_FORMS.length && !yearSeat; form++) {
    const got = seatYears(YEAR_FORMS[form]);
    if (got.why) yearsRefused.push(`form ${form + 1}: ${got.why}`);
    else yearSeat = { ...got, form };
  }
  if (!yearSeat) throw new Error(`no rung of the year ladder stands apart on a ${r1(plot.right - plot.left)}px plot at ${SIZE} — ${yearsRefused.join("; ")}`);
  const ticksX = yearSeat.ticks;
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
   *  the surface under its widest line. Answers `{ why }` rather than throwing, so the form ladder below can step to a
   *  narrower form; the same two measurements, unchanged — only the caller that hears them is new. */
  const seatInside = (texts, x0, x1, what) => {
    const lines = texts.map((t) => measure(t, annot));
    const w = Math.max(...lines.map((l) => l.width)) * (1 + DRAWN_WIDER);
    if (!(w + 2 * gap <= x1 - x0)) return { why: `« ${texts.join(" ")} » is wider than ${what}'s span` };
    const cx = (x0 + x1) / 2;
    const lastBaseline = plot.bottom - gap - annotBand.descent;
    const topNeeded = lastBaseline - (lines.length - 1) * annot.lead - annotBand.ascent - gap;
    if (!(y(curveMinOver(cx - w / 2, cx + w / 2)) <= topNeeded)) return { why: `« ${texts.join(" ")} » does not fit inside ${what}'s surface` };
    return { lines: lines.map((l, i) => ({ ...l, x: cx - l.width / 2, y: lastBaseline - (lines.length - 1 - i) * annot.lead })) };
  };
  /** A half's name in its flattened block: centred in the block both ways, `{ why }` when the block cannot hold it. */
  const seatInBlock = (texts, x0, x1, meanY, what) => {
    const lines = texts.map((t) => measure(t, annot));
    const w = Math.max(...lines.map((l) => l.width)) * (1 + DRAWN_WIDER);
    const h = (lines.length - 1) * annot.lead + annotBand.ascent + annotBand.descent;
    if (!(w + 2 * gap <= x1 - x0 && h + 2 * gap <= plot.bottom - meanY)) return { why: `« ${texts.join(" ")} » does not fit inside ${what}'s block` };
    const cx = (x0 + x1) / 2;
    const firstBaseline = (meanY + plot.bottom) / 2 - h / 2 + annotBand.ascent;
    return { lines: lines.map((l, i) => ({ ...l, x: cx - l.width / 2, y: firstBaseline + i * annot.lead })) };
  };
  // On the curve, the earlier name sits in its last decades, where its surface is tall; the later one across its span.
  // Both halves take the SAME form: two names of the same picture read as a pair, and a ladder that answered them
  // separately would put the range on one block and the count on the other.
  const seatBoth = (form) => {
    const seats = [
      seatInBlock(form.before, plot.left, ruleX, means[0], "the earlier half"),
      seatInside(form.before, x(first + Math.round(EARLIER_NAME_FROM * (midpoint - first))), ruleX, "the earlier half"),
      seatInBlock(form.after, ruleX, plot.right, means[1], "the later half"),
      seatInside(form.after, ruleX, plot.right, "the later half"),
    ];
    const refused = seats.find((s) => s.why);
    if (refused) return { why: refused.why };
    return { beforeLabel: { block: seats[0].lines, curve: seats[1].lines }, afterLabel: { block: seats[2].lines, curve: seats[3].lines } };
  };
  let named = null;
  const namesRefused = [];
  for (let form = 0; form < copy.halfForms.length && !named; form++) {
    const got = seatBoth(copy.halfForms[form]);
    if (got.why) namesRefused.push(`form ${form + 1}: ${got.why}`);
    else named = { ...got, form };
  }
  if (!named)
    throw new Error(
      `no form of the halves' names is seated at ${SIZE}, where the later half spans ` +
        `${r1(plot.right - ruleX)}px of a ${r1(plot.right - plot.left)}px plot — ${namesRefused.join("; ")}`,
    );
  const { beforeLabel, afterLabel } = named;

  // ── the stock and its gauge, in the empty upper left: above the curve under their whole width ──────────────
  const highestUnder = (x0, x1) => Math.max(...readings.filter((r) => x(r.year) >= x0 - 3 && x(r.year) <= x1 + 3).map((r) => r.mt));
  // Under the top gridline, so no rule runs through the words.
  const stockAt = { x: plot.left + gap, y: y(VALUE_TICKS.at(-1)) + gap + valueBand.ascent };
  /** The first form of the counter whose gauge clears the curve under its WHOLE width — the same measurement as
   *  before, asked once per form instead of once, and the last rung refuses with the year it collides at. */
  const seatStock = (form) => {
    const texts = Object.fromEntries(readings.map((r, i) => [String(r.year), measure(form(subject.cumulative[i]), value)]));
    const width = Math.max(...Object.values(texts).map((t) => t.width)) * (1 + DRAWN_WIDER);
    const gauge = { x: stockAt.x, y: stockAt.y + valueBand.descent + gap, width, height: 0.4 * value.lead };
    const under = highestUnder(gauge.x, gauge.x + gauge.width);
    if (!(y(under) > gauge.y + 1.6 * gauge.height + gap))
      return { why: `the stock's gauge would sit on the curve (${r1(width)}px of counter reaches ${under}${NB}${copy.unitWord})` };
    return { texts, gauge };
  };
  let stockSeat = null;
  const stockRefused = [];
  for (let form = 0; form < copy.stockForms.length && !stockSeat; form++) {
    const got = seatStock(copy.stockForms[form]);
    if (got.why) stockRefused.push(`form ${form + 1}: ${got.why}`);
    else stockSeat = { ...got, form };
  }
  if (!stockSeat) throw new Error(`no form of the stock's counter clears the curve at ${SIZE} — ${stockRefused.join("; ")}`);
  const stockTexts = stockSeat.texts;
  const gauge = stockSeat.gauge;

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
  return { id, direction, props, report: { k, titleForm: titleCard.form, sourceForm: credit.form, nameForm: named.form, stockForm: stockSeat.form, yearForm: yearSeat.form, midpoint, shareAfter: subject.shareAfter } };
}
