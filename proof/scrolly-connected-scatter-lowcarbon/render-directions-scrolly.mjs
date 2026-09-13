// Sixteen European countries, 2000 → 2024, rendered once per FILED DIRECTION into a self-contained
// scrolly page. The `connected scatter` type in the scrolly format.
//
// THE SUBJECT OF `static-connected-scatter-lowcarbon`, CHOREOGRAPHED. The data, the axis pair, the claims
// and their assertions are the static beat's own; the scroll tells them with its own gestures
// (`scrolly/references/directed-type-choreography.md`):
//
//   1. 2000 — sixteen hollow rings, France alone on the right;
//   2. each country travels along its arc to 2024, every one of them up — counted;
//   3. a filter to the five that moved left;
//   4. France, its two moves counted;
//   5. the x axis closes onto the crowd near the origin, every small country named;
//   6. the whole axis again, and the plate's reading line.
//
// Usage:  bun proof/scrolly-connected-scatter-lowcarbon/render-directions-scrolly.mjs

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
import { plainSpaces, webRegisters } from "#shared/design-base/web.mjs";
import { EYEBROW_TO_DISPLAY, gapOf, registerOf } from "#shared/design-base/register.mjs";
import { renderScrolly } from "../../skills/scrolly/scripts/render-scrolly.mjs";
import { DirectedScatterScrolly } from "./DirectedScatterScrolly.tsx";

const HERE = dirname(fileURLToPath(import.meta.url));
const DIRECTIONS = join(HERE, "..", "..", "docs", "design-base", "directions");
const OUT = join(HERE, "renders");
const EYEBROW = "Énergie · Europe";
const SUBJECT = "FRA";
const FROM = "2000";
const TO = "2024";
/** The close-up's domain: every country but the two heaviest fits under it, both years. */
const ZOOM_MAX = 12;

const LOW_CARBON = [
  "other_renewables_generation__twh",
  "bioenergy_stacked_generation__twh",
  "solar_generation__twh",
  "wind_generation__twh",
  "hydro_generation__twh",
  "nuclear_generation__twh",
];
const FOSSIL = ["gas_generation__twh", "oil_generation__twh", "coal_generation__twh"];
const NAMES = {
  FRA: "France", DEU: "Allemagne", ESP: "Espagne", GBR: "Royaume-Uni", SWE: "Suède",
  ITA: "Italie", FIN: "Finlande", AUT: "Autriche", NLD: "Pays-Bas", BEL: "Belgique",
  POL: "Pologne", CZE: "Tchéquie", PRT: "Portugal", DNK: "Danemark", GRC: "Grèce", IRL: "Irlande",
};

// ── the readings, and the static beat's own assertions ─────────────────────────────────────────
const csv = (await readFile(join(HERE, "data.csv"), "utf8")).trim().split(/\r?\n/);
const header = csv[0].split(",");
const at = (name) => header.indexOf(name);
const rows = csv.slice(1).map((l) => {
  const c = l.split(",");
  const lc = LOW_CARBON.reduce((s, k) => s + Number(c[at(k)]), 0);
  const fossil = FOSSIL.reduce((s, k) => s + Number(c[at(k)]), 0);
  return { code: c[at("code")], year: c[at("year")], lc, total: lc + fossil };
});
for (const r of rows)
  if (!r.code || !Number.isFinite(r.lc) || !(r.total > 0)) throw new Error(`a reading has no usable generation: ${JSON.stringify(r)}`);

const byCode = {};
for (const r of rows) (byCode[r.code] ??= {})[r.year] = r;
const codes = Object.keys(byCode);
for (const c of codes) {
  if (!byCode[c][FROM] || !byCode[c][TO]) throw new Error(`${c} is not read at both ${FROM} and ${TO}; a connected scatter joins two states`);
  if (!NAMES[c]) throw new Error(`${c} has no French name filed in this beat`);
}
const groupTotal = {
  [FROM]: codes.reduce((s, c) => s + byCode[c][FROM].lc, 0),
  [TO]: codes.reduce((s, c) => s + byCode[c][TO].lc, 0),
};
const entities = codes.map((code) => {
  const state = (year) => ({
    weight: (byCode[code][year].lc / groupTotal[year]) * 100,
    ownMix: (byCode[code][year].lc / byCode[code][year].total) * 100,
  });
  const from = state(FROM);
  const to = state(TO);
  return { code, name: NAMES[code], from, to, lighter: to.weight < from.weight, grew: byCode[code][TO].lc > byCode[code][FROM].lc };
});

