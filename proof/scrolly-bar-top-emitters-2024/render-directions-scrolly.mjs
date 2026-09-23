// The ten largest CO₂ emitters of 2024, rendered once per FILED DIRECTION into a self-contained
// scrolly page. The `bar and column` type in the scrolly format.
//
// THE SUBJECT OF `static-bar-top-emitters-2024`, CHOREOGRAPHED. The ranking, the search behind "the next
// five put together", the French names and the colour rules are the static beat's own; the scroll tells
// them with its own gestures (`scrolly/references/directed-type-choreography.md`):
//
//   1. every country a thin row, largest first — a few long bars, then a long tail;
//   2. the ten keep their rows, every other country laid end to end into one;
//   3. the ten named, from the tenth up to the second;
//   4. China, and what it weighs against the second and the world;
//   5. the headline's arithmetic — the next five laid end to end in the second row, under China's length;
//   6. the static plate, its accounting stated.
//
// Usage:  bun proof/scrolly-bar-top-emitters-2024/render-directions-scrolly.mjs

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
import { DirectedBarScrolly } from "./DirectedBarScrolly.tsx";

const HERE = dirname(fileURLToPath(import.meta.url));
const DIRECTIONS = join(HERE, "..", "..", "docs", "design-base", "directions");
const OUT = join(HERE, "renders");
const YEAR = 2024;
const TOP_N = 10;
const EYEBROW = "Climat · Monde";
const VALUE = "Annual CO₂ emissions";
/** A country carries a bare ISO-3166 alpha-3 code; OWID's aggregates carry `OWID_` or nothing. */
const ISO3 = /^[A-Z]{3}$/;

// ── the ranking, and the search behind the headline ────────────────────────────────────────────
const [headerLine, ...lines] = (await readFile(join(HERE, "data.csv"), "utf8")).trim().split(/\r?\n/);
const cols = headerLine.split(",");
const records = lines.map((row) => {
  if (row.includes('"')) throw new Error(`quoted field in frozen data, parser is too simple: ${row}`);
  const cells = row.split(",");
  if (cells.length !== cols.length) throw new Error(`row has ${cells.length} cells, header has ${cols.length}: ${row}`);
  return Object.fromEntries(cols.map((c, i) => [c, cells[i]]));
});
const world = records.find((r) => r.Code === "OWID_WRL");
if (!world) throw new Error("no OWID_WRL row in the frozen data — the world share is claimed in a card");
const ranked = records
  .filter((r) => ISO3.test(r.Code))
  .map((r) => ({ country: r.Entity, value: Number(r[VALUE]) / 1e9 }))
  .sort((a, b) => b.value - a.value);
for (const r of ranked) if (!Number.isFinite(r.value)) throw new Error(`${r.country} has a non-numeric value`);
const top = ranked.slice(0, TOP_N);
const subject = top[0];
let combined = 0;
let beatenCount = 0;
for (const row of top.slice(1)) {
  if (combined + row.value > subject.value) break;
  combined += row.value;
  beatenCount += 1;
}
if (beatenCount < 2) throw new Error("the headline comparison needs at least two countries to add together");
const beaten = top.slice(1, beatenCount + 1);
const topShare = top.reduce((s, r) => s + r.value, 0) / (Number(world[VALUE]) / 1e9);
const lastPlace = top[TOP_N - 1];
const ratioToSecond = subject.value / top[1].value;
const others = ranked.slice(TOP_N);
const othersSum = others.reduce((s, r) => s + r.value, 0);
const subjectShare = subject.value / (Number(world[VALUE]) / 1e9);
if (subject.country !== "China") throw new Error(`the cards agree "seule" with China; the first is ${subject.country}`);
if (beatenCount !== 5) throw new Error(`card 5 lays five countries against China; the search finds ${beatenCount}`);
if (!(othersSum < subject.value)) throw new Error(`card 2 says the ${others.length} others together weigh less than China; they weigh ${othersSum.toFixed(2)}`);

