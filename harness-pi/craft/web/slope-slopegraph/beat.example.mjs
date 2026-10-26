// beat.mjs for the worked example proof/web-slope-europe-lowcarbon — "All sixteen gained low-carbon
// electricity — only one overtook France", as an interactive page. Every number on the page is
// COMPUTED from data.json; each line's rank and the crossings (who passed whom, where the thread pair
// meets) are derived by render-beat.mjs and only WORDED here.
import { readFileSync } from "node:fs";
import { join } from "node:path";

const table = JSON.parse(readFileSync(join(import.meta.dirname, "data.json"), "utf8"));
const col = (name) => table.columns.findIndex((c) => c.name === name);
const FROM = 2000;
const TO = 2024;
const LOW = ["other_renewables_generation__twh", "bioenergy_stacked_generation__twh", "solar_generation__twh", "wind_generation__twh", "hydro_generation__twh", "nuclear_generation__twh"];
const FOSSIL = ["gas_generation__twh", "oil_generation__twh", "coal_generation__twh"];
const NAMES = {
  FRA: "France", DEU: "Allemagne", ESP: "Espagne", ITA: "Italie", GBR: "Royaume-Uni",
  POL: "Pologne", SWE: "Suède", NOR: "Norvège", CHE: "Suisse", AUT: "Autriche",
  NLD: "Pays-Bas", BEL: "Belgique", FIN: "Finlande", DNK: "Danemark", PRT: "Portugal",
  CZE: "Tchéquie", GRC: "Grèce", IRL: "Irlande",
};
/** Which names take a feminine past participle, so "dépassé par" / "dépassée par" is a lookup. */
const FEM = new Set(["France", "Espagne", "Italie", "Pologne", "Suède", "Norvège", "Suisse", "Autriche", "Finlande", "Grèce", "Irlande", "Tchéquie", "Belgique", "Allemagne"]);

const shareOf = (code, year) => {
  const r = table.rows.find((z) => z[col("code")] === code && Number(z[col("year")]) === year);
  const low = LOW.reduce((s, k) => s + Number(r[col(k)]), 0);
  return (low / (low + FOSSIL.reduce((s, k) => s + Number(r[col(k)]), 0))) * 100;
};
const codes = [...new Set(table.rows.map((r) => r[col("code")]))];
const all = codes.map((code) => ({ key: code, label: NAMES[code], from: shareOf(code, FROM), to: shareOf(code, TO) }));

// The claim: every country rose, and exactly one overtook France. The pair is the thread.
const france = all.find((d) => d.key === "FRA");
const overtook = all.filter((d) => d !== france && d.from < france.from && d.to > france.to);
const finland = all.find((d) => d.key === "FIN");
const lines = all.map((d) => ({ ...d, thread: d === france || d === finland }));
const biggest = all.reduce((a, b) => (b.to - b.from > a.to - a.from ? b : a));
// Where along the connector the pair meets: the gap is linear between the rails.
const crossT = (finland.from - france.from) / (finland.from - france.from - (finland.to - france.to));

const fr = (v, d = 1) => v.toLocaleString("fr-FR", { minimumFractionDigits: d, maximumFractionDigits: d });
/** Plain "1er" / "11e", never the superscript forms no house face carries. */
const ord = (n) => (n === 1 ? "1er" : `${n}e`);
const up = (r) => (r.passed.length ? `a dépassé ${r.passed.length} des ${r.count - 1} autres (${r.passed.join(", ")})` : "n'a dépassé personne");
const down = (r) => `${FEM.has(r.label) ? "dépassée" : "dépassé"} par ${r.passedBy.length ? `${r.passedBy.length} (${r.passedBy.join(", ")})` : "personne"}`;

export default {
  lang: "fr",
  eyebrow: "Énergie · Europe",
  lines,
  rails: { left: String(FROM), right: String(TO) },
  subject: "FIN",
  format: (v) => `${fr(v, 0)} %`,
  // What a connector answers when it is hovered, tapped or tabbed to.
  detail: (r) =>
    `${r.label} · de ${fr(r.from)} % en ${r.left} à ${fr(r.to)} % en ${r.right} · +${fr(r.gain)} points · ` +
    `${ord(r.rank)} gain sur ${r.count}` +
    (r.passed.length ? ` · a dépassé ${r.passed.join(", ")}` : " · n'a dépassé personne"),
  // The yardstick: its legend, its untouched option, and each line's words.
  levelLabel: "Mesurer les seize à l'aune de",
  noneLabel: "Chaque pays pour lui-même",
  announce: (r) => `${r.label} — de ${fr(r.from)} % en ${r.left} à ${fr(r.to)} % en ${r.right}, ${ord(r.rank)} gain sur ${r.count} ; ${up(r)} ; ${down(r)}`,
  note: (r) => `${r.label} · de ${fr(r.from)} % en ${r.left} à ${fr(r.to)} % en ${r.right} · ${ord(r.rank)} gain sur ${r.count} · ${up(r)} · ${down(r)}`,
  // The sentence the ring at the thread pair's crossing owes the reader.
  crossingNote: (c) =>
    `${c.above} était ${fr(c.gap)} points sous la ${c.below} en ${c.left} et passe devant en ${c.right} ` +
    `(${fr(c.aboveTo)} % contre ${fr(c.belowTo)} %). Le seul croisement, et il n'arrive qu'à ` +
    `${fr(c.pct, 0)} % du trajet : le cercle est posé là. Un croisement se calcule.`,
  title: "Les seize ont tous gagné de l'électricité bas-carbone — un seul a dépassé la France",
  limits:
    `Part bas-carbone de l'électricité, ${FROM} à gauche et ${TO} à droite. La pente porte le sens, ` +
    `les nombres la grandeur — d'où l'absence d'axe entre les rails.`,
  reading:
    `Lecture : survolez ou tabulez une ligne pour son gain, son rang et qui elle a dépassé. Ou ` +
    `choisissez un pays ci-dessus : ses deux niveaux se posent en travers des rails, et les quinze ` +
    `autres se lisent contre lui.`,
  source: `Source : Ember, Energy Institute — Statistical Review of World Energy (2025), via Our World in Data · ${FROM} et ${TO}`,
  alt:
    `Deux rails verticaux, ${FROM} à gauche et ${TO} à droite, reliés par ${lines.length} ` +
    `segments, un par pays. Tous montent. Celui de ${finland.label} part de ${fr(finland.from)} % ` +
    `— ${fr(france.from - finland.from)} points sous la ${france.label} — et arrive à ` +
    `${fr(finland.to)} %, au-dessus d'elle ; les deux lignes ne se coupent qu'à ` +
    `${fr(crossT * 100, 0)} % du trajet. ${biggest.label} a la pente la plus raide, ` +
    `+${fr(biggest.to - biggest.from)} points.`,
  evidenceLevels: 3,
  check() {
    const fell = all.filter((d) => d.to <= d.from);
    if (fell.length) throw new Error(`the title says all rose; ${fell.map((d) => d.label).join(", ")} did not`);
    if (all.length !== 16) throw new Error(`the title says sixteen; the data holds ${all.length}`);
    if (overtook.length !== 1) throw new Error(`the title says one country overtook France; ${overtook.length} did`);
    if (overtook[0] !== finland) throw new Error(`the one that overtook France is ${overtook[0].label}, not Finland`);
  },
};
