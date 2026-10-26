// The generic half of a line SCROLLY beat, taken from
// proof/scrolly-line-swiss-co2/render-directions-scrolly.mjs with everything about ITS subject
// removed. The choreography is the worked example's and is not the model's to change — six cards,
// one continuous interpolation driven by the reader's scroll (line-drive.mjs, verbatim):
//
//   1 rise     the line drawn from its first year to the reference year, that level set as a rule;
//   2 peak     the line drawn on to the series' highest year, marked and written;
//   3 plateau  the line drawn to the plateau's end, the plateau shaded as a band (its floor written),
//              its highest year after the peak marked and written;
//   4 cross    the fall drawn to the last year, the first year after the reference under the rule ringed;
//   5 zoom     both scales travel to the close-up window, every year a dot and its value;
//   6 reading  the static plate (rule, peak, last year); the card states the accounting (the limits).
//
// This file computes every figure the cards may state (the reference, the peak, the plateau's floor
// and its highest year, the crossing, the last year, the gaps) and checks the words against them;
// ./beat.mjs — the one file the model writes — gives the series, the three years that place the
// gestures, and the WORDS of each card. Copied into the beat by the harness; never edited by the model.
//
// Usage:  bun <beat>/render-beat.mjs
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createElement } from "react";
import { deriveFurniture } from "#shared/chart-beat/render-still.mjs";
import { webRegisters } from "#shared/design-base/web.mjs";
import { EYEBROW_TO_DISPLAY, gapOf, registerOf } from "#shared/design-base/register.mjs";
import { DirectedLineScrolly } from "./DirectedLineScrolly.tsx";
import { applyStoryboard, assertNumbers, assertOnePerX, assertHeadlineNumbersDrawn, assertDrawsClaimColumn } from "./guards.mjs";
import { plain, refusing, storyLanguage } from "./web.mjs";
import { renderBeatScrolly, scrollySkill } from "./scrolly.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));

/** The cards, in the drive's order: the runner's own ids (never the model's words in an id). */
const CARDS = ["rise", "peak", "plateau", "cross", "zoom", "reading"];
/** The component's header-note slots, one per card, in the same order. */
const NOTE_SLOTS = ["startNote", "peakNote", "plateauNote", "crossNote", "zoomNote", "readNote"];
/** The plot's labels, each worded by beat.labels.<key>(r). */
const LABELS = ["reference", "peak", "runnerUp", "plateau", "cross", "end"];

/** The smallest 1, 2 or 5 × 10^k at or above `raw`. */
const niceStep = (raw) => {
  const p = 10 ** Math.floor(Math.log10(raw));
  return [1, 2, 5, 10].map((m) => m * p).find((s) => s >= raw - 1e-12);
};

