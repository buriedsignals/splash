// The generic half of a gantt SCROLLY beat, taken from
// proof/scrolly-gantt-top-ten-tenure/render-directions-scrolly.mjs with everything about ITS subject
// removed. The choreography is the worked example's and is not the model's to change — six cards,
// one continuous interpolation driven by the reader's scroll (gantt-drive.mjs, verbatim):
//
//   1 start       the playhead at the first year, the rows present then begun, the others faint;
//   2 early       the playhead sweeps to `midway`, spans growing behind it, a row's name waking as it enters;
//   3 late        on to the last year;
//   4 subjects    the subject rows kept in the accent, the others stepping back;
//   5 gaps        the interrupted rows and the single-year rows kept, each hole outlined;
//   6 reading     both years of every run written in its label; the card states the accounting (the limits).
//
// This file computes every figure the cards may state (the runs, the gaps, the entries and exits on
// each side of `midway`, the counts) and checks the words against them; ./beat.mjs — the one file the
// model writes — gives the runs and the WORDS of each card. Copied into the beat by the harness;
// never edited by the model.
//
// Usage:  bun <beat>/render-beat.mjs
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createElement } from "react";
import { deriveFurniture } from "#shared/chart-beat/render-still.mjs";
import { webRegisters } from "#shared/design-base/web.mjs";
import { EYEBROW_TO_DISPLAY, gapOf, registerOf } from "#shared/design-base/register.mjs";
import { DirectedGanttScrolly } from "./DirectedGanttScrolly.tsx";
import { applyStoryboard, assertHeadlineNumbersDrawn } from "./guards.mjs";
import { plain, refusing, storyLanguage } from "./web.mjs";
import { renderBeatScrolly, scrollySkill } from "./scrolly.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));

/** The cards, in the drive's order: the runner's own ids (never the model's words in an id). */
const CARDS = ["start", "early", "late", "subjects", "gaps", "reading"];

