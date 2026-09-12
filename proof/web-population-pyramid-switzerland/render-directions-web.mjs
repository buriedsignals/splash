// twin/proof/web-population-pyramid-switzerland/render-directions-web.mjs
//
// Switzerland's population by age band and sex in 2023, rendered once per FILED DIRECTION into a
// self-contained interactive page.
//
// THE WIDEST BAND IS FOUND, NOT TYPED, and the headline is asserted against it: a pyramid whose
// widest band is not its youngest is an ageing population, and that is the whole claim.
//
// Usage:  bun proof/web-population-pyramid-switzerland/render-directions-web.mjs

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
import { DirectedPyramidWeb } from "./DirectedPyramidWeb.tsx";

const HERE = dirname(fileURLToPath(import.meta.url));
const DIRECTIONS = join(HERE, "..", "..", "docs", "design-base", "directions");
const OUT = join(HERE, "renders");
const EYEBROW = "Démographie · Suisse";

const plain = (s) => plainSpaces(s);
const fr = (v, d = 0) =>
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
  return {
    band: c[at("age_band")],
    male: Number(c[at("male")]),
    female: Number(c[at("female")]),
    year: Number(c[at("year")]),
  };
});
const year = rows[0].year;
if (rows.some((r) => r.year !== year)) throw new Error("the frozen file spans more than one year");
for (const r of rows)
  if (!Number.isFinite(r.male) || !Number.isFinite(r.female)) throw new Error(`${r.band} has no usable reading`);

const total = rows.reduce((s, r) => s + r.male + r.female, 0);
const widest = rows.reduce((a, b) => (b.male + b.female > a.male + a.female ? b : a));
const youngest = rows[0];

// ── THE CLAIM, ASSERTED ───────────────────────────────────────────────────────────────────────
if (widest.band === youngest.band)
  throw new Error(`the headline says the widest band is not the youngest; it is ${widest.band}`);
console.log(
  `${rows.length} tranches · ${fr(total)} habitants en ${year} · bande la plus large ${widest.band} ` +
    `(${fr(widest.male + widest.female)}) · 0-4 ans ${fr(youngest.male + youngest.female)}\n`,
);
console.table(rows.map((r) => ({ tranche: r.band, hommes: fr(r.male), femmes: fr(r.female), total: fr(r.male + r.female), "% du total": ((r.male + r.female) / total * 100).toFixed(1) })));

const bands = rows.map((r) => {
  const bandTotal = r.male + r.female;
  const gap = r.female - r.male;
  return {
    key: r.band,
    left: r.male,
    right: r.female,
    peak: r.band === widest.band,
    detail:
      `${r.band} ans · ${fr(r.male)} hommes, ${fr(r.female)} femmes · ${fr(bandTotal)} personnes, ` +
      `${((bandTotal / total) * 100).toFixed(1).replace(".", ",")} % de la population · ` +
      `${gap === 0 ? "parité exacte" : `${fr(Math.abs(gap))} ${gap > 0 ? "femmes" : "hommes"} de plus`}`,
  };
});

const facts = beatFacts(
  rows.map((r) => ({ key: r.band, label: r.band, value: r.male + r.female })),
  { subject: widest.band, declaredSequence: "personnes" },
);
const offered = applicableTreatments(facts);
console.log(`treatments applicable: ${offered.map((t) => t.id).join(", ") || "(none)"}\n`);

const span = Math.ceil(Math.max(...rows.flatMap((r) => [r.male, r.female])) / 50000) * 50000;
const xTicks = [-span, -span / 2, 0, span / 2, span];

const title = `La tranche la plus large de la Suisse est celle des ${widest.band} ans, pas celle des 0-4 ans`;
const caveat =
  `Population suisse en ${year}, par tranche de cinq ans, hommes à gauche et femmes à droite d'une ` +
  `ligne centrale. Une pyramide la plus large au MILIEU est une population qui vieillit, pas une ` +
  `population qui croît — et rien d'autre que la tranche nommée ne dit laquelle.`;
const peakNote = `${widest.band} ans : ${fr(widest.male + widest.female)} personnes`;
const readingLine =
  `Lecture : survolez, touchez ou tabulez une tranche pour lire les deux effectifs, leur total, ` +
  `l'écart entre les sexes et la part de cette tranche dans la population — la part est ce qui ` +
  `transforme une silhouette en affirmation sur le nombre de gens.`;
const source = `Source : Office fédéral de la statistique · population résidente permanente, ${year}`;

const textPerRegister = {
  display: title,
  eyebrow: EYEBROW,
  body: `${caveat} ${readingLine} ${source} hommes femmes`,
  axis: `${bands.map((b) => b.key).join(" ")} ${xTicks.map((t) => `${Math.abs(t) / 1000}k`).join(" ")}`,
  annot: peakNote,
  value: bands.map((b) => `${fr(b.left)} ${fr(b.right)}`).join(" "),
};
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
      component: DirectedPyramidWeb,
      props: {
        bands, span, xTicks,
        sideLabels: { left: "hommes", right: "femmes" },
        peakNote,
        title, eyebrow: EYEBROW, caveat, source, reading: readingLine,
        alt:
          `Une pyramide des âges : ${rows.length} tranches de cinq ans empilées, les hommes vers la ` +
          `gauche et les femmes vers la droite. La silhouette ne s'élargit pas vers le bas : elle est ` +
          `la plus large à la tranche ${widest.band} ans (${fr(widest.male + widest.female)} ` +
          `personnes) et se resserre vers les plus jeunes, où les 0-4 ans ne comptent que ` +
          `${fr(youngest.male + youngest.female)} personnes.`,
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
