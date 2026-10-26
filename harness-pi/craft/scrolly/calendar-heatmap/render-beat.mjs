// The generic half of a calendar heatmap SCROLLY beat, taken from
// proof/scrolly-calendar-heatmap-geneva/render-directions-scrolly.mjs with everything about ITS
// subject removed. The choreography is the worked example's and is not the model's to change — six
// cards, one continuous interpolation driven by the reader's scroll (calendar-drive.mjs, verbatim):
//
//   1 calendar  the empty calendar: one cell a day, one row a month;
//   2 bins      the year fills day by day, 1 January to 31 December, and the six-bin key arrives;
//   3 warm      every day under the threshold steps back to a neutral;
//   4 run       the months the longest run crosses open to fill the frame and print their values; the
//               outline traces the run day by day while a counter climbs to its length;
//   5 month     the year returns in full colour; every month's mean is drawn beside its row, the
//               warmest in the accent;
//   6 extremes  the highest and lowest days ringed and named; the card ends on the limits.
//
// This file computes every figure the cards may state (the run, the warm days, the bins, the monthly
// means, the extremes) and checks the words against them; ./beat.mjs — the one file the model writes —
// gives the days and the WORDS of each card. Copied into the beat by the harness; never edited by the
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
import { DirectedCalendarScrolly } from "./DirectedCalendarScrolly.tsx";
import { applyStoryboard, assertNumbers, assertHeadlineNumbersDrawn, assertDrawsClaimColumn } from "./guards.mjs";
import { plain, refusing, storyLanguage } from "./web.mjs";
import { renderBeatScrolly, scrollySkill } from "./scrolly.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));

/** The cards, in the drive's order: the runner's own ids (never the model's words in an id). */
const CARDS = ["calendar", "bins", "warm", "run", "month", "extremes"];
/** One state per card; see calendar-drive.mjs for what each field paints. The worked example's, verbatim. */
const STATES = [
  { fill: 0, key: 0, filter: 0, zoom: 0, outline: 0, means: 0, extremes: 0 },
  { fill: 1, key: 1, filter: 0, zoom: 0, outline: 0, means: 0, extremes: 0 },
  { fill: 1, key: 1, filter: 1, zoom: 0, outline: 0, means: 0, extremes: 0 },
  { fill: 1, key: 1, filter: 1, zoom: 1, outline: 1, means: 0, extremes: 0 },
  { fill: 1, key: 1, filter: 0, zoom: 0, outline: 1, means: 1, extremes: 0 },
  { fill: 1, key: 1, filter: 0, zoom: 0, outline: 1, means: 1, extremes: 1 },
];
/** The quantiles the six bins break at (the worked example's: roughly equal counts). */
const QUANTILES = [0.166, 0.333, 0.5, 0.666, 0.833];

