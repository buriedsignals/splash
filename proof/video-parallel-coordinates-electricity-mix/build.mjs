// EVERYTHING ONE DIRECTION'S RENDER IS HANDED, BUILT IN BUN — the words, the seven rails on one scale and the camera's two
// spacings, Finland's bar and its pieces, every line's vertices, every name seated once at its highest vertex (and the
// close-up's names spread beside the nuclear rail), the two floors, every counter text measured and keyed, the colours
// and the states.
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
import { BAND_PROBE, bandOf, CREDIT_ONE_LINE, DRAWN_WIDER, haloOf, sourceCreditFor, titleCardFor, verticalInsetFor, widthOf } from "../../skills/chart-video/scripts/shots.mjs";
import { videoRegistersOf } from "../../skills/chart-video/scripts/video-registers.mjs";
import { statesFor } from "./states.mjs";
import { AXES, loadSubject, NUCLEAR_FLOOR, WIND_FLOOR } from "./subject.mjs";
import { PARALLEL_VIDEO_TIMING } from "./timing-contract.ts";

const HERE = dirname(fileURLToPath(import.meta.url));
export const ROOT = join(HERE, "..", "..");
export const DIRECTIONS = join(ROOT, "docs", "design-base", "directions");
/** The size this run exports at — `--size`, landscape when nothing asks. R2 names three and
 *  everything under it already answered per size; only this line pinned the beat to one. */
export const SIZE = videoExportSize();
export const REGISTER_NAMES = ["display", "eyebrow", "body", "annot", "value", "axis"];
const NB = "\u00A0";
/** The pitch between two close-up names, × the label band. */
export const PITCH = 1.08;

/**
 * THE NARROW FRAME TURNS THE CHART A QUARTER TURN.
 *
 * The reference is what decides it, and the arithmetic is not close. Finland's whole electricity is
 * 100 points laid along the foot, on the same scale as the rails — and the rails are `ceiling` = 70
 * points tall. So the bar is always 100/70 = 1.43 times the plot's own height, and it needs that
 * much room along the OTHER axis:
 *
 *   landscape 1920x1080 — the plot is 807px tall, the bar wants 1153px, the frame offers ~1500. Fits.
 *   square    1080x1080 — the plot is 710px tall, the bar wants 1015px, the frame offers 790. It does
 *                         not fit, which is the refusal this beat carried: « the whole bar (1015px)
 *                         and its « 100 % » run off the frame ».
 *   portrait  1080x1920 — the plot is 1524px tall, the bar wants 2177px against the same 790. Worse.
 *
 * Capping the scale so the bar fits does not answer it either: at portrait it would leave the chart
 * 624px tall in a 1524px frame — nine hundred pixels of nothing.
 *
 * So a narrow frame draws the same argument turned: the seven rails are HORIZONTAL lines stacked
 * down the frame with their names at the left, the values run left to right, each country's name
 * sits beside its own vertex, and the reference bar STANDS on the value axis's foot so that every
 * piece slides onto its rail rather than rising onto it. Turned, the bar needs 1.43 times the plot's
 * WIDTH along the frame's height — 909px against 1524 at portrait, which fits with room to spare,
 * and 909 against 710 at square, where the scale is capped by the bar and the value axis simply ends
 * short of the margin, leaving the names the slack.
 *
 * Landscape is untouched: every branch below is on this flag, and `TRANSPOSED` is false there.
 */
const TRANSPOSED = SIZE !== "landscape";

export function loadBeat() {
  const subject = loadSubject();
  return { subject, states: statesFor(), copy: copyOf(subject) };
}

