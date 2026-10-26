// beat.mjs for the worked example proof/web-bullet-low-carbon-share — "Seule des six sous la moitié,
// la Pologne est celle qui a le plus gagné depuis 2015", as an interactive page. Every number on the
// page is COMPUTED from data.json; each row's gap and verdict under each target, and which rows clear
// it, are computed by render-beat.mjs and only WORDED here.
import { readFileSync } from "node:fs";
import { join } from "node:path";

const table = JSON.parse(readFileSync(join(import.meta.dirname, "data.json"), "utf8"));
const col = (name) => table.columns.findIndex((c) => c.name === name);
const BEFORE = 2015;
const AFTER = 2024;
const THRESHOLD = 50;
const LOW_CARBON = ["Nuclear", "Hydropower", "Wind", "Solar", "Bioenergy", "Other renewables"];
const FOSSIL = ["Coal", "Gas", "Oil"];
const NAMES = { POL: "Pologne", DEU: "Allemagne", FRA: "France", CHE: "Suisse", NOR: "Norvège", SWE: "Suède" };
const SOURCE_FR = { Nuclear: "nucléaire", Hydropower: "hydraulique", Wind: "éolien", Solar: "solaire", Bioenergy: "biomasse", "Other renewables": "autres renouvelables" };

// The low-carbon share of each country's generation, in percent, for one year.
const shareOf = (code, year) => {
  const row = table.rows.find((r) => r[col("Code")] === code && Number(r[col("Year")]) === year);
  const low = LOW_CARBON.reduce((s, k) => s + Number(row[col(k)]), 0);
  const total = low + FOSSIL.reduce((s, k) => s + Number(row[col(k)]), 0);
  return { share: (low / total) * 100, parts: LOW_CARBON.map((k) => ({ key: k, pct: (Number(row[col(k)]) / total) * 100 })) };
};
const rows = Object.entries(NAMES).map(([code, name]) => ({ name, before: shareOf(code, BEFORE).share, after: shareOf(code, AFTER).share }));
const partsOf = Object.fromEntries(Object.entries(NAMES).map(([code, name]) => [name, shareOf(code, AFTER).parts.filter((p) => p.pct >= 0.5).sort((a, b) => b.pct - a.pct)]));

const byChange = [...rows].sort((a, b) => b.after - b.before - (a.after - a.before));
const mover = byChange[0];
const under = rows.filter((r) => r.after < THRESHOLD);
const leader = rows.reduce((a, b) => (b.after > a.after ? b : a));

const fr = (v, d = 1) => v.toLocaleString("fr-FR", { minimumFractionDigits: d, maximumFractionDigits: d });
const pts = (v) => `${v >= 0 ? "+" : "−"}${fr(Math.abs(v))} pts`;

