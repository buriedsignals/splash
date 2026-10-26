// The generic half of a population-pyramid SCROLLY beat, taken from
// proof/scrolly-swiss-age-pyramid/render-directions-scrolly.mjs with everything about ITS subject
// removed. The choreography is the worked example's and is not the model's to change — six cards,
// one continuous interpolation driven by the reader's scroll (pyramid-drive.mjs, verbatim):
//
//   1 left      the left half (in the accent), band by band, from the youngest up;
//   2 right     the right half mirrored: the pyramid;
//   3 diff      every band turned into its difference, right minus left, on a scale fitted to it;
//   4 crossing  the tipping band marked — the first from which the right half outnumbers the left in
//               every older band, with the left at least as many in every younger one;
//   5 oldest    the oldest bands as a ratio of right to left, every other band stepping back;
//   6 reading   the plain pyramid; the card states the accounting (the limits).
//
// This file computes every figure the cards may state (the totals, the crossing, the ratios, the
// ticks) and checks the words against them; ./beat.mjs — the one file the model writes — gives the
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
import { DirectedPyramidScrolly } from "./DirectedPyramidScrolly.tsx";
import { applyStoryboard, assertNumbers, assertHeadlineNumbersDrawn, assertDrawsClaimColumn } from "./guards.mjs";
import { plain, refusing, storyLanguage } from "./web.mjs";
import { renderBeatScrolly, scrollySkill } from "./scrolly.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));

/** The cards, in the drive's order: the runner's own ids (never the model's words in an id). */
const CARDS = ["left", "right", "diff", "crossing", "oldest", "reading"];
/** One state per card; see pyramid-drive.mjs for what each field paints. `N` is the number of bands;
 *  everything else is the worked example's, verbatim. */
const STATE_TABLE = (N) => [
  { men: N, women: 0, diff: 0, cross: 0, old: 0, note: 0 },
  { men: N, women: N, diff: 0, cross: 0, old: 0, note: 1 },
  { men: N, women: N, diff: 1, cross: 0, old: 0, note: 2 },
  { men: N, women: N, diff: 1, cross: 1, old: 0, note: 3 },
  { men: N, women: N, diff: 0, cross: 0, old: 1, note: 4 },
  { men: N, women: N, diff: 0, cross: 0, old: 0, note: -1 },
];
/** The component's header-note slots, cards 1 to 5 (card 6 reads none). */
const NOTE_SLOTS = ["menNote", "womenNote", "diffNote", "crossNote", "oldNote"];

/** Three or four round ticks under `top`: the smallest step of 1, 2, 2.5 or 5 × 10^k that is at least
 *  top / 4.5 (the worked example's 100 000 · 200 000 · 300 000 and 10 000 · 20 000 · 30 000). */
function roundTicks(top) {
  const raw = top / 4.5;
  const pow = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * pow).find((s) => s >= raw) ?? 10 * pow;
  const out = [];
  for (let v = step; v <= top + 1e-9 && out.length < 4; v += step) out.push(Math.round(v * 1e6) / 1e6);
  return out;
}

