// The generic half of a dumbbell SCROLLY beat, taken from
// proof/scrolly-dumbbell-life-expectancy-gains/render-directions-scrolly.mjs with everything about ITS
// subject removed. The choreography is the worked example's and is not the model's to change — six
// cards, one continuous interpolation driven by the reader's scroll (dumbbell-drive.mjs, verbatim):
//
//   1 start   every row's dot at `from`, the rows ordered by that value;
//   2 rise    each row's second dot travels year by year to `dipFrom`, a bar drawn behind it, the year
//             counting in the header;
//   3 dip     the dots move back to `dipTo`, the `dipFrom` value left as a dashed ring; the two largest
//             losses written;
//   4 gain    on to `to`: the dumbbells finished, every gain written in its column;
//   5 sort    the rows travel into gain order; the smallest gain kept, the rest stepping back;
//   6 reading the static plate; the card is the limits.
//
// This file computes every figure the cards may state (the starts, the dip, the gains, the orders) and
// checks the words against them; ./beat.mjs — the one file the model writes — gives the yearly series
// and the WORDS of each card. Copied into the beat by the harness; never edited by the model.
//
// Usage:  bun <beat>/render-beat.mjs
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createElement } from "react";
import { scaleLinear } from "d3-scale";
import { deriveFurniture } from "#shared/chart-beat/render-still.mjs";
import { webRegisters } from "#shared/design-base/web.mjs";
import { EYEBROW_TO_DISPLAY, gapOf, registerOf } from "#shared/design-base/register.mjs";
import { DirectedDumbbellScrolly } from "./DirectedDumbbellScrolly.tsx";
import { applyStoryboard, assertNumbers, assertHeadlineNumbersDrawn, assertDrawsClaimColumn } from "./guards.mjs";
import { plain, refusing, storyLanguage } from "./web.mjs";
import { renderBeatScrolly, scrollySkill } from "./scrolly.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));

/** The cards, in the drive's order: the runner's own ids (never the model's words in an id). */
const CARDS = ["start", "rise", "dip", "gain", "sort", "reading"];
/** The component's header-note slots, one per card, in the same order. */
const NOTE_SLOTS = ["startNote", "riseNote", "dipNote", "gainNote", "sortNote", "readNote"];

