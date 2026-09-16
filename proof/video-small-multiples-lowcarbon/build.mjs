// EVERYTHING ONE DIRECTION'S RENDER IS HANDED, BUILT IN BUN — the words, the sixteen panels and their one scale, the row
// they are cut from, both orders, every counter text a panel can show, the key, the rings, the colours and the states.
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
import { BAND_PROBE, bandOf, CREDIT_ONE_LINE, DRAWN_WIDER, sourceCreditFor, titleCardFor, verticalInsetFor, widthOf } from "../../skills/chart-video/scripts/shots.mjs";
import { videoRegistersOf } from "../../skills/chart-video/scripts/video-registers.mjs";
import { countText } from "./scene.mjs";
import { statesFor } from "./states.mjs";
import { FROM, loadSubject, TO } from "./subject.mjs";
import { SMALL_MULTIPLES_VIDEO_TIMING } from "./timing-contract.ts";

const HERE = dirname(fileURLToPath(import.meta.url));
export const ROOT = join(HERE, "..", "..");
export const DIRECTIONS = join(ROOT, "docs", "design-base", "directions");
export const SIZE = "landscape";
export const REGISTER_NAMES = ["display", "eyebrow", "body", "annot", "value", "axis"];
const NB = "\u00A0";
const LABEL_GAP = 0.4;
export const COLS = 4;
/** A 2000 or 2024 bar's width, its gap to its pair, and the baseline's reach past the pair — × the axis lead. */
const BAR_W = 1.1;
const BAR_GAP = 0.25;
const OVERHANG = 0.15;

export function loadBeat() {
  const subject = loadSubject();
  return { subject, states: statesFor(), copy: copyOf(subject) };
}

export function copyOf(subject) {
  return {
    eyebrow: `Énergie${NB}· Europe`,
    title: [
      `Électricité bas-carbone${NB}: les seize ont tous progressé, les plus bas le plus vite`,
      `Bas-carbone${NB}: tous ont progressé, les plus bas le plus vite`,
    ],
    unit: `part bas-carbone, 0–${subject.ceiling}${NB}%`,
    key: [String(FROM), String(TO)],
    source: ["Source : Ember, Energy Institute – Statistical Review of World Energy (2025), via Our World in Data", "Source : Ember, Energy Institute, via Our World in Data"],
  };
}

