// beat.mjs for the worked example proof/web-heatmap-europe-electricity — "7 European countries: more
// than 94 % low-carbon electricity, by three routes", as an interactive page. Every number on the page
// is COMPUTED from data.json; each cell's rank and each band's survivors are computed by
// render-beat.mjs and only WORDED here.
import { readFileSync } from "node:fs";
import { join } from "node:path";

const data = JSON.parse(readFileSync(join(import.meta.dirname, "data.json"), "utf8"));
const at = (name) => data.columns.findIndex((c) => c.name === name);

const YEAR = 2024;
const FLOOR = 94;
// The columns, in the order drawn: renewables first, then nuclear, then fossil.
const heads = [
  { key: "hydro_generation__twh", label: "hydraulique" },
  { key: "wind_generation__twh", label: "éolien" },
  { key: "solar_generation__twh", label: "solaire" },
  { key: "bioenergy_stacked_generation__twh", label: "biomasse" },
  { key: "other_renewables_generation__twh", label: "autres renouv." },
  { key: "nuclear_generation__twh", label: "nucléaire" },
  { key: "gas_generation__twh", label: "gaz" },
  { key: "coal_generation__twh", label: "charbon" },
  { key: "oil_generation__twh", label: "pétrole" },
];
const RENEW = 5; // the first five heads are renewables
const NUCLEAR = 5; // index of the nuclear head
const NAMES = {
  ISL: "Islande", ALB: "Albanie", NOR: "Norvège", FRA: "France", SWE: "Suède", CHE: "Suisse",
  FIN: "Finlande", AUT: "Autriche", DNK: "Danemark", PRT: "Portugal", ESP: "Espagne",
  DEU: "Allemagne", POL: "Pologne", GBR: "Royaume-Uni", ITA: "Italie", NLD: "Pays-Bas",
  BEL: "Belgique", CZE: "Tchéquie", GRC: "Grèce", IRL: "Irlande", LVA: "Lettonie",
  LTU: "Lituanie", LUX: "Luxembourg", MLT: "Malte", MDA: "Moldavie", MNE: "Monténégro",
  MKD: "Macédoine du N.", ROU: "Roumanie", RUS: "Russie", SRB: "Serbie", SVK: "Slovaquie",
  SVN: "Slovénie", TUR: "Turquie", UKR: "Ukraine", BLR: "Biélorussie", BIH: "Bosnie-Herz.",
  BGR: "Bulgarie", HRV: "Croatie", CYP: "Chypre", EST: "Estonie", HUN: "Hongrie",
};

// Every country: each cell is a SHARE of its own generation; the TWh ride along for detail().
const measured = data.rows
  .filter((r) => r[at("year")] === YEAR)
  .map((r) => {
    const twh = heads.map((h) => Number(r[at(h.key)]));
    const total = twh.reduce((a, b) => a + b, 0);
    const cells = twh.map((v) => (total > 0 ? (v / total) * 100 : 0));
    const renewShare = cells.slice(0, RENEW).reduce((a, b) => a + b, 0);
    const nuclearShare = cells[NUCLEAR];
    const lowCarbon = total > 0 ? ((twh.slice(0, RENEW).reduce((a, b) => a + b, 0) + twh[NUCLEAR]) / total) * 100 : 0;
    return { code: r[at("code")], label: NAMES[r[at("code")]] ?? r[at("entity")], twh, total, cells, renewShare, nuclearShare, lowCarbon };
  })
  .filter((r) => r.total > 0);

// The rows drawn: every country above the floor, by low-carbon share.
const rows = measured.filter((r) => r.lowCarbon > FLOOR).sort((a, b) => b.lowCarbon - a.lowCarbon);

// The three routes, a computed partition: a country in none or in two throws in check().
const routeOf = (r) => {
  const hits = [r.nuclearShare < 1 && "renouvelable", r.nuclearShare > 50 && "nucléaire", r.renewShare > 50 && r.nuclearShare > 25 && "les deux"].filter(Boolean);
  return hits.length === 1 ? hits[0] : null;
};
const byRoute = (key) => rows.filter((r) => routeOf(r) === key);

