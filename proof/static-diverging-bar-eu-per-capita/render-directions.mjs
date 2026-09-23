// twin/proof/static-diverging-bar-eu-per-capita/render-directions.mjs
//
// Change in CO2 emissions per person since 1990, 27 EU countries, drawn once per filed direction
// through the design base. The eighth beat in this tree to go through it, and the one where the
// harvest changed the drawing least — see `DirectedDivergingBar.tsx`'s header for why that is a
// result rather than a shortfall.
//
// The claims are not retyped: `changesBetween` is imported from this beat's own `render.mjs`, so
// the two scripts read the frozen CSV with one reader and cannot drift apart. Every assertion the
// headline rests on ("the only EU country") is re-run here before a mark is drawn.
//
// `renders/`, PLURAL. A render written to `render/` receives no approval and is invisible to the
// export guard.
//
// Usage:  bun proof/static-diverging-bar-eu-per-capita/render-directions.mjs

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
import { changesBetween } from "./render.mjs";
import { DirectedDivergingBar } from "./DirectedDivergingBar.tsx";
import { assertBeatMayEnter, directedFrame, exportSizeFromArgv, nameAtSize } from "#shared/chart-beat/directed-size.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const DIRECTIONS = join(HERE, "..", "..", "docs", "design-base", "directions");
const OUT = join(HERE, "renders");

/** THE SIZE THIS RUN DRAWS AT, and whether this beat's own type may enter it at all. */
const SIZE = exportSizeFromArgv();
const EXPORT_FRAME = directedFrame(SIZE);
assertBeatMayEnter(HERE, SIZE, { what: basename(HERE) });
/** Directions that measured this beat and said no, collected rather than thrown. */
const refused = [];

const FROM = 1990;
const TO = 2024;
const MEMBERS = 27;
const EYEBROW = "Climat · Union européenne";

const csv = await readFile(join(HERE, "data.csv"), "utf8");
const changes = changesBetween(csv, FROM, TO);

// "The only" is the fragile kind of claim, so it is asserted here too rather than inherited from a
// sibling script that may not have been run.
if (changes.length !== MEMBERS)
  throw new Error(
    `expected the ${MEMBERS} member states with a reading in both ${FROM} and ${TO}, got ${changes.length}`,
  );
const rose = changes.filter((r) => r.change > 0);
const fell = changes.filter((r) => r.change < 0);
if (rose.length !== 1 || fell.length !== MEMBERS - 1)
  throw new Error(
    `the headline says exactly one rose and ${MEMBERS - 1} fell; the data says ${rose.length} and ${fell.length}`,
  );

const subject = rose[0];
const averageOfFalls = fell.reduce((sum, r) => sum + r.change, 0) / fell.length;
const largest = fell.reduce((a, b) => (b.change < a.change ? b : a));
const rows = changes.map((r) => ({ name: r.country, change: r.change }));

const facts = beatFacts(
  rows.map((r) => ({ key: r.name, label: r.name, value: r.change })),
  { subject: subject.country, namedSeries: rows.map((r) => r.name), unitMark: "t" },
);
const offered = applicableTreatments(facts);
console.log(
  `${rose.length} hausse · ${fell.length} baisses · diverge autour de zéro: ${facts.divergesAboutZero} · ` +
    `treatments applicable: ${offered.map((t) => t.id).join(", ")}\n`,
);

const two = (v) =>
  Math.abs(v).toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
// THE COPY IS WRITTEN IN CHARACTERS ITS OWN DIRECTIONS CAN SET. `CO2` rather than `CO₂`: the serif
// ladder `resolveDirectionFamilies` walks carries no face with U+2082, and a missing glyph is a
// silent fallback at render time and a different typeface in the delivered file.
/** THE HEADLINE IN FORMS, LONGEST FIRST — R0 on this plate's own ladder, spent after every
 *  standfirst rung and before the packing. Landscape and portrait take the first and stop there;
 *  only a frame as narrow as it is tall ever asks for the others. */
const title = [
  `La Croatie est le seul pays de l’UE à émettre plus de CO2 par personne qu’en ${FROM}`,
  `La Croatie est le seul pays de l’UE à émettre plus qu’en ${FROM}`,
  `Le seul pays de l’UE en hausse depuis ${FROM}`,
];
const limits =
  `Variation des émissions de CO2 par personne entre ${FROM} et ${TO}, en tonnes, dans les ${MEMBERS} États membres. ` +
  `La hausse croate est de ${two(subject.change)} t sur une base de ${two(subject.from)} t, soit ${(
    (subject.change / subject.from) *
    100
  ).toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} %. ` +
  `Les ${fell.length} autres baissent, de ${two(averageOfFalls)} t en moyenne, et le Luxembourg de ${two(largest.change)} t.`;
const source =
  "Source : Global Carbon Budget (2025) ; population d’après diverses sources (2024), traitement Our World in Data · combustibles fossiles et industrie uniquement";
const subjectNote = `la seule hausse depuis ${FROM}`;
/** R8's OWN SENTENCE, and it is a function because the number in it is the count the component's
 *  ladder ACTUALLY took — never a literal typed here. It names the RULE as well as the count,
 *  because « 13 des 27 » over a drawing that keeps the rise and the deepest falls would let a
 *  reader take the thirteen for a sample of the union, which they are not. The counter beside it
 *  goes on naming the whole: « Moyenne des 26 baisses ». */
