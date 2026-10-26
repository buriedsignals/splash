// The generic half of a diverging stacked bar SCROLLY beat, taken from
// proof/scrolly-diverging-stacked-electricity/render-directions-scrolly.mjs with everything about ITS
// subject removed. The choreography is the worked example's and is not the model's to change — six
// cards, one continuous interpolation driven by the reader's scroll (diverging-stack-drive.mjs, verbatim):
//
//   1 hundred  every row a plain 100 % stacked bar, aligned left on 0–100;
//   2 centre   each bar slides until the middle of its neutral sits on the axis: the lean appears;
//   3 left     only the left side's levels keep their ramp; the left totals at the ends; the row that
//              leans furthest left in bold;
//   4 right    the same for the right side;
//   5 compare  the subject climbs to the first row and opens two lanes: its neutral above, both sides
//              laid end to end below from the same start; every other row steps back;
//   6 reading  every row and total, the subject in the accent; the card is the limits.
//
// This file computes every figure the cards may state (each row's three totals, the two sides together,
// who leans furthest each way) and checks the words against them; ./beat.mjs — the one file the model
// writes — gives the rows and the WORDS of each card. Copied into the beat by the harness; never edited
// by the model.
//
// Usage:  bun <beat>/render-beat.mjs
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createElement } from "react";
import { deriveFurniture } from "#shared/chart-beat/render-still.mjs";
import { webRegisters } from "#shared/design-base/web.mjs";
import { EYEBROW_TO_DISPLAY, gapOf, registerOf } from "#shared/design-base/register.mjs";
import { DirectedDivergingStackScrolly } from "./DirectedDivergingStackScrolly.tsx";
import { applyStoryboard, assertNumbers, assertHeadlineNumbersDrawn, assertDrawsClaimColumn } from "./guards.mjs";
import { plain, refusing, storyLanguage } from "./web.mjs";
import { renderBeatScrolly, scrollySkill } from "./scrolly.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));

/** The cards, in the drive's order: the runner's own ids (never the model's words in an id). */
const CARDS = ["hundred", "centre", "left", "right", "compare", "reading"];
/** One state per card; see diverging-stack-drive.mjs for what each field paints. The worked example's, verbatim. */
const STATES = [
  { centre: 0, left: 0, right: 0, compare: 0, all: 0 },
  { centre: 1, left: 0, right: 0, compare: 0, all: 0 },
  { centre: 1, left: 1, right: 0, compare: 0, all: 0 },
  { centre: 1, left: 0, right: 1, compare: 0, all: 0 },
  { centre: 1, left: 0, right: 0, compare: 1, all: 0 },
  { centre: 1, left: 0, right: 0, compare: 0, all: 1 },
];

