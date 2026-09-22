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

/**
 * THE YEAR A READING HAS WOUND THE SERIES BACK BELOW: the year AFTER the last pre-peak year still at
 * or below it. `null` when nothing before the peak was ever that low.
 *
 * ONE FUNCTION, TWO USES, AND THAT IS THE WHOLE POINT OF IT. The headline's reference year is this
 * run on today's reading; every year's own tooltip clause is the same function run on that year.
 *
 * The beat previously carried a SECOND arithmetic for the same question — the last year ANYWHERE in
 * the series at or below this one — and the two disagreed exactly where the claim lives. 2023 came
 * in at 31,98 Mt against 2024's 32,07, so on the headline year that reading collapsed to "one year"
 * and its clause was suppressed: the year the whole beat is about answered with nothing at all about
 * the erasure. With one implementation the tooltip cannot disagree with the title — 2024 reads 1967
 * and 57 ans, which IS the title's number rather than a second derivation that happens to match.
 */
const woundBackTo = (value) => {
  const under = [...beforePeak].reverse().find((r) => r.value <= value);
  return under ? under.year + 1 : null;
};

const referenceYear = woundBackTo(last.value);
if (referenceYear === null) throw new Error("the series was never this low before its peak");
const reference = rows.find((r) => r.year === referenceYear);
const lastAtOrBelow = rows.find((r) => r.year === referenceYear - 1);
const erased = last.year - reference.year;

// ── THE CLAIM, ASSERTED ───────────────────────────────────────────────────────────────────────
if (!(last.value < reference.value && last.value >= lastAtOrBelow.value))
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

/**
 * WHERE TODAY STANDS AGAINST THE YEAR THE READER IS POINTING AT — the reading that hands the
 * baseline over. The title compares today to one year, 1967, because a plate has room for one rule;
 * this lets the reader put the rule wherever their own question is (1990, the year every Swiss
 * target is written against; the year they were born).
 *
 * A PERCENTAGE UNLESS TODAY IS MORE THAN DOUBLE THAT YEAR, then a multiple: 2024 is 219 times 1858,
 * and "21 783 % plus haut" is an arithmetic result, not a reading anybody can hold.
 */
const versusToday = (value) => {
  const change = ((last.value - value) / value) * 100;
  if (Math.abs(change) < 100)
    return `aujourd'hui ${fr(Math.abs(change))} % plus ${change < 0 ? "bas" : "haut"}`;
  const times = last.value / value;
  return `aujourd'hui ${fr(times, times >= 10 ? 0 : 1)} fois plus`;
};

const readings = rows.map((r) => {
  // TWO CONDITIONS, AND EACH ONE IS A READING THIS CLAUSE WOULD OTHERWISE INVENT.
  //
  // Only AFTER the peak, because before it the series had never been that high, so "wound back
  // below" reads off a dip nobody was aiming at: 1900's 5,7 Mt was last seen in 1946, on the way
  // down through a war, and printing that under a claim about decarbonisation is an accident
  // dressed as a reading.
  //
  // And only when it has wound back PAST the peak year. Measured on this series before the second
  // condition was added: 1990 answered "sous le niveau de 1973 — 17 ans effacés" while sitting 4,5 %
  // under the record — the headline's own word spent on a year that had undone nothing, next to a
  // clause naming the same 1973 for the magnitude. When `woundBackTo` returns the peak year itself
  // it has measured how long since the peak, not an erasure, and the tooltip already says that.
  const back0 = r.year > peak.year ? woundBackTo(r.value) : null;
  const wound = back0 !== null && back0 < peak.year ? back0 : null;
  const back = wound === null ? 0 : r.year - wound;
  return {
    year: r.year,
    value: r.value,
    label: fr(r.value),
    detail: [
      `${r.year} · ${fr(r.value)} ${UNIT} de CO₂`,
      r.year === peak.year
        ? "pic de la série"
        : `${fr(((peak.value - r.value) / peak.value) * 100)} % sous le pic de ${peak.year}`,
      wound === null ? null : `sous le niveau de ${wound} — ${back} an${back > 1 ? "s" : ""} effacé${back > 1 ? "s" : ""}`,
      r.year === last.year ? null : versusToday(r.value),
    ]
      .filter(Boolean)
      .join(" · "),
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
  `Lecture : le titre ne compare qu'à une seule année. Survolez, touchez ou tabulez n'importe ` +
  `laquelle des ${rows.length} pour choisir la vôtre — sa valeur, son écart au pic, jusqu'où elle ` +
  `ramène la série, et de combien 2024 s'en écarte.`;
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

/**
 * THE INTERACTION, WRITTEN BEFORE THE CODE — `chart-web/references/directed-interaction.md`, and
 * `BRIEF.md` carries the same thing in prose, including the two controls this beat declined and the
 * measurement each refusal rests on. `renderWeb` checks this declaration against the markup it is
 * about to write: a control declared and not shipped is a promise the brief makes and the render
 * breaks, and a control shipped and not declared is what the rule exists to stop being possible.
 */
const interaction = {
  earns:
    `Un still imprime quatre des ${rows.length} lectures et n'affirme qu'une comparaison, ` +
    `aujourd'hui contre ${reference.year}, parce qu'une plaque n'a la place que d'une règle ; ` +
    `cette page rend la règle au lecteur, et n'importe laquelle des ${rows.length} années répond ` +
    `de l'écart de 2024 avec elle et de jusqu'où elle ramène la série.`,
  controls: [
    {
      question: "Elle valait combien, cette année-là, et où en est-on par rapport à elle ?",
      gesture: "ask-a-mark",
      changes:
        `L'année visée s'allume et l'infobulle imprime jusqu'à quatre lectures absentes de la ` +
        `plaque : sa valeur, son écart au pic de ${peak.year}, pour toute année postérieure au pic ` +
        `l'année d'avant-pic sous laquelle elle ramène la série et le nombre d'années effacées, et ` +
        `de combien ${last.year} s'en écarte.`,
    },
  ],
};

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
      // This catalogue is written in French; the renderer defaults to English and never guesses.
      lang: "fr",
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
        interaction,
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
