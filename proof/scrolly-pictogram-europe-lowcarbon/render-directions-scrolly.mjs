// Forty European countries, one square each, rendered once per FILED DIRECTION into a self-contained scrolly page. The
// `pictogram` type in the scrolly format.
//
// THE SUBJECT OF `static-pictogram-europe-lowcarbon`, CHOREOGRAPHED. The countries, the floors, the classes, the claim
// and its assertions are the static beat's own; the scroll tells them with its own gestures
// (`scrolly/references/directed-type-choreography.md`):
//
//   1. forty squares set down at their own low-carbon share on a 0–100 % axis;
//   2. the two floors, 60 % and 75 %, drawn;
//   3. the squares leave the axis and are counted in three blocks: 16 · 6 · 18;
//   4. the middle block alone, its six countries named;
//   5. the two ends, each square in the fill of its class;
//   6. the static plate and its key.
//
// Usage:  bun proof/scrolly-pictogram-europe-lowcarbon/render-directions-scrolly.mjs

import { readdirSync } from "node:fs";
import { readFile, rm } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createElement } from "react";
import { deriveFurniture } from "#shared/chart-beat/render-still.mjs";
import { readPalette } from "#shared/chart-beat/colour.mjs";
import { readDirection } from "#shared/design-base/read-direction.mjs";
import { composeDirections, report } from "#shared/design-base/compose.mjs";
import { resolveDirectionFamilies } from "#shared/design-base/resolve-families.mjs";
import { webRegisters } from "#shared/design-base/web.mjs";
import { EYEBROW_TO_DISPLAY, gapOf, registerOf } from "#shared/design-base/register.mjs";
import { renderScrolly } from "../../skills/scrolly/scripts/render-scrolly.mjs";
import { DirectedPictogramScrolly } from "./DirectedPictogramScrolly.tsx";

const HERE = dirname(fileURLToPath(import.meta.url));
const DIRECTIONS = join(HERE, "..", "..", "docs", "design-base", "directions");
const OUT = join(HERE, "renders");
const YEAR = 2024;
const EYEBROW = "Énergie · Europe";
const NB = "\u00A0";
const HIGH = 75;
const LOW = 60;
const BREAKS = [40, 60, 75, 94];
const CLEAN = ["hydro_generation__twh", "wind_generation__twh", "solar_generation__twh", "bioenergy_stacked_generation__twh", "other_renewables_generation__twh", "nuclear_generation__twh"];
const FOSSIL = ["gas_generation__twh", "coal_generation__twh", "oil_generation__twh"];
const FRENCH = {
  ALB: ["Albanie", "l’Albanie"], AUT: ["Autriche", "l’Autriche"], BLR: ["Biélorussie", "la Biélorussie"], BEL: ["Belgique", "la Belgique"],
  BIH: ["Bosnie-Herzégovine", "la Bosnie-Herzégovine"], BGR: ["Bulgarie", "la Bulgarie"], HRV: ["Croatie", "la Croatie"], CYP: ["Chypre", "Chypre"],
  CZE: ["Tchéquie", "la Tchéquie"], DNK: ["Danemark", "le Danemark"], EST: ["Estonie", "l’Estonie"], FIN: ["Finlande", "la Finlande"], FRA: ["France", "la France"],
  DEU: ["Allemagne", "l’Allemagne"], GRC: ["Grèce", "la Grèce"], HUN: ["Hongrie", "la Hongrie"], ISL: ["Islande", "l’Islande"], IRL: ["Irlande", "l’Irlande"],
  ITA: ["Italie", "l’Italie"], LVA: ["Lettonie", "la Lettonie"], LTU: ["Lituanie", "la Lituanie"], LUX: ["Luxembourg", "le Luxembourg"], MLT: ["Malte", "Malte"],
  MDA: ["Moldavie", "la Moldavie"], MNE: ["Monténégro", "le Monténégro"], NLD: ["Pays-Bas", "les Pays-Bas"], MKD: ["Macédoine du Nord", "la Macédoine du Nord"],
  NOR: ["Norvège", "la Norvège"], POL: ["Pologne", "la Pologne"], PRT: ["Portugal", "le Portugal"], ROU: ["Roumanie", "la Roumanie"], RUS: ["Russie", "la Russie"],
  SRB: ["Serbie", "la Serbie"], SVK: ["Slovaquie", "la Slovaquie"], SVN: ["Slovénie", "la Slovénie"], ESP: ["Espagne", "l’Espagne"], SWE: ["Suède", "la Suède"],
  CHE: ["Suisse", "la Suisse"], TUR: ["Turquie", "la Turquie"], UKR: ["Ukraine", "l’Ukraine"], GBR: ["Royaume-Uni", "le Royaume-Uni"],
};

