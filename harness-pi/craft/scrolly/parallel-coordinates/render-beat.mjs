// The generic half of a parallel-coordinates SCROLLY beat, taken from
// proof/scrolly-parallel-coordinates-electricity-mix/render-directions-scrolly.mjs with everything
// about ITS subject removed. The choreography is the worked example's and is not the model's to
// change — six cards, one continuous interpolation driven by the reader's scroll
// (parallel-drive.mjs, verbatim):
//
//   1 first     one axis (the takeaway's first measure): every point, its floor drawn, the lines at
//               or above it named;
//   2 second    the second axis beside it, a line from each point; the lines at or above ITS floor named;
//   3 crossing  the lines at or above both floors take the accent, every other line steps back;
//   4 unfold    the other axes arrive one by one, each on its own scale;
//   5 follow    the accented lines' values written on every axis;
//   6 reading   the plate, every line named once; the card states the accounting (the limits).
//
// This file computes every figure the cards may state (the two groups, the lines clearing both,
// the correlation, each axis's ceiling) and checks the words against them; ./beat.mjs — the one
// file the model writes — gives the data and the WORDS of each card. Copied into the beat by the
// harness; never edited by the model.
//
// Usage:  bun <beat>/render-beat.mjs
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createElement } from "react";
import { deriveFurniture } from "#shared/chart-beat/render-still.mjs";
import { webRegisters } from "#shared/design-base/web.mjs";
import { EYEBROW_TO_DISPLAY, gapOf, registerOf } from "#shared/design-base/register.mjs";
import { DirectedParallelScrolly } from "./DirectedParallelScrolly.tsx";
import { applyStoryboard, assertNumbers, assertHeadlineNumbersDrawn, assertDrawsClaimColumn } from "./guards.mjs";
import { plain, refusing, storyLanguage } from "./web.mjs";
import { renderBeatScrolly, scrollySkill } from "./scrolly.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));

/** The cards, in the drive's order: the runner's own ids (never the model's words in an id). */
const CARDS = ["first", "second", "crossing", "unfold", "follow", "reading"];
/** One state per card; see parallel-drive.mjs for what each field paints. `span` 7 is the number of
 *  axes, filled in below; everything else is the worked example's, verbatim. */
const STATE_TABLE = (n) => [
  { span: 1, floorN: 1, floorW: 0, mark: 1, dots: 1, groupN: 1, groupW: 0, accent: 0, retreat: 0, follow: 0, seats: 0, note: 0 },
  { span: 2, floorN: 1, floorW: 1, mark: 1, dots: 1, groupN: 0, groupW: 1, accent: 0, retreat: 0, follow: 0, seats: 0, note: 1 },
  { span: 2, floorN: 1, floorW: 1, mark: 1, dots: 1, groupN: 0, groupW: 1, accent: 1, retreat: 1, follow: 0, seats: 0, note: 2 },
  { span: n, floorN: 0, floorW: 0, mark: 0, dots: 0, groupN: 0, groupW: 0, accent: 1, retreat: 0.55, follow: 0, seats: 1, note: 3 },
  { span: n, floorN: 0, floorW: 0, mark: 0, dots: 0, groupN: 0, groupW: 0, accent: 1, retreat: 1, follow: 1, seats: 1, note: 4 },
  { span: n, floorN: 0, floorW: 0, mark: 0, dots: 0, groupN: 0, groupW: 0, accent: 1, retreat: 0, follow: 0, seats: 2, note: 5 },
];
/** The component's header-note slots, one per card, in the same order. */
const NOTE_SLOTS = ["nuclearNote", "windNote", "bothNote", "scaleNote", "fossilNote", "threadNote"];

