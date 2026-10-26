// The generic half of a box-plot SCROLLY beat, taken from
// proof/scrolly-boxplot-france-co2-decades/render-directions-scrolly.mjs with everything about ITS
// subject removed. The choreography is the worked example's and is not the model's to change — six
// cards, one continuous interpolation driven by the reader's scroll (boxplot-drive.mjs, verbatim):
//
//   1 years    every year a point in time, the highest year named;
//   2 decades  the points travel into one column per decade;
//   3 boxes    each column closes into its box (quartiles, median, whiskers at 1.5 × IQR); the points
//              step back, an outlier stays a point and is named;
//   4 medians  the medians joined and written;
//   5 spread   the widest decade and the last one kept, their extents written, the rest stepping back;
//   6 reading  the static plate, the whisker rule written on it; the card states the accounting.
//
// The drive groups YEARS into DECADES (a column holds at most ten years, a point's slot is its year
// in the decade). This file computes every figure the cards may state (each decade's five numbers,
// the outlier, the peak year, the widest decade) and checks the words against them; ./beat.mjs —
// the one file the model writes — gives the series and the WORDS of each card. Copied into the beat
// by the harness; never edited by the model.
//
// Usage:  bun <beat>/render-beat.mjs
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createElement } from "react";
import { quantile } from "d3-array";
import { deriveFurniture } from "#shared/chart-beat/render-still.mjs";
import { webRegisters } from "#shared/design-base/web.mjs";
import { EYEBROW_TO_DISPLAY, gapOf, registerOf } from "#shared/design-base/register.mjs";
import { DirectedBoxplotScrolly } from "./DirectedBoxplotScrolly.tsx";
import { applyStoryboard, assertNumbers, assertOnePerX, assertHeadlineNumbersDrawn, assertDrawsClaimColumn } from "./guards.mjs";
import { plain, refusing, storyLanguage } from "./web.mjs";
import { renderBeatScrolly, scrollySkill } from "./scrolly.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));

/** The cards, in the drive's order: the runner's own ids (never the model's words in an id). */
const CARDS = ["years", "decades", "boxes", "medians", "spread", "reading"];
/** The component's header-note slots, one per card, in the same order. */
const NOTE_SLOTS = ["yearsNote", "decadesNote", "boxNote", "medianNote", "spreadNote", "ruleNote"];
/** The whisker rule the component and the drive draw: 1.5 × the interquartile range. */
const FENCE = 1.5;
/** One state per card; see boxplot-drive.mjs for what each field paints. The worked example's, verbatim. */
const STATES = [
  { group: 0, box: 0, medians: 0, spread: 0, rule: 0, note: 0 },
  { group: 1, box: 0, medians: 0, spread: 0, rule: 0, note: 1 },
  { group: 1, box: 1, medians: 0, spread: 0, rule: 0, note: 2 },
  { group: 1, box: 1, medians: 1, spread: 0, rule: 0, note: 3 },
  { group: 1, box: 1, medians: 0, spread: 1, rule: 0, note: 4 },
  { group: 1, box: 1, medians: 0, spread: 0, rule: 1, note: 5 },
];

/** The smallest 1, 2 or 5 × 10^k at or above `raw`. */
const niceStep = (raw) => {
  const p = 10 ** Math.floor(Math.log10(raw));
  return [1, 2, 5, 10].map((m) => m * p).find((s) => s >= raw - 1e-12);
};

