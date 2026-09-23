// twin/proof/more-boxplot-france-co2-decades/render-directions.mjs
//
// France's per-person CO2 by decade, drawn once per filed direction, through the design base. The
// tenth beat in this tree to go through it, and the FIRST of the nine forms the harvest reached
// that had no directed component at all.
//
// The five-number summaries are not recomputed here: `summarizeDecade` is imported from this beat's
// own component, so the quartiles, the Tukey fence and the clipped whisker come from one place. The
// whisker rule is the thing `references/types/boxplot.md` says this form is only ever as honest as,
// and two copies of it would be two chances to disagree.
//
// `renders/`, PLURAL. A render written to `render/` receives no approval and is invisible to the
// export guard.
//
// Usage:  bun proof/more-boxplot-france-co2-decades/render-directions.mjs

import { readdirSync } from "node:fs";
import { readFile, rm } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createElement } from "react";
import { renderStill } from "#shared/chart-beat/render-still.mjs";
import { readPalette } from "#shared/chart-beat/colour.mjs";
import { beatFacts, applicableTreatments } from "#shared/chart-beat/treatments.mjs";
import { readDirection } from "../../scripts/design-base/read-direction.mjs";
import { composeDirections, report } from "../../scripts/design-base/compose.mjs";
import { resolveDirectionFamilies } from "../../scripts/design-base/resolve-families.mjs";
import { summarizeDecade } from "./DecadeBoxplot.tsx";
import { DirectedBoxplot } from "./DirectedBoxplot.tsx";

const HERE = dirname(fileURLToPath(import.meta.url));
const DIRECTIONS = join(HERE, "..", "..", "docs", "design-base", "directions");
const OUT = join(HERE, "renders");
const FROM = 1950;
const UNIT = "t";
const EYEBROW = "Climat · France";
const WHISKER_RULE = "1,5 × IQR";
const refused = [];

const csv = (await readFile(join(HERE, "data.csv"), "utf8")).trim().split(/\r?\n/);
const header = csv[0].split(",");
const entityAt = header.indexOf("Entity");
const yearAt = header.indexOf("Year");
const valueAt = header.findIndex((c) => c.startsWith("CO"));
const rows = csv.slice(1).map((l) => l.split(","));

// The OWID grapher CSV endpoint returns the whole world with HTTP 200 unless `csvType=filtered` is
// on the URL. Checked here on the frozen data itself, as `render.mjs` checks it: a plate about
// France drawn from everyone's readings would be wrong in a way no guard downstream can see.
const entities = new Set(rows.map((r) => r[entityAt]));
if (entities.size !== 1 || !entities.has("France"))
  throw new Error(`expected only France in the frozen data, got: ${[...entities].join(", ")}`);

const readings = rows
  .map((r) => ({ year: Number(r[yearAt]), value: Number(r[valueAt]) }))
  .filter((r) => r.year >= FROM && Number.isFinite(r.value));

const byDecade = new Map();
for (const r of readings) {
  const label = `${Math.floor(r.year / 10) * 10}s`;
  if (!byDecade.has(label)) byDecade.set(label, []);
  byDecade.get(label).push(r.value);
}
const summaries = [...byDecade.entries()].map(([label, values]) => ({
  ...summarizeDecade(label, values),
  values,
}));

const peak = summaries.reduce((a, b) => (b.median > a.median ? b : a));
const last = summaries[summaries.length - 1];
const peakIndex = summaries.indexOf(peak);
for (let i = peakIndex + 1; i < summaries.length; i++)
  if (summaries[i].median >= summaries[i - 1].median)
    throw new Error(
      `the claim does not hold: ${summaries[i].label} (${summaries[i].median.toFixed(2)}) is not below ` +
        `${summaries[i - 1].label} (${summaries[i - 1].median.toFixed(2)})`,
    );
const partial = summaries.filter((s) => s.n < 10);
const outliers = summaries.flatMap((s) => s.outliers.map((v) => ({ decade: s.label, value: v })));

