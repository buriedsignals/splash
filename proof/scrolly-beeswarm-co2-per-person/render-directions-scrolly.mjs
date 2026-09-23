// The world's CO₂ per person in 2023, one circle per country sized by population, rendered once per
// FILED DIRECTION into a self-contained scrolly page. The `beeswarm` type in the scrolly format.
//
// THE SUBJECT OF `static-beeswarm-co2-per-person`, CHOREOGRAPHED. The data, the claims and their
// assertions, the two derived callouts and the colour rules are the static beat's own; the scroll tells
// them with its own gestures (`scrolly/references/directed-type-choreography.md`):
//
//   1. a country is placed by its tonnes per person — 213 dots of one size;
//   2. its surface is its population — the dots swell and the field re-packs;
//   3. the largest circle, below the median country — India ringed and named;
//   4. the world average above what most people emit — the rule, and a filter to the people under it;
//   5. the tail past 20 t, and how few live in it — a filter to the tail, Qatar named;
//   6. the whole field again, both named, and the plate's reading line.
//
// Usage:  bun proof/scrolly-beeswarm-co2-per-person/render-directions-scrolly.mjs

import { readdirSync } from "node:fs";
import { readFile, rm } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createElement } from "react";
import { deriveFurniture, measureText } from "#shared/chart-beat/render-still.mjs";
import { readPalette } from "#shared/chart-beat/colour.mjs";
import { readDirection } from "#shared/design-base/read-direction.mjs";
import { composeDirections, report } from "#shared/design-base/compose.mjs";
import { resolveDirectionFamilies } from "#shared/design-base/resolve-families.mjs";
import { plainSpaces, webRegisters } from "#shared/design-base/web.mjs";
import { EYEBROW_TO_DISPLAY, gapOf, registerOf } from "#shared/design-base/register.mjs";
import { renderScrolly } from "../../skills/scrolly/scripts/render-scrolly.mjs";
import { DirectedBeeswarmScrolly } from "./DirectedBeeswarmScrolly.tsx";

const HERE = dirname(fileURLToPath(import.meta.url));
const DIRECTIONS = join(HERE, "..", "..", "docs", "design-base", "directions");
const OUT = join(HERE, "renders");
const EYEBROW = "Climat · Monde";
const HIGH = 20;

// ── the countries, and the static beat's own assertions ────────────────────────────────────────
const csv = (await readFile(join(HERE, "data.csv"), "utf8")).trim().split(/\r?\n/);
const header = csv[0].split(",");
const at = (name) => header.indexOf(name);
const countries = csv.slice(1).map((l) => {
  const c = l.split(",");
  return { entity: c[at("entity")], code: c[at("code")], tonnes: Number(c[at("co2_t_per_person")]), people: Number(c[at("population")]) };
});
for (const c of countries)
  if (!c.code || !Number.isFinite(c.tonnes) || !Number.isFinite(c.people) || c.people <= 0)
    throw new Error(`a country has no usable reading: ${JSON.stringify(c)}`);

const world = countries.reduce((s, c) => s + c.people, 0);
const weightedMean = countries.reduce((s, c) => s + c.tonnes * c.people, 0) / world;
const above = countries.filter((c) => c.tonnes > HIGH);
const aboveShare = (above.reduce((s, c) => s + c.people, 0) / world) * 100;
const belowMean = (countries.filter((c) => c.tonnes <= weightedMean).reduce((s, c) => s + c.people, 0) / world) * 100;
const ranked = [...countries].sort((a, b) => a.tonnes - b.tonnes);
const medianCountry = ranked[Math.floor(ranked.length / 2)].tonnes;
if (!(aboveShare < 1)) throw new Error(`the headline says the countries over ${HIGH} t hold under 1 % of humanity; they hold ${aboveShare.toFixed(2)} %`);
if (!(belowMean > 60)) throw new Error(`a card says the world average sits above what most people emit; it sits above ${belowMean.toFixed(1)} %`);
const biggest = countries.reduce((a, b) => (b.people > a.people ? b : a));
const farthest = countries.reduce((a, b) => (b.tonnes > a.tonnes ? b : a));
if (biggest.tonnes >= medianCountry)
  throw new Error(`a card says the largest circle sits below the median country; ${biggest.entity} is at ${biggest.tonnes.toFixed(1)}`);

