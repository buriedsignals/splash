// The generic half of a treemap SCROLLY beat, taken from
// proof/scrolly-treemap-europe-capacity/render-directions-scrolly.mjs with everything about ITS subject
// removed. The choreography is the worked example's and is not the model's to change — six cards, one
// continuous interpolation driven by the reader's scroll (treemap-drive.mjs, verbatim):
//
//   1 block    the whole as one rectangle whose area is its total;
//   2 split    the block divides into one squarified cell per CATEGORY; the thread categories in the accent;
//   3 byLand   the category cells give way to one cell per MEMBER (the largest drawn, the rest in two remainders);
//   4 tipped   the members where the thread categories are over the tipping share take the accent;
//   5 open     the largest member's cell grows to the stage and divides into its own categories;
//   6 reading  the member treemap stands; the card states the limits.
//
// The same whole is divided twice — by category, then by member — so the reader sees what the accent
// means before it lands on members. Every cell carries its value, its name and its basis while they fit.
//
// This file aggregates the items by member and by category, computes every figure the cards may state
// (the total, every share, the tipped members and their share, the largest member's own split) and
// checks the words against them; ./beat.mjs — the one file the model writes — gives the items and the
// WORDS of each card. Copied into the beat by the harness; never edited by the model.
//
// Usage:  bun <beat>/render-beat.mjs
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createElement } from "react";
import { deriveFurniture } from "#shared/chart-beat/render-still.mjs";
import { webRegisters } from "#shared/design-base/web.mjs";
import { EYEBROW_TO_DISPLAY, gapOf, registerOf } from "#shared/design-base/register.mjs";
import { DirectedTreemapScrolly } from "./DirectedTreemapScrolly.tsx";
import { applyStoryboard, assertNumbers, assertLegibleLabels, assertHeadlineNumbersDrawn } from "./guards.mjs";
import { plain, refusing, storyLanguage } from "./web.mjs";
import { renderBeatScrolly, scrollySkill } from "./scrolly.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));

/** The cards, in the drive's order: the runner's own ids (never the model's words in an id). */
const CARDS = ["block", "split", "byMember", "tipped", "open", "reading"];
/** One state per card; see treemap-drive.mjs for what each field paints. The worked example's, verbatim. */
const STATES = [
  { split: 0, byLand: 0, tipped: 0, open: 0, note: 0 },
  { split: 1, byLand: 0, tipped: 0, open: 0, note: 1 },
  { split: 1, byLand: 1, tipped: 0, open: 0, note: 2 },
  { split: 1, byLand: 1, tipped: 1, open: 0, note: 3 },
  { split: 1, byLand: 1, tipped: 1, open: 1, note: 4 },
  { split: 1, byLand: 1, tipped: 1, open: 0, note: 5 },
];
/** The component's header-note slots (its NOTES), one per card, in the same order. */
const NOTE_SLOTS = ["blockNote", "fuelNote", "landNote", "tippedNote", "openNote", "readNote"];

