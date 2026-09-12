// twin/proof/web-bar-top-emitters-2024/render-directions-web.mjs
//
// The ten largest emitters of CO₂ in 2024 as columns, rendered once per FILED DIRECTION into a
// self-contained interactive page. The `bar and column` beat of the web format.
//
// EVERY NUMBER ON THE PAGE IS COMPUTED HERE AND PRINTED BEFORE THE RENDER — the ten members, their
// order, the "next five", the world share, and the per-country answer the page's own interaction
// exists to give. None is typed into a title, a note or an alt text.
//
// `renders/`, PLURAL.
//
// Usage:  bun proof/web-bar-top-emitters-2024/render-directions-web.mjs

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
import { DirectedColumnsWeb } from "./DirectedColumnsWeb.tsx";

const HERE = dirname(fileURLToPath(import.meta.url));
const DIRECTIONS = join(HERE, "..", "..", "docs", "design-base", "directions");
const OUT = join(HERE, "renders");
const EYEBROW = "Climat · Monde";
const UNIT = "Gt CO₂";
const YEAR = 2024;
const HOW_MANY = 10;
const SUBJECT = "CHN";
const NAMES = {
  CHN: "Chine", USA: "États-Unis", IND: "Inde", RUS: "Russie", JPN: "Japon",
  IDN: "Indonésie", IRN: "Iran", SAU: "Arabie s.", KOR: "Corée du S.", DEU: "Allemagne",
  CAN: "Canada", TUR: "Turquie", BRA: "Brésil", MEX: "Mexique",
};

const plain = (s) => plainSpaces(s);
const fr = (v, d = 2) =>
  plain(v.toLocaleString("fr-FR", { minimumFractionDigits: d, maximumFractionDigits: d }));

// ── the ranking ───────────────────────────────────────────────────────────────────────────────
const csv = (await readFile(join(HERE, "data.csv"), "utf8")).trim().split(/\r?\n/);
const header = csv[0].split(",");
const at = (name) => header.indexOf(name);
const rows = csv.slice(1).map((line) => {
  const c = line.split(",");
  return { entity: c[at("Entity")], code: c[at("Code")], tonnes: Number(c[header.length - 1]) };
});
const world = rows.find((r) => r.code === "OWID_WRL");
if (!world) throw new Error("the frozen file carries no OWID_WRL row, so no world total is published in it");

// OWID ships its own aggregates — World, continents, income groups, trade blocs — in the same file.
// A bare ISO-3166 alpha-3 is what stops "Asia" from topping a chart of countries.
const countries = rows.filter((r) => /^[A-Z]{3}$/.test(r.code) && r.code !== "OWID_WRL");
const dropped = rows.length - countries.length - 1;
const ranked = [...countries].sort((a, b) => b.tonnes - a.tonnes);
const chosen = ranked.slice(0, HOW_MANY);
for (const c of chosen)
  if (!NAMES[c.code]) throw new Error(`${c.code} (${c.entity}) has no French name filed in this beat`);

/** The smallest number of countries BELOW this one that add up to at least its own total. The
 *  headline's arithmetic, asked of every rank rather than only of the subject — and asked over the
 *  whole ranking, not over the ten drawn. */
function followersNeeded(index) {
  let sum = 0;
  for (let i = index + 1; i < ranked.length; i += 1) {
    sum += ranked[i].tonnes;
    if (sum >= ranked[index].tonnes) return { n: i - index, sum };
  }
  return { n: null, sum };
}

const subjectIndex = ranked.findIndex((r) => r.code === SUBJECT);
if (subjectIndex !== 0)
  throw new Error(`the headline names ${SUBJECT} first; it ranks ${subjectIndex + 1} in this file`);

// "the next five" is a SEARCH, not an assertion: add the countries below the subject one at a time
// and stop at the last one still under its own total.
let running = 0;
let nextN = 0;
for (let i = 1; i < ranked.length; i += 1) {
  if (running + ranked[i].tonnes >= ranked[0].tonnes) break;
  running += ranked[i].tonnes;
  nextN += 1;
}
if (nextN < 2)
  throw new Error(`only ${nextN} countries fit under the subject's own total; the comparison is not worth drawing`);

const topShare = (chosen.reduce((s, c) => s + c.tonnes, 0) / world.tonnes) * 100;
const ratioUsa = ranked[0].tonnes / ranked[1].tonnes;

console.log(
  `${countries.length} pays retenus, ${dropped} agrégats écartés · monde ${fr(world.tonnes / 1e9)} Gt · ` +
    `les ${HOW_MANY} premiers = ${fr(topShare, 1)} % · ${NAMES[SUBJECT]} > les ${nextN} suivants ` +
    `réunis (${fr(running / 1e9)} Gt) · x${fr(ratioUsa, 1)} les États-Unis\n`,
);

