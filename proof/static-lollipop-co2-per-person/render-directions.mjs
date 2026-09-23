// twin/proof/static-lollipop-co2-per-person/render-directions.mjs
//
// The six largest emitters of CO₂, per person, in 2000 and 2023, drawn as paired lollipops once per
// filed direction through the design base. The first `lollipop` beat in this tree.
//
// WHY A LOLLIPOP AND NOT THE DUMBBELL THIS TREE ALREADY CARRIES.
// `proof/more-dumbbell-life-expectancy-gains` joins two states with a bar between them, and that bar
// is the GAP: a dumbbell answers "how far apart" and says nothing about how far either end is from
// nothing. A lollipop pair draws each state as its own stem from ZERO, so the reading is the two
// LEVELS first and the gap second. On this data that difference is the whole claim: the American
// average fell and the Chinese average tripled, and they are now within a factor of two — a
// sentence that needs both levels, not their difference.
//
// THE SIX ARE A COMPUTED RULE, NOT A PICK: the countries with the largest total emissions in 2023,
// where the total is the per-person figure times the population, both from the frozen file. The
// plate prints the rule and what it selects.
//
// `renders/`, PLURAL. A render written to `render/` receives no approval and is invisible to the
// export guard.
//
// Usage:  bun proof/static-lollipop-co2-per-person/render-directions.mjs

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
import { DirectedLollipops } from "./DirectedLollipops.tsx";
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
const EYEBROW = "Climat · Monde";
const FROM = 2000;
const TO = 2023;
const HOW_MANY = 6;
const SUBJECT = "CHN";
const NAMES = {
  CHN: "Chine", USA: "États-Unis", IND: "Inde", RUS: "Russie", JPN: "Japon", IRN: "Iran",
  IDN: "Indonésie", SAU: "Arabie saoudite", DEU: "Allemagne", KOR: "Corée du Sud", BRA: "Brésil",
};
const refused = [];

// ── the countries ───────────────────────────────────────────────────────────
const csv = (await readFile(join(HERE, "data.csv"), "utf8")).trim().split(/\r?\n/);
const header = csv[0].split(",");
const at = (name) => header.indexOf(name);
const all = csv.slice(1).map((l) => {
  const c = l.split(",");
  return {
    entity: c[at("entity")],
    code: c[at("code")],
    before: Number(c[at("t_per_person_2000")]),
    after: Number(c[at("t_per_person_2023")]),
    people: Number(c[at("population_2023")]),
  };
});
for (const c of all)
  if (!c.code || !Number.isFinite(c.before) || !Number.isFinite(c.after) || !(c.people > 0))
    throw new Error(`a country has no usable reading: ${JSON.stringify(c)}`);

const withTotals = all.map((c) => ({ ...c, total: (c.after * c.people) / 1e9 }));
const worldTotal = withTotals.reduce((s, c) => s + c.total, 0);
const ranked = [...withTotals].sort((a, b) => b.total - a.total);
const chosen = ranked.slice(0, HOW_MANY);
for (const c of chosen)
  if (!NAMES[c.code]) throw new Error(`${c.code} (${c.entity}) has no French name filed in this beat`);
const chosenShare = (chosen.reduce((s, c) => s + c.total, 0) / worldTotal) * 100;

// ── THE CLAIM, ASSERTED ─────────────────────────────────────────────────────
const subject = chosen.find((c) => c.code === SUBJECT);
const other = chosen.find((c) => c.code === "USA");
if (!subject || !other)
  throw new Error(`the headline names China and the United States; the computed six are ${chosen.map((c) => c.code).join(", ")}`);
const grew = subject.after / subject.before;
const ratioBefore = other.before / subject.before;
const ratioAfter = other.after / subject.after;
if (!(grew > 2.5))
  throw new Error(`the headline says the subject roughly tripled; it multiplied by ${grew.toFixed(2)}`);
if (!(ratioBefore > 5 && ratioAfter < 2.5 && ratioAfter > 1))
  throw new Error(
    `the headline says the ratio fell from about seven to under two and stayed above one; it went ` +
      `from ${ratioBefore.toFixed(1)} to ${ratioAfter.toFixed(1)}`,
  );
if (!(chosenShare > 55))
  throw new Error(`the standfirst says the six carry most of the world's emissions; they carry ${chosenShare.toFixed(1)} %`);
console.log(
  `${all.length} pays lus · les ${HOW_MANY} plus gros émetteurs 2023 pèsent ${chosenShare.toFixed(1)} % ` +
    `du total · ${SUBJECT} x${grew.toFixed(2)} · rapport USA/${SUBJECT} ${ratioBefore.toFixed(1)} -> ` +
    `${ratioAfter.toFixed(1)}\n`,
);
console.table(
  chosen.map((c) => ({
    pays: NAMES[c.code],
    [`${FROM}`]: c.before.toFixed(2),
    [`${TO}`]: c.after.toFixed(2),
    "%": (((c.after - c.before) / c.before) * 100).toFixed(0),
    "Gt 2023": c.total.toFixed(2),
  })),
);

