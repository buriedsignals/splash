// twin/proof/web-line-swiss-co2/render-directions-web.mjs
//
// Switzerland's annual CO₂ since 1858 as a line, rendered once per FILED DIRECTION into a
// self-contained interactive page.
//
// THE REFERENCE YEAR IS FOUND, NOT TYPED: the last year before the peak whose reading is still at or
// below today's, and the year after it. The headline is asserted against both.
//
// Usage:  bun proof/web-line-swiss-co2/render-directions-web.mjs

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
import { DirectedLineWeb } from "./DirectedLineWeb.tsx";

const HERE = dirname(fileURLToPath(import.meta.url));
const DIRECTIONS = join(HERE, "..", "..", "docs", "design-base", "directions");
const OUT = join(HERE, "renders");
const EYEBROW = "Climat · Suisse";
const UNIT = "Mt";

const plain = (s) => plainSpaces(s);
const fr = (v, d = 1) =>
  plain(v.toLocaleString("fr-FR", { minimumFractionDigits: d, maximumFractionDigits: d }));

const csv = (await readFile(join(HERE, "data.csv"), "utf8")).trim().split(/\r?\n/);
const header = csv[0].split(",");
const yearAt = header.indexOf("Year");
const rows = csv.slice(1).map((line) => {
  const c = line.split(",");
  return { year: Number(c[yearAt]), value: Number(c[header.length - 1]) / 1e6 };
});
for (let i = 1; i < rows.length; i += 1)
  if (rows[i].year !== rows[i - 1].year + 1)
    throw new Error(`the series skips from ${rows[i - 1].year} to ${rows[i].year}`);

const peak = rows.reduce((a, b) => (b.value > a.value ? b : a));
const last = rows[rows.length - 1];
const fall = ((peak.value - last.value) / peak.value) * 100;
const beforePeak = rows.filter((r) => r.year < peak.year);
const lastAtOrBelow = [...beforePeak].reverse().find((r) => r.value <= last.value);
if (!lastAtOrBelow) throw new Error("the series was never this low before its peak");
const reference = rows.find((r) => r.year === lastAtOrBelow.year + 1);
const erased = last.year - reference.year;

// ── THE CLAIM, ASSERTED ───────────────────────────────────────────────────────────────────────
if (!(last.value < reference.value && last.value > lastAtOrBelow.value))
  throw new Error(
    `the headline puts today between ${lastAtOrBelow.year} and ${reference.year}; ` +
      `${fr(last.value)} against ${fr(lastAtOrBelow.value)} and ${fr(reference.value)}`,
  );
if (!(fall > 25))
  throw new Error(`the headline says the fall from the peak is large; it is ${fr(fall)} %`);
console.log(
  `${rows.length} lectures ${rows[0].year}-${last.year} · pic ${peak.year} ${fr(peak.value)} ${UNIT} · ` +
    `${last.year} ${fr(last.value)} ${UNIT} (${fr(fall)} % sous le pic) · dernier passage à ce ` +
    `niveau : ${lastAtOrBelow.year} (${fr(lastAtOrBelow.value)}) · ${erased} ans effacés\n`,
);

/** How many years since the series was last at or below this reading. The number a line's shape
 *  makes a reader want and a static frame has no room to print 167 times. */
const sinceLower = (i) => {
  for (let k = i - 1; k >= 0; k -= 1) if (rows[k].value <= rows[i].value) return rows[i].year - rows[k].year;
  return null;
};

const readings = rows.map((r, i) => {
  const gap = sinceLower(i);
  return {
    year: r.year,
    value: r.value,
    label: fr(r.value),
    detail:
      `${r.year} · ${fr(r.value)} ${UNIT} de CO₂ · ` +
      (r.year === peak.year
        ? "pic de la série"
        : `${fr(((peak.value - r.value) / peak.value) * 100)} % sous le pic de ${peak.year}`) +
      (gap === null
        ? " · plus bas que tout ce qui précède"
        : gap > 1
          ? ` · le niveau n'avait pas été aussi bas depuis ${gap} ans`
          : ""),
  };
});

const facts = beatFacts(
  readings.map((r) => ({ key: String(r.year), label: String(r.year), value: r.value })),
  { subject: "Suisse", declaredSequence: `${UNIT} CO₂` },
);
const offered = applicableTreatments(facts);
console.log(`treatments applicable: ${offered.map((t) => t.id).join(", ") || "(none)"}\n`);

const yTicks = [0, 10, 20, 30, 40, 50];
const xTicks = [1860, 1900, 1940, 1980, 2020];

const title = `Le CO₂ suisse est repassé sous son niveau de ${reference.year} — ${erased} ans effacés`;
const caveat =
  `Émissions annuelles de CO₂ de la Suisse, ${rows.length} années consécutives. Une ligne porte un ` +
  `DÉBIT : c'est la pente qui se lit, pas la surface, et rien ici n'est mesuré par sa longueur ` +
  `depuis une base. Le fichier gelé est le même que celui de l'aire voisine, qui exige son zéro pour ` +
  `la raison inverse.`;
const referenceNote = `niveau de ${reference.year} : ${fr(reference.value)} ${UNIT}`;
const peakNote = `pic ${peak.year} · ${fr(peak.value)} ${UNIT}`;
const readingLine =
  `Lecture : survolez, touchez ou tabulez une année pour lire sa valeur, son écart au pic et — la ` +
  `lecture qui fait ce beat — depuis combien d'années le niveau n'avait pas été aussi bas. C'est ce ` +
  `chiffre qui transforme « ça baisse » en « un demi-siècle a été effacé ».`;
const source = `Source : Global Carbon Budget 2025, via Our World in Data · ${rows[0].year}-${last.year}`;

const textPerRegister = {
  display: title,
  eyebrow: EYEBROW,
  body: `${caveat} ${readingLine} ${source}`,
  axis: `${yTicks.join(" ")} ${xTicks.join(" ")} ${UNIT}`,
  annot: `${referenceNote} ${peakNote}`,
  value: readings.map((r) => r.label).join(" "),
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
      component: DirectedLineWeb,
      props: {
        readings,
        peakYear: peak.year,
        referenceYear: reference.year,
        referenceValue: reference.value,
        referenceNote,
        peakNote,
        yTicks, xTicks, unit: UNIT,
        title, eyebrow: EYEBROW, caveat, source, reading: readingLine,
        alt:
          `Une ligne des émissions annuelles de CO₂ de la Suisse de ${rows[0].year} à ${last.year}, ` +
          `en millions de tonnes. Elle monte lentement jusqu'aux années 1950, s'élève fortement ` +
          `jusqu'à un pic de ${fr(peak.value)} Mt en ${peak.year}, oscille, puis redescend à ` +
          `${fr(last.value)} Mt en ${last.year} — sous le trait horizontal marquant le niveau de ` +
          `${reference.year} (${fr(reference.value)} Mt).`,
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
