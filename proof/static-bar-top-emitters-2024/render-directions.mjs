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
import { basename, dirname, join } from "node:path";
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
import { assertBeatMayEnter, directedFrame, exportSizeFromArgv, nameAtSize } from "#shared/chart-beat/directed-size.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const DIRECTIONS = join(HERE, "..", "..", "docs", "design-base", "directions");
const OUT = join(HERE, "renders");
/** THE SIZE THIS RUN DRAWS AT, and whether this beat's own type may enter it at all: a tall frame is a
 *  different drawing, not a stretched one, and `type-at-size.mjs` refuses a type whose range nobody has
 *  measured rather than shipping an aspect nobody chose. */
const SIZE = exportSizeFromArgv();
const FRAME = directedFrame(SIZE);
assertBeatMayEnter(HERE, SIZE, { what: basename(HERE) });
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
/** THE HEADLINE IN FORMS, LONGEST FIRST — R0 on this plate's own ladder, spent after the
 *  standfirst's forms and before a single rank is given up. It was one string until 2026-09-24,
 *  which is a ladder with no rung: at 540x540 the row form handed ten names 3px of pitch because
 *  the header had taken everything and had nothing to give back. Every form keeps the whole claim
 *  — who, what, when, and how many it beats — because the claim is the only thing on the plate
 *  that a reader cannot reconstruct from the drawing. */
const title = [
  `${named(subject).replace(/^l/, "L")} a émis plus de CO2 en ${YEAR} que les ` +
    `${SPELLED[beatenCount]} pays suivants réunis`,
  `${named(subject).replace(/^l/, "L")} a émis plus de CO2 en ${YEAR} que les ` +
    `${SPELLED[beatenCount]} suivants réunis`,
  `${named(subject).replace(/^l/, "L")} en ${YEAR} : plus de CO2 que les ` +
    `${SPELLED[beatenCount]} suivants réunis`,
];
/** THE STANDFIRST IN FORMS, LONGEST FIRST, and each one drops a whole reading rather than trimming
 *  words off the last. The unit goes last because nothing else on the plate states it; the caveat
 *  about imported goods goes first because it qualifies a number the reader can still read
 *  correctly without it. The form that names the tenth is SKIPPED by the component whenever R8 has
 *  removed the tenth — a standfirst pointing at a bar that is not drawn is worse than a short
 *  one. */
const limits = [
  `CO2 territorial annuel, combustibles fossiles et industrie, en milliards de tonnes. ` +
    `Ces ${SPELLED[rows.length] ?? rows.length} pays représentent ${(topShare * 100).toFixed(0)} % du ` +
    `total mondial ; ${named(subject)} émet ${fr(ratioToSecond, 1)} fois plus que ` +
    `${named(top[1].country)}, et le dixième, ${named(lastPlace.country)}, ${format(lastPlace.value)}. ` +
    `Les émissions contenues dans les biens importés sont comptées là où les biens sont produits.`,
  `CO2 territorial annuel, combustibles fossiles et industrie, en milliards de tonnes. ` +
    `Ces ${SPELLED[rows.length] ?? rows.length} pays représentent ${(topShare * 100).toFixed(0)} % du ` +
    `total mondial ; ${named(subject)} émet ${fr(ratioToSecond, 1)} fois plus que ` +
    `${named(top[1].country)}.`,
  `CO2 territorial annuel, combustibles fossiles et industrie, en milliards de tonnes. ` +
    `Ces ${SPELLED[rows.length] ?? rows.length} pays représentent ${(topShare * 100).toFixed(0)} % du ` +
    `total mondial.`,
  `CO2 territorial annuel, combustibles fossiles et industrie, en milliards de tonnes.`,
];
/** R8's OWN SENTENCE, a function because the number in it is the count the component's ladder
 *  ACTUALLY took. The ranks R8 removes are the TAIL of the ranking — the ones the headline never
 *  names — so the sentence is « les N premiers des dix »: a reader is told they are looking at the
 *  top of a ranking, and at how much of it. */
const scope = (drawn, all) =>
  `Les ${drawn} premiers des ${all} plus gros émetteurs.`;
const source =
  "Source : Global Carbon Budget 2025, via Our World in Data · données 2024, extraites le 9 août 2026";
const comparisonNote = `Les ${SPELLED[beatenCount]} suivants réunis : ${format(combined)}`;

const textPerRegister = {
  display: title.join(" "),
  eyebrow: EYEBROW,
  body: `${limits.join(" ")} ${source}`,
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
        // THE FRAME THIS RENDER DRAWS IN. The component used to hold a module constant; it takes the
        // run's own frame now, so one component serves landscape, portrait and square.
        frame: { width: FRAME.width, height: FRAME.height },
        rows,
        subject: french(subject),
        comparison,
        comparisonSum: combined,
        comparisonNote,
        format,
        title,
        limits,
        scope,
        /** THE ROWS R8 MAY NOT DROP: the subject and every country the headline adds up against
         *  it. They are the top ranks, contiguous, so what R8 removes is always the tail. */
        keep: [french(subject), ...comparison],
        source,
        /** THE ALT DESCRIBES THE COLUMNS THAT ARE DRAWN, so it is a function of them rather than
         *  a string written for ten. Its last sentence names where the ranking on the plate STOPS,
         *  and under R8 that is not the tenth — a screen reader told the columns run down to
         *  Germany would be looking for a bar the frame never drew. */
        alt: (drawnRows) =>
          `Colonnes classant ${
            drawnRows.length === rows.length
              ? `les ${SPELLED[rows.length] ?? rows.length} pays qui ont le plus émis de CO2 en ${YEAR}`
              : `les ${SPELLED[drawnRows.length] ?? drawnRows.length} premiers des ` +
                `${SPELLED[rows.length] ?? rows.length} pays qui ont le plus émis de CO2 en ${YEAR}`
          }. ${named(subject).replace(/^l/, "L")} est très au-dessus avec ` +
          `${format(subjectValue)} milliards de tonnes, ${fr(ratioToSecond, 1)} fois les ` +
          `${format(top[1].value)} de ${named(top[1].country)}, et ` +
          `davantage que ${comparison.join(", ")} réunis (${format(combined)}). Les colonnes suivantes ` +
          `descendent jusqu'à ${format(drawnRows[drawnRows.length - 1].value)} pour ` +
          `${drawnRows[drawnRows.length - 1].name}.`,
        eyebrow: EYEBROW,
        direction,
        treatments: offered.map((t) => t.id),
      }),
      // THE SLOT'S OWN SIZE. `--size` picks it; landscape is what an article's column asks for and
      // what this lineage's tuning was measured at. The frame is half the export size at scale 2.
      width: FRAME.width,
      height: FRAME.height,
      outDir: OUT,
      name: nameAtSize(id, SIZE),
      scale: FRAME.scale,
    });
    console.log(`  -> renders/${nameAtSize(id, SIZE)}.png\n`);
  } catch (error) {
    // A direction may measure this beat and refuse it; the refusal is the result rather than a
    // crash, and the stale PNG goes so nothing on disk reads as a fresh render of a direction that
    // declined. See `proof/static-diverging-bar-eu-per-capita/render-directions.mjs`, where one
    // direction does exactly that.
    for (const ext of ["png", "svg"])
      await rm(join(OUT, `${nameAtSize(id, SIZE)}.${ext}`), { force: true });
    refused.push({ id, why: error.message });
    console.log(`  REFUSED — ${error.message}\n`);
  }
}

if (refused.length)
  console.log(`refused by ${refused.length}: ${refused.map((r) => r.id).join(", ")}`);