await refusing(HERE, async () => {
  const { default: beat } = await import("./beat.mjs");
  applyStoryboard(beat, HERE);
  const { renderScrolly } = await import(scrollySkill(HERE, "scripts", "render-scrolly.mjs"));

  const REQUIRED = ["eyebrow", "data", "unit", "format", "cards", "notes", "labels", "title", "limits", "source", "alt", "check"];
  const missing = REQUIRED.filter((key) => beat[key] === undefined);
  if (missing.length) throw new Error(`beat.mjs is missing ${missing.join(", ")}: give each as a field of the default export (export default { …, ${missing[0]}: … }), not as a separate export (see CONTRACT.md)`);
  for (const fn of ["format", "check"])
    if (typeof beat[fn] !== "function") throw new Error(`beat.mjs: ${fn} must be a function (see CONTRACT.md)`);
  const LABELS = ["decade", "median", "count", "spread", "peak", "outlier", "rule"];
  for (const [group, keys] of [["cards", CARDS.slice(0, 5)], ["notes", CARDS], ["labels", LABELS]]) {
    const absent = keys.filter((k) => typeof beat[group]?.[k] !== "function");
    if (absent.length) throw new Error(`beat.mjs: ${group} must give a function for each of ${keys.join(", ")}; missing or not a function: ${absent.join(", ")} (see CONTRACT.md)`);
  }

  // ── the series: one reading per year, every year present ────────────────────────────────────────
  if (!Array.isArray(beat.data)) throw new Error(`data must be an array of { year, value }, one per year (use series() from series.mjs)`);
  assertNumbers(beat.data.map((d) => [d.year, d.value]));
  assertOnePerX(beat.data);
  const rows = [...beat.data].map((d) => ({ year: Number(d.year), value: Number(d.value) })).sort((a, b) => a.year - b.year);
  for (let i = 1; i < rows.length; i++)
    if (!Number.isInteger(rows[i].year) || rows[i].year !== rows[i - 1].year + 1)
      throw new Error(`data jumps from ${rows[i - 1].year} to ${rows[i].year}: each decade's box is made of its years, and a missing year would shrink it silently — give every year, or start data after the gap (series(…, { from }))`);
  const decadeOf = (year) => Math.floor(year / 10) * 10;
  const decades = [...new Set(rows.map((r) => decadeOf(r.year)))];
  if (decades.length < 4 || decades.length > 12)
    throw new Error(`data spans ${decades.length} decades (${rows[0].year}–${rows[rows.length - 1].year}): this choreography draws one box per decade and needs 4 to 12 of them — choose the span with series(…, { from, to })`);

  const boxes = decades.map((d) => {
    const values = rows.filter((r) => decadeOf(r.year) === d).map((r) => r.value);
    const q1 = quantile(values, 0.25);
    const median = quantile(values, 0.5);
    const q3 = quantile(values, 0.75);
    const iqr = q3 - q1;
    const fence = [q1 - FENCE * iqr, q3 + FENCE * iqr];
    const inFence = values.filter((v) => v >= fence[0] && v <= fence[1]);
    return { decade: d, n: values.length, q1, median, q3, lo: Math.min(...inFence), hi: Math.max(...inFence), fence, min: Math.min(...values), max: Math.max(...values) };
  });
  const thin = boxes.find((b) => b.n < 4);
  if (thin) throw new Error(`the ${thin.decade}s hold only ${thin.n} year(s): a box needs at least 4. Start or end data on a decade that holds at least 4 years`);
  const outliers = rows.filter((r) => {
    const b = boxes.find((x) => x.decade === decadeOf(r.year));
    return r.value < b.fence[0] || r.value > b.fence[1];
  });
  if (outliers.length > 1)
    throw new Error(`the 1.5 × IQR fence leaves ${outliers.length} years outside their boxes (${outliers.map((o) => o.year).join(", ")}): this choreography names ONE outlier (card 3). It cannot draw this series honestly`);
  const outlier = outliers[0] ?? null;
  const peakYear = rows.reduce((a, b) => (b.value > a.value ? b : a));
  const peakBox = boxes.reduce((a, b) => (b.median > a.median ? b : a));
  const lowBox = boxes.reduce((a, b) => (b.median < a.median ? b : a));
  const widest = boxes.reduce((a, b) => (b.max - b.min > a.max - a.min ? b : a));
  const firstBox = boxes[0];
  const lastBox = boxes[boxes.length - 1];
  const afterPeak = boxes.slice(boxes.indexOf(peakBox) + 1);
  const view = (b) => ({ decade: b.decade, n: b.n, q1: b.q1, median: b.median, q3: b.q3, lo: b.lo, hi: b.hi, min: b.min, max: b.max });

  const reading = Object.freeze({
    count: rows.length,
    first: { ...rows[0] },
    last: { ...rows[rows.length - 1] },
    decades: boxes.length,
    boxes: Object.freeze(boxes.map(view)),
    firstBox: view(firstBox),
    lastBox: view(lastBox),
    peakBox: view(peakBox),
    lowBox: view(lowBox),
    widest: view(widest),
    peakYear: { ...peakYear },
    outlier: outlier ? { ...outlier, decade: decadeOf(outlier.year) } : null,
    outlierCount: outliers.length,
    fence: FENCE,
    drop: ((peakBox.median - lastBox.median) / peakBox.median) * 100,
    lowerEveryDecadeAfterPeak: afterPeak.every((b, i) => b.median < (i ? afterPeak[i - 1] : peakBox).median),
    partial: Object.freeze(boxes.filter((b) => b.n < 10).map(view)),
  });
  beat.check(reading);
  assertDrawsClaimColumn(rows.map((r) => r.value), HERE);

  // ── the words, each passed through plain(); every number they state is checked ───────────────────
  const say = (field, value, arg = reading) => {
    const text = typeof value === "function" ? value(arg) : value;
    const parts = [text].flat();
    if (!parts.length || parts.some((p) => typeof p !== "string" || !p.trim())) throw new Error(`${field} must return a non-empty sentence (or an array of paragraphs); it returned ${JSON.stringify(text)}`);
    return parts.map(plain);
  };
  /** A value at one decimal; a median at two (the worked example's precisions). */
  const format = (v, decimals = 1) => plain(beat.format(v, decimals));
  const prose = [...CARDS.slice(0, 5).map((k) => say(`cards.${k}`, beat.cards[k])), say("limits", [beat.limits].flat()[0])];
  const notes = Object.fromEntries(CARDS.map((k, i) => [NOTE_SLOTS[i], say(`notes.${k}`, beat.notes[k]).join(" ")]));

  const owns = (text, wanted) => new RegExp(`(?<![\\d.,])${wanted.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?![\\d])`).test(text);
  // What each card is ABOUT, so it must say it: the figure its gesture puts on screen.
  const OWES = {
    years: [["peakYear.value", format(peakYear.value)], ["peakYear.year", String(peakYear.year)]],
    decades: [],
    boxes: outlier ? [["outlier.year", String(outlier.year)], ["outlier.value", format(outlier.value)]] : [],
    medians: [["firstBox.median", format(firstBox.median, 2)], ["peakBox.median", format(peakBox.median, 2)], ["lastBox.median", format(lastBox.median, 2)]],
    spread: [["widest.min", format(widest.min)], ["widest.max", format(widest.max)], ["lastBox.n", String(lastBox.n)]],
  };
  CARDS.slice(0, 5).forEach((k, i) => {
    const text = prose[i].join(" ");
    for (const [what, wanted] of OWES[k])
      if (!owns(text, wanted)) throw new Error(`card ${i + 1} (cards.${k}) must state ${what} = "${wanted}" — the figure its picture shows; it says: ${text}`);
  });

  // The plot's labels: per decade its name, median, count and extent; the peak year, the outlier, the rule.
  const boxesOut = boxes.map((b) => {
    const v = view(b);
    const out = {
      label: say("labels.decade", beat.labels.decade, v).join(" "),
      medianText: say("labels.median", beat.labels.median, v).join(" "),
      nText: say("labels.count", beat.labels.count, v).join(" "),
      spreadText: say("labels.spread", beat.labels.spread, v).join(" "),
    };
    if (!owns(out.medianText, format(b.median, 2))) throw new Error(`labels.median must state the decade's median "${format(b.median, 2)}"; for the ${b.decade}s it says: ${out.medianText}`);
    if (!owns(out.nText, String(b.n))) throw new Error(`labels.count must state how many years the decade holds (${b.n}); for the ${b.decade}s it says: ${out.nText}`);
    if (!owns(out.spreadText, format(b.min)) || !owns(out.spreadText, format(b.max))) throw new Error(`labels.spread must state the decade's lowest and highest year, "${format(b.min)}" and "${format(b.max)}"; for the ${b.decade}s it says: ${out.spreadText}`);
    return { ...v, ...out, focus: b === widest || b === lastBox };
  });
  const peakText = say("labels.peak", beat.labels.peak).join(" ");
  if (!owns(peakText, format(peakYear.value))) throw new Error(`labels.peak must state "${format(peakYear.value)}" — the highest year's value; it says: ${peakText}`);
  const outlierText = outlier ? say("labels.outlier", beat.labels.outlier).join(" ") : "";
  if (outlier && !owns(outlierText, format(outlier.value))) throw new Error(`labels.outlier must state "${format(outlier.value)}" — the outlier's value; it says: ${outlierText}`);
  const ruleText = say("labels.rule", beat.labels.rule).join(" ");

  // Every other figure a card, a note, a label or the alt states must be one this kit computed, at the
  // precision it is written with. A year (1900–2100, or any year of the series) and a figure glued to
  // letters (CO2, 10e) pass.
  const decimal = /,/.test(beat.format(1.5, 1)) ? "," : ".";
  const group = decimal === "," ? "[ .]" : "[ ,]";
  const known = [
    reading.count, boxes.length, outliers.length, FENCE, reading.drop, peakYear.value, ...(outlier ? [outlier.value] : []),
    ...boxes.flatMap((b) => [b.n, b.q1, b.median, b.q3, b.lo, b.hi, b.min, b.max]),
  ];
  const dec = decimal === "." ? "\\." : ",";
  const figure = new RegExp(`(?<![\\p{L}\\d.,])(\\d{1,3}(?:${group}\\d{3})+(?:${dec}\\d+)?|\\d+(?:${dec}\\d+)?)(?![\\p{L}\\d])`, "gu");
  const checkFigures = (where, text) => {
    for (const m of plain(text).matchAll(figure)) {
      const raw = m[1];
      const [w, frac = ""] = raw.split(decimal);
      const n = Number(`${w.replace(/[ .,]/g, "")}.${frac || "0"}`);
      if (!frac && Number.isInteger(n) && ((n >= 1900 && n <= 2100) || (n >= rows[0].year && n <= rows[rows.length - 1].year))) continue;
      const tolerance = 0.5 * 10 ** -frac.length + 1e-9;
      if (!known.some((v) => Math.abs(v - n) <= tolerance))
        throw new Error(`${where} states ${raw}, which no figure of these boxes rounds to: every number is computed — use the reading (r.peakYear.value, r.peakBox.median, r.widest.min, r.lastBox.n, r.drop, …) through format(), never a typed or recomputed value. It says: ${text}`);
    }
  };
  CARDS.slice(0, 5).forEach((k, i) => checkFigures(`card ${i + 1} (cards.${k})`, prose[i].join(" ")));
  CARDS.forEach((k, i) => checkFigures(`notes.${k}`, notes[NOTE_SLOTS[i]]));
  boxesOut.forEach((b) => ["label", "medianText", "nText", "spreadText"].forEach((f) => checkFigures(`labels (${b.decade}s)`, b[f])));
  [["labels.peak", peakText], ["labels.outlier", outlierText], ["labels.rule", ruleText]].forEach(([w, t]) => checkFigures(w, t));

  const titleForms = [beat.title].flat().map(plain);
  const title = titleForms[0];
  assertHeadlineNumbersDrawn(title, [...rows.map((r) => r.value), ...boxes.map((b) => b.median)], "boxes");

  const eyebrow = plain(beat.eyebrow);
  const source = plain(beat.source);
  const unit = plain(beat.unit);
  const alt = plain(typeof beat.alt === "function" ? beat.alt(reading) : beat.alt);
  checkFigures("alt", alt);
  const words = { unit, rule: ruleText, ...notes };

  // One fitted value scale (a position encoding), round ticks; the years under the timeline (the proof's).
  const all = rows.map((r) => r.value);
  const [vMin, vMax] = [Math.min(...all), Math.max(...all)];
  const step = niceStep((vMax - vMin) / 4);
  const half = step / 2;
  const round = (v) => Math.round(v * 1e6) / 1e6;
  const domain = [round(Math.floor(vMin / half) * half - half / 2), round(Math.ceil(vMax / half) * half + half / 2)];
  const ticks = [];
  for (let t = Math.ceil(domain[0] / half) * half; t <= domain[1] + 1e-9; t += step) ticks.push(round(t));
  const span = rows[rows.length - 1].year - rows[0].year;
  const xStep = niceStep(span / 4);
  const xTicks = [];
  for (let t = rows[0].year; t <= rows[rows.length - 1].year - xStep / 2; t += xStep) xTicks.push(t);
  xTicks.push(rows[rows.length - 1].year);

  const textPerRegister = {
    display: titleForms.join(" "),
    eyebrow,
    body: `${prose.flat().join(" ")} ${source}`,
    axis: `${unit} ${ruleText} ${ticks.join(" ")} ${xTicks.join(" ")} ${boxesOut.map((b) => `${b.nText} ${b.spreadText}`).join(" ")} ${outlierText}`,
    annot: boxesOut.map((b) => b.label).join(" "),
    value: `${boxesOut.map((b) => b.medianText).join(" ")} ${Object.values(notes).join(" ")} ${peakText}`,
  };

  const driver = readFileSync(join(HERE, "boxplot-drive.mjs"), "utf8");
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
          element: createElement(DirectedBoxplotScrolly, {
            boxes: boxesOut,
            points: rows.map((r) => ({ year: r.year, value: r.value, decade: decadeOf(r.year), outlier: outlier !== null && r.year === outlier.year })),
            domain,
            ticks,
            xTicks,
            peakYear: { year: peakYear.year, text: peakText },
            outlierText,
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
          apply: "applyBoxplotState",
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
