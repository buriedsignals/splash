// The generic half of a beeswarm SCROLLY beat, taken from
// proof/scrolly-beeswarm-co2-per-person/render-directions-scrolly.mjs with everything about ITS
// subject removed. The choreography is the worked example's and is not the model's to change — six
// cards, one continuous interpolation driven by the reader's scroll (swarm-layout.mjs and
// swarm-drive.mjs, verbatim):
//
//   1 position  one dot per member, placed by its value — every dot of one size;
//   2 size      the dots swell to their size (a circle's area) and the field re-packs around them;
//   3 biggest   the largest circle ringed, its card and hairline;
//   4 mean      the size-weighted mean's rule; every member above it steps back to a neutral; a
//               counter climbs to the share of the weight at or under it;
//   5 tail      only the members past the threshold keep their tint; a counter climbs to their share
//               of the weight; the farthest circle ringed and named;
//   6 reading   the whole field again, both named; the card states the accounting (the limits).
//
// This file computes every figure the cards may state (the weighted mean, the median member, the
// largest and farthest circles, the tail and the shares) and checks the words against them;
// ./beat.mjs — the one file the model writes — gives the marks, the threshold and the WORDS. Copied
// into the beat by the harness; never edited by the model.
//
// Usage:  bun <beat>/render-beat.mjs
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createElement } from "react";
import { deriveFurniture, measureText } from "#shared/chart-beat/render-still.mjs";
import { webRegisters } from "#shared/design-base/web.mjs";
import { EYEBROW_TO_DISPLAY, gapOf, registerOf } from "#shared/design-base/register.mjs";
import { DirectedBeeswarmScrolly } from "./DirectedBeeswarmScrolly.tsx";
import { applyStoryboard, assertNumbers, assertHeadlineNumbersDrawn, assertDrawsClaimColumn } from "./guards.mjs";
import { plain, refusing, storyLanguage } from "./web.mjs";
import { renderBeatScrolly, scrollySkill } from "./scrolly.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));

