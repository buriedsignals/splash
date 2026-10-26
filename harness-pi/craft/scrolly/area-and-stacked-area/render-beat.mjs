// The generic half of an area SCROLLY beat, taken from
// proof/scrolly-world-population/render-directions-scrolly.mjs with everything about ITS subject
// removed. The choreography is the worked example's and is not the model's to change — six cards,
// one continuous interpolation driven by the reader's scroll (population-drive.mjs, verbatim):
//
//   1 first    the playhead fills the area to the year the series first reaches one whole unit;
//   2 second   on to the year it reaches two;
//   3 all      on to the last year, every whole unit marked (a level, a dot, its name) as it is reached;
//   4 gaps     the area gives way to one bar per unit: the years each unit took;
//   5 rate     the area's outline morphs from the level into its annual growth rate, the peak marked;
//   6 reading  the static plate; the card states the accounting (the limits).
//
// The drive's scales are fixed: the level on 0 to 9 units (ticks 0–8), the growth rate on 0 to 2.5 %
// a year. This file computes every figure the cards may state (each unit's crossing year and the
// years it took, the growth rate's peak and last value) and checks the words against them;
// ./beat.mjs — the one file the model writes — gives the series and the WORDS of each card. Copied
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
import { DirectedPopulationScrolly } from "./DirectedPopulationScrolly.tsx";
import { applyStoryboard, assertNumbers, assertOnePerX, assertHeadlineNumbersDrawn, assertDrawsClaimColumn } from "./guards.mjs";
import { plain, refusing, storyLanguage } from "./web.mjs";
import { renderBeatScrolly, scrollySkill } from "./scrolly.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));

/** The cards, in the drive's order: the runner's own ids (never the model's words in an id). */
const CARDS = ["first", "second", "all", "gaps", "rate", "reading"];
/** The component's header-note slots, one per card, in the same order. */
const NOTE_SLOTS = ["firstNote", "secondNote", "allNote", "gapNote", "rateNote", "readNote"];
/** The drive's fixed scales: the level's top (in the series' own unit) and the growth rate's (% a year). */
const LEVEL_TOP = 9;
const RATE_TOP = 2.5;

/** The smallest 1, 2 or 5 × 10^k at or above `raw`. */
const niceStep = (raw) => {
  const p = 10 ** Math.floor(Math.log10(raw));
  return [1, 2, 5, 10].map((m) => m * p).find((s) => s >= raw - 1e-12);
};