const cleaner = entities.filter((e) => e.to.ownMix > e.from.ownMix);
const lighter = entities.filter((e) => e.lighter).sort((a, b) => a.to.weight - a.from.weight - (b.to.weight - b.from.weight));
if (cleaner.length !== entities.length)
  throw new Error(`a card says every country's own mix got cleaner; ${entities.length - cleaner.length} did not`);
if (!(lighter.length >= 4 && lighter.length < entities.length / 2))
  throw new Error(`a card says a minority lost weight in the group; ${lighter.length} of ${entities.length} did`);
const subject = entities.find((e) => e.code === SUBJECT);
if (!subject) throw new Error(`the subject ${SUBJECT} is not in the data`);
const subjectWeight = subject.to.weight - subject.from.weight;
const subjectMix = subject.to.ownMix - subject.from.ownMix;
if (!(subjectWeight < -5 && subjectMix > 0))
  throw new Error(`a card says ${SUBJECT} got cleaner at home and lighter in the group; it moved ${subjectMix.toFixed(1)} and ${subjectWeight.toFixed(1)}`);
if (!subject.grew) throw new Error(`a card says ${SUBJECT} produced more; it produced less`);
const heaviest = entities.reduce((a, b) => (b.from.weight > a.from.weight ? b : a));
if (heaviest.code !== SUBJECT) throw new Error(`the first card says ${SUBJECT} stands alone on the right in ${FROM}; ${heaviest.code} does`);
const crowd = entities.filter((e) => Math.max(e.from.weight, e.to.weight) < ZOOM_MAX);
const outside = entities.filter((e) => !crowd.includes(e));
if (outside.length !== 2 || !outside.some((e) => e.code === SUBJECT))
  throw new Error(`the close-up says all but the two heaviest fit under ${ZOOM_MAX} %; ${outside.map((e) => e.code).join(", ")} do not`);
const crowdHeavier = crowd.filter((e) => !e.lighter);

const one = (v) => plainSpaces(v.toLocaleString("fr-FR", { minimumFractionDigits: 1, maximumFractionDigits: 1 }));
const NB = "\u00A0";
const listOf = (names) => `${names.slice(0, -1).join(", ")} et ${names[names.length - 1]}`;

// ── the words: the static beat's, one reading per card ─────────────────────────────────────────
const title = [
  `Les ${entities.length} pays ont tous nettoyé leur électricité — ${lighter.length} pèsent pourtant moins dans le bas-carbone européen`,
  `Tous plus propres chez eux, ${lighter.length} plus légers en Europe`,
  `Plus propres chez eux, plus légers en Europe`,
];
const prose = [
  [`En ${FROM}, chaque pays est un cercle vide. En abscisse, sa part du bas-carbone des ${entities.length} pays ; en ordonnée, la part de bas-carbone dans sa propre électricité. La ${subject.name}, seule à droite, en fournit ${one(subject.from.weight)}${NB}%.`],
  [`Jusqu’en ${TO}, chacun glisse le long de son arc vers un cercle plein. Les ${entities.length} arcs montent : tous se sont nettoyés chez eux.`],
  [`Mais ${lighter.length} pointent vers la gauche. ${listOf(lighter.map((e) => e.name))} pèsent moins dans le bas-carbone européen qu’en ${FROM}.`],
  [`La ${subject.name} a gagné ${one(subjectMix)} points chez elle et perdu ${one(-subjectWeight)} points de poids européen. Elle a produit plus ; les autres ont produit plus vite.`],
  [`Resserré sur 0–${ZOOM_MAX}${NB}%, l’axe ouvre le paquet tassé près de l’origine : ${crowdHeavier.length} des ${crowd.length} pays restants pèsent plus lourd qu’en ${FROM}.`],
  [`Lecture : monter, c’est se nettoyer chez soi ; aller à droite, c’est peser plus lourd dans le groupe. Les deux sont indépendants, et c’est tout l’intérêt de tracer les deux.`],
];
const source = "Source : Ember, Energy Institute – Statistical Review of World Energy (2025), via Our World in Data";
const xName = `part du bas-carbone des ${entities.length} pays, en %`;
const yName = "part de bas-carbone dans sa propre électricité, en %";
const upCount = { template: `{n} pays sur ${entities.length} plus propres chez eux`, value: cleaner.length };
const subjectCounts = `${subject.name}${NB}: +${one(subjectMix)}${NB}pts chez elle · −${one(-subjectWeight)}${NB}pts de poids européen`;
const topWeight = Math.max(...entities.flatMap((e) => [e.from.weight, e.to.weight]));
const xTicks = [0, 10, 20, 30, 40].filter((t) => t <= topWeight + 8);
const xMax = Math.max(topWeight * 1.08, xTicks[xTicks.length - 1]);
const zoomTicks = [0, 3, 6, 9, 12];
const yTicks = [0, 25, 50, 75, 100];
const alt =
  `Nuage connecté de ${entities.length} pays européens entre ${FROM} et ${TO}. Chaque pays est un cercle vide ` +
  `(${FROM}) relié par un arc pointillé à un cercle plein (${TO}). L’abscisse est sa part du bas-carbone des ` +
  `${entities.length} pays, l’ordonnée la part de bas-carbone dans sa propre électricité. Tous les arcs montent. ` +
  `${lighter.length} pointent vers la gauche, dont la ${subject.name}, qui perd ${one(-subjectWeight)} points de ` +
  `poids européen tout en gagnant ${one(subjectMix)} points de bas-carbone chez elle.`;

