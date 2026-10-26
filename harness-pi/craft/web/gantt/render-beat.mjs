// The generic half of a gantt WEB beat, taken from proof/web-gantt-top-ten-tenure/render-directions-web.mjs
// with everything about ITS subject removed. The interaction is the worked example's and is not the
// model's to change: one row per entity, one bar per run of whole years, and the ORIGIN is what the
// reader operates. A control ("align the bars on") moves where every bar starts — the calendar (the
// default: position = date), each row's own entry (every row from the same edge, the axis counting
// years since entry), or the held years alone (gaps closed, so a bar is exactly its tenure). One year
// is the same length in every state; the rows never move; the axis words change in place. Every row
// answers hover/tap/Tab. CSS only, works without JS. This file computes the runs' geometry, the
// tenures, gaps, ranks and ties; ./beat.mjs — the one file the model writes — gives the runs and
// WORDS every reading. Copied into the beat by the harness; never edited by the model.
//
// Usage:  bun <beat>/render-beat.mjs
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { beatFacts, applicableTreatments } from "#shared/chart-beat/treatments.mjs";
import { webRegisters } from "#shared/design-base/web.mjs";
import { DirectedGanttWeb } from "./DirectedGanttWeb.tsx";
import { applyStoryboard, assertHeadlineNumbersDrawn } from "./guards.mjs";
import { chartWeb, plain, refusing, renderBeatWeb, storyLanguage } from "./web.mjs";

/** Geometry units per CSS px at the narrowest verified width — the proof's measurement (780 / 211). */
const UNITS_PER_CSS_PX = 780 / 211;

