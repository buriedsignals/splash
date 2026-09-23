// EVERYTHING ONE DIRECTION'S RENDER IS HANDED, BUILT IN BUN — the words, the two rails, every line's ends, every end label
// pushed to a legible pitch and never dropped, the crossing, the colours and the states.
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
import { statesFor } from "./states.mjs";
import { FROM, loadSubject, OVERTAKEN, OVERTOOK, TO } from "./subject.mjs";
import { SLOPE_VIDEO_TIMING } from "./timing-contract.ts";

const HERE = dirname(fileURLToPath(import.meta.url));
export const ROOT = join(HERE, "..", "..");
export const DIRECTIONS = join(ROOT, "docs", "design-base", "directions");
/** The size this run exports at — `--size`, landscape when nothing asks. R2 names three and
 *  everything under it already answered per size; only this line pinned the beat to one. */
export const SIZE = videoExportSize();
export const REGISTER_NAMES = ["display", "eyebrow", "body", "annot", "value", "axis"];
const NB = "\u00A0";
const LABEL_GAP = 0.4;
/** The pitch between two end labels, × the label band. */
export const PITCH = 1.08;

export function loadBeat() {
  const subject = loadSubject();
  return { subject, states: statesFor(), copy: copyOf(subject) };
}

const one = (v) => v.toLocaleString("fr-FR", { minimumFractionDigits: 1, maximumFractionDigits: 1 }).replace(/[\u202F\u00A0\u2009]/g, NB);

export function copyOf(subject) {
  return {
    eyebrow: "Énergie · Europe",
    title: [`Les seize pays ont tous gagné du bas-carbone depuis ${FROM} — un seul a doublé la France`, `Un seul pays a doublé la France`],
    left: (d) => `${d.label} ${one(d.from)}`,
    // The pair is named on the right too: two accent lines ending 0,4 point apart are otherwise told apart by nothing.
    right: (d, pair) => (pair ? `${one(d.to)} ${d.label}` : one(d.to)),
    rails: [String(FROM), String(TO)],
    rose: (n) => `${n}${NB}en hausse`,
    passed: (n) => `${n}${NB}dépasse la France`,
    source: [`Source : Ember, Energy Institute – Statistical Review of World Energy (2025), via Our World in Data`, `Source : Ember, via Our World in Data`],
  };
}

export function textPerRegisterOf(copy, subject) {
  return {
    display: copy.title.join(" "),
    eyebrow: copy.eyebrow,
    body: copy.source.join(" "),
    annot: copy.rails.join(" "),
    value: `${copy.rose(16)} ${copy.passed(1)} 0123456789`,
    axis: `${subject.lines.map(copy.left).join(" ")} ${subject.lines.map((d) => copy.right(d, true)).join(" ")} ${copy.rails.join(" ")} ${copy.source.join(" ")}`,
  };
}

/** Open a stack of labels to a minimum pitch, keeping its order: down from the top, then up from the foot. Refuses
 *  rather than drawing a label off its rail. */
