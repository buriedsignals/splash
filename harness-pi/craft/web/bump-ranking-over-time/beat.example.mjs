// beat.mjs for the worked example proof/web-bump-emitter-rank — "L'Inde est passée du 8e au 3e rang
// mondial des émetteurs de CO₂", as an interactive page. The ranking is computed by render-beat.mjs over
// EVERY country in data.json, and so is every walk and every crossing; this file gives the rows and
// only WORDS each reading.
import { readFileSync } from "node:fs";
import { join } from "node:path";

const table = JSON.parse(readFileSync(join(import.meta.dirname, "data.json"), "utf8"));
const col = (name) => table.columns.findIndex((c) => c.name === name);
const [ENTITY, CODE, YEAR, VALUE] = [col("Entity"), col("Code"), col("Year"), col("Annual CO₂ emissions")];

// Every country (three-letter code — the aggregates have none) at every year: the WHOLE ranking.
const countries = table.rows.filter((r) => /^[A-Z]{3}$/.test(String(r[CODE])) && Number.isFinite(Number(r[VALUE])));
const rows = countries.map((r) => ({ name: r[ENTITY], year: Number(r[YEAR]), value: Number(r[VALUE]) }));
const codeOf = Object.fromEntries(countries.map((r) => [r[ENTITY], r[CODE]]));

// French names, and the same with their article for a sentence. Written out: French articles are not
// a function of the string. A country with no name filed keeps the source's.
const NAMES = {
  IND: "Inde", USA: "États-Unis", CHN: "Chine", RUS: "Russie", JPN: "Japon", DEU: "Allemagne", UKR: "Ukraine", GBR: "Royaume-Uni",
  IDN: "Indonésie", IRN: "Iran", SAU: "Arabie saoudite", KOR: "Corée du Sud", CAN: "Canada", MEX: "Mexique", BRA: "Brésil",
  TUR: "Turquie", ITA: "Italie", FRA: "France", POL: "Pologne", ZAF: "Afrique du Sud", AUS: "Australie", ESP: "Espagne",
  THA: "Thaïlande", VNM: "Viêt Nam", MYS: "Malaisie", EGY: "Égypte", KAZ: "Kazakhstan", ARE: "Émirats arabes unis", PAK: "Pakistan", NGA: "Nigeria",
};
const THE = {
  IND: "l'Inde", USA: "les États-Unis", CHN: "la Chine", RUS: "la Russie", JPN: "le Japon", DEU: "l'Allemagne", UKR: "l'Ukraine",
  GBR: "le Royaume-Uni", IDN: "l'Indonésie", IRN: "l'Iran", SAU: "l'Arabie saoudite", KOR: "la Corée du Sud", CAN: "le Canada",
  MEX: "le Mexique", BRA: "le Brésil", TUR: "la Turquie", ITA: "l'Italie", FRA: "la France", POL: "la Pologne", ZAF: "l'Afrique du Sud",
  AUS: "l'Australie", ESP: "l'Espagne", THA: "la Thaïlande", VNM: "le Viêt Nam", MYS: "la Malaisie", EGY: "l'Égypte",
  KAZ: "le Kazakhstan", ARE: "les Émirats arabes unis", PAK: "le Pakistan", NGA: "le Nigeria",
};
const display = (entity) => NAMES[codeOf[entity]] ?? entity;
const byDisplay = Object.fromEntries(Object.keys(NAMES).map((code) => [NAMES[code], THE[code]]));
const the = (name) => byDisplay[name] ?? name;
const capital = (s) => s.charAt(0).toUpperCase() + s.slice(1);

const fr = (v, d = 2) => v.toLocaleString("fr-FR", { minimumFractionDigits: d, maximumFractionDigits: d });
const ord = (n) => (n === 1 ? "1er" : `${n}e`);

// The subject's rank at the first and last year, and the countries it passed (for check()).
const years = [...new Set(rows.map((r) => r.year))].sort((a, b) => a - b);
const rankIn = (name, year) => rows.filter((r) => r.year === year).sort((a, b) => b.value - a.value).findIndex((r) => r.name === name) + 1;
const SUBJECT = "India";
const from = rankIn(SUBJECT, years[0]);
// The lines drawn: the top five at the first or the last year, and the subject (as the render draws).
const topAt = (year) => rows.filter((r) => r.year === year).sort((a, b) => b.value - a.value).slice(0, 5).map((r) => r.name);
const drawn = new Set([...topAt(years[0]), ...topAt(years[years.length - 1]), SUBJECT]);
const to = rankIn(SUBJECT, years[years.length - 1]);

