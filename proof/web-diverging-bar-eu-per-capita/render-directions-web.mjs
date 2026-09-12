// twin/proof/web-diverging-bar-eu-per-capita/render-directions-web.mjs
//
// The change in CO₂ per person of the 27 EU member states between 1990 and 2024, rendered once per
// FILED DIRECTION into a self-contained interactive page.
//
// THE 27 ARE THE UNION'S OWN MEMBERSHIP, and the beat asserts every one of them carries a reading in
// both years before anything is drawn — a diverging bar with a country silently missing is a ranking
// that is wrong and does not know it.
//
// Usage:  bun proof/web-diverging-bar-eu-per-capita/render-directions-web.mjs

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
import { DirectedDivergingBarWeb } from "./DirectedDivergingBarWeb.tsx";

const HERE = dirname(fileURLToPath(import.meta.url));
const DIRECTIONS = join(HERE, "..", "..", "docs", "design-base", "directions");
const OUT = join(HERE, "renders");
const EYEBROW = "Climat · Union européenne";
const FROM = 1990;
const TO = 2024;
const NAMES = {
  AUT: "Autriche", BEL: "Belgique", BGR: "Bulgarie", HRV: "Croatie", CYP: "Chypre",
  CZE: "Tchéquie", DNK: "Danemark", EST: "Estonie", FIN: "Finlande", FRA: "France",
  DEU: "Allemagne", GRC: "Grèce", HUN: "Hongrie", IRL: "Irlande", ITA: "Italie",
  LVA: "Lettonie", LTU: "Lituanie", LUX: "Luxembourg", MLT: "Malte", NLD: "Pays-Bas",
  POL: "Pologne", PRT: "Portugal", ROU: "Roumanie", SVK: "Slovaquie", SVN: "Slovénie",
  ESP: "Espagne", SWE: "Suède",
};

const plain = (s) => plainSpaces(s);
const fr = (v, d = 2) =>
  plain(v.toLocaleString("fr-FR", { minimumFractionDigits: d, maximumFractionDigits: d }));
const signed = (v, d = 2) => `${v >= 0 ? "+" : "−"}${fr(Math.abs(v), d)}`;

const csv = (await readFile(join(HERE, "data.csv"), "utf8")).trim().split(/\r?\n/);
const header = csv[0].split(",");
const at = (n) => header.indexOf(n);
const all = csv.slice(1).map((line) => {
  const c = line.split(",");
  return { code: c[at("Code")], year: Number(c[at("Year")]), value: Number(c[header.length - 1]) };
});
const value = (code, year) => all.find((r) => r.code === code && r.year === year)?.value ?? null;

const rows = Object.keys(NAMES)
  .map((code) => {
    const before = value(code, FROM);
    const after = value(code, TO);
    if (before === null || after === null)
      throw new Error(`${NAMES[code]} has no reading in ${before === null ? FROM : TO}`);
    return { code, name: NAMES[code], before, after, change: after - before };
  })
  .sort((a, b) => b.change - a.change);

// ── THE CLAIM, ASSERTED ───────────────────────────────────────────────────────────────────────
const risers = rows.filter((r) => r.change > 0);
if (risers.length !== 1)
  throw new Error(`the headline says exactly one member emits more than in ${FROM}; ${risers.length} do`);
const subject = risers[0];
const biggestFall = rows[rows.length - 1];
const meanFall = rows.filter((r) => r.change < 0).reduce((s, r) => s + r.change, 0) / (rows.length - risers.length);
console.log(
  `${rows.length} États membres · un seul en hausse : ${subject.name} ${signed(subject.change)} t ` +
    `(${fr(subject.before)} -> ${fr(subject.after)}) · plus forte baisse ${biggestFall.name} ` +
    `${signed(biggestFall.change)} · baisse moyenne des 26 ${fr(meanFall)}\n`,
);
console.table(rows.map((r, i) => ({ rang: i + 1, pays: r.name, [FROM]: fr(r.before), [TO]: fr(r.after), écart: signed(r.change) })));

