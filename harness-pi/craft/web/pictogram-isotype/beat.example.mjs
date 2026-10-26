// beat.mjs for the worked example proof/web-pictogram-europe-lowcarbon — "16 pays européens sur 40
// dépassent 75 % bas-carbone", as an interactive page. One square is one country by default; the
// control re-counts the same field in 100 TWh of electricity, of low-carbon and of fossil generation.
// Every block, every square and the things that fill it are COMPUTED by render-beat.mjs and only
// WORDED here; every other number is computed from data.json.
import { readFileSync } from "node:fs";
import { join } from "node:path";

const data = JSON.parse(readFileSync(join(import.meta.dirname, "data.json"), "utf8"));
const col = (name) => data.columns.findIndex((c) => c.name === name);
const LOW_COLUMNS = ["other_renewables_generation__twh", "bioenergy_stacked_generation__twh", "solar_generation__twh", "wind_generation__twh", "hydro_generation__twh", "nuclear_generation__twh"];
const FOSSIL_COLUMNS = ["gas_generation__twh", "oil_generation__twh", "coal_generation__twh"];

const FR_NAME = {
  ALB: "Albanie", AUT: "Autriche", BLR: "Biélorussie", BEL: "Belgique", BIH: "Bosnie-Herzégovine", BGR: "Bulgarie", HRV: "Croatie",
  CYP: "Chypre", CZE: "Tchéquie", DNK: "Danemark", EST: "Estonie", FIN: "Finlande", FRA: "France", DEU: "Allemagne", GRC: "Grèce",
  HUN: "Hongrie", ISL: "Islande", IRL: "Irlande", ITA: "Italie", LVA: "Lettonie", LTU: "Lituanie", LUX: "Luxembourg", MLT: "Malte",
  MDA: "Moldavie", MNE: "Monténégro", NLD: "Pays-Bas", MKD: "Macédoine du Nord", NOR: "Norvège", POL: "Pologne", PRT: "Portugal",
  ROU: "Roumanie", RUS: "Russie", SRB: "Serbie", SVK: "Slovaquie", SVN: "Slovénie", ESP: "Espagne", SWE: "Suède", CHE: "Suisse",
  TUR: "Turquie", UKR: "Ukraine", GBR: "Royaume-Uni",
};

// One unit per country with a complete 2024 reading. `value` is what the blocks are cut on (the
// low-carbon share of its own electricity, in %); `low` / `fossil` / `total` are the quantities the
// control can count instead.
const units = [];
const absent = [];
for (const r of data.rows) {
  const code = r[col("code")];
  const cells = [...LOW_COLUMNS, ...FOSSIL_COLUMNS].map((name) => r[col(name)]);
  const low = LOW_COLUMNS.reduce((s, name) => s + Number(r[col(name)]), 0);
  const fossil = FOSSIL_COLUMNS.reduce((s, name) => s + Number(r[col(name)]), 0);
  if (cells.some((v) => v === null || !Number.isFinite(Number(v))) || !(low + fossil > 0)) {
    absent.push(FR_NAME[code] ?? code);
    continue;
  }
  units.push({ key: code, label: FR_NAME[code] ?? code, value: (low / (low + fossil)) * 100, low, fossil, total: low + fossil });
}

const HIGH = 75;
const MID = 60;
const YEAR = 2024;
const fr = (v, d = 1) => v.toLocaleString("fr-FR", { minimumFractionDigits: d, maximumFractionDigits: d });
const int = (v) => Math.round(v).toLocaleString("fr-FR");
const pc = (v, d = 1) => `${fr(v, d)} %`;
const squares = (n) => `${fr(n)} ${n >= 2 ? "carrés" : "carré"}`;
const nHigh = units.filter((u) => u.value >= HIGH).length;
const nMid = units.filter((u) => u.value >= MID && u.value < HIGH).length;
const nLow = units.filter((u) => u.value < MID).length;

