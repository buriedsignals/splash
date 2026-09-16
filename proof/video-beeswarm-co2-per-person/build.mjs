// EVERYTHING ONE DIRECTION'S RENDER IS HANDED, BUILT IN BUN — the words, the value scale, the 213 seats packed on it, the
// world disc on the same area scale, the outline's seat in the empty top right, the bracket under the tail, every counter
// text measured, the colours and the states.
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
import { HIGH, loadSubject, NAMED } from "./subject.mjs";
import { BEESWARM_VIDEO_TIMING } from "./timing-contract.ts";

const HERE = dirname(fileURLToPath(import.meta.url));
export const ROOT = join(HERE, "..", "..");
export const DIRECTIONS = join(ROOT, "docs", "design-base", "directions");
export const SIZE = "landscape";
export const REGISTER_NAMES = ["display", "eyebrow", "body", "annot", "value", "axis"];
const NB = "\u00A0";
const LABEL_GAP = 0.4;
const TICKS = [0, 10, 20, 30, 40];
/** THE RADIUS IS A LADDER, NOT A TASTE (the static plate's rule, at the video's scale): the largest circle's radius, walked
 *  from generous to mean; the first rung where the swarm, the world disc, the outline and the bracket all fit is taken. */
const MAX_RADII = [72, 66, 60, 54, 48, 42, 36, 30];
/** The smallest countries are floored at a radius a viewer can see — the static plate's 0.9 at scale 2. */
const MIN_RADIUS = 1.8;
const PACK_STEP = 2.2;
const PACK_AIR = 1.1;

export function loadBeat() {
  const subject = loadSubject();
  return { subject, states: statesFor(), copy: copyOf(subject) };
}

const fr = (v, digits) => v.toLocaleString("fr-FR", { minimumFractionDigits: digits, maximumFractionDigits: digits }).replace(/[\u202F\u00A0\u2009]/g, NB);

export function copyOf(subject) {
  const six = subject.high.length;
  return {
    eyebrow: "Climat · Monde",
    title: [
      `Les ${six} pays au-dessus de ${HIGH}${NB}t de CO₂ par personne pèsent ${fr(subject.share, 1)}${NB}% de l’humanité`,
      `${six} pays au-dessus de ${HIGH}${NB}t de CO₂ par personne : ${fr(subject.share, 1)}${NB}% de l’humanité`,
    ],
    world: "Monde",
    mean: `moyenne ${fr(subject.mean, 1)}${NB}t`,
    tick: String,
    unit: [(t) => `${t}${NB}t de CO₂ par personne`, (t) => `${t}${NB}t par personne`, (t) => `${t}${NB}t`],
    counted: (n) => `${n}${NB}pays`,
    high: `${six}${NB}pays`,
    share: `${fr(subject.share, 1)}${NB}%`,
    source: [
      `Sources : Global Carbon Budget 2025 · population (2023), via Our World in Data`,
      `Sources : Global Carbon Budget, Our World in Data`,
    ],
  };
}

export function textPerRegisterOf(copy, subject) {
  return {
    display: copy.title.join(" "),
    eyebrow: copy.eyebrow,
    body: copy.source.join(" "),
    annot: copy.world,
    value: `${Object.values(NAMED).join(" ")} ${copy.world} ${copy.counted(subject.countries.length)} ${copy.high} ${copy.share} 0123456789`,
    axis: `${TICKS.join(" ")} ${copy.unit.map((f) => f(0)).join(" ")} ${copy.mean} ${copy.source.join(" ")}`,
  };
}

