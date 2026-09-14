// EVERYTHING ONE DIRECTION'S RENDER IS HANDED, BUILT IN BUN — the words, the plot box, the line's points, the ticks, the
// rule, every tip label measured, the colours and the states.
//
// Runs in Bun only.

import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { adjustToContrast, NON_TEXT_CONTRAST_MIN, TEXT_CONTRAST_MIN } from "#shared/chart-beat/colour.mjs";
import { deriveFurniture } from "#shared/chart-beat/render-still.mjs";
import { frameInsetFor, sizeFor } from "#shared/chart-video/sizes.mjs";
import { readDirection } from "#shared/design-base/read-direction.mjs";
import { EYEBROW_TO_DISPLAY, registerOf } from "#shared/design-base/register.mjs";
import { resolveDirectionFamilies } from "#shared/design-base/resolve-families.mjs";
import { crossingGeometry, fr } from "../co2-suisse/crossing-geometry.ts";
import { applyCase } from "../../skills/chart-video/scripts/registers.mjs";
import { BAND_PROBE, bandOf, CREDIT_ONE_LINE, DRAWN_WIDER, haloOf, sourceCreditFor, titleCardFor, verticalInsetFor, widthOf } from "../../skills/chart-video/scripts/shots.mjs";
import { videoRegistersOf } from "../../skills/chart-video/scripts/video-registers.mjs";
import { statesFor } from "./states.mjs";
import { loadSubject } from "./subject.mjs";
import { LINE_VIDEO_TIMING } from "./timing-contract.ts";

const HERE = dirname(fileURLToPath(import.meta.url));
export const ROOT = join(HERE, "..", "..");
export const DIRECTIONS = join(ROOT, "docs", "design-base", "directions");
export const SIZE = "landscape";
export const REGISTER_NAMES = ["display", "eyebrow", "body", "annot", "value", "axis"];
const NB = "\u00A0";
/** The gap between the plot and its labels, × the axis lead. */
const LABEL_GAP = 0.4;
const DECADES = [1950, 1960, 1970, 1980, 1990, 2000, 2010, 2020];

export function loadBeat() {
  const subject = loadSubject();
  return { subject, states: statesFor(), copy: copyOf(subject) };
}

const plain = (s) => s.replace(/[\u202F\u00A0\u2009]/g, NB);

export function copyOf(subject) {
  return {
    eyebrow: "Climat · Suisse",
    title: [`En 2024, la Suisse a émis moins de CO₂ sur son territoire qu’en 1967`, `La Suisse repasse sous son niveau de 1967`],
    tip: (d) => plain(`${d.year} · ${fr(d.mt)}${NB}Mt`),
    reference: "Niveau de 1967",
    peak: "pic de 1973",
    tick: (v, top) => plain(`${fr(v, Number.isInteger(v) ? 0 : 1)}${top ? `${NB}Mt` : ""}`),
    source: [`Source : Global Carbon Budget 2025, via Our World in Data · émissions territoriales`, `Source : Global Carbon Budget 2025, via Our World in Data`].map((f) => f.replace(" · ", `${NB}· `)),
  };
}

