// The generic half of a small-multiples SCROLLY beat, taken from
// proof/scrolly-small-multiples-lowcarbon/render-directions-scrolly.mjs with everything about ITS
// subject removed. The choreography is the worked example's and is not the model's to change — six
// cards, one continuous interpolation driven by the reader's scroll (multiples-drive.mjs, verbatim):
//
//   1 start    one panel per member, alphabetical, the first state's bar alone, one scale for all;
//   2 rise     the second state's bars grow, every change written;
//   3 byFrom   the panels travel to the order of their first-state level;
//   4 scatter  every panel condenses into one point (first level across, gain up), the fitted line drawn,
//              the two extremes named;
//   5 byGain   the panels come back in the order of their gain, the two extremes in the accent;
//   6 reading  the grid in gain order stands; the card states the limits.
//
// The drive draws every bar on ONE scale from 0 to 100 (the values are shares in percent) and the
// scatter's gain axis from 0 up: every gain must be zero or more.
//
// This file computes every figure the cards may state (the first state's ends, the risers, the
// correlation and fitted line, the extremes of the gain) and checks the words against them; ./beat.mjs
// — the one file the model writes — gives the panels and the WORDS of each card. Copied into the beat
// by the harness; never edited by the model.
//
// Usage:  bun <beat>/render-beat.mjs
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createElement } from "react";
import { deriveFurniture } from "#shared/chart-beat/render-still.mjs";
import { webRegisters } from "#shared/design-base/web.mjs";
import { EYEBROW_TO_DISPLAY, gapOf, registerOf } from "#shared/design-base/register.mjs";
import { DirectedMultiplesScrolly } from "./DirectedMultiplesScrolly.tsx";
import { applyStoryboard, assertNumbers, assertLegibleLabels, assertHeadlineNumbersDrawn, assertDrawsClaimColumn } from "./guards.mjs";
import { plain, refusing, storyLanguage } from "./web.mjs";
import { renderBeatScrolly, scrollySkill } from "./scrolly.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));

/** The cards, in the drive's order: the runner's own ids (never the model's words in an id). */
const CARDS = ["start", "rise", "byFrom", "scatter", "byGain", "reading"];
/** One state per card; see multiples-drive.mjs for what each field paints. The worked example's, verbatim. */
const STATES = [
  { grow: 0, byFrom: 0, byGain: 0, scatter: 0, ends: 0, note: 0 },
  { grow: 1, byFrom: 0, byGain: 0, scatter: 0, ends: 0, note: 1 },
  { grow: 1, byFrom: 1, byGain: 0, scatter: 0, ends: 0, note: 2 },
  { grow: 1, byFrom: 1, byGain: 0, scatter: 1, ends: 0, note: 3 },
  { grow: 1, byFrom: 1, byGain: 1, scatter: 0, ends: 1, note: 4 },
  { grow: 1, byFrom: 1, byGain: 1, scatter: 0, ends: 0, note: 5 },
];
/** The component's header-note slots (its NOTES), one per card, in the same order. */
const NOTE_SLOTS = ["startNote", "riseNote", "orderNote", "corrNote", "endsNote", "scaleNote"];

