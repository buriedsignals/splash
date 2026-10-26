// The generic half of a dot strip SCROLLY beat, taken from
// proof/scrolly-dot-strip-lowcarbon-spread/render-directions-scrolly.mjs with everything about ITS subject
// removed. The choreography is the worked example's and is not the model's to change — six cards, one
// continuous interpolation driven by the reader's scroll (dot-strip-drive.mjs, verbatim):
//
//   1 field    one ruled strip at the earlier state, every mark a pin with its code in a chip; the range
//              as a large figure;
//   2 travel   every pin slides along the strip to the later state, a tick left where it stood; the
//              median's mark moves with them and counts;
//   3 floor    the floor's trail along the strip in the accent (the subject: the lowest mark in both
//              states), the others stepping back;
//   4 ceil     the ceiling's trail (the highest mark in both states), the same;
//   5 spread   both states' floor-to-ceiling brackets under the strip;
//   6 split    the strip opens into two, earlier above and later below on one scale, a leader from each
//              pin to its later self; the card is the limits.
//
// This file computes every figure the cards may state (the floor, the ceiling, the medians, the spreads,
// every mark's move) and checks the words against them; ./beat.mjs — the one file the model writes —
// gives the marks and the WORDS of each card. Copied into the beat by the harness; never edited by the
// model.
//
// Usage:  bun <beat>/render-beat.mjs
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createElement } from "react";
import { deriveFurniture } from "#shared/chart-beat/render-still.mjs";
import { webRegisters } from "#shared/design-base/web.mjs";
import { EYEBROW_TO_DISPLAY, gapOf, registerOf } from "#shared/design-base/register.mjs";
import { DirectedDotStripScrolly } from "./DirectedDotStripScrolly.tsx";
import { applyStoryboard, assertNumbers, assertHeadlineNumbersDrawn, assertDrawsClaimColumn } from "./guards.mjs";
import { plain, refusing, storyLanguage } from "./web.mjs";
import { renderBeatScrolly, scrollySkill } from "./scrolly.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));

/** The cards, in the drive's order: the runner's own ids (never the model's words in an id). */
const CARDS = ["field", "travel", "floor", "ceil", "spread", "split"];
/** One state per card; see dot-strip-drive.mjs for what each field paints. The worked example's, verbatim. */
const STATES = [
  { year: 0, median: 0, floor: 0, ceil: 0, spread: 0, split: 0 },
  { year: 1, median: 1, floor: 0, ceil: 0, spread: 0, split: 0 },
  { year: 1, median: 0, floor: 1, ceil: 0, spread: 0, split: 0 },
  { year: 1, median: 0, floor: 0, ceil: 1, spread: 0, split: 0 },
  { year: 1, median: 0, floor: 0, ceil: 0, spread: 1, split: 0 },
  { year: 1, median: 0, floor: 0, ceil: 0, spread: 0, split: 1 },
];
/** The strip's scale: the drive draws 0 to 100, a tick every 5, a label every 20. */
const TICKS = [0, 20, 40, 60, 80, 100];

