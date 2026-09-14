// The world's ten largest CO₂ emitters, ranked every year from 1990 to 2024, rendered once per FILED DIRECTION into a
// self-contained scrolly page. The `bump` type in the scrolly format.
//
// THE SUBJECT OF `static-bump-emitter-rank`, CHOREOGRAPHED. The ranking, the claim and its assertions are the static
// beat's own; the scroll tells them with its own gestures (`scrolly/references/directed-type-choreography.md`):
//
//   1. the 1990 top ten alone: India eighth;
//   2. the playhead to 1999: India passes the United Kingdom, Ukraine and Germany;
//   3. to 2009: Japan and Russia — India third; China passes the United States, unmarked;
//   4. to 2024: India holds third, every other line stepping back;
//   5. the two countries India passed that have since left the top ten;
//   6. the static plate.
//
// Usage:  bun proof/scrolly-bump-emitter-rank/render-directions-scrolly.mjs

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
import { webRegisters } from "#shared/design-base/web.mjs";
import { EYEBROW_TO_DISPLAY, gapOf, registerOf } from "#shared/design-base/register.mjs";
import { renderScrolly } from "../../skills/scrolly/scripts/render-scrolly.mjs";
import { DirectedBumpScrolly } from "./DirectedBumpScrolly.tsx";

const HERE = dirname(fileURLToPath(import.meta.url));
const DIRECTIONS = join(HERE, "..", "..", "docs", "design-base", "directions");
const OUT = join(HERE, "renders");
const EYEBROW = "Climat · Monde";
const NB = "\u00A0";
const SLOTS = 10;
const FIRST = 1990;
const LAST = 2024;
const SUBJECT = "India";
/** The cards' two stops along the way: after the first three passes, after the last two. */
const STOPS = [1999, 2009];
const FRENCH = {
  "United States": ["États-Unis", "les États-Unis"], Russia: ["Russie", "la Russie"], China: ["Chine", "la Chine"], Japan: ["Japon", "le Japon"], Germany: ["Allemagne", "l’Allemagne"],
  Ukraine: ["Ukraine", "l’Ukraine"], "United Kingdom": ["Royaume-Uni", "le Royaume-Uni"], India: ["Inde", "l’Inde"], Canada: ["Canada", "le Canada"], Italy: ["Italie", "l’Italie"],
  Kuwait: ["Koweït", "le Koweït"], "South Korea": ["Corée du Sud", "la Corée du Sud"], France: ["France", "la France"], Iran: ["Iran", "l’Iran"],
  "Saudi Arabia": ["Arabie saoudite", "l’Arabie saoudite"], Indonesia: ["Indonésie", "l’Indonésie"],
};
const ORDINAL = (n) => (n === 1 ? "1er" : `${n}e`);

// ── the ranking, and the static beat's own assertions ──────────────────────────────────────────
const rows = (await readFile(join(HERE, "data.csv"), "utf8"))
  .trim()
  .split(/\r?\n/)
  .slice(1)
  .map((l) => l.split(","))
  .map((c) => ({ entity: c[0], code: c[1], year: Number(c[2]), value: Number(c[3]) }))
  .filter((r) => /^[A-Z]{3}$/.test(r.code) && Number.isFinite(r.value) && r.year >= FIRST && r.year <= LAST);
