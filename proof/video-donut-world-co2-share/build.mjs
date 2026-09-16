// EVERYTHING ONE DIRECTION'S RENDER IS HANDED, BUILT IN BUN — the words, the world ring on one px-per-Gt scale in both
// years, the names seated clear of the ring they name, the six rings' seats in one row with their words, every text
// measured, the colours (the past measured the way the static plate measures it) and the states.
//
// Runs in Bun only.

import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { adjustToContrast, contrast, mix, NON_TEXT_CONTRAST_MIN, TEXT_CONTRAST_MIN } from "#shared/chart-beat/colour.mjs";
import { deriveFurniture } from "#shared/chart-beat/render-still.mjs";
import { frameInsetFor, sizeFor } from "#shared/chart-video/sizes.mjs";
import { readDirection } from "#shared/design-base/read-direction.mjs";
import { EYEBROW_TO_DISPLAY, registerOf } from "#shared/design-base/register.mjs";
import { resolveDirectionFamilies } from "#shared/design-base/resolve-families.mjs";
import { applyCase } from "../../skills/chart-video/scripts/registers.mjs";
import { BAND_PROBE, bandOf, CREDIT_ONE_LINE, DRAWN_WIDER, sourceCreditFor, titleCardFor, verticalInsetFor, widthOf } from "../../skills/chart-video/scripts/shots.mjs";
import { videoRegistersOf } from "../../skills/chart-video/scripts/video-registers.mjs";
import { statesFor } from "./states.mjs";
import { FROM, loadSubject, NAMED, SUBJECT, TO } from "./subject.mjs";
import { DONUT_VIDEO_TIMING } from "./timing-contract.ts";

const HERE = dirname(fileURLToPath(import.meta.url));
export const ROOT = join(HERE, "..", "..");
export const DIRECTIONS = join(ROOT, "docs", "design-base", "directions");
export const SIZE = "landscape";
export const REGISTER_NAMES = ["display", "eyebrow", "body", "annot", "value", "axis"];
const NB = "\u00A0";
const TURN = 2 * Math.PI;
const LABEL_GAP = 0.4;
/** The static plate's ring: 7 px of stroke and 3.5 px between the two arcs on a ~54 px ring, as shares of the radius. */
const RING_WIDTH = 0.1;
const RING_GAP = 0.4;
/** The world ring is drawn thicker than a country's, and its members parted by a seam of ground. */
const WORLD_WIDTH = 2;
const SEAM = 0.3;
/** A ring's radius as a share of its slot — the static plate's 0.42, opened where the video's frame has the room. */
const SLOT_SHARE = 0.46;

export function loadBeat() {
  const subject = loadSubject();
  return { subject, states: statesFor(), copy: copyOf(subject) };
}

const fr = (v, digits) => v.toLocaleString("fr-FR", { minimumFractionDigits: digits, maximumFractionDigits: digits }).replace(/[\u202F\u00A0\u2009]/g, NB);

export function copyOf(subject) {
  return {
    eyebrow: "Climat · Monde",
    title: [
      `En ${FROM} les États-Unis émettaient un quart du CO₂ mondial et la Chine un septième${NB}; en ${TO}, c’est l’inverse`,
      `La Chine et les États-Unis ont échangé leurs parts du CO₂ mondial`,
      `Les parts du CO₂ mondial, ${FROM} et ${TO}`,
    ],
    share: (v) => `${fr(v, 1)}${NB}%`,
    label: (name, v) => `${name} ${fr(v, 1)}${NB}%`,
    world: (year, gt) => `${year} · ${fr(gt, 1)}${NB}Gt`,
    tonnes: [(year, gt) => `${year} · ${fr(gt, 1)}${NB}Gt`, (_, gt) => `${fr(gt, 1)}${NB}Gt`],
    source: [`Sources : Global Carbon Budget 2025 · population, via Our World in Data`, `Sources : Global Carbon Budget, Our World in Data`],
  };
}

