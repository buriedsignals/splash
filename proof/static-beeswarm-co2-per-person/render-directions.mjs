// twin/proof/static-beeswarm-co2-per-person/render-directions.mjs
//
// The world's CO₂ per person in 2023, one circle per country, sized by population, drawn once per
// filed direction through the design base. The first `beeswarm` beat in this tree.
//
// WHY THIS SERIES: `proof/static-carbon-footprint-spread` draws the same frozen per-capita file as a
// HISTOGRAM, and the pair is the argument. A histogram bins, and a bin has no identity: it can say
// "127 countries are under 4 tonnes" and can never say WHICH, or how many people live in them. A
// beeswarm keeps every unit, so the shape and the named case are on one plate — which is exactly
// what the reference this form is filed against does with 8 500 schools.
//
// The population column is joined in so the second channel means something: the circle's AREA is the
// country's population. That is the reading the histogram cannot reach, and it is the one the claim
// rests on.
//
// `renders/`, PLURAL. A render written to `render/` receives no approval and is invisible to the
// export guard.
//
// Usage:  bun proof/static-beeswarm-co2-per-person/render-directions.mjs

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
import { DirectedBeeswarm } from "./DirectedBeeswarm.tsx";

const HERE = dirname(fileURLToPath(import.meta.url));
const DIRECTIONS = join(HERE, "..", "..", "docs", "design-base", "directions");
const OUT = join(HERE, "renders");
const EYEBROW = "Climat · Monde";
const HIGH = 20;
const refused = [];

// ── the countries ───────────────────────────────────────────────────────────
const csv = (await readFile(join(HERE, "data.csv"), "utf8")).trim().split(/\r?\n/);
const header = csv[0].split(",");
const at = (name) => header.indexOf(name);
const countries = csv.slice(1).map((l) => {
  const c = l.split(",");
  return {
    entity: c[at("entity")],
    code: c[at("code")],
    tonnes: Number(c[at("co2_t_per_person")]),
    people: Number(c[at("population")]),
  };
});
for (const c of countries)
  if (!c.code || !Number.isFinite(c.tonnes) || !Number.isFinite(c.people) || c.people <= 0)
    throw new Error(`a country has no usable reading: ${JSON.stringify(c)}`);

// ── THE CLAIM, ASSERTED ─────────────────────────────────────────────────────
const world = countries.reduce((s, c) => s + c.people, 0);
const weightedMean = countries.reduce((s, c) => s + c.tonnes * c.people, 0) / world;
const above = countries.filter((c) => c.tonnes > HIGH);
const aboveShare = (above.reduce((s, c) => s + c.people, 0) / world) * 100;
const belowMean = (countries.filter((c) => c.tonnes <= weightedMean).reduce((s, c) => s + c.people, 0) / world) * 100;
const ranked = [...countries].sort((a, b) => a.tonnes - b.tonnes);
const medianCountry = ranked[Math.floor(ranked.length / 2)].tonnes;
if (!(aboveShare < 1))
  throw new Error(`the headline says the countries over ${HIGH} t hold under 1 % of humanity; they hold ${aboveShare.toFixed(2)} %`);
if (!(belowMean > 60))
  throw new Error(`the standfirst says the world average sits above what most people emit; it sits above ${belowMean.toFixed(1)} %`);
/** The two callouts are DERIVED, not chosen: the biggest circle on the plate and the farthest one
 *  out. A hand-picked callout is an editorial claim the plate cannot check; these two are the marks
 *  a reader's eye lands on anyway, and naming them is answering the question the shape raises. */
const biggest = countries.reduce((a, b) => (b.people > a.people ? b : a));
const farthest = countries.reduce((a, b) => (b.tonnes > a.tonnes ? b : a));
if (biggest.tonnes >= medianCountry)
  throw new Error(
    `the standfirst says the largest circle sits below the median country; ${biggest.entity} is at ` +
      `${biggest.tonnes.toFixed(1)} against a median of ${medianCountry.toFixed(1)}`,
  );
console.log(
  `${countries.length} pays · ${(world / 1e9).toFixed(2)} md d'habitants · moyenne pondérée ` +
    `${weightedMean.toFixed(2)} t · au-dessus de ${HIGH} t : ${above.length} pays, ` +
    `${aboveShare.toFixed(2)} % des gens · sous la moyenne : ${belowMean.toFixed(1)} % · ` +
    `médiane des pays ${medianCountry.toFixed(2)} t\n`,
);

const facts = beatFacts(
  countries.map((c) => ({ key: c.code, label: c.entity, value: c.tonnes })),
  {
    subject: biggest.entity,
    continuousAxis: true,
    markers: [{ key: "mean", label: "moyenne mondiale", value: weightedMean }],
    observations: countries.map((c) => ({ key: c.code, value: c.tonnes })),
    declaredSequence: "tonnes per person",
  },
);
const offered = applicableTreatments(facts);
console.log(`treatments applicable: ${offered.map((t) => t.id).join(", ")}\n`);

/** `toLocaleString("fr-FR")` emits U+202F and U+00A0, which no face on the family ladders covers —
 *  the glyph guard then refuses every family and the beat cannot draw at all. */
