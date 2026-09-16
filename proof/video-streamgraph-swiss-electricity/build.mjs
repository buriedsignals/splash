// EVERYTHING ONE DIRECTION'S RENDER IS HANDED, BUILT IN BUN — the words; every band's edges in the four arrangements
// (the stream, the giants aside, magnified, lines from zero); solar's rank per year; the band names seated inside their
// bands; oil's name; the 2016 rule; the colours and the states.
//
// Runs in Bun only.

import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { stack, stackOffsetSilhouette, stackOrderInsideOut } from "d3-shape";
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
import { GIANTS, LABELS, loadSubject, RIVAL, TRACKED } from "./subject.mjs";
import { STREAM_VIDEO_TIMING } from "./timing-contract.ts";

const HERE = dirname(fileURLToPath(import.meta.url));
export const ROOT = join(HERE, "..", "..");
export const DIRECTIONS = join(ROOT, "docs", "design-base", "directions");
export const SIZE = "landscape";
export const REGISTER_NAMES = ["display", "eyebrow", "body", "annot", "value", "axis"];
const NB = "\u00A0";
const LABEL_GAP = 0.4;
/** The bands named inside themselves: the two a reader could name by their size. */
const NAMED = ["Hydropower", "Nuclear"];

export function loadBeat() {
  const subject = loadSubject();
  return { subject, states: statesFor(), copy: copyOf(subject) };
}

export function copyOf(subject) {
  return {
    eyebrow: "Énergie · Suisse",
    title: [`En ${subject.reachedAt}, le solaire est devenu la troisième source d’électricité suisse`, `Le solaire, troisième source d’électricité suisse`],
    rank: (n) => `${LABELS[TRACKED]} · ${n}e`,
    names: Object.fromEntries(NAMED.map((k) => [k, LABELS[k]])),
    rival: LABELS[RIVAL],
    mark: String(subject.reachedAt),
    source: [`Source : Ember, Energy Institute – Statistical Review of World Energy (2025), via Our World in Data · 2025 exclue, année incomplète`, `Source : Ember, via Our World in Data · 2025 exclue`].map((f) => f.replace(" · ", `${NB}· `)),
  };
}

