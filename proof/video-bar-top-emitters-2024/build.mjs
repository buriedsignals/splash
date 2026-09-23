// EVERYTHING ONE DIRECTION'S RENDER IS HANDED, BUILT IN BUN — the words, the ten rows and their names, every count text a
// bar can show, the pile's labels, the colours and the states.
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
import { valueText } from "./scene.mjs";
import { statesFor } from "./states.mjs";
import { loadSubject, TOP_N } from "./subject.mjs";
import { BAR_VIDEO_TIMING } from "./timing-contract.ts";

const HERE = dirname(fileURLToPath(import.meta.url));
export const ROOT = join(HERE, "..", "..");
export const DIRECTIONS = join(ROOT, "docs", "design-base", "directions");
/** The size this run exports at — `--size`, landscape when nothing asks. R2 names three and
 *  everything under it already answered per size; only this line pinned the beat to one. */
export const SIZE = videoExportSize();
export const REGISTER_NAMES = ["display", "eyebrow", "body", "annot", "value", "axis"];
const NB = "\u00A0";
const LABEL_GAP = 0.4;
const BAR_SHARE = 0.6;
const SPELLED = ["zéro", "un", "deux", "trois", "quatre", "cinq", "six", "sept", "huit", "neuf", "dix"];

export function loadBeat() {
  const subject = loadSubject();
  return { subject, states: statesFor(), copy: copyOf(subject) };
}

export function copyOf(subject) {
  return {
    eyebrow: `Climat${NB}· Monde, 2024`,
    title: [`La ${subject.top[0].name} a émis plus de CO₂ que les ${SPELLED[subject.beaten]} pays suivants réunis`, `La ${subject.top[0].name}, plus que les ${SPELLED[subject.beaten]} suivants réunis`],
    world: "Monde",
    /** Every count carries the unit: the first bar's so the scale is read at once, the pile's so the two compare. */
    unit: (text) => `${text}${NB}Gt`,
    source: ["Source : Global Carbon Budget 2025, via Our World in Data", "Source : Global Carbon Budget 2025"],
  };
}

/** Every text a count can show while it climbs to `max`: two decimals under 1, one from 1. */
function countTexts(max) {
  const texts = new Set();
  for (let c = 0; c < 100; c++) texts.add(valueText(c / 100));
  for (let d = 10; d <= Math.ceil(max * 10); d++) texts.add(valueText(d / 10));
  return [...texts];
}

