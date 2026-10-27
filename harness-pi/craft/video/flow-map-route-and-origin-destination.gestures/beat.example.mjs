// beat.mjs for the worked example proof/static-flow-map-ukraine-protection — "4.5 million Ukrainians
// under temporary protection; Germany and Poland host half of them" — written for the VIDEO gesture kit: the
// staging is the `gestures` list (a band is named by its name in `names`, or its ISO3 code). Every number on the plate is
// COMPUTED from data.json; the runner reads the destinations and the quantities itself, by the
// column names given here.
import { readFileSync } from "node:fs";
import { join } from "node:path";

const table = JSON.parse(readFileSync(join(import.meta.dirname, "data.json"), "utf8"));
const col = (name) => table.columns.findIndex((c) => c.name === name);
const [CODE, PEOPLE, MONTH] = [col("code"), col("people"), col("month")];

const flows = table.rows.map((r) => ({ code: r[CODE], people: Number(r[PEOPLE]) }));
const month = table.rows[0][MONTH];
const total = flows.reduce((s, f) => s + f.people, 0);
const ranked = [...flows].sort((a, b) => b.people - a.people);
const topTwoShare = ((ranked[0].people + ranked[1].people) / total) * 100;

const plain = (s) => s.replace(/[   ]/g, " ");
const n0 = (v) => plain(Math.round(v).toLocaleString("fr-FR"));
const one = (v) => plain(v.toLocaleString("fr-FR", { minimumFractionDigits: 1, maximumFractionDigits: 1 }));
const byCode = (code) => flows.find((f) => f.code === code).people;
const pct = (code) => one((flows.find((f) => f.code === code).people / total) * 100);

export default {
  eyebrow: "Migrations · Europe",
  // THE JOIN: the data.json column holding each destination's ISO 3166 alpha-3 code, and the quantity.
  key: "code",
  value: "people",
  // Optional: keep only the rows matching every { column: value } (one month, one category…).
  where: {},
  // The origin every band leaves from (an ISO3 code, not a row of data.json), and its name on the node.
  origin: "UKR",
  originLabel: "Ukraine",
  // The staging, in story order: Germany in the accent, set against Poland (the ratio of the two bands),
  // then the two kept in ink while the others step back, their sum stated.
  gestures: [
    // Exactly three, one per event: reveal, subject, conclusion (the conclusion stands at the whole map).
    { do: "reveal" },
    { do: "highlight", mark: "Allemagne" },
    { do: "compare", marks: ["Allemagne", "Pologne"], note: `${one(byCode("DEU") / byCode("POL"))} fois la Pologne` },
  ],

  // Every destination's name, in the story's language.
  names: {
    DEU: "Allemagne", POL: "Pologne", CZE: "Tchéquie", ESP: "Espagne", ROU: "Roumanie",
    SVK: "Slovaquie", NLD: "Pays-Bas", IRL: "Irlande", BEL: "Belgique", AUT: "Autriche",
    NOR: "Norvège", BGR: "Bulgarie", CHE: "Suisse", FIN: "Finlande", PRT: "Portugal",
    FRA: "France", DNK: "Danemark", LTU: "Lituanie", HUN: "Hongrie", SWE: "Suède", GRC: "Grèce",
    ITA: "Italie", LVA: "Lettonie", EST: "Estonie", HRV: "Croatie", CYP: "Chypre", SVN: "Slovénie",
    ISL: "Islande", LUX: "Luxembourg", MLT: "Malte", LIE: "Liechtenstein",
  },
  unit: "personnes",
  format: (v) => n0(v),
  // The name printed at a band's end.
  bandLabel: (name, v) => `${name} ${Math.round(v / 1000)}k`,
  // The line under the key for the bands too thin to draw or outside the frame (long = landscape).
  dottedNote: (count, share, long) =>
    long
      ? `Les ${count} autres pays, ${share} % du total : ruban trop fin, ou pays hors cadre. Ceux qui sont dans le cadre portent un point.`
      : `Les ${count} autres pays (${share} % du total) : ruban trop fin, ou hors cadre.`,
  // The key's count line.
  keyNote: (drawn, share, all) => `${drawn} rubans dessinés, ${Math.round(share)} % des ${n0(all)} personnes.`,
  title: [
    // The journalist's takeaway, copied word for word from STORYBOARD.md.
    "4,5 millions d’Ukrainiens sous protection temporaire — l’Allemagne et la Pologne en accueillent la moitié",
    `${one(total / 1e6)} millions d’Ukrainiens sous protection temporaire en Europe`,
    `La protection temporaire, pays par pays`,
  ],
  limits: [
    `Un ruban par pays d’accueil, partant d’un même nœud posé sur l’Ukraine : sa largeur est le nombre de personnes, ` +
      `à l’échelle dessinée dans la clé. L’Allemagne en prend ${pct("DEU")} % et la Pologne ${pct("POL")} % ` +
      `des ${n0(total)} bénéficiaires que compte Eurostat dans les ${flows.length} pays déclarants.`,
    `Un ruban par pays d’accueil : sa largeur est le nombre de personnes. L’Allemagne et la Pologne en prennent ${one(topTwoShare)} %.`,
    `Un ruban par pays d’accueil : sa largeur est le nombre de personnes.`,
  ],
  reading: [
    `Lecture : la largeur est la seule chose qui compte, et elle ne change pas le long du ruban. Le tracé n’est pas un itinéraire : personne n’est passé par là.`,
    `Lecture : la largeur est la quantité. Le tracé n’est pas un itinéraire.`,
  ],
  source: `Source : Eurostat, bénéficiaires de la protection temporaire (migr_asytpsm), ${month} · fond de carte MapTiler (dataviz)`,
  alt:
    `Carte de flux de l’Europe : ${flows.length} rubans partent d’un nœud posé sur l’Ukraine et arrivent chacun dans un pays d’accueil, ` +
    `la largeur valant le nombre d’Ukrainiens sous protection temporaire en ${month}. Le plus large va vers l’Allemagne ` +
    `(${n0(ranked[0].people)} personnes), le deuxième vers la Pologne (${n0(ranked[1].people)}) ; à eux deux ${one(topTwoShare)} % ` +
    `des ${n0(total)} personnes.`,
  check() {
    if (ranked[1].code !== "POL") throw new Error(`the second host is ${ranked[1].code}, not Poland`);
    if (!(topTwoShare > 45 && topTwoShare < 55)) throw new Error(`Germany and Poland take ${topTwoShare.toFixed(1)} %, not about half`);
    if (one(total / 1e6) !== "4,5") throw new Error(`the total is ${one(total / 1e6)} million, not 4,5`);
  },
};
