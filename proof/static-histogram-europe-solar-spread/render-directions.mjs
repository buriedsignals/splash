// twin/proof/static-histogram-europe-solar-spread/render-directions.mjs
//
// How unevenly Europe's solar electricity generation was spread across countries in 2024, drawn
// through the real engine — one composed direction by default.
//
// `renders/`, PLURAL. A render written to `render/` receives no approval and is invisible to the
// export guard.
//
// Usage:  bun proof/static-histogram-europe-solar-spread/render-directions.mjs

import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createElement } from "react";
import { renderStill } from "#shared/chart-beat/render-still.mjs";
import { readPalette } from "#shared/chart-beat/colour.mjs";
import { beatFacts, applicableTreatments } from "#shared/chart-beat/treatments.mjs";
import { composeDirections, filedDirections, report as composeReport, resolveDirectionFamilies } from "#shared/design-base/index.mjs";
import { DirectedSolarSpreadHistogram } from "./DirectedSolarSpreadHistogram.tsx";

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, "renders");

const BIN_WIDTH = 10;
const BIN_COUNT = 8;
const UNIT = "TWh of solar generation, 2024";
/** The editorial cut. A distribution has no natural one, so the BEAT declares it and the treatment
 *  draws it — the same division of labour `crossing-marked`'s reference level has. */
const THRESHOLD = 10;
const EYEBROW = "Energy · Europe";

// data.csv: per-country 2024 electricity generation by source (Ember/Our World in Data shape).
// Column 5 (0-indexed) is solar_generation__twh.
const rows = (await readFile(join(HERE, "data.csv"), "utf8")).trim().split(/\r?\n/).slice(1);
const observations = rows
  .map((l) => {
    const cells = l.split(",");
    return { code: cells[1], value: Number(cells[5]) };
  })
  .filter((r) => /^[A-Z]{3}$/.test(r.code) && Number.isFinite(r.value))
  .map((r) => r.value);

const bins = Array.from({ length: BIN_COUNT }, (_, i) => {
  const lo = i * BIN_WIDTH;
  const hi = lo + BIN_WIDTH;
  const last = i === BIN_COUNT - 1;
  return {
    lo,
    hi,
    // The tail is real and open: everything at or above the last edge falls in the last bin, and
    // the label says so rather than inventing a ceiling.
    open: last,
    count: observations.filter((v) => (last ? v >= lo : v >= lo && v < hi)).length,
  };
});

// Precision the type sheet requires: the threshold must land on a bin edge (never split a bar),
// and every observation must fall in exactly one bin.
if (THRESHOLD % BIN_WIDTH !== 0) throw new Error(`THRESHOLD ${THRESHOLD} does not land on a bin edge (width ${BIN_WIDTH})`);
const binnedCount = bins.reduce((s, b) => s + b.count, 0);
if (binnedCount !== observations.length) throw new Error(`bins account for ${binnedCount} observations, data has ${observations.length}`);

const facts = beatFacts(
  bins.map((b) => ({ key: `${b.lo}`, label: `${b.lo}-${b.hi}`, value: b.count })),
  { subject: "europe", bins, observations, threshold: THRESHOLD },
);
const offered = applicableTreatments(facts);
console.log(`${observations.length} countries · treatments applicable: ${offered.map((t) => t.id).join(", ")}`);
console.log(
  `share derived from the data: ${facts.countBelowThreshold}/${facts.observationCount} = ${(facts.shareBelowThreshold * 100).toFixed(0)} %\n`,
);

const share = Math.round(facts.shareBelowThreshold * 10);
const title = `${share} in 10 European countries generated under ${THRESHOLD} TWh of solar power in 2024`;
const limits = `Distribution of ${facts.observationCount} European countries' 2024 solar generation — each counts as one, unweighted by population or grid size. A handful of large producers sit far out to the right.`;
const source = "Source: Ember, via Our World in Data (2024)";