const facts = beatFacts(
  summaries.map((s) => ({ key: s.label, label: s.label, value: s.median })),
  {
    subject: peak.label,
    summaries: summaries.map((s) => ({ key: s.label, n: s.n })),
    observations: readings.map((r) => r.value),
    declaredSequence: "decade",
    unitMark: null,
  },
);
const offered = applicableTreatments(facts);
console.log(
  `${summaries.length} décennies · échantillons ${facts.smallestSample}–${facts.largestSample} · ` +
    `${outliers.length} valeur(s) aberrante(s) · treatments applicable: ${offered.map((t) => t.id).join(", ")}\n`,
);

const two = (v) =>
  v.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const format = (v) =>
  v.toLocaleString("fr-FR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });

const title = `Les émissions de CO2 par personne en France ont culminé dans les années ${peak.label.replace("s", "")}`;
const limits =
  `Une boîte par décennie : la médiane, l’intervalle qui contient la moitié des années, et les ` +
  `moustaches à ${WHISKER_RULE}. Chaque année est dessinée à côté de sa propre boîte. ` +
  `Médiane ${two(peak.median)} t dans les années ${peak.label.replace("s", "")}, ` +
  `${two(last.median)} t dans les années ${last.label.replace("s", "")}` +
  (partial.length
    ? ` — décennie partielle, ${partial[0].n} années seulement.`
    : ".");
const source =
  "Source : Global Carbon Budget 2025, via Our World in Data · France, 1950-2024, extraites le 8 août 2026";

const textPerRegister = {
  display: title,
  eyebrow: EYEBROW,
  body: `${limits} ${source}`,
  axis: `${summaries.map((s) => format(s.median)).join(" ")} ${UNIT}`,
  annot: `${summaries.map((s) => `${s.label} · n=${s.n}`).join(" ")} médiane 50 % des années ${WHISKER_RULE}`,
  value: `${two(peak.median)} ${two(last.median)}`,
};

const filed = readdirSync(DIRECTIONS)
  .filter((f) => f.endsWith(".md"))
  .map((f) => readDirection(join(DIRECTIONS, f)));
const newsroom = readPalette(HERE);
const BEAT_FACTS = { evidenceLevels: 3 };
console.log(
  report(composeDirections({ newsroom, filed, beat: BEAT_FACTS, textPerRegister }), {
    beat: BEAT_FACTS,
  }),
);
console.log("");

for (const file of readdirSync(DIRECTIONS).filter((f) => f.endsWith(".md"))) {
  const id = file.replace(/\.md$/, "");
  const direction = resolveDirectionFamilies(readDirection(join(DIRECTIONS, file)), textPerRegister);

  console.log(id);
  for (const d of direction.decisions)
    console.log(
      `  ${d.register.padEnd(8)} ${d.role.padEnd(15)} -> ${d.family}` +
        (d.refused.length
          ? `   refused: ${d.refused.map((r) => `${r.family} [${r.missing.join(",")}]`).join(", ")}`
          : ""),
    );

  try {
    await renderStill({
      element: createElement(DirectedBoxplot, {
        summaries,
        subject: peak.label,
        unit: UNIT,
        whiskerRule: WHISKER_RULE,
        title,
        limits,
        source,
        alt:
          `Boîtes à moustaches : la répartition des émissions annuelles de CO2 par personne en France, ` +
          `une boîte par décennie de ${FROM} à 2024, chaque année dessinée en points à côté de sa boîte. ` +
          `La médiane culmine à ${two(peak.median)} t dans les années ${peak.label.replace("s", "")} puis ` +
          `baisse à chaque décennie jusqu’à ${two(last.median)} t dans les années ` +
          `${last.label.replace("s", "")}, une décennie partielle de ${last.n} années.`,
        eyebrow: EYEBROW,
        format,
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
  } catch (error) {
    for (const ext of ["png", "svg"]) await rm(join(OUT, `${id}.${ext}`), { force: true });
    refused.push({ id, why: error.message });
    console.log(`  REFUSED — ${error.message}\n`);
  }
}

if (refused.length)
  console.log(`refused by ${refused.length}: ${refused.map((r) => r.id).join(", ")}`);
