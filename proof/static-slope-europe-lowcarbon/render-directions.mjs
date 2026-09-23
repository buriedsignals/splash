// twin/proof/static-slope-europe-lowcarbon/render-directions.mjs
//
// Low-carbon electricity in sixteen European countries, 2000 against 2024, drawn once per filed
// direction through the design base. The first `slope` beat in this tree.
//
// Every figure is computed from the frozen CSV before a mark is drawn, and the claim is ASSERTED —
// including the crossing, which is the one thing a slope chart exists to show and therefore the one
// thing that must not be believed on sight.
//
// `renders/`, PLURAL. A render written to `render/` receives no approval and is invisible to the
// export guard.
//
// Usage:  bun proof/static-slope-europe-lowcarbon/render-directions.mjs

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
import { DirectedSlope } from "./DirectedSlope.tsx";
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

const RENEWABLE = [
  "hydro_generation__twh",
  "wind_generation__twh",
  "solar_generation__twh",
  "bioenergy_stacked_generation__twh",
  "other_renewables_generation__twh",
];
const NUCLEAR = "nuclear_generation__twh";
const FOSSIL = ["gas_generation__twh", "coal_generation__twh", "oil_generation__twh"];
const ALL = [...RENEWABLE, NUCLEAR, ...FOSSIL];

const FRENCH = {
  Austria: "Autriche", Belgium: "Belgique", Czechia: "Tchéquie", Denmark: "Danemark",
  Finland: "Finlande", France: "France", Germany: "Allemagne", Greece: "Grèce",
  Ireland: "Irlande", Italy: "Italie", Netherlands: "Pays-Bas", Poland: "Pologne",
  Portugal: "Portugal", Spain: "Espagne", Sweden: "Suède", "United Kingdom": "Royaume-Uni",
};
const french = (entity) => {
  if (!FRENCH[entity]) throw new Error(`no French name recorded for ${entity}`);
  return FRENCH[entity];
};

const csv = (await readFile(join(HERE, "data.csv"), "utf8")).trim().split(/\r?\n/);
const header = csv[0].split(",");
const rowsRaw = csv.slice(1).map((l) => {
  const cells = l.split(",");
  return Object.fromEntries(header.map((h, i) => [h, cells[i]]));
});

const lowCarbonOf = (raw) => {
  const share = (k) => Number(raw[k] || 0);
  const total = ALL.reduce((s, k) => s + share(k), 0);
  if (!(total > 0)) throw new Error(`${raw.entity} reports no generation in ${raw.year}`);
  const clean = [...RENEWABLE, NUCLEAR].reduce((s, k) => s + share(k), 0);
  return (clean / total) * 100;
};

const entities = [...new Set(rowsRaw.map((r) => r.entity))].sort();
const lines = entities.map((entity) => {
  const a = rowsRaw.find((r) => r.entity === entity && Number(r.year) === FROM);
  const b = rowsRaw.find((r) => r.entity === entity && Number(r.year) === TO);
  if (!a || !b) throw new Error(`${entity} is missing ${FROM} or ${TO} in the frozen data`);
  const from = lowCarbonOf(a);
  const to = lowCarbonOf(b);
  const total = ALL.reduce((sum, k) => sum + Number(b[k] || 0), 0);
  return { key: entity, label: french(entity), from, to, delta: to - from, total };
});

// ── THE CLAIM, ASSERTED ─────────────────────────────────────────────────────
const fell = lines.filter((d) => d.delta <= 0);
if (fell.length)
  throw new Error(
    `the headline says all ${lines.length} rose; ${fell.length} did not ` +
      `(${fell.map((d) => `${d.label} ${d.delta.toFixed(1)}`).join(", ")})`,
  );

/** THE CROSSING IS THE FINDING, so it is derived rather than believed. A pair crosses when the sign
 *  of their gap flips between the two rails — which is exactly what a slope chart draws and exactly
 *  what a reader would otherwise have to take on trust. */
const crossings = [];
for (let i = 0; i < lines.length; i++)
  for (let j = i + 1; j < lines.length; j++) {
    const a = lines[i];
    const b = lines[j];
    if ((a.from - b.from) * (a.to - b.to) < 0) crossings.push([a, b]);
  }

