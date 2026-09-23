// twin/proof/more-dumbbell-life-expectancy-gains/render-directions.mjs
//
// Life expectancy in 2000 against 2023, ten countries, drawn once per filed direction through the
// design base. The nineteenth beat in this tree and the first from `paired` — the base's largest
// family, 19 references across nine publications.
//
// Every figure is computed from the frozen file and the headline's two ends — who gained most and
// who gained least — are asserted before a mark is drawn, as is the sentence's own premise: that
// every one of the ten gained at all.
//
// `renders/`, PLURAL. A render written to `render/` receives no approval and is invisible to the
// export guard.
//
// Usage:  bun proof/more-dumbbell-life-expectancy-gains/render-directions.mjs

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
import { DirectedDumbbell } from "./DirectedDumbbell.tsx";

const HERE = dirname(fileURLToPath(import.meta.url));
const DIRECTIONS = join(HERE, "..", "..", "docs", "design-base", "directions");
const OUT = join(HERE, "renders");
const FROM = 2000;
const TO = 2023;
const UNIT = "ans";
const EYEBROW = "Santé · Europe et Japon";
const refused = [];

/** The ten the beat is about, and the French name each is drawn under. An entity the list names and
 *  the file cannot answer for throws: a dumbbell with a missing row is a shortlist that changed
 *  without saying so. */
const COUNTRIES = {
  France: { name: "France", withArticle: "la France" },
  Germany: { name: "Allemagne", withArticle: "l’Allemagne" },
  Italy: { name: "Italie", withArticle: "l’Italie" },
  Japan: { name: "Japon", withArticle: "le Japon" },
  Netherlands: { name: "Pays-Bas", withArticle: "les Pays-Bas" },
  Poland: { name: "Pologne", withArticle: "la Pologne" },
  Spain: { name: "Espagne", withArticle: "l’Espagne" },
  Switzerland: { name: "Suisse", withArticle: "la Suisse" },
  "United Kingdom": { name: "Royaume-Uni", withArticle: "le Royaume-Uni" },
  "United States": { name: "États-Unis", withArticle: "les États-Unis" },
};
/** The bare name labels a row; the article form goes in a sentence. `Pologne a gagné` is the
 *  furniture leak `static-discipline.md` counts as a defect even when every number is right — and
 *  this tree has already paid for it once, on the ranking beat. */
const named = (entity) => COUNTRIES[entity].name;
const withArticle = (entity) => COUNTRIES[entity].withArticle;

const csv = (await readFile(join(HERE, "data.csv"), "utf8")).trim().split(/\r?\n/);
const header = csv[0].split(",");
const at = (entity, year) => {
  const row = csv
    .slice(1)
    .map((l) => l.split(","))
    .find((c) => c[0] === entity && Number(c[2]) === year);
  if (!row) throw new Error(`no ${year} reading for ${entity} in the frozen data`);
  return Number(row[3]);
};

const rows = Object.keys(COUNTRIES)
  .map((entity) => {
    const label = named(entity);
    const from = at(entity, FROM);
    const to = at(entity, TO);
    return { key: entity, label, from, to, gain: to - from };
  })
  .sort((a, b) => b.gain - a.gain);

// The claim's own premise, checked rather than assumed.
const flat = rows.filter((r) => r.gain <= 0);
if (flat.length)
  throw new Error(
    `the standfirst says every one of the ten gained; these did not: ` +
      flat.map((r) => `${r.key} (${r.gain.toFixed(2)})`).join(", "),
  );
const most = rows[0];
const least = rows[rows.length - 1];

const facts = beatFacts(
  rows.map((r) => ({ key: r.key, label: r.label, value: r.gain })),
  {
    subject: most.key,
    pairs: rows.map((r) => ({ key: r.key, from: r.from, to: r.to })),
    states: [String(FROM), String(TO)],
    namedSeries: rows.map((r) => r.label),
    declaredSequence: null,
  },
);
const offered = applicableTreatments(facts);
console.table(
  rows.map((r) => ({
    pays: r.label,
    [FROM]: r.from.toFixed(1),
    [TO]: r.to.toFixed(1),
    gain: r.gain.toFixed(2),
  })),
);
console.log(
  `plus petit écart ${(facts.smallestPairGap * 100).toFixed(1)} % de l’étendue · ` +
    `treatments applicable: ${offered.map((t) => t.id).join(", ")}\n`,
);

const plainSpaces = (text) => text.replace(/[  ]/g, " ");
const one = (v) =>
  plainSpaces(v.toLocaleString("fr-FR", { minimumFractionDigits: 1, maximumFractionDigits: 1 }));
const format = (v) => plainSpaces(v.toLocaleString("fr-FR", { maximumFractionDigits: 0 }));
const gainLabel = (row) => `+${one(row.gain)}`;

const title =
  `${withArticle(most.key).replace(/^l/, "L")} a gagné ${one(most.gain)} ans d’espérance de vie ` +
  `depuis ${FROM}, ${withArticle(least.key)} ${one(least.gain)}`;
const limits = [
  `Espérance de vie à la naissance en ${FROM} et en ${TO}, dans ${rows.length} pays. Tous les dix ont ` +
    `gagné des années : de ${one(least.gain)} pour ${withArticle(least.key)} à ${one(most.gain)} pour ` +
    `${withArticle(most.key)}. Les rangs sont classés par le gain, pas par le niveau.`,
  `Espérance de vie à la naissance en ${FROM} et en ${TO}, ${rows.length} pays classés par le gain.`,
];
/** The reading line and its short forms: ten rows each print a gain, and where the value register is
 *  large the words give way before the numbers do. */
const reading = [
  `Lecture : le point pâle est ${FROM}, le point plein ${TO} — deux états d’une même mesure, donc ` +
    `une seule teinte à deux intensités. La barre entre les deux EST le gain, et le gain est écrit ` +
    `à droite : un écart trop petit pour être vu resterait sinon indistinguable d’une donnée manquante.`,
  `Lecture : point pâle ${FROM}, point plein ${TO} ; la barre entre les deux est le gain, écrit à droite.`,
];
const source =
  "Source : Our World in Data (UN WPP, HMD), espérance de vie à la naissance · données 2023";

const textPerRegister = {
  display: title,
  eyebrow: EYEBROW,
  body: `${limits.join(" ")} ${source}`,
  axis: `70 75 80 85 ${UNIT}`,
  annot: `${rows.map((r) => r.label).join(" ")} ${FROM} ${TO} ${reading.join(" ")}`,
  value: rows.map(gainLabel).join(" "),
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
      element: createElement(DirectedDumbbell, {
        rows,
        subject: most.key,
        fromName: String(FROM),
        toName: String(TO),
        unit: UNIT,
        title,
        limits,
        reading,
        source,
        alt:
          `Graphique haltère : l’espérance de vie de ${rows.length} pays en ${FROM} et en ${TO}, une ` +
          `ligne par pays, classées par le gain. ${withArticle(most.key).replace(/^l/, "L")} gagne le plus ` +
          `(+${one(most.gain)} ans, de ${one(most.from)} à ${one(most.to)}) et ` +
          `${withArticle(least.key)} le moins (+${one(least.gain)}, de ${one(least.from)} à ` +
          `${one(least.to)}). Tous les dix ont gagné.`,
        eyebrow: EYEBROW,
        format,
        gainLabel,
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