export function spread(wants, pitch, top, foot) {
  const order = wants.map((want, i) => ({ i, want })).sort((a, b) => a.want - b.want);
  const got = order.map((o) => Math.max(o.want, top));
  for (let k = 1; k < got.length; k++) got[k] = Math.max(got[k], got[k - 1] + pitch);
  got[got.length - 1] = Math.min(got[got.length - 1], foot);
  for (let k = got.length - 2; k >= 0; k--) got[k] = Math.min(got[k], got[k + 1] - pitch);
  if (got[0] < top - 0.5) throw new Error(`${wants.length} end labels need ${((wants.length - 1) * pitch).toFixed(0)}px and the rail allows ${(foot - top).toFixed(0)}px`);
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
  const { axis } = registers;
  const measure = (t, r) => {
    const cased = applyCase(t, r.transform);
    return { text: cased, width: widthOf(cased, r) };
  };
  const gap = LABEL_GAP * axis.lead;

  const titleCard = titleCardFor({ registers, eyebrow: copy.eyebrow, title: copy.title, size: SIZE, eyebrowToDisplay: EYEBROW_TO_DISPLAY });
  const { register: sourceRegister, ...credit } = sourceCreditFor({ registers, forms: copy.source, size: SIZE, k, ...CREDIT_ONE_LINE });

  const { lines } = subject;
  // THE ORDERS: the lines drawn largest rise first; the test run on the lines that started under France, lowest finish first.
  const byRise = [...lines].sort((a, b) => b.delta - a.delta).map((d) => d.key);
  const held = subject.held;
  const candidates = lines.filter((d) => d.key !== held.key && d.from < held.from).sort((a, b) => a.to - b.to).map((d) => d.key);
  if (candidates.at(-1) !== OVERTOOK) throw new Error(`the test ends on the one that passes France; it ends on ${candidates.at(-1)}`);
  const lefts = lines.map((d) => measure(copy.left(d), axis));
  const pairKeys = new Set([OVERTOOK, OVERTAKEN]);
  const rights = lines.map((d) => measure(copy.right(d, pairKeys.has(d.key)), axis));
  const leftWidth = Math.max(...lefts.map((t) => t.width)) * (1 + DRAWN_WIDER);
  const rightWidth = Math.max(...rights.map((t) => t.width)) * (1 + DRAWN_WIDER);
  const connector = 1.2 * gap;
  const rail = { left: inset + leftWidth + connector + gap, right: stage.width - inset - rightWidth - connector - gap };
  const railLabels = copy.rails.map((t) => measure(t, axis));

  // WHERE THE DATES SIT IS DECIDED BY WHETHER THE COUNTER CAN STAND BETWEEN THE RAILS.
  // The counter is centred on the space between the two rails and the dates are centred ON them, so
  // at 1920 — 1100px of rail span against a 400px counter — the three share one row with air to
  // spare. At 1080 the two label columns take 700px of the frame and the rails stand 130px apart:
  // « 1 dépasse la France » is 480px wide and was drawn straight through « 2000 » and « 2024 »,
  // which no counter in this beat could see. So when the counter cannot stand between the rails,
  // the dates move to the rails' FEET — where a date belongs on any other chart — and the counter
  // keeps the head row to itself. Landscape's counter fits, so nothing there moves.
  const valueBand = bandOf(BAND_PROBE, registers.value);
  const counterWidth = Math.max(...[...Array.from({ length: lines.length + 1 }, (_, i) => copy.rose(i)), copy.passed(0), copy.passed(1)].map((t) => widthOf(applyCase(t, registers.value.transform), registers.value))) * (1 + DRAWN_WIDER);
  const probe = bandOf(BAND_PROBE, axis);
  const counterFits = counterWidth + 2 * gap <= rail.right - rail.left;
  const creditTop = stage.height - vInset - credit.height;
  const counterBaseline = vInset + valueBand.ascent;
  const railBaseline = counterFits ? vInset + probe.ascent : creditTop - gap - probe.descent;
  const headFoot = counterFits ? vInset + probe.ascent + probe.descent : counterBaseline + valueBand.descent;
  const stackFoot = counterFits ? creditTop - 2 * gap : railBaseline - probe.ascent - gap;
  // THE RAIL'S BAND IS A LADDER, the same shape as the title's forms and the credit's. `BAND_PROBE`
  // is the worst case a register could ever set — a capital under an acute, over four descenders —
  // and at 1920x1080 this rail can afford to reserve it. At 1080x1080 it cannot: measured in creme,
  // the probe bands 37.3 + 9.5px where the sixteen names and values this rail actually sets band
  // 30.3 + 9.5px, so seven pixels a row are reserved for an accent no word on the rail carries —
  // 105px over the stack, against the 68px by which sixteen labels missed the rail. The first rung
  // is the probe, the second the rail's own words; `spread` below still refuses when neither seats
  // sixteen, so the pitch is never taken under the height of the words it holds apart. Landscape
  // never leaves the first rung, so nothing there moves.
  const railWords = [...lefts, ...rights, ...railLabels].map((t) => t.text).join("");
  const drawnBand = bandOf(railWords, axis);
  const seat = (b, p) => ({ band: b, top: headFoot + gap + b.ascent, foot: stackFoot - b.descent, pitch: p * (b.ascent + b.descent) });
  // The third rung takes the air OUT of the pitch and leaves the words their own height: 1,08 is the
  // separation this beat prefers, 1,0 is the least two rows can stand at without touching, and there
  // is no rung under it because there is nothing under it but overlap.
  const rungs = [seat(probe, PITCH), seat(drawnBand, PITCH), seat(drawnBand, 1)];
  const { band, top, foot, pitch } = rungs.find((r) => (lines.length - 1) * r.pitch <= r.foot - r.top) ?? rungs.at(-1);
  const values = lines.flatMap((d) => [d.from, d.to]);
  const lo = Math.min(...values);
  const hi = Math.max(...values);
  const y = (v) => foot - ((v - lo) / (hi - lo)) * (foot - top);
  const leftY = spread(lines.map((d) => y(d.from)), pitch, top, foot);
  const rightY = spread(lines.map((d) => y(d.to)), pitch, top, foot);

  const { ground, accent } = direction;
  const { ink, muted, grid } = deriveFurniture(ground);
  const walked = (c, floor, what) => {
    const w = adjustToContrast(c, ground, floor);
    if (!w) throw new Error(`${what} has no variant that reads at ${floor}:1 on ${ground}`);
    return w;
  };
  const pair = new Set([OVERTOOK, OVERTAKEN]);
  const shift = (band.ascent - band.descent) / 2;
  const drawn = lines.map((d, i) => ({
    key: d.key,
    travelRank: byRise.indexOf(d.key),
    testRank: candidates.includes(d.key) ? candidates.indexOf(d.key) : null,
    passes: d.to > held.to && d.from < held.from,
    pair: pair.has(d.key),
    a: { x: rail.left, y: y(d.from) },
    b: { x: rail.right, y: y(d.to) },
    left: { ...lefts[i], x: rail.left - connector - gap / 2 - lefts[i].width, y: leftY[i] + shift, cy: leftY[i] },
    right: { ...rights[i], x: rail.right + connector + gap / 2, y: rightY[i] + shift, cy: rightY[i] },
  }));
  const { climber, crossAt, crossValue } = subject;
  const cross = { x: rail.left + (rail.right - rail.left) * crossAt, y: y(crossValue) };
  void climber;

  const props = {
    frame: stage,
    registers: { display: titleCard.register, eyebrow: registers.eyebrow, axis, value: registers.value, source: sourceRegister },
    titleCard,
    credit: { ...credit, at: { x: inset, y: stage.height - vInset - credit.height } },
    colours: {
      ground,
      rail: grid,
      line: walked(mix(muted, ground, 0.1), NON_TEXT_CONTRAST_MIN, "a line"),
      lit: walked(ink, NON_TEXT_CONTRAST_MIN, "a line under test"),
      pair: walked(accent, NON_TEXT_CONTRAST_MIN, "the pair's lines"),
      text: {
        eyebrow: walked(registers.eyebrow.fill ?? accent, TEXT_CONTRAST_MIN, "the eyebrow"),
        title: walked(registers.display.fill ?? ink, TEXT_CONTRAST_MIN, "the title"),
        label: walked(muted, TEXT_CONTRAST_MIN, "a label"),
        pair: walked(accent, TEXT_CONTRAST_MIN, "the pair's labels"),
        rail: walked(muted, TEXT_CONTRAST_MIN, "the rails"),
        count: walked(ink, TEXT_CONTRAST_MIN, "the counts"),
      },
    },
    strokes: { line: (direction.stroke?.data ?? 2) * k * 0.8, pair: (direction.stroke?.data ?? 2) * k * 1.4, rail: (direction.stroke?.hairline ?? 0.6) * k, connector: (direction.stroke?.hairline ?? 0.6) * k },
    rail: { ...rail, top: top - band.ascent - gap / 2, foot: foot + band.descent },
    railLabels: railLabels.map((t, i) => ({ ...t, x: (i === 0 ? rail.left : rail.right) - t.width / 2, y: railBaseline })),
    lines: drawn,
    held: OVERTAKEN,
    climber: OVERTOOK,
    counters: (() => {
      const value = registers.value;
      const texts = (f, n) => Object.fromEntries(Array.from({ length: n + 1 }, (_, i) => [String(i), measure(f(i), value)]));
      const rose = texts(copy.rose, lines.length);
      const passed = texts(copy.passed, 1);
      // Centred between the rails when it stands there, centred on the frame when it has the row to
      // itself: a counter wider than the rails are apart is no longer a word about the gap.
      const x = counterFits ? (rail.left + rail.right) / 2 - counterWidth / 2 : (stage.width - counterWidth) / 2;
      return { rose, passed, x, y: counterBaseline, value };
    })(),
    cross,
    dotR: 0.14 * axis.lead,
    halo: haloOf(axis, k),
    layoutInset: { x: inset, y: vInset },
    states,
    timing: SLOPE_VIDEO_TIMING,
  };
  return { id, direction, props, report: { k, titleForm: titleCard.form, sourceForm: credit.form, pushed: Math.round(Math.max(...drawn.map((d) => Math.max(Math.abs(d.left.cy - d.a.y), Math.abs(d.right.cy - d.b.y))))) } };
}
