// beat.mjs for the worked example proof/scrolly-beeswarm-co2-per-person — "The 6 countries above
// 20 t of CO2 per person hold 0.6 % of humanity", as a scrolly. Every number in a card is COMPUTED:
// the weighted mean, the median country, the largest and farthest circles, the tail and its share
// come from render-beat.mjs as `r` and are only WORDED here.
import { readFileSync } from "node:fs";
import { join } from "node:path";

const data = JSON.parse(readFileSync(join(import.meta.dirname, "data.json"), "utf8"));
const col = (name) => data.columns.findIndex((c) => c.name === name);
const [NAME, YEAR_COL, VALUE, SIZE] = [col("entity"), col("year"), col("co2_t_per_person"), col("population")];

// One circle per country: placed by its tonnes per person, sized by its population.
const marks = data.rows.map((r) => ({ name: r[NAME], value: Number(r[VALUE]), size: Number(r[SIZE]) }));
const YEAR = data.rows[0][YEAR_COL];

/** The two callouts are chosen by the render, so their French names are a table that throws when the data moves. */
const FRENCH = { India: { name: "Inde", withArticle: "l’Inde" }, Qatar: { name: "Qatar", withArticle: "le Qatar" } };
const frenchOf = (name) => {
  if (!FRENCH[name]) throw new Error(`${name} became a callout and this beat has no French name for it`);
  return FRENCH[name];
};
const format = (v) => v.toLocaleString("fr-FR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const n0 = (v) => Math.round(v).toLocaleString("fr-FR");

export default {
  lang: "fr",
  eyebrow: "Climat · Monde",
  marks,
  // The tail card 5 filters to: the members past this value (the takeaway's own threshold).
  threshold: 20,
  format,
  axisName: `tonnes de CO₂ par personne, ${YEAR}`,
  markerLabel: (r) => `moyenne mondiale ${format(r.mean)} t`,
  // The card above a named circle: the largest (card 3) and the farthest (card 5).
  callout: (m) =>
    m.role === "biggest"
      ? { label: frenchOf(m.name).name, lines: [`${format(m.size / 1e9)} md d’habitants`, `${format(m.value)} t par personne`] }
      : { label: frenchOf(m.name).name, lines: [`${n0(m.size / 1e6)} millions d’habitants`, `${format(m.value)} t par personne`] },
  // The counters card 4 and card 5 climb; {n} is the share the drive counts up.
  counts: {
    mean: () => `{n} % des gens émettent moins`,
    tail: (r) => `${r.tail.count} pays au-delà de ${r.threshold} t : {n} % de l’humanité`,
  },
  // One sentence (or paragraphs) per card; the picture under each is already choreographed.
  cards: {
    position: () => `Un cercle par pays, placé selon ses tonnes de CO₂ par habitant en ${YEAR}.`,
    size: () => `Sa surface est sa population : le champ se déforme là où vit le monde.`,
    biggest: (r) => `Le plus gros cercle du champ est ${frenchOf(r.biggest.name).withArticle}, ${format(r.biggest.value)} t — sous la médiane des ${r.count} pays, ${format(r.median)} t.`,
    mean: (r) => `La moyenne mondiale, ${format(r.mean)} t, est déjà plus haute que ce qu’émettent ${Math.round(r.underMeanShare)} % des gens.`,
    tail: (r) => `Au-delà de ${r.threshold} t, ${r.tail.count} pays seulement : ${format(r.tail.share)} % de l’humanité. Le plus éloigné, ${frenchOf(r.farthest.name).withArticle}, émet ${format(r.farthest.value)} t par personne.`,
  },
  title: [
    "Les 6 pays au-dessus de 20 t de CO₂ par personne pèsent 0,6 % de l’humanité",
    "6 pays au-dessus de 20 t de CO₂ par personne, 0,6 % de l’humanité",
    "Le CO₂ par personne, pays par pays",
  ],
  // The last card: the accounting the swarm rests on.
  limits:
    "Lecture : la position est le taux, la surface est le nombre de gens. Le champ est dense à gauche parce que c’est là que vit le monde, et la queue de droite est faite de petits pays.",
  source: "Sources : Global Carbon Budget 2025 · population (2023), via Our World in Data",
  alt: (r) =>
    `Essaim de ${r.count} cercles, un par pays, placés de gauche à droite selon les tonnes de CO₂ par ` +
    `habitant en ${YEAR} et dimensionnés par leur population. Le champ est dense sous ${format(r.mean)} tonnes, où ` +
    `vivent ${Math.round(r.underMeanShare)} % des gens ; la queue de droite, au-delà de ${r.threshold} tonnes, ne compte que ` +
    `${r.tail.count} pays et ${format(r.tail.share)} % de l’humanité. Les deux cercles nommés sont le plus grand du champ ` +
    `et le plus éloigné.`,
  evidenceLevels: 4,
  check(r) {
    if (r.tail.count !== 6) throw new Error(`the title says 6 countries are above 20 t; ${r.tail.count} are`);
    if (Math.round(r.tail.share * 10) / 10 !== 0.6) throw new Error(`the title says they hold 0.6 % of humanity; they hold ${r.tail.share.toFixed(2)} %`);
    // Card 4 says the average sits above what MOST people emit; card 3 that the largest circle sits under the median.
    if (!(r.underMeanShare > 60)) throw new Error(`card 4 says the world average sits above what most people emit; it sits above ${r.underMeanShare.toFixed(1)} %`);
    if (!(r.biggest.value < r.median)) throw new Error(`card 3 says the largest circle sits below the median country; ${r.biggest.name} is at ${r.biggest.value.toFixed(1)}`);
  },
};
