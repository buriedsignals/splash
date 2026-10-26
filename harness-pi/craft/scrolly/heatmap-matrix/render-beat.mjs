// The generic half of a heatmap SCROLLY beat, taken from
// proof/scrolly-heatmap-coal-share-europe/render-directions-scrolly.mjs with everything about ITS
// subject removed. The choreography is the worked example's and is not the model's to change — six
// cards, one continuous interpolation driven by the reader's scroll (coal-heatmap-drive.mjs, verbatim):
//
//   1 start    the first year alone, the rows from the highest first-year value down;
//   2 years    the years filled one column at a time to `countYear`, the rows under the first break counted;
//   3 crisis   `crisisYear`: its column outlined, the rows that jumped (or went back over the first break) marked;
//   4 end      the last year: the rows under the first break and the rows at or above `half` kept, the rest stepping back;
//   5 sort     the rows sorted by relative fall (1 − last ÷ first), the fall written in the value column;
//   6 reading  the first year's values beside the last's; the card states the accounting (the limits).
//
// This file computes every figure the cards may state (the order, the counts, the jumps, the falls)
// and checks the words against them; ./beat.mjs — the one file the model writes — gives the grid and
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
import { DirectedCoalHeatmapScrolly } from "./DirectedCoalHeatmapScrolly.tsx";
import { applyStoryboard, assertNumbers, assertLegibleLabels, assertHeadlineNumbersDrawn, assertDrawsClaimColumn } from "./guards.mjs";
import { plain, refusing, storyLanguage } from "./web.mjs";
import { renderBeatScrolly, scrollySkill } from "./scrolly.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));

/** The cards, in the drive's order: the runner's own ids (never the model's words in an id). */
const CARDS = ["start", "years", "crisis", "end", "sort", "reading"];
/** The component's header-note slots, one per card, in the same order. */
const NOTE_SLOTS = ["startNote", "countNote", "crisisNote", "endNote", "sortNote", "readNote"];