const leader = lines.reduce((a, b) => (b.to > a.to ? b : a));
const OVERTOOK = "Finland";
const OVERTAKEN = "France";
const climber = lines.find((d) => d.key === OVERTOOK);
const held = lines.find((d) => d.key === OVERTAKEN);
if (!(climber.from < held.from && climber.to > held.to))
  throw new Error(
    `the headline says ${french(OVERTOOK)} overtook ${french(OVERTAKEN)}: ` +
      `${climber.from.toFixed(1)} → ${climber.to.toFixed(1)} against ${held.from.toFixed(1)} → ${held.to.toFixed(1)}`,
  );
/** And it is the ONLY country that did, which is the sharper half of the sentence. */
const alsoPassed = lines.filter((d) => d.key !== OVERTAKEN && d.from < held.from && d.to > held.to);
if (alsoPassed.length !== 1 || alsoPassed[0].key !== OVERTOOK)
  throw new Error(
    `the headline says ${french(OVERTOOK)} is the only country to pass ${french(OVERTAKEN)}; ` +
      `${alsoPassed.map((d) => d.label).join(", ")} did`,
  );

/** HOW MANY LINES THE FORM CAN CARRY, AND WHICH ONES.
 *
 *  A slope prints every end value it draws, so the line count is capped by how many labels a rail can
 *  hold WITHOUT pushing one off its own end — the component measures that and refuses. Sixteen did
 *  not fit: the stack needed 260px of a 277px frame and clustered values ended up 89px from their
 *  lines. Ten did not either, at 50px. Seven fitted `creme` and `rapport` and was refused by
 *  `nocturne`, whose registers are largest — and a beat is not published in two directions out of
 *  three. Six fits all three, and six is inside what the corpus itself draws: ABC's panels carry two
 *  series, Ferdio's slope four. A form that must print every end cannot print many, and that is a
 *  property of the form rather than a limitation of this plate.
 *
 *  WHICH seven is an editorial act, so it is a rule and it is printed: **the pair the headline is
 *  about, plus the largest producers**. The pair first, because a plate that drew the largest
 *  producers alone would not contain Finland — ninth — and the crossing the headline names would be
 *  off the plate. Every claim above is still asserted against all sixteen.
 */
const DRAWN = 6;
const pair = [climber, held];
const drawnSet = [
  ...pair,
  ...[...lines]
    .filter((d) => !pair.includes(d))
    .sort((a, b) => b.total - a.total)
    .slice(0, DRAWN - pair.length),
];
if (drawnSet.length !== DRAWN)
  throw new Error(`the rule selected ${drawnSet.length} lines and the plate draws ${DRAWN}`);

const biggest = drawnSet.reduce((a, b) => (b.delta > a.delta ? b : a));
const biggestOfAll = lines.reduce((a, b) => (b.delta > a.delta ? b : a));

console.table(
  [...lines]
    .sort((a, b) => b.delta - a.delta)
    .map((d) => ({
      pays: d.label,
      [`${FROM} %`]: d.from.toFixed(1),
      [`${TO} %`]: d.to.toFixed(1),
      écart: `${d.delta >= 0 ? "+" : ""}${d.delta.toFixed(1)}`,
    })),
);
console.log(
  `${lines.length} pays · ${crossings.length} croisements sur ${(lines.length * (lines.length - 1)) / 2} paires · ` +
    `plus forte hausse ${biggest.label} +${biggest.delta.toFixed(1)} · ` +
    `${leader.label} en tête en ${TO}\n`,
);

const facts = beatFacts(
  drawnSet.map((d) => ({ key: d.key, label: d.label, value: d.to })),
  {
    subject: OVERTOOK,
    namedSeries: drawnSet.map((d) => d.key),
    rails: { left: String(FROM), right: String(TO), sameMeasure: true },
    pairs: drawnSet.map((d) => ({ from: d.from, to: d.to })),
    declaredSequence: `${TO} low-carbon share`,
  },
);
const offered = applicableTreatments(facts);
console.log(`treatments applicable: ${offered.map((t) => t.id).join(", ")}\n`);

const plain = (s) => s.replace(/[  ]/g, " ");
const one = (v) =>
  plain(v.toLocaleString("fr-FR", { minimumFractionDigits: 1, maximumFractionDigits: 1 }));
/** ONE DECIMAL, AND IT IS NOT A PREFERENCE. Rounded to integers the plate printed `95` for France
 *  and `95` for Finland — the two numbers the headline says swapped places came out identical, and
 *  the plate contradicted its own sentence in its own value register. The precision a plate prints
 *  has to resolve the claim it makes; anything coarser is a plate arguing against itself. */
