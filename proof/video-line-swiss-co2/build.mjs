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
import { BAND_PROBE, bandOf, DRAWN_WIDER, haloOf, sourceCreditFor, titleCardFor, verticalInsetFor, widthOf } from "../../skills/chart-video/scripts/shots.mjs";
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
  const { register: sourceRegister, ...credit } = sourceCreditFor({ registers, forms: copy.source, size: SIZE, k });

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
    bottom: vInset + axisBand.ascent + axisBand.descent + 1.6 * gap,
  };
  const g = crossingGeometry(data, { width: stage.width, height: stage.height, padding, reference });
  const x = (year) => g.plot.left + ((year - data[0].year) / (data.at(-1).year - data[0].year)) * (g.plot.right - g.plot.left);

  const ticksY = g.ticksY.map((t, i) => ({ y: t.y, ...tickTexts[i], x: g.plot.left - gap - tickTexts[i].width, baseline: t.y + (axisBand.ascent - axisBand.descent) / 2 }));
  const ticksX = DECADES.map((year) => {
    const t = measure(String(year), axis);
    return { ...t, x: x(year) - t.width / 2, y: g.plot.bottom + 1.6 * gap + axisBand.ascent, tickX: x(year) };
  });
  // THE RULE'S NAME sits on the rule where the line is not: every position along it, above or below, is tried from the
  // left, and the first whose box no reading of the line touches wins.
  const refText = measure(copy.reference, annot);
  const annotBand = bandOf(BAND_PROBE, annot);
  const lineNear = (box) => g.points.some((p, i) => {
    const q = g.points[i + 1] ?? p;
    return [0, 0.25, 0.5, 0.75].some((t) => {
      const px = p.x + (q.x - p.x) * t;
      const py = p.y + (q.y - p.y) * t;
      return px >= box.x - gap && px <= box.x + box.width + gap && py >= box.y - gap && py <= box.y + box.height + gap;
    });
  });
  let referenceLabel = null;
  for (let lx = g.plot.left + gap; lx + refText.width <= g.plot.right - gap && !referenceLabel; lx += 10)
    for (const below of [false, true]) {
      const y = below ? g.referenceY + gap / 2 + annotBand.ascent : g.referenceY - gap / 2 - annotBand.descent;
      const box = { x: lx, y: y - annotBand.ascent, width: refText.width, height: annotBand.ascent + annotBand.descent };
      if (!lineNear(box)) {
        referenceLabel = { ...refText, x: lx, y };
        break;
      }
    }
  if (!referenceLabel) throw new Error(`« ${copy.reference} » finds no place on the rule clear of the line`);
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

  // ── the credit: the first corner of the plot that holds it clear of the line and every word ─────────────────
  const touches = (a, b) => a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;
  const words = [
    ...ticksY.map((t) => ({ x: t.x, y: t.baseline - axisBand.ascent, width: t.width, height: axisBand.ascent + axisBand.descent })),
    ...ticksX.map((t) => ({ x: t.x, y: t.y - axisBand.ascent, width: t.width, height: axisBand.ascent + axisBand.descent })),
    { x: referenceLabel.x, y: referenceLabel.y - annot.fontSize, width: referenceLabel.width, height: annot.lead },
    { x: peakLabel.x, y: peakLabel.y - annot.fontSize, width: peakLabel.width, height: annot.lead },
  ];
  const clearOfLine = (box) => g.points.every((p) => !(p.x >= box.x - 8 && p.x <= box.x + box.width + 8 && p.y >= box.y - 8 && p.y <= box.y + box.height + 8));
  let creditAt = null;
  const xs = [g.plot.left + gap, g.plot.right - credit.width];
  const ys = [g.plot.top, g.plot.bottom - credit.height - gap];
  for (const cy of [ys[0], ys[1]])
    for (const cx of xs) {
      if (creditAt) break;
      const box = { x: cx, y: cy, width: credit.width, height: credit.height };
      if (words.some((w) => touches(box, w)) || !clearOfLine(box) || touches(box, { x: g.plot.left, y: g.referenceY - annot.lead, width: g.plot.right - g.plot.left, height: 2 * annot.lead })) continue;
      creditAt = { x: cx, y: cy };
    }
  if (!creditAt) throw new Error(`a ${credit.width}×${credit.height} credit finds no corner of the plot clear of the line`);

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
    referenceY: g.referenceY,
    referenceLabel,
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
