// twin/proof/static-carbon-footprint-spread/render-directions.mjs
//
// The 2023 spread of national CO₂ footprints, drawn once per filed direction, through the real
// engine. The fourth beat in this tree to go through the design base, and the first whose bars are
// intervals rather than entities.
//
// `renders/`, PLURAL. A render written to `render/` receives no approval and is invisible to the
// export guard.
//
// Usage:  bun proof/static-carbon-footprint-spread/render-directions.mjs

import { readdirSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createElement } from "react";
import { renderStill } from "#shared/chart-beat/render-still.mjs";
import { readPalette } from "#shared/chart-beat/colour.mjs";
import { beatFacts, applicableTreatments } from "#shared/chart-beat/treatments.mjs";
import { readDirection } from "../../scripts/design-base/read-direction.mjs";
import { composeDirections, report } from "../../scripts/design-base/compose.mjs";
import { resolveDirectionFamilies } from "../../scripts/design-base/resolve-families.mjs";
import { DirectedHistogram } from "./DirectedHistogram.tsx";

const HERE = dirname(fileURLToPath(import.meta.url));
const DIRECTIONS = join(HERE, "..", "..", "docs", "design-base", "directions");
const OUT = join(HERE, "renders");

const BIN_WIDTH = 4;
const BIN_COUNT = 10;
const UNIT = "tonnes de CO₂ par personne, 2023";
/** The editorial cut. A distribution has no natural one, so the BEAT declares it and the treatment
 *  draws it — the same division of labour `crossing-marked`'s reference level has. */
const THRESHOLD = 4;
const EYEBROW = "Climat · Monde";

const rows = (await readFile(join(HERE, "data.csv"), "utf8")).trim().split(/\r?\n/).slice(1);
const observations = rows
  .map((l) => {
    const cells = l.split(",");
    return { code: cells[1], value: Number(cells[3]) };
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

const facts = beatFacts(
  bins.map((b) => ({ key: `${b.lo}`, label: `${b.lo}-${b.hi}`, value: b.count })),
  { subject: "monde", bins, observations, threshold: THRESHOLD },
);
const offered = applicableTreatments(facts);
console.log(`${observations.length} pays · treatments applicable: ${offered.map((t) => t.id).join(", ")}`);
console.log(
  `share derived from the data: ${facts.countBelowThreshold}/${facts.observationCount} = ${(facts.shareBelowThreshold * 100).toFixed(0)} %\n`,
);

const share = Math.round(facts.shareBelowThreshold * 10);
const title = `${share} pays sur 10 émettent moins de ${THRESHOLD} tonnes de CO₂ par personne`;
const limits = `Répartition des ${facts.observationCount} pays en 2023 — chacun compte pour un, sans pondération par la population. Quelques producteurs de pétrole et de gaz sont loin sur la droite.`;
const source = "Source : Global Carbon Budget (2025), via Our World in Data";

const textPerRegister = {
  display: title,
  eyebrow: EYEBROW,
  body: `${limits} ${source}`,
  axis: `${bins.map((b) => (b.open ? `${b.lo}+` : `${b.lo}–${b.hi}`)).join(" ")} ${UNIT}`,
  annot: `${facts.countBelowThreshold} pays sur ${facts.observationCount} sous ${THRESHOLD} ${UNIT}`,
  value: bins.map((b) => String(b.count)).join(" "),
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

  await renderStill({
    element: createElement(DirectedHistogram, {
      bins,
      unit: UNIT,
      threshold: THRESHOLD,
      thresholdCount: facts.countBelowThreshold,
      thresholdTotal: facts.observationCount,
      title,
      limits,
      source,
      alt: `Histogramme des émissions de CO₂ par personne des ${facts.observationCount} pays en 2023, par tranches de ${BIN_WIDTH} tonnes.`,
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
