// twin/proof/web-bullet-low-carbon-share/render-directions-web.mjs
//
// Low-carbon electricity as a share of six countries' own generation, 2015 against 2024, rendered
// once per FILED DIRECTION into a self-contained interactive page.
//
// THE SHARE IS COMPUTED FROM THE NINE SOURCE COLUMNS, never read off a "low-carbon" column that does
// not exist in the file. The same nine columns are what each row's own detail string carries, which
// is the reading this format adds.
//
// Usage:  bun proof/web-bullet-low-carbon-share/render-directions-web.mjs

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
import { DirectedBulletWeb } from "./DirectedBulletWeb.tsx";

const HERE = dirname(fileURLToPath(import.meta.url));
const DIRECTIONS = join(HERE, "..", "..", "docs", "design-base", "directions");
const OUT = join(HERE, "renders");
const EYEBROW = "Énergie · Europe";
const BEFORE = 2015;
const AFTER = 2024;
const THRESHOLD = 50;
const LOW_CARBON = ["Nuclear", "Hydropower", "Wind", "Solar", "Bioenergy", "Other renewables"];
const FOSSIL = ["Coal", "Gas", "Oil"];
const NAMES = {
  POL: "Pologne", DEU: "Allemagne", FRA: "France", CHE: "Suisse", NOR: "Norvège", SWE: "Suède",
};
const FR_SOURCE = {
  Nuclear: "nucléaire", Hydropower: "hydraulique", Wind: "éolien", Solar: "solaire",
  Bioenergy: "biomasse", "Other renewables": "autres renouvelables",
  Coal: "charbon", Gas: "gaz", Oil: "pétrole",
};

const plain = (s) => plainSpaces(s);
const fr = (v, d = 1) =>
  plain(v.toLocaleString("fr-FR", { minimumFractionDigits: d, maximumFractionDigits: d }));

const csv = (await readFile(join(HERE, "data.csv"), "utf8")).trim().split(/\r?\n/);
const header = csv[0].split(",");
const at = (name) => {
  const i = header.indexOf(name);
  if (i < 0) throw new Error(`the frozen file has no ${name} column; it has ${header.join(", ")}`);
  return i;
};
const rowsRaw = csv.slice(1).map((line) => {
  const c = line.split(",");
  const o = { code: c[at("Code")], entity: c[at("Entity")], year: Number(c[at("Year")]) };
  for (const key of [...LOW_CARBON, ...FOSSIL]) o[key] = Number(c[at(key)]);
  return o;
});

function shareFor(code, year) {
  const row = rowsRaw.find((r) => r.code === code && r.year === year);
  if (!row) throw new Error(`${code} has no row for ${year} in the frozen file`);
  const low = LOW_CARBON.reduce((s, k) => s + row[k], 0);
  const total = low + FOSSIL.reduce((s, k) => s + row[k], 0);
  if (!(total > 0)) throw new Error(`${code} ${year} generates nothing in this file`);
  return { row, low, total, share: (low / total) * 100 };
}

const rows = Object.keys(NAMES).map((code) => {
  const before = shareFor(code, BEFORE);
  const after = shareFor(code, AFTER);
  const parts = LOW_CARBON.map((k) => ({ key: k, pct: (after.row[k] / after.total) * 100 }))
    .filter((p) => p.pct >= 0.5)
    .sort((a, b) => b.pct - a.pct);
  return {
    code,
    name: NAMES[code],
    before: before.share,
    after: after.share,
    change: after.share - before.share,
    beforeLabel: `${fr(before.share)} %`,
    afterLabel: `${fr(after.share)} %`,
    changeLabel: `${after.share >= before.share ? "+" : "−"}${fr(Math.abs(after.share - before.share))} pts`,
    detail:
      `${fr(after.share)} % bas-carbone en ${AFTER} (${fr(before.share)} % en ${BEFORE}, ` +
      `${after.share >= before.share ? "+" : "−"}${fr(Math.abs(after.share - before.share))} pts) · ` +
      parts.map((p) => `${FR_SOURCE[p.key]} ${fr(p.pct)} %`).join(", "),
  };
}).sort((a, b) => b.change - a.change);

// ── THE CLAIM, ASSERTED ───────────────────────────────────────────────────────────────────────
const mover = rows[0];
const under = rows.filter((r) => r.after < THRESHOLD);
if (under.length !== 1 || under[0].code !== mover.code)
  throw new Error(
    `the headline says the biggest mover is the only one still under ${THRESHOLD} %; ` +
      `under it are ${under.map((r) => r.name).join(", ") || "none"}, biggest mover ${mover.name}`,
  );