await refusing(HERE, async () => {
  const { default: beat } = await import("./beat.mjs");
  applyStoryboard(beat, HERE);
  const { renderScrolly } = await import(scrollySkill(HERE, "scripts", "render-scrolly.mjs"));

  const REQUIRED = ["eyebrow", "rows", "subjects", "first", "last", "spanLabel", "unit", "cards", "notes", "title", "limits", "source", "alt", "check"];
  const missing = REQUIRED.filter((key) => beat[key] === undefined);
  if (missing.length) throw new Error(`beat.mjs is missing ${missing.join(", ")} (see CONTRACT.md)`);
  for (const fn of ["spanLabel", "check"])
    if (typeof beat[fn] !== "function") throw new Error(`beat.mjs: ${fn} must be a function (see CONTRACT.md)`);
  const NOTE_KEYS = ["year", "subjects", "gaps"];
  for (const [group, keys] of [["cards", CARDS.slice(0, 5)], ["notes", NOTE_KEYS]]) {
    const absent = keys.filter((k) => typeof beat[group]?.[k] !== "function");
    if (absent.length) throw new Error(`beat.mjs: ${group} must give a function for each of ${keys.join(", ")}; missing or not a function: ${absent.join(", ")} (see CONTRACT.md)`);
  }

  // ── the axis and the rows (the static kit's refusals) ─────────────────────────────────────────
  const { first, last } = beat;
  if (!Number.isInteger(first) || !Number.isInteger(last) || last <= first) throw new Error(`first and last are the axis's whole years (integers, last > first); got ${first} and ${last}`);
  if (!Array.isArray(beat.rows) || beat.rows.length < 2 || beat.rows.length > 30) throw new Error(`rows holds ${beat.rows?.length ?? 0} row(s): a gantt lays out 2 to 30`);
  const keys = new Set(beat.rows.map((r) => String(r.key)));
  if (keys.size !== beat.rows.length) throw new Error(`two rows share a key; give every row its own key`);
  const subjectKeys = [beat.subjects].flat().map(String);
  const stray = subjectKeys.filter((k) => !keys.has(k));
  if (!subjectKeys.length || stray.length) throw new Error(`subjects must name rows by key (${stray.join(", ") || "none given"}); the keys are ${[...keys].join(", ")}`);
  for (const r of beat.rows) {
    if (!Array.isArray(r.runs) || !r.runs.length) throw new Error(`every row is { key, label, runs: [{ from, to }] } with at least one run; got ${JSON.stringify(r).slice(0, 120)}`);
    let prevTo = -Infinity;
    for (const run of r.runs) {
      if (!Number.isInteger(run.from) || !Number.isInteger(run.to)) throw new Error(`row ${r.key}: a run's from and to are whole years; got ${run.from}–${run.to}`);
      if (run.to < run.from) throw new Error(`row ${r.key}: a run ends (${run.to}) before it starts (${run.from})`);
      if (run.from < first || run.to > last) throw new Error(`row ${r.key}: the run ${run.from}–${run.to} falls outside the axis ${first}–${last}; widen first/last or clip the run and say so`);
      if (run.from <= prevTo + 1) throw new Error(`row ${r.key}: runs must be in order with a gap between them (${prevTo} then ${run.from}); merge touching runs into one`);
      if (run.open && run.to !== last) throw new Error(`row ${r.key}: only a run that reaches ${last} can be open`);
      prevTo = run.to;
    }
  }
  const midway = beat.midway ?? Math.round((first + last) / 2);
  if (!Number.isInteger(midway) || midway <= first || midway >= last) throw new Error(`midway is ${beat.midway}: the year card 2's sweep stops on, a whole year strictly between ${first} and ${last}`);

  // ── each row's reading ────────────────────────────────────────────────────────────────────────
  const EXTENT = last - first + 1;
  const rows = beat.rows.map((r, index) => {
    const runs = r.runs.map((run) => ({ from: run.from, to: run.to, open: run.open ?? run.to === last }));
    const gaps = runs.slice(1).map((run, i) => ({ from: runs[i].to + 1, to: run.from - 1 }));
    const years = runs.reduce((s, run) => s + run.to + 1 - run.from, 0);
    return {
      key: String(r.key),
      label: plain(r.label ?? r.key),
      index,
      runs,
      gaps,
      years,
      entry: runs[0].from,
      exit: runs.at(-1).to,
      open: runs.at(-1).open,
      whole: years === EXTENT,
      single: runs.length === 1 && runs[0].from === runs[0].to,
      isSubject: subjectKeys.includes(String(r.key)),
    };
  });
  for (const row of rows) {
    const text = plain(beat.spanLabel(Object.freeze({ ...row })));
    if (!text.trim()) throw new Error(`spanLabel(row) returned nothing for ${row.key}: give the row's years ("1990–2016", "2006–")`);
    const bounds = new Set(row.runs.flatMap((run) => [run.from, run.to]));
    for (const m of text.matchAll(/(?<!\d)(\d{4})(?!\d)/g))
      if (!bounds.has(Number(m[1]))) throw new Error(`spanLabel for ${row.key} says ${m[1]}, which is not a year one of its runs starts or ends on (${row.runs.map((x) => `${x.from}–${x.to}`).join(", ")}): print the runs' own years`);
    row.dates = text;
  }
  const present = [];
  for (let y = first; y <= last; y += 1) present.push(rows.filter((r) => r.runs.some((run) => run.from <= y && y <= run.to)).length);

  // The events the sweep cards name: a run starting after the first year is an ENTRY in its first
  // year; a run ending before the last year is an EXIT after its last year. Card 2 sweeps to the end
  // of `midway`, card 3 from there to the end.
  const events = rows.flatMap((r) =>
    r.runs.flatMap((run) => [
      ...(run.from > first ? [{ key: r.key, label: r.label, kind: "entry", year: run.from }] : []),
      ...(run.to < last ? [{ key: r.key, label: r.label, kind: "exit", year: run.to }] : []),
    ]),
  ).sort((a, b) => a.year - b.year);
  const early = events.filter((e) => e.year <= midway);
  const late = events.filter((e) => e.year > midway);

  const freeze = (r) => Object.freeze({ ...r, runs: r.runs.map((x) => ({ ...x })), gaps: r.gaps.map((x) => ({ ...x })) });
  const readings = rows.map(freeze);
  const reading = Object.freeze({
    first,
    last,
    midway,
    extent: EXTENT,
    count: rows.length,
    atFirst: present[0],
    atLast: present.at(-1),
    slots: Math.max(...present),
    rows: readings,
    subjects: readings.filter((r) => r.isSubject),
    whole: readings.filter((r) => r.whole),
    interrupted: readings.filter((r) => r.gaps.length > 0),
    singles: readings.filter((r) => r.single),
    early,
    late,
  });

  beat.check(reading);

  // ── what this choreography cannot draw honestly ─────────────────────────────────────────────────
  if (!early.length) throw new Error(`no row enters or leaves between ${first} and ${midway}: card 2's sweep has nothing to tell. Move midway later`);
  if (!late.length) throw new Error(`no row enters or leaves between ${midway + 1} and ${last}: card 3's sweep has nothing to tell. Move midway earlier`);
  if (!reading.interrupted.length && !reading.singles.length) throw new Error(`no row has a hole and none holds a single year: card 5 (the interrupted rows, each hole outlined) has nothing to keep. This choreography needs at least one`);
  if (reading.subjects.length === rows.length) throw new Error(`every row is a subject: card 4 keeps the subjects in the accent while the others step back, so name only the rows the takeaway is about`);

  // ── the words, each passed through plain(); every number they state is checked ───────────────────
  const say = (field, value) => {
    const text = typeof value === "function" ? value(reading) : value;
    const parts = [text].flat();
    if (!parts.length || parts.some((p) => typeof p !== "string" || !p.trim())) throw new Error(`${field} must return a non-empty sentence (or an array of paragraphs); it returned ${JSON.stringify(text)}`);
    return parts.map(plain);
  };
  const prose = [...CARDS.slice(0, 5).map((k) => say(`cards.${k}`, beat.cards[k])), say("limits", [beat.limits].flat()[0])];
  const notes = Object.fromEntries(NOTE_KEYS.map((k) => [k, say(`notes.${k}`, beat.notes[k]).join(" ")]));
  if (!notes.year.includes("{y}")) throw new Error(`notes.year must contain {y} — the header note follows the playhead, and {y} is replaced by the year it stands on; it says: ${notes.year}`);

  const lower = (s) => s.toLocaleLowerCase();
  const names = (text, rs) => rs.filter((r) => !lower(text).includes(lower(r.label)));
  // What each card is ABOUT, so it must say it.
  const owe = (i, ok, what) => {
    if (!ok) throw new Error(`card ${i + 1} (cards.${CARDS[i]}) must state ${what}; it says: ${prose[i].join(" ")}`);
  };
  const cardText = prose.map((p) => p.join(" "));
  owe(0, cardText[0].includes(String(first)), `the first year, ${first} — the playhead stands on it`);
  owe(1, cardText[1].includes(String(midway)), `midway, ${midway} — the year the sweep stops on`);
  const missingSubjects = names(cardText[3], reading.subjects);
  owe(3, !missingSubjects.length, `the name of every subject row it keeps in the accent (missing: ${missingSubjects.map((r) => r.label).join(", ")})`);
  const kept5 = [...reading.interrupted, ...reading.singles];
  const missingKept = names(cardText[4], kept5);
  owe(4, !missingKept.length, `the name of every row it keeps — the interrupted ones and the single years (missing: ${missingKept.map((r) => r.label).join(", ")})`);

  // A year a card states beside a row's name must be one of THAT row's events in the card's span: an
  // entry, an exit, a gap's bounds, a single year. Read clause by clause (. ; : ! ?).
  const yearsOf = (text) => [...text.matchAll(/(?<![\p{L}\d.,])(\d{4})(?![\p{L}\d])/gu)].map((m) => Number(m[1])).filter((y) => y >= 1900 && y <= 2100);
  const checkYears = (where, text, frame, own) => {
    for (const clause of text.split(/[.;:!?](?!\d)/)) {
      const ys = yearsOf(clause);
      if (!ys.length) continue;
      const named = rows.filter((r) => lower(clause).includes(lower(r.label)));
      for (const y of ys) {
        if (frame.includes(y)) continue;
        if (!named.some((r) => own(r).includes(y)))
          throw new Error(`${where} states ${y} ${named.length ? `beside ${named.map((r) => r.label).join(", ")}` : "beside no row's name"}, and ${named.length ? "none of them" : "no row"} has that year among ${where.startsWith("card 5") ? "its gaps or single years" : "the entries and exits this card's sweep crosses"}: every year is read off the runs — use r.early, r.late, r.interrupted, r.singles. It says: ${clause.trim()}`);
      }
    }
  };
  const eventYears = (list) => (r) => list.filter((e) => e.key === r.key).map((e) => e.year);
  const holeYears = (r) => [...r.gaps.flatMap((g) => [g.from, g.to]), ...(r.single ? [r.entry] : [])];
  checkYears("card 1 (cards.start)", cardText[0], [first], () => []);
  checkYears("card 2 (cards.early)", cardText[1], [first, midway], eventYears(early));
  checkYears("card 3 (cards.late)", cardText[2], [midway, last], eventYears(late));
  checkYears("card 4 (cards.subjects)", cardText[3], [first, last], () => []);
  checkYears("card 5 (cards.gaps)", cardText[4], [first, last], holeYears);
  owe(1, yearsOf(cardText[1]).some((y) => early.some((e) => e.year === y)), `at least one entry or exit the sweep crosses, with its year (r.early)`);
  owe(2, yearsOf(cardText[2]).some((y) => late.some((e) => e.year === y)), `at least one entry or exit the sweep crosses, with its year (r.late)`);

  // Every other figure must be a count this kit computed. A year passes here (checked above).
  const known = [
    reading.count, reading.extent, reading.atFirst, reading.atLast, reading.slots, reading.subjects.length, reading.whole.length,
    reading.interrupted.length, reading.singles.length, early.length, late.length, reading.count - reading.subjects.length,
  ];
  const figure = /(?<![\p{L}\d.,])(\d+(?:[.,]\d+)?)(?![\p{L}\d])/gu;
  const checkFigures = (where, text) => {
    for (const m of plain(text).matchAll(figure)) {
      const n = Number(m[1].replace(",", "."));
      if (Number.isInteger(n) && n >= 1900 && n <= 2100) continue;
      if (!known.some((v) => Math.abs(v - n) < 1e-9))
        throw new Error(`${where} states ${m[1]}, which is not a count of these rows: every number is computed — use r.count, r.subjects.length, r.interrupted.length, r.singles.length, r.slots, r.extent, …, never a typed value. It says: ${text}`);
    }
  };
  CARDS.slice(0, 5).forEach((k, i) => checkFigures(`card ${i + 1} (cards.${k})`, cardText[i]));
  NOTE_KEYS.forEach((k) => checkFigures(`notes.${k}`, notes[k].replace("{y}", "")));
  checkYears("notes.subjects", notes.subjects, [first, last], () => []);
  checkYears("notes.gaps", notes.gaps, [first, last], () => []);

  const titleForms = [beat.title].flat().map(plain);
  // The title states counts the plate shows: the subjects, the rows, the slots per year.
  assertHeadlineNumbersDrawn(titleForms[0], [reading.count, reading.subjects.length, reading.slots, reading.interrupted.length, reading.singles.length], "rows");

  const eyebrow = plain(beat.eyebrow);
  const source = plain(beat.source);
  const unit = plain(beat.unit);
  const alt = plain(typeof beat.alt === "function" ? beat.alt(reading) : beat.alt);
  checkFigures("alt", alt);
  checkYears("alt", alt, [first, midway, last], (r) => [...eventYears(events)(r), ...holeYears(r)]);
  const words = { unit, yearNote: notes.year, sixNote: notes.subjects, gapNote: notes.gaps };

  const step = beat.tickEvery ?? [1, 2, 5, 10, 20, 25, 50, 100].find((s) => EXTENT / s <= 8) ?? 100;
  if (!(Number.isInteger(step) && step >= 1)) throw new Error(`tickEvery is ${beat.tickEvery}: a whole number of years`);
  const ticks = [];
  for (let y = first; y <= last; y += step) ticks.push(y);
  if (!ticks.includes(last)) ticks.push(last);

  // The component's rows: the runner's own keys (a CSS selector), the subjects as `throughout` (the
  // rows the drive keeps in the accent on card 4).
  const shaped = rows.map((r) => ({ key: `row${r.index}`, label: r.label, dates: r.dates, runs: r.runs, gaps: r.gaps, throughout: r.isSubject }));

  const textPerRegister = {
    display: titleForms.join(" "),
    eyebrow,
    body: `${prose.flat().join(" ")} ${source}`,
    axis: `${unit} ${shaped.map((r) => `${r.label} ${r.dates}`).join(" ")} ${ticks.join(" ")}`,
    annot: "",
    value: `${notes.year} ${notes.subjects} ${notes.gaps} 0123456789`,
  };

  /** One state per card; see gantt-drive.mjs for what each field paints. The worked example's, with its years generic. */
  const STATES = [
    { head: first + 1, six: 0, gaps: 0, dates: 0 },
    { head: midway + 1, six: 0, gaps: 0, dates: 0 },
    { head: last + 1, six: 0, gaps: 0, dates: 0 },
    { head: last + 1, six: 1, gaps: 0, dates: 0 },
    { head: last + 1, six: 0, gaps: 1, dates: 0 },
    { head: last + 1, six: 0, gaps: 0, dates: 1 },
  ];

  const driver = readFileSync(join(HERE, "gantt-drive.mjs"), "utf8");
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
          element: createElement(DirectedGanttScrolly, { rows: shaped, first, last, ticks, words, alt, regs, ground: direction.ground, accent: direction.accent, ink, muted }),
          states: STATES,
          driver,
          apply: "applyGanttState",
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