export function textPerRegisterOf(copy, subject) {
  return {
    display: copy.title.join(" "),
    eyebrow: copy.eyebrow,
    body: copy.source.join(" "),
    annot: "",
    value: `${copy.unit("12,3")} 0123456789,`,
    axis: `${copy.world} ${subject.top.map((r) => r.name).join(" ")} ${copy.source.join(" ")}`,
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
  const { axis, value } = registers;
  const gap = LABEL_GAP * axis.lead;
  const band = bandOf(BAND_PROBE, axis);
  const valueBand = bandOf(BAND_PROBE, value);
  const shift = (band.ascent - band.descent) / 2;

  const titleCard = titleCardFor({ registers, eyebrow: copy.eyebrow, title: copy.title, size: SIZE, eyebrowToDisplay: EYEBROW_TO_DISPLAY });

  // THE ROWS: the world on top, then the ten; the names at the left, the credit under them. One scale per camera: the world's,
  // where the world bar and its count fill the row, and the ten's, where the first bar and its count do.
  //
  // THE CREDIT'S FORM IS PART OF THE ROWS' BUDGET. Ten rows and the credit share the frame's height, and the shared
  // ladder in `sourceCreditFor` answers the credit first: it keeps the longest form and pays for it in LINES, which is
  // right when a beat has one form and wrong here. Measured 2026-09-23 at square: the long form takes two lines (91px),
  // which leaves a 82.5px row against a count that needs 84.5 — the beat refused « a row is too thin for its count »
  // while carrying a shorter source line it never tried. So the beat runs its own ladder over its own forms, dropping
  // the longest first, and keeps the first credit whose height leaves every row able to hold its count. Landscape takes
  // the first rung, so nothing already delivered moves.
  const seatRows = (forms) => {
    const { register, ...block } = sourceCreditFor({ registers, forms, size: SIZE, k, ...CREDIT_ONE_LINE });
    const at = { x: inset, y: stage.height - vInset - block.height };
    const bottom = at.y - gap;
    const pitch = (bottom - vInset) / TOP_N;
    if (!(pitch >= valueBand.ascent + valueBand.descent + gap)) return { why: `a row is ${pitch.toFixed(1)}px, too thin for its count` };
    return { sourceRegister: register, credit: block, creditAt: at, plotBottom: bottom, pitch };
  };
  let rows = null;
  const rowsRefused = [];
  for (let dropped = 0; dropped < copy.source.length && !rows; dropped++) {
    const got = seatRows(copy.source.slice(dropped));
    if (got.why) rowsRefused.push(`${copy.source.length - dropped} form(s) of the credit: ${got.why}`);
    else rows = { ...got, creditForm: dropped + got.credit.form };
  }
  if (!rows) throw new Error(`no credit leaves ${TOP_N} rows able to hold their counts at ${SIZE} \u2014 ${rowsRefused.join("; ")}`);
  const { sourceRegister, credit, creditAt } = rows;
  const names = subject.top.map((r) => {
    const t = applyCase(r.name, axis.transform);
    return { text: t, width: widthOf(t, axis) };
  });
  const worldName = { text: applyCase(copy.world, axis.transform), width: widthOf(applyCase(copy.world, axis.transform), axis) };
  const left = inset + Math.max(worldName.width, ...names.map((n) => n.width)) * (1 + DRAWN_WIDER) + gap;
  const plotTop = vInset;
  // The world bar stands on the first row: the first of the ten is already in place inside it, the others fall below.
  const { plotBottom, pitch } = rows;
  const countOf = (v) => widthOf(applyCase(copy.unit(valueText(v)), value.transform), value) * (1 + DRAWN_WIDER);
  const room = stage.width - inset - gap - left;
  // Past the first bar's end stand its count and, on the row below, the tenth's name: the wider of the two is kept free.
  const tenthRoom = widthOf(applyCase(subject.top[TOP_N - 1].name, axis.transform), axis) * (1 + DRAWN_WIDER);
  const units = { world: (room - countOf(subject.world)) / subject.world, ten: (room - Math.max(countOf(subject.top[0].value), tenthRoom)) / subject.top[0].value };
  const rowY = (i) => plotTop + i * pitch + (pitch * (1 - BAR_SHARE)) / 2;
  const barH = pitch * BAR_SHARE;
  const seam = Math.max(2 * k, 0.08 * axis.lead);
  const unit = units.ten;

  // THE PILE along the United States' row: the largest first; each block named under it in the emptied row below, spread
  // left to right so no two names touch, a hairline leader where a name had to move off its block — the tenth last, named
  // the same way once it has slid into the gap.
  const piled = subject.top.slice(1, 1 + subject.beaten);
  let before = 0;
  const pile = piled.map((r, j) => {
    const at = { stacked: j, before };
    before += r.value;
    return at;
  });
  const tenthRow = subject.top[TOP_N - 1];
  const pileY = rowY(1);
  const blocks = piled.map((r, j) => ({ r, from: pile[j].before }));
  /**
   * THE NAMES UNDER THE PILE ARE A COLUMN'S WORTH OF WORDS, NOT ONE LINE'S.
   *
   * One line was never a statement about the pile — it is what a 1431px landscape row happens to hold, against five
   * names that need 795px of it. The same five names need the same 954px at portrait and at square, where the row
   * offers 554, so the beat refused « the pile's names run past the frame » on a frame it had never been laid out for.
   *
   * The five bars have just LEFT rows 2 to `beaten`, so those rows are empty at exactly the moment the names are read:
   * the ladder spreads the names over as many of them as the frame costs. Each name goes on the line whose cursor has
   * come least far, which is the line where it has the best chance of standing under its own block: taking the lines in
   * turn instead sent « Japon » further right than « Indonésie » while its block sat further left, and the two leaders
   * crossed — looked at, portrait frame 425, before and after. Every line keeps the same left-to-right cursor and the
   * same leader rule, and a name a row below its block always takes its leader, because a row is a distance too. The
   * last rung is one name per vacated row; past it the beat refuses with the arithmetic.
   */
  const pileLines = Math.max(1, subject.beaten - 1);
  const seatPileNames = (lines) => {
    const cursors = new Array(lines).fill(left);
    const seated = blocks.map(({ r, from }, j) => {
      const line = cursors.indexOf(Math.min(...cursors));
      const t = applyCase(r.name, axis.transform);
      const w = widthOf(t, axis);
      const mid = left + (from + r.value / 2) * unit;
      const x = Math.max(mid - w / 2, cursors[line]);
      cursors[line] = x + w * (1 + DRAWN_WIDER) + 1.5 * gap;
      const centre = x + (w * (1 + DRAWN_WIDER)) / 2;
      const baseline = rowY(2 + line) + barH / 2 + shift;
      const led = line > 0 || Math.abs(centre - mid) > 0.25 * w;
      return { text: t, width: w, x, y: baseline, leader: led ? { x1: mid, y1: pileY + barH + gap / 2, x2: centre, y2: baseline - band.ascent - gap / 4 } : null };
    });
    const past = Math.max(...cursors) - 1.5 * gap;
    if (!(past < stage.width - inset)) return { why: "the pile's names run past the frame" };
    return { seated };
  };
  let named = null;
  const namesRefused = [];
  for (let lines = 1; lines <= pileLines && !named; lines++) {
    const got = seatPileNames(lines);
    if (got.why) namesRefused.push(`${lines} line(s): ${got.why}`);
    else named = { pileNames: got.seated, lines };
  }
  if (!named)
    throw new Error(`the pile's names run past the frame at ${SIZE} on every one of the ${pileLines} rows the five leave empty \u2014 ${namesRefused.join("; ")}`);
  const pileNames = named.pileNames;
  // The tenth, once in the gap, is named on its own row just past the first's end, where the sum stood.
  const tenthWord = widthOf(applyCase(tenthRow.name, axis.transform), axis);
  const tenthName = { text: applyCase(tenthRow.name, axis.transform), width: tenthWord, x: left + subject.top[0].value * unit + gap, y: pileY + barH / 2 + shift };
  if (!(tenthName.x + tenthWord * (1 + DRAWN_WIDER) <= stage.width - inset)) throw new Error("the tenth's name runs past the frame");
  // THE LAST PICTURE's bracket: past the longest of the five and its count, from the second row to the sixth, their sum
  // beside it.
  const longest = Math.max(...piled.map((r) => r.value));
  const bracketX = left + longest * unit + gap + countOf(longest) + gap;
  const sumWidth = countOf(subject.combined);
  if (!(bracketX + gap + sumWidth <= stage.width - inset)) throw new Error("the five's bracket and its sum run past the frame");
  const bracket = { x: bracketX, y1: rowY(1), y2: rowY(subject.beaten) + barH, tick: gap / 2 };

  const counts = [...countTexts(subject.top[0].value), valueText(subject.world)];
  const measured = (texts, r) => Object.fromEntries(texts.map((t) => [t, widthOf(applyCase(t, r.transform), r)]));
  const countWidths = measured(counts.map((c) => copy.unit(c)), value);

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
    column: walked(mix(accent, ground, 0.42), NON_TEXT_CONTRAST_MIN, "a bar"),
    first: walked(accent, NON_TEXT_CONTRAST_MIN, "the first bar"),
    /** The tenth in the gap is not one of the five: the neutral of the furniture, not the bars' hue. */
    tenth: walked(mix(ink, ground, 0.45), NON_TEXT_CONTRAST_MIN, "the tenth in the gap"),
    faded: mix(ground, ink, 0.14),
    rule: walked(accent, NON_TEXT_CONTRAST_MIN, "the first's level"),
    text: {
      eyebrow: walked(registers.eyebrow.fill ?? accent, TEXT_CONTRAST_MIN, "the eyebrow"),
      title: walked(registers.display.fill ?? ink, TEXT_CONTRAST_MIN, "the title"),
      name: walked(ink, TEXT_CONTRAST_MIN, "a name"),
      axis: walked(muted, TEXT_CONTRAST_MIN, "a muted word"),
      first: walked(accent, TEXT_CONTRAST_MIN, "the first's count"),
      count: walked(ink, TEXT_CONTRAST_MIN, "a count"),
    },
  };

  const r1 = (v) => Math.round(v * 10) / 10;
  const props = {
    frame: stage,
    registers: { display: titleCard.register, eyebrow: registers.eyebrow, value, axis, source: sourceRegister },
    titleCard,
    credit: { ...credit, at: creditAt },
    colours,
    left: r1(left),
    units,
    seam: r1(seam),
    world: subject.world,
    worldY: r1(rowY(0)),
    worldName: { ...worldName, x: left - gap - worldName.width * (1 + DRAWN_WIDER), y: rowY(0) + barH / 2 + shift },
    pileY: r1(pileY),
    gapY: r1(pileY),
    barH: r1(barH),
    bars: (() => {
      let inWorld = 0;
      return subject.top.map((r, i) => {
        const p = i >= 1 && i <= subject.beaten ? pile[i - 1] : null;
        const bar = {
          value: r.value,
          y: r1(rowY(i)),
          inWorld,
          stacked: p ? p.stacked : null,
          before: p ? p.before : 0,
          tenth: i === TOP_N - 1,
          name: { ...names[i], x: left - gap - names[i].width * (1 + DRAWN_WIDER), y: rowY(i) + barH / 2 + shift },
        };
        inWorld += r.value;
        return bar;
      });
    })(),
    pileNames,
    tenthName,
    bracket,
    rows: { first: r1(rowY(0)), pile: r1(pileY) },
    combined: subject.combined,
    countWidths,
    countGap: gap,
    valueShift: (valueBand.ascent - valueBand.descent) / 2,
    strokes: { rule: (direction.stroke?.rule ?? 1) * k * 1.4, grid: (direction.stroke?.hairline ?? 0.6) * k },
    dash: [0.2 * axis.lead, 0.14 * axis.lead].map(r1),
    halo: { value: haloOf(value, k), axis: haloOf(axis, k) },
    states,
    timing: BAR_VIDEO_TIMING,
  };
  return { id, direction, props, report: { k, titleForm: titleCard.form, sourceForm: rows.creditForm, pitch: pitch.toFixed(1), pileLines: named.lines, leaders: pileNames.filter((p) => p.leader).length } };
}