await refusing(HERE, async () => {
  const { default: beat } = await import("./beat.mjs");
  applyStoryboard(beat, HERE);
  const { renderScrolly } = await import(scrollySkill(HERE, "scripts", "render-scrolly.mjs"));

  const REQUIRED = ["eyebrow", "data", "unit", "format", "referenceYear", "plateauTo", "cards", "notes", "labels", "title", "limits", "source", "alt", "check"];
  const missing = REQUIRED.filter((key) => beat[key] === undefined);
  if (missing.length) throw new Error(`beat.mjs is missing ${missing.join(", ")}: give each as a field of the default export (export default { …, ${missing[0]}: … }), not as a separate export (see CONTRACT.md)`);
  for (const fn of ["format", "check"])
    if (typeof beat[fn] !== "function") throw new Error(`beat.mjs: ${fn} must be a function (see CONTRACT.md)`);
  for (const [group, keys] of [["cards", CARDS.slice(0, 5)], ["notes", CARDS], ["labels", LABELS]]) {
    const absent = keys.filter((k) => typeof beat[group]?.[k] !== "function");
    if (absent.length) throw new Error(`beat.mjs: ${group} must give a function for each of ${keys.join(", ")}; missing or not a function: ${absent.join(", ")} (see CONTRACT.md)`);
  }

  // ── the series: one reading per year, every year present (the drive reads year → index) ─────────
  if (!Array.isArray(beat.data)) throw new Error(`data must be an array of { year, value }, one per year (use series() from series.mjs)`);
  assertNumbers(beat.data.map((d) => [d.year, d.value]));
  assertOnePerX(beat.data);
  const rows = [...beat.data].map((d) => ({ year: Number(d.year), value: Number(d.value) })).sort((a, b) => a.year - b.year);
  if (rows.length < 12) throw new Error(`data holds ${rows.length} years; this choreography (a rise, a peak, a plateau, a fall, a close-up) needs at least 12`);
  if (rows.some((r) => !Number.isInteger(r.year))) throw new Error(`data's years must be whole years; one is ${rows.find((r) => !Number.isInteger(r.year)).year}`);
  for (let i = 1; i < rows.length; i++)
    if (rows[i].year !== rows[i - 1].year + 1)
      throw new Error(`data jumps from ${rows[i - 1].year} to ${rows[i].year}: the line is drawn year by year and a gap must not be bridged — give every year, or start data after the gap (series(…, { from }))`);
  if (rows.some((r) => r.value < 0)) throw new Error(`data holds a negative value: the wide view reads from zero; this type cannot draw a negative year`);

  const first = rows[0];
  const last = rows[rows.length - 1];
  const at = (year) => rows.find((r) => r.year === year);
  const reference = at(beat.referenceYear);
  if (!reference || beat.referenceYear === first.year)
    throw new Error(`referenceYear is ${beat.referenceYear}: it must be a year of data after the first (${first.year}–${last.year}) — card 1 draws the line from ${first.year} up to it`);
  const peak = rows.reduce((a, b) => (b.value > a.value ? b : a));
  if (!(peak.year > reference.year))
    throw new Error(`the highest year is ${peak.year}, not after referenceYear ${reference.year}: card 2 draws the line ON from the reference to the peak. Choose a referenceYear before the peak`);
  if (!(Number.isInteger(beat.plateauTo) && beat.plateauTo > peak.year + 1 && beat.plateauTo < last.year))
    throw new Error(`plateauTo is ${beat.plateauTo}: card 3 shades the years after the peak (${peak.year}) up to plateauTo as a band, and card 4 draws the fall after it — give a year between ${peak.year + 2} and ${last.year - 1}`);
  const plateauYears = rows.filter((r) => r.year > peak.year && r.year <= beat.plateauTo);
  const floor = plateauYears.reduce((a, b) => (b.value < a.value ? b : a));
  const runnerUp = plateauYears.reduce((a, b) => (b.value > a.value ? b : a));
  const cross = rows.find((r) => r.year > reference.year && r.value < reference.value);
  if (!cross)
    throw new Error(`no year after ${reference.year} is under its level (${reference.value}): card 4 rings the first year the curve goes back under the rule. Check referenceYear`);
  if (!(cross.year > beat.plateauTo))
    throw new Error(`the curve first goes under the ${reference.year} level in ${cross.year}, inside the plateau (to ${beat.plateauTo}): card 4 draws the fall AFTER the plateau crossing the rule. Set plateauTo before ${cross.year}`);
  if (!(first.value < reference.value))
    throw new Error(`the first year (${first.year}, ${first.value}) is not under the ${reference.year} level (${reference.value}): card 1 draws the rise up to the rule, whose name sits above it at the left where the early line runs under it. Start data later or choose another referenceYear`);
  const zoomFrom = beat.zoomFrom ?? last.year - 9;
  if (!(Number.isInteger(zoomFrom) && zoomFrom > first.year && zoomFrom <= cross.year && last.year - zoomFrom >= 4))
    throw new Error(`zoomFrom is ${zoomFrom}: card 5's close-up must start after the first year, at or before the crossing (${cross.year}) so its ring stays in the window, and hold at least 5 years to ${last.year}`);
  const zoomRows = rows.filter((r) => r.year >= zoomFrom);

  const reading = Object.freeze({
    count: rows.length,
    first: { ...first },
    last: { ...last },
    reference: { ...reference },
    ratio: reference.value / first.value,
    peak: { ...peak },
    yearsToPeak: peak.year - reference.year,
    plateau: Object.freeze({ from: peak.year + 1, to: beat.plateauTo, floor: { ...floor }, runnerUp: { ...runnerUp } }),
    runnerUp: { ...runnerUp },
    peakGap: peak.value - runnerUp.value,
    plateauEnd: { ...at(beat.plateauTo) },
    highestAfterPlateau: rows.filter((r) => r.year > beat.plateauTo).reduce((a, b) => (b.value > a.value ? b : a)),
    cross: { ...cross },
    gap: reference.value - last.value,
    zoomFrom,
    zoom: Object.freeze(zoomRows.map((r) => ({ ...r }))),
  });

  beat.check(reading);
  assertDrawsClaimColumn(rows.map((r) => r.value), HERE);

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
  const labelText = Object.fromEntries(LABELS.map((k) => [k, say(`labels.${k}`, beat.labels[k]).join(" ")]));

  const owns = (text, wanted) => new RegExp(`(?<![\\d.,])${wanted.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?![\\d])`).test(text);
  // What each card is ABOUT, so it must say it: the figure its gesture puts on screen.
  const OWES = {
    rise: [["first.value", format(first.value)], ["reference.value", format(reference.value)]],
    peak: [["peak.value", format(peak.value)]],
    plateau: [["plateau.floor.value", format(floor.value)], ["runnerUp.value", format(runnerUp.value)]],
    cross: [["cross.year", String(cross.year)]],
    zoom: [["cross.value", format(cross.value)], ["last.value", format(last.value)], ["gap", format(reading.gap)]],
  };
  CARDS.slice(0, 5).forEach((k, i) => {
    const text = prose[i].join(" ");
    for (const [what, wanted] of OWES[k])
      if (!owns(text, wanted)) throw new Error(`card ${i + 1} (cards.${k}) must state ${what} = "${wanted}" — the figure its picture shows; it says: ${text}`);
  });
  const LABEL_OWES = { reference: reference.value, peak: peak.value, runnerUp: runnerUp.value, plateau: floor.value, cross: cross.value, end: last.value };
  for (const k of LABELS)
    if (!owns(labelText[k], format(LABEL_OWES[k])))
      throw new Error(`labels.${k} must state "${format(LABEL_OWES[k])}" — the value of the point it names; it says: ${labelText[k]}`);

  // Every other figure a card, a note, a label or the alt states must be one this kit computed, at the
  // precision it is written with. A year (1900–2100) and a figure glued to letters (CO2, 10e) pass.
  const decimal = /,/.test(beat.format(1.5)) ? "," : ".";
  const group = decimal === "," ? "[ .]" : "[ ,]";
  const known = [
    reading.count, first.value, reference.value, reading.ratio, peak.value, reading.yearsToPeak, floor.value, runnerUp.value,
    reading.peakGap, reading.plateauEnd.value, cross.value, last.value, reading.gap, ...zoomRows.map((r) => r.value),
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
        throw new Error(`${where} states ${raw}, which no figure of this series rounds to: every number in a card is computed — use the reading (r.reference.value, r.peak.value, r.plateau.floor.value, r.gap, …) through format(), never a typed or recomputed value. It says: ${text}`);
    }
  };
  CARDS.slice(0, 5).forEach((k, i) => checkFigures(`card ${i + 1} (cards.${k})`, prose[i].join(" ")));
  CARDS.forEach((k, i) => checkFigures(`notes.${k}`, notes[NOTE_SLOTS[i]]));
  LABELS.forEach((k) => checkFigures(`labels.${k}`, labelText[k]));

  const titleForms = [beat.title].flat().map(plain);
  const title = titleForms[0];
  // The title may state the gap under the reference or the years from the reference to the last
  // reading — figures the plate carries (card 5 writes the gap, the rule runs to the last year).
  assertHeadlineNumbersDrawn(title, [...rows.map((r) => r.value), reading.gap, last.year - reference.year], "series");

  const eyebrow = plain(beat.eyebrow);
  const source = plain(beat.source);
  const unit = plain(beat.unit);
  const alt = plain(typeof beat.alt === "function" ? beat.alt(reading) : beat.alt);
  checkFigures("alt", alt);

  // ── the scales: the wide view from zero, the close-up fitted to its window (the proof's own) ──────
  const yStep = niceStep(peak.value / 5);
  let yTop = Math.ceil(peak.value / yStep) * yStep;
  if (yTop - peak.value < yStep * 0.1) yTop += yStep;
  const xStep = niceStep((last.year - first.year) / 4);
  const zoomValues = zoomRows.map((r) => r.value);
  const zStep = niceStep((Math.max(...zoomValues) - Math.min(...zoomValues)) / 4 || yStep / 5);
  // The proof's close-up: a half-step under the lowest value's floor less a step, a half-step over the
  // highest's ceiling (Mt: [floor(min) − 2, ceil(max) + 1], ticks every 2).
  const zHalf = zStep / 2;
  const zLo = Math.floor(Math.min(...zoomValues) / zHalf) * zHalf - zStep;
  const zHi = Math.ceil(Math.max(...zoomValues) / zHalf) * zHalf + zHalf;
  const domains = {
    wide: { x: [first.year, last.year], y: [0, yTop] },
    zoom: { x: [zoomFrom - 0.5, last.year + 0.5], y: [Math.max(0, zLo), zHi] },
  };
  const round = (v) => Math.round(v * 1e6) / 1e6;
  const range = (from, to, step) => {
    const out = [];
    for (let t = from; t <= to + 1e-9; t += step) out.push(round(t));
    return out;
  };
  const zxStep = Math.max(1, Math.round((last.year - zoomFrom) / 3));
  const zoomX = range(zoomFrom, last.year - zxStep / 2, zxStep);
  const ticks = {
    wide: { x: range(first.year, last.year, xStep), y: range(0, yTop, yStep) },
    zoom: { x: [...zoomX, last.year], y: range(Math.ceil(domains.zoom.y[0] / zStep) * zStep, zHi, zStep) },
  };

  /** One state per card; see line-drive.mjs for what each field paints. The worked example's, verbatim. */
  const STATES = [
    { reach: reference.year, peak: 0, band: 0, runner: 0, cross: 0, zoom: 0, end: 0, note: 0 },
    { reach: peak.year, peak: 1, band: 0, runner: 0, cross: 0, zoom: 0, end: 0, note: 1 },
    { reach: beat.plateauTo, peak: 1, band: 1, runner: 1, cross: 0, zoom: 0, end: 0, note: 2 },
    { reach: last.year, peak: 0, band: 0, runner: 0, cross: 1, zoom: 0, end: 0, note: 3 },
    { reach: last.year, peak: 0, band: 0, runner: 0, cross: 1, zoom: 1, end: 0, note: 4 },
    { reach: last.year, peak: 1, band: 0, runner: 0, cross: 0, zoom: 0, end: 1, note: 5 },
  ];

  const labels = {
    reference: { year: reference.year, value: reference.value, text: labelText.reference },
    peak: { year: peak.year, value: peak.value, text: labelText.peak },
    runnerUp: { year: runnerUp.year, value: runnerUp.value, text: labelText.runnerUp },
    cross: { year: cross.year, value: cross.value, text: labelText.cross },
    end: { year: last.year, value: last.value, text: labelText.end },
  };
  const plateau = { from: peak.year, to: beat.plateauTo, lo: floor.value, hi: peak.value, text: labelText.plateau };
  const zoomYears = zoomRows.map((r) => ({ year: r.year, value: r.value, text: format(r.value) }));
  const words = { unit, ...notes };

  const textPerRegister = {
    display: titleForms.join(" "),
    eyebrow,
    body: `${prose.flat().join(" ")} ${source}`,
    axis: `${unit} ${[...ticks.wide.x, ...ticks.wide.y, ...ticks.zoom.x, ...ticks.zoom.y].join(" ")}`,
    annot: `${labels.reference.text} ${labels.peak.text} ${labels.runnerUp.text} ${plateau.text}`,
    value: `${labels.cross.text} ${labels.end.text} ${zoomYears.map((z) => z.text).join(" ")} ${Object.values(notes).join(" ")}`,
  };

  const driver = readFileSync(join(HERE, "line-drive.mjs"), "utf8");
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
          element: createElement(DirectedLineScrolly, {
            points: rows.map((r) => [r.year, r.value]),
            ...labels,
            plateau,
            zoomYears,
            domains,
            ticks,
            words,
            alt,
            regs,
            stroke: direction.stroke ?? {},
            ground: direction.ground,
            accent: direction.accent,
            ink,
            muted,
            grid,
          }),
          states: STATES,
          driver,
          apply: "applyLineState",
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
