// The generic half of a histogram SCROLLY beat, taken from
// proof/scrolly-carbon-footprint-spread/render-directions-scrolly.mjs with everything about ITS
// subject removed. The choreography is the worked example's and is not the model's to change — six
// cards, one continuous interpolation driven by the reader's scroll (spread-drive.mjs, verbatim):
//
//   1 dots     every observation a dot at its own value on the axis, the furthest one named;
//   2 bins     the dots falling into their bins' columns: the histogram;
//   3 cut      the threshold drawn, the dots under it in the accent, counted;
//   4 median   the median drawn;
//   5 tail     every observation at or above `tailFrom` named over its column;
//   6 reading  the columns give way to the bars, the cut kept; the card states the accounting (the limits).
//
// This file computes every figure the cards may state (the bins, the count under the threshold, the
// median, the tail) and checks the words against them; ./beat.mjs — the one file the model writes —
// gives the observations and the WORDS of each card. Copied into the beat by the harness; never
// edited by the model.
//
// Usage:  bun <beat>/render-beat.mjs
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createElement } from "react";
import { deriveFurniture } from "#shared/chart-beat/render-still.mjs";
import { webRegisters } from "#shared/design-base/web.mjs";
import { EYEBROW_TO_DISPLAY, gapOf, registerOf } from "#shared/design-base/register.mjs";
import { DirectedSpreadScrolly } from "./DirectedSpreadScrolly.tsx";
import { applyStoryboard, assertNumbers, assertHeadlineNumbersDrawn, assertDrawsClaimColumn } from "./guards.mjs";
import { plain, refusing, storyLanguage } from "./web.mjs";
import { renderBeatScrolly, scrollySkill } from "./scrolly.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));

/** The cards, in the drive's order: the runner's own ids (never the model's words in an id). */
const CARDS = ["dots", "bins", "cut", "median", "tail", "reading"];
/** One state per card; see spread-drive.mjs for what each field paints. The worked example's, verbatim. */
const STATES = [
  { stack: 0, bars: 0, cut: 0, median: 0, tail: 1, note: 0 },
  { stack: 1, bars: 0, cut: 0, median: 0, tail: 0, note: 1 },
  { stack: 1, bars: 0, cut: 1, median: 0, tail: 0, note: 2 },
  { stack: 1, bars: 0, cut: 1, median: 1, tail: 0, note: 3 },
  { stack: 1, bars: 0, cut: 0, median: 0, tail: 2, note: 4 },
  { stack: 1, bars: 1, cut: 1, median: 0, tail: 0, note: 5 },
];
/** The component's header-note slots, one per card, in the same order. */
const NOTE_SLOTS = ["dotNote", "binNote", "cutNote", "medianNote", "tailNote", "readNote"];
/** The most tail names the drive can stack over the columns. */
const MAX_TAIL = 12;