await refusing(HERE, async () => {
  const { default: beat } = await import("./beat.mjs");
  applyStoryboard(beat, HERE);
  const { renderScrolly } = await import(scrollySkill(HERE, "scripts", "render-scrolly.mjs"));

  const REQUIRED = ["eyebrow", "days", "threshold", "months", "unit", "format", "formatValue", "cards", "counterSuffix", "meansLabel", "extremeLabel", "keyLabel", "missingLabel", "title", "limits", "source", "alt", "check"];
  const missing = REQUIRED.filter((key) => beat[key] === undefined);
  if (missing.length) throw new Error(`beat.mjs is missing ${missing.join(", ")}: give each as a field of the default export (export default { …, ${missing[0]}: … }), not as a separate export (see CONTRACT.md)`);
  for (const fn of ["format", "formatValue", "counterSuffix", "extremeLabel", "check"])
    if (typeof beat[fn] !== "function") throw new Error(`beat.mjs: ${fn} must be a function (see CONTRACT.md)`);
  const absent = CARDS.filter((k) => typeof beat.cards?.[k] !== "function");
  if (absent.length) throw new Error(`beat.mjs: cards must give a function for each of ${CARDS.join(", ")}; missing or not a function: ${absent.join(", ")} (see CONTRACT.md)`);
  if (!Array.isArray(beat.months) || beat.months.length !== 12) throw new Error(`months must hold the twelve month names, in the story's language`);

  // ── the days: every day of one year, in calendar order ───────────────────────────────────────
  if (!Array.isArray(beat.days)) throw new Error(`days must be an array of { date: "YYYY-MM-DD", value }, one per day of the year`);
  assertNumbers(beat.days.map((d) => [d.date, d.value]));
  const parsed = beat.days
    .map((d) => {
      const m = String(d.date).match(/^(\d{4})-(\d{2})-(\d{2})$/);
      if (!m) throw new Error(`a day's date is ${JSON.stringify(d.date)}: give every date as "YYYY-MM-DD"`);
      return { date: String(d.date), year: Number(m[1]), month: Number(m[2]) - 1, day: Number(m[3]), value: d.value };
    })
    .sort((a, b) => (a.date < b.date ? -1 : 1));
  const year = parsed[0]?.year;
  if (parsed.some((d) => d.year !== year)) throw new Error(`days span more than one year: filter data.json to ONE year`);
  if (new Set(parsed.map((d) => d.date)).size !== parsed.length) throw new Error(`days holds the same date twice: one value per day`);
  const daysInMonth = (month) => new Date(year, month + 1, 0).getDate();
  const expected = beat.months.reduce((sum, _, m) => sum + daysInMonth(m), 0);
  if (parsed.length !== expected)
    throw new Error(`days holds ${parsed.length} days of ${year}, not ${expected}: the year fills day by day, every day of it — a missing day cannot be drawn`);
  const months = beat.months.map(plain);
  // A negative reading takes the minus sign, not the hyphen toLocaleString writes (the worked
  // example's own rule) — in a label and in every sentence.
  const minus = (t) => t.replace(/(^|[\s(·:])-(?=\d)/g, "$1−");
  const words = (t) => minus(plain(t));
  const formatValue = (v) => words(beat.formatValue(v));
  const format = (v) => plain(beat.format(v));
  const days = parsed.map((d, index) => ({ ...d, index }));
  const dayOf = (d) => ({ date: d.date, month: d.month, day: d.day, monthName: months[d.month], value: d.value, label: formatValue(d.value) });

  // ── the worked example's arithmetic, generic ─────────────────────────────────────────────────
  const threshold = beat.threshold;
  if (typeof threshold !== "number" || !Number.isFinite(threshold)) throw new Error(`threshold must be a number: the value the run is counted from (value >= threshold)`);
  let best = { length: 0, from: null, to: null };
  let run = [];
  for (const day of days) {
    if (day.value >= threshold) run.push(day);
    else {
      if (run.length > best.length) best = { length: run.length, from: run[0], to: run.at(-1) };
      run = [];
    }
  }
  if (run.length > best.length) best = { length: run.length, from: run[0], to: run.at(-1) };
  if (best.length < 2) throw new Error(`the longest run of days at or above ${threshold} is ${best.length} day(s): card 4 traces a RUN of days — check threshold against the values (${Math.min(...days.map((d) => d.value))} to ${Math.max(...days.map((d) => d.value))})`);
  const warmDays = days.filter((d) => d.value >= threshold).length;
  if (!(warmDays > best.length))
    throw new Error(`every one of the ${warmDays} days at or above ${threshold} is in the run: card 3 (the days above the threshold) and card 4 (the run) would show the same thing — this choreography needs days above the threshold outside the run`);
  const runs = [];
  for (let month = best.from.month; month <= best.to.month; month++)
    runs.push({ month, from: month === best.from.month ? best.from.day : 1, to: month === best.to.month ? best.to.day : daysInMonth(month) });
  if (runs.length > 2)
    throw new Error(`the longest run (${best.length} days, ${best.from.date} to ${best.to.date}) crosses ${runs.length} months: card 4 opens the months the run crosses to share the frame, which holds two — this choreography cannot zoom on a run longer than two months`);

  const hottest = days.reduce((a, b) => (b.value > a.value ? b : a));
  const coldest = days.reduce((a, b) => (b.value < a.value ? b : a));
  const monthlyMean = months.map((name, month) => {
    const of = days.filter((d) => d.month === month);
    return { name, month, mean: of.reduce((s, d) => s + d.value, 0) / of.length };
  });
  if (monthlyMean.some((m) => m.mean < 0))
    throw new Error(`a monthly mean is below zero (${monthlyMean.filter((m) => m.mean < 0).map((m) => m.name).join(", ")}): card 5 draws each month's mean as a bar from zero, which cannot show a negative mean — this choreography does not fit this series`);
  const warmest = monthlyMean.reduce((a, b) => (b.mean > a.mean ? b : a));

  const sorted = days.map((d) => d.value).sort((a, b) => a - b);
  const quantile = (p) => sorted[Math.floor(p * (sorted.length - 1))];
  const decimals = beat.breakDecimals ?? 0;
  if (!(Number.isInteger(decimals) && decimals >= 0 && decimals <= 3)) throw new Error(`breakDecimals is ${beat.breakDecimals}: give 0 to 3`);
  const breaks = QUANTILES.map((p) => Math.round(quantile(p) * 10 ** decimals) / 10 ** decimals);
  if (new Set(breaks).size !== breaks.length) throw new Error(`two bins share a break after rounding (${breaks.join(", ")}): raise breakDecimals`);
  if (new Set(breaks.map(format)).size !== breaks.length) throw new Error(`format() prints two breaks alike (${breaks.map(format).join(", ")}): print enough decimals for breakDecimals = ${decimals}`);

  const reading = Object.freeze({
    year,
    count: days.length,
    threshold,
    run: { length: best.length, from: dayOf(best.from), to: dayOf(best.to) },
    warmDays,
    hottest: dayOf(hottest),
    coldest: dayOf(coldest),
    means: monthlyMean,
    warmest,
    breaks,
    bins: breaks.length + 1,
  });

  beat.check(reading);
  assertDrawsClaimColumn(days.map((d) => d.value), HERE);

  // ── the words, each passed through plain(); every number they state is checked ───────────────────
  const say = (field, value) => {
    const text = typeof value === "function" ? value(reading) : value;
    const parts = [text].flat();
    if (!parts.length || parts.some((p) => typeof p !== "string" || !p.trim())) throw new Error(`${field} must return a non-empty sentence (or an array of paragraphs); it returned ${JSON.stringify(text)}`);
    return parts.map(words);
  };
  const cardText = CARDS.map((k) => say(`cards.${k}`, beat.cards[k]));
  const limits = say("limits", [beat.limits].flat()[0]);
  // Card 6 is the extremes, then the journalist's limits, in one paragraph (the worked example's card).
  const prose = [...cardText.slice(0, 5), [[...cardText[5], ...limits].join(" ")]];

  // What each card is ABOUT, so it must say it: the figure its gesture puts on screen.
  const OWES = {
    calendar: [["year", String(year)]],
    bins: [],
    warm: [["warmDays", String(warmDays)]],
    run: [["run.length", String(best.length)]],
    month: [["warmest.mean", formatValue(warmest.mean)]],
    extremes: [["hottest.value", formatValue(hottest.value)], ["coldest.value", formatValue(coldest.value)]],
  };
  const escape = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  CARDS.forEach((k, i) => {
    const text = cardText[i].join(" ");
    for (const [what, wanted] of OWES[k])
      if (!new RegExp(`(?<![\\d.,])${escape(wanted)}(?![\\d])`).test(text))
        throw new Error(`card ${i + 1} (cards.${k}) must state ${what} = "${wanted}" — the figure its picture shows; it says: ${text}`);
  });

  // Every other figure a card or the alt states must be one this kit computed, at the precision it
  // is written with. A year (1900–2100) and a figure glued to letters (CO2, 10e) pass. A minus sign
  // (− or -) before a figure is read as part of it.
  const decimal = /,/.test(beat.formatValue(1.5)) ? "," : ".";
  const group = decimal === "," ? "[ .]" : "[ ,]";
  const dec = decimal === "." ? "\\." : ",";
  const known = [
    year, days.length, threshold, best.length, warmDays, breaks.length + 1, breaks.length,
    hottest.value, coldest.value, ...monthlyMean.map((m) => m.mean), ...breaks,
  ];
  // A date ("18 juillet", "12 January") is read like a year: its day of the month is not a figure.
  // Only a day number written right before one of the twelve month names passes this way.
  const escapeName = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const dated = new RegExp(`(?<![\\p{L}\\d])\\d{1,2}(?:er|st|nd|rd|th)?(?=\\s+(?:${months.map(escapeName).join("|")})(?![\\p{L}]))`, "giu");
  const figure = new RegExp(`(?<![\\p{L}\\d.,])([-−]?)(\\d{1,3}(?:${group}\\d{3})+(?:${dec}\\d+)?|\\d+(?:${dec}\\d+)?)(?![\\p{L}\\d])`, "gu");
  const checkFigures = (where, text) => {
    for (const m of plain(text).replace(dated, "").matchAll(figure)) {
      const raw = m[2];
      const [whole, frac = ""] = raw.split(decimal);
      const n = (m[1] ? -1 : 1) * Number(`${whole.replace(/[ .,]/g, "")}.${frac || "0"}`);
      if (!frac && Number.isInteger(n) && n >= 1900 && n <= 2100) continue;
      const tolerance = 0.5 * 10 ** -frac.length + 1e-9;
      if (!known.some((v) => Math.abs(v - n) <= tolerance))
        throw new Error(`${where} states ${m[1]}${raw}, which no figure of this calendar rounds to: every number in a card is computed — use the reading (r.warmDays, r.run.length, r.warmest.mean, r.hottest.value, …) through formatValue(), never a typed or recomputed value. It says: ${text}`);
    }
  };
  CARDS.forEach((k, i) => checkFigures(`card ${i + 1} (cards.${k})`, cardText[i].join(" ")));

  const titleForms = [beat.title].flat().map(plain);
  // The title states the run's length and its threshold; the counter writes the one, the filter
  // draws the other, and card 3 counts the warm days.
  assertHeadlineNumbersDrawn(titleForms[0], [...days.map((d) => d.value), best.length, threshold, warmDays], "days");

  const eyebrow = plain(beat.eyebrow);
  const source = plain(beat.source);
  const counterSuffix = words(beat.counterSuffix(reading));
  checkFigures("counterSuffix", counterSuffix);
  const meansLabel = plain(beat.meansLabel);
  const keyLabel = plain(beat.keyLabel);
  const missingLabel = plain(beat.missingLabel);
  const hotText = words(beat.extremeLabel(reading.hottest));
  const coldText = words(beat.extremeLabel(reading.coldest));
  for (const [which, text, d] of [["highest", hotText, hottest], ["lowest", coldText, coldest]])
    if (!text.includes(formatValue(d.value))) throw new Error(`extremeLabel() names the ${which} day on the calendar, so it must state its value "${formatValue(d.value)}"; it says: ${text}`);
  if (hotText === coldText) throw new Error(`extremeLabel() gives the highest and the lowest day the same label: start it with the day's date`);
  checkFigures("extremeLabel", `${hotText} ${coldText}`);
  const alt = words(typeof beat.alt === "function" ? beat.alt(reading) : beat.alt);
  checkFigures("alt", alt);
  const means = monthlyMean.map((m) => ({ value: m.mean, label: formatValue(m.mean) }));

  const textPerRegister = {
    display: titleForms.join(" "),
    eyebrow,
    body: `${prose.flat().join(" ")} ${source}`,
    axis: `${months.join(" ")} 1 5 10 15 20 25 31 ${breaks.map(format).join(" ")} ${keyLabel} ${missingLabel} ${meansLabel} ${days.map((d) => formatValue(d.value)).join(" ")}`,
    annot: `${hotText} ${coldText}`,
    value: `${best.length} ${counterSuffix} ${means.map((m) => m.label).join(" ")}`,
  };

  const driver = readFileSync(join(HERE, "calendar-drive.mjs"), "utf8");
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
          element: createElement(DirectedCalendarScrolly, {
            days: days.map(({ index, month, day, value }) => ({ index, month, day, value, label: formatValue(value) })),
            months,
            breaks,
            threshold,
            runs,
            counterSuffix,
            streakLength: best.length,
            means,
            meansLabel,
            warmest: warmest.month,
            hot: { month: hottest.month, day: hottest.day, text: hotText },
            cold: { month: coldest.month, day: coldest.day, text: coldText },
            keyLabel,
            missingLabel,
            format,
            alt,
            regs,
            pad: direction.pad,
            stroke: direction.stroke ?? {},
            ground: direction.ground,
            accent: direction.accent,
            ink,
            muted,
            grid,
            year,
          }),
          states: STATES,
          driver,
          apply: "applyCalendarState",
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
