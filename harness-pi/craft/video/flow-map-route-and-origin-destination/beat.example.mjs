// beat.mjs for the worked example proof/video-flow-map-ukraine-protection — « 4,5 millions d'Ukrainiens sous protection
// temporaire — l'Allemagne et la Pologne en accueillent la moitié », told in time. data.json holds one month of people
// under temporary protection, by host country. Every number the video draws is COMPUTED from data.json; the ranking,
// the bands and the shares are the kit's.
import { readFileSync } from "node:fs";
import { join } from "node:path";

const table = JSON.parse(readFileSync(join(import.meta.dirname, "data.json"), "utf8"));
const col = (name) => {
  const i = table.columns.findIndex((c) => c.name === name);
  if (i < 0) throw new Error(`data.json has no column ${name}`);
  return i;
};
const [CODE, MONTH, PEOPLE] = [col("code"), col("month"), col("people")];

// The video is in French.
const NAMES = {
  DEU: "Allemagne", POL: "Pologne", CZE: "Tchéquie", ESP: "Espagne", ROU: "Roumanie", SVK: "Slovaquie", NLD: "Pays-Bas",
  IRL: "Irlande", BEL: "Belgique", AUT: "Autriche", NOR: "Norvège", BGR: "Bulgarie", CHE: "Suisse", FIN: "Finlande",
  PRT: "Portugal", FRA: "France", DNK: "Danemark", LTU: "Lituanie", HUN: "Hongrie", SWE: "Suède", GRC: "Grèce",
  ITA: "Italie", LVA: "Lettonie", EST: "Estonie", HRV: "Croatie", CYP: "Chypre", SVN: "Slovénie", ISL: "Islande",
  LUX: "Luxembourg", MLT: "Malte", LIE: "Liechtenstein",
};
const month = table.rows[0][MONTH];
const flows = table.rows.map((r) => ({ iso: r[CODE], name: NAMES[r[CODE]] ?? r[CODE], value: Number(r[PEOPLE]) }));

const NB = " ";
const n0 = (v) => Math.round(v).toLocaleString("fr-FR");
const one = (v) => v.toLocaleString("fr-FR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
/** A host's flow, short: millions to two decimals, else thousands. */
const amount = (p) => (p >= 1e6 ? `${(p / 1e6).toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}${NB}M` : `${Math.round(p / 1000)}${NB}k`);

export default {
  lang: "fr",
  eyebrow: "Migrations · Europe",
  // The title card in forms, longest first: the first is the journalist's takeaway, copied as written.
  title: [
    "4,5 millions d’Ukrainiens sous protection temporaire — l’Allemagne et la Pologne en accueillent la moitié",
    "4,5 millions d’Ukrainiens sous protection temporaire",
  ],
  origin: "UKR",
  originName: "Ukraine",
  flows,
  count: (n) => `${n0(n)}${NB}personnes`,
  // The two largest hosts' share: whole percents while it climbs, one decimal at the end.
  share: (s, first, second) => `${first} + ${second}${NB}: ${Number.isInteger(s) ? s : one(s)}${NB}%`,
  host: (name, n) => `${name} ${amount(n)}`,
  figure: (v) => (v >= 1e6 ? `${v / 1e6}${NB}million` : n0(v)),
  source: [
    `Source : Eurostat, protection temporaire (migr_asytpsm), ${month} · © MapTiler © OpenStreetMap`,
    `Source : Eurostat (migr_asytpsm), ${month} · © MapTiler © OpenStreetMap`,
    `Eurostat, ${month} · © MapTiler © OpenStreetMap`,
    "Eurostat · © MapTiler © OpenStreetMap",
  ],
  // The claim checked against the drawn data: 4,5 million in all, Germany first, the two largest about half.
  check(map) {
    if (Math.round(map.total / 1e5) / 10 !== 4.5) throw new Error(`the title says 4,5 million; the file totals ${map.total}`);
    if (map.ranked[0].iso !== "DEU" || map.ranked[1].iso !== "POL") throw new Error(`the title names Germany and Poland as the two largest hosts; they are ${map.ranked[0].name} and ${map.ranked[1].name}`);
    if (!(map.topTwoShare > 45 && map.topTwoShare < 55)) throw new Error(`the title says the two largest take half; they take ${map.topTwoShare.toFixed(1)} %`);
  },
};
