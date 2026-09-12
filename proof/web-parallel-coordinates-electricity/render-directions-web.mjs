// twin/proof/web-parallel-coordinates-electricity/render-directions-web.mjs
//
// Sixteen European countries across seven electricity sources, rendered once per FILED DIRECTION into
// a self-contained interactive page.
//
// THE AXIS ORDER IS THE ARGUMENT: only ADJACENT axes let a reader see a relationship, so nuclear sits
// beside wind because the crossing between them IS the claim. The correlation is computed, not
// asserted.
//
// Usage:  bun proof/web-parallel-coordinates-electricity/render-directions-web.mjs

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
import { DirectedParallelWeb } from "./DirectedParallelWeb.tsx";

const HERE = dirname(fileURLToPath(import.meta.url));
const DIRECTIONS = join(HERE, "..", "..", "docs", "design-base", "directions");
const OUT = join(HERE, "renders");
const EYEBROW = "Énergie · Europe";
const YEAR = 2024;
const NUCLEAR_FLOOR = 25;
const WIND_FLOOR = 20;
const AXES = [
  ["nuclear_generation__twh", "nucléaire"],
  ["wind_generation__twh", "éolien"],
  ["hydro_generation__twh", "hydraulique"],
  ["solar_generation__twh", "solaire"],
  ["bioenergy_stacked_generation__twh", "biomasse"],
  ["gas_generation__twh", "gaz"],
  ["coal_generation__twh", "charbon"],
];
const ALL = [...AXES.map(([k]) => k), "oil_generation__twh", "other_renewables_generation__twh"];
const NAMES = {
  FRA: "France", DEU: "Allemagne", ESP: "Espagne", ITA: "Italie", GBR: "Royaume-Uni",
  POL: "Pologne", SWE: "Suède", NOR: "Norvège", CHE: "Suisse", AUT: "Autriche",
  NLD: "Pays-Bas", BEL: "Belgique", FIN: "Finlande", DNK: "Danemark", PRT: "Portugal",
  CZE: "Tchéquie", GRC: "Grèce", IRL: "Irlande",
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
const raw = csv.slice(1).map((line) => {
  const c = line.split(",");
  const o = { code: c[at("code")], year: Number(c[at("year")]) };
  for (const k of ALL) o[k] = Number(c[at(k)]);
  return o;
});

const countries = [...new Set(raw.filter((r) => r.year === YEAR).map((r) => r.code))];
for (const code of countries) if (!NAMES[code]) throw new Error(`${code} has no French name filed`);

const rows = countries.map((code) => {
  const r = raw.find((z) => z.code === code && z.year === YEAR);
  const total = ALL.reduce((s, k) => s + r[k], 0);
  if (!(total > 0)) throw new Error(`${NAMES[code]} generates nothing in ${YEAR}`);
  return {
    code,
    name: NAMES[code],
    shares: Object.fromEntries(AXES.map(([k]) => [k, (r[k] / total) * 100])),
    twh: Object.fromEntries(AXES.map(([k]) => [k, r[k]])),
    total,
  };
});

// ── THE CLAIM, ASSERTED ───────────────────────────────────────────────────────────────────────
const nuclearKey = AXES[0][0];
const windKey = AXES[1][0];
const heavyNuclear = rows.filter((r) => r.shares[nuclearKey] > NUCLEAR_FLOOR);
const heavyWind = rows.filter((r) => r.shares[windKey] > WIND_FLOOR);
const both = rows.filter((r) => r.shares[nuclearKey] > NUCLEAR_FLOOR && r.shares[windKey] > WIND_FLOOR);
const mean = (xs) => xs.reduce((s, v) => s + v, 0) / xs.length;
const corr = (() => {
  const a = rows.map((r) => r.shares[nuclearKey]);
  const b = rows.map((r) => r.shares[windKey]);
  const ma = mean(a);
  const mb = mean(b);
  const cov = a.reduce((s, v, i) => s + (v - ma) * (b[i] - mb), 0);
  const sa = Math.sqrt(a.reduce((s, v) => s + (v - ma) ** 2, 0));
  const sb = Math.sqrt(b.reduce((s, v) => s + (v - mb) ** 2, 0));
  return cov / (sa * sb);
})();
if (!(both.length >= 1 && both.length <= 4))
  throw new Error(`the headline names a handful doing both; ${both.length} do`);
console.log(
  `${rows.length} pays en ${YEAR} · ${heavyNuclear.length} au-dessus de ${NUCLEAR_FLOOR} % de ` +
    `nucléaire · ${heavyWind.length} au-dessus de ${WIND_FLOOR} % d'éolien · ${both.length} les deux ` +
    `(${both.map((r) => r.name).join(", ")}) · corrélation nucléaire/éolien ${fr(corr, 2)}\n`,
);

const axes = AXES.map(([key, name]) => {
  const ceiling = Math.ceil(Math.max(...rows.map((r) => r.shares[key])) / 10) * 10;
  return { key, name, ceiling, ceilingLabel: `${ceiling} %` };
});

const lines = rows
  .map((r) => ({
    code: r.code,
    name: r.name,
    values: axes.map((a) => r.shares[a.key]),
    highlight: both.some((b) => b.code === r.code),
    detail:
      `${r.name} · ${axes.map((a) => `${a.name} ${fr(r.shares[a.key])} %`).join(", ")} · ` +
      `${fr(r.total, 0)} TWh au total`,
  }))
  .sort((a, b) => Number(a.highlight) - Number(b.highlight));

console.table(rows.map((r) => Object.fromEntries([["pays", r.name], ...axes.map((a) => [a.name, fr(r.shares[a.key])])])));

const facts = beatFacts(
  rows.map((r) => ({ key: r.code, label: r.name, value: r.shares[nuclearKey] })),
  { subject: both[0].name, declaredSequence: "%" },
);
const offered = applicableTreatments(facts);
console.log(`treatments applicable: ${offered.map((t) => t.id).join(", ") || "(none)"}\n`);

const title = `${heavyNuclear.length} pays sur ${rows.length} tirent plus de ${NUCLEAR_FLOOR} % de leur électricité du nucléaire, ${heavyWind.length} plus de ${WIND_FLOOR} % de l'éolien — ${both.length} font les deux`;
const caveat =
  `Sept axes, un par source, chacun avec SON PROPRE plafond en pourcentage : un axe partagé ` +
  `mentirait sur sept quantités différentes. Une ligne par pays. Seuls deux axes VOISINS montrent ` +
  `une relation — un croisement entre voisins est un vrai inverse, une ligne qui remonte trois axes ` +
  `plus loin n'est rien.`;
const claimNote = `${both.map((r) => r.name).join(" et ")} : au-dessus des deux seuils`;
const readingLine =
  `Lecture : survolez, touchez ou tabulez n'importe quel point d'une ligne pour lire le pays et ses ` +
  `sept parts d'un coup — les sept points d'un pays répondent la même chose, donc il suffit d'en ` +
  `attraper un. C'est ce que l'image fixe ne peut pas faire : suivre une ligne parmi seize à ` +
  `travers quinze croisements. Ordre des axes : nucléaire contre éolien d'abord, parce que le ` +
  `croisement entre eux EST la démonstration (corrélation ${fr(corr, 2)}) ; puis bas-carbone, puis ` +
  `fossile.`;
const source = `Source : Ember, Energy Institute — Statistical Review of World Energy (2025), via Our World in Data · ${YEAR}`;

const textPerRegister = {
  display: title,
  eyebrow: EYEBROW,
  body: `${caveat} ${readingLine} ${source}`,
  axis: `${axes.map((a) => `${a.name} ${a.ceilingLabel}`).join(" ")}`,
  annot: claimNote,
  value: axes.map((a) => a.ceilingLabel).join(" "),
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
      component: DirectedParallelWeb,
      props: {
        axes, lines,
        title, eyebrow: EYEBROW, caveat, source, reading: readingLine, claimNote,
        alt:
          `Sept axes verticaux, un par source d'électricité, reliés par ${lines.length} lignes, une ` +
          `par pays. Chaque axe a son propre plafond. Entre l'axe du nucléaire et celui de l'éolien, ` +
          `les lignes se croisent abondamment : les pays hauts sur l'un sont bas sur l'autre ` +
          `(corrélation ${fr(corr, 2)}). Deux lignes, ${both.map((r) => r.name).join(" et ")}, sont ` +
          `hautes sur les deux et dessinées en couleur.`,
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