export function copyOf(subject) {
  return {
    eyebrow: `Énergie${NB}· Europe`,
    title: [
      `${subject.both.length} pays sur ${subject.lines.length} ont plus de ${NUCLEAR_FLOOR}${NB}% de nucléaire et plus de ${WIND_FLOOR}${NB}% d’éolien`,
      `${subject.both.length} pays sur ${subject.lines.length} passent ${NUCLEAR_FLOOR}${NB}% de nucléaire et ${WIND_FLOOR}${NB}% d’éolien`,
    ],
    /** Where a full name is wider than the gap between two rails. At landscape that is one country and
     *  the short form is only reached for after the full name has been tried on every rail.
     *
     *  A narrow frame files eight and reaches for them FIRST. Measured: transposed, two names on one
     *  rail are separated along the VALUES, and the value axis is 466px wide at square while a name is
     *  up to 284px — so the seven rails hold about fourteen full names and there are sixteen. « Pays-Bas »
     *  found no seat on any rail, in any of its six places, in either form. The eight filed here are the
     *  longest; the other eight countries keep their full names. */
    short: TRANSPOSED
      ? { GBR: "R.-U.", NLD: "P.-Bas", DEU: "All.", DNK: "Dan.", AUT: "Aut.", BEL: "Belg.", PRT: "Port.", CZE: "Tch." }
      : { GBR: "R.-U." },
    whole: `100${NB}%`,
    percent: (v) => `${v}${NB}%`,
    count: (n) => `${n}${NB}pays`,
    source: [
      "Source : Ember, Energy Institute – Statistical Review of World Energy (2025), via Our World in Data",
      "Source : Ember, Energy Institute – Statistical Review of World Energy, via Our World in Data",
      "Source : Ember, Energy Institute, via Our World in Data",
    ],
  };
}

export function textPerRegisterOf(copy, subject) {
  return {
    display: copy.title.join(" "),
    eyebrow: copy.eyebrow,
    body: copy.source.join(" "),
    annot: AXES.map((a) => a.name).join(" "),
    value: `${copy.count(16)} 0123456789`,
    axis: `${AXES.map((a) => a.name).join(" ")} ${subject.lines.map((l) => l.name).join(" ")} ${Object.values(copy.short).join(" ")} ${copy.whole} ${copy.percent(25)} 0123456789 ${copy.source.join(" ")}`,
  };
}

const overlaps = (a, b) => a.x0 < b.x1 && b.x0 < a.x1 && a.y0 < b.y1 && b.y0 < a.y1;

/** Open a stack of labels to a minimum pitch, keeping its order: down from the top, then up from the foot. Refuses
 *  rather than drawing a label off its rail. */