await refusing(HERE, async () => {
  const { default: beat } = await import("./beat.mjs");
  applyStoryboard(beat, HERE);
  const { renderScrolly } = await import(scrollySkill(HERE, "scripts", "render-scrolly.mjs"));

  const REQUIRED = ["eyebrow", "panels", "states", "xName", "yName", "format", "formatDelta", "cards", "notes", "title", "limits", "source", "alt", "check"];
  const missing = REQUIRED.filter((key) => beat[key] === undefined);
  if (missing.length) throw new Error(`beat.mjs is missing ${missing.join(", ")}: give each as a field of the default export (export default { …, ${missing[0]}: … }), not as a separate export (see CONTRACT.md)`);
  for (const fn of ["format", "formatDelta", "check"])
    if (typeof beat[fn] !== "function") throw new Error(`beat.mjs: ${fn} must be a function (see CONTRACT.md)`);
  for (const [group, keys] of [["cards", CARDS.slice(0, 5)], ["notes", CARDS]]) {
    const absent = keys.filter((k) => typeof beat[group]?.[k] !== "function");
    if (absent.length) throw new Error(`beat.mjs: ${group} must give a function for each of ${keys.join(", ")}; missing or not a function: ${absent.join(", ")} (see CONTRACT.md)`);
  }
  if (!(beat.states && beat.states.from !== undefined && beat.states.to !== undefined))
    throw new Error(`states must be { from, to }: the two states' labels, e.g. { from: "2000", to: "2024" }`);

  // ── the panels ────────────────────────────────────────────────────────────────────────────────
  if (!Array.isArray(beat.panels)) throw new Error(`panels must be an array of { name, from, to }, one per member`);
  const panels = beat.panels.map((p) => ({ name: String(p.name), from: p.from, to: p.to }));
  assertNumbers(panels.flatMap((p) => [[`${p.name}.from`, p.from], [`${p.name}.to`, p.to]]), "panels");
  if (panels.length < 6 || panels.length > 24)
    throw new Error(`panels holds ${panels.length} members: the grid lays six a row and card 4 fits a line through them — give between 6 and 24`);
  if (new Set(panels.map((p) => p.name)).size !== panels.length) throw new Error(`panels holds the same name twice: give each member ONE panel`);
  const offScale = panels.filter((p) => p.from < 0 || p.from > 100 || p.to < 0 || p.to > 100);
  if (offScale.length)
    throw new Error(`${offScale[0].name} runs ${offScale[0].from} → ${offScale[0].to}: the drive draws every bar on ONE scale from 0 to 100 (a share in percent), and card 4's x axis is 0–100, so every value must lie in 0–100. Express the measure as a percentage, or choose another type`);
  for (const p of panels) p.delta = p.to - p.from;
  const falling = panels.filter((p) => p.delta < 0);
  if (falling.length)
    throw new Error(`${falling.map((p) => p.name).join(", ")} fell between the two states: card 4's gain axis starts at 0, so a negative gain would fall off the scatter. This choreography is about members that all rose; choose another type`);

  const n = panels.length;
  const mean = (xs) => xs.reduce((s, v) => s + v, 0) / n;
  const mx = mean(panels.map((p) => p.from));
  const my = mean(panels.map((p) => p.delta));
  const cov = panels.reduce((s, p) => s + (p.from - mx) * (p.delta - my), 0);
  const vx = panels.reduce((s, p) => s + (p.from - mx) ** 2, 0);
  const vy = panels.reduce((s, p) => s + (p.delta - my) ** 2, 0);
  if (!(vx > 0 && vy > 0)) throw new Error(`every panel has the same first value or the same gain: card 4 fits a line through the points, and there is no spread to fit`);
  const correlation = cov / Math.sqrt(vx * vy);
  const slope = cov / vx;
  const fit = [slope, my - slope * mx];
  const byGain = [...panels].sort((a, b) => b.delta - a.delta);
  const [biggest, smallest] = [byGain[0], byGain[n - 1]];
  if (!(biggest.delta > smallest.delta)) throw new Error(`every panel gained the same: card 5 orders by gain and lights the two extremes`);
  const lowest = panels.reduce((a, b) => (b.from < a.from ? b : a));
  const highestStart = panels.reduce((a, b) => (b.from > a.from ? b : a));

  // The scatter's gain axis: a round top just above the largest gain, ticks on a nice step under it.
  const yMax = Math.ceil(biggest.delta / 10) * 10 || 10;
  const yStep = niceStep(yMax / 3.2);
  const yTicks = [];
  for (let t = 0; t <= yMax + 1e-9; t += yStep) yTicks.push(t);
  const xTicks = [0, 50, 100];

  const view = (p) => ({ name: p.name, from: p.from, to: p.to, delta: p.delta });
  const reading = {
    count: n,
    states: { from: beat.states.from, to: beat.states.to },
    panels: panels.map(view),
    lowest: view(lowest),
    highestStart: view(highestStart),
    risers: panels.filter((p) => p.delta > 0).length,
    correlation,
    slope,
    biggest: view(biggest),
    smallest: view(smallest),
    meanGain: my,
  };
  Object.freeze(reading);

  assertLegibleLabels(panels.flatMap((p) => [p.from, p.to]), beat.format);
  beat.check(reading);
  assertDrawsClaimColumn(panels.flatMap((p) => [p.from, p.to]), HERE);

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
    start: [["lowest.from", format(lowest.from)], ["highestStart.from", format(highestStart.from)]],
    rise: [],
    byFrom: [],
    scatter: [],
    byGain: [["biggest.delta", formatDelta(biggest.delta)], ["smallest.delta", formatDelta(smallest.delta)]],
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
    n, reading.risers, Math.abs(correlation), Math.abs(slope), my, 0, 100,
    ...panels.flatMap((p) => [p.from, p.to, Math.abs(p.delta)]),
  ];
  const dec = decimal === "." ? "\\." : ",";
  const figure = new RegExp(`(?<![\\p{L}\\d.,])(\\d{1,3}(?:${group}\\d{3})+(?:${dec}\\d+)?|\\d+(?:${dec}\\d+)?)(?![\\p{L}\\d])`, "gu");
  const figuresIn = (text) =>
    [...plain(text).matchAll(figure)].map((m) => {
      const raw = m[1];
      const [whole, frac = ""] = raw.split(decimal);
      return { raw, frac, n: Number(`${whole.replace(/[ .,]/g, "")}.${frac || "0"}`) };
    });
  const checkFigures = (where, text) => {
    for (const { raw, frac, n: v } of figuresIn(text)) {
      if (!frac && Number.isInteger(v) && v >= 1900 && v <= 2100) continue;
      const tolerance = 0.5 * 10 ** -frac.length + 1e-9;
      if (!known.some((k) => Math.abs(k - v) <= tolerance))
        throw new Error(`${where} states ${raw}, which no figure of these panels rounds to: every number in a card is computed — use the reading (r.lowest.from, r.correlation, r.biggest.delta, …) through format() / formatDelta(), never a typed or recomputed value. It says: ${text}`);
    }
  };
  // Card 4 is the scatter: it must state the correlation its fitted line draws, to at least two decimals.
  {
    const text = prose[3].join(" ");
    if (!figuresIn(text).some(({ frac, n: v }) => frac.length >= 2 && Math.abs(v - Math.abs(correlation)) <= 0.5 * 10 ** -frac.length + 1e-9))
      throw new Error(`card 4 (cards.scatter) must state the correlation r.correlation = ${correlation.toFixed(2)}, to at least two decimals — the figure its picture shows; it says: ${text}`);
  }
  CARDS.slice(0, 5).forEach((k, i) => checkFigures(`card ${i + 1} (cards.${k})`, prose[i].join(" ")));
  CARDS.forEach((k, i) => checkFigures(`notes.${k}`, notes[NOTE_SLOTS[i]]));

  const titleForms = [beat.title].flat().map(plain);
  assertHeadlineNumbersDrawn(titleForms[0], [...panels.flatMap((p) => [p.from, p.to, p.delta]), reading.risers], "panels");

  const eyebrow = plain(beat.eyebrow);
  const source = plain(beat.source);
  const alt = plain(typeof beat.alt === "function" ? beat.alt(reading) : beat.alt);
  checkFigures("alt", alt);
  // The runner's own keys (p1…pN), never the model's names in a selector.
  const drawn = panels.map((p, i) => ({
    key: `p${i + 1}`,
    label: plain(p.name),
    from: p.from,
    to: p.to,
    delta: p.delta,
    deltaText: formatDelta(p.delta),
    thread: p === biggest || p === smallest,
  }));
  const lang = beat.lang ?? storyLanguage(HERE) ?? "en";
  const collator = new Intl.Collator(lang);
  const indexOf = (p) => panels.indexOf(p);
  const orders = [
    [...panels].sort((a, b) => collator.compare(a.name, b.name)).map(indexOf),
    [...panels].sort((a, b) => a.from - b.from).map(indexOf),
    byGain.map(indexOf),
  ];
  const axes = { xName: plain(beat.xName), yName: plain(beat.yName), xTicks, yTicks, yMax };
  const years = [plain(beat.states.from), plain(beat.states.to)];

  const textPerRegister = {
    display: titleForms.join(" "),
    eyebrow,
    body: `${prose.flat().join(" ")} ${source}`,
    axis: `${axes.xName} ${axes.yName} ${[...xTicks, ...yTicks].join(" ")}`,
    annot: `${drawn.map((p) => p.label).join(" ")} ${years.join(" ")}`,
    value: `${drawn.map((p) => p.deltaText).join(" ")} ${Object.values(notes).join(" ")}`,
  };

  const driver = readFileSync(join(HERE, "multiples-drive.mjs"), "utf8");
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
          element: createElement(DirectedMultiplesScrolly, { panels: drawn, orders, fit, years, axes, words: notes, alt, regs, stroke: direction.stroke ?? {}, ground: direction.ground, accent: direction.accent, ink, muted, grid }),
          states: STATES,
          driver,
          apply: "applyMultiplesState",
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

/** 1, 2, 2.5 or 5 × a power of ten, the first at or above `raw`. */
function niceStep(raw) {
  const p = 10 ** Math.floor(Math.log10(raw));
  for (const m of [1, 2, 2.5, 5, 10]) if (m * p >= raw - 1e-9) return m * p;
  return 10 * p;
}
