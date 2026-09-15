// EVERYTHING ONE DIRECTION'S RENDER IS HANDED, BUILT IN BUN — the words, the ten rows' slots in both orders, every dot's two
// positions on one value scale, the common start the gains slide onto, every counter text measured, the colours and the
// states.
//
// Runs in Bun only.

import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { scaleLinear } from "d3-scale";
import { adjustToContrast, contrast, mix, NON_TEXT_CONTRAST_MIN, TEXT_CONTRAST_MIN } from "#shared/chart-beat/colour.mjs";
import { deriveFurniture } from "#shared/chart-beat/render-still.mjs";
import { frameInsetFor, sizeFor } from "#shared/chart-video/sizes.mjs";
import { readDirection } from "#shared/design-base/read-direction.mjs";
import { EYEBROW_TO_DISPLAY, registerOf } from "#shared/design-base/register.mjs";
import { resolveDirectionFamilies } from "#shared/design-base/resolve-families.mjs";
import { applyCase } from "../../skills/chart-video/scripts/registers.mjs";
import { BAND_PROBE, bandOf, CREDIT_ONE_LINE, DRAWN_WIDER, haloOf, sourceCreditFor, titleCardFor, verticalInsetFor, widthOf } from "../../skills/chart-video/scripts/shots.mjs";
import { videoRegistersOf } from "../../skills/chart-video/scripts/video-registers.mjs";
import { statesFor } from "./states.mjs";
import { FROM, LEAST, loadSubject, MOST, TO } from "./subject.mjs";
import { DUMBBELL_VIDEO_TIMING } from "./timing-contract.ts";

const HERE = dirname(fileURLToPath(import.meta.url));
export const ROOT = join(HERE, "..", "..");
export const DIRECTIONS = join(ROOT, "docs", "design-base", "directions");
export const SIZE = "landscape";
export const REGISTER_NAMES = ["display", "eyebrow", "body", "annot", "value", "axis"];
const NB = "\u00A0";
const LABEL_GAP = 0.4;
/** A row's pitch must hold the taller of its two words with this much air. */
const ROW_AIR = 1.25;

export function loadBeat() {
  const subject = loadSubject();
  return { subject, states: statesFor(), copy: copyOf(subject) };
}

const one = (v) => v.toLocaleString("fr-FR", { minimumFractionDigits: 1, maximumFractionDigits: 1 }).replace(/[\u202F\u00A0\u2009]/g, NB);

export function copyOf(subject) {
  const { most, least } = subject;
  return {
    eyebrow: "Santé · Espérance de vie",
    title: [
      `La Pologne a gagné ${one(most.gain)}${NB}ans d’espérance de vie depuis ${FROM}, les États-Unis ${one(least.gain)}`,
      `Tous les dix ont gagné des années de vie depuis ${FROM}`,
    ],
    years: [String(FROM), String(TO)],
    gain: (r) => `+${one(r.gain)}`,
    tick: (t, last) => (last ? `${t}${NB}ans` : String(t)),
    rose: (n) => `${n}${NB}en hausse`,
    source: [`Source : Nations unies, World Population Prospects (2024), via Our World in Data`, `Source : ONU, via Our World in Data`],
  };
}

