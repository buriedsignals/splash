// EVERYTHING ONE DIRECTION'S RENDER IS HANDED, BUILT IN BUN — the words, the stack's paths, solar's band per year and its
// rank, the band names seated inside their bands, the 2016 rule, the colours and the states.
//
// Runs in Bun only.

import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { area, curveBasis, stack, stackOffsetSilhouette, stackOrderInsideOut } from "d3-shape";
import { adjustToContrast, contrast, mix, NON_TEXT_CONTRAST_MIN, TEXT_CONTRAST_MIN } from "#shared/chart-beat/colour.mjs";
import { deriveFurniture } from "#shared/chart-beat/render-still.mjs";
import { frameInsetFor, sizeFor } from "#shared/chart-video/sizes.mjs";
import { readDirection } from "#shared/design-base/read-direction.mjs";
import { EYEBROW_TO_DISPLAY, registerOf } from "#shared/design-base/register.mjs";
import { resolveDirectionFamilies } from "#shared/design-base/resolve-families.mjs";
import { applyCase } from "../../skills/chart-video/scripts/registers.mjs";
import { BAND_PROBE, bandOf, DRAWN_WIDER, haloOf, sourceCreditFor, titleCardFor, verticalInsetFor, widthOf } from "../../skills/chart-video/scripts/shots.mjs";
import { videoRegistersOf } from "../../skills/chart-video/scripts/video-registers.mjs";
import { statesFor } from "./states.mjs";
import { LABELS, loadSubject, TRACKED } from "./subject.mjs";
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
    mark: String(subject.reachedAt),
    source: [`Source : Ember, Energy Institute – Statistical Review of World Energy (2025), via Our World in Data · 2025 exclue, année incomplète`, `Source : Ember, via Our World in Data · 2025 exclue`].map((f) => f.replace(" · ", `${NB}· `)),
  };
}