await refusing(HERE, async () => {
  const { default: beat } = await import("./beat.mjs");
  applyStoryboard(beat, HERE);
  const { renderScrolly } = await import(scrollySkill(HERE, "scripts", "render-scrolly.mjs"));

  const REQUIRED = ["eyebrow", "axes", "lines", "thread", "claimAxes", "floors", "unit", "format", "cards", "notes", "title", "limits", "source", "alt", "check"];
  const missing = REQUIRED.filter((key) => beat[key] === undefined);
  if (missing.length) throw new Error(`beat.mjs is missing ${missing.join(", ")} (see CONTRACT.md)`);
  for (const fn of ["format", "check"])
    if (typeof beat[fn] !== "function") throw new Error(`beat.mjs: ${fn} must be a function (see CONTRACT.md)`);
  for (const group of ["cards", "notes"]) {
    const keys = group === "cards" ? CARDS.slice(0, 5) : CARDS;
    const absent = keys.filter((k) => typeof beat[group]?.[k] !== "function");
    if (absent.length) throw new Error(`beat.mjs: ${group} must give a function for each of ${keys.join(", ")}; missing or not a function: ${absent.join(", ")} (see CONTRACT.md)`);
  }

  // ── the axes and the lines ─────────────────────────────────────────────────────────────────────
  if (!Array.isArray(beat.axes) || beat.axes.length < 3 || beat.axes.length > 9)
    throw new Error(`axes holds ${beat.axes?.length ?? 0} axes; parallel coordinates need 3 to 9. With two measures, draw a scatter or a slope instead`);
  const axisKeys = beat.axes.map((a) => a.key);
  if (new Set(axisKeys).size !== axisKeys.length) throw new Error(`two axes share a key (${axisKeys.join(", ")})`);
  if (!Array.isArray(beat.lines) || beat.lines.length < 3 || beat.lines.length > 30)
    throw new Error(`lines holds ${beat.lines?.length ?? 0} entities; this plate can carry 3 to 30. Keep the thread and the largest others, and say in limits how many of how many are drawn`);
  const lineKeys = beat.lines.map((l) => String(l.key));
  if (new Set(lineKeys).size !== lineKeys.length) throw new Error(`two lines share a key: one line per entity — filter data.json to one row per entity (one year)`);
  for (const l of beat.lines) {
    const absent = axisKeys.filter((k) => l.values?.[k] === undefined);
    if (absent.length) throw new Error(`line ${l.key} has no value for ${absent.join(", ")}: every line crosses every axis`);
    assertNumbers(axisKeys.map((k) => [`${l.key}.${k}`, l.values[k]]), "lines");
  }
  const negative = beat.lines.flatMap((l) => axisKeys.filter((k) => l.values[k] < 0).map((k) => `${l.key}.${k}`));
  if (negative.length) throw new Error(`${negative.slice(0, 3).join(", ")} are negative: every axis here runs from 0 up`);

  // This choreography builds the argument on the FIRST two axes (card 1 stands axis 1 alone with its
  // floor, card 2 adds axis 2 with its own): the takeaway's two measures must open the axes.
  if (!Array.isArray(beat.claimAxes) || beat.claimAxes.length !== 2 || beat.claimAxes[0] !== axisKeys[0] || beat.claimAxes[1] !== axisKeys[1])
    throw new Error(`claimAxes ${JSON.stringify(beat.claimAxes)} must be the first two axes, in order (${axisKeys.slice(0, 2).join(", ")}): this scrolly stands the takeaway's first measure alone, then its second beside it. Reorder axes so the two the takeaway relates come first`);
  if (!Array.isArray(beat.floors) || beat.floors.length !== 2 || !beat.floors.every((f) => typeof f === "number" && Number.isFinite(f) && f > 0))
    throw new Error(`floors must be two numbers above zero, the takeaway's thresholds on ${axisKeys[0]} and ${axisKeys[1]} (e.g. [25, 20]); it is ${JSON.stringify(beat.floors)}`);
  const [floorA, floorB] = beat.floors;
  const value = (l, i) => l.values[axisKeys[i]];
  const groupA = beat.lines.filter((l) => value(l, 0) >= floorA).sort((a, b) => value(b, 0) - value(a, 0));
  const groupB = beat.lines.filter((l) => value(l, 1) >= floorB).sort((a, b) => value(b, 1) - value(a, 1));
  const both = groupA.filter((l) => value(l, 1) >= floorB);
  for (const [g, f, k] of [[groupA, floorA, axisKeys[0]], [groupB, floorB, axisKeys[1]]]) {
    if (!g.length) throw new Error(`no line reaches ${f} on ${k}: card ${k === axisKeys[0] ? 1 : 2} names the lines at or above that floor, so the floor must hold some`);
    if (g.length > 12) throw new Error(`${g.length} lines reach ${f} on ${k}: the card names them beside the axis and twelve is the most that fit; raise the floor or draw fewer lines`);
  }
  if (both.length < 1 || both.length > 3)
    throw new Error(`${both.length} line(s) clear both floors (${floorA} on ${axisKeys[0]}, ${floorB} on ${axisKeys[1]}); card 3 draws them in the accent, which carries 1 to 3 lines. Check the floors against the takeaway`);
  const thread = [beat.thread].flat().map(String);
  const bothKeys = both.map((l) => String(l.key));
  if (thread.length !== bothKeys.length || thread.some((k) => !bothKeys.includes(k)))
    throw new Error(`thread is ${JSON.stringify(thread)}, but the lines clearing both floors are ${JSON.stringify(bothKeys)}: card 3 accents exactly the lines above both floors, so thread must name those`);

  const step = beat.ceilingStep ?? 10;
  if (!(step > 0)) throw new Error(`ceilingStep is ${beat.ceilingStep}: give a positive step (default 10)`);
  const ceilings = axisKeys.map((k) => Math.ceil(Math.max(...beat.lines.map((l) => l.values[k])) / step) * step || step);
  for (const [i, f] of [[0, floorA], [1, floorB]])
    if (f >= ceilings[i]) throw new Error(`the floor ${f} on ${axisKeys[i]} sits at or above that axis's ceiling (${ceilings[i]}): no line can clear it`);

  // The correlation between the first two axes across every line (card 3's crossing).
  const mean = (xs) => xs.reduce((a, b) => a + b, 0) / xs.length;
  const xs = beat.lines.map((l) => value(l, 0));
  const ys = beat.lines.map((l) => value(l, 1));
  const [mx, my] = [mean(xs), mean(ys)];
  const sxy = xs.reduce((s, x, i) => s + (x - mx) * (ys[i] - my), 0);
  const corr = sxy / Math.sqrt(xs.reduce((s, x) => s + (x - mx) ** 2, 0) * ys.reduce((s, y) => s + (y - my) ** 2, 0));
  if (!Number.isFinite(corr)) throw new Error(`the first two axes have no spread across the lines (correlation undefined): the crossing cannot be read`);

  // Bounds a card states about the followed lines ("gas and coal each under 2 %") are checked here
  // on every accented line, then count as figures the cards may state.
  const bounds = beat.bounds ?? [];
  if (!Array.isArray(bounds)) throw new Error(`bounds must be an array of { axes: [keys], below?: n, atLeast?: n, sum?: true }`);
  for (const b of bounds) {
    const unknown = (b.axes ?? []).filter((k) => !axisKeys.includes(k));
    if (!b.axes?.length || unknown.length) throw new Error(`a bound names axes ${JSON.stringify(b.axes)}; each must be a key of axes (${axisKeys.join(", ")})`);
    if (b.below === undefined && b.atLeast === undefined) throw new Error(`a bound on ${b.axes.join(", ")} gives neither below nor atLeast`);
    for (const l of both) {
      const vs = b.sum ? [b.axes.reduce((s, k) => s + l.values[k], 0)] : b.axes.map((k) => l.values[k]);
      if (b.below !== undefined && vs.some((v) => !(v < b.below))) throw new Error(`a bound says ${b.axes.join(b.sum ? " + " : ", ")} stay${b.sum ? "s" : ""} below ${b.below} for the accented lines; for ${l.name} it is ${vs.map((v) => v.toFixed(2)).join(", ")}`);
      if (b.atLeast !== undefined && vs.some((v) => !(v >= b.atLeast))) throw new Error(`a bound says ${b.axes.join(b.sum ? " + " : ", ")} reach${b.sum ? "es" : ""} at least ${b.atLeast} for the accented lines; for ${l.name} it is ${vs.map((v) => v.toFixed(2)).join(", ")}`);
    }
  }

  const point = (l) => ({ key: String(l.key), name: l.name, values: { ...l.values } });
  const reading = {
    count: beat.lines.length,
    axisCount: axisKeys.length,
    axes: beat.axes.map((a, i) => ({ key: a.key, name: a.name, ceiling: ceilings[i] })),
    first: { key: axisKeys[0], name: beat.axes[0].name, floor: floorA, count: groupA.length, lines: groupA.map(point) },
    second: { key: axisKeys[1], name: beat.axes[1].name, floor: floorB, count: groupB.length, lines: groupB.map(point) },
    bothCount: both.length,
    both: both.map(point),
    corr,
  };
  Object.freeze(reading);
  beat.check(reading);
  assertDrawsClaimColumn(beat.lines.flatMap((l) => axisKeys.map((k) => l.values[k])), HERE);

  // ── the words, each passed through plain(); every number they state is checked ───────────────────
  const say = (field, value) => {
    const text = typeof value === "function" ? value(reading) : value;
    const parts = [text].flat();
    if (!parts.length || parts.some((p) => typeof p !== "string" || !p.trim())) throw new Error(`${field} must return a non-empty sentence (or an array of paragraphs); it returned ${JSON.stringify(text)}`);
    return parts.map(plain);
  };
  const format = (v) => plain(beat.format(v));
  const prose = [...CARDS.slice(0, 5).map((k) => say(`cards.${k}`, beat.cards[k])), say("limits", [beat.limits].flat()[0])];
  const notes = Object.fromEntries(CARDS.map((k, i) => [NOTE_SLOTS[i], say(`notes.${k}`, beat.notes[k]).join(" ")]));

  // The decimal mark: the one format() prints, else the story language's (format may round to whole numbers).
  const lang = beat.lang ?? storyLanguage(HERE) ?? "en";
  const printed = String(beat.format(1.5));
  const decimal = /\d,\d/.test(printed) ? "," : /\d\.\d/.test(printed) ? "." : (1.5).toLocaleString(lang).includes(",") ? "," : ".";
  const group = decimal === "," ? "[ .]" : "[ ,]";
  const dec = decimal === "." ? "\\." : ",";
  const figure = new RegExp(`(?<![\\p{L}\\d.,])(\\d{1,3}(?:${group}\\d{3})+(?:${dec}\\d+)?|\\d+(?:${dec}\\d+)?)(?![\\p{L}\\d])`, "gu");
  const figuresOf = (text) =>
    [...plain(text).matchAll(figure)].map((m) => {
      const raw = m[1];
      const [whole, frac = ""] = raw.split(decimal);
      return { raw, n: Number(`${whole.replace(/[ .,]/g, "")}.${frac || "0"}`), frac };
    });
  const within = (f, v) => Math.abs(Math.abs(v) - f.n) <= 0.5 * 10 ** -f.frac.length + 1e-9;

  // What each card is ABOUT, so it must say it: its floor, the names its picture writes, the crossing.
  const named = (text, lines, what) => {
    const absent = lines.filter((l) => !text.includes(plain(l.name)));
    if (absent.length) throw new Error(`${what} must name ${absent.map((l) => l.name).join(", ")} — the line(s) its picture writes; it says: ${text}`);
  };
  const owesFigure = (text, v, what, where) => {
    if (!figuresOf(text).some((f) => within(f, v))) throw new Error(`${where} must state ${what} (${v.toFixed(2)}) — the figure its picture shows; it says: ${text}`);
  };
  const cardText = (i) => prose[i].join(" ");
  owesFigure(cardText(0), floorA, "the first floor, floors[0]", "card 1 (cards.first)");
  owesFigure(cardText(1), floorB, "the second floor, floors[1]", "card 2 (cards.second)");
  owesFigure(cardText(2), corr, "the correlation r.corr", "card 3 (cards.crossing)");
  named(cardText(2), both, "card 3 (cards.crossing)");
  named(cardText(4), both, "card 5 (cards.follow)");

  // Every other figure a card, a note or the alt text states must be one this kit computed, at the
  // precision it is written with. A year (1900–2100) and a figure glued to letters (CO2) pass.
  const known = [
    reading.count, reading.axisCount, groupA.length, groupB.length, both.length, beat.lines.length - both.length,
    floorA, floorB, Math.abs(corr), ...ceilings,
    ...bounds.flatMap((b) => [b.below, b.atLeast]).filter((v) => v !== undefined),
    ...both.flatMap((l) => axisKeys.map((k) => l.values[k])),
    ...groupA.map((l) => value(l, 0)), ...groupB.map((l) => value(l, 1)),
  ];
  const checkFigures = (where, text) => {
    for (const f of figuresOf(text)) {
      if (!f.frac && Number.isInteger(f.n) && f.n >= 1900 && f.n <= 2100) continue;
      if (!known.some((v) => within(f, v)))
        throw new Error(`${where} states ${f.raw}, which no figure of this plate rounds to: every number in a card is computed — use the reading (r.first.floor, r.first.count, r.bothCount, r.corr, r.both[i].values[key], …) through format(), never a typed or recomputed value. It says: ${text}`);
    }
  };
  CARDS.slice(0, 5).forEach((k, i) => checkFigures(`card ${i + 1} (cards.${k})`, cardText(i)));
  CARDS.forEach((k, i) => checkFigures(`notes.${k}`, notes[NOTE_SLOTS[i]]));

  const titleForms = [beat.title].flat().map(plain);
  // The title states the floors and the counts the choreography computes and the plate writes.
  assertHeadlineNumbersDrawn(titleForms[0], [floorA, floorB, groupA.length, groupB.length, both.length, beat.lines.length, ...both.flatMap((l) => axisKeys.map((k) => l.values[k]))], "lines");

  const eyebrow = plain(beat.eyebrow);
  const source = plain(beat.source);
  const unit = plain(beat.unit);
  const alt = plain(typeof beat.alt === "function" ? beat.alt(reading) : beat.alt);
  checkFigures("alt", alt);
  const floorText = (f) => `${format(f).replace(/\s*%$/, "")} %`;
  const axes = beat.axes.map((a, i) => ({
    name: plain(a.name),
    ceiling: ceilings[i],
    floor: i === 0 ? floorA : i === 1 ? floorB : null,
    floorText: i < 2 ? plain(floorText(i === 0 ? floorA : floorB)) : "",
  }));
  // Codes are the runner's own (l1…lN): a quote or an accent in a key would break the drive's selectors.
  const lines = beat.lines.map((l, j) => ({
    code: `l${j + 1}`,
    name: plain(l.name),
    values: axisKeys.map((k) => l.values[k]),
    valueTexts: axisKeys.map((k) => format(l.values[k])),
    thread: bothKeys.includes(String(l.key)),
  }));
  const words = { unit, ...notes };

  const textPerRegister = {
    display: titleForms.join(" "),
    eyebrow,
    body: `${prose.flat().join(" ")} ${source}`,
    axis: `${unit} ${axes.map((a) => `${a.name} ${a.ceiling} % ${a.floorText}`).join(" ")} 0 ${lines.map((l) => l.name).join(" ")}`,
    annot: lines.map((l) => l.name).join(" "),
    value: `${Object.values(notes).join(" ")} ${lines.filter((l) => l.thread).flatMap((l) => l.valueTexts).join(" ")}`,
  };

  const STATES = STATE_TABLE(axes.length);
  const driver = readFileSync(join(HERE, "parallel-drive.mjs"), "utf8");
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
          element: createElement(DirectedParallelScrolly, { axes, lines, words, alt, regs, stroke: direction.stroke ?? {}, ground: direction.ground, accent: direction.accent, ink, muted }),
          states: STATES,
          driver,
          apply: "applyParallelState",
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