export function textPerRegisterOf(copy, subject) {
  return {
    display: copy.title.join(" "),
    eyebrow: copy.eyebrow,
    body: copy.source.join(" "),
    annot: `${copy.reference} ${copy.peak}`,
    value: subject.data.map(copy.tip).join(" "),
    axis: `${DECADES.join(" ")} 10 32,5 50 Mt ${copy.source.join(" ")}`,
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

  const titleCard = titleCardFor({ registers, eyebrow: copy.eyebrow, title: copy.title, size: SIZE, eyebrowToDisplay: EYEBROW_TO_DISPLAY });
  const { register: sourceRegister, ...credit } = sourceCreditFor({ registers, forms: copy.source, size: SIZE, k, ...CREDIT_ONE_LINE });

  // ── the plot: room at the left for the value ticks, at the right for the tip label, at the bottom for the decades ──
  const { data, reference } = subject;
  const tipTexts = Object.fromEntries(data.map((d) => [String(d.year), measure(copy.tip(d), value)]));
  const tipWidth = Math.max(...Object.values(tipTexts).map((t) => t.width)) * (1 + DRAWN_WIDER);
  const dotR = 0.16 * axis.lead;
  const probe = crossingGeometry(data, { width: 1000, height: 1000, padding: { top: 0, right: 0, bottom: 0, left: 0 }, reference });
  const tickValues = probe.ticksY.map((t) => t.value);
  const tickTexts = tickValues.map((v, i) => measure(copy.tick(v, i === tickValues.length - 1), axis));
  const tickWidth = Math.max(...tickTexts.map((t) => t.width)) * (1 + DRAWN_WIDER);
  const padding = {
    left: inset + tickWidth + gap,
    right: inset + 3.6 * dotR + gap / 2 + tipWidth,
    top: vInset + valueBand.ascent + 2 * annot.lead,
    bottom: vInset + credit.height + gap + axisBand.ascent + axisBand.descent + 1.6 * gap,
  };
  const g = crossingGeometry(data, { width: stage.width, height: stage.height, padding, reference });
  const x = (year) => g.plot.left + ((year - data[0].year) / (data.at(-1).year - data[0].year)) * (g.plot.right - g.plot.left);

  const ticksY = g.ticksY.map((t, i) => ({ y: t.y, ...tickTexts[i], x: g.plot.left - gap - tickTexts[i].width, baseline: t.y + (axisBand.ascent - axisBand.descent) / 2 }));
  const ticksX = DECADES.map((year) => {
    const t = measure(String(year), axis);
    return { ...t, x: x(year) - t.width / 2, y: g.plot.bottom + 1.6 * gap + axisBand.ascent, tickX: x(year) };
  });
  // THE LANDING: where the rising line first reached today's reading — between the last year under it before the peak and the
  // next — the level line shot back from 2024 stops there.
  const endReading = data.at(-1).mt;
  const rise = data.findIndex((d, i) => i > 0 && d.year < subject.peak.year && data[i - 1].mt <= endReading && d.mt > endReading);
  if (rise < 1) throw new Error("the rising line never crosses today's reading before the peak");
  const [a, b] = [g.points[rise - 1], g.points[rise]];
  const share = (endReading - data[rise - 1].mt) / (data[rise].mt - data[rise - 1].mt);
  const landing = { x: a.x + (b.x - a.x) * share, y: g.end.y, year: data[rise].year };
  const yearTexts = Object.fromEntries(data.map((d) => [String(d.year), measure(String(d.year), annot)]));
  const peakLabel = { ...measure(copy.peak, annot), x: g.peak.x - measure(copy.peak, annot).width / 2, y: g.peak.y - 2 * dotR - gap };

  // ── colours ────────────────────────────────────────────────────────────────────────────────────────────────
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
    line: walked(accent, NON_TEXT_CONTRAST_MIN, "the line"),
    rule: walked(muted, NON_TEXT_CONTRAST_MIN, "the 1967 rule"),
    text: {
      eyebrow: walked(registers.eyebrow.fill ?? accent, TEXT_CONTRAST_MIN, "the eyebrow"),
      title: walked(registers.display.fill ?? ink, TEXT_CONTRAST_MIN, "the title"),
      tip: walked(accent, TEXT_CONTRAST_MIN, "the tip label"),
      axis: walked(muted, TEXT_CONTRAST_MIN, "the ticks"),
      annot: walked(muted, TEXT_CONTRAST_MIN, "a note"),
    },
  };

  // ── the credit: one line, under the decades ───────────────────────────────────────────────────────────────
  const creditAt = { x: inset, y: stage.height - vInset - credit.height };

  const props = {
    frame: stage,
    registers: { display: titleCard.register, eyebrow: registers.eyebrow, value, axis, annot, source: sourceRegister },
    titleCard,
    credit: { ...credit, at: creditAt },
    colours,
    strokes: { line: (direction.stroke?.data ?? 2) * k, grid: (direction.stroke?.hairline ?? 0.6) * k, rule: (direction.stroke?.rule ?? 1) * k, dash: [6 * k, 4 * k] },
    plot: g.plot,
    points: g.points.map((p) => ({ year: p.year, x: r1(p.x), y: r1(p.y) })),
    peak: { x: g.peak.x, y: g.peak.y, year: g.peak.year, label: peakLabel },
    end: { x: g.end.x, y: g.end.y },
    landing,
    yearTexts,
    yearRise: 2 * dotR + gap / 2,
    ticksY,
    ticksX,
    tipTexts,
    tipOffset: 3.6 * dotR + gap / 2,
    tipBaselineShift: (valueBand.ascent - valueBand.descent) / 2,
    dotR,
    peakYear: subject.peak.year,
    halo: haloOf(value, k),
    layoutInset: { x: inset, y: vInset },
    states,
    timing: LINE_VIDEO_TIMING,
  };
  return { id, direction, props, report: { k, titleForm: titleCard.form, sourceForm: credit.form, plot: g.plot } };
}
