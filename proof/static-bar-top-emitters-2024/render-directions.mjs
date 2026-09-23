// twin/proof/static-bar-top-emitters-2024/render-directions.mjs
//
// The ten largest CO2 emitters of 2024, drawn once per filed direction, through the design base.
// The ninth beat in this tree to go through it, and the first plain ranking.
//
// The claim is not retyped: `claimFrom` is imported from this beat's own `render.mjs`, so the
// search behind "the next five put together" runs once and both plates rest on the same answer.
// Two copies of that search would be two chances for the two renders to disagree about what the
// data says.
//
// `renders/`, PLURAL. A render written to `render/` receives no approval and is invisible to the
// export guard.
//
// Usage:  bun proof/static-bar-top-emitters-2024/render-directions.mjs

import { readdirSync } from "node:fs";
import { readFile, rm } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createElement } from "react";
import { renderStill } from "#shared/chart-beat/render-still.mjs";
import { readPalette } from "#shared/chart-beat/colour.mjs";
import { beatFacts, applicableTreatments } from "#shared/chart-beat/treatments.mjs";
import { readDirection } from "../../scripts/design-base/read-direction.mjs";
import { composeDirections, report } from "../../scripts/design-base/compose.mjs";
import { resolveDirectionFamilies } from "../../scripts/design-base/resolve-families.mjs";
import { claimFrom, parseCsv } from "./render.mjs";
import { formatValue } from "./TopEmittersColumns.tsx";
import { DirectedColumns } from "./DirectedColumns.tsx";

const HERE = dirname(fileURLToPath(import.meta.url));
const DIRECTIONS = join(HERE, "..", "..", "docs", "design-base", "directions");
const OUT = join(HERE, "renders");
const YEAR = 2024;
const EYEBROW = "Climat · Monde";
/** Directions that measured this beat and said no, collected rather than thrown. */
const refused = [];

const claim = parseCsv(await readFile(join(HERE, "data.csv"), "utf8"));
const {
  top,
  subject,
  subjectValue,
  beaten,
  beatenCount,
  combined,
  topShare,
  lastPlace,
  ratioToSecond,
} = claimFrom(claim);

/** THE PLATE IS IN FRENCH AND SO ARE ITS COLUMNS. The frozen data is OWID's, so its entities are
 *  English; a title reading "La Chine" over a column reading "China" is the plate talking to itself
 *  in two languages. This is copy, not data — the values, the order and the sum all stay computed —
 *  and a country the ranking reaches that is NOT in this table THROWS, because the ranking is a
 *  search: if the data moved and Canada entered the top ten, a silent English fallback would be the
 *  defect this table exists to prevent. */
const FRENCH = {
  China: { name: "Chine", withArticle: "la Chine" },
  "United States": { name: "États-Unis", withArticle: "les États-Unis" },
  India: { name: "Inde", withArticle: "l’Inde" },
  Russia: { name: "Russie", withArticle: "la Russie" },
  Japan: { name: "Japon", withArticle: "le Japon" },
  Indonesia: { name: "Indonésie", withArticle: "l’Indonésie" },
  Iran: { name: "Iran", withArticle: "l’Iran" },
  "Saudi Arabia": { name: "Arabie saoudite", withArticle: "l’Arabie saoudite" },
  "South Korea": { name: "Corée du Sud", withArticle: "la Corée du Sud" },
  Germany: { name: "Allemagne", withArticle: "l’Allemagne" },
};
const entryFor = (country) => {
  if (!FRENCH[country])
    throw new Error(
      `${country} reached the top ten and this plate has no French name for it — the ranking is a ` +
        `search, so the copy has to follow the data rather than assume last year's members`,
    );
  return FRENCH[country];
};
/** The bare name labels a column; the article form goes in a sentence. A country name dropped into
 *  French prose without its article — "Chine émet 2,5 fois plus que États-Unis" — is the furniture
 *  leak `static-discipline.md` counts as a defect even when every number is right. */
const french = (country) => entryFor(country).name;
const named = (country) => entryFor(country).withArticle;

const SPELLED = ["zéro", "un", "deux", "trois", "quatre", "cinq", "six", "sept", "huit", "neuf", "dix"];

const rows = top.map((r) => ({ name: french(r.country), value: r.value }));
const comparison = beaten.map((r) => french(r.country));

const facts = beatFacts(
  rows.map((r) => ({ key: r.name, label: r.name, value: r.value })),
  {
    subject: french(subject),
    bars: rows.length,
    comparisonSet: comparison.map((name) => ({ key: name })),
    namedSeries: rows.map((r) => r.name),
    declaredSequence: null,
  },
);
const offered = applicableTreatments(facts);
console.log(
  `${rows.length} colonnes · l'ensemble comparé est contigu: ${facts.comparisonIsContiguous} · ` +
    `treatments applicable: ${offered.map((t) => t.id).join(", ")}\n`,
);

const fr = (v, digits) =>
  v.toLocaleString("fr-FR", { minimumFractionDigits: digits, maximumFractionDigits: digits });