/** The two callouts are derived, so their French names are a table that throws when the data moves. */
const FRENCH = { India: { name: "Inde", withArticle: "l’Inde" }, Qatar: { name: "Qatar", withArticle: "le Qatar" } };
const frenchOf = (entity) => {
  if (!FRENCH[entity]) throw new Error(`${entity} became a callout and this plate has no French name for it`);
  return FRENCH[entity];
};
const n0 = (v) => plainSpaces(Math.round(v).toLocaleString("fr-FR"));
const one = (v) => plainSpaces(v.toLocaleString("fr-FR", { minimumFractionDigits: 1, maximumFractionDigits: 1 }));

// ── the words: the static beat's, one reading per card ─────────────────────────────────────────
const title = [
  `Les ${above.length} pays au-dessus de ${HIGH} t de CO₂ par personne pèsent ${one(aboveShare)} % de l’humanité`,
  `${above.length} pays au-dessus de ${HIGH} t de CO₂ par personne, ${one(aboveShare)} % de l’humanité`,
  `Le CO₂ par personne, pays par pays`,
];
const NB = "\u00A0";
const prose = [
  [`Un cercle par pays, placé selon ses tonnes de CO₂ par habitant en 2023.`],
  [`Sa surface est sa population : le champ se déforme là où vit le monde.`],
  [`Le plus gros cercle du champ est ${frenchOf(biggest.entity).withArticle}, ${one(biggest.tonnes)}${NB}t — sous la médiane des ${countries.length} pays, ${one(medianCountry)}${NB}t.`],
  [`La moyenne mondiale, ${one(weightedMean)}${NB}t, est déjà plus haute que ce qu’émettent ${Math.round(belowMean)}${NB}% des gens.`],
  [`Au-delà de ${HIGH}${NB}t, ${above.length} pays seulement : ${one(aboveShare)}${NB}% de l’humanité. Le plus éloigné, ${frenchOf(farthest.entity).withArticle}, émet ${one(farthest.tonnes)}${NB}t par personne.`],
  [`Lecture : la position est le taux, la surface est le nombre de gens. Le champ est dense à gauche parce que c’est là que vit le monde, et la queue de droite est faite de petits pays.`],
];
const meanCount = { template: `{n}${NB}% des gens émettent moins`, value: Math.round(belowMean) };
const tailCount = { template: `${above.length} pays au-delà de ${HIGH}${NB}t : {n}${NB}% de l’humanité`, value: Number(aboveShare.toFixed(1)) };
const source = "Sources : Global Carbon Budget 2025 · population (2023), via Our World in Data";
const axisName = "tonnes de CO₂ par personne, 2023";
const markerLabel = `moyenne mondiale ${one(weightedMean)} t`;
const cardsText = [
  { code: biggest.code, role: "first", name: frenchOf(biggest.entity).name, lines: [`${one(biggest.people / 1e9)} md d’habitants`, `${one(biggest.tonnes)} t par personne`] },
  { code: farthest.code, role: "far", name: frenchOf(farthest.entity).name, lines: [`${n0(farthest.people / 1e6)} millions d’habitants`, `${one(farthest.tonnes)} t par personne`] },
];
const top = Math.max(...countries.map((c) => c.tonnes));
const tickValues = [0, 10, 20, 30, 40].filter((t) => t <= top + 2);
const xMax = Math.max(top, tickValues[tickValues.length - 1]);
const alt =
  `Essaim de ${countries.length} cercles, un par pays, placés de gauche à droite selon les tonnes de CO₂ par ` +
  `habitant en 2023 et dimensionnés par leur population. Le champ est dense sous ${one(weightedMean)} tonnes, où ` +
  `vivent ${Math.round(belowMean)} % des gens ; la queue de droite, au-delà de ${HIGH} tonnes, ne compte que ` +
  `${above.length} pays et ${one(aboveShare)} % de l’humanité. Les deux cercles nommés sont le plus grand du champ ` +
  `et le plus éloigné.`;

/** One state per card; see `swarm-drive.mjs` for what each field paints. */
const STATES = [
  { grow: 0, first: 0, mean: 0, below: 0, tail: 0, far: 0 },
  { grow: 1, first: 0, mean: 0, below: 0, tail: 0, far: 0 },
  { grow: 1, first: 1, mean: 0, below: 0, tail: 0, far: 0 },
  { grow: 1, first: 1, mean: 1, below: 1, tail: 0, far: 0 },
  { grow: 1, first: 1, mean: 1, below: 0, tail: 1, far: 1 },
  { grow: 1, first: 1, mean: 1, below: 0, tail: 0, far: 1 },
];

