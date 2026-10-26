// The generic half of a pictogram (isotype) SCROLLY beat, taken from
// proof/scrolly-pictogram-europe-lowcarbon/render-directions-scrolly.mjs with everything about ITS
// subject removed. The choreography is the worked example's and is not the model's to change — six
// cards, one continuous interpolation driven by the reader's scroll (pictogram-drive.mjs, verbatim):
//
//   1 axis     one square per thing, set down at its own value on a 0–100 % axis (crowds stack into
//              towers), the two ends named;
//   2 floors   the two floors drawn across the axis;
//   3 count    the squares leave the axis and are counted in three blocks: at or above the high
//              floor · between the floors · under the low floor;
//   4 middle   the middle block alone, its members named;
//   5 ends     the two ends alone, each square in the fill of its class, the key;
//   6 reading  the plate and its key; the card states the accounting (the limits).
//
// This file computes every figure the cards may state (the three blocks, their counts, the two ends of
// the axis) and checks the words against them; ./beat.mjs — the one file the model writes — gives the
// data and the WORDS of each card. Copied into the beat by the harness; never edited by the model.
//
// Usage:  bun <beat>/render-beat.mjs
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createElement } from "react";
import { deriveFurniture } from "#shared/chart-beat/render-still.mjs";
import { webRegisters } from "#shared/design-base/web.mjs";
import { EYEBROW_TO_DISPLAY, gapOf, registerOf } from "#shared/design-base/register.mjs";
import { DirectedPictogramScrolly } from "./DirectedPictogramScrolly.tsx";
import { applyStoryboard, assertNumbers, assertHeadlineNumbersDrawn, assertDrawsClaimColumn } from "./guards.mjs";
import { plain, refusing, storyLanguage } from "./web.mjs";
import { renderBeatScrolly, scrollySkill } from "./scrolly.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));

/** The cards, in the drive's order: the runner's own ids (never the model's words in an id). */
const CARDS = ["axis", "floors", "count", "middle", "ends", "reading"];
/** One state per card; see pictogram-drive.mjs for what each field paints. The worked example's, verbatim. */
const STATES = [
  { mode: 0, floors: 0, ends: 1, counts: 0, middle: 0, sides: 0, classes: 0, key: 0, note: 0 },
  { mode: 0, floors: 1, ends: 1, counts: 0, middle: 0, sides: 0, classes: 0, key: 0, note: 1 },
  { mode: 1, floors: 0, ends: 0, counts: 1, middle: 0, sides: 0, classes: 0, key: 0, note: 2 },
  { mode: 1, floors: 0, ends: 0, counts: 1, middle: 1, sides: 0, classes: 0, key: 0, note: 3 },
  { mode: 1, floors: 0, ends: 0, counts: 1, middle: 0, sides: 1, classes: 1, key: 1, note: 4 },
  { mode: 1, floors: 0, ends: 0, counts: 1, middle: 0, sides: 0, classes: 1, key: 1, note: -1 },
];
/** The component's header-note slots, cards 1 to 5 (card 6 reads none). */
const NOTE_SLOTS = ["spanNote", "floorNote", "countNote", "middleNote", "endsNote"];
/** The axis ticks: the drive's axis runs 0–100 %. */
const TICKS = [0, 50, 100];