export default {
  lang: "fr",
  eyebrow: "Énergie · Europe",
  rows,
  subject: mover.name,
  format: (v) => `${fr(v)} %`,
  // What one row answers when hovered, tapped or tabbed to (the page prints the name before it).
  detail: (r) =>
    `${fr(r.after)} % bas-carbone en ${AFTER} (${fr(r.before)} % en ${BEFORE}, ${pts(r.change)}) · ` +
    partsOf[r.name].map((p) => `${SOURCE_FR[p.key]} ${fr(p.pct)} %`).join(", "),
  // The chip on each row under each target.
  verdict: (v) => (v.verdict === "level" ? `${fr(v.after)} % · pile la cible` : `${fr(v.after)} % · ${pts(v.gap)}`),
  // The line the takeaway names, its option label (words of the title) and its name on the rule.
  threshold: THRESHOLD,
  thresholdLabel: "la moitié",
  thresholdNote: "la moitié",
  // The control.
  benchmarkLabel: "Mesurer chaque pays contre",
  ownLabel: `son propre ${BEFORE}`,
  ownAnnounce: `son propre ${BEFORE} — chaque pays jugé contre sa propre part de ${BEFORE}, la cible du graphique`,
  medianLabel: "la médiane des six",
  leaderLabel: (l) => `la ${l.name}`,
  announce: (t) =>
    `${t.label} — ` +
    (t.key === "threshold" ? `${THRESHOLD} % de la production, la ligne que le titre nomme` : `${fr(t.value)} %, calculée sur les ${t.count} pays du graphique`) +
    ` · ${t.clears} sur ${t.count} la franchissent`,
  note: (t) => {
    if (t.key === "threshold") {
      const short = t.verdicts.filter((v) => v.verdict === "short");
      return (
        `${t.clears} des ${t.count} franchissent la moitié ; ${short.length === 1 ? `seule la ${short[0].name} reste dessous` : `${short.length} restent dessous`}, ` +
        `à ${fr(Math.abs(short[0].gap))} pts. La plus juste au-dessus : ${t.nearestOver.name}, ${pts(t.nearestOver.gap)}.`
      );
    }
    if (t.key === "median")
      return (
        `Médiane des ${t.count} en ${AFTER} : ${fr(t.median)} %. ${t.clears} sur ${t.count} la franchissent. ` +
        `La ${t.nearestShort.name} passe dessous de ${fr(Math.abs(t.nearestShort.gap))} pts, la ${t.subject.name} de ${fr(Math.abs(t.subject.gap))}.`
      );
    const first = t.verdicts[0];
    const last = t.verdicts[t.verdicts.length - 1];
    return (
      `Contre la ${t.leader.name}, ${t.clears} sur ${t.count} : elle-même. Retirez l'étalon et les cinq autres se rangent à l'envers du gain depuis ${BEFORE} — ` +
      `la ${first.name}, première au gain, est la plus loin (${fr(Math.abs(first.gap))} pts) ; la ${last.name}, dernière, la plus proche (${fr(Math.abs(last.gap))} pts).`
    );
  },
  title: "Seule des six sous la moitié, la Pologne est celle qui a le plus gagné depuis 2015",
  limits:
    `Part du nucléaire et de toutes les renouvelables dans la production de chaque pays ; à droite de la barre, le fossile. ` +
    `Le trait est la CIBLE que vous choisissez — aucune n'est une politique.`,
  reading:
    `Lecture : changez de cible. Les barres ne bougent pas, c'est l'étalon qui change — le trait glisse et l'écart se redessine : ` +
    `plein au-delà, creux en deçà. Survolez une ligne pour ses sources.`,
  source: `Source : Ember, Energy Institute — Statistical Review of World Energy (2025), via Our World in Data · ${BEFORE} et ${AFTER}`,
  alt:
    `${rows.length} pistes horizontales allant de 0 à 100 %, une par pays, mesurant la part de l'électricité bas-carbone en ${AFTER}. ` +
    `La ${mover.name} passe de ${fr(mover.before)} % à ${fr(mover.after)} %, le plus fort gain des ${rows.length}, et reste la seule dont la barre ` +
    `n'atteint pas la moitié de la piste. Sur chaque ligne, un trait marque la cible et un bloc marque l'écart à cette cible : plein au-delà, ` +
    `creux en deçà. Un contrôle au-dessus change la cible des lignes à la fois — leur propre ${BEFORE}, la moitié, la médiane, ou la ${leader.name}.`,
  evidenceLevels: 3,
  check() {
    if (mover.name !== "Pologne") throw new Error(`the biggest gain since ${BEFORE} is ${mover.name}'s, not Poland's`);
    if (under.length !== 1 || under[0].name !== mover.name) throw new Error(`under ${THRESHOLD} % are ${under.map((r) => r.name).join(", ") || "none"}, not Poland alone`);
    // The leader's note says the other five rank exactly backwards by distance to it.
    const others = byChange.filter((r) => r.name !== leader.name);
    const byDistance = [...others].sort((a, b) => leader.after - b.after - (leader.after - a.after));
    if (others.map((r) => r.name).join() !== byDistance.map((r) => r.name).join())
      throw new Error(`against ${leader.name}, the other countries no longer rank exactly backwards to their gain`);
  },
};
