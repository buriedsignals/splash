// EVERYTHING ONE DIRECTION'S RENDER IS HANDED, BUILT IN BUN — the words, the box, the cell count the ladder settles on,
// every cell's home and its packing inside the largest cell, every counter text measured and keyed, the key, the
// colours and the states.
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
import { BAND_PROBE, bandOf, CREDIT_ONE_LINE, DRAWN_WIDER, haloOf, sourceCreditFor, titleCardFor, verticalInsetFor, widthOf, wrap } from "../../skills/chart-video/scripts/shots.mjs";
import { videoRegistersOf } from "../../skills/chart-video/scripts/video-registers.mjs";
import { squarify } from "./layout.mjs";
import { gwText, paysText } from "./scene.mjs";
import { statesFor } from "./states.mjs";
import { loadSubject } from "./subject.mjs";
import { TREEMAP_VIDEO_TIMING } from "./timing-contract.ts";

const HERE = dirname(fileURLToPath(import.meta.url));
export const ROOT = join(HERE, "..", "..");
export const DIRECTIONS = join(ROOT, "docs", "design-base", "directions");
export const SIZE = "landscape";
export const REGISTER_NAMES = ["display", "eyebrow", "body", "annot", "value", "axis"];
const NB = "\u00A0";
const LABEL_GAP = 0.4;
/** How many countries the plate tries to draw on their own, generous to mean — the static's ladder. */
const COUNTS = [16, 14, 12, 11, 10, 9, 8, 7, 6];

export function loadBeat() {
  const subject = loadSubject();
  return { subject, states: statesFor(), copy: copyOf(subject) };
}

const valueOf = (mw) => (mw >= 1000 ? `${(mw / 1000).toFixed(1).replace(".", ",")}${NB}GW` : `${Math.round(mw)}${NB}MW`);

export function copyOf(subject) {
  const share = Math.round(subject.legacyShare * 100);
  const n = subject.tipped.length;
  return {
    eyebrow: `Énergie${NB}· Europe`,
    title: [
      `L’eau et l’atome portent encore ${share}${NB}% du bas-carbone européen, mais ${n}${NB}pays ont basculé`,
      `L’eau et l’atome portent ${share}${NB}% du bas-carbone européen, mais ${n}${NB}pays ont basculé`,
    ],
    key: `éolien + solaire`,
    tailThread: (k) => `${k}${NB}pays`,
    tailField: (k) => `${k}${NB}pays`,
    source: [
      "Source : WRI Global Power Plant Database v1.3.0 · puissance installée, non production",
      "Source : WRI Global Power Plant Database v1.3.0 · puissance installée",
      "Source : WRI Global Power Plant Database",
    ],
  };
}

