// beat.mjs for the worked example proof/web-small-multiples-solar-eu-six — "France multiplied its
// solar share by 40 and stays the flattest of the six", as an interactive page. Every number on the
// page is COMPUTED from data.json; the crossings the carry control reveals (who crosses whom, the
// longest run, each panel's verdict) are computed by render-beat.mjs and only WORDED here.
import { readTable, series } from "./series.mjs";

const table = readTable(import.meta.dirname);
const ENTITY = table.columns.findIndex((c) => c.name === "Code");

/** Each country's French name, and the forms the sentences need: with its determiner, lowercase for
 *  a list and capitalised to open a sentence. Written out, because "l'Espagne" and "la Pologne" are
 *  not a function of anything. */
const NAMES = {
  FRA: { name: "France", det: "la France", Det: "La France" },
  DEU: { name: "Allemagne", det: "l'Allemagne", Det: "L'Allemagne" },
  ITA: { name: "Italie", det: "l'Italie", Det: "L'Italie" },
  POL: { name: "Pologne", det: "la Pologne", Det: "La Pologne" },
  ROU: { name: "Roumanie", det: "la Roumanie", Det: "La Roumanie" },
  ESP: { name: "Espagne", det: "l'Espagne", Det: "L'Espagne" },
};
const byName = Object.fromEntries(Object.values(NAMES).map((n) => [n.name, n]));

const codes = [...new Set(table.rows.map((r) => r[ENTITY]))];
// One panel per country: its whole series, the solar share of its own electricity, in %.
const panels = codes.map((code) => ({ name: NAMES[code].name, series: series(table, { x: "Year", y: "Solar", where: { Code: code } }) }));

const first = (p) => p.series[0].value;
const last = (p) => p.series[p.series.length - 1].value;
const ranked = [...panels].sort((a, b) => last(b) - last(a));
const highest = ranked[0];
const lowest = ranked[ranked.length - 1];
// A factor needs a start above zero: a country that started at 0 % has none.
const factorOf = (p) => (first(p) > 0 ? last(p) / first(p) : 0);
const fastest = panels.reduce((a, b) => (factorOf(b) > factorOf(a) ? b : a));
const factor = factorOf(fastest);
const years = highest.series.map((s) => s.year);
const [y0, y1] = [years[0], years[years.length - 1]];
const ceiling = Math.ceil(Math.max(...panels.flatMap((p) => p.series.map((s) => s.value))));

// The years Germany changes side against Spain — the alt text's one worked crossing.
const deu = panels.find((p) => p.name === "Allemagne");
const deuTurns = deu.series.filter((s, i) => i > 0 && (s.value > highest.series[i].value) !== (deu.series[i - 1].value > highest.series[i - 1].value)).map((s) => s.year);

const fr = (v, d = 1) => v.toLocaleString("fr-FR", { minimumFractionDigits: d, maximumFractionDigits: d });
/** 1re, 2e — never the superscript forms, which no house face carries. */
const rank = (n) => (n === 1 ? "1re" : `${n}e`);
const det = (name) => byName[name].det;