const textPerRegister = {
  display: title.join(" "),
  eyebrow: EYEBROW,
  body: `${prose.flat().join(" ")} ${source}`,
  axis: `${axisName} ${tickValues.join(" ")} ${markerLabel}`,
  annot: cardsText.flatMap((c) => c.lines).join(" "),
  value: `${cardsText.map((c) => c.name).join(" ")} ${meanCount.template} ${tailCount.template} 0123456789,`,
};

const filed = readdirSync(DIRECTIONS)
  .filter((f) => f.endsWith(".md"))
  .map((f) => readDirection(join(DIRECTIONS, f)));
const newsroom = readPalette(HERE);
const BEAT_FACTS = { evidenceLevels: 4 };
console.log(report(composeDirections({ newsroom, filed, beat: BEAT_FACTS, textPerRegister }), { beat: BEAT_FACTS }));
console.log("");

const driver = [
  await readFile(join(HERE, "swarm-layout.mjs"), "utf8"),
  await readFile(join(HERE, "swarm-drive.mjs"), "utf8"),
].join("\n");

/** A register as the numbers `measureText` takes, for the widths the reference layout needs. */
const faceOf = (style, weight) => ({
  fontSize: Number.parseFloat(style.fontSize),
  fontWeight: weight ?? style.fontWeight,
  fontFamily: String(style.fontFamily).split(",")[0].replace(/"/g, ""),
});
const widthIn = (text, style, weight) =>
  measureText(text, faceOf(style, weight)) + Number.parseFloat(style.letterSpacing) * Math.max(0, text.length - 1);

const refused = [];
for (const file of readdirSync(DIRECTIONS).filter((f) => f.endsWith(".md"))) {
  const id = file.replace(/\.md$/, "");
  const direction = resolveDirectionFamilies(readDirection(join(DIRECTIONS, file)), textPerRegister);
  const { ink, muted } = deriveFurniture(direction.ground);
  const regs = webRegisters(direction, { ink: { ink, muted, accent: direction.accent } });
  const cards = cardsText.map((c) => ({
    ...c,
    width: Math.ceil(Math.max(widthIn(c.name, regs.value), ...c.lines.map((l) => widthIn(l, regs.annot)))) + 2,
  }));
  const cardHeightPx = Math.ceil(Number.parseFloat(regs.value.fontSize) * 1.3 + 2 * Number.parseFloat(regs.annot.fontSize) * 1.35);
  try {
    const { outPath } = await renderScrolly({
      steps: prose.map((p, i) => ({ id: ["position", "population", "plus-gros", "moyenne", "queue", "lecture"][i], prose: p })),
      reveal: {
        element: createElement(DirectedBeeswarmScrolly, {
          marks: countries.map(({ code, tonnes, people }) => ({ code, tonnes, people })),
          cards,
          cardHeightPx,
          mean: weightedMean,
          markerLabel,
          high: HIGH,
          meanCount,
          tailCount,
          axisName,
          axisNameWidth: Math.ceil(widthIn(axisName, regs.axis, 700)),
          ticks: tickValues.map((v) => ({ value: v, width: Math.ceil(widthIn(String(v), regs.axis)) })),
          xMax,
          alt,
          regs,
          pad: direction.pad,
          stroke: direction.stroke ?? {},
          ground: direction.ground,
          accent: direction.accent,
          ink,
          muted,
        }),
        states: STATES,
        driver,
        apply: "applySwarmState",
      },
      title,
      eyebrow: EYEBROW,
      source,
      ground: direction.ground,
      type: { eyebrow: { ...regs.eyebrow, marginBottom: `${gapOf(registerOf(direction, "eyebrow"), EYEBROW_TO_DISPLAY)}px` }, display: regs.display, body: regs.body, source: regs.body },
      lang: "fr",
      outDir: OUT,
      name: `${id}.html`,
    });
    console.log(`${id} -> ${outPath.replace(`${HERE}/`, "")}`);
  } catch (error) {
    await rm(join(OUT, `${id}.html`), { force: true });
    refused.push({ id, why: error.message });
    console.log(`${id} REFUSED — ${error.message}`);
  }
}
if (refused.length) {
  console.log(`\nrefused by ${refused.length}: ${refused.map((x) => x.id).join(", ")}`);
  process.exitCode = 1;
}