export function textPerRegisterOf(copy, subject) {
  return {
    display: copy.title.join(" "),
    eyebrow: copy.eyebrow,
    body: copy.source.join(" "),
    annot: Object.values(copy.names).join(" "),
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
  const { register: sourceRegister, ...credit } = sourceCreditFor({ registers, forms: copy.source, size: SIZE, k });

  // ── the stack: the still's own ───────────────────────────────────────────────────────────────────────────────
  const { readings, keys, ranks } = subject;
  const rankTexts = Object.fromEntries([...new Set(ranks.map((r) => r.rank))].map((n) => [String(n), measure(copy.rank(n), value)]));
  const rankWidth = Math.max(...Object.values(rankTexts).map((t) => t.width)) * (1 + DRAWN_WIDER);
  const plot = {
    left: inset,
    right: stage.width - inset - gap - rankWidth,
    top: vInset + axisBand.ascent + axisBand.descent + gap,
    bottom: stage.height - vInset - axisBand.ascent - axisBand.descent - 1.6 * gap,
  };
  const series = stack().keys(keys).order(stackOrderInsideOut).offset(stackOffsetSilhouette)(readings);
  const extent = series.flat(2).filter(Number.isFinite);
  // The domain is padded so the stream has frame around it — for the credit below it and the mark's year above it.
  const span = Math.max(...extent) - Math.min(...extent);
  const lo = Math.min(...extent) - 0.22 * span;
  const hi = Math.max(...extent) + 0.12 * span;
  const x = (year) => plot.left + ((year - readings[0].year) / (readings.at(-1).year - readings[0].year)) * (plot.right - plot.left);
  const y = (v) => plot.bottom - ((v - lo) / (hi - lo)) * (plot.bottom - plot.top);
  const shape = area().x((d) => x(d.data.year)).y0((d) => y(d[0])).y1((d) => y(d[1])).curve(curveBasis).digits(1);

  // ── colours: a sequential ramp of the accent by the stack's own order, solar at full strength ───────────────────
  const { ground, accent } = direction;
  const { ink, muted, grid } = deriveFurniture(ground);
  const byOrder = [...series].sort((a, b) => a.index - b.index);
  const rampFrom = mix(accent, ink, 0.45);
  const rampTo = mix(accent, ground, 0.78);
  const fillOf = (key) => (key === TRACKED ? adjustToContrast(accent, ground, NON_TEXT_CONTRAST_MIN) : mix(rampFrom, rampTo, byOrder.findIndex((s) => s.key === key) / (byOrder.length - 1)));
  const walked = (c, on, floor, what) => {
    const w = adjustToContrast(c, on, floor);
    if (!w) throw new Error(`${what} has no variant that reads at ${floor}:1 on ${on}`);
    return w;
  };
  const layers = series.map((s) => ({ key: s.key, d: shape(s), fill: fillOf(s.key) }));

  // ── the bands named inside themselves, where each is thickest ───────────────────────────────────────────────
  const markX = x(subject.reachedAt);
  const bandNames = NAMED.map((key) => {
    const s = series.find((x) => x.key === key);
    const text = measure(copy.names[key], annot);
    let best = null;
    s.forEach((point, i) => {
      const cx = x(readings[i].year);
      if (cx - text.width / 2 < plot.left + gap || cx + text.width / 2 > plot.right - gap) return;
      // Never across the mark's rule, which is drawn through the whole stream.
      if (Math.abs(cx - markX) < text.width / 2 + gap) return;
      // Thin across the label's whole width, not only at its centre.
      const span = s.filter((_, j) => Math.abs(x(readings[j].year) - cx) <= text.width / 2 + gap);
      const thickness = Math.min(...span.map((p) => y(p[0]) - y(p[1])));
      if (!best || thickness > best.thickness) best = { i, cx, thickness, mid: (y(point[0]) + y(point[1])) / 2 };
    });
    if (!best || best.thickness < annotBand.ascent + annotBand.descent + gap) throw new Error(`« ${text.text} » does not fit inside its band`);
    const fill = fillOf(key);
    const pole = contrast(ink, fill) >= contrast(ground, fill) ? ink : ground;
    return { key, ...text, x: best.cx - text.width / 2, y: best.mid + (annotBand.ascent - annotBand.descent) / 2, ink: walked(pole, fill, TEXT_CONTRAST_MIN, `« ${text.text} »`), revealAt: best.cx + text.width / 2 };
  });

  // ── solar's band and rank, year by year ─────────────────────────────────────────────────────────────────────
  const solar = series.find((s) => s.key === TRACKED);
  const years = readings.map((r, i) => ({ year: r.year, x: r1(x(r.year)), solarY: r1((y(solar[i][0]) + y(solar[i][1])) / 2), rank: ranks[i].rank }));

  // ── the mark: the year solar became third ────────────────────────────────────────────────────────────────────
  const markIndex = readings.findIndex((r) => r.year === subject.reachedAt);
  const top = Math.min(...series.map((s) => y(s[markIndex][1])));
  const bottom = Math.max(...series.map((s) => y(s[markIndex][0])));
  const markText = measure(copy.mark, axis);
  const mark = { x: x(subject.reachedAt), y1: top - gap / 2, y2: bottom + gap / 2, label: { ...markText, x: x(subject.reachedAt) - markText.width / 2, y: top - gap } };

  const ticks = readings.filter((r) => r.year % 5 === 0 || r.year === readings.at(-1).year).map((r) => {
    const t = measure(String(r.year), axis);
    return { ...t, x: Math.min(x(r.year) - t.width / 2, plot.right - t.width), y: plot.bottom + 1.6 * gap + axisBand.ascent, tickX: x(r.year) };
  });

  // ── the credit: under the stream at the left, where the silhouette leaves the most room ──────────────────────
  const streamBottomAt = (px) => Math.max(...series.map((s) => Math.max(...s.filter((_, i) => Math.abs(x(readings[i].year) - px) < 60).map((p) => y(p[0])))));
  const creditAt = { x: plot.left, y: plot.bottom - credit.height };
  const lowest = Math.max(...Array.from({ length: 12 }, (_, i) => streamBottomAt(creditAt.x + (credit.width * i) / 11)));
  if (!(lowest + gap < creditAt.y)) throw new Error("the credit would sit on the stream");

  const props = {
    frame: stage,
    registers: { display: titleCard.register, eyebrow: registers.eyebrow, value, axis, annot, source: sourceRegister },
    titleCard,
    credit: { ...credit, at: creditAt },
    colours: {
      ground,
      grid,
      edge: ground,
      text: {
        eyebrow: walked(registers.eyebrow.fill ?? accent, ground, TEXT_CONTRAST_MIN, "the eyebrow"),
        title: walked(registers.display.fill ?? ink, ground, TEXT_CONTRAST_MIN, "the title"),
        rank: walked(accent, ground, TEXT_CONTRAST_MIN, "solar's rank"),
        axis: walked(muted, ground, TEXT_CONTRAST_MIN, "the ticks"),
        mark: walked(ink, ground, TEXT_CONTRAST_MIN, "the mark"),
      },
    },
    strokes: { edge: (direction.stroke?.hairline ?? 0.6) * k, rule: (direction.stroke?.rule ?? 1) * k * 1.4 },
    plot,
    layers,
    tracked: TRACKED,
    years,
    rankTexts,
    rankOffset: gap / 2,
    rankShift: (valueBand.ascent - valueBand.descent) / 2,
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
