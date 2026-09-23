// twin/proof/static-dot-strip-lowcarbon-spread/render-directions.mjs
//
// Sixteen European countries pinned on two strips — the low-carbon share of their own electricity in
// 2000 and in 2024 — once per filed direction, through the design base. The first `dot strip` beat in
// this tree, and the first beat drawn from a reference harvested for it.
//
// WHAT A STRIP DOES THAT THIS TREE'S OTHER PAIRED FORMS DO NOT. The lollipop draws two levels from
// zero, the connected scatter draws two variables at once, the slope draws two rails. A strip draws
// ONE axis and puts every unit on it, so what a reader sees is the SHAPE OF THE FIELD — where it
// starts, where it ends, where it bunches. The claim here is exactly that shape: the floor rose
// thirty points, the ceiling rose two, and the spread closed by more than a quarter.
//
// `renders/`, PLURAL. A render written to `render/` receives no approval and is invisible to the
// export guard.
//
// Usage:  bun proof/static-dot-strip-lowcarbon-spread/render-directions.mjs

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
import { DirectedDotStrips } from "./DirectedDotStrips.tsx";
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
const EYEBROW = "Énergie · Europe";
const FROM = "2000";
const TO = "2024";
const SUBJECT = "POL";
const refused = [];

const LOW_CARBON = [
  "other_renewables_generation__twh",
  "bioenergy_stacked_generation__twh",
  "solar_generation__twh",
  "wind_generation__twh",
  "hydro_generation__twh",
  "nuclear_generation__twh",
];
const FOSSIL = ["gas_generation__twh", "oil_generation__twh", "coal_generation__twh"];
const NAMES = {
  FRA: "France", DEU: "Allemagne", ESP: "Espagne", GBR: "Royaume-Uni", SWE: "Suède",
  ITA: "Italie", FIN: "Finlande", AUT: "Autriche", NLD: "Pays-Bas", BEL: "Belgique",
  POL: "Pologne", CZE: "Tchéquie", PRT: "Portugal", DNK: "Danemark", GRC: "Grèce", IRL: "Irlande",
};

// ── the readings ────────────────────────────────────────────────────────────
const csv = (await readFile(join(HERE, "data.csv"), "utf8")).trim().split(/\r?\n/);
const header = csv[0].split(",");
const at = (name) => header.indexOf(name);
const byCode = {};
for (const l of csv.slice(1)) {
  const c = l.split(",");
  const lc = LOW_CARBON.reduce((s, k) => s + Number(c[at(k)]), 0);
  const fossil = FOSSIL.reduce((s, k) => s + Number(c[at(k)]), 0);
  if (!(lc + fossil > 0)) throw new Error(`a country has no generation at all: ${l}`);
  (byCode[c[at("code")]] ??= {})[c[at("year")]] = (lc / (lc + fossil)) * 100;
}
const codes = Object.keys(byCode);
for (const code of codes) {
  if (!NAMES[code]) throw new Error(`${code} has no French name filed in this beat`);
  if (byCode[code][FROM] === undefined || byCode[code][TO] === undefined)
    throw new Error(`${code} is not read at both ${FROM} and ${TO}; a strip pair needs two states`);
}
const marks = codes.map((code) => ({
  code,
  name: NAMES[code],
  before: byCode[code][FROM],
  after: byCode[code][TO],
}));

// ── THE CLAIM, ASSERTED ─────────────────────────────────────────────────────
const median = (xs) => {
  const s = [...xs].sort((a, b) => a - b);
  const half = Math.floor(s.length / 2);
  return s.length % 2 ? s[half] : (s[half - 1] + s[half]) / 2;
};
const before = marks.map((m) => m.before);
const after = marks.map((m) => m.after);
const field = {
  floorBefore: Math.min(...before), floorAfter: Math.min(...after),
  ceilBefore: Math.max(...before), ceilAfter: Math.max(...after),
  medianBefore: median(before), medianAfter: median(after),
};
const spreadBefore = field.ceilBefore - field.floorBefore;
const spreadAfter = field.ceilAfter - field.floorAfter;
const floorRise = field.floorAfter - field.floorBefore;
const ceilRise = field.ceilAfter - field.ceilBefore;
if (!(floorRise > 20 && ceilRise < 5))
  throw new Error(
    `the headline says the floor rose far and the ceiling barely; the floor rose ` +
      `${floorRise.toFixed(1)} points and the ceiling ${ceilRise.toFixed(1)}`,
  );
if (!(spreadAfter < spreadBefore * 0.8))
  throw new Error(
    `the headline says the spread closed by more than a fifth; it went from ` +
      `${spreadBefore.toFixed(1)} to ${spreadAfter.toFixed(1)} points`,
  );
const lowest = marks.reduce((a, b) => (b.before < a.before ? b : a));
if (lowest.code !== SUBJECT)
  throw new Error(`the subject is the country that was the floor in ${FROM}; that is ${lowest.code}`);
console.log(
  `${marks.length} pays · ${FROM} : plancher ${field.floorBefore.toFixed(1)} %, plafond ` +
    `${field.ceilBefore.toFixed(1)} %, médiane ${field.medianBefore.toFixed(1)} % · ${TO} : ` +
    `plancher ${field.floorAfter.toFixed(1)} %, plafond ${field.ceilAfter.toFixed(1)} %, médiane ` +
    `${field.medianAfter.toFixed(1)} % · écart ${spreadBefore.toFixed(1)} -> ${spreadAfter.toFixed(1)} pts\n`,
);

