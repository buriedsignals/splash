// EVERYTHING ONE DIRECTION'S RENDER IS HANDED, BUILT IN BUN — the words, the two scales, every country's three seats (in
// the one column, on its income, in the column on its side of the break), the break, the two bars and the three copies on
// the age scale, every counter text measured, the colours and the states.
//
// Runs in Bun only.

import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { scaleLinear, scaleLog } from "d3-scale";
import { adjustToContrast, NON_TEXT_CONTRAST_MIN, TEXT_CONTRAST_MIN } from "#shared/chart-beat/colour.mjs";
import { deriveFurniture } from "#shared/chart-beat/render-still.mjs";
import { frameInsetFor, sizeFor, videoExportSize } from "#shared/chart-video/sizes.mjs";
import { readDirection } from "#shared/design-base/read-direction.mjs";
import { EYEBROW_TO_DISPLAY, registerOf } from "#shared/design-base/register.mjs";
import { resolveDirectionFamilies } from "#shared/design-base/resolve-families.mjs";
import { applyCase } from "../../skills/chart-video/scripts/registers.mjs";
import { BAND_PROBE, bandOf, CREDIT_ONE_LINE, DRAWN_WIDER, haloOf, sourceCreditFor, titleCardFor, verticalInsetFor, widthOf } from "../../skills/chart-video/scripts/shots.mjs";
import { videoRegistersOf } from "../../skills/chart-video/scripts/video-registers.mjs";
import { statesFor } from "./states.mjs";
import { BREAK, loadSubject } from "./subject.mjs";
import { SCATTER_VIDEO_TIMING } from "./timing-contract.ts";

const HERE = dirname(fileURLToPath(import.meta.url));
export const ROOT = join(HERE, "..", "..");
export const DIRECTIONS = join(ROOT, "docs", "design-base", "directions");
/** The size this run exports at — `--size`, landscape when nothing asks. R2 names three and
 *  everything under it already answered per size; only this line pinned the beat to one. */
export const SIZE = videoExportSize();
export const REGISTER_NAMES = ["display", "eyebrow", "body", "annot", "value", "axis"];
const NB = "\u00A0";
const LABEL_GAP = 0.4;
const AGE_TICKS = [40, 50, 60, 70, 80, 90];
const INCOME_TICKS = [500, 1000, 2000, 5000, 10000, 20000, 50000, 100000];
/** The static plate's dot, 3.4 at its 960-wide frame, carried by the ladder's factor. */
const RADIUS = 3.4;
const DOT_OPACITY = 0.6;
/** A bar's width and the air between the break, a bar, a copy and a column, × the axis lead. */
const BAR = 0.4;
const AIR = 0.2;
const PACK_STEP = 1.5;
const PACK_AIR = 0.6;

export function loadBeat() {
  const subject = loadSubject();
  return { subject, states: statesFor(), copy: copyOf(subject) };
}

const money = (v) => `${v.toLocaleString("fr-FR").replace(/[\u202F\u00A0\u2009]/g, NB)}${NB}$`;
const tick = (v) => (v >= 1000 ? `$${Math.round(v / 1000)}k` : `$${v}`);

export function copyOf(subject) {
  const times = Math.round(subject.ratio);
  return {
    eyebrow: `Santé${NB}· Monde`,
    title: [
      `Au-delà de ${money(BREAK)} par personne, l’espérance de vie tient dans une bande ${times}${NB}fois plus étroite`,
      `Au-delà de ${money(BREAK)}, l’espérance de vie tient dans une bande ${times}${NB}fois plus étroite`,
    ],
    yName: [`Espérance de vie, en${NB}ans`, "Espérance de vie"],
    xName: "PIB par habitant",
    tick,
    breakAt: money(BREAK),
    counted: (n) => `${n}${NB}pays`,
    span: (years) => `${Math.round(years)}${NB}ans`,
    times: `${times}${NB}fois`,
    source: [
      "Source : Banque mondiale via Gapminder, ONU WPP (2024), via Our World in Data",
      "Source : Banque mondiale, ONU WPP, via Our World in Data",
      "Source : Our World in Data",
    ],
  };
}

