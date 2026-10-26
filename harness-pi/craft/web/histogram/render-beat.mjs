// The generic half of a histogram WEB beat, taken from
// proof/web-histogram-carbon-footprint/render-directions-web.mjs with everything about ITS subject
// removed. The interaction is the worked example's and is not the model's to change: a "measure
// against" control (the `level` vocabulary, stood upright) lets the reader choose a coverage band —
// a quantile of the observations, which no bin width can move — and a dashed rule stands at that
// quantile, its value at its foot, every bin entirely beyond it hollowed, and a sentence says how many
// observations sit under it, its multiple of the median and how much of the drawn width the rest
// occupy (CSS only, works without JS); every bin answers hover/tap/Tab with its interval, count,
// share, cumulative share and who is in it. This file bins the observations, computes the quantiles
// and every reading; ./beat.mjs — the one file the model writes — gives the observations and WORDS.
// Copied into the beat by the harness; never edited by the model.
//
// Usage:  bun <beat>/render-beat.mjs
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { scaleLinear } from "d3-scale";
import { beatFacts, applicableTreatments } from "#shared/chart-beat/treatments.mjs";
import { DirectedHistogramWeb, FRAME } from "./DirectedHistogramWeb.tsx";
import { applyStoryboard, assertNumbers, assertHeadlineNumbersDrawn, assertDrawsClaimColumn } from "./guards.mjs";
import { chartWeb, plain, refusing, renderBeatWeb, storyLanguage } from "./web.mjs";

/** The one series the component draws; every option's mark names it. */
const SERIES = "paliers";