const years = [...new Set(rows.map((r) => r.year))].sort((a, b) => a - b);
if (years.length !== LAST - FIRST + 1) throw new Error(`expected every year ${FIRST}–${LAST}, got ${years.length}`);
const valueOf = new Map(rows.map((r) => [`${r.entity}|${r.year}`, r.value]));
const top = new Map(years.map((y) => [y, rows.filter((r) => r.year === y).sort((a, b) => b.value - a.value).slice(0, SLOTS).map((r) => r.entity)]));
const rankOf = (entity, year) => top.get(year).indexOf(entity) + 1;
const everIn = [...new Set(years.flatMap((y) => top.get(y)))];
for (const e of everIn) if (!FRENCH[e]) throw new Error(`no French name recorded for ${e}`);
if (!years.every((y) => top.get(y).includes(SUBJECT))) throw new Error(`${SUBJECT} is not in the top ${SLOTS} every year`);
const from = rankOf(SUBJECT, FIRST);
const to = rankOf(SUBJECT, LAST);
if (!(from === 8 && to === 3)) throw new Error(`the headline says ${SUBJECT} went from 8th to 3rd; ${from} to ${to}`);
/** THE PASSES, derived from the values: a country above the subject in the top ten one year, below it the next. */
const passes = [];
for (let i = 1; i < years.length; i++) {
  const [y0, y1] = [years[i - 1], years[i]];
  for (const other of top.get(y0).slice(0, rankOf(SUBJECT, y0) - 1)) {
    const v0 = valueOf.get(`${other}|${y1}`);
    if (v0 !== undefined && v0 < valueOf.get(`${SUBJECT}|${y1}`)) passes.push({ other, year: y1, from: rankOf(SUBJECT, y0), to: rankOf(SUBJECT, y1) });
  }
}
const expected = "United Kingdom 1991, Ukraine 1992, Germany 1999, Japan 2006, Russia 2009";
if (passes.map((p) => `${p.other} ${p.year}`).join(", ") !== expected) throw new Error(`the cards name ${expected}; the data says ${passes.map((p) => `${p.other} ${p.year}`).join(", ")}`);
if (rankOf(SUBJECT, STOPS[1]) !== to || !years.filter((y) => y >= STOPS[1]).every((y) => rankOf(SUBJECT, y) === to)) throw new Error(`card 4 says ${SUBJECT} has held rank ${to} since ${STOPS[1]}`);
const lastYearIn = (e) => Math.max(...years.filter((y) => top.get(y).includes(e)));
const departed = passes.filter((p) => lastYearIn(p.other) < LAST).map((p) => p.other);
if (departed.join() !== "United Kingdom,Ukraine") throw new Error(`card 5 names the United Kingdom and Ukraine as the passed countries that left; ${departed.join(", ")}`);
const chinaFirst = years.find((y) => top.get(y)[0] === "China");
console.log(`${everIn.length} pays · ${SUBJECT} ${from}e → ${to}e · ${passes.map((p) => `${p.other} ${p.year}`).join(", ")} · sortis ${departed.map((e) => `${e} ${lastYearIn(e)}`).join(", ")} · Chine 1re en ${chinaFirst}\n`);

const tracks = everIn.map((e) => ({
  key: e,
  label: FRENCH[e][0],
  points: years.filter((y) => top.get(y).includes(e)).map((y) => [y, rankOf(e, y)]),
  subject: e === SUBJECT,
  left: departed.includes(e),
  exitText: departed.includes(e) ? `sort du top ${SLOTS} après ${lastYearIn(e)}` : "",
}));
const crossings = passes.map((p) => ({ year: p.year, from: p.from, to: p.to, text: `dépasse ${FRENCH[p.other][1]} · ${p.year}` }));
const listOf = (xs) => (xs.length === 1 ? xs[0] : `${xs.slice(0, -1).join(", ")} et ${xs[xs.length - 1]}`);
const passesUntil = (a, b) => passes.filter((p) => p.year > a && p.year <= b);

