// beat.mjs for the worked example proof/web-choropleth-europe-lowcarbon — "7 pays au-dessus de 94 % —
// ou 13, selon la coupure". Every number on the page is COMPUTED from data.json or taken from the
// reading the render hands a word function; the map, the four rules, the camera and the colours are
// the kit's.
import { readFileSync } from "node:fs";
import { join } from "node:path";

const table = JSON.parse(readFileSync(join(import.meta.dirname, "data.json"), "utf8"));
const col = (name) => {
  const i = table.columns.findIndex((c) => c.name === name);
  if (i < 0) throw new Error(`data.json has no column ${name}`);
  return i;
};
const [CODE, YEAR_COL] = [col("code"), col("year")];
const LOW = ["other_renewables_generation__twh", "bioenergy_stacked_generation__twh", "solar_generation__twh", "wind_generation__twh", "hydro_generation__twh", "nuclear_generation__twh"].map(col);
const FOSSIL = ["gas_generation__twh", "oil_generation__twh", "coal_generation__twh"].map(col);
const YEAR = 2024;

// The page's language is French: the names the table and the tooltips print.
const NAMES = {
  ALB: "Albanie", AUT: "Autriche", BLR: "Biélorussie", BEL: "Belgique", BIH: "Bosnie-Herz.",
  BGR: "Bulgarie", HRV: "Croatie", CYP: "Chypre", CZE: "Tchéquie", DNK: "Danemark",
  EST: "Estonie", FIN: "Finlande", FRA: "France", DEU: "Allemagne", GRC: "Grèce",
  HUN: "Hongrie", ISL: "Islande", IRL: "Irlande", ITA: "Italie", LVA: "Lettonie",
  LTU: "Lituanie", LUX: "Luxembourg", MLT: "Malte", MDA: "Moldavie", MNE: "Monténégro",
  NLD: "Pays-Bas", MKD: "Macédoine du N.", NOR: "Norvège", POL: "Pologne", PRT: "Portugal",
  ROU: "Roumanie", RUS: "Russie", SRB: "Serbie", SVK: "Slovaquie", SVN: "Slovénie",
  ESP: "Espagne", SWE: "Suède", CHE: "Suisse", TUR: "Turquie", UKR: "Ukraine", GBR: "Royaume-Uni",
};

// THE JOIN: `code` holds ISO alpha-3. The value is the low-carbon share of generation; a country
// whose generation is not reported (total 0) is null — drawn hollow, in no class. `low` and `total`
// ride along for the tooltip.
const rows = table.rows
  .filter((r) => Number(r[YEAR_COL]) === YEAR)
  .map((r) => {
    const low = LOW.reduce((s, i) => s + Number(r[i] || 0), 0);
    const total = low + FOSSIL.reduce((s, i) => s + Number(r[i] || 0), 0);
    return { iso: r[CODE], name: NAMES[r[CODE]], value: total > 0 ? (low / total) * 100 : null, low, total };
  });

const fr = (v, d = 1) => v.toLocaleString("fr-FR", { minimumFractionDigits: d, maximumFractionDigits: d });
const pc = (v) => `${fr(v)} %`;
const STATED = [50, 70, 94];
const FLOOR = STATED[STATED.length - 1];
const reported = rows.filter((r) => r.value !== null).sort((a, b) => b.value - a.value);
const above = reported.filter((r) => r.value >= FLOOR);
const unreported = rows.filter((r) => r.value === null);
const N = reported.length;
const lowest = reported[reported.length - 1];

