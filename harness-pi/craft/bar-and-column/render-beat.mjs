// The generic half of a bar-and-column beat: art direction, treatments, render and refusals, taken
// from proof/static-bar-top-emitters-2024/render-directions.mjs with everything about ITS subject
// removed. Everything about THIS story — data, claim, words, checks — lives in ./beat.mjs, the one
// file the model writes. Copied into the beat by the harness; never edited by the model.
//
// Usage:  bun <beat>/render-beat.mjs [--size landscape|square|portrait]
import { rm } from "node:fs/promises";
import { basename, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createElement } from "react";
import { renderStill } from "#shared/chart-beat/render-still.mjs";
import { readPalette } from "#shared/chart-beat/colour.mjs";
import { beatFacts, applicableTreatments } from "#shared/chart-beat/treatments.mjs";
import { composeDirections, filedDirections, report as composeReport, resolveDirectionFamilies } from "#shared/design-base/index.mjs";
import { directionReachable, readRunDirection } from "#shared/design-base/run-direction.mjs";
import { assertBeatMayEnter, directedFrame, exportSizeFromArgv, nameAtSize } from "#shared/chart-beat/directed-size.mjs";
import { DirectedColumns } from "./DirectedColumns.tsx";
import beat from "./beat.mjs";
import { existsSync as storyboardExists, readFileSync as readStoryboard } from "node:fs";
// The credit line is the journalist's own, as the storyboard recorded it, with its as-of date; a 12B
// beat once printed "unattributed" with no date. The beat's own `source` is used only without one.
{
  const storyboard = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "STORYBOARD.md");
  if (storyboardExists(storyboard)) {
    const front = readStoryboard(storyboard, "utf8").split("---")[1] ?? "";
    const field = (key) => front.match(new RegExp(`^${key}:\\s*"?(.*?)"?\\s*$`, "m"))?.[1];
    const credit = field("credit");
    const asOf = field("effectiveDate");
    if (credit) beat.source = asOf && !/\bas of\b/i.test(credit) ? `${credit} · as of ${asOf}` : credit;
    // The headline is the journalist's confirmed takeaway, word for word, in the story's language: a
    // 12B beat once translated an English takeaway into German and typed its own numbers.
    const takeaway = field("takeaway")?.replace(/\\"/g, '"');
    const norm = (t) => String(t).replace(/\s+/g, " ").trim().replace(/[.。]$/, "");
    const headline = [beat.title].flat()[0];
    if (takeaway && headline !== undefined && norm(headline) !== norm(takeaway))
      throw new Error(`title's first form must be the journalist's takeaway copied as a literal string, not computed. It renders as: "${norm(headline)}" — it must be: "${takeaway}"`);
  }
}

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, "renders");
const SIZE = exportSizeFromArgv();
const FRAME = directedFrame(SIZE);
assertBeatMayEnter(HERE, SIZE, { what: basename(HERE) });

const REQUIRED = ["eyebrow", "rows", "subject", "comparison", "comparisonSum", "comparisonNote", "format", "title", "limits", "source", "alt", "check"];
const missing = REQUIRED.filter((key) => beat[key] === undefined);
if (missing.length) throw new Error(`beat.mjs is missing ${missing.join(", ")} (see CONTRACT.md)`);
// The beat's own claim, checked against its own data BEFORE anything is drawn: a number that
// drifted from the data refuses the render rather than shipping a stale headline.
beat.check();
assertHeadlineNumbersDrawn([beat.title].flat()[0], beat.rows.map((r) => r.value), "bars");
// The note is drawn as a bracket over the comparison bars, so the number it states must be theirs:
// a 12B beat once bracketed the five smaller networks (180) with the six-network total (394).
const sum = beat.rows.filter((r) => beat.comparison.includes(r.name)).reduce((s, r) => s + r.value, 0);
if (Math.abs(sum - beat.comparisonSum) > 1e-9) throw new Error(`comparisonSum is ${beat.comparisonSum}, but the comparison bars add up to ${sum}`);
const stated = (beat.comparisonNote.match(/\d+(?:[.,\s]\d+)*/g) ?? []).map((n) => Number(n.replace(/\s/g, "").replace(",", ".")));
if (!stated.some((n) => Math.abs(n - sum) < 0.05 * Math.max(1, sum)) && !beat.comparisonNote.includes(beat.format(sum)))
  throw new Error(`comparisonNote is drawn over the comparison bars, so it must state their sum (${beat.format(sum)}); it says: ${beat.comparisonNote}`);

