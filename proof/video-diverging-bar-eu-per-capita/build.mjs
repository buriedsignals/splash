// EVERYTHING ONE DIRECTION'S RENDER IS HANDED, BUILT IN BUN — the words, the 27 rows in two columns on one scale for both
// the levels and the changes, the zero lines before and after the flip, the camera's zoom, the texts, colours and states.
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
import { changeText } from "./scene.mjs";
import { statesFor } from "./states.mjs";
import { FROM, loadSubject, TO } from "./subject.mjs";
import { DIVERGING_BAR_VIDEO_TIMING } from "./timing-contract.ts";

const HERE = dirname(fileURLToPath(import.meta.url));
export const ROOT = join(HERE, "..", "..");
export const DIRECTIONS = join(ROOT, "docs", "design-base", "directions");
export const SIZE = "landscape";
export const REGISTER_NAMES = ["display", "eyebrow", "body", "annot", "value", "axis"];
const NB = "\u00A0";
const LABEL_GAP = 0.4;
const BAR = 0.56;
/** 27 rows at the type floor do not hold in one column of 1080 pixels: two columns, one scale. */
const COLUMNS = 2;
/** At the camera's closest, the one rise is this share of the half-column it grows into. */
const RISE_AT_ZOOM = 0.35;

export function loadBeat() {
  const subject = loadSubject();
  return { subject, states: statesFor(), copy: copyOf(subject) };
}

export function copyOf(subject) {
  return {
    eyebrow: `Climat${NB}· Union européenne`,
    title: [`La Croatie est le seul pays de l’UE à émettre plus de CO₂ par personne qu’en ${FROM}`, `La Croatie, seule hausse du CO₂ par personne dans l’UE depuis ${FROM}`],
    year: String(FROM),
    count: (n) => `${n}${NB}baisse${n > 1 ? "s" : ""} depuis ${FROM}`,
    unit: "tonnes de CO₂ par personne",
    zoom: (by) => `×${by}`,
    source: [`Source : Global Carbon Budget (2025), via Our World in Data${NB}· combustibles fossiles et industrie`, "Source : Global Carbon Budget (2025), via Our World in Data"],
  };
}

