// The generic half of a grouped-bar SCROLLY beat, taken from
// proof/scrolly-wind-vs-solar/render-directions-scrolly.mjs with everything about ITS subject removed.
// The choreography is the worked example's and is not the model's to change — six cards, one
// continuous interpolation driven by the reader's scroll (windsolar-drive.mjs, verbatim):
//
//   1 first     the first series alone, one bar per group, values written;
//   2 second    the second series growing beside it;
//   3 gap       every pair collapsed into its gap, first minus second, either side of zero, in the
//               colour of the series that leads;
//   4 sort      the groups travelling from their own order to the order of their gap;
//   5 earlier   the earlier gap drawn as a dashed ghost behind each bar, its value written;
//   6 reading   the pairs stand again, in gap order; the card states the accounting (the limits).
//
// This file computes every figure the cards may state (the gaps, their order, the earlier gaps, the
// ratio between the subject's two gaps) and checks the words against them; ./beat.mjs — the one file
// the model writes — gives the data and the WORDS of each card. Copied into the beat by the harness;
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
import { DirectedWindSolarScrolly } from "./DirectedWindSolarScrolly.tsx";
import { applyStoryboard, assertNumbers, assertLegibleLabels, assertHeadlineNumbersDrawn, assertDrawsClaimColumn } from "./guards.mjs";
import { plain, refusing, storyLanguage } from "./web.mjs";
import { renderBeatScrolly, scrollySkill } from "./scrolly.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));

/** The cards, in the drive's order: the runner's own ids (never the model's words in an id). */
const CARDS = ["first", "second", "gap", "sort", "earlier", "reading"];
/** One state per card; see windsolar-drive.mjs for what each field paints. The worked example's, verbatim. */
const STATES = [
  { wind: 1, solar: 0, gap: 0, sort: 0, ghost: 0, note: 0 },
  { wind: 1, solar: 1, gap: 0, sort: 0, ghost: 0, note: 1 },
  { wind: 1, solar: 1, gap: 1, sort: 0, ghost: 0, note: 2 },
  { wind: 1, solar: 1, gap: 1, sort: 1, ghost: 0, note: 3 },
  { wind: 1, solar: 1, gap: 1, sort: 1, ghost: 1, note: 4 },
  { wind: 1, solar: 1, gap: 0, sort: 1, ghost: 0, note: 5 },
];
/** The component's header-note slots, one per card, in the same order. */
const NOTE_SLOTS = ["windNote", "solarNote", "gapNote", "sortNote", "ghostNote", "readNote"];

