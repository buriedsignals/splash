// Life expectancy in ten countries, 2000 to 2023, rendered once per FILED DIRECTION into a self-contained scrolly page.
// The `dumbbell` type in the scrolly format.
//
// THE SUBJECT OF `more-dumbbell-life-expectancy-gains`, CHOREOGRAPHED. The readings, the ten countries and the claim —
// every one gained, Poland most, the United States least — are the static beat's own; the scroll tells them with its
// own gestures (`scrolly/references/directed-type-choreography.md`):
//
//   1. ten dots in 2000;
//   2. each country's dot travelling year by year to 2019, a bar drawn behind it;
//   3. 2021: most step back, the 2019 value left as a ring, the two largest losses written;
//   4. 2023: the dumbbells complete, the gains written;
//   5. the rows sorted by gain, the United States last;
//   6. the static plate, its reading stated.
//
// Usage:  bun proof/scrolly-dumbbell-life-expectancy-gains/render-directions-scrolly.mjs

import { readdirSync } from "node:fs";
import { readFile, rm } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createElement } from "react";
import { deriveFurniture } from "#shared/chart-beat/render-still.mjs";
import { readPalette } from "#shared/chart-beat/colour.mjs";
import { readDirection } from "#shared/design-base/read-direction.mjs";
import { composeDirections, report } from "#shared/design-base/compose.mjs";
import { resolveDirectionFamilies } from "#shared/design-base/resolve-families.mjs";
import { plainSpaces, webRegisters } from "#shared/design-base/web.mjs";
import { EYEBROW_TO_DISPLAY, gapOf, registerOf } from "#shared/design-base/register.mjs";
import { renderScrolly } from "../../skills/scrolly/scripts/render-scrolly.mjs";
import { DirectedDumbbellScrolly } from "./DirectedDumbbellScrolly.tsx";

const HERE = dirname(fileURLToPath(import.meta.url));
const DIRECTIONS = join(HERE, "..", "..", "docs", "design-base", "directions");
const OUT = join(HERE, "renders");
const EYEBROW = "Santé · Europe, Japon et États-Unis";
const NB = "\u00A0";
const FROM = 2000;
const DIP_FROM = 2019;
const DIP_TO = 2021;
const TO = 2023;

/** The ten the static beat is about, and the French name each is drawn under. */
const COUNTRIES = {
  France: { name: "France", withArticle: "la France" },
  Germany: { name: "Allemagne", withArticle: "l’Allemagne" },
  Italy: { name: "Italie", withArticle: "l’Italie" },
  Japan: { name: "Japon", withArticle: "le Japon" },
  Netherlands: { name: "Pays-Bas", withArticle: "les Pays-Bas" },
  Poland: { name: "Pologne", withArticle: "la Pologne" },
  Spain: { name: "Espagne", withArticle: "l’Espagne" },
  Switzerland: { name: "Suisse", withArticle: "la Suisse" },
  "United Kingdom": { name: "Royaume-Uni", withArticle: "le Royaume-Uni" },
  "United States": { name: "États-Unis", withArticle: "les États-Unis" },
};
const capital = (text) => text.charAt(0).toUpperCase() + text.slice(1);

// ── the readings, and every sentence's assertion ───────────────────────────────────────────────
const csv = (await readFile(join(HERE, "data.csv"), "utf8")).trim().split(/\r?\n/);
const header = csv[0].split(",");
const cells = csv.slice(1).map((l) => l.split(","));
const years = [];
for (let y = FROM; y <= TO; y++) years.push(y);
const countries = Object.keys(COUNTRIES).map((entity) => {
  const series = years.map((y) => {
    const row = cells.find((c) => c[header.indexOf("Entity")] === entity && Number(c[header.indexOf("Year")]) === y);
    if (!row) throw new Error(`no ${y} reading for ${entity} in the frozen data`);
    return Number(row[header.indexOf("Life expectancy")]);
  });
  const at = (y) => series[y - FROM];
  return { entity, ...COUNTRIES[entity], series, at, gain: at(TO) - at(FROM), dip: at(DIP_TO) - at(DIP_FROM) };
});
const byStart = [...countries].sort((a, b) => b.at(FROM) - a.at(FROM));
const byGain = [...countries].sort((a, b) => b.gain - a.gain);
const highestStart = byStart[0];
const lowestStart = byStart[byStart.length - 1];
if (highestStart.entity !== "Japan" || lowestStart.entity !== "Poland") throw new Error(`card 1 names Japan highest and Poland lowest in ${FROM}; they are ${highestStart.entity} and ${lowestStart.entity}`);
const notRisen = countries.filter((c) => !(c.at(DIP_FROM) > c.at(FROM)));
if (notRisen.length) throw new Error(`card 2 says every country lived longer in ${DIP_FROM} than in ${FROM}; not ${notRisen.map((c) => c.entity).join(", ")}`);
const fell = countries.filter((c) => c.dip < 0);
if (!(fell.length > countries.length / 2)) throw new Error(`card 3 says most fell from ${DIP_FROM} to ${DIP_TO}; ${fell.length} of ${countries.length} did`);
const byDip = [...countries].sort((a, b) => a.dip - b.dip);
const [worstDip, secondDip] = byDip;
if (worstDip.entity !== "United States" || secondDip.entity !== "Poland") throw new Error(`card 3 names the United States then Poland as the largest losses; they are ${worstDip.entity} and ${secondDip.entity}`);
const notGained = countries.filter((c) => !(c.gain > 0));
if (notGained.length) throw new Error(`card 4 says every country gained since ${FROM}; not ${notGained.map((c) => c.entity).join(", ")}`);
const most = byGain[0];
const least = byGain[byGain.length - 1];
if (most.entity !== "Poland" || least.entity !== "United States") throw new Error(`cards 4 and 5 name Poland the largest gain and the United States the smallest; they are ${most.entity} and ${least.entity}`);
const byEnd = [...countries].sort((a, b) => a.at(TO) - b.at(TO));
if (byEnd[0].entity !== "Poland" || byEnd[1].entity !== "United States") throw new Error(`card 5 says only Poland lives shorter than the United States in ${TO}; the two lowest are ${byEnd[0].entity} and ${byEnd[1].entity}`);
console.table(countries.map((c) => ({ pays: c.name, [FROM]: c.at(FROM).toFixed(2), [DIP_FROM]: c.at(DIP_FROM).toFixed(2), [DIP_TO]: c.at(DIP_TO).toFixed(2), [TO]: c.at(TO).toFixed(2), gain: c.gain.toFixed(2), covid: c.dip.toFixed(2) })));

