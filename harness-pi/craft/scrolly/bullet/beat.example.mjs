// beat.mjs for the worked example proof/scrolly-bullet-low-carbon-share — "Poland: +17.3 points of
// low-carbon since 2015, and still the only one of the six under half", as a scrolly. Every share is
// COMPUTED from data.json; the gains, the ranking and the rows each card names come from
// render-beat.mjs as `r` and are only WORDED here.
import { readFileSync } from "node:fs";
import { join } from "node:path";

const data = JSON.parse(readFileSync(join(import.meta.dirname, "data.json"), "utf8"));
const names = data.columns.map((c) => c.name);
const [ENTITY, YEAR] = [names.indexOf("Entity"), names.indexOf("Year")];
const BEFORE = 2015;
const AFTER = 2024;
/** Low-carbon: nuclear and every renewable; the whole is every source column (after Entity, Code, Year). */
const LOW_CARBON = ["Other renewables", "Bioenergy", "Solar", "Wind", "Hydropower", "Nuclear"];
const SOURCES = names.slice(3);
const shareOf = (entity, year) => {
  const row = data.rows.find((r) => r[ENTITY] === entity && Number(r[YEAR]) === year);
  if (!row) throw new Error(`no ${year} row for ${entity}`);
  const sum = (cols) => cols.reduce((s, c) => s + Number(row[names.indexOf(c)]), 0);
  return (sum(LOW_CARBON) / sum(SOURCES)) * 100;
};
const FRENCH = { France: "France", Germany: "Allemagne", Norway: "Norvège", Poland: "Pologne", Sweden: "Suède", Switzerland: "Suisse" };
const ARTICLED = { France: "la France", Germany: "l’Allemagne", Norway: "la Norvège", Poland: "la Pologne", Sweden: "la Suède", Switzerland: "la Suisse" };
const entities = [...new Set(data.rows.map((r) => r[ENTITY]))];
const rows = entities.map((e) => ({ name: e, label: FRENCH[e] ?? e, marker: shareOf(e, BEFORE), measure: shareOf(e, AFTER) }));

const format = (v, decimals = 1) => v.toLocaleString("fr-FR", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
const SPELLED = ["zéro", "un", "deux", "trois", "quatre", "cinq", "six", "sept", "huit", "neuf", "dix"];
const articled = (row) => {
  if (!ARTICLED[row.name]) throw new Error(`no French article recorded for ${row.name}`);
  return ARTICLED[row.name];
};

export default {
  lang: "fr",
  eyebrow: "Énergie · Europe",
  rows,
  // The row the takeaway is about: it must be the one that gained most.
  subject: "Poland",
  unit: "%",
  format,
  zoomFrom: 90,
  // The two state names, set on the subject's own marks, and the half's name on card 4.
  labels: {
    marker: (r) => `${BEFORE} : ${format(r.subject.marker, 0)} %`,
    measure: (r) => `${AFTER} : ${format(r.subject.measure, 0)} %`,
    half: () => "la moitié",
  },
  // One sentence (or paragraphs) per card; the picture under each is already choreographed.
  cards: {
    tracks: (r) =>
      `Part du bas-carbone — nucléaire et renouvelables — dans la production électrique de six pays européens, sur une piste jusqu’à 100 %. La barre épaisse et pâle est ${BEFORE} : ${r.firstBefore.label} en tête, ${r.lastBefore.label} en dernier, à ${format(r.lastBefore.marker)} %.`,
    measure: () => `La fine et saturée est ${AFTER} : chacune prolonge la barre de ${BEFORE}.`,
    gain: (r) => `Rangés par gain, ${r.subject.label} passe en tête : de ${format(r.subject.marker)} % à ${format(r.subject.measure)} %, +${format(r.subject.gain)} points.`,
    half: (r) => `Et elle reste la seule des six sous la moitié : ${format(r.subject.measure)} % en ${AFTER}, quand ${articled(r.nextAbove)}, l’avant-dernière, est à ${format(r.nextAbove.measure)} %.`,
    zoom: (r) =>
      `Resserrée sur ${r.zoomFrom}–100 %, l’échelle montre ce que la piste entière écrase : les ${SPELLED[r.saturated.count] ?? r.saturated.count} pays déjà au-dessus de ${r.saturated.threshold} % en ${BEFORE} gagnent moins d’un point chacun.`,
  },
  title: [
    "Pologne : +17,3 points de bas-carbone depuis 2015, et toujours la seule des six sous la moitié",
    "Pologne : +17,3 points de bas-carbone depuis 2015",
    "Pologne : +17,3 points depuis 2015",
  ],
  // The last card: the accounting the rows rest on.
  limits: `Rangés par niveau en ${AFTER}, les six retrouvent l’ordre de ${BEFORE} : les gains n’ont déplacé personne. Aucun objectif n’est dessiné — ${BEFORE} est une date, pas une cible.`,
  source: "Source : Ember, Energy Institute – Statistical Review of World Energy (2025), via Our World in Data",
  alt: (r) =>
    `Graphique à puces : la part du bas-carbone dans l’électricité de six pays européens, ${BEFORE} contre ${AFTER}, ` +
    `sur une piste allant jusqu’à 100 %. ${r.subject.label} progresse de ${format(r.subject.marker)} % à ${format(r.subject.measure)} %, ` +
    `soit +${format(r.subject.gain)} points, et reste la seule des six sous la moitié.`,
  evidenceLevels: 3,
  check(r) {
    if (Math.round(r.subject.gain * 10) / 10 !== 17.3) throw new Error(`the title says +17.3 points; Poland gained ${r.subject.gain.toFixed(2)}`);
    if (r.underHalf.length !== 1 || r.underHalf[0].name !== r.subject.name) throw new Error(`the title says the country that moved furthest is the only one still under half; under half: ${r.underHalf.map((x) => x.name).join(", ")}`);
    // Card 5 says every country already above 95 % gained less than a point; card 6 that the order did not change.
    if (!(r.saturated.count > 0 && r.saturated.maxGain < 1)) throw new Error(`card 5 says every country already above ${r.saturated.threshold} % gained less than a point; one did not`);
    if (!r.sameOrder) throw new Error(`card 6 says the ${AFTER} ranking is the ${BEFORE} one; it is not`);
  },
};
