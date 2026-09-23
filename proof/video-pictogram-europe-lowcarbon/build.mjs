// EVERYTHING ONE DIRECTION'S RENDER IS HANDED, BUILT IN BUN — the words, the axis of twenty 5-point columns, each country's
// seat in its column and its slot in its block, the gap the axis parts by, every text a block's counter passes through,
// the ring, the colours and the states.
//
// Runs in Bun only.

import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { adjustToContrast, mix, NON_TEXT_CONTRAST_MIN, TEXT_CONTRAST_MIN } from "#shared/chart-beat/colour.mjs";
import { deriveFurniture } from "#shared/chart-beat/render-still.mjs";
import { frameInsetFor, sizeFor, videoExportSize } from "#shared/chart-video/sizes.mjs";
import { readDirection } from "#shared/design-base/read-direction.mjs";
import { EYEBROW_TO_DISPLAY, registerOf } from "#shared/design-base/register.mjs";
import { resolveDirectionFamilies } from "#shared/design-base/resolve-families.mjs";
import { applyCase } from "../../skills/chart-video/scripts/registers.mjs";
import { BAND_PROBE, bandOf, CREDIT_ONE_LINE, DRAWN_WIDER, haloOf, sourceCreditFor, titleCardFor, verticalInsetFor, widthOf } from "../../skills/chart-video/scripts/shots.mjs";
import { videoRegistersOf } from "../../skills/chart-video/scripts/video-registers.mjs";
import { CUT_WORDS_FROM, layoutAt } from "./scene.mjs";
import { statesFor } from "./states.mjs";
import { BREAKS, COLUMNS, HIGH, LOW, loadSubject, STEP } from "./subject.mjs";
import { PICTOGRAM_VIDEO_TIMING } from "./timing-contract.ts";

const HERE = dirname(fileURLToPath(import.meta.url));
export const ROOT = join(HERE, "..", "..");
export const DIRECTIONS = join(ROOT, "docs", "design-base", "directions");
/** The size this run exports at — `--size`, landscape when nothing asks. R2 names three and
 *  everything under it already answered per size; only this line pinned the beat to one. */
export const SIZE = videoExportSize();
export const REGISTER_NAMES = ["display", "eyebrow", "body", "annot", "value", "axis"];
const NB = "\u00A0";
const LABEL_GAP = 0.4;
/** The static plate's separation between squares: a share of the cell. */
const SEPARATION = 0.14;
/** The gap the axis parts by at each cut, in cells. */
const SPLIT_CELLS = 2;
/** The ring's padding over and under its word, as a share of the value register's size; its round ends clear the word. */
const RING_PAD = 0.2;
/** The gap between two blocks once the parts close, in the closed cells. */
const CLOSED_GAP_CELLS = 3;

export function loadBeat() {
  const subject = loadSubject();
  return { subject, states: statesFor(), copy: copyOf(subject) };
}

export function copyOf(subject) {
  return {
    eyebrow: `Énergie${NB}· Europe`,
    title: [`L’Europe électrique est aux deux bouts${NB}: ${subject.counts[1]}${NB}pays seulement au milieu`, `Aux deux bouts, ${subject.counts[1]}${NB}pays au milieu`],
    count: (n) => `${n}${NB}pays`,
    zero: `0${NB}%`,
    /** THE AXIS'S FAR END IS A MEASURE, NOT A STRING. It shares one line with « 0 % » and the two cut words, and the line is
     *  the axis's own width: 1750px at 1920 holds the unit spelled out, 936px at 1080 does not — measured 2026-09-23, where
     *  « 100 % bas-carbone » ran into « 60 % » the moment the axis parted. The forms are tried in order and the first that
     *  clears every word at every moment is the one drawn; landscape takes the first, so nothing delivered moves. */
    hundred: [`100${NB}% bas-carbone`, `100${NB}%`],
    cuts: [`${LOW}${NB}%`, `${HIGH}${NB}%`],
    source: [
      "Source : Ember, Energy Institute – Statistical Review of World Energy (2025), via Our World in Data",
      "Source : Ember, Energy Institute, via Our World in Data",
    ],
  };
}