// Rounded to tenths first, the way the driver writes a value on the stage, so a sentence and a dot never disagree.
const one = (v) => plainSpaces((Math.round(v * 10) / 10).toLocaleString("fr-FR", { minimumFractionDigits: 1, maximumFractionDigits: 1 }));
const signed = (v) => `${v < 0 ? "−" : "+"}${one(Math.abs(v))}`;
const rows = countries.map((c) => ({
  key: c.entity,
  label: c.name,
  series: c.series,
  gainText: `${signed(c.gain)}${NB}ans`,
  lossText: c === worstDip || c === secondDip ? `${signed(c.dip)}${NB}ans` : "",
  marked: c === most || c === least,
  focus: c === least,
}));
const indexOf = (c) => countries.indexOf(c);
const orders = [byStart.map(indexOf), byGain.map(indexOf)];
const all = countries.flatMap((c) => c.series);
const domain = [Math.floor(Math.min(...all)) - 2, Math.ceil(Math.max(...all)) + 1];
const ticks = [];
for (let t = Math.ceil(domain[0] / 2) * 2; t <= domain[1]; t += 2) ticks.push(t);

// ── the words ──────────────────────────────────────────────────────────────────────────────────
const title = [
  `${capital(most.withArticle)} a gagné ${one(most.gain)}${NB}ans d’espérance de vie depuis ${FROM}, ${least.withArticle} ${one(least.gain)}`,
  `L’espérance de vie depuis ${FROM} : ${signed(most.gain)}${NB}ans en Pologne, ${signed(least.gain)} aux États-Unis`,
  `L’espérance de vie, de ${FROM} à ${TO}`,
];
const prose = [
  [`L’espérance de vie à la naissance dans ${countries.length}${NB}pays, en ${FROM}. En tête, ${highestStart.withArticle} : ${one(highestStart.at(FROM))}${NB}ans. Dernière, ${lowestStart.withArticle} : ${one(lowestStart.at(FROM))}${NB}ans.`],
  [`Chaque pays avance, année après année, jusqu’en ${DIP_FROM}. Tous vivent alors plus longtemps qu’en ${FROM}.`],
  [`Puis le Covid : en ${DIP_TO}, ${fell.length}${NB}pays sur ${countries.length} ont reculé. ${capital(worstDip.withArticle)} perdent ${one(-worstDip.dip)}${NB}ans depuis ${DIP_FROM}, ${secondDip.withArticle} ${one(-secondDip.dip)}.`],
  [`En ${TO}, tous ont dépassé leur niveau de ${FROM}. ${capital(most.withArticle)} a gagné le plus : ${signed(most.gain)}${NB}ans.`],
  [`Classés par gain, ${least.withArticle} finissent derniers : ${signed(least.gain)}${NB}ans, pour ${one(least.at(TO))}${NB}ans en ${TO}. Seule ${most.withArticle} vit moins longtemps.`],
  [`Lecture : le point clair marque ${FROM}, le point foncé ${TO} ; à droite, le gain en années.`],
];
const source = `Source : Our World in Data (UN WPP, HMD), espérance de vie à la naissance · ${FROM}–${TO}`;
const words = {
  unit: "espérance de vie à la naissance, en années",
  yearTemplate: `de ${FROM} à {year}`,
  yearFirst: `en ${FROM}`,
  startNote: `${countries.length}${NB}pays`,
  riseNote: `${DIP_FROM}${NB}: tous au-dessus de ${FROM}`,
  dipNote: `${fell.length}${NB}pays sur ${countries.length} en recul`,
  gainNote: `${most.name}${NB}: ${signed(most.gain)}${NB}ans`,
  sortNote: `${least.name}${NB}: ${signed(least.gain)}${NB}ans`,
  readNote: `${countries.length}${NB}pays, classés par gain`,
};
const alt =
  `Haltères : l’espérance de vie à la naissance en ${FROM} et en ${TO} dans ${countries.length} pays, classés par gain. ` +
  `Tous ont gagné, de ${one(least.gain)} ans pour ${least.withArticle} à ${one(most.gain)} ans pour ${most.withArticle}.`;

