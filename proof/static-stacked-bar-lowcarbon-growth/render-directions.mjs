// twin/proof/static-stacked-bar-lowcarbon-growth/render-directions.mjs
//
// Low-carbon electricity added since 2000, sixteen European countries, drawn once per filed direction
// through the design base. The first `stacked bar` beat in this tree.
//
// WHAT IT STACKS, AND WHY THAT AND NOT THE OBVIOUS THING. `100.datavizproject.com`'s viz23 says a
// stack should carry `[level, growth]` rather than `[earlier level, later level]`, so that "no
// segment's number has to be subtracted from another either". The reader gets the 2000 level, the
// increase since, and the 2024 total, and does no arithmetic at all.
//
// Every figure is computed from the frozen CSV before a mark is drawn, and the claim is ASSERTED.
//
// `renders/`, PLURAL. A render written to `render/` receives no approval and is invisible to the
// export guard.
//
// Usage:  bun proof/static-stacked-bar-lowcarbon-growth/render-directions.mjs

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
import { DirectedStackedBar } from "./DirectedStackedBar.tsx";
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
const FROM = 2000;
const TO = 2024;
const EYEBROW = "Énergie · Europe";
const refused = [];

const CLEAN = [
  "hydro_generation__twh",
  "wind_generation__twh",
  "solar_generation__twh",
  "bioenergy_stacked_generation__twh",
  "other_renewables_generation__twh",
  "nuclear_generation__twh",
];

const FRENCH = {
  Austria: "Autriche", Belgium: "Belgique", Czechia: "Tchéquie", Denmark: "Danemark",
  Finland: "Finlande", France: "France", Germany: "Allemagne", Greece: "Grèce",
  Ireland: "Irlande", Italy: "Italie", Netherlands: "Pays-Bas", Poland: "Pologne",
  Portugal: "Portugal", Spain: "Espagne", Sweden: "Suède", "United Kingdom": "Royaume-Uni",
};
const french = (e) => {
  if (!FRENCH[e]) throw new Error(`no French name recorded for ${e}`);
  return FRENCH[e];
};

const csv = (await readFile(join(HERE, "data.csv"), "utf8")).trim().split(/\r?\n/);
const header = csv[0].split(",");
const rowsRaw = csv.slice(1).map((l) => {
  const cells = l.split(",");
  return Object.fromEntries(header.map((h, i) => [h, cells[i]]));
});
const cleanTwh = (raw) => CLEAN.reduce((s, k) => s + Number(raw[k] || 0), 0);

const entities = [...new Set(rowsRaw.map((r) => r.entity))].sort();
const rows = entities
  .map((entity) => {
    const a = rowsRaw.find((r) => r.entity === entity && Number(r.year) === FROM);
    const b = rowsRaw.find((r) => r.entity === entity && Number(r.year) === TO);
    if (!a || !b) throw new Error(`${entity} is missing ${FROM} or ${TO}`);
    const level = cleanTwh(a);
    const total = cleanTwh(b);
    return { key: entity, label: french(entity), level, growth: total - level, total };
  })
  .sort((x, y) => y.growth - x.growth);

// ── THE CLAIM, ASSERTED ─────────────────────────────────────────────────────
const shrank = rows.filter((d) => d.growth <= 0);
if (shrank.length)
  throw new Error(
    `the plate stacks [level, growth] and ${shrank.length} shrank, which a stack cannot draw ` +
      `(${shrank.map((d) => `${d.label} ${d.growth.toFixed(0)}`).join(", ")}). ` +
      `A negative segment is a different form — a waterfall, or a diverging bar.`,
  );

const ADDER = "Spain";
const INCUMBENT = "France";
const adder = rows.find((d) => d.key === ADDER);
const incumbent = rows.find((d) => d.key === INCUMBENT);
if (rows[0].key !== ADDER)
  throw new Error(
    `the headline says ${french(ADDER)} added the most; ${rows[0].label} did ` +
      `(+${rows[0].growth.toFixed(0)} against +${adder.growth.toFixed(0)})`,
  );