await refusing(HERE, async () => {
  const { default: beat } = await import("./beat.mjs");
  applyStoryboard(beat, HERE);
  const { renderScrolly } = await import(scrollySkill(HERE, "scripts", "render-scrolly.mjs"));

  const REQUIRED = ["eyebrow", "bands", "leftName", "rightName", "surplus", "unit", "format", "formatRatio", "crossingLabel", "cards", "notes", "title", "limits", "source", "alt", "check"];
  const missing = REQUIRED.filter((key) => beat[key] === undefined);
  if (missing.length) throw new Error(`beat.mjs is missing ${missing.join(", ")} (see CONTRACT.md)`);
  for (const fn of ["format", "formatRatio", "crossingLabel", "check"])
    if (typeof beat[fn] !== "function") throw new Error(`beat.mjs: ${fn} must be a function (see CONTRACT.md)`);
  for (const group of ["cards", "notes"]) {
    const keys = CARDS.slice(0, 5);
    const absent = keys.filter((k) => typeof beat[group]?.[k] !== "function");
    if (absent.length) throw new Error(`beat.mjs: ${group} must give a function for each of ${keys.join(", ")}; missing or not a function: ${absent.join(", ")} (see CONTRACT.md)`);
  }
  if (typeof beat.surplus?.left !== "string" || typeof beat.surplus?.right !== "string")
    throw new Error(`surplus must be { left, right }: the names over each half once every band is its difference ("more men", "more women")`);

  // ── the bands, youngest first ─────────────────────────────────────────────────────────────────
  if (!Array.isArray(beat.bands) || beat.bands.length < 5 || beat.bands.length > 30)
    throw new Error(`bands holds ${beat.bands?.length ?? 0} bands; a pyramid here draws 5 to 30, youngest first`);
  assertNumbers(beat.bands.flatMap((b) => [[`${b.band}.left`, b.left], [`${b.band}.right`, b.right]]), "bands");
  const names = beat.bands.map((b) => String(b.band));
  if (new Set(names).size !== names.length) throw new Error(`two bands share a name (${names.join(", ")}): one row per band — filter data.json to one year`);
  // The drive finds each band's marks by its name in a selector.
  const unsafe = names.filter((n) => /["\\\]\[]/.test(n));
  if (unsafe.length) throw new Error(`band names ${unsafe.join(", ")} hold a quote, a bracket or a backslash: write the band as plain text ("60-64", "100+")`);
  if (beat.bands.some((b) => b.left < 0 || b.right < 0)) throw new Error(`a band holds a negative count: each half runs from zero outward`);
  const bands = beat.bands.map((b) => ({ band: String(b.band), left: b.left, right: b.right }));

  // THE TIPPING BAND, derived as the worked example derives it.
  const crossingIndex = bands.findIndex((_, i) => i > 0 && bands.slice(i).every((b) => b.right > b.left) && bands.slice(0, i).every((b) => b.left >= b.right));
  if (crossingIndex < 0)
    throw new Error(`there is no band from which the right half (${beat.rightName}) outnumbers the left (${beat.leftName}) in every older band, with the left at least as many in every younger one: card 4 marks that band. Check that bands is youngest first and left/right are the right way round, or choose another treatment`);
  const OLDEST = beat.oldestCount ?? 3;
  if (!(Number.isInteger(OLDEST) && OLDEST >= 2 && OLDEST <= 4)) throw new Error(`oldestCount is ${beat.oldestCount}: card 5 measures the 2 to 4 oldest bands`);
  if (bands.length - crossingIndex < OLDEST) throw new Error(`only ${bands.length - crossingIndex} band(s) lie at or above the crossing, fewer than the ${OLDEST} oldest card 5 measures: lower oldestCount`);
  if (bands.slice(-OLDEST).some((b) => !(b.left > 0))) throw new Error(`an oldest band has no ${beat.leftName}: card 5's ratio would divide by zero`);
  const crossing = bands[crossingIndex];
  const oldest = bands.slice(-OLDEST).map((b) => ({ ...b, ratio: b.right / b.left }));
  const totalLeft = bands.reduce((s, b) => s + b.left, 0);
  const totalRight = bands.reduce((s, b) => s + b.right, 0);
  const reading = {
    count: bands.length,
    bands: bands.map((b) => ({ ...b })),
    totalLeft,
    totalRight,
    crossing: { ...crossing, diff: crossing.right - crossing.left, index: crossingIndex },
    below: { ...bands[crossingIndex - 1] },
    oldest,
  };
  Object.freeze(reading);
  beat.check(reading);
  assertDrawsClaimColumn(bands.flatMap((b) => [b.left, b.right]), HERE);

  // ── the words, each passed through plain(); every number they state is checked ───────────────────
  const say = (field, value) => {
    const text = typeof value === "function" ? value(reading) : value;
    const parts = [text].flat();
    if (!parts.length || parts.some((p) => typeof p !== "string" || !p.trim())) throw new Error(`${field} must return a non-empty sentence (or an array of paragraphs); it returned ${JSON.stringify(text)}`);
    return parts.map(plain);
  };
  const format = (v) => plain(beat.format(v));
  const formatRatio = (v) => plain(beat.formatRatio(v));
  const prose = [...CARDS.slice(0, 5).map((k) => say(`cards.${k}`, beat.cards[k])), say("limits", [beat.limits].flat()[0])];
  const notes = Object.fromEntries(CARDS.slice(0, 5).map((k, i) => [NOTE_SLOTS[i], say(`notes.${k}`, beat.notes[k]).join(" ")]));
  const cardText = (i) => prose[i].join(" ");

  const lang = beat.lang ?? storyLanguage(HERE) ?? "en";
  const printed = String(beat.formatRatio(1.5));
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

  // What each card is ABOUT, so it must say it: the figures its picture shows.
  const owes = (i, what, v) => {
    if (!figuresOf(cardText(i)).some((f) => within(f, v))) throw new Error(`card ${i + 1} (cards.${CARDS[i]}) must state ${what} = ${Number.isInteger(v) ? String(v) : format(v)} — the figure its picture shows; it says: ${cardText(i)}`);
  };
  owes(0, "r.totalLeft", totalLeft);
  owes(1, "r.totalRight", totalRight);
  if (!cardText(3).includes(plain(crossing.band))) throw new Error(`card 4 (cards.crossing) must name the crossing band ${crossing.band}; it says: ${cardText(3)}`);
  owes(3, "r.crossing.right", crossing.right);
  owes(3, "r.crossing.left", crossing.left);
  for (const o of oldest) {
    if (!figuresOf(cardText(4)).some((f) => within(f, o.ratio))) throw new Error(`card 5 (cards.oldest) must state the ratio at ${o.band}, ${formatRatio(o.ratio)} — the figure its picture shows; it says: ${cardText(4)}`);
  }

  // Every other figure a card, a note or the alt text states must be one this kit computed, at the
  // precision it is written with. A year (1900–2100) and a figure glued to letters pass; the numbers
  // inside a band's name ("60-64") are the band's, so they count as known.
  const ticks = roundTicks(Math.max(...bands.flatMap((b) => [b.left, b.right])));
  const maxDiff = Math.max(...bands.map((b) => Math.abs(b.right - b.left)));
  const diffTicks = roundTicks(maxDiff * 1.15);
  const bandNumbers = names.flatMap((n) => (n.match(/\d+/g) ?? []).map(Number));
  const known = [
    bands.length, totalLeft, totalRight, totalLeft + totalRight, crossing.right - crossing.left, OLDEST,
    ...bands.flatMap((b) => [b.left, b.right, b.right - b.left, b.left - b.right]), ...oldest.map((o) => o.ratio),
    ...ticks, ...diffTicks, ...bandNumbers,
  ];
  const checkFigures = (where, text) => {
    for (const f of figuresOf(text)) {
      if (!f.frac && Number.isInteger(f.n) && f.n >= 1900 && f.n <= 2100) continue;
      if (!known.some((v) => within(f, v)))
        throw new Error(`${where} states ${f.raw}, which no figure of this pyramid rounds to: every number in a card is computed — use the reading (r.totalLeft, r.crossing.right, r.oldest[i].ratio, …) through format() / formatRatio(), never a typed or recomputed value. It says: ${text}`);
    }
  };
  CARDS.slice(0, 5).forEach((k, i) => checkFigures(`card ${i + 1} (cards.${k})`, cardText(i)));
  CARDS.slice(0, 5).forEach((k, i) => checkFigures(`notes.${k}`, notes[NOTE_SLOTS[i]]));

  const titleForms = [beat.title].flat().map(plain);
  // The title may state the crossing band's own bounds ("from 60-64"), which the plate writes.
  assertHeadlineNumbersDrawn(titleForms[0], [...bands.flatMap((b) => [b.left, b.right]), ...bandNumbers], "bands");

  const eyebrow = plain(beat.eyebrow);
  const source = plain(beat.source);
  const alt = plain(typeof beat.alt === "function" ? beat.alt(reading) : beat.alt);
  checkFigures("alt", alt);
  const crossLabel = plain(beat.crossingLabel(reading));
  checkFigures("crossingLabel", crossLabel);
  const words = {
    ...notes,
    totalNote: plain(beat.unit),
    men: plain(beat.leftName),
    women: plain(beat.rightName),
    menSurplus: plain(beat.surplus.left),
    womenSurplus: plain(beat.surplus.right),
    crossLabel,
  };
  const oldBands = oldest.map((o) => o.band);
  const drawn = bands.map((b) => {
    const o = oldest.find((x) => x.band === b.band);
    return {
      band: plain(b.band),
      male: b.left,
      female: b.right,
      ratioText: o ? `× ${formatRatio(o.ratio)}` : "",
      diffText: b === crossing ? `+${format(b.right - b.left)}` : "",
    };
  });
  const tickTexts = ticks.map((v) => ({ value: v, text: format(v) }));
  const diffTickTexts = diffTicks.map((v) => ({ value: v, text: format(v) }));

  const textPerRegister = {
    display: titleForms.join(" "),
    eyebrow,
    body: `${prose.flat().join(" ")} ${source}`,
    axis: `${words.menSurplus} ${words.womenSurplus} ${words.totalNote} ${[...tickTexts, ...diffTickTexts].map((t) => t.text).join(" ")}`,
    annot: `${words.men} ${words.women} ${drawn.map((b) => b.band).join(" ")} ${words.crossLabel}`,
    value: `${drawn.map((b) => `${b.ratioText} ${b.diffText}`).join(" ")} ${Object.values(notes).join(" ")}`,
  };

  const STATES = STATE_TABLE(bands.length);
  const driver = readFileSync(join(HERE, "pyramid-drive.mjs"), "utf8");
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
          element: createElement(DirectedPyramidScrolly, { bands: drawn, crossing: plain(crossing.band), oldest: oldBands.map(plain), ticks: tickTexts, diffTicks: diffTickTexts, words, alt, regs, ground: direction.ground, accent: direction.accent, ink, muted, grid }),
          states: STATES,
          driver,
          apply: "applyPyramidState",
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