export function textPerRegisterOf(copy, subject) {
  return {
    display: copy.title.join(" "),
    eyebrow: copy.eyebrow,
    body: copy.source.join(" "),
    annot: copy.years.join(" "),
    value: `${subject.rows.map(copy.gain).join(" ")} ${copy.rose(10)} 0123456789`,
    axis: `${subject.rows.map((r) => r.label).join(" ")} ${copy.years.join(" ")} 72 76 80 84 ${copy.tick(86, true)} ${copy.source.join(" ")}`,
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
  const vBand = bandOf(BAND_PROBE, value);

  const titleCard = titleCardFor({ registers, eyebrow: copy.eyebrow, title: copy.title, size: SIZE, eyebrowToDisplay: EYEBROW_TO_DISPLAY });
  const { register: sourceRegister, ...credit } = sourceCreditFor({ registers, forms: copy.source, size: SIZE, k, ...CREDIT_ONE_LINE });
  const creditY = stage.height - vInset - credit.height;

  // THE BANDS, top to bottom: the key and the count on one baseline; the ten rows; the axis and its values; the credit.
  const headAscent = Math.max(band.ascent, vBand.ascent);
  const headBaseline = vInset + headAscent;
  const rowsTop = headBaseline + Math.max(band.descent, vBand.descent) + gap;
  const tickBaseline = creditY - gap - band.descent;
  const axisY = tickBaseline - band.ascent - gap / 2;
  const rowsFoot = axisY - gap / 2;
  const { rows } = subject;
  const pitch = (rowsFoot - rowsTop) / rows.length;
  const owed = ROW_AIR * Math.max(band.ascent + band.descent, vBand.ascent + vBand.descent);
  if (pitch < owed) throw new Error(`${rows.length} rows want ${owed.toFixed(1)}px of pitch and the frame gives ${pitch.toFixed(1)}px`);
  const slots = rows.map((_, i) => rowsTop + pitch * (i + 0.5));

  // THE COLUMNS: the names from the frame's inset plus the ring's breath; the gains before the far inset; the plot between.
  const breath = 0.35 * axis.lead;
  const names = rows.map((r) => measure(r.label, axis));
  const gains = rows.map((r) => measure(copy.gain(r), value));
  const dotR = Math.min(0.2 * pitch, 0.26 * axis.lead);
  const plotLeft = inset + breath + Math.max(...names.map((t) => t.width)) * (1 + DRAWN_WIDER) + gap + dotR;
  const gainX = stage.width - inset - breath - Math.max(...gains.map((t) => t.width)) * (1 + DRAWN_WIDER);
  const plotRight = gainX - gap - dotR;
  const values = rows.flatMap((r) => [r.from, r.to]);
  const lo = Math.min(...values);
  const hi = Math.max(...values);
  const x = scaleLinear().domain([lo - (hi - lo) * 0.03, hi + (hi - lo) * 0.03]).nice().range([plotLeft, plotRight]);
  const ticks = x.ticks(6);
  const tickLines = ticks.map((t, i) => {
    const last = i === ticks.length - 1;
    const m = measure(copy.tick(t, last), axis);
    const drawn = m.width * (1 + DRAWN_WIDER);
    return { ...m, x: i === 0 ? x(t) - Math.min(m.width / 2, x(t) - plotLeft + dotR) : last ? x(t) - drawn : x(t) - m.width / 2, y: tickBaseline, at: x(t) };
  });

  const byLevel = subject.byLevel;
  const byGain = subject.byGain;
  const shift = (band.ascent - band.descent) / 2;
  const vShift = (vBand.ascent - vBand.descent) / 2;
  const drawnRows = rows.map((r, i) => ({
    key: r.key,
    levelRank: byLevel.indexOf(r.key),
    gainRank: byGain.indexOf(r.key),
    pair: r.key === MOST || r.key === LEAST,
    subject: r.key === MOST,
    a: { x: x(r.from) },
    b: { x: x(r.to) },
    name: { ...names[i], x: inset + breath, dy: shift },
    gain: { ...gains[i], x: gainX, dy: vShift },
  }));
  const start = x(subject.most.from);

  // THE KEY: the two years named once by their dots, over the plot's left edge; the count right-aligned to the gains' edge.
  const keyYears = copy.years.map((t) => measure(t, axis));
  const keyDotY = headBaseline - shift;
  const firstLabelX = plotLeft + 2 * dotR + gap / 2;
  const secondDotX = firstLabelX + keyYears[0].width * (1 + DRAWN_WIDER) + 2 * gap + dotR;
  const legend = {
    dots: [{ x: plotLeft + dotR, y: keyDotY }, { x: secondDotX, y: keyDotY }],
    labels: [
      { ...keyYears[0], x: firstLabelX, y: headBaseline },
      { ...keyYears[1], x: secondDotX + dotR + gap / 2, y: headBaseline },
    ],
  };
  const countRight = stage.width - inset - breath;
  const counter = Object.fromEntries(
    Array.from({ length: rows.length + 1 }, (_, n) => {
      const m = measure(copy.rose(n), value);
      return [String(n), { ...m, x: countRight - m.width * (1 + DRAWN_WIDER), y: headBaseline }];
    }),
  );
  if (!(counter[String(rows.length)].x > legend.labels[1].x + legend.labels[1].width * (1 + DRAWN_WIDER) + gap)) throw new Error("the count runs into the key");

  const { ground, accent } = direction;
  const { ink, muted, grid } = deriveFurniture(ground);
  const walked = (c, floor, what) => {
    const w = adjustToContrast(c, ground, floor);
    if (!w) throw new Error(`${what} has no variant that reads at ${floor}:1 on ${ground}`);
    return w;
  };
  /** ONE HUE, TWO CHROMAS — the directed plate's rule: 2000 a tint of 2023, as far toward the ground as still reads. */
  let past = mix(accent, ground, 0.62);
  if (contrast(past, ground) < NON_TEXT_CONTRAST_MIN) past = walked(past, NON_TEXT_CONTRAST_MIN, `the tint for ${FROM}`);
  const present = walked(accent, NON_TEXT_CONTRAST_MIN, `the hue for ${TO}`);

  const props = {
    frame: stage,
    registers: { display: titleCard.register, eyebrow: registers.eyebrow, axis, value, source: sourceRegister },
    titleCard,
    credit: { ...credit, at: { x: inset, y: creditY } },
    colours: {
      ground,
      grid,
      past,
      present,
      connector: mix(accent, ground, 0.3),
      guide: walked(muted, NON_TEXT_CONTRAST_MIN, "the start line"),
      ring: walked(accent, NON_TEXT_CONTRAST_MIN, "Poland's ring"),
      text: {
        eyebrow: walked(registers.eyebrow.fill ?? accent, TEXT_CONTRAST_MIN, "the eyebrow"),
        title: walked(registers.display.fill ?? ink, TEXT_CONTRAST_MIN, "the title"),
        name: walked(ink, TEXT_CONTRAST_MIN, "a name"),
        muted: walked(muted, TEXT_CONTRAST_MIN, "a muted word"),
        pair: walked(accent, TEXT_CONTRAST_MIN, "the pair's gains"),
        count: walked(ink, TEXT_CONTRAST_MIN, "the count"),
      },
    },
    strokes: { connector: dotR * 1.5, axis: (direction.stroke?.hairline ?? 0.6) * k, guide: (direction.stroke?.hairline ?? 0.6) * k * 1.5, ring: (direction.stroke?.hairline ?? 0.6) * k * 2 },
    plot: { left: plotLeft, right: plotRight, top: rowsTop, foot: rowsFoot, axisY },
    ring: { x: inset, width: stage.width - 2 * inset, height: pitch - 4, rx: pitch / 6 },
    ticks: tickLines,
    rows: drawnRows,
    slots,
    start,
    legend,
    counter,
    dotR,
    halo: haloOf(axis, k),
    states,
    timing: DUMBBELL_VIDEO_TIMING,
  };
  return { id, direction, props, report: { k, titleForm: titleCard.form, sourceForm: credit.form, pitch: Math.round(pitch) } };
}