const pairs = chosen.map((c) => ({
  code: c.code,
  name: NAMES[c.code],
  before: c.before,
  after: c.after,
  change: ((c.after - c.before) / c.before) * 100,
}));

const facts = beatFacts(
  pairs.map((p) => ({ key: p.code, label: p.name, value: p.after })),
  {
    subject: NAMES[SUBJECT],
    states: [String(FROM), String(TO)],
    markers: pairs.map((p) => ({ key: p.code, label: p.name, value: p.before })),
    declaredSequence: "tonnes per person",
  },
);
const offered = applicableTreatments(facts);
console.log(`treatments applicable: ${offered.map((t) => t.id).join(", ")}\n`);

/** `toLocaleString("fr-FR")` emits U+202F and U+00A0, which no face on the family ladders covers. */
const plain = (s) => s.replace(/[\u202F\u00A0\u2009]/g, " ");
const one = (v) =>
  plain(v.toLocaleString("fr-FR", { minimumFractionDigits: 1, maximumFractionDigits: 1 }));

const title = [
  `La ${NAMES[SUBJECT]} a triplé son CO₂ par personne depuis ${FROM} ; l’Américain moyen n’en émet plus que ${one(ratioAfter)} fois plus`,
  `Le rapport entre l’Américain et le Chinois moyens est passé de ${one(ratioBefore)} à ${one(ratioAfter)}`,
  `Le CO₂ par personne des six plus gros émetteurs`,
];
const limits = [
  `Les ${HOW_MANY} pays qui émettent le plus de CO₂ — ${one(chosenShare)} % du total mondial en ` +
    `${TO}. Chaque paire porte le niveau de ${FROM} en teinte claire et celui de ${TO} en plein, ` +
    `chacun mesuré depuis zéro : c’est ce qu’une paire de sucettes montre et qu’un haltère cache. ` +
    `La ${NAMES[SUBJECT]} passe de ${one(subject.before)} à ${one(subject.after)} t, les ` +
    `États-Unis de ${one(other.before)} à ${one(other.after)}.`,
  `Les ${HOW_MANY} pays qui émettent le plus de CO₂ — ${one(chosenShare)} % du total mondial. La ` +
    `teinte claire est ${FROM}, le plein ${TO}, chacun mesuré depuis zéro.`,
  `Les ${HOW_MANY} plus gros émetteurs : ${FROM} en teinte claire, ${TO} en plein.`,
];
const reading = [
  `Lecture : chaque tige part de zéro, donc la hauteur est le niveau et l’écart entre les deux ` +
    `têtes est le changement. Le triangle donne le sens avant le chiffre.`,
  `Lecture : chaque tige part de zéro. Le triangle donne le sens avant le chiffre.`,
];
const source = `Sources : Global Carbon Budget 2025 · population (${TO}), via Our World in Data`;
const unit = "tonnes de CO₂ par personne";
const rule = `Sélection : les ${HOW_MANY} pays au plus fort total ${TO} — par personne x population.`;

const textPerRegister = {
  display: title.join(" "),
  eyebrow: EYEBROW,
  body: `${limits.join(" ")} ${source}`,
  axis: `${unit} ${rule} ${FROM} ${TO} 0 5 10 15 20 25`,
  annot: reading.join(" "),
  value: pairs.map((p) => `${p.name} ${one(p.before)} ${one(p.after)} ${Math.round(p.change)} %`).join(" "),
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
      element: createElement(DirectedLollipops, {
        // THE FRAME THIS RENDER DRAWS IN. The component used to hold a module constant; it takes the
        // run's own frame now, so one component serves landscape, portrait and square.
        frame: { width: FRAME.width, height: FRAME.height },
        pairs,
        subject: SUBJECT,
        from: FROM,
        to: TO,
        unit,
        rule,
        title,
        limits,
        reading,
        source,
        alt:
          `Six paires de sucettes, une par pays, mesurant les tonnes de CO₂ par personne en ${FROM} ` +
          `(teinte claire) et en ${TO} (plein), chaque tige partant de zéro. Sous chaque paire, un ` +
          `triangle donne le sens du changement, suivi du pourcentage et du nom du pays. La ` +
          `${NAMES[SUBJECT]} monte de ${one(subject.before)} à ${one(subject.after)} tonnes, les ` +
          `États-Unis descendent de ${one(other.before)} à ${one(other.after)} : le rapport entre ` +
          `les deux passe de ${one(ratioBefore)} à ${one(ratioAfter)}.`,
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