export default {
  lang: "fr",
  eyebrow: "Énergie · Europe",
  units,
  absent,
  absentNote: `l'Ukraine ne publie pas ${YEAR} et n'est pas dessinée`,
  unitThing: "% bas-carbone",
  // The blocks, top to bottom (the first is drawn in the accent): min <= value < max.
  blocks: [
    { key: "high", name: `${HIGH} % et plus`, min: HIGH },
    { key: "mid", name: `${MID} à ${HIGH} %`, min: MID, max: HIGH },
    { key: "low", name: `moins de ${MID} %`, max: MID },
  ],
  format: (v) => fr(v),
  // The control: its legend, the default unit (one square, one thing), and the quantities.
  controlLabel: "Un carré vaut",
  countLabel: "un pays",
  countAnnounce: "un pays — un carré par pays, quelle que soit sa taille : le terrain compte les pays",
  measures: [
    {
      key: "power",
      label: "100 TWh d'électricité",
      perValue: 100,
      amount: (u) => u.total,
      announce: "100 TWh d'électricité — un carré pour cent térawattheures produits : le terrain compte l'électricité",
      note: (m) => {
        const [high, , low] = m.blocks;
        return (
          `Les ${low.count} pays sous ${MID} % sont ${pc(low.countShare)} du terrain et ${pc(low.share)} de l'électricité européenne : ` +
          `${int(low.amount)} TWh sur ${int(m.sum)}. Les ${high.count} au-dessus de ${HIGH} % n'en font que ${pc(high.share)}, et la ` +
          `${low.largest.label} à elle seule remplit ${fr(low.largest.squares, 1)} des ${fr(low.squares)} carrés du bloc du bas.`
        );
      },
    },
    {
      key: "clean",
      label: "100 TWh bas-carbone",
      perValue: 100,
      amount: (u) => u.low,
      announce: "100 TWh bas-carbone — un carré pour cent térawattheures bas-carbone : le terrain compte la production propre",
      note: (m) => {
        const [high, mid, low] = m.blocks;
        return (
          `Les ${low.count} pays sous ${MID} % produisent ${fr(low.amount)} TWh bas-carbone, soit ${pc(low.share)} du bas-carbone européen — ` +
          `${pc((low.amount / high.amount) * 100, 0)} de ce que produisent les ${high.count} (${fr(high.amount)} TWh). ` +
          `Le bloc du milieu, lui, tombe à ${squares(mid.squares)}.`
        );
      },
    },
    {
      key: "fossil",
      label: "100 TWh fossile",
      perValue: 100,
      amount: (u) => u.fossil,
      announce: "100 TWh fossile — un carré pour cent térawattheures fossiles : le terrain compte le charbon, le gaz et le fioul",
      note: (m) => {
        const [high, , low] = m.blocks;
        return (
          `${pc(low.share)} de l'électricité fossile européenne sort des ${low.count} pays sous ${MID} %. Les ${high.count} au-dessus de ${HIGH} % ` +
          `en font ${pc(high.share)}, soit ${squares(high.squares)} : ${fr(high.amount)} TWh sur ${int(m.sum)}.`
        );
      },
    },
  ],
  // The figure printed beside each block, under every unit.
  figure: (n) => squares(n),
  // What one square answers under the default unit (one square, one country).
  detailThing: (t) =>
    `${t.label} · ${pc(t.value)} de son électricité est bas-carbone · ${fr(t.amounts.power)} TWh produits, dont ${fr(t.amounts.clean)} bas-carbone · rang ${t.rank} sur ${t.of}`,
  // What one square answers under a quantity: the things that fill it.
  detailSquare: (s) => {
    const head = s.whole
      ? `Carré ${s.index} sur ${fr(s.squares)} du bloc « ${s.block} »`
      : `Dernier carré du bloc « ${s.block} », rempli à ${pc(s.fillPct, 0)} : ${fr(s.amount)} TWh`;
    const who = s.parts.map((p) => `${p.label} (${pc(p.pct, 0)})`).join(", puis ");
    const solo = s.solo ? ` · ${s.solo.label} en remplit ${fr(s.solo.squares, 2)} à elle seule` : "";
    return `${head} · un carré vaut ${s.measure.label} · ${who}${solo}`;
  },
  title: "16 pays européens sur 40 dépassent 75 % bas-carbone",
  limits:
    `Un carré, un pays : les ${units.length} pays européens qui publient leur production ${YEAR}, rangés par la part bas-carbone de leur ` +
    `électricité. Ce que vaut un carré est en dessous, et c'est vous qui le choisissez.`,
  reading: ({ measures }) => {
    const [power, , fossil] = measures;
    const low = (m) => m.blocks[2];
    return (
      `Lecture : ${nHigh} pays sont au-dessus de ${HIGH} %, ${nLow} sous ${MID} %, ${nMid} entre les deux. Changez ce que vaut un carré et le ` +
      `terrain se recompte : les ${nLow} du bas passent de ${pc(low(power).countShare)} du terrain à ${pc(low(power).share)} de l'électricité ` +
      `et à ${pc(low(fossil).share)} du fossile. Survolez, touchez ou tabulez n'importe quel carré : sous « un pays » il répond avec son ` +
      `pays, sous les autres avec les pays qui le remplissent.`
    );
  },
  source: `Source : Ember, Energy Institute — Statistical Review of World Energy (2025), via Our World in Data · ${YEAR}`,
  alt: ({ counts, measures }) => {
    const [power, , fossil] = measures;
    return (
      `Un terrain de carrés en trois blocs, un carré par pays. En haut les ${counts.high} pays dont au moins ${HIGH} % de l'électricité est ` +
      `bas-carbone, au milieu les ${counts.mid} entre ${MID} et ${HIGH} %, en bas les ${counts.low} sous ${MID} %. Un choix sous le titre change ` +
      `ce que vaut un carré — un pays, ou cent térawattheures d'électricité, de bas-carbone ou de fossile — et l'encre coule dans le terrain ou ` +
      `s'en retire sans qu'aucun carré ne bouge : le bloc du bas passe de ${fr(counts.low, 0)} carrés à ${fr(power.blocks[2].squares)}, et le ` +
      `bloc du haut de ${fr(counts.high, 0)} à ${fr(fossil.blocks[0].squares)}.`
    );
  },
  evidenceLevels: 3,
  check({ counts, total }) {
    if (counts.high !== 16) throw new Error(`${counts.high} countries are at or above ${HIGH} %, not 16`);
    if (total !== 40) throw new Error(`${total} countries are drawn, not 40`);
  },
};
