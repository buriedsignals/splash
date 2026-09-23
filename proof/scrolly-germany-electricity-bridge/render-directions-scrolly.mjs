// Germany's electricity generation, 2015 to 2024, rendered once per FILED DIRECTION into a self-contained scrolly
// page. The `waterfall` type in the scrolly format.
//
// THE SUBJECT OF `static-germany-electricity-bridge`, CHOREOGRAPHED. The groups, the steps and the replayed bridge
// are the static beat's own; the scroll tells them with its own gestures
// (`scrolly/references/directed-type-choreography.md`):
//
//   1. the 2015 total;
//   2. the renewables step, climbing;
//   3. the nuclear step, dropping almost as far;
//   4. the fossil step, unfolded into coal, gas and oil;
//   5. the 2024 total and the net change between the two;
//   6. the whole bridge, every value on its bar.
//
// Usage:  bun proof/scrolly-germany-electricity-bridge/render-directions-scrolly.mjs

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
import { DirectedBridgeScrolly } from "./DirectedBridgeScrolly.tsx";

const HERE = dirname(fileURLToPath(import.meta.url));
const DIRECTIONS = join(HERE, "..", "..", "docs", "design-base", "directions");
const OUT = join(HERE, "renders");
const EYEBROW = "Énergie · Allemagne";
const NB = " ";
const FIRST = 2015;
const LAST = 2024;
const RENEWABLE = ["Other renewables", "Bioenergy", "Solar", "Wind", "Hydropower"];
/** Ordered as the fossil step unfolds: the largest change first. */
const FOSSIL = [
  { column: "Coal", label: "charbon", short: "charb." },
  { column: "Gas", label: "gaz", short: "gaz" },
  { column: "Oil", label: "pétrole", short: "pétr." },
];

// ── the bridge, replayed before it is drawn — the static beat's rule ───────────────────────────
const [headerLine, ...lines] = (await readFile(join(HERE, "data.csv"), "utf8")).trim().split(/\r?\n/);
const cols = headerLine.split(",");
const rows = lines.map((l) => Object.fromEntries(cols.map((c, i) => [c, l.split(",")[i]])));
const at = (year) => {
  const row = rows.find((r) => Number(r.Year) === year);
  if (!row) throw new Error(`the bridge reads ${year} and the file has no row for it`);
  return row;
};
const sum = (row, keys) => keys.reduce((t, k) => t + Number(row[k] ?? 0), 0);
const first = at(FIRST);
const last = at(LAST);
const ALL = [...RENEWABLE, ...FOSSIL.map((f) => f.column), "Nuclear"];
const opening = sum(first, ALL);
const closing = sum(last, ALL);
const ren = sum(last, RENEWABLE) - sum(first, RENEWABLE);
const nuc = Number(last.Nuclear) - Number(first.Nuclear);
const fuels = FOSSIL.map((f) => ({ ...f, change: Number(last[f.column]) - Number(first[f.column]) }));
const fos = fuels.reduce((s, f) => s + f.change, 0);
if (Math.abs(opening + ren + nuc + fos - closing) > 0.05) throw new Error(`the bridge does not reconcile: ${opening + ren + nuc + fos} walked against ${closing}`);
if (!(ren > 0 && nuc < 0 && fos < 0)) throw new Error("the cards say renewables rose while nuclear and fossil fell");
if (!(Math.abs(ren + nuc) < 0.2 * ren)) throw new Error(`the third card says nuclear cancels almost all of the renewables step; together they move ${(ren + nuc).toFixed(1)}`);
const coal = fuels[0];
if (!(coal.change < closing - opening)) throw new Error(`the fourth card says coal alone fell by more than the whole bridge; coal ${coal.change.toFixed(1)}, bridge ${(closing - opening).toFixed(1)}`);
const wind = Number(last.Wind) - Number(first.Wind);
const solar = Number(last.Solar) - Number(first.Solar);
if (!(wind > solar && wind + solar > 0.9 * ren)) throw new Error("the second card says wind and solar make the renewables step");

const one = (v) => plainSpaces(Math.abs(v).toLocaleString("fr-FR", { minimumFractionDigits: 1, maximumFractionDigits: 1 }));
const signed = (v) => `${v >= 0 ? "+" : "−"}${one(v)}`;
const twh = (v) => `${one(v)}${NB}TWh`;

let level = opening;
const bars = [{ id: "opening", kind: "total", from: 0, to: opening, value: one(opening), label: String(FIRST), short: String(FIRST) }];
for (const [id, change, label, short] of [["ren", ren, "renouvelables", "renouv."], ["nuc", nuc, "nucléaire", "nucl."], ["fos", fos, "fossile", "fossile"]]) {
  bars.push({ id, kind: "step", from: level, to: level + change, value: signed(change), label, short });
  if (id !== "fos") level += change;
}
let subLevel = level;
for (const f of fuels) {
  bars.push({ id: f.column.toLowerCase(), kind: "sub", from: subLevel, to: subLevel + f.change, value: signed(f.change), label: f.label, short: f.short });
  subLevel += f.change;
}
bars.push({ id: "closing", kind: "total", from: 0, to: closing, value: one(closing), label: String(LAST), short: String(LAST) });
console.log(`bridge ${opening.toFixed(1)} ${signed(ren)} ${signed(nuc)} ${signed(fos)} = ${closing.toFixed(1)} · coal ${coal.change.toFixed(1)}\n`);