/** One state per card; see `scatter-drive.mjs` for what each field paints. */
const STATES = [
  { travel: 0, up: 0, filter: 0, subject: 0, zoom: 0 },
  { travel: 1, up: 1, filter: 0, subject: 0, zoom: 0 },
  { travel: 1, up: 1, filter: 1, subject: 0, zoom: 0 },
  { travel: 1, up: 1, filter: 1, subject: 1, zoom: 0 },
  { travel: 1, up: 1, filter: 0, subject: 0, zoom: 1 },
  { travel: 1, up: 1, filter: 0, subject: 1, zoom: 0 },
];

const textPerRegister = {
  display: title.join(" "),
  eyebrow: EYEBROW,
  body: `${prose.flat().join(" ")} ${source}`,
  axis: `${xName} ${yName} ${[...xTicks, ...zoomTicks, ...yTicks].join(" ")}`,
  annot: "",
  value: `${entities.map((e) => `${e.name} ${e.code}`).join(" ")} ${upCount.template} ${subjectCounts} 0123456789,+−·`,
};

const filed = readdirSync(DIRECTIONS)
  .filter((f) => f.endsWith(".md"))
  .map((f) => readDirection(join(DIRECTIONS, f)));
const newsroom = readPalette(HERE, { stopAt: join(HERE, "..") });
const BEAT_FACTS = { evidenceLevels: 4 };
console.log(report(composeDirections({ newsroom, filed, beat: BEAT_FACTS, textPerRegister }), { beat: BEAT_FACTS }));
console.log("");

const driver = [
  await readFile(join(HERE, "scatter-layout.mjs"), "utf8"),
  await readFile(join(HERE, "scatter-drive.mjs"), "utf8"),
].join("\n");

const refused = [];
for (const file of readdirSync(DIRECTIONS).filter((f) => f.endsWith(".md"))) {
  const id = file.replace(/\.md$/, "");
  const direction = resolveDirectionFamilies(readDirection(join(DIRECTIONS, file)), textPerRegister);
  const { ink, muted } = deriveFurniture(direction.ground);
  const regs = webRegisters(direction, { ink: { ink, muted, accent: direction.accent } });
  try {
    const { outPath } = await renderScrolly({
      steps: prose.map((p, i) => ({ id: ["depart", "voyage", "plus-legers", "france", "gros-plan", "lecture"][i], prose: p })),
      reveal: {
        element: createElement(DirectedScatterScrolly, {
          entities: entities.map(({ code, name, from, to, lighter }) => ({ code, name, from, to, lighter })),
          subject: SUBJECT,
          xMax,
          zoomMax: ZOOM_MAX,
          xTicks,
          zoomTicks,
          yTicks,
          xName,
          yName,
          upCount,
          subjectCounts,
          alt,
          regs,
          pad: direction.pad,
          stroke: direction.stroke ?? {},
          ground: direction.ground,
          accent: direction.accent,
          ink,
          muted,
        }),
        states: STATES,
        driver,
        apply: "applyScatterState",
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