await refusing(HERE, async () => {
  const { default: beat } = await import("./beat.mjs");
  applyStoryboard(beat, HERE);
  const { renderScrolly } = await import(scrollySkill(HERE, "scripts", "render-scrolly.mjs"));

  const REQUIRED = ["eyebrow", "marks", "subject", "from", "to", "unit", "unitMark", "medianName", "format", "cards", "figures", "splitNote", "floorTrail", "ceilTrail", "spreadBefore", "spreadAfter", "title", "limits", "source", "alt", "check"];
  const missing = REQUIRED.filter((key) => beat[key] === undefined);
  if (missing.length) throw new Error(`beat.mjs is missing ${missing.join(", ")}: give each as a field of the default export (export default { …, ${missing[0]}: … }), not as a separate export (see CONTRACT.md)`);
  for (const fn of ["format", "figures", "floorTrail", "ceilTrail", "spreadBefore", "spreadAfter", "check"])
    if (typeof beat[fn] !== "function") throw new Error(`beat.mjs: ${fn} must be a function (see CONTRACT.md)`);
  const absent = CARDS.slice(0, 5).filter((k) => typeof beat.cards?.[k] !== "function");
  if (absent.length) throw new Error(`beat.mjs: cards must give a function for each of ${CARDS.slice(0, 5).join(", ")}; missing or not a function: ${absent.join(", ")} (see CONTRACT.md)`);
  // The drive writes the moving median with a decimal comma (the worked example's French); a story whose
  // sentences use a decimal point would print 70,6 beside 70.6.
  if (!/,/.test(beat.format(1.5)))
    throw new Error(`format(1.5) prints ${JSON.stringify(beat.format(1.5))}: this kit's moving median is written with a decimal comma (the worked example's drive), so the cards must be too — it cannot serve a language written with a decimal point`);

  // ── the marks: two states each, on a 0–100 strip ─────────────────────────────────────────────
  if (!Array.isArray(beat.marks)) throw new Error(`marks must be an array of { name, code, before, after }`);
  if (beat.marks.length < 4 || beat.marks.length > 30) throw new Error(`marks holds ${beat.marks.length}: a dot strip draws 4 to 30 marks`);
  assertNumbers(beat.marks.flatMap((m) => [[`${m.name} before`, m.before], [`${m.name} after`, m.after]]));
  const marks = beat.marks.map((m) => ({ name: String(m.name), label: plain(String(m.label ?? m.name)), code: String(m.code ?? ""), before: m.before, after: m.after, move: m.after - m.before }));
  if (new Set(marks.map((m) => m.name)).size !== marks.length) throw new Error(`marks holds the same name twice: one mark per entity, two states each`);
  const badCode = marks.find((m) => !/^[A-Za-z0-9]{2,5}$/.test(m.code));
  if (badCode) throw new Error(`mark ${badCode.name} has code ${JSON.stringify(badCode.code)}: every mark needs a short code of 2 to 5 letters or digits ("POL") — the strip prints it in the mark's chip`);
  if (new Set(marks.map((m) => m.code)).size !== marks.length) throw new Error(`two marks share a code: give each a code of its own`);
  const off = marks.find((m) => [m.before, m.after].some((v) => v < 0 || v > 100));
  if (off) throw new Error(`${off.name} is at ${off.before} / ${off.after}: this choreography's strip runs from 0 to 100 — draw a share in percent`);
  const subjectMark = marks.find((m) => m.name === beat.subject);
  if (!subjectMark) throw new Error(`subject is ${JSON.stringify(beat.subject)}, which is not the name of any mark`);

  // ── the worked example's arithmetic, generic ─────────────────────────────────────────────────
  const median = (xs) => {
    const s = [...xs].sort((a, b) => a - b);
    const h = Math.floor(s.length / 2);
    return s.length % 2 ? s[h] : (s[h - 1] + s[h]) / 2;
  };
  const before = marks.map((m) => m.before);
  const after = marks.map((m) => m.after);
  const floorBefore = Math.min(...before);
  const floorAfter = Math.min(...after);
  const ceilBefore = Math.max(...before);
  const ceilAfter = Math.max(...after);
  const floorMark = marks.find((m) => m.before === floorBefore);
  const ceilMark = marks.find((m) => m.before === ceilBefore);
  if (floorMark !== subjectMark)
    throw new Error(`the lowest mark at ${beat.from} is ${floorMark.name}, not ${subjectMark.name}: card 3 traces the FLOOR's move and paints it in the accent, so the subject must be the lowest mark — set subject to ${JSON.stringify(floorMark.name)}, or this choreography does not fit the takeaway`);
  if (subjectMark.after !== floorAfter)
    throw new Error(`${subjectMark.name} is no longer the lowest mark at ${beat.to}: card 3 states the floor's rise as the subject's own move, which holds only if it is the floor in both states`);
  if (ceilMark.after !== ceilAfter)
    throw new Error(`${ceilMark.name}, the highest mark at ${beat.from}, is no longer the highest at ${beat.to}: card 4 states the ceiling's rise as one mark's move, which holds only if it is the ceiling in both states`);
  if (ceilMark === floorMark) throw new Error(`the floor and the ceiling are the same mark: the strip needs a spread`);
  const reading = Object.freeze({
    count: marks.length,
    from: String(beat.from),
    to: String(beat.to),
    marks,
    subject: subjectMark,
    ceiling: ceilMark,
    floorBefore,
    floorAfter,
    ceilBefore,
    ceilAfter,
    floorRise: floorAfter - floorBefore,
    ceilRise: ceilAfter - ceilBefore,
    medianBefore: median(before),
    medianAfter: median(after),
    spreadBefore: ceilBefore - floorBefore,
    spreadAfter: ceilAfter - floorAfter,
    spreadClosed: ceilBefore - floorBefore - (ceilAfter - floorAfter),
  });

  beat.check(reading);
  assertDrawsClaimColumn(marks.flatMap((m) => [m.before, m.after]), HERE);

  // ── the words, each passed through plain(); every number they state is checked ───────────────────
  const say = (field, value) => {
    const text = typeof value === "function" ? value(reading) : value;
    const parts = [text].flat();
    if (!parts.length || parts.some((p) => typeof p !== "string" || !p.trim())) throw new Error(`${field} must return a non-empty sentence (or an array of paragraphs); it returned ${JSON.stringify(text)}`);
    return parts.map(plain);
  };
  const prose = [...CARDS.slice(0, 5).map((k) => say(`cards.${k}`, beat.cards[k])), say("limits", [beat.limits].flat()[0])];

  // Figures as written: a number in the story's decimal mark, at the precision it is written with.
  const figure = /(?<![\p{L}\d.,])(\d{1,3}(?:[ .]\d{3})+(?:,\d+)?|\d+(?:,\d+)?)(?![\p{L}\d])/gu;
  const figuresIn = (text) =>
    [...plain(text).matchAll(figure)].map((m) => {
      const [whole, frac = ""] = m[1].split(",");
      return { raw: m[1], n: Number(`${whole.replace(/[ .]/g, "")}.${frac || "0"}`), tolerance: 0.5 * 10 ** -frac.length + 1e-9, frac };
    });
  const roundsTo = (f, v) => Math.abs(Math.abs(v) - f.n) <= f.tolerance;

  // What each card is ABOUT, so it must say it: the figures its gesture puts on screen, at whatever
  // precision the card writes them ("30 points" for a rise of 29.5 is the worked example's own).
  const OWES = {
    field: [["floorBefore", reading.floorBefore], ["ceilBefore", reading.ceilBefore]],
    travel: [["medianBefore", reading.medianBefore], ["medianAfter", reading.medianAfter]],
    floor: [["subject.before", subjectMark.before], ["subject.after", subjectMark.after], ["floorRise", reading.floorRise]],
    ceil: [["ceiling.before", ceilMark.before], ["ceiling.after", ceilMark.after], ["ceilRise", reading.ceilRise]],
    spread: [["spreadBefore", reading.spreadBefore], ["spreadAfter", reading.spreadAfter]],
  };
  const owe = (where, text, owed) => {
    const found = figuresIn(text);
    for (const [what, v] of owed)
      if (!found.some((f) => roundsTo(f, v))) throw new Error(`${where} must state ${what} (${plain(beat.format(v))}) — the figure its picture shows; it says: ${text}`);
  };
  CARDS.slice(0, 5).forEach((k, i) => owe(`card ${i + 1} (cards.${k})`, prose[i].join(" "), OWES[k]));

  // Every other figure must be one this kit computed, at the precision it is written with, sign aside.
  // A year (1900–2100) passes.
  const known = [
    0, ...TICKS, marks.length,
    ...Object.values(reading).filter((v) => typeof v === "number"),
    ...marks.flatMap((m) => [m.before, m.after, m.move]),
  ];
  const checkFigures = (where, text) => {
    for (const f of figuresIn(text)) {
      if (!f.frac && Number.isInteger(f.n) && f.n >= 1900 && f.n <= 2100) continue;
      if (!known.some((v) => roundsTo(f, v)))
        throw new Error(`${where} states ${f.raw}, which no figure of this strip rounds to: every number in a card is computed — use the reading (r.floorRise, r.ceilRise, r.medianAfter, r.spreadBefore, r.subject.after, …) through format(), never a typed or recomputed value. It says: ${text}`);
    }
  };
  CARDS.slice(0, 5).forEach((k, i) => checkFigures(`card ${i + 1} (cards.${k})`, prose[i].join(" ")));

  // The large figures over the strip, one per card, and the small words on it.
  const fig = beat.figures(reading) ?? {};
  const pair = (key) => {
    const v = fig[key];
    if (!Array.isArray(v) || v.length !== 2 || v.some((t) => typeof t !== "string" || !t.trim())) throw new Error(`figures(r).${key} must be [label, value], two non-empty strings`);
    return v.map(plain);
  };
  if (typeof fig.median !== "string" || !fig.median.trim()) throw new Error(`figures(r).median must be the label of card 2's moving median ("the median"); the kit writes its value`);
  const unitMark = plain(beat.unitMark);
  const medianName = plain(beat.medianName);
  const figures = [
    { key: "range", owed: OWES.field, ...(([label, value]) => ({ label, value }))(pair("range")) },
    { key: "median", owed: [], label: plain(fig.median), value: `{v} ${unitMark}` },
    { key: "floor", owed: [["floorRise", reading.floorRise]], ...(([label, value]) => ({ label, value }))(pair("floor")) },
    { key: "ceil", owed: [["ceilRise", reading.ceilRise]], ...(([label, value]) => ({ label, value }))(pair("ceil")) },
    { key: "spread", owed: OWES.spread, ...(([label, value]) => ({ label, value }))(pair("spread")) },
  ];
  for (const f of figures) {
    owe(`figures(r).${f.key}`, f.value, f.owed);
    checkFigures(`figures(r).${f.key}`, `${f.label} ${f.value.replace("{v}", "")}`);
  }
  const words = {
    unit: say("unit", beat.unit).join(" "),
    figures: figures.map(({ key, label, value }) => ({ key, label, value })),
    splitNote: say("splitNote", beat.splitNote).join(" "),
    floorTrail: plain(beat.floorTrail(reading)),
    ceilTrail: plain(beat.ceilTrail(reading)),
    spreadBefore: plain(beat.spreadBefore(reading)),
    spreadAfter: plain(beat.spreadAfter(reading)),
    medianLabel: `${medianName} {v} ${unitMark}`,
  };
  owe("floorTrail()", words.floorTrail, [["floorRise", reading.floorRise]]);
  owe("ceilTrail()", words.ceilTrail, [["ceilRise", reading.ceilRise]]);
  owe("spreadBefore()", words.spreadBefore, [["spreadBefore", reading.spreadBefore]]);
  owe("spreadAfter()", words.spreadAfter, [["spreadAfter", reading.spreadAfter]]);
  for (const k of ["unit", "splitNote", "floorTrail", "ceilTrail", "spreadBefore", "spreadAfter"]) checkFigures(k, words[k]);

  const titleForms = [beat.title].flat().map(plain);
  // The title may state the rises and spreads the gestures draw, beside the values.
  assertHeadlineNumbersDrawn(titleForms[0], [...marks.flatMap((m) => [m.before, m.after]), reading.floorRise, reading.ceilRise, reading.spreadBefore, reading.spreadAfter, marks.length], "marks");

  const eyebrow = plain(beat.eyebrow);
  const source = plain(beat.source);
  const alt = plain(typeof beat.alt === "function" ? beat.alt(reading) : beat.alt);
  checkFigures("alt", alt);

  const textPerRegister = {
    display: `${titleForms.join(" ")} ${words.figures.map((x) => x.value).join(" ")} 0123456789,%`,
    eyebrow,
    body: `${prose.flat().join(" ")} ${source}`,
    axis: `${words.unit} ${words.figures.map((x) => x.label).join(" ")} ${marks.map((m) => m.code).join(" ")} ${beat.from} ${beat.to} ${TICKS.join(" ")} ${words.splitNote} ${words.spreadBefore} ${words.spreadAfter} ${words.medianLabel} 0123456789,`,
    annot: "",
    value: `${words.floorTrail} ${words.ceilTrail} ${marks.map((m) => m.code).join(" ")} 0123456789,`,
  };

  const driver = readFileSync(join(HERE, "dot-strip-drive.mjs"), "utf8");
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
          element: createElement(DirectedDotStripScrolly, {
            marks: marks.map((m) => ({ code: m.code, name: m.label, before: m.before, after: m.after })),
            subject: subjectMark.code,
            ceiling: ceilMark.code,
            years: [String(beat.from), String(beat.to)],
            ticks: TICKS,
            words,
            alt,
            regs,
            stroke: direction.stroke ?? {},
            ground: direction.ground,
            accent: direction.accent,
            ink,
            muted,
          }),
          states: STATES,
          driver,
          apply: "applyDotStripState",
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