export function textPerRegisterOf(copy, subject) {
  return {
    display: copy.title.join(" "),
    eyebrow: copy.eyebrow,
    body: copy.source.join(" "),
    annot: "",
    value: `${copy.count(26)} ${copy.year} ${copy.zoom(250)} 0123456789`,
    axis: `${copy.unit} ${subject.rows.map((r) => `${r.name} ${changeText(r.change)}`).join(" ")} ${copy.source.join(" ")}`,
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
  const shift = (band.ascent - band.descent) / 2;

  const titleCard = titleCardFor({ registers, eyebrow: copy.eyebrow, title: copy.title, size: SIZE, eyebrowToDisplay: EYEBROW_TO_DISPLAY });
  const { register: sourceRegister, ...credit } = sourceCreditFor({ registers, forms: copy.source, size: SIZE, k, ...CREDIT_ONE_LINE });
  const creditAt = { x: inset, y: stage.height - vInset - credit.height };

  // THE BAND OVER THE COLUMNS: the year, then the count, at the left; the unit at the right.
  const bandBaseline = vInset + valueBand.ascent;
  const counts = Object.fromEntries(Array.from({ length: subject.falls + 1 }, (_, i) => [String(i), measure(copy.count(i), value)]));
  const year = measure(copy.year, value);
  const unitWord = measure(copy.unit, axis);
  const unitLine = { ...unitWord, x: stage.width - inset - unitWord.width * (1 + DRAWN_WIDER), y: bandBaseline };
  if (!(inset + Math.max(...Object.values(counts).map((c) => c.width)) * (1 + DRAWN_WIDER) + 2 * gap < unitLine.x)) throw new Error("the count and the unit do not fit on one line");

  // THE COLUMNS: name | the drawing span. The levels grow from its left edge; the changes from a zero line near its right
  // edge, room left for the rise's change past it. One scale for the levels and the changes.
  const perColumn = Math.ceil(subject.rows.length / COLUMNS);
  const names = subject.rows.map((r) => measure(r.name, axis));
  const changes = subject.rows.map((r) => measure(changeText(r.change), axis));
  const nameRoom = Math.max(...names.map((n) => n.width)) * (1 + DRAWN_WIDER);
  const gutter = 2 * gap;
  const colW = (stage.width - 2 * inset - gutter * (COLUMNS - 1)) / COLUMNS;
  const rise = subject.rows.find((r) => r.change > 0);
  const riseText = changes[subject.rows.indexOf(rise)];
  const riseRoom = gap / 2 + 2 * k + gap / 2 + riseText.width * (1 + DRAWN_WIDER);
  const columns = Array.from({ length: COLUMNS }, (_, c) => {
    const x0 = inset + c * (colW + gutter);
    const start = x0 + nameRoom + gap;
    const end = x0 + colW;
    return { x0, start, end, zero: end - riseRoom, middle: start + (end - start) / 2 };
  });
  const span = columns[0].end - columns[0].start;
  // The scale is the largest that holds both readings: the highest level across the span, and every fall with its change
  // before its tip and the rise's room after the zero line.
  const unit = Math.min(
    span / Math.max(...subject.rows.map((r) => Math.max(r.from, r.to))),
    ...subject.rows.filter((r) => r.change < 0).map((r) => (span - riseRoom - gap / 2 - changes[subject.rows.indexOf(r)].width * (1 + DRAWN_WIDER)) / -r.change),
  );
  subject.rows.forEach((r, i) => {
    if (r.change > 0) return;
    const c = columns[Math.floor(i / perColumn)];
    if (!(c.zero + r.change * unit - gap / 2 - changes[i].width * (1 + DRAWN_WIDER) >= c.start)) throw new Error(`${r.name}'s change does not hold before its bar`);
  });
  // The camera's zoom: a round number that takes the rise to its share of the half-column.
  const zoomBy = Math.round((RISE_AT_ZOOM * (span / 2)) / (rise.change * unit) / 50) * 50;
  if (!(rise.change * unit * zoomBy + gap / 2 + riseText.width * (1 + DRAWN_WIDER) < span / 2)) throw new Error(`at ×${zoomBy} the rise and its change run out of the column`);
  const zoomWord = measure(copy.zoom(zoomBy), value);

  const top = bandBaseline + valueBand.descent + 1.5 * gap;
  const bottom = creditAt.y - gap;
  const pitch = (bottom - top) / perColumn;
  if (!(pitch >= axis.lead)) throw new Error(`a row is ${pitch.toFixed(1)}px, shorter than its words`);
  const barH = pitch * BAR;
  const rows = subject.rows.map((r, i) => {
    const column = Math.floor(i / perColumn);
    const slot = i - column * perColumn;
    const c = columns[column];
    const mid = top + slot * pitch + pitch / 2;
    return {
      key: r.key,
      from: r.from,
      to: r.to,
      change: r.change,
      column,
      y: mid - barH / 2,
      box: { x: c.x0 - gap / 2, y: mid - barH / 2 - gap / 2, w: colW + gap, h: barH + gap },
      name: { ...names[i], x: c.x0 + nameRoom - names[i].width * (1 + DRAWN_WIDER), y: mid + shift },
      value: { ...changes[i], y: mid + shift },
    };
  });
  const rowsIn = (c) => Math.min(perColumn, subject.rows.length - c * perColumn);

  const { ground, accent } = direction;
  const { ink, muted } = deriveFurniture(ground);
  const walked = (c, floor, what) => {
    const w = adjustToContrast(c, ground, floor);
    if (!w) throw new Error(`${what} has no variant that reads at ${floor}:1 on ${ground}`);
    return w;
  };
  const colours = {
    ground,
    grid: mix(ground, ink, 0.6),
    level: walked(mix(ink, ground, 0.55), NON_TEXT_CONTRAST_MIN, "a level"),
    lost: mix(accent, ground, 0.6),
    fall: walked(mix(accent, ground, 0.35), NON_TEXT_CONTRAST_MIN, "a fall"),
    rise: walked(accent, NON_TEXT_CONTRAST_MIN, "the rise"),
    faded: mix(ground, ink, 0.14),
    ring: walked(accent, NON_TEXT_CONTRAST_MIN, "the rise's ring"),
    text: {
      eyebrow: walked(registers.eyebrow.fill ?? accent, TEXT_CONTRAST_MIN, "the eyebrow"),
      title: walked(registers.display.fill ?? ink, TEXT_CONTRAST_MIN, "the title"),
      name: walked(ink, TEXT_CONTRAST_MIN, "a name"),
      axis: walked(muted, TEXT_CONTRAST_MIN, "a muted word"),
      value: walked(muted, TEXT_CONTRAST_MIN, "a change"),
      rise: walked(accent, TEXT_CONTRAST_MIN, "the rise's change"),
      count: walked(ink, TEXT_CONTRAST_MIN, "the count"),
    },
  };

  const props = {
    frame: stage,
    registers: { display: titleCard.register, eyebrow: registers.eyebrow, value, axis, source: sourceRegister },
    titleCard,
    credit: { ...credit, at: creditAt },
    colours,
    subject: subject.subject,
    rows,
    columns: columns.map((c, i) => ({ ...c, top, bottom: top + rowsIn(i) * pitch })),
    barH,
    unit,
    zoomBy,
    // The zoom's factor stands in the half of the subject's column the camera empties: right of the zero line, halfway down.
    zoomWord: { ...zoomWord, y: top + (rowsIn(Math.floor(subject.rows.findIndex((r) => r.change > 0) / perColumn)) * pitch) / 2 + (valueBand.ascent - valueBand.descent) / 2 },
    counts,
    year: { ...year, x: inset, y: bandBaseline },
    countAt: { x: inset, y: bandBaseline },
    unitLine,
    gap,
    strokes: { zero: (direction.stroke?.hairline ?? 0.6) * k * 1.4, ring: (direction.stroke?.rule ?? 1) * k * 1.4, rise: 2 * k },
    halo: { value: haloOf(value, k), axis: haloOf(axis, k) },
    states,
    timing: DIVERGING_BAR_VIDEO_TIMING,
  };
  return { id, direction, props, report: { k, titleForm: titleCard.form, sourceForm: credit.form, pitch: pitch.toFixed(1), unit: unit.toFixed(1), zoomBy } };
}
