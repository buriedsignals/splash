// twin/proof/web-hex-grid-europe-protection/render-directions-web.mjs
//
// Ukrainians under temporary protection per 1 000 inhabitants, one hexagon per host country.
// Rendered once per FILED DIRECTION into a self-contained interactive page.
//
// THE LAYOUT IS DESIGNED, NOT DERIVED, and the page says so. It is CHECKED BOTH WAYS: every code in
// the layout has a reading and every reading has a cell — a hand-drawn layout is the one thing here a
// reader cannot check against the source, so nothing else about it is left unchecked.
//
// Usage:  bun proof/web-hex-grid-europe-protection/render-directions-web.mjs

import { readdirSync } from "node:fs";
import { readFile, rm } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { readPalette } from "#shared/chart-beat/colour.mjs";
import { beatFacts, applicableTreatments } from "#shared/chart-beat/treatments.mjs";
import { readDirection } from "#shared/design-base/read-direction.mjs";
import { composeDirections, report } from "#shared/design-base/compose.mjs";
import { resolveDirectionFamilies } from "#shared/design-base/resolve-families.mjs";
import { plainSpaces } from "#shared/design-base/web.mjs";
import { renderWeb } from "../../skills/chart-web/scripts/render-web.mjs";
import { DirectedHexGridWeb } from "./DirectedHexGridWeb.tsx";

const HERE = dirname(fileURLToPath(import.meta.url));
const DIRECTIONS = join(HERE, "..", "..", "docs", "design-base", "directions");
const OUT = join(HERE, "renders");
const EYEBROW = "Migrations · Europe";
const ORIGIN = "UKR";
const RADIUS = 44;
const BREAKS = [5, 10, 20, 30];

/** This beat's own copy of the designed layout — odd rows offset by half a cell, which is what makes
 *  every neighbour an EDGE neighbour. Duplicated rather than imported from the static sibling: a
 *  beat renders on its own. */
const GRID = [
  ".   ISL .   .   NOR SWE FIN .",
  ".   .   IRL DNK .   EST LVA .",
  ".   .   NLD DEU POL LTU UKR .",
  ".   BEL LUX CHE CZE SVK HUN ROU",
  "PRT ESP FRA LIE AUT SVN HRV BGR",
  ".   .   MLT ITA .   GRC CYP .",
];
const NAMES = {
  DEU: "Allemagne", POL: "Pologne", CZE: "Tchéquie", ESP: "Espagne", ROU: "Roumanie",
  SVK: "Slovaquie", NLD: "Pays-Bas", IRL: "Irlande", BEL: "Belgique", AUT: "Autriche",
  NOR: "Norvège", BGR: "Bulgarie", CHE: "Suisse", FIN: "Finlande", PRT: "Portugal",
  FRA: "France", DNK: "Danemark", LTU: "Lituanie", HUN: "Hongrie", SWE: "Suède", GRC: "Grèce",
  ITA: "Italie", LVA: "Lettonie", EST: "Estonie", HRV: "Croatie", CYP: "Chypre", SVN: "Slovénie",
  ISL: "Islande", LUX: "Luxembourg", MLT: "Malte", LIE: "Liechtenstein", UKR: "Ukraine",
};

const plain = (s) => plainSpaces(s);
const fr = (v, d = 1) =>
  plain(v.toLocaleString("fr-FR", { minimumFractionDigits: d, maximumFractionDigits: d }));
const count = (v) => plain(Math.round(v).toLocaleString("fr-FR"));

const readCsv = async (name) => {
  const lines = (await readFile(join(HERE, name), "utf8")).trim().split(/\r?\n/);
  const header = lines[0].split(",");
  return lines.slice(1).map((l) => Object.fromEntries(l.split(",").map((v, i) => [header[i], v])));
};
const protection = await readCsv("protection.csv");
const population = await readCsv("population.csv");
const people = Object.fromEntries(protection.map((r) => [r.code, Number(r.people)]));
const inhabitants = Object.fromEntries(population.map((r) => [r.code, Number(r.population_2023)]));
const month = protection[0].month;

const hosts = protection.map((r) => r.code);
for (const code of hosts) {
  if (!Number.isFinite(people[code]) || people[code] <= 0) throw new Error(`${code} has no usable count`);
  if (!Number.isFinite(inhabitants[code]) || inhabitants[code] <= 0)
    throw new Error(`${code} has no population in the frozen file`);
}
const rate = (code) => (people[code] / inhabitants[code]) * 1000;

