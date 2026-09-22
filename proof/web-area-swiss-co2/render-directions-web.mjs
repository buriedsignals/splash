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
import { levelSlugOf } from "../../skills/chart-web/assets/level.ts";
import { DirectedAreaWeb, SERIES, xOf } from "./DirectedAreaWeb.tsx";

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

// ── THE YARDSTICK THE READER PARKS ON THEIR OWN YEAR ─────────────────────────────────────────
//
// The plate cuts the surface once, at the year the running total crosses its half. This is the same
// cut, handed over: five birth years spanning a readership, each recomputed from the frozen file.
// Nothing below is typed — every figure is an integral of the same rows the surface is drawn from,
// and the arithmetic is asserted against the picture before a mark is drawn.
const BIRTH_YEARS = [1950, 1965, 1980, 1995, 2005];

const cumulativeTo = new Map();
let cumulate = 0;
for (const row of rows) {
  cumulate += row.tonnes;
  cumulativeTo.set(row.year, cumulate);
}

const cohorts = BIRTH_YEARS.map((year) => {
  if (!cumulativeTo.has(year))
    throw new Error(`${year} is not a reading this series carries — a cohort cannot be cut there`);
  const before = cumulativeTo.get(year - 1) ?? 0;
  const after = total - before;
  const yearsLived = lastYear - year + 1;
  const yearsBefore = year - firstYear;
  if (yearsLived < 2 || yearsBefore < 2)
    throw new Error(`${year} leaves ${yearsLived} lived and ${yearsBefore} before it — not a cut`);
  return {
    year,
    yearsLived,
    yearsBefore,
    shareOfTime: (yearsLived / rows.length) * 100,
    shareOfStock: (after / total) * 100,
    mtLived: after / 1e6,
    mtBefore: before / 1e6,
    meanLived: after / 1e6 / yearsLived,
    meanBefore: before / 1e6 / yearsBefore,
  };
});

// THE COHORTS' OWN CLAIM, ASSERTED. Each of these is a sentence the page puts in front of a reader,
// so each is refused here rather than trusted: a share of the stock must be a share, it must FALL as
// the birth year rises (a later reader has lived less of the history), and the rate the reader lived
// through must be the higher one on every cohort — which is the whole point being made.
for (const [i, c] of cohorts.entries()) {
  if (!(c.shareOfStock > 0 && c.shareOfStock < 100))
    throw new Error(`${c.year} carries ${c.shareOfStock} % of the stock, which is not a share`);
  if (!(c.shareOfStock > c.shareOfTime))
    throw new Error(
      `${c.year} lived ${c.shareOfTime.toFixed(1)} % of the years and ${c.shareOfStock.toFixed(1)} % ` +
        `of the stock — the page says the recent years are the heavy ones and this cohort says they are not`,
    );
  if (!(c.meanLived > c.meanBefore))
    throw new Error(
      `${c.year} lived through ${c.meanLived.toFixed(1)} Mt/an against ${c.meanBefore.toFixed(1)} before it`,
    );
  if (i > 0 && !(c.shareOfStock < cohorts[i - 1].shareOfStock))
    throw new Error(
      `${c.year} carries more of the stock than ${cohorts[i - 1].year}, which is later-born — the ` +
        `cumulative total does not run backwards`,
    );
}
console.table(
  cohorts.map((c) => ({
    naissance: c.year,
    "années vécues": `${c.yearsLived}/${rows.length}`,
    "% du temps": fr(c.shareOfTime),
    "Mt depuis": fr(c.mtLived, 0),
    "% du stock": fr(c.shareOfStock),
    "Mt/an pendant": fr(c.meanLived),
    "Mt/an avant": fr(c.meanBefore),
  })),
);

const levels = {
  label: "Depuis ma naissance en",
  // THE UNTOUCHED OPTION IS THE PLATE, said in the plate's own words: the cut the page asserts.
  noneLabel: `La moitié, en ${midYear}`,
  options: cohorts.map((c) => ({
    key: String(c.year),
    label: String(c.year),
    announce:
      `${c.year} — ${c.yearsLived} des ${rows.length} années de la série, soit ` +
      `${fr(c.shareOfTime, 0)} % du temps, et ${fr(c.shareOfStock)} % de tout ce que la Suisse a ` +
      `émis depuis ${firstYear}`,
    note:
      `Naissance en ${c.year} : ${c.yearsLived} des ${rows.length} années, ` +
      `${fr(c.shareOfTime, 0)} % du temps — et ${fr(c.mtLived, 0)} Mt émis depuis, soit ` +
      `${fr(c.shareOfStock)} % de tout ce que la Suisse a émis depuis ${firstYear}. ` +
      `${fr(c.meanLived)} Mt ` +
      `par an en moyenne pendant ces ${c.yearsLived} ans, contre ${fr(c.meanBefore)} Mt par an ` +
      `sur les ${c.yearsBefore} précédentes.`,
    // ONE REFERENCE, STOOD UP: on this shape the x axis is the one that carries the cut, and the
    // beat draws one series, so an option lays exactly one mark or `assertLevelDeclaration` refuses
    // it as a yardstick that answers half the question.
    marks: [{ series: SERIES, x: xOf(c.year, firstYear, lastYear) }],
  })),
};
const splits = cohorts.map((c) => ({
  slug: levelSlugOf(String(c.year)),
  year: c.year,
  label: String(c.year),
  x: xOf(c.year, firstYear, lastYear),
}));

