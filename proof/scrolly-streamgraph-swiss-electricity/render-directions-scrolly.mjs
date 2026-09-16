// Switzerland's electricity by source, 2000–2024, rendered once per FILED DIRECTION into a self-contained scrolly page.
// The `streamgraph` type in the scrolly format.
//
// THE SUBJECT OF `static-streamgraph-swiss-electricity`, CHOREOGRAPHED. The layers and their inside-out order, the
// readings, the claim and its assertions are the static beat's own; the scroll tells them with its own gestures
// (`scrolly/references/directed-type-choreography.md`):
//
//   1. the stream drawn from 2000 to 2024: hydropower and nuclear dominate;
//   2. every layer named, the totals written;
//   3. the two giants withdrawn: the thin layers fill the frame;
//   4. solar passes oil in 2016, marked;
//   5. 2024: solar several times oil;
//   6. the whole stream again: the static plate.
//
// Usage:  bun proof/scrolly-streamgraph-swiss-electricity/render-directions-scrolly.mjs

import { readdirSync } from "node:fs";
import { readFile, rm } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createElement } from "react";
import { stack, stackOrderInsideOut } from "d3-shape";
import { deriveFurniture } from "#shared/chart-beat/render-still.mjs";
import { readPalette } from "#shared/chart-beat/colour.mjs";
import { readDirection } from "#shared/design-base/read-direction.mjs";
import { composeDirections, report } from "#shared/design-base/compose.mjs";
import { resolveDirectionFamilies } from "#shared/design-base/resolve-families.mjs";
import { plainSpaces, webRegisters } from "#shared/design-base/web.mjs";
import { EYEBROW_TO_DISPLAY, gapOf, registerOf } from "#shared/design-base/register.mjs";
import { renderScrolly } from "../../skills/scrolly/scripts/render-scrolly.mjs";
import { DirectedStreamScrolly } from "./DirectedStreamScrolly.tsx";

const HERE = dirname(fileURLToPath(import.meta.url));
const DIRECTIONS = join(HERE, "..", "..", "docs", "design-base", "directions");
const OUT = join(HERE, "renders");
const EYEBROW = "Énergie · Suisse";
const NB = "\u00A0";
const FIRST = 2000;
/** 2025 is in the file and partial: a partial year drawn on a stream reads as a collapse. */
const LAST = 2024;
const TRACKED = "Solar";
/** Card 1 stops the playhead halfway, so card 2's scroll finishes drawing the stream. */
const HALFWAY = 2012;
const RANK = 3;
const GIANTS = ["Hydropower", "Nuclear"];
const LABELS = { Hydropower: "Hydraulique", Nuclear: "Nucléaire", Solar: "Solaire", Oil: "Pétrole", Gas: "Gaz", Bioenergy: "Bioénergie", "Other renewables": "Autres renouv.", Wind: "Éolien", Coal: "Charbon" };

// ── the readings, and the static beat's own assertions ─────────────────────────────────────────
const csv = (await readFile(join(HERE, "data.csv"), "utf8")).trim().split(/\r?\n/);
const header = csv[0].split(",");
const all = csv.slice(1).map((l) => Object.fromEntries(header.map((h, i) => [h, l.split(",")[i]])));
const entities = new Set(all.map((r) => r.Entity));
if (entities.size !== 1 || !entities.has("Switzerland")) throw new Error(`expected only Switzerland in the frozen data, got ${[...entities].join(", ")}`);
const keys = header.slice(3);
for (const k of keys) if (!LABELS[k]) throw new Error(`${k} has no French name filed in this beat`);
const readings = all
  .filter((r) => Number(r.Year) >= FIRST && Number(r.Year) <= LAST)
  .map((r) => ({ year: Number(r.Year), ...Object.fromEntries(keys.map((k) => [k, Number(r[k])])) }))
  .sort((a, b) => a.year - b.year);
