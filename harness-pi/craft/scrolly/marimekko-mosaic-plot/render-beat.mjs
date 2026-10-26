// The generic half of a marimekko SCROLLY beat, taken from
// proof/scrolly-marimekko-electricity-mix/render-directions-scrolly.mjs with everything about ITS
// subject removed. The choreography is the worked example's and is not the model's to change — six
// cards, one continuous interpolation driven by the reader's scroll (marimekko-drive.mjs, verbatim):
//
//   1 mix      equal columns, each 100 %, the bands stacked bottom to top in `bandOrder`;
//   2 width    each column takes the width of its total: an area becomes a quantity;
//   3 tracked  the tracked band alone, the others stepping back;
//   4 stack    the tracked bands gathered into one column of their own, area kept;
//   5 bands    back in their columns, every band named;
//   6 reading  the shares written in; the card states the accounting (the limits).
//
// This file computes every figure the cards may state (the totals, the tracked band's total and
// share, who holds it) and checks the words against them; ./beat.mjs — the one file the model writes
// — gives the columns and the WORDS of each card. Copied into the beat by the harness; never edited
// by the model.
//
// Usage:  bun <beat>/render-beat.mjs
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createElement } from "react";
import { deriveFurniture } from "#shared/chart-beat/render-still.mjs";
import { webRegisters } from "#shared/design-base/web.mjs";
import { EYEBROW_TO_DISPLAY, gapOf, registerOf } from "#shared/design-base/register.mjs";
import { DirectedMarimekkoScrolly } from "./DirectedMarimekkoScrolly.tsx";
import { applyStoryboard, assertNumbers, assertHeadlineNumbersDrawn, assertDrawsClaimColumn } from "./guards.mjs";
import { plain, refusing, storyLanguage } from "./web.mjs";
import { renderBeatScrolly, scrollySkill } from "./scrolly.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));

/** The cards, in the drive's order: the runner's own ids (never the model's words in an id). */
const CARDS = ["mix", "width", "tracked", "stack", "bands", "reading"];
/** One state per card; see marimekko-drive.mjs for what each field paints. The worked example's, verbatim. */
const STATES = [
  { width: 0, tracked: 0, stack: 0, labels: 1, pct: 0 },
  { width: 1, tracked: 0, stack: 0, labels: 1, pct: 0 },
  { width: 1, tracked: 1, stack: 0, labels: 1, pct: 0 },
  { width: 1, tracked: 1, stack: 1, labels: 0, pct: 0 },
  { width: 1, tracked: 0, stack: 0, labels: 1, pct: 0 },
  { width: 1, tracked: 0, stack: 0, labels: 1, pct: 1 },
];
/** The header notes: shown on card 2 (and 6), card 3, card 4. */
const NOTE_KEYS = [["grand", "grandNote"], ["tracked", "trackedNote"], ["stack", "stackNote"]];

