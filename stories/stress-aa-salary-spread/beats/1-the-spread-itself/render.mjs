// Beat 1 — the spread of this payroll, rendered from the frozen source.
//
// Usage, from the Splash root:
//   bun stories/stress-aa-salary-spread/beats/1-the-spread-itself/render.mjs
//
// Every number the chart asserts — the denominator, the median, the mean, the share below the
// mean, the bin edges, the three tail salaries and every figure in the alt text — is COMPUTED
// here from `source/data.csv` and printed before the render. Nothing is typed.

import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createElement } from "react";
import {
  renderStill,
  readPalette,
  readTypeface,
  useTypeface,
  assertDrawnInActiveTypeface,
  framingMeasurement,
} from "#shared/chart-beat/render-still.mjs";
import {
  assertDeliveredSize,
  assertTypeFloor,
  assertWithinStage,
  readPinnedSize,
  readPngSize,
  sizeFor,
} from "#shared/chart-beat/sizes.mjs";
import { assertTypeMayEnter } from "#shared/chart-beat/type-at-size.mjs";
import { SalarySpreadHistogram, TYPE } from "./SalarySpreadHistogram.tsx";

const HERE = dirname(fileURLToPath(import.meta.url));
const STORY = join(HERE, "..", "..");

/** The bin width, in euros, and the round floor the axis starts on. Decided in `BRIEF.md` before
 *  the summary numbers were looked at; neither the median nor the mean may land on an edge, which
 *  is asserted below rather than assumed. */
const BIN = 5000;

// The credit the journalist recorded at gate 2 is `unattributed`, and the sentence a reader sees
// for that is `Source: not stated` — never the word itself. `creditLine` owns that mapping, in
// `storyboard/scripts/storyboard.mjs`, which a beat may not import across a skill boundary, so the
// sentence is retyped here. See NOTES-FOR-MAINTAINER.md.
const SOURCE_LINE = "Source: not stated — company payroll extract, as of 21 August 2026";

const eur = new Intl.NumberFormat("en-GB");
const money = (v) => eur.format(Math.round(v));

/** RFC 4180 rows, tokenised once. Never `.split(",")`: a quoted cell may legally hold a comma or a
 *  newline, and a hand split cuts it in half without ever saying so. The project walks for that
 *  pair of shapes (`skills/splash/test/csv-hand-split.test.ts`, catalogue guard `csv-split-by-hand`)
 *  because the pattern beat shipped it once. Inlined, not imported: a story workspace is not a
 *  skill, and this file has to stay readable on its own. */
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

function readSalaries(csv) {
  const lines = parseCsvRows(csv.trim());
  const head = lines[0];
  const iSalary = head.indexOf("annual_salary_eur");
  const iDept = head.indexOf("department");
  const iId = head.indexOf("employee_id");
  if (iSalary < 0 || iDept < 0 || iId < 0)
    throw new Error(`source/data.csv does not carry the columns this beat reads: ${head.join(", ")}`);
  return lines.slice(1).map((cell) => {
    const raw = (cell[iSalary] ?? "").trim();
    return {
      id: cell[iId],
      department: cell[iDept],
      raw,
      salary: raw === "" ? null : Number(raw),
    };
  });
}

function quantile(sorted, p) {
  const i = (sorted.length - 1) * p;
  const lo = Math.floor(i);
  const hi = Math.ceil(i);
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (i - lo);
}

