// EVERYTHING ONE DIRECTION'S RENDER IS HANDED, BUILT IN BUN — the words, the 21 bands and their rows, the spine, the two
// scales and their ticks, the zoom, the values at the crossing, the colours and the states.
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
import { BAND_PROBE, bandOf, CREDIT_ONE_LINE, DRAWN_WIDER, haloOf, registerAt, sourceCreditFor, titleCardFor, verticalInsetFor, widthOf } from "../../skills/chart-video/scripts/shots.mjs";
import { videoRegistersOf } from "../../skills/chart-video/scripts/video-registers.mjs";
import { statesFor } from "./states.mjs";
import { CROSSING, loadSubject } from "./subject.mjs";
import { PYRAMID_VIDEO_TIMING } from "./timing-contract.ts";

const HERE = dirname(fileURLToPath(import.meta.url));
export const ROOT = join(HERE, "..", "..");
export const DIRECTIONS = join(ROOT, "docs", "design-base", "directions");
export const SIZE = "landscape";
export const REGISTER_NAMES = ["display", "eyebrow", "body", "annot", "value", "axis"];
const NB = "\u00A0";
const LABEL_GAP = 0.4;
/** Of a band's pitch, the share its bars take. */
const BAR = 0.78;
/** The whole scale's tick step, in people. */
const WHOLE_STEP = 100000;
/** At the camera's closest, the largest difference takes at most this share of a half. */
const DIFFERENCE_AT_ZOOM = 0.9;
const DIGITS = "0123456789+-k×";

export function loadBeat() {
  const subject = loadSubject();
  return { subject, states: statesFor(), copy: copyOf() };
}

const thousands = (v) => String(v).replace(/\B(?=(\d{3})+(?!\d))/g, NB);

export function copyOf() {
  return {
    eyebrow: `Démographie${NB}· Suisse, 2023`,
    title: [`Les femmes passent devant les hommes à partir de ${CROSSING}${NB}ans`, `Les femmes devant les hommes dès ${CROSSING}${NB}ans`],
    halves: ["Hommes", "Femmes"],
    tick: (v) => `${v / 1000}k`,
    zoom: (by) => `×${by}`,
    value: (v) => thousands(v),
    source: [`Source${NB}: ONU, World Population Prospects (2024), via Our World in Data`, `Source${NB}: ONU, World Population Prospects, via Our World in Data`],
  };
}