export function textPerRegisterOf(copy, subject) {
  const { countries, world0, world1 } = subject;
  return {
    display: copy.title.join(" "),
    eyebrow: copy.eyebrow,
    body: copy.source.join(" "),
    annot: countries.map((c) => c.name).join(" "),
    value: `${countries.map((c) => `${copy.label(c.name, c.share0)} ${copy.share(c.share1)}`).join(" ")} ${copy.world(FROM, world0)} ${copy.world(TO, world1)}`,
    axis: `${countries.map((c) => `${copy.tonnes[0](FROM, c.gt0)} ${copy.tonnes[0](TO, c.gt1)}`).join(" ")} ${copy.source.join(" ")}`,
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
  const { axis, value, annot } = registers;
  const measure = (t, r) => {
    const cased = applyCase(t, r.transform);
    return { text: cased, width: widthOf(cased, r) };
  };
  const drawn = (m) => m.width * (1 + DRAWN_WIDER);
  const gap = LABEL_GAP * axis.lead;
  const aBand = bandOf(BAND_PROBE, axis);
  const vBand = bandOf(BAND_PROBE, value);
  const nBand = bandOf(BAND_PROBE, annot);
  const valueBand = vBand.ascent + vBand.descent;

  const titleCard = titleCardFor({ registers, eyebrow: copy.eyebrow, title: copy.title, size: SIZE, eyebrowToDisplay: EYEBROW_TO_DISPLAY });
  const { register: sourceRegister, ...credit } = sourceCreditFor({ registers, forms: copy.source, size: SIZE, k, ...CREDIT_ONE_LINE });
  const creditY = stage.height - vInset - credit.height;
  const { countries, world0, world1 } = subject;

  // ── THE SIX RINGS: one row, one slot each, the static plate's radius cap; under each its name and both years' tonnes ──
  const slot = (stage.width - 2 * inset) / countries.length;
  const holes = countries.map((c) => measure(copy.share(c.share1), value));
  const names = countries.map((c) => measure(c.name, annot));
  const form = copy.tonnes.findIndex((f) => countries.every((c) => [f(FROM, c.gt0), f(TO, c.gt1)].every((t) => drawn(measure(t, axis)) < slot - gap)));
  if (form === -1) throw new Error("no tonnes form fits under a ring's slot");
  if (!names.every((m) => drawn(m) < slot - gap)) throw new Error("a country's name runs wider than its slot");
  const under = gap + nBand.ascent + nBand.descent + gap / 2 + aBand.ascent + axis.lead + aBand.descent;
  const room = creditY - gap - vInset;
  const edge = Math.min(SLOT_SHARE * slot, (room - under) / 2);
  const width = RING_WIDTH * edge;
  const small = { width, outer: edge - width / 2, inner: edge - width * 1.5 - RING_GAP * width, holeRing: 0 };
  const hole = small.inner - width / 2;
  const chnHole = holes[countries.findIndex((c) => c.code === SUBJECT)];
  const ringStroke = (direction.stroke?.hairline ?? 0.6) * k * 1.5;
  small.holeRing = Math.hypot(drawn(chnHole) / 2, valueBand / 2) + 0.14 * value.fontSize;
  if (!(Math.max(...holes.map((m) => Math.hypot(drawn(m) / 2, valueBand / 2))) < hole)) throw new Error(`a ring's hole (${Math.round(hole)}px) cannot hold its number`);
  if (!(small.holeRing + ringStroke < hole)) throw new Error("China's ring would touch its inner arc");
  const smallestArc = Math.min(...countries.map((c) => Math.min(c.share0, c.share1))) / 100 * TURN * small.inner;
  if (!(smallestArc >= 3)) throw new Error(`the shortest arc on a ring is ${smallestArc.toFixed(1)}px, under three`);
  const blockTop = vInset + (room - 2 * edge - under) / 2;
  const seatY = blockTop + edge;
  const nameBaseline = seatY + edge + gap + nBand.ascent;
  const tonnes0Baseline = nameBaseline + nBand.descent + gap / 2 + aBand.ascent;
  const centred = (m, x, y) => ({ ...m, x: x - drawn(m) / 2, y });
  const seated = countries.map((c, i) => {
    const x = inset + slot * (i + 0.5);
    return {
      code: c.code,
      subject: c.code === SUBJECT,
      gt0: c.gt0,
      gt1: c.gt1,
      share0: c.share0,
      share1: c.share1,
      seat: { x, y: seatY },
      hole: centred(holes[i], x, seatY + (vBand.ascent - vBand.descent) / 2),
      name: centred(names[i], x, nameBaseline),
      tonnes: [centred(measure(copy.tonnes[form](FROM, c.gt0), axis), x, tonnes0Baseline), centred(measure(copy.tonnes[form](TO, c.gt1), axis), x, tonnes0Baseline + axis.lead)],
    };
  });

  // ── THE WORLD: one ring at the centre, its circumference the world's tonnes, the grown ring the largest that holds ──
  const cx = stage.width / 2;
  const cy = stage.height / 2;
  const worldWidth = WORLD_WIDTH * width;
  const seam = SEAM * worldWidth;
  const midAngles = (shares) => {
    let start = 0;
    return shares.map((s) => {
      const sweep = (s / 100) * TURN;
      const mid = start + sweep / 2;
      start += sweep;
      return mid;
    });
  };
  const mids0 = midAngles(countries.map((c) => c.share0));
  const mids1 = midAngles(countries.map((c) => c.share1));
  const nearest = (b) => Math.hypot(Math.max(b.x0, Math.min(cx, b.x1)) - cx, Math.max(b.y0, Math.min(cy, b.y1)) - cy);
  /** A word beside its arc: pushed out along the arc's middle until the nearest point of its box clears the ring. */
  const beside = (m, theta, r) => {
    const clear = r + worldWidth / 2 + gap;
    const w = drawn(m);
    let d = clear;
    for (let step = 0; step < 50; step++) {
      const px = cx + Math.sin(theta) * d;
      const py = cy - Math.cos(theta) * d;
      const bx = px + (Math.sin(theta) * w) / 2;
      const by = py - (Math.cos(theta) * valueBand) / 2;
      const box = { x0: bx - w / 2, x1: bx + w / 2, y0: by - valueBand / 2, y1: by + valueBand / 2 };
      const near = nearest(box);
      if (near >= clear) return { ...m, x: box.x0, y: box.y0 + vBand.ascent, box };
      d += clear - near + 0.5;
    }
    throw new Error(`« ${m.text} » finds no seat clear of its ring`);
  };
  const overlap = (a, b) => a.x0 < b.x1 && b.x0 < a.x1 && a.y0 < b.y1 && b.y0 < a.y1;
  const within = (b) => b.x0 >= inset && b.x1 <= stage.width - inset && b.y0 >= vInset && b.y1 <= stage.height - vInset;

  let world = null;
  const refusals = [];
  for (let r1 = Math.floor(stage.height / 2 - vInset - worldWidth / 2); r1 > 200; r1 -= 10) {
    const r0 = (r1 * world0) / world1;
    const named = NAMED.map((code) => countries.findIndex((c) => c.code === code));
    const before = named.map((i) => ({ code: countries[i].code, ...beside(measure(copy.label(countries[i].name, countries[i].share0), value), mids0[i], r0) }));
    const after = named.map((i) => ({ code: countries[i].code, ...beside(measure(copy.label(countries[i].name, countries[i].share1), value), mids1[i], r1) }));
    if (![...before, ...after].every((l) => within(l.box)) || overlap(before[0].box, before[1].box) || overlap(after[0].box, after[1].box)) {
      refusals.push(`${r1}: a name runs out of the frame or into the other`);
      continue;
    }
    const lines = [measure(copy.world(FROM, world0), value), measure(copy.world(TO, world1), value)];
    const block = 2 * valueBand + gap / 2;
    const top = cy - block / 2;
    const centre = { before: centred(lines[0], cx, top + vBand.ascent), after: centred(lines[1], cx, top + valueBand + gap / 2 + vBand.ascent) };
    const holeR = r0 - worldWidth / 2 - gap;
    if (!(Math.hypot(Math.max(...lines.map(drawn)) / 2, block / 2) < holeR)) {
      refusals.push(`${r1}: the world's tonnes do not fit its hole`);
      continue;
    }
    world = { x: cx, y: cy, r0, r1, width: worldWidth, seam, pxPerGt: (TURN * r1) / world1, labels: { before, after }, centre };
    break;
  }
  if (!world) throw new Error(`no world radius fits this frame: ${refusals.join("; ")}`);
  const worldArc = Math.min(...countries.map((c) => (c.share0 / 100) * TURN * world.r0 - seam));
  if (!(worldArc >= 3)) throw new Error(`the shortest arc on the world ring is ${worldArc.toFixed(1)}px, under three`);

  // ── THE COLOURS: the past a tint of the accent where it can be told from both the ground and the accent, the neutral where not ──
  const { ground, accent } = direction;
  const { ink, muted } = deriveFurniture(ground);
  const walked = (col, floor, what) => {
    const w = adjustToContrast(col, ground, floor);
    if (!w) throw new Error(`${what} has no variant that reads at ${floor}:1 on ${ground}`);
    return w;
  };
  const present = walked(accent, NON_TEXT_CONTRAST_MIN, "the accent");
  const tint = mix(accent, ground, 0.62);
  const tintWorks = contrast(tint, ground) >= NON_TEXT_CONTRAST_MIN && contrast(tint, present) >= 1.5;
  const past = tintWorks ? tint : walked(mix(ground, ink, 0.35), NON_TEXT_CONTRAST_MIN, "the neutral");

  const props = {
    frame: stage,
    inset,
    slot,
    valueBand,
    registers: { display: titleCard.register, eyebrow: registers.eyebrow, axis, value, annot, source: sourceRegister },
    titleCard,
    credit: { ...credit, at: { x: inset, y: creditY } },
    colours: {
      ground,
      past,
      present,
      track: mix(ground, ink, 0.09),
      text: {
        eyebrow: walked(registers.eyebrow.fill ?? accent, TEXT_CONTRAST_MIN, "the eyebrow"),
        title: walked(registers.display.fill ?? ink, TEXT_CONTRAST_MIN, "the title"),
        name: walked(ink, TEXT_CONTRAST_MIN, "a name"),
        muted: walked(muted, TEXT_CONTRAST_MIN, "a muted word"),
        accent: walked(accent, TEXT_CONTRAST_MIN, "the subject's words"),
      },
    },
    strokes: { ring: ringStroke },
    world,
    small,
    countries: seated,
    states,
    timing: DONUT_VIDEO_TIMING,
  };
  return {
    id,
    direction,
    props,
    report: { k, titleForm: titleCard.form, sourceForm: credit.form, r1: Math.round(world.r1), edge: Math.round(edge), past: tintWorks ? "a tint of the accent" : "the neutral", tonnesForm: form + 1 },
  };
}
