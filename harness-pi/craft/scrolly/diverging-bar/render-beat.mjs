// The generic half of a diverging bar SCROLLY beat, taken from
// proof/scrolly-diverging-bar-eu-per-capita/render-directions-scrolly.mjs with everything about ITS
// subject removed. The choreography is the worked example's and is not the model's to change — six
// cards, one continuous interpolation driven by the reader's scroll (diverging-drive.mjs, verbatim):
//
//   1 levels   every row's EARLIER level as a bar from zero, sorted from the highest;
//   2 fall     each bar shortens (or grows) to its LATER level, the earlier length kept as an outline;
//              the counter of the rows that fell climbs;
//   3 swap     each bar leaves the level axis for the change axis out of a zero line, then the rows
//              re-sort from the largest rise to the largest fall;
//   4 subject  the change axis closes onto a narrow domain around zero so the subject's small rise has
//              a length; every other bar steps back; the subject's note is written;
//   5 mean     the whole axis again; the mean of the falls drawn down the chart; the rows past it kept;
//   6 reading  every row, the subject in the accent, the mean; the card is the limits.
//
// This file computes every figure the cards may state (the changes, the falls and their mean, the
// subject's share, the close-up) and checks the words against them; ./beat.mjs — the one file the model
// writes — gives the rows and the WORDS of each card. Copied into the beat by the harness; never edited
// by the model.
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
import { DirectedDivergingScrolly } from "./DirectedDivergingScrolly.tsx";
import { applyStoryboard, assertNumbers, assertHeadlineNumbersDrawn, assertDrawsClaimColumn } from "./guards.mjs";
import { plain, refusing, storyLanguage } from "./web.mjs";
import { renderBeatScrolly, scrollySkill } from "./scrolly.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));

/** The cards, in the drive's order: the runner's own ids (never the model's words in an id). */
const CARDS = ["levels", "fall", "swap", "subject", "mean", "reading"];
/** One state per card; see diverging-drive.mjs for what each field paints. The worked example's, verbatim. */
const STATES = [
  { year: 0, fell: 0, subject: 0, swap: 0, zoom: 0, note: 0, mean: 0, beyond: 0 },
  { year: 1, fell: 1, subject: 1, swap: 0, zoom: 0, note: 0, mean: 0, beyond: 0 },
  { year: 1, fell: 0, subject: 1, swap: 1, zoom: 0, note: 0, mean: 0, beyond: 0 },
  { year: 1, fell: 0, subject: 1, swap: 1, zoom: 1, note: 1, mean: 0, beyond: 0 },
  { year: 1, fell: 0, subject: 1, swap: 1, zoom: 0, note: 0, mean: 1, beyond: 1 },
  { year: 1, fell: 0, subject: 1, swap: 1, zoom: 0, note: 0, mean: 1, beyond: 0 },
];
/** The round tops the close-up may close onto (times a power of ten). */
const NICE = [1, 2, 2.5, 5, 10];
/** Card 4 is for a change too small to see on the whole axis: at most this share of the change axis. */
const SMALL = 0.1;