export function textPerRegisterOf(copy, subject) {
  return {
    display: copy.title.join(" "),
    eyebrow: copy.eyebrow,
    body: copy.source.join(" "),
    annot: "",
    value: `${countText(74)} 0123456789`,
    axis: `${copy.unit} ${copy.key.join(" ")} ${subject.rows.map((r) => r.name).join(" ")} ${copy.source.join(" ")}`,
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
  const measure = (t, r) => {
    const cased = applyCase(t, r.transform);
    return { text: cased, width: widthOf(cased, r) };
  };
  const gap = LABEL_GAP * axis.lead;
  const band = bandOf(BAND_PROBE, axis);
  const valueBand = bandOf(BAND_PROBE, value);

  const titleCard = titleCardFor({ registers, eyebrow: copy.eyebrow, title: copy.title, size: SIZE, eyebrowToDisplay: EYEBROW_TO_DISPLAY });
  const { register: sourceRegister, ...credit } = sourceCreditFor({ registers, forms: copy.source, size: SIZE, k, ...CREDIT_ONE_LINE });
  const creditAt = { x: inset, y: stage.height - vInset - credit.height };

  // THE BAND OVER THE GRID — what every panel shares, stated once: the scale at the left; the key at the right, two
  // swatches, each followed by its year.
  const bandBaseline = vInset + band.ascent;
  const unitLine = { ...measure(copy.unit, axis), x: inset, y: bandBaseline };
  const words = copy.key.map((d) => measure(d, axis));
  const swatchW = band.ascent;
  const keyWidth = words.reduce((w, d, i) => w + swatchW + gap / 2 + d.width * (1 + DRAWN_WIDER) + (i < words.length - 1 ? 1.5 * gap : 0), 0);
  const keyX = stage.width - inset - keyWidth;
  if (!(unitLine.x + unitLine.width * (1 + DRAWN_WIDER) + 2 * gap < keyX)) throw new Error("the scale and the key do not fit on one line");
  let cursor = keyX;
  const legend = words.map((d) => {
    const swatch = { x: cursor, y: bandBaseline - band.ascent, w: swatchW, h: band.ascent };
    const word = { ...d, x: cursor + swatchW + gap / 2, y: bandBaseline };
    cursor = word.x + d.width * (1 + DRAWN_WIDER) + 1.5 * gap;
    return { swatch, word };
  });

  // THE GRID. Each panel: its pair of bars from the ceiling line to its own baseline, the name level with the ceiling and
  // the gain on the baseline beside the pair. Every panel's bars are drawn against the SAME 0–100 % height.
  const names = subject.rows.map((r) => measure(r.name, axis));
  const countWidths = {};
  for (const r of subject.rows) for (let v = 0; v <= Math.round(r.delta); v++) countWidths[countText(v)] = widthOf(applyCase(countText(v), value.transform), value);
  const barW = BAR_W * axis.lead;
  const barGap = BAR_GAP * axis.lead;
  const overhang = OVERHANG * axis.lead;
  const pairW = 2 * barW + barGap;
  const textGap = 1.25 * gap;
  const textDx = pairW + overhang + textGap;
  const top = bandBaseline + band.descent + 2 * gap;
  const bottom = creditAt.y - 1.5 * gap;
  const rowCount = Math.ceil(subject.rows.length / COLS);
  const rowGap = 2.5 * gap;
  const cellW = (stage.width - 2 * inset) / COLS;
  const cellH = (bottom - top + rowGap) / rowCount;
  const barsH = cellH - rowGap;
  // The gain on the panel's baseline and the name just over it: the two words of one panel stand a half gap apart, and
  // far from the panel above — proximity is the grouping on a grid (the static beat's defect: a name level with the
  // ceiling stood nearer the gain of the panel above than its own).
  const countBaseline = barsH;
  const nameBaseline = countBaseline - valueBand.ascent - 0.5 * gap - band.descent;
  if (!(nameBaseline - band.ascent >= 0)) throw new Error(`a panel of ${barsH.toFixed(0)}px cannot stack its name over its gain`);
  const blocks = subject.rows.map((r, i) => {
    const widest = Math.max(names[i].width, ...Array.from({ length: Math.round(r.delta) + 1 }, (_, v) => countWidths[countText(v)]));
    return textDx + widest * (1 + DRAWN_WIDER);
  });
  const blockW = Math.max(...blocks);
  if (!(cellW - blockW >= 2 * textGap)) throw new Error(`a panel is ${blockW.toFixed(0)}px wide in a ${cellW.toFixed(0)}px cell: its name would read as its neighbour's`);
  if (!(rowGap >= 2 * textGap)) throw new Error("the rows of panels stand closer than twice the gap inside one");
  const cells = subject.rows.map((_, i) => ({ x: inset + overhang + (i % COLS) * cellW, top: top + Math.floor(i / COLS) * cellH }));

  // THE ROW THE GRID IS CUT FROM: sixteen 2000 bars side by side on one baseline, centred in the grid's height, each in a
  // slot of its own the baseline runs through unbroken.
  const slotW = (stage.width - 2 * inset) / subject.rows.length;
  if (!(slotW > barW + 2 * overhang)) throw new Error("sixteen bars do not stand side by side in one row");
  const rowTop = top + (bottom - top - barsH) / 2;
  const seats = subject.rows.map((_, i) => ({ x: inset + i * slotW + (slotW - barW) / 2, top: rowTop }));

  // THE RINGS: around the whole panel, inside half the air between panels.
  const pad = Math.min(0.6 * gap, rowGap / 3, (cellW - blockW) / 3);
  const rings = new Set(subject.rings);

  const { ground, accent } = direction;
  const { ink, muted, grid } = deriveFurniture(ground);
  const walked = (c, floor, what) => {
    const w = adjustToContrast(c, ground, floor);
    if (!w) throw new Error(`${what} has no variant that reads at ${floor}:1 on ${ground}`);
    return w;
  };
  const colours = {
    ground,
    pale: mix(accent, ground, 0.62),
    full: walked(accent, NON_TEXT_CONTRAST_MIN, `the ${TO} bar`),
    rule: grid,
    ring: walked(ink, NON_TEXT_CONTRAST_MIN, "the ring"),
    text: {
      eyebrow: walked(registers.eyebrow.fill ?? accent, TEXT_CONTRAST_MIN, "the eyebrow"),
      title: walked(registers.display.fill ?? ink, TEXT_CONTRAST_MIN, "the title"),
      name: walked(ink, TEXT_CONTRAST_MIN, "a name"),
      axis: walked(muted, TEXT_CONTRAST_MIN, "a muted word"),
      accent: walked(accent, TEXT_CONTRAST_MIN, "a thread word"),
    },
  };

  const r1 = (v) => Math.round(v * 10) / 10;
  const props = {
    frame: stage,
    registers: { display: titleCard.register, eyebrow: registers.eyebrow, value, axis, source: sourceRegister },
    titleCard,
    credit: { ...credit, at: creditAt },
    colours,
    before: subject.before,
    byStart: subject.byStart,
    rings: subject.rings,
    rows: subject.rows.map((r, i) => ({
      key: r.key,
      from: r.from,
      to: r.to,
      delta: r.delta,
      thread: rings.has(r.key),
      name: names[i],
      ring: { x: r1(-overhang - pad), y: r1(-pad), w: r1(blocks[i] + overhang + 2 * pad), h: r1(barsH + 2 * pad) },
    })),
    ceiling: subject.ceiling,
    cells,
    seats,
    barsH: r1(barsH),
    barW: r1(barW),
    barGap: r1(barGap),
    overhang: r1(overhang),
    slotW: r1(slotW),
    textDx: r1(textDx),
    nameBaseline: r1(nameBaseline),
    countBaseline: r1(countBaseline),
    countWidths,
    unitLine,
    legend,
    strokes: { ring: (direction.stroke?.rule ?? 1) * k * 1.4, rule: (direction.stroke?.rule ?? 1) * k },
    states,
    timing: SMALL_MULTIPLES_VIDEO_TIMING,
  };
  return { id, direction, props, report: { k, titleForm: titleCard.form, sourceForm: credit.form, panel: `${cellW.toFixed(0)}x${barsH.toFixed(0)}px`, air: (cellW - blockW).toFixed(0) } };
}
