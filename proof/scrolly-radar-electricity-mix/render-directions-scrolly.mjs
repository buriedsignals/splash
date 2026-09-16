// France's and Germany's 2024 electricity mixes, rendered once per FILED DIRECTION into a self-contained scrolly page.
// The `radar` type in the scrolly format.
//
// THE SUBJECT OF `static-radar-electricity-mix`, CHOREOGRAPHED. The spokes and their order, the shares, the claim and
// its assertions are the static beat's own; the scroll tells them with its own gestures
// (`scrolly/references/directed-type-choreography.md`):
//
//   1. the two totals, nearly the same;
//   2. France's polygon traced spoke by spoke: the nuclear spike;
//   3. Germany's over it: no nuclear, wind and coal;
//   4. the nine spokes merged into three families: two opposite triangles;
//   5. back to nine spokes, the ceiling tightened: the small shares open, the nuclear spike rests on the ring;
//   6. the static plate.
//
// Usage:  bun proof/scrolly-radar-electricity-mix/render-directions-scrolly.mjs

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
import { DirectedRadarScrolly } from "./DirectedRadarScrolly.tsx";

const HERE = dirname(fileURLToPath(import.meta.url));
const DIRECTIONS = join(HERE, "..", "..", "docs", "design-base", "directions");
const OUT = join(HERE, "renders");
const YEAR = 2024;
const EYEBROW = "Énergie · Europe";
const NB = "\u00A0";
const SUBJECT = "France";
const OTHER = "Germany";
const FRENCH = { France: ["France", "la France"], Germany: ["Allemagne", "l’Allemagne"] };
/** The zoomed ceiling: the ring a reader can read the small shares against once the nuclear spike is let go. */
const TIGHT = 30;
/** THE SPOKE ORDER IS AN EDITORIAL DECISION: renewables, nuclear, fossil, clockwise from twelve o'clock. */
const FAMILIES = ["renouvelables", "nucléaire", "fossiles"];
const SPOKES = [
  { column: "Wind", label: "Éolien", family: 0 },
  { column: "Solar", label: "Solaire", family: 0 },
  { column: "Hydropower", label: "Hydraulique", family: 0 },
  { column: "Bioenergy", label: "Bioénergie", family: 0 },
  { column: "Other renewables", label: "Autres renouv.", family: 0 },
  { column: "Nuclear", label: "Nucléaire", family: 1 },
  { column: "Gas", label: "Gaz", family: 2 },
  { column: "Coal", label: "Charbon", family: 2 },
  { column: "Oil", label: "Pétrole", family: 2 },
];

// ── the shares, and the static beat's own assertions ───────────────────────────────────────────
const csv = (await readFile(join(HERE, "data.csv"), "utf8")).trim().split(/\r?\n/);
const header = csv[0].split(",");
const rows = csv.slice(1).map((l) => Object.fromEntries(header.map((h, i) => [h, l.split(",")[i]])));
const missing = header.slice(3).filter((h) => !SPOKES.some((s) => s.column === h));
if (missing.length) throw new Error(`source column(s) with no spoke: ${missing.join(", ")}`);
const countries = [SUBJECT, OTHER].map((entity) => {
  const row = rows.find((r) => r.Entity === entity && Number(r.Year) === YEAR);
  if (!row) throw new Error(`no ${YEAR} row for ${entity}`);
  const total = SPOKES.reduce((s, sp) => s + Number(row[sp.column]), 0);
  return { entity, total, shares: SPOKES.map((sp) => (Number(row[sp.column]) / total) * 100) };
});
const [fr, de] = countries;
const shareOf = (country, ...columns) => columns.reduce((sum, col) => sum + country.shares[SPOKES.findIndex((s) => s.column === col)], 0);
const ratio = Math.max(fr.total, de.total) / Math.min(fr.total, de.total);
if (ratio > 1.25) throw new Error(`the headline says the two make nearly the same electricity; they are ${ratio.toFixed(2)}x apart`);
if (shareOf(de, "Nuclear") !== 0) throw new Error(`the headline says Germany has no nuclear; it has ${shareOf(de, "Nuclear")} %`);
if (shareOf(fr, "Nuclear") < 50) throw new Error(`the headline rests on nuclear being most of France's mix; it is ${shareOf(fr, "Nuclear").toFixed(1)} %`);
if (shareOf(de, "Wind", "Solar") <= shareOf(fr, "Wind", "Solar")) throw new Error("a card says Germany draws more of its power from wind and solar than France");
const familyShares = FAMILIES.map((_, f) => countries.map((c) => SPOKES.reduce((s, sp, i) => s + (sp.family === f ? c.shares[i] : 0), 0)));
for (const c of [0, 1]) if (Math.abs(familyShares.reduce((s, f) => s + f[c], 0) - 100) > 1e-6) throw new Error(`${countries[c].entity}'s three families do not sum to 100 %`);
/** Card 4's sentence: the two triangles point opposite ways — France's longest side is nuclear, Germany's renewables,
 *  and Germany's fossil share is several times France's. */
