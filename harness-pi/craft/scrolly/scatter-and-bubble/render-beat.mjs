// The generic half of a scatter SCROLLY beat, taken from
// proof/scrolly-scatter-income-life-expectancy/render-directions-scrolly.mjs with everything about ITS
// subject removed. The choreography is the worked example's and is not the model's to change — six
// cards, one continuous interpolation driven by the reader's scroll (income-scatter-drive.mjs,
// verbatim):
//
//   1 linear   the cloud on an ordinary (linear) x axis: everything piled against the left edge;
//   2 log      the x axis turns logarithmic under the reader's eyes, every point sliding to its new x;
//   3 break    the declared break drawn down the plot;
//   4 below    the spread of y under the break: its band, its two extremes ringed and named, the rest back;
//   5 above    the spread over the break, the same;
//   6 reading  the static plate: the break, the band above, both claims; the card states the limits.
//
// This file computes every figure the cards may state (the counts, each side's extremes and spread,
// their ratio, the points in the first tenth of the linear axis) and checks the words against them;
// ./beat.mjs — the one file the model writes — gives the points and the WORDS of each card. Copied
// into the beat by the harness; never edited by the model.
//
// Usage:  bun <beat>/render-beat.mjs
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createElement } from "react";
import { deriveFurniture } from "#shared/chart-beat/render-still.mjs";
import { webRegisters } from "#shared/design-base/web.mjs";
import { EYEBROW_TO_DISPLAY, gapOf, registerOf } from "#shared/design-base/register.mjs";
import { DirectedIncomeScatterScrolly } from "./DirectedIncomeScatterScrolly.tsx";
import { applyStoryboard, assertNumbers, assertHeadlineNumbersDrawn, assertDrawsClaimColumn } from "./guards.mjs";
import { plain, refusing, storyLanguage } from "./web.mjs";
import { renderBeatScrolly, scrollySkill } from "./scrolly.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));

/** The cards, in the drive's order: the runner's own ids (never the model's words in an id). */
const CARDS = ["linear", "log", "break", "below", "above", "reading"];
/** One state per card; see income-scatter-drive.mjs for what each field paints. The worked example's, verbatim. */
const STATES = [
  { log: 0, brk: 0, below: 0, above: 0, all: 0 },
  { log: 1, brk: 0, below: 0, above: 0, all: 0 },
  { log: 1, brk: 1, below: 0, above: 0, all: 0 },
  { log: 1, brk: 1, below: 1, above: 0, all: 0 },
  { log: 1, brk: 1, below: 0, above: 1, all: 0 },
  { log: 1, brk: 1, below: 0, above: 0, all: 1 },
];
/** The header notes: one per gesture card (cards 1 and 6 show none, as in the worked example). */
const NOTES = { log: "logNote", break: "breakNote", below: "belowNote", above: "aboveNote" };

