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
import { dirname, join } from "node:path";
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

const HERE = dirname(fileURLToPath(import.meta.url));
const DIRECTIONS = join(HERE, "..", "..", "docs", "design-base", "directions");
const OUT = join(HERE, "renders");
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
const title = `La Croatie est le seul pays de l’UE à émettre plus de CO2 par personne qu’en ${FROM}`;
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

const textPerRegister = {
  display: title,
  eyebrow: EYEBROW,
  body: `${limits} ${source}`,
  axis: "0",
  annot: `${rows.map((r) => r.name).join(" ")} ${subjectNote} Moyenne des ${fell.length} baisses`,
  value: rows.map((r) => `+− ${two(r.change)}`).join(" "),
};

const filed = readdirSync(DIRECTIONS)
  .filter((f) => f.endsWith(".md"))
  .map((f) => readDirection(join(DIRECTIONS, f)));
const newsroom = readPalette(HERE, { stopAt: join(HERE, "..") });
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
      rows,
      subject: subject.country,
      subjectNote,
      averageOfFalls,
      title,
      limits,
      source,
      alt:
        `Barres divergentes : la variation des émissions de CO2 par personne entre ${FROM} et ${TO} dans les ` +
        `${MEMBERS} pays de l’UE. La Croatie est la seule en hausse (+${two(subject.change)} t) ; les ${fell.length} autres baissent, ` +
        `de ${two(largest.change)} t pour le Luxembourg, la plus forte baisse.`,
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
    // A DIRECTION MAY REFUSE THIS BEAT, and the refusal is the result rather than a crash.
    // `nocturne` sets the largest display, the largest padding and an uppercased, tracked annot
    // register, and 27 rows will not print their values under it at 1920 x 1080: two columns reach
    // 13.0px of pitch against the 15.8px a value needs, and a third column draws the smallest fall
    // 0.7px long, which is a table. The alternative is what this file did an hour ago — render it
    // anyway and drop 14 of the 27 numbers without saying so.
    //
    // The stale PNG from a run that DID drop them is removed, so nothing on disk can be read as a
    // fresh render of a direction that refused.
    for (const ext of ["png", "svg"]) await rm(join(OUT, `${id}.${ext}`), { force: true });
    refused.push({ id, why: error.message });
    console.log(`  REFUSED — ${error.message}\n`);
  }
}

if (refused.length)
  console.log(
    `${refused.length} of ${readdirSync(DIRECTIONS).filter((f) => f.endsWith(".md")).length} directions refused this beat at 1920x1080: ` +
      refused.map((r) => r.id).join(", "),
  );