async function run() {
  const all = readSalaries(await readFile(join(STORY, "source", "data.csv"), "utf8"));
  const answered = all.filter((r) => r.salary !== null);
  const blank = all.filter((r) => r.salary === null);
  console.log(`read ${all.length} employees from source/data.csv`);

  // THE DENOMINATOR, STATED BEFORE ANYTHING IS DRAWN. A blank return is not a zero salary: it is
  // dropped from the geometry and counted in the standfirst. Counting it as zero would invent six
  // people earning nothing and move both summary numbers.
  console.log(
    `${answered.length} reported a salary, ${blank.length} returned blank ` +
      `(${blank.map((r) => `${r.id} ${r.department}`).join(", ")})`,
  );
  const profile = JSON.parse(await readFile(join(STORY, "source", "profile.json"), "utf8"));
  const profiledMissing = profile.columns.find((c) => c.name === "annual_salary_eur").missing;
  if (profiledMissing !== blank.length)
    throw new Error(
      `the frozen profile records ${profiledMissing} missing salaries and this run reads ` +
        `${blank.length}; one of the two is wrong and the chart may not state a denominator until ` +
        `they agree`,
    );

  const values = answered.map((r) => r.salary).sort((a, b) => a - b);
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const median = quantile(values, 0.5);
  const belowMean = values.filter((v) => v < mean).length;
  console.log(
    `median ${money(median)} EUR · mean ${money(mean)} EUR · mean is ` +
      `${((mean / median - 1) * 100).toFixed(0)}% above the median · ` +
      `${belowMean} of ${values.length} (${((belowMean / values.length) * 100).toFixed(0)}%) earn less than the mean`,
  );
  console.log(`q1 ${money(quantile(values, 0.25))} · q3 ${money(quantile(values, 0.75))} · max ${money(values.at(-1))}`);

  // FRAMING, MEASURED BEFORE THE GEOMETRY WAS CHOSEN — `framing-serves-the-point`, and the reading
  // `framing-is-measured` offers. Printed on BOTH series, because on a histogram the values are
  // not the marks: the bin counts are.
  console.log("framingMeasurement(salaries):", framingMeasurement(values));

  const lo = Math.floor(values[0] / BIN) * BIN;
  const hi = Math.ceil(values.at(-1) / BIN) * BIN;
  const bins = [];
  for (let edge = lo; edge < hi; edge += BIN) {
    bins.push({ lo: edge, hi: edge + BIN, count: 0 });
  }
  for (const v of values) bins[Math.min(Math.floor((v - lo) / BIN), bins.length - 1)].count += 1;
  const drawn = bins.reduce((sum, b) => sum + b.count, 0);
  if (drawn !== values.length)
    throw new Error(`${drawn} observations landed in bins and ${values.length} were read — a bin edge is dropping people`);
  console.log(`${bins.length} bins of ${money(BIN)} EUR, from ${money(lo)} to ${money(hi)}`);
  console.log("framingMeasurement(bin counts):", framingMeasurement(bins.map((b) => b.count)));

  // THE SHEET'S OWN FIRST REFUSAL: the bin choice must not drive the claimed result. If either
  // level sits on an edge, the bar it belongs to is ambiguous and the picture starts arguing.
  for (const [name, level] of [["median", median], ["mean", mean]]) {
    if (level % BIN === 0)
      throw new Error(`the ${name} (${level}) falls exactly on a bin edge at this width — choose another width`);
  }

  const TAIL_FROM = 100000;
  const tail = answered.filter((r) => r.salary >= TAIL_FROM).sort((a, b) => b.salary - a.salary);
  console.log(`tail: ${tail.length} above ${money(TAIL_FROM)} — ${tail.map((r) => `${r.id} ${r.department} ${money(r.salary)}`).join(", ")}`);

  const title = `Half of this payroll earns less than ${money(median)} €, and the average is not where the people are`;
  const limits =
    `${values.length} of the company's ${all.length} employees; ${blank.length} returned no salary and are not drawn. ` +
    `${belowMean} of them — ${((belowMean / values.length) * 100).toFixed(0)}% — earn less than the ${money(mean)} € average. ` +
    `One company, one payroll year, and the table carries no job title, grade or hours, so nothing here explains the tail.`;
  const rules = [
    { value: median, label: `Median ${money(median)} €` },
    { value: mean, label: `Average ${money(mean)} €` },
  ];
  const tailNote =
    `${tail.length} salaries above ${money(TAIL_FROM)} € — the highest is ${money(tail[0].salary)} €`;
  const alt =
    `A histogram of ${values.length} annual salaries at one company, in ${money(BIN)} € bins from ` +
    `${money(lo)} € to ${money(hi)} €. The mass rises to a peak of ${Math.max(...bins.map((b) => b.count))} employees in the ` +
    `${money(bins.reduce((a, b) => (b.count > a.count ? b : a)).lo)}–${money(bins.reduce((a, b) => (b.count > a.count ? b : a)).hi)} € bin, then falls away to the right in a long thin tail. ` +
    `A dashed rule marks the median at ${money(median)} € and a second the average at ${money(mean)} €, to its right; ` +
    `${belowMean} of the ${values.length} sit below the average. ` +
    `${tail.length} salaries stand alone above ${money(TAIL_FROM)} €, the highest at ${money(tail[0].salary)} €. ` +
    `${blank.length} of the ${all.length} employees returned no salary and are not in the chart.`;
  console.log(`title:    ${title}`);
  console.log(`limits:   ${limits}`);
  console.log(`tail:     ${tailNote}`);
  console.log(`alt:      ${alt}`);

  const { ground, accent, origin, source: paletteSource } = readPalette(HERE, { stopAt: STORY });
  console.log(`palette from ${paletteSource} — ground ${ground}, accent ${accent}, chosen by ${origin}`);
  const face = useTypeface(readTypeface(HERE, { stopAt: STORY }));
  console.log(`typeface ${face.family} (${face.origin}), from ${face.source}`);

  const size = await readPinnedSize(HERE, { readFile, dirname, join });
  const form = assertTypeMayEnter(TYPE, size, { what: "beat 1 — the spread itself" });
  console.log(`pinned size: ${size} — ${form.verdict}: ${form.reason}`);

  const { width, height } = sizeFor(size);
  const { pngPath, svgPath } = await renderStill({
    element: createElement(SalarySpreadHistogram, {
      bins,
      title,
      limits,
      source: SOURCE_LINE,
      alt,
      ground,
      accent,
      rules,
      tailNote,
      tailFrom: TAIL_FROM,
      axisTitle: "Annual salary (€)",
      countUnit: "employees",
      format: money,
      size,
    }),
    width,
    height,
    // 1:1 — the frame IS the export size, so the PNG on disk measures what gate 2c pinned.
    scale: 1,
    outDir: join(HERE, "renders"),
    name: "salary-spread-still",
  });

  // THE DELIVERED FILE, MEASURED FROM ITS OWN BYTES.
  assertDeliveredSize(readPngSize(await readFile(pngPath)), size, { what: `${pngPath}` });
  const svg = await readFile(svgPath, "utf8");
  assertTypeFloor(svg, size, { what: "beat 1 — the spread itself" });
  assertWithinStage(svg, size, { what: "beat 1 — the spread itself" });
  assertDrawnInActiveTypeface(svg, { where: "beat 1 — the spread itself" });
  console.log(`rendered -> ${pngPath} at ${width}x${height}, verified from the file — now open it.`);
}

run();