export default {
  lang: "fr",
  eyebrow: "Climat · Monde",
  rows,
  subject: SUBJECT,
  display,
  // The labels at both ends of every line.
  rankLabel: (r) => `${ord(r.rank)} ${r.name}`,
  // What one year of the subject answers.
  detail: (m) =>
    `${m.name} · ${m.year} · ${ord(m.rank)} mondial · ${fr(m.value / 1e9)} Gt` +
    (m.above ? ` · derrière ${m.above}` : " · en tête") +
    (m.below ? `, devant ${m.below}` : ""),
  // A caption on the subject's line where it passed a drawn country.
  passedLabel: (c) => `dépasse ${c.name} · ${c.year}`,
  // The follow control.
  followLabel: "Suivre une ligne",
  noneLabel: (n) => `Les ${n.count} lignes`,
  optionLabel: (l) => the(l.name),
  announce: (w) => `Suivre ${the(w.name)} de ${w.first} à ${w.last}`,
  note: (w) => {
    const walk = w.runs.map((run) => `${ord(run.position)} ${run.from === run.to ? `en ${run.from}` : `de ${run.from} à ${run.to}`}`).join(", ");
    const moved = w.net === 0 ? `même rang qu'en ${w.first}` : w.net > 0 ? `${w.net} rang${w.net > 1 ? "s" : ""} gagné${w.net > 1 ? "s" : ""}` : `${-w.net} rang${-w.net > 1 ? "s" : ""} perdu${-w.net > 1 ? "s" : ""}`;
    const listed = (set) => set.map((c) => `${the(c.name)} (${c.year})`).join(", ");
    return [
      `${capital(the(w.name))} : ${walk} — ${moved}.`,
      w.overtakenBy.length ? `Se fait dépasser par ${listed(w.overtakenBy)}.` : "",
      w.passed.length ? `Dépasse ${listed(w.passed)}.` : "",
      w.undrawn ? `${w.undrawn} de ces pays ${w.undrawn > 1 ? "n'ont" : "n'a"} aucune ligne sur ce graphique.` : "",
    ].filter(Boolean).join(" ");
  },
  crossingText: (c) => `${c.year} · ${c.direction === "passed" ? "dépasse" : "se fait dépasser par"} ${the(c.name)}`,
  title: "L'Inde est passée du 8e au 3e rang mondial des émetteurs de CO₂",
  limits:
    `La position verticale est un RANG, jamais une valeur : une ligne qui monte a dépassé quelqu'un, elle n'a pas forcément plus émis. ` +
    `${drawn.size} pays — les cinq premiers en ${years[0]} ou en ${years[years.length - 1]} — sur les 10 premiers rangs mondiaux ; les rangs vides sont ` +
    `tenus par des pays que ce graphique ne dessine pas.`,
  reading:
    `Lecture : survolez ou tabulez une année pour le rang de l'Inde, ce qu'elle a émis et ses voisins au classement. Suivez une ligne pour ` +
    `lire son rang année après année et chaque pays qui la dépasse — y compris ceux qui n'ont aucune ligne ici.`,
  source: `Source : Global Carbon Budget 2025, via Our World in Data · ${years[0]}-${years[years.length - 1]}, classement calculé sur les ${rows.filter((r) => r.year === years[years.length - 1]).length} pays du fichier`,
  alt:
    `${drawn.size} lignes de rang, une par pays, de ${years[0]} à ${years[years.length - 1]}, rang 1 en haut. La ligne de l'Inde part du ${ord(from)} rang ` +
    `et monte jusqu'au ${ord(to)}. Chaque extrémité porte le nom du pays et son rang écrit en toutes lettres.`,
  evidenceLevels: 3,
  check() {
    if (from !== 8 || to !== 3) throw new Error(`India went from rank ${from} to rank ${to}, not from 8 to 3`);
  },
};
