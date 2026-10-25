// The generic half of an area beat: art direction, treatments, the stock arithmetic, render and
// refusals, taken from proof/static-area-swiss-co2/render-directions.mjs with everything about ITS
// subject removed. Everything about THIS story — data, the cut year, words, checks — lives in
// ./beat.mjs, the one file the model writes. Copied into the beat by the harness; never edited by
// the model.
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
import { DirectedArea } from "./DirectedArea.tsx";
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

const REQUIRED = ["eyebrow", "data", "cut", "unit", "valueUnit", "format", "title", "limits", "reading", "source", "alt", "check"];
const missing = REQUIRED.filter((key) => beat[key] === undefined);
if (missing.length) throw new Error(`beat.mjs is missing ${missing.join(", ")} (see CONTRACT.md)`);
// The beat's own claim, checked against its own data BEFORE anything is drawn.
// Every drawn value is a number: a value left as text (a cell in another digit system, a "-")
// concatenates instead of adding, and breaks every check after it.
{
  const notNumbers = beat.data.map((d) => [d.year, d.value]).filter(([, v]) => typeof v !== "number" || !Number.isFinite(v));
  if (notNumbers.length)
    throw new Error(`data hold values that are not numbers: ${notNumbers.slice(0, 3).map(([k, v]) => `${k}=${JSON.stringify(v)}`).join(", ")}. Convert them with Number(), or leave out the rows the data cannot give (say so in the standfirst)`);
}
beat.check();
assertHeadlineNumbersDrawn([beat.title].flat()[0], beat.data.map((d) => d.value), "series");
// One point per year (see the line adapter): several rows per year drawn as one series is wrong.
{
  const seen = new Map();
  for (const d of beat.data) seen.set(d.year, (seen.get(d.year) ?? 0) + 1);
  const doubled = [...seen].filter(([, n]) => n > 1);
  if (doubled.length)
    throw new Error(`data holds ${doubled[0][1]} values for ${doubled[0][0]} (and ${doubled.length - 1} other year(s)): filter data.json's rows to ONE series — read its other columns — so each year has one value`);
}

// The component reads { year, mt }; the contract speaks { year, value }.
const readings = beat.data.map((d) => ({ year: Number(d.year), mt: Number(d.value) })).sort((a, b) => a.year - b.year);
if (readings.length < 3) throw new Error(`an area needs a series; beat.mjs gives ${readings.length} readings`);
for (const r of readings)
  if (!Number.isFinite(r.year) || !Number.isFinite(r.mt))
    throw new Error(`a reading has no usable year or value: ${JSON.stringify(r)}`);
/** THE FILL CLAIMS TO BE A QUANTITY, so the quantity cannot go below the zero the fill starts from. */
const negative = readings.filter((r) => r.mt < 0);
if (negative.length)
  throw new Error(
    `${negative.length} readings are below zero (first: ${negative[0].year}). A filled area is a stock ` +
      `measured from zero; a series that goes negative is drawn as a line, not an area.`,
  );
if (!readings.some((r) => r.mt > 0)) throw new Error(`every reading is zero; there is no surface to draw`);
/** A GAP IN A SERIES DRAWN AS AN AREA IS FILLED IN SILENTLY — the polygon closes over the missing
 *  year and the reader integrates a value nobody measured. */
for (let i = 1; i < readings.length; i++)
  if (readings[i].year !== readings[i - 1].year + 1)
    throw new Error(
      `the series jumps from ${readings[i - 1].year} to ${readings[i].year}. An area drawn over a ` +
        `gap closes across it, and the surface then measures years the source never reported.`,
    );

// ── THE STOCK, cut at the beat's year ───────────────────────────────────────
const first = readings[0];
const last = readings[readings.length - 1];
const cut = Number(beat.cut);
if (!(cut > first.year && cut < last.year))
  throw new Error(`cut ${beat.cut} must be a year strictly between ${first.year} and ${last.year}`);
const total = readings.reduce((s, r) => s + r.mt, 0);
const before = readings.filter((r) => r.year <= cut);
const after = readings.filter((r) => r.year > cut);
const shareBefore = (before.reduce((s, r) => s + r.mt, 0) / total) * 100;
const halves = [
  { from: first.year, to: cut, share: shareBefore, years: before.length },
  { from: cut + 1, to: last.year, share: 100 - shareBefore, years: after.length },
];
const peak = readings.reduce((a, b) => (b.mt > a.mt ? b : a));

const facts = beatFacts(
  readings.map((r) => ({ key: String(r.year), label: String(r.year), value: r.mt })),
  {
    continuousAxis: true,
    markers: [{ key: String(cut), label: String(cut), value: before.reduce((s, r) => s + r.mt, 0) }],
    namedSeries: [beat.entity ?? beat.unit],
    declaredSequence: "year",
  },
);
const offered = applicableTreatments(facts);
const title = [beat.title].flat();
const limits = [beat.limits].flat();
const reading = [beat.reading].flat();
const textPerRegister = {
  display: title.join(" "),
  eyebrow: beat.eyebrow,
  body: `${limits.join(" ")} ${beat.source}`,
  axis: `${beat.unit} ${first.year} ${last.year} ${beat.format(peak.mt, 0)} 0`,
  annot: `${reading.join(" ")} ${halves.map((h) => `${h.from}–${h.to} ${beat.format(h.share, 1)} %`).join(" ")}`,
  value: `${beat.format(last.mt, 1)} ${beat.valueUnit} ${beat.format(total, 0)} ${cut}`,
};

const labelOf = (id) => id.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const newsroom = readPalette(HERE);
let chosen;
if (directionReachable(HERE)) {
  const run = readRunDirection(HERE);
  chosen = [{ label: labelOf(run.id), direction: run }];
} else {
  const composition = composeDirections({ newsroom, filed: filedDirections(), beat: { evidenceLevels: beat.evidenceLevels ?? 4 }, textPerRegister });
  if (!composition.offered.length) throw new Error(`no composed direction holds up for this beat:\n${composeReport(composition, {})}`);
  chosen = composition.offered.slice(0, 1).map((d) => ({ label: labelOf(d.id), direction: d }));
}

const refused = [];
for (const { label: id, direction: chosenDirection } of chosen) {
  const direction = resolveDirectionFamilies(chosenDirection, textPerRegister);
  try {
    await renderStill({
      element: createElement(DirectedArea, {
        frame: { width: FRAME.width, height: FRAME.height },
        readings,
        halves,
        midpoint: cut,
        peak,
        last,
        unit: beat.unit,
        valueUnit: beat.valueUnit,
        format: beat.format,
        tickStep: beat.tickStep,
        yearStep: beat.yearStep,
        title,
        limits,
        reading,
        source: beat.source,
        alt: beat.alt,
        eyebrow: beat.eyebrow,
        direction,
        treatments: offered.map((t) => t.id),
        onLadder: (note) => console.log(`  ${note}`),
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
