// twin/proof/web-area-swiss-co2/render-directions-web.mjs
//
// Switzerland's annual CO₂ since 1858 as a filled area, rendered once per FILED DIRECTION into a
// self-contained interactive page. The first directed beat in this tree's WEB format.
//
// WHAT "DIRECTED" MEANS FOR A PAGE, and it is the same thing it means for a plate. The direction is
// read from its own record, its family roles are resolved against THIS beat's own text
// (`resolveDirectionFamilies` — a face that cannot set `CO₂` is refused before anything is laid
// out), its six registers become the page's CSS type scale, and its ground and accent are the only
// colours the page names. Three records on disk, three pages in `renders/`, and nothing hard-coded
// in between.
//
// `renders/`, PLURAL. A render written to `render/` receives no approval and is invisible to the
// export guard.
//
// Usage:  bun proof/web-area-swiss-co2/render-directions-web.mjs

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
import { DirectedAreaWeb } from "./DirectedAreaWeb.tsx";

const HERE = dirname(fileURLToPath(import.meta.url));
const DIRECTIONS = join(HERE, "..", "..", "docs", "design-base", "directions");
const OUT = join(HERE, "renders");
const EYEBROW = "Climat · Suisse";
const UNIT = "Mt CO₂";

/** `toLocaleString("fr-FR")` emits U+202F and U+00A0, which no face on the family ladders covers. */
const plain = (s) => plainSpaces(s);
const fr = (v, digits = 1) =>
  plain(v.toLocaleString("fr-FR", { minimumFractionDigits: digits, maximumFractionDigits: digits }));

// ── the series ────────────────────────────────────────────────────────────────────────────────
const csv = (await readFile(join(HERE, "data.csv"), "utf8")).trim().split(/\r?\n/);
const header = csv[0].split(",");
const yearAt = header.indexOf("Year");
const valueAt = header.length - 1;
if (yearAt < 0) throw new Error("the frozen file carries no Year column");

const rows = csv.slice(1).map((line) => {
  const cells = line.split(",");
  return { year: Number(cells[yearAt]), tonnes: Number(cells[valueAt]) };
});
for (const row of rows)
  if (!Number.isFinite(row.year) || !Number.isFinite(row.tonnes) || row.tonnes < 0)
    throw new Error(`a reading is not usable: ${JSON.stringify(row)}`);

// AN AREA CLOSES ACROSS A GAP. The polygon would join the years either side of a missing one and the
// reader would integrate a value nobody measured, with nothing on the page to show it. Refused here,
// before a mark is drawn, exactly as the static sibling refuses it.
for (let i = 1; i < rows.length; i += 1)
  if (rows[i].year !== rows[i - 1].year + 1)
    throw new Error(
      `the series skips from ${rows[i - 1].year} to ${rows[i].year}. An area chart cannot draw a ` +
        `gap: it closes over it and the surface states a quantity nobody measured`,
    );

const total = rows.reduce((sum, r) => sum + r.tonnes, 0);
let running = 0;
const readings = rows.map((r) => {
  running += r.tonnes;
  const mt = Number((r.tonnes / 1e6).toFixed(1));
  const share = (running / total) * 100;
  return { year: r.year, mt, label: fr(mt), share: fr(share) };
});
const midYear = readings.find((r) => Number(r.share.replace(',', '.')) >= 50).year;
const afterShare =
  (rows.filter((r) => r.year >= midYear).reduce((s, r) => s + r.tonnes, 0) / total) * 100;
const totalMt = total / 1e6;
const firstYear = readings[0].year;
const lastYear = readings[readings.length - 1].year;
const recentYears = lastYear - midYear + 1;
const earlierYears = midYear - firstYear;

// ── THE CLAIM, ASSERTED ───────────────────────────────────────────────────────────────────────
if (!(afterShare > 48 && afterShare < 55))
  throw new Error(
    `the headline says the surface splits near its half at ${midYear}; the later half is ` +
      `${afterShare.toFixed(1)} %`,
  );
if (!(recentYears < earlierYears / 2))
  throw new Error(
    `the headline says the recent half is far the shorter one; it is ${recentYears} years ` +
      `against ${earlierYears}`,
  );
console.log(
  `${rows.length} lectures ${firstYear}-${lastYear} · total ${fr(totalMt, 0)} Mt · moitié franchie ` +
    `en ${midYear} · ${fr(afterShare)} % émis depuis, en ${recentYears} ans contre ${earlierYears}\n`,
);