/** Largest first, each pushed only across the axis, never along it — the static plate's packing, at the video's scale. */
function pack(countries, xOf, radiusOf) {
  const placed = [];
  let extent = 0;
  for (const m of [...countries].sort((a, b) => b.people - a.people)) {
    const r = radiusOf(m);
    const cx = xOf(m.tonnes);
    let cy = 0;
    for (let step = 0; step < 8000; step++) {
      const offset = Math.ceil(step / 2) * PACK_STEP * (step % 2 === 0 ? 1 : -1);
      const hits = placed.some((p) => {
        const dx = p.cx - cx;
        const dy = p.cy - offset;
        const reach = p.r + r + PACK_AIR;
        return dx * dx + dy * dy < reach * reach;
      });
      if (!hits) {
        cy = offset;
        break;
      }
    }
    placed.push({ m, cx, cy, r });
    extent = Math.max(extent, Math.abs(cy) + r);
  }
  return { placed, extent };
}

const boxClear = (box, circles) =>
  circles.every((p) => {
    const nx = Math.max(box.x0, Math.min(p.x, box.x1));
    const ny = Math.max(box.y0, Math.min(p.y, box.y1));
    return Math.hypot(p.x - nx, p.y - ny) > p.r;
  });

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
  const drawn = (m) => m.width * (1 + DRAWN_WIDER);
  const gap = LABEL_GAP * axis.lead;
  const band = bandOf(BAND_PROBE, axis);
  const vBand = bandOf(BAND_PROBE, value);

  const titleCard = titleCardFor({ registers, eyebrow: copy.eyebrow, title: copy.title, size: SIZE, eyebrowToDisplay: EYEBROW_TO_DISPLAY });
  const { register: sourceRegister, ...credit } = sourceCreditFor({ registers, forms: copy.source, size: SIZE, k, ...CREDIT_ONE_LINE });
  const creditY = stage.height - vInset - credit.height;

  // THE BANDS, top to bottom: the average's value and the count on one baseline; the swarm; the ticks; the credit.
  const headBaseline = vInset + Math.max(band.ascent, vBand.ascent);
  const bandTop = headBaseline + Math.max(band.descent, vBand.descent) + gap;
  const tickBaseline = creditY - gap - band.descent;
  const bandBottom = tickBaseline - band.ascent - gap;
  const midline = (bandTop + bandBottom) / 2;
  const height = bandBottom - bandTop;

  const { countries } = subject;
  const top = Math.max(...countries.map((c) => c.tonnes));
  const breath = 0.35 * axis.lead;
  const x = scaleLinear()
    .domain([0, Math.max(top, TICKS.at(-1)) * 1.02])
    .range([inset + breath, stage.width - inset - breath]);

  // THE TICKS: every value centred on its own position, except the first, which starts on it and carries the unit — the
  // first unit form that clears the tick after it. A unit set before a value would push the value off its position.
  const tickLines = TICKS.map((t) => {
    const m = measure(copy.tick(t), axis);
    return { ...m, x: x(t) - m.width / 2, y: tickBaseline, at: x(t) };
  });
  const form = copy.unit.map((f) => measure(f(TICKS[0]), axis)).find((m) => x(TICKS[0]) + drawn(m) + gap < tickLines[1].x);
  if (!form) throw new Error(`no unit form fits before the ${TICKS[1]} tick`);
  tickLines[0] = { ...form, x: x(TICKS[0]), y: tickBaseline, at: x(TICKS[0]) };
  if (!(tickLines.at(-1).x + drawn(tickLines.at(-1)) <= stage.width - inset)) throw new Error(`the ${TICKS.at(-1)} tick runs past the frame's inset`);

  const biggest = Math.max(...countries.map((c) => c.people));
  const shift = (vBand.ascent - vBand.descent) / 2;
  const ringOf = (r) => Math.max(r, 0.2 * axis.lead) + 0.12 * axis.lead;
  const outlineStroke = (direction.stroke?.hairline ?? 0.6) * k * 2;
  const shareWord = measure(copy.share, value);
  const highWord = measure(copy.high, value);
  const tailFrom = x(HIGH);

  let chosen = null;
  const refusals = [];
  for (const maxRadius of MAX_RADII) {
    const c = maxRadius / Math.sqrt(biggest);
    const { placed, extent } = pack(countries, x, (m) => Math.max(MIN_RADIUS, c * Math.sqrt(m.people)));
    const worldR = c * Math.sqrt(subject.world);
    if (extent * 2 > height || worldR * 2 > height) {
      refusals.push(`${maxRadius}: the swarm (${Math.round(extent * 2)}px) or the world disc (${Math.round(worldR * 2)}px) overflows ${Math.round(height)}px`);
      continue;
    }
    const circles = placed.map((p) => ({ ...p, x: p.cx, y: midline + p.cy }));
    const highs = circles.filter((p) => subject.high.includes(p.m.code));
    const tailTo = Math.max(...highs.map((p) => p.x + ringOf(p.r)));
    // THE BRACKET, under the tail: from the 20 t threshold to the farthest ring, below every circle over that span.
    const under = circles.filter((p) => p.x + Math.max(p.r, ringOf(p.r)) >= tailFrom && p.x - p.r <= tailTo);
    const bracketY = Math.max(...under.map((p) => p.y + (subject.high.includes(p.m.code) ? ringOf(p.r) : p.r))) + gap / 2;
    const centre = Math.min((tailFrom + tailTo) / 2, stage.width - inset - Math.max(drawn(highWord), drawn(shareWord)) / 2);
    const labelBaseline = bracketY + gap / 2 + vBand.ascent;
    const shareBaseline = labelBaseline + value.lead;
    const labelBox = { x0: centre - drawn(highWord) / 2, x1: centre + drawn(highWord) / 2, y0: labelBaseline - vBand.ascent, y1: shareBaseline + vBand.descent };
    if (shareBaseline + vBand.descent > bandBottom || !boxClear(labelBox, circles)) {
      refusals.push(`${maxRadius}: the bracket's words find no clear seat under the tail`);
      continue;
    }
    // THE OUTLINE'S SEAT: the empty top right, centred over the tail, its top on the band's.
    const cx = Math.min(Math.max((tailFrom + tailTo) / 2, inset + worldR), stage.width - inset - worldR);
    const cy = bandTop + worldR + outlineStroke;
    if (!circles.every((p) => Math.hypot(p.x - cx, p.y - cy) > worldR + p.r + gap / 2)) {
      refusals.push(`${maxRadius}: the outline would sit on the swarm`);
      continue;
    }
    chosen = { maxRadius, c, circles, worldR, bracket: { y: bracketY, x0: tailFrom, x1: tailTo, centre, labelBaseline, shareBaseline }, compare: { x: cx, y: cy } };
    break;
  }
  if (!chosen) throw new Error(`no filed radius fits this frame: ${refusals.join("; ")}`);
  const { c, circles, worldR, bracket } = chosen;

  const order = [...countries].sort((a, b) => b.people - a.people).map((m) => m.code);
  const highOrder = [...countries].filter((m) => subject.high.includes(m.code)).sort((a, b) => b.tonnes - a.tonnes).map((m) => m.code);
  const members = circles.map((p) => {
    const named = NAMED[p.m.code];
    let name;
    if (named) {
      const w = measure(named, value);
      if (!(drawn(w) < 2 * p.r)) throw new Error(`« ${named} » (${Math.round(w.width)}px) does not fit inside its circle (${Math.round(2 * p.r)}px)`);
      name = { ...w, x: p.x - drawn(w) / 2, y: p.y + shift };
    }
    return {
      code: p.m.code,
      people: p.m.people,
      tonnes: p.m.tonnes,
      x: p.x,
      y: p.y,
      r: p.r,
      ring: ringOf(p.r),
      order: order.indexOf(p.m.code),
      high: subject.high.includes(p.m.code),
      highRank: highOrder.indexOf(p.m.code),
      ...(name ? { name } : {}),
    };
  });

  const mergedR = c * Math.sqrt(subject.highPeople);
  const insideBaseline = chosen.compare.y + mergedR + gap / 2 + vBand.ascent;
  if (!(insideBaseline + vBand.descent < chosen.compare.y + worldR - outlineStroke)) throw new Error("« 0,6 % » does not fit inside the outline");
  const worldWord = measure(copy.world, value);
  if (!(drawn(worldWord) < 2 * worldR)) throw new Error("« Monde » does not fit inside the world disc");
  const world = { x: x(subject.mean), y: midline, r: worldR, label: { ...worldWord, x: x(subject.mean) - drawn(worldWord) / 2, y: midline + shift } };

  const meanLabel = { ...measure(copy.mean, axis), x: world.x + gap / 2, y: headBaseline };
  const countRight = stage.width - inset;
  const counter = Object.fromEntries(
    Array.from({ length: countries.length + 1 }, (_, n) => {
      const m = measure(copy.counted(n), value);
      return [String(n), { ...m, x: countRight - drawn(m), y: headBaseline }];
    }),
  );
  if (!(counter[String(countries.length)].x > meanLabel.x + drawn(meanLabel) + gap)) throw new Error("the count runs into the average's value");

  const { ground, accent } = direction;
  const { ink, muted } = deriveFurniture(ground);
  const walked = (col, floor, what) => {
    const w = adjustToContrast(col, ground, floor);
    if (!w) throw new Error(`${what} has no variant that reads at ${floor}:1 on ${ground}`);
    return w;
  };
  /** THE FIELD IS FURNITURE AND THE CASES ARE INK — the swarm a tint of the accent, as far toward the ground as still reads. */
  let field = mix(accent, ground, 0.45);
  if (contrast(field, ground) < NON_TEXT_CONTRAST_MIN) field = walked(field, NON_TEXT_CONTRAST_MIN, "the field");
  const mark = walked(accent, NON_TEXT_CONTRAST_MIN, "the accent");

  const props = {
    frame: stage,
    registers: { display: titleCard.register, eyebrow: registers.eyebrow, axis, value, source: sourceRegister },
    titleCard,
    credit: { ...credit, at: { x: inset, y: creditY } },
    colours: {
      ground,
      field,
      mark,
      rule: walked(mix(ground, ink, 0.45), NON_TEXT_CONTRAST_MIN, "the average's rule"),
      text: {
        eyebrow: walked(registers.eyebrow.fill ?? accent, TEXT_CONTRAST_MIN, "the eyebrow"),
        title: walked(registers.display.fill ?? ink, TEXT_CONTRAST_MIN, "the title"),
        name: walked(ink, TEXT_CONTRAST_MIN, "a name"),
        muted: walked(muted, TEXT_CONTRAST_MIN, "a muted word"),
        accent: walked(accent, TEXT_CONTRAST_MIN, "the lesson's words"),
      },
    },
    strokes: { rule: (direction.stroke?.hairline ?? 0.6) * k * 1.5, ring: (direction.stroke?.hairline ?? 0.6) * k * 1.5, outline: outlineStroke },
    band: { top: bandTop, bottom: bandBottom, midline },
    ticks: tickLines,
    mean: { x: world.x, label: meanLabel },
    world,
    radiusPerRootPerson: c,
    members,
    compare: { ...chosen.compare, share: { ...shareWord, x: chosen.compare.x - drawn(shareWord) / 2, y: insideBaseline } },
    bracket: {
      x0: bracket.x0,
      x1: bracket.x1,
      y: bracket.y,
      tick: gap / 2,
      label: { ...highWord, x: bracket.centre - drawn(highWord) / 2, y: bracket.labelBaseline },
      share: { ...shareWord, x: bracket.centre - drawn(shareWord) / 2, y: bracket.shareBaseline },
    },
    counter,
    halo: haloOf(value, k),
    states,
    timing: BEESWARM_VIDEO_TIMING,
  };
  return { id, direction, props, report: { k, titleForm: titleCard.form, sourceForm: credit.form, maxRadius: chosen.maxRadius, band: Math.round(height), unit: tickLines[0].text } };
}
