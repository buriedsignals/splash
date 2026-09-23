// twin/proof/static-connected-scatter-lowcarbon/render-directions.mjs
//
// Sixteen European countries, 2000 → 2024, each drawn twice and joined: how much of its OWN
// electricity is low-carbon against how much of EUROPE's low-carbon electricity it supplies. Drawn
// once per filed direction through the design base. The first `connected scatter` beat in this tree.
//
// WHY NOT THE AXIS PAIR THE REFERENCE RECOMMENDS.
// Ferdio's #70 puts a LEVEL on one axis and that level's SHARE OF THE GROUP on the other, and the
// record files it as transferable: use it "when 'grew but shrank relatively' is a thing that could
// be true". It was built that way first, and measured: within one date a level and its share of the
// same group are the same number up to a constant, so **every point of one date lands on a ray
// through the origin**, and the plate is two straight lines. That is true of the reference's own
// figure — three countries, two dates, two rays — and its record did not notice.
//
// The pair kept here is two SHARES that are genuinely independent: the country's own mix, and its
// weight in the group. The reading the reference wants — grew and shrank at once — survives, and the
// scatter stops being a pair of rays.
//
// `renders/`, PLURAL. A render written to `render/` receives no approval and is invisible to the
// export guard.
//
// Usage:  bun proof/static-connected-scatter-lowcarbon/render-directions.mjs

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
import { DirectedConnectedScatter } from "./DirectedConnectedScatter.tsx";
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
const SUBJECT = "FRA";
const FROM = "2000";
const TO = "2024";
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
const rows = csv.slice(1).map((l) => {
  const c = l.split(",");
  const lc = LOW_CARBON.reduce((s, k) => s + Number(c[at(k)]), 0);
  const fossil = FOSSIL.reduce((s, k) => s + Number(c[at(k)]), 0);
  return { code: c[at("code")], year: c[at("year")], lc, total: lc + fossil };
});
for (const r of rows)
  if (!r.code || !Number.isFinite(r.lc) || !(r.total > 0))
    throw new Error(`a reading has no usable generation: ${JSON.stringify(r)}`);

const byCode = {};
for (const r of rows) (byCode[r.code] ??= {})[r.year] = r;
const codes = Object.keys(byCode);
for (const c of codes)
  if (!byCode[c][FROM] || !byCode[c][TO])
    throw new Error(`${c} is not read at both ${FROM} and ${TO}; a connected scatter joins two states`);
for (const c of codes)
  if (!NAMES[c]) throw new Error(`${c} has no French name filed in this beat`);

const groupTotal = {
  [FROM]: codes.reduce((s, c) => s + byCode[c][FROM].lc, 0),
  [TO]: codes.reduce((s, c) => s + byCode[c][TO].lc, 0),
};
const entities = codes.map((code) => {
  const state = (year) => ({
    weight: (byCode[code][year].lc / groupTotal[year]) * 100,
    ownMix: (byCode[code][year].lc / byCode[code][year].total) * 100,
    twh: byCode[code][year].lc,
  });
  return { code, name: NAMES[code], from: state(FROM), to: state(TO) };
});

// ── THE CLAIM, ASSERTED ─────────────────────────────────────────────────────
const cleaner = entities.filter((e) => e.to.ownMix > e.from.ownMix);
const lighter = entities.filter((e) => e.to.weight < e.from.weight);
if (cleaner.length !== entities.length)
  throw new Error(
    `the headline says every country's own mix got cleaner; ${entities.length - cleaner.length} did not`,
  );
if (!(lighter.length >= 4 && lighter.length < entities.length / 2))
  throw new Error(
    `the headline says a minority lost weight in the group; ${lighter.length} of ${entities.length} did`,
  );
const subject = entities.find((e) => e.code === SUBJECT);
if (!subject) throw new Error(`the subject ${SUBJECT} is not in the data`);
const subjectWeight = subject.to.weight - subject.from.weight;
const subjectMix = subject.to.ownMix - subject.from.ownMix;
if (!(subjectWeight < -5 && subjectMix > 0))
  throw new Error(
    `the standfirst says ${SUBJECT} got cleaner at home and lighter in the group; it moved ` +
      `${subjectMix.toFixed(1)} points of own mix and ${subjectWeight.toFixed(1)} of group weight`,
  );
const grewTwh = entities.filter((e) => e.to.twh > e.from.twh).length;
console.log(
  `${entities.length} pays · groupe ${groupTotal[FROM].toFixed(0)} → ${groupTotal[TO].toFixed(0)} TWh ` +
    `bas-carbone · ${grewTwh} ont produit plus · ${cleaner.length} se sont nettoyés chez eux · ` +
    `${lighter.length} ont perdu du poids dans le groupe · ${SUBJECT} ` +
    `${subjectMix >= 0 ? "+" : ""}${subjectMix.toFixed(1)} pt de mix, ${subjectWeight.toFixed(1)} pt de poids\n`,
);