const longest = (c) => familyShares.map((f, i) => [f[c], i]).sort((a, b) => b[0] - a[0])[0][1];
if (!(longest(0) === 1 && longest(1) === 0)) throw new Error("card 4 says France leans on nuclear and Germany on renewables");
if (!(familyShares[2][1] > familyShares[2][0] * 4)) throw new Error(`card 4 says Germany burns several times France's fossil share; ${familyShares[2][1].toFixed(1)} against ${familyShares[2][0].toFixed(1)}`);
const ceiling = Math.ceil(Math.max(...countries.flatMap((c) => c.shares)) / 10) * 10;
/** Card 5's sentence: at the tight ceiling only nuclear leaves the ring; every other share of both fits it. */
const overTight = SPOKES.filter((_, i) => countries.some((c) => c.shares[i] > TIGHT)).map((s) => s.column);
if (overTight.join() !== "Nuclear") throw new Error(`card 5 says only nuclear passes ${TIGHT} %; ${overTight.join(", ")} do`);
console.log(`${SUBJECT} ${fr.total.toFixed(1)} TWh · ${OTHER} ${de.total.toFixed(1)} TWh · ×${ratio.toFixed(2)} · familles FR ${familyShares.map((f) => f[0].toFixed(1)).join("/")} DE ${familyShares.map((f) => f[1].toFixed(1)).join("/")}\n`);

const one = (v) => plainSpaces(v.toLocaleString("fr-FR", { minimumFractionDigits: 1, maximumFractionDigits: 1 }));
const spokes = SPOKES.map((sp, i) => ({ key: sp.column, label: sp.label, family: sp.family, shares: countries.map((c) => c.shares[i]), texts: countries.map((c) => one(c.shares[i])) }));
const families = FAMILIES.map((label, f) => ({ label: label[0].toUpperCase() + label.slice(1), shares: familyShares[f], texts: familyShares[f].map(one) }));
const [frName, deName] = [FRENCH[SUBJECT][0], FRENCH[OTHER][0]];

// ── the words ──────────────────────────────────────────────────────────────────────────────────
const title = [
  `La France et l’Allemagne produisent presque autant d’électricité, avec des mix opposés`,
  `Presque autant d’électricité, des mix opposés`,
  `France, Allemagne : deux mix électriques`,
];
const prose = [
  [`En ${YEAR}, la France a produit ${one(fr.total)}${NB}TWh d’électricité, l’Allemagne ${one(de.total)}${NB}TWh : presque autant.`],
  [`Chaque rayon est une source, en part de la production du pays. Le mix français, rayon par rayon : le nucléaire en fait ${one(shareOf(fr, "Nuclear"))}${NB}%.`],
  [`Le mix allemand par-dessus : pas de nucléaire, ${one(shareOf(de, "Wind"))}${NB}% d’éolien, ${one(shareOf(de, "Coal"))}${NB}% de charbon. L’éolien et le solaire réunis y font ${one(shareOf(de, "Wind", "Solar"))}${NB}%, contre ${one(shareOf(fr, "Wind", "Solar"))}${NB}% en France.`],
  [`Regroupons les neuf rayons en trois familles. Renouvelables : ${one(familyShares[0][0])}${NB}% en France, ${one(familyShares[0][1])}${NB}% en Allemagne. Fossiles : ${one(familyShares[2][0])}${NB}% contre ${one(familyShares[2][1])}${NB}%.`],
  [`Resserrons l’échelle à ${TIGHT}${NB}% : les petites parts s’ouvrent ; seul le nucléaire français dépasse le cercle.`],
  [`Lecture : chaque rayon est une part de la production du pays lui-même, les neuf parts d’un polygone font 100${NB}%. Rayons rangés par famille dans le sens horaire : renouvelables, nucléaire, fossiles.`],
];
const source = "Source : Ember, Energy Institute – Statistical Review of World Energy (2025), via Our World in Data";
const words = {
  totalNote: `${frName} ${one(fr.total)}${NB}TWh · ${deName} ${one(de.total)}${NB}TWh`,
  subjectNote: `${frName}${NB}: nucléaire ${one(shareOf(fr, "Nuclear"))}${NB}%`,
  otherNote: `${deName}${NB}: éolien + solaire ${one(shareOf(de, "Wind", "Solar"))}${NB}%`,
  familyNote: `fossiles${NB}: ${one(familyShares[2][0])}${NB}% · ${one(familyShares[2][1])}${NB}%`,
  scaleNote: `cercle extérieur${NB}: ${TIGHT}${NB}%`,
  legendNote: `cercle extérieur${NB}: ${ceiling}${NB}%`,
};
const alt =
  `Radar à neuf rayons comparant la part de chaque source dans la production électrique de la France et de l’Allemagne en ${YEAR}. ` +
  `Le polygone français est étiré vers le nucléaire (${one(shareOf(fr, "Nuclear"))} %), celui de l’Allemagne vers l’éolien et le solaire ` +
  `(${one(shareOf(de, "Wind", "Solar"))} %) et le charbon (${one(shareOf(de, "Coal"))} %).`;