const HERE = dirname(fileURLToPath(import.meta.url));
await refusing(HERE, async () => {
  const { default: beat } = await import("./beat.mjs");
  applyStoryboard(beat, HERE);
  const { renderWeb } = await import(chartWeb(HERE, "scripts", "render-web.mjs"));

  const REQUIRED = ["eyebrow", "observations", "binWidth", "threshold", "unit", "format", "detail", "claimNote", "medianNote", "bands", "levelLabel", "noneLabel", "announce", "note", "title", "limits", "reading", "source", "alt", "check"];
  const missing = REQUIRED.filter((key) => beat[key] === undefined);
  if (missing.length) throw new Error(`beat.mjs is missing ${missing.join(", ")} (see CONTRACT.md)`);
  for (const fn of ["format", "detail", "claimNote", "medianNote", "announce", "note", "check"])
    if (typeof beat[fn] !== "function") throw new Error(`beat.mjs: ${fn} must be a function (see CONTRACT.md)`);

  // ── the observations ─────────────────────────────────────────────────────────────────────────
  const obs = beat.observations;
  if (!Array.isArray(obs)) throw new Error(`observations must be an array of { name, value }`);
  assertNumbers(obs.map((o) => [o.name, o.value]), "observations");
  if (obs.length < 20)
    throw new Error(`a histogram of ${obs.length} readings is a handful of bars that look like a distribution: it needs at least 20 observations. With fewer, choose a dot strip or a ranked bar instead`);
  if (new Set(obs.map((o) => o.name)).size !== obs.length)
    throw new Error(`two observations share a name: filter data.json to ONE year / one group so each place counts once`);
  const negative = obs.filter((o) => o.value < 0);
  if (negative.length) throw new Error(`the bins start at zero, and these observations are negative: ${negative.slice(0, 3).map((o) => `${o.name}=${o.value}`).join(", ")}. A variable that falls below zero belongs to another chart`);
  const values = obs.map((o) => o.value);
  const sorted = [...obs].sort((a, b) => a.value - b.value);
  const total = obs.length;
  const median = total % 2 ? sorted[(total - 1) / 2].value : (sorted[total / 2 - 1].value + sorted[total / 2].value) / 2;
  const quantile = (p) => {
    const i = (total - 1) * p;
    const lo = Math.floor(i);
    const hi = Math.ceil(i);
    return sorted[lo].value + (sorted[hi].value - sorted[lo].value) * (i - lo);
  };

  // ── the bins: from 0, every bin binWidth wide, the last one holding the maximum ─────────────
  const BIN = beat.binWidth;
  if (!(typeof BIN === "number" && BIN > 0)) throw new Error(`binWidth must be a positive number, it is ${BIN}`);
  const T = beat.threshold;
  if (typeof T !== "number") throw new Error(`threshold must be the number the takeaway counts against (e.g. 4), it is ${JSON.stringify(T)}`);
  const lastEdge = Math.max(BIN, Math.ceil(Math.max(...values) / BIN - 1e-9) * BIN);
  const binCount = Math.round(lastEdge / BIN);
  if (binCount < 3 || binCount > 50)
    throw new Error(`${binCount} bins of ${BIN} — a histogram needs 3 to 50: ${binCount < 3 ? "lower" : "raise"} binWidth`);
  // The threshold the headline counts has to land ON a bin edge: the accent colours whole bins.
  if (!(T > 0 && T < lastEdge) || Math.abs(T / BIN - Math.round(T / BIN)) > 1e-9)
    throw new Error(`threshold ${T} must be a bin EDGE inside the axis (0 to ${lastEdge}): the accent is spent on exactly the bins the takeaway counts — choose a binWidth that divides ${T}`);
  const edges = Array.from({ length: binCount }, (_, i) => i * BIN);
  const inBinOf = (from, isLast) => obs.filter((o) => o.value >= from - 1e-12 && (isLast ? true : o.value < from + BIN - 1e-12));
  const counts = edges.map((from, i) => inBinOf(from, i === binCount - 1).length);
  // Too narrow and the body of the distribution comes apart into a comb, in a form whose bars touch.
  let unbroken = 0;
  while (unbroken < binCount && counts[unbroken] > 0) unbroken += 1;
  const inRun = counts.slice(0, unbroken).reduce((a, b) => a + b, 0);
  if (inRun / total < 0.99)
    throw new Error(`at a binWidth of ${BIN} the unbroken run of bins from the left carries only ${inRun} of ${total} observations — the others sit past empty bins: widen binWidth so the body of the distribution stays in touching bars`);

  const under = obs.filter((o) => o.value < T);
  const counted = { count: under.length, total, share: under.length / total, median, threshold: T, bins: counts };
  beat.check(counted);
  assertDrawsClaimColumn(values, HERE);

  // ── the coverage bands: quantiles of the observations ──────────────────────────────────────
  const bandsIn = beat.bands;
  if (!Array.isArray(bandsIn) || bandsIn.length < 2 || bandsIn.some((b, i) => !(b && b.p > 0 && b.p < 1) || typeof b.label !== "string" || (i > 0 && b.p <= bandsIn[i - 1].p)))
    throw new Error(`bands are at least two { p, label } coverage bands, p strictly rising between 0 and 1 (e.g. { p: 0.75, label: "3 in 4" }); got ${JSON.stringify(bandsIn).slice(0, 160)}`);
  const claimTop = T; // every bin the takeaway counts ends at or under the threshold
  const bandFacts = bandsIn.map((band, i) => {
    const value = quantile(band.p);
    const from = Math.min(lastEdge - BIN, Math.floor(value / BIN + 1e-9) * BIN);
    const binIndex = Math.round(from / BIN);
    const below = obs.filter((o) => o.value < value).length;
    return { ...band, value, from, binIndex, key: `b${binIndex + 1}`, below, above: total - below, total, median, ratio: value / median, widthBeyond: ((lastEdge - value) / lastEdge) * 100, bin: { from, to: binIndex === binCount - 1 ? null : from + BIN, isLast: binIndex === binCount - 1 }, index: i };
  });
  if (new Set(bandFacts.map((b) => b.key)).size !== bandFacts.length)
    throw new Error(`two bands fall in the same bin (${bandFacts.map((b) => `${b.label}: ${b.value.toFixed(2)}`).join(", ")}): choose bands further apart, or a narrower binWidth`);
  // A bin the takeaway counts (it ends at or under the threshold) would be hollowed by a band whose
  // quantile sits at or under its lower edge — the last such bin starts at threshold − binWidth.
  for (const b of bandFacts)
    if (b.value <= claimTop - BIN + 1e-9)
      throw new Error(`the band ${b.label} falls at ${b.value.toFixed(2)}, inside the bins the takeaway counts (under ${T}): it would hollow the claim's own bins — choose a band whose quantile lies above ${T}`);

  // ── each bin's own reading ─────────────────────────────────────────────────────────────────
  let running = 0;
  const bars = edges.map((from, i) => {
    const isLast = i === binCount - 1;
    const to = isLast ? null : from + BIN;
    const inBin = inBinOf(from, isLast);
    running += inBin.length;
    const names = [...inBin].sort((a, b) => b.value - a.value).slice(0, 4).map((o) => String(o.name));
    const reading = { from, to, isLast, count: inBin.length, total, sharePct: (inBin.length / total) * 100, cumulativePct: (running / total) * 100, names, others: inBin.length - names.length };
    return {
      from,
      to,
      key: `b${i + 1}`,
      count: inBin.length,
      inClaim: from + BIN <= T + 1e-9,
      beyond: bandFacts.filter((b) => from >= b.value).map((b) => b.key),
      label: isLast ? `${from}+` : `${from}–${from + BIN}`,
      detail: plain(beat.detail(reading)),
    };
  });
  for (const bar of bars)
    if (bar.inClaim && bar.beyond.length) throw new Error(`the band(s) ${bar.beyond.join(", ")} would hollow the bin ${bar.label}, which the takeaway counts: choose bands whose quantiles lie above ${T}`);
  if (new Set(bars.map((b) => b.detail)).size !== bars.length)
    throw new Error(`detail() prints the same sentence for two bins: every bin must answer with its own interval (start with it)`);

  // The title states the count under the threshold and the total — figures the plate carries
  // (the accented bins' sum, every bar's sum) — and the threshold itself, a bin edge on the axis.
  assertHeadlineNumbersDrawn([beat.title].flat()[0], [...counts, under.length, total, T], "bins");

  // ── the axes ─────────────────────────────────────────────────────────────────────────────────
  const top = Math.max(...counts);
  let yTicks = beat.yTicks ?? scaleLinear().domain([0, top]).nice(4).ticks(4).filter(Number.isInteger);
  if (!beat.yTicks && yTicks[yTicks.length - 1] < top) yTicks = scaleLinear().domain([0, top]).nice(5).ticks(5).filter(Number.isInteger);
  if (yTicks[yTicks.length - 1] < top) throw new Error(`yTicks ends at ${yTicks[yTicks.length - 1]}, under the tallest bin ${top}`);
  let xTicks = beat.xTicks;
  if (!xTicks) {
    const step = Math.ceil(binCount / 5) * BIN;
    xTicks = edges.filter((e) => Math.abs(e / step - Math.round(e / step)) < 1e-9);
    if (lastEdge - xTicks[xTicks.length - 1] < step / 2) xTicks.pop();
    xTicks.push(lastEdge);
  }
  const xOf = (v) => (v / lastEdge) * FRAME.width;

  // ── the yardstick ────────────────────────────────────────────────────────────────────────────
  const options = bandFacts.map((b) => {
    const option = { key: b.key, label: plain(b.label), announce: plain(beat.announce(b)), note: plain(beat.note(b)), marks: [{ series: SERIES, x: xOf(b.value) }] };
    if (!option.announce.includes(option.label)) throw new Error(`announce() must contain the band's label (${option.label}); it says: ${option.announce}`);
    const v = plain(beat.format(b.value));
    if (!option.note.includes(v)) throw new Error(`note() is shown when the band ${b.label} is chosen, so it must state the quantile's value, format(value) = "${v}"; it says: ${option.note}`);
    return option;
  });
  const levels = { label: plain(beat.levelLabel), noneLabel: plain(beat.noneLabel), options };
  const bandFeet = Object.fromEntries(bandFacts.map((b) => [b.key, plain(beat.format(b.value))]));

  const claimNote = plain(beat.claimNote(counted));
  const medianNote = plain(beat.medianNote(counted));
  if (!medianNote.includes(plain(beat.format(median)))) throw new Error(`medianNote() is printed beside the median's rule, so it must state format(median) = "${plain(beat.format(median))}"; it says: ${medianNote}`);
  const title = plain([beat.title].flat()[0]);
  const caveat = plain([beat.limits].flat()[0]);
  const source = plain(beat.source);
  const reading = plain(beat.reading);
  const eyebrow = plain(beat.eyebrow);
  const unit = plain(beat.unit);
  const alt = plain(typeof beat.alt === "function" ? beat.alt({ ...counted, bands: bandFacts }) : beat.alt);

  const facts = beatFacts(bars.map((b) => ({ key: b.key, label: b.label, value: b.count })), { subject: bars[0].label, declaredSequence: unit });
  applicableTreatments(facts);

  const textPerRegister = {
    display: title,
    eyebrow,
    body: `${caveat} ${reading} ${source} ${levels.label} ${levels.noneLabel} ${options.map((o) => `${o.label} ${o.note} ${o.announce}`).join(" ")}`,
    axis: `${yTicks.join(" ")} ${xTicks.join(" ")} ${unit}`,
    annot: `${claimNote} ${medianNote} ${Object.values(bandFeet).join(" ")}`,
    value: bars.map((b) => String(b.count)).join(" "),
  };

  const widest = bandFacts[bandFacts.length - 1];
  const interaction = {
    earns:
      `A still has to pick a bin width and the reader can only trust it; this page hands over the readings no choice of bins can move — the quantiles of the ${total} ` +
      `observations themselves. ${bandFacts[0].label} sit under ${bandFacts[0].value.toFixed(2)}; the ${widest.above} beyond ${widest.value.toFixed(2)} occupy ` +
      `${Math.round(widest.widthBeyond)} % of the width. None of these is a bin edge, so none can be printed on a still.`,
    controls: [
      {
        question: "How much does the long tail weigh, and where exactly do most observations stop?",
        gesture: "toggle-a-comparison",
        changes:
          "A cased dashed rule stands at the chosen quantile with its value at its foot; the bin it falls in is ringed and every bin entirely beyond it is hollowed to its outline; " +
          "one sentence gives the quantile, how many observations sit under it, its multiple of the median and the share of the width the rest occupy.",
        parameter: "the quantile the coverage is read at",
        authorPicked: "none",
        readerPicks: ["none", ...options.map((o) => o.key)],
        heldStill: [".chart-header", ".chart-source"],
      },
      {
        question: "How many fell here — and who?",
        gesture: "ask-a-mark",
        changes: "The bin pointed at takes full ink and answers with its interval, count, share of the total, cumulative share up to its upper edge and the observations in it.",
        parameter: "which bin is asked about",
        authorPicked: "the modal bin",
        readerPicks: "every mark",
        heldStill: [".chart-header", ".chart-source"],
      },
    ],
  };

  await renderBeatWeb({
    here: HERE,
    textPerRegister,
    evidenceLevels: beat.evidenceLevels ?? 2,
    async render({ label, direction, outDir }) {
      return renderWeb({
        lang: beat.lang ?? storyLanguage(HERE) ?? "en",
        component: DirectedHistogramWeb,
        props: {
          bars,
          yTicks,
          xTicks,
          binWidth: BIN,
          median,
          levels,
          bandFeet,
          interaction,
          title,
          eyebrow,
          caveat,
          source,
          reading,
          claimNote,
          medianNote,
          alt,
          direction,
          ground: direction.ground,
          accent: direction.accent,
        },
        outDir,
        name: `${label}.html`,
      });
    },
  });
});