const plain = (s) => s.replace(/[\u202F\u00A0\u2009]/g, " ");
const n0 = (v) => plain(Math.round(v).toLocaleString("fr-FR"));
const one = (v) =>
  plain(v.toLocaleString("fr-FR", { minimumFractionDigits: 1, maximumFractionDigits: 1 }));

const marks = countries.map((c) => ({
  code: c.code,
  entity: c.entity,
  tonnes: c.tonnes,
  people: c.people,
}));
const callouts = [
  {
    code: biggest.code,
    name: biggest.entity === "India" ? "Inde" : biggest.entity,
    lines: [`${one(biggest.people / 1e9)} md d’habitants`, `${one(biggest.tonnes)} t par personne`],
  },
  {
    code: farthest.code,
    name: farthest.entity === "Qatar" ? "Qatar" : farthest.entity,
    lines: [`${n0(farthest.people / 1e6)} millions d’habitants`, `${one(farthest.tonnes)} t par personne`],
  },
];

const title = [
  `Les ${above.length} pays au-dessus de ${HIGH} t de CO₂ par personne pèsent ${one(aboveShare)} % de l’humanité`,
  `${above.length} pays au-dessus de ${HIGH} t de CO₂ par personne, ${one(aboveShare)} % de l’humanité`,
  `Le CO₂ par personne, pays par pays`,
];
const limits = [
  `Un cercle par pays, placé selon ses tonnes de CO₂ par habitant en 2023 ; sa surface est sa ` +
    `population. Le plus gros cercle du champ est l’${callouts[0].name}, ` +
    `${one(biggest.tonnes)} t — sous la médiane des ${countries.length} pays, ` +
    `${one(medianCountry)} t. La moyenne mondiale, ${one(weightedMean)} t, est déjà plus haute que ` +
    `ce qu’émettent ${Math.round(belowMean)} % des gens.`,
  `Un cercle par pays, placé selon ses tonnes de CO₂ par habitant en 2023 ; sa surface est sa ` +
    `population. La moyenne mondiale, ${one(weightedMean)} t, est plus haute que ce qu’émettent ` +
    `${Math.round(belowMean)} % des gens.`,
  `Un cercle par pays ; sa surface est sa population.`,
];
const reading = [
  `Lecture : la position est le taux, la surface est le nombre de gens. Le champ est dense à ` +
    `gauche parce que c’est là que vit le monde, et la queue de droite est faite de petits pays.`,
  `Lecture : la position est le taux, la surface est le nombre de gens.`,
];
const source =
  "Sources : Global Carbon Budget 2025 · population (2023), via Our World in Data";
const axisName = "tonnes de CO₂ par personne, 2023";
const markerLabel = `moyenne mondiale ${one(weightedMean)} t`;

const textPerRegister = {
  display: title.join(" "),
  eyebrow: EYEBROW,
  body: `${limits.join(" ")} ${source}`,
  axis: `${axisName} 0 10 20 30 40 ${markerLabel}`,
  annot: `${reading.join(" ")} ${callouts.map((c) => `${c.name} ${c.lines.join(" ")}`).join(" ")}`,
  value: callouts.map((c) => c.name).join(" "),
};

const filed = readdirSync(DIRECTIONS)
  .filter((f) => f.endsWith(".md"))
  .map((f) => readDirection(join(DIRECTIONS, f)));
const newsroom = readPalette(HERE, { stopAt: join(HERE, "..") });
const BEAT_FACTS = { evidenceLevels: 4 };
console.log(
  report(composeDirections({ newsroom, filed, beat: BEAT_FACTS, textPerRegister }), { beat: BEAT_FACTS }),
);
console.log("");

for (const file of readdirSync(DIRECTIONS).filter((f) => f.endsWith(".md"))) {
  const id = file.replace(/\.md$/, "");
  const direction = resolveDirectionFamilies(readDirection(join(DIRECTIONS, file)), textPerRegister);
  console.log(id);
  try {
    await renderStill({
      element: createElement(DirectedBeeswarm, {
        marks,
        callouts,
        mean: weightedMean,
        markerLabel,
        axisName,
        title,
        limits,
        reading,
        source,
        alt:
          `Essaim de ${countries.length} cercles, un par pays, placés de gauche à droite selon les ` +
          `tonnes de CO₂ par habitant en 2023 et dimensionnés par leur population. Le champ est ` +
          `dense sous ${one(weightedMean)} tonnes, où vivent ${Math.round(belowMean)} % des gens ; ` +
          `la queue de droite, au-delà de ${HIGH} tonnes, ne compte que ${above.length} pays et ` +
          `${one(aboveShare)} % de l’humanité. Les deux cercles nommés sont le plus grand du champ ` +
          `et le plus éloigné.`,
        eyebrow: EYEBROW,
        direction,
        treatments: offered.map((t) => t.id),
        onLadder: (note) => console.log(`  ${note}`),
      }),
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
if (refused.length) console.log(`refused by ${refused.length}: ${refused.map((x) => x.id).join(", ")}`);
