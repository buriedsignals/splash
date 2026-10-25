// The generic half of a line beat: art direction, treatments, render and refusals, taken from
// proof/co2-suisse/render-directions.mjs with everything about ITS subject removed. Everything
// about THIS story — data, reference level, words, checks — lives in ./beat.mjs, the one file the
// model writes. Copied into the beat by the harness; never edited by the model.
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
import { DirectedLine } from "./DirectedLine.tsx";
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

const REQUIRED = ["eyebrow", "entity", "data", "unit", "format", "reference", "referenceLabel", "peakLabel", "title", "limits", "source", "alt", "check"];
const missing = REQUIRED.filter((key) => beat[key] === undefined);
if (missing.length) throw new Error(`beat.mjs is missing ${missing.join(", ")} (see CONTRACT.md)`);
beat.check();
assertDrawsClaimColumn(beat.data.map((d) => d.value), dirname(fileURLToPath(import.meta.url)));
assertHeadlineNumbersDrawn([beat.title].flat()[0], beat.data.map((d) => d.value), "series");
// One point per year: a table that keeps several rows per year (by location, by sex...) drawn as one
// series zig-zags between them, as a 12B beat once did with three rows per year.
{
  const seen = new Map();
  for (const d of beat.data) seen.set(d.year, (seen.get(d.year) ?? 0) + 1);
  const doubled = [...seen].filter(([, n]) => n > 1);
  if (doubled.length)
    throw new Error(`data holds ${doubled[0][1]} values for ${doubled[0][0]} (and ${doubled.length - 1} other year(s)): filter data.json's rows to ONE series — read its other columns — so each year has one value`);
}

// The component reads { year, mt }; the contract speaks { year, value }.
const data = beat.data.map((d) => ({ year: d.year, mt: d.value }));
const eras = beat.eras ?? [];
const facts = beatFacts(
  data.map((d) => ({ key: String(d.year), value: d.mt })),
  { namedSeries: [beat.entity], subject: beat.entity, reference: beat.reference, eras },
);
const offered = applicableTreatments(facts);
const last = data[data.length - 1];
const textPerRegister = {
  display: beat.title,
  eyebrow: beat.eyebrow,
  body: `${beat.limits} ${beat.source}`,
  axis: `${beat.unit} ${data.map((d) => d.year).join(" ")}`,
  annot: `${beat.referenceLabel} ${beat.peakLabel}`,
  value: `${last.year} · ${beat.format(last.mt)} ${beat.unit}`,
};

const labelOf = (id) => id.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const newsroom = readPalette(HERE);
let chosen;
if (directionReachable(HERE)) {
  const run = readRunDirection(HERE);
  chosen = [{ label: labelOf(run.id), direction: run }];
} else {
  const composition = composeDirections({ newsroom, filed: filedDirections(), beat: { evidenceLevels: beat.evidenceLevels ?? 3 }, textPerRegister });
  if (!composition.offered.length) throw new Error(`no composed direction holds up for this beat:\n${composeReport(composition, {})}`);
  chosen = composition.offered.slice(0, 1).map((d) => ({ label: labelOf(d.id), direction: d }));
}

const refused = [];
for (const { label: id, direction: chosenDirection } of chosen) {
  const direction = resolveDirectionFamilies(chosenDirection, textPerRegister);
  try {
    await renderStill({
      element: createElement(DirectedLine, {
        frame: { width: FRAME.width, height: FRAME.height },
        data,
        title: beat.title,
        source: beat.source,
        alt: beat.alt,
        limits: beat.limits,
        eyebrow: beat.eyebrow,
        reference: beat.reference,
        referenceLabel: beat.referenceLabel,
        peakLabel: beat.peakLabel,
        unit: beat.unit,
        format: beat.format,
        direction,
        treatments: offered.map((t) => t.id),
        eras,
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
  // A takeaway may state a figure the plate does not draw (a raw count beside drawn rates); the
  // wrong series shows as MOST of its figures missing.
  if (missing.length && missing.length * 2 > stated.length)
    throw new Error(`the title states ${missing.join(", ")}, which the drawn ${label} does not contain: the rows selected from data.json are probably not the takeaway's series — read its other columns and filter to the one the takeaway is about`);
}

// When the journalist named the claim's column, the drawn values are that column's: the Polish run
// drew raw beds under a per-resident headline.
function assertDrawsClaimColumn(drawn, here) {
  const storyboard = join(here, "..", "..", "STORYBOARD.md");
  const dataPath = join(here, "data.json");
  if (!storyboardExists(storyboard) || !storyboardExists(dataPath)) return;
  const column = (readStoryboard(storyboard, "utf8").split("---")[1] ?? "").match(/^claimColumn:\s*"?(.*?)"?\s*$/m)?.[1];
  if (!column) return;
  const table = JSON.parse(readStoryboard(dataPath, "utf8"));
  const at = (table.columns ?? []).findIndex((c) => c.name === column);
  if (at < 0) return;
  const held = table.rows.map((r) => Number(String(r[at]).replace(/\s/g, "").replace(",", "."))).filter(Number.isFinite);
  const foreign = drawn.filter((v) => Number.isFinite(v) && !held.some((h) => Math.abs(h - v) <= Math.max(1e-9, Math.abs(h) * 1e-6)));
  if (foreign.length)
    throw new Error(`the claim is about the column ${column}, but the plate draws values that column does not hold (${foreign.slice(0, 3).join(", ")}): draw ${column}'s values`);
}