export function textPerRegisterOf(copy, subject) {
  return {
    display: copy.title.join(" "),
    eyebrow: copy.eyebrow,
    body: copy.source.join(" "),
    annot: copy.times,
    value: `${copy.breakAt} ${copy.counted(subject.countries.length)} ${copy.span(subject.below.range)} ${copy.span(subject.above.range)} ${copy.times} 0123456789`,
    axis: `${copy.yName.join(" ")} ${copy.xName} ${AGE_TICKS.join(" ")} ${INCOME_TICKS.map(tick).join(" ")} ${copy.source.join(" ")}`,
  };
}

/** Each dot pushed only across the age axis, from `edge` in direction `dir`, never along it — its height is its age. */
function pack(items, edge, dir, r) {
  const placed = [];
  const reach = 2 * r + PACK_AIR;
  for (const it of items) {
    let x = edge;
    for (let step = 0; step < 4000; step++) {
      x = edge + dir * step * PACK_STEP;
      if (!placed.some((p) => Math.hypot(p.x - x, p.y - it.y) < reach)) break;
    }
    placed.push({ ...it, x });
  }
  return new Map(placed.map((p) => [p.code, p.x]));
}

const boxClear = (box, points, r) =>
  points.every((p) => {
    const nx = Math.max(box.x0, Math.min(p.x, box.x1));
    const ny = Math.max(box.y0, Math.min(p.y, box.y1));
    return Math.hypot(p.x - nx, p.y - ny) > r;
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
  const shift = (band.ascent - band.descent) / 2;
  const vShift = (vBand.ascent - vBand.descent) / 2;
  const halo = haloOf(value, k);

  const titleCard = titleCardFor({ registers, eyebrow: copy.eyebrow, title: copy.title, size: SIZE, eyebrowToDisplay: EYEBROW_TO_DISPLAY });
  // The credit shares the bottom row with the income axis's name: one line, in the room the name leaves.
  const xName = measure(copy.xName, axis);
  const xNameRoom = drawn(xName) + 3 * gap;
  const { register: sourceRegister, ...credit } = sourceCreditFor({ registers, forms: copy.source, size: SIZE, k, ...CREDIT_ONE_LINE, measure: (stage.width - 2 * inset - xNameRoom) / (stage.width - 2 * inset) });
  const creditAt = { x: inset, y: stage.height - vInset - credit.height };
  const xNameLine = { ...xName, x: stage.width - inset - drawn(xName), y: stage.height - vInset - band.descent };
  if (!(creditAt.x + credit.width + 2 * gap < xNameLine.x)) throw new Error("the income axis's name and the credit do not fit side by side on the bottom row");

  // THE BANDS, top to bottom: the age axis's name, the break's value and the count on one baseline; the plot; the income
  // ticks; the credit and the income axis's name.
  const headBaseline = vInset + Math.max(band.ascent, vBand.ascent);
  const tickBaseline = Math.min(creditAt.y, xNameLine.y - band.ascent) - gap - band.descent;
  const ageTicks = AGE_TICKS.map((v) => ({ v, ...measure(String(v), axis) }));
  const plot = {
    left: inset + Math.max(...ageTicks.map(drawn)) + gap,
    right: stage.width - inset,
    top: headBaseline + Math.max(band.descent, vBand.descent) + gap + band.ascent / 2,
    bottom: tickBaseline - band.ascent - gap,
  };
  const age = { lo: AGE_TICKS[0], hi: AGE_TICKS.at(-1), top: plot.top, bottom: plot.bottom };
  const yOf = scaleLinear().domain([age.lo, age.hi]).range([age.bottom, age.top]);
  const { countries } = subject;
  const incomes = countries.map((c) => c.income);
  const { below, above } = subject;

  // EVERYTHING THE DOT'S RADIUS DECIDES, at one radius: the income scale's own inset, the break, its
  // two bars, the copies' column, and the three seats every country takes. Nothing above this reads
  // the radius, so the whole of it can be run again at another one.
  const seatingAt = (R) => {
    const xOf = scaleLog()
      .domain([Math.min(...incomes) * 0.9, Math.max(...incomes) * 1.1])
      .range([plot.left + R, plot.right - R]);
    const [dLo, dHi] = xOf.domain();
    // HOW MANY INCOME TICKS ARE DRAWN IS A LADDER. The eight decade-and-half-decade steps are what a
    // 1920-wide axis holds; at 1080 the type is 20% larger on a frame 44% narrower and « $10k$20k »
    // and « $50k$100k » were set into one another — two runs a clipping counter and a frame counter
    // both call fine. A tick is kept only when it stands clear of the last one kept, walking up the
    // scale, so the ones that survive are still the decades a reader looks for. Landscape keeps all
    // eight, so nothing there moves.
    const wanted = INCOME_TICKS.filter((v) => v >= dLo && v <= dHi).map((v) => {
      const m = measure(copy.tick(v), axis);
      return { v, at: xOf(v), ...m, x: xOf(v) - drawn(m) / 2, y: tickBaseline };
    });
    const xTicks = [];
    for (const t of wanted) if (!xTicks.length || t.x >= xTicks.at(-1).x + drawn(xTicks.at(-1)) + gap / 2) xTicks.push(t);
    if (!(xTicks.at(-1).x + drawn(xTicks.at(-1)) <= stage.width - inset)) throw new Error("the last income tick runs past the frame's inset");
    // THE BREAK, ITS BARS AND THE COPIES' COLUMN, from the break outwards: long bar and copies on the left, short bar on the right.
    const X = xOf(BREAK);

    // WHERE THE BREAK'S VALUE HANGS ON THE HEAD ROW IS A LADDER. Straddling the rule is the reading
    // that names it best and it is what 1920 wide affords. At 1080 the rule sits at x=752 of a 936px
    // content width, so a 239px value straddling it ends at 872 and the count — right-aligned at the
    // frame's inset, 227px of « 190 pays » — begins at 781: they overlap by 91px. Hanging the value
    // to the LEFT of the rule, still touching it, keeps it attached to what it labels and gives the
    // count its room back, at no cost to the plot's height.
    const breakWord = measure(copy.breakAt, value);
    const countWord = measure(copy.counted(countries.length), value);
    const countLeft = stage.width - inset - drawn(countWord);
    const yForms = copy.yName.map((t) => measure(t, axis));
    const head = [X - drawn(breakWord) / 2, X - gap / 2 - drawn(breakWord), X - drawn(breakWord)]
      .filter((x) => x + drawn(breakWord) + gap <= countLeft)
      .map((x) => ({ breakX: x, yName: yForms.find((m) => inset + drawn(m) + 2 * gap < x) }))
      .find((h) => h.yName);
    if (!head) throw new Error(countLeft < X + gap ? "the count runs into the break's value" : "no form of the age axis's name clears the break's value on the head row");
    const { breakX, yName } = head;
    const w = BAR * axis.lead;
    const s = AIR * axis.lead;
    const long = { x: X - s - w, top: yOf(below.hi), bottom: yOf(below.lo) };
    const short = { x: X + s, top: yOf(above.hi), bottom: yOf(above.lo) };
    const copiesX = long.x - s - w;
    const copies = Array.from({ length: Math.round(subject.ratio) }, (_, i) => ({ x: copiesX, top: yOf(below.lo + (i + 1) * above.range), bottom: yOf(below.lo + i * above.range) }));

    // THE THREE SEATS. The column packs poorest first from the plot's left; each side's column packs nearest the break first.
    const seats = countries.map((c) => ({ ...c, y: yOf(c.age), x: xOf(c.income) }));
    const byIncome = [...seats].sort((a, b) => a.income - b.income);
    const column = pack(byIncome, plot.left + R + gap / 2, 1, R);
    const left = pack(byIncome.filter((c) => c.income < BREAK).reverse(), copiesX - s - R, -1, R);
    const right = pack(byIncome.filter((c) => c.income >= BREAK), short.x + w + s + R, 1, R);
    const members = seats.map((c) => ({
      code: c.code,
      age: c.age,
      income: c.income,
      x: c.x,
      y: c.y,
      column: column.get(c.code),
      strip: c.income < BREAK ? left.get(c.code) : right.get(c.code),
      order: byIncome.findIndex((b) => b.code === c.code),
    }));
    const columnRight = Math.max(...members.map((m) => m.column)) + R;
    const leftmost = Math.min(...members.map((m) => m.strip)) - R;
    const rightmost = Math.max(...members.map((m) => m.strip)) + R;

    // THE WORDS ON THE PICTURE: each span's value over its bar, « 3 fois » in the empty space right of the break under the
    // short bar — each clear of every dot on its seat and in its folded column.
    const boxOf = (l) => ({ x0: l.x - halo / 2, x1: l.x + drawn(l) + halo / 2, y0: l.y - vBand.ascent - halo / 2, y1: l.y + vBand.descent + halo / 2 });
    const longValue = measure(copy.span(below.range), value);
    const shortValue = measure(copy.span(above.range), value);
    const timesWord = measure(copy.times, value);
    const longTop = Math.min(long.top, ...copies.map((c) => c.top));
    // A SPAN'S VALUE SITS OVER ITS BAR'S TOP END — or as high as the plot lets it, whichever is lower.
    // At 1080 wide the short bar's top end is 88px under the plot's own top and the word's box, halo
    // included, is 90: two pixels, and the word left the picture rather than move. Taken to the plot's
    // top edge it still stands clear over the bar, and the dot-clearance test is what decides whether
    // it may stay there — the one reading that can actually see a word sitting on a country. That
    // reading is part of THIS ladder's rung: a smaller dot frees the word as surely as it frees the
    // folds, so a rung is only taken when the picture holds whole.
    const overBar = (top) => Math.max(top - R - gap / 2 - vBand.descent, plot.top - band.ascent / 2 + halo / 2 + vBand.ascent);
    const spans = {
      long: { ...longValue, x: X - s - drawn(longValue), y: overBar(longTop) },
      short: { ...shortValue, x: X + s, y: overBar(short.top) },
    };
    const stackMid = yOf(below.lo + (copies.length / 2) * above.range);
    const times = { ...timesWord, x: short.x + w + gap, y: stackMid + vShift };
    const wordBoxes = [spans.long, spans.short, times].map(boxOf);
    let words = null;
    for (const [i, box] of wordBoxes.entries()) {
      const word = [spans.long, spans.short, times][i];
      if (!(box.y0 >= plot.top - band.ascent / 2)) words ??= `« ${word.text} » rises above the plot`;
      const onSeat = boxClear(box, members, R);
      const folded = boxClear(box, members.map((m) => ({ x: m.strip, y: m.y })), R);
      if (!onSeat || !folded) words ??= `« ${word.text} » sits on a dot${onSeat ? " in its folded column" : " on its seat"}`;
    }

    return { R, xOf, xTicks, yName, breakX, X, w, s, long, short, copiesX, copies, members, spans, times, wordBoxes, words, columnRight, leftmost, rightmost, clears: leftmost > columnRight && rightmost <= plot.right && words === null };
  };

  // THE DOT'S RADIUS IS A LADDER, NOT A CONSTANT — the same shape as the title's forms and the
  // credit's. `RADIUS × k` ties the dot to the TYPE ladder, and at 1080 wide that ladder runs the
  // wrong way: `k` rises (3.16 → 3.79 in nocturne) to clear the phone's 36px floor, so every dot
  // grows a fifth while the plot loses nearly half its width. The two folded columns are what
  // notices — 190 dots packed across the age axis need horizontal room proportional to the radius
  // — and at the top rung the left fold runs into the plot's own column. The radius steps down
  // until both folds clear; the refusal below still fires when none does, so a dot is never taken
  // smaller than a rung the beat names. Landscape clears at the first rung, so nothing moves there.
  const RADIUS_RUNGS = [1, 0.85, 0.7, 0.6, 0.5, 0.42, 0.35, 0.3];
  let seating = null;
  let lastTried = null;
  for (const factor of RADIUS_RUNGS) {
    lastTried = seatingAt(RADIUS * k * factor);
    if (lastTried.clears) {
      seating = lastTried;
      break;
    }
  }
  if (!seating) {
    const smallest = (RADIUS * k * RADIUS_RUNGS.at(-1)).toFixed(1);
    throw new Error(
      lastTried.leftmost <= lastTried.columnRight
        ? `the left side's folded column runs into the plot's left edge, even at the smallest dot the ladder names (${smallest}px): the plot's own column ends at ${lastTried.columnRight.toFixed(0)}px and the fold begins at ${lastTried.leftmost.toFixed(0)}px`
        : lastTried.rightmost > plot.right
          ? `the right side's folded column runs past the plot, even at the smallest dot the ladder names (${smallest}px): it ends ${(lastTried.rightmost - plot.right).toFixed(0)}px past it`
          : `${lastTried.words}, even at the smallest dot the ladder names (${smallest}px)`,
    );
  }
  const { R, xOf, xTicks, yName, breakX, X, w, s, long, short, copiesX, copies, members, spans, times, wordBoxes } = seating;


  const breakLabel = { ...measure(copy.breakAt, value), y: headBaseline, x: breakX };
  const countRight = stage.width - inset;
  const counter = Object.fromEntries(
    Array.from({ length: countries.length + 1 }, (_, n) => {
      const m = measure(copy.counted(n), value);
      return [String(n), { ...m, x: countRight - drawn(m), y: headBaseline }];
    }),
  );
  if (!(counter[String(countries.length)].x > breakLabel.x + drawn(breakLabel) + gap)) throw new Error("the count runs into the break's value");

  const { ground, accent } = direction;
  const { ink, muted, grid } = deriveFurniture(ground);
  const walked = (col, floor, what) => {
    const found = adjustToContrast(col, ground, floor);
    if (!found) throw new Error(`${what} has no variant that reads at ${floor}:1 on ${ground}`);
    return found;
  };
  const hairline = direction.stroke?.hairline ?? 0.6;

  const props = {
    frame: stage,
    registers: { display: titleCard.register, eyebrow: registers.eyebrow, axis, value, source: sourceRegister },
    titleCard,
    credit: { ...credit, at: creditAt },
    colours: {
      ground,
      grid,
      dot: walked(muted, NON_TEXT_CONTRAST_MIN, "a country's dot"),
      mark: walked(accent, NON_TEXT_CONTRAST_MIN, "the break and its bars"),
      text: {
        eyebrow: walked(registers.eyebrow.fill ?? accent, TEXT_CONTRAST_MIN, "the eyebrow"),
        title: walked(registers.display.fill ?? ink, TEXT_CONTRAST_MIN, "the title"),
        axis: walked(muted, TEXT_CONTRAST_MIN, "the axes"),
        count: walked(ink, TEXT_CONTRAST_MIN, "the count"),
        accent: walked(accent, TEXT_CONTRAST_MIN, "the lesson's words"),
      },
    },
    dotOpacity: DOT_OPACITY,
    strokes: { grid: hairline * k, rule: hairline * k * 2, copy: hairline * k * 2 },
    radius: R,
    plot,
    age,
    ageTicks: ageTicks.map((t) => ({ text: t.text, width: t.width, x: plot.left - gap - drawn(t), y: yOf(t.v) + shift, at: yOf(t.v) })),
    xTicks,
    names: { y: { ...yName, x: inset, y: headBaseline }, x: xNameLine },
    breakAt: BREAK,
    break: { x: X, label: breakLabel },
    members,
    bars: { long, short },
    barWidth: w,
    copies,
    spans,
    times,
    wordBoxes,
    counter,
    halo,
    states,
    timing: SCATTER_VIDEO_TIMING,
  };
  return { id, direction, props, report: { k, titleForm: titleCard.form, sourceForm: credit.form, radius: R, plotHeight: Math.round(plot.bottom - plot.top), yName: yName.text } };
}