// ── the countries, and the static beat's own assertions ────────────────────────────────────────
const csv = (await readFile(join(HERE, "data.csv"), "utf8")).trim().split(/\r?\n/);
const header = csv[0].split(",");
const measured = csv.slice(1).map((l) => {
  const cells = l.split(",");
  const raw = Object.fromEntries(header.map((h, i) => [h, cells[i]]));
  if (Number(raw.year) !== YEAR) throw new Error(`${raw.entity} is not ${YEAR}`);
  if (!FRENCH[raw.code]) throw new Error(`no French name recorded for ${raw.code}`);
  const clean = CLEAN.reduce((s, k) => s + Number(raw[k] || 0), 0);
  const total = clean + FOSSIL.reduce((s, k) => s + Number(raw[k] || 0), 0);
  return { iso: raw.code, total, share: total > 0 ? (clean / total) * 100 : null };
});
const unreported = measured.filter((m) => m.share === null);
const countries = measured.filter((m) => m.share !== null).sort((a, b) => b.share - a.share);
const top = countries.filter((c) => c.share >= HIGH);
const middle = countries.filter((c) => c.share >= LOW && c.share < HIGH);
const bottom = countries.filter((c) => c.share < LOW);
if (top.length + middle.length + bottom.length !== countries.length) throw new Error("the three blocks do not account for every country");
if (!(middle.length * 4 < countries.length)) throw new Error(`the headline says only a few sit in the middle; ${middle.length} of ${countries.length} do`);
if (unreported.length !== 1) throw new Error(`the key says one country is not drawn; ${unreported.length} are unreported`);
const lowest = countries[countries.length - 1];
const highest = countries.filter((c) => c.share === countries[0].share);
console.log(`${countries.length} pays · ${top.length} ≥ ${HIGH} · ${middle.length} entre · ${bottom.length} < ${LOW} · sans donnée ${unreported.map((m) => m.iso).join(", ")}\n`);

const classOf = (v) => BREAKS.filter((b) => v >= b).length;
const blockOf = (c) => (c.share >= HIGH ? 0 : c.share >= LOW ? 1 : 2);
const units = countries.map((c) => ({ key: c.iso, label: FRENCH[c.iso][0], share: c.share, classIndex: classOf(c.share), block: blockOf(c) }));
const blocks = [
  { name: `pays au-dessus de ${HIGH}${NB}% d’électricité bas-carbone`, count: top.length, thread: true },
  { name: `entre ${LOW} et ${HIGH}${NB}%`, count: middle.length, thread: false },
  { name: `sous ${LOW}${NB}%`, count: bottom.length, thread: true },
];
const whole = (v) => `${Math.round(v)}${NB}%`;
const listOf = (xs) => (xs.length === 1 ? xs[0] : `${xs.slice(0, -1).join(", ")} et ${xs[xs.length - 1]}`);
const cap = (s) => s[0].toUpperCase() + s.slice(1);

// ── the words ──────────────────────────────────────────────────────────────────────────────────
const title = [
  `L’Europe électrique est aux deux bouts : ${middle.length} pays seulement au milieu`,
  `L’Europe électrique est aux deux bouts`,
  `Aux deux bouts, ${middle.length} au milieu`,
];
const prose = [
  [`Un carré, un pays : ${countries.length} pays européens, chacun posé à sa part d’électricité bas-carbone en ${YEAR}, renouvelables et nucléaire réunis. De ${whole(lowest.share)} en ${FRENCH[lowest.iso][0]} à ${whole(highest[0].share)} en ${listOf(highest.map((c) => FRENCH[c.iso][0]))}.`],
  [`Traçons deux seuils : ${LOW}${NB}% et ${HIGH}${NB}%.`],
  [`Comptons les carrés de part et d’autre : ${top.length} pays au-dessus de ${HIGH}${NB}%, ${bottom.length} sous ${LOW}${NB}%, ${middle.length} seulement entre les deux.`],
  [`Les ${middle.length} du milieu : ${listOf(middle.map((c) => FRENCH[c.iso][1]))}.`],
  [`Aux deux bouts, ${top.length + bottom.length} pays. Chaque carré prend la teinte de sa classe, de moins de ${BREAKS[0]}${NB}% à plus de ${BREAKS[BREAKS.length - 1]}${NB}%.`],
  [`Lecture : chaque carré est un pays et se compte. Sa teinte donne sa classe, dont les bornes sont sous la grille ; le nombre devant chaque bloc est son compte, en pays.`],
];
const source = "Source : Ember, Energy Institute – Statistical Review of World Energy (2025), via Our World in Data";
const words = {
  unitIs: "un carré = un pays",
  spanNote: `de ${whole(lowest.share)} à ${whole(highest[0].share)}`,
  floorNote: `seuils${NB}: ${LOW}${NB}% et ${HIGH}${NB}%`,
  countNote: `${top.length} · ${middle.length} · ${bottom.length}`,
  middleNote: `${middle.length} pays entre ${LOW} et ${HIGH}${NB}%`,
  endsNote: `${top.length + bottom.length} pays aux deux bouts`,
  absenceNote: `${cap(FRENCH[unreported[0].iso][1])}, sans donnée ${YEAR}, n’est pas dessinée.`,
  lowEnd: `${FRENCH[lowest.iso][0]} ${whole(lowest.share)}`,
  highEnd: `${listOf(highest.map((c) => FRENCH[c.iso][0]))} ${whole(highest[0].share)}`,
  middleNames: middle.map((c) => `${FRENCH[c.iso][0]}${NB}${whole(c.share)}`).join(" · "),
};
if (!unreported[0].iso.match(/^UKR$/)) throw new Error(`the absence note is written for Ukraine; the unreported country is ${unreported[0].iso}`);
const ticks = [0, 50, 100].map((v) => ({ value: v, text: `${v}${NB}%` }));
const floors = [LOW, HIGH].map((v) => ({ value: v, text: `${v}${NB}%` }));
const alt =
  `Pictogramme : ${countries.length} carrés, un par pays européen, rangés par part d’électricité bas-carbone en ${YEAR}. ` +
  `${top.length} pays dépassent ${HIGH} %, ${bottom.length} sont sous ${LOW} %, et ${middle.length} seulement se tiennent entre les deux : ${listOf(middle.map((c) => FRENCH[c.iso][0]))}.`;