/** The cards, in the drive's order: the runner's own ids (never the model's words in an id). */
const CARDS = ["position", "size", "biggest", "mean", "tail", "reading"];
/** One state per card; see swarm-drive.mjs for what each field paints. The worked example's, verbatim. */
const STATES = [
  { grow: 0, first: 0, mean: 0, below: 0, tail: 0, far: 0 },
  { grow: 1, first: 0, mean: 0, below: 0, tail: 0, far: 0 },
  { grow: 1, first: 1, mean: 0, below: 0, tail: 0, far: 0 },
  { grow: 1, first: 1, mean: 1, below: 1, tail: 0, far: 0 },
  { grow: 1, first: 1, mean: 1, below: 0, tail: 1, far: 1 },
  { grow: 1, first: 1, mean: 1, below: 0, tail: 0, far: 1 },
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

  const REQUIRED = ["eyebrow", "marks", "threshold", "format", "axisName", "markerLabel", "callout", "counts", "cards", "title", "limits", "source", "alt", "check"];
  const missing = REQUIRED.filter((key) => beat[key] === undefined);
  if (missing.length) throw new Error(`beat.mjs is missing ${missing.join(", ")}: give each as a field of the default export (export default { …, ${missing[0]}: … }), not as a separate export (see CONTRACT.md)`);
  for (const fn of ["format", "markerLabel", "callout", "check"])
    if (typeof beat[fn] !== "function") throw new Error(`beat.mjs: ${fn} must be a function (see CONTRACT.md)`);
  for (const [group, keys] of [["cards", CARDS.slice(0, 5)], ["counts", ["mean", "tail"]]]) {
    const absent = keys.filter((k) => typeof beat[group]?.[k] !== "function");
    if (absent.length) throw new Error(`beat.mjs: ${group} must give a function for each of ${keys.join(", ")}; missing or not a function: ${absent.join(", ")} (see CONTRACT.md)`);
  }

  // ── the marks: one per member, placed by value, sized by size ─────────────────────────────────
  if (!Array.isArray(beat.marks)) throw new Error(`marks must be an array of { name, value, size }, one per member`);
  assertNumbers(beat.marks.map((m) => [m.name, m.value]));
  assertNumbers(beat.marks.map((m) => [m.name, m.size]), "sizes");
  const marks = beat.marks.map((m) => ({ name: String(m.name), value: Number(m.value), size: Number(m.size) }));
  if (marks.length < 10) throw new Error(`marks holds ${marks.length} members; a swarm needs ten or more`);
  if (new Set(marks.map((m) => m.name)).size !== marks.length)
    throw new Error(`marks holds the same name twice: give each member ONE mark (filter data.json to one year / one series)`);
  if (marks.some((m) => m.value < 0)) throw new Error(`marks holds a negative value: the axis starts at zero; this type cannot place a member below it`);
  if (marks.some((m) => !(m.size > 0))) throw new Error(`marks holds a size at or under zero: a circle's area is its size, and every member needs one`);

  const whole = marks.reduce((s, m) => s + m.size, 0);
  const mean = marks.reduce((s, m) => s + m.value * m.size, 0) / whole;
  const share = (list) => (list.reduce((s, m) => s + m.size, 0) / whole) * 100;
  const ranked = [...marks].sort((a, b) => a.value - b.value);
  const median = ranked[Math.floor(ranked.length / 2)].value;
  const biggest = marks.reduce((a, b) => (b.size > a.size ? b : a));
  const farthest = marks.reduce((a, b) => (b.value > a.value ? b : a));
  const threshold = Number(beat.threshold);
  const tail = marks.filter((m) => m.value > threshold);
  const top = farthest.value;

  // ── what this choreography cannot draw honestly ─────────────────────────────────────────────────
  if (!(threshold > mean))
    throw new Error(`threshold is ${beat.threshold}, not above the weighted mean (${mean}): card 4 filters to the weight under the mean, card 5 to the tail PAST the threshold, further right. Give the threshold the takeaway names, above the mean`);
  if (!tail.length) throw new Error(`no member is past the threshold ${threshold} (the largest value is ${top}): card 5 is about the tail beyond it`);
  if (biggest === farthest)
    throw new Error(`${biggest.name} is both the largest circle and the farthest one out: card 3 names the largest and card 5 the farthest, two different members. This swarm cannot name one member twice`);

  const reading = Object.freeze({
    count: marks.length,
    whole,
    mean,
    median,
    threshold,
    biggest: { ...biggest, share: (biggest.size / whole) * 100 },
    farthest: { ...farthest, share: (farthest.size / whole) * 100 },
    underMeanShare: share(marks.filter((m) => m.value <= mean)),
    tail: Object.freeze({ count: tail.length, share: share(tail), members: Object.freeze(tail.map((m) => ({ ...m }))) }),
  });
  beat.check(reading);
  assertDrawsClaimColumn(marks.map((m) => m.value), HERE);

  // ── the words, each passed through plain(); every number they state is checked ───────────────────
  const say = (field, value, arg = reading) => {
    const text = typeof value === "function" ? value(arg) : value;
    const parts = [text].flat();
    if (!parts.length || parts.some((p) => typeof p !== "string" || !p.trim())) throw new Error(`${field} must return a non-empty sentence (or an array of paragraphs); it returned ${JSON.stringify(text)}`);
    return parts.map(plain);
  };
  const format = (v) => plain(beat.format(v));
  const prose = [...CARDS.slice(0, 5).map((k) => say(`cards.${k}`, beat.cards[k])), say("limits", [beat.limits].flat()[0])];

  const owns = (text, wanted) => new RegExp(`(?<![\\d.,])${wanted.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?![\\d])`).test(text);
  // What each card is ABOUT, so it must say it: the figure its gesture puts on screen.
  const OWES = {
    position: [],
    size: [],
    biggest: [["biggest.value", format(biggest.value)], ["median", format(median)]],
    mean: [["mean", format(mean)]],
    tail: [["tail.count", String(tail.length)], ["farthest.value", format(farthest.value)]],
  };
  CARDS.slice(0, 5).forEach((k, i) => {
    const text = prose[i].join(" ");
    for (const [what, wanted] of OWES[k])
      if (!owns(text, wanted)) throw new Error(`card ${i + 1} (cards.${k}) must state ${what} = "${wanted}" — the figure its picture shows; it says: ${text}`);
  });

  // The two counters: the drive counts the figure up into the {n} of the sentence. It writes the
  // decimal with a comma (the drive's own `.replace(".", ",")`), so a language with a decimal point
  // counts the tail in whole percents.
  // The decimal mark the words use: read off format(1.5), or — when format prints whole numbers — the
  // language. Read off format alone, a French beat formatting whole numbers took "3,4" in a card as 3 and 4.
  const sample = plain(beat.format(1.5));
  const decimal = /\d,\d/.test(sample) ? "," : /\d\.\d/.test(sample) ? "." : /,/.test(new Intl.NumberFormat(beat.lang ?? storyLanguage(HERE) ?? "en").format(1.5)) ? "," : ".";
  const tailDecimals = beat.tailCountDecimals ?? 1;
  if (![0, 1].includes(tailDecimals)) throw new Error(`tailCountDecimals is ${beat.tailCountDecimals}: 0 or 1`);
  if (decimal === "." && tailDecimals !== 0)
    throw new Error(`format() writes a decimal point, but the counter's drive writes its decimal with a comma: set tailCountDecimals: 0 so the tail's share counts in whole percents`);
  const meanValue = Math.round(reading.underMeanShare);
  const tailValue = Number(reading.tail.share.toFixed(tailDecimals));
  if (!(tailValue > 0)) throw new Error(`the tail holds ${reading.tail.share} % of the weight, which rounds to 0 at ${tailDecimals} decimal(s): the counter would climb to nothing`);
  const template = (field) => {
    const t = say(`counts.${field}`, beat.counts[field]).join(" ");
    if (t.split("{n}").length !== 2) throw new Error(`counts.${field} must hold "{n}" exactly once — the slot the drive counts the share into; it says: ${t}`);
    return t;
  };
  const meanCount = { template: template("mean"), value: meanValue };
  const tailCount = { template: template("tail"), value: tailValue };

  const callout = (m, role) => {
    const c = beat.callout({ ...m, role, share: (m.size / whole) * 100 });
    if (!c || typeof c.label !== "string" || !c.label.trim() || !Array.isArray(c.lines) || c.lines.some((l) => typeof l !== "string" || !l.trim()))
      throw new Error(`callout(m) must return { label, lines: [one or two sentences] } for ${m.name}; it returned ${JSON.stringify(c)}`);
    if (!c.lines.some((l) => owns(plain(l), format(m.value)))) throw new Error(`callout for ${m.name} must state its value "${format(m.value)}" in one of its lines; it says: ${c.lines.join(" / ")}`);
    return { label: plain(c.label), lines: c.lines.map(plain) };
  };
  const first = callout(biggest, "biggest");
  const far = callout(farthest, "farthest");

  // Every other figure a card, a counter, a label or the alt states must be one this kit computed, at
  // the precision it is written with. A year (1900–2100) and a figure glued to letters (CO2, 10e) pass.
  const group = decimal === "," ? "[ .]" : "[ ,]";
  const known = [
    reading.count, mean, median, threshold, biggest.value, biggest.size, farthest.value, farthest.size,
    reading.underMeanShare, reading.tail.count, reading.tail.share, reading.biggest.share, reading.farthest.share,
    ...tail.map((m) => m.value),
  ];
  // Sizes are written in their own unit ("1.4 bn people", "3 million"): any power-of-ten rescale of a
  // named member's size passes.
  const sizes = [biggest.size, farthest.size];
  const dec = decimal === "." ? "\\." : ",";
  const figure = new RegExp(`(?<![\\p{L}\\d.,])(\\d{1,3}(?:${group}\\d{3})+(?:${dec}\\d+)?|\\d+(?:${dec}\\d+)?)(?![\\p{L}\\d])`, "gu");
  const checkFigures = (where, text, { sizesToo = false } = {}) => {
    for (const m of plain(text).matchAll(figure)) {
      const raw = m[1];
      const [w, frac = ""] = raw.split(decimal);
      const n = Number(`${w.replace(/[ .,]/g, "")}.${frac || "0"}`);
      if (!frac && Number.isInteger(n) && n >= 1900 && n <= 2100) continue;
      const tolerance = 0.5 * 10 ** -frac.length + 1e-9;
      if (known.some((v) => Math.abs(v - n) <= tolerance)) continue;
      if (sizesToo && sizes.some((s) => [1, 1e3, 1e6, 1e9, 1e12].some((p) => Math.abs(s / p - n) <= tolerance))) continue;
      throw new Error(`${where} states ${raw}, which no figure of this swarm rounds to: every number is computed — use the reading (r.mean, r.median, r.biggest.value, r.tail.count, r.tail.share, …) through format(), never a typed or recomputed value. It says: ${text}`);
    }
  };
  CARDS.slice(0, 5).forEach((k, i) => checkFigures(`card ${i + 1} (cards.${k})`, prose[i].join(" ")));
  checkFigures("counts.mean", meanCount.template.replace("{n}", String(meanValue)));
  checkFigures("counts.tail", tailCount.template.replace("{n}", String(tailValue).replace(".", decimal)));
  [first, far].forEach((c, i) => checkFigures(`callout (${i ? farthest.name : biggest.name})`, [c.label, ...c.lines].join(" "), { sizesToo: true }));
  const markerLabel = plain(say("markerLabel", beat.markerLabel).join(" "));
  if (!owns(markerLabel, format(mean))) throw new Error(`markerLabel must state the weighted mean "${format(mean)}" — the rule it names; it says: ${markerLabel}`);
  checkFigures("markerLabel", markerLabel);

  const titleForms = [beat.title].flat().map(plain);
  const title = titleForms[0];
  // The title may state the tail's count and the threshold — figures the plate carries (card 5's counter).
  assertHeadlineNumbersDrawn(title, [...marks.map((m) => m.value), tail.length, threshold], "marks");

  const eyebrow = plain(beat.eyebrow);
  const source = plain(beat.source);
  const axisName = plain(beat.axisName);
  const alt = plain(typeof beat.alt === "function" ? beat.alt(reading) : beat.alt);
  checkFigures("alt", alt);

  // The axis: round steps from zero to the farthest value (the proof's 0, 10, 20, 30, 40).
  const step = beat.tickStep ?? niceStep(top / 5);
  const tickValues = [];
  for (let t = 0; t <= top + step * 0.2 + 1e-9; t += step) tickValues.push(Math.round(t * 1e6) / 1e6);
  const xMax = Math.max(top, tickValues[tickValues.length - 1]);

  // Runner-own keys for the marks (a quote or an accent in a name never reaches a selector).
  const keyOf = new Map(marks.map((m, i) => [m, `m${i + 1}`]));
  const cardsText = [
    { code: keyOf.get(biggest), role: "first", name: first.label, lines: first.lines },
    { code: keyOf.get(farthest), role: "far", name: far.label, lines: far.lines },
  ];

  const textPerRegister = {
    display: titleForms.join(" "),
    eyebrow,
    body: `${prose.flat().join(" ")} ${source}`,
    axis: `${axisName} ${tickValues.join(" ")} ${markerLabel}`,
    annot: cardsText.flatMap((c) => c.lines).join(" "),
    value: `${cardsText.map((c) => c.name).join(" ")} ${meanCount.template} ${tailCount.template} 0123456789,`,
  };

  const driver = [readFileSync(join(HERE, "swarm-layout.mjs"), "utf8"), readFileSync(join(HERE, "swarm-drive.mjs"), "utf8")].join("\n");
  /** A register as the numbers `measureText` takes, for the widths the reference layout needs. */
  const faceOf = (style, weight) => ({
    fontSize: Number.parseFloat(style.fontSize),
    fontWeight: weight ?? style.fontWeight,
    fontFamily: String(style.fontFamily).split(",")[0].replace(/"/g, ""),
  });
  const widthIn = (text, style, weight) =>
    measureText(text, faceOf(style, weight)) + Number.parseFloat(style.letterSpacing) * Math.max(0, text.length - 1);

  const lang = beat.lang ?? storyLanguage(HERE) ?? "en";
  await renderBeatScrolly({
    here: HERE,
    states: STATES,
    textPerRegister,
    evidenceLevels: beat.evidenceLevels ?? 4,
    async render({ label, direction, outDir }) {
      const { ink, muted } = deriveFurniture(direction.ground);
      const regs = webRegisters(direction, { ink: { ink, muted, accent: direction.accent } });
      const cards = cardsText.map((c) => ({
        ...c,
        width: Math.ceil(Math.max(widthIn(c.name, regs.value), ...c.lines.map((l) => widthIn(l, regs.annot)))) + 2,
      }));
      const cardHeightPx = Math.ceil(Number.parseFloat(regs.value.fontSize) * 1.3 + 2 * Number.parseFloat(regs.annot.fontSize) * 1.35);
      const { outPath } = await renderScrolly({
        steps: prose.map((p, i) => ({ id: CARDS[i], prose: p })),
        reveal: {
          element: createElement(DirectedBeeswarmScrolly, {
            marks: marks.map((m) => ({ code: keyOf.get(m), tonnes: m.value, people: m.size })),
            cards,
            cardHeightPx,
            mean,
            markerLabel,
            high: threshold,
            meanCount,
            tailCount,
            axisName,
            axisNameWidth: Math.ceil(widthIn(axisName, regs.axis, 700)),
            ticks: tickValues.map((v) => ({ value: v, width: Math.ceil(widthIn(String(v), regs.axis)) })),
            xMax,
            alt,
            regs,
            pad: direction.pad,
            stroke: direction.stroke ?? {},
            ground: direction.ground,
            accent: direction.accent,
            ink,
            muted,
          }),
          states: STATES,
          driver,
          apply: "applySwarmState",
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