if (!(adder.growth > incumbent.growth))
  throw new Error(
    `the headline says ${french(ADDER)} added more than ${french(INCUMBENT)}: ` +
      `+${adder.growth.toFixed(0)} against +${incumbent.growth.toFixed(0)}`,
  );
/** The sharper half: it started far lower. Derived, and the multiple is printed, so a data refresh
 *  that narrowed the gap would change the sentence rather than leave it standing. */
const headStart = incumbent.level / adder.level;
if (!(headStart >= 4))
  throw new Error(
    `the standfirst says ${french(INCUMBENT)} started several times higher; the ratio is ` +
      `${headStart.toFixed(2)}x`,
  );
/** And the incumbent is still the largest producer of low-carbon electricity, which is the reason
 *  the sentence is interesting rather than merely arithmetic. */
const largest = rows.reduce((a, b) => (b.total > a.total ? b : a));
if (largest.key !== INCUMBENT)
  throw new Error(
    `the standfirst says ${french(INCUMBENT)} is still the largest; ${largest.label} is ` +
      `(${largest.total.toFixed(0)} TWh)`,
  );

/** HOW MANY BARS THE PLATE CARRIES. A bar that must hold its own number is at least the annot
 *  register's own band thick, so the row count is capped by the frame — the component measures it
 *  and refuses. Sixteen missed by half a pixel in two directions of three; twelve fits all three.
 *
 *  WHICH twelve is a rule and it is printed: the twelve that added most, which is the quantity the
 *  plate is sorted by and the one the headline is about. Checked, not assumed: the pair the headline
 *  names must be among them. */
const DRAWN = 12;
const shown = rows.slice(0, DRAWN);
for (const key of [ADDER, INCUMBENT])
  if (!shown.some((d) => d.key === key))
    throw new Error(`${french(key)} is not among the ${DRAWN} largest adders, so the headline's own pair would be off the plate`);
const omitted = rows.slice(DRAWN);

console.table(
  rows.map((d) => ({
    pays: d.label,
    [`${FROM} TWh`]: d.level.toFixed(0),
    "ajouté TWh": `+${d.growth.toFixed(0)}`,
    [`${TO} TWh`]: d.total.toFixed(0),
  })),
);
console.log(
  `${rows.length} pays · ${adder.label} +${adder.growth.toFixed(0)} contre ` +
    `${incumbent.label} +${incumbent.growth.toFixed(0)} · départ ${headStart.toFixed(1)}x plus haut\n`,
);

const facts = beatFacts(
  shown.map((d) => ({ key: d.key, label: d.label, value: d.total })),
  {
    subject: ADDER,
    stack: { segments: 2, sharesATotal: true },
    bars: shown.length,
    pairs: shown.map((d) => ({ from: d.level, to: d.total })),
    declaredSequence: "growth since 2000",
  },
);
const offered = applicableTreatments(facts);
console.log(`treatments applicable: ${offered.map((t) => t.id).join(", ")}\n`);

const plain = (s) => s.replace(/[  ]/g, " ");
const format = (v) => plain(Math.round(v).toLocaleString("fr-FR"));

const drawn = shown.map((d) => ({ ...d, thread: d.key === ADDER || d.key === INCUMBENT }));

