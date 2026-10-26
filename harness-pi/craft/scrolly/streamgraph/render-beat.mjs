// The generic half of a streamgraph SCROLLY beat, taken from
// proof/scrolly-streamgraph-swiss-electricity/render-directions-scrolly.mjs with everything about ITS
// subject removed. The choreography is the worked example's and is not the model's to change — six
// cards, one continuous interpolation driven by the reader's scroll (stream-drive.mjs, verbatim):
//
//   1 stream   a playhead draws the stream to the middle year, the year counting in the header;
//   2 giants   the stream reaches the last year, the bands named; the two largest bands are the giants;
//   3 retreat  the two giants thin to nothing, the scale fits the bands that are left;
//   4 cross    a rule at the year the tracked band reached its rank, passing one rival; both values written;
//   5 end      a rule at the last year, the tracked band against that rival;
//   6 reading  the giants return: the static plate; the card states the limits.
//
// This file computes every figure the cards may state (the giants, the totals, the year the tracked
// band reached its rank and the band it passed, the last year's multiple) and checks the words against
// them; ./beat.mjs — the one file the model writes — gives the readings and the WORDS of each card.
// Copied into the beat by the harness; never edited by the model.
//
// Usage:  bun <beat>/render-beat.mjs
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createElement } from "react";
import { stack, stackOrderInsideOut } from "d3-shape";
import { deriveFurniture } from "#shared/chart-beat/render-still.mjs";
import { webRegisters } from "#shared/design-base/web.mjs";
import { EYEBROW_TO_DISPLAY, gapOf, registerOf } from "#shared/design-base/register.mjs";
import { DirectedStreamScrolly } from "./DirectedStreamScrolly.tsx";
import { applyStoryboard, assertNumbers, assertOnePerX, assertLegibleLabels, assertHeadlineNumbersDrawn, assertDrawsClaimColumn } from "./guards.mjs";
import { plain, refusing, storyLanguage } from "./web.mjs";
import { renderBeatScrolly, scrollySkill } from "./scrolly.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));

/** The cards, in the drive's order: the runner's own ids (never the model's words in an id). */
const CARDS = ["stream", "giants", "retreat", "cross", "end", "reading"];
/** The component's header-note slots (its NOTES), one per card, in the same order. */
const NOTE_SLOTS = ["drawNote", "totalNote", "smallNote", "crossNote", "endNote", "readNote"];
/** Card 3 withdraws the two largest bands (the worked example's GIANTS). */
const GIANTS = 2;