const N = SPOKES.length;
/** One state per card; see `radar-drive.mjs` for what each field paints. */
const STATES = [
  { bars: 1, trace0: 0, trace1: 0, merge: 0, scale: 0, note: 0 },
  { bars: 0, trace0: N, trace1: 0, merge: 0, scale: 0, note: 1 },
  { bars: 0, trace0: N, trace1: N, merge: 0, scale: 0, note: 2 },
  { bars: 0, trace0: N, trace1: N, merge: 1, scale: 0, note: 3 },
  { bars: 0, trace0: N, trace1: N, merge: 0, scale: 1, note: 4 },
  { bars: 0, trace0: N, trace1: N, merge: 0, scale: 0, note: 5 },
];

const textPerRegister = {
  display: title.join(" "),
  eyebrow: EYEBROW,
  body: `${prose.flat().join(" ")} ${source}`,
  axis: `${ceiling} % ${TIGHT} %`,
  annot: `${spokes.map((s) => s.label).join(" ")} ${families.map((f) => f.label).join(" ")} ${frName} ${deName}`,
  value: `${spokes.map((s) => s.texts.join(" · ")).join(" ")} ${families.map((f) => f.texts.join(" · ")).join(" ")} ${Object.values(words).join(" ")}`,
};

const filed = readdirSync(DIRECTIONS)
  .filter((f) => f.endsWith(".md"))
  .map((f) => readDirection(join(DIRECTIONS, f)));
const newsroom = readPalette(HERE, { stopAt: join(HERE, "..") });
const BEAT_FACTS = { evidenceLevels: 3 };
console.log(report(composeDirections({ newsroom, filed, beat: BEAT_FACTS, textPerRegister }), { beat: BEAT_FACTS }));
console.log("");

const driver = await readFile(join(HERE, "radar-drive.mjs"), "utf8");
const refused = [];
for (const file of readdirSync(DIRECTIONS).filter((f) => f.endsWith(".md"))) {
  const id = file.replace(/\.md$/, "");
  const direction = resolveDirectionFamilies(readDirection(join(DIRECTIONS, file)), textPerRegister);
  const { ink, muted, grid } = deriveFurniture(direction.ground);
  const regs = webRegisters(direction, { ink: { ink, muted, accent: direction.accent } });
  try {
    const { outPath } = await renderScrolly({
      steps: prose.map((p, i) => ({ id: ["totaux", "france", "allemagne", "familles", "echelle", "lecture"][i], prose: p })),
      reveal: {
        element: createElement(DirectedRadarScrolly, {
          spokes,
          families,
          items: [frName, deName],
          totals: countries.map((c) => ({ value: c.total, text: `${one(c.total)}${NB}TWh` })),
          ceilings: [ceiling, TIGHT].map((v) => ({ value: v, text: `${v}${NB}%` })),
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
        apply: "applyRadarState",
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