await refusing(HERE, async () => {
  const { default: beat } = await import("./beat.mjs");
  applyStoryboard(beat, HERE);
  const { renderScrolly } = await import(scrollySkill(HERE, "scripts", "render-scrolly.mjs"));

  const REQUIRED = ["eyebrow", "observations", "binWidth", "binCount", "threshold", "tailFrom", "unit", "format", "cards", "notes", "cutLabel", "medianLabel", "title", "limits", "source", "alt", "check"];
  const missing = REQUIRED.filter((key) => beat[key] === undefined);
  if (missing.length) throw new Error(`beat.mjs is missing ${missing.join(", ")}: give each as a field of the default export (export default { …, ${missing[0]}: … }), not as a separate export (see CONTRACT.md)`);
  for (const fn of ["format", "cutLabel", "medianLabel", "check"])
    if (typeof beat[fn] !== "function") throw new Error(`beat.mjs: ${fn} must be a function (see CONTRACT.md)`);
  if (beat.formatEdge !== undefined && typeof beat.formatEdge !== "function") throw new Error(`beat.mjs: formatEdge must be a function (see CONTRACT.md)`);
  for (const group of ["cards", "notes"]) {
    const keys = group === "cards" ? CARDS.slice(0, 5) : CARDS;
    const absent = keys.filter((k) => typeof beat[group]?.[k] !== "function");
    if (absent.length) throw new Error(`beat.mjs: ${group} must give a function for each of ${keys.join(", ")}; missing or not a function: ${absent.join(", ")} (see CONTRACT.md)`);
  }

  // ── the observations and the bins (the static kit's refusals) ───────────────────────────────────
  const obs = beat.observations;
  if (!Array.isArray(obs)) throw new Error(`observations must be an array of { name, value }, one per reading`);
  assertNumbers(obs.map((o) => [o.name, o.value]));
  const values = obs.map((o) => o.value);
  if (values.length < 20)
    throw new Error(`a histogram of ${values.length} readings is a handful of bars that look like a distribution: it needs at least 20 observations. With fewer, choose a dot strip or a ranked bar instead`);
  const start = beat.binStart ?? 0;
  const { binWidth, binCount, threshold, tailFrom } = beat;
  if (!Number.isFinite(start)) throw new Error(`binStart must be a number, it is ${beat.binStart}`);
  if (!(binWidth > 0)) throw new Error(`binWidth must be a positive number, it is ${binWidth}`);
  if (!(Number.isInteger(binCount) && binCount >= 4 && binCount <= 20))
    throw new Error(`binCount must be a whole number from 4 to 20, it is ${binCount}: change binWidth so that about ${Math.round((Math.max(...values) - start) / binWidth)} bins cover the readings, capped at 20`);
  const below = obs.filter((o) => o.value < start);
  if (below.length)
    throw new Error(`${below.length} observation(s) fall below the first bin edge ${start} (${below.slice(0, 3).map((o) => `${o.name}=${o.value}`).join(", ")}): set binStart at or under the smallest reading (${Math.min(...values)})`);
  const top = start + binCount * binWidth;
  if (!(threshold > start && threshold < top))
    throw new Error(`threshold ${threshold} is outside the bins (${start} to ${top}): the line the share is counted against must fall inside the drawn axis — set threshold, binStart or binWidth`);
  const edge = (v) => plain((beat.formatEdge ?? ((x) => String(x)))(v));
  const bins = Array.from({ length: binCount }, (_, i) => {
    const lo = start + i * binWidth;
    const open = i === binCount - 1;
    const count = obs.filter((o) => (open ? o.value >= lo : o.value >= lo && o.value < lo + binWidth)).length;
    return { index: i, lo, hi: open ? null : lo + binWidth, open, count, label: open ? `${edge(lo)}+` : `${edge(lo)}–${edge(lo + binWidth)}` };
  });
  const counted = bins.reduce((s, b) => s + b.count, 0);
  if (counted !== values.length) throw new Error(`the bins count ${counted} readings, not ${values.length}`);
  const tailBin = bins.at(-1);
  if (tailBin.count > values.length * 0.25)
    throw new Error(`the open last bin (${tailBin.lo} and above) holds ${tailBin.count} of ${values.length} readings: the bins stop too early. Raise binCount or binWidth so the open tail holds a few outliers, not a quarter of the data`);
  if (bins.filter((b) => b.count > 0).length < 2)
    throw new Error(`only ${bins.filter((b) => b.count > 0).length} bin(s) hold any reading: the bins are too wide for this spread. Lower binWidth (and raise binCount)`);
  if (new Set(bins.map((b) => b.label)).size !== bins.length)
    throw new Error(`the bin names print as ${bins.slice(0, 4).map((b) => b.label).join(", ")}…: pick a binWidth that gives round edges, or a formatEdge that prints them distinctly`);

  // ── the readings ────────────────────────────────────────────────────────────────────────────────
  const n = values.length;
  // In the beat's own order (the drive's jitter follows it), each with the runner's own key.
  const items = obs.map((o, i) => ({ name: plain(o.name), value: o.value, key: `o${i}` }));
  const sorted = [...items].sort((a, b) => a.value - b.value);
  const median = n % 2 ? sorted[(n - 1) / 2].value : (sorted[n / 2 - 1].value + sorted[n / 2].value) / 2;
  const under = obs.filter((o) => o.value < threshold).length;
  const tail = sorted.filter((o) => o.value >= tailFrom).reverse();
  const reading = Object.freeze({
    count: n,
    bins: bins.map((b) => Object.freeze({ ...b })),
    under,
    over: n - under,
    underShare: (under / n) * 100,
    median,
    furthest: sorted.at(-1),
    lowest: sorted[0],
    tail,
    tailFrom,
    threshold,
    binStart: start,
    binWidth,
    binCount,
    top,
  });

  beat.check(reading);
  assertDrawsClaimColumn(values, HERE);

  // ── what this choreography cannot draw honestly ─────────────────────────────────────────────────
  if (!tail.length) throw new Error(`no observation is at or above tailFrom (${tailFrom}; the largest is ${reading.furthest.value}): card 5 names the far tail, so it would name nothing. Lower tailFrom`);
  if (tail.length > MAX_TAIL) throw new Error(`${tail.length} observations are at or above tailFrom (${tailFrom}): card 5 writes every one's name over its column, and more than ${MAX_TAIL} pile up. Raise tailFrom`);
  if (new Set(tail.map((t) => t.name)).size !== tail.length) throw new Error(`two observations in the tail share a name: card 5 names each one, so give each its own`);

  // ── the words, each passed through plain(); every number they state is checked ───────────────────
  const say = (field, value) => {
    const text = typeof value === "function" ? value(reading) : value;
    const parts = [text].flat();
    if (!parts.length || parts.some((p) => typeof p !== "string" || !p.trim())) throw new Error(`${field} must return a non-empty sentence (or an array of paragraphs); it returned ${JSON.stringify(text)}`);
    return parts.map(plain);
  };
  const format = (v) => plain(beat.format(v));
  const prose = [...CARDS.slice(0, 5).map((k) => say(`cards.${k}`, beat.cards[k])), say("limits", [beat.limits].flat()[0])];
  const cardText = prose.map((p) => p.join(" "));
  const notes = Object.fromEntries(CARDS.map((k, i) => [NOTE_SLOTS[i], say(`notes.${k}`, beat.notes[k]).join(" ")]));
  const cutLabel = say("cutLabel", beat.cutLabel).join(" ");
  const medianLabel = say("medianLabel", beat.medianLabel).join(" ");

  // What each card is ABOUT, so it must say it: the figure its gesture puts on screen.
  const escape = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const has = (text, wanted) => new RegExp(`(?<![\\d.,])${escape(wanted)}(?![\\d])`).test(text);
  const OWES = [
    [0, "count", String(n)], [0, "furthest.value", format(reading.furthest.value)],
    [1, "binWidth", edge(binWidth)],
    [2, "under", String(under)], [2, "count", String(n)],
    [3, "median", format(median)],
    [4, "tail.length", String(tail.length)], [4, "tailFrom", edge(tailFrom)],
  ];
  for (const [i, what, wanted] of OWES)
    if (!has(cardText[i], wanted)) throw new Error(`card ${i + 1} (cards.${CARDS[i]}) must state ${what} = "${wanted}" — the figure its picture shows; it says: ${cardText[i]}`);
  if (!cardText[0].toLocaleLowerCase().includes(reading.furthest.name.toLocaleLowerCase()))
    throw new Error(`card 1 (cards.dots) must name the furthest observation, ${reading.furthest.name} — the one dot its picture names; it says: ${cardText[0]}`);
  if (!has(cutLabel, String(under))) throw new Error(`cutLabel must state under = "${under}" — it is written beside the cut; it says: ${cutLabel}`);
  if (!has(medianLabel, format(median))) throw new Error(`medianLabel must state the median, "${format(median)}"; it says: ${medianLabel}`);

  // Every other figure a card, a note or a label states must be one this kit computed, at the
  // precision it is written with. A year (1900–2100) and a figure glued to letters pass.
  // The decimal mark the words use: read off format(1.5), or — when format prints whole numbers — the language.
  const sample = plain(beat.format(1.5));
  const decimal = /\d,\d/.test(sample) ? "," : /\d\.\d/.test(sample) ? "." : /,/.test(new Intl.NumberFormat(beat.lang ?? storyLanguage(HERE) ?? "en").format(1.5)) ? "," : ".";
  const group = decimal === "," ? "[ .]" : "[ ,]";
  const known = [
    n, under, n - under, reading.underShare, reading.underShare / 10, median, binWidth, binCount, threshold, tailFrom, tail.length, start, top,
    ...bins.flatMap((b) => [b.count, b.lo]), ...tail.map((t) => t.value), reading.lowest.value,
  ];
  const dec = decimal === "." ? "\\." : ",";
  const figure = new RegExp(`(?<![\\p{L}\\d.,])(\\d{1,3}(?:${group}\\d{3})+(?:${dec}\\d+)?|\\d+(?:${dec}\\d+)?)(?![\\p{L}\\d])`, "gu");
  const checkFigures = (where, text) => {
    for (const m of plain(text).matchAll(figure)) {
      const raw = m[1];
      const [whole, frac = ""] = raw.split(decimal);
      const v = Number(`${whole.replace(/[ .,]/g, "")}.${frac || "0"}`);
      if (!frac && Number.isInteger(v) && v >= 1900 && v <= 2100) continue;
      const tolerance = 0.5 * 10 ** -frac.length + 1e-9;
      if (!known.some((k) => Math.abs(k - v) <= tolerance))
        throw new Error(`${where} states ${raw}, which no figure of these bins rounds to: every number in a card is computed — use the reading (r.count, r.under, r.median, r.furthest.value, r.tail.length, …) through format(), never a typed or recomputed value. It says: ${text}`);
    }
  };
  CARDS.slice(0, 5).forEach((k, i) => checkFigures(`card ${i + 1} (cards.${k})`, cardText[i]));
  CARDS.forEach((k, i) => checkFigures(`notes.${k}`, notes[NOTE_SLOTS[i]]));
  checkFigures("cutLabel", cutLabel);
  checkFigures("medianLabel", medianLabel);

  const titleForms = [beat.title].flat().map(plain);
  // The title counts against the cut ("6 countries in 10 emit under 4 tonnes"): the share in tenths,
  // its base, the threshold and the counts are what the cut card draws.
  assertHeadlineNumbersDrawn(titleForms[0], [under, n, threshold, median, reading.underShare, Math.round(reading.underShare / 10), 10], "observations");

  const eyebrow = plain(beat.eyebrow);
  const source = plain(beat.source);
  const unit = plain(beat.unit);
  const alt = plain(typeof beat.alt === "function" ? beat.alt(reading) : beat.alt);
  checkFigures("alt", alt);

  // The drive's axis starts at zero: every value is handed to it measured from binStart. Its keys
  // are the runner's own (it writes them into selectors unescaped).
  const words = { unit, cutLabel, medianLabel, ...notes };

  const textPerRegister = {
    display: titleForms.join(" "),
    eyebrow,
    body: `${prose.flat().join(" ")} ${source}`,
    axis: `${unit} ${bins.map((b) => b.label).join(" ")} ${tail.map((t) => t.name).join(" ")}`,
    annot: `${cutLabel} ${medianLabel}`,
    value: `${bins.map((b) => b.count).join(" ")} ${Object.values(notes).join(" ")}`,
  };

  const driver = readFileSync(join(HERE, "spread-drive.mjs"), "utf8");
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
          element: createElement(DirectedSpreadScrolly, {
            countries: items.map((o) => ({ code: o.key, value: o.value - start })),
            bins: bins.map((b) => ({ lo: b.index * binWidth, open: b.open, count: b.count, label: b.label })),
            binWidth,
            threshold: threshold - start,
            median: median - start,
            tail: tail.map((t) => ({ code: t.key, label: t.name })),
            words,
            alt,
            regs,
            ground: direction.ground,
            accent: direction.accent,
            ink,
            muted,
            grid,
          }),
          states: STATES,
          driver,
          apply: "applySpreadState",
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