const facts = beatFacts(
  entities.map((e) => ({ key: e.code, label: e.name, value: e.to.weight })),
  {
    subject: subject.name,
    states: [FROM, TO],
    continuousAxis: true,
    declaredSequence: "share of the group",
  },
);
const offered = applicableTreatments(facts);
console.log(`treatments applicable: ${offered.map((t) => t.id).join(", ")}\n`);

/** `toLocaleString("fr-FR")` emits U+202F and U+00A0, which no face on the family ladders covers. */
const plain = (s) => s.replace(/[\u202F\u00A0\u2009]/g, " ");
const one = (v) =>
  plain(v.toLocaleString("fr-FR", { minimumFractionDigits: 1, maximumFractionDigits: 1 }));

const title = [
  `Les ${entities.length} pays ont tous nettoyé leur électricité — ${lighter.length} pèsent pourtant moins dans le bas-carbone européen`,
  `Tous plus propres chez eux, ${lighter.length} plus légers en Europe`,
  `Plus propres chez eux, plus légers en Europe`,
];
const limits = [
  `Chaque pays est dessiné deux fois : le cercle vide est ${FROM}, le cercle plein ${TO}, et l’arc ` +
    `pointillé les relie. En abscisse, sa part du bas-carbone des ${entities.length} pays ; en ` +
    `ordonnée, la part de bas-carbone dans sa propre électricité. La ${subject.name} a gagné ` +
    `${one(subjectMix)} points chez elle et perdu ${one(-subjectWeight)} points de poids européen — ` +
    `elle a produit plus, les autres ont produit plus vite.`,
  `Le cercle vide est ${FROM}, le plein ${TO}. En abscisse la part du bas-carbone européen, en ` +
    `ordonnée la part de bas-carbone dans sa propre électricité. La ${subject.name} : ` +
    `${one(subjectMix)} points chez elle, ${one(subjectWeight)} de poids européen.`,
  `Cercle vide ${FROM}, cercle plein ${TO} : part du groupe en abscisse, mix propre en ordonnée.`,
];
const reading = [
  `Lecture : monter, c’est se nettoyer chez soi ; aller à droite, c’est peser plus lourd dans le ` +
    `groupe. Les deux sont indépendants, et c’est tout l’intérêt de tracer les deux.`,
  `Lecture : monter, c’est se nettoyer chez soi ; aller à droite, c’est peser plus dans le groupe.`,
];
const source =
  "Source : Ember, Energy Institute – Statistical Review of World Energy (2025), via Our World in Data";
const xName = `part du bas-carbone des ${entities.length} pays, en %`;
const yName = "part de bas-carbone dans sa propre électricité, en %";

const textPerRegister = {
  display: title.join(" "),
  eyebrow: EYEBROW,
  body: `${limits.join(" ")} ${source}`,
  axis: `${xName} ${yName} 0 10 20 30 40 50 100`,
  annot: reading.join(" "),
  value: entities.map((e) => `${e.name} ${e.code}`).join(" "),
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
      element: createElement(DirectedConnectedScatter, {
        // THE FRAME THIS RENDER DRAWS IN. The component used to hold a module constant; it takes the
        // run's own frame now, so one component serves landscape, portrait and square.
        frame: { width: FRAME.width, height: FRAME.height },
        entities,
        subject: SUBJECT,
        from: FROM,
        to: TO,
        xName,
        yName,
        title,
        limits,
        reading,
        source,
        alt:
          `Nuage connecté de ${entities.length} pays européens entre ${FROM} et ${TO}. Chaque pays ` +
          `est un cercle vide (${FROM}) relié par un arc pointillé à un cercle plein (${TO}). ` +
          `L’abscisse est sa part du bas-carbone des ${entities.length} pays, l’ordonnée la part de ` +
          `bas-carbone dans sa propre électricité. Tous les arcs montent : les ${entities.length} ` +
          `pays se sont nettoyés. ${lighter.length} pointent vers la gauche, dont la ` +
          `${subject.name}, qui perd ${one(-subjectWeight)} points de poids européen tout en ` +
          `gagnant ${one(subjectMix)} points de bas-carbone chez elle.`,
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
    console.log(`  -> renders/${nameAtSize(id, SIZE)}.png\n`);
  } catch (error) {
    for (const ext of ["png", "svg"])
      await rm(join(OUT, `${nameAtSize(id, SIZE)}.${ext}`), { force: true });
    refused.push({ id, why: error.message });
    console.log(`  REFUSED — ${error.message}\n`);
  }
}
if (refused.length) console.log(`refused by ${refused.length}: ${refused.map((x) => x.id).join(", ")}`);
