// EVERYTHING ONE DIRECTION'S RENDER IS HANDED, BUILT IN BUN — the words, one 0–100 scale for both strips, every chip's two
// seats stacked into rows, every leader, the two spans and the translation between them, the three figures seated clear of
// every leader and chip, the colours and the states.
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
import { CEILING, FLOOR, FROM, loadSubject, tenths, TO } from "./subject.mjs";
import { DOT_STRIP_VIDEO_TIMING } from "./timing-contract.ts";

const HERE = dirname(fileURLToPath(import.meta.url));
export const ROOT = join(HERE, "..", "..");
export const DIRECTIONS = join(ROOT, "docs", "design-base", "directions");
export const SIZE = "landscape";
export const REGISTER_NAMES = ["display", "eyebrow", "body", "annot", "value", "axis"];
const NB = "\u00A0";
const LABEL_GAP = 0.4;
/** A chip's padding around its code, and the air between two chips, as shares of the axis size. */
const CHIP_PAD_X = 0.3;
const CHIP_PAD_Y = 0.14;
const CHIP_AIR = 0.2;
/** A stem: this share of a chip's height. */
const STEM = 0.5;
/** The rail: this share of the axis ascent; a span lies on it this many rails thick. */
const RAIL = 0.34;
const SPAN = 2.2;

export function loadBeat() {
  const subject = loadSubject();
  return { subject, states: statesFor(), copy: copyOf(subject) };
}