// ── the words ──────────────────────────────────────────────────────────────────────────────────
const title = [
  `L’Allemagne a produit ${Math.round(opening - closing)}${NB}TWh d’électricité de moins en ${LAST} qu’en ${FIRST}`,
  `${Math.round(opening - closing)}${NB}TWh d’électricité de moins en Allemagne`,
  `L’électricité allemande, ${FIRST}–${LAST}`,
];
const prose = [
  [`En ${FIRST}, l’Allemagne produit ${twh(opening)} d’électricité.`],
  [`Les renouvelables en ajoutent ${twh(ren)} : l’éolien ${signed(wind)}, le solaire ${signed(solar)}.`],
  [`La sortie du nucléaire en retire ${twh(nuc)}. À eux deux, les deux mouvements ne font que ${signed(ren + nuc)}${NB}TWh.`],
  [`Le fossile recule de ${twh(fos)}. Et presque tout vient du charbon : ${signed(coal.change)}${NB}TWh, plus que la baisse totale ; le gaz, lui, monte de ${one(fuels[1].change)}.`],
  [`En ${LAST}, la production tombe à ${twh(closing)} : ${twh(opening - closing)} de moins qu’en ${FIRST}.`],
  [`Lecture : chaque marche part du total atteint par la précédente. Les deux barres pleines partent de zéro ; ce qui les sépare est la somme des marches.`],
];
const source = "Source : Ember, Energy Institute — Statistical Review of World Energy (2025), via Our World in Data";
const words = {
  unit: `production d’électricité, en TWh`,
  running: `total${NB}: {v}${NB}TWh`,
  renNote: `éolien ${signed(wind)} · solaire ${signed(solar)}`,
  nucNote: `renouvelables + nucléaire${NB}: ${signed(ren + nuc)}${NB}TWh`,
  fosNote: `charbon ${signed(coal.change)}${NB}TWh`,
  netNote: `de ${FIRST} à ${LAST}${NB}: ${signed(closing - opening)}${NB}TWh`,
  net: `${signed(closing - opening)}${NB}TWh`,
};
const max = Math.ceil(Math.max(...bars.map((b) => Math.max(b.from, b.to))) / 200) * 200;
const ticks = [];
for (let t = 0; t <= max; t += 200) ticks.push(t);
const alt =
  `Diagramme en cascade de la production électrique allemande, ${FIRST} à ${LAST}, en TWh : ${one(opening)} en ${FIRST}, ${signed(ren)} de renouvelables, ` +
  `${signed(nuc)} de nucléaire, ${signed(fos)} de fossile dont ${signed(coal.change)} de charbon, ${one(closing)} en ${LAST}.`;

/** One state per card; see `bridge-drive.mjs` for what each field paints. */
const STATES = [
  { opening: 1, ren: 0, nuc: 0, fos: 0, unfold: 0, closing: 0, net: 0, focus: 0 },
  { opening: 1, ren: 1, nuc: 0, fos: 0, unfold: 0, closing: 0, net: 0, focus: 0 },
  { opening: 1, ren: 1, nuc: 1, fos: 0, unfold: 0, closing: 0, net: 0, focus: 0 },
  { opening: 1, ren: 1, nuc: 1, fos: 1, unfold: 1, closing: 0, net: 0, focus: 0 },
  { opening: 1, ren: 1, nuc: 1, fos: 1, unfold: 0, closing: 1, net: 1, focus: 1 },
  { opening: 1, ren: 1, nuc: 1, fos: 1, unfold: 0, closing: 1, net: 1, focus: 0 },
];

const textPerRegister = {
  display: title.join(" "),
  eyebrow: EYEBROW,
  body: `${prose.flat().join(" ")} ${source}`,
  axis: `${words.unit} ${bars.map((b) => `${b.label} ${b.short}`).join(" ")} ${ticks.join(" ")}`,
  annot: "",
  value: `${bars.map((b) => b.value).join(" ")} ${words.running} ${words.renNote} ${words.nucNote} ${words.fosNote} ${words.netNote} 0123456789,`,
};

const filed = readdirSync(DIRECTIONS)
  .filter((f) => f.endsWith(".md"))
  .map((f) => readDirection(join(DIRECTIONS, f)));
const newsroom = readPalette(HERE);
const BEAT_FACTS = { evidenceLevels: 3 };
console.log(report(composeDirections({ newsroom, filed, beat: BEAT_FACTS, textPerRegister }), { beat: BEAT_FACTS }));
console.log("");

const driver = await readFile(join(HERE, "bridge-drive.mjs"), "utf8");
const refused = [];
for (const file of readdirSync(DIRECTIONS).filter((f) => f.endsWith(".md"))) {
  const id = file.replace(/\.md$/, "");
  const direction = resolveDirectionFamilies(readDirection(join(DIRECTIONS, file)), textPerRegister);
  const { ink, muted } = deriveFurniture(direction.ground);
  const regs = webRegisters(direction, { ink: { ink, muted, accent: direction.accent } });
  try {
    const { outPath } = await renderScrolly({
      steps: prose.map((p, i) => ({ id: [`total-${FIRST}`, "renouvelables", "nucleaire", "fossile", `total-${LAST}`, "lecture"][i], prose: p })),
      reveal: {
        element: createElement(DirectedBridgeScrolly, { bars, max, ticks, words, alt, regs, stroke: direction.stroke ?? {}, ground: direction.ground, accent: direction.accent, ink, muted }),
        states: STATES,
        driver,
        apply: "applyBridgeState",
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