await refusing(HERE, async () => {
  const { default: beat } = await import("./beat.mjs");
  applyStoryboard(beat, HERE);
  const { renderScrolly } = await import(scrollySkill(HERE, "scripts", "render-scrolly.mjs"));

  const REQUIRED = ["eyebrow", "rows", "from", "dipFrom", "dipTo", "to", "unit", "yearFirst", "yearLabel", "format", "gainLabel", "lossLabel", "cards", "notes", "title", "limits", "source", "alt", "check"];
  const missing = REQUIRED.filter((key) => beat[key] === undefined);
  if (missing.length) throw new Error(`beat.mjs is missing ${missing.join(", ")}: give each as a field of the default export (export default { …, ${missing[0]}: … }), not as a separate export (see CONTRACT.md)`);
  for (const fn of ["yearLabel", "format", "gainLabel", "lossLabel", "check"])
    if (typeof beat[fn] !== "function") throw new Error(`beat.mjs: ${fn} must be a function (see CONTRACT.md)`);
  for (const group of ["cards", "notes"]) {
    const keys = group === "cards" ? CARDS.slice(0, 5) : CARDS;
    const absent = keys.filter((k) => typeof beat[group]?.[k] !== "function");
    if (absent.length) throw new Error(`beat.mjs: ${group} must give a function for each of ${keys.join(", ")}; missing or not a function: ${absent.join(", ")} (see CONTRACT.md)`);
  }
  // The drive writes every value on the stage with a decimal comma, one decimal (the worked example's
  // French); a story whose sentences use a decimal point would print 78,6 beside 78.6.
  if (!/,/.test(beat.format(1.5)))
    throw new Error(`format(1.5) prints ${JSON.stringify(beat.format(1.5))}: this kit's dots are labelled with a decimal comma (the worked example's drive), so the cards must be too — it cannot serve a language written with a decimal point`);

  // ── the years: from < dipFrom < dipTo < to, one value per row per year ───────────────────────────
  const [from, dipFrom, dipTo, to] = ["from", "dipFrom", "dipTo", "to"].map((k) => beat[k]);
  if (![from, dipFrom, dipTo, to].every(Number.isInteger) || !(from < dipFrom && dipFrom < dipTo && dipTo < to))
    throw new Error(`from, dipFrom, dipTo and to are ${from}, ${dipFrom}, ${dipTo}, ${to}: give four whole years in order — the start, the last year before the step back, the bottom of the step back, the end`);
  const years = [];
  for (let y = from; y <= to; y++) years.push(y);
  if (!Array.isArray(beat.rows)) throw new Error(`rows must be an array of { key, label, series }`);
  if (beat.rows.length < 3 || beat.rows.length > 16) throw new Error(`rows holds ${beat.rows.length}: draw 3 to 16 rows`);
  for (const r of beat.rows)
    if (!Array.isArray(r.series) || r.series.length !== years.length)
      throw new Error(`row ${JSON.stringify(r.key)}: series must hold one value per year from ${from} to ${to} (${years.length} values), it holds ${Array.isArray(r.series) ? r.series.length : "none"} — a year missing from data.json cannot be drawn`);
  assertNumbers(beat.rows.flatMap((r) => r.series.map((v, i) => [`${r.key} ${years[i]}`, v])));
  if (new Set(beat.rows.map((r) => r.key)).size !== beat.rows.length) throw new Error(`rows holds the same key twice: one row per entity`);

  // ── the worked example's arithmetic, generic ─────────────────────────────────────────────────
  const at = (series, year) => series[year - from];
  const readings = beat.rows.map((r) => {
    const series = r.series;
    return {
      key: String(r.key),
      label: plain(String(r.label ?? r.key)),
      series,
      start: at(series, from),
      atDipFrom: at(series, dipFrom),
      atDipTo: at(series, dipTo),
      end: at(series, to),
      gain: at(series, to) - at(series, from),
      dip: at(series, dipTo) - at(series, dipFrom),
    };
  });
  if (new Set(readings.map((r) => r.label)).size !== readings.length) throw new Error(`two rows print the same label: give each a label of its own`);
  const byStart = [...readings].sort((a, b) => b.start - a.start);
  const byGain = [...readings].sort((a, b) => b.gain - a.gain);
  const byDip = [...readings].sort((a, b) => a.dip - b.dip);
  const byEnd = [...readings].sort((a, b) => a.end - b.end);
  const fell = readings.filter((r) => r.dip < 0);
  if (fell.length < 2)
    throw new Error(`only ${fell.length} row(s) fell from ${dipFrom} to ${dipTo}: card 3 moves the dots BACK and writes the two largest losses — choose dipFrom and dipTo around a step back most rows share, or this choreography does not fit the data`);
  const [worstDip, secondDip] = byDip;
  const most = byGain[0];
  const least = byGain[byGain.length - 1];
  if (most === least) throw new Error(`every row gained the same: card 5 sorts by gain`);
  const reading = Object.freeze({
    count: readings.length,
    from,
    dipFrom,
    dipTo,
    to,
    rows: readings,
    byStart,
    byGain,
    byEnd,
    highestStart: byStart[0],
    lowestStart: byStart[byStart.length - 1],
    risen: readings.filter((r) => r.atDipFrom > r.start),
    fell,
    worstDip,
    secondDip,
    gained: readings.filter((r) => r.gain > 0),
    most,
    least,
  });

  beat.check(reading);
  assertDrawsClaimColumn(readings.flatMap((r) => r.series), HERE);

  // ── the words, each passed through plain(); every number they state is checked ───────────────────
  const say = (field, value) => {
    const text = typeof value === "function" ? value(reading) : value;
    const parts = [text].flat();
    if (!parts.length || parts.some((p) => typeof p !== "string" || !p.trim())) throw new Error(`${field} must return a non-empty sentence (or an array of paragraphs); it returned ${JSON.stringify(text)}`);
    return parts.map(plain);
  };
  // Rounded to tenths first, the way the drive writes a value on the stage, so a sentence and a dot never disagree.
  const tenth = (v) => Math.round(v * 10) / 10;
  const format = (v) => plain(beat.format(tenth(v)));
  const prose = [...CARDS.slice(0, 5).map((k) => say(`cards.${k}`, beat.cards[k])), say("limits", [beat.limits].flat()[0])];
  const notes = Object.fromEntries(CARDS.map((k, i) => [NOTE_SLOTS[i], say(`notes.${k}`, beat.notes[k]).join(" ")]));

  // What each card is ABOUT, so it must say it: the figure its gesture puts on screen.
  const OWES = {
    start: [["highestStart.start", format(reading.highestStart.start)], ["lowestStart.start", format(reading.lowestStart.start)]],
    rise: [],
    dip: [["fell.length", String(fell.length)], ["|worstDip.dip|", format(Math.abs(worstDip.dip))], ["|secondDip.dip|", format(Math.abs(secondDip.dip))]],
    gain: [["most.gain", format(most.gain)]],
    sort: [["least.gain", format(least.gain)], ["least.end", format(least.end)]],
  };
  const escape = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const states = (text, wanted) => new RegExp(`(?<![\\d.,])${escape(wanted)}(?![\\d])`).test(text);
  CARDS.slice(0, 5).forEach((k, i) => {
    const text = prose[i].join(" ");
    for (const [what, wanted] of OWES[k])
      if (!states(text, wanted)) throw new Error(`card ${i + 1} (cards.${k}) must state ${what} = "${wanted}" — the figure its picture shows; it says: ${text}`);
  });

  // Every other figure a card, a note or the alt states must be one this kit computed, at the
  // precision it is written with, sign aside. A year (1900–2100) passes.
  const known = [
    0, readings.length, fell.length, reading.risen.length, reading.gained.length,
    ...readings.flatMap((r) => [r.start, r.atDipFrom, r.atDipTo, r.end, r.gain, r.dip, ...r.series]),
  ].map((v) => Math.abs(tenth(v)));
  const figure = /(?<![\p{L}\d.,])(\d{1,3}(?:[ .]\d{3})+(?:,\d+)?|\d+(?:,\d+)?)(?![\p{L}\d])/gu;
  const checkFigures = (where, text) => {
    for (const m of plain(text).matchAll(figure)) {
      const raw = m[1];
      const [whole, frac = ""] = raw.split(",");
      const n = Number(`${whole.replace(/[ .]/g, "")}.${frac || "0"}`);
      if (!frac && Number.isInteger(n) && n >= 1900 && n <= 2100) continue;
      const tolerance = 0.5 * 10 ** -frac.length + 1e-9;
      if (!known.some((v) => Math.abs(v - n) <= tolerance))
        throw new Error(`${where} states ${raw}, which no figure of these rows rounds to: every number in a card is computed — use the reading (r.most.gain, r.least.end, r.worstDip.dip, r.fell.length, r.highestStart.start, …) through format(), never a typed or recomputed value. It says: ${text}`);
    }
  };
  CARDS.slice(0, 5).forEach((k, i) => checkFigures(`card ${i + 1} (cards.${k})`, prose[i].join(" ")));
  CARDS.forEach((k, i) => checkFigures(`notes.${k}`, notes[NOTE_SLOTS[i]]));

  // Each row's gain, and the loss of the two that lost most, written in the right column.
  const rows = readings.map((r, i) => {
    const gainText = plain(beat.gainLabel(r));
    if (!states(gainText, format(Math.abs(r.gain)))) throw new Error(`gainLabel() writes ${r.label}'s gain in the right column: it must state "${format(Math.abs(r.gain))}" (signed as you like); it says: ${gainText}`);
    const losing = r === worstDip || r === secondDip;
    const lossText = losing ? plain(beat.lossLabel(r)) : "";
    if (losing && !states(lossText, format(Math.abs(r.dip)))) throw new Error(`lossLabel() writes ${r.label}'s loss from ${dipFrom} to ${dipTo} in card 3: it must state "${format(Math.abs(r.dip))}"; it says: ${lossText}`);
    checkFigures("gainLabel", gainText);
    checkFigures("lossLabel", lossText);
    return { key: `r${i + 1}`, label: r.label, series: r.series, gainText, lossText, marked: r === most || r === least, focus: r === least };
  });
  const indexOf = (r) => readings.indexOf(r);
  const orders = [byStart.map(indexOf), byGain.map(indexOf)];

  // One fitted scale, not anchored at zero: two steps of room under the lowest value, one above the
  // highest (the worked example's, in its own step).
  const all = readings.flatMap((r) => r.series);
  const [vmin, vmax] = [Math.min(...all), Math.max(...all)];
  const probe = scaleLinear().domain([vmin, vmax]).ticks(6);
  const step = probe.length > 1 ? probe[1] - probe[0] : 1;
  const pad = step / 2;
  const domain = [Math.floor(vmin) - 2 * pad, Math.ceil(vmax) + pad];
  const ticks = [];
  for (let t = Math.ceil(domain[0] / step) * step; t <= domain[1] + 1e-9; t += step) ticks.push(Number(t.toFixed(10)));

  const titleForms = [beat.title].flat().map(plain);
  // The title may state the gains the gestures write, beside the values.
  assertHeadlineNumbersDrawn(titleForms[0], [...all, ...readings.flatMap((r) => [r.gain, r.dip]), readings.length], "rows");

  const eyebrow = plain(beat.eyebrow);
  const source = plain(beat.source);
  const yearTemplate = plain(beat.yearLabel("{year}"));
  if (!yearTemplate.includes("{year}")) throw new Error(`yearLabel(year) must write the year it is given ("from 2000 to " + year); it returned ${yearTemplate}`);
  const words = { unit: say("unit", beat.unit).join(" "), yearTemplate, yearFirst: plain(beat.yearFirst), ...notes };
  checkFigures("unit", words.unit);
  const alt = plain(typeof beat.alt === "function" ? beat.alt(reading) : beat.alt);
  checkFigures("alt", alt);

  /** One state per card; see dumbbell-drive.mjs for what each field paints. The worked example's, with its years generic. */
  const STATES = [
    { year: from, ghost: 0, loss: 0, gain: 0, sort: 0, focus: 0, note: 0 },
    { year: dipFrom, ghost: 0, loss: 0, gain: 0, sort: 0, focus: 0, note: 1 },
    { year: dipTo, ghost: 1, loss: 1, gain: 0, sort: 0, focus: 0, note: 2 },
    { year: to, ghost: 0, loss: 0, gain: 1, sort: 0, focus: 0, note: 3 },
    { year: to, ghost: 0, loss: 0, gain: 1, sort: 1, focus: 1, note: 4 },
    { year: to, ghost: 0, loss: 0, gain: 1, sort: 1, focus: 0, note: 5 },
  ];

  const textPerRegister = {
    display: titleForms.join(" "),
    eyebrow,
    body: `${prose.flat().join(" ")} ${source}`,
    axis: `${words.unit} ${ticks.join(" ")} ${all.map((v) => format(v)).join(" ")}`,
    annot: rows.map((r) => r.label).join(" "),
    value: `${rows.map((r) => `${r.gainText} ${r.lossText}`).join(" ")} ${all.map((v) => format(v)).join(" ")} ${years.join(" ")} ${words.yearTemplate} ${words.yearFirst} ${Object.values(notes).join(" ")}`,
  };

  const driver = readFileSync(join(HERE, "dumbbell-drive.mjs"), "utf8");
  const lang = beat.lang ?? storyLanguage(HERE) ?? "en";
  await renderBeatScrolly({
    here: HERE,
    states: STATES,
    textPerRegister,
    evidenceLevels: beat.evidenceLevels ?? 2,
    async render({ label, direction, outDir }) {
      const { ink, muted, grid } = deriveFurniture(direction.ground);
      const regs = webRegisters(direction, { ink: { ink, muted, accent: direction.accent } });
      const { outPath } = await renderScrolly({
        steps: prose.map((p, i) => ({ id: CARDS[i], prose: p })),
        reveal: {
          element: createElement(DirectedDumbbellScrolly, {
            rows,
            years,
            orders,
            domain,
            ticks,
            dipFrom,
            words,
            alt,
            regs,
            stroke: direction.stroke ?? {},
            ground: direction.ground,
            accent: direction.accent,
            ink,
            muted,
            grid,
          }),
          states: STATES,
          driver,
          apply: "applyDumbbellState",
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
