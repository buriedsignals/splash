// twin/proof/web-grouped-bar-wind-vs-solar/render-directions-web.mjs
//
// Wind against solar in six countries' 2024 electricity, rendered once per FILED DIRECTION into a
// self-contained interactive page.
//
// Usage:  bun proof/web-grouped-bar-wind-vs-solar/render-directions-web.mjs

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
import { DirectedGroupedBarWeb } from "./DirectedGroupedBarWeb.tsx";

const HERE = dirname(fileURLToPath(import.meta.url));
const DIRECTIONS = join(HERE, "..", "..", "docs", "design-base", "directions");
const OUT = join(HERE, "renders");
const EYEBROW = "Énergie · Europe";
const YEAR = 2024;
const SOURCES = ["Other renewables", "Bioenergy", "Solar", "Wind", "Hydropower", "Nuclear", "Gas", "Oil", "Coal"];
const NAMES = { FRA: "France", DEU: "Allemagne", NOR: "Norvège", POL: "Pologne", SWE: "Suède", CHE: "Suisse" };

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
  const o = { code: c[at("Code")], year: Number(c[at("Year")]) };
  for (const k of SOURCES) o[k] = Number(c[at(k)]);
  return o;
});

const groups = Object.keys(NAMES)
  .map((code) => {
    const r = raw.find((z) => z.code === code && z.year === YEAR);
    if (!r) throw new Error(`${NAMES[code]} has no ${YEAR} row`);
    const total = SOURCES.reduce((s, k) => s + r[k], 0);
    if (!(total > 0)) throw new Error(`${NAMES[code]} generates nothing in ${YEAR}`);
    const wind = (r.Wind / total) * 100;
    const solar = (r.Solar / total) * 100;
    return {
      code,
      name: NAMES[code],
      a: wind,
      b: solar,
      windTwh: r.Wind,
      solarTwh: r.Solar,
      total,
      aLabel: `${fr(wind)}`,
      bLabel: `${fr(solar)}`,
      detail:
        `${NAMES[code]} · ${YEAR} · éolien ${fr(wind)} % (${fr(r.Wind, 1)} TWh), solaire ` +
        `${fr(solar)} % (${fr(r.Solar, 1)} TWh) · rapport ` +
        (solar > 0 ? `${fr(wind / solar, 2)} fois plus d'éolien que de solaire` : "pas de solaire") +
        ` · production totale ${fr(total, 0)} TWh`,
    };
  })
  .sort((x, z) => z.a + z.b - (x.a + x.b));

// ── THE CLAIM, ASSERTED ───────────────────────────────────────────────────────────────────────
const outliers = groups.filter((g) => g.b > g.a);
if (outliers.length !== 1)
  throw new Error(`the headline names one country where solar beats wind; ${outliers.length} do`);
const subject = outliers[0];
console.log(
  `${groups.length} pays en ${YEAR} · un seul où le solaire dépasse l'éolien : ${subject.name} ` +
    `(${fr(subject.b)} % contre ${fr(subject.a)} %)\n`,
);
console.table(groups.map((g) => ({ pays: g.name, "éolien %": g.aLabel, "solaire %": g.bLabel, "TWh total": fr(g.total, 0) })));

const facts = beatFacts(
  groups.map((g) => ({ key: g.code, label: g.name, value: g.a })),
  { subject: subject.name, declaredSequence: "%" },
);
const offered = applicableTreatments(facts);
console.log(`treatments applicable: ${offered.map((t) => t.id).join(", ") || "(none)"}\n`);

const ceiling = Math.ceil(Math.max(...groups.flatMap((g) => [g.a, g.b])) / 5) * 5;
const yTicks = Array.from({ length: ceiling / 5 + 1 }, (_, i) => i * 5).filter((t) => t % 10 === 0 || ceiling <= 20);

const title = `La ${subject.name} est la seule des six où le solaire dépasse l'éolien`;
const caveat =
  `Part de l'éolien et du solaire dans la production d'électricité de chaque pays en ${YEAR}. Les ` +
  `deux barres d'un pays se touchent, et l'écart avec le pays suivant est plus large qu'une barre : ` +
  `c'est ce qui fait lire des GROUPES plutôt qu'une file de barres alternées.`;
const subjectNote = `${subject.name} : solaire ${fr(subject.b)} % > éolien ${fr(subject.a)} %`;
const readingLine =
  `Lecture : survolez, touchez ou tabulez un groupe pour lire les deux parts, leur rapport, les TWh ` +
  `derrière chacune et la production totale du pays — ce qu'une comparaison côte à côte ne dit ni ` +
  `de l'écart ni du tout dont il vient.`;
const source = `Source : Ember, Energy Institute — Statistical Review of World Energy (2025), via Our World in Data · ${YEAR}`;

const textPerRegister = {
  display: title,
  eyebrow: EYEBROW,
  body: `${caveat} ${readingLine} ${source} éolien solaire`,
  axis: `${yTicks.join(" ")} % ${groups.map((g) => g.name).join(" ")}`,
  annot: subjectNote,
  value: groups.flatMap((g) => [g.aLabel, g.bLabel]).join(" "),
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
      component: DirectedGroupedBarWeb,
      props: {
        groups,
        subject: subject.code,
        seriesLabels: { a: "éolien", b: "solaire" },
        yTicks,
        unit: "%",
        title, eyebrow: EYEBROW, caveat, source, reading: readingLine, subjectNote,
        alt:
          `Six paires de colonnes, une paire par pays, mesurant la part de l'éolien et celle du ` +
          `solaire dans l'électricité de ${YEAR}. Dans cinq paires la colonne éolienne est la plus ` +
          `haute ; dans celle de la ${subject.name}, c'est la colonne solaire, ${fr(subject.b)} % ` +
          `contre ${fr(subject.a)} %.`,
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