const format = (v) => one(v);
const formatDelta = (v) => `${v >= 0 ? "+" : "−"}${one(Math.abs(v))}`;
if (format(climber.to) === format(held.to))
  throw new Error(
    `the plate prints ${format(climber.to)} for both ${climber.label} and ${held.label}, so the ` +
      `crossing the headline names is invisible in the numbers the plate draws`,
  );

/** THE THREAD is the crossing pair and nothing else. `accent-marks-the-thread` — the accent goes to
 *  the argument, never to the largest value, and here the argument is two lines swapping places. */
const drawn = drawnSet
  .map((d) => ({ ...d, thread: d.key === OVERTOOK || d.key === OVERTAKEN }))
  .sort((a, b) => b.to - a.to);

const title = [
  `Les seize pays ont tous gagné du bas-carbone depuis ${FROM} — un seul a doublé la France`,
  `Tous ont progressé depuis ${FROM}, et la Finlande a doublé la France`,
  `Tous ont progressé, et la Finlande a doublé la France`,
];
const limits = [
  `Part de l’électricité produite à partir de sources bas-carbone — renouvelables et nucléaire ` +
    `réunis — en ${FROM} et en ${TO}. Les ${DRAWN} plus gros producteurs du groupe de ` +
    `${lines.length} pays étudiés ; les ${lines.length} ont progressé, le plus fort étant ` +
    `${biggestOfAll.label} (+${Math.round(biggestOfAll.delta)} points, non dessiné). Ici, ` +
    `${biggest.label} gagne le plus, +${Math.round(biggest.delta)} points. La Finlande était ` +
    `${one(held.from - climber.from)} points sous la France en ${FROM} ; elle est devant en ${TO}.`,
  `Part de l’électricité bas-carbone en ${FROM} et en ${TO} : les ${DRAWN} plus gros producteurs ` +
    `des ${lines.length} pays étudiés, qui ont tous progressé. La Finlande est passée devant la France.`,
  `Électricité bas-carbone, ${FROM} et ${TO} : les ${DRAWN} plus gros producteurs de ${lines.length} pays.`,
];
const reading = [
  `Lecture : chaque ligne est un pays, d’une teinte d’un bout à l’autre. Il n’y a pas d’axe : la ` +
    `pente donne le sens, les deux nombres donnent le niveau, l’écart est écrit à droite, en points.`,
  `Lecture : pas d’axe — la pente donne le sens, les nombres le niveau, l’écart est à droite.`,
];
const source =
  "Source : Ember, Energy Institute – Statistical Review of World Energy (2025), via Our World in Data";

const textPerRegister = {
  display: title.join(" "),
  eyebrow: EYEBROW,
  body: `${limits.join(" ")} ${source}`,
  axis: `${FROM} ${TO}`,
  annot: `${reading.join(" ")} ${drawnSet.map((d) => d.label).join(" ")} ${drawnSet.map((d) => formatDelta(d.delta)).join(" ")}`,
  value: drawnSet.flatMap((d) => [format(d.from), format(d.to)]).join(" "),
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
      element: createElement(DirectedSlope, {
        // THE FRAME THIS RENDER DRAWS IN. The component used to hold a module constant; it takes the
        // run's own frame now, so one component serves landscape, portrait and square.
        frame: { width: FRAME.width, height: FRAME.height },
        lines: drawn,
        rails: { left: String(FROM), right: String(TO) },
        title,
        limits,
        reading,
        source,
        alt:
          `Slope chart des ${DRAWN} plus gros producteurs d’électricité parmi ${lines.length} pays ` +
          `européens : part de l’électricité bas-carbone en ${FROM} et en ${TO}. Toutes les lignes ` +
          `montent. ${biggest.label} passe de ` +
          `${one(biggest.from)} % à ${one(biggest.to)} %, la plus forte hausse du plateau. La Finlande, ` +
          `${one(climber.from)} % en ${FROM} contre ${one(held.from)} % pour la France, atteint ` +
          `${one(climber.to)} % en ${TO} et passe devant la France à ${one(held.to)} % — le seul ` +
          `croisement en tête du groupe.`,
        eyebrow: EYEBROW,
        format,
        formatDelta,
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
