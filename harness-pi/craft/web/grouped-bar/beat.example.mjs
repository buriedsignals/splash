// beat.mjs for the worked example proof/web-grouped-bar-wind-vs-solar — "Switzerland is the only one
// of the six where solar beats wind", as an interactive page. Every number on the page is COMPUTED
// from data.json; each group's ranks and ratio are computed by render-beat.mjs and only WORDED here.
import { readFileSync } from "node:fs";
import { join } from "node:path";

const data = JSON.parse(readFileSync(join(import.meta.dirname, "data.json"), "utf8"));
const at = (name) => data.columns.findIndex((c) => c.name === name);

const YEAR = 2024;
const NAMES = { FRA: "France", DEU: "Allemagne", NOR: "Norvège", POL: "Pologne", SWE: "Suède", CHE: "Suisse" };
const SOURCES = ["Other renewables", "Bioenergy", "Solar", "Wind", "Hydropower", "Nuclear", "Gas", "Oil", "Coal"];

// The measure the takeaway speaks of: each source's SHARE of the country's own generation in 2024.
// The TWh behind each share ride along on the group: detail() prints them.
const groups = data.rows
  .filter((r) => NAMES[r[at("Code")]] && r[at("Year")] === YEAR)
  .map((r) => {
    const total = SOURCES.reduce((s, c) => s + r[at(c)], 0);
    return {
      name: NAMES[r[at("Code")]],
      first: (r[at("Wind")] / total) * 100,
      second: (r[at("Solar")] / total) * 100,
      firstTwh: r[at("Wind")],
      secondTwh: r[at("Solar")],
      total,
    };
  });

const reversals = groups.filter((g) => g.second > g.first);
const subject = reversals[0];

const fr = (v, d = 1) => v.toLocaleString("fr-FR", { minimumFractionDigits: d, maximumFractionDigits: d });
const ratioPhrase = (g) =>
  g.ratio >= 1 ? `son solaire vaut ${fr(g.ratio, 1)} fois son éolien` : `son solaire vaut ${fr(g.ratio * 100, 0)} % de son éolien`;

export default {
  lang: "fr",
  eyebrow: "Énergie · Europe",
  groups,
  // The first series is drawn in a tint of the accent, the second — the one the takeaway is carried by — in the accent.
  firstName: "éolien",
  secondName: "solaire",
  subject: "Suisse",
  unit: "%",
  format: (v) => fr(v),
  // What a group answers when it is hovered, tapped or tabbed to.
  detail: (g) =>
    `${g.name} · ${YEAR} · éolien ${fr(g.first)} % = ${fr(g.firstTwh, 1)} TWh, solaire ${fr(g.second)} % = ${fr(g.secondTwh, 1)} TWh · ` +
    `sur une production totale de ${fr(g.total, 0)} TWh`,
  // The "measure against" control: its legend, its untouched option, and each option's words.
  levelLabel: "Mesurer les six à l'aune de",
  noneLabel: "Chaque pays pour lui-même",
  announce: (g) => `${g.name} — éolien ${fr(g.first)} %, ${g.firstRank}e sur ${g.count} ; solaire ${fr(g.second)} %, ${g.secondRank}e sur ${g.count}`,
  note: (g) =>
    `${g.name} · éolien ${fr(g.first)} % — ${g.firstRank}e sur ${g.count} · solaire ${fr(g.second)} % — ${g.secondRank}e sur ${g.count} · ${ratioPhrase(g)}`,
  title: "La Suisse est la seule des six où le solaire dépasse l'éolien",
  limits:
    `Part de l'éolien et du solaire dans la production d'électricité de chaque pays en ${YEAR}. Les ` +
    `deux barres d'un pays se touchent, et l'écart avec le pays suivant est plus large qu'une barre : ` +
    `c'est ce qui fait lire des GROUPES plutôt qu'une file de barres alternées.`,
  reading:
    `Lecture : choisissez un pays pour poser ses deux niveaux en travers des cinq autres — la ` +
    `comparaison d'un groupe à l'autre que la séparation des groupes rend justement difficile. ` +
    `Survolez, touchez ou tabulez un groupe pour les TWh derrière chaque part.`,
  source: `Source : Ember, Energy Institute — Statistical Review of World Energy (2025), via Our World in Data · ${YEAR}`,
  alt:
    `Six paires de colonnes, une paire par pays, mesurant la part de l'éolien et celle du ` +
    `solaire dans l'électricité de ${YEAR}. Dans cinq paires la colonne éolienne est la plus ` +
    `haute ; dans celle de la ${subject.name}, c'est la colonne solaire, ${fr(subject.second)} % ` +
    `contre ${fr(subject.first)} %.`,
  evidenceLevels: 2,
  check() {
    if (groups.length !== 6) throw new Error(`the title speaks of six countries; the data holds ${groups.length}`);
    if (reversals.length !== 1 || reversals[0].name !== "Suisse")
      throw new Error(`solar beats wind in ${reversals.map((g) => g.name).join(", ") || "no country"}, not in Switzerland alone`);
  },
};
