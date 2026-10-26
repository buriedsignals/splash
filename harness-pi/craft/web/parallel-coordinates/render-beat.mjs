// The generic half of a parallel-coordinates WEB beat, taken from
// proof/web-parallel-coordinates-electricity/render-directions-web.mjs with everything about ITS
// subject removed. The interaction is the worked example's and is not the model's to change: one
// rail per measure, each with its own ceiling, one line per entity, the takeaway's lines in the
// accent; a "select a band" control (the `brush` vocabulary) lets the reader pick a named span of one
// rail — the lines crossing it thicken and their vertices are ringed, the band is washed on its rail,
// and a sentence says how many lines it holds and what that set averages on ANOTHER rail, against the
// rest (CSS only, works without JS); every vertex answers hover/tap/Tab with its entity's whole row.
// This file computes the ceilings, the correlation, who falls in each band and the means;
// ./beat.mjs — the one file the model writes — gives the axes, the lines, the bands and the WORDS.
// Copied into the beat by the harness; never edited by the model.
//
// Usage:  bun <beat>/render-beat.mjs
import { readFileSync } from "node:fs";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { beatFacts, applicableTreatments } from "#shared/chart-beat/treatments.mjs";
import { DirectedParallelWeb } from "./DirectedParallelWeb.tsx";
import { applyStoryboard, assertNumbers, assertHeadlineNumbersDrawn, assertDrawsClaimColumn } from "./guards.mjs";
import { chartWeb, plain, refusing, renderBeatWeb, storyLanguage } from "./web.mjs";

/** True when `text` states the whole number `n` on its own — not as a digit inside 25, 16 or 9,8. */
const statesNumber = (text, n) => new RegExp(`(?<![\\d.,])${n}(?![\\d.,]*\\d)`).test(text);

