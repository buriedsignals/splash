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
import { frameInsetFor, sizeFor, videoExportSize } from "#shared/chart-video/sizes.mjs";
import { readDirection } from "#shared/design-base/read-direction.mjs";
import { EYEBROW_TO_DISPLAY, registerOf } from "#shared/design-base/register.mjs";
import { resolveDirectionFamilies } from "#shared/design-base/resolve-families.mjs";
import { applyCase } from "../../skills/chart-video/scripts/registers.mjs";
import { BAND_PROBE, bandOf, CREDIT_ONE_LINE, DRAWN_WIDER, haloOf, registerAt, sourceCreditFor, titleCardFor, verticalInsetFor, widthOf } from "../../skills/chart-video/scripts/shots.mjs";
import { videoRegistersOf } from "../../skills/chart-video/scripts/video-registers.mjs";
import { statesFor } from "./states.mjs";
import { FROM, LEAST, loadSubject, MOST, TO } from "./subject.mjs";
import { DUMBBELL_VIDEO_TIMING } from "./timing-contract.ts";

const HERE = dirname(fileURLToPath(import.meta.url));
export const ROOT = join(HERE, "..", "..");
export const DIRECTIONS = join(ROOT, "docs", "design-base", "directions");
/** The size this run exports at — `--size`, landscape when nothing asks. R2 names three and
 *  everything under it already answered per size; only this line pinned the beat to one. */
