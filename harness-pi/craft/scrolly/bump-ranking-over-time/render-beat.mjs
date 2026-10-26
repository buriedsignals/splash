// The generic half of a bump (ranking over time) SCROLLY beat, taken from
// proof/scrolly-bump-emitter-rank/render-directions-scrolly.mjs with everything about ITS subject
// removed. The choreography is the worked example's and is not the model's to change — six cards, one
// continuous interpolation driven by the reader's scroll (bump-drive.mjs, verbatim):
//
//   1 start    the first year's top ranks alone, the subject's place among them;
//   2 first    the playhead advances to the first stop, the subject's passes ringed as it reaches them;
//   3 second   on to the second stop, the next passes ringed;
//   4 hold     on to the last year, every other line stepping back;
//   5 exit     the members the subject passed that have since left the top drawn in ink, where they left written;
//   6 reading  the static plate; the card states the accounting (the limits).
//
// A line's height is its RANK (1 at the top); a line that leaves the top stops where it left; only the
// subject's passes are ringed. This file computes every figure the cards may state (each year's ranking,
// the passes, who left) and checks the words against them; ./beat.mjs — the one file the model writes —
// gives the rows, the subject, the two stops and the WORDS of each card. Copied into the beat by the
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
import { DirectedBumpScrolly } from "./DirectedBumpScrolly.tsx";
import { applyStoryboard, assertNumbers, assertHeadlineNumbersDrawn, assertDrawsClaimColumn } from "./guards.mjs";
import { plain, refusing, storyLanguage } from "./web.mjs";
import { renderBeatScrolly, scrollySkill } from "./scrolly.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));

/** The cards, in the drive's order: the runner's own ids (never the model's words in an id). */
const CARDS = ["start", "first", "second", "hold", "exit", "reading"];
/** The component's header-note slots, one per card, in the same order. */
const NOTE_SLOTS = ["startNote", "firstNote", "secondNote", "holdNote", "exitNote", "readNote"];

/** The smallest 1, 2 or 5 × 10^k at or above `raw`. */
const niceStep = (raw) => {
  const p = 10 ** Math.floor(Math.log10(raw));
  return [1, 2, 5, 10].map((m) => m * p).find((s) => s >= raw - 1e-12);
};