await refusing(HERE, async () => {
  const { default: beat } = await import("./beat.mjs");
  applyStoryboard(beat, HERE);
  const { renderScrolly } = await import(scrollySkill(HERE, "scripts", "render-scrolly.mjs"));

  const REQUIRED = ["eyebrow", "items", "categories", "thread", "wholeName", "otherCategory", "unit", "format", "formatShare", "recordsText", "restName", "tippedRestName", "cards", "notes", "title", "limits", "source", "alt", "check"];
  const missing = REQUIRED.filter((key) => beat[key] === undefined);
  if (missing.length) throw new Error(`beat.mjs is missing ${missing.join(", ")}: give each as a field of the default export (export default { …, ${missing[0]}: … }), not as a separate export (see CONTRACT.md)`);
  for (const fn of ["format", "formatShare", "recordsText", "restName", "tippedRestName", "check"])
    if (typeof beat[fn] !== "function") throw new Error(`beat.mjs: ${fn} must be a function (see CONTRACT.md)`);
  for (const [group, keys] of [["cards", CARDS.slice(0, 5)], ["notes", CARDS]]) {
    const absent = keys.filter((k) => typeof beat[group]?.[k] !== "function");
    if (absent.length) throw new Error(`beat.mjs: ${group} must give a function for each of ${keys.join(", ")}; missing or not a function: ${absent.join(", ")} (see CONTRACT.md)`);
  }

  // ── the items, aggregated by member and by category ─────────────────────────────────────────────
  if (!Array.isArray(beat.items) || !beat.items.length) throw new Error(`items must be an array of { member, category, value, records? }, one per record (or per member and category)`);
  const items = beat.items.map((it) => ({ member: String(it.member ?? ""), category: String(it.category ?? ""), value: it.value, records: it.records ?? 1 }));
  assertNumbers(items.flatMap((it, i) => [[`items[${i}].value`, it.value], [`items[${i}].records`, it.records]]), "items");
  const blank = items.find((it) => !it.member || !it.category);
  if (blank) throw new Error(`an item has no member or no category: ${JSON.stringify(blank)}`);
  if (items.some((it) => it.value < 0)) throw new Error(`an item has a negative value: a treemap is a whole divided, every part is zero or more`);
  const catKeys = Object.keys(beat.categories ?? {});
  if (catKeys.length < 2) throw new Error(`categories must name at least two categories, { key: label }, in the order the cells are listed`);
  const thread = [beat.thread].flat().map(String);
  const unknown = thread.filter((t) => !catKeys.includes(t));
  if (!thread.length || unknown.length) throw new Error(`thread must list the category keys drawn in the accent, each one of categories' keys${unknown.length ? `; not a category: ${unknown.join(", ")}` : ""}`);
  const TIP = beat.tipAt ?? 0.5;
  if (!(TIP > 0 && TIP < 1)) throw new Error(`tipAt is ${beat.tipAt}: the share of the thread categories above which a member is "tipped", between 0 and 1 (default 0.5, "more than half")`);

  const total = items.reduce((s, it) => s + it.value, 0);
  const records = items.reduce((s, it) => s + it.records, 0);
  if (!(total > 0)) throw new Error(`the items add up to ${total}: there is no whole to divide`);
  const byMember = new Map();
  const byCat = new Map();
  for (const it of items) {
    const m = byMember.get(it.member) ?? { name: it.member, value: 0, records: 0, threadValue: 0, cats: new Map() };
    m.value += it.value;
    m.records += it.records;
    if (thread.includes(it.category)) m.threadValue += it.value;
    const mc = m.cats.get(it.category) ?? { value: 0, records: 0 };
    mc.value += it.value;
    mc.records += it.records;
    m.cats.set(it.category, mc);
    byMember.set(it.member, m);
    const c = byCat.get(it.category) ?? { value: 0, records: 0 };
    c.value += it.value;
    c.records += it.records;
    byCat.set(it.category, c);
  }
  const members = [...byMember.values()].filter((m) => m.value > 0).sort((a, b) => b.value - a.value);
  for (const m of members) {
    m.threadShare = (m.threadValue / m.value) * 100;
    m.tipped = m.threadValue / m.value > TIP;
  }
  const DRAWN = beat.drawCount ?? 12;
  if (!(Number.isInteger(DRAWN) && DRAWN >= 3 && DRAWN <= 20)) throw new Error(`drawCount is ${beat.drawCount}: draw between 3 and 20 members as their own cells`);
  if (members.length < DRAWN + 1) throw new Error(`there are ${members.length} members and drawCount is ${DRAWN}: card 3 draws the largest as their own cells and folds the rest into two remainders — lower drawCount`);
  const drawn = members.slice(0, DRAWN);
  const tail = members.slice(DRAWN);
  const tipped = members.filter((m) => m.tipped);
  const largest = members[0];

  // ── what this choreography cannot draw honestly ─────────────────────────────────────────────────
  if (largest.tipped)
    throw new Error(`the largest member (${largest.name}) is tipped: card 4 would put the accent on the largest cell, where it reads as a highlight on the maximum rather than a thread. This choreography is about a thread that is NOT the bulk; choose another type`);
  if (!drawn.some((m) => m.tipped))
    throw new Error(`none of the ${DRAWN} drawn members is tipped: the accent would live only in a remainder cell. Raise drawCount, or check thread`);
  if (!tipped.length) throw new Error(`no member has more than ${TIP * 100} % in the thread categories: card 4 has nothing to light`);

  const share = (v) => (v / total) * 100;
  const catView = (key, c, whole) => ({ key, label: String(beat.categories[key]), value: c.value, records: c.records, share: (c.value / whole) * 100 });
  const categories = catKeys.filter((k) => (byCat.get(k)?.value ?? 0) > 0).map((k) => catView(k, byCat.get(k), total));
  const otherCats = [...byCat.entries()].filter(([k]) => !catKeys.includes(k));
  const otherValue = otherCats.reduce((s, [, c]) => s + c.value, 0);
  const sortedCats = [...byCat.entries()].sort((a, b) => b[1].value - a[1].value);
  const topTwo = sortedCats.slice(0, 2);
  const memberView = (m) => ({
    name: m.name, value: m.value, records: m.records, share: share(m.value), threadShare: m.threadShare, tipped: m.tipped,
    categories: Object.fromEntries([...m.cats.entries()].map(([k, c]) => [k, (c.value / m.value) * 100])),
  });
  const threadValue = thread.reduce((s, k) => s + (byCat.get(k)?.value ?? 0), 0);
  const tailRest = tail.filter((m) => !m.tipped);
  const tailTipped = tail.filter((m) => m.tipped);
  const reading = {
    total,
    records,
    count: members.length,
    drawCount: DRAWN,
    categories,
    categoryShare: Object.fromEntries([...byCat.entries()].map(([k, c]) => [k, share(c.value)])),
    otherShare: share(otherValue),
    topTwo: topTwo.map(([k]) => k),
    topTwoShare: share(topTwo.reduce((s, [, c]) => s + c.value, 0)),
    threadShare: share(threadValue),
    members: members.map(memberView),
    largest: memberView(largest),
    tippedCount: tipped.length,
    tipped: tipped.map(memberView),
    tippedShare: share(tipped.reduce((s, m) => s + m.value, 0)),
    restCount: tailRest.length,
    tippedRestCount: tailTipped.length,
  };
  Object.freeze(reading);
  assertLegibleLabels(drawn.map((m) => m.value), beat.format);
  beat.check(reading);

  // ── the words, each passed through plain(); every number they state is checked ───────────────────
  const say = (field, value) => {
    const text = typeof value === "function" ? value(reading) : value;
    const parts = [text].flat();
    if (!parts.length || parts.some((p) => typeof p !== "string" || !p.trim())) throw new Error(`${field} must return a non-empty sentence (or an array of paragraphs); it returned ${JSON.stringify(text)}`);
    return parts.map(plain);
  };
  const format = (v) => plain(beat.format(v));
  const formatShare = (v) => plain(beat.formatShare(v));
  const recordsText = (n) => plain(beat.recordsText(n));
  const prose = [...CARDS.slice(0, 5).map((k) => say(`cards.${k}`, beat.cards[k])), say("limits", [beat.limits].flat()[0])];
  const notes = Object.fromEntries(CARDS.map((k, i) => [NOTE_SLOTS[i], say(`notes.${k}`, beat.notes[k]).join(" ")]));

  const sample = plain(beat.format(1.5));
  const langOf = beat.lang ?? storyLanguage(HERE) ?? "en";
  const decimal = /,/.test(sample) ? "," : /\./.test(sample) ? "." : /,/.test(new Intl.NumberFormat(langOf).format(1.5)) ? "," : ".";
  const group = decimal === "," ? "[ .]" : "[ ,]";
  const dec = decimal === "." ? "\\." : ",";
  const figure = new RegExp(`(?<![\\p{L}\\d.,])(\\d{1,3}(?:${group}\\d{3})+(?:${dec}\\d+)?|\\d+(?:${dec}\\d+)?)(?![\\p{L}\\d])`, "gu");
  const figuresIn = (text) =>
    [...plain(text).matchAll(figure)].map((m) => {
      const raw = m[1];
      const [whole, frac = ""] = raw.split(decimal);
      return { raw, frac, n: Number(`${whole.replace(/[ .,]/g, "")}.${frac || "0"}`) };
    });
  const near = (f, v) => Math.abs(v - f.n) <= 0.5 * 10 ** -f.frac.length + 1e-9;

  // What each card is ABOUT, so it must say it: the figure its gesture puts on screen, at whatever
  // precision the sentence writes it ("469" for 469.06, "14,0" for 13.98).
  const OWES = {
    block: [["total", total], ["records", records]],
    split: [["threadShare", reading.threadShare]],
    byMember: [["largest.value", largest.value]],
    tipped: [["tippedCount", tipped.length], ["tippedShare", reading.tippedShare]],
    open: [["largest.threadShare", largest.threadShare]],
  };
  CARDS.slice(0, 5).forEach((k, i) => {
    const text = prose[i].join(" ");
    for (const [what, v] of OWES[k])
      if (!figuresIn(text).some((f) => near(f, v)))
        throw new Error(`card ${i + 1} (cards.${k}) must state ${what} = ${Number.isInteger(v) ? v : v.toFixed(2)} — the figure its picture shows; it says: ${text}`);
  });

  // Every other figure a card, a note or the alt text states must be one this kit computed, at the
  // precision it is written with. A year (1900–2100) and a figure glued to letters (CO2, 10e) pass.
  const known = [
    total, records, members.length, DRAWN, tipped.length, reading.tippedShare, reading.topTwoShare, reading.threadShare, reading.otherShare,
    tailRest.length, tailTipped.length, TIP * 100,
    ...[...byCat.values()].flatMap((c) => [c.value, share(c.value), c.records]),
    ...drawn.flatMap((m) => [m.value, share(m.value), m.records, m.threadShare]),
    ...[...largest.cats.values()].flatMap((c) => [c.value, (c.value / largest.value) * 100]),
  ];
  const checkFigures = (where, text) => {
    for (const f of figuresIn(text)) {
      if (!f.frac && Number.isInteger(f.n) && f.n >= 1900 && f.n <= 2100) continue;
      if (!known.some((v) => near(f, v)))
        throw new Error(`${where} states ${f.raw}, which no figure of this whole rounds to: every number in a card is computed — use the reading (r.total, r.threadShare, r.largest.value, r.tippedShare, …), never a typed or recomputed value. It says: ${text}`);
    }
  };
  CARDS.slice(0, 5).forEach((k, i) => checkFigures(`card ${i + 1} (cards.${k})`, prose[i].join(" ")));
  CARDS.forEach((k, i) => checkFigures(`notes.${k}`, notes[NOTE_SLOTS[i]]));

  const titleForms = [beat.title].flat().map(plain);
  // The title may state the tipped count, besides the drawn values.
  assertHeadlineNumbersDrawn(titleForms[0], [...drawn.map((m) => m.value), tipped.length], "cells");

  const eyebrow = plain(beat.eyebrow);
  const source = plain(beat.source);
  const alt = plain(typeof beat.alt === "function" ? beat.alt(reading) : beat.alt);
  checkFigures("alt", alt);

  // ── the cells; the runner's own keys in selectors ─────────────────────────────────────────────
  const categoryCells = (cats, whole, basisOf) => {
    const named = catKeys.map((k, i) => ({ key: `f${i + 1}`, cat: k, value: cats.get(k)?.value ?? 0, records: cats.get(k)?.records ?? 0, name: plain(beat.categories[k]) }));
    const others = [...cats.entries()].filter(([k]) => !catKeys.includes(k));
    const rest = { key: "f0", cat: null, value: others.reduce((s, [, v]) => s + v.value, 0), records: others.reduce((s, [, v]) => s + v.records, 0), name: plain(beat.otherCategory) };
    return [...named, rest].filter((c) => c.value > 0).map((c) => ({ key: c.key, mw: c.value, value: format(c.value), name: c.name, basis: basisOf(c, whole), thread: thread.includes(c.cat) }));
  };
  const block = { key: "all", mw: total, value: format(total), name: plain(beat.wholeName), basis: recordsText(records), thread: false };
  const fuels = categoryCells(byCat, total, (c, whole) => `${formatShare((c.value / whole) * 100)} · ${recordsText(c.records)}`);
  const remainder = (list, key, name) => ({ key, mw: list.reduce((s, m) => s + m.value, 0), value: format(list.reduce((s, m) => s + m.value, 0)), name, basis: recordsText(list.reduce((s, m) => s + m.records, 0)), thread: list.length > 0 && list.every((m) => m.tipped) });
  const lands = [
    ...drawn.map((m, i) => ({ key: `m${i + 1}`, mw: m.value, value: format(m.value), name: plain(m.name), basis: recordsText(m.records), thread: m.tipped })),
    ...(tailRest.length ? [remainder(tailRest, "rest", plain(beat.restName(tailRest.length)))] : []),
    ...(tailTipped.length ? [remainder(tailTipped, "restTipped", plain(beat.tippedRestName(tailTipped.length)))] : []),
  ];
  const inside = categoryCells(largest.cats, largest.value, (c, whole) => formatShare((c.value / whole) * 100));
  const words = { unit: plain(beat.unit), ...notes };

  const textPerRegister = {
    display: titleForms.join(" "),
    eyebrow,
    body: `${prose.flat().join(" ")} ${source}`,
    axis: `${words.unit} ${[block, ...fuels, ...lands, ...inside].map((c) => c.basis).join(" ")}`,
    annot: [block, ...fuels, ...lands, ...inside].map((c) => c.name).join(" "),
    value: `${[block, ...fuels, ...lands, ...inside].map((c) => c.value).join(" ")} ${Object.values(notes).join(" ")}`,
  };

  const driver = readFileSync(join(HERE, "treemap-drive.mjs"), "utf8");
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
          element: createElement(DirectedTreemapScrolly, { block, fuels, lands, inside, opens: "m1", words, alt, regs, ground: direction.ground, accent: direction.accent, ink, muted }),
          states: STATES,
          driver,
          apply: "applyTreemapState",
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