export function textPerRegisterOf(copy, subject) {
  return {
    display: copy.title.join(" "),
    eyebrow: copy.eyebrow,
    body: copy.source.join(" "),
    annot: `${subject.countries.map((c) => c.name).join(" ")} ${copy.tailThread(8)} ${copy.tailField(30)}`,
    value: `${subject.countries.map((c) => valueOf(c.mw)).join(" ")} ${gwText(469)} ${paysText(10)}`,
    axis: `${copy.key} ${copy.source.join(" ")}`,
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
  const { axis, value, annot } = registers;
  const measure = (t, r) => {
    const cased = applyCase(t, r.transform);
    return { text: cased, width: widthOf(cased, r) };
  };
  const wider = (w) => w * (1 + DRAWN_WIDER);
  const gap = LABEL_GAP * axis.lead;
  const axisBand = bandOf(BAND_PROBE, axis);
  const valueBand = bandOf(BAND_PROBE, value);
  const annotBand = bandOf(BAND_PROBE, annot);

  const titleCard = titleCardFor({ registers, eyebrow: copy.eyebrow, title: copy.title, size: SIZE, eyebrowToDisplay: EYEBROW_TO_DISPLAY });

  // THE BOTTOM LINE: the credit at the left, the key at the right — one swatch, its word, the count of tipped countries.
  const keyWord = measure(copy.key, axis);
  const counts = Object.fromEntries(Array.from({ length: subject.tipped.length + 1 }, (_, i) => paysText(i)).map((t) => [t, widthOf(applyCase(t, value.transform), value)]));
  const swatchW = axisBand.ascent;
  const countRoom = wider(Math.max(...Object.values(counts)));
  const keyWidth = swatchW + gap / 2 + wider(keyWord.width) + gap + countRoom;
  const keyX = stage.width - inset - keyWidth;
  const { register: sourceRegister, ...credit } = sourceCreditFor({ registers, forms: copy.source, size: SIZE, k, ...CREDIT_ONE_LINE, measure: (keyX - 2 * gap - inset) / (stage.width - 2 * inset) });
  const creditAt = { x: inset, y: stage.height - vInset - credit.height };
  const baseline = creditAt.y + credit.lines[0].y;
  const key = {
    swatch: { x: keyX, y: baseline - axisBand.ascent, w: swatchW, h: axisBand.ascent },
    word: { ...keyWord, x: keyX + swatchW + gap / 2, y: baseline },
    countX: keyX + swatchW + gap / 2 + wider(keyWord.width) + gap,
    countY: baseline,
  };
  const valueCounts = Object.fromEntries(Array.from({ length: Math.round(subject.total / 1000) + 1 }, (_, v) => gwText(v)).map((t) => [t, widthOf(applyCase(t, value.transform), value)]));

  // THE BOX: the whole frame above the bottom line.
  const box = { x: inset, y: vInset, w: stage.width - 2 * inset };
  box.h = Math.min(creditAt.y, baseline - Math.max(axisBand.ascent, bandOf(BAND_PROBE, value).ascent)) - gap - box.y;
  const area = box.w * box.h;
  const seam = Math.max(2, (direction.stroke?.rule ?? 1) * k * 2);
  const pad = 0.3 * value.fontSize;
  const nameLead = annot.lead;
  /** Words wrapped to a cell: at spaces (a no-break space holds), and a compound too wide for the cell breaks after its
   *  hyphen — « Royaume- / Uni ». */
  const linesOf = (text, r, width) => {
    const cased = applyCase(text, r.transform);
    const measureW = width / (1 + DRAWN_WIDER);
    let lines = wrap(cased, r, measureW);
    if (lines.some((l) => l.width > measureW) && cased.includes("-"))
      lines = wrap(cased.replace(/-/g, "- "), r, measureW).map((l) => ({ text: l.text.replace(/- /g, "-"), width: widthOf(l.text.replace(/- /g, "-"), r) }));
    return lines;
  };

  // THE LADDER: the most countries drawn on their own for which every cell holds its value, and every tipped cell its
  // name; the rest folded into two remainders split along the thread, each carrying its value too.
  const groupOf = (rest, tipped, name) => ({
    key: tipped ? "rest-thread" : "rest",
    name,
    mw: rest.reduce((s, c) => s + c.mw, 0),
    newBuild: rest.reduce((s, c) => s + c.newBuild, 0),
    tipped,
    countries: rest.length,
  });
  /** THE MIDLINE STOPS SHORT OF THE WORDS: where the cell's half height crosses its words, the line starts past the
   *  widest of the lines it crosses. */
  const midlineFrom = (r, valueLines, nameLines, valueY, nameY) => {
    const mid = r.h / 2;
    const crossed = [
      ...valueLines.map((l, li) => ({ l, top: valueY + li * value.lead - valueBand.ascent, bottom: valueY + li * value.lead + valueBand.descent })),
      ...nameLines.map((l, li) => ({ l, top: nameY + li * nameLead - annotBand.ascent, bottom: nameY + li * nameLead + annotBand.descent })),
    ].filter((b) => b.top - gap / 2 <= mid && mid <= b.bottom + gap / 2);
    return crossed.length ? seam / 2 + pad + wider(Math.max(...crossed.map((b) => b.l.width))) + gap / 2 : 0;
  };
  const attempt = (count) => {
    const head = subject.countries.slice(0, count).map((c) => ({ ...c, countries: 1 }));
    const tail = subject.countries.slice(count);
    const tailThread = tail.filter((c) => c.tipped);
    const tailField = tail.filter((c) => !c.tipped);
    const drawn = [
      ...head,
      ...(tailThread.length ? [groupOf(tailThread, true, copy.tailThread(tailThread.length))] : []),
      ...(tailField.length ? [groupOf(tailField, false, copy.tailField(tailField.length))] : []),
    ].sort((a, b) => b.mw - a.mw);
    // A REMAINDER IS NEVER THE LARGEST CELL: the largest cell is the one the thread is measured against.
    if (drawn[0].key !== subject.biggest.key) return null;
    const rects = squarify(drawn.map((c) => (c.mw / subject.total) * area), box);
    const cells = [];
    for (const [i, c] of drawn.entries()) {
      const r = rects[i];
      const inner = { w: r.w - seam - 2 * pad, h: r.h - seam - 2 * pad };
      // The value on one line, or its number over its unit in a narrow cell.
      const valueLines = linesOf(valueOf(c.mw).replace(NB, " "), value, inner.w);
      const valueH = valueBand.ascent + valueBand.descent + (valueLines.length - 1) * value.lead;
      if (!(valueLines.length <= 2 && valueLines.every((l) => wider(l.width) <= inner.w) && valueH <= inner.h)) return null;
      const lines = linesOf(c.name, annot, inner.w);
      const named = lines.length <= 2 && lines.every((l) => wider(l.width) <= inner.w) && valueH + gap / 2 + annotBand.ascent + (lines.length - 1) * nameLead + annotBand.descent <= inner.h;
      if (c.tipped && !named) return null;
      const valueY = seam / 2 + pad + valueBand.ascent;
      const nameY = valueY + (valueLines.length - 1) * value.lead + valueBand.descent + gap / 2 + annotBand.ascent;
      cells.push({
        key: c.key,
        name: c.name,
        mw: c.mw,
        tipped: c.tipped,
        countries: c.countries,
        share: c.newBuild / c.mw,
        rect: r,
        values: valueLines.map((l, li) => ({ ...l, dx: seam / 2 + pad, dy: valueY + li * value.lead, mid: valueY + li * value.lead - (valueBand.ascent - valueBand.descent) / 2 })),
        names: named ? lines.map((l, li) => ({ ...l, dx: seam / 2 + pad, dy: nameY + li * nameLead, mid: nameY + li * nameLead - (annotBand.ascent - annotBand.descent) / 2 })) : [],
        midlineFrom: midlineFrom(r, valueLines, named ? lines : [], valueY, nameY),
      });
    }
    return { cells, count };
  };
  let laid = null;
  for (const count of COUNTS) if ((laid = attempt(Math.min(count, subject.countries.length)))) break;
  if (!laid) throw new Error("no filed cell count leaves every cell room for its own value");
  const { cells } = laid;
  const sumCells = (list) => list.reduce((s, c) => s + c.mw, 0);
  if (Math.abs(sumCells(cells) - subject.total) > 1e-6) throw new Error("the drawn cells do not add up to the whole");
  if (cells.filter((c) => c.tipped).reduce((s, c) => s + c.countries, 0) !== subject.tipped.length) throw new Error("the thread's cells do not hold every tipped country");

  // THE GATHER: the tipped cells pack into the lower part of the largest cell, a strip of the largest cell's width whose
  // area is their sum — below the largest cell's own words.
  const biggest = cells.find((c) => c.key === subject.biggest.key);
  if (!biggest || biggest.tipped) throw new Error(`${subject.biggest.name} is not drawn as a cell of its own, outside the thread`);
  const F = biggest.rect;
  const thread = cells.filter((c) => c.tipped);
  const stripH = F.h * (sumCells(thread) / biggest.mw);
  const strip = { x: F.x, y: F.y + F.h - stripH, w: F.w, h: stripH };
  const wordsBottom = F.y + (biggest.names.length ? biggest.names.at(-1).dy + annotBand.descent : biggest.values.at(-1).dy + valueBand.descent);
  if (!(wordsBottom + pad <= strip.y)) throw new Error(`the gathered cells would cover ${biggest.name}'s own words`);
  const targets = squarify(thread.map((c) => c.rect.w * c.rect.h), strip);
  const sum = measure(valueOf(sumCells(thread)), value);
  if (!(wider(sum.width) + 2 * pad <= strip.w)) throw new Error("the gathered sum is wider than the strip it names");

  const { ground, accent } = direction;
  const { ink, muted } = deriveFurniture(ground);
  const walked = (c, against, floor, what) => {
    const w = adjustToContrast(c, against, floor);
    if (!w) throw new Error(`${what} has no variant that reads at ${floor}:1 on ${against}`);
    return w;
  };
  const field = mix(ground, ink, 0.1);
  const full = walked(accent, ground, NON_TEXT_CONTRAST_MIN, "the thread");
  const onFull = walked(contrast(ink, full) >= contrast(ground, full) ? ink : ground, full, TEXT_CONTRAST_MIN, "a word on the thread");
  const colours = {
    ground,
    field,
    full,
    ring: walked(ink, field, NON_TEXT_CONTRAST_MIN, "the ring"),
    midline: walked(muted, field, NON_TEXT_CONTRAST_MIN, "the midline"),
    text: {
      eyebrow: walked(registers.eyebrow.fill ?? accent, ground, TEXT_CONTRAST_MIN, "the eyebrow"),
      title: walked(registers.display.fill ?? ink, ground, TEXT_CONTRAST_MIN, "the title"),
      onField: walked(ink, field, TEXT_CONTRAST_MIN, "a word in a cell"),
      onFull,
      axis: walked(muted, ground, TEXT_CONTRAST_MIN, "a muted word"),
      accent: walked(accent, ground, TEXT_CONTRAST_MIN, "the count"),
    },
  };

  const r1 = (v) => Math.round(v * 100) / 100;
  const props = {
    frame: stage,
    registers: { display: titleCard.register, eyebrow: registers.eyebrow, value, annot, axis, source: sourceRegister },
    titleCard,
    credit: { ...credit, at: creditAt },
    colours,
    box,
    totalGw: Math.round(subject.total / 1000),
    biggest: biggest.key,
    cells: cells.map((c, i) => ({ ...c, target: c.tipped ? targets[thread.indexOf(c)] : null, order: i })),
    strip,
    sum: { ...sum, x: strip.x + (strip.w - sum.width) / 2, y: strip.y + strip.h / 2 + (valueBand.ascent - valueBand.descent) / 2 },
    legend: key,
    counts,
    valueCounts,
    wholeY: box.y + box.h / 2 + (valueBand.ascent - valueBand.descent) / 2,
    halo: haloOf(annot, k),
    strokes: { seam: r1(seam), ring: r1((direction.stroke?.rule ?? 1) * k * 1.4), midline: r1(Math.max(1.5, (direction.stroke?.rule ?? 1) * k)) },
    states,
    timing: TREEMAP_VIDEO_TIMING,
  };
  return {
    id,
    direction,
    props,
    report: { k, titleForm: titleCard.form, sourceForm: credit.form, count: laid.count, drawn: cells.length, named: cells.filter((c) => c.names.length).length, into: (sumCells(thread) / biggest.mw).toFixed(3) },
  };
}
