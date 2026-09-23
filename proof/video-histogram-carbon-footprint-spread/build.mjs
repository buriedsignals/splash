// EVERYTHING ONE DIRECTION'S RENDER IS HANDED, BUILT IN BUN — the words, the ten bins on one count scale from zero, each
// country's tick along the tonnes axis and its cell in its bin, the tail's targets on the 4–8 bin, every text the
// column's counter passes through, the tenths of the 213, the colours and the states.
//
// Runs in Bun only.

import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
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
import { BIN_WIDTH, loadSubject, THRESHOLD } from "./subject.mjs";
import { HISTOGRAM_VIDEO_TIMING } from "./timing-contract.ts";

const HERE = dirname(fileURLToPath(import.meta.url));
export const ROOT = join(HERE, "..", "..");
export const DIRECTIONS = join(ROOT, "docs", "design-base", "directions");
/** The size this run exports at — `--size`, landscape when nothing asks. R2 names three and
 *  everything under it already answered per size; only this line pinned the beat to one. */
export const SIZE = videoExportSize();
export const REGISTER_NAMES = ["display", "eyebrow", "body", "annot", "value", "axis"];
const NB = "\u00A0";
const LABEL_GAP = 0.4;
/** The static plate's separation between bins: a share of the bin, not a constant. */
const BIN_SEPARATION = 0.03;
const TICK_STEP = 20;
/** A country's tick: this many axis bands tall. */
const RUG_BANDS = 1.2;

export function loadBeat() {
  const subject = loadSubject();
  return { subject, states: statesFor(), copy: copyOf(subject) };
}

export function copyOf(subject) {
  return {
    eyebrow: `Climat${NB}· Monde`,
    title: [`${subject.share} pays sur 10 émettent moins de ${THRESHOLD}${NB}tonnes de CO₂ par personne`, `${subject.share} pays sur 10 sous ${THRESHOLD}${NB}tonnes de CO₂ par personne`],
    binName: (b) => (b.open ? `${b.lo}+` : `${b.lo}–${b.hi}`),
    /** The same bin named by its lower edge — the ordinary histogram axis, half the range's width. */
    binEdge: (b) => (b.open ? `${b.lo}+` : `${b.lo}`),
    source: ["Source : Global Carbon Budget (2025), via Our World in Data", "Source : Global Carbon Budget, via Our World in Data"],
  };
}

export function textPerRegisterOf(copy, subject) {
  return {
    display: copy.title.join(" "),
    eyebrow: copy.eyebrow,
    body: copy.source.join(" "),
    annot: "",
    value: `${subject.bins.map((b) => b.count).join(" ")} 0123456789`,
    axis: `${subject.bins.map(copy.binName).join(" ")} ${subject.bins.map(copy.binEdge).join(" ")} 0 20 40 60 80 100 120 140 ${copy.source.join(" ")}`,
  };
}

