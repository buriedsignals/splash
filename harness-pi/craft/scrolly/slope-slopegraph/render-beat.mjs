// The generic half of a slope SCROLLY beat, taken from
// proof/scrolly-slope-europe-lowcarbon/render-directions-scrolly.mjs with everything about ITS subject
// removed. The choreography is the worked example's and is not the model's to change — six cards, one
// continuous interpolation driven by the reader's scroll (slope-drive.mjs, verbatim):
//
//   1 rail     the left rail alone: every line's first value, named;
//   2 rise     the slopes grow to the right rail, its values written as they land;
//   3 cross    a ring at every crossing: where two slopes cross, two lines swapped places;
//   4 pair     the pair that crosses in the accent, its crossing ringed, the rest stepping back;
//   5 gains    the two largest gains in the ink, their changes written;
//   6 reading  the lines the static plate does not keep leave; the pair and the largest others stay,
//              re-seated with their changes; the card states the limits.
//
// The drive draws both rails on ONE scale from 0 to 100: the values are shares in percent.
//
// This file computes every figure the cards may state (the rails' ends, the risers, the crossings,
// the pair's gaps, the gains, the lines kept) and checks the words against them; ./beat.mjs — the one
// file the model writes — gives the lines and the WORDS of each card. Copied into the beat by the
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
import { DirectedSlopeScrolly } from "./DirectedSlopeScrolly.tsx";
import { applyStoryboard, assertNumbers, assertLegibleLabels, assertHeadlineNumbersDrawn, assertDrawsClaimColumn } from "./guards.mjs";
import { plain, refusing, storyLanguage } from "./web.mjs";
import { renderBeatScrolly, scrollySkill } from "./scrolly.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));

/** The cards, in the drive's order: the runner's own ids (never the model's words in an id). */
const CARDS = ["rail", "rise", "cross", "pair", "gains", "reading"];
/** One state per card; see slope-drive.mjs for what each field paints. The worked example's, verbatim. */
const STATES = [
  { right: 0, cross: 0, pair: 0, gains: 0, six: 0, note: 0 },
  { right: 1, cross: 0, pair: 0, gains: 0, six: 0, note: 1 },
  { right: 1, cross: 1, pair: 0, gains: 0, six: 0, note: 2 },
  { right: 1, cross: 1, pair: 1, gains: 0, six: 0, note: 3 },
  { right: 1, cross: 0, pair: 0, gains: 1, six: 0, note: 4 },
  { right: 1, cross: 0, pair: 0, gains: 0, six: 1, note: 5 },
];
/** The component's header-note slots (its NOTES), one per card, in the same order. */
const NOTE_SLOTS = ["railNote", "riseNote", "crossNote", "pairNote", "gainNote", "sixNote"];
/** Card 5 lights the two largest gains (the worked example's GAINS). */
const GAINS = 2;