const columns = chosen.map((c, i) => {
  const { n } = followersNeeded(ranked.indexOf(c));
  const share = (c.tonnes / world.tonnes) * 100;
  return {
    code: c.code,
    name: NAMES[c.code],
    gt: c.tonnes / 1e9,
    label: fr(c.tonnes / 1e9),
    detail:
      `${fr(share, 1)} % du total mondial · il faut additionner les ${n} pays suivants du ` +
      `classement pour l'égaler`,
  };
});
console.table(columns.map((c, i) => ({ rang: i + 1, pays: c.name, Gt: c.label, détail: c.detail })));

const facts = beatFacts(
  columns.map((c) => ({ key: c.code, label: c.name, value: c.gt })),
  { subject: NAMES[SUBJECT], declaredSequence: UNIT },
);
const offered = applicableTreatments(facts);
console.log(`treatments applicable: ${offered.map((t) => t.id).join(", ") || "(none)"}\n`);

const title = `La ${NAMES[SUBJECT]} a émis plus de CO₂ en ${YEAR} que les ${nextN} pays suivants réunis`;
const caveat =
  `Émissions annuelles de CO₂ en ${YEAR}, en milliards de tonnes. Les ${HOW_MANY} premiers pays du ` +
  `classement mondial — ${fr(topShare, 1)} % du total. Chaque colonne porte son chiffre : la page ne ` +
  `dessine pas d'axe des valeurs, seulement son zéro.`;
const bracketNote = `les ${nextN} suivants réunis : ${fr(running / 1e9)} Gt`;
const readingLine =
  `Lecture : survolez, touchez ou tabulez une colonne pour lire sa part du total mondial et le ` +
  `nombre de pays qu'il faut additionner, plus bas dans le classement, pour l'égaler — la ` +
  `question du titre, posée à chacun des dix.`;
const source = `Source : Global Carbon Budget 2025, via Our World in Data · ${YEAR} · ${countries.length} pays classés`;

const textPerRegister = {
  display: title,
  eyebrow: EYEBROW,
  body: `${caveat} ${readingLine} ${source}`,
  axis: columns.map((c) => c.name).join(" "),
  annot: bracketNote,
  value: columns.map((c) => c.label).join(" "),
};

// EVERY REGISTER'S TEXT PASSES THROUGH `plain` BEFORE IT REACHES THE LADDER. One U+202F or U+00A0 —
// the spaces `toLocaleString("fr-FR")` emits, and the one a hand types without meaning to — refuses
// every family on the sans ladder and takes all three renders down with a message that names the
// code point and not the string. Measured on the marimekko beat, where a no-break space typed inside
// a band's own label, invisible in the source, stopped the whole build.
for (const key of Object.keys(textPerRegister)) textPerRegister[key] = plain(textPerRegister[key]);

const filed = readdirSync(DIRECTIONS).filter((f) => f.endsWith(".md")).map((f) => readDirection(join(DIRECTIONS, f)));
const newsroom = readPalette(HERE, { stopAt: join(HERE, "..") });
const BEAT_FACTS = { evidenceLevels: 2 };
console.log(report(composeDirections({ newsroom, filed, beat: BEAT_FACTS, textPerRegister }), { beat: BEAT_FACTS }));
console.log("");

const refused = [];
for (const file of readdirSync(DIRECTIONS).filter((f) => f.endsWith(".md"))) {
  const id = file.replace(/\.md$/, "");
  const direction = resolveDirectionFamilies(readDirection(join(DIRECTIONS, file)), textPerRegister);
  try {
    await renderWeb({
      component: DirectedColumnsWeb,
      props: {
        columns,
        subject: SUBJECT,
        bracket: { from: 1, to: nextN, label: bracketNote },
        top: columns[0].gt,
        title,
        eyebrow: EYEBROW,
        caveat,
        source,
        unit: UNIT,
        reading: readingLine,
        bracketNote,
        alt:
          `Dix colonnes, une par pays, mesurant les émissions de CO₂ de ${YEAR} en milliards de ` +
          `tonnes. Celle de la ${NAMES[SUBJECT]}, ${fr(columns[0].gt)} Gt, dépasse à elle seule la ` +
          `somme des ${nextN} suivantes (${fr(running / 1e9)} Gt), que réunit une accolade. ` +
          `Les États-Unis suivent à ${fr(columns[1].gt)} Gt, l'Inde à ${fr(columns[2].gt)} Gt.`,
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
