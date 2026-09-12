// twin/proof/static-swiss-age-pyramid/render-directions.mjs
//
// Switzerland's age pyramid, drawn once per filed direction, through the real engine.
//
// The third beat in this tree to go through the design base, and the least like the other two: a
// line runs left to right, a bridge floats along one baseline, this mirrors two halves about a
// spine. `co2-suisse/render-directions.mjs` is the model and this follows it step for step.
//
// `renders/`, PLURAL. A render written to `render/` receives no approval and is invisible to the
// export guard.
//
// Usage:  bun proof/static-swiss-age-pyramid/render-directions.mjs

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
import { DirectedPyramid } from "./DirectedPyramid.tsx";

const HERE = dirname(fileURLToPath(import.meta.url));
const DIRECTIONS = join(HERE, "..", "..", "docs", "design-base", "directions");
const OUT = join(HERE, "renders");
const EYEBROW = "Démographie · Suisse";
const LEFT = "Hommes";
const RIGHT = "Femmes";

const rows = (await readFile(join(HERE, "data.csv"), "utf8"))
  .trim()
  .split(/\r?\n/)
  .slice(1)
  .map((l) => {
    const [band, male, female] = l.split(",");
    return { band, male: Number(male), female: Number(female) };
  });

const totalLeft = rows.reduce((t, r) => t + r.male, 0);
const totalRight = rows.reduce((t, r) => t + r.female, 0);

// WHICH TREATMENTS THE DATA ADMITS. `mirrored` is what makes the crossing derivable: the beat hands
// over its bands with both halves, foot first, and `beatFacts` finds where they change places. It is
// not asserted here — if the halves never crossed, the treatment would not be offered and the
// component would draw nothing.
const facts = beatFacts(
  rows.map((r) => ({ key: r.band, label: r.band, value: r.male + r.female })),
  {
    subject: "Suisse",
    namedSeries: [LEFT, RIGHT],
    mirrored: rows.map((r) => ({ key: r.band, left: r.male, right: r.female })),
  },
);
const offered = applicableTreatments(facts);
console.log(`treatments applicable: ${offered.map((t) => t.id).join(", ")}`);
console.log(`crossing band derived from the data: ${facts.mirrorCrossingKey}\n`);

const title = `Les femmes passent devant les hommes à partir de ${facts.mirrorCrossingKey} ans`;
const limits = `Population résidente suisse en 2023 : ${totalLeft.toLocaleString("fr-CH")} hommes, ${totalRight.toLocaleString("fr-CH")} femmes. Les bandes d’âge suivent leur ordre naturel, la plus jeune en bas.`;
const source = "Source : ONU, World Population Prospects (2024), via Our World in Data";

const textPerRegister = {
  display: title,
  eyebrow: EYEBROW,
  body: `${limits} ${source}`,
  axis: "100k 200k 300k",
  annot: `${LEFT} ${RIGHT} ${rows.map((r) => r.band).join(" ")} passent devant dès`,
  value: rows.map((r) => String(r.male)).join(" "),
};

const filed = readdirSync(DIRECTIONS)
  .filter((f) => f.endsWith(".md"))
  .map((f) => readDirection(join(DIRECTIONS, f)));
const newsroom = readPalette(HERE, { stopAt: join(HERE, "..") });
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
    element: createElement(DirectedPyramid, {
      bands: rows,
      title,
      limits,
      source,
      alt: `Pyramide des âges de la Suisse en 2023, hommes à gauche, femmes à droite, par bandes de cinq ans.`,
      eyebrow: EYEBROW,
      leftName: LEFT,
      rightName: RIGHT,
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