export default {
  lang: "fr",
  eyebrow: "Énergie · Europe",
  panels,
  ceiling,
  thread: [highest.name, fastest.name],
  format: (v) => `${fr(v)} %`,
  // What a panel answers when it is hovered, tapped or tabbed to.
  detail: (p) => {
    const passedOne = p.series.find((s) => s.value >= 1);
    return (
      `${p.name} · ${fr(p.from, 2)} % en ${p.firstYear}, ${fr(p.to)} % en ${p.lastYear}` +
      (p.factor ? ` · part multipliée par ${fr(p.factor, 0)}` : " · partie de zéro") +
      ` · ${rank(p.rank)} part des six en ${p.lastYear}` +
      (passedOne
        ? passedOne.year === p.firstYear
          ? " · déjà au-dessus de 1 % au départ"
          : ` · a passé 1 % en ${passedOne.year}`
        : " · n'a jamais atteint 1 %")
    );
  },
  // The carry control: its legend, the untouched grid, and each carried country's words.
  carryLabel: "Poser un pays dans les six cadres",
  noneLabel: "la grille seule",
  noneAnnounce: "la grille seule : six panneaux, une seule échelle, aucune comparaison posée dedans",
  optionLabel: (name) => det(name),
  announce: (g) =>
    `Poser ${det(g.name)} dans les six cadres : ${g.crossers.length} des ${g.others} autres pays ` +
    `changent de côté face à elle au moins une fois entre ${g.firstYear} et ${g.lastYear}`,
  note: (g) =>
    `${byName[g.name].Det} : ${fr(g.value)} % en ${g.lastYear}, ${rank(g.rank)} des six · ` +
    `${g.crossers.length} des ${g.others} autres la croisent (${g.crossers.map(det).join(", ")}), ` +
    `${g.always.length} restent devant, ${g.never.length} jamais · ${det(g.longest.name)} a tenu ` +
    `${g.longest.length} ans d'affilée, de ${g.longest.from} à ${g.longest.to}.`,
  // The line each panel prints under itself against the carried country.
  verdict: (v) => {
    if (v.self) return "le pays posé";
    if (v.turns.length === 0) return v.aboveFirst ? `au-dessus les ${v.years} années` : "jamais au-dessus";
    if (v.turns.length === 1) return v.aboveLast ? `au-dessus depuis ${v.turns[0]}` : `au-dessus jusqu'en ${v.turns[0] - 1}`;
    if (v.turns.length === 2) return `${v.aboveFirst ? "en dessous" : "au-dessus"} de ${v.turns[0]} à ${v.turns[1] - 1}`;
    return `croise en ${v.turns.slice(0, -1).join(", ")} et ${v.turns[v.turns.length - 1]}`;
  },
  sharedNote: `Partagé : 0 à ${ceiling} %, ${y0}-${y1}. Répété : le nom, la part finale, et le verdict face au pays posé.`,
  title: "La France a multiplié sa part solaire par 40 et reste la plus plate des six",
  limits:
    `Un panneau par pays, part du solaire dans l'électricité produite, en %. Un facteur et une ` +
    `quantité sont deux questions différentes : l'échelle commune ne répond qu'à la seconde, et la ` +
    `platitude d'un panneau EST sa réponse.`,
  reading:
    `Lecture : posez un pays dans les six cadres — il entre en silhouette dans chacun, qui dit quand ` +
    `il est passé devant. Survolez ou tabulez un panneau pour ses deux bouts, son facteur et son rang.`,
  source: `Source : Ember, Energy Institute — Statistical Review of World Energy (2025), via Our World in Data · ${y0}-${y1}`,
  alt:
    `Une grille de ${panels.length} panneaux, un par pays, tous à la même échelle de 0 à ` +
    `${ceiling} % et sur les mêmes années. Celui de ${det(highest.name)} monte de ` +
    `${fr(first(highest), 2)} à ${fr(last(highest))} % et remplit son panneau ; celui de ` +
    `${det(lowest.name)} reste une ligne presque plate au bas du sien, à ${fr(last(lowest))} %. Le ` +
    `lecteur peut poser l'un des six en silhouette dans les six cadres : posée ${det(highest.name)}, ` +
    `${deuTurns.join(" et ")} sont les années où l'Allemagne change de côté face à elle.`,
  evidenceLevels: 3,
  check() {
    const fell = panels.filter((p) => last(p) <= first(p));
    if (fell.length) throw new Error(`${fell.map((p) => p.name).join(", ")} did not rise`);
    if (fastest.name !== "France") throw new Error(`the largest factor is ${fastest.name}'s, not France's`);
    if (Math.round(factor) !== 40) throw new Error(`France's factor rounds to ${Math.round(factor)}, not 40`);
    if (lowest.name !== "France") throw new Error(`the lowest last share is ${lowest.name}'s, not France's`);
  },
};