export function spread(wants, pitch, top, foot) {
  const order = wants.map((want, i) => ({ i, want })).sort((a, b) => a.want - b.want);
  const got = order.map((o) => Math.max(o.want, top));
  for (let k = 1; k < got.length; k++) got[k] = Math.max(got[k], got[k - 1] + pitch);
  got[got.length - 1] = Math.min(got[got.length - 1], foot);
  for (let k = got.length - 2; k >= 0; k--) got[k] = Math.min(got[k], got[k + 1] - pitch);
  if (got[0] < top - 0.5) throw new Error(`${wants.length} close-up names need ${((wants.length - 1) * pitch).toFixed(0)}px and the rail allows ${(foot - top).toFixed(0)}px`);
  const out = new Array(wants.length);
  order.forEach((o, k) => (out[o.i] = got[k]));
  return out;
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
  const wider = (w) => w * (1 + DRAWN_WIDER);
  const gap = 0.4 * axis.lead;
  const band = bandOf(BAND_PROBE, axis);
  const valueBand = bandOf(BAND_PROBE, value);
  const labelH = band.ascent + band.descent;
  const shift = (band.ascent - band.descent) / 2;
  const pad = 0.12 * axis.fontSize;

  const titleCard = titleCardFor({ registers, eyebrow: copy.eyebrow, title: copy.title, size: SIZE, eyebrowToDisplay: EYEBROW_TO_DISPLAY });
  const { register: sourceRegister, ...credit } = sourceCreditFor({ registers, forms: copy.source, size: SIZE, k, ...CREDIT_ONE_LINE });
  const creditAt = { x: inset, y: stage.height - vInset - credit.height };
  const creditBox = { x0: creditAt.x, y0: creditAt.y, x1: creditAt.x + credit.width, y1: creditAt.y + credit.height };

  // THE HEADER ROW (the rail names, and the close-up's count between them) AND THE PLOT UNDER IT, ON ONE SCALE.
  // `stackTop` and `stackFoot` are the two ends of the RAILS' own stacking — an x at landscape, where the
  // rails march across the frame, and a y transposed, where they stack down it. `top` and `foot` are the two
  // ends of the VALUE axis, the other way round. Naming the two axes rather than assuming them is what lets
  // one set of arithmetic draw both frames.
  const headerBaseline = vInset + Math.max(band.ascent, valueBand.ascent);
  const headerBottom = headerBaseline + Math.max(band.descent, valueBand.descent);
  const railNames = AXES.map((a) => measure(a.name, axis));
  const gutter = Math.max(...railNames.map((t) => wider(t.width)));

  const stackTop = TRANSPOSED ? headerBottom + gap + labelH / 2 : inset + wider(railNames[0].width) / 2;
  const stackFoot = TRANSPOSED ? creditAt.y - gap - labelH / 2 : stage.width - inset - wider(railNames.at(-1).width) / 2;
  const foot = TRANSPOSED ? inset + gutter + gap : creditAt.y - gap - labelH / 2;
  // THE REFERENCE DECIDES THE SCALE WHEN IT MUST. The value axis would take the room it is given; the bar is
  // 100 points on the same scale and has to lie inside the rails' own span, so the smaller of the two rules.
  const valueEnd = headerBottom + gap + labelH / 2;
  // WHERE THE REFERENCE BAR IS ALLOWED TO LIE. It is only ever drawn before the split — by the time a rail
  // or a credit exists, its pieces have stood up and thinned into the lines — so the room it needs is the
  // FRAME's own margins, not the rails' stacking span. Transposed that is 892px of a square's height rather
  // than 666px, and it is what the value axis is worth: 624px of rails instead of 466, which is the
  // difference between sixteen names finding a seat and « Pays-Bas » finding none.
  const barStart = TRANSPOSED ? vInset : stackTop;
  const barRoom = TRANSPOSED ? stage.height - vInset - barStart : stage.width - inset - barStart;
  const scale = TRANSPOSED
    ? Math.min((stage.width - inset - foot) / subject.ceiling, (barRoom - AXES.length * 0.35 * gap) / 100)
    : (foot - valueEnd) / subject.ceiling;
  const top = TRANSPOSED ? foot + subject.ceiling * scale : valueEnd;
  const yOf = (v) => (TRANSPOSED ? foot + v * scale : foot - v * scale);

  // THE CAMERA'S TWO SPACINGS. The whole: the outer rails inset by their own names. The close-up: the nuclear rail
  // inset by the names spread beside it, the wind rail by its own name. Transposed the two close rails take the
  // whole stack, each stepped in by one label band so the floor's value and the close-up's names have their air.
  const wholeLeft = stackTop;
  const wholeRight = stackFoot;
  const closeLines = TRANSPOSED ? subject.both : subject.lines.filter((l) => l.values[0] > 0);
  const closeTexts = closeLines.map((l) => measure(l.name, axis));
  const connector = 1.2 * gap;
  const closeLeft = TRANSPOSED ? stackTop + labelH + gap : inset + Math.max(...closeTexts.map((t) => wider(t.width))) + connector + gap;
  const closeRight = TRANSPOSED ? stackFoot - labelH - gap : stage.width - inset - wider(railNames[1].width) / 2;
  if (!(TRANSPOSED ? closeLeft - labelH / 2 >= headerBottom : closeLeft - wider(railNames[0].width) / 2 >= inset))
    throw new Error("the nuclear rail's name hangs off the close-up");
  const camera = { whole: { left: wholeLeft, step: (wholeRight - wholeLeft) / (AXES.length - 1) }, close: { left: closeLeft, step: closeRight - closeLeft } };
  const railX = (i) => camera.whole.left + i * camera.whole.step;

  // THE BAR: Finland's whole along the foot, its pieces in the rails' order, then the rest.
  const shown = subject.shown;
  const thickness = 0.45 * axis.lead;
  const splitGap = 0.35 * gap;
  let cum = 0;
  const pieces = [...shown.values.map((v, i) => ({ axis: i, v })), { axis: null, v: shown.rest }].map((p) => {
    const piece = { axis: p.axis, cum, len: p.v * scale };
    cum += p.v;
    return piece;
  });
  const hundred = measure(copy.whole, axis);
  const barEnd = barStart + 100 * scale + (pieces.length - 1) * splitGap;
  // « 100 % » sits just past the bar's far end, on the far side of the value axis's foot. It is only ever
  // drawn before the split, when no rail has arrived, so transposed it may sit on the last rail's line.
  const hundredLine = TRANSPOSED
    ? { ...hundred, x: foot + thickness / 2 + gap / 2, y: barStart + 100 * scale + shift }
    : { ...hundred, x: barStart + 100 * scale + gap / 2, y: foot + shift };
  const barLimit = TRANSPOSED ? stage.height - vInset : stage.width - inset;
  const barFar = TRANSPOSED ? hundredLine.y + band.descent : hundredLine.x + wider(hundred.width);
  // A hair of tolerance, because where the bar is what CAPPED the scale this compares a number with the
  // arithmetic it was derived from and a last-bit rounding would refuse a bar that exactly fits.
  if (!(barEnd <= barLimit + 1e-6 && barFar <= barLimit + 1e-6))
    throw new Error(`the whole bar (${(100 * scale).toFixed(0)}px) and its « 100 % » run off the frame`);
  const barName = TRANSPOSED
    ? { ...measure(shown.name, axis), x: foot + thickness / 2 + gap / 2, y: barStart + shift }
    : { ...measure(shown.name, axis), x: barStart + thickness / 2 + gap / 2, y: foot - thickness / 2 - gap / 2 - band.descent };

  // THE FLOORS: a tick across the rail, the value beside it — right of the nuclear rail, left of the wind rail.
  const tick = 1.6 * gap;
  const floorTexts = (max) => Object.fromEntries(Array.from({ length: max + 1 }, (_, v) => [String(v), measure(copy.percent(v), axis)]));
  const floors = [
    { axis: 0, value: NUCLEAR_FLOOR, side: "right", texts: floorTexts(NUCLEAR_FLOOR) },
    { axis: 1, value: WIND_FLOOR, side: "left", texts: floorTexts(WIND_FLOOR) },
  ];
  // The value beside the tick: along the values at landscape, and across the rail transposed — above the
  // nuclear rail, below the wind one, which is the same « right » and « left » read a quarter turn on.
  const floorBox = (f, u) => {
    const w = wider(f.texts[String(f.value)].width);
    if (TRANSPOSED) {
      const left = yOf(f.value) - w / 2;
      const baseline = f.side === "right" ? u - tick / 2 - gap / 2 - band.descent : u + tick / 2 + gap / 2 + band.ascent;
      return { x0: left - pad, x1: left + w + pad, y0: baseline - band.ascent - pad, y1: baseline + band.descent + pad };
    }
    const left = f.side === "right" ? u + tick / 2 + gap / 2 : u - tick / 2 - gap / 2 - w;
    return { x0: left - pad, x1: left + w + pad, y0: yOf(f.value) - labelH / 2 - pad, y1: yOf(f.value) + labelH / 2 + pad };
  };
  const floorBoxes = floors.map((f) => floorBox(f, railX(f.axis)));

  // EVERY LINE NAMED ONCE, AT ITS HIGHEST VERTEX (the static's rule); where the seat is taken, its next highest.
  const pairCodes = new Set(subject.both.map((l) => l.code));
  // Transposed, the rails' own names sit in a gutter at the left of the plot rather than in the header row,
  // so they are an obstacle a country's name has to be seated around — measured at square, « Royaume-Uni »
  // was seated straight through « Gaz ». At landscape the header row does that job through `headerBottom`.
  const railNameBoxes = TRANSPOSED
    ? railNames.map((t, i) => ({
        x0: foot - gap - wider(t.width) - pad,
        x1: foot - gap + pad,
        y0: railX(i) - band.ascent - pad / 2,
        y1: railX(i) + band.descent + pad / 2,
      }))
    : [];
  const off = 0.3 * gap;
  // ONE PLATE, TWO ATTEMPTS: the whole set of names is seated with every country's FULL name first, and only
  // if some country is left without a seat is the plate seated again with the short forms leading. So a frame
  // with the room reads « Allemagne » and « Danemark » — portrait does — and a frame without it reads « All. »
  // and « Dan. » rather than the beat refusing. Spending a copy form is the first rung of the removal ladder,
  // and this spends it on the plate rather than on whichever country happened to be seated last.
  const seatAll = (shortFirst) => {
    const placed = [...floorBoxes, ...railNameBoxes, creditBox];
    const seats = new Map();
    let missed = null;
    for (const l of [...subject.lines].sort((a, b) => Number(pairCodes.has(b.code)) - Number(pairCodes.has(a.code)))) {
    const order = l.values.map((v, i) => ({ i, v })).sort((a, b) => b.v - a.v);
    let seat = null;
    const why = [];
    // The full name on every rail first, the short form where it crosses a neighbour everywhere — and the
    // other way round at a narrow frame, where the room is what is short (see `copy.short`).
    // `du` is the seat's offset from its OWN rail, along the rails' stacking — the one number that travels when
    // the camera opens — and `v` is where it stays put along the values. At landscape that is a name beside its
    // rail at the vertex's height; transposed it is the same name above or below its rail at the vertex's abscissa.
    // THE AIR AROUND A NAME IS ASKED FOR, THEN GIVEN UP. Transposed, two names on one rail sit side by side
    // on one line, so a whole gap between them is what makes « FINLANDE » and « FRANCE » two words; but at
    // square the seven rails hold about fourteen names that airy and there are sixteen, so a name with no
    // airy seat left takes a tight one rather than the beat refusing. Landscape asks for `pad` and gets it.
    const forms = shortFirst ? [copy.short[l.code], l.name] : [l.name, copy.short[l.code]];
    for (const [sep, name] of (TRANSPOSED ? [gap / 2, pad] : [pad]).flatMap((sp) => forms.filter(Boolean).map((n) => [sp, n]))) {
      const t = measure(name, axis);
      const w = wider(t.width);
      for (const { i } of order) {
        const at = yOf(l.values[i]);
        // Transposed, a name has six places to try at each vertex rather than two: over its rail or under it,
        // and on the vertex or beside it either way. Measured at square, where the value axis is 466px wide and
        // a name is up to 284px, two places are not enough — the sixteen names cluster at the foot of every rail
        // and « Pays-Bas » found none.
        for (const anchor of TRANSPOSED ? ["above", "above-start", "above-end", "below", "below-start", "below-end"] : ["start", "end"]) {
          if (TRANSPOSED) {
            const baseline = anchor.startsWith("above") ? railX(i) - off - band.descent : railX(i) + off + band.ascent;
            const x0 = anchor.endsWith("-start") ? at + off : anchor.endsWith("-end") ? at - off - w : at - w / 2;
            const box = { x0: x0 - sep, x1: x0 + w + sep, y0: baseline - band.ascent - pad / 2, y1: baseline + band.descent + pad / 2 };
            if (box.x0 < inset || box.x1 > stage.width - inset || box.y0 < headerBottom) {
              why.push(`${name}@${i}/${anchor}: off the frame`);
              continue;
            }
            if (placed.some((p) => overlaps(p, box))) {
              why.push(`${name}@${i}/${anchor}: taken`);
              continue;
            }
            if (AXES.some((_, j) => j !== i && railX(j) > box.y0 - pad && railX(j) < box.y1 + pad)) {
              why.push(`${name}@${i}/${anchor}: crosses a rail`);
              continue;
            }
            seat = { ...t, axis: i, anchor, off, du: baseline - railX(i), v: x0, y: baseline, box };
            break;
          }
          const x0 = anchor === "start" ? railX(i) + off : railX(i) - off - w;
          const box = { x0: x0 - pad, x1: x0 + w + pad, y0: at - labelH / 2 - pad / 2, y1: at + labelH / 2 + pad / 2 };
          if (box.x0 < inset || box.x1 > stage.width - inset || box.y0 < headerBottom) continue;
          if (placed.some((p) => overlaps(p, box))) continue;
          if (AXES.some((_, j) => j !== i && railX(j) > box.x0 - pad && railX(j) < box.x1 + pad)) continue;
          // `du` is measured off the name's OWN width, not the 2 % Chrome is allowed to draw it wider by:
          // the box above reserves the wider figure so a neighbour cannot be drawn into it, and the seat is
          // drawn at the measured one. The two have differed here since the beat was cut and the drawn
          // position is what the delivered landscape frames carry.
          seat = { ...t, axis: i, anchor, off, du: anchor === "start" ? off : -off - t.width, v: at + shift, y: at + shift, box };
          break;
        }
        if (seat) break;
      }
      if (seat) break;
    }
    // The refusal carries what was tried, because a seat is refused by the frame and not by the datum:
    // « taken » counts the places another name or a floor already holds, « off the frame » the places the
    // margins refuse. It is what tells a later pass whether to shorten the copy or to re-cut the layout.
    if (!seat) {
      missed =
        `${l.name} finds no seat for its name on any of its seven rails — ${why.length} places tried: ` +
        Object.entries(why.reduce((n, w) => ({ ...n, [w.split(": ")[1]]: (n[w.split(": ")[1]] ?? 0) + 1 }), {}))
          .map(([reason, n]) => `${n} ${reason}`)
          .join(", ");
      break;
    }
    placed.push(seat.box);
    seats.set(l.code, seat);
    }
    return { seats, missed };
  };
  const seated = (() => {
    const first = seatAll(false);
    if (!first.missed) return first;
    const second = seatAll(true);
    if (!second.missed) return second;
    throw new Error(second.missed);
  })();
  const seats = seated.seats;

  // THE CLOSE-UP'S NAMES. At landscape: every line with some nuclear, spread down a gutter beside the nuclear
  // rail, a hairline back to its vertex. Transposed there is no such gutter — the left of the frame is where the
  // rails' own names live — so the names go ABOVE the nuclear rail, spread across the frame, and the close-up
  // names only the two countries the claim is about; the count beside them carries the rest, which is what it
  // was always for. Thirteen names spread across 636px would each have had 49px.
  const pitch = PITCH * labelH;
  const closeOf = TRANSPOSED
    ? (() => {
        const widest = Math.max(...closeTexts.map((t) => wider(t.width)));
        const xs = spread(closeLines.map((l) => yOf(l.values[0]) - widest / 2), widest + gap, inset, stage.width - inset - widest);
        const drop = band.descent;
        const du = -(connector + band.descent);
        return new Map(closeLines.map((l, i) => [l.code, { ...closeTexts[i], x: xs[i], cx: xs[i] + closeTexts[i].width / 2, du, drop, cy: xs[i], y: 0 }]));
      })()
    : (() => {
        const ys = spread(closeLines.map((l) => yOf(l.values[0])), pitch, top, foot);
        return new Map(closeLines.map((l, i) => [l.code, { ...closeTexts[i], dx: connector + gap / 2 + closeTexts[i].width, cy: ys[i], y: ys[i] + shift }]));
      })();

  // THE ORDER THE OTHERS ARE DRAWN IN: the largest nuclear share first.
  const others = subject.lines.filter((l) => l !== shown).sort((a, b) => b.values[0] - a.values[0]);
  const lines = subject.lines.map((l) => ({
    code: l.code,
    name: l.name,
    values: l.values,
    pair: pairCodes.has(l.code),
    shown: l === shown,
    drawRank: l === shown ? null : others.indexOf(l),
    vs: l.values.map(yOf),
    seat: seats.get(l.code),
    close: closeOf.get(l.code) ?? null,
  }));

  // THE COUNT, between the two close rails in the header row.
  const counts = Object.fromEntries(Array.from({ length: lines.length + 1 }, (_, n) => [String(n), measure(copy.count(n), value)]));
  const widest = Math.max(...Object.values(counts).map((t) => wider(t.width)));
  // Between the two close rails in the header row at landscape; transposed the header row is the count's alone —
  // the rail names are at the left — so it sits centred over the values.
  const counter = TRANSPOSED
    ? { texts: counts, x: foot + (top - foot - widest) / 2, y: headerBaseline }
    : { texts: counts, x: (closeLeft + closeRight) / 2 - widest / 2, y: headerBaseline };
  if (
    TRANSPOSED
      ? !(counter.x >= inset && counter.x + widest <= stage.width - inset)
      : !(counter.x > closeLeft + wider(railNames[0].width) / 2 + gap && counter.x + widest < closeRight - wider(railNames[1].width) / 2 - gap)
  )
    throw new Error("the count touches a close rail's name");

  // COLOURS: the field a tint of the accent, the pair the accent, the rails and the floors steps off the ground.
  const { ground, accent } = direction;
  const { ink, muted } = deriveFurniture(ground);
  const walked = (c, floor, what) => {
    const w = adjustToContrast(c, ground, floor);
    if (!w) throw new Error(`${what} has no variant that reads at ${floor}:1 on ${ground}`);
    return w;
  };
  let field = mix(accent, ground, 0.55);
  if (contrast(field, ground) < NON_TEXT_CONTRAST_MIN) field = walked(field, NON_TEXT_CONTRAST_MIN, "the field's lines");
  const colours = {
    ground,
    rail: walked(mix(ground, ink, 0.35), NON_TEXT_CONTRAST_MIN, "a rail"),
    field,
    lit: walked(mix(ink, ground, 0.2), NON_TEXT_CONTRAST_MIN, "the bar"),
    pair: walked(accent, NON_TEXT_CONTRAST_MIN, "the pair's lines"),
    floor: walked(ink, NON_TEXT_CONTRAST_MIN, "a floor"),
    text: {
      eyebrow: walked(registers.eyebrow.fill ?? accent, TEXT_CONTRAST_MIN, "the eyebrow"),
      title: walked(registers.display.fill ?? ink, TEXT_CONTRAST_MIN, "the title"),
      name: walked(muted, TEXT_CONTRAST_MIN, "a name"),
      pair: walked(accent, TEXT_CONTRAST_MIN, "the pair's names"),
      rail: walked(muted, TEXT_CONTRAST_MIN, "a rail's name"),
      count: walked(ink, TEXT_CONTRAST_MIN, "the count"),
    },
  };
  const rule = (direction.stroke?.rule ?? 1) * k;

  const props = {
    frame: stage,
    registers: { display: titleCard.register, eyebrow: registers.eyebrow, axis, value, source: sourceRegister },
    titleCard,
    credit: { ...credit, at: creditAt },
    colours,
    strokes: { line: rule * 1.1, pair: rule * 2.6, rail: rule, floor: rule * 2.6, connector: rule * 0.6 },
    camera,
    scale,
    top,
    foot,
    /** Which way round the two axes are drawn — see TRANSPOSED. Everything that has to know reads it here
     *  rather than re-deriving it from the frame's shape. */
    transposed: TRANSPOSED,
    labelH,
    /** Where a rail's name ends, transposed: right-aligned into the gutter left of the value axis's foot. */
    railNameRight: TRANSPOSED ? foot - gap : null,
    headerBaseline,
    axes: railNames,
    bar: { x0: barStart, splitGap, thickness, pieces, name: barName, hundred: hundredLine },
    floors: floors.map(({ axis: a, value: v, side, texts }) => ({ axis: a, value: v, side, texts })),
    tick,
    gap,
    shift,
    lines,
    counter,
    halo: haloOf(axis, k),
    states,
    timing: PARALLEL_VIDEO_TIMING,
  };
  return {
    id,
    direction,
    props,
    report: { k, titleForm: titleCard.form, sourceForm: credit.form, scale: scale.toFixed(2), seated: [...seats.values()].map((s) => s.axis).join(""), short: [...seats.values()].filter((s) => Object.values(copy.short).includes(s.text)).length },
  };
}