await refusing(HERE, async () => {
  const { default: beat } = await import("./beat.mjs");
  applyStoryboard(beat, HERE);
  const { renderScrolly } = await import(scrollySkill(HERE, "scripts", "render-scrolly.mjs"));

  const REQUIRED = ["eyebrow", "points", "breakAt", "xName", "xQualifier", "linearQualifier", "yName", "xTick", "format", "cards", "notes", "belowNote", "aboveNote", "title", "limits", "source", "alt", "check"];
  const missing = REQUIRED.filter((key) => beat[key] === undefined);
  if (missing.length) throw new Error(`beat.mjs is missing ${missing.join(", ")}: give each as a field of the default export (export default { …, ${missing[0]}: … }), not as a separate export (see CONTRACT.md)`);
  for (const fn of ["xTick", "format", "belowNote", "aboveNote", "check"])
    if (typeof beat[fn] !== "function") throw new Error(`beat.mjs: ${fn} must be a function (see CONTRACT.md)`);
  for (const [group, keys] of [["cards", CARDS.slice(0, 5)], ["notes", Object.keys(NOTES)]]) {
    const absent = keys.filter((k) => typeof beat[group]?.[k] !== "function");
    if (absent.length) throw new Error(`beat.mjs: ${group} must give a function for each of ${keys.join(", ")}; missing or not a function: ${absent.join(", ")} (see CONTRACT.md)`);
  }

  // ── the points ──────────────────────────────────────────────────────────────────────────────────
  if (!Array.isArray(beat.points)) throw new Error(`points must be an array of { name, x, y }, one per row that has both measures`);
  const points = beat.points;
  assertNumbers(points.flatMap((p, i) => [[`points[${i}].x`, p.x], [`points[${i}].y`, p.y]]), "points");
  const sized = points.filter((p) => p.size !== undefined || p.r !== undefined || p.radius !== undefined);
  if (sized.length)
    throw new Error(`${sized.length} points carry a size (size / r / radius), but this kit draws every point at one radius: a bubble size would be a quantity the page states and never draws. Remove the size field from points in beat.mjs, and if the takeaway is about that third quantity, choose another type`);
  if (points.length < 10)
    throw new Error(`beat.mjs gives ${points.length} points; a scatter's argument is the shape of a cloud, and under 10 points there is no cloud — draw a bar or a slope instead, or include every row data.json holds for both measures`);
  const unnamed = points.filter((p) => typeof p.name !== "string" || !p.name.trim());
  if (unnamed.length) throw new Error(`${unnamed.length} points have no name: give each point { name, x, y } — cards 4 and 5 name the extremes on each side of the break`);
  const nonPositive = points.filter((p) => !(p.x > 0));
  if (nonPositive.length)
    throw new Error(`${nonPositive.length} points have x <= 0 (first: ${nonPositive[0].name} ${nonPositive[0].x}): card 2 turns the x axis logarithmic, which cannot place them. Filter them out of points in beat.mjs and say so in the limits`);
  const xs = points.map((p) => p.x);
  const ys = points.map((p) => p.y);
  const [xMin, xMax] = [Math.min(...xs), Math.max(...xs)];
  if (xMax / xMin < 10)
    throw new Error(`x runs from ${xMin} to ${xMax}, less than a factor of 10: card 2's gesture (linear axis → logarithmic) only unfolds a measure spanning orders of magnitude. Choose another type for this x`);
  /** The y scale runs in tens, as the static plate's; a cloud spanning far less is a flat band. */
  const yLo = Math.floor(Math.min(...ys) / 10) * 10;
  const yHi = Math.ceil(Math.max(...ys) / 10) * 10;
  if (Math.max(...ys) - Math.min(...ys) < 0.4 * (yHi - yLo))
    throw new Error(`the y values span ${Math.min(...ys)} to ${Math.max(...ys)}, but the y axis runs in tens (${yLo} to ${yHi}), so the cloud would be a flat band: rescale y in beat.mjs (a share as a percentage) and say the unit in yName`);
  const yTicks = [];
  for (let t = yLo; t <= yHi + 1e-9; t += 10) yTicks.push(t);

  // ── the declared break, and the spread of y on each side ────────────────────────────────────────
  const breakAt = beat.breakAt;
  if (!Number.isFinite(breakAt) || !(breakAt > xMin && breakAt < xMax))
    throw new Error(`breakAt is ${JSON.stringify(breakAt)}: this choreography draws a declared break (card 3) and measures each side (cards 4 and 5) — give a number inside the x range (${xMin} to ${xMax})`);
  const sideOf = (s) => {
    const lo = s.reduce((m, p) => (p.y < m.y ? p : m));
    const hi = s.reduce((m, p) => (p.y > m.y ? p : m));
    return { count: s.length, lo: { name: lo.name, x: lo.x, y: lo.y }, hi: { name: hi.name, x: hi.x, y: hi.y }, range: hi.y - lo.y };
  };
  const belowPts = points.filter((p) => p.x < breakAt);
  const abovePts = points.filter((p) => p.x >= breakAt);
  if (belowPts.length < 3 || abovePts.length < 3)
    throw new Error(`breakAt ${breakAt} leaves ${belowPts.length} points below and ${abovePts.length} at or above it: a break compares two sides, each needs at least 3 points. Move breakAt in beat.mjs`);
  const below = sideOf(belowPts);
  const above = sideOf(abovePts);
  if (!(above.range > 0)) throw new Error(`every point at or above ${breakAt} has the same y: card 5 measures a spread there, and there is none`);

  // The drive's linear axis rounds its top up to a multiple of 25,000 (income-scatter-drive.mjs,
  // linMax). The points are handed to the page multiplied by a power of ten that brings the largest x
  // between 100,000 and 1,000,000, so that rounding never leaves the cloud in a corner; every label
  // is printed from the TRUE value by xTick(). A logarithmic axis is unchanged by the factor.
  const SCALE = 10 ** (5 - Math.floor(Math.log10(xMax)));
  const linTop = Math.ceil((xMax * SCALE * 1.04) / 25000) * 25000 / SCALE;
  const linStep = niceStep(linTop / 6);
  const linearTicks = [];
  for (let v = 0; v <= linTop + 1e-9; v += linStep) linearTicks.push(v);
  const logTicks = [];
  for (let e = Math.floor(Math.log10(xMin)) - 1; e <= Math.ceil(Math.log10(xMax)); e++)
    for (const m of [1, 2, 5]) {
      const v = m * 10 ** e;
      if (v >= xMin && v <= xMax) logTicks.push(v);
    }

  const firstTenth = points.filter((p) => p.x < 0.1 * xMax).length;
  const reading = {
    count: points.length,
    breakAt,
    below,
    above,
    ratio: below.range / above.range,
    firstTenth,
    firstTenthShare: (firstTenth / points.length) * 100,
    xMin,
    xMax,
  };
  Object.freeze(reading);
  beat.check(reading);

  /** The claim's column may be either axis; the page draws both. */
  try {
    assertDrawsClaimColumn(ys, HERE);
  } catch (yError) {
    try {
      assertDrawsClaimColumn(xs, HERE);
    } catch {
      throw yError;
    }
  }

  // ── the words, each passed through plain(); every number they state is checked ───────────────────
  const say = (field, value) => {
    const text = typeof value === "function" ? value(reading) : value;
    const parts = [text].flat();
    if (!parts.length || parts.some((p) => typeof p !== "string" || !p.trim())) throw new Error(`${field} must return a non-empty sentence (or an array of paragraphs); it returned ${JSON.stringify(text)}`);
    return parts.map(plain);
  };
  const format = (v) => plain(beat.format(v));
  const prose = [...CARDS.slice(0, 5).map((k) => say(`cards.${k}`, beat.cards[k])), say("limits", [beat.limits].flat()[0])];
  const notes = Object.fromEntries(Object.entries(NOTES).map(([k, slot]) => [slot, say(`notes.${k}`, beat.notes[k]).join(" ")]));
  const belowClaim = say("belowNote", beat.belowNote).join(" ");
  const aboveClaim = say("aboveNote", beat.aboveNote).join(" ");

  // What each card is ABOUT, so it must say it: the figure its gesture puts on screen.
  const OWES = {
    linear: [["count", String(reading.count)]],
    log: [],
    break: [["below.count", String(below.count)], ["above.count", String(above.count)]],
    below: [["below.lo.y", format(below.lo.y)], ["below.hi.y", format(below.hi.y)]],
    above: [["above.lo.y", format(above.lo.y)], ["above.hi.y", format(above.hi.y)]],
  };
  const states = (text, wanted) => new RegExp(`(?<![\\d.,])${wanted.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?![\\d])`).test(text);
  CARDS.slice(0, 5).forEach((k, i) => {
    const text = prose[i].join(" ");
    for (const [what, wanted] of OWES[k])
      if (!states(text, wanted)) throw new Error(`card ${i + 1} (cards.${k}) must state ${what} = "${wanted}" — the figure its picture shows; it says: ${text}`);
  });
  // The two claims drawn on the plot state each side's count and spread, as the static plate's do.
  for (const [field, text, side] of [["belowNote", belowClaim, below], ["aboveNote", aboveClaim, above]]) {
    if (!states(text, String(side.count))) throw new Error(`${field} must state how many points lie on its side of the break (${side.count}); it says: ${text}`);
    const stated = [...text.matchAll(/\d+(?:[.,]\d+)?/g)].map((m) => Number(m[0].replace(",", ".")));
    if (!stated.some((n) => Math.abs(n - side.range) <= 0.5)) throw new Error(`${field} must state the spread of y on its side of the break (${side.range.toFixed(1)}, max minus min), computed; it says: ${text}`);
  }

  // Every other figure a card, a note or the alt text states must be one this kit computed, at the
  // precision it is written with. A year (1900–2100) and a figure glued to letters (CO2, 10e) pass.
  // The decimal mark is read off the beat's own format(1.5); a format that prints whole numbers says
  // nothing, so the story's language decides (a "2,4" in a card is then read as 2.4, not as 2 and 4).
  const sample = plain(beat.format(1.5));
  const langOf = beat.lang ?? storyLanguage(HERE) ?? "en";
  const decimal = /,/.test(sample) ? "," : /\./.test(sample) ? "." : /,/.test(new Intl.NumberFormat(langOf).format(1.5)) ? "," : ".";
  const group = decimal === "," ? "[ .]" : "[ ,]";
  const known = [
    reading.count, firstTenth, reading.firstTenthShare, breakAt, below.count, above.count,
    below.lo.y, below.hi.y, below.range, above.lo.y, above.hi.y, above.range, reading.ratio, xMin, xMax,
  ];
  const dec = decimal === "." ? "\\." : ",";
  const figure = new RegExp(`(?<![\\p{L}\\d.,])(\\d{1,3}(?:${group}\\d{3})+(?:${dec}\\d+)?|\\d+(?:${dec}\\d+)?)(?![\\p{L}\\d])`, "gu");
  const checkFigures = (where, text) => {
    for (const m of plain(text).matchAll(figure)) {
      const raw = m[1];
      const [whole, frac = ""] = raw.split(decimal);
      const n = Number(`${whole.replace(/[ .,]/g, "")}.${frac || "0"}`);
      if (!frac && Number.isInteger(n) && n >= 1900 && n <= 2100) continue;
      const tolerance = 0.5 * 10 ** -frac.length + 1e-9;
      if (!known.some((v) => Math.abs(v - n) <= tolerance))
        throw new Error(`${where} states ${raw}, which no figure of this cloud rounds to: every number in a card is computed — use the reading (r.count, r.below.range, r.above.lo.y, r.ratio, …) through format(), never a typed or recomputed value. It says: ${text}`);
    }
  };
  CARDS.slice(0, 5).forEach((k, i) => checkFigures(`card ${i + 1} (cards.${k})`, prose[i].join(" ")));
  for (const [k, slot] of Object.entries(NOTES)) checkFigures(`notes.${k}`, notes[slot]);
  checkFigures("belowNote", belowClaim);
  checkFigures("aboveNote", aboveClaim);

  const titleForms = [beat.title].flat().map(plain);
  // The title may state the spreads, the counts or their ratio — figures the gesture measures and the
  // plate writes, so they count as drawn beside the values.
  assertHeadlineNumbersDrawn(titleForms[0], [...ys, below.range, above.range, below.count, above.count, reading.ratio], "points");

  const eyebrow = plain(beat.eyebrow);
  const source = plain(beat.source);
  const alt = plain(typeof beat.alt === "function" ? beat.alt(reading) : beat.alt);
  checkFigures("alt", alt);
  const words = {
    xName: plain(beat.xName),
    yName: plain(beat.yName),
    belowClaim,
    aboveClaim,
    ...notes,
  };
  const linearQualifier = plain(beat.linearQualifier);
  const logQualifier = plain(beat.xQualifier);
  // The runner's own keys (p1…pN), never the model's names in a selector.
  const keyed = points.map((p, i) => ({ ...p, code: `p${i + 1}` }));
  const keyOf = (pt) => keyed.find((p) => p.name === pt.name && p.x === pt.x && p.y === pt.y).code;
  const extremes = [
    { code: keyOf(below.lo), label: `${plain(below.lo.name)} ${format(below.lo.y)}`, side: "below" },
    { code: keyOf(below.hi), label: `${plain(below.hi.name)} ${format(below.hi.y)}`, side: "below" },
    { code: keyOf(above.lo), label: `${plain(above.lo.name)} ${format(above.lo.y)}`, side: "above" },
    { code: keyOf(above.hi), label: `${plain(above.hi.name)} ${format(above.hi.y)}`, side: "above" },
  ];
  const tick = (v) => plain(beat.xTick(v));
  const linTicks = linearTicks.map((v) => ({ value: Math.max(v * SCALE, 1), label: tick(v) }));
  const lgTicks = logTicks.map((v) => ({ value: v * SCALE, label: tick(v) }));

  const textPerRegister = {
    display: titleForms.join(" "),
    eyebrow,
    body: `${prose.flat().join(" ")} ${source}`,
    axis: `${words.xName} ${linearQualifier} ${logQualifier} ${words.yName} ${extremes.map((e) => e.label).join(" ")} ${[...linTicks, ...lgTicks].map((t) => t.label).join(" ")} ${yTicks.join(" ")}`,
    annot: `${belowClaim} ${aboveClaim}`,
    value: Object.values(notes).join(" "),
  };

  const driver = readFileSync(join(HERE, "income-scatter-drive.mjs"), "utf8");
  const lang = beat.lang ?? storyLanguage(HERE) ?? "en";
  await renderBeatScrolly({
    here: HERE,
    states: STATES,
    textPerRegister,
    evidenceLevels: beat.evidenceLevels ?? 3,
    async render({ label, direction, outDir }) {
      const { ink, muted } = deriveFurniture(direction.ground);
      const regs = webRegisters(direction, { ink: { ink, muted, accent: direction.accent } });
      const { outPath } = await renderScrolly({
        steps: prose.map((p, i) => ({ id: CARDS[i], prose: p })),
        reveal: {
          element: createElement(DirectedIncomeScatterScrolly, {
            points: keyed.map(({ code, x, y }) => ({ code, x: x * SCALE, y })),
            breakAt: breakAt * SCALE,
            spread: { below: { lo: below.lo.y, hi: below.hi.y }, above: { lo: above.lo.y, hi: above.hi.y } },
            extremes,
            linearTicks: linTicks,
            logTicks: lgTicks,
            yTicks,
            words,
            alt,
            regs,
            stroke: direction.stroke ?? {},
            ground: direction.ground,
            accent: direction.accent,
            ink,
            muted,
            linearQualifier,
            logQualifier,
          }),
          states: STATES,
          driver,
          apply: "applyIncomeState",
        },
        title: titleForms,
        eyebrow,
        source,
        ground: direction.ground,
        type: { eyebrow: { ...regs.eyebrow, marginBottom: `${gapOf(registerOf(direction, "eyebrow"), EYEBROW_TO_DISPLAY)}px` }, display: regs.display, body: regs.body, source: regs.body },
        lang,
        outDir,
        name: `${label}.html`,
      });
      return { outPath };
    },
  });
});

/** 1, 2, 2.5 or 5 × a power of ten, the first at or above `raw`. */
function niceStep(raw) {
  const p = 10 ** Math.floor(Math.log10(raw));
  for (const m of [1, 2, 2.5, 5, 10]) if (m * p >= raw - 1e-9) return m * p;
  return 10 * p;
}