export function textPerRegisterOf(copy, subject) {
  return {
    display: copy.title.join(" "),
    eyebrow: copy.eyebrow,
    body: copy.source.join(" "),
    annot: "",
    value: `${copy.zoom(10)} ${copy.value(5136)} 0123456789`,
    axis: `${copy.halves.join(" ")} ${subject.bands.map((b) => b.band).join(" ")} 100k 10k ${copy.source.join(" ")}`,
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
  const digits = bandOf(DIGITS, axis);
  const valueDigits = bandOf(DIGITS, value);
  // The two values at the crossing stand in their bands, so they are set at the band names' size in the value register's face.
  const figure = registerAt(value, axis.fontSize);
  const figureDigits = bandOf(DIGITS, figure);
  const figureHalo = haloOf(figure, k);

  const titleCard = titleCardFor({ registers, eyebrow: copy.eyebrow, title: copy.title, size: SIZE, eyebrowToDisplay: EYEBROW_TO_DISPLAY });
  const { register: sourceRegister, ...credit } = sourceCreditFor({ registers, forms: copy.source, size: SIZE, k, ...CREDIT_ONE_LINE });
  const creditAt = { x: inset, y: stage.height - vInset - credit.height };

  // THE ROWS: the halves' names over the plot, the ticks under it, the credit under those.
  const namesBaseline = vInset + band.ascent;
  const top = namesBaseline + band.descent + gap;
  const tickBaseline = creditAt.y - gap - digits.descent;
  const bottom = tickBaseline - digits.ascent - gap / 2;
  const n = subject.bands.length;
  const pitch = (bottom - top) / n;
  const h = pitch * BAR;
  const rowTop = (i) => bottom - (i + 1) * pitch + (pitch - h) / 2;

  // THE SPINE: the widest band name and a gap either side. Every band is named if the names' ink holds its pitch with air;
  // otherwise every other, and the crossing band must be one of those named.
  const labels = subject.bands.map((b) => measure(b.band, axis));
  const labelBand = subject.bands.map((b) => bandOf(b.band, axis)).reduce((a, b) => ({ ascent: Math.max(a.ascent, b.ascent), descent: Math.max(a.descent, b.descent) }));
  const every = labelBand.ascent + labelBand.descent + gap / 2 <= pitch ? 1 : 2;
  if (subject.crossing % every !== 0) throw new Error(`with every ${every} band named, ${CROSSING} is not`);
  const gutter = Math.max(...labels.map((l) => l.width)) * (1 + DRAWN_WIDER) + 2 * gap;
  const centre = stage.width / 2;
  const spine = { left: centre - gutter / 2, right: centre + gutter / 2 };
  const halfWidth = spine.left - inset;

  // THE SCALE: the whole one's domain the next step above the largest band, one unit for levels and differences.
  const most = Math.max(...subject.bands.flatMap((b) => [b.male, b.female]));
  const domain = Math.ceil(most / WHOLE_STEP) * WHOLE_STEP;
  const unit = halfWidth / domain;
  const largest = Math.max(...subject.bands.map((b) => Math.abs(b.female - b.male)));
  const zoomBy = Math.floor((DIFFERENCE_AT_ZOOM * domain) / largest);
  const closeStep = WHOLE_STEP / zoomBy;
  if (!(zoomBy > 1 && Number.isInteger(closeStep / 1000))) throw new Error(`a ×${zoomBy} zoom gives a close tick step of ${closeStep}, not a round thousand`);
  const ticks = [];
  for (let v = WHOLE_STEP; v < domain; v += WHOLE_STEP) {
    ticks.push({ value: v, scale: "whole", ...measure(copy.tick(v), axis) });
    ticks.push({ value: v / zoomBy, scale: "close", ...measure(copy.tick(v / zoomBy), axis) });
  }

  // THE CROSSING: the last band the men lead and the first the women lead, each difference printed at its bar's end.
  const valueGap = gap / 2;
  const values = [subject.crossing - 1, subject.crossing].map((i) => {
    const b = subject.bands[i];
    return { row: i, ...measure(copy.value(Math.abs(b.female - b.male)), figure), y: rowTop(i) + h / 2 + figureDigits.ascent / 2 };
  });
  if (!(figureDigits.ascent + figureHalo <= pitch)) throw new Error(`a value's ${(figureDigits.ascent + figureHalo).toFixed(1)}px does not hold a ${pitch.toFixed(1)}px band`);
  for (const v of values) {
    const d = Math.abs(subject.bands[v.row].female - subject.bands[v.row].male) * unit * zoomBy;
    if (!(d + valueGap + v.width * (1 + DRAWN_WIDER) <= halfWidth)) throw new Error(`${v.text} runs out of its half at ×${zoomBy}`);
  }
  if (!(largest * unit * zoomBy <= halfWidth)) throw new Error(`at ×${zoomBy} the largest difference runs out of its half`);

  // The zoom's factor stands in the half the camera empties: left of the spine, over the bands the women lead.
  const zoomWord = measure(copy.zoom(zoomBy), value);
  const upper = subject.bands.map((_, i) => i).filter((i) => i >= subject.crossing);
  const zoomAt = {
    x: inset + halfWidth / 2 - zoomWord.width / 2,
    y: (rowTop(upper[0]) + rowTop(upper.at(-1)) + h) / 2 + valueDigits.ascent / 2,
  };

  const names = copy.halves.map((t) => measure(t, axis));
  const nameLines = [
    { ...names[0], x: inset + halfWidth / 2 - names[0].width / 2, y: namesBaseline },
    { ...names[1], x: spine.right + halfWidth / 2 - names[1].width / 2, y: namesBaseline },
  ];

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
    men: walked(accent, NON_TEXT_CONTRAST_MIN, "the men's bars"),
    women: walked(muted, NON_TEXT_CONTRAST_MIN, "the women's bars"),
    common: mix(ground, ink, 0.22),
    rule: walked(ink, NON_TEXT_CONTRAST_MIN, "the crossing's rule"),
    text: {
      eyebrow: walked(registers.eyebrow.fill ?? accent, TEXT_CONTRAST_MIN, "the eyebrow"),
      title: walked(registers.display.fill ?? ink, TEXT_CONTRAST_MIN, "the title"),
      men: walked(accent, TEXT_CONTRAST_MIN, "the men's words"),
      women: walked(muted, TEXT_CONTRAST_MIN, "the women's words"),
      band: walked(ink, TEXT_CONTRAST_MIN, "a band's name"),
      axis: walked(muted, TEXT_CONTRAST_MIN, "a muted word"),
      zoom: walked(ink, TEXT_CONTRAST_MIN, "the zoom"),
    },
  };

  const props = {
    frame: stage,
    registers: { display: titleCard.register, eyebrow: registers.eyebrow, value, figure, axis, source: sourceRegister },
    titleCard,
    credit: { ...credit, at: creditAt },
    colours,
    inset,
    spine,
    halfWidth,
    unit,
    zoomBy,
    crossing: subject.crossing,
    rows: subject.bands.map((b, i) => ({
      band: b.band,
      male: b.male,
      female: b.female,
      y: rowTop(i),
      h,
      label: i % every === 0 ? { ...labels[i], x: centre - labels[i].width / 2, y: rowTop(i) + h / 2 + labelBand.ascent / 2 - labelBand.descent / 2 } : null,
    })),
    plot: { top, bottom },
    ruleY: bottom - subject.crossing * pitch,
    names: nameLines,
    ticks,
    tickBaseline,
    values,
    valueGap,
    zoomWord: { ...zoomWord, ...zoomAt },
    strokes: { grid: (direction.stroke?.hairline ?? 0.6) * k },
    halo: { axis: haloOf(axis, k), value: haloOf(value, k), figure: figureHalo },
    states,
    timing: PYRAMID_VIDEO_TIMING,
  };
  return { id, direction, props, report: { k, titleForm: titleCard.form, sourceForm: credit.form, pitch: pitch.toFixed(1), every, zoomBy } };
}