await refusing(HERE, async () => {
  const { default: beat } = await import("./beat.mjs");
  applyStoryboard(beat, HERE);
  const { renderScrolly } = await import(scrollySkill(HERE, "scripts", "render-scrolly.mjs"));

  const REQUIRED = ["eyebrow", "rows", "subject", "stops", "unit", "cards", "notes", "labels", "title", "limits", "source", "alt", "check"];
  const missing = REQUIRED.filter((key) => beat[key] === undefined);
  if (missing.length) throw new Error(`beat.mjs is missing ${missing.join(", ")}: give each as a field of the default export (export default { …, ${missing[0]}: … }), not as a separate export (see CONTRACT.md)`);
  if (typeof beat.check !== "function") throw new Error(`beat.mjs: check must be a function (see CONTRACT.md)`);
  if (beat.display !== undefined && typeof beat.display !== "function") throw new Error(`beat.mjs: display must be a function of a name (see CONTRACT.md)`);
  for (const [group, keys] of [["cards", CARDS.slice(0, 5)], ["notes", CARDS], ["labels", ["crossing", "exit"]]]) {
    const absent = keys.filter((k) => typeof beat[group]?.[k] !== "function");
    if (absent.length) throw new Error(`beat.mjs: ${group} must give a function for each of ${keys.join(", ")}; missing or not a function: ${absent.join(", ")} (see CONTRACT.md)`);
  }

  // ── the rows: one value per member per year; each year ranked, the highest first ─────────────────
  if (!Array.isArray(beat.rows)) throw new Error(`rows must be an array of { name, year, value }, one per member per year`);
  assertNumbers(beat.rows.map((r) => [`${r.name} ${r.year}`, r.value]));
  const rows = beat.rows.map((r) => ({ name: String(r.name), year: Number(r.year), value: Number(r.value) }));
  const seen = new Set();
  for (const r of rows) {
    const k = `${r.name}|${r.year}`;
    if (seen.has(k)) throw new Error(`rows holds two values for ${r.name} in ${r.year}: give each member ONE value per year (filter data.json to one series)`);
    seen.add(k);
  }
  const SLOTS = beat.maxRank ?? 10;
  if (!(Number.isInteger(SLOTS) && SLOTS >= 5 && SLOTS <= 12)) throw new Error(`maxRank is ${beat.maxRank}: draw between 5 and 12 ranks`);
  const years = [...new Set(rows.map((r) => r.year))].sort((a, b) => a - b);
  for (let i = 1; i < years.length; i++)
    if (years[i] !== years[i - 1] + 1) throw new Error(`rows jump from ${years[i - 1]} to ${years[i]}: the playhead advances year by year and a line breaks on a missing year — give every year`);
  if (years.length < 8) throw new Error(`rows span ${years.length} years; this choreography needs at least 8`);
  const FIRST = years[0];
  const LAST = years[years.length - 1];
  const valueOf = new Map(rows.map((r) => [`${r.name}|${r.year}`, r.value]));
  const top = new Map(
    years.map((y) => {
      const ranked = rows.filter((r) => r.year === y).sort((a, b) => b.value - a.value);
      if (ranked.length < SLOTS) throw new Error(`${y} ranks only ${ranked.length} members, fewer than maxRank ${SLOTS}: give every member (not only the top), or lower maxRank`);
      return [y, ranked.slice(0, SLOTS).map((r) => r.name)];
    }),
  );
  const rankOf = (name, year) => top.get(year).indexOf(name) + 1;
  const SUBJECT = String(beat.subject);
  const outYear = years.find((y) => !top.get(y).includes(SUBJECT));
  if (outYear !== undefined)
    throw new Error(`the subject ${JSON.stringify(SUBJECT)} is not in the top ${SLOTS} in ${outYear}: its line must run unbroken from ${FIRST} to ${LAST}. Check subject is a name of rows, or raise maxRank`);
  const [stopA, stopB] = Array.isArray(beat.stops) ? beat.stops.map(Number) : [];
  if (!(FIRST < stopA && stopA < stopB && stopB < LAST))
    throw new Error(`stops is ${JSON.stringify(beat.stops)}: give the two years cards 2 and 3 carry the playhead to, [a, b] with ${FIRST} < a < b < ${LAST}`);

  // The passes, from the values: a member above the subject in the top one year, below it the next.
  const passes = [];
  for (let i = 1; i < years.length; i++) {
    const [y0, y1] = [years[i - 1], years[i]];
    for (const other of top.get(y0).slice(0, rankOf(SUBJECT, y0) - 1)) {
      const v = valueOf.get(`${other}|${y1}`);
      if (v !== undefined && v < valueOf.get(`${SUBJECT}|${y1}`)) passes.push({ name: other, year: y1, from: rankOf(SUBJECT, y0), to: rankOf(SUBJECT, y1) });
    }
  }
  if (!passes.length) throw new Error(`${SUBJECT} passes no member above it between ${FIRST} and ${LAST}: this choreography rings the subject's passes as the playhead reaches them`);
  const everIn = [...new Set(years.flatMap((y) => top.get(y)))];
  const lastYearIn = (name) => Math.max(...years.filter((y) => top.get(y).includes(name)));
  const departedNames = [...new Set(passes.filter((p) => lastYearIn(p.name) < LAST).map((p) => p.name))];
  if (!departedNames.length)
    throw new Error(`no member ${SUBJECT} passed has since left the top ${SLOTS}: card 5 draws those members in ink where they left. This choreography cannot draw this ranking`);

  const display = (name) => plain(beat.display ? beat.display(name) : name);
  const from = rankOf(SUBJECT, FIRST);
  const to = rankOf(SUBJECT, LAST);
  let heldFrom = LAST;
  while (heldFrom - 1 >= FIRST && rankOf(SUBJECT, heldFrom - 1) === to) heldFrom -= 1;
  const leaderFirst = top.get(FIRST)[0];
  const leaderLast = top.get(LAST)[0];
  const leaderYear = leaderFirst === leaderLast ? null : years.find((y) => top.get(y)[0] === leaderLast);
  const pass = (p) => Object.freeze({ ...p, label: display(p.name) });
  const reading = Object.freeze({
    first: FIRST,
    last: LAST,
    stops: Object.freeze([stopA, stopB]),
    maxRank: SLOTS,
    members: everIn.length,
    subject: Object.freeze({ name: SUBJECT, label: display(SUBJECT), from, to, atStopA: rankOf(SUBJECT, stopA), atStopB: rankOf(SUBJECT, stopB) }),
    heldFrom,
    passes: Object.freeze(passes.map(pass)),
    passesFirst: Object.freeze(passes.filter((p) => p.year <= stopA).map(pass)),
    passesSecond: Object.freeze(passes.filter((p) => p.year > stopA && p.year <= stopB).map(pass)),
    passesLater: Object.freeze(passes.filter((p) => p.year > stopB).map(pass)),
    departed: Object.freeze(departedNames.map((n) => Object.freeze({ name: n, label: display(n), lastYear: lastYearIn(n), maxRank: SLOTS }))),
    leaderFirst: Object.freeze({ name: leaderFirst, label: display(leaderFirst) }),
    leaderLast: Object.freeze({ name: leaderLast, label: display(leaderLast), since: leaderYear }),
    rankOf,
  });
  beat.check(reading);
  assertDrawsClaimColumn(rows.filter((r) => top.get(r.year).includes(r.name)).map((r) => r.value), HERE);

  // ── the words, each passed through plain(); every number they state is checked ───────────────────
  const say = (field, value, arg = reading) => {
    const text = typeof value === "function" ? value(arg) : value;
    const parts = [text].flat();
    if (!parts.length || parts.some((p) => typeof p !== "string" || !p.trim())) throw new Error(`${field} must return a non-empty sentence (or an array of paragraphs); it returned ${JSON.stringify(text)}`);
    return parts.map(plain);
  };
  const prose = [...CARDS.slice(0, 5).map((k) => say(`cards.${k}`, beat.cards[k])), say("limits", [beat.limits].flat()[0])];
  const notes = Object.fromEntries(CARDS.map((k, i) => [NOTE_SLOTS[i], say(`notes.${k}`, beat.notes[k]).join(" ")]));

  const owns = (text, wanted) => new RegExp(`(?<![\\d.,])${wanted.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?![\\d])`).test(text);
  const named = (list) => list.flatMap((p) => [[`${p.name}'s name`, p.label], [`${p.name}'s year`, String(p.year ?? p.lastYear)]]);
  // What each card is ABOUT, so it must say it: what its gesture puts on screen.
  const OWES = {
    start: [["subject.from", String(from)]],
    first: named(reading.passesFirst),
    second: [...named(reading.passesSecond), ["subject.atStopB", String(reading.subject.atStopB)]],
    hold: [["subject.to", String(to)]],
    exit: named(reading.departed),
  };
  CARDS.slice(0, 5).forEach((k, i) => {
    const text = prose[i].join(" ");
    for (const [what, wanted] of OWES[k])
      if (!(/^\d/.test(wanted) ? owns(text, wanted) : text.includes(wanted)))
        throw new Error(`card ${i + 1} (cards.${k}) must state ${what} = "${wanted}" — what its picture shows; it says: ${text}`);
  });

  const crossings = passes.map((p) => {
    const text = say("labels.crossing", beat.labels.crossing, pass(p)).join(" ");
    if (!owns(text, String(p.year))) throw new Error(`labels.crossing must state the pass's year (${p.year}); for ${p.name} it says: ${text}`);
    return { year: p.year, from: p.from, to: p.to, text };
  });
  const keyOf = new Map(everIn.map((n, i) => [n, `t${i + 1}`]));
  const tracks = everIn.map((n) => {
    const left = departedNames.includes(n);
    const exitText = left ? say("labels.exit", beat.labels.exit, reading.departed.find((d) => d.name === n)).join(" ") : "";
    if (left && !owns(exitText, String(lastYearIn(n)))) throw new Error(`labels.exit must state the last year ${n} held a place (${lastYearIn(n)}); it says: ${exitText}`);
    return { key: keyOf.get(n), label: display(n), points: years.filter((y) => top.get(y).includes(n)).map((y) => [y, rankOf(n, y)]), subject: n === SUBJECT, left, exitText };
  });

  // Every other figure a card, a note, a label or the alt states must be one this kit computed. A year
  // (1900–2100, or any year of the ranking), a rank glued to letters ("8th", "3e") and a figure glued
  // to letters (CO2) pass.
  const known = [
    SLOTS, everIn.length, passes.length, reading.passesFirst.length, reading.passesSecond.length, reading.passesLater.length, departedNames.length,
    ...Array.from({ length: SLOTS }, (_, i) => i + 1),
  ];
  const figure = /(?<![\p{L}\d.,])(\d+(?:[.,]\d+)?)(?![\p{L}\d])/gu;
  const checkFigures = (where, text) => {
    for (const m of plain(text).matchAll(figure)) {
      const n = Number(m[1].replace(",", "."));
      if (Number.isInteger(n) && ((n >= 1900 && n <= 2100) || (n >= FIRST && n <= LAST))) continue;
      if (!known.includes(n))
        throw new Error(`${where} states ${m[1]}, which is no rank or count of this ranking: every number is computed — use the reading (r.subject.from, r.subject.to, r.passes.length, r.departed.length, r.maxRank, …), never a typed value. It says: ${text}`);
    }
  };
  CARDS.slice(0, 5).forEach((k, i) => checkFigures(`card ${i + 1} (cards.${k})`, prose[i].join(" ")));
  CARDS.forEach((k, i) => checkFigures(`notes.${k}`, notes[NOTE_SLOTS[i]]));
  crossings.forEach((c) => checkFigures("labels.crossing", c.text));
  tracks.filter((t) => t.left).forEach((t) => checkFigures("labels.exit", t.exitText));

  const titleForms = [beat.title].flat().map(plain);
  const title = titleForms[0];
  // A bump title states ranks ("from 8th to 3rd"); they count as drawn beside the counts the plate carries.
  assertHeadlineNumbersDrawn(title, [from, to, passes.length, SLOTS], "ranks");

  const eyebrow = plain(beat.eyebrow);
  const source = plain(beat.source);
  const unit = plain(beat.unit);
  const alt = plain(typeof beat.alt === "function" ? beat.alt(reading) : beat.alt);
  checkFigures("alt", alt);
  const words = { unit, ...notes };

  // The years under the plot: the first, round steps, the last (the proof's 1990, 2000, 2010, 2024).
  const xStep = niceStep((LAST - FIRST) / 4);
  const xTicks = [FIRST];
  for (let t = Math.ceil((FIRST + 1) / xStep) * xStep; t <= LAST - xStep / 2; t += xStep) if (t - FIRST >= xStep / 2) xTicks.push(t);
  xTicks.push(LAST);

  /** One state per card; see bump-drive.mjs for what each field paints. The worked example's, verbatim. */
  const STATES = [
    { year: FIRST, rings: 1, retreat: 0, exit: 0, note: 0 },
    { year: stopA, rings: 1, retreat: 0, exit: 0, note: 1 },
    { year: stopB, rings: 1, retreat: 0, exit: 0, note: 2 },
    { year: LAST, rings: 1, retreat: 1, exit: 0, note: 3 },
    { year: LAST, rings: 0, retreat: 1, exit: 1, note: 4 },
    { year: LAST, rings: 1, retreat: 0, exit: 0, note: 5 },
  ];

  const textPerRegister = {
    display: titleForms.join(" "),
    eyebrow,
    body: `${prose.flat().join(" ")} ${source}`,
    axis: `${unit} ${xTicks.join(" ")} ${Array.from({ length: SLOTS }, (_, i) => i + 1).join(" ")} ${tracks.map((t) => t.exitText).join(" ")} ${crossings.map((x) => x.text).join(" ")}`,
    annot: tracks.map((t) => t.label).join(" "),
    value: Object.values(notes).join(" "),
  };

  const driver = readFileSync(join(HERE, "bump-drive.mjs"), "utf8");
  const lang = beat.lang ?? storyLanguage(HERE) ?? "en";
  await renderBeatScrolly({
    here: HERE,
    states: STATES,
    textPerRegister,
    evidenceLevels: beat.evidenceLevels ?? 3,
    async render({ label, direction, outDir }) {
      const { ink, muted, grid } = deriveFurniture(direction.ground);
      const regs = webRegisters(direction, { ink: { ink, muted, accent: direction.accent } });
      const { outPath } = await renderScrolly({
        steps: prose.map((p, i) => ({ id: CARDS[i], prose: p })),
        reveal: {
          element: createElement(DirectedBumpScrolly, { tracks, crossings, years, slots: SLOTS, xTicks, words, alt, regs, stroke: direction.stroke ?? {}, ground: direction.ground, accent: direction.accent, ink, muted, grid }),
          states: STATES,
          driver,
          apply: "applyBumpState",
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
