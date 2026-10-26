// beat.mjs for the worked example proof/web-gantt-top-ten-tenure — "6 countries never left the world's
// top 10 emitters since 1990", as an interactive page whose origin the reader moves. Every number on
// the page is COMPUTED from data.json; the tenures, gaps, ranks and the three alignments are computed
// by render-beat.mjs and only WORDED here.
import { readFileSync } from "node:fs";
import { join } from "node:path";

const table = JSON.parse(readFileSync(join(import.meta.dirname, "data.json"), "utf8"));
const col = (name) => table.columns.findIndex((c) => c.name === name);
const [CODE, YEAR, VALUE] = [col("Code"), col("Year"), col("Annual CO₂ emissions")];
const TOP = 10;
const NAMES = {
  CHN: "Chine", USA: "États-Unis", IND: "Inde", RUS: "Russie", JPN: "Japon", DEU: "Allemagne", GBR: "Royaume-Uni", UKR: "Ukraine", ITA: "Italie",
  KOR: "Corée du Sud", CAN: "Canada", MEX: "Mexique", IRN: "Iran", SAU: "Arabie saoudite", IDN: "Indonésie", POL: "Pologne", ZAF: "Afrique du Sud",
  FRA: "France", BRA: "Brésil", AUS: "Australie", KAZ: "Kazakhstan", TUR: "Turquie", ESP: "Espagne", KWT: "Koweït", VNM: "Viêt Nam", THA: "Thaïlande",
};
// The article every name takes: the pointer's answer is a sentence, not a list.
const ARTICLE = {
  CHN: "la ", USA: "les ", IND: "l'", RUS: "la ", JPN: "le ", DEU: "l'", GBR: "le ", UKR: "l'", ITA: "l'", KOR: "la ", CAN: "le ", IRN: "l'", SAU: "l'",
  IDN: "l'", FRA: "la ", KWT: "le ", MEX: "le ", POL: "la ", ZAF: "l'", BRA: "le ", AUS: "l'", KAZ: "le ", TUR: "la ", ESP: "l'", VNM: "le ", THA: "la ",
};

// The ranking, year by year, over countries only (ISO-3 codes; aggregates are left out).
const rows3 = table.rows.filter((r) => /^[A-Z]{3}$/.test(r[CODE]) && Number.isFinite(Number(r[VALUE])));
const years = [...new Set(rows3.map((r) => Number(r[YEAR])))].sort((a, b) => a - b);
const [FIRST, LAST] = [years[0], years.at(-1)];
const heldIn = new Map();
const bestRank = new Map();
for (const y of years)
  rows3.filter((r) => Number(r[YEAR]) === y).sort((a, b) => Number(b[VALUE]) - Number(a[VALUE])).slice(0, TOP).forEach((r, i) => {
    const c = r[CODE];
    if (!heldIn.has(c)) heldIn.set(c, []);
    heldIn.get(c).push(y);
    bestRank.set(c, Math.min(bestRank.get(c) ?? Infinity, i + 1));
  });
// Each member's held years cut into runs of consecutive years.
const runsOf = (held) => {
  const out = [];
  for (const y of held.sort((a, b) => a - b)) {
    const open = out.at(-1);
    if (open && open.to === y - 1) open.to = y;
    else out.push({ from: y, to: y });
  }
  return out;
};
// Ordered by first year, then tenure, then best rank: properties of the data, the same under every origin.
const rows = [...heldIn]
  .map(([code, held]) => ({ key: code, label: NAMES[code] ?? code, runs: runsOf(held), bestRank: bestRank.get(code) }))
  .sort((a, b) => a.runs[0].from - b.runs[0].from || b.runs.reduce((s, r) => s + r.to + 1 - r.from, 0) - a.runs.reduce((s, r) => s + r.to + 1 - r.from, 0) || a.bestRank - b.bestRank || a.key.localeCompare(b.key));
const tenure = (r) => r.runs.reduce((s, x) => s + x.to + 1 - x.from, 0);
const whole = rows.filter((r) => tenure(r) === years.length);
const oneYear = rows.filter((r) => tenure(r) === 1);

const the = (r) => `${ARTICLE[r.key]}${r.label}`;
const The = (r) => `${ARTICLE[r.key][0].toUpperCase()}${ARTICLE[r.key].slice(1)}${r.label}`;
const of_ = (r) => ({ "le ": "du ", "la ": "de la ", "les ": "des ", "l'": "de l'" })[ARTICLE[r.key]] + r.label;
const ans = (n) => `${n} an${n > 1 ? "s" : ""}`;