await refusing(HERE, async () => {
  const { default: beat } = await import("./beat.mjs");
  applyStoryboard(beat, HERE);
  const { renderScrolly } = await import(scrollySkill(HERE, "scripts", "render-scrolly.mjs"));

  const REQUIRED = ["eyebrow", "keys", "labels", "tracked", "readings", "rank", "unit", "format", "cards", "notes", "marks", "title", "limits", "source", "alt", "check"];
  const missing = REQUIRED.filter((key) => beat[key] === undefined);
  if (missing.length) throw new Error(`beat.mjs is missing ${missing.join(", ")}: give each as a field of the default export (export default { …, ${missing[0]}: … }), not as a separate export (see CONTRACT.md)`);
  for (const fn of ["format", "check"])
    if (typeof beat[fn] !== "function") throw new Error(`beat.mjs: ${fn} must be a function (see CONTRACT.md)`);
  if (beat.formatCross !== undefined && typeof beat.formatCross !== "function") throw new Error(`beat.mjs: formatCross must be a function (see CONTRACT.md)`);
  for (const [group, keys] of [["cards", CARDS.slice(0, 5)], ["notes", CARDS], ["marks", ["cross", "end"]]]) {
    const absent = keys.filter((k) => typeof beat[group]?.[k] !== "function");
    if (absent.length) throw new Error(`beat.mjs: ${group} must give a function for each of ${keys.join(", ")}; missing or not a function: ${absent.join(", ")} (see CONTRACT.md)`);
  }

  // ── the readings ──────────────────────────────────────────────────────────────────────────────
  if (!Array.isArray(beat.keys) || beat.keys.length < 4)
    throw new Error(`keys must list at least four layers: card 3 withdraws the two largest and the bands left must still hold the tracked one and the one it passes`);
  const keys = beat.keys.map(String);
  const unlabelled = keys.filter((k) => typeof beat.labels?.[k] !== "string" || !beat.labels[k].trim());
  if (unlabelled.length) throw new Error(`labels must give a name for every key; missing: ${unlabelled.join(", ")}`);
  if (!keys.includes(String(beat.tracked))) throw new Error(`tracked ${JSON.stringify(beat.tracked)} is not one of keys`);
  const tracked = String(beat.tracked);
  if (!Array.isArray(beat.readings)) throw new Error(`readings must be an array of { year, <key>: value, … }, one per year`);
  assertOnePerX(beat.readings, "year");
  assertNumbers(beat.readings.flatMap((r) => [[`year`, r.year], ...keys.map((k) => [`${k} ${r.year}`, r[k]])]), "readings");
  const readings = [...beat.readings].sort((a, b) => a.year - b.year);
  for (let i = 1; i < readings.length; i++)
    if (readings[i].year !== readings[i - 1].year + 1)
      throw new Error(`readings skip from ${readings[i - 1].year} to ${readings[i].year}: a stream is drawn through every year — give each one, or start after the gap`);
  if (readings.length < 6) throw new Error(`readings hold ${readings.length} years: the playhead draws a stream over time — give at least 6`);
  const negative = readings.flatMap((r) => keys.filter((k) => r[k] < 0).map((k) => `${k} ${r.year}`));
  if (negative.length) throw new Error(`${negative.slice(0, 3).join(", ")} is negative: a band's thickness is its quantity, it cannot be below zero`);
  const totalOf = (r) => keys.reduce((s, k) => s + r[k], 0);
  const last = readings[readings.length - 1];
  const prev = readings[readings.length - 2];
  if (totalOf(last) < (totalOf(prev) * 5) / 6 && beat.lastYearComplete !== true)
    throw new Error(`the total falls from ${totalOf(prev).toFixed(1)} in ${prev.year} to ${totalOf(last).toFixed(1)} in ${last.year}: that reads as a partial year. Leave ${last.year} out of readings (and say so in source or limits), or set lastYearComplete: true if the source confirms it`);
  for (const ex of beat.excluded ?? []) {
    if (!`${beat.source} ${[beat.limits].flat().join(" ")}`.includes(String(ex.year)))
      throw new Error(`${ex.year} is excluded, so source or limits must say it (${ex.why ?? "why"})`);
  }

  const drawnKeys = keys.filter((k) => readings.some((r) => r[k] > 0));
  const sizeOf = (k) => readings.reduce((s, r) => s + r[k], 0);
  const giants = [...drawnKeys].sort((a, b) => sizeOf(b) - sizeOf(a)).slice(0, GIANTS);
  if (giants.includes(tracked))
    throw new Error(`${tracked} is one of the two largest bands: card 3 withdraws the two largest so the thin ones can be seen, and the tracked band must stay. This choreography is about a thin band; choose another type`);

  // The year the tracked band first reaches its rank (and keeps it), and the one band it passed then.
  const RANK = beat.rank;
  if (!(Number.isInteger(RANK) && RANK >= 1 && RANK < drawnKeys.length)) throw new Error(`rank is ${JSON.stringify(RANK)}: the place the tracked band reaches (3 = third largest), a whole number below ${drawnKeys.length}`);
  const rankIn = (r) => keys.map((k) => ({ k, v: r[k] })).sort((a, b) => b.v - a.v).findIndex((x) => x.k === tracked) + 1;
  const reachedAt = readings.find((r) => rankIn(r) <= RANK);
  if (!reachedAt) throw new Error(`${tracked} never reaches rank ${RANK}: card 4 marks the year it does`);
  if (reachedAt === readings[0]) throw new Error(`${tracked} already holds rank ${RANK} in ${readings[0].year}: card 4 marks the year it REACHES it — start readings earlier, or choose another rank`);
  const lost = readings.filter((r) => r.year > reachedAt.year && rankIn(r) > RANK);
  if (lost.length) throw new Error(`${tracked} reaches rank ${RANK} in ${reachedAt.year} but loses it in ${lost.map((r) => r.year).join(", ")}: card 4 says it holds it from then on`);
  const before = readings[readings.indexOf(reachedAt) - 1];
  const passed = keys.filter((k) => k !== tracked && before[k] > before[tracked] && reachedAt[k] < reachedAt[tracked]);
  if (passed.length !== 1)
    throw new Error(`in ${reachedAt.year} ${tracked} passes ${passed.length ? passed.join(", ") : "no band"}: card 4 names the ONE band it passed that year`);
  const [rival] = passed;
  if (giants.includes(rival)) throw new Error(`${tracked} passes ${rival}, one of the two giants card 3 withdraws: the crossing would be marked on a band that is not drawn`);
  const formatCross = (v) => plain((beat.formatCross ?? beat.format)(v));
  if (formatCross(reachedAt[tracked]) === formatCross(reachedAt[rival]))
    throw new Error(`card 4 writes the crossing as ${formatCross(reachedAt[tracked])} against ${formatCross(reachedAt[rival])}: at that precision ${tracked} does not lead ${rival} in ${reachedAt.year}. Give formatCross more decimals`);

  const first = readings[0];
  const years = readings.map((r) => r.year);
  const HALFWAY = Math.round((years[0] + years[years.length - 1]) / 2);
  /** One state per card; see stream-drive.mjs for what each field paints. The worked example's, the
   *  playhead's years taken from the data (card 1 stops halfway, card 2 finishes the stream). */
  const LAST = last.year;
  const STATES = [
    { year: HALFWAY, retreat: 0, cross: 0, end: 0, note: 0 },
    { year: LAST, retreat: 0, cross: 0, end: 0, note: 1 },
    { year: LAST, retreat: 1, cross: 0, end: 0, note: 2 },
    { year: LAST, retreat: 1, cross: 1, end: 0, note: 3 },
    { year: LAST, retreat: 1, cross: 0, end: 1, note: 4 },
    { year: LAST, retreat: 0, cross: 0, end: 0, note: 5 },
  ];
  const at = (r) => Object.fromEntries(keys.map((k) => [k, r[k]]));
  const reading = {
    first: first.year,
    last: LAST,
    keys: drawnKeys,
    labels: { ...beat.labels },
    giants,
    rank: RANK,
    crossYear: reachedAt.year,
    rival,
    firstValues: at(first),
    crossValues: at(reachedAt),
    lastValues: at(last),
    firstTotal: totalOf(first),
    lastTotal: totalOf(last),
    multiple: last[rival] > 0 ? last[tracked] / last[rival] : null,
  };
  Object.freeze(reading);

  assertLegibleLabels(keys.map((k) => last[k]).filter((v) => v > 0), beat.format);
  beat.check(reading);
  assertDrawsClaimColumn(readings.flatMap((r) => keys.map((k) => r[k])), HERE);

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
  if (!notes.drawNote.includes("{year}"))
    throw new Error(`notes.stream must contain the token {year}: card 1's header note counts the playhead's year (e.g. "{year}"); it says: ${notes.drawNote}`);
  const marks = [
    { year: reachedAt.year, text: say("marks.cross", beat.marks.cross).join(" ") },
    { year: LAST, text: say("marks.end", beat.marks.end).join(" ") },
  ];

  // What each card is ABOUT, so it must say it: the figure its gesture puts on screen.
  const OWES = {
    stream: [],
    giants: [...giants.map((g) => [`lastValues.${g}`, format(last[g])]), ["lastTotal", format(totalOf(last))]],
    retreat: [],
    cross: [[`crossValues.${tracked}`, formatCross(reachedAt[tracked])], [`crossValues.${rival}`, formatCross(reachedAt[rival])]],
    end: [[`lastValues.${tracked}`, format(last[tracked])]],
  };
  const escape = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const states = (text, wanted) => new RegExp(`(?<![\\d.,])${escape(wanted)}(?![\\d])`).test(text);
  CARDS.slice(0, 5).forEach((k, i) => {
    const text = prose[i].join(" ");
    for (const [what, wanted] of OWES[k])
      if (!states(text, wanted)) throw new Error(`card ${i + 1} (cards.${k}) must state ${what} = "${wanted}" — the figure its picture shows; it says: ${text}`);
  });
  for (const [k, m, want] of [["cross", marks[0], [reachedAt[tracked], reachedAt[rival]].map(formatCross)], ["end", marks[1], [last[tracked], last[rival]].map(format)]])
    for (const w of want) if (!states(m.text, w)) throw new Error(`marks.${k} is written beside the rule at ${m.year} and must state both bands' values there ("${want.join('", "')}"); it says: ${m.text}`);

  // Every other figure a card, a note or a mark states must be one this kit computed, at the precision
  // it is written with. A year (1900–2100) and a figure glued to letters (CO2, 10e) pass.
  const sample = plain(beat.format(1.5));
  const langOf = beat.lang ?? storyLanguage(HERE) ?? "en";
  const decimal = /,/.test(sample) ? "," : /\./.test(sample) ? "." : /,/.test(new Intl.NumberFormat(langOf).format(1.5)) ? "," : ".";
  const group = decimal === "," ? "[ .]" : "[ ,]";
  const known = [
    RANK, drawnKeys.length, keys.length, totalOf(first), totalOf(last), reading.multiple, LAST - first.year + 1,
    ...[first, before, reachedAt, last].flatMap((r) => keys.map((k) => r[k])),
  ].filter((v) => v !== null);
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
        throw new Error(`${where} states ${raw}, which no figure of these readings rounds to: every number in a card is computed — use the reading (r.lastValues, r.crossValues, r.lastTotal, r.multiple, …) through format(), never a typed or recomputed value. It says: ${text}`);
    }
  };
  CARDS.slice(0, 5).forEach((k, i) => checkFigures(`card ${i + 1} (cards.${k})`, prose[i].join(" ")));
  CARDS.forEach((k, i) => checkFigures(`notes.${k}`, notes[NOTE_SLOTS[i]]));
  checkFigures("marks.cross", marks[0].text);
  checkFigures("marks.end", marks[1].text);

  const titleForms = [beat.title].flat().map(plain);
  assertHeadlineNumbersDrawn(titleForms[0], [...keys.map((k) => last[k]), totalOf(last), RANK], "bands");

  const eyebrow = plain(beat.eyebrow);
  const source = plain(beat.source);
  const alt = plain(typeof beat.alt === "function" ? beat.alt(reading) : beat.alt);
  checkFigures("alt", alt);

  // The stack's order, inside-out as the worked example's; the runner's own keys (k1…kN) in selectors.
  const series = stack().keys(drawnKeys).order(stackOrderInsideOut)(readings);
  const order = [...series].sort((a, b) => a.index - b.index).map((s) => drawnKeys.indexOf(s.key));
  const keyOf = (k) => `k${keys.indexOf(k) + 1}`;
  const layers = drawnKeys.map((k) => ({ key: keyOf(k), label: plain(beat.labels[k]), values: readings.map((r) => r[k]), giant: giants.includes(k) }));
  const xTicks = [years[0]];
  for (let y = Math.ceil((years[0] + 1) / 5) * 5; y < LAST - 1; y += 5) xTicks.push(y);
  xTicks.push(LAST);
  const words = { unit: plain(beat.unit), ...notes };

  const textPerRegister = {
    display: titleForms.join(" "),
    eyebrow,
    body: `${prose.flat().join(" ")} ${source}`,
    axis: `${words.unit} ${xTicks.join(" ")}`,
    annot: layers.map((l) => l.label).join(" "),
    value: `${Object.values(notes).join(" ")} ${marks.map((m) => m.text).join(" ")} 0123456789`,
  };

  const driver = readFileSync(join(HERE, "stream-drive.mjs"), "utf8");
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
          element: createElement(DirectedStreamScrolly, { layers, order, years, tracked: keyOf(tracked), rival: keyOf(rival), marks, xTicks, words, alt, regs, ground: direction.ground, accent: direction.accent, ink, muted, grid }),
          states: STATES,
          driver,
          apply: "applyStreamState",
        },
        title: titleForms,
        eyebrow,
        source,
        ground: direction.ground,
        type: { eyebrow: { ...regs.eyebrow, marginBottom: `${gapOf(registerOf(direction, "eyebrow"), EYEBROW_TO_DISPLAY)}px` }, display: regs.display, body: regs.body, source: regs.body },
        lang: langOf,
        outDir,
        name: `${label}.html`,
      });
      return { outPath };
    },
  });
});
