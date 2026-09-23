// EVERYTHING ONE DIRECTION'S RENDER IS HANDED, BUILT IN BUN — the words, the box, the cell count the ladder settles on,
// every cell's home and its packing inside the largest cell, every counter text measured and keyed, the key, the
// colours and the states.
//
// Runs in Bun only.

import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { adjustToContrast, contrast, mix, NON_TEXT_CONTRAST_MIN, TEXT_CONTRAST_MIN } from "#shared/chart-beat/colour.mjs";
import { deriveFurniture } from "#shared/chart-beat/render-still.mjs";
import { frameInsetFor, sizeFor, videoExportSize } from "#shared/chart-video/sizes.mjs";
import { readDirection } from "#shared/design-base/read-direction.mjs";
import { EYEBROW_TO_DISPLAY, registerOf } from "#shared/design-base/register.mjs";
import { resolveDirectionFamilies } from "#shared/design-base/resolve-families.mjs";
import { applyCase } from "../../skills/chart-video/scripts/registers.mjs";
import { BAND_PROBE, bandOf, CREDIT_ONE_LINE, DRAWN_WIDER, haloOf, registerAt, sourceCreditFor, titleCardFor, verticalInsetFor, widthOf, wrap } from "../../skills/chart-video/scripts/shots.mjs";
import { videoRegistersOf } from "../../skills/chart-video/scripts/video-registers.mjs";
import { squarify } from "./layout.mjs";
import { gwText, paysText } from "./scene.mjs";
import { statesFor } from "./states.mjs";
import { loadSubject } from "./subject.mjs";
import { TREEMAP_VIDEO_TIMING } from "./timing-contract.ts";

const HERE = dirname(fileURLToPath(import.meta.url));
export const ROOT = join(HERE, "..", "..");
export const DIRECTIONS = join(ROOT, "docs", "design-base", "directions");
/** The size this run exports at — `--size`, landscape when nothing asks. R2 names three and
 *  everything under it already answered per size; only this line pinned the beat to one. */