export default {
  lang: "fr",
  eyebrow: "Climat · Monde",
  rows,
  subjects: whole.map((r) => r.key),
  first: FIRST,
  last: LAST,
  tenureLabel: (r) => ans(r.years),
  // What a row answers, true in every state: its periods, its absences, its best rank, its entry.
  detail: (r) => {
    const standing = `${r.rank}${r.rank === 1 ? "re" : "e"} tenure la plus longue` +
      (r.ties.length === 1 ? ` à égalité avec ${the(rows.find((o) => o.label === r.ties[0]))}` : r.ties.length > 1 ? ` à égalité avec ${r.ties.length} autres` : "");
    return `${r.label} · ${ans(r.years)} tenus sur ${r.count} · ${standing} · ` +
      r.runs.map((s) => (s.from === s.to ? `${s.from}` : `${s.from}–${s.to}`)).join(", ") +
      (r.gaps.length ? ` · absente en ${r.gaps.join(", ")}` : "") +
      (r.entryOffset > 0 ? ` · entrée ${r.entryOffset} ans après l'ouverture du relevé` : ` · présente dès ${FIRST}`) +
      ` · meilleur rang atteint : ${r.bestRank}` +
      (r.open ? " · toujours présente au dernier relevé" : ` · sortie après ${r.exit}`);
  },
  // The control: what the bars are aligned on.
  alignLabel: "Aligner les barres sur",
  calendar: {
    label: "le calendrier",
    announce: `Aligner les barres sur le calendrier : chaque barre part de son année d'entrée réelle, de ${FIRST} à ${LAST}`,
    note: "Une longueur est une durée, une position est une date. Deux tenures égales ne commencent pas au même endroit : c'est ce qui les rend impossibles à comparer d'un coup d'oeil.",
  },
  entry: {
    label: "leur propre entrée",
    announce: "Aligner les barres sur leur propre entrée : toutes partent du même bord et la graduation compte des années de présence, plus des années du calendrier",
    note: (s) => `Les ${s.count} barres partent du même bord : la graduation ne compte plus des années du calendrier mais des années écoulées depuis l'entrée.`,
  },
  held: {
    label: "les seules années tenues",
    announce: "Aligner les barres sur les seules années tenues : les interruptions sont refermées et chaque barre mesure exactement la tenure inscrite à son bout",
    note: (s) => {
      // The pair this origin exists for: an interrupted row that lands on an unbroken one of equal tenure.
      const twinB = s.interrupted.filter((r) => s.rows.some((o) => o !== r && o.years === r.years && o.window === o.years)).sort((a, b) => b.window - b.years - (a.window - a.years))[0];
      const twinA = s.rows.find((o) => o !== twinB && o.years === twinB.years && o.window === o.years);
      return `Interruptions refermées : chaque barre mesure exactement sa tenure. ${The(twinB)} passe de ${twinB.window} à ${twinB.years} ans — la tenure ${of_(twinA)}, ` +
        `${Math.abs(twinA.index - twinB.index)} lignes plus haut.`;
    },
  },
  // The one note on the plate, on the single-year row.
  note: { row: oneYear[0].key, text: `une seule année, ${oneYear[0].runs[0].from}` },
  subjectsNote: `Les ${whole.length} pays en couleur n'ont jamais quitté le top ${TOP}.`,
  title: "6 pays n'ont jamais quitté le top 10 mondial des émetteurs depuis 1990",
  limits:
    `${rows.length} pays y sont passés depuis ${FIRST} : une ligne chacun, une barre par période de présence. ` +
    "Une année vaut la même longueur dans les trois états — seule l'origine des barres change.",
  reading:
    "Lecture : changez l'alignement — les barres glissent, l'axe passe des années du calendrier aux années de présence. " +
    "Survolez ou tabulez une ligne pour ses périodes, ses absences et son rang.",
  source: `Source : Global Carbon Budget 2025, via Our World in Data · ${FIRST}-${LAST}, classement calculé sur les ${rows3.filter((r) => Number(r[YEAR]) === LAST).length} pays du fichier`,
  alt: (s) => {
    const twinB = s.interrupted.find((r) => s.rows.some((o) => o !== r && o.years === r.years && o.window === o.years));
    const twinA = s.rows.find((o) => o !== twinB && o.years === twinB.years && o.window === o.years);
    return `${s.count} lignes, une par pays, sur un axe du temps. Chaque barre est une période de présence dans les dix plus gros émetteurs mondiaux de CO₂. ` +
      `Aligné sur le calendrier, de ${FIRST} à ${LAST}, ${whole.length} barres traversent tout le graphique sans interruption (${whole.map((r) => r.label).join(", ")}) ; ` +
      `les autres commencent tard, s'arrêtent tôt ou sont coupées en deux, et ${oneYear[0].label} n'apparaît qu'une seule année, ${oneYear[0].runs[0].from}. ` +
      `Aligné sur l'entrée de chaque pays, les seize barres partent du même bord et se lisent comme des durées : ${whole.length} à ${years.length} ans, ` +
      `${twinA.label} et ${twinB.label} à ${twinA.years} ans chacun, ${oneYear[0].label} à un an. Aligné sur les seules années tenues, les interruptions se ` +
      `referment et ${twinB.label} raccourcit de ${twinB.window} à ${twinB.years} ans.`;
  },
  evidenceLevels: 2,
  check() {
    if (whole.length !== 6) throw new Error(`${whole.length} countries held a top-${TOP} place every year since ${FIRST}, not 6`);
    if (FIRST !== 1990) throw new Error(`the record opens in ${FIRST}, not 1990`);
    if (oneYear.length !== 1) throw new Error(`${oneYear.length} countries held a single year; the plate's note names one`);
    const interrupted = rows.filter((r) => r.runs.length > 1);
    if (!interrupted.some((r) => rows.some((o) => o !== r && tenure(o) === tenure(r) && o.runs.length === 1)))
      throw new Error("no interrupted row shares its tenure with an unbroken one: the held-years note would be false");
  },
};