export const SIZE = videoExportSize();
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
  const { axis } = registers;
  const measure = (t, r) => {
    const cased = applyCase(t, r.transform);
    return { text: cased, width: widthOf(cased, r) };
  };
  const gap = LABEL_GAP * axis.lead;
  const band = bandOf(BAND_PROBE, axis);
  const drawn = (w) => w * (1 + DRAWN_WIDER);

  const titleCard = titleCardFor({ registers, eyebrow: copy.eyebrow, title: copy.title, size: SIZE, eyebrowToDisplay: EYEBROW_TO_DISPLAY });
  const { register: sourceRegister, ...credit } = sourceCreditFor({ registers, forms: copy.source, size: SIZE, k, ...CREDIT_ONE_LINE });
  const creditY = stage.height - vInset - credit.height;

  // THE BANDS, top to bottom: the head, the ten rows, the axis and its values, the credit.
  const tickBaseline = creditY - gap - band.descent;
  const axisY = tickBaseline - band.ascent - gap / 2;
  const rowsFoot = axisY - gap / 2;
  const { rows } = subject;
  const breath = 0.35 * axis.lead;
  const names = rows.map((r) => measure(r.label, axis));
  const keyYears = copy.years.map((t) => measure(t, axis));
  const shift = (band.ascent - band.descent) / 2;

  /**
   * THE HEAD AND THE ROWS ARE LAID OUT TOGETHER, because each is the other's budget: the head's own
   * height is what the rows get, and the dot that the head's key is drawn from is a fifth of a row.
   * So one function draws both from the two things a narrow frame makes a choice of — how many lines
   * the head takes, and how big the row's counter is — and the caller walks them.
   */
  const layOut = (headLines, value) => {
    const vBand = bandOf(BAND_PROBE, value);
    const gains = rows.map((r) => measure(copy.gain(r), value));
    const headBaseline = vInset + Math.max(band.ascent, vBand.ascent);
    const keyBaseline = headBaseline + (headLines - 1) * axis.lead;
    const rowsTop = keyBaseline + Math.max(band.descent, vBand.descent) + gap;
    const pitch = (rowsFoot - rowsTop) / rows.length;
    const owed = ROW_AIR * Math.max(band.ascent + band.descent, vBand.ascent + vBand.descent);
    const dotR = Math.min(0.2 * pitch, 0.26 * axis.lead);
    const plotLeft = inset + breath + Math.max(...names.map((t) => drawn(t.width))) + gap + dotR;
    const gainX = stage.width - inset - breath - Math.max(...gains.map((t) => drawn(t.width)));
    // THE KEY: the two years named once by their dots, over the plot's left edge; the count right-aligned to the gains' edge.
    const firstLabelX = plotLeft + 2 * dotR + gap / 2;
    const secondDotX = firstLabelX + drawn(keyYears[0].width) + 2 * gap + dotR;
    const legend = {
      dots: [{ x: plotLeft + dotR, y: keyBaseline - shift }, { x: secondDotX, y: keyBaseline - shift }],
      labels: [
        { ...keyYears[0], x: firstLabelX, y: keyBaseline },
        { ...keyYears[1], x: secondDotX + dotR + gap / 2, y: keyBaseline },
      ],
    };
    const countRight = stage.width - inset - breath;
    const counter = Object.fromEntries(
      Array.from({ length: rows.length + 1 }, (_, n) => {
        const m = measure(copy.rose(n), value);
        return [String(n), { ...m, x: countRight - drawn(m.width), y: headBaseline }];
      }),
    );
    const longest = counter[String(rows.length)];
    return { value, vBand, gains, headBaseline, rowsTop, pitch, owed, dotR, plotLeft, gainX, plotRight: gainX - gap - dotR, legend, counter, headLines, beside: longest.x > legend.labels[1].x + drawn(legend.labels[1].width) + gap, onFrame: longest.x >= inset };
  };

  /**
   * THE ROW'S COUNTER IS SIZED TO THE ROW. A row must hold the taller of the two words it carries with
   * ROW_AIR of air around it, and the row's height is the frame's, divided by ten. Landscape gives the
   * ten rows 78px each and the value register's own 45px word owes 79 — it fits by the air's own
   * margin; a square frame gives 68px and the same word, scaled to 54px for the phone's floor, owes
   * 80 (measured 2026-09-23, all three directions). The air is not what gives way: the counter steps
   * down by half pixels until the row holds it, and never past the size floor, where this refuses.
   */
  const stepDown = (headLines) => {
    let laid = layOut(headLines, registers.value);
    for (let quarter = Math.floor(registers.value.fontSize * 4); laid.pitch < laid.owed && quarter / 4 > row.minTypePx; quarter -= 2)
      laid = layOut(headLines, registerAt(registers.value, Math.max(row.minTypePx, (quarter - 2) / 4)));
    return laid;
  };
  /**
   * AND THE HEAD IS ONE LINE OR TWO. The key and the count sit on one baseline across 1750px of
   * landscape content and want 1160 of it; a square or a portrait frame offers 936 and the same two
   * want the same 1160 — a row that has run out of row becomes a column, so the count takes the first
   * line and the key the one under it. Landscape stays on one line, so nothing delivered moves.
   */
  let laid = stepDown(1);
  if (!laid.beside) laid = stepDown(2);
  if (laid.pitch < laid.owed)
    throw new Error(`${rows.length} rows want ${laid.owed.toFixed(1)}px of pitch and the frame gives ${laid.pitch.toFixed(1)}px, with the row's counter already at the ${row.minTypePx}px floor`);
  if (!laid.onFrame) throw new Error(`the count runs off the frame: it wants ${(stage.width - inset - breath - laid.counter[String(rows.length)].x).toFixed(1)}px of the ${(stage.width - 2 * inset).toFixed(1)}px the frame gives`);
  const { value, vBand, gains, headBaseline, rowsTop, pitch, dotR, plotLeft, gainX, plotRight, legend, counter } = laid;
  const slots = rows.map((_, i) => rowsTop + pitch * (i + 0.5));
  const values = rows.flatMap((r) => [r.from, r.to]);
  const lo = Math.min(...values);
  const hi = Math.max(...values);
  const x = scaleLinear().domain([lo - (hi - lo) * 0.03, hi + (hi - lo) * 0.03]).nice().range([plotLeft, plotRight]);
  /**
   * THE AXIS'S TICK COUNT IS A LADDER. d3 is asked for six over the fourteen years the ten countries
   * span and answers eight, two years apart. Landscape gives that axis 1370px and the widest word,
   * « 86 ans », wants 82 — they stand clear. A square or a portrait frame gives 460px and the same
   * eight want 130 each (measured 2026-09-23, read off the rendered square: « 82 84 86 ans » printed
   * as « 8?58?4ns »). No assertion saw it, because nothing here had ever measured a tick against its
   * neighbour. So the set thins, anchored on the LAST tick — that is the one carrying the unit, and
   * the end of the scale is what the dumbbells are read against — and the beat refuses rather than
   * print two years through each other.
   */
  const asked = x.ticks(6);
  const placeTicks = (ts) =>
    ts.map((t, i) => {
      const last = i === ts.length - 1;
      const m = measure(copy.tick(t, last), axis);
      return { ...m, x: i === 0 ? x(t) - Math.min(m.width / 2, x(t) - plotLeft + dotR) : last ? x(t) - drawn(m.width) : x(t) - m.width / 2, y: tickBaseline, at: x(t) };
    });
  const apart = (a, b) => a.x + drawn(a.width) + gap / 2 < b.x;
  const tickLines = [1, 2, 3, 4, asked.length - 1]
    .map((stride) => placeTicks(asked.filter((_, i) => (asked.length - 1 - i) % stride === 0)))
    .find((set) => set.every((t, i) => i === 0 || apart(set[i - 1], t)));
  if (!tickLines)
    throw new Error(
      `no thinning of the ${asked.length} year ticks stands clear on the ${(plotRight - plotLeft).toFixed(0)}px axis: ` +
        `« ${measure(copy.tick(asked.at(-1), true), axis).text} » alone wants ${drawn(measure(copy.tick(asked.at(-1), true), axis).width).toFixed(0)}px`,
    );

  const byLevel = subject.byLevel;
  const byGain = subject.byGain;
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
  return { id, direction, props, report: { k, titleForm: titleCard.form, sourceForm: credit.form, pitch: Math.round(pitch), ticks: `${tickLines.length}/${asked.length}`, head: `${laid.headLines} line${laid.headLines > 1 ? "s" : ""}` } };
}