const fr = (v, d = 1) => v.toLocaleString("fr-FR", { minimumFractionDigits: d, maximumFractionDigits: d });
const BANDS = [5, 15, 25];
const cellCount = rows.length * heads.length;
const belowFloor = rows.flatMap((r) => r.cells).filter((v) => v < BANDS[0]).length;

export default {
  lang: "fr",
  eyebrow: "Énergie · Europe",
  heads,
  rows,
  // The class edges of the colour ramp, in % of the country's electricity.
  breaks: [0.5, 5, 15, 30, 50, 70],
  unit: "%",
  formatBreak: (v) => fr(v, v < 1 ? 1 : 0),
  // The number printed in a cell of the top class.
  format: (v) => fr(v, 0),
  detail: (c) =>
    `${c.rowLabel} · ${c.colLabel} · ${fr(c.value)} % de son électricité (${fr(c.row.twh[c.colIndex], 1)} TWh sur ` +
    `${fr(c.row.total, 0)}) · ${c.rank}e sur ${c.count} pour cette source`,
  // The floor control.
  bands: BANDS,
  filterLabel: "Ne garder que les parts d'au moins",
  allLabel: "Toutes les parts",
  bandLabel: (t) => `${fr(t, 0)} %`,
  bandNote: (b) =>
    `Au moins ${fr(b.threshold, 0)} % : ${b.kept} cases sur ${b.total}, sur ${b.columnsKept} des ${b.columnCount} sources. ` +
    `Ce qui reste couvre encore de ${fr(b.low.covered)} % (${b.low.name}) à ${fr(b.high.covered)} % (${b.high.name}) de l'électricité du pays — ` +
    `${b.fewest.cells} source pour le plus concentré (${b.fewest.name}), ${b.most.cells} pour le plus réparti (${b.most.name}).`,
  annotation:
    `Sans nucléaire du tout : ${byRoute("renouvelable").map((r) => r.label).join(", ")}. ` +
    `Par le nucléaire : ${byRoute("nucléaire").map((r) => `${r.label} (${fr(r.nuclearShare)} %)`).join(", ")}. ` +
    `Par les deux (plus de 50 % de renouvelables ET plus de 25 % de nucléaire) : ${byRoute("les deux").map((r) => r.label).join(", ")}.`,
  title: "7 pays européens : plus de 94 % d'électricité bas-carbone, par trois routes",
  limits:
    `${rows.length} pays sur ${heads.length} sources, en ${YEAR} : chaque case est la part d'une source dans l'électricité du pays, ` +
    `en une teinte unique du clair au foncé. Lignes par part bas-carbone, colonnes renouvelables d'abord.`,
  reading: `Lecture : relevez le seuil — ${belowFloor} des ${cellCount} cases sont sous ${fr(BANDS[0], 0)} %. Survolez une case : sa part, ses TWh, son rang.`,
  source: `Source : Ember, Energy Institute — Statistical Review of World Energy (2025), via Our World in Data · ${YEAR}`,
  alt:
    `Une matrice de ${rows.length} lignes de pays sur ${heads.length} colonnes de sources, chaque case teintée selon la part de cette source ` +
    `dans l'électricité du pays en ${YEAR}. Trois motifs apparaissent : des lignes foncées uniquement dans les colonnes renouvelables ` +
    `(${byRoute("renouvelable").map((r) => r.label).join(", ")}), une ligne foncée dans la colonne nucléaire ` +
    `(${byRoute("nucléaire").map((r) => r.label).join(", ")}), et des lignes foncées des deux côtés (${byRoute("les deux").map((r) => r.label).join(", ")}).`,
  evidenceLevels: 3,
  check() {
    if (rows.length !== 7) throw new Error(`${rows.length} countries clear ${FLOOR} % low-carbon, not 7`);
    const lost = rows.filter((r) => routeOf(r) === null);
    if (lost.length) throw new Error(`${lost.map((r) => r.label).join(", ")} fall(s) into none or several of the three routes`);
    if (!byRoute("renouvelable").length || !byRoute("nucléaire").length || !byRoute("les deux").length)
      throw new Error(`the countries above ${FLOOR} % no longer split into three non-empty routes`);
  },
};