console.log(`${rows.length} pays · plus fort gain ${mover.name} ${mover.changeLabel} · seul sous ${THRESHOLD} % : ${under.map((r) => r.name).join(", ")}\n`);
console.table(rows.map((r) => ({ pays: r.name, [BEFORE]: r.beforeLabel, [AFTER]: r.afterLabel, écart: r.changeLabel })));

const facts = beatFacts(
  rows.map((r) => ({ key: r.code, label: r.name, value: r.after })),
  {
    subject: mover.name,
    states: [String(BEFORE), String(AFTER)],
    markers: rows.map((r) => ({ key: r.code, label: r.name, value: r.before })),
    declaredSequence: "% d'électricité bas-carbone",
  },
);
const offered = applicableTreatments(facts);
console.log(`treatments applicable: ${offered.map((t) => t.id).join(", ") || "(none)"}\n`);

const title = `La ${mover.name} a gagné ${mover.changeLabel.replace("+", "")} d'électricité bas-carbone depuis ${BEFORE}, et reste la seule des six sous la moitié`;
const caveat =
  `Part du nucléaire et de toutes les renouvelables dans la production d'électricité de chaque pays. ` +
  `La piste va de 0 à 100 % : ce qui reste à droite de la barre est le fossile. Le trait est la même ` +
  `mesure en ${BEFORE} — pas une cible, aucune politique n'est notée ici.`;
const thresholdNote = "la moitié";
const readingLine =
  `Lecture : survolez, touchez ou tabulez une ligne pour lire le détail du mix bas-carbone de ce ` +
  `pays en ${AFTER}, source par source — les neuf colonnes dont la part est calculée, et que la ` +
  `part elle-même cache.`;
const source = `Source : Ember, Energy Institute — Statistical Review of World Energy (2025), via Our World in Data · ${BEFORE} et ${AFTER}`;
const xTicks = [0, 25, 50, 75, 100];

const textPerRegister = {
  display: title,
  eyebrow: EYEBROW,
  body: `${caveat} ${readingLine} ${source}`,
  axis: `${xTicks.join(" ")} % ${rows.map((r) => r.name).join(" ")}`,
  annot: thresholdNote,
  value: rows.map((r) => `${r.afterLabel} ${r.changeLabel}`).join(" "),
};

// EVERY REGISTER'S TEXT PASSES THROUGH `plain` BEFORE IT REACHES THE LADDER. One U+202F or U+00A0 —
// the spaces `toLocaleString("fr-FR")` emits, and the one a hand types without meaning to — refuses
// every family on the sans ladder and takes all three renders down with a message that names the
// code point and not the string. Measured on the marimekko beat, where a no-break space typed inside
// a band's own label, invisible in the source, stopped the whole build.
for (const key of Object.keys(textPerRegister)) textPerRegister[key] = plain(textPerRegister[key]);

const filed = readdirSync(DIRECTIONS).filter((f) => f.endsWith(".md")).map((f) => readDirection(join(DIRECTIONS, f)));
const newsroom = readPalette(HERE, { stopAt: join(HERE, "..") });
const BEAT_FACTS = { evidenceLevels: 3 };
console.log(report(composeDirections({ newsroom, filed, beat: BEAT_FACTS, textPerRegister }), { beat: BEAT_FACTS }));
console.log("");

const refused = [];
for (const file of readdirSync(DIRECTIONS).filter((f) => f.endsWith(".md"))) {
  const id = file.replace(/\.md$/, "");
  const direction = resolveDirectionFamilies(readDirection(join(DIRECTIONS, file)), textPerRegister);
  try {
    await renderWeb({
      component: DirectedBulletWeb,
      props: {
        rows,
        subject: mover.code,
        threshold: THRESHOLD,
        thresholdNote,
        xTicks,
        title, eyebrow: EYEBROW, caveat, source, reading: readingLine,
        stateLabels: { before: String(BEFORE), after: String(AFTER) },
        alt:
          `Six pistes horizontales allant de 0 à 100 %, une par pays, mesurant la part de ` +
          `l'électricité bas-carbone en ${AFTER}, avec un trait à la valeur de ${BEFORE}. La ` +
          `${mover.name} passe de ${mover.beforeLabel} à ${mover.afterLabel}, le plus fort gain des ` +
          `six, et reste la seule dont la barre n'atteint pas la moitié de la piste. ` +
          `${rows[rows.length - 1].name} est à ${rows[rows.length - 1].afterLabel}.`,
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
