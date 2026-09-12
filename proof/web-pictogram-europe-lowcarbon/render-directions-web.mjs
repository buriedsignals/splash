// twin/proof/web-pictogram-europe-lowcarbon/render-directions-web.mjs
//
// One square, one country: the European countries that report 2024 generation, split into three
// blocks by the low-carbon share of their electricity. Rendered once per FILED DIRECTION.
//
// "POLARISED" IS EXACTLY THE KIND OF WORD A PICTURE INVITES AND A COUNT SETTLES, so the page does not
// use it: it prints the three counts and lets the reader check them by counting squares. The beat
// asserts that the middle holds under a quarter of the field and that the three blocks account for
// every country.
//
// Usage:  bun proof/web-pictogram-europe-lowcarbon/render-directions-web.mjs

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
import { DirectedPictogramWeb } from "./DirectedPictogramWeb.tsx";

const HERE = dirname(fileURLToPath(import.meta.url));
const DIRECTIONS = join(HERE, "..", "..", "docs", "design-base", "directions");
const OUT = join(HERE, "renders");
const EYEBROW = "Énergie · Europe";
const YEAR = 2024;
const HIGH = 75;
const LOW = 60;
const COLUMNS = 20;
const LOWC = ["other_renewables_generation__twh", "bioenergy_stacked_generation__twh", "solar_generation__twh", "wind_generation__twh", "hydro_generation__twh", "nuclear_generation__twh"];
const FOSSIL = ["gas_generation__twh", "oil_generation__twh", "coal_generation__twh"];
const NAMES = {
  ALB: "Albanie", AUT: "Autriche", BLR: "Biélorussie", BEL: "Belgique", BIH: "Bosnie-H.",
  BGR: "Bulgarie", HRV: "Croatie", CYP: "Chypre", CZE: "Tchéquie", DNK: "Danemark",
  EST: "Estonie", FIN: "Finlande", FRA: "France", DEU: "Allemagne", GRC: "Grèce",
  HUN: "Hongrie", ISL: "Islande", IRL: "Irlande", ITA: "Italie", LVA: "Lettonie",
  LTU: "Lituanie", LUX: "Luxembourg", MLT: "Malte", MDA: "Moldavie", MNE: "Monténégro",
  NLD: "Pays-Bas", MKD: "Macédoine du N.", NOR: "Norvège", POL: "Pologne", PRT: "Portugal",
  ROU: "Roumanie", RUS: "Russie", SRB: "Serbie", SVK: "Slovaquie", SVN: "Slovénie",
  ESP: "Espagne", SWE: "Suède", CHE: "Suisse", TUR: "Turquie", UKR: "Ukraine", GBR: "Royaume-Uni",
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
  for (const k of [...LOWC, ...FOSSIL]) o[k] = Number(c[at(k)]);
  return o;
});

const rows = raw
  .filter((r) => r.year === YEAR)
  .map((r) => {
    const low = LOWC.reduce((s, k) => s + r[k], 0);
    const total = low + FOSSIL.reduce((s, k) => s + r[k], 0);
    return { code: r.code, total, share: total > 0 ? (low / total) * 100 : null };
  })
  .filter((r) => r.share !== null)
  .sort((a, b) => b.share - a.share);
for (const r of rows) if (!NAMES[r.code]) throw new Error(`${r.code} has no French name filed`);

const above = rows.filter((r) => r.share >= HIGH);
const middle = rows.filter((r) => r.share < HIGH && r.share >= LOW);
const below = rows.filter((r) => r.share < LOW);

// ── THE CLAIM, ASSERTED ───────────────────────────────────────────────────────────────────────
if (above.length + middle.length + below.length !== rows.length)
  throw new Error("the three blocks do not account for every country");
if (!(middle.length / rows.length < 0.25))
  throw new Error(`the middle holds ${middle.length} of ${rows.length}, not under a quarter`);