const HERE = dirname(fileURLToPath(import.meta.url));
await refusing(HERE, async () => {
  const { default: beat } = await import("./beat.mjs");
  applyStoryboard(beat, HERE);
  const { renderWeb } = await import(chartWeb(HERE, "scripts", "render-web.mjs"));
  const { assertBrushChangesThePicture, assertOneBrushVocabulary, buildBrushIndex } = await import(chartWeb(HERE, "assets", "brush.ts"));

  const REQUIRED = ["eyebrow", "axes", "lines", "thread", "claimAxes", "threadNote", "detail", "bands", "brushLabel", "noneLabel", "announce", "note", "title", "limits", "reading", "source", "alt", "check"];
  const missing = REQUIRED.filter((key) => beat[key] === undefined);
  if (missing.length) throw new Error(`beat.mjs is missing ${missing.join(", ")}: give each as a field of the default export (export default { …, ${missing[0]}: … }), not as a separate export (see CONTRACT.md)`);
  for (const fn of ["detail", "announce", "note", "check"])
    if (typeof beat[fn] !== "function") throw new Error(`beat.mjs: ${fn} must be a function (see CONTRACT.md)`);
  if (beat.formatCeiling !== undefined && typeof beat.formatCeiling !== "function") throw new Error(`beat.mjs: formatCeiling must be a function (see CONTRACT.md)`);

  // ── the static kit's refusals: the rails, the lines, the thread, the claim's two rails ───────
  const axisKeys = beat.axes.map((a) => a.key);
  if (beat.axes.length < 3 || beat.axes.length > 9)
    throw new Error(`axes holds ${beat.axes.length} axes; parallel coordinates need 3 to 9. With two measures, draw a scatter or a slope instead`);
  if (new Set(axisKeys).size !== axisKeys.length) throw new Error(`two axes share a key (${axisKeys.join(", ")})`);
  if (beat.lines.length < 3 || beat.lines.length > 30)
    throw new Error(`lines holds ${beat.lines.length} entities; this plate can carry 3 to 30. Keep the thread and the largest others, and say in limits how many of how many are drawn`);
  const lineKeys = beat.lines.map((l) => String(l.key));
  if (new Set(lineKeys).size !== lineKeys.length) throw new Error(`two lines share a key: one line per entity — filter data.json to one row per entity (one year)`);
  for (const l of beat.lines) {
    const absent = axisKeys.filter((k) => !(k in l.values));
    if (absent.length) throw new Error(`line ${l.key} has no value for ${absent.join(", ")}: every line crosses every axis`);
  }
  assertNumbers(beat.lines.flatMap((l) => axisKeys.map((k) => [`${l.key}.${k}`, l.values[k]])), "line values");
  const negative = beat.lines.flatMap((l) => axisKeys.filter((k) => l.values[k] < 0).map((k) => `${l.key}.${k}`));
  if (negative.length) throw new Error(`${negative.slice(0, 3).join(", ")} are negative: every axis here runs from 0 up`);
  const thread = [beat.thread].flat().map(String);
  if (thread.length < 1 || thread.length > 3) throw new Error(`thread names ${thread.length} lines; the accent carries 1 to 3 — the lines the takeaway is about`);
  const unknown = thread.filter((k) => !lineKeys.includes(k));
  if (unknown.length) throw new Error(`thread names ${unknown.join(", ")}, which are not keys of lines (${lineKeys.slice(0, 6).join(", ")}…)`);
  const [ca, cb] = beat.claimAxes;
  const ia = axisKeys.indexOf(ca);
  const ib = axisKeys.indexOf(cb);
  if (ia < 0 || ib < 0) throw new Error(`claimAxes ${JSON.stringify(beat.claimAxes)} must be two keys of axes (${axisKeys.join(", ")})`);
  if (Math.abs(ia - ib) !== 1)
    throw new Error(`claimAxes ${ca} and ${cb} are not neighbours (positions ${ia + 1} and ${ib + 1}): only adjacent axes show a relationship — reorder axes so they sit side by side, first if you can`);

  const mean = (xs) => xs.reduce((a, b) => a + b, 0) / xs.length;
  const xs = beat.lines.map((l) => l.values[ca]);
  const ys = beat.lines.map((l) => l.values[cb]);
  const [mx, my] = [mean(xs), mean(ys)];
  const den = Math.sqrt(xs.reduce((s, x) => s + (x - mx) ** 2, 0) * ys.reduce((s, y) => s + (y - my) ** 2, 0));
  const r = den ? xs.reduce((s, x, i) => s + (x - mx) * (ys[i] - my), 0) / den : 0;
  beat.check({ lines: beat.lines, r });
  const claimErrors = [];
  for (const k of [ca, cb]) {
    try {
      assertDrawsClaimColumn(beat.lines.map((l) => l.values[k]), HERE);
      claimErrors.length = 0;
      break;
    } catch (error) {
      claimErrors.push(error.message);
    }
  }
  if (claimErrors.length === 2) throw new Error(claimErrors[0]);

  // ── each rail keeps its own scale, fitted to its own column and rounded outward ─────────────
  const stepFor = (top) => beat.ceilingStep ?? (top > 10 ? 10 : [0.01, 0.02, 0.05, 0.1, 0.2, 0.5, 1, 2, 5].find((s) => s >= top / 5) ?? 10);
  const formatCeiling = beat.formatCeiling ?? ((v) => `${v} %`);
  const axes = beat.axes.map((a) => {
    const top = Math.max(...beat.lines.map((l) => l.values[a.key]));
    const step = stepFor(top);
    const ceiling = Math.max(step, Math.round(Math.ceil(top / step) * step * 1e9) / 1e9);
    return { key: a.key, name: plain(a.name), ceiling, ceilingLabel: plain(formatCeiling(ceiling)) };
  });

  // ── the lines: runner's own keys, the thread drawn last ─────────────────────────────────────
  const lines = beat.lines
    .map((l, i) => ({
      code: `l${i + 1}`,
      key: String(l.key),
      name: plain(l.name),
      values: axisKeys.map((k) => l.values[k]),
      highlight: thread.includes(String(l.key)),
      detail: plain(beat.detail({ ...l, r })),
    }))
    .sort((a, b) => Number(a.highlight) - Number(b.highlight));
  if (new Set(lines.map((l) => l.detail)).size !== lines.length)
    throw new Error(`detail() prints the same sentence for two lines: every line must answer with its own row (start with its name)`);

  // ── the brush: named bands on one rail, each read against another ───────────────────────────
  const bandsIn = beat.bands;
  if (!Array.isArray(bandsIn) || bandsIn.length < 2) throw new Error(`bands holds ${bandsIn?.length ?? 0} band(s); the control needs at least two, e.g. { axis, from, to, against, label }`);
  const cap = (word) => word.charAt(0).toLocaleUpperCase() + word.slice(1);
  const insideCounts = [];
  const brushOptions = bandsIn.map((band, n) => {
    const i = axisKeys.indexOf(band.axis);
    const j = axisKeys.indexOf(band.against);
    if (i < 0 || j < 0) throw new Error(`the band ${JSON.stringify(band.label)} names a rail (${band.axis} / ${band.against}) that axes does not hold (${axisKeys.join(", ")})`);
    if (i === j) throw new Error(`the band ${JSON.stringify(band.label)} is read against its own rail, which says nothing: give it another rail as against`);
    if (typeof band.from !== "number" || (band.to != null && !(band.to > band.from))) throw new Error(`the band ${JSON.stringify(band.label)} needs from (a number) and to (a larger number, or null for "up to the ceiling")`);
    const lo = band.from;
    const hi = band.to ?? axes[i].ceiling;
    const inside = lines.filter((l) => l.values[i] >= lo && l.values[i] <= hi);
    const outside = lines.filter((l) => !(l.values[i] >= lo && l.values[i] <= hi));
    if (!inside.length || !outside.length)
      throw new Error(`the band ${JSON.stringify(band.label)} holds ${inside.length} of ${lines.length} lines — a band that keeps none, or keeps them all, does nothing: move its bounds`);
    const label = plain(band.label);
    if (!label.startsWith(cap(axes[i].name)))
      throw new Error(`the band ${JSON.stringify(label)} must open with the name of the rail it cuts, capitalised (${cap(axes[i].name)}…) — the pill would name one rail and the wash appear on another`);
    insideCounts.push(inside.length);
    const reading = {
      label,
      axis: axes[i].name,
      against: axes[j].name,
      from: lo,
      to: band.to ?? null,
      ceiling: axes[i].ceiling,
      inside: inside.length,
      outside: outside.length,
      total: lines.length,
      insideNames: inside.map((l) => l.name),
      insideMean: mean(inside.map((l) => l.values[j])),
      outsideMean: mean(outside.map((l) => l.values[j])),
      adjacent: Math.abs(i - j) === 1,
    };
    const option = { key: `band-${n + 1}`, axis: band.axis, label, announce: plain(beat.announce(reading)), note: plain(beat.note(reading)), lo, hi, keys: inside.map((l) => l.code) };
    if (!option.announce.includes(label)) throw new Error(`announce() must contain the band's label (${label}); it says: ${option.announce}`);
    if (!statesNumber(option.note, inside.length))
      throw new Error(`note() is shown when the band ${label} is chosen, so it must state how many lines it holds, ${inside.length} (of ${lines.length}); it says: ${option.note}`);
    return option;
  });
  const brushPlan = { label: plain(beat.brushLabel), noneLabel: plain(beat.noneLabel), options: brushOptions };

  // The title counts lines ("8 of 18 … 2 do both"): the thread, the whole set and every band's
  // count are figures the plate carries.
  assertHeadlineNumbersDrawn([beat.title].flat()[0], [...beat.lines.flatMap((l) => axisKeys.map((k) => l.values[k])), thread.length, beat.lines.length, ...insideCounts], "lines");

  const title = plain([beat.title].flat()[0]);
  const caveat = plain([beat.limits].flat()[0]);
  const source = plain(beat.source);
  const reading = plain(beat.reading);
  const eyebrow = plain(beat.eyebrow);
  const claimNote = plain(beat.threadNote);
  const alt = plain(typeof beat.alt === "function" ? beat.alt({ lines: beat.lines, r }) : beat.alt);

  const subject = lines.find((l) => l.key === thread[0]);
  const facts = beatFacts(lines.map((l) => ({ key: l.code, label: l.name, value: l.values[ia] })), { subject: subject.name, declaredSequence: axes[ia].ceilingLabel });
  applicableTreatments(facts);

  const textPerRegister = {
    display: title,
    eyebrow,
    body: `${caveat} ${reading} ${source} ${brushPlan.label} ${brushPlan.noneLabel} ${brushOptions.map((o) => `${o.label} ${o.announce} ${o.note}`).join(" ")}`,
    axis: axes.map((a) => `${a.name} ${a.ceilingLabel}`).join(" "),
    annot: claimNote,
    value: axes.map((a) => a.ceilingLabel).join(" "),
  };

  await renderBeatWeb({
    here: HERE,
    textPerRegister,
    evidenceLevels: beat.evidenceLevels ?? 3,
    async render({ label, direction, outDir }) {
      const { outPath } = await renderWeb({
        lang: beat.lang ?? storyLanguage(HERE) ?? "en",
        component: DirectedParallelWeb,
        props: { axes, lines, brushPlan, title, eyebrow, caveat, source, reading, claimNote, alt, direction, ground: direction.ground, accent: direction.accent },
        outDir,
        name: `${label}.html`,
      });
      // The worked example's own post-render checks: one brush vocabulary per line, and every band
      // changes the picture.
      const written = readFileSync(outPath, "utf8");
      assertOneBrushVocabulary(written, buildBrushIndex({ options: brushOptions }, lines.map((l) => l.code)), { perKey: 1 + axes.length });
      assertBrushChangesThePicture(written, { options: brushOptions }, `renders/${label}.html`);
      return { outPath };
    },
  });
});