export function textPerRegisterOf(copy, subject) {
  return {
    display: copy.title.join(" "),
    eyebrow: copy.eyebrow,
    body: copy.source.join(" "),
    annot: "",
    value: `${subject.counts.map(copy.count).join(" ")} 0123456789`,
    axis: `${copy.zero} ${copy.hundred.join(" ")} ${copy.cuts.join(" ")} ${copy.source.join(" ")}`,
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
  const { axis, value } = registers;
  const rule = direction.stroke?.rule ?? 1;
  const measure = (t, r) => {
    const cased = applyCase(t, r.transform);
    return { text: cased, width: widthOf(cased, r) };
  };
  const drawn = (w) => w * (1 + DRAWN_WIDER);
  const gapText = LABEL_GAP * axis.lead;
  const band = bandOf(BAND_PROBE, axis);
  const valueBand = bandOf(BAND_PROBE, value);
  const boxOf = (line, b) => ({ x: line.x, y: line.y - b.ascent, w: drawn(line.width), h: b.ascent + b.descent });

  const titleCard = titleCardFor({ registers, eyebrow: copy.eyebrow, title: copy.title, size: SIZE, eyebrowToDisplay: EYEBROW_TO_DISPLAY });
  const { register: sourceRegister, ...credit } = sourceCreditFor({ registers, forms: copy.source, size: SIZE, k, ...CREDIT_ONE_LINE });
  const creditAt = { x: inset, y: stage.height - vInset - credit.height };

  // THE CELL: the largest that lays the twenty columns and both gaps across the content width, and stands the tallest column,
  // its count over it and the axis words under it between the top margin and the credit.
  const above = gapText + valueBand.ascent + valueBand.descent;
  const below = gapText + band.ascent + band.descent;
  /** The picture keeps a lead of air over the credit. */
  const room = creditAt.y - axis.lead - vInset;
  /** The ring stands over the middle's count: its reach is room the closed picture keeps above it. */
  const ringReach = RING_PAD * value.fontSize + rule * k * 2.5;

  // HOW DEEP A BLOCK STACKS IS A LADDER, NOT THE TALLEST COLUMN OF THE AXIS.
  //
  // The axis's own picture is as tall as its tallest five-point column — six countries — and that is data. How deep the
  // three blocks stack once the parts gather is not: eighteen countries are three columns of six, or two of nine, or one
  // of eighteen, and each shape asks the frame for a different rectangle. Six was the right depth for 1920x1080, where
  // the closed picture came out 936x432. At 1080x1920 the same six leave a 432px band adrift in 1617px of frame
  // (measured 2026-09-23) — the drawing is not wrong, it is a strip in the middle of nothing.
  //
  // So the depth is stepped and the one that draws the LARGEST SQUARE wins: a square is the unit this form counts in, and
  // the largest square is the shape that fills its frame. The step starts at the axis's own tallest column and only rises
  // where rising strictly wins, so 1920x1080 keeps the six it was cut with.
  const deepest = Math.max(...subject.counts);
  const cellFAt = (r) => {
    const units = subject.counts.reduce((t, n) => t + Math.ceil(n / r), 0) + 2 * CLOSED_GAP_CELLS;
    return Math.min((stage.width - 2 * inset) / units, (room - ringReach - above - below) / r);
  };
  let rows = subject.tallest;
  for (let r = subject.tallest + 1; r <= deepest; r++) if (cellFAt(r) > cellFAt(rows)) rows = r;
  const cell = Math.min((stage.width - 2 * inset) / (COLUMNS + 2 * SPLIT_CELLS), (room - above - below) / rows);
  const gap = SPLIT_CELLS * cell;
  const inner = (cell * SEPARATION) / 2;
  const side = cell - 2 * inner;
  const span = cell * (COLUMNS + 2 * SPLIT_CELLS);
  const left = inset + (stage.width - 2 * inset - span) / 2;
  const right = left + span;
  const axisLeft = left + gap;
  const axisRight = right - gap;
  const block = rows * cell + above + below;
  const baseline = vInset + (room - block) / 2 + above + rows * cell;
  const shift = [-gap, 0, gap];

  // EVERY COUNTRY'S SEAT: its 5-point column, stacked from the axis.
  const seatOf = (c) => ({ x: axisLeft + c.column * cell + inner, y: baseline - (c.row + 1) * cell + inner });

  // THE CUTS: at the column edge before the axis parts, in the middle of their gap after it.
  const lowCol = LOW / STEP;
  const highCol = HIGH / STEP;
  const cuts = [
    { from: axisLeft + lowCol * cell, to: axisLeft + lowCol * cell - gap / 2 },
    { from: axisLeft + highCol * cell, to: axisLeft + highCol * cell + gap / 2 },
  ];

  // THE BLOCKS: columns of `rows` squares from each part's anchor — the left edge, the right edge, the middle between the
  // cuts — each part's squares taken in the order of their distance from it, each slot in its column bottom up.
  const anchors = [
    { edge: left, dir: 1 },
    { centre: (cuts[0].to + cuts[1].to) / 2 },
    { edge: right, dir: -1 },
  ];
  const seatCentre = (c) => axisLeft + shift[c.block] + (c.column + 0.5) * cell;
  const ordered = [0, 1, 2].map((b) => {
    const members = subject.countries.map((c, i) => ({ c, i })).filter(({ c }) => c.block === b);
    const a = anchors[b];
    const distance = ({ c }) => (a.centre === undefined ? Math.abs(seatCentre(c) - a.edge) : Math.abs(seatCentre(c) - a.centre));
    return members.sort((p, q) => distance(p) - distance(q) || p.c.row - q.c.row || p.c.column - q.c.column);
  });
  const slots = new Array(subject.countries.length);
  const orderOf = new Array(subject.countries.length);
  ordered.forEach((members, b) => {
    const columns = Math.ceil(members.length / rows);
    const a = anchors[b];
    const columnX = (j) => {
      if (a.centre === undefined) return a.dir === 1 ? a.edge + j * cell : a.edge - (j + 1) * cell;
      // from the middle out, alternating sides
      const offsets = Array.from({ length: columns }, (_, n) => n - (columns - 1) / 2).sort((p, q) => Math.abs(p) - Math.abs(q) || p - q);
      return a.centre + (offsets[j] - 0.5) * cell;
    };
    members.forEach(({ i }, kk) => {
      slots[i] = { x: columnX(Math.floor(kk / rows)) + inner, y: baseline - ((kk % rows) + 1) * cell + inner };
      orderOf[i] = kk;
    });
    const xs = members.map(({ i }) => slots[i].x);
    if (b === 0 && !(Math.max(...xs) + side < cuts[0].to)) throw new Error("the block under 60 % runs past its cut");
    if (b === 1 && !(Math.min(...xs) > cuts[0].to && Math.max(...xs) + side < cuts[1].to)) throw new Error("the middle block runs past a cut");
    if (b === 2 && !(Math.min(...xs) > cuts[1].to)) throw new Error("the block from 75 % runs past its cut");
  });

  const squares = subject.countries.map((c, i) => ({ code: c.code, block: c.block, k: orderOf[i], share: c.share, classIndex: c.classIndex, ...seatOf(c) }));
  const most = Math.max(...subject.counts);

  // THE COUNTS: over each block, above the tallest column any part can stand, every text it passes through measured.
  const counterLift = rows * cell + gapText + valueBand.descent;
  const extentOf = (b, at) => {
    const xs = ordered[b].map(({ i }) => at[i].x);
    return { from: Math.min(...xs), to: Math.max(...xs) };
  };
  const counterWords = subject.counts.map((count) => {
    const words = {};
    for (let n = 0; n <= count; n++) words[String(n)] = measure(copy.count(n), value);
    return words;
  });

  // THE PICTOGRAM THE PARTS CLOSE INTO: the three blocks brought together, a cut in the middle of each gap, every square
  // magnified by one factor about its block's corner — the cell the largest that stands the blocks, their counts and the
  // words between the top margin and the credit.
  const blockColumns = subject.counts.map((n) => Math.ceil(n / rows));
  const units = blockColumns.reduce((t, n) => t + n, 0) + 2 * CLOSED_GAP_CELLS;
  const cellF = Math.min((stage.width - 2 * inset) / units, (room - ringReach - above - below) / rows);
  const innerF = (cellF * SEPARATION) / 2;
  const sideF = cellF - 2 * innerF;
  const gapF = CLOSED_GAP_CELLS * cellF;
  const baselineF = vInset + (room - (rows * cellF + ringReach + above + below)) / 2 + ringReach + above + rows * cellF;
  const blockX = [];
  blockColumns.reduce((x, n, b) => {
    blockX.push(x);
    return x + n * cellF + gapF;
  }, (stage.width - units * cellF) / 2);
  const finals = subject.countries.map((c, i) => {
    const b = c.block;
    const column = Math.round((slots[i].x - inner - extentOf(b, slots).from + inner) / cell);
    const level = Math.round((baseline - slots[i].y + inner) / cell);
    return { x: blockX[b] + column * cellF + innerF, y: baselineF - level * cellF + innerF };
  });
  const segments = [
    { from: [axisLeft, cuts[0].from], final: [blockX[0], blockX[0] + blockColumns[0] * cellF + cellF / 2] },
    { from: [cuts[0].from, cuts[1].from], final: [blockX[1] - cellF / 2, blockX[1] + blockColumns[1] * cellF + cellF / 2] },
    { from: [cuts[1].from, axisRight], final: [blockX[2] - cellF / 2, blockX[2] + blockColumns[2] * cellF] },
  ];
  const cutsAll = cuts.map((c, n) => ({ ...c, final: blockX[n] + blockColumns[n] * cellF + gapF / 2, top: baseline - rows * cell, topF: baselineF - rows * cellF }));
  // A COUNT IS CENTRED ON ITS BLOCK AND PULLED BACK INSIDE THE FRAME. Measured 2026-09-23: at 1080 the first block stands
  // four columns wide against the left margin, so « 18 pays » centred on it hangs 17px off the frame. The pull-back is
  // measured on the WIDEST word the counter ever shows, so a count does not shuffle sideways as it climbs. Nothing moves
  // at 1920, where no count reaches a margin.
  const counters = subject.counts.map((count, b) => {
    const e = extentOf(b, slots);
    const f = extentOf(b, finals);
    const half = Math.max(...Object.values(counterWords[b]).map((w) => drawn(w.width))) / 2;
    const held = (x) => Math.min(Math.max(x, inset + half), stage.width - inset - half);
    return { count, centre: held((e.from + e.to + side) / 2), centreF: held((f.from + f.to + sideF) / 2), words: counterWords[b] };
  });

  // THE AXIS WORDS.
  const wordsLift = gapText + band.ascent;
  const zero = measure(copy.zero, axis);
  const cutWords = copy.cuts.map((t) => {
    const w = measure(t, axis);
    return { ...w, half: drawn(w.width) / 2 };
  });
  const counterLiftF = rows * cellF + gapText + valueBand.descent;
  const layoutOf = (ends) => ({ baseline, baselineF, shift, segments, cuts: cutsAll, ends, cutWords, wordsLift, counters, counterLift, counterLiftF, cell, cellF, side, sideF });
  const endsFor = (hundred) => ({
    zero: { ...zero, x: axisLeft, finalX: blockX[0] },
    hundred: { ...hundred, x: axisRight - drawn(hundred.width), finalX: blockX[2] + blockColumns[2] * cellF - drawn(hundred.width) },
  });

  // THE RING round the middle's count, where the pictogram closes.
  const middle = counterWords[1][String(subject.counts[1])];
  const ringH = valueBand.ascent + valueBand.descent + 2 * RING_PAD * value.fontSize;
  const ring = { x: counters[1].centreF - drawn(middle.width) / 2 - ringH / 2, y: baselineF - counterLiftF - valueBand.ascent - RING_PAD * value.fontSize, w: drawn(middle.width) + ringH, h: ringH };
  if (!(ring.y + ring.h < baselineF - rows * cellF)) throw new Error("the ring reaches down to the squares");

  // EVERY WORD CLEAR OF EVERY OTHER, the frame's margins held: as the axis parts (a cut's word arriving once it has parted
  // far enough, `CUT_WORDS_FROM`), with the counts over the gathered parts, and as the parts close into the pictogram.
  const moments = [
    ...[0, CUT_WORDS_FROM, 1].map((split) => ({ split, close: 0, counts: false })),
    ...[0, 0.25, 0.5, 0.75, 1].map((close) => ({ split: 1, close, counts: true })),
  ];
  const clashesFor = (hundred, layout) => {
  for (const m of moments) {
    const at = layoutAt(layout, m.split, m.close);
    const words = [
      { what: `« ${zero.text} »`, box: boxOf({ ...zero, ...at.ends.zero }, band) },
      { what: `« ${hundred.text} »`, box: boxOf({ ...hundred, ...at.ends.hundred }, band) },
      ...(m.split >= CUT_WORDS_FROM ? cutWords.map((w, n) => ({ what: `« ${w.text} »`, box: boxOf({ ...w, ...at.cutWords[n] }, band) })) : []),
      ...(m.counts ? counters.map((c, b) => {
        const w = c.words[String(c.count)];
        return { what: `« ${w.text} »`, box: boxOf({ ...w, x: at.counters[b].x - drawn(w.width) / 2, y: at.counters[b].y }, valueBand) };
      }) : []),
      ...(m.close === 1 ? [{ what: "the ring", box: ring }] : []),
      { what: "the credit", box: { x: creditAt.x, y: creditAt.y, w: credit.width, h: credit.height } },
    ];
    for (const [i, a] of words.entries()) {
      if (a.box.y < vInset) return `${a.what} rises above the frame's top margin`;
      if (a.box.x < inset - 1 || a.box.x + a.box.w > stage.width - inset + 1) return `${a.what} runs past the side margin`;
      for (const b of words.slice(i + 1))
        if (!(b.what === "the ring" && a.what.includes(middle.text)) && overlaps(a.box, b.box)) return `${a.what} runs into ${b.what} (split ${m.split}, close ${m.close})`;
    }
  }
    return null;
  };
  let chosen = null;
  const refusedForms = [];
  for (const [form, text] of copy.hundred.entries()) {
    const hundred = measure(text, axis);
    const layout = layoutOf(endsFor(hundred));
    const clash = clashesFor(hundred, layout);
    if (!clash) {
      chosen = { form, hundred, layout };
      break;
    }
    refusedForms.push(`« ${hundred.text} »: ${clash}`);
  }
  if (!chosen) throw new Error(`no form of the axis's far end holds — ${refusedForms.join("; ")}`);
  const { hundred, layout } = chosen;

  const { ground, accent } = direction;
  const { ink, muted, grid } = deriveFurniture(ground);
  const walked = (c, floor, what) => {
    const w = adjustToContrast(c, ground, floor);
    if (!w) throw new Error(`${what} has no variant that reads at ${floor}:1 on ${ground}`);
    return w;
  };
  // The static plate's ramp: one hue, five classes, between the direction's own ground and its own accent.
  const low = mix(accent, ground, 0.9);
  const high = mix(accent, ink, 0.3);
  const classCount = BREAKS.length + 1;
  const colours = {
    ground,
    grid,
    ramp: Array.from({ length: classCount }, (_, i) => mix(low, high, i / (classCount - 1))),
    zero: walked(muted, NON_TEXT_CONTRAST_MIN, "the axis"),
    cut: walked(accent, NON_TEXT_CONTRAST_MIN, "a cut"),
    ring: walked(accent, NON_TEXT_CONTRAST_MIN, "the ring"),
    text: {
      eyebrow: walked(registers.eyebrow.fill ?? accent, TEXT_CONTRAST_MIN, "the eyebrow"),
      title: walked(registers.display.fill ?? ink, TEXT_CONTRAST_MIN, "the title"),
      axis: walked(muted, TEXT_CONTRAST_MIN, "an axis word"),
      cut: walked(accent, TEXT_CONTRAST_MIN, "a cut's word"),
      count: walked(ink, TEXT_CONTRAST_MIN, "a count"),
    },
  };

  const hairline = direction.stroke?.hairline ?? 0.6;
  const props = {
    frame: stage,
    registers: { display: titleCard.register, eyebrow: registers.eyebrow, value, axis, source: sourceRegister },
    titleCard,
    credit: { ...credit, at: creditAt },
    colours,
    cell,
    side,
    inner,
    gap,
    baseline,
    axisLeft,
    axisRight,
    shift,
    most,
    squares,
    slots,
    finals,
    layout,
    cutWords,
    ring,
    strokes: { zero: rule * k * 1.4, cut: Math.min(rule * k * 2.5, inner * 1.5), square: hairline * k, ring: rule * k * 2.5 },
    halo: { value: haloOf(value, k) },
    states,
    timing: PICTOGRAM_VIDEO_TIMING,
  };
  return { id, direction, props, report: { k, titleForm: titleCard.form, sourceForm: credit.form, cell: cell.toFixed(1), cellF: cellF.toFixed(1), rows, tallest: subject.tallest } };
}