if (readings.length !== LAST - FIRST + 1) throw new Error(`expected every year from ${FIRST} to ${LAST}, got ${readings.length}`);
const rankIn = (reading) => keys.map((k) => ({ k, v: reading[k] })).sort((a, b) => b.v - a.v).findIndex((r) => r.k === TRACKED) + 1;
const reachedAt = readings.find((r) => rankIn(r) <= RANK);
if (!reachedAt) throw new Error(`${TRACKED} never reaches rank ${RANK}`);
if (!readings.filter((r) => r.year >= reachedAt.year).every((r) => rankIn(r) <= RANK)) throw new Error(`the headline says ${TRACKED} has held rank ${RANK} since ${reachedAt.year}; it has not`);
const before = readings.find((r) => r.year === reachedAt.year - 1);
const passedIn = keys.filter((k) => k !== TRACKED && before[k] > before[TRACKED] && reachedAt[k] < reachedAt[TRACKED]);
if (passedIn.length !== 1) throw new Error(`card 4 names the one source ${TRACKED} passed in ${reachedAt.year}; it passed ${passedIn.join(", ") || "none"}`);
const [RIVAL] = passedIn;
if (!(Math.round(reachedAt[TRACKED] * 100) > Math.round(reachedAt[RIVAL] * 100))) throw new Error(`card 4 writes the crossing to two decimals, and at two decimals ${TRACKED} does not lead ${RIVAL} in ${reachedAt.year}`);
if (!readings.every((r) => [...keys].sort((x, y) => r[y] - r[x]).slice(0, 2).sort().join() === [...GIANTS].sort().join())) throw new Error(`the giants withdrawn in card 3 are the two largest sources every year; ${GIANTS.join(" and ")} are not`);
const first = readings[0];
const last = readings[readings.length - 1];
const multiple = last[TRACKED] / last[RIVAL];
if (!(multiple > 4)) throw new Error(`card 5 says ${TRACKED} ends several times ${RIVAL}; it is ${multiple.toFixed(2)} times`);
const drawnKeys = keys.filter((k) => readings.some((r) => r[k] > 0));
console.log(`${drawnKeys.length} couches dessinées (${keys.length - drawnKeys.length} nulles) · ${TRACKED} rang ${RANK} en ${reachedAt.year}, devant ${RIVAL} · 2024 ×${multiple.toFixed(1)}\n`);