/** One state per card; see `pictogram-drive.mjs` for what each field paints. */
const STATES = [
  { mode: 0, floors: 0, ends: 1, counts: 0, middle: 0, sides: 0, classes: 0, key: 0, note: 0 },
  { mode: 0, floors: 1, ends: 1, counts: 0, middle: 0, sides: 0, classes: 0, key: 0, note: 1 },
  { mode: 1, floors: 0, ends: 0, counts: 1, middle: 0, sides: 0, classes: 0, key: 0, note: 2 },
  { mode: 1, floors: 0, ends: 0, counts: 1, middle: 1, sides: 0, classes: 0, key: 0, note: 3 },
  { mode: 1, floors: 0, ends: 0, counts: 1, middle: 0, sides: 1, classes: 1, key: 1, note: 4 },
  { mode: 1, floors: 0, ends: 0, counts: 1, middle: 0, sides: 0, classes: 1, key: 1, note: -1 },
];

const textPerRegister = {
  display: title.join(" "),
  eyebrow: EYEBROW,
  body: `${prose.flat().join(" ")} ${source}`,
  axis: `${words.unitIs} ${BREAKS.map((b) => `${b} %`).join(" ")} ${ticks.map((t) => t.text).join(" ")} ${words.absenceNote}`,
  annot: `${blocks.map((b) => b.name).join(" ")} ${words.lowEnd} ${words.highEnd} ${words.middleNames}`,
  value: `${blocks.map((b) => b.count).join(" ")} ${words.spanNote} ${words.floorNote} ${words.countNote} ${words.middleNote} ${words.endsNote}`,
};

const filed = readdirSync(DIRECTIONS)
  .filter((f) => f.endsWith(".md"))
  .map((f) => readDirection(join(DIRECTIONS, f)));
const newsroom = readPalette(HERE, { stopAt: join(HERE, "..") });
const BEAT_FACTS = { evidenceLevels: BREAKS.length + 1 };
console.log(report(composeDirections({ newsroom, filed, beat: BEAT_FACTS, textPerRegister }), { beat: BEAT_FACTS }));
console.log("");

const driver = await readFile(join(HERE, "pictogram-drive.mjs"), "utf8");
const refused = [];
for (const file of readdirSync(DIRECTIONS).filter((f) => f.endsWith(".md"))) {
  const id = file.replace(/\.md$/, "");
  const direction = resolveDirectionFamilies(readDirection(join(DIRECTIONS, file)), textPerRegister);
  const { ink, muted, grid } = deriveFurniture(direction.ground);
  const regs = webRegisters(direction, { ink: { ink, muted, accent: direction.accent } });
  try {
    const { outPath } = await renderScrolly({
      steps: prose.map((p, i) => ({ id: ["axe", "seuils", "compte", "milieu", "bouts", "lecture"][i], prose: p })),
      reveal: {
        element: createElement(DirectedPictogramScrolly, { units, blocks, breaks: BREAKS.map((b) => `${b}${NB}%`), ticks, floors, words, alt, regs, ground: direction.ground, accent: direction.accent, ink, muted, grid }),
        states: STATES,
        driver,
        apply: "applyPictogramState",
      },
      title,
      eyebrow: EYEBROW,
      source,
      ground: direction.ground,
      type: { eyebrow: { ...regs.eyebrow, marginBottom: `${gapOf(registerOf(direction, "eyebrow"), EYEBROW_TO_DISPLAY)}px` }, display: regs.display, body: regs.body, source: regs.body },
      lang: "fr",
      outDir: OUT,
      name: `${id}.html`,
    });
    console.log(`${id} -> ${outPath.replace(`${HERE}/`, "")}`);
  } catch (error) {
    await rm(join(OUT, `${id}.html`), { force: true });
    refused.push({ id, why: error.message });
    console.log(`${id} REFUSED — ${error.message}`);
  }
}
if (refused.length) {
  console.log(`\nrefused by ${refused.length}: ${refused.map((x) => x.id).join(", ")}`);
  process.exitCode = 1;
}