await refusing(HERE, async () => {
  const { default: beat } = await import("./beat.mjs");
  applyStoryboard(beat, HERE);
  const { renderScrolly } = await import(scrollySkill(HERE, "scripts", "render-scrolly.mjs"));

  const REQUIRED = ["eyebrow", "columns", "bandOrder", "tracked", "heightName", "widthName", "format", "cards", "notes", "stackLabel", "title", "limits", "source", "alt", "check"];
  const missing = REQUIRED.filter((key) => beat[key] === undefined);
  if (missing.length) throw new Error(`beat.mjs is missing ${missing.join(", ")}: give each as a field of the default export (export default { …, ${missing[0]}: … }), not as a separate export (see CONTRACT.md)`);
  for (const fn of ["format", "stackLabel", "check"])
    if (typeof beat[fn] !== "function") throw new Error(`beat.mjs: ${fn} must be a function (see CONTRACT.md)`);
  if (beat.percent !== undefined && typeof beat.percent !== "function") throw new Error(`beat.mjs: percent must be a function (see CONTRACT.md)`);
  for (const [group, keys] of [["cards", CARDS.slice(0, 5)], ["notes", NOTE_KEYS.map(([k]) => k)]]) {
    const absent = keys.filter((k) => typeof beat[group]?.[k] !== "function");
    if (absent.length) throw new Error(`beat.mjs: ${group} must give a function for each of ${keys.join(", ")}; missing or not a function: ${absent.join(", ")} (see CONTRACT.md)`);
  }

  // ── the bands and the columns (the static kit's refusals) ───────────────────────────────────────
  const order = beat.bandOrder;
  if (!Array.isArray(order) || order.length < 2 || order.length > 10)
    throw new Error(`bandOrder holds ${order?.length ?? 0} bands; a marimekko stacks 2 to 10. Add the smallest bands of one family together (and name the merged band so)`);
  if (new Set(order.map((b) => String(b.key))).size !== order.length) throw new Error(`two bands in bandOrder share a key`);
  const trackedAt = order.findIndex((b) => String(b.key) === String(beat.tracked));
  if (trackedAt < 0) throw new Error(`tracked ${JSON.stringify(beat.tracked)} is not the key of a band in bandOrder (${order.map((b) => b.key).join(", ")})`);
  if (!Array.isArray(beat.columns) || beat.columns.length < 2 || beat.columns.length > 8)
    throw new Error(`columns holds ${beat.columns?.length ?? 0} entities; a marimekko draws 2 to 8 columns. Group the smallest into one named column, or choose a stacked bar`);
  if (new Set(beat.columns.map((c) => String(c.key))).size !== beat.columns.length) throw new Error(`two columns share a key; one column per entity`);
  for (const c of beat.columns) {
    const absent = order.filter((b) => c.values?.[b.key] === undefined);
    if (absent.length) throw new Error(`column ${c.key} has no value for ${absent.map((b) => b.key).join(", ")}: every column carries every band (0 where there is none)`);
  }
  assertNumbers(beat.columns.flatMap((c) => order.map((b) => [`${c.key} ${b.key}`, c.values[b.key]])));
  const negative = beat.columns.flatMap((c) => order.filter((b) => c.values[b.key] < 0).map((b) => `${c.key} ${b.key}`));
  if (negative.length) throw new Error(`${negative.slice(0, 3).join(", ")} are negative: a band's area is a quantity and cannot be below zero`);

  // ── the readings ────────────────────────────────────────────────────────────────────────────────
  const built = beat.columns.map((c, index) => {
    const total = order.reduce((s, b) => s + c.values[b.key], 0);
    return { key: String(c.key), label: plain(c.label), index, total, values: { ...c.values }, trackedValue: c.values[beat.tracked] };
  });
  const empty = built.filter((c) => !(c.total > 0));
  if (empty.length) throw new Error(`${empty.map((c) => c.key).join(", ")} total 0: a column with no width cannot be drawn — leave it out and say so in limits`);
  const grand = built.reduce((s, c) => s + c.total, 0);
  const smallest = built.reduce((a, b) => (b.total < a.total ? b : a));
  if (smallest.total / grand < 0.03)
    throw new Error(`${smallest.label} is ${((smallest.total / grand) * 100).toFixed(1)} % of the whole, a sliver too narrow to encode its width: put the smallest columns together in one column named for all of them (say so in the limits), or leave them out`);
  // Drawn widest first, as the worked example draws them.
  const columns = [...built].sort((a, b) => b.total - a.total).map((c) => Object.freeze({ ...c, trackedShare: (c.trackedValue / c.total) * 100 }));
  const trackedTotal = columns.reduce((s, c) => s + c.trackedValue, 0);
  if (!(trackedTotal > 0)) throw new Error(`the tracked band ${beat.tracked} is 0 in every column: cards 3 and 4 show it alone and gathered, so it would show nothing`);
  const holders = [...columns].sort((a, b) => b.trackedValue - a.trackedValue).map((c) => Object.freeze({ key: c.key, label: c.label, value: c.trackedValue, share: (c.trackedValue / trackedTotal) * 100 }));
  const reading = Object.freeze({
    count: columns.length,
    columns,
    grand,
    largest: columns[0],
    smallest: columns.at(-1),
    trackedTotal,
    trackedShare: trackedTotal / grand,
    trackedPercent: (trackedTotal / grand) * 100,
    holders,
    topTwoShare: ((holders[0].value + holders[1].value) / trackedTotal) * 100,
    bands: order.map((b) => Object.freeze({ key: String(b.key), label: plain(b.label) })),
    trackedBand: Object.freeze({ key: String(order[trackedAt].key), label: plain(order[trackedAt].label) }),
  });

  beat.check(reading);
  assertDrawsClaimColumn(columns.flatMap((c) => order.map((b) => c.values[b.key])), HERE);

  // ── the words, each passed through plain(); every number they state is checked ───────────────────
  const say = (field, value) => {
    const text = typeof value === "function" ? value(reading) : value;
    const parts = [text].flat();
    if (!parts.length || parts.some((p) => typeof p !== "string" || !p.trim())) throw new Error(`${field} must return a non-empty sentence (or an array of paragraphs); it returned ${JSON.stringify(text)}`);
    return parts.map(plain);
  };
  const format = (v) => plain(beat.format(v));
  // The decimal mark the words use: read off format(1.5), or — when format prints whole numbers — the language.
  const sample = plain(beat.format(1.5));
  const decimal = /\d,\d/.test(sample) ? "," : /\d\.\d/.test(sample) ? "." : /,/.test(new Intl.NumberFormat(beat.lang ?? storyLanguage(HERE) ?? "en").format(1.5)) ? "," : ".";
  // A cell's share: whole per cent from 9.5 %, one decimal from 0.5 %, nothing under (the static rule).
  const percent = (share) => plain(beat.percent ? beat.percent(share) : share >= 0.095 ? `${Math.round(share * 100)} %` : share >= 0.005 ? `${String(Math.round(share * 1000) / 10).replace(".", decimal)} %` : "");
  const prose = [...CARDS.slice(0, 5).map((k) => say(`cards.${k}`, beat.cards[k])), say("limits", [beat.limits].flat()[0])];
  const cardText = prose.map((p) => p.join(" "));
  const notes = Object.fromEntries(NOTE_KEYS.map(([k, slot]) => [slot, say(`notes.${k}`, beat.notes[k]).join(" ")]));
  const stackLabel = say("stackLabel", beat.stackLabel).join(" ");

  // What each card is ABOUT, so it must say it.
  const escape = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const has = (text, wanted) => new RegExp(`(?<![\\d.,])${escape(wanted)}(?![\\d])`).test(text);
  const named = (text, label) => text.toLocaleLowerCase().includes(label.toLocaleLowerCase());
  const owe = (i, ok, what) => {
    if (!ok) throw new Error(`card ${i + 1} (cards.${CARDS[i]}) must state ${what}; it says: ${cardText[i]}`);
  };
  owe(0, named(cardText[0], reading.bands[0].label) && named(cardText[0], reading.bands.at(-1).label), `the bottom band and the top band, "${reading.bands[0].label}" and "${reading.bands.at(-1).label}" — the order its columns stack`);
  owe(1, has(cardText[1], format(reading.largest.total)) && has(cardText[1], format(reading.smallest.total)) && named(cardText[1], reading.largest.label) && named(cardText[1], reading.smallest.label),
    `the widest and the narrowest column with their totals, ${reading.largest.label} "${format(reading.largest.total)}" and ${reading.smallest.label} "${format(reading.smallest.total)}"`);
  owe(2, named(cardText[2], reading.trackedBand.label) && has(cardText[2], String(Math.round(reading.trackedPercent))), `the tracked band, "${reading.trackedBand.label}", and its share of the whole, ${Math.round(reading.trackedPercent)} (r.trackedPercent)`);
  owe(3, named(cardText[3], holders[0].label) && named(cardText[3], holders[1].label), `the two columns that hold most of the tracked band, ${holders[0].label} and ${holders[1].label} (r.holders)`);
  if (!named(stackLabel, reading.trackedBand.label)) throw new Error(`stackLabel must name the tracked band, "${reading.trackedBand.label}" — it heads the gathered column; it says: ${stackLabel}`);

  // Every other figure a card, a note or a label states must be one this kit computed, at the
  // precision it is written with. A year (1900–2100) and a figure glued to letters pass.
  const group = decimal === "," ? "[ .]" : "[ ,]";
  const known = [
    100, reading.count, order.length, grand, trackedTotal, reading.trackedPercent, reading.topTwoShare,
    ...columns.flatMap((c) => [c.total, c.trackedShare, ...order.map((b) => c.values[b.key]), ...order.map((b) => (c.values[b.key] / c.total) * 100)]),
    ...holders.map((h) => h.share),
  ];
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
        throw new Error(`${where} states ${raw}, which no figure of these columns rounds to: every number in a card is computed — use the reading (r.grand, r.trackedTotal, r.trackedPercent, r.topTwoShare, r.largest.total, …) through format(), never a typed or recomputed value. It says: ${text}`);
    }
  };
  CARDS.slice(0, 5).forEach((k, i) => checkFigures(`card ${i + 1} (cards.${k})`, cardText[i]));
  NOTE_KEYS.forEach(([k, slot]) => checkFigures(`notes.${k}`, notes[slot]));
  checkFigures("stackLabel", stackLabel);

  const titleForms = [beat.title].flat().map(plain);
  // The title may state the tracked band's share or count the columns that hold it.
  assertHeadlineNumbersDrawn(titleForms[0], [...columns.map((c) => c.total), trackedTotal, reading.trackedPercent, reading.count], "columns");

  const eyebrow = plain(beat.eyebrow);
  const source = plain(beat.source);
  const alt = plain(typeof beat.alt === "function" ? beat.alt(reading) : beat.alt);
  checkFigures("alt", alt);

  // The component's columns and bands: the runner's own keys (the drive writes them into selectors).
  const bandKey = (i) => `b${i}`;
  const unit = plain(beat.unit ?? "");
  const shaped = columns.map((c) => ({
    key: `c${c.index}`,
    label: c.label,
    total: c.total,
    totalText: format(c.total),
    trackedText: `${format(c.trackedValue)}${unit ? ` ${unit}` : ""}`,
    bands: order.map((b, i) => ({ key: bandKey(i), value: c.values[b.key], pct: percent(c.values[b.key] / c.total) })),
  }));
  const sources = order.map((b, i) => ({ key: bandKey(i), label: plain(b.label) }));
  const words = { heightNote: plain(beat.heightName), widthName: plain(beat.widthName), stackLabel, ...notes };

  const textPerRegister = {
    display: titleForms.join(" "),
    eyebrow,
    body: `${prose.flat().join(" ")} ${source}`,
    axis: `${words.heightNote} ${words.widthName} ${shaped.flatMap((c) => c.bands.map((b) => b.pct)).join(" ")}`,
    annot: `${shaped.map((c) => c.label).join(" ")} ${sources.map((s) => s.label).join(" ")}`,
    value: `${shaped.map((c) => `${c.label} ${c.trackedText}`).join(" ")} ${shaped.map((c) => c.totalText).join(" ")} ${Object.values(notes).join(" ")} ${stackLabel}`,
  };

  const driver = readFileSync(join(HERE, "marimekko-drive.mjs"), "utf8");
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
          element: createElement(DirectedMarimekkoScrolly, { columns: shaped, sources, tracked: bandKey(trackedAt), words, alt, regs, ground: direction.ground, accent: direction.accent, ink, muted }),
          states: STATES,
          driver,
          apply: "applyMarimekkoState",
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