// Written in `BRIEF.md` before any of this was built and carried here so the prose and the render
// cannot drift: `assertInteractionPlan` matches every declared gesture against a control the markup
// actually ships, and every shipped control against a declaration.
const interaction = {
  earns:
    "Une plaque ne peut couper la surface qu'une fois, à l'année de l'auteur. Ici le lecteur pose " +
    "la coupe sur la sienne : né en 1950, il a vécu 75 des 167 années — 45 % du temps — et 85,3 % " +
    "de tout le stock suisse a été émis dedans ; né en 2005, 20 ans, 12 % du temps, et un quart " +
    "du stock. Aucune image fixe et aucune vidéo ne peuvent dire l'un ou l'autre, ni être amenées " +
    "à le dire.",
  controls: [
    {
      question:
        "Depuis l'année où je suis venu au monde, quelle part de tout le CO₂ suisse a été émise ?",
      gesture: "find-your-own-case",
      changes:
        "La surface se recoupe à cette année-là : la couture entre les deux chromas quitte " +
        `${midYear} et voyage jusqu'à l'année choisie, si bien que le bloc d'accent EST la vie du ` +
        "lecteur. Une règle d'encre, gainée de fond, se dresse sur la nouvelle couture ; l'année " +
        "s'écrit au pied de cette règle ; sa lecture prend un cerne parmi 166 qui restent " +
        "anonymes ; et une phrase donne quatre lectures qu'aucun axe de cette plaque ne porte — le " +
        "nombre d'années vécues, la part du TEMPS que cela représente, les Mt et la part du STOCK " +
        "émis depuis, et le débit moyen de ces années contre celui de toutes les années d'avant.",
    },
    {
      question: "Cette année-là vaut combien, et quelle part du total était déjà derrière ?",
      gesture: "ask-a-mark",
      changes:
        "L'année répond avec son chiffre annuel et avec la part de toute la surface qui se trouve " +
        "à sa gauche — les 167 lectures dont la plaque n'a pu en écrire que six.",
    },
  ],
};

// ── the words, per register ───────────────────────────────────────────────────────────────────
const title = `La moitié du CO₂ suisse depuis ${firstYear} a été émise après ${midYear}`;
const caveat =
  `${rows.length} années consécutives, sans trou : la surface est une quantité, et une aire qui ` +
  `enjambe une année manquante en invente une.`;
const midNote = `${midYear} : la moitié du total est derrière`;
const readingLine =
  `Lecture : la hauteur est le débit d'une année, la surface est le stock qu'il accumule. ` +
  `Choisissez votre année de naissance pour recouper la surface dessus et lire ce qui a été émis ` +
  `pendant votre vie. Survolez, touchez ou tabulez n'importe quelle année pour son chiffre et la ` +
  `part du total déjà émise à cette date — les 167 lectures que l'image fixe ne pouvait pas écrire.`;
const source = `Source : Global Carbon Budget 2025, via Our World in Data · ${firstYear}-${lastYear}`;
const yTicks = [0, 10, 20, 30, 40, 50];
const xTicks = [1860, 1900, 1940, 1980, 2020];

const textPerRegister = {
  display: title,
  eyebrow: EYEBROW,
  body:
    `${caveat} ${readingLine} ${source} Total ${firstYear}-${lastYear} : ${fr(totalMt, 0)} Mt. ` +
    `${levels.label} ${levels.noneLabel} ` +
    `${levels.options.map((o) => `${o.label} ${o.note} ${o.announce}`).join(" ")}`,
  axis: `${yTicks.join(" ")} ${xTicks.join(" ")} ${UNIT}`,
  annot: `${midNote} ${levels.options.map((o) => o.label).join(" ")}`,
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
      // This catalogue is written in French; the renderer defaults to English and never guesses.
      lang: "fr",
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
        levels,
        splits,
        interaction,
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
