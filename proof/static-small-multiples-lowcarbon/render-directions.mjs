// twin/proof/static-small-multiples-lowcarbon/render-directions.mjs
//
// Sixteen European countries, 2000 against 2024, one panel each, drawn once per filed direction
// through the design base. The first `small multiples` beat in this tree.
//
// IT IS THE SAME DATA AS `proof/static-slope-europe-lowcarbon`, DELIBERATELY. That beat draws six of
// the sixteen and refuses more, because a slope has no value axis and therefore owes every end value
// it prints — sixteen labels on one rail push each other off their own lines. Split into panels,
// each pair gets its own space and its own numbers, and all sixteen fit. The cut bought the count,
// which is the argument for this family and the reason the pair of beats is worth having.
//
// `renders/`, PLURAL. A render written to `render/` receives no approval and is invisible to the
// export guard.
//
// Usage:  bun proof/static-small-multiples-lowcarbon/render-directions.mjs

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
import { DirectedSmallMultiples } from "./DirectedSmallMultiples.tsx";
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
const FOSSIL = ["gas_generation__twh", "coal_generation__twh", "oil_generation__twh"];

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
const shareOf = (raw) => {
  const clean = CLEAN.reduce((s, k) => s + Number(raw[k] || 0), 0);
  const total = clean + FOSSIL.reduce((s, k) => s + Number(raw[k] || 0), 0);
  if (!(total > 0)) throw new Error(`${raw.entity} reports no generation in ${raw.year}`);
  return (clean / total) * 100;
};

const entities = [...new Set(rowsRaw.map((r) => r.entity))].sort();
const panels = entities
  .map((entity) => {
    const a = rowsRaw.find((r) => r.entity === entity && Number(r.year) === FROM);
    const b = rowsRaw.find((r) => r.entity === entity && Number(r.year) === TO);
    if (!a || !b) throw new Error(`${entity} is missing ${FROM} or ${TO}`);
    const from = shareOf(a);
    const to = shareOf(b);
    return { key: entity, label: french(entity), from, to, delta: to - from };
  })
  .sort((x, y) => y.delta - x.delta);

// ── THE CLAIM, ASSERTED ─────────────────────────────────────────────────────
const fell = panels.filter((p) => p.delta <= 0);
if (fell.length)
  throw new Error(
    `the headline says all ${panels.length} rose; ${fell.length} did not ` +
      `(${fell.map((p) => `${p.label} ${p.delta.toFixed(1)}`).join(", ")})`,
  );

const biggest = panels[0];
const smallest = panels[panels.length - 1];
const highestStart = panels.reduce((a, b) => (b.from > a.from ? b : a));
/** The finding the grid makes visible and a ranked list would bury: the countries that moved most
 *  started lowest. Derived as a correlation between start and gain, not asserted by eye. */
const n = panels.length;
const mean = (xs) => xs.reduce((s, v) => s + v, 0) / n;
const mx = mean(panels.map((p) => p.from));
const my = mean(panels.map((p) => p.delta));
const cov = panels.reduce((s, p) => s + (p.from - mx) * (p.delta - my), 0);
const sx = Math.sqrt(panels.reduce((s, p) => s + (p.from - mx) ** 2, 0));
const sy = Math.sqrt(panels.reduce((s, p) => s + (p.delta - my) ** 2, 0));
const r = cov / (sx * sy);
if (!(r < -0.5))
  throw new Error(
    `the standfirst says the lowest starters gained most; the correlation between ${FROM} level and ` +
      `gain is ${r.toFixed(2)}, which is not a clear negative`,
  );

/** THE SHARED CEILING. One scale governs every panel — the rule this family exists for — and it is
 *  the next round hundred above the largest value anywhere in the set, so it is a number a reader
 *  can hold rather than the data's own ragged maximum. */
const largest = Math.max(...panels.flatMap((p) => [p.from, p.to]));
const CEILING = Math.ceil(largest / 25) * 25;

console.table(
  panels.map((p) => ({
    pays: p.label,
    [`${FROM} %`]: p.from.toFixed(1),
    [`${TO} %`]: p.to.toFixed(1),
    écart: `${p.delta >= 0 ? "+" : ""}${p.delta.toFixed(1)}`,
  })),
);
console.log(
  `${panels.length} panneaux · plafond partagé ${CEILING} % · corrélation départ/gain ${r.toFixed(2)} · ` +
    `plus forte hausse ${biggest.label} +${biggest.delta.toFixed(1)}\n`,
);