// ── the words ──────────────────────────────────────────────────────────────────────────────────
const title = [`L’Inde est passée du ${ORDINAL(from)} au ${ORDINAL(to)} rang mondial des émetteurs de CO2`, `L’Inde, du ${ORDINAL(from)} au ${ORDINAL(to)} rang des émetteurs de CO2`, `Les plus gros émetteurs de CO2, rang par rang`];
const prose = [
  [`Les dix pays qui émettaient le plus de CO2 en ${FIRST}, du premier en haut au dixième en bas. Les États-Unis mènent ; l’Inde est ${ORDINAL(from)}.`],
  [`Avançons dans le temps. D’ici ${STOPS[0]}, l’Inde dépasse ${listOf(passesUntil(FIRST, STOPS[0]).map((p) => `${FRENCH[p.other][1]} (${p.year})`))}.`],
  [`Puis ${listOf(passesUntil(STOPS[0], STOPS[1]).map((p) => `${FRENCH[p.other][1]} (${p.year})`))} : l’Inde est ${ORDINAL(to)} en ${STOPS[1]}. En ${chinaFirst}, la Chine a pris la première place aux États-Unis.`],
  [`Jusqu’en ${LAST}, l’Inde tient cette ${ORDINAL(to)} place.`],
  [`Deux des pays dépassés ont depuis quitté le top ${SLOTS} : ${listOf(departed.map((e) => `${FRENCH[e][1]} après ${lastYearIn(e)}`))}. Leur ligne s’arrête là où ils sont sortis.`],
  [`Lecture : la hauteur d’une ligne est son rang, pas ses émissions ; rien ici ne dit de combien. Émissions de combustibles fossiles et de l’industrie.`],
];
const source = "Source : Global Carbon Budget (2025), via Our World in Data · combustibles fossiles et industrie uniquement";
const words = {
  unit: "rang mondial, émissions annuelles de CO2",
  startNote: `${FIRST}${NB}: Inde ${ORDINAL(from)}`,
  firstNote: `${passesUntil(FIRST, STOPS[0]).length} pays dépassés`,
  secondNote: `${STOPS[1]}${NB}: Inde ${ORDINAL(to)}`,
  holdNote: `Inde ${ORDINAL(to)} depuis ${STOPS[1]}`,
  exitNote: `${departed.length} sortis du top ${SLOTS}`,
  readNote: "le rang, pas la quantité",
};
const alt =
  `Graphique de rangs : le rang mondial de ${everIn.length} pays par émissions annuelles de CO2 entre ${FIRST} et ${LAST}. ` +
  `L’Inde passe du ${ORDINAL(from)} au ${ORDINAL(to)} rang en dépassant ${listOf(passes.map((p) => FRENCH[p.other][1]))} ; la Chine prend la première place aux États-Unis en ${chinaFirst}.`;

/** One state per card; see `bump-drive.mjs` for what each field paints. */
const STATES = [
  { year: FIRST, rings: 1, retreat: 0, exit: 0, note: 0 },
  { year: STOPS[0], rings: 1, retreat: 0, exit: 0, note: 1 },
  { year: STOPS[1], rings: 1, retreat: 0, exit: 0, note: 2 },
  { year: LAST, rings: 1, retreat: 1, exit: 0, note: 3 },
  { year: LAST, rings: 0, retreat: 1, exit: 1, note: 4 },
  { year: LAST, rings: 1, retreat: 0, exit: 0, note: 5 },
];
const xTicks = [1990, 2000, 2010, 2024];

const textPerRegister = {
  display: title.join(" "),
  eyebrow: EYEBROW,
  body: `${prose.flat().join(" ")} ${source}`,
  axis: `${words.unit} ${xTicks.join(" ")} 1 2 3 4 5 6 7 8 9 10 ${tracks.map((t) => t.exitText).join(" ")} ${crossings.map((x) => x.text).join(" ")}`,
  annot: tracks.map((t) => t.label).join(" "),
  value: Object.entries(words).filter(([k]) => k.endsWith("Note")).map(([, v]) => v).join(" "),
};

const filed = readdirSync(DIRECTIONS)
  .filter((f) => f.endsWith(".md"))
  .map((f) => readDirection(join(DIRECTIONS, f)));
const newsroom = readPalette(HERE, { stopAt: join(HERE, "..") });
const BEAT_FACTS = { evidenceLevels: 3 };
console.log(report(composeDirections({ newsroom, filed, beat: BEAT_FACTS, textPerRegister }), { beat: BEAT_FACTS }));
console.log("");

const driver = await readFile(join(HERE, "bump-drive.mjs"), "utf8");
const refused = [];
for (const file of readdirSync(DIRECTIONS).filter((f) => f.endsWith(".md"))) {
  const id = file.replace(/\.md$/, "");
  const direction = resolveDirectionFamilies(readDirection(join(DIRECTIONS, file)), textPerRegister);
  const { ink, muted, grid } = deriveFurniture(direction.ground);
  const regs = webRegisters(direction, { ink: { ink, muted, accent: direction.accent } });
  try {
    const { outPath } = await renderScrolly({
      steps: prose.map((p, i) => ({ id: [`classement-${FIRST}`, `jusqu-${STOPS[0]}`, `jusqu-${STOPS[1]}`, `jusqu-${LAST}`, "sortis", "lecture"][i], prose: p })),
      reveal: {
        element: createElement(DirectedBumpScrolly, { tracks, crossings, years, slots: SLOTS, xTicks, words, alt, regs, stroke: direction.stroke ?? {}, ground: direction.ground, accent: direction.accent, ink, muted, grid }),
        states: STATES,
        driver,
        apply: "applyBumpState",
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