/** The beat's own format — one decimal above 1 bn t, two below, because at one decimal ranks 9 and
 *  10 both print `0,6` in a chart whose whole job is a ranking. Read from `TopEmittersColumns.tsx`
 *  and rewritten with the French decimal comma the rest of this plate's numbers use. */
const format = (v) => formatValue(v).replace(".", ",");

// THE COPY IS WRITTEN IN CHARACTERS ITS OWN DIRECTIONS CAN SET: `CO2`, not `CO₂`. No face on the
// serif ladder `resolveDirectionFamilies` walks carries U+2082, and a missing glyph is a silent
// fallback at render time and a different typeface in the delivered file.
const title =
  `${named(subject).replace(/^l/, "L")} a émis plus de CO2 en ${YEAR} que les ` +
  `${SPELLED[beatenCount]} pays suivants réunis`;
const limits =
  `CO2 territorial annuel, combustibles fossiles et industrie, en milliards de tonnes. ` +
  `Ces ${SPELLED[rows.length] ?? rows.length} pays représentent ${(topShare * 100).toFixed(0)} % du ` +
  `total mondial ; ${named(subject)} émet ${fr(ratioToSecond, 1)} fois plus que ` +
  `${named(top[1].country)}, et le dixième, ${named(lastPlace.country)}, ${format(lastPlace.value)}. ` +
  `Les émissions contenues dans les biens importés sont comptées là où les biens sont produits.`;
const source =
  "Source : Global Carbon Budget 2025, via Our World in Data · données 2024, extraites le 9 août 2026";
const comparisonNote = `Les ${SPELLED[beatenCount]} suivants réunis : ${format(combined)}`;

const textPerRegister = {
  display: title,
  eyebrow: EYEBROW,
  body: `${limits} ${source}`,
  axis: "0",
  annot: `${rows.map((r) => r.name).join(" ")} ${comparisonNote}`,
  value: rows.map((r) => format(r.value)).join(" "),
};

const filed = readdirSync(DIRECTIONS)
  .filter((f) => f.endsWith(".md"))
  .map((f) => readDirection(join(DIRECTIONS, f)));
const newsroom = readPalette(HERE);
const BEAT_FACTS = { evidenceLevels: 2 };
console.log(
  report(composeDirections({ newsroom, filed, beat: BEAT_FACTS, textPerRegister }), {
    beat: BEAT_FACTS,
  }),
);
console.log("");

for (const file of readdirSync(DIRECTIONS).filter((f) => f.endsWith(".md"))) {
  const id = file.replace(/\.md$/, "");
  const direction = resolveDirectionFamilies(readDirection(join(DIRECTIONS, file)), textPerRegister);

  console.log(id);
  for (const d of direction.decisions)
    console.log(
      `  ${d.register.padEnd(8)} ${d.role.padEnd(15)} -> ${d.family}` +
        (d.refused.length
          ? `   refused: ${d.refused.map((r) => `${r.family} [${r.missing.join(",")}]`).join(", ")}`
          : ""),
    );

  try {
    await renderStill({
      element: createElement(DirectedColumns, {
        rows,
        subject: french(subject),
        comparison,
        comparisonSum: combined,
        comparisonNote,
        format,
        title,
        limits,
        source,
        alt:
          `Colonnes classant les ${SPELLED[rows.length] ?? rows.length} pays qui ont le plus émis de ` +
          `CO2 en ${YEAR}. ${named(subject).replace(/^l/, "L")} est très au-dessus avec ` +
          `${format(subjectValue)} milliards de tonnes, ${fr(ratioToSecond, 1)} fois les ` +
          `${format(top[1].value)} de ${named(top[1].country)}, et ` +
          `davantage que ${comparison.join(", ")} réunis (${format(combined)}). Les colonnes suivantes ` +
          `descendent jusqu'à ${format(lastPlace.value)} pour ${french(lastPlace.country)}.`,
        eyebrow: EYEBROW,
        direction,
        treatments: offered.map((t) => t.id),
      }),
      // The beat pins `landscape` (1920 x 1080); 960 x 540 at scale 2 delivers exactly that.
      width: 960,
      height: 540,
      outDir: OUT,
      name: id,
      scale: 2,
    });
    console.log(`  -> renders/${id}.png\n`);
  } catch (error) {
    // A direction may measure this beat and refuse it; the refusal is the result rather than a
    // crash, and the stale PNG goes so nothing on disk reads as a fresh render of a direction that
    // declined. See `proof/static-diverging-bar-eu-per-capita/render-directions.mjs`, where one
    // direction does exactly that.
    for (const ext of ["png", "svg"]) await rm(join(OUT, `${id}.${ext}`), { force: true });
    refused.push({ id, why: error.message });
    console.log(`  REFUSED — ${error.message}\n`);
  }
}

if (refused.length)
  console.log(`refused by ${refused.length}: ${refused.map((r) => r.id).join(", ")}`);