const textPerRegister = {
  display: title,
  eyebrow: EYEBROW,
  body: `${limits} ${source}`,
  axis: `${bins.map((b) => (b.open ? `${b.lo}+` : `${b.lo}–${b.hi}`)).join(" ")} ${UNIT}`,
  annot: `${facts.countBelowThreshold} of ${facts.observationCount} countries under ${THRESHOLD} ${UNIT}`,
  value: bins.map((b) => String(b.count)).join(" "),
};

// ── ONE ART DIRECTION BY DEFAULT ─────────────────────────────────────────────
//
// The composer's best candidate for this beat's own PALETTE.md and this beat's own text — a
// production render draws ONE direction, not three. `--filed` renders every filed demo direction
// instead (a catalogue or demo proof, never a production render); `--only <label>` narrows to one
// of the directions that would otherwise render.
//
// Usage:  bun render-directions.mjs [--filed] [--only <label>]
const RUN_ARGS = process.argv.slice(2);
const FILED = RUN_ARGS.includes("--filed");
const ONLY_AT = RUN_ARGS.indexOf("--only");
const ONLY = ONLY_AT === -1 ? null : RUN_ARGS[ONLY_AT + 1];
if (ONLY_AT !== -1 && (!ONLY || ONLY.startsWith("--"))) throw new Error("--only takes a label");

// A composed direction's own `id` (e.g. "creme/creme/the newsroom" — colour/type/space) is not a filename;
// a filed direction's is already a plain slug (its own file basename) — labelOf makes both safe to use as
// this beat's own `renders/<label>.png`.
const labelOf = (id) => id.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const all = filedDirections();
const newsroom = readPalette(HERE, { stopAt: join(HERE, "..") });
// Three distinguishable voices: the distribution's bars, the threshold reference line, and the
// accented count/share it names.
const BEAT_FACTS = { evidenceLevels: 3 };
let chosen;
if (FILED) {
  chosen = all.map((d) => ({ label: labelOf(d.id), direction: d }));
  console.log("every filed demo direction (--filed): a catalogue proof, not a production render");
} else {
  const composition = composeDirections({ newsroom, filed: all, beat: BEAT_FACTS, textPerRegister });
  if (!composition.offered.length) throw new Error(`no composed direction holds up for this beat:\n${composeReport(composition, { beat: BEAT_FACTS })}`);
  console.log(composeReport(composition, { beat: BEAT_FACTS }));
  chosen = composition.offered.slice(0, 1).map((d) => ({ label: labelOf(d.id), direction: d }));
}
if (ONLY !== null && !chosen.some((d) => d.label === ONLY)) throw new Error(`--only takes one of ${chosen.map((d) => d.label).join(", ")}`);
chosen = chosen.filter((d) => ONLY === null || d.label === ONLY);
console.log("");

for (const { label: id, direction: chosenDirection } of chosen) {
  const direction = resolveDirectionFamilies(chosenDirection, textPerRegister);

  console.log(id);
  for (const d of direction.decisions)
    console.log(
      `  ${d.register.padEnd(8)} ${d.role.padEnd(15)} -> ${d.family}` +
        (d.refused.length
          ? `   refused: ${d.refused.map((r) => `${r.family} [${r.missing.join(",")}]`).join(", ")}`
          : ""),
    );

  await renderStill({
    element: createElement(DirectedSolarSpreadHistogram, {
      bins,
      unit: UNIT,
      threshold: THRESHOLD,
      thresholdCount: facts.countBelowThreshold,
      thresholdTotal: facts.observationCount,
      title,
      limits,
      source,
      alt: `Histogram of solar electricity generation across ${facts.observationCount} European countries in 2024, in bins of ${BIN_WIDTH} TWh.`,
      eyebrow: EYEBROW,
      direction,
      treatments: offered.map((t) => t.id),
    }),
    // The beat pins `landscape` (1920 x 1080); 960 x 540 at scale 2 delivers exactly that.
    width: 960,
    height: 540,
    outDir: OUT,
    name: id,
    scale: 2,
  });
  console.log(`  -> renders/${id}.png\n`);
}