const overlaps = (a, b) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;

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
  const { axis } = registers;
  const measure = (t, r) => {
    const cased = applyCase(t, r.transform);
    return { text: cased, width: widthOf(cased, r) };
  };
  const drawn = (w) => w * (1 + DRAWN_WIDER);
  const gap = LABEL_GAP * axis.lead;
  const labelGap = gap / 2;
  const band = bandOf(BAND_PROBE, axis);
  const boxOf = (line, b) => ({ x: line.x, y: line.y - b.ascent, w: drawn(line.width), h: b.ascent + b.descent });

  const titleCard = titleCardFor({ registers, eyebrow: copy.eyebrow, title: copy.title, size: SIZE, eyebrowToDisplay: EYEBROW_TO_DISPLAY });
  const { register: sourceRegister, ...credit } = sourceCreditFor({ registers, forms: copy.source, size: SIZE, k, ...CREDIT_ONE_LINE });
  const creditAt = { x: inset, y: stage.height - vInset - credit.height };

  // THE HORIZONTAL: the ticks at the left, ten bins across the rest. It is measured BEFORE the vertical
  // because the bar's width is what the counter over it is sized against, below.
  const most = Math.max(...subject.bins.map((b) => b.count));
  const topTick = Math.ceil(most / TICK_STEP) * TICK_STEP;
  const ticks = Array.from({ length: topTick / TICK_STEP + 1 }, (_, i) => i * TICK_STEP);
  const tickWords = ticks.map((t) => measure(String(t), axis));
  const tickRoom = drawn(Math.max(...tickWords.map((w) => w.width)));
  const left = inset + tickRoom + gap;
  const right = stage.width - inset;
  const binBand = (right - left) / subject.bins.length;
  const barW = binBand - Math.max(1, binBand * BIN_SEPARATION);
  const centred = (word, x, y) => ({ ...word, x: x - drawn(word.width) / 2, y });

  // THE COUNTER'S SIZE IS A LADDER AGAINST ITS OWN BAR. Every number this beat draws — the 127 over the
  // first bin and every count the tail's column passes through — stands centred over a bar, and a
  // counter wider than its bar reaches past the 4-tonne cut beside it and knocks a hole in the rule
  // with its own halo. Landscape gives the bar 162px and « 127 » wants 77, so the register's own size
  // holds; square and portrait give it 82px and « 127 » wants 92 (measured 2026-09-23), so the size
  // steps down by half pixels — never to the type floor, which is where this stops and refuses. A
  // counter inside its bar is also what keeps it clear of the cut: the cut sits (binBand + barW) / 2
  // from the bar's left edge, and a word no wider than the bar ends at barW.
  const counted = [String(subject.under), ...Array.from({ length: subject.total - subject.under - subject.bins[1].count + 1 }, (_, i) => String(subject.bins[1].count + i))];
  const widestCount = (r) => Math.max(...counted.map((t) => drawn(widthOf(applyCase(t, r.transform), r))));
  let value = registers.value;
  for (let quarter = Math.floor(registers.value.fontSize * 4); widestCount(value) > barW && quarter / 4 > row.minTypePx; quarter -= 2)
    value = registerAt(registers.value, Math.max(row.minTypePx, (quarter - 2) / 4));
  if (widestCount(value) > barW)
    throw new Error(`a count wants ${widestCount(value).toFixed(1)}px over a ${barW.toFixed(1)}px bar, and the counter is already at the ${row.minTypePx}px floor`);
  const valueBand = bandOf(BAND_PROBE, value);

  // THE VERTICAL: the credit at the bottom, the bin names over it, the zero line over them; the scale the largest that
  // holds the top tick's word and the first bin's count under the frame's top margin.
  const namesBaseline = creditAt.y - gap - band.descent;
  const baseline = namesBaseline - band.ascent - gap;
  const shift = (band.ascent - band.descent) / 2;
  const unit = Math.min((baseline - vInset - band.ascent + shift) / topTick, (baseline - vInset - valueBand.ascent - valueBand.descent - labelGap) / most);
  const yOf = (v) => baseline - v * unit;
  const tickLines = ticks.map((t, i) => ({ value: t, y: yOf(t), label: { ...tickWords[i], x: inset + tickRoom - drawn(tickWords[i].width), y: yOf(t) + shift } }));

  // THE X AXIS'S NAMING IS A LADDER, NOT A FORM. Ten bins across 1824px of landscape content give each
  // name 152px of room and the widest range « 12–16 » wants 109; the same ten across the 936px a square
  // or a portrait frame offers give 66px, and the widest range wants 131 (measured 2026-09-23, all three
  // directions). The range form is not too wide — the frame is too narrow — so the naming steps instead
  // of the assertion bending: every bin as a range, then every bin as its lower edge (the ordinary
  // histogram axis, which is what the ticks between bins mean anyway), then one bin in two, in three,
  // and so on. The kept set is anchored on the LAST bin, so the open « 40+ » and the 4-tonne cut the beat
  // argues from are named at every rung. Landscape holds at the first rung, so nothing delivered moves.
  const NAMING = [{ name: copy.binName, stride: 1 }, ...[1, 2, 3, 4, 5].map((stride) => ({ name: copy.binEdge, stride }))];
  const kept = (i, stride) => (subject.bins.length - 1 - i) % stride === 0;
  const widestOf = ({ name, stride }) => Math.max(...subject.bins.filter((_, i) => kept(i, stride)).map((b) => drawn(widthOf(applyCase(name(b), axis.transform), axis))));
  const naming = NAMING.find((rung) => widestOf(rung) <= rung.stride * binBand - gap);
  if (!naming)
    throw new Error(
      `no naming of the ${subject.bins.length} bins holds under them at ${binBand.toFixed(1)}px a bin: ` +
        NAMING.map((rung) => `1 in ${rung.stride} of « ${applyCase(rung.name(subject.bins[0]), axis.transform)} » wants ${widestOf(rung).toFixed(1)}px of ${(rung.stride * binBand - gap).toFixed(1)}px`).join("; "),
    );
  const bins = subject.bins.map((b, i) => {
    const x = left + binBand * i;
    const name = kept(i, naming.stride) ? centred(measure(naming.name(b), axis), x + barW / 2, namesBaseline) : null;
    return { lo: b.lo, hi: b.hi, open: b.open, count: b.count, x, centre: x + barW / 2, name };
  });

  // EVERY COUNTRY: a tick at its tonnes inside its own bin (the open bin's tail held inside its bar), then a cell.
  const rug = { w: direction.stroke?.rule ? direction.stroke.rule * k * 1.5 : 1.5 * k, h: RUG_BANDS * (band.ascent + band.descent) };
  const countries = subject.countries.map((c) => {
    const bin = bins[c.bin];
    const within = Math.min(1, Math.max(0, (c.value - bin.lo) / BIN_WIDTH));
    return { name: c.name, value: c.value, bin: c.bin, j: c.j, tickX: bin.x + rug.w / 2 + (barW - rug.w) * within };
  });

  // THE TAIL: the bins past the cut, in order, each set on the ones before it on the 4–8 bin.
  const base = bins.map(() => 0);
  let running = bins[1].count;
  const moving = [];
  for (let i = 2; i < bins.length; i++) {
    base[i] = running;
    if (bins[i].count > 0) moving.push(i);
    running += bins[i].count;
  }
  const tailTotal = running;
  if (tailTotal + subject.under !== subject.total) throw new Error(`the tail holds ${tailTotal}, the cut leaves ${subject.total - subject.under}`);
  for (const i of moving) for (let p = 2; p < i; p++) if (!(bins[p].count <= base[i])) throw new Error(`bin ${i} would slide through bin ${p}`);
  const tailCounts = {};
  for (let t = bins[1].count; t <= tailTotal; t++) tailCounts[String(t)] = measure(String(t), value);
  if (!(drawn(Math.max(...Object.values(tailCounts).map((c) => c.width))) <= barW)) throw new Error("a column count does not hold over its bin");

  // TENTHS OF THE 213: seams at every tenth under each column's nearest whole number of tenths.
  const tenth = subject.total / 10;
  const seamsUnder = (height) => Array.from({ length: Math.round(height / tenth) - 1 }, (_, m) => (m + 1) * tenth);
  const seams = { left: seamsUnder(subject.under), right: seamsUnder(tailTotal) };
  if (seams.left.length + 1 !== subject.share) throw new Error(`the first column cuts into ${seams.left.length + 1} tenths, the title says ${subject.share}`);
  if (seams.left.length + seams.right.length + 2 !== 10) throw new Error("the two columns do not make ten tenths");

  // THE CUT, in the separation between the first two bins, and the first bin's count.
  const cut = { x: bins[1].x - (binBand - barW) / 2, top: yOf(topTick) };
  const share = { count: subject.under, label: centred(measure(String(subject.under), value), bins[0].centre, yOf(subject.under) - labelGap - valueBand.descent) };

  // WHAT THE LAST SHOT HOLDS, asserted apart: no word on a bar or on another word, nothing above the top margin.
  const barBoxes = bins.map((b) => ({ what: `the ${copy.binName(b)} bin`, x: b.x, y: yOf(b.count), w: barW, h: b.count * unit }));
  const words = [
    { what: `« ${share.label.text} »`, box: boxOf(share.label, valueBand) },
    ...[...bins.map((b) => b.name).filter(Boolean), ...tickLines.map((t) => t.label)].map((l) => ({ what: `« ${l.text} »`, box: boxOf(l, band) })),
    { what: "the credit", box: { x: creditAt.x, y: creditAt.y, w: credit.width, h: credit.height } },
  ];
  words.forEach((a, i) => {
    if (a.box.y < vInset - gap) throw new Error(`${a.what} rises above the frame's top margin`);
    for (const b of words.slice(i + 1)) if (overlaps(a.box, b.box)) throw new Error(`${a.what} runs into ${b.what}`);
    for (const bar of barBoxes) if (overlaps(a.box, bar)) throw new Error(`${a.what} runs into ${bar.what}`);
    if (overlaps(a.box, { x: cut.x - 1, y: cut.top, w: 2, h: baseline - cut.top })) throw new Error(`${a.what} runs into the cut`);
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
    zero: walked(muted, NON_TEXT_CONTRAST_MIN, "the zero line"),
    bar: walked(muted, NON_TEXT_CONTRAST_MIN, "a bin"),
    cut: walked(accent, NON_TEXT_CONTRAST_MIN, "the cut"),
    text: {
      eyebrow: walked(registers.eyebrow.fill ?? accent, TEXT_CONTRAST_MIN, "the eyebrow"),
      title: walked(registers.display.fill ?? ink, TEXT_CONTRAST_MIN, "the title"),
      name: walked(ink, TEXT_CONTRAST_MIN, "a bin name"),
      axis: walked(muted, TEXT_CONTRAST_MIN, "a muted word"),
      count: walked(ink, TEXT_CONTRAST_MIN, "a count"),
      share: walked(accent, TEXT_CONTRAST_MIN, "the first bin's count"),
    },
  };

  const rule = direction.stroke?.rule ?? 1;
  const props = {
    frame: stage,
    registers: { display: titleCard.register, eyebrow: registers.eyebrow, value, axis, source: sourceRegister },
    titleCard,
    credit: { ...credit, at: creditAt },
    colours,
    baseline,
    unit,
    barW,
    plot: { left, right },
    rug,
    bins,
    countries,
    ticks: tickLines,
    tail: { moving, base },
    tailCounts,
    labelGap,
    valueDescent: valueBand.descent,
    tenth,
    seams,
    cut,
    share,
    strokes: { grid: rule * k, zero: rule * k * 1.4, seam: rule * k * 2.5, cut: Math.min(rule * k * 2.5, (binBand - barW) * 0.9) },
    halo: { value: haloOf(value, k), axis: haloOf(axis, k) },
    states,
    timing: HISTOGRAM_VIDEO_TIMING,
  };
  return { id, direction, props, report: { k, titleForm: titleCard.form, sourceForm: credit.form, unit: unit.toFixed(3), binBand: binBand.toFixed(1), naming: `1 in ${naming.stride}` } };
}