const facts = beatFacts(
  beat.rows.map((r) => ({ key: r.name, label: r.name, value: r.value })),
  {
    subject: beat.subject,
    bars: beat.rows.length,
    comparisonSet: beat.comparison.map((name) => ({ key: name })),
    namedSeries: beat.rows.map((r) => r.name),
    declaredSequence: null,
  },
);
const offered = applicableTreatments(facts);
const titles = [beat.title].flat();
const limits = [beat.limits].flat();
const textPerRegister = {
  display: titles.join(" "),
  eyebrow: beat.eyebrow,
  body: `${limits.join(" ")} ${beat.source}`,
  axis: "0",
  annot: `${beat.rows.map((r) => r.name).join(" ")} ${beat.comparisonNote}`,
  value: beat.rows.map((r) => beat.format(r.value)).join(" "),
};

const labelOf = (id) => id.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const newsroom = readPalette(HERE);
let chosen;
if (directionReachable(HERE)) {
  const run = readRunDirection(HERE);
  chosen = [{ label: labelOf(run.id), direction: run }];
} else {
  const composition = composeDirections({ newsroom, filed: filedDirections(), beat: { evidenceLevels: beat.evidenceLevels ?? 2 }, textPerRegister });
  if (!composition.offered.length) throw new Error(`no composed direction holds up for this beat:\n${composeReport(composition, {})}`);
  chosen = composition.offered.slice(0, 1).map((d) => ({ label: labelOf(d.id), direction: d }));
}

const refused = [];
for (const { label: id, direction: chosenDirection } of chosen) {
  const direction = resolveDirectionFamilies(chosenDirection, textPerRegister);
  try {
    await renderStill({
      element: createElement(DirectedColumns, {
        frame: { width: FRAME.width, height: FRAME.height },
        rows: beat.rows,
        subject: beat.subject,
        comparison: beat.comparison,
        comparisonSum: beat.comparisonSum,
        comparisonNote: beat.comparisonNote,
        format: beat.format,
        title: titles,
        limits,
        scope: beat.scope,
        keep: beat.keep ?? [beat.subject, ...beat.comparison],
        source: beat.source,
        alt: beat.alt,
        eyebrow: beat.eyebrow,
        direction,
        treatments: offered.map((t) => t.id),
      }),
      width: FRAME.width,
      height: FRAME.height,
      outDir: OUT,
      name: nameAtSize(id, SIZE),
      scale: FRAME.scale,
    });
    console.log(`rendered renders/${nameAtSize(id, SIZE)}.png`);
  } catch (error) {
    for (const ext of ["png", "svg"]) await rm(join(OUT, `${nameAtSize(id, SIZE)}.${ext}`), { force: true });
    refused.push({ id, why: error.message });
    console.log(`REFUSED — ${error.message}`);
  }
}
if (refused.length) process.exit(1);

// Every number the headline states at the scale of the drawn values must be one of them (or their
// total): a 12B beat once drew deaths inside built-up areas only (17 to 119) under a takeaway that
// says 36 to 214, the all-areas series.
function assertHeadlineNumbersDrawn(headline, drawn, label) {
  const values = drawn.filter((v) => Number.isFinite(v));
  if (!values.length) return;
  const allowed = [...values, values.reduce((a, b) => a + b, 0)];
  const lo = Math.min(...values) / 2;
  const hi = Math.max(...values) * 2;
  const stated = [...String(headline).matchAll(/(\d{1,3}(?:[ ,\u00a0\u202f]\d{3})+|\d+(?:[.,]\d+)?)(\s*%)?/g)]
    .filter((m) => !m[2])
    .map((m) => Number(m[1].replace(/[ ,\u00a0\u202f](?=\d{3}\b)/g, "").replace(",", ".")))
    .filter((n) => !(Number.isInteger(n) && n >= 1900 && n <= 2100) && n >= lo && n <= hi);
  const missing = stated.filter((n) => !allowed.some((v) => Math.abs(v - n) <= Math.max(0.5, Math.abs(n) * 0.005)));
  if (missing.length)
    throw new Error(`the title states ${missing.join(", ")}, which the drawn ${label} does not contain: the rows selected from data.json are probably not the takeaway's series — read its other columns and filter to the one the takeaway is about`);
}