const series = stack().keys(drawnKeys).order(stackOrderInsideOut)(readings);
const order = [...series].sort((a, b) => a.index - b.index).map((s) => drawnKeys.indexOf(s.key));
const layers = drawnKeys.map((k) => ({ key: k, label: LABELS[k], values: readings.map((r) => r[k]), giant: GIANTS.includes(k) }));
const years = readings.map((r) => r.year);
const two = (v) => plainSpaces(v.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
const one = (v) => plainSpaces(v.toLocaleString("fr-FR", { minimumFractionDigits: 1, maximumFractionDigits: 1 }));
const format = (v) => (v < 1 ? two(v) : one(v));
const totalOf = (r) => keys.reduce((s, k) => s + r[k], 0);
const [solar, rival] = [LABELS[TRACKED].toLowerCase(), LABELS[RIVAL].toLowerCase()];

// ── the words ──────────────────────────────────────────────────────────────────────────────────
const title = [
  `En ${reachedAt.year}, le solaire est devenu la troisième source d’électricité suisse`,
  `Le solaire, troisième source d’électricité suisse depuis ${reachedAt.year}`,
  `L’électricité suisse, source par source`,
];
const prose = [
  [`La production électrique de la Suisse, source par source, de ${FIRST} à ${LAST}. L’épaisseur d’une bande est sa production.`],
  [`L’hydraulique et le nucléaire font l’essentiel : ${format(last.Hydropower)} et ${format(last.Nuclear)}${NB}TWh en ${LAST}, sur ${format(totalOf(last))}.`],
  [`Retirons ces deux géants. Les petites sources remplissent le cadre.`],
  [`En ${reachedAt.year}, le ${solar} dépasse le ${rival} : ${two(reachedAt[TRACKED])} contre ${two(reachedAt[RIVAL])}${NB}TWh. Il devient la troisième source du pays et le reste depuis.`],
  [`En ${LAST}, le ${solar} produit ${format(last[TRACKED])}${NB}TWh, ${one(multiple)} fois le ${rival}. Il en produisait ${format(first[TRACKED])} en ${FIRST}.`],
  [`Lecture : l’épaisseur d’une bande est sa production ; sa position ne veut rien dire, les plus grandes au centre. Il n’y a donc pas d’axe vertical : les quantités sont écrites. ${LAST + 1} est exclue, année incomplète.`],
];
const source = `Source : Ember, Energy Institute – Statistical Review of World Energy (2025), via Our World in Data · ${LAST + 1} exclue, année incomplète`;
const words = {
  unit: "production électrique suisse, en TWh",
  drawNote: "{year}",
  totalNote: `total${NB}: de ${format(totalOf(first))} à ${format(totalOf(last))}${NB}TWh`,
  smallNote: "sans hydraulique ni nucléaire",
  crossNote: `${LABELS[TRACKED]}, 3e source en ${reachedAt.year}`,
  endNote: `${LABELS[TRACKED]}${NB}: ${one(multiple)} fois le ${rival}`,
  readNote: "pas d’axe vertical : les quantités sont écrites",
};
const marks = [
  { year: reachedAt.year, text: `${reachedAt.year}${NB}: ${solar} ${two(reachedAt[TRACKED])} · ${rival} ${two(reachedAt[RIVAL])}` },
  { year: LAST, text: `${LAST}${NB}: ${solar} ${format(last[TRACKED])} · ${rival} ${format(last[RIVAL])}` },
];
const alt =
  `Graphique en flux : la production électrique suisse par source, de ${FIRST} à ${LAST}, chaque bande épaisse comme sa production. ` +
  `L’hydraulique et le nucléaire dominent ; le solaire passe de ${format(first[TRACKED])} à ${format(last[TRACKED])} TWh et dépasse le pétrole en ${reachedAt.year}.`;

/** One state per card; see `stream-drive.mjs` for what each field paints. */
const STATES = [
  { year: HALFWAY, retreat: 0, cross: 0, end: 0, note: 0 },
  { year: LAST, retreat: 0, cross: 0, end: 0, note: 1 },
  { year: LAST, retreat: 1, cross: 0, end: 0, note: 2 },
  { year: LAST, retreat: 1, cross: 1, end: 0, note: 3 },
  { year: LAST, retreat: 1, cross: 0, end: 1, note: 4 },
  { year: LAST, retreat: 0, cross: 0, end: 0, note: 5 },
];

const textPerRegister = {
  display: title.join(" "),
  eyebrow: EYEBROW,
  body: `${prose.flat().join(" ")} ${source}`,
  axis: `${words.unit} ${[2000, 2005, 2010, 2015, 2020, 2024].join(" ")}`,
  annot: layers.map((l) => l.label).join(" "),
  value: `${Object.entries(words).filter(([k]) => k.endsWith("Note")).map(([, v]) => v).join(" ")} ${marks.map((m) => m.text).join(" ")} 0123456789`,
};

const filed = readdirSync(DIRECTIONS)
  .filter((f) => f.endsWith(".md"))
  .map((f) => readDirection(join(DIRECTIONS, f)));
const newsroom = readPalette(HERE, { stopAt: join(HERE, "..") });
const BEAT_FACTS = { evidenceLevels: 3 };
console.log(report(composeDirections({ newsroom, filed, beat: BEAT_FACTS, textPerRegister }), { beat: BEAT_FACTS }));
console.log("");

const driver = await readFile(join(HERE, "stream-drive.mjs"), "utf8");
const refused = [];
for (const file of readdirSync(DIRECTIONS).filter((f) => f.endsWith(".md"))) {
  const id = file.replace(/\.md$/, "");
  const direction = resolveDirectionFamilies(readDirection(join(DIRECTIONS, file)), textPerRegister);
  const { ink, muted, grid } = deriveFurniture(direction.ground);
  const regs = webRegisters(direction, { ink: { ink, muted, accent: direction.accent } });
  try {
    const { outPath } = await renderScrolly({
      steps: prose.map((p, i) => ({ id: ["flux", "geants", "sans-geants", `annee-${reachedAt.year}`, `annee-${LAST}`, "lecture"][i], prose: p })),
      reveal: {
        element: createElement(DirectedStreamScrolly, { layers, order, years, tracked: TRACKED, rival: RIVAL, marks, xTicks: [2000, 2005, 2010, 2015, 2020, 2024], words, alt, regs, ground: direction.ground, accent: direction.accent, ink, muted, grid }),
        states: STATES,
        driver,
        apply: "applyStreamState",
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