await refusing(HERE, async () => {
  const { default: beat } = await import("./beat.mjs");
  applyStoryboard(beat, HERE);
  const { renderScrolly } = await import(scrollySkill(HERE, "scripts", "render-scrolly.mjs"));

  const REQUIRED = ["eyebrow", "years", "rows", "breaks", "breakLabel", "format", "fallLabel", "countYear", "crisisYear", "jump", "unit", "legend", "fallHead", "cards", "notes", "title", "limits", "source", "alt", "check"];
  const missing = REQUIRED.filter((key) => beat[key] === undefined);
  if (missing.length) throw new Error(`beat.mjs is missing ${missing.join(", ")} (see CONTRACT.md)`);
  for (const fn of ["breakLabel", "format", "fallLabel", "check"])
    if (typeof beat[fn] !== "function") throw new Error(`beat.mjs: ${fn} must be a function (see CONTRACT.md)`);
  if (beat.cellFormat !== undefined && typeof beat.cellFormat !== "function") throw new Error(`beat.mjs: cellFormat must be a function (see CONTRACT.md)`);
  for (const group of ["cards", "notes"]) {
    const keys = group === "cards" ? CARDS.slice(0, 5) : CARDS;
    const absent = keys.filter((k) => typeof beat[group]?.[k] !== "function");
    if (absent.length) throw new Error(`beat.mjs: ${group} must give a function for each of ${keys.join(", ")}; missing or not a function: ${absent.join(", ")} (see CONTRACT.md)`);
  }

  // ── the grid ────────────────────────────────────────────────────────────────────────────────────
  const years = beat.years;
  if (!Array.isArray(years) || years.length < 4 || years.some((y, i) => !Number.isInteger(y) || (i > 0 && y !== years[i - 1] + 1)))
    throw new Error(`years must be at least four consecutive whole years, in order (the scroll fills one column a year); got ${JSON.stringify(years)?.slice(0, 120)}`);
  const first = years[0];
  const last = years.at(-1);
  if (!Array.isArray(beat.rows) || beat.rows.length < 2 || beat.rows.length > 20) throw new Error(`rows holds ${beat.rows?.length ?? 0} row(s): this heatmap lays out 2 to 20`);
  for (const r of beat.rows) {
    if (!r || typeof r.label !== "string" || !Array.isArray(r.cells)) throw new Error(`every row is { label, cells: [one number per year] }; got ${JSON.stringify(r).slice(0, 100)}`);
    if (r.cells.length !== years.length) throw new Error(`row ${r.label} has ${r.cells.length} cells for ${years.length} years: give one cell per year, in the years' order`);
  }
  assertNumbers(beat.rows.flatMap((r) => r.cells.map((v, i) => [`${r.label} ${years[i]}`, v])), "cells");
  if (new Set(beat.rows.map((r) => r.label)).size !== beat.rows.length) throw new Error(`two rows share a label; give every row its own`);
  const breaks = beat.breaks;
  if (!Array.isArray(breaks) || breaks.length < 2 || breaks.length > 7 || breaks.some((b, i) => !Number.isFinite(b) || (i > 0 && b <= breaks[i - 1])))
    throw new Error(`breaks are the class edges, 2 to 7 numbers strictly rising (e.g. [10, 25, 50, 75]); got ${JSON.stringify(breaks)}`);
  const all = beat.rows.flatMap((r) => r.cells);
  const lo = Math.min(...all);
  const hi = Math.max(...all);
  if (hi < breaks[0] || lo >= breaks.at(-1)) throw new Error(`every cell falls in one class (cells run ${lo} to ${hi}, breaks ${breaks.join(", ")}): put the breaks inside the cells' range`);
  const half = beat.half ?? 50;
  if (!(Number.isFinite(half) && half > 0)) throw new Error(`half is ${beat.half}: the last-year value card 4 keeps rows at or above, a positive number`);
  const { countYear, crisisYear, jump } = beat;
  if (!(Number.isInteger(countYear) && Number.isInteger(crisisYear) && first < countYear && countYear < crisisYear && crisisYear <= last))
    throw new Error(`countYear (${countYear}) and crisisYear (${crisisYear}) must be whole years with ${first} < countYear < crisisYear <= ${last}: card 2 fills the grid to countYear, card 3 to crisisYear, card 4 to ${last}`);
  if (!(Number.isFinite(jump) && jump > 0)) throw new Error(`jump is ${jump}: the rise from the year before crisisYear that card 3 marks, a positive number in the cells' unit`);
  const zero = beat.rows.filter((r) => !(r.cells[0] > 0));
  if (zero.length) throw new Error(`${zero.map((r) => r.label).join(", ")} start at ${zero[0].cells[0]} in ${first}: card 5 sorts the rows by their fall relative to ${first}, which needs a first-year value above zero`);

  // ── the readings ────────────────────────────────────────────────────────────────────────────────
  const at = (cells) => (y) => cells[y - first];
  const readings = beat.rows.map((r, index) => {
    const v = at(r.cells);
    const fall = 1 - v(last) / v(first);
    return Object.freeze({
      label: plain(r.label),
      index,
      cells: [...r.cells],
      at: v,
      first: v(first),
      last: v(last),
      fall,
      fallPercent: fall * 100,
      rise: v(crisisYear) - v(crisisYear - 1),
    });
  });
  const byStart = [...readings].sort((a, b) => b.first - a.first);
  const byFall = [...readings].sort((a, b) => b.fall - a.fall);
  const low = breaks[0];
  const jumped = readings.filter((g) => g.rise > jump).sort((a, b) => b.rise - a.rise);
  const backOver = readings.filter((g) => g.at(crisisYear - 1) < low && g.at(crisisYear) >= low);
  const marked = [...new Set([...jumped, ...backOver])];
  const reading = Object.freeze({
    years: [...years],
    first,
    last,
    count: readings.length,
    rows: readings,
    byStart,
    byFall,
    leader: byStart[0],
    steepest: byFall[0],
    countYear,
    countUnder: readings.filter((g) => g.at(countYear) < low),
    crisis: Object.freeze({ year: crisisYear, jumped, backOver, marked }),
    underEnd: readings.filter((g) => g.last < low),
    highEnd: readings.filter((g) => g.last >= half),
    fallen: readings.filter((g) => g.last < g.first),
    notFallen: readings.filter((g) => !(g.last < g.first)),
    breaks: [...breaks],
    jump,
    half,
  });

  const cellFormat = (v) => plain((beat.cellFormat ?? beat.format)(v));
  assertLegibleLabels(readings.map((g) => g.last), cellFormat);
  beat.check(reading);
  assertDrawsClaimColumn(all, HERE);

  // ── what this choreography cannot draw honestly ─────────────────────────────────────────────────
  if (!marked.length) throw new Error(`no row rose more than ${jump} from ${crisisYear - 1} to ${crisisYear}, and none went back over ${low}: card 3 outlines ${crisisYear} and marks those rows, so it would mark nothing. Choose the crisisYear the data shows, or a smaller jump`);
  if (!reading.underEnd.length && !reading.highEnd.length) throw new Error(`in ${last} no row is under ${low} and none is at or above ${half}: card 4 keeps those rows and steps back the rest, so every row would step back. Set half (or breaks[0]) to the threshold the takeaway is about`);

  // ── the words, each passed through plain(); every number they state is checked ───────────────────
  const say = (field, value) => {
    const text = typeof value === "function" ? value(reading) : value;
    const parts = [text].flat();
    if (!parts.length || parts.some((p) => typeof p !== "string" || !p.trim())) throw new Error(`${field} must return a non-empty sentence (or an array of paragraphs); it returned ${JSON.stringify(text)}`);
    return parts.map(plain);
  };
  const format = (v) => plain(beat.format(v));
  const prose = [...CARDS.slice(0, 5).map((k) => say(`cards.${k}`, beat.cards[k])), say("limits", [beat.limits].flat()[0])];
  const cardText = prose.map((p) => p.join(" "));
  const notes = Object.fromEntries(CARDS.map((k, i) => [NOTE_SLOTS[i], say(`notes.${k}`, beat.notes[k]).join(" ")]));
  const countTemplate = notes.countNote;
  if (!countTemplate.includes("{year}") || !countTemplate.includes("{n}"))
    throw new Error(`notes.years must contain {year} and {n} — the header note follows the fill, and the render writes the year it stands on and how many rows are under ${low} then; it says: ${countTemplate}`);
  notes.countNote = countTemplate.replace("{year}", String(countYear)).replace("{n}", String(reading.countUnder.length));

  // What each card is ABOUT, so it must say it.
  const escape = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const has = (text, wanted) => new RegExp(`(?<![\\d.,])${escape(wanted)}(?![\\d])`).test(text);
  const named = (text, rs) => rs.filter((g) => !text.toLocaleLowerCase().includes(g.label.toLocaleLowerCase()));
  const owe = (i, ok, what) => {
    if (!ok) throw new Error(`card ${i + 1} (cards.${CARDS[i]}) must state ${what}; it says: ${cardText[i]}`);
  };
  owe(0, !named(cardText[0], [reading.leader]).length && has(cardText[0], format(reading.leader.first)), `the first row, ${reading.leader.label}, and its ${first} value "${format(reading.leader.first)}" — the darkest cell its picture shows`);
  owe(1, has(cardText[1], String(countYear)), `countYear, ${countYear} — the year the fill stops on`);
  const missCount = named(cardText[1], reading.countUnder);
  owe(1, !missCount.length, `the name of every row under ${low} in ${countYear} (r.countUnder; missing: ${missCount.map((g) => g.label).join(", ")})`);
  owe(2, has(cardText[2], String(crisisYear)), `crisisYear, ${crisisYear} — the column it outlines`);
  const missMarked = named(cardText[2], marked);
  owe(2, !missMarked.length, `the name of every row it marks (r.crisis.marked; missing: ${missMarked.map((g) => g.label).join(", ")})`);
  owe(3, has(cardText[3], String(last)), `the last year, ${last}`);
  for (const g of reading.highEnd)
    owe(3, !named(cardText[3], [g]).length && has(cardText[3], format(g.last)), `${g.label} and its ${last} value "${format(g.last)}" — a row it keeps at or above ${half}`);
  const steepFall = String(Math.round(Math.abs(reading.steepest.fallPercent)));
  owe(4, !named(cardText[4], [reading.steepest]).length && has(cardText[4], steepFall), `the first row after the sort, ${reading.steepest.label}, and its fall "${steepFall}" (r.steepest.fallPercent, rounded)`);

  // Every other figure a card, a note or the alt states must be one this kit computed, at the
  // precision it is written with. A year (1900–2100) and a figure glued to letters pass.
  // The decimal mark the words use: read off format(1.5), or — when format prints whole numbers — the language.
  const sample = plain(beat.format(1.5));
  const decimal = /\d,\d/.test(sample) ? "," : /\d\.\d/.test(sample) ? "." : /,/.test(new Intl.NumberFormat(beat.lang ?? storyLanguage(HERE) ?? "en").format(1.5)) ? "," : ".";
  const group = decimal === "," ? "[ .]" : "[ ,]";
  const known = [
    reading.count, reading.countUnder.length, jumped.length, backOver.length, marked.length, reading.underEnd.length,
    reading.highEnd.length, reading.fallen.length, reading.notFallen.length, ...breaks, jump, half,
    ...readings.flatMap((g) => [g.first, g.last, g.at(countYear), g.at(crisisYear), g.at(crisisYear - 1), g.rise, g.fallPercent]),
  ].map(Math.abs);
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
        throw new Error(`${where} states ${raw}, which no figure of this grid rounds to: every number in a card is computed — use the reading (r.leader.first, r.countUnder.length, r.crisis.jumped, r.highEnd, r.steepest.fallPercent, …) through format(), never a typed or recomputed value. It says: ${text}`);
    }
  };
  CARDS.slice(0, 5).forEach((k, i) => checkFigures(`card ${i + 1} (cards.${k})`, cardText[i]));
  CARDS.forEach((k, i) => checkFigures(`notes.${k}`, notes[NOTE_SLOTS[i]]));

  const titleForms = [beat.title].flat().map(plain);
  // The title may count the rows a card keeps ("the twelve", "six under 10 %").
  assertHeadlineNumbersDrawn(titleForms[0], [...readings.flatMap((g) => [g.first, g.last]), reading.count, reading.underEnd.length, reading.highEnd.length], "cells");

  const eyebrow = plain(beat.eyebrow);
  const source = plain(beat.source);
  const alt = plain(typeof beat.alt === "function" ? beat.alt(reading) : beat.alt);
  checkFigures("alt", alt);

  // The component's rows, in their first-year order: the runner's own keys.
  const keyOf = (g) => `r${g.index}`;
  const shaped = byStart.map((g) => {
    const fallText = plain(beat.fallLabel(g));
    if (!has(fallText, String(Math.round(Math.abs(g.fallPercent))))) throw new Error(`fallLabel for ${g.label} must print its fall, ${Math.round(Math.abs(g.fallPercent))} (row.fallPercent rounded); it says: ${fallText}`);
    return { key: keyOf(g), label: g.label, values: g.cells, valueTexts: g.cells.map(cellFormat), fallText };
  });
  const labelledYears = beat.labelledYears ?? [first, ...years.filter((y) => y % 5 === 0 && y - first >= 3 && last - y >= 3), last];
  const words = { unit: plain(beat.unit), legend: plain(beat.legend), fallHead: plain(beat.fallHead), countTemplate, ...notes };
  const breakItems = breaks.map((b) => ({ value: b, label: plain(beat.breakLabel(b)) }));

  const textPerRegister = {
    display: titleForms.join(" "),
    eyebrow,
    body: `${prose.flat().join(" ")} ${source}`,
    axis: `${words.unit} ${words.legend} ${words.fallHead} ${years.join(" ")} ${shaped.map((r) => r.label).join(" ")} ${breakItems.map((b) => b.label).join(" ")}`,
    annot: shaped.map((r) => r.label).join(" "),
    value: `${shaped.map((r) => `${r.valueTexts.join(" ")} ${r.fallText}`).join(" ")} ${Object.values(notes).join(" ")} 0123456789`,
  };

  /** One state per card; see coal-heatmap-drive.mjs for what each field paints. The worked example's, with its years generic. */
  const STATES = [
    { reach: first, crisis: 0, focus: 0, sort: 0, both: 0, note: 0 },
    { reach: countYear, crisis: 0, focus: 0, sort: 0, both: 0, note: 1 },
    { reach: crisisYear, crisis: 1, focus: 0, sort: 0, both: 0, note: 2 },
    { reach: last, crisis: 0, focus: 1, sort: 0, both: 0, note: 3 },
    { reach: last, crisis: 0, focus: 0, sort: 1, both: 0, note: 4 },
    { reach: last, crisis: 0, focus: 0, sort: 0, both: 1, note: 5 },
  ];

  const driver = readFileSync(join(HERE, "coal-heatmap-drive.mjs"), "utf8");
  const lang = beat.lang ?? storyLanguage(HERE) ?? "en";
  await renderBeatScrolly({
    here: HERE,
    states: STATES,
    textPerRegister,
    evidenceLevels: beat.evidenceLevels ?? breaks.length + 1,
    async render({ label, direction, outDir }) {
      const { ink, muted } = deriveFurniture(direction.ground);
      const regs = webRegisters(direction, { ink: { ink, muted, accent: direction.accent } });
      const { outPath } = await renderScrolly({
        steps: prose.map((p, i) => ({ id: CARDS[i], prose: p })),
        reveal: {
          element: createElement(DirectedCoalHeatmapScrolly, {
            rows: shaped,
            years,
            labelledYears,
            breaks: breakItems,
            orders: { start: byStart.map(keyOf), fall: byFall.map(keyOf) },
            crisis: { year: crisisYear, marked: marked.map(keyOf) },
            words,
            alt,
            regs,
            ground: direction.ground,
            accent: direction.accent,
            ink,
            muted,
            half,
          }),
          states: STATES,
          driver,
          apply: "applyCoalHeatmapState",
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
