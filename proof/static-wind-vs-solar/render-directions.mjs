// twin/proof/static-wind-vs-solar/render-directions.mjs
//
// Wind against solar, drawn once per filed direction, through the real engine. The seventh beat in
// this tree to go through the design base.
//
// `renders/`, PLURAL. A render written to `render/` receives no approval and is invisible to the
// export guard.
//
// Usage:  bun proof/static-wind-vs-solar/render-directions.mjs

import { readdirSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { basename, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createElement } from "react";
import { renderStill } from "#shared/chart-beat/render-still.mjs";
import { readPalette } from "#shared/chart-beat/colour.mjs";
import { beatFacts, applicableTreatments } from "#shared/chart-beat/treatments.mjs";
import { readDirection } from "../../scripts/design-base/read-direction.mjs";
import { composeDirections, report } from "../../scripts/design-base/compose.mjs";
import { resolveDirectionFamilies } from "../../scripts/design-base/resolve-families.mjs";
import { DirectedGroupedBar } from "./DirectedGroupedBar.tsx";
import { assertBeatMayEnter, directedFrame, exportSizeFromArgv, nameAtSize } from "#shared/chart-beat/directed-size.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const DIRECTIONS = join(HERE, "..", "..", "docs", "design-base", "directions");
const OUT = join(HERE, "renders");

/** THE SIZE THIS RUN DRAWS AT, and whether this beat's own type may enter it at all. */
const SIZE = exportSizeFromArgv();
const EXPORT_FRAME = directedFrame(SIZE);
assertBeatMayEnter(HERE, SIZE, { what: basename(HERE) });

const FIRST = "Éolien";
const SECOND = "Solaire";
const SUBJECT = "Suisse";
const EYEBROW = "Énergie · Europe";
const FR = {
  France: "France",
  Germany: "Allemagne",
  Norway: "Norvège",
  Poland: "Pologne",
  Sweden: "Suède",
  Switzerland: "Suisse",
};

const rows = (await readFile(join(HERE, "data.csv"), "utf8")).trim().split(/\r?\n/);
const head = rows[0].split(",");
const at = (cells, name) => Number(cells[head.indexOf(name)]);
/**
 * SHARES OF A COUNTRY'S OWN GENERATION, IN 2024 — not the raw terawatt-hours the file carries, and
 * not both of its years. A first version took every row and got twelve groups of absolute TWh: the
 * beat is about what fraction of each country's electricity each source makes, which is a number
 * this file holds only after the division.
 */
const SOURCES = ["Other renewables", "Bioenergy", "Solar", "Wind", "Hydropower", "Nuclear", "Gas", "Oil", "Coal"];
const groups = rows
  .slice(1)
  .map((l) => l.split(","))
  .filter((c) => FR[c[0]] && Number(c[head.indexOf("Year")]) === 2024)
  .map((c) => {
    const total = SOURCES.reduce((t, name) => t + at(c, name), 0);
    return {
      name: FR[c[0]],
      first: (at(c, "Wind") / total) * 100,
      second: (at(c, "Solar") / total) * 100,
    };
  });

const facts = beatFacts(
  groups.flatMap((g) => [
    { key: `${g.name}-w`, value: g.first },
    { key: `${g.name}-s`, value: g.second },
  ]),
  {
    subject: SUBJECT,
    namedSeries: [FIRST, SECOND],
    groups: groups.map((g) => ({ key: g.name, bars: 2 })),
    // Six countries carry no sequence of their own: no date, no accounting order, no hierarchy.
    // `null` is what makes the order a decision rather than a given.
    declaredSequence: null,
  },
);
const offered = applicableTreatments(facts);
console.log(`${groups.length} groupes · treatments applicable: ${offered.map((t) => t.id).join(", ")}`);

const reversals = groups.filter((g) => g.second > g.first);
const lead = groups.length - reversals.length;
console.log(`derived: ${lead} pays sur ${groups.length} où l’éolien devance le solaire\n`);

const title = `Dans ${lead} de ces ${groups.length} pays l’éolien devance le solaire — la Suisse est l’exception`;
const limits =
  "Part de la production électrique nationale en 2024. Les pays sont classés par l’écart entre les deux, pas par ordre alphabétique.";
const source = "Source : Ember, Energy Institute — Statistical Review of World Energy (2025), via Our World in Data";
const callout = `${SECOND} devant ${FIRST.toLowerCase()}`;

const textPerRegister = {
  display: title,
  eyebrow: EYEBROW,
  body: `${limits} ${source}`,
  axis: "0 10 20 30",
  annot: `${FIRST} ${SECOND} ${groups.map((g) => g.name).join(" ")} ${callout}`,
  value: groups.map((g) => `${g.first} ${g.second}`).join(" "),
};

const filed = readdirSync(DIRECTIONS)
  .filter((f) => f.endsWith(".md"))
  .map((f) => readDirection(join(DIRECTIONS, f)));
const newsroom = readPalette(HERE);
const BEAT_FACTS = { evidenceLevels: 3 };
console.log(
  report(composeDirections({ newsroom, filed, beat: BEAT_FACTS, textPerRegister }), { beat: BEAT_FACTS }),
);
console.log("");

for (const file of readdirSync(DIRECTIONS).filter((f) => f.endsWith(".md"))) {
  const id = file.replace(/\.md$/, "");
  const direction = resolveDirectionFamilies(readDirection(join(DIRECTIONS, file)), textPerRegister);
  console.log(id);
  for (const d of direction.decisions)
    console.log(
      `  ${d.register.padEnd(8)} ${d.role.padEnd(15)} -> ${d.family}` +
        (d.refused.length ? `   refused: ${d.refused.map((r) => r.family).join(", ")}` : ""),
    );

  await renderStill({
    element: createElement(DirectedGroupedBar, {
        frame: { width: EXPORT_FRAME.width, height: EXPORT_FRAME.height },
      groups,
      firstName: FIRST,
      secondName: SECOND,
      subject: SUBJECT,
      callout,
      title,
      limits,
      source,
      alt: `Barres groupées : part de l’éolien et du solaire dans la production électrique de ${groups.length} pays européens en 2024.`,
      eyebrow: EYEBROW,
      direction,
      treatments: offered.map((t) => t.id),
    }),
    // The beat pins `landscape` (1920 x 1080); 960 x 540 at scale 2 delivers exactly that.
    // THE SLOT'S OWN SIZE. `--size` picks it; landscape is what an article's column asks for.
    width: EXPORT_FRAME.width,
    height: EXPORT_FRAME.height,
    outDir: OUT,
    name: nameAtSize(id, SIZE),
    scale: EXPORT_FRAME.scale,
  });
  console.log(`  -> renders/${nameAtSize(id, SIZE)}.png\n`);
}