await refusing(HERE, async () => {
  const { default: beat } = await import("./beat.mjs");
  applyStoryboard(beat, HERE);
  const { renderScrolly } = await import(scrollySkill(HERE, "scripts", "render-scrolly.mjs"));

  const REQUIRED = ["eyebrow", "groups", "firstName", "secondName", "firstLeads", "secondLeads", "subject", "format", "signed", "cards", "notes", "title", "limits", "source", "alt", "check"];
  const missing = REQUIRED.filter((key) => beat[key] === undefined);
  if (missing.length) throw new Error(`beat.mjs is missing ${missing.join(", ")}: give each as a field of the default export (export default { …, ${missing[0]}: … }), not as a separate export (see CONTRACT.md)`);
  for (const fn of ["format", "signed", "check"])
    if (typeof beat[fn] !== "function") throw new Error(`beat.mjs: ${fn} must be a function (see CONTRACT.md)`);
  for (const group of ["cards", "notes"]) {
    const keys = group === "cards" ? CARDS.slice(0, 5) : CARDS;
    const absent = keys.filter((k) => typeof beat[group]?.[k] !== "function");
    if (absent.length) throw new Error(`beat.mjs: ${group} must give a function for each of ${keys.join(", ")}; missing or not a function: ${absent.join(", ")} (see CONTRACT.md)`);
  }

  // ── the groups (the static kit's refusals) ──────────────────────────────────────────────────────
  const groups = beat.groups;
  if (!Array.isArray(groups) || groups.length < 2 || groups.length > 12) throw new Error(`groups holds ${groups?.length ?? 0} group(s): a grouped bar compares 2 to 12`);
  assertNumbers(groups.flatMap((g) => [[`${g.name} first`, g.first], [`${g.name} second`, g.second], [`${g.name} earlierFirst`, g.earlierFirst], [`${g.name} earlierSecond`, g.earlierSecond]]));
  const negative = groups.flatMap((g) => ["first", "second", "earlierFirst", "earlierSecond"].filter((k) => g[k] < 0).map((k) => `${g.name} ${k} ${g[k]}`));
  if (negative.length) throw new Error(`a grouped bar draws lengths from zero, and these values are negative: ${negative.slice(0, 3).join(", ")}. A change that can fall below zero belongs to a diverging bar`);
  const names = new Set(groups.map((g) => String(g.name)));
  if (names.size !== groups.length) throw new Error(`two groups share a name; one group per category, filtered to one period`);
  if (!names.has(String(beat.subject))) throw new Error(`subject "${beat.subject}" is not the name of a group; the names are ${[...names].join(", ")}`);
  if (beat.firstName === beat.secondName) throw new Error(`firstName and secondName are both "${beat.firstName}": the two series need two names`);
  if (Math.max(...groups.flatMap((g) => [g.first, g.second])) <= 0) throw new Error(`every value is zero: there is nothing to draw`);

  // ── the readings: the gaps, their order, the earlier gaps ──────────────────────────────────────
  const rank = (list, key) => (g) => 1 + list.filter((o) => o[key] > g[key]).length;
  const base = groups.map((g, index) => ({
    name: String(g.name),
    index,
    first: g.first,
    second: g.second,
    gap: g.first - g.second,
    earlierFirst: g.earlierFirst,
    earlierSecond: g.earlierSecond,
    earlierGap: g.earlierFirst - g.earlierSecond,
    isSubject: String(g.name) === String(beat.subject),
  }));
  const readings = base.map((g) => Object.freeze({
    ...g,
    firstRank: rank(base, "first")(g),
    secondRank: rank(base, "second")(g),
    gapRank: rank(base, "gap")(g),
    widened: g.earlierGap !== 0 ? g.gap / g.earlierGap : null,
  }));
  const byGap = [...readings].sort((a, b) => b.gap - a.gap);
  const subject = readings.find((g) => g.isSubject);
  const reading = Object.freeze({
    count: readings.length,
    groups: readings,
    byGap,
    subject,
    leader: byGap[0],
    trailer: byGap.at(-1),
    topFirst: readings.reduce((a, b) => (b.first > a.first ? b : a)),
    topSecond: readings.reduce((a, b) => (b.second > a.second ? b : a)),
    firstLeading: readings.filter((g) => g.first > g.second),
    secondLeading: readings.filter((g) => g.second > g.first),
    widened: subject.widened,
  });

  assertLegibleLabels(readings.flatMap((g) => [g.first, g.second]), beat.format);
  beat.check(reading);
  assertDrawsClaimColumn(readings.flatMap((g) => [g.first, g.second]), HERE);

  // ── the words, each passed through plain(); every number they state is checked ───────────────────
  const say = (field, value) => {
    const text = typeof value === "function" ? value(reading) : value;
    const parts = [text].flat();
    if (!parts.length || parts.some((p) => typeof p !== "string" || !p.trim())) throw new Error(`${field} must return a non-empty sentence (or an array of paragraphs); it returned ${JSON.stringify(text)}`);
    return parts.map(plain);
  };
  const format = (v) => plain(beat.format(v));
  const signed = (v) => plain(beat.signed(v));
  const prose = [...CARDS.slice(0, 5).map((k) => say(`cards.${k}`, beat.cards[k])), say("limits", [beat.limits].flat()[0])];
  const notes = Object.fromEntries(CARDS.map((k, i) => [NOTE_SLOTS[i], say(`notes.${k}`, beat.notes[k]).join(" ")]));

  // What each card is ABOUT, so it must say it: the figure its gesture puts on screen. A gap is
  // looked for unsigned (format of its size), so either sign mark passes.
  const OWES = {
    first: [["subject.first", format(subject.first)]],
    second: [["subject.second", format(subject.second)]],
    gap: [["subject.gap", format(Math.abs(subject.gap))]],
    sort: [["leader.gap", format(Math.abs(reading.leader.gap))]],
    earlier: [["subject.earlierGap", format(Math.abs(subject.earlierGap))]],
  };
  const escape = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  CARDS.slice(0, 5).forEach((k, i) => {
    const text = prose[i].join(" ");
    for (const [what, wanted] of OWES[k])
      if (!new RegExp(`(?<![\\d.,])${escape(wanted)}(?![\\d])`).test(text))
        throw new Error(`card ${i + 1} (cards.${k}) must state ${what} = "${wanted}" — the figure its picture shows; it says: ${text}`);
  });

  // Every other figure a card, a note or the alt states must be one this kit computed, at the
  // precision it is written with, sign aside. A year (1900–2100) and a figure glued to letters pass.
  // The decimal mark the words use: read off format(1.5), or — when format prints whole numbers — the language.
  const sample = plain(beat.format(1.5));
  const decimal = /\d,\d/.test(sample) ? "," : /\d\.\d/.test(sample) ? "." : /,/.test(new Intl.NumberFormat(beat.lang ?? storyLanguage(HERE) ?? "en").format(1.5)) ? "," : ".";
  const group = decimal === "," ? "[ .]" : "[ ,]";
  const known = [
    reading.count, reading.firstLeading.length, reading.secondLeading.length,
    ...readings.flatMap((g) => [g.first, g.second, g.gap, g.earlierFirst, g.earlierSecond, g.earlierGap, g.widened ?? 0]),
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
        throw new Error(`${where} states ${raw}, which no figure of these groups rounds to: every number in a card is computed — use the reading (r.subject.first, r.subject.gap, r.leader.gap, r.subject.earlierGap, r.widened, …) through format() or signed(), never a typed or recomputed value. It says: ${text}`);
    }
  };
  CARDS.slice(0, 5).forEach((k, i) => checkFigures(`card ${i + 1} (cards.${k})`, prose[i].join(" ")));
  CARDS.forEach((k, i) => checkFigures(`notes.${k}`, notes[NOTE_SLOTS[i]]));

  const titleForms = [beat.title].flat().map(plain);
  // The title may count the groups where one series leads ("in 5 of these 6 countries"): counts the
  // gap picture shows, beside the values.
  assertHeadlineNumbersDrawn(titleForms[0], [...readings.flatMap((g) => [g.first, g.second]), reading.count, reading.firstLeading.length, reading.secondLeading.length], "groups");

  const eyebrow = plain(beat.eyebrow);
  const source = plain(beat.source);
  const alt = plain(typeof beat.alt === "function" ? beat.alt(reading) : beat.alt);
  checkFigures("alt", alt);

  // The component's groups: the runner's own keys (the drive writes them into a selector unescaped).
  const shaped = readings.map((g) => ({
    key: `g${g.index}`,
    label: plain(g.name),
    wind: g.first,
    solar: g.second,
    before: g.earlierGap,
    windText: format(g.first),
    solarText: format(g.second),
    gapText: signed(g.gap),
    beforeText: signed(g.earlierGap),
    exception: g.isSubject,
  }));
  const lang = beat.lang ?? storyLanguage(HERE) ?? "en";
  const own = beat.declaredSequence ? readings.map((g) => g.index) : [...readings].sort((a, b) => a.name.localeCompare(b.name, lang)).map((g) => g.index);
  const orders = [own, byGap.map((g) => g.index)];
  const words = {
    wind: plain(beat.firstName),
    solar: plain(beat.secondName),
    windAhead: plain(beat.firstLeads),
    solarAhead: plain(beat.secondLeads),
    ...notes,
  };

  const textPerRegister = {
    display: titleForms.join(" "),
    eyebrow,
    body: `${prose.flat().join(" ")} ${source}`,
    axis: `${words.windAhead} ${words.solarAhead} ${shaped.map((g) => g.beforeText).join(" ")}`,
    annot: `${words.wind} ${words.solar} ${shaped.map((g) => g.label).join(" ")}`,
    value: `${shaped.map((g) => `${g.windText} ${g.solarText} ${g.gapText}`).join(" ")} ${Object.values(notes).join(" ")}`,
  };

  const driver = readFileSync(join(HERE, "windsolar-drive.mjs"), "utf8");
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
          element: createElement(DirectedWindSolarScrolly, { groups: shaped, orders, words, alt, regs, ground: direction.ground, accent: direction.accent, ink, muted, grid }),
          states: STATES,
          driver,
          apply: "applyWindSolarState",
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