const scope = (drawn, all) =>
  `${drawn} des ${all} États membres : la hausse et les ${drawn - 1} plus fortes baisses.`;

const textPerRegister = {
  display: title.join(" "),
  eyebrow: EYEBROW,
  body: `${limits} ${source}`,
  axis: "0",
  annot: `${rows.map((r) => r.name).join(" ")} ${subjectNote} Moyenne des ${fell.length} baisses`,
  value: rows.map((r) => `+− ${two(r.change)}`).join(" "),
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
    element: createElement(DirectedDivergingBar, {
        frame: { width: EXPORT_FRAME.width, height: EXPORT_FRAME.height },
      rows,
      subject: subject.country,
      subjectNote,
      averageOfFalls,
      title,
      limits,
      source,
      /** THE ALT DESCRIBES THE BARS THAT ARE DRAWN, so it is a function of them: a sentence
       *  written for twenty-seven over a plate R8 reduced would send a screen reader looking for
       *  marks nobody drew. What it never stops saying is how many fell in the FILE. */
      alt: (drawnRows) =>
        `Barres divergentes : la variation des émissions de CO2 par personne entre ${FROM} et ${TO} ` +
        `${
          drawnRows.length === rows.length
            ? `dans les ${MEMBERS} pays de l’UE`
            : `dans ${drawnRows.length} des ${MEMBERS} pays de l’UE — la hausse et les ` +
              `${drawnRows.length - 1} plus fortes baisses`
        }. La Croatie est la seule en hausse (+${two(subject.change)} t) ; les ${fell.length} autres baissent, ` +
        `de ${two(largest.change)} t pour le Luxembourg, la plus forte baisse.`,
      eyebrow: EYEBROW,
      scope,
      direction,
      treatments: offered.map((t) => t.id),
    }),
    // THE SLOT'S OWN SIZE. `--size` picks it; landscape is what an article's column asks for.
    width: EXPORT_FRAME.width,
    height: EXPORT_FRAME.height,
    outDir: OUT,
    name: nameAtSize(id, SIZE),
    scale: EXPORT_FRAME.scale,
    });
    console.log(`  -> renders/${nameAtSize(id, SIZE)}.png\n`);
  } catch (error) {
    // A DIRECTION MAY REFUSE THIS BEAT, and the refusal is the result rather than a crash.
    // The alternative is what this file did once — render it anyway and drop 14 of the 27 numbers
    // without saying so.
    //
    // AT LANDSCAPE NOTHING REFUSES ANY MORE; the packing ladder in `DirectedDivergingBar.tsx` grew
    // rungs until `nocturne` — the largest display, the largest padding, an uppercased and tracked
    // annot register — fitted its 27 rows in three columns.
    //
    // AT SQUARE ALL THREE STILL REFUSE, AND NOW THEY REFUSE WITH THE COPY LADDER SPENT. The
    // headline was one fixed string until 2026-09-23, so the first reading of this — "the header
    // takes 454 of 540 drawn pixels" — was a measurement of a plate that had never been asked to
    // give anything back. It has three forms now, spent after all three standfirst rungs, and the
    // answer does not move: with the shortest headline, the standfirst gone and the average of the
    // falls standing in its place, ONE column of 27 rows reaches a pitch of 7.8px in creme, 8.8px
    // in rapport and 6.1px in nocturne, against the 15.8 / 15.4 / 15.1px a row owes to print its
    // own number. Half. There is no rung left that buys 27 x 8px of height out of a 540px frame
    // whose padding alone is 104 to 112 of it.
    //
    // TWO COLUMNS FAIL ON A WIDTH, WHICH NO RUNG ON THE COPY LADDER BUYS. Cyprus falls 0.52 t and
    // Luxembourg 20.48 t — 1 part in 39.4 — so a panel that draws the smallest fall as a LENGTH
    // rather than a tick owes 2 x 39.4 = 79px. A column also costs 150px (creme) to 167px
    // (nocturne) of gutter before a bar starts: a value lane its longest number grows into, and a
    // name lane against the zero rule. 229px a column, twice, plus a 24px alley = 481px, against
    // the 436 / 448 / 428px a 540px frame leaves inside the direction's own padding. Short by 45,
    // 43 and 87px. Stepping the value register down does not close it either: it would have to
    // reach 7.6px where creme files 15, and the name lane — the larger half of the cost — is set
    // in the annot register and would not move.
    //
    // So the honest answer is R9: this beat does not ship square. Portrait is where its row form
    // lives, it is offered there and at landscape, and the refusal names what was spent.
    //
    // The stale PNG from a run that DID drop them is removed, so nothing on disk can be read as a
    // fresh render of a direction that refused.
    for (const ext of ["png", "svg"])
      await rm(join(OUT, `${nameAtSize(id, SIZE)}.${ext}`), { force: true });
    refused.push({ id, why: error.message });
    console.log(`  REFUSED — ${error.message}\n`);
  }
}

if (refused.length)
  console.log(
    `${refused.length} of ${readdirSync(DIRECTIONS).filter((f) => f.endsWith(".md")).length} directions refused this beat at ` +
      // The size actually drawn, not the landscape one this line used to name whatever `--size` said.
      `${EXPORT_FRAME.width * EXPORT_FRAME.scale}x${EXPORT_FRAME.height * EXPORT_FRAME.scale}: ` +
      refused.map((r) => r.id).join(", "),
  );