await refusing(HERE, async () => {
  const { default: beat } = await import("./beat.mjs");
  applyStoryboard(beat, HERE);
  const { renderScrolly } = await import(scrollySkill(HERE, "scripts", "render-scrolly.mjs"));

  const REQUIRED = ["eyebrow", "rows", "subject", "leftName", "rightName", "centreName", "unitLine", "format", "cards", "leftNote", "rightNote", "compareNote", "title", "limits", "source", "alt", "check"];
  const missing = REQUIRED.filter((key) => beat[key] === undefined);
  if (missing.length) throw new Error(`beat.mjs is missing ${missing.join(", ")}: give each as a field of the default export (export default { …, ${missing[0]}: … }), not as a separate export (see CONTRACT.md)`);
  for (const fn of ["format", "leftNote", "rightNote", "compareNote", "check"])
    if (typeof beat[fn] !== "function") throw new Error(`beat.mjs: ${fn} must be a function (see CONTRACT.md)`);
  const absent = CARDS.slice(0, 5).filter((k) => typeof beat.cards?.[k] !== "function");
  if (absent.length) throw new Error(`beat.mjs: cards must give a function for each of ${CARDS.slice(0, 5).join(", ")}; missing or not a function: ${absent.join(", ")} (see CONTRACT.md)`);

  // ── the rows: every one 100 %, the same levels in the same order ─────────────────────────────────
  if (!Array.isArray(beat.rows)) throw new Error(`rows must be an array of { key, label, left: [levels], centre: level, right: [levels] }`);
  if (beat.rows.length < 2 || beat.rows.length > 12) throw new Error(`rows holds ${beat.rows.length}: draw 2 to 12 rows`);
  for (const r of beat.rows)
    if (!Array.isArray(r.left) || !Array.isArray(r.right) || !r.left.length || !r.right.length || !r.centre)
      throw new Error(`row ${JSON.stringify(r.key)}: give left and right as non-empty arrays of { key, label, value } (ordered OUTWARD from the centre) and centre as one { key, label, value }`);
  assertNumbers(beat.rows.flatMap((r) => [...r.left, r.centre, ...r.right].map((l) => [`${r.key} ${l.key}`, l.value])));
  const shape = (r) => [...r.left.map((l) => `L:${l.key}`), `C:${r.centre.key}`, ...r.right.map((l) => `R:${l.key}`)].join("|");
  const first = shape(beat.rows[0]);
  const odd = beat.rows.find((r) => shape(r) !== first);
  if (odd) throw new Error(`row ${odd.key} does not carry the same levels in the same order as row ${beat.rows[0].key}: every row has the same left, centre and right levels`);
  if (new Set(beat.rows.map((r) => r.key)).size !== beat.rows.length) throw new Error(`rows holds the same key twice: one row per entity`);
  const sum = (levels) => levels.reduce((s, l) => s + l.value, 0);
  for (const r of beat.rows) {
    const negative = [...r.left, r.centre, ...r.right].find((l) => l.value < 0);
    if (negative) throw new Error(`row ${r.key}: level ${negative.key} is ${negative.value}; a share cannot be negative`);
    const total = sum(r.left) + r.centre.value + sum(r.right);
    if (Math.abs(total - 100) > 0.5) throw new Error(`row ${r.key}: its levels add up to ${total.toFixed(2)}, not 100 — every value is the level's SHARE of the row in percent`);
  }

  // ── the worked example's arithmetic, generic ─────────────────────────────────────────────────
  const readings = beat.rows
    .map((r) => {
      const left = sum(r.left);
      const right = sum(r.right);
      return { key: String(r.key), label: plain(String(r.label ?? r.key)), left, centre: r.centre.value, right, sides: left + right, levels: { left: r.left, centre: r.centre, right: r.right } };
    })
    .sort((a, b) => b.left - a.left);
  if (new Set(readings.map((r) => r.label)).size !== readings.length) throw new Error(`two rows print the same label: give each a label of its own`);
  const subject = readings.find((r) => r.key === String(beat.subject));
  if (!subject) throw new Error(`subject is ${JSON.stringify(beat.subject)}, which is not the key of any row`);
  const leaningLeft = readings[0];
  const leaningRight = readings.reduce((a, b) => (b.right > a.right ? b : a));
  if (!(subject.centre > 0)) throw new Error(`${subject.label}'s ${beat.centreName} is 0: card 5 lays the two sides end to end under the subject's neutral, which must be there`);
  const reading = Object.freeze({ count: readings.length, rows: readings, subject, leaningLeft, leaningRight });

  beat.check(reading);
  assertDrawsClaimColumn(readings.flatMap((r) => [...r.levels.left, r.levels.centre, ...r.levels.right].map((l) => l.value)), HERE);

  // ── the words, each passed through plain(); every number they state is checked ───────────────────
  const say = (field, value) => {
    const text = typeof value === "function" ? value(reading) : value;
    const parts = [text].flat();
    if (!parts.length || parts.some((p) => typeof p !== "string" || !p.trim())) throw new Error(`${field} must return a non-empty sentence (or an array of paragraphs); it returned ${JSON.stringify(text)}`);
    return parts.map(plain);
  };
  const format = (v) => plain(beat.format(v));
  const prose = [...CARDS.slice(0, 5).map((k) => say(`cards.${k}`, beat.cards[k])), say("limits", [beat.limits].flat()[0])];

  // What each card is ABOUT, so it must say it: the figure its gesture puts on screen.
  const OWES = {
    hundred: [],
    centre: [],
    left: [["leaningLeft.left", format(leaningLeft.left)]],
    right: [["leaningRight.right", format(leaningRight.right)]],
    compare: [["subject.centre", format(subject.centre)], ["subject.sides", format(subject.sides)]],
  };
  const escape = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const states = (text, wanted) => new RegExp(`(?<![\\d.,])${escape(wanted)}(?![\\d])`).test(text);
  CARDS.slice(0, 5).forEach((k, i) => {
    const text = prose[i].join(" ");
    for (const [what, wanted] of OWES[k])
      if (!states(text, wanted)) throw new Error(`card ${i + 1} (cards.${k}) must state ${what} = "${wanted}" — the figure its picture shows; it says: ${text}`);
  });

  // Every other figure a card, a note or the alt states must be one this kit computed, at the
  // precision it is written with. A year (1900–2100) and a figure glued to letters (CO2, 10e) pass.
  // The decimal mark the words use: read off format(1.5), or — when format prints whole numbers — the
  // language. Read off format alone, a French beat formatting whole numbers took "3,4" in a card as 3 and 4.
  const sample = plain(beat.format(1.5));
  const decimal = /\d,\d/.test(sample) ? "," : /\d\.\d/.test(sample) ? "." : /,/.test(new Intl.NumberFormat(beat.lang ?? storyLanguage(HERE) ?? "en").format(1.5)) ? "," : ".";
  const group = decimal === "," ? "[ .]" : "[ ,]";
  const dec = decimal === "." ? "\\." : ",";
  const known = [
    0, 50, 100, readings.length, readings[0].levels.left.length, readings[0].levels.right.length,
    ...readings.flatMap((r) => [r.left, r.centre, r.right, r.sides, r.centre - r.sides, ...[...r.levels.left, ...r.levels.right].map((l) => l.value)]),
  ].map(Math.abs);
  const figure = new RegExp(`(?<![\\p{L}\\d.,])(\\d{1,3}(?:${group}\\d{3})+(?:${dec}\\d+)?|\\d+(?:${dec}\\d+)?)(?![\\p{L}\\d])`, "gu");
  const checkFigures = (where, text) => {
    for (const m of plain(text).matchAll(figure)) {
      const raw = m[1];
      const [whole, frac = ""] = raw.split(decimal);
      const n = Number(`${whole.replace(/[ .,]/g, "")}.${frac || "0"}`);
      if (!frac && Number.isInteger(n) && n >= 1900 && n <= 2100) continue;
      const tolerance = 0.5 * 10 ** -frac.length + 1e-9;
      if (!known.some((v) => Math.abs(v - n) <= tolerance))
        throw new Error(`${where} states ${raw}, which no figure of these rows rounds to: every number in a card is computed — use the reading (r.leaningLeft.left, r.leaningRight.right, r.subject.centre, r.subject.sides, …) through format(), never a typed or recomputed value. It says: ${text}`);
    }
  };
  CARDS.slice(0, 5).forEach((k, i) => checkFigures(`card ${i + 1} (cards.${k})`, prose[i].join(" ")));

  const leftNote = plain(beat.leftNote(reading));
  const rightNote = plain(beat.rightNote(reading));
  const compareNote = plain(beat.compareNote(reading));
  for (const [field, text, owed] of [["leftNote", leftNote, OWES.left], ["rightNote", rightNote, OWES.right], ["compareNote", compareNote, OWES.compare]]) {
    for (const [what, wanted] of owed) if (!states(text, wanted)) throw new Error(`${field}() is the header note of its card: it must state ${what} = "${wanted}"; it says: ${text}`);
    checkFigures(field, text);
  }

  const titleForms = [beat.title].flat().map(plain);
  // The title may state the totals the gestures draw (a side, the neutral, both sides together).
  assertHeadlineNumbersDrawn(titleForms[0], readings.flatMap((r) => [r.left, r.centre, r.right, r.sides]), "rows");

  const eyebrow = plain(beat.eyebrow);
  const source = plain(beat.source);
  const unitLine = say("unitLine", beat.unitLine).join(" ");
  checkFigures("unitLine", unitLine);
  const alt = plain(typeof beat.alt === "function" ? beat.alt(reading) : beat.alt);
  checkFigures("alt", alt);

  // The component's own shape: rows keyed by the runner's r1…rN, segments by l0…/c/r0… (never the
  // model's names in a selector), drawn left to right — the left levels from the outermost in, the
  // neutral, the right levels outward.
  const keyOf = new Map(readings.map((r, i) => [r.key, `r${i + 1}`]));
  const rows = readings.map((r) => ({
    code: keyOf.get(r.key),
    name: r.label,
    fossil: r.left,
    nuclear: r.centre,
    renewable: r.right,
    segments: [
      ...r.levels.left.map((l, i) => ({ key: `l${i}`, label: plain(String(l.label ?? l.key)), value: l.value, side: "left", step: i })).reverse(),
      { key: "c", label: plain(String(r.levels.centre.label ?? r.levels.centre.key)), value: r.centre, side: "centre", step: 0 },
      ...r.levels.right.map((l, i) => ({ key: `r${i}`, label: plain(String(l.label ?? l.key)), value: l.value, side: "right", step: i })),
    ],
  }));
  const words = {
    unit: unitLine,
    leftNote,
    rightNote,
    compareNote,
    format: Object.fromEntries(readings.flatMap((r) => [[`${keyOf.get(r.key)}:fossil`, format(r.left)], [`${keyOf.get(r.key)}:renewable`, format(r.right)], [`${keyOf.get(r.key)}:nuclear`, format(r.centre)], [`${keyOf.get(r.key)}:sides`, format(r.sides)]])),
  };
  const levelLabels = (side) => readings[0].levels[side].map((l) => plain(String(l.label ?? l.key)));
  const legend = { left: { name: plain(beat.leftName), levels: levelLabels("left") }, centre: plain(String(readings[0].levels.centre.label ?? beat.centreName)), right: { name: plain(beat.rightName), levels: levelLabels("right") } };
  const L = Math.max(...readings.map((r) => r.left + r.centre / 2));
  const R = Math.max(...readings.map((r) => r.right + r.centre / 2));
  const ticks = { stack: [0, 50, 100], diverging: [-50, 0, 50, 100].filter((t) => t >= -L && t <= R) };

  const textPerRegister = {
    display: titleForms.join(" "),
    eyebrow,
    body: `${prose.flat().join(" ")} ${source}`,
    axis: `${readings.map((r) => r.label).join(" ")} ${unitLine} ${legend.left.name} ${legend.right.name} ${[...legend.left.levels, legend.centre, ...legend.right.levels].join(" ")} 0 50 100`,
    annot: "",
    value: `${Object.values(words.format).join(" ")} ${leftNote} ${rightNote} ${compareNote}`,
  };

  const driver = readFileSync(join(HERE, "diverging-stack-drive.mjs"), "utf8");
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
          element: createElement(DirectedDivergingStackScrolly, {
            rows,
            subject: keyOf.get(subject.key),
            leaningLeft: keyOf.get(leaningLeft.key),
            leaningRight: keyOf.get(leaningRight.key),
            legend,
            words,
            ticks,
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
          apply: "applyDivergingStackState",
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
