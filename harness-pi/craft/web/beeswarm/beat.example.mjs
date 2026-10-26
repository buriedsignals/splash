// beat.mjs for the worked example proof/web-beeswarm-co2-per-person — "Les 6 pays au-dessus de 20
// tonnes de CO₂ par personne pèsent 0,6 % de l'humanité", as an interactive page. Every number on the
// page is COMPUTED from data.json; the three packings, where half of each weighting's weight lies and
// every mark's reading under each weighting are computed by render-beat.mjs and only WORDED here.
import { readFileSync } from "node:fs";
import { join } from "node:path";

const table = JSON.parse(readFileSync(join(import.meta.dirname, "data.json"), "utf8"));
const col = (name) => table.columns.findIndex((c) => c.name === name);
const [NAME, VALUE, SIZE] = [col("entity"), col("co2_t_per_person"), col("population")];

// The marks: one per country, at its tonnes per person, its circle's area its population.
const marks = table.rows.map((r) => ({ name: r[NAME], value: Number(r[VALUE]), size: Number(r[SIZE]) }));

const HEAVY = 20;
const people = marks.reduce((s, m) => s + m.size, 0);
const co2 = marks.reduce((s, m) => s + m.value * m.size, 0);
const marker = co2 / people; // the world average: the population-weighted mean
const sorted = [...marks].sort((a, b) => a.value - b.value);
const median = sorted[Math.floor(sorted.length / 2)].value;
const heavy = marks.filter((m) => m.value >= HEAVY);
const heavyShare = (heavy.reduce((s, m) => s + m.size, 0) / people) * 100;
const under = marks.filter((m) => m.value < marker);
const underPeople = (under.reduce((s, m) => s + m.size, 0) / people) * 100;
const biggest = marks.reduce((a, b) => (b.size > a.size ? b : a));

// The source's country names are kept; only the names the prose writes mid-sentence are French.
const FR = { India: "l'Inde", Qatar: "le Qatar", China: "la Chine", "United States": "les États-Unis" };
const frName = (name) => FR[name] ?? name;
const capitalise = (s) => s.charAt(0).toUpperCase() + s.slice(1);
const fr = (v, d = 1) => v.toLocaleString("fr-FR", { minimumFractionDigits: d, maximumFractionDigits: d });
const int = (v) => Math.round(v).toLocaleString("fr-FR");
const inhabitants = (v) =>
  v >= 1e9 ? `${fr(v / 1e9)} milliard${v >= 2e9 ? "s" : ""} d'habitants`
  : v >= 1e6 ? `${fr(v / 1e6)} million${v >= 2e6 ? "s" : ""} d'habitants`
  : `${int(v)} habitants`;

// Where half the people, half the countries and half the CO₂ lie (the render computes the same).
const centreOf = (weight) => {
  const total = sorted.reduce((s, m) => s + weight(m), 0);
  let acc = 0;
  return sorted.find((m) => (acc += weight(m)) >= total / 2).value;
};
const [halfPeople, halfCountries, halfCo2] = [(m) => m.size, () => 1, (m) => m.value * m.size].map(centreOf);