console.log(
  `${rows.length} pays européens en ${YEAR} · ${above.length} au-dessus de ${HIGH} % bas-carbone · ` +
    `${middle.length} entre ${LOW} et ${HIGH} · ${below.length} sous ${LOW}\n`,
);
console.table([
  { bloc: `>= ${HIGH} %`, pays: above.length, exemples: above.slice(0, 4).map((r) => NAMES[r.code]).join(", ") },
  { bloc: `${LOW}-${HIGH} %`, pays: middle.length, exemples: middle.map((r) => NAMES[r.code]).join(", ") },
  { bloc: `< ${LOW} %`, pays: below.length, exemples: below.slice(0, 4).map((r) => NAMES[r.code]).join(", ") },
]);

const blockOf = (r) => (r.share >= HIGH ? 0 : r.share >= LOW ? 1 : 2);
const squares = rows.map((r, i) => ({
  code: r.code,
  name: NAMES[r.code],
  block: blockOf(r),
  detail:
    `${NAMES[r.code]} · ${fr(r.share)} % de son électricité est bas-carbone · ` +
    `${i + 1}ᵉ sur ${rows.length} · ${fr(r.total, 0)} TWh produits en ${YEAR} · ` +
    `bloc ${[`≥ ${HIGH} %`, `${LOW}–${HIGH} %`, `< ${LOW} %`][blockOf(r)]}`,
}));

const blocks = [
  { key: "high", heading: `${above.length} pays au-dessus de ${HIGH} % bas-carbone`, count: above.length },
  { key: "mid", heading: `${middle.length} entre ${LOW} et ${HIGH} %`, count: middle.length },
  { key: "low", heading: `${below.length} sous ${LOW} %`, count: below.length },
];

const facts = beatFacts(
  rows.map((r) => ({ key: r.code, label: NAMES[r.code], value: r.share })),
  { subject: NAMES[rows[0].code], declaredSequence: "%" },
);
const offered = applicableTreatments(facts);
console.log(`treatments applicable: ${offered.map((t) => t.id).join(", ") || "(none)"}\n`);

const title = `Un carré, un pays : ${above.length} pays européens sur ${rows.length} dépassent ${HIGH} % d'électricité bas-carbone, ${below.length} sont sous ${LOW} %`;
const caveat =
  `Les ${rows.length} pays européens qui publient une production ${YEAR}, un carré chacun, rangés ` +
  `par part bas-carbone décroissante. Un carré est un PAYS, pas une quantité : c'est ce qui rend ` +
  `« combien » visible là où une barre rend « combien de plus » visible. Comptez-les.`;
const readingLine =
  `Lecture : survolez, touchez ou tabulez un carré pour lire le pays, sa part exacte, son rang sur ` +
  `${rows.length} et sa production. Le pictogramme jette la valeur exprès ; la page la rend à la ` +
  `demande.`;
const source = `Source : Ember, Energy Institute — Statistical Review of World Energy (2025), via Our World in Data · ${YEAR}`;

const textPerRegister = {
  display: title,
  eyebrow: EYEBROW,
  body: `${caveat} ${readingLine} ${source}`,
  axis: blocks.map((b) => b.heading).join(" "),
  annot: blocks.map((b) => b.heading).join(" "),
  value: rows.map((r) => fr(r.share)).join(" "),
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
      component: DirectedPictogramWeb,
      props: {
        squares, blocks, columns: COLUMNS,
        title, eyebrow: EYEBROW, caveat, source, reading: readingLine,
        alt:
          `${rows.length} carrés, un par pays, en trois blocs. Le premier bloc, en couleur pleine, ` +
          `compte ${above.length} carrés : les pays au-dessus de ${HIGH} % d'électricité ` +
          `bas-carbone. Le deuxième, en teinte claire, en compte ${middle.length}. Le troisième, ` +
          `neutre, en compte ${below.length} : les pays sous ${LOW} %. Le bloc du milieu est de loin ` +
          `le plus petit.`,
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