// ── the layout, checked both ways ──────────────────────────────────────────────────────────────
const seats = [];
GRID.forEach((row, r) =>
  row.trim().split(/\s+/).forEach((code, c) => {
    if (code !== ".") seats.push({ code, row: r, col: c });
  }),
);
const laidOut = new Set(seats.map((s) => s.code));
for (const s of seats) {
  if (!NAMES[s.code]) throw new Error(`${s.code} sits in the layout and has no French name filed`);
  if (s.code !== ORIGIN && !hosts.includes(s.code))
    throw new Error(`${s.code} sits in the layout and has no reading`);
}
for (const code of hosts)
  if (!laidOut.has(code)) throw new Error(`${NAMES[code] ?? code} has a reading and no cell in the layout`);

// ── THE CLAIM, ASSERTED ───────────────────────────────────────────────────────────────────────
const byRate = [...hosts].sort((a, b) => rate(b) - rate(a));
const byCount = [...hosts].sort((a, b) => people[b] - people[a]);
if (byRate[0] === byCount[0])
  throw new Error(`the pair has nothing to show: ${NAMES[byRate[0]]} leads both rankings`);
const subject = byRate[0];
const biggest = byCount[0];
console.log(
  `${hosts.length} pays d'accueil · par habitant : ${NAMES[subject]} ${fr(rate(subject))} pour 1 000 · ` +
    `en nombre : ${NAMES[biggest]} ${count(people[biggest])} (${fr(rate(biggest))} pour 1 000, ` +
    `${byRate.indexOf(biggest) + 1}e) · dernier ${NAMES[byRate[byRate.length - 1]]} ` +
    `${fr(rate(byRate[byRate.length - 1]))}\n`,
);
console.table(byRate.slice(0, 6).map((c, i) => ({ rang: i + 1, pays: NAMES[c], "pour 1000": fr(rate(c)), personnes: count(people[c]) })));

const klassOf = (v) => {
  let i = 0;
  while (i < BREAKS.length && v >= BREAKS[i]) i += 1;
  return i;
};
const klassLabel = (i) =>
  i === 0 ? `moins de ${BREAKS[0]}` : i === BREAKS.length ? `${BREAKS[BREAKS.length - 1]} et plus` : `${BREAKS[i - 1]}–${BREAKS[i]}`;
const classes = Array.from({ length: BREAKS.length + 1 }, (_, i) => ({ label: klassLabel(i) }));

const cols = Math.max(...GRID.map((r) => r.trim().split(/\s+/).length));
const dx = RADIUS * Math.sqrt(3);
const dy = RADIUS * 1.5;
const width = (cols + 0.5) * dx + RADIUS;
const height = (GRID.length - 1) * dy + RADIUS * 2 + 8;
const cells = seats.map((s) => {
  const cx = RADIUS + s.col * dx + (s.row % 2 ? dx / 2 : 0);
  const cy = RADIUS + 4 + s.row * dy;
  if (s.code === ORIGIN)
    return {
      code: s.code,
      name: NAMES[s.code],
      cx,
      cy,
      klass: null,
      label: NAMES[s.code],
      value: "origine",
      detail: `${NAMES[s.code]} · pays d'origine — la carte compte les personnes qui en sont parties, pas celles qui y sont`,
    };
  const v = rate(s.code);
  return {
    code: s.code,
    name: NAMES[s.code],
    cx,
    cy,
    klass: klassOf(v),
    label: NAMES[s.code],
    value: fr(v),
    detail:
      `${NAMES[s.code]} · ${fr(v)} Ukrainiens sous protection pour 1 000 habitants · ` +
      `${count(people[s.code])} personnes pour ${count(inhabitants[s.code] / 1e6)} millions ` +
      `d'habitants · ${byRate.indexOf(s.code) + 1}e par habitant, ${byCount.indexOf(s.code) + 1}e en ` +
      `nombre absolu`,
  };
});

const facts = beatFacts(
  hosts.map((c) => ({ key: c, label: NAMES[c], value: rate(c) })),
  { subject: NAMES[subject], declaredSequence: "pour 1 000 habitants" },
);
const offered = applicableTreatments(facts);
console.log(`treatments applicable: ${offered.map((t) => t.id).join(", ") || "(none)"}\n`);