const facts = beatFacts(
  marks.map((m) => ({ key: m.code, label: m.name, value: m.after })),
  {
    subject: NAMES[SUBJECT],
    states: [FROM, TO],
    observations: marks.map((m) => ({ key: m.code, value: m.after })),
    continuousAxis: true,
    declaredSequence: "low-carbon share",
  },
);
const offered = applicableTreatments(facts);
console.log(`treatments applicable: ${offered.map((t) => t.id).join(", ")}\n`);

/** `toLocaleString("fr-FR")` emits U+202F and U+00A0, which no face on the family ladders covers. */
const plain = (s) => s.replace(/[\u202F\u00A0\u2009]/g, " ");
const one = (v) =>
  plain(v.toLocaleString("fr-FR", { minimumFractionDigits: 1, maximumFractionDigits: 1 }));

const title = [
  `Le plancher européen est monté de ${Math.round(floorRise)} points, le plafond de ${Math.round(ceilRise)}`,
  `Le plancher est monté de ${Math.round(floorRise)} points, le plafond de ${Math.round(ceilRise)}`,
  `Le bas-carbone des ${marks.length} pays, ${FROM} et ${TO}`,
];
const limits = [
  `Chaque pays est une épingle sur l’axe : la part de bas-carbone dans sa propre électricité, en ` +
    `${FROM} sur la bande du haut et en ${TO} sur celle du bas, à la même échelle. Le pays le plus ` +
    `fossile passe de ${one(field.floorBefore)} à ${one(field.floorAfter)} % — c’est la ` +
    `${NAMES[SUBJECT]} — pendant que le plus propre va de ${one(field.ceilBefore)} à ` +
    `${one(field.ceilAfter)} %. L’écart entre les deux se referme de ${one(spreadBefore - spreadAfter)} points.`,
  `Chaque pays est une épingle sur l’axe : la part de bas-carbone dans sa propre électricité, en ` +
    `${FROM} en haut et en ${TO} en bas. L’écart entre le plus propre et le plus fossile se referme ` +
    `de ${one(spreadBefore - spreadAfter)} points.`,
  `La part de bas-carbone de chaque pays, en ${FROM} et en ${TO}.`,
];
const reading = [
  `Lecture : ce n’est pas un pays qu’il faut suivre mais la forme du champ — où il commence, où il ` +
    `finit, où il s’entasse. La médiane passe de ${one(field.medianBefore)} à ${one(field.medianAfter)} %.`,
  `Lecture : suivre la forme du champ, pas un pays. La médiane passe de ` +
    `${one(field.medianBefore)} à ${one(field.medianAfter)} %.`,
];
const source =
  "Source : Ember, Energy Institute – Statistical Review of World Energy (2025), via Our World in Data";
const unit = "part de bas-carbone dans l’électricité du pays, en %";
const scaleNote = `Les deux bandes portent la même échelle, 0 à 100 %.`;

const textPerRegister = {
  display: title.join(" "),
  eyebrow: EYEBROW,
  body: `${limits.join(" ")} ${source}`,
  axis: `${unit} ${scaleNote} ${FROM} ${TO} 0 20 40 60 80 100`,
  annot: `${reading.join(" ")} ${marks.map((m) => m.code).join(" ")}`,
  value: marks.map((m) => `+${Math.round(m.after - m.before)}`).join(" "),
};

const filed = readdirSync(DIRECTIONS)
  .filter((f) => f.endsWith(".md"))
  .map((f) => readDirection(join(DIRECTIONS, f)));
const newsroom = readPalette(HERE);
const BEAT_FACTS = { evidenceLevels: 4 };
console.log(
  report(composeDirections({ newsroom, filed, beat: BEAT_FACTS, textPerRegister }), { beat: BEAT_FACTS }),
);
console.log("");

for (const file of readdirSync(DIRECTIONS).filter((f) => f.endsWith(".md"))) {
  const id = file.replace(/\.md$/, "");
  const direction = resolveDirectionFamilies(readDirection(join(DIRECTIONS, file)), textPerRegister);
  console.log(id);
  try {
    await renderStill({
      element: createElement(DirectedDotStrips, {
        // THE FRAME THIS RENDER DRAWS IN. The component used to hold a module constant; it takes the
        // run's own frame now, so one component serves landscape, portrait and square.
        frame: { width: FRAME.width, height: FRAME.height },
        marks,
        subject: SUBJECT,
        from: FROM,
        to: TO,
        unit,
        scaleNote,
        title,
        limits,
        reading,
        source,
        alt:
          // grounded-by-hand: alt:100 — the axis domain, declared by the component and printed on
          // plate as its own scale note; it is not a reading from the data.
          `Deux bandes horizontales à la même échelle, 0 à 100 %. Sur celle du haut, les ` +
          `${marks.length} pays européens sont épinglés selon la part de bas-carbone de leur ` +
          `électricité en ${FROM} ; sur celle du bas, en ${TO}. Le champ tout entier s’est déplacé ` +
          `vers la droite : le plancher passe de ${one(field.floorBefore)} à ` +
          `${one(field.floorAfter)} % et le plafond de ${one(field.ceilBefore)} à ` +
          `${one(field.ceilAfter)} %, si bien que l’écart entre les deux se referme de ` +
          `${one(spreadBefore - spreadAfter)} points. Des filets pointillés relient chaque pays à ` +
          `lui-même d’une bande à l’autre.`,
        eyebrow: EYEBROW,
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
    console.log(`  -> renders/${id}.png\n`);
  } catch (error) {
    for (const ext of ["png", "svg"]) await rm(join(OUT, `${id}.${ext}`), { force: true });
    refused.push({ id, why: error.message });
    console.log(`  REFUSED — ${error.message}\n`);
  }
}
if (refused.length) console.log(`refused by ${refused.length}: ${refused.map((x) => x.id).join(", ")}`);
