// twin/proof/co2-suisse/render-directions.mjs
//
// The CO₂ beat, drawn once per filed direction, through the real engine.
//
// `renders/`, PLURAL. A render written to `render/` receives no approval and is invisible to the
// export guard — a defect this tree has already paid for once.
//
// Usage:  bun proof/co2-suisse/render-directions.mjs

import { readdirSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createElement } from "react";
import { renderStill } from "#shared/chart-beat/render-still.mjs";
import { beatFacts, applicableTreatments } from "#shared/chart-beat/treatments.mjs";
import { readDirection } from "../../scripts/design-base/read-direction.mjs";
import { composeDirections, report } from "../../scripts/design-base/compose.mjs";
import { readPalette } from "#shared/chart-beat/colour.mjs";
import { resolveDirectionFamilies } from "../../scripts/design-base/resolve-families.mjs";
import { DirectedLine } from "./DirectedLine.tsx";
import { BEAT, readingsFromCsv } from "./render-web.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const DIRECTIONS = join(HERE, "..", "..", "docs", "design-base", "directions");
const OUT = join(HERE, "renders");
const EYEBROW = "Climat · Suisse";
const ERAS = [
  { from: 1973, to: 1975, label: "choc pétrolier" },
  { from: 1979, to: 1981, label: "second choc" },
];

const data = readingsFromCsv(await readFile(join(HERE, "data.csv"), "utf8"), {
  entity: BEAT.entity,
  firstYear: BEAT.firstYear,
});

const facts = beatFacts(
  data.map((d) => ({ key: String(d.year), value: d.mt })),
  {
    namedSeries: [BEAT.entity],
    subject: BEAT.entity,
    reference: BEAT.reference,
    // Two datable events inside this series' own span. Declared by the beat, like its reference
    // level: `era-bands` draws what the beat carries and invents nothing.
    eras: ERAS,
  },
);
const offered = applicableTreatments(facts);
console.log(
  `${data.length} readings · treatments applicable: ${offered.map((t) => t.id).join(", ")}\n`,
);

// Everything each register will be asked to set, so the family ladder answers the coverage
// question against this beat's own text rather than in general.
const textPerRegister = {
  display: BEAT.title,
  eyebrow: EYEBROW,
  body: `${BEAT.limits} ${BEAT.source}`,
  axis: "50 Mt 40 32,5 20 10 1950 1960 1970 1980 1990 2000 2010 2020",
  annot: `${BEAT.referenceLabel} ${BEAT.peakLabel}`,
  value: `${data[data.length - 1].year} · ${String(data[data.length - 1].mt)} Mt`,
};

// WHAT THE JOURNALIST IS SHOWN, before anything is drawn. The composer assembles what holds up
// from the filed directions and hands the choice over; it does not pick. Every part carries the
// measurement that put it there, and every refusal carries its reason.
const filed = readdirSync(DIRECTIONS)
  .filter((f) => f.endsWith(".md"))
  .map((f) => readDirection(join(DIRECTIONS, f)));
const newsroom = readPalette(HERE, { stopAt: join(HERE, "..") });
// `BRIEF.md` ranks this beat's evidence in four levels: the 2024 point, the 1967 reference, the
// curve, the muted peak. That number is the beat's own, not a default.
const BEAT_FACTS = { evidenceLevels: 4 };
console.log(
  report(
    composeDirections({ newsroom, filed, beat: BEAT_FACTS, textPerRegister }),
    { beat: BEAT_FACTS },
  ),
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
    element: createElement(DirectedLine, {
      data,
      title: BEAT.title,
      source: BEAT.source,
      alt: BEAT.alt,
      limits: BEAT.limits,
      eyebrow: EYEBROW,
      reference: BEAT.reference,
      referenceLabel: BEAT.referenceLabel,
      peakLabel: BEAT.peakLabel,
      direction,
      treatments: offered.map((t) => t.id),
      eras: ERAS,
    }),
    width: 900,
    height: 560,
    outDir: OUT,
    // A STEM, not a filename: `renderStill` appends `.svg` and `.png` itself.
    name: id,
    scale: 2,
  });
  console.log(`  -> renders/${id}.png\n`);
}
