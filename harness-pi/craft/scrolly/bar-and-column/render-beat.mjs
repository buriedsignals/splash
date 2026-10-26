// The generic half of a bar-and-column SCROLLY beat, taken from
// proof/scrolly-bar-top-emitters-2024/render-directions-scrolly.mjs with everything about ITS subject
// removed. The choreography is the worked example's and is not the model's to change — six cards,
// one continuous interpolation driven by the reader's scroll (bar-drive.mjs, verbatim):
//
//   1 tail     every member a thin row, largest first: a few long bars, then a long tail;
//   2 cut      the leaders keep a row each, every other member laid end to end into one row;
//   3 ranks    the leaders named and written, from the last drawn up to the second;
//   4 subject  the first row in the accent, named and written;
//   5 stack    the next few — the longest run whose sum stays under the first — laid end to end in
//              the second row under the first's length, the rest stepping back;
//   6 reading  the ranking stands, every value written; the card states the accounting (the limits).
//
// This file computes every figure the cards may state (the ranking, the run, the sums, the shares)
// and checks the words against them; ./beat.mjs — the one file the model writes — gives the data and
// the WORDS of each card. Copied into the beat by the harness; never edited by the model.
//
// Usage:  bun <beat>/render-beat.mjs
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createElement } from "react";
import { deriveFurniture } from "#shared/chart-beat/render-still.mjs";
import { webRegisters } from "#shared/design-base/web.mjs";
import { EYEBROW_TO_DISPLAY, gapOf, registerOf } from "#shared/design-base/register.mjs";
import { DirectedBarScrolly } from "./DirectedBarScrolly.tsx";
import { applyStoryboard, assertNumbers, assertLegibleLabels, assertHeadlineNumbersDrawn, assertDrawsClaimColumn } from "./guards.mjs";
import { plain, refusing, storyLanguage } from "./web.mjs";
import { renderBeatScrolly, scrollySkill } from "./scrolly.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));

/** The cards, in the drive's order: the runner's own ids (never the model's words in an id). */
const CARDS = ["tail", "cut", "ranks", "subject", "stack", "reading"];
/** One state per card; see bar-drive.mjs for what each field paints. The worked example's, verbatim. */
const STATES = [
  { spread: 0, rest: 0, rank: 0, subject: 0, stack: 0, note: 0 },
  { spread: 1, rest: 1, rank: 0, subject: 0, stack: 0, note: 1 },
  { spread: 1, rest: 1, rank: 1, subject: 0, stack: 0, note: 2 },
  { spread: 1, rest: 1, rank: 1, subject: 1, stack: 0, note: 3 },
  { spread: 1, rest: 1, rank: 1, subject: 1, stack: 1, note: 4 },
  { spread: 1, rest: 1, rank: 1, subject: 1, stack: 0, note: 5 },
];
/** The component's header-note slots, one per card, in the same order. */
const NOTE_SLOTS = ["tailNote", "restNote", "rankNote", "subjectNote", "stackNote", "readNote"];