/** The plate is in French and so are its columns; a country the ranking reaches that has no French
 *  name here THROWS, because the ranking is a search and the copy has to follow the data. */
const FRENCH = {
  China: { name: "Chine", withArticle: "la Chine" },
  "United States": { name: "États-Unis", withArticle: "les États-Unis" },
  India: { name: "Inde", withArticle: "l’Inde" },
  Russia: { name: "Russie", withArticle: "la Russie" },
  Japan: { name: "Japon", withArticle: "le Japon" },
  Indonesia: { name: "Indonésie", withArticle: "l’Indonésie" },
  Iran: { name: "Iran", withArticle: "l’Iran" },
  "Saudi Arabia": { name: "Arabie saoudite", withArticle: "l’Arabie saoudite" },
  "South Korea": { name: "Corée du Sud", withArticle: "la Corée du Sud" },
  Germany: { name: "Allemagne", withArticle: "l’Allemagne" },
};
const entryFor = (country) => {
  if (!FRENCH[country]) throw new Error(`${country} reached the top ten and this plate has no French name for it`);
  return FRENCH[country];
};
const french = (c) => entryFor(c).name;
const named = (c) => entryFor(c).withArticle;
const capital = (s) => s.charAt(0).toUpperCase() + s.slice(1);
const SPELLED = ["zéro", "un", "deux", "trois", "quatre", "cinq", "six", "sept", "huit", "neuf", "dix"];
const fr = (v, digits) => plainSpaces(v.toLocaleString("fr-FR", { minimumFractionDigits: digits, maximumFractionDigits: digits }));
/** One decimal above 1 bn t, two below — at one decimal ranks 9 and 10 would both print `0,6`. */
const format = (v) => (v >= 1 ? v.toFixed(1) : v.toFixed(2)).replace(".", ",");

// ── the words: one reading per card ────────────────────────────────────────────────────────────
const NB = "\u00A0";
const title = [
  `${capital(named(subject.country))} a émis plus de CO₂ en ${YEAR} que les ${SPELLED[beatenCount]} pays suivants réunis`,
  `${capital(named(subject.country))} a émis plus que les ${SPELLED[beatenCount]} pays suivants réunis`,
  `${capital(named(subject.country))}, plus que les ${SPELLED[beatenCount]} suivants`,
];
if (!(topShare > 0 && topShare < 1)) throw new Error(`the ten's share of the world total is ${topShare}, not a share`);
const percent = (v) => `${(v * 100).toFixed(0)}${NB}%`;
const prose = [
  [`Le CO₂ émis en ${YEAR} par chacun des ${ranked.length}${NB}pays, du plus gros au plus petit, en milliards de tonnes : quelques longues barres, puis une longue traîne.`],
  [`Les ${SPELLED[TOP_N]} plus gros gardent leur barre. Les ${others.length} autres, mis bout à bout, font ${format(othersSum)} : moins que ${named(subject.country)} seule. Les ${SPELLED[TOP_N]} pèsent ${percent(topShare)} des émissions mondiales.`],
  [`Du dixième, ${named(lastPlace.country)} (${format(lastPlace.value)}), au deuxième, ${named(top[1].country)} (${format(top[1].value)}).`],
  [`Puis ${named(subject.country)} : ${format(subject.value)}, ${fr(ratioToSecond, 1)}${NB}fois ${named(top[1].country)}. À elle seule, ${percent(subjectShare)} du total mondial.`],
  [`Les ${SPELLED[beatenCount]} suivants mis bout à bout : ${format(combined)}, moins que ${named(subject.country)} seule.`],
  [`Lecture : CO₂ territorial, combustibles fossiles et industrie. Les émissions contenues dans les biens importés sont comptées là où les biens sont produits.`],
];
const source = `Source : Global Carbon Budget 2025, via Our World in Data · données ${YEAR}, extraites le 9 août 2026`;
const topRows = top.map((r) => ({ key: r.country, name: french(r.country), value: r.value, label: format(r.value) }));
const restName = `${others.length}${NB}autres pays`;
const stackName = `${SPELLED[beatenCount]} suivants`;
const words = {
  unit: `milliards de tonnes de CO₂, ${YEAR}`,
  tailNote: `${ranked.length}${NB}pays`,
  restNote: `les ${SPELLED[TOP_N]}${NB}: ${percent(topShare)} du monde`,
  rankNote: `du 10e au 2e`,
  subjectNote: `${french(subject.country)}${NB}: ${percent(subjectShare)} du monde`,
  stackNote: `${format(combined)} contre ${format(subject.value)}`,
  readNote: `les ${SPELLED[TOP_N]} premiers en ${YEAR}`,
};
const alt =
  `Barres classant les ${SPELLED[TOP_N]} pays qui ont le plus émis de CO₂ en ${YEAR}, et les ${others.length} autres réunis. ` +
  `${capital(named(subject.country))} est très au-dessus avec ${format(subject.value)} milliards de tonnes, ` +
  `${fr(ratioToSecond, 1)} fois les ${format(top[1].value)} de ${named(top[1].country)}, et davantage que ` +
  `${beaten.map((r) => french(r.country)).join(", ")} réunis (${format(combined)}).`;

