// The generic half of a stacked-bar SCROLLY beat, taken from
// proof/scrolly-stacked-bar-lowcarbon-growth/render-directions-scrolly.mjs with everything about ITS
// subject removed. The choreography is the worked example's and is not the model's to change — six
// cards, one continuous interpolation driven by the reader's scroll (stacked-drive.mjs, verbatim):
//
//   1 level    the earlier level of each drawn row, ordered by that level;
//   2 grow     what each added grows onto its level, the totals written;
//   3 sort     the rows travel to the order of what they added;
//   4 detach   the levels leave, the additions slide onto one start line, the scale fitted to them;
//   5 pair     the pair (the one that added more, the one it out-added) alone, the rest stepping back;
//   6 reading  the stack in growth order stands; the card states the limits.
//
// A stack is [level, growth]: every growth is zero or more.
//
// This file computes every figure the cards may state (the drawn rows, both orders, the pair's
// levels, additions, totals and ratios, ranks) and checks the words against them; ./beat.mjs — the one
// file the model writes — gives the rows and the WORDS of each card. Copied into the beat by the
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
import { DirectedStackedScrolly } from "./DirectedStackedScrolly.tsx";
import { applyStoryboard, assertNumbers, assertLegibleLabels, assertHeadlineNumbersDrawn, assertDrawsClaimColumn } from "./guards.mjs";
import { plain, refusing, storyLanguage } from "./web.mjs";
import { renderBeatScrolly, scrollySkill } from "./scrolly.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));

/** The cards, in the drive's order: the runner's own ids (never the model's words in an id). */
const CARDS = ["level", "grow", "sort", "detach", "pair", "reading"];
/** One state per card; see stacked-drive.mjs for what each field paints. The worked example's, verbatim. */
const STATES = [
  { grow: 0, sort: 0, detach: 0, pair: 0, note: 0 },
  { grow: 1, sort: 0, detach: 0, pair: 0, note: 1 },
  { grow: 1, sort: 1, detach: 0, pair: 0, note: 2 },
  { grow: 1, sort: 1, detach: 1, pair: 0, note: 3 },
  { grow: 1, sort: 1, detach: 0, pair: 1, note: 4 },
  { grow: 1, sort: 1, detach: 0, pair: 0, note: 5 },
];
/** The component's header-note slots (its NOTES), one per card, in the same order. */
const NOTE_SLOTS = ["levelNote", "totalNote", "sortNote", "addNote", "pairNote", "unitNote"];