await refusing(HERE, async () => {
  const { default: beat } = await import("./beat.mjs");
  applyStoryboard(beat, HERE);
  const { renderScrolly } = await import(scrollySkill(HERE, "scripts", "render-scrolly.mjs"));

  const REQUIRED = ["eyebrow", "rows", "subject", "whole", "unit", "format", "cards", "notes", "restName", "stackName", "title", "limits", "source", "alt", "check"];
  const missing = REQUIRED.filter((key) => beat[key] === undefined);
  if (missing.length) throw new Error(`beat.mjs is missing ${missing.join(", ")}: give each as a field of the default export (export default { …, ${missing[0]}: … }), not as a separate export (see CONTRACT.md)`);
  for (const fn of ["format", "restName", "stackName", "check"])
    if (typeof beat[fn] !== "function") throw new Error(`beat.mjs: ${fn} must be a function (see CONTRACT.md)`);
  for (const group of ["cards", "notes"]) {
    const keys = group === "cards" ? CARDS.slice(0, 5) : CARDS;
    const absent = keys.filter((k) => typeof beat[group]?.[k] !== "function");
    if (absent.length) throw new Error(`beat.mjs: ${group} must give a function for each of ${keys.join(", ")}; missing or not a function: ${absent.join(", ")} (see CONTRACT.md)`);
  }

  // ── the ranking: every member, so the tail is the whole list and not the drawn head ──────────────
  if (!Array.isArray(beat.rows)) throw new Error(`rows must be an array of { name, value }, one per member of the ranking`);
  assertNumbers(beat.rows.map((r) => [r.name, r.value]));
  const ranked = [...beat.rows].map((r) => ({ name: String(r.name), value: r.value })).sort((a, b) => b.value - a.value);
  if (new Set(ranked.map((r) => r.name)).size !== ranked.length)
    throw new Error(`rows holds the same name twice: give each row ONE value (filter data.json to one year / one series)`);
  if (ranked.some((r) => !(r.value >= 0))) throw new Error(`rows holds a negative value: a bar's length starts at zero; this type cannot draw a negative member`);
  const DRAWN = beat.drawCount ?? 10;
  if (!(Number.isInteger(DRAWN) && DRAWN >= 3 && DRAWN <= 16)) throw new Error(`drawCount is ${beat.drawCount}: draw between 3 and 16 rows`);
  if (ranked.length <= DRAWN)
    throw new Error(`rows has ${ranked.length} members and drawCount is ${DRAWN}: cards 1 and 2 are about the members BELOW the drawn rows (the tail laid end to end), so give every member of the ranking, or lower drawCount`);
  const top = ranked.slice(0, DRAWN);
  const others = ranked.slice(DRAWN);
  const subject = top[0];
  const partsSum = ranked.reduce((s, r) => s + r.value, 0);
  if (!(beat.whole > 0) || partsSum > beat.whole * 1.001)
    throw new Error(`whole is ${beat.whole}, but the rows add up to ${partsSum}: whole must be the total the rows are parts of (e.g. the world row, or the sum of every row)`);

  // The run behind "more than the next N together": the longest run below the first whose sum stays
  // at or under it — the worked example's own search, over the drawn rows.
  let stackSum = 0;
  let stackCount = 0;
  for (const row of top.slice(1)) {
    if (stackSum + row.value > subject.value) break;
    stackSum += row.value;
    stackCount += 1;
  }
  const othersSum = others.reduce((s, r) => s + r.value, 0);
  const pct = (v) => (v / beat.whole) * 100;
  const reading = {
    count: ranked.length,
    drawCount: DRAWN,
    top: top.map((r, i) => ({ ...r, rank: i + 1 })),
    subject: { ...subject, rank: 1 },
    second: { ...top[1], rank: 2 },
    last: { ...top[DRAWN - 1], rank: DRAWN },
    othersCount: others.length,
    othersSum,
    stackCount,
    stackSum,
    stacked: top.slice(1, stackCount + 1).map((r, i) => ({ ...r, rank: i + 2 })),
    nextAfterStack: top[stackCount + 1] ? { ...top[stackCount + 1], rank: stackCount + 2 } : null,
    ratio: subject.value / top[1].value,
    topShare: pct(top.reduce((s, r) => s + r.value, 0)),
    subjectShare: pct(subject.value),
    othersShare: pct(othersSum),
    whole: beat.whole,
  };
  // Frozen: the word functions read the reading, they never change it.
  Object.freeze(reading);

  assertLegibleLabels(top.map((r) => r.value), beat.format);
  beat.check(reading);
  assertDrawsClaimColumn(top.map((r) => r.value), HERE);

  // ── what this choreography cannot draw honestly ─────────────────────────────────────────────────
  if (beat.subject !== subject.name)
    throw new Error(`subject is ${JSON.stringify(beat.subject)}, but the largest row is ${JSON.stringify(subject.name)}: this scrolly is about the LEADER of the ranking (card 4 paints the first row in the accent, card 5 stacks the next ones against it). Set subject to the leader, or check that rows holds the takeaway's series`);
  if (stackCount < 2)
    throw new Error(`only ${stackCount} row(s) below ${subject.name} fit under its length together, so card 5 has nothing to stack: this choreography needs a leader that outweighs at least the next two together`);
  if (othersSum > subject.value * 1.0001)
    throw new Error(`the ${others.length} members below the drawn ${DRAWN} add up to ${othersSum}, more than ${subject.name} (${subject.value}): every picture shares ONE scale whose top is the first row, so the tail laid end to end would run off it. Raise drawCount so fewer members fall into the tail`);
  if (top[1].value <= 0) throw new Error(`the second row is ${top[1].value}: card 4 states the leader against the second, which must be above zero`);

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

  // What each card is ABOUT, so it must say it: the figure its gesture puts on screen.
  const OWES = {
    tail: [["count", String(reading.count)]],
    cut: [["othersSum", format(othersSum)]],
    ranks: [["last.value", format(reading.last.value)], ["second.value", format(reading.second.value)]],
    subject: [["subject.value", format(subject.value)]],
    stack: [["stackSum", format(stackSum)]],
  };
  CARDS.slice(0, 5).forEach((k, i) => {
    const text = prose[i].join(" ");
    for (const [what, wanted] of OWES[k])
      if (!new RegExp(`(?<![\\d.,])${wanted.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?![\\d])`).test(text))
        throw new Error(`card ${i + 1} (cards.${k}) must state ${what} = "${wanted}" — the figure its picture shows; it says: ${text}`);
  });

  // Every other figure a card, a note or the alt text states must be one this kit computed, at the
  // precision it is written with. A year (1900–2100) and a figure glued to letters (CO2, 10e) pass.
  const decimal = /,/.test(beat.format(1.5)) ? "," : ".";
  const group = decimal === "," ? "[ .]" : "[ ,]";
  const known = [
    reading.count, DRAWN, others.length, stackCount, othersSum, stackSum, reading.ratio,
    reading.topShare, reading.subjectShare, reading.othersShare, beat.whole,
    ...top.map((r) => r.value),
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
        throw new Error(`${where} states ${raw}, which no figure of this ranking rounds to: every number in a card is computed — use the reading (r.othersSum, r.stackSum, r.subject.value, r.ratio, r.topShare, …) through format(), never a typed or recomputed value. It says: ${text}`);
    }
  };
  CARDS.slice(0, 5).forEach((k, i) => checkFigures(`card ${i + 1} (cards.${k})`, prose[i].join(" ")));
  CARDS.forEach((k, i) => checkFigures(`notes.${k}`, notes[NOTE_SLOTS[i]]));

  const titleForms = [beat.title].flat().map(plain);
  const title = titleForms[0];
  // The title may state the run ("more than the next 5 together") or the tail's sum — figures the
  // gesture computes and the plate writes, so they count as drawn beside the values.
  assertHeadlineNumbersDrawn(title, [...top.map((r) => r.value), othersSum, stackSum, stackCount], "rows");

  const eyebrow = plain(beat.eyebrow);
  const source = plain(beat.source);
  const unit = plain(beat.unit);
  const restName = plain(beat.restName(reading));
  const stackName = plain(beat.stackName(reading));
  const alt = plain(typeof beat.alt === "function" ? beat.alt(reading) : beat.alt);
  checkFigures("alt", alt);
  const topRows = top.map((r, i) => ({ key: `r${i + 1}`, name: plain(r.name), value: r.value, label: format(r.value) }));
  const words = { unit, ...notes };

  const textPerRegister = {
    display: titleForms.join(" "),
    eyebrow,
    body: `${prose.flat().join(" ")} ${source}`,
    axis: unit,
    annot: `${topRows.map((r) => r.name).join(" ")} ${restName} ${stackName}`,
    value: `${topRows.map((r) => r.label).join(" ")} ${format(othersSum)} ${format(stackSum)} ${Object.values(notes).join(" ")}`,
  };

  const driver = readFileSync(join(HERE, "bar-drive.mjs"), "utf8");
  const lang = beat.lang ?? storyLanguage(HERE) ?? "en";
  await renderBeatScrolly({
    here: HERE,
    states: STATES,
    textPerRegister,
    evidenceLevels: beat.evidenceLevels ?? 2,
    async render({ label, direction, outDir }) {
      const { ink, muted } = deriveFurniture(direction.ground);
      const regs = webRegisters(direction, { ink: { ink, muted, accent: direction.accent } });
      const { outPath } = await renderScrolly({
        steps: prose.map((p, i) => ({ id: CARDS[i], prose: p })),
        reveal: {
          element: createElement(DirectedBarScrolly, {
            top: topRows,
            tail: others.map((r) => r.value),
            stackCount,
            restName,
            restLabel: format(othersSum),
            stackName,
            stackLabel: format(stackSum),
            words,
            alt,
            regs,
            ground: direction.ground,
            accent: direction.accent,
            ink,
            muted,
          }),
          states: STATES,
          driver,
          apply: "applyBarState",
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