/** One state per card; see `dumbbell-drive.mjs` for what each field paints. */
const STATES = [
  { year: FROM, ghost: 0, loss: 0, gain: 0, sort: 0, focus: 0, note: 0 },
  { year: DIP_FROM, ghost: 0, loss: 0, gain: 0, sort: 0, focus: 0, note: 1 },
  { year: DIP_TO, ghost: 1, loss: 1, gain: 0, sort: 0, focus: 0, note: 2 },
  { year: TO, ghost: 0, loss: 0, gain: 1, sort: 0, focus: 0, note: 3 },
  { year: TO, ghost: 0, loss: 0, gain: 1, sort: 1, focus: 1, note: 4 },
  { year: TO, ghost: 0, loss: 0, gain: 1, sort: 1, focus: 0, note: 5 },
];

const textPerRegister = {
  display: title.join(" "),
  eyebrow: EYEBROW,
  body: `${prose.flat().join(" ")} ${source}`,
  axis: `${words.unit} ${ticks.join(" ")} ${all.map((v) => one(v)).join(" ")}`,
  annot: rows.map((r) => r.label).join(" "),
  value: `${rows.map((r) => `${r.gainText} ${r.lossText}`).join(" ")} ${all.map((v) => one(v)).join(" ")} ${years.join(" ")} ${words.yearTemplate} ${words.yearFirst} ${Object.entries(words).filter(([k]) => k.endsWith("Note")).map(([, v]) => v).join(" ")}`,
};

const filed = readdirSync(DIRECTIONS)
  .filter((f) => f.endsWith(".md"))
  .map((f) => readDirection(join(DIRECTIONS, f)));
const newsroom = readPalette(HERE, { stopAt: join(HERE, "..") });
const BEAT_FACTS = { evidenceLevels: 2 };
console.log(report(composeDirections({ newsroom, filed, beat: BEAT_FACTS, textPerRegister }), { beat: BEAT_FACTS }));
console.log("");

const driver = await readFile(join(HERE, "dumbbell-drive.mjs"), "utf8");
const refused = [];
for (const file of readdirSync(DIRECTIONS).filter((f) => f.endsWith(".md"))) {
  const id = file.replace(/\.md$/, "");
  const direction = resolveDirectionFamilies(readDirection(join(DIRECTIONS, file)), textPerRegister);
  const { ink, muted, grid } = deriveFurniture(direction.ground);
  const regs = webRegisters(direction, { ink: { ink, muted, accent: direction.accent } });
  try {
    const { outPath } = await renderScrolly({
      steps: prose.map((p, i) => ({ id: ["depart", "hausse", "covid", "gains", "tri", "lecture"][i], prose: p })),
      reveal: {
        element: createElement(DirectedDumbbellScrolly, {
          rows,
          years,
          orders,
          domain,
          ticks,
          dipFrom: DIP_FROM,
          words,
          alt,
          regs,
          stroke: direction.stroke ?? {},
          ground: direction.ground,
          accent: direction.accent,
          ink,
          muted,
          grid,
        }),
        states: STATES,
        driver,
        apply: "applyDumbbellState",
      },
      title,
      eyebrow: EYEBROW,
      source,
      ground: direction.ground,
      type: { eyebrow: { ...regs.eyebrow, marginBottom: `${gapOf(registerOf(direction, "eyebrow"), EYEBROW_TO_DISPLAY)}px` }, display: regs.display, body: regs.body, source: regs.body },
      lang: "fr",
      outDir: OUT,
      name: `${id}.html`,
    });
    console.log(`${id} -> ${outPath.replace(`${HERE}/`, "")}`);
  } catch (error) {
    await rm(join(OUT, `${id}.html`), { force: true });
    refused.push({ id, why: error.message });
    console.log(`${id} REFUSED — ${error.message}`);
  }
}
if (refused.length) {
  console.log(`\nrefused by ${refused.length}: ${refused.map((x) => x.id).join(", ")}`);
  process.exitCode = 1;
}
