// beat.mjs for the worked example proof/scrolly-sankey-electricity-sources — "Le nucléaire de ces six
// pays est français à 84 %", as a scrolly. Every number in a card is COMPUTED: the node totals, the
// tracked source's split and each country's mix come from render-beat.mjs as `r` and are only WORDED
// here.
import { readFileSync } from "node:fs";
import { join } from "node:path";

const data = JSON.parse(readFileSync(join(import.meta.dirname, "data.json"), "utf8"));
const at = (name) => data.columns.findIndex((c) => c.name === name);

const YEAR = 2024;
// Renewables, nuclear, fossil: an order that means something.
const SOURCES = [
  { key: "Wind", label: "Éolien" },
  { key: "Solar", label: "Solaire" },
  { key: "Hydropower", label: "Hydraulique" },
  { key: "Bioenergy", label: "Bioénergie" },
  { key: "Other renewables", label: "Autres renouv." },
  { key: "Nuclear", label: "Nucléaire" },
  { key: "Gas", label: "Gaz" },
  { key: "Coal", label: "Charbon" },
  { key: "Oil", label: "Pétrole" },
];
const FRENCH = {
  France: ["France", "la France", "en France"], Germany: ["Allemagne", "l’Allemagne", "en Allemagne"], Norway: ["Norvège", "la Norvège", "en Norvège"],
  Poland: ["Pologne", "la Pologne", "en Pologne"], Sweden: ["Suède", "la Suède", "en Suède"], Switzerland: ["Suisse", "la Suisse", "en Suisse"],
};

// One ribbon per source and country, in TWh, for one year.
const rows = data.rows.filter((r) => Number(r[at("Year")]) === YEAR);
for (const r of rows) if (!FRENCH[r[at("Entity")]]) throw new Error(`no French name recorded for ${r[at("Entity")]}`);
const targets = rows.map((r) => ({ key: r[at("Entity")], label: FRENCH[r[at("Entity")]][0] }));
const flows = SOURCES.flatMap((s) => rows.map((r) => ({ from: s.key, to: r[at("Entity")], value: Number(r[at(s.key)]) })));

const one = (v) => v.toLocaleString("fr-FR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const whole = (v) => Math.round(v).toLocaleString("fr-FR");
const pct = (v) => `${one(v)} %`;
const listOf = (xs) => (xs.length === 1 ? xs[0] : `${xs.slice(0, -1).join(", ")} et ${xs[xs.length - 1]}`);
const byLabel = Object.fromEntries(Object.values(FRENCH).map((f) => [f[0], f]));
const word = (sourceLabel) => sourceLabel.toLowerCase();

export default {
  lang: "fr",
  eyebrow: "Énergie · Europe",
  sources: SOURCES,
  targets,
  flows,
  // The flow the takeaway is about; card 5 reads back from Germany.
  tracked: { from: "Nuclear", to: "France" },
  second: "Germany",
  unit: `production électrique ${YEAR}, en TWh`,
  format: one,
  formatShare: pct,
  formatWholeShare: (v) => `${Math.round(v)} %`,
  cards: {
    rails: (r) => `La production électrique de six pays européens en ${YEAR}, ${whole(r.grand)} TWh. À gauche, les neuf sources ; à droite, les six pays. Les deux côtés font le même total.`,
    tracked: (r) =>
      `Suivons le nucléaire, la première des neuf sources : ${one(r.tracked.sourceTotal)} TWh. ${one(r.tracked.value)} TWh vont ${byLabel[r.tracked.targetLabel][2]}, ${Math.round(r.tracked.ofSource)} %. Il n’en reste que pour ${listOf(r.others.map((o) => byLabel[o.label][1]))}.`,
    web: (r) => `Toutes les sources, vers tous les pays : ${r.flowCount} rubans. Ceux d’un nœud font exactement son total.`,
    first: (r) => `Remontons depuis la France : ${pct(r.first.trackedShare)} de son électricité est nucléaire.`,
    second: (r) => `Depuis l’Allemagne, deuxième producteur : aucun ruban nucléaire. D’abord ${listOf(r.second.mix.slice(0, 3).map((m) => `${word(m.label)} ${pct(m.share)}`))}.`,
  },
  // The short accent note in the header while each card is read.
  notes: {
    rails: (r) => `${whole(r.grand)} TWh de chaque côté`,
    tracked: (r) => `nucléaire : ${Math.round(r.tracked.ofSource)} % ${byLabel[r.tracked.targetLabel][2]}`,
    web: (r) => `${r.flowCount} rubans`,
    first: (r) => `${r.first.label} : ${pct(r.first.trackedShare)} nucléaire`,
    second: (r) => `${r.second.label} : ${pct(r.second.trackedShare)} nucléaire`,
  },
  title: ["Le nucléaire de ces six pays est français à 84 %", "Le nucléaire des six, français à 84 %", "Six pays, neuf sources d’électricité"],
  // The last card: how the plate reads.
  limits:
    "Lecture : chaque ruban est une source dans un pays ; les rubans d’un nœud se rejoignent exactement au total imprimé. Les rubans sont translucides, un croisement s’assombrit au lieu de cacher ce qu’il traverse.",
  source: "Source : Ember, Energy Institute – Statistical Review of World Energy (2025), via Our World in Data",
  alt: (r) =>
    `Diagramme de Sankey : neuf sources d’électricité à gauche, six pays européens à droite, ${r.flowCount} rubans larges comme les TWh produits en ${YEAR}. ` +
    `Le nucléaire, première source avec ${one(r.tracked.sourceTotal)} TWh, part à ${Math.round(r.tracked.ofSource)} % vers la France ; l’Allemagne n’en reçoit aucun.`,
  evidenceLevels: 3,
  check(r) {
    if (r.ranked[0].key !== "Nuclear") throw new Error(`card 2 says nuclear is the largest source; it is ${r.ranked[0].label}`);
    if (r.recipients[0].key !== "France") throw new Error(`the title says nuclear is French; the largest share goes to ${r.recipients[0].label}`);
    if (Math.round(r.tracked.ofSource) !== 84) throw new Error(`the title says 84 % of the nuclear is French; it is ${r.tracked.ofSource.toFixed(1)} %`);
    if (r.targets[1].key !== "Germany") throw new Error(`card 5 calls Germany the second producer; it is ${r.targets[1].label}`);
    if (r.second.trackedShare !== 0) throw new Error(`card 5 says Germany has no nuclear ribbon; it has ${r.second.trackedShare.toFixed(1)} %`);
    if (r.second.mix.slice(0, 3).map((m) => m.key).join() !== "Wind,Coal,Gas") throw new Error(`card 5 names wind, coal and gas as Germany's largest sources`);
  },
};