await refusing(HERE, async () => {
  const { default: beat } = await import("./beat.mjs");
  applyStoryboard(beat, HERE);
  const { renderScrolly } = await import(scrollySkill(HERE, "scripts", "render-scrolly.mjs"));

  const REQUIRED = ["eyebrow", "rows", "highlight", "segments", "format", "cards", "notes", "title", "limits", "source", "alt", "check"];
  const missing = REQUIRED.filter((key) => beat[key] === undefined);
  if (missing.length) throw new Error(`beat.mjs is missing ${missing.join(", ")}: give each as a field of the default export (export default { …, ${missing[0]}: … }), not as a separate export (see CONTRACT.md)`);
  for (const fn of ["format", "check"])
    if (typeof beat[fn] !== "function") throw new Error(`beat.mjs: ${fn} must be a function (see CONTRACT.md)`);
  for (const [group, keys] of [["cards", CARDS.slice(0, 5)], ["notes", CARDS]]) {
    const absent = keys.filter((k) => typeof beat[group]?.[k] !== "function");
    if (absent.length) throw new Error(`beat.mjs: ${group} must give a function for each of ${keys.join(", ")}; missing or not a function: ${absent.join(", ")} (see CONTRACT.md)`);
  }
  if (!(beat.segments && typeof beat.segments.level === "string" && typeof beat.segments.growth === "string"))
    throw new Error(`segments must be { level, growth }: the two segment names printed in the key ("produced in 2000", "added since")`);

  // ── the rows: every member, so "of how many" is the whole list ───────────────────────────────────
  if (!Array.isArray(beat.rows)) throw new Error(`rows must be an array of { name, level, growth }, one per member`);
  const all = beat.rows.map((r) => ({ name: String(r.name), level: r.level, growth: r.growth }));
  assertNumbers(all.flatMap((r) => [[`${r.name}.level`, r.level], [`${r.name}.growth`, r.growth]]), "rows");
  if (new Set(all.map((r) => r.name)).size !== all.length) throw new Error(`rows holds the same name twice: give each member ONE row`);
  const shrank = all.filter((r) => r.growth < 0 || r.level < 0);
  if (shrank.length)
    throw new Error(`${shrank.map((r) => r.name).join(", ")} has a negative level or growth: the stack is [level, growth] laid from zero, so a negative segment belongs to a different form (a diverging bar, a waterfall)`);
  for (const r of all) r.total = r.level + r.growth;
  all.sort((a, b) => b.growth - a.growth);
  const DRAWN = Math.min(beat.drawCount ?? 12, all.length);
  if (!(Number.isInteger(DRAWN) && DRAWN >= 4 && DRAWN <= 16)) throw new Error(`drawCount is ${beat.drawCount} (and rows has ${all.length}): draw between 4 and 16 rows`);
  const shown = all.slice(0, DRAWN);

  const names = [beat.highlight].flat().map(String);
  if (names.length !== 2) throw new Error(`highlight names ${names.length} row(s): card 5 isolates ONE PAIR — the row that added more and the one it out-added. Name exactly two`);
  const absent = names.filter((n) => !shown.some((r) => r.name === n));
  if (absent.length) throw new Error(`${absent.join(", ")} ${absent.length > 1 ? "are" : "is"} not among the ${DRAWN} rows that added the most (or not a row's name): raise drawCount, or check the names`);
  const [h0, h1] = names.map((n) => shown.find((r) => r.name === n));
  const adder = h0.growth >= h1.growth ? h0 : h1;
  const incumbent = adder === h0 ? h1 : h0;
  if (!(adder.growth > incumbent.growth)) throw new Error(`${adder.name} and ${incumbent.name} added the same: card 5 compares what one added against the other`);
  if (!(adder.level > 0)) throw new Error(`${adder.name} starts at 0: card 5 compares the two starting levels, a ratio to zero means nothing`);
  const byLevel = [...shown].sort((a, b) => b.level - a.level);
  const levelRank = (r) => byLevel.indexOf(r) + 1;
  const growthRank = (r) => shown.indexOf(r) + 1;
  const totalRank = (r) => [...all].sort((a, b) => b.total - a.total).indexOf(r) + 1;
  const view = (r) => ({ name: r.name, level: r.level, growth: r.growth, total: r.total, growthRank: growthRank(r), levelRank: levelRank(r), totalRank: totalRank(r) });
  const largestTotal = all.reduce((a, b) => (b.total > a.total ? b : a));
  const reading = {
    count: all.length,
    drawCount: DRAWN,
    rows: shown.map(view),
    byLevel: byLevel.map(view),
    levelLeader: view(byLevel[0]),
    growthLeader: view(shown[0]),
    largestTotal: view(largestTotal),
    adder: view(adder),
    incumbent: view(incumbent),
    headStart: incumbent.level / adder.level,
    ratio: incumbent.growth > 0 ? adder.growth / incumbent.growth : null,
    drawnGrowth: shown.reduce((s, r) => s + r.growth, 0),
  };
  Object.freeze(reading);

  assertLegibleLabels(shown.flatMap((r) => [r.level, r.growth]), beat.format);
  beat.check(reading);
  assertDrawsClaimColumn(shown.flatMap((r) => [r.level, r.growth, r.total]), HERE);

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

  // What each card is ABOUT, so it must say it: the figure its gesture puts on screen. Card 3's rank is
  // often spelled ("seventh"), so check(r) holds it rather than this table.
  const OWES = {
    level: [["levelLeader.level", format(byLevel[0].level)]],
    grow: [],
    sort: [],
    detach: [["adder.growth", format(adder.growth)], ["incumbent.growth", format(incumbent.growth)]],
    pair: [["incumbent.total", format(incumbent.total)]],
  };
  const escape = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  CARDS.slice(0, 5).forEach((k, i) => {
    const text = prose[i].join(" ");
    for (const [what, wanted] of OWES[k])
      if (!new RegExp(`(?<![\\d.,])${escape(wanted)}(?![\\d])`).test(text))
        throw new Error(`card ${i + 1} (cards.${k}) must state ${what} = "${wanted}" — the figure its picture shows; it says: ${text}`);
  });

  // Every other figure a card, a note or the alt text states must be one this kit computed, at the
  // precision it is written with. A year (1900–2100) and a figure glued to letters (CO2, 10e) pass.
  // The decimal mark is read off the beat's own format(1.5); a format that prints whole numbers says
  // nothing, so the story's language decides (a "2,4" in a card is then read as 2.4, not as 2 and 4).
  const sample = plain(beat.format(1.5));
  const langOf = beat.lang ?? storyLanguage(HERE) ?? "en";
  const decimal = /,/.test(sample) ? "," : /\./.test(sample) ? "." : /,/.test(new Intl.NumberFormat(langOf).format(1.5)) ? "," : ".";
  const group = decimal === "," ? "[ .]" : "[ ,]";
  const known = [
    all.length, DRAWN, reading.headStart, reading.ratio, reading.drawnGrowth,
    ...[adder, incumbent].flatMap((r) => [growthRank(r), levelRank(r), totalRank(r)]),
    ...shown.flatMap((r) => [r.level, r.growth, r.total]),
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
        throw new Error(`${where} states ${raw}, which no figure of these rows rounds to: every number in a card is computed — use the reading (r.adder.growth, r.incumbent.total, r.headStart, r.ratio, …) through format(), never a typed or recomputed value. It says: ${text}`);
    }
  };
  CARDS.slice(0, 5).forEach((k, i) => checkFigures(`card ${i + 1} (cards.${k})`, prose[i].join(" ")));
  CARDS.forEach((k, i) => checkFigures(`notes.${k}`, notes[NOTE_SLOTS[i]]));

  const titleForms = [beat.title].flat().map(plain);
  assertHeadlineNumbersDrawn(titleForms[0], shown.flatMap((r) => [r.level, r.growth, r.total]), "rows");

  const eyebrow = plain(beat.eyebrow);
  const source = plain(beat.source);
  const alt = plain(typeof beat.alt === "function" ? beat.alt(reading) : beat.alt);
  checkFigures("alt", alt);
  // The runner's own keys (r1…rN), never the model's names in a selector.
  const rows = shown.map((r, i) => ({
    key: `r${i + 1}`,
    label: plain(r.name),
    level: r.level,
    growth: r.growth,
    total: r.total,
    levelText: format(r.level),
    growthText: format(r.growth),
    totalText: format(r.total),
    pair: r === adder || r === incumbent,
  }));
  const orders = [byLevel.map((r) => shown.indexOf(r)), shown.map((_, i) => i)];
  const words = { levelKey: plain(beat.segments.level), growthKey: plain(beat.segments.growth), ...notes };

  const textPerRegister = {
    display: titleForms.join(" "),
    eyebrow,
    body: `${prose.flat().join(" ")} ${source}`,
    axis: "",
    annot: `${rows.map((r) => `${r.label} ${r.levelText} + ${r.growthText}`).join(" ")} ${words.levelKey} ${words.growthKey}`,
    value: `${rows.map((r) => r.totalText).join(" ")} ${Object.values(notes).join(" ")}`,
  };

  const driver = readFileSync(join(HERE, "stacked-drive.mjs"), "utf8");
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
          element: createElement(DirectedStackedScrolly, { rows, orders, words, alt, regs, ground: direction.ground, accent: direction.accent, ink, muted }),
          states: STATES,
          driver,
          apply: "applyStackedState",
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