const one = (v) => tenths(v).toLocaleString("fr-FR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });

export function copyOf(subject) {
  return {
    eyebrow: `Énergie${NB}· Europe`,
    title: [
      `Le plancher européen est monté de ${Math.round(subject.floorRise)}${NB}points, le plafond de ${Math.round(subject.ceilRise)}`,
      `Le plancher est monté de ${Math.round(subject.floorRise)}${NB}points, le plafond de ${Math.round(subject.ceilRise)}`,
    ],
    years: [String(FROM), String(TO)],
    tick: (t) => (t === 100 ? `100${NB}%` : String(t)),
    rise: (v) => `+${one(v)}`,
    closed: (v) => `−${one(v)}`,
    source: ["Source : Ember, Energy Institute – Statistical Review of World Energy (2025), via Our World in Data", "Source : Ember, Energy Institute, via Our World in Data"],
  };
}

export function textPerRegisterOf(copy, subject) {
  return {
    display: copy.title.join(" "),
    eyebrow: copy.eyebrow,
    body: copy.source.join(" "),
    annot: "",
    value: `${copy.rise(subject.floorRise)} ${copy.rise(subject.ceilRise)} ${copy.closed(subject.closed)}`,
    axis: `${subject.marks.map((m) => m.code).join(" ")} ${copy.years.join(" ")} 0 20 40 60 80 ${copy.tick(100)} ${copy.source.join(" ")}`,
  };
}

const overlaps = (a, b) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;

/** How far a box stands clear of a segment, horizontally, over the box's height plus `pad`; 0 when it touches. */
function clearance(box, s, pad) {
  let least = Infinity;
  for (let i = 0; i <= 40; i++) {
    const y = box.y - pad + ((box.h + 2 * pad) * i) / 40;
    if (y < Math.min(s.y0, s.y1) || y > Math.max(s.y0, s.y1)) continue;
    const x = s.x0 + ((s.x1 - s.x0) * (y - s.y0)) / (s.y1 - s.y0);
    const d = x < box.x ? box.x - x : x > box.x + box.w ? x - box.x - box.w : 0;
    least = Math.min(least, d);
  }
  return least;
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
  const drawn = (w) => w * (1 + DRAWN_WIDER);
  const gap = LABEL_GAP * axis.lead;
  const band = bandOf(BAND_PROBE, axis);
  const vBand = bandOf(BAND_PROBE, value);
  const shift = (band.ascent - band.descent) / 2;

  const titleCard = titleCardFor({ registers, eyebrow: copy.eyebrow, title: copy.title, size: SIZE, eyebrowToDisplay: EYEBROW_TO_DISPLAY });
  const { register: sourceRegister, ...credit } = sourceCreditFor({ registers, forms: copy.source, size: SIZE, k, ...CREDIT_ONE_LINE });
  const creditY = stage.height - vInset - credit.height;

  // THE CHIPS: each code in its own chip; the widest sets the gutters so no chip ever leaves the scale's own width.
  const padX = CHIP_PAD_X * axis.fontSize;
  const chipH = band.ascent + band.descent + 2 * CHIP_PAD_Y * axis.fontSize;
  const chipLead = chipH + CHIP_AIR * axis.fontSize;
  const stem = STEM * chipH;
  const codes = subject.marks.map((m) => ({ ...measure(m.code, axis) }));
  const chipW = codes.map((c) => drawn(c.width) + 2 * padX);
  const widest = Math.max(...chipW);
  const years = copy.years.map((t) => measure(t, axis));
  const left = inset + drawn(Math.max(...years.map((y) => y.width))) + gap + widest / 2;
  /** The right edge also leaves the ceiling's figure room beside its near-vertical leader: to its left the leaders of the
   *  countries just under it crowd in. */
  const ceilingWord = drawn(measure(copy.rise(subject.ceilRise), value).width);
  const ceilingAt = Math.max(subject.ceiling.before, subject.ceiling.after);
  const perPoint = Math.min((stage.width - inset - widest / 2 - left) / 100, (stage.width - inset - gap - ceilingWord - left) / ceilingAt);
  const right = left + 100 * perPoint;
  /** ONE SCALE, BUILT ONCE, USED BY BOTH STRIPS. */
  const x = scaleLinear().domain([0, 100]).range([left, right]);
  const pxPerPoint = (right - left) / 100;

  /** CHIPS STACK INTO ROWS, never sideways: where two would touch the later one goes up a row. */
  const stack = (key) => {
    const rows = [];
    const seats = subject.marks.map(() => null);
    [...subject.marks.keys()]
      .sort((i, j) => subject.marks[i][key] - subject.marks[j][key])
      .forEach((i) => {
        const at = x(subject.marks[i][key]);
        const half = chipW[i] / 2;
        let r = 0;
        while ((rows[r] ?? -Infinity) > at - half - CHIP_AIR * axis.fontSize) r++;
        rows[r] = at + half;
        seats[i] = { x: at, row: r };
      });
    return { seats, rows: rows.length };
  };
  const upperStack = stack("before");
  const lowerStack = stack("after");

  // THE BANDS, top to bottom: the 2000 chips and their rail, its numbers; the corridor of leaders; the 2024 chips and their
  // rail, its numbers; the credit.
  const railH = RAIL * band.ascent;
  const spanH = SPAN * railH;
  const tickRoom = spanH / 2 + gap / 2;
  const upperRail = vInset + chipH + (upperStack.rows - 1) * chipLead + stem;
  const upperTicks = upperRail + tickRoom + band.ascent;
  const lowerTicks = creditY - gap - band.descent;
  const lowerRail = lowerTicks - band.ascent - tickRoom;
  const chipTop = (rail, r) => rail - stem - chipH - r * chipLead;
  const leadTop = upperTicks + band.descent + gap / 2;
  const leadFoot = chipTop(lowerRail, lowerStack.rows - 1) - gap / 2;
  const owed = 3 * (vBand.ascent + vBand.descent);
  if (leadFoot - leadTop < owed) throw new Error(`the corridor between the strips is ${(leadFoot - leadTop).toFixed(0)}px and owes ${owed.toFixed(0)}px`);

  const byBefore = subject.byBefore;
  const marks = subject.marks.map((m, i) => {
    const seat = (s, rail) => ({ x: s.seats[i].x, row: s.seats[i].row, chipY: chipTop(rail, s.seats[i].row) });
    const a = seat(upperStack, upperRail);
    const b = seat(lowerStack, lowerRail);
    return {
      code: m.code,
      rank: byBefore.indexOf(m.code),
      subject: m.code === FLOOR,
      focus: m.code === FLOOR || m.code === CEILING,
      width: chipW[i],
      label: { ...codes[i], dx: -drawn(codes[i].width) / 2, dy: chipH / 2 + shift },
      a,
      b,
      leader: { x0: a.x, y0: leadTop, x1: b.x, y1: leadFoot },
    };
  });

  /** A LEADER RUNS TO ITS OWN CHIP when no other chip of the lower strip stands in its way; otherwise it stops over the
   *  stack, as the static plate's do, rather than pass behind a neighbour's code. */
  const hits = (seg, box) => {
    for (let i = 0; i <= 200; i++) {
      const t = i / 200;
      const px = seg.x0 + (seg.x1 - seg.x0) * t;
      const py = seg.y0 + (seg.y1 - seg.y0) * t;
      if (px > box.x && px < box.x + box.w && py > box.y && py < box.y + box.h) return true;
    }
    return false;
  };
  for (const m of marks) {
    const reach = { ...m.leader, y1: m.b.chipY - gap / 2 };
    const pad = CHIP_AIR * axis.fontSize;
    if (marks.every((o) => o === m || !hits(reach, { x: o.b.x - o.width / 2 - pad, y: o.b.chipY - pad, w: o.width + 2 * pad, h: chipH + 2 * pad }))) m.leader = reach;
  }

  const ticks = Array.from({ length: 21 }, (_, i) => i * 5).map((t) => {
    const major = t % 20 === 0;
    if (!major) return { at: x(t), major };
    const m = measure(copy.tick(t), axis);
    return { at: x(t), major, label: { ...m, x: t === 0 ? x(t) : t === 100 ? x(t) - drawn(m.width) : x(t) - drawn(m.width) / 2 } };
  });
  const strips = [
    { rail: upperRail, ticksY: upperTicks, year: { ...years[0], x: inset, y: upperRail + shift } },
    { rail: lowerRail, ticksY: lowerTicks, year: { ...years[1], x: inset, y: lowerRail + shift } },
  ];
  for (const s of strips) {
    const yearBox = { x: s.year.x, y: s.year.y - band.ascent, w: drawn(s.year.width), h: band.ascent + band.descent };
    if (!(yearBox.x + yearBox.w + gap / 2 <= left - widest / 2)) throw new Error(`« ${s.year.text} » runs into the chips' gutter`);
  }

  // THE SPANS: the field of 2000 from the floor to the ceiling; its copy pinned to the ceiling's 2024 share.
  const floor = marks.find((m) => m.code === FLOOR);
  const ceiling = marks.find((m) => m.code === CEILING);
  const spans = { before: { x0: floor.a.x, x1: ceiling.a.x }, after: { x0: floor.b.x, x1: ceiling.b.x }, dx: ceiling.b.x - ceiling.a.x };

  // THE FIGURES: each change beside its own leader, where it stands furthest from every leader; the closure over the overhang.
  const vH = vBand.ascent + vBand.descent;
  const labelBox = (w, bx, by) => ({ x: bx, y: by, w, h: vH });
  const clearOfChips = (box) => marks.every((m) => ["a", "b"].every((s) => !overlaps(box, { x: m[s].x - m.width / 2, y: m[s].chipY, w: m.width, h: chipH })));
  const changes = [floor, ceiling].map((m) => {
    const rise = m === floor ? subject.floorRise : subject.ceilRise;
    const word = measure(copy.rise(rise), value);
    const w = drawn(word.width);
    let best = null;
    for (let t = 0.1; t <= 0.9001; t += 0.05)
      for (const side of [-1, 1]) {
        const cy = m.leader.y0 + (m.leader.y1 - m.leader.y0) * t;
        const xAt = (y) => m.leader.x0 + ((m.leader.x1 - m.leader.x0) * (y - m.leader.y0)) / (m.leader.y1 - m.leader.y0);
        const ends = [xAt(cy - vH / 2), xAt(cy + vH / 2)];
        const box = labelBox(w, side < 0 ? Math.min(...ends) - gap - w : Math.max(...ends) + gap, cy - vH / 2);
        if (box.x < inset || box.x + box.w > stage.width - inset || !clearOfChips(box)) continue;
        const score = Math.min(...marks.filter((o) => o !== m).map((o) => clearance(box, o.leader, gap / 2)));
        if (score >= gap / 2 && (!best || score > best.score)) best = { box, score };
      }
    if (!best) throw new Error(`« ${word.text} » finds no place beside ${m.code}'s leader clear of the others`);
    return { code: m.code, box: best.box, line: { ...word, x: best.box.x, y: best.box.y + vBand.ascent } };
  });
  const cutWord = measure(copy.closed(subject.closed), value);
  const overhangX0 = spans.before.x0 + spans.dx;
  const cutBox = labelBox(drawn(cutWord.width), (overhangX0 + floor.b.x) / 2 - drawn(cutWord.width) / 2, lowerRail - spanH / 2 - gap / 2 - vH);
  if (!(cutBox.x >= inset) || !clearOfChips(cutBox) || !(cutBox.y > leadFoot)) throw new Error(`« ${cutWord.text} » does not hold over the overhang`);
  if (!marks.every((m) => clearance(cutBox, m.leader, 0) > 0)) throw new Error(`« ${cutWord.text} » touches a leader`);

  const { ground, accent } = direction;
  const { ink, muted } = deriveFurniture(ground);
  const walked = (c, floorRatio, what) => {
    const w = adjustToContrast(c, ground, floorRatio);
    if (!w) throw new Error(`${what} has no variant that reads at ${floorRatio}:1 on ${ground}`);
    return w;
  };
  const chip = mix(ground, ink, 0.13);
  const onFill = (fill, what) => {
    const best = contrast(ink, fill) >= contrast(ground, fill) ? ink : ground;
    if (contrast(best, fill) < TEXT_CONTRAST_MIN) throw new Error(`${what} reads at ${contrast(best, fill).toFixed(2)}:1 on its chip`);
    return best;
  };
  let span = mix(accent, ground, 0.35);
  if (contrast(span, ground) < NON_TEXT_CONTRAST_MIN) span = walked(span, NON_TEXT_CONTRAST_MIN, "the span");
  const hairline = (direction.stroke?.hairline ?? 0.6) * k;
  const rule = (direction.stroke?.rule ?? 1) * k;

  const props = {
    frame: stage,
    registers: { display: titleCard.register, eyebrow: registers.eyebrow, axis, value, source: sourceRegister },
    titleCard,
    credit: { ...credit, at: { x: inset, y: creditY } },
    colours: {
      ground,
      rail: mix(ground, ink, 0.12),
      tick: mix(ground, ink, 0.3),
      chip,
      accentChip: accent,
      leader: mix(ground, ink, 0.3),
      subjectLeader: walked(accent, NON_TEXT_CONTRAST_MIN, "Poland's leader"),
      ceilingLeader: walked(ink, NON_TEXT_CONTRAST_MIN, "Sweden's leader"),
      span,
      guide: walked(muted, NON_TEXT_CONTRAST_MIN, "the overhang"),
      text: {
        eyebrow: walked(registers.eyebrow.fill ?? accent, TEXT_CONTRAST_MIN, "the eyebrow"),
        title: walked(registers.display.fill ?? ink, TEXT_CONTRAST_MIN, "the title"),
        muted: walked(muted, TEXT_CONTRAST_MIN, "a muted word"),
        name: walked(ink, TEXT_CONTRAST_MIN, "a figure"),
        accent: walked(accent, TEXT_CONTRAST_MIN, "Poland's figure"),
        onChip: onFill(chip, "a code"),
        onAccent: onFill(accent, "Poland's code"),
      },
    },
    strokes: { hairline, rule, emphasis: rule * 2 },
    railH,
    spanH,
    chipH,
    stem,
    pxPerPoint,
    scale: { left: x(0), right: x(100) },
    strips,
    ticks,
    marks,
    spans,
    changes,
    cutLabel: { ...cutWord, x: cutBox.x, y: cutBox.y + vBand.ascent },
    cutBox,
    halo: haloOf(axis, k),
    states,
    timing: DOT_STRIP_VIDEO_TIMING,
  };
  return { id, direction, props, report: { k, titleForm: titleCard.form, sourceForm: credit.form, rows: `${upperStack.rows}/${lowerStack.rows}`, corridor: Math.round(leadFoot - leadTop) } };
}