/** One state per card; see `bar-drive.mjs` for what each field paints. */
const STATES = [
  { spread: 0, rest: 0, rank: 0, subject: 0, stack: 0, note: 0 },
  { spread: 1, rest: 1, rank: 0, subject: 0, stack: 0, note: 1 },
  { spread: 1, rest: 1, rank: 1, subject: 0, stack: 0, note: 2 },
  { spread: 1, rest: 1, rank: 1, subject: 1, stack: 0, note: 3 },
  { spread: 1, rest: 1, rank: 1, subject: 1, stack: 1, note: 4 },
  { spread: 1, rest: 1, rank: 1, subject: 1, stack: 0, note: 5 },
];

const textPerRegister = {
  display: title.join(" "),
  eyebrow: EYEBROW,
  body: `${prose.flat().join(" ")} ${source}`,
  axis: words.unit,
  annot: `${topRows.map((r) => r.name).join(" ")} ${restName} ${stackName}`,
  value: `${topRows.map((r) => r.label).join(" ")} ${format(othersSum)} ${format(combined)} ${Object.entries(words).filter(([k]) => k.endsWith("Note")).map(([, v]) => v).join(" ")}`,
};

const filed = readdirSync(DIRECTIONS)
  .filter((f) => f.endsWith(".md"))
  .map((f) => readDirection(join(DIRECTIONS, f)));
const newsroom = readPalette(HERE);
const BEAT_FACTS = { evidenceLevels: 2 };
console.log(report(composeDirections({ newsroom, filed, beat: BEAT_FACTS, textPerRegister }), { beat: BEAT_FACTS }));
console.log("");

const driver = await readFile(join(HERE, "bar-drive.mjs"), "utf8");
const refused = [];
for (const file of readdirSync(DIRECTIONS).filter((f) => f.endsWith(".md"))) {
  const id = file.replace(/\.md$/, "");
  const direction = resolveDirectionFamilies(readDirection(join(DIRECTIONS, file)), textPerRegister);
  const { ink, muted } = deriveFurniture(direction.ground);
  const regs = webRegisters(direction, { ink: { ink, muted, accent: direction.accent } });
  try {
    const { outPath } = await renderScrolly({
      steps: prose.map((p, i) => ({ id: ["traine", "dix", "classement", "chine", "pile", "lecture"][i], prose: p })),
      reveal: {
        element: createElement(DirectedBarScrolly, {
          top: topRows,
          tail: others.map((r) => r.value),
          stackCount: beatenCount,
          restName,
          restLabel: format(othersSum),
          stackName,
          stackLabel: format(combined),
          words,
          alt,
          regs,
          ground: direction.ground,
          accent: direction.accent,
          ink,
          muted,
        }),
        states: STATES,
        driver,
        apply: "applyBarState",
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