const falls = rows.filter((r) => r.change < 0).sort((a, b) => a.change - b.change);
const shaped = rows.map((r) => {
  const rank = falls.findIndex((f) => f.code === r.code);
  return {
    code: r.code,
    name: r.name,
    change: r.change,
    label: signed(r.change, 1),
    detail:
      `${r.name} · ${fr(r.before)} t en ${FROM} → ${fr(r.after)} t en ${TO} · ${signed(r.change)} t ` +
      `par personne · ` +
      (rank >= 0 ? `${rank + 1}ᵉ plus forte baisse des ${rows.length}` : `seule hausse de l'Union`),
  };
});

const facts = beatFacts(
  rows.map((r) => ({ key: r.code, label: r.name, value: r.change })),
  { subject: subject.name, declaredSequence: "t CO₂ par personne" },
);
const offered = applicableTreatments(facts);
console.log(`treatments applicable: ${offered.map((t) => t.id).join(", ") || "(none)"}\n`);

const span = Math.ceil(Math.max(...rows.map((r) => Math.abs(r.change))));
const xTicks = [-span, -span / 2, 0, span / 2, span].map((t) => Math.round(t * 10) / 10);

const title = `La ${subject.name} est le seul pays de l'Union à émettre plus de CO₂ par personne qu'en ${FROM}`;
const caveat =
  `Écart entre ${FROM} et ${TO}, en tonnes de CO₂ par personne, pour les ${rows.length} États ` +
  `membres. Le CÔTÉ de la ligne zéro porte le signe ; la couleur ne fait que le répéter. Les 26 ` +
  `autres baissent de ${fr(Math.abs(meanFall))} t en moyenne.`;
const subjectNote = `${subject.name} : ${signed(subject.change)} t`;
const readingLine =
  `Lecture : survolez, touchez ou tabulez une barre pour lire les DEUX valeurs derrière l'écart — ` +
  `${FROM} et ${TO} — et le rang du pays dans les baisses. Une différence cache toujours les deux ` +
  `nombres dont elle vient.`;
const source = `Source : Global Carbon Budget (2025) · population, avec traitement Our World in Data · ${FROM} et ${TO}`;

const textPerRegister = {
  display: title,
  eyebrow: EYEBROW,
  body: `${caveat} ${readingLine} ${source}`,
  axis: `${xTicks.join(" ")} ${rows.map((r) => r.name).join(" ")}`,
  annot: subjectNote,
  value: shaped.map((r) => r.label).join(" "),
};

// EVERY REGISTER'S TEXT PASSES THROUGH `plain` BEFORE IT REACHES THE LADDER. One U+202F or U+00A0 —
// the spaces `toLocaleString("fr-FR")` emits, and the one a hand types without meaning to — refuses
// every family on the sans ladder and takes all three renders down with a message that names the
// code point and not the string. Measured on the marimekko beat, where a no-break space typed inside
// a band's own label, invisible in the source, stopped the whole build.
for (const key of Object.keys(textPerRegister)) textPerRegister[key] = plain(textPerRegister[key]);

const filed = readdirSync(DIRECTIONS).filter((f) => f.endsWith(".md")).map((f) => readDirection(join(DIRECTIONS, f)));
const newsroom = readPalette(HERE, { stopAt: join(HERE, "..") });
const BEAT_FACTS = { evidenceLevels: 2 };
console.log(report(composeDirections({ newsroom, filed, beat: BEAT_FACTS, textPerRegister }), { beat: BEAT_FACTS }));
console.log("");

const refused = [];
for (const file of readdirSync(DIRECTIONS).filter((f) => f.endsWith(".md"))) {
  const id = file.replace(/\.md$/, "");
  const direction = resolveDirectionFamilies(readDirection(join(DIRECTIONS, file)), textPerRegister);
  try {
    await renderWeb({
      component: DirectedDivergingBarWeb,
      props: {
        rows: shaped,
        subject: subject.code,
        xTicks,
        span,
        title, eyebrow: EYEBROW, caveat, source, reading: readingLine, subjectNote,
        sideLabels: { left: "baisse depuis " + FROM, right: "hausse depuis " + FROM },
        alt:
          `Vingt-sept barres horizontales partant d'une ligne zéro, une par État membre, classées de ` +
          `la plus forte hausse à la plus forte baisse. Une seule part vers la droite : la ` +
          `${subject.name}, ${signed(subject.change)} tonne par personne. Toutes les autres partent ` +
          `vers la gauche, jusqu'au ${biggestFall.name} à ${signed(biggestFall.change)} tonnes.`,
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