const title = `Par habitant, ce n'est pas l'${NAMES[biggest]} : la ${NAMES[subject]} accueille ${fr(rate(subject))} Ukrainiens pour 1 000 habitants`;
const caveat =
  `Une case par pays d'accueil, toutes de la même taille : la carte abandonne la surface et achète ` +
  `ce qu'un choroplèthe des mêmes données ne peut pas donner — chaque pays également visible. Six ` +
  `voisins, tous par une arête : un quadrillage se touche en diagonale et il faut décider si un coin ` +
  `compte ; un hexagone n'a pas de coin à discuter.`;
const claimNote =
  `En nombre absolu l'ordre s'inverse : ${NAMES[biggest]} ${count(people[biggest])} personnes ` +
  `(${byRate.indexOf(biggest) + 1}e par habitant), ${NAMES[subject]} ${count(people[subject])} ` +
  `(1re par habitant). Aucun des deux chiffres n'est le plus vrai — ils répondent à deux questions.`;
const readingLine =
  `Lecture : survolez, touchez ou tabulez une case pour lire le taux, le nombre de personnes, la ` +
  `population qui le divise et son rang dans LES DEUX classements.`;
const source = `Source : Eurostat, migr_asytpsm — bénéficiaires de la protection temporaire, ${month} · population 2023, via Our World in Data`;

const textPerRegister = {
  display: title,
  eyebrow: EYEBROW,
  body: `${caveat} ${readingLine} ${source}`,
  axis: classes.map((c) => c.label).join(" "),
  annot: claimNote,
  value: cells.map((c) => c.value).join(" "),
};
for (const key of Object.keys(textPerRegister)) textPerRegister[key] = plain(textPerRegister[key]);

const filed = readdirSync(DIRECTIONS).filter((f) => f.endsWith(".md")).map((f) => readDirection(join(DIRECTIONS, f)));
const newsroom = readPalette(HERE, { stopAt: join(HERE, "..") });
const BEAT_FACTS = { evidenceLevels: 3 };
console.log(report(composeDirections({ newsroom, filed, beat: BEAT_FACTS, textPerRegister }), { beat: BEAT_FACTS }));
console.log("");

const refused = [];
for (const file of readdirSync(DIRECTIONS).filter((f) => f.endsWith(".md"))) {
  const id = file.replace(/\.md$/, "");
  const direction = resolveDirectionFamilies(readDirection(join(DIRECTIONS, file)), textPerRegister);
  try {
    await renderWeb({
      component: DirectedHexGridWeb,
      props: {
        cells, classes,
        originLabel: `${NAMES[ORIGIN]} · origine`,
        radius: RADIUS,
        width, height,
        title, eyebrow: EYEBROW, caveat, source, reading: readingLine, claimNote,
        alt:
          `Une grille d'hexagones disposés à peu près comme l'Europe, un par pays d'accueil, tous de ` +
          `la même taille et teintés selon le nombre d'Ukrainiens sous protection pour 1 000 ` +
          `habitants. Les cases les plus foncées sont en Europe centrale — ${NAMES[subject]} à ` +
          `${fr(rate(subject))} en tête — tandis que l'${NAMES[biggest]}, la plus grande en nombre ` +
          `absolu, n'est qu'à ${fr(rate(biggest))}. La case de l'${NAMES[ORIGIN]} est neutre : c'est ` +
          `le pays d'origine.`,
        direction,
        ground: direction.ground,
        accent: direction.accent,
      },
      outDir: OUT,
      name: `${id}.html`,
    });
    console.log(`${id} -> renders/${id}.html`);
  } catch (error) {
    refused.push({ id, why: error.message });
    console.log(`${id} REFUSED — ${error.message}`);
    // A refused direction must not leave its previous render on disk to be mistaken for this one.
    await rm(join(OUT, `${id}.html`), { force: true });
  }
}
if (refused.length) {
  console.log(`\nrefused by ${refused.length}: ${refused.map((x) => x.id).join(", ")}`);
  // A runner that swallows a refusal makes a refused page look like a produced one, and leaves the
  // previous render on disk to be mistaken for this one.
  process.exitCode = 1;
}