export default {
  lang: "fr",
  eyebrow: "Énergie · Europe",
  rows,
  breaks: STATED,
  format: pc,
  bound: ({ lower, upper, count }) =>
    `${lower === null ? `moins de ${pc(upper)}` : upper === null ? `${pc(lower)} et plus` : `${pc(lower)} – ${pc(upper)}`} · ${count} pays`,
  ruleLabel: "Règle de classement",
  rules: {
    stated: { label: "Seuil énoncé", announce: `Seuil énoncé — les paliers de la planche, coupés à ${STATED.join(", ")} %` },
    quantiles: {
      label: "Quantiles",
      announce: "Quantiles — quatre paliers du même nombre de pays",
      note: (r) =>
        `Quantiles — ${r.classes} paliers de ${r.total / r.classes} pays. La plus foncée s'ouvre à ${pc(r.opensAt)} : ` +
        `${r.newcomers.map((c) => c.name).join(", ")} y entrent — ${r.top.length} pays au lieu de ${r.statedTop.length}, et ` +
        `${r.moved} des ${r.total} changent de palier.`,
    },
    equal: {
      label: "Intervalles égaux",
      announce: "Intervalles égaux — quatre tranches de la même largeur",
      note: (r) =>
        `Intervalles égaux — ${r.classes} tranches de ${fr(r.step)} points. La plus foncée s'ouvre à ${pc(r.opensAt)} et compte ` +
        `${r.top.length} pays, la plus claire ${r.counts[0]} — ${r.moved} des ${r.total} changent de palier.`,
    },
    jenks: {
      label: "Ruptures naturelles",
      announce: "Ruptures naturelles — les coupures de Fisher-Jenks, là où le fichier est creux",
      note: (r) =>
        `Ruptures naturelles (Fisher-Jenks) — coupures à ${r.breaks.map((b) => fr(b)).join(", ")} %, là où le fichier est creux. ` +
        `La plus foncée compte ${r.top.length} pays — ${r.moved} des ${r.total} changent de palier.`,
    },
  },
  detail: (r) =>
    `${r.name} · ${fr(r.value)} % de son électricité est bas-carbone en ${YEAR} · ${fr(r.low, 0)} TWh bas-carbone sur ${fr(r.total, 0)} · ` +
    `${r.rank}e sur ${r.of} · ` +
    (r.sameUnderAll
      ? `même palier sous les ${r.rules} règles`
      : `palier ${r.classesSeen.slice(0, -1).join(", ")} ou ${r.classesSeen[r.classesSeen.length - 1]} sur ${r.classes} selon la règle`),
  missingDetail: (r) =>
    `${r.name} · aucune production publiée pour ${YEAR} dans ce fichier — dessiné en creux, hors de toutes les règles de classement, jamais rangé dans le palier le plus bas`,
  missingLabel: "pas de donnée",
  callout:
    `Au-dessus de ${FLOOR} % : ${above.map((r) => r.name).join(", ")}. ` +
    `${unreported.length > 1 ? `${unreported.length} pays sont dessinés` : `L'${unreported[0].name}, sans donnée pour ${YEAR}, est dessinée`} ` +
    `en creux et hors des règles : le palier le plus bas est un pays à ${pc(lowest.value)}.`,
  hint:
    "La carte est vivante : molette ou boutons pour zoomer, glisser pour déplacer, flèches du clavier une fois la carte au focus. " +
    "Survolez un pays pour sa part exacte, ses TWh et son rang.",
  reading:
    `Lecture : une carte n'est pas des nombres, c'est une partition de nombres. Changez la règle qui la coupe : les ${N} pays se ` +
    "re-teintent sans bouger. Le tableau ci-dessous suit la même règle, avec ou sans JavaScript.",
  tableCaption: `Les ${N} lectures, et le palier que la règle choisie leur donne`,
  columns: ["Pays", "Part bas-carbone", "Rang", "Palier"],
  // Which countries the Mercator sentence names (the worked example's three; leave out and the kit
  // names the three it inflates most).
  inflated: ["NOR", "SWE", "FIN"],
  mercator: (m) =>
    `Carte MapTiler plate, en Web Mercator : le nord est gonflé — la ${m.names[0]}, la ${m.names[1]} et la ${m.names[2]} couvrent ` +
    `${fr(m.pageShare, 0)} % de la terre dessinée pour ${fr(m.trueShare, 0)} % de la terre réelle. Le titre compte des PAYS, pas des surfaces.`,
  title: "7 pays au-dessus de 94 % — ou 13, selon la coupure",
  limits: `Part bas-carbone — nucléaire et renouvelables — de l'électricité produite en ${YEAR}.`,
  source: `Source : Ember / Energy Institute, Statistical Review of World Energy (2025), via Our World in Data · ${YEAR} · fond MapTiler`,
  alt:
    `Une carte d'Europe sur fond MapTiler, chaque pays teinté selon la part bas-carbone de son électricité en ${YEAR}. Les teintes ` +
    `les plus foncées forment un arc au nord et à l'ouest — ${above.map((r) => r.name).join(", ")} — et une tache isolée dans les ` +
    `Balkans. Le centre et l'est de la carte restent clairs. ${unreported.length} pays est dessiné en creux, faute de donnée. Une ` +
    `commande à quatre positions recoupe les mêmes lectures selon quatre règles de classement, et la carte elle-même se zoome et se ` +
    `déplace avec les contrôles de MapTiler.`,
  // The claim checked against the drawn data (CONTRACT.md): 7 above the stated floor, 13 in the
  // darkest class under equal intervals, and an ordinary rule darkening more than the stated one.
  check({ rule }) {
    const stated = rule("stated").top.length;
    if (stated !== 7) throw new Error(`the title says 7 countries are above ${FLOOR} %; ${stated} are`);
    const equal = rule("equal").top.length;
    if (equal !== 13) throw new Error(`the title says 13 under another cut (equal intervals); ${equal} are`);
    if (rule("quantiles").top.length <= stated) throw new Error("quantiles no longer put more countries in the darkest class than the stated rule");
  },
};
