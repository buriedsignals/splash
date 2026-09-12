// twin/proof/web-lollipop-co2-per-person/render-directions-web.mjs
//
// The six largest CO₂ emitters, per person, in 2000 and 2023, rendered once per FILED DIRECTION into
// a self-contained interactive page.
//
// THE SIX ARE A COMPUTED RULE, NOT A PICK: the countries with the largest TOTAL emissions in 2023,
// where the total is the per-person figure times the population, both from the frozen file.
//
// Usage:  bun proof/web-lollipop-co2-per-person/render-directions-web.mjs

import { readdirSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { readPalette } from "#shared/chart-beat/colour.mjs";
import { beatFacts, applicableTreatments } from "#shared/chart-beat/treatments.mjs";
import { readDirection } from "#shared/design-base/read-direction.mjs";
import { composeDirections, report } from "#shared/design-base/compose.mjs";
import { resolveDirectionFamilies } from "#shared/design-base/resolve-families.mjs";
import { plainSpaces } from "#shared/design-base/web.mjs";
import { renderWeb } from "../../skills/chart-web/scripts/render-web.mjs";
import { DirectedLollipopWeb } from "./DirectedLollipopWeb.tsx";

const HERE = dirname(fileURLToPath(import.meta.url));
const DIRECTIONS = join(HERE, "..", "..", "docs", "design-base", "directions");
const OUT = join(HERE, "renders");
const EYEBROW = "Climat · Monde";
const FROM = 2000;
const TO = 2023;
const HOW_MANY = 6;
const SUBJECT = "CHN";
const UNIT = "tonnes de CO₂ par personne";
const NAMES = {
  CHN: "Chine", USA: "États-Unis", IND: "Inde", RUS: "Russie", JPN: "Japon", IRN: "Iran",
  IDN: "Indonésie", SAU: "Arabie saoudite", DEU: "Allemagne", KOR: "Corée du Sud", BRA: "Brésil",
};

const plain = (s) => plainSpaces(s);
const fr = (v, d = 1) =>
  plain(v.toLocaleString("fr-FR", { minimumFractionDigits: d, maximumFractionDigits: d }));
const people = (v) => `${fr(v / 1e6, 0)} millions d'habitants`;

const csv = (await readFile(join(HERE, "data.csv"), "utf8")).trim().split(/\r?\n/);
const header = csv[0].split(",");
const at = (n) => header.indexOf(n);
const all = csv.slice(1).map((line) => {
  const c = line.split(",");
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
for (const c of chosen) if (!NAMES[c.code]) throw new Error(`${c.code} (${c.entity}) has no French name filed`);
const chosenShare = (chosen.reduce((s, c) => s + c.total, 0) / worldTotal) * 100;

// ── THE CLAIM, ASSERTED ───────────────────────────────────────────────────────────────────────
const subject = chosen.find((c) => c.code === SUBJECT);
const other = chosen.find((c) => c.code === "USA");
if (!subject || !other) throw new Error("the headline names China and the United States");
const grew = subject.after / subject.before;
const ratioBefore = other.before / subject.before;
const ratioAfter = other.after / subject.after;
if (!(grew > 2.5)) throw new Error(`the headline says the subject roughly tripled; it multiplied by ${fr(grew, 2)}`);
if (!(ratioBefore > 5 && ratioAfter < 2.5 && ratioAfter > 1))
  throw new Error(`the ratio went from ${fr(ratioBefore)} to ${fr(ratioAfter)}`);
if (!(chosenShare > 55)) throw new Error(`the six carry ${fr(chosenShare)} % of the world total`);
console.log(
  `${all.length} pays lus · les ${HOW_MANY} plus gros émetteurs ${TO} pèsent ${fr(chosenShare)} % · ` +
    `${NAMES[SUBJECT]} x${fr(grew, 2)} · rapport USA/${SUBJECT} ${fr(ratioBefore)} -> ${fr(ratioAfter)}\n`,
);

const pairs = chosen.map((c) => {
  const change = ((c.after - c.before) / c.before) * 100;
  return {
    code: c.code,
    name: NAMES[c.code],
    before: c.before,
    after: c.after,
    beforeLabel: fr(c.before),
    afterLabel: fr(c.after),
    changeLabel: `${change >= 0 ? "+" : "−"}${fr(Math.abs(change), 0)} %`,
    rising: change >= 0,
    detail:
      `${NAMES[c.code]} · ${fr(c.before)} t par personne en ${FROM} → ${fr(c.after)} t en ${TO} ` +
      `(${change >= 0 ? "+" : "−"}${fr(Math.abs(change), 0)} %) · ${people(c.people)} · ` +
      `${fr(c.total, 2)} Gt au total en ${TO}, soit ${fr((c.total / worldTotal) * 100)} % du monde`,
  };
});
console.table(pairs.map((p) => ({ pays: p.name, [FROM]: p.beforeLabel, [TO]: p.afterLabel, écart: p.changeLabel })));

const facts = beatFacts(
  pairs.map((p) => ({ key: p.code, label: p.name, value: p.after })),
  {
    subject: NAMES[SUBJECT],
    states: [String(FROM), String(TO)],
    markers: pairs.map((p) => ({ key: p.code, label: p.name, value: p.before })),
    declaredSequence: UNIT,
  },
);
const offered = applicableTreatments(facts);
console.log(`treatments applicable: ${offered.map((t) => t.id).join(", ") || "(none)"}\n`);

const ceiling = Math.ceil(Math.max(...pairs.flatMap((p) => [p.before, p.after])) / 5) * 5;
const yTicks = Array.from({ length: ceiling / 5 + 1 }, (_, i) => i * 5);

const title = `La ${NAMES[SUBJECT]} a triplé son CO₂ par personne depuis ${FROM} ; l'Américain moyen n'en émet plus que ${fr(ratioAfter)} fois plus`;
const caveat =
  `Chaque paire porte le niveau de ${FROM} en teinte claire et celui de ${TO} en plein, chacun ` +
  `mesuré DEPUIS ZÉRO : c'est ce qu'une paire de sucettes montre et qu'un haltère cache. Les deux ` +
  `chiffres sont écrits au-dessus de leur propre tête, donc la page n'a pas d'axe des valeurs.`;
const rule = `Sélection : les ${HOW_MANY} pays au plus fort total ${TO} — par personne × population — soit ${fr(chosenShare)} % du CO₂ mondial.`;
const readingLine =
  `Lecture : survolez, touchez ou tabulez une paire pour lire les deux niveaux, l'écart, la ` +
  `POPULATION derrière le ratio, le total du pays et sa part du monde. Un chiffre par personne est ` +
  `une division : le dénominateur est ce qu'il faut connaître avant de comparer la ${NAMES[SUBJECT]} ` +
  `au ${NAMES.JPN}.`;
const source = `Source : Global Carbon Budget 2025 · population ${TO}, via Our World in Data`;

const textPerRegister = {
  display: title,
  eyebrow: EYEBROW,
  body: `${caveat} ${readingLine} ${source} ${UNIT} ${FROM} ${TO}`,
  axis: `${yTicks.join(" ")} ${pairs.map((p) => `${p.name} ${p.changeLabel}`).join(" ")}`,
  annot: rule,
  value: pairs.flatMap((p) => [p.beforeLabel, p.afterLabel]).join(" "),
};

// EVERY REGISTER'S TEXT PASSES THROUGH `plain` BEFORE IT REACHES THE LADDER. One U+202F or U+00A0 —
// the spaces `toLocaleString("fr-FR")` emits, and the one a hand types without meaning to — refuses
// every family on the sans ladder and takes all three renders down with a message that names the
// code point and not the string. Measured on the marimekko beat, where a no-break space typed inside
// a band's own label, invisible in the source, stopped the whole build.
for (const key of Object.keys(textPerRegister)) textPerRegister[key] = plain(textPerRegister[key]);

const filed = readdirSync(DIRECTIONS).filter((f) => f.endsWith(".md")).map((f) => readDirection(join(DIRECTIONS, f)));
const newsroom = readPalette(HERE, { stopAt: join(HERE, "..") });
const BEAT_FACTS = { evidenceLevels: 4 };
console.log(report(composeDirections({ newsroom, filed, beat: BEAT_FACTS, textPerRegister }), { beat: BEAT_FACTS }));
console.log("");

const refused = [];
for (const file of readdirSync(DIRECTIONS).filter((f) => f.endsWith(".md"))) {
  const id = file.replace(/\.md$/, "");
  const direction = resolveDirectionFamilies(readDirection(join(DIRECTIONS, file)), textPerRegister);
  try {
    await renderWeb({
      component: DirectedLollipopWeb,
      props: {
        pairs,
        subject: SUBJECT,
        yTicks,
        unit: UNIT,
        stateLabels: { before: String(FROM), after: String(TO) },
        title, eyebrow: EYEBROW, caveat, source, reading: readingLine, rule,
        alt:
          `Six paires de sucettes, une par pays, mesurant les tonnes de CO₂ par personne en ${FROM} ` +
          `(teinte claire) et en ${TO} (plein), chaque tige partant de zéro. La ${NAMES[SUBJECT]} ` +
          `monte de ${fr(subject.before)} à ${fr(subject.after)} tonnes, les États-Unis descendent ` +
          `de ${fr(other.before)} à ${fr(other.after)} : le rapport entre les deux passe de ` +
          `${fr(ratioBefore)} à ${fr(ratioAfter)}. Sous chaque paire, le nom du pays et son ` +
          `pourcentage d'évolution.`,
        direction,
        ground: direction.ground,
        accent: direction.accent,
      },
      outDir: OUT,
      name: `${id}.html`,
    });
    console.log(`${id} -> renders/${id}.html`);
  } catch (error) {
    refused.push({ id, why: error.message });
    console.log(`${id} REFUSED — ${error.message}`);
  }
}
if (refused.length) console.log(`\nrefused by ${refused.length}: ${refused.map((x) => x.id).join(", ")}`);
