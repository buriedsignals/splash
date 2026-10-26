// The generic half of a line WEB beat, taken from proof/web-line-swiss-co2/render-directions-web.mjs
// with everything about ITS subject removed. The interaction is the worked example's and is not the
// model's to change: no control — every reading of the series answers hover/tap/Tab with what the
// plate cannot print for all of them (its value, its distance under the peak, how far back it winds
// the series, how the last reading compares to it), and the plate degrades with no script to the
// whole curve, the reference rule, the peak, the end label and every word. This file computes those
// readings; ./beat.mjs — the one file the model writes — gives the series and WORDS every reading.
// Copied into the beat by the harness; never edited by the model.
//
// Usage:  bun <beat>/render-beat.mjs
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { scaleLinear } from "d3-scale";
import { beatFacts, applicableTreatments } from "#shared/chart-beat/treatments.mjs";
import { DirectedLineWeb } from "./DirectedLineWeb.tsx";
import { applyStoryboard, assertNumbers, assertOnePerX, assertHeadlineNumbersDrawn, assertDrawsClaimColumn } from "./guards.mjs";
import { chartWeb, plain, refusing, renderBeatWeb, storyLanguage } from "./web.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
await refusing(HERE, async () => {
  const { default: beat } = await import("./beat.mjs");
  applyStoryboard(beat, HERE);
  const { renderWeb } = await import(chartWeb(HERE, "scripts", "render-web.mjs"));

  const REQUIRED = ["eyebrow", "data", "unit", "format", "referenceYear", "referenceLabel", "peakLabel", "detail", "title", "limits", "reading", "source", "alt", "check"];
  const missing = REQUIRED.filter((key) => beat[key] === undefined);
  if (missing.length) throw new Error(`beat.mjs is missing ${missing.join(", ")}: give each as a field of the default export (export default { …, ${missing[0]}: … }), not as a separate export (see CONTRACT.md)`);
  for (const fn of ["format", "detail", "check"])
    if (typeof beat[fn] !== "function") throw new Error(`beat.mjs: ${fn} must be a function (see CONTRACT.md)`);

  assertNumbers(beat.data.map((d) => [d.year, d.value]));
  assertOnePerX(beat.data);
  const rows = [...beat.data].sort((a, b) => a.year - b.year);
  if (rows.length < 3) throw new Error(`data holds ${rows.length} readings; a line needs at least 3`);
  beat.check();
  assertDrawsClaimColumn(rows.map((d) => d.value), HERE);

  const peak = rows.reduce((a, b) => (b.value > a.value ? b : a));
  const last = rows[rows.length - 1];
  const reference = rows.find((r) => r.year === beat.referenceYear);
  if (!reference) throw new Error(`referenceYear ${beat.referenceYear} is not a year of data (${rows[0].year}–${last.year}): the rule is drawn at that year's value`);
  // The span from the reference year to the last reading is drawn (the rule runs to the end label),
  // so a title that counts it ("57 years erased") states a figure the plate carries.
  assertHeadlineNumbersDrawn([beat.title].flat()[0], [...rows.map((d) => d.value), last.year - reference.year], "series");

  // ── each year's own reading, as the worked example computes it ──────────────────────────────
  const beforePeak = rows.filter((r) => r.year < peak.year);
  /** The year AFTER the last pre-peak year still at or below this value; null if none was. */
  const woundBackTo = (value) => {
    const under = [...beforePeak].reverse().find((r) => r.value <= value);
    return under ? under.year + 1 : null;
  };
  const readings = rows.map((r) => {
    // Only after the peak, and only when it winds back PAST the peak year — else it is no erasure.
    const back0 = r.year > peak.year ? woundBackTo(r.value) : null;
    const backTo = back0 !== null && back0 < peak.year ? back0 : null;
    const facts = {
      year: r.year,
      value: r.value,
      isPeak: r.year === peak.year,
      isLast: r.year === last.year,
      peakYear: peak.year,
      peakValue: peak.value,
      belowPeakPct: ((peak.value - r.value) / peak.value) * 100,
      backTo,
      yearsBack: backTo === null ? 0 : r.year - backTo,
      lastYear: last.year,
      lastValue: last.value,
      vsLastPct: r.value === 0 ? null : ((last.value - r.value) / r.value) * 100,
      lastTimes: r.value === 0 ? null : last.value / r.value,
    };
    return { year: r.year, value: r.value, label: plain(beat.format(r.value)), detail: plain(beat.detail(facts)) };
  });

  // ── the axes: fitted (a line carries a rate, not a length from zero), round ticks ────────────
  const values = rows.map((r) => r.value);
  const yTicks = beat.yTicks ?? scaleLinear().domain([Math.min(...values), Math.max(...values)]).nice(5).ticks(5);
  let xTicks = beat.xTicks ?? scaleLinear().domain([rows[0].year, last.year]).ticks(5).filter(Number.isInteger);
  if (!beat.xTicks && xTicks.length < 4) xTicks = scaleLinear().domain([rows[0].year, last.year]).ticks(8).filter(Number.isInteger);

  // ── where the words sit: the worked example's places, moved to the clear side when this series needs it
  const span = last.year - rows[0].year;
  const xOf = (year) => (year - rows[0].year) / span;
  const yRange = yTicks[yTicks.length - 1] - yTicks[0];
  // The rule's name spans roughly a third of the plot from one end; pick the end and side where the
  // series stays furthest from the rule under it.
  const candidates = [
    { x: 1, below: true, from: 0, to: 0.35 },
    { x: 1, below: false, from: 0, to: 0.35 },
    { x: 99, below: true, from: 0.65, to: 1 },
    { x: 99, below: false, from: 0.65, to: 1 },
  ].map((c) => {
    const under = rows.filter((r) => xOf(r.year) >= c.from && xOf(r.year) <= c.to).map((r) => r.value);
    const clearance = c.below ? reference.value - Math.max(...under) : Math.min(...under) - reference.value;
    return { ...c, clearance: clearance / yRange };
  });
  const place = candidates.reduce((a, b) => (b.clearance > a.clearance ? b : a));
  const peakNoteSide = xOf(peak.year) < 0.3 ? "right" : "left";

  const title = plain([beat.title].flat()[0]);
  const caveat = plain([beat.limits].flat()[0]);
  const source = plain(beat.source);
  const reading = plain(beat.reading);
  const eyebrow = plain(beat.eyebrow);
  const unit = plain(beat.unit);
  const referenceNote = plain(beat.referenceLabel);
  const peakNote = plain(beat.peakLabel);
  const alt = plain(beat.alt);

  const facts = beatFacts(readings.map((r) => ({ key: String(r.year), label: String(r.year), value: r.value })), { subject: eyebrow, declaredSequence: unit });
  applicableTreatments(facts);

  const textPerRegister = {
    display: title,
    eyebrow,
    body: `${caveat} ${reading} ${source}`,
    axis: `${yTicks.join(" ")} ${xTicks.join(" ")} ${unit}`,
    annot: `${referenceNote} ${peakNote}`,
    value: `${readings.map((r) => r.label).join(" ")} ${last.year} · ${unit}`,
  };

  const interaction = {
    earns:
      `A still prints a handful of the ${rows.length} readings and asserts one comparison, the last reading against ${reference.year}, because a plate ` +
      `has room for one rule; this page hands the rule back to the reader, and any of the ${rows.length} years answers how the last reading compares with it.`,
    controls: [
      {
        question: "What was it worth that year, and where does the last reading stand against it?",
        gesture: "ask-a-mark",
        changes: "The year pointed at lights and the answer box prints readings the plate omits: its value, its distance under the peak, how far back it winds the series, and how the last reading compares.",
        parameter: "which year is asked about",
        authorPicked: String(last.year),
        readerPicks: "every mark",
        heldStill: [".chart-header", ".chart-source"],
      },
    ],
  };

  await renderBeatWeb({
    here: HERE,
    textPerRegister,
    evidenceLevels: beat.evidenceLevels ?? 3,
    async render({ label, direction, outDir }) {
      return renderWeb({
        lang: beat.lang ?? storyLanguage(HERE) ?? "en",
        component: DirectedLineWeb,
        props: {
          readings,
          peakYear: peak.year,
          referenceYear: reference.year,
          referenceValue: reference.value,
          referenceNote,
          peakNote,
          yTicks,
          xTicks,
          unit,
          title,
          eyebrow,
          caveat,
          source,
          reading,
          alt,
          direction,
          ground: direction.ground,
          accent: direction.accent,
          interaction,
          referenceNoteX: place.x,
          referenceNoteBelow: place.below,
          peakNoteSide,
        },
        outDir,
        name: `${label}.html`,
      });
    },
  });
});
