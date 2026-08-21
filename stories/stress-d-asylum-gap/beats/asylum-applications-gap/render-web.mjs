// stories/stress-d-asylum-gap/beats/asylum-applications-gap/render-web.mjs
//
// This beat's own WEB runner — the story's own constants, its own CSV reader, its own component,
// handed to the format's generic machinery (`skills/chart-web/scripts/render-web.mjs`).
//
// THE TRAP THIS SCRIPT ANSWERS (see BRIEF.md, "The trap, and the decision"): the registry has a
// real hole — 2013 and 2014 are simply absent from `data.csv`, not zero, not interpolated. This
// script asserts that the gap is EXACTLY those two years and throws if the frozen data ever
// changed shape under it, since the whole beat is built to draw that specific hole honestly.
//
// Usage:  bun render-web.mjs [outDir] [--data <csv>]

import { readFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { readPalette } from "#shared/chart-beat/render-still.mjs";
import { renderWeb } from "#shared/chart-web/scripts/render-web.mjs";
import { AsylumGapWeb, FRAME } from "./AsylumGapWeb.tsx";

function parseCsvRows(text) {
  const rows = [];
  let row = [];
  let field = "";
  let quoted = false;
  let i = 0;
  while (i < text.length) {
    const char = text[i];
    if (quoted) {
      if (char === '"') {
        if (text[i + 1] === '"') { field += '"'; i += 2; continue; }
        quoted = false; i += 1; continue;
      }
      field += char; i += 1; continue;
    }
    if (char === '"') { quoted = true; i += 1; continue; }
    if (char === ",") { row.push(field); field = ""; i += 1; continue; }
    if (char === "\r") { row.push(field); rows.push(row); row = []; field = ""; i += (text[i + 1] === "\n") ? 2 : 1; continue; }
    if (char === "\n") { row.push(field); rows.push(row); row = []; field = ""; i += 1; continue; }
    field += char; i += 1;
  }
  if (field !== "" || row.length > 0) { row.push(field); rows.push(row); }
  return rows;
}

export function readingsFromCsv(csv) {
  const [header, ...rows] = parseCsvRows(csv.trim());
  const yearAt = header.indexOf("year");
  const appsAt = header.indexOf("applications");
  if (yearAt < 0 || appsAt < 0)
    throw new Error(`csv has no year / applications column, got: ${header}`);
  return rows
    .filter((cells) => cells.length > 1 || cells[0] !== "")
    .map((cells) => ({ year: Number(cells[yearAt]), applications: Number(cells[appsAt]) }))
    .filter((r) => Number.isFinite(r.year) && Number.isFinite(r.applications))
    .sort((a, b) => a.year - b.year);
}

const HERE = dirname(fileURLToPath(import.meta.url));

const { ground, accent, origin, source: paletteSource } = readPalette(HERE, {
  stopAt: resolve(HERE, "../.."),
});
console.log(
  `palette from ${paletteSource} — ground ${ground}, accent ${accent}, chosen by ${origin}`,
);

const DEFAULT_DATA_PATH = join(HERE, "data.csv");
const DEFAULT_OUT_DIR = HERE;
const OUTPUT_NAME = "asylum-applications-gap.html";

export async function render({ dataPath, outDir, name = OUTPUT_NAME }) {
  const csv = await readFile(dataPath, "utf8");
  const data = readingsFromCsv(csv);
  if (data.length < 2) throw new Error(`need at least two readings, got ${data.length}`);

  // Assert the gap is exactly the one this beat is built to draw. The whole point of this render
  // is a spatially honest hole in the line; a data refresh that closed the gap, or opened a
  // different one, needs a human to look again, not a chart that quietly keeps drawing the old
  // shape over new numbers.
  const years = data.map((d) => d.year);
  const missing = [];
  for (let y = Math.min(...years); y <= Math.max(...years); y++) {
    if (!years.includes(y)) missing.push(y);
  }
  if (missing.length !== 2 || missing[0] !== 2013 || missing[1] !== 2014)
    throw new Error(
      `expected the registry's gap to be exactly 2013 and 2014, found missing years: ` +
        `[${missing.join(", ")}]`,
    );

  const first = data[0];
  const last = data[data.length - 1];
  const low = data.reduce((a, b) => (b.applications < a.applications ? b : a));
  // The decline runs from the first reading THROUGH THE LOW POINT, not through the whole pre-gap
  // block: 2012 ticks up slightly from 2011 (1,217 vs 1,211) before the registry goes dark, so the
  // decline this takeaway names ends at the low year, not at the last pre-gap year.
  const decline = data.filter((d) => d.year <= low.year);
  const fellEveryYear = decline.every(
    (d, i) => i === 0 || d.applications < decline[i - 1].applications,
  );
  if (!fellEveryYear)
    throw new Error(
      `expected applications to fall every year from the first reading through the low point ` +
        `(${low.year}) — the takeaway states this explicitly and it no longer holds against the ` +
        `frozen data`,
    );

  const postGapFirst = data.find((d) => d.year === 2015);
  const preGapLast = data.find((d) => d.year === 2012);
  const reboundPct = Math.round(
    ((postGapFirst.applications - preGapLast.applications) / preGapLast.applications) * 1000,
  ) / 10;

  const title =
    `Applications fell every year from ${first.year} to ${low.year}, then the registry went ` +
    `dark for two years — and came back ${reboundPct}% higher than where it left off`;
  const caveat =
    `The office has never explained why the registry published no figures for 2013 or 2014. ` +
    `Every year's own count is on hover or Tab — explore it yourself.`;
  const source = "Source: national asylum registry, as reported in the frozen dataset for this story";
  const alt =
    `A line chart of asylum applications by year, ${first.year} to ${last.year}. Applications ` +
    `fell every year from ${first.year} (${first.applications}) to ${low.year} (${low.applications}), ` +
    `then the registry published nothing for 2013 or 2014 — shown as a shaded, unbridged gap in ` +
    `the line, never a straight connector across it. The line resumes in 2015 at ` +
    `${postGapFirst.applications}, ${reboundPct}% above the ${preGapLast.year} reading of ` +
    `${preGapLast.applications}, and rises to ${last.applications} by ${last.year}.`;

  console.log(`readings: ${data.map((d) => `${d.year}=${d.applications}`).join(", ")}`);
  console.log(`missing years: ${missing.join(", ")}`);
  console.log(`low point: ${low.year} (${low.applications})`);
  console.log(`rebound across the gap: ${preGapLast.year} ${preGapLast.applications} -> ${postGapFirst.year} ${postGapFirst.applications} = ${reboundPct}%`);
  console.log(`title: ${title}`);

  // This beat's words are English throughout, and `renderWeb` now takes that language as a real
  // input rather than hard-coding one: no more post-hoc patch of the shipped file. See
  // `skills/chart-web/scripts/render-web.mjs`'s own `assertRecordedLanguage`.
  const { outPath } = await renderWeb({
    component: AsylumGapWeb,
    props: {
      data,
      frame: FRAME,
      title,
      source,
      alt,
      caveat,
      ground,
      accent,
      reference: first.applications,
      referenceLabel: `${first.year} level`,
      lowYear: low.year,
      lowLabel: "the decade's low point",
      gapLabel: "No data for 2013–2014",
      language: "en",
    },
    outDir,
    name,
  });

  return { outPath, readings: data.length };
}

if (import.meta.main) {
  const argv = process.argv.slice(2);
  const flag = (name, fallback) => {
    const at = argv.indexOf(name);
    return at >= 0 ? argv[at + 1] : fallback;
  };
  const positional = argv.find((a) => !a.startsWith("--"));
  const dataPath = resolve(flag("--data", DEFAULT_DATA_PATH));
  const outDir = resolve(positional ?? flag("--out", DEFAULT_OUT_DIR));

  const { outPath, readings } = await render({ dataPath, outDir });
  console.log(`web beat → ${outPath}  [${readings} readings]`);
}