await refusing(HERE, async () => {
  const { default: beat } = await import("./beat.mjs");
  applyStoryboard(beat, HERE);
  const { renderScrolly } = await import(scrollySkill(HERE, "scripts", "render-scrolly.mjs"));

  const REQUIRED = ["eyebrow", "lines", "rails", "subject", "unit", "format", "formatDelta", "cards", "notes", "title", "limits", "source", "alt", "check"];
  const missing = REQUIRED.filter((key) => beat[key] === undefined);
  if (missing.length) throw new Error(`beat.mjs is missing ${missing.join(", ")}: give each as a field of the default export (export default { …, ${missing[0]}: … }), not as a separate export (see CONTRACT.md)`);
  for (const fn of ["format", "formatDelta", "check"])
    if (typeof beat[fn] !== "function") throw new Error(`beat.mjs: ${fn} must be a function (see CONTRACT.md)`);
  for (const [group, keys] of [["cards", CARDS.slice(0, 5)], ["notes", CARDS]]) {
    const absent = keys.filter((k) => typeof beat[group]?.[k] !== "function");
    if (absent.length) throw new Error(`beat.mjs: ${group} must give a function for each of ${keys.join(", ")}; missing or not a function: ${absent.join(", ")} (see CONTRACT.md)`);
  }
  if (!(beat.rails && beat.rails.left !== undefined && beat.rails.right !== undefined))
    throw new Error(`rails must be { left, right }: what each rail is, e.g. { left: "2000", right: "2024" }`);

  // ── the lines: every member, so card 1 to 5 are about all of them ───────────────────────────────
  if (!Array.isArray(beat.lines)) throw new Error(`lines must be an array of { key, label, from, to, weight, thread }, one per member`);
  const lines = beat.lines.map((l) => ({ ...l, key: String(l.key), label: String(l.label) }));
  assertNumbers(lines.flatMap((l) => [[`${l.key}.from`, l.from], [`${l.key}.to`, l.to], [`${l.key}.weight`, l.weight]]), "lines");
  if (lines.length < 4 || lines.length > 20)
    throw new Error(`lines holds ${lines.length} members: this choreography lays every member on the rails (cards 1 to 5), then keeps a few — give between 4 and 20`);
  if (new Set(lines.map((l) => l.key)).size !== lines.length) throw new Error(`lines holds the same key twice: give each member ONE line (filter data.json to the two rails' rows)`);
  const offScale = lines.filter((l) => l.from < 0 || l.from > 100 || l.to < 0 || l.to > 100);
  if (offScale.length)
    throw new Error(`${offScale[0].label} runs ${offScale[0].from} → ${offScale[0].to}: the drive draws both rails on ONE scale from 0 to 100 (a share in percent), so every value must lie in 0–100. Express the measure as a percentage, or choose another type`);
  const threads = lines.filter((l) => l.thread === true);
  if (threads.length !== 2)
    throw new Error(`${threads.length} lines have thread: true; card 4 isolates ONE PAIR whose lines cross — mark exactly the two lines the title is about`);
  const subject = lines.find((l) => l.key === String(beat.subject));
  if (!subject || !subject.thread) throw new Error(`subject ${JSON.stringify(beat.subject)} must be the key of one of the two thread lines`);
  const [ta, tb] = threads;
  const climber = ta.from < tb.from ? ta : tb;
  const held = climber === ta ? tb : ta;
  if (!(climber.from < held.from && climber.to > held.to))
    throw new Error(`the pair ${ta.label} / ${tb.label} does not cross between the rails (${ta.from} → ${ta.to}, ${tb.from} → ${tb.to}): card 4 is about one line passing the other. Mark as thread the pair whose order the rails swap`);

  const DRAWN = beat.drawCount ?? 6;
  if (!(Number.isInteger(DRAWN) && DRAWN >= 2 && DRAWN <= Math.min(8, lines.length - 1)))
    throw new Error(`drawCount is ${beat.drawCount}: card 6 keeps between 2 and ${Math.min(8, lines.length - 1)} lines (the pair and the heaviest others), fewer than every member`);

  for (const l of lines) l.delta = l.to - l.from;
  const crossings = [];
  for (let i = 0; i < lines.length; i++)
    for (let j = i + 1; j < lines.length; j++) {
      const [a, b] = [lines[i], lines[j]];
      const d0 = a.from - b.from;
      const d1 = a.to - b.to;
      if (d0 * d1 < 0) {
        const t = d0 / (d0 - d1);
        crossings.push([i, j, Math.round(t * 1000) / 1000, Math.round((a.from + t * (a.to - a.from)) * 100) / 100]);
      }
    }
  const gains = [...lines].sort((a, b) => b.delta - a.delta).slice(0, GAINS);
  const litThread = gains.find((g) => g.thread);
  if (litThread)
    throw new Error(`${litThread.label} is one of the two largest gains and one of the pair: card 5 lights the largest gains in the ink, and a thread line stays in the accent, so the card would point at nothing new. Choose another pair, or another type`);
  const pair = [climber, held];
  const others = lines.filter((l) => !pair.includes(l)).sort((a, b) => b.weight - a.weight);
  const kept = [...pair, ...others.slice(0, DRAWN - 2)];
  const lowest = lines.reduce((a, b) => (b.from < a.from ? b : a));
  const highest = lines.reduce((a, b) => (b.from > a.from ? b : a));
  const view = (l) => ({ key: l.key, label: l.label, from: l.from, to: l.to, delta: l.delta, weight: l.weight });
  const passedHeld = lines.filter((l) => l !== held && l.from < held.from && l.to > held.to);
  const reading = {
    count: lines.length,
    rails: { left: beat.rails.left, right: beat.rails.right },
    lines: lines.map(view),
    lowest: view(lowest),
    highest: view(highest),
    risers: lines.filter((l) => l.delta > 0).length,
    fallers: lines.filter((l) => l.delta < 0).length,
    crossings: crossings.length,
    climber: view(climber),
    held: view(held),
    gapBefore: held.from - climber.from,
    gapAfter: climber.to - held.to,
    passedHeld: passedHeld.map(view),
    gains: gains.map(view),
    drawCount: DRAWN,
    keptOthers: kept.slice(2).map(view),
  };
  Object.freeze(reading);

  assertLegibleLabels(lines.flatMap((l) => [l.from, l.to]), beat.format);
  beat.check(reading);
  assertDrawsClaimColumn(lines.flatMap((l) => [l.from, l.to]), HERE);

  // ── the words, each passed through plain(); every number they state is checked ───────────────────
  const say = (field, value) => {
    const text = typeof value === "function" ? value(reading) : value;
    const parts = [text].flat();
    if (!parts.length || parts.some((p) => typeof p !== "string" || !p.trim())) throw new Error(`${field} must return a non-empty sentence (or an array of paragraphs); it returned ${JSON.stringify(text)}`);
    return parts.map(plain);
  };
  const format = (v) => plain(beat.format(v));
  const formatDelta = (v) => plain(beat.formatDelta(v));
  const prose = [...CARDS.slice(0, 5).map((k) => say(`cards.${k}`, beat.cards[k])), say("limits", [beat.limits].flat()[0])];
  const notes = Object.fromEntries(CARDS.map((k, i) => [NOTE_SLOTS[i], say(`notes.${k}`, beat.notes[k]).join(" ")]));

  // What each card is ABOUT, so it must say it: the figure its gesture puts on screen. Card 2's count
  // of risers is often spelled ("sixteen of sixteen"), so check(r) holds it rather than this table.
  const OWES = {
    rail: [["lowest.from", format(lowest.from)], ["highest.from", format(highest.from)]],
    rise: [],
    cross: [["crossings", String(crossings.length)]],
    pair: [["gapBefore", format(reading.gapBefore)], ["gapAfter", format(reading.gapAfter)]],
    gains: gains.map((g, i) => [`gains[${i}].delta`, formatDelta(g.delta)]),
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
    lines.length, reading.risers, reading.fallers, crossings.length, reading.gapBefore, reading.gapAfter,
    passedHeld.length, DRAWN, DRAWN - 2, ...lines.flatMap((l) => [l.from, l.to, Math.abs(l.delta)]),
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
        throw new Error(`${where} states ${raw}, which no figure of these lines rounds to: every number in a card is computed — use the reading (r.lowest.from, r.crossings, r.gapBefore, r.gains[0].delta, …) through format() / formatDelta(), never a typed or recomputed value. It says: ${text}`);
    }
  };
  CARDS.slice(0, 5).forEach((k, i) => checkFigures(`card ${i + 1} (cards.${k})`, prose[i].join(" ")));
  CARDS.forEach((k, i) => checkFigures(`notes.${k}`, notes[NOTE_SLOTS[i]]));

  const titleForms = [beat.title].flat().map(plain);
  // The title may state a count the gesture computes (the risers, the lines that passed the subject).
  assertHeadlineNumbersDrawn(titleForms[0], [...lines.flatMap((l) => [l.from, l.to, l.delta]), reading.risers, passedHeld.length, crossings.length], "lines");

  const eyebrow = plain(beat.eyebrow);
  const source = plain(beat.source);
  const alt = plain(typeof beat.alt === "function" ? beat.alt(reading) : beat.alt);
  checkFigures("alt", alt);
  // The runner's own keys (l1…lN), never the model's keys in a selector.
  const drawnLines = lines.map((l, i) => ({
    key: `l${i + 1}`,
    label: plain(l.label),
    from: l.from,
    to: l.to,
    fromText: format(l.from),
    toText: format(l.to),
    deltaText: formatDelta(l.delta),
    thread: pair.includes(l),
    gain: gains.includes(l),
    drawn: kept.includes(l),
  }));
  const words = { unit: plain(beat.unit), ...notes };
  const years = [plain(beat.rails.left), plain(beat.rails.right)];

  const textPerRegister = {
    display: titleForms.join(" "),
    eyebrow,
    body: `${prose.flat().join(" ")} ${source}`,
    axis: `${words.unit} ${years.join(" ")}`,
    annot: drawnLines.map((l) => `${l.label} ${l.deltaText}`).join(" "),
    value: `${drawnLines.map((l) => `${l.fromText} ${l.toText}`).join(" ")} ${Object.values(notes).join(" ")}`,
  };

  const driver = readFileSync(join(HERE, "slope-drive.mjs"), "utf8");
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
          element: createElement(DirectedSlopeScrolly, { lines: drawnLines, crossings, years, words, alt, regs, stroke: direction.stroke ?? {}, ground: direction.ground, accent: direction.accent, ink, muted, grid }),
          states: STATES,
          driver,
          apply: "applySlopeState",
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