await refusing(HERE, async () => {
  const { default: beat } = await import("./beat.mjs");
  applyStoryboard(beat, HERE);
  const { renderScrolly } = await import(scrollySkill(HERE, "scripts", "render-scrolly.mjs"));

  const REQUIRED = ["eyebrow", "units", "floors", "breaks", "formatBreak", "format", "unitIs", "absent", "absentNote", "blockNames", "ends", "middleNames", "cards", "notes", "title", "limits", "source", "alt", "check"];
  const missing = REQUIRED.filter((key) => beat[key] === undefined);
  if (missing.length) throw new Error(`beat.mjs is missing ${missing.join(", ")}: give each as a field of the default export (export default { …, ${missing[0]}: … }), not as a separate export (see CONTRACT.md)`);
  for (const fn of ["formatBreak", "format", "middleNames", "check"])
    if (typeof beat[fn] !== "function") throw new Error(`beat.mjs: ${fn} must be a function (see CONTRACT.md)`);
  const groups = { cards: CARDS.slice(0, 5), notes: CARDS.slice(0, 5), blockNames: ["top", "middle", "bottom"], ends: ["low", "high"] };
  for (const [group, keys] of Object.entries(groups)) {
    const absent = keys.filter((k) => typeof beat[group]?.[k] !== "function");
    if (absent.length) throw new Error(`beat.mjs: ${group} must give a function for each of ${keys.join(", ")}; missing or not a function: ${absent.join(", ")} (see CONTRACT.md)`);
  }

  // ── the units: one square per thing, at its own share on the 0–100 % axis ──────────────────────
  if (!Array.isArray(beat.units) || beat.units.length < 10 || beat.units.length > 120)
    throw new Error(`units holds ${beat.units?.length ?? 0} things; this scrolly counts 10 to 120 squares. With fewer, draw a bar; with more, a square is no longer one thing a reader can count — choose a histogram`);
  assertNumbers(beat.units.map((u) => [u.label, u.value]), "units");
  const keys = beat.units.map((u) => String(u.key));
  if (new Set(keys).size !== keys.length) throw new Error(`two units share a key: one square per thing — filter data.json to one row per thing (one year)`);
  const outside = beat.units.filter((u) => u.value < 0 || u.value > 100);
  if (outside.length)
    throw new Error(`${outside.slice(0, 3).map((u) => `${u.label}=${u.value}`).join(", ")} fall outside 0–100: card 1 sets each square on a 0–100 % axis, so value must be a share in percent`);
  // On the axis a square sits in a column of 2.5 points and stacks on the others there: a tower
  // taller than twelve runs into the header on a laptop.
  const towers = new Map();
  for (const u of beat.units) {
    const col = Math.round((u.value / 100) * 40);
    towers.set(col, (towers.get(col) ?? 0) + 1);
  }
  const tallest = Math.max(...towers.values());
  if (tallest > 12) throw new Error(`${tallest} units share one 2.5-point column of the axis: card 1 stacks them into a tower that runs off the stage. This scrolly suits values spread across the axis`);

  if (!Array.isArray(beat.floors) || beat.floors.length !== 2 || !beat.floors.every((f) => typeof f === "number" && f > 0 && f < 100) || !(beat.floors[0] < beat.floors[1]))
    throw new Error(`floors must be two increasing numbers between 0 and 100, [low, high] — the takeaway's thresholds (e.g. [60, 75]); it is ${JSON.stringify(beat.floors)}`);
  const [LOW, HIGH] = beat.floors;
  const breaks = beat.breaks;
  if (!Array.isArray(breaks) || breaks.length < 1 || breaks.length > 6 || breaks.some((b, i) => typeof b !== "number" || (i && !(b > breaks[i - 1]))))
    throw new Error(`breaks must be 1 to 6 increasing numbers (the shade class edges); they are ${JSON.stringify(breaks)}`);
  const absent = [beat.absent].flat().filter((a) => a !== undefined);
  if (absent.length && !String(beat.absentNote).includes(String(absent.length)) && !absent.every((a) => String(beat.absentNote).includes(a)))
    throw new Error(`${absent.length} thing(s) have no reading and are not drawn; absentNote must say so, with that count or their names. It says: "${beat.absentNote}"`);

  const point = (u) => ({ key: String(u.key), label: u.label, value: u.value });
  const sorted = [...beat.units].sort((a, b) => b.value - a.value);
  const top = sorted.filter((u) => u.value >= HIGH);
  const middle = sorted.filter((u) => u.value >= LOW && u.value < HIGH);
  const bottom = sorted.filter((u) => u.value < LOW);
  for (const [name, block] of [["top (at or above the high floor)", top], ["middle (between the floors)", middle], ["bottom (under the low floor)", bottom]])
    if (!block.length) throw new Error(`the ${name} block is empty: this choreography counts three blocks and isolates the middle one, then the two ends. Check the floors against the takeaway`);
  const lowest = sorted[sorted.length - 1];
  const highest = sorted.filter((u) => u.value === sorted[0].value);
  const reading = {
    count: beat.units.length,
    floors: { low: LOW, high: HIGH },
    top: { count: top.length, units: top.map(point) },
    middle: { count: middle.length, units: middle.map(point) },
    bottom: { count: bottom.length, units: bottom.map(point) },
    endsCount: top.length + bottom.length,
    lowest: point(lowest),
    highest: highest.map(point),
    breaks: [...breaks],
    absentCount: absent.length,
  };
  Object.freeze(reading);
  beat.check(reading);
  assertDrawsClaimColumn(beat.units.map((u) => u.value), HERE);

  // ── the words, each passed through plain(); every number they state is checked ───────────────────
  const say = (field, value) => {
    const text = typeof value === "function" ? value(reading) : value;
    const parts = [text].flat();
    if (!parts.length || parts.some((p) => typeof p !== "string" || !p.trim())) throw new Error(`${field} must return a non-empty sentence (or an array of paragraphs); it returned ${JSON.stringify(text)}`);
    return parts.map(plain);
  };
  const prose = [...CARDS.slice(0, 5).map((k) => say(`cards.${k}`, beat.cards[k])), say("limits", [beat.limits].flat()[0])];
  const notes = Object.fromEntries(CARDS.slice(0, 5).map((k, i) => [NOTE_SLOTS[i], say(`notes.${k}`, beat.notes[k]).join(" ")]));
  const cardText = (i) => prose[i].join(" ");

  const lang = beat.lang ?? storyLanguage(HERE) ?? "en";
  const printed = String(beat.format(1.5));
  const decimal = /\d,\d/.test(printed) ? "," : /\d\.\d/.test(printed) ? "." : (1.5).toLocaleString(lang).includes(",") ? "," : ".";
  const group = decimal === "," ? "[ .]" : "[ ,]";
  const dec = decimal === "." ? "\\." : ",";
  const figure = new RegExp(`(?<![\\p{L}\\d.,])(\\d{1,3}(?:${group}\\d{3})+(?:${dec}\\d+)?|\\d+(?:${dec}\\d+)?)(?![\\p{L}\\d])`, "gu");
  const figuresOf = (text) =>
    [...plain(text).matchAll(figure)].map((m) => {
      const raw = m[1];
      const [whole, frac = ""] = raw.split(decimal);
      return { raw, n: Number(`${whole.replace(/[ .,]/g, "")}.${frac || "0"}`), frac };
    });
  const within = (f, v) => Math.abs(v - f.n) <= 0.5 * 10 ** -f.frac.length + 1e-9;

  // What each card is ABOUT, so it must say it: the figure (or the names) its picture shows.
  const owes = (i, what, v) => {
    if (!figuresOf(cardText(i)).some((f) => within(f, v))) throw new Error(`card ${i + 1} (cards.${CARDS[i]}) must state ${what} = ${v} — the figure its picture shows; it says: ${cardText(i)}`);
  };
  owes(0, "r.count", reading.count);
  owes(1, "r.floors.low", LOW);
  owes(1, "r.floors.high", HIGH);
  owes(2, "r.top.count", top.length);
  owes(2, "r.middle.count", middle.length);
  owes(2, "r.bottom.count", bottom.length);
  const unnamed = middle.filter((u) => !cardText(3).includes(plain(u.label)));
  if (unnamed.length) throw new Error(`card 4 (cards.middle) must name every member of the middle block; it leaves out ${unnamed.map((u) => u.label).join(", ")}. It says: ${cardText(3)}`);
  owes(4, "r.endsCount", reading.endsCount);

  // Every other figure a card, a note or the alt text states must be one this kit computed, at the
  // precision it is written with. A year (1900–2100) and a figure glued to letters (CO2) pass.
  const known = [
    reading.count, top.length, middle.length, bottom.length, reading.endsCount, LOW, HIGH, ...breaks, ...TICKS, absent.length,
    ...beat.units.map((u) => u.value),
  ];
  const checkFigures = (where, text) => {
    for (const f of figuresOf(text)) {
      if (!f.frac && Number.isInteger(f.n) && f.n >= 1900 && f.n <= 2100) continue;
      if (!known.some((v) => within(f, v)))
        throw new Error(`${where} states ${f.raw}, which no figure of this plate rounds to: every number in a card is computed — use the reading (r.count, r.top.count, r.middle.count, r.floors.low, r.lowest.value, …) through format(), never a typed or recomputed value. It says: ${text}`);
    }
  };
  CARDS.slice(0, 5).forEach((k, i) => checkFigures(`card ${i + 1} (cards.${k})`, cardText(i)));
  CARDS.slice(0, 5).forEach((k, i) => checkFigures(`notes.${k}`, notes[NOTE_SLOTS[i]]));

  const titleForms = [beat.title].flat().map(plain);
  // The title states the block counts and the floors — figures the count computes and the plate writes.
  assertHeadlineNumbersDrawn(titleForms[0], [top.length, middle.length, bottom.length, reading.endsCount, reading.count, LOW, HIGH], "squares");

  const eyebrow = plain(beat.eyebrow);
  const source = plain(beat.source);
  const alt = plain(typeof beat.alt === "function" ? beat.alt(reading) : beat.alt);
  checkFigures("alt", alt);
  const middleNames = plain(beat.middleNames(reading));
  const missingNames = middle.filter((u) => !middleNames.includes(plain(u.label)));
  if (missingNames.length) throw new Error(`middleNames() is written under the middle block, so it must name each of its members; it leaves out ${missingNames.map((u) => u.label).join(", ")}`);
  checkFigures("middleNames", middleNames);
  const words = {
    ...notes,
    unitIs: plain(beat.unitIs),
    absenceNote: plain(beat.absentNote ?? ""),
    lowEnd: plain(beat.ends.low(reading)),
    highEnd: plain(beat.ends.high(reading)),
    middleNames,
  };
  checkFigures("ends.low", words.lowEnd);
  checkFigures("ends.high", words.highEnd);
  const blockNames = ["top", "middle", "bottom"].map((k) => plain(beat.blockNames[k](reading)));
  blockNames.forEach((n, i) => checkFigures(`blockNames.${["top", "middle", "bottom"][i]}`, n));

  const classOf = (v) => breaks.filter((b) => v >= b).length;
  const blockOf = (v) => (v >= HIGH ? 0 : v >= LOW ? 1 : 2);
  // Keys are the runner's own (u1…uN): a quote or an accent in a key would break the drive's selectors.
  const units = sorted.map((u, j) => ({ key: `u${j + 1}`, label: plain(u.label), share: u.value, classIndex: classOf(u.value), block: blockOf(u.value) }));
  const blocks = [
    { name: blockNames[0], count: top.length, thread: true },
    { name: blockNames[1], count: middle.length, thread: false },
    { name: blockNames[2], count: bottom.length, thread: true },
  ];
  const fb = (v) => plain(beat.formatBreak(v));
  const ticks = TICKS.map((v) => ({ value: v, text: fb(v) }));
  const floors = [LOW, HIGH].map((v) => ({ value: v, text: fb(v) }));

  const textPerRegister = {
    display: titleForms.join(" "),
    eyebrow,
    body: `${prose.flat().join(" ")} ${source}`,
    axis: `${words.unitIs} ${breaks.map(fb).join(" ")} ${ticks.map((t) => t.text).join(" ")} ${words.absenceNote}`,
    annot: `${blocks.map((b) => b.name).join(" ")} ${words.lowEnd} ${words.highEnd} ${words.middleNames}`,
    value: `${blocks.map((b) => b.count).join(" ")} ${Object.values(notes).join(" ")}`,
  };

  const driver = readFileSync(join(HERE, "pictogram-drive.mjs"), "utf8");
  await renderBeatScrolly({
    here: HERE,
    states: STATES,
    textPerRegister,
    evidenceLevels: beat.evidenceLevels ?? breaks.length + 1,
    async render({ label, direction, outDir }) {
      const { ink, muted, grid } = deriveFurniture(direction.ground);
      const regs = webRegisters(direction, { ink: { ink, muted, accent: direction.accent } });
      const { outPath } = await renderScrolly({
        steps: prose.map((p, i) => ({ id: CARDS[i], prose: p })),
        reveal: {
          element: createElement(DirectedPictogramScrolly, { units, blocks, breaks: breaks.map(fb), ticks, floors, words, alt, regs, ground: direction.ground, accent: direction.accent, ink, muted, grid }),
          states: STATES,
          driver,
          apply: "applyPictogramState",
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
