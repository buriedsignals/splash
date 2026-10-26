// The generic half of a scatter WEB beat, taken from
// proof/web-scatter-income-life-expectancy/render-directions-web.mjs with everything about ITS
// subject removed. The interaction is the worked example's and is not the model's to change: one
// mark per row on a LOGARITHMIC x axis, the declared threshold drawn in the accent with the band of y
// the points above it span; a "measured against" control lays two references across the cloud at a
// chosen case's own x and y, rings its point, writes its name and one sentence with its ranks and the
// counts that make the claim checkable (how many higher on x sit lower on y, how many lower on x sit
// higher) — CSS only, works without JS; every mark answers hover/tap/Tab with its own reading. The
// case set is DERIVED by a rule (the heaviest point of each group), never picked. This file computes
// the scale, the band, the ranks and the counts; ./beat.mjs — the one file the model writes — gives
// the points and WORDS every reading. Copied into the beat by the harness; never edited by the model.
//
// Usage:  bun <beat>/render-beat.mjs
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { beatFacts, applicableTreatments } from "#shared/chart-beat/treatments.mjs";
import { skillScriptFrom } from "#shared/design-base/skill-script.mjs";
import { AXES, DirectedScatterWeb, FRAME, scalesFor } from "./DirectedScatterWeb.tsx";
import { applyStoryboard, assertNumbers, assertHeadlineNumbersDrawn, assertDrawsClaimColumn } from "./guards.mjs";
import { chartWeb, plain, refusing, renderBeatWeb, storyLanguage } from "./web.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
await refusing(HERE, async () => {
  const { default: beat } = await import("./beat.mjs");
  applyStoryboard(beat, HERE);
  const { renderWeb } = await import(chartWeb(HERE, "scripts", "render-web.mjs"));
  const { levelSlugOf } = await import(skillScriptFrom(HERE, "chart-web", "assets", "level.ts"));

  const REQUIRED = ["eyebrow", "points", "breakAt", "xTick", "thresholdLabel", "bandNote", "detail", "levelLabel", "noneLabel", "announce", "note", "title", "limits", "reading", "source", "alt", "check"];
  const missing = REQUIRED.filter((key) => beat[key] === undefined);
  if (missing.length) throw new Error(`beat.mjs is missing ${missing.join(", ")}: give each as a field of the default export (export default { …, ${missing[0]}: … }), not as a separate export (see CONTRACT.md)`);
  for (const fn of ["xTick", "thresholdLabel", "bandNote", "detail", "announce", "note", "check"])
    if (typeof beat[fn] !== "function") throw new Error(`beat.mjs: ${fn} must be a function (see CONTRACT.md)`);

  // ── the cloud ─────────────────────────────────────────────────────────────────────────────────
  assertNumbers(beat.points.flatMap((p) => [[`${p.label} x`, p.x], [`${p.label} y`, p.y]]), "point coordinates");
  if (beat.points.length < 10) throw new Error(`points holds ${beat.points.length} rows; a scatter needs at least 10 (with fewer, draw a dot plot or a table)`);
  const keys = beat.points.map((p) => String(p.key));
  if (new Set(keys).size !== keys.length) throw new Error(`two points share the key ${keys.find((k, i) => keys.indexOf(k) !== i)}: one point per row — filter data.json to one year`);
  const nonPositive = beat.points.find((p) => !(p.x > 0));
  if (nonPositive) throw new Error(`${nonPositive.label} has x = ${nonPositive.x}: this page draws a LOGARITHMIC x axis, so every x must be above 0 — leave that row out and say so in the standfirst`);
  const xs = beat.points.map((p) => p.x);
  const [xMin, xMax] = [Math.min(...xs), Math.max(...xs)];
  if (xMax / xMin < 10) throw new Error(`x spans only a factor of ${(xMax / xMin).toFixed(1)}: this page's x axis is logarithmic, which earns its place only across orders of magnitude — draw the static scatter on a linear axis`);
  assertNumbers([["breakAt", beat.breakAt]], "threshold");
  const rows = beat.points.map((p, i) => ({ code: `p${i + 1}`, key: p.key, label: plain(p.label), x: p.x, y: p.y, group: p.group ?? null, weight: p.weight ?? null, own: p }));
  const above = rows.filter((r) => r.x >= beat.breakAt);
  const below = rows.filter((r) => r.x < beat.breakAt);
  if (above.length < 3 || below.length < 3) throw new Error(`breakAt ${beat.breakAt} leaves ${below.length} point(s) below and ${above.length} at or above: each side needs at least 3`);
  const band = { low: Math.min(...above.map((r) => r.y)), high: Math.max(...above.map((r) => r.y)) };
  const belowBand = { low: Math.min(...below.map((r) => r.y)), high: Math.max(...below.map((r) => r.y)) };
  const bandReading = { breakAt: beat.breakAt, above: above.length, below: below.length, low: band.low, high: band.high, spread: band.high - band.low, belowLow: belowBand.low, belowHigh: belowBand.high, belowSpread: belowBand.high - belowBand.low, total: rows.length };

  // ── the ranks and counts every case answers with ─────────────────────────────────────────────
  const rankOf = (r, key) => rows.filter((o) => o[key] > r[key]).length + 1;
  const reading = (r) => {
    const higherX = rows.filter((o) => o.x > r.x);
    const lowerX = rows.filter((o) => o.x < r.x);
    return {
      label: r.label, x: r.x, y: r.y, group: r.group, weight: r.weight, point: r.own,
      xRank: rankOf(r, "x"), yRank: rankOf(r, "y"), of: rows.length,
      higherX: higherX.length, higherXLowerY: higherX.filter((o) => o.y < r.y).length,
      lowerX: lowerX.length, lowerXHigherY: lowerX.filter((o) => o.y > r.y).length,
    };
  };

  // ── the case set, DERIVED: the heaviest point of each group, or the beat's named keys ─────────
  let cases;
  if (Array.isArray(beat.cases)) {
    cases = beat.cases.map((k) => {
      const r = rows.find((o) => String(o.key) === String(k));
      if (!r) throw new Error(`cases names ${JSON.stringify(k)}, which is not a point key`);
      return r;
    });
  } else {
    if (rows.some((r) => r.group === null || typeof r.weight !== "number"))
      throw new Error(`the control's cases are derived as the heaviest point of each group: give every point a group and a numeric weight (e.g. region and population), or list the keys in cases`);
    const groups = [...new Set(rows.map((r) => r.group))];
    cases = groups.map((g) => rows.filter((r) => r.group === g).reduce((a, b) => (b.weight > a.weight ? b : a)));
  }
  cases = [...new Set(cases)].sort((a, b) => a.x - b.x);
  if (cases.length < 2 || cases.length > 8) throw new Error(`the control would offer ${cases.length} cases; it holds 2 to 8 pills (every pill row comes out of the plot's height) — use fewer groups or list 2 to 8 keys in cases`);

  const checkArgs = { band: bandReading, cases: cases.map(reading), points: rows.map(reading) };
  beat.check(checkArgs);
  assertDrawsClaimColumn(rows.map((r) => r.y), HERE);
  assertHeadlineNumbersDrawn([beat.title].flat()[0], [...rows.map((r) => r.y), beat.breakAt, above.length, below.length, rows.length, band.low, band.high, band.high - band.low], "points");

  const points = rows.map((r) => ({ code: r.code, x: r.x, y: r.y, detail: plain(beat.detail(reading(r))) }));
  if (new Set(points.map((p) => p.detail)).size !== points.length) throw new Error(`two points answer with the same words: detail() must start with the point's label`);

  // ── the scale: the data's own ends, round ticks inside them ───────────────────────────────────
  const inner = [];
  for (let k = Math.floor(Math.log10(xMin)); k <= Math.ceil(Math.log10(xMax)); k += 1)
    for (const m of [1, 3]) {
      const v = m * 10 ** k;
      if (v > xMin * 1.15 && v < xMax / 1.15) inner.push(v);
    }
  const xTicks = [xMin, ...inner, xMax].map((v) => ({ value: v, label: plain(beat.xTick(v)) }));
  const ys = rows.map((r) => r.y);
  let yStep = 10 ** Math.floor(Math.log10(Math.max(...ys) - Math.min(...ys)));
  const yFloor0 = () => Math.floor(Math.min(...ys) / yStep) * yStep;
  const yCeil0 = () => Math.ceil(Math.max(...ys) / yStep) * yStep;
  if ((yCeil0() - yFloor0()) / yStep > 8) yStep *= 2;
  const [yFloor, yCeil] = [yFloor0(), yCeil0()];
  const yTicks = Array.from({ length: Math.round((yCeil - yFloor) / yStep) + 1 }, (_, i) => +(yFloor + i * yStep).toFixed(10));
  if (!(beat.breakAt > xMin && beat.breakAt < xMax)) throw new Error(`breakAt ${beat.breakAt} is outside the drawn x range (${xMin}–${xMax})`);

  // ── the yardstick: two references at each case's own coordinates ──────────────────────────────
  const { x: xOf, y: yOf } = scalesFor(xTicks, yTicks);
  const levels = {
    label: plain(beat.levelLabel),
    noneLabel: plain(beat.noneLabel),
    options: cases.map((c) => {
      const r = reading(c);
      const option = { key: c.code, label: c.label, announce: plain(beat.announce(r)), note: plain(beat.note(r)), marks: [{ series: AXES[0], x: xOf(c.x) }, { series: AXES[1], y: yOf(c.y) }] };
      if (!option.announce.includes(option.label)) throw new Error(`announce() must contain the case's label "${option.label}" word for word; it says: ${option.announce}`);
      return option;
    }),
  };
  const levelPositions = cases.map((c) => ({ slug: levelSlugOf(c.code), code: c.code, label: c.label, x: xOf(c.x), y: yOf(c.y) }));

  const title = plain([beat.title].flat()[0]);
  const caveat = plain([beat.limits].flat()[0]);
  const source = plain(beat.source);
  const readingLine = plain(beat.reading);
  const eyebrow = plain(beat.eyebrow);
  const thresholdNote = plain(beat.thresholdLabel(beat.breakAt));
  const bandNote = plain(beat.bandNote(bandReading));
  const alt = plain(typeof beat.alt === "function" ? beat.alt(checkArgs) : beat.alt);

  const interaction = {
    earns:
      `A still can draw the author's threshold and assert the band above it; it cannot let the reader stand anywhere else. Here the reader measures ` +
      `the ${rows.length} points against one of ${cases.length} cases, and the counts that come back make the claim checkable from that case.`,
    controls: [
      {
        question: "Where is this case in the cloud, and how many on either side of it break the pattern?",
        gesture: "find-your-own-case",
        changes: "Two references cross the plot at the chosen case's own x and y, in full ink and never in the accent; its point is ringed, its name written, and one sentence gives its ranks and the counts that break the pattern on either side.",
        parameter: "the case the cloud is measured against",
        authorPicked: "none",
        readerPicks: ["none", ...levels.options.map((o) => levelSlugOf(o.key))],
        heldStill: [".chart-header", ".chart-source"],
      },
      {
        question: "Which one is this?",
        gesture: "ask-a-mark",
        changes: "The point answers with its label and its two values.",
        parameter: "which point is asked about",
        authorPicked: cases[0].label,
        readerPicks: "every mark",
        heldStill: [".chart-header", ".chart-source"],
      },
    ],
  };

  const facts = beatFacts(rows.map((r) => ({ key: r.code, label: r.label, value: r.y })), { subject: null, declaredSequence: plain(beat.yUnit ?? "value") });
  applicableTreatments(facts);

  const textPerRegister = {
    display: title,
    eyebrow,
    body: `${caveat} ${readingLine} ${source} ${levels.label} ${levels.noneLabel} ${levels.options.map((o) => `${o.label} ${o.note} ${o.announce}`).join(" ")}`,
    axis: `${xTicks.map((t) => t.label).join(" ")} ${yTicks.join(" ")}`,
    annot: `${thresholdNote} ${bandNote} ${levels.options.map((o) => o.label).join(" ")}`,
    value: rows.map((r) => plain((beat.format ?? String)(r.y))).join(" "),
  };

  const lang = beat.lang ?? storyLanguage(HERE) ?? "en";
  await renderBeatWeb({
    here: HERE,
    textPerRegister,
    evidenceLevels: beat.evidenceLevels ?? 2,
    async render({ label, direction, outDir }) {
      return renderWeb({
        lang,
        component: DirectedScatterWeb,
        props: { points, xTicks, yTicks, levels, levelPositions, interaction, threshold: beat.breakAt, thresholdNote, bandNote, band, title, eyebrow, caveat, source, reading: readingLine, alt, direction, ground: direction.ground, accent: direction.accent },
        outDir,
        name: `${label}.html`,
      });
    },
  });
});