const peak = readings.reduce((a, b) => (b.mt > a.mt ? b : a));
const last = readings[readings.length - 1];
console.table([
  { repère: "pic", année: peak.year, Mt: peak.label, "% cumulé": peak.share },
  { repère: "moitié", année: midYear, Mt: readings.find((r) => r.year === midYear).label, "% cumulé": readings.find((r) => r.year === midYear).share },
  { repère: "dernière", année: last.year, Mt: last.label, "% cumulé": last.share },
]);

// ── the arbiter ───────────────────────────────────────────────────────────────────────────────
const facts = beatFacts(
  readings.map((r) => ({ key: String(r.year), label: String(r.year), value: r.mt })),
  { subject: "Suisse", declaredSequence: UNIT, states: [String(firstYear), String(lastYear)] },
);
const offered = applicableTreatments(facts);
console.log(`treatments applicable: ${offered.map((t) => t.id).join(", ") || "(none)"}\n`);

// ── the words, per register ───────────────────────────────────────────────────────────────────
const title = `La moitié du CO₂ suisse depuis ${firstYear} a été émise après ${midYear}`;
const caveat =
  `${rows.length} années consécutives, sans trou : la surface est une quantité, et une aire qui ` +
  `enjambe une année manquante en invente une.`;
const midNote = `${midYear} : la moitié du total est derrière`;
const readingLine =
  `Lecture : la hauteur est le débit d'une année, la surface est le stock qu'il accumule. ` +
  `Survolez, touchez ou tabulez n'importe quelle année pour lire son chiffre et la part du total ` +
  `déjà émise à cette date — les 167 lectures que l'image fixe ne pouvait pas écrire.`;
const source = `Source : Global Carbon Budget 2025, via Our World in Data · ${firstYear}-${lastYear}`;
const yTicks = [0, 10, 20, 30, 40, 50];
const xTicks = [1860, 1900, 1940, 1980, 2020];

const textPerRegister = {
  display: title,
  eyebrow: EYEBROW,
  body: `${caveat} ${readingLine} ${source} Total ${firstYear}-${lastYear} : ${fr(totalMt, 0)} Mt.`,
  axis: `${yTicks.join(" ")} ${xTicks.join(" ")} ${UNIT}`,
  annot: midNote,
  value: readings.map((r) => `${r.year} ${r.label}`).join(" "),
};

for (const key of Object.keys(textPerRegister)) textPerRegister[key] = plain(textPerRegister[key]);

const filed = readdirSync(DIRECTIONS)
  .filter((f) => f.endsWith(".md"))
  .map((f) => readDirection(join(DIRECTIONS, f)));
const newsroom = readPalette(HERE, { stopAt: join(HERE, "..") });
const BEAT_FACTS = { evidenceLevels: 2 };
console.log(report(composeDirections({ newsroom, filed, beat: BEAT_FACTS, textPerRegister }), { beat: BEAT_FACTS }));
console.log("");

const refused = [];
for (const file of readdirSync(DIRECTIONS).filter((f) => f.endsWith(".md"))) {
  const id = file.replace(/\.md$/, "");
  const direction = resolveDirectionFamilies(readDirection(join(DIRECTIONS, file)), textPerRegister);
  try {
    const { outPath } = await renderWeb({
      component: DirectedAreaWeb,
      props: {
        readings,
        midYear,
        totalMt: fr(totalMt, 0),
        shareAfter: fr(afterShare),
        yTicks,
        xTicks,
        title,
        eyebrow: EYEBROW,
        caveat,
        source,
        unit: UNIT,
        midNote,
        reading: readingLine,
        alt:
          `Une aire remplie : les émissions annuelles de CO₂ de la Suisse de ${firstYear} à ` +
          `${lastYear}, en millions de tonnes. La surface monte jusqu'à un pic de ${fr(peak.mt)} Mt ` +
          `en ${peak.year} puis redescend à ${fr(last.mt)} Mt en ${last.year}. Un trait vertical ` +
          `marque ${midYear}, l'année où le cumul franchit la moitié du total de ` +
          `${fr(totalMt, 0)} Mt ; la moitié droite de la surface, plus courte de ${recentYears} ` +
          `ans, pèse autant que la gauche qui en compte ${earlierYears}.`,
        direction,
        treatments: offered.map((t) => t.id),
        ground: direction.ground,
        accent: direction.accent,
      },
      outDir: OUT,
      name: `${id}.html`,
    });
    console.log(`${id} -> ${outPath.replace(`${HERE}/`, "")}`);
  } catch (error) {
    refused.push({ id, why: error.message });
    console.log(`${id} REFUSED — ${error.message}`);
  }
}
if (refused.length) console.log(`\nrefused by ${refused.length}: ${refused.map((x) => x.id).join(", ")}`);