const title = [
  `L’Espagne a ajouté plus d’électricité bas-carbone que la France depuis ${FROM}`,
  `L’Espagne en a ajouté plus que la France depuis ${FROM}`,
  `Ce que chaque pays a ajouté depuis ${FROM}`,
];
const limits = [
  `Électricité bas-carbone — renouvelables et nucléaire réunis — produite en ${FROM}, et ce que ` +
    `chaque pays y a ajouté d’ici ${TO}, en TWh. L’Espagne partait ${format(headStart * 10 / 10)} fois ` +
    `plus bas que la France et en a ajouté ${format(adder.growth)} contre ${format(incumbent.growth)} ; ` +
    `la France reste de loin le premier producteur, à ${format(incumbent.total)} TWh. ` +
    `Les ${DRAWN} qui ont le plus ajouté sur ${rows.length} pays étudiés ; les ${omitted.length} autres ` +
    `(${omitted.map((d) => d.label).join(", ")}) ont aussi progressé.`,
  `Électricité bas-carbone produite en ${FROM} et ce qui y a été ajouté d’ici ${TO}, en TWh : les ` +
    `${DRAWN} qui ont le plus ajouté sur ${rows.length} pays étudiés, qui ont tous progressé. ` +
    `L’Espagne a ajouté ${format(adder.growth)}, la France ${format(incumbent.growth)}.`,
  `Électricité bas-carbone en ${FROM} et ce qui y a été ajouté d’ici ${TO}, en TWh : les ${DRAWN} ` +
    `qui ont le plus ajouté sur ${rows.length} pays, tous en hausse.`,
];
const reading = [
  `Lecture : chaque barre est un pays. Le segment pâle est sa production bas-carbone de ${FROM}, ` +
    `le segment plein ce qu’il a ajouté depuis ; le total de ${TO} est écrit au bout. Rien à ` +
    `additionner : chaque segment porte son propre nombre.`,
  `Lecture : segment pâle ${FROM}, segment plein ce qui a été ajouté, total de ${TO} au bout.`,
];
const source =
  "Source : Ember, Energy Institute – Statistical Review of World Energy (2025), via Our World in Data";
const segments = { level: `produit en ${FROM}`, growth: `ajouté depuis` };

const textPerRegister = {
  display: title.join(" "),
  eyebrow: EYEBROW,
  body: `${limits.join(" ")} ${source}`,
  axis: "TWh",
  annot:
    `${reading.join(" ")} ${segments.level} ${segments.growth} ` +
    `${shown.map((d) => d.label).join(" ")} ${shown.map((d) => format(d.level)).join(" ")}`,
  value: shown.map((d) => format(d.total)).join(" "),
};

const filed = readdirSync(DIRECTIONS)
  .filter((f) => f.endsWith(".md"))
  .map((f) => readDirection(join(DIRECTIONS, f)));
const newsroom = readPalette(HERE);
const BEAT_FACTS = { evidenceLevels: 4 };
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
      element: createElement(DirectedStackedBar, {
        // THE FRAME THIS RENDER DRAWS IN. The component used to hold a module constant; it takes the
        // run's own frame now, so one component serves landscape, portrait and square.
        frame: { width: FRAME.width, height: FRAME.height },
        rows: drawn,
        segments,
        title,
        limits,
        reading,
        source,
        alt:
          `Barres empilées : pour les ${DRAWN} pays européens qui ont le plus ajouté, l’électricité bas-carbone produite ` +
          `en ${FROM} puis ce qui y a été ajouté d’ici ${TO}, en TWh. L’Espagne a le plus ajouté, ` +
          `${format(adder.growth)} TWh, en partant de ${format(adder.level)} ; la France a ajouté ` +
          `${format(incumbent.growth)} en partant de ${format(incumbent.level)} et reste le premier ` +
          `producteur avec ${format(incumbent.total)} TWh. Aucun pays n’a reculé.`,
        eyebrow: EYEBROW,
        format,
        unit: "TWh",
        direction,
        treatments: offered.map((t) => t.id),
        onLadder: (note) => console.log(`  ${note}`),
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
    for (const ext of ["png", "svg"])
      await rm(join(OUT, `${nameAtSize(id, SIZE)}.${ext}`), { force: true });
    refused.push({ id, why: error.message });
    console.log(`  REFUSED — ${error.message}\n`);
  }
}
if (refused.length)
  console.log(`refused by ${refused.length}: ${refused.map((r) => r.id).join(", ")}`);