export function textPerRegisterOf(copy, subject) {
  return {
    display: copy.title.join(" "),
    eyebrow: copy.eyebrow,
    body: copy.source.join(" "),
    annot: [...Object.values(copy.names), copy.rival].join(" "),
    value: [...new Set(subject.ranks.map((r) => copy.rank(r.rank)))].join(" "),
    axis: `2000 2005 2010 2015 2020 2024 ${copy.mark} ${copy.source.join(" ")}`,
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

  // ── the plot: the credit takes its own row under the years; room at the right for solar's rank and oil's name ───
  const { readings, keys, ranks } = subject;
  const rankTexts = Object.fromEntries([...new Set(ranks.map((r) => r.rank))].map((n) => [String(n), measure(copy.rank(n), value)]));
  const rivalText = measure(copy.rival, annot);
  const rankWidth = Math.max(...Object.values(rankTexts).map((t) => t.width), rivalText.width) * (1 + DRAWN_WIDER);
  const plot = {
    left: inset,
    right: stage.width - inset - gap / 2 - rankWidth,
    top: vInset + axisBand.ascent + axisBand.descent + gap,
    bottom: stage.height - vInset - credit.height - gap - axisBand.ascent - axisBand.descent - 1.6 * gap,
  };
  const x = (year) => plot.left + ((year - readings[0].year) / (readings.at(-1).year - readings[0].year)) * (plot.right - plot.left);
  const xs = readings.map((r) => r1(x(r.year)));

  // ── the four arrangements ────────────────────────────────────────────────────────────────────────────────────
  // THE STREAM: the still's own stack — silhouette offset, inside-out order.
  const series = stack().keys(keys).order(stackOrderInsideOut).offset(stackOffsetSilhouette)(readings);
  const extent = series.flat(2).filter(Number.isFinite);
  const span = Math.max(...extent) - Math.min(...extent);
  const lo = Math.min(...extent) - 0.05 * span;
  const hi = Math.max(...extent) + 0.05 * span;
  const unit = (plot.bottom - plot.top) / (hi - lo);
  const zeroY = plot.bottom - (0 - lo) * unit;
  const y = (v) => zeroY - v * unit;
  const small = keys.filter((k) => !GIANTS.includes(k));
  const edgesOf = (s, at) => s.map((p) => [r1(at(p[0])), r1(at(p[1]))]);
  const stream = Object.fromEntries(series.map((s) => [s.key, edgesOf(s, y)]));
  // THE GIANTS ASIDE: the same stack in the same order with the giants at nothing — the small sources close in where
  // they were, on the stream's own scale.
  const inStackOrder = [...series].sort((a, b) => a.index - b.index).map((s) => s.key);
  const without = stack().keys(inStackOrder).value((d, key) => (GIANTS.includes(key) ? 0 : d[key])).offset(stackOffsetSilhouette)(readings);
  const aside = Object.fromEntries(without.map((s) => [s.key, edgesOf(s, y)]));
  // MAGNIFIED: that stack enlarged about the stream's centre line until its widest year fills the frame.
  const widest = Math.max(...readings.map((r) => small.reduce((sum, k) => sum + r[k], 0)));
  const magnify = Math.min(zeroY - plot.top - gap, plot.bottom - gap - zeroY) / ((widest / 2) * unit);
  const magnified = Object.fromEntries(without.map((s) => [s.key, edgesOf(s, (v) => zeroY - v * unit * magnify)]));
  // LINES: every small source from zero, on a scale its largest reading fills.
  const baseline = plot.bottom - gap;
  const largest = Math.max(...readings.flatMap((r) => small.map((k) => r[k])));
  const lineScale = (baseline - plot.top - valueBand.ascent - gap) / largest;
  const lines = Object.fromEntries(keys.map((k) => [k, readings.map((r) => (GIANTS.includes(k) ? [baseline, baseline] : [r1(baseline), r1(baseline - r[k] * lineScale)]))]));
  const lineKeys = small.filter((k) => readings.some((r) => r[k] > 0));

  // ── colours: a sequential ramp of the accent by the stack's own order, solar at full strength ───────────────────
  const { ground, accent } = direction;
  const { ink, muted, grid } = deriveFurniture(ground);
  const rampFrom = mix(accent, ink, 0.45);
  const rampTo = mix(accent, ground, 0.78);
  const walked = (c, on, floor, what) => {
    const w = adjustToContrast(c, on, floor);
    if (!w) throw new Error(`${what} has no variant that reads at ${floor}:1 on ${on}`);
    return w;
  };
  const fillOf = (key) => (key === TRACKED ? walked(accent, ground, NON_TEXT_CONTRAST_MIN, "solar's band") : mix(rampFrom, rampTo, inStackOrder.indexOf(key) / (inStackOrder.length - 1)));
  const strokeOf = (key) => (key === TRACKED ? fillOf(key) : key === RIVAL ? walked(ink, ground, NON_TEXT_CONTRAST_MIN, "oil's line") : walked(mix(muted, ground, 0.3), ground, NON_TEXT_CONTRAST_MIN, `${key}'s line`));
  const layers = keys.map((key) => ({ key, fill: fillOf(key), stroke: strokeOf(key) }));

  // ── the bands named inside themselves, where each is thickest ───────────────────────────────────────────────
  const markX = x(subject.reachedAt);
  const bandNames = NAMED.map((key) => {
    const s = series.find((x) => x.key === key);
    const text = measure(copy.names[key], annot);
    let best = null;
    s.forEach((point, i) => {
      const cx = x(readings[i].year);
      if (cx - text.width / 2 < plot.left + gap || cx + text.width / 2 > plot.right - gap) return;
      // Never across the mark's rule, which is drawn through the whole plot.
      if (Math.abs(cx - markX) < text.width / 2 + gap) return;
      // Thin across the label's whole width, not only at its centre.
      const around = s.filter((_, j) => Math.abs(x(readings[j].year) - cx) <= text.width / 2 + gap);
      const thickness = Math.min(...around.map((p) => y(p[0]) - y(p[1])));
      if (!best || thickness > best.thickness) best = { i, cx, thickness, mid: (y(point[0]) + y(point[1])) / 2 };
    });
    if (!best || best.thickness < annotBand.ascent + annotBand.descent + gap) throw new Error(`« ${text.text} » does not fit inside its band`);
    const fill = fillOf(key);
    const pole = contrast(ink, fill) >= contrast(ground, fill) ? ink : ground;
    return { key, ...text, x: best.cx - text.width / 2, y: best.mid + (annotBand.ascent - annotBand.descent) / 2, ink: walked(pole, fill, TEXT_CONTRAST_MIN, `« ${text.text} »`), revealAt: best.cx + text.width / 2 };
  });

  // ── the mark, the rival's name at the end of its line, the ticks ────────────────────────────────────────────
  const markText = measure(copy.mark, axis);
  const mark = { year: subject.reachedAt, x: markX, y1: plot.top, y2: plot.bottom, label: { ...markText, x: markX - markText.width / 2, y: plot.top - gap } };
  const rival = { ...rivalText, x: xs.at(-1) + gap / 2, y: lines[RIVAL].at(-1)[1] + (annotBand.ascent - annotBand.descent) / 2 };
  const solarEnd = lines[TRACKED].at(-1)[1];
  if (!(Math.abs(solarEnd - lines[RIVAL].at(-1)[1]) > valueBand.ascent + annotBand.ascent)) throw new Error("solar's rank and oil's name would meet at the end of their lines");
  const ticks = readings.filter((r) => r.year % 5 === 0 || r.year === readings.at(-1).year).map((r) => {
    const t = measure(String(r.year), axis);
    return { ...t, x: Math.min(x(r.year) - t.width / 2, plot.right - t.width), y: plot.bottom + 1.6 * gap + axisBand.ascent, tickX: x(r.year) };
  });

  // ── the credit: one line, under the years ─────────────────────────────────────────────────────────────────
  const creditAt = { x: inset, y: stage.height - vInset - credit.height };

  const props = {
    frame: stage,
    registers: { display: titleCard.register, eyebrow: registers.eyebrow, value, axis, annot, source: sourceRegister },
    titleCard,
    credit: { ...credit, at: creditAt },
    colours: {
      ground,
      grid,
      edge: ground,
      cursor: walked(muted, ground, NON_TEXT_CONTRAST_MIN, "the cursor"),
      text: {
        eyebrow: walked(registers.eyebrow.fill ?? accent, ground, TEXT_CONTRAST_MIN, "the eyebrow"),
        title: walked(registers.display.fill ?? ink, ground, TEXT_CONTRAST_MIN, "the title"),
        rank: walked(accent, ground, TEXT_CONTRAST_MIN, "solar's rank"),
        rival: walked(ink, ground, TEXT_CONTRAST_MIN, "oil's name"),
        axis: walked(muted, ground, TEXT_CONTRAST_MIN, "the ticks"),
        mark: walked(ink, ground, TEXT_CONTRAST_MIN, "the mark"),
      },
    },
    strokes: { edge: (direction.stroke?.hairline ?? 0.6) * k, rule: (direction.stroke?.rule ?? 1) * k * 1.4, line: (direction.stroke?.data ?? 2) * k },
    plot,
    keys,
    giants: GIANTS,
    lineKeys,
    tracked: TRACKED,
    rivalKey: RIVAL,
    layers,
    geometry: { stream, aside, magnify: magnified, lines },
    magnify,
    baseline,
    lineScale,
    xs,
    years: readings.map((r, i) => ({ year: r.year, rank: ranks[i].rank })),
    rankTexts,
    rankOffset: gap / 2,
    rankShift: (valueBand.ascent - valueBand.descent) / 2,
    rival,
    bandNames,
    mark,
    ticks,
    halo: haloOf(value, k),
    layoutInset: { x: inset, y: vInset },
    states,
    timing: STREAM_VIDEO_TIMING,
  };
  return { id, direction, props, report: { k, titleForm: titleCard.form, sourceForm: credit.form, reachedAt: subject.reachedAt } };
}