await refusing(HERE, async () => {
  const { default: beat } = await import("./beat.mjs");
  applyStoryboard(beat, HERE);
  const { renderScrolly } = await import(scrollySkill(HERE, "scripts", "render-scrolly.mjs"));

  const REQUIRED = ["eyebrow", "data", "unit", "gapUnit", "rateUnit", "format", "formatRate", "cards", "notes", "labels", "title", "limits", "source", "alt", "check"];
  const missing = REQUIRED.filter((key) => beat[key] === undefined);
  if (missing.length) throw new Error(`beat.mjs is missing ${missing.join(", ")}: give each as a field of the default export (export default { …, ${missing[0]}: … }), not as a separate export (see CONTRACT.md)`);
  for (const fn of ["format", "formatRate", "check"])
    if (typeof beat[fn] !== "function") throw new Error(`beat.mjs: ${fn} must be a function (see CONTRACT.md)`);
  const LABELS = ["crossing", "gapName", "gapText", "peak", "last", "rateLast"];
  for (const [group, keys] of [["cards", CARDS.slice(0, 5)], ["notes", CARDS], ["labels", LABELS]]) {
    const absent = keys.filter((k) => typeof beat[group]?.[k] !== "function");
    if (absent.length) throw new Error(`beat.mjs: ${group} must give a function for each of ${keys.join(", ")}; missing or not a function: ${absent.join(", ")} (see CONTRACT.md)`);
  }

  // ── the series: one level per year, every year present (the growth rate is year on year) ────────
  if (!Array.isArray(beat.data)) throw new Error(`data must be an array of { year, value }, one per year (use series() from series.mjs)`);
  assertNumbers(beat.data.map((d) => [d.year, d.value]));
  assertOnePerX(beat.data);
  const rows = [...beat.data].map((d) => ({ year: Number(d.year), value: Number(d.value) })).sort((a, b) => a.year - b.year);
  if (rows.length < 12) throw new Error(`data holds ${rows.length} years; this choreography needs at least 12`);
  for (let i = 1; i < rows.length; i++)
    if (!Number.isInteger(rows[i].year) || rows[i].year !== rows[i - 1].year + 1)
      throw new Error(`data jumps from ${rows[i - 1].year} to ${rows[i].year}: card 5 draws the growth rate year on year, so every year must be present — give every year, or start data after the gap (series(…, { from }))`);
  if (rows.some((r) => !(r.value > 0))) throw new Error(`data holds a value at or under zero: the area is a stock read from zero, and its growth rate needs every year above zero`);

  const first = rows[0];
  const last = rows[rows.length - 1];
  const top = Math.max(...rows.map((r) => r.value));
  if (!(top < LEVEL_TOP))
    throw new Error(`the series reaches ${top}: the drive's level scale runs from 0 to ${LEVEL_TOP} units, every whole unit a milestone. Express data in a unit where it stays under ${LEVEL_TOP} (e.g. divide by 1e9 for billions) and say that unit in unit`);
  if (!(first.value < 1))
    throw new Error(`the first year is already at ${first.value}: card 1 is the year the series FIRST reaches one whole unit, so it must start under 1. Start data earlier, or use a larger unit`);
  const levels = Math.floor(top);
  if (levels < 3)
    throw new Error(`the series reaches ${top}, so it crosses only ${levels} whole unit(s): cards 1 to 3 are the first, the second and every later one. Use a smaller unit so it crosses at least 3 (and stays under ${LEVEL_TOP})`);
  const crossings = [];
  for (let n = 1; n <= levels; n++) {
    const r = rows.find((d) => d.value >= n);
    crossings.push({ level: n, year: r.year, gap: crossings.length ? r.year - crossings[crossings.length - 1].year : null });
  }

  // The growth rate, % a year, on the drive's fixed 0–2.5 % scale (it clips under zero).
  const rate = rows.map((r, i) => (i ? (r.value / rows[i - 1].value - 1) * 100 : null));
  const fall = rate.findIndex((v) => v !== null && v < 0);
  if (fall >= 0)
    throw new Error(`the series falls in ${rows[fall].year} (${rate[fall].toFixed(2)} % on the year before): card 5's growth view reads from 0 % and would clip it. This choreography is for a stock that only grows`);
  let peakIndex = 1;
  for (let i = 2; i < rows.length; i++) if (rate[i] > rate[peakIndex]) peakIndex = i;
  if (!(rate[peakIndex] <= RATE_TOP))
    throw new Error(`the growth rate peaks at ${rate[peakIndex].toFixed(2)} % a year in ${rows[peakIndex].year}: card 5's scale runs from 0 to ${RATE_TOP} % a year. This choreography cannot draw a faster-growing series`);

  const withGap = crossings.filter((k) => k.gap !== null);
  const reading = Object.freeze({
    count: rows.length,
    first: { ...first },
    last: { ...last },
    levels,
    crossings: Object.freeze(crossings.map((k) => Object.freeze({ ...k }))),
    firstCrossing: { ...crossings[0] },
    second: { ...crossings[1] },
    third: { ...crossings[2] },
    latest: { ...crossings[levels - 1] },
    longestGap: { ...withGap.reduce((a, b) => (b.gap > a.gap ? b : a)) },
    shortestGap: { ...withGap.reduce((a, b) => (b.gap < a.gap ? b : a)) },
    peakRate: { year: rows[peakIndex].year, value: rate[peakIndex] },
    lastRate: { year: last.year, value: rate[rate.length - 1] },
  });

  beat.check(reading);
  assertDrawsClaimColumn(rows.map((r) => r.value), HERE);

  // ── the words, each passed through plain(); every number they state is checked ───────────────────
  const say = (field, value, arg = reading) => {
    const text = typeof value === "function" ? value(arg) : value;
    const parts = [text].flat();
    if (!parts.length || parts.some((p) => typeof p !== "string" || !p.trim())) throw new Error(`${field} must return a non-empty sentence (or an array of paragraphs); it returned ${JSON.stringify(text)}`);
    return parts.map(plain);
  };
  const format = (v) => plain(beat.format(v));
  const formatRate = (v) => plain(beat.formatRate(v));
  const prose = [...CARDS.slice(0, 5).map((k) => say(`cards.${k}`, beat.cards[k])), say("limits", [beat.limits].flat()[0])];
  const notes = Object.fromEntries(CARDS.map((k, i) => [NOTE_SLOTS[i], say(`notes.${k}`, beat.notes[k]).join(" ")]));

  const owns = (text, wanted) => new RegExp(`(?<![\\d.,])${wanted.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?![\\d])`).test(text);
  const { firstCrossing, second, latest, peakRate, lastRate } = reading;
  // What each card is ABOUT, so it must say it: the figure its gesture puts on screen.
  const OWES = {
    first: [["first.value", format(first.value)], ["firstCrossing.year", String(firstCrossing.year)]],
    second: [["second.year", String(second.year)], ["second.gap", String(second.gap)]],
    all: [["latest.year", String(latest.year)], ["last.value", format(last.value)]],
    gaps: [["second.gap", String(second.gap)], ["latest.gap", String(latest.gap)]],
    rate: [["peakRate.value", formatRate(peakRate.value)], ["lastRate.value", formatRate(lastRate.value)]],
  };
  CARDS.slice(0, 5).forEach((k, i) => {
    const text = prose[i].join(" ");
    for (const [what, wanted] of OWES[k])
      if (!owns(text, wanted)) throw new Error(`card ${i + 1} (cards.${k}) must state ${what} = "${wanted}" — the figure its picture shows; it says: ${text}`);
  });

  // The plot's labels: one per crossing (its name, and on card 4 its bar's name and years), the
  // growth rate's peak, the last year's level and rate.
  const crossingsOut = crossings.map((k) => {
    const label = say("labels.crossing", beat.labels.crossing, k).join(" ");
    if (!owns(label, String(k.year))) throw new Error(`labels.crossing must state the crossing's year (${k.year}); for unit ${k.level} it says: ${label}`);
    const gapText = k.gap === null ? "" : say("labels.gapText", beat.labels.gapText, k).join(" ");
    if (k.gap !== null && !owns(gapText, String(k.gap))) throw new Error(`labels.gapText must state the years that unit took (${k.gap}); for unit ${k.level} it says: ${gapText}`);
    const gapName = k.gap === null ? "" : say("labels.gapName", beat.labels.gapName, k).join(" ");
    return { billion: k.level, year: k.year, gap: k.gap, label, gapText, gapName };
  });
  const peakText = say("labels.peak", beat.labels.peak).join(" ");
  const lastLabel = say("labels.last", beat.labels.last).join(" ");
  const rateLast = say("labels.rateLast", beat.labels.rateLast).join(" ");
  for (const [field, text, wanted] of [["labels.peak", peakText, formatRate(peakRate.value)], ["labels.last", lastLabel, format(last.value)], ["labels.rateLast", rateLast, formatRate(lastRate.value)]])
    if (!owns(text, wanted)) throw new Error(`${field} must state "${wanted}" — the value it sits on; it says: ${text}`);

  // Every other figure a card, a note, a label or the alt states must be one this kit computed, at the
  // precision it is written with. A year (1900–2100, or any year of the series) and a figure glued to letters (CO2, 10e) pass.
  const decimal = /,/.test(beat.format(1.5)) ? "," : ".";
  const group = decimal === "," ? "[ .]" : "[ ,]";
  const known = [
    reading.count, levels, first.value, last.value, peakRate.value, lastRate.value,
    ...crossings.map((k) => k.level), ...withGap.map((k) => k.gap), 0, LEVEL_TOP,
  ];
  const dec = decimal === "." ? "\\." : ",";
  const figure = new RegExp(`(?<![\\p{L}\\d.,])(\\d{1,3}(?:${group}\\d{3})+(?:${dec}\\d+)?|\\d+(?:${dec}\\d+)?)(?![\\p{L}\\d])`, "gu");
  const checkFigures = (where, text) => {
    for (const m of plain(text).matchAll(figure)) {
      const raw = m[1];
      const [whole, frac = ""] = raw.split(decimal);
      const n = Number(`${whole.replace(/[ .,]/g, "")}.${frac || "0"}`);
      if (!frac && Number.isInteger(n) && ((n >= 1900 && n <= 2100) || (n >= first.year && n <= last.year))) continue;
      const tolerance = 0.5 * 10 ** -frac.length + 1e-9;
      if (!known.some((v) => Math.abs(v - n) <= tolerance))
        throw new Error(`${where} states ${raw}, which no figure of this series rounds to: every number in a card is computed — use the reading (r.second.gap, r.latest.year, r.peakRate.value, r.last.value, …) through format() / formatRate(), never a typed or recomputed value. It says: ${text}`);
    }
  };
  CARDS.slice(0, 5).forEach((k, i) => checkFigures(`card ${i + 1} (cards.${k})`, prose[i].join(" ")));
  CARDS.forEach((k, i) => checkFigures(`notes.${k}`, notes[NOTE_SLOTS[i]]));
  crossingsOut.forEach((k) => ["label", "gapText", "gapName"].forEach((f) => checkFigures(`labels.${f === "label" ? "crossing" : f}`, k[f])));
  [["labels.peak", peakText], ["labels.last", lastLabel], ["labels.rateLast", rateLast]].forEach(([w, t]) => checkFigures(w, t));

  const titleForms = [beat.title].flat().map(plain);
  const title = titleForms[0];
  // The title may state the whole unit last crossed ("passed 8 billion") — a level the plate marks.
  assertHeadlineNumbersDrawn(title, [...rows.map((r) => r.value), ...crossings.map((k) => k.level)], "series");

  const eyebrow = plain(beat.eyebrow);
  const source = plain(beat.source);
  const alt = plain(typeof beat.alt === "function" ? beat.alt(reading) : beat.alt);
  checkFigures("alt", alt);
  const words = { unit: plain(beat.unit), gapUnit: plain(beat.gapUnit), rateUnit: plain(beat.rateUnit), ...notes, lastLabel, rateLast };

  // The years under the plot: round steps from the first, the last year itself at the end (the proof's).
  const xStep = niceStep((last.year - first.year) / 5);
  const xTicks = [];
  for (let t = Math.ceil(first.year / xStep) * xStep; t <= last.year - xStep / 2; t += xStep) xTicks.push(t);
  xTicks.push(last.year);

  /** One state per card; see population-drive.mjs for what each field paints. The worked example's, verbatim. */
  const STATES = [
    { year: firstCrossing.year, gaps: 0, rate: 0, last: 0, note: 0 },
    { year: second.year, gaps: 0, rate: 0, last: 0, note: 1 },
    { year: last.year, gaps: 0, rate: 0, last: 1, note: 2 },
    { year: last.year, gaps: 1, rate: 0, last: 0, note: 3 },
    { year: last.year, gaps: 0, rate: 1, last: 0, note: 4 },
    { year: last.year, gaps: 0, rate: 0, last: 1, note: 5 },
  ];

  const textPerRegister = {
    display: titleForms.join(" "),
    eyebrow,
    body: `${prose.flat().join(" ")} ${source}`,
    axis: `${words.unit} ${words.gapUnit} ${words.rateUnit} ${xTicks.join(" ")} 0 1 2 3 4 5 6 7 8 0 % 1 % 2 %`,
    annot: `${crossingsOut.map((k) => `${k.label} ${k.gapName}`).join(" ")}`,
    value: `${crossingsOut.map((k) => k.gapText).join(" ")} ${Object.values(notes).join(" ")} ${lastLabel} ${rateLast} ${peakText}`,
  };

  const driver = readFileSync(join(HERE, "population-drive.mjs"), "utf8");
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
          element: createElement(DirectedPopulationScrolly, {
            years: rows.map((r) => r.year),
            population: rows.map((r) => r.value),
            rate,
            crossings: crossingsOut,
            peak: { year: peakRate.year, text: peakText },
            xTicks,
            words,
            alt,
            regs,
            ground: direction.ground,
            accent: direction.accent,
            ink,
            muted,
            grid,
          }),
          states: STATES,
          driver,
          apply: "applyPopulationState",
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