export default {
  lang: "fr",
  eyebrow: "Climat · Monde",
  marks,
  unit: "t/personne",
  format: (v, d = 1) => fr(v, d),
  // The two rules the field is read against.
  marker,
  markerLabel: `moyenne mondiale ${fr(marker, 2)}`,
  median,
  medianLabel: `médiane des pays ${fr(median, 2)}`,
  centreLabel: "milieu de la masse",
  // The two cases named on the plate: the largest circle, the farthest one out.
  callout: (m) => (m.isBiggest ? `${frName(m.name)} · ${inhabitants(m.size)} à ${fr(m.value)} t` : `${frName(m.name)} · ${fr(m.value)} t`),
  // The control: what a circle's area counts.
  weighLabel: "L'essaim pèse",
  views: {
    size: { label: "les habitants", announce: "les habitants — la surface d'un cercle est la population du pays : la largeur de l'essaim compte les gens" },
    count: {
      label: "les pays",
      announce: "les pays — un cercle par pays, tous de la même taille : la largeur de l'essaim compte les pays",
      note: (w) =>
        `Un pays, un point : la moitié des ${w.count} pays émet moins de ${fr(w.centre, 2)} t — la médiane que la planche dessine déjà, ` +
        `et la seule pondération où cette ligne est le milieu de la masse. Les ${heavy.length} pays au-dessus de ${HEAVY} t font ` +
        `${fr((heavy.length / w.count) * 100, 2)} % des pays, et ${fr(w.underMarker.count)} % des pays sont sous la moyenne mondiale.`,
    },
    total: {
      label: "le CO₂",
      announce: "le CO₂ — la surface d'un cercle est le CO₂ total du pays : la largeur de l'essaim compte les tonnes",
      note: (w) =>
        `La surface compte les tonnes : la moitié du CO₂ mondial est émise par des pays au-dessus de ${fr(w.centre, 2)} t par personne, ` +
        `trois fois plus haut que la moitié de l'humanité (${fr(w.centres.size, 2)} t). ${capitalise(frName(w.heaviest.name))} à ` +
        `${fr(w.heaviest.value)} t en fait ${fr(w.heaviest.sharePct)} % à elle seule ; les pays sous la moyenne mondiale, où vivent ` +
        `${fr(w.underMarker.size)} % des gens, n'en émettent que ${fr(w.underMarker.total)} %.`,
    },
  },
  // What one circle answers, under each weighting.
  detail: (m, view) =>
    view === "size"
      ? `${fr(m.value)} t/personne · ${inhabitants(m.size)} · ${fr(m.belowSizePct)} % de l'humanité émet moins`
      : view === "count"
        ? `${fr(m.value)} t/personne · rang ${m.rank} sur ${m.count} · ${fr(m.belowCountPct)} % des pays émettent moins`
        : `${fr(m.value)} t/personne · ${int(m.total / 1e6)} Mt de CO₂ · ${fr(m.totalSharePct, 2)} % du CO₂ mondial · ${fr(m.belowTotalPct)} % du CO₂ est émis plus bas`,
  title: "Les 6 pays au-dessus de 20 tonnes de CO₂ par personne pèsent 0,6 % de l'humanité",
  limits:
    `Un cercle par pays (${marks.length}), posé sur l'axe du CO₂ émis par personne en 2023. Sa surface est ce que vous choisissez ` +
    `de compter. L'écart d'un cercle à l'axe, lui, ne dit rien : seule la LARGEUR de l'essaim en dit une.`,
  reading:
    `Lecture : la moitié de l'humanité émet moins de ${fr(halfPeople, 2)} t, la moitié des pays moins de ${fr(halfCountries, 2)} t, ` +
    `mais la moitié du CO₂ mondial est émise au-dessus de ${fr(halfCo2, 2)} t. Survolez, touchez ou tabulez n'importe quel cercle : ` +
    `les ${marks.length} pays répondent, chacun à la question de la pondération choisie.`,
  source: "Source : Global Carbon Budget 2025 · population 2023, via Our World in Data · les noms de pays sont ceux publiés par la source",
  alt:
    `Un essaim de ${marks.length} cercles, un par pays, posés le long d'un axe de tonnes de CO₂ par personne. La masse se concentre ` +
    `sous ${fr(median, 2)} tonnes ; le plus gros cercle, ${frName(biggest.name)} et ses ${inhabitants(biggest.size)}, est à ` +
    `${fr(biggest.value)} tonnes, sous la médiane des pays. La queue de droite est faite de petits cercles : les ${heavy.length} pays ` +
    `au-dessus de ${HEAVY} tonnes ne pèsent que ${fr(heavyShare, 1)} % de l'humanité. Un choix sous le titre change ce que la ` +
    `surface d'un cercle compte — les habitants, les pays, ou les tonnes de CO₂ — et l'essaim se repose.`,
  evidenceLevels: 3,
  check() {
    if (heavy.length !== 6) throw new Error(`${heavy.length} countries are at or over ${HEAVY} t per person, not 6`);
    if (fr(heavyShare, 1) !== "0,6") throw new Error(`the countries over ${HEAVY} t hold ${fr(heavyShare, 2)} % of people, not 0,6 %`);
    if (!(underPeople > 60)) throw new Error(`the world average sits above only ${fr(underPeople)} % of people, not most`);
    if (!(biggest.value < median)) throw new Error(`the largest circle (${biggest.name}) is not below the median country`);
  },
};