const facts = beatFacts(
  panels.map((p) => ({ key: p.key, label: p.label, value: p.to })),
  {
    subject: biggest.key,
    panels: { count: panels.length, sharedScale: true },
    pairs: panels.map((p) => ({ from: p.from, to: p.to })),
    scaleCeiling: CEILING,
    declaredSequence: "gain since 2000",
  },
);
const offered = applicableTreatments(facts);
console.log(`treatments applicable: ${offered.map((t) => t.id).join(", ")}\n`);

const plain = (s) => s.replace(/[  ]/g, " ");
const one = (v) =>
  plain(v.toLocaleString("fr-FR", { minimumFractionDigits: 1, maximumFractionDigits: 1 }));
const format = (v) => `${Math.round(v)}`;
const formatDelta = (v) => `${v >= 0 ? "+" : "−"}${Math.round(Math.abs(v))}`;

const drawn = panels.map((p) => ({
  ...p,
  thread: p.key === biggest.key || p.key === smallest.key,
}));

const title = [
  `Les seize ont tous progressé — et ceux qui partaient de plus bas ont le plus avancé`,
  `Tous ont progressé, et les plus bas le plus vite`,
  `Bas-carbone : ${FROM} contre ${TO}`,
];
const limits = [
  `Part de l’électricité bas-carbone — renouvelables et nucléaire réunis — en ${FROM} et en ${TO}, ` +
    `un panneau par pays, tous à la même échelle. ${biggest.label} gagne le plus, ` +
    `${formatDelta(biggest.delta)} points depuis ${one(biggest.from)} % ; ${smallest.label} le moins, ` +
    `${formatDelta(smallest.delta)}, en partant de ${one(smallest.from)} %.`,
  `Part de l’électricité bas-carbone en ${FROM} et en ${TO}, un panneau par pays, même échelle. ` +
    `${biggest.label} ${formatDelta(biggest.delta)} points, ${smallest.label} ${formatDelta(smallest.delta)}.`,
  `Part de l’électricité bas-carbone, ${FROM} et ${TO}, même échelle pour les seize.`,
];
const reading = [
  `Lecture : chaque panneau est un pays, dessiné sur la même échelle de 0 à ${CEILING} % que les ` +
    `quinze autres — c’est ce qui rend les panneaux comparables. Le nombre sous chaque paire est ` +
    `l’écart, en points.`,
  `Lecture : même échelle 0–${CEILING} % pour les seize ; le nombre sous chaque paire est l’écart.`,
];
const source =
  "Source : Ember, Energy Institute – Statistical Review of World Energy (2025), via Our World in Data";
const states = { from: String(FROM), to: String(TO) };

const textPerRegister = {
  display: title.join(" "),
  eyebrow: EYEBROW,
  body: `${limits.join(" ")} ${source}`,
  axis: `${CEILING} % part bas-carbone`,
  annot: `${reading.join(" ")} ${states.from} ${states.to} ${panels.map((p) => p.label).join(" ")}`,
  value: panels.map((p) => formatDelta(p.delta)).join(" "),
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
          ? `   refused: ${d.refused.map((x) => `${x.family} [${x.missing.join(",")}]`).join(", ")}`
          : ""),
    );
  try {
    await renderStill({
      element: createElement(DirectedSmallMultiples, {
        // THE FRAME THIS RENDER DRAWS IN. The component used to hold a module constant; it takes the
        // run's own frame now, so one component serves landscape, portrait and square.
        frame: { width: FRAME.width, height: FRAME.height },
        panels: drawn,
        states,
        ceiling: CEILING,
        title,
        limits,
        reading,
        source,
        alt:
          `Seize petits panneaux, un par pays européen : part de l’électricité bas-carbone en ${FROM} ` +
          `et en ${TO}, tous dessinés sur la même échelle de 0 à ${CEILING} %. Les seize ont ` +
          `progressé. ${biggest.label} gagne le plus, ${formatDelta(biggest.delta)} points depuis ` +
          `${one(biggest.from)} % ; ${smallest.label} le moins, ${formatDelta(smallest.delta)} depuis ` +
          `${one(smallest.from)} %. Les pays partis de plus bas sont ceux qui ont le plus avancé.`,
        eyebrow: EYEBROW,
        format,
        formatDelta,
        unit: `part bas-carbone, 0–${CEILING} %`,
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
  console.log(`refused by ${refused.length}: ${refused.map((x) => x.id).join(", ")}`);
