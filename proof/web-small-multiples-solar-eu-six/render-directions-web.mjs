// twin/proof/web-small-multiples-solar-eu-six/render-directions-web.mjs
//
// Six European countries' solar generation, one panel each, 2010 to 2024. Rendered once per FILED
// DIRECTION into a self-contained interactive page.
//
// Usage:  bun proof/web-small-multiples-solar-eu-six/render-directions-web.mjs

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
import { DirectedSmallMultiplesWeb } from "./DirectedSmallMultiplesWeb.tsx";

const HERE = dirname(fileURLToPath(import.meta.url));
const DIRECTIONS = join(HERE, "..", "..", "docs", "design-base", "directions");
const OUT = join(HERE, "renders");
const EYEBROW = "Énergie · Europe";
const COLUMNS = 3;
const NAMES = { FRA: "France", DEU: "Allemagne", ITA: "Italie", POL: "Pologne", ROU: "Roumanie", ESP: "Espagne" };

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
  return { code: c[at("Code")], year: Number(c[at("Year")]), solar: Number(c[at("Solar")]) };
});
const years = [...new Set(raw.map((r) => r.year))].sort((a, b) => a - b);
const codes = [...new Set(raw.map((r) => r.code))];
for (const code of codes) if (!NAMES[code]) throw new Error(`${code} has no French name filed`);

const rows = codes
  .map((code) => {
    const series = years.map((year) => {
      const r = raw.find((z) => z.code === code && z.year === year);
      if (!r || !Number.isFinite(r.solar))
        throw new Error(`${NAMES[code]} has no ${year} reading — a panel with a hole is not a multiple`);
      return { year, value: r.solar };
    });
    const before = series[0].value;
    const after = series[series.length - 1].value;
    const passedOne = series.find((s) => s.value >= 1);
    return { code, name: NAMES[code], series, before, after, factor: before > 0 ? after / before : null, passedOne };
  })
  .sort((a, b) => b.after - a.after);

// ── THE CLAIM, ASSERTED ───────────────────────────────────────────────────────────────────────
if (rows.some((r) => r.after <= r.before))
  throw new Error(`the headline says all six grew; ${rows.filter((r) => r.after <= r.before).map((r) => r.name).join(", ")} did not`);
const fastest = rows.reduce((a, b) => ((b.factor ?? 0) > (a.factor ?? 0) ? b : a));
const biggest = rows[0];
console.log(
  `${rows.length} pays, ${years.length} années ${years[0]}-${years[years.length - 1]} · plus gros ` +
    `producteur ${biggest.name} ${fr(biggest.after)} TWh · plus forte multiplication ${fastest.name} ` +
    `x${fr(fastest.factor, 0)} (${fr(fastest.before, 2)} -> ${fr(fastest.after)} TWh)\n`,
);
console.table(rows.map((r) => ({ pays: r.name, [years[0]]: fr(r.before, 2), [years[years.length - 1]]: fr(r.after), facteur: r.factor ? `x${fr(r.factor, 0)}` : "—" })));

const ceiling = Math.ceil(Math.max(...rows.map((r) => r.after)) / 10) * 10;
const panels = rows.map((r, i) => ({
  code: r.code,
  name: r.name,
  series: r.series,
  endLabel: `${fr(r.after, 0)} TWh`,
  highlight: r.code === biggest.code || r.code === fastest.code,
  detail:
    `${r.name} · ${fr(r.before, 2)} TWh en ${years[0]} → ${fr(r.after)} TWh en ${years[years.length - 1]}` +
    (r.factor ? ` · multiplié par ${fr(r.factor, 0)}` : "") +
    ` · ${i + 1}ᵉ producteur des six en ${years[years.length - 1]}` +
    (r.passedOne
      ? r.passedOne.year === years[0]
        ? " · déjà au-dessus d'un TWh au départ"
        : ` · a passé un TWh en ${r.passedOne.year}`
      : " · n'a jamais atteint un TWh"),
}));

const facts = beatFacts(
  rows.map((r) => ({ key: r.code, label: r.name, value: r.after })),
  { subject: biggest.name, declaredSequence: "TWh" },
);
const offered = applicableTreatments(facts);
console.log(`treatments applicable: ${offered.map((t) => t.id).join(", ") || "(none)"}\n`);

// The tension is the finding: the country that multiplied its solar the most is the one whose panel
// looks flattest, because a factor and a quantity are different questions and a shared scale answers
// only the second.
const title =
  `La ${fastest.name} a multiplié son solaire par ${fr(fastest.factor, 0)} — et reste la courbe la ` +
  `plus plate des six`;
const caveat =
  `Un panneau par pays, production solaire annuelle en TWh. Tous partagent la même échelle et les ` +
  `mêmes années : dès qu'un panneau est ajusté à ses propres données, la grille cesse d'être une ` +
  `comparaison et devient six graphiques sans rapport sous une même légende.`;
const sharedNote =
  `Partagé : 0 à ${ceiling} TWh, ${years[0]}-${years[years.length - 1]}. Répété : le nom et la ` +
  `valeur finale. Un facteur et une quantité sont deux questions différentes ; l'échelle commune ne ` +
  `répond qu'à la seconde, et la platitude d'un panneau EST sa réponse.`;
const readingLine =
  `Lecture : survolez, touchez ou tabulez un panneau pour lire les deux extrémités, le facteur, le ` +
  `rang et l'année du premier TWh — ${fr(years.length, 0)} années qu'un panneau ne peut pas porter.`;
const source = `Source : Ember, Energy Institute — Statistical Review of World Energy (2025), via Our World in Data · ${years[0]}-${years[years.length - 1]}`;

const textPerRegister = {
  display: title,
  eyebrow: EYEBROW,
  body: `${caveat} ${readingLine} ${source}`,
  axis: panels.map((p) => `${p.name} ${p.endLabel}`).join(" "),
  annot: sharedNote,
  value: panels.map((p) => p.endLabel).join(" "),
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
      component: DirectedSmallMultiplesWeb,
      props: {
        panels, columns: COLUMNS, years, ceiling, sharedNote,
        title, eyebrow: EYEBROW, caveat, source, reading: readingLine,
        alt:
          `Une grille de ${rows.length} panneaux, un par pays, tous à la même échelle de 0 à ` +
          `${ceiling} TWh et sur les mêmes années. Celui de ${biggest.name} monte de ` +
          `${fr(biggest.before, 2)} à ${fr(biggest.after)} TWh et remplit son panneau ; celui de ` +
          `${rows[rows.length - 1].name} reste une ligne presque plate au bas du sien, à ` +
          `${fr(rows[rows.length - 1].after)} TWh.`,
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