export const SIZE = videoExportSize();
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

  const titleCard = titleCardFor({ registers, eyebrow: copy.eyebrow, title: copy.title, size: SIZE, eyebrowToDisplay: EYEBROW_TO_DISPLAY });

  const seam = Math.max(2, (direction.stroke?.rule ?? 1) * k * 2);
  const content = stage.width - 2 * inset;
  const swatchW = axisBand.ascent;
  const keyWord = measure(copy.key, axis);
  const creditIn = (room, forms) => sourceCreditFor({ registers, forms, size: SIZE, k, ...CREDIT_ONE_LINE, measure: room / content });
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

  /**
   * THE BOTTOM LINE, A LADDER OF TWO SEATS, AND THE BOX THAT STANDS ON IT.
   *
   * The first seat is one row — the credit at the left, the key at the right (one swatch, its word, the count of
   * tipped countries) — on one baseline. A 1080px frame does not hold both: measured 2026-09-23 at portrait and
   * at square, the key takes 611 of the 936px of content and leaves the credit 319, in which no form of the
   * source wraps. So the second rung stacks them — the key on its own baseline, the credit under it, both set
   * from the inset with the whole content width to wrap in. Landscape has room for the row and takes the first
   * rung, so nothing already delivered moves.
   *
   * This is measured per size of the cell words, not once, because the key's counter is set in the VALUE
   * register: smaller words make a narrower key, which leaves the credit more room and the box more height.
   */
  const seatFor = (v, vBand, forms) => {
    const counts = Object.fromEntries(Array.from({ length: subject.tipped.length + 1 }, (_, i) => paysText(i)).map((t) => [t, widthOf(applyCase(t, v.transform), v)]));
    const keyWidth = swatchW + gap / 2 + wider(keyWord.width) + gap + wider(Math.max(...Object.values(counts)));
    const besideX = stage.width - inset - keyWidth;
    let seat;
    try {
      seat = { keyX: besideX, stacked: false, credit: creditIn(besideX - 2 * gap - inset, forms) };
    } catch {
      // The row refused for want of room, so the key steps down to its own line rather than the source losing a
      // word. If the whole content width refuses too, that throw stands — it is the real one.
      seat = { keyX: inset, stacked: true, credit: creditIn(content, forms) };
    }
    const { register: sourceRegister, ...credit } = seat.credit;
    const creditAt = { x: inset, y: stage.height - vInset - credit.height };
    const baseline = seat.stacked ? creditAt.y - gap - Math.max(axisBand.descent, vBand.descent) : creditAt.y + credit.lines[0].y;
    // THE BOX: the whole frame above the bottom line.
    const box = { x: inset, y: vInset, w: content };
    box.h = Math.min(creditAt.y, baseline - Math.max(axisBand.ascent, vBand.ascent)) - gap - box.y;
    const key = {
      swatch: { x: seat.keyX, y: baseline - axisBand.ascent, w: swatchW, h: axisBand.ascent },
      word: { ...keyWord, x: seat.keyX + swatchW + gap / 2, y: baseline },
      countX: seat.keyX + swatchW + gap / 2 + wider(keyWord.width) + gap,
      countY: baseline,
    };
    return { counts, key, sourceRegister, credit, creditAt, box };
  };

  const sumCells = (list) => list.reduce((s, c) => s + c.mw, 0);
  /** Why the last rung of the ladder gave way, so a beat that runs out of rungs says which measurement ran out
   *  rather than which loop ended. */
  let lastWhy = "no cell count was tried";
  const refuse = (why) => {
    lastWhy = why;
    return null;
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
  const midlineFrom = ({ v, a, vBand, aBand, pad }, r, valueLines, nameLines, valueY, nameY) => {
    const mid = r.h / 2;
    const crossed = [
      ...valueLines.map((l, li) => ({ l, top: valueY + li * v.lead - vBand.ascent, bottom: valueY + li * v.lead + vBand.descent })),
      ...nameLines.map((l, li) => ({ l, top: nameY + li * a.lead - aBand.ascent, bottom: nameY + li * a.lead + aBand.descent })),
    ].filter((b) => b.top - gap / 2 <= mid && mid <= b.bottom + gap / 2);
    return crossed.length ? seam / 2 + pad + wider(Math.max(...crossed.map((b) => b.l.width))) + gap / 2 : 0;
  };
  const attempt = (count, ctx) => {
    const { v, a, vBand, aBand, pad, box } = ctx;
    const head = subject.countries.slice(0, count).map((c) => ({ ...c, countries: 1 }));
    const tail = subject.countries.slice(count);
    const tailThread = tail.filter((c) => c.tipped);
    const tailField = tail.filter((c) => !c.tipped);
    const drawn = [
      ...head,
      ...(tailThread.length ? [groupOf(tailThread, true, copy.tailThread(tailThread.length))] : []),
      ...(tailField.length ? [groupOf(tailField, false, copy.tailField(tailField.length))] : []),
    ].sort((x, y) => y.mw - x.mw);
    // A REMAINDER IS NEVER THE LARGEST CELL: the largest cell is the one the thread is measured against.
    if (drawn[0].key !== subject.biggest.key) return refuse(`at ${count} countries the remainder ${drawn[0].name} would be the largest cell, not ${subject.biggest.name}`);
    const rects = squarify(drawn.map((c) => (c.mw / subject.total) * box.w * box.h), box);
    const cells = [];
    for (const [i, c] of drawn.entries()) {
      const r = rects[i];
      const inner = { w: r.w - seam - 2 * pad, h: r.h - seam - 2 * pad };
      // The value on one line, or its number over its unit in a narrow cell.
      const valueLines = linesOf(valueOf(c.mw).replace(NB, " "), v, inner.w);
      const valueH = vBand.ascent + vBand.descent + (valueLines.length - 1) * v.lead;
      if (!(valueLines.length <= 2 && valueLines.every((l) => wider(l.width) <= inner.w) && valueH <= inner.h))
        return refuse(`at ${count} countries ${c.name}'s cell is ${Math.round(inner.w)}x${Math.round(inner.h)}px inside its padding, too small for « ${valueOf(c.mw)} » at ${v.fontSize}px`);
      const lines = linesOf(c.name, a, inner.w);
      const named = lines.length <= 2 && lines.every((l) => wider(l.width) <= inner.w) && valueH + gap / 2 + aBand.ascent + (lines.length - 1) * a.lead + aBand.descent <= inner.h;
      if (c.tipped && !named)
        return refuse(`at ${count} countries ${c.name}'s cell is ${Math.round(inner.w)}x${Math.round(inner.h)}px inside its padding, too small for « ${valueOf(c.mw)} » and its name at ${v.fontSize}/${a.fontSize}px`);
      const valueY = seam / 2 + pad + vBand.ascent;
      const nameY = valueY + (valueLines.length - 1) * v.lead + vBand.descent + gap / 2 + aBand.ascent;
      cells.push({
        key: c.key,
        name: c.name,
        mw: c.mw,
        tipped: c.tipped,
        countries: c.countries,
        share: c.newBuild / c.mw,
        rect: r,
        values: valueLines.map((l, li) => ({ ...l, dx: seam / 2 + pad, dy: valueY + li * v.lead, mid: valueY + li * v.lead - (vBand.ascent - vBand.descent) / 2 })),
        names: named ? lines.map((l, li) => ({ ...l, dx: seam / 2 + pad, dy: nameY + li * a.lead, mid: nameY + li * a.lead - (aBand.ascent - aBand.descent) / 2 })) : [],
        midlineFrom: midlineFrom(ctx, r, valueLines, named ? lines : [], valueY, nameY),
      });
    }

    // THE GATHER: the tipped cells pack into the lower part of the largest cell, a strip of the largest cell's width
    // whose area is their sum — below the largest cell's own words. Measured here, on this rung's own cells, because
    // it is the rung's layout that decides whether France's words leave the strip room; measured after the ladder had
    // settled it ended the beat at square instead of stepping (2026-09-23).
    const biggest = cells.find((c) => c.key === subject.biggest.key);
    if (!biggest || biggest.tipped) throw new Error(`${subject.biggest.name} is not drawn as a cell of its own, outside the thread`);
    const F = biggest.rect;
    const thread = cells.filter((c) => c.tipped);
    const stripH = F.h * (sumCells(thread) / biggest.mw);
    const strip = { x: F.x, y: F.y + F.h - stripH, w: F.w, h: stripH };
    const wordsBottom = F.y + (biggest.names.length ? biggest.names.at(-1).dy + aBand.descent : biggest.values.at(-1).dy + vBand.descent);
    if (!(wordsBottom + pad <= strip.y))
      return refuse(`at ${count} countries the gathered cells would cover ${biggest.name}'s own words: they end ${Math.round(wordsBottom - F.y)}px into a cell whose strip starts at ${Math.round(strip.y - F.y)}px`);
    const sum = measure(valueOf(sumCells(thread)), v);
    if (!(wider(sum.width) + 2 * pad <= strip.w))
      return refuse(`at ${count} countries the gathered sum « ${sum.text} » is ${Math.round(wider(sum.width))}px wide, wider than the ${Math.round(strip.w)}px strip it names`);
    const gather = { biggest, strip, thread, targets: squarify(thread.map((c) => c.rect.w * c.rect.h), strip), sum };
    return { cells, count, ctx, gather };
  };

  /**
   * THE WORDS IN THE CELLS ARE A LADDER TOO, AND IT IS THE OUTER ONE.
   *
   * Folding countries into the remainders is the only room the cell ladder had, and at 1920x1080 it is enough.
   * It is not at 1080: the same words are drawn 20 % larger there (typeScale 3.0 against 2.5, `sizes.mjs`)
   * inside a box less than half the area. Measured 2026-09-23 at square, the count cannot go under ten — below
   * that the field's remainder grows past France, which is the cell the thread is gathered into — and at ten
   * the thread's own remainder cell came out 163px wide against a « 17,0 GW » that wanted 166, so the value
   * broke onto a second line and the name under it no longer had the height. Every rung missed by two to nine
   * pixels.
   *
   * So the words step, the way `videoRegistersOf` steps a whole direction and `sourceCreditFor` steps the
   * credit: the value and the name come down TOGETHER, half a pixel at a time, each stopping at the size row's
   * floor and never under it. Together and not by one ratio, because the two registers do not reach the floor
   * at the same moment — at square the name lands on 36px while the value still has six pixels of room, and
   * those six are what put « 17,0 GW » back on one line. What the step protects is the order that carries the
   * reading, the value drawn larger than the name beneath it; a rung that would invert it is passed over.
   *
   * The first rung is the registers themselves, which is where landscape holds, so nothing already delivered
   * moves. The key's counter is set in the value register and steps with the cells, which is why the seat and
   * the box are rebuilt on each rung rather than measured once above the ladder.
   *
   * What does NOT step: the eyebrow and the display, which belong to the title card, and the axis, which is the
   * key's own word. A name at the floor is therefore drawn a little under the key's word at square — the floor
   * is the rule that may not bend.
   */
  /** THE CREDIT'S FORMS ARE THE OUTERMOST RUNG. `copy.source` is already a give-way ladder — each form says
   *  less than the one before it — and at a narrow frame the two lines the shared budget hands a credit are
   *  two lines the picture does not get. So a rung drops the richest form still standing, which is what lets
   *  the source settle on one line and hands the box back the rest. The first rung holds every form, which is
   *  where landscape settles. */
  const creditLadder = copy.source.map((_, i) => copy.source.slice(i));
  const cellSteps = Math.max(0, Math.round((Math.max(value.fontSize, annot.fontSize) - row.minTypePx) * 2));
  let laid = null;
  for (const forms of creditLadder) {
    for (let step = 0; step <= cellSteps && !laid; step++) {
      const vSize = Math.max(row.minTypePx, Math.round((value.fontSize - step / 2) * 4) / 4);
      const aSize = Math.max(row.minTypePx, Math.round((annot.fontSize - step / 2) * 4) / 4);
      if (vSize < aSize) continue; // the value is never drawn smaller than the name it stands over
      const v = vSize === value.fontSize ? value : registerAt(value, vSize);
      const a = aSize === annot.fontSize ? annot : registerAt(annot, aSize);
      const vBand = bandOf(BAND_PROBE, v);
      const seat = seatFor(v, vBand, forms);
      const ctx = { v, a, vBand, aBand: bandOf(BAND_PROBE, a), pad: 0.3 * v.fontSize, box: seat.box, seat };
      for (const count of COUNTS) if ((laid = attempt(Math.min(count, subject.countries.length), ctx))) break;
    }
    if (laid) break;
  }
  if (!laid)
    throw new Error(`no rung of the cell ladder holds at ${SIZE}, down to the ${row.minTypePx}px floor — ${lastWhy}`);
  const { cells } = laid;
  const { v: cellValue, a: cellName, vBand: valueBand, aBand: annotBand, pad } = laid.ctx;
  const { counts, key, sourceRegister, credit, creditAt, box } = laid.ctx.seat;
  const valueCounts = Object.fromEntries(Array.from({ length: Math.round(subject.total / 1000) + 1 }, (_, n) => gwText(n)).map((t) => [t, widthOf(applyCase(t, cellValue.transform), cellValue)]));
  if (Math.abs(sumCells(cells) - subject.total) > 1e-6) throw new Error("the drawn cells do not add up to the whole");
  if (cells.filter((c) => c.tipped).reduce((s, c) => s + c.countries, 0) !== subject.tipped.length) throw new Error("the thread's cells do not hold every tipped country");

  // THE GATHER, as the settled rung measured it.
  const { biggest, strip, thread, targets, sum } = laid.gather;

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
    registers: { display: titleCard.register, eyebrow: registers.eyebrow, value: cellValue, annot: cellName, axis, source: sourceRegister },
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
    halo: haloOf(cellName, k),
    strokes: { seam: r1(seam), ring: r1((direction.stroke?.rule ?? 1) * k * 1.4), midline: r1(Math.max(1.5, (direction.stroke?.rule ?? 1) * k)) },
    states,
    timing: TREEMAP_VIDEO_TIMING,
  };
  return {
    id,
    direction,
    props,
    report: { k, titleForm: titleCard.form, sourceForm: credit.form, count: laid.count, drawn: cells.length, named: cells.filter((c) => c.names.length).length, cellWords: cellValue.fontSize, into: (sumCells(thread) / biggest.mw).toFixed(3) },
  };
}