await refusing(HERE, async () => {
  const { default: beat } = await import("./beat.mjs");
  applyStoryboard(beat, HERE);
  const { renderScrolly } = await import(scrollySkill(HERE, "scripts", "render-scrolly.mjs"));

  const REQUIRED = ["eyebrow", "rows", "subject", "from", "to", "formatLevel", "formatChange", "cards", "levelUnit", "changeUnit", "fellCount", "subjectNote", "meanNote", "title", "limits", "source", "alt", "check"];
  const missing = REQUIRED.filter((key) => beat[key] === undefined);
  if (missing.length) throw new Error(`beat.mjs is missing ${missing.join(", ")}: give each as a field of the default export (export default { …, ${missing[0]}: … }), not as a separate export (see CONTRACT.md)`);
  for (const fn of ["formatLevel", "formatChange", "levelUnit", "fellCount", "subjectNote", "meanNote", "check"])
    if (typeof beat[fn] !== "function") throw new Error(`beat.mjs: ${fn} must be a function (see CONTRACT.md)`);
  const absent = CARDS.slice(0, 5).filter((k) => typeof beat.cards?.[k] !== "function");
  if (absent.length) throw new Error(`beat.mjs: cards must give a function for each of ${CARDS.slice(0, 5).join(", ")}; missing or not a function: ${absent.join(", ")} (see CONTRACT.md)`);
  // The drive and the component print every bar's value and tick with a decimal comma (the worked
  // example's French); a story whose sentences use a decimal point would print 1,5 beside 1.5.
  if (!/,/.test(beat.formatLevel(1.5)) || !/,/.test(beat.formatChange(1.5)))
    throw new Error(`formatLevel(1.5) / formatChange(1.5) print ${JSON.stringify(beat.formatLevel(1.5))} / ${JSON.stringify(beat.formatChange(1.5))}: this kit's bars and ticks are written with a decimal comma (the worked example's drive), so the cards must be too — it cannot serve a language written with a decimal point`);

  // ── the rows: two levels each ────────────────────────────────────────────────────────────────
  if (!Array.isArray(beat.rows)) throw new Error(`rows must be an array of { name, code, from, to }`);
  if (beat.rows.length < 4 || beat.rows.length > 40) throw new Error(`rows holds ${beat.rows.length}: draw 4 to 40 rows`);
  assertNumbers(beat.rows.flatMap((r) => [[`${r.name} from`, r.from], [`${r.name} to`, r.to]]));
  const rows = beat.rows.map((r) => ({ name: String(r.name), label: plain(String(r.label ?? r.name)), code: String(r.code ?? ""), from: r.from, to: r.to, change: r.to - r.from }));
  if (new Set(rows.map((r) => r.name)).size !== rows.length) throw new Error(`rows holds the same name twice: one row per name (filter data.json to one series)`);
  const badCode = rows.find((r) => !/^[A-Za-z0-9]{2,5}$/.test(r.code));
  if (badCode) throw new Error(`row ${badCode.name} has code ${JSON.stringify(badCode.code)}: every row needs a short code of 2 to 5 letters or digits (an ISO code, "HRV") — the page keys each row by it`);
  if (new Set(rows.map((r) => r.code)).size !== rows.length) throw new Error(`two rows share a code: give each a code of its own`);
  const negative = rows.find((r) => r.from < 0 || r.to < 0);
  if (negative) throw new Error(`${negative.name} has a negative level: cards 1 and 2 draw each level as a bar from zero`);
  const subjectRow = rows.find((r) => r.name === beat.subject);
  if (!subjectRow) throw new Error(`subject is ${JSON.stringify(beat.subject)}, which is not the name of any row`);

  // ── the worked example's arithmetic, generic ─────────────────────────────────────────────────
  const byChange = [...rows].sort((a, b) => b.change - a.change);
  const rose = byChange.filter((r) => r.change > 0);
  const fell = byChange.filter((r) => r.change < 0);
  if (fell.length < 2) throw new Error(`only ${fell.length} row(s) fell: card 5 draws the mean of the falls`);
  if (!(subjectRow.change > 0)) throw new Error(`${subjectRow.name}'s change is ${subjectRow.change}: card 4 closes the axis to give the subject's RISE a length — this choreography is about a row that rose`);
  if (byChange[0] !== subjectRow) throw new Error(`the largest rise is ${byChange[0].name}'s, not ${subjectRow.name}'s: card 4 speaks of the row at the top of the change order, so the subject must be the largest rise`);
  const lowest = byChange[byChange.length - 1].change;
  const changeSpan = Math.max(0, ...rows.map((r) => r.change)) + 0.1 - lowest * 1.02;
  if (subjectRow.change > changeSpan * SMALL)
    throw new Error(`${subjectRow.name}'s rise (${subjectRow.change}) is already visible on the whole change axis: card 4 closes the axis to give a change TOO SMALL TO SEE a length — this choreography does not fit a large rise`);
  const mean = fell.reduce((s, r) => s + r.change, 0) / fell.length;
  const beyondMean = fell.filter((r) => r.change < mean);
  const byLevel = [...rows].sort((a, b) => b.from - a.from);
  const byFall = [...fell].sort((a, b) => a.change - b.change);

  let zoomDomain = beat.zoomDomain;
  if (zoomDomain === undefined) {
    const want = subjectRow.change * 3;
    const power = 10 ** Math.floor(Math.log10(want));
    const hi = NICE.map((n) => n * power).find((n) => n >= want - 1e-12);
    zoomDomain = [-5 * hi, hi];
  }
  if (!(Array.isArray(zoomDomain) && zoomDomain.length === 2 && zoomDomain[0] < 0 && zoomDomain[1] > subjectRow.change))
    throw new Error(`zoomDomain is ${JSON.stringify(beat.zoomDomain)}: card 4's close-up must run from below zero to above the subject's change (${subjectRow.change})`);
  if (!(zoomDomain[0] > lowest)) throw new Error(`the close-up (${zoomDomain.join(" to ")}) holds every fall: it must be narrower than the change axis, or card 4 changes nothing`);

  const topLevel = Math.max(...rows.flatMap((r) => [r.from, r.to]));
  const ticks = {
    level: beat.levelTicks ?? scaleLinear().domain([0, topLevel * 1.02]).ticks(4).filter((t) => t <= topLevel * 1.02),
    change: beat.changeTicks ?? scaleLinear().domain([lowest * 1.02, 0]).ticks(4).filter((t) => t >= lowest * 1.02 && t <= 0),
    zoom: beat.zoomTicks ?? [zoomDomain[0], zoomDomain[0] / 2, 0],
  };

  const readingOf = (r) => ({ name: r.name, label: r.label, code: r.code, from: r.from, to: r.to, change: r.change, isSubject: r === subjectRow });
  const subject = { ...readingOf(subjectRow), share: (subjectRow.change / subjectRow.from) * 100 };
  if (!(subjectRow.from > 0)) throw new Error(`${subjectRow.name}'s earlier level is 0: its rise has no base to be a share of`);
  const reading = Object.freeze({
    count: rows.length,
    from: String(beat.from),
    to: String(beat.to),
    rows: byChange.map(readingOf),
    byLevel: byLevel.map(readingOf),
    rose: rose.map(readingOf),
    fell: fell.map(readingOf),
    byFall: byFall.map(readingOf),
    subject,
    mean,
    beyondMean: beyondMean.map(readingOf),
    zoomDomain,
  });

  beat.check(reading);
  assertDrawsClaimColumn(rows.flatMap((r) => [r.from, r.to]), HERE);

  // ── the words, each passed through plain(); every number they state is checked ───────────────────
  const say = (field, value) => {
    const text = typeof value === "function" ? value(reading) : value;
    const parts = [text].flat();
    if (!parts.length || parts.some((p) => typeof p !== "string" || !p.trim())) throw new Error(`${field} must return a non-empty sentence (or an array of paragraphs); it returned ${JSON.stringify(text)}`);
    return parts.map(plain);
  };
  const level = (v) => plain(beat.formatLevel(v));
  const change = (v) => plain(beat.formatChange(Math.abs(v)));
  const prose = [...CARDS.slice(0, 5).map((k) => say(`cards.${k}`, beat.cards[k])), say("limits", [beat.limits].flat()[0])];

  // What each card is ABOUT, so it must say it: the figure its gesture puts on screen.
  const OWES = {
    levels: [["byLevel[0].from", level(byLevel[0].from)]],
    fall: [["fell.length", String(fell.length)]],
    swap: [],
    subject: [["subject.change", change(subject.change)]],
    mean: [["mean", change(mean)]],
  };
  const escape = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const states = (text, wanted) => new RegExp(`(?<![\\d.,])${escape(wanted)}(?![\\d])`).test(text);
  CARDS.slice(0, 5).forEach((k, i) => {
    const text = prose[i].join(" ");
    for (const [what, wanted] of OWES[k])
      if (!states(text, wanted)) throw new Error(`card ${i + 1} (cards.${k}) must state ${what} = "${wanted}" — the figure its picture shows; it says: ${text}`);
  });

  // Every other figure a card, a note or the alt states must be one this kit computed, at the
  // precision it is written with, sign aside ("lost 20,48 t" states a change of −20.48). A year
  // (1900–2100) and a figure glued to letters (CO2, 10e) pass.
  const known = [
    0, rows.length, rose.length, fell.length, beyondMean.length, mean, subject.share, ...zoomDomain,
    ...ticks.level, ...ticks.change, ...ticks.zoom,
    ...rows.flatMap((r) => [r.from, r.to, r.change]),
  ].map(Math.abs);
  const figure = /(?<![\p{L}\d.,])(\d{1,3}(?:[ .]\d{3})+(?:,\d+)?|\d+(?:,\d+)?)(?![\p{L}\d])/gu;
  const checkFigures = (where, text) => {
    for (const m of plain(text).matchAll(figure)) {
      const raw = m[1];
      const [whole, frac = ""] = raw.split(",");
      const n = Number(`${whole.replace(/[ .]/g, "")}.${frac || "0"}`);
      if (!frac && Number.isInteger(n) && n >= 1900 && n <= 2100) continue;
      const tolerance = 0.5 * 10 ** -frac.length + 1e-9;
      if (!known.some((v) => Math.abs(v - n) <= tolerance))
        throw new Error(`${where} states ${raw}, which no figure of these rows rounds to: every number in a card is computed — use the reading (r.subject.change, r.subject.share, r.mean, r.fell.length, r.byLevel[0].from, …) through formatLevel() / formatChange(), never a typed or recomputed value. It says: ${text}`);
    }
  };
  CARDS.slice(0, 5).forEach((k, i) => checkFigures(`card ${i + 1} (cards.${k})`, prose[i].join(" ")));

  // The header's words. The level unit names the year it shows ({year}); the counter climbs to the
  // falls it states ({n}).
  const levelUnit = plain(beat.levelUnit("{year}"));
  if (!levelUnit.includes("{year}")) throw new Error(`levelUnit(year) must write the year it is given ("tonnes per person, " + year); it returned ${levelUnit}`);
  const changeUnit = say("changeUnit", beat.changeUnit).join(" ");
  const fellSentence = plain(beat.fellCount(reading));
  if (!states(fellSentence, String(fell.length))) throw new Error(`fellCount() is card 2's counter, which climbs to the number of rows that fell: it must state "${fell.length}"; it says: ${fellSentence}`);
  const fellTemplate = fellSentence.replace(new RegExp(`(?<![\\d.,])${fell.length}(?![\\d])`), "{n}");
  const note = plain(beat.subjectNote(reading));
  if (!states(note, change(subject.change))) throw new Error(`subjectNote() is written in card 4: it must state the subject's change "${change(subject.change)}"; it says: ${note}`);
  const meanNote = plain(beat.meanNote(reading));
  if (!states(meanNote, change(mean))) throw new Error(`meanNote() is written with card 5's rule: it must state the mean of the falls "${change(mean)}"; it says: ${meanNote}`);
  for (const [where, text] of [["levelUnit", levelUnit.replace("{year}", "")], ["changeUnit", changeUnit], ["fellCount", fellSentence], ["subjectNote", note], ["meanNote", meanNote]]) checkFigures(where, text);

  const titleForms = [beat.title].flat().map(plain);
  // The title may state the counts the gestures draw (the rises, the falls) beside the values.
  assertHeadlineNumbersDrawn(titleForms[0], [...rows.flatMap((r) => [r.from, r.to, r.change]), rows.length, rose.length, fell.length], "rows");

  const eyebrow = plain(beat.eyebrow);
  const source = plain(beat.source);
  const alt = plain(typeof beat.alt === "function" ? beat.alt(reading) : beat.alt);
  checkFigures("alt", alt);
  const words = { levelUnit, changeUnit, fell: { template: fellTemplate, value: fell.length }, note, meanNote };

  const textPerRegister = {
    display: titleForms.join(" "),
    eyebrow,
    body: `${prose.flat().join(" ")} ${source}`,
    axis: `${rows.map((r) => r.label).join(" ")} ${levelUnit} ${changeUnit} ${beat.from} ${beat.to} 0123456789,+−`,
    annot: "",
    value: `${fellTemplate} ${note} ${meanNote} 0123456789`,
  };

  const driver = readFileSync(join(HERE, "diverging-drive.mjs"), "utf8");
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
          element: createElement(DirectedDivergingScrolly, {
            rows: rows.map((r) => ({ code: r.code, name: r.label, from: r.from, to: r.to, change: r.change })),
            years: [String(beat.from), String(beat.to)],
            subject: subjectRow.code,
            mean,
            zoomDomain,
            ticks,
            words,
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
          apply: "applyDivergingState",
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
