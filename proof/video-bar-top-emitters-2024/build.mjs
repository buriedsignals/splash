// EVERYTHING ONE DIRECTION'S RENDER IS HANDED, BUILT IN BUN — the words, the ten rows and their names, every count text a
// bar can show, the pile's labels, the colours and the states.
//
// Runs in Bun only.

import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { adjustToContrast, mix, NON_TEXT_CONTRAST_MIN, TEXT_CONTRAST_MIN } from "#shared/chart-beat/colour.mjs";
import { deriveFurniture } from "#shared/chart-beat/render-still.mjs";
import { frameInsetFor, sizeFor } from "#shared/chart-video/sizes.mjs";
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
export const SIZE = "landscape";
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
  const { register: sourceRegister, ...credit } = sourceCreditFor({ registers, forms: copy.source, size: SIZE, k, ...CREDIT_ONE_LINE });

  // THE ROWS: the world on top, then the ten; the names at the left, the credit under them. One scale per camera: the world's,
  // where the world bar and its count fill the row, and the ten's, where the first bar and its count do.
  const creditAt = { x: inset, y: stage.height - vInset - credit.height };
  const names = subject.top.map((r) => {
    const t = applyCase(r.name, axis.transform);
    return { text: t, width: widthOf(t, axis) };
  });
  const worldName = { text: applyCase(copy.world, axis.transform), width: widthOf(applyCase(copy.world, axis.transform), axis) };
  const left = inset + Math.max(worldName.width, ...names.map((n) => n.width)) * (1 + DRAWN_WIDER) + gap;
  const plotTop = vInset;
  const plotBottom = creditAt.y - gap;
  const pitch = (plotBottom - plotTop) / (TOP_N + 1);
  if (!(pitch >= valueBand.ascent + valueBand.descent + gap)) throw new Error(`a row is ${pitch.toFixed(1)}px, too thin for its count`);
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
  const pileY = rowY(2);
  const pileNameBaseline = rowY(3) + barH / 2 + shift;
  let cursor = left;
  const blocks = piled.map((r, j) => ({ r, from: pile[j].before }));
  const pileNames = blocks.map(({ r, from }) => {
    const t = applyCase(r.name, axis.transform);
    const w = widthOf(t, axis);
    const mid = left + (from + r.value / 2) * unit;
    const x = Math.max(mid - w / 2, cursor);
    cursor = x + w * (1 + DRAWN_WIDER) + 1.5 * gap;
    const centre = x + (w * (1 + DRAWN_WIDER)) / 2;
    return { text: t, width: w, x, y: pileNameBaseline, leader: Math.abs(centre - mid) > 0.25 * w ? { x1: mid, y1: pileY + barH + gap / 2, x2: centre, y2: pileNameBaseline - band.ascent - gap / 4 } : null };
  });
  if (!(cursor - 1.5 * gap < stage.width - inset)) throw new Error("the pile's names run past the frame");
  // The tenth, once in the gap, is named on its own row just past the first's end, where the sum stood.
  const tenthWord = widthOf(applyCase(tenthRow.name, axis.transform), axis);
  const tenthName = { text: applyCase(tenthRow.name, axis.transform), width: tenthWord, x: left + subject.top[0].value * unit + gap, y: pileY + barH / 2 + shift };
  if (!(tenthName.x + tenthWord * (1 + DRAWN_WIDER) <= stage.width - inset)) throw new Error("the tenth's name runs past the frame");

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
          y: r1(rowY(i + 1)),
          inWorld,
          stacked: p ? p.stacked : null,
          before: p ? p.before : 0,
          tenth: i === TOP_N - 1,
          name: { ...names[i], x: left - gap - names[i].width * (1 + DRAWN_WIDER), y: rowY(i + 1) + barH / 2 + shift },
        };
        inWorld += r.value;
        return bar;
      });
    })(),
    pileNames,
    tenthName,
    rows: { first: r1(rowY(1)), pile: r1(pileY) },
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
  return { id, direction, props, report: { k, titleForm: titleCard.form, sourceForm: credit.form, pitch: pitch.toFixed(1), leaders: pileNames.filter((p) => p.leader).length } };
}