const HERE = dirname(fileURLToPath(import.meta.url));
await refusing(HERE, async () => {
  const { default: beat } = await import("./beat.mjs");
  applyStoryboard(beat, HERE);
  const { renderWeb } = await import(chartWeb(HERE, "scripts", "render-web.mjs"));
  const { deriveFurniture, measureText } = await import(chartWeb(HERE, "scripts", "render-still.mjs"));
  const { labelBoxPx } = await import(chartWeb(HERE, "assets", "keyed-note.ts"));

  const REQUIRED = ["eyebrow", "rows", "subjects", "first", "last", "tenureLabel", "detail", "alignLabel", "calendar", "entry", "held", "note", "subjectsNote", "title", "limits", "reading", "source", "alt", "check"];
  const missing = REQUIRED.filter((key) => beat[key] === undefined);
  if (missing.length) throw new Error(`beat.mjs is missing ${missing.join(", ")}: give each as a field of the default export (export default { …, ${missing[0]}: … }), not as a separate export (see CONTRACT.md)`);
  for (const fn of ["tenureLabel", "detail", "check"])
    if (typeof beat[fn] !== "function") throw new Error(`beat.mjs: ${fn} must be a function (see CONTRACT.md)`);

  // ── the axis and the rows (the static kit's refusals) ─────────────────────────────────────────
  const first = beat.first;
  const last = beat.last;
  if (!Number.isInteger(first) || !Number.isInteger(last) || last <= first) throw new Error(`first (${first}) and last (${last}) must be whole years, last after first`);
  if (!Array.isArray(beat.rows) || beat.rows.length < 2 || beat.rows.length > 30) throw new Error(`rows holds ${beat.rows?.length ?? 0}: a gantt draws 2 to 30 rows`);
  const keys = new Set(beat.rows.map((r) => String(r.key)));
  if (keys.size !== beat.rows.length) throw new Error(`rows holds the same key twice: one row per entity`);
  const subjects = [beat.subjects].flat().map(String);
  if (!subjects.length) throw new Error(`subjects is empty: name the key(s) of the rows the takeaway is about`);
  for (const s of subjects) if (!keys.has(s)) throw new Error(`subjects names ${JSON.stringify(s)}, which is not a row's key`);
  for (const r of beat.rows) {
    if (!Array.isArray(r.runs) || !r.runs.length) throw new Error(`row ${r.key} has no runs: every row is { key, label, runs: [{ from, to }] }`);
    r.runs.forEach((run, i) => {
      if (!Number.isInteger(run.from) || !Number.isInteger(run.to)) throw new Error(`row ${r.key}: run ${i + 1} is ${JSON.stringify(run)}; from and to are whole years`);
      if (run.to < run.from) throw new Error(`row ${r.key}: run ${i + 1} ends (${run.to}) before it starts (${run.from})`);
      if (run.from < first || run.to > last) throw new Error(`row ${r.key}: run ${run.from}–${run.to} falls outside ${first}–${last}`);
      if (i > 0 && run.from <= r.runs[i - 1].to + 1) throw new Error(`row ${r.key}: runs ${i} and ${i + 1} touch or overlap (${r.runs[i - 1].to}, ${run.from}); merge them into one run, or keep a gap of at least one year`);
    });
  }

  beat.check();

  // ── each row's reading ────────────────────────────────────────────────────────────────────────
  const EXTENT = last - first + 1; // one unit of length is one YEAR, in every state of the page
  const rowsIn = beat.rows.map((r, index) => {
    const runs = r.runs.map((run, i) => ({ key: `r${index}x${i}`, from: run.from, to: run.to, open: run.open ?? run.to === last }));
    const years = runs.reduce((s, run) => s + run.to + 1 - run.from, 0);
    const entry = runs[0].from;
    const exit = runs.at(-1).to;
    const gaps = [];
    for (let i = 1; i < runs.length; i += 1) gaps.push(`${runs[i - 1].to + 1}${runs[i].from - 1 > runs[i - 1].to + 1 ? `–${runs[i].from - 1}` : ""}`);
    return { ...r, key: String(r.key), label: plain(r.label ?? r.key), index, code: `row${"abcdefghijklmnopqrstuvwxyz"[index % 26]}${index >= 26 ? "z" : ""}`, runs, years, entry, exit, window: exit + 1 - entry, gaps, isSubject: subjects.includes(String(r.key)) };
  });
  const readings = rowsIn.map((r) => ({
    ...r,
    count: EXTENT,
    rank: 1 + rowsIn.filter((o) => o.years > r.years).length,
    ties: rowsIn.filter((o) => o !== r && o.years === r.years).map((o) => o.label),
    entryOffset: r.entry - first,
    open: r.runs.at(-1).open,
    whole: r.years === EXTENT,
  }));
  const summary = {
    rows: readings,
    count: readings.length,
    extent: EXTENT,
    first,
    last,
    subjects: readings.filter((r) => r.isSubject),
    interrupted: readings.filter((r) => r.runs.length > 1),
  };
  assertHeadlineNumbersDrawn([beat.title].flat()[0], [readings.length, summary.subjects.length, summary.interrupted.length, ...readings.flatMap((r) => [r.years, r.window])], "rows");

  const noteRow = readings.find((r) => r.key === String(beat.note?.row));
  if (!noteRow) throw new Error(`note.row ${JSON.stringify(beat.note?.row)} is not a row's key: the one note on the plate sits on one row (e.g. the shortest tenure)`);

  // ── the alignment: three origins, one scale ───────────────────────────────────────────────────
  const bars = rowsIn.flatMap((r) => r.runs.map((s) => ({ key: s.key, row: r.code, length: s.to + 1 - s.from })));
  const placeCalendar = rowsIn.flatMap((r) => r.runs.map((s) => ({ key: s.key, at: s.from - first })));
  const placeEntry = rowsIn.flatMap((r) => r.runs.map((s) => ({ key: s.key, at: s.from - r.entry })));
  const placeHeld = rowsIn.flatMap((r) => {
    let cursor = 0;
    return r.runs.map((s) => {
      const place = { key: s.key, at: cursor };
      cursor += s.to + 1 - s.from;
      return place;
    });
  });
  const step = beat.tickEvery ?? [1, 2, 5, 10, 20, 25, 50, 100].find((s) => EXTENT / s <= 8) ?? 100;
  const years = Array.from({ length: EXTENT }, (_, i) => first + i);
  const TICK_AT = years.filter((y) => y % step === 0).map((y) => y - first);
  if (TICK_AT.length < 2) throw new Error(`tickEvery ${step} leaves fewer than two graduations on ${first}–${last}: choose a smaller step`);
  const words = (o, name) => {
    if (!o || typeof o !== "object") throw new Error(`${name} is missing: give { label, announce, note } (see CONTRACT.md)`);
    const v = (x) => plain(typeof x === "function" ? x(summary) : x);
    const out = { label: v(o.label), announce: v(o.announce), note: v(o.note) };
    if (!out.label.trim() || !out.note.trim()) throw new Error(`${name}.label and ${name}.note must be words`);
    if (!out.announce.includes(out.label)) throw new Error(`${name}.announce must contain ${name}.label ("${out.label}") word for word — a screen reader hears it for that pill; it says: ${out.announce}`);
    return out;
  };
  const cal = words(beat.calendar, "calendar");
  const ent = words(beat.entry, "entry");
  const hel = words(beat.held, "held");
  const align = {
    label: plain(beat.alignLabel),
    noneLabel: cal.label,
    noneAnnounce: cal.announce,
    noneNote: cal.note,
    noneTicks: TICK_AT.map((t) => `${first + t}`),
    extent: EXTENT,
    tickAt: TICK_AT,
    bars,
    base: placeCalendar,
    options: [
      { key: "entry", ...ent, ticks: TICK_AT.map((t) => `${t}`), places: placeEntry },
      { key: "held", ...hel, ticks: TICK_AT.map((t) => `${t}`), places: placeHeld },
    ],
  };

  const shaped = readings.map((r) => ({
    code: r.code,
    name: r.label,
    spans: r.runs,
    years: r.years,
    tenureLabel: plain(beat.tenureLabel(r)),
    detail: plain(beat.detail(r)),
    whole: r.isSubject,
  }));
  const same = shaped.find((r, i) => shaped.findIndex((x) => x.detail === r.detail) !== i);
  if (same) throw new Error(`detail() answers two rows with the same sentence (${JSON.stringify(same.detail)}): start it with the row's label`);

  const title = plain([beat.title].flat()[0]);
  const caveat = plain([beat.limits].flat()[0]);
  const source = plain(beat.source);
  const reading = plain([beat.reading].flat()[0]);
  const eyebrow = plain(beat.eyebrow);
  const subjectsNote = plain(beat.subjectsNote);
  const rowNote = plain(beat.note.text);
  const alt = plain(typeof beat.alt === "function" ? beat.alt(summary) : beat.alt);

  const facts = beatFacts(readings.map((r) => ({ key: r.code, label: r.label, value: r.years })), { subject: summary.subjects[0].label, declaredSequence: eyebrow });
  applicableTreatments(facts);

  const controlText = [align.label, align.noneLabel, align.noneAnnounce, align.noneNote, ...align.noneTicks, ...align.options.flatMap((o) => [o.label, o.announce, o.note, ...o.ticks])].join(" ");
  const textPerRegister = {
    display: title,
    eyebrow,
    body: `${caveat} ${reading} ${source} ${controlText} ${shaped.map((r) => r.detail).join(" ")}`,
    axis: `${align.noneTicks.join(" ")} ${align.options[0].ticks.join(" ")} ${shaped.map((r) => r.name).join(" ")}`,
    annot: `${subjectsNote} ${rowNote}`,
    value: shaped.map((r) => r.tenureLabel).join(" "),
  };

  const lang = beat.lang ?? storyLanguage(HERE) ?? "en";
  await renderBeatWeb({
    here: HERE,
    textPerRegister,
    evidenceLevels: beat.evidenceLevels ?? 2,
    async render({ label, direction, outDir }) {
      // The gutter holds every row name (axis register, the subjects in bold): the widest, plus the
      // shared .axis-label right offset (10 px) and 10 px of slack; never under the proof's 116.
      const furniture = deriveFurniture(direction.ground);
      const regs = webRegisters(direction, { ink: { ink: furniture.ink, muted: furniture.muted, accent: direction.accent } });
      const widest = Math.max(...shaped.map((r) => labelBoxPx(r.name, { ...regs.axis, fontWeight: r.whole ? 700 : regs.axis.fontWeight }, measureText, { chip: false }).w));
      const gutterPx = Math.max(116, Math.ceil(widest + 20));
      const { outPath } = await renderWeb({
        lang,
        component: DirectedGanttWeb,
        props: {
          rows: shaped,
          align,
          unitsPerCssPx: UNITS_PER_CSS_PX,
          kuwaitNote: rowNote,
          noteRow: noteRow.code,
          title, eyebrow, caveat, source, reading, wholeNote: subjectsNote, alt,
          direction,
          fitPointerStep: true,
          ground: direction.ground,
          accent: direction.accent,
          gutterPx,
          nameValueSeparator: /^fr\b/.test(lang) ? " : " : ": ",
        },
        outDir,
        name: `${label}.html`,
      });
      return { outPath };
    },
  });
});
