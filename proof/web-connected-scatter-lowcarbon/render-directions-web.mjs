// twin/proof/web-connected-scatter-lowcarbon/render-directions-web.mjs
//
// Sixteen European countries between 2000 and 2024, each an arrow in a space whose axes are two
// INDEPENDENT shares — how clean a country's own electricity is, and how much of the sixteen's
// low-carbon total it carries. Rendered once per FILED DIRECTION into an interactive page.
//
// Usage:  bun proof/web-connected-scatter-lowcarbon/render-directions-web.mjs

import { readdirSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { readPalette } from "#shared/chart-beat/colour.mjs";
import { beatFacts, applicableTreatments } from "#shared/chart-beat/treatments.mjs";
import { readDirection } from "#shared/design-base/read-direction.mjs";
import { composeDirections, report } from "#shared/design-base/compose.mjs";
import { resolveDirectionFamilies } from "#shared/design-base/resolve-families.mjs";
import { plainSpaces } from "#shared/design-base/web.mjs";
import { renderWeb } from "../../skills/chart-web/scripts/render-web.mjs";
import { DirectedConnectedScatterWeb } from "./DirectedConnectedScatterWeb.tsx";

const HERE = dirname(fileURLToPath(import.meta.url));
const DIRECTIONS = join(HERE, "..", "..", "docs", "design-base", "directions");
const OUT = join(HERE, "renders");
const EYEBROW = "Énergie · Europe";
const FROM = 2000;
const TO = 2024;
const SUBJECT = "FRA";
const LOW = ["other_renewables_generation__twh", "bioenergy_stacked_generation__twh", "solar_generation__twh", "wind_generation__twh", "hydro_generation__twh", "nuclear_generation__twh"];
const FOSSIL = ["gas_generation__twh", "oil_generation__twh", "coal_generation__twh"];
const NAMES = {
  FRA: "France", DEU: "Allemagne", ESP: "Espagne", ITA: "Italie", GBR: "Royaume-Uni",
  POL: "Pologne", SWE: "Suède", NOR: "Norvège", CHE: "Suisse", AUT: "Autriche",
  NLD: "Pays-Bas", BEL: "Belgique", FIN: "Finlande", DNK: "Danemark", PRT: "Portugal",
  CZE: "Tchéquie", GRC: "Grèce", ROU: "Roumanie", IRL: "Irlande", HUN: "Hongrie",
};

const plain = (s) => plainSpaces(s);
const fr = (v, d = 1) =>
  plain(v.toLocaleString("fr-FR", { minimumFractionDigits: d, maximumFractionDigits: d }));

const csv = (await readFile(join(HERE, "data.csv"), "utf8")).trim().split(/\r?\n/);
const header = csv[0].split(",");
const at = (n) => {
  const i = header.indexOf(n);
  if (i < 0) throw new Error(`the frozen file has no ${n} column`);
  return i;
};
const rows = csv.slice(1).map((line) => {
  const c = line.split(",");
  const o = { entity: c[at("entity")], code: c[at("code")], year: Number(c[at("year")]) };
  for (const k of [...LOW, ...FOSSIL]) o[k] = Number(c[at(k)]);
  return o;
});
const codes = [...new Set(rows.map((r) => r.code))];
for (const code of codes) if (!NAMES[code]) throw new Error(`${code} has no French name filed in this beat`);

const measure = (code, year) => {
  const r = rows.find((z) => z.code === code && z.year === year);
  if (!r) throw new Error(`${code} has no ${year} row`);
  const low = LOW.reduce((s, k) => s + r[k], 0);
  const total = low + FOSSIL.reduce((s, k) => s + r[k], 0);
  if (!(total > 0)) throw new Error(`${code} ${year} generates nothing`);
  return { low, total, own: (low / total) * 100 };
};

const pool = (year) => codes.reduce((s, code) => s + measure(code, year).low, 0);
const poolFrom = pool(FROM);
const poolTo = pool(TO);

const arrows = codes
  .map((code) => {
    const a = measure(code, FROM);
    const b = measure(code, TO);
    return {
      code,
      name: NAMES[code],
      ownFrom: a.own,
      ownTo: b.own,
      weightFrom: (a.low / poolFrom) * 100,
      weightTo: (b.low / poolTo) * 100,
      lowFrom: a.low,
      lowTo: b.low,
    };
  })
  .sort((x, z) => z.weightTo - x.weightTo);

// ── THE CLAIM, ASSERTED ───────────────────────────────────────────────────────────────────────
const dirtier = arrows.filter((a) => a.ownTo < a.ownFrom);
if (dirtier.length)
  throw new Error(`the headline says every country cleaned up at home; ${dirtier.map((a) => a.name).join(", ")} did not`);
const lighter = arrows.filter((a) => a.weightTo < a.weightFrom);
if (!(lighter.length > 0 && lighter.length < arrows.length / 2))
  throw new Error(`the headline says a minority lost European weight; ${lighter.length} of ${arrows.length} did`);
const subject = arrows.find((a) => a.code === SUBJECT);
if (!(subject.ownTo > subject.ownFrom && subject.weightTo < subject.weightFrom))
  throw new Error(`the headline says the subject moved right and down; it went ${fr(subject.ownFrom)}->${fr(subject.ownTo)} and ${fr(subject.weightFrom)}->${fr(subject.weightTo)}`);

console.log(
  `${arrows.length} pays · tous plus propres chez eux · ${lighter.length} pèsent moins dans le ` +
    `total bas-carbone des seize · ${subject.name} +${fr(subject.ownTo - subject.ownFrom)} pts chez ` +
    `elle, ${fr(subject.weightTo - subject.weightFrom)} pts de poids européen\n`,
);
console.table(arrows.map((a) => ({
  pays: a.name,
  "propre chez soi": `${fr(a.ownFrom)} -> ${fr(a.ownTo)}`,
  "poids européen": `${fr(a.weightFrom)} -> ${fr(a.weightTo)}`,
})));

const detailFor = (a, which) =>
  `${a.name} · ${which === "from" ? FROM : TO} · ${fr(which === "from" ? a.ownFrom : a.ownTo)} % ` +
  `de son électricité bas-carbone · ${fr(which === "from" ? a.weightFrom : a.weightTo)} % du total ` +
  `bas-carbone des seize · ${fr(which === "from" ? a.lowFrom : a.lowTo, 0)} TWh`;

const shaped = arrows.map((a, i) => ({
  code: a.code,
  name: a.name,
  from: { x: a.ownFrom, y: a.weightFrom, detail: detailFor(a, "from") },
  to: { x: a.ownTo, y: a.weightTo, detail: detailFor(a, "to") },
  // The five heaviest carry a name; the rest are named by the pointer. Sixteen crossing arrows have
  // room for five labels and not for sixteen, and a label nobody can read is a collision.
  label: i < 5 || a.code === SUBJECT,
}));

const facts = beatFacts(
  arrows.map((a) => ({ key: a.code, label: a.name, value: a.ownTo })),
  {
    subject: subject.name,
    states: [String(FROM), String(TO)],
    markers: arrows.map((a) => ({ key: a.code, label: a.name, value: a.ownFrom })),
    declaredSequence: "%",
  },
);
const offered = applicableTreatments(facts);
console.log(`treatments applicable: ${offered.map((t) => t.id).join(", ") || "(none)"}\n`);

const title = `Les seize ont tous nettoyé leur propre électricité depuis ${FROM} — et ${lighter.length} pèsent moins qu'avant dans le total bas-carbone`;
const caveat =
  `Deux parts INDÉPENDANTES : en abscisse, la part bas-carbone de l'électricité du pays lui-même ; ` +
  `en ordonnée, la part qu'il représente dans l'électricité bas-carbone des seize. Chaque flèche va ` +
  `de ${FROM} à ${TO}. Aller à droite et descendre, c'est produire plus propre pendant que les ` +
  `autres produisent plus vite.`;
const readingLine =
  `Lecture : survolez, touchez ou tabulez une extrémité de flèche pour lire le pays, ses deux parts ` +
  `à cette date et les TWh bas-carbone qui sont derrière — la quantité que deux parts ne disent ` +
  `jamais. Le pointeur résout dans les deux axes.`;
const source = `Source : Ember, Energy Institute — Statistical Review of World Energy (2025), via Our World in Data · ${FROM} et ${TO}`;
const xTicks = [0, 20, 40, 60, 80, 100];
// Fitted to the readings, checked rather than chosen: a tick ceiling below the highest mark would
// draw France's own 2000 weight off the top of the frame, which is the silent kind of wrong.
const yCeiling = Math.ceil(Math.max(...arrows.map((a) => Math.max(a.weightFrom, a.weightTo))) / 10) * 10;
const yTicks = Array.from({ length: yCeiling / 10 + 1 }, (_, i) => i * 10);

const textPerRegister = {
  display: title,
  eyebrow: EYEBROW,
  body: `${caveat} ${readingLine} ${source}`,
  axis: `${xTicks.join(" ")} ${yTicks.join(" ")} %`,
  annot: `${subject.name} ${fr(subject.ownTo - subject.ownFrom)} pts chez elle ${fr(subject.weightTo - subject.weightFrom)} pts de poids`,
  value: shaped.filter((s) => s.label).map((s) => s.name).join(" "),
};

// EVERY REGISTER'S TEXT PASSES THROUGH `plain` BEFORE IT REACHES THE LADDER. One U+202F or U+00A0 —
// the spaces `toLocaleString("fr-FR")` emits, and the one a hand types without meaning to — refuses
// every family on the sans ladder and takes all three renders down with a message that names the
// code point and not the string. Measured on the marimekko beat, where a no-break space typed inside
// a band's own label, invisible in the source, stopped the whole build.
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
      component: DirectedConnectedScatterWeb,
      props: {
        arrows: shaped,
        subject: SUBJECT,
        xTicks, yTicks,
        xLabel: `part bas-carbone de l'électricité du pays`,
        yLabel: `part du pays dans le bas-carbone des seize`,
        title, eyebrow: EYEBROW, caveat, source, reading: readingLine,
        notes: [
          {
            code: SUBJECT,
            text:
              `+${fr(subject.ownTo - subject.ownFrom)} pts chez elle, ` +
              `${fr(subject.weightTo - subject.weightFrom)} pts de poids européen`,
          },
        ],
        alt:
          `Seize flèches dans un plan. L'abscisse est la part bas-carbone de l'électricité de chaque ` +
          `pays, l'ordonnée sa part dans l'électricité bas-carbone des seize ; chaque flèche va de ` +
          `${FROM} à ${TO}. Toutes vont vers la droite : tous les pays ont nettoyé leur propre ` +
          `production. ${lighter.length} pointent vers le bas, dont la ${subject.name}, qui gagne ` +
          `${fr(subject.ownTo - subject.ownFrom)} points chez elle et perd ` +
          `${fr(Math.abs(subject.weightTo - subject.weightFrom))} points de poids européen.`,
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
  }
}
if (refused.length) console.log(`\nrefused by ${refused.length}: ${refused.map((x) => x.id).join(", ")}`);
