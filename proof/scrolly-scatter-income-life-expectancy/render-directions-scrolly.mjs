// Income against life expectancy in 165 countries, 2021, rendered once per FILED DIRECTION into a self-contained
// scrolly page. The `scatter` type in the scrolly format.
//
// THE SUBJECT OF `static-income-life-expectancy`, CHOREOGRAPHED. The pairs, the declared break and the spread on each
// side are the static beat's own; the scroll tells them with its own gestures
// (`scrolly/references/directed-type-choreography.md`):
//
//   1. the cloud on a linear income axis: everything against the left edge;
//   2. the axis turns logarithmic: the rise and the plateau;
//   3. the break at $30,000;
//   4. the spread under it: 41 years;
//   5. the spread over it: 14 years, three times narrower;
//   6. the static plate.
//
// Usage:  bun proof/scrolly-scatter-income-life-expectancy/render-directions-scrolly.mjs

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
import { DirectedIncomeScatterScrolly } from "./DirectedIncomeScatterScrolly.tsx";

const HERE = dirname(fileURLToPath(import.meta.url));
const DIRECTIONS = join(HERE, "..", "..", "docs", "design-base", "directions");
const OUT = join(HERE, "renders");
const EYEBROW = "Santé · Monde";
const NB = " ";
const YEAR = 2021;
/** The editorial break, declared by the beat; the spread on each side is derived from the data. */
const BREAK = 30000;
const FRENCH = { "Central African Republic": "Centrafrique", Portugal: "Portugal", Seychelles: "Seychelles", "Hong Kong": "Hong Kong" };

// ── the pairs, and the static beat's own checks ────────────────────────────────────────────────
const points = (await readFile(join(HERE, "data.csv"), "utf8"))
  .trim()
  .split(/\r?\n/)
  .slice(1)
  .map((l) => l.split(","))
  .map((c) => ({ entity: c[0], code: c[1], year: Number(c[2]), y: Number(c[3]), x: Number(c[4]) }))
  .filter((r) => /^[A-Z]{3}$/.test(r.code) && Number.isFinite(r.x) && Number.isFinite(r.y) && r.x > 0);
if (points.some((p) => p.year !== YEAR)) throw new Error(`the plate reads ${YEAR} only`);
if (points.some((p) => p.y < 35)) throw new Error("a reading under 35 years is the 2022 data artefact this beat refuses");
const sideOf = (s) => {
  const lo = s.reduce((m, p) => (p.y < m.y ? p : m));
  const hi = s.reduce((m, p) => (p.y > m.y ? p : m));
  return { count: s.length, lo, hi, range: hi.y - lo.y };
};
const below = sideOf(points.filter((p) => p.x < BREAK));
const above = sideOf(points.filter((p) => p.x >= BREAK));
const ratio = below.range / above.range;
if (!(ratio > 2.5)) throw new Error(`the headline says the band over the break is about three times narrower; the ratio is ${ratio.toFixed(2)}`);
for (const p of [below.lo, below.hi, above.lo, above.hi]) if (!FRENCH[p.entity]) throw new Error(`${p.entity} is an extreme and has no French name filed`);
const onScreenLinear = points.filter((p) => p.x < 0.1 * Math.max(...points.map((q) => q.x))).length;
if (!(onScreenLinear / points.length > 0.5)) throw new Error(`the first card says more than half the countries sit in the first tenth of a linear axis; ${onScreenLinear} of ${points.length} are in its first tenth`);
const times = Math.abs(ratio - Math.round(ratio)) < 0.15 ? String(Math.round(ratio)) : ratio.toFixed(1).replace(".", ",");

const one = (v) => plainSpaces(v.toLocaleString("fr-FR", { minimumFractionDigits: 1, maximumFractionDigits: 1 }));
const money = (v) => `${plainSpaces(v.toLocaleString("fr-FR"))}${NB}$`;
console.log(`${points.length} pays · sous ${BREAK} : ${below.count}, ${below.range.toFixed(1)} ans · au-dessus : ${above.count}, ${above.range.toFixed(1)} ans · ratio ${ratio.toFixed(2)} · ${onScreenLinear} dans le premier dixième linéaire\n`);

// ── the words ──────────────────────────────────────────────────────────────────────────────────
const title = [
  `Au-delà de ${money(BREAK)} par personne, l’espérance de vie tient dans une bande ${times} fois plus étroite`,
  `Au-delà de ${money(BREAK)}, une espérance de vie ${times} fois plus resserrée`,
  `Le revenu et l’espérance de vie`,
];
const prose = [
  [`${points.length} pays en ${YEAR} : le PIB par habitant en abscisse, l’espérance de vie en ordonnée. Sur un axe du revenu ordinaire, plus de la moitié, ${onScreenLinear}, s’entassent dans son premier dixième.`],
  [`Passons le revenu en échelle logarithmique, où chaque graduation multiplie. Le nuage se déplie : l’espérance de vie monte vite, puis plafonne.`],
  [`Posons un seuil à ${money(BREAK)} par personne : ${below.count} pays en dessous, ${above.count} au-dessus.`],
  [`En dessous, l’espérance de vie va de ${one(below.lo.y)}${NB}ans en ${FRENCH[below.lo.entity]} à ${one(below.hi.y)}${NB}ans au ${FRENCH[below.hi.entity]} : ${Math.round(below.range)}${NB}ans d’écart.`],
  [`Au-dessus, elle tient entre ${one(above.lo.y)}${NB}ans aux ${FRENCH[above.lo.entity]} et ${one(above.hi.y)}${NB}ans à ${FRENCH[above.hi.entity]} : ${Math.round(above.range)}${NB}ans, une bande ${times} fois plus étroite.`],
  [`Corrélation, pas causalité : les systèmes de santé, les conflits et les maladies évoluent aussi indépendamment du revenu.`],
];
const source = "Source : Banque mondiale via Gapminder, ONU WPP (2024), via Our World in Data";
const k = (v) => (v >= 1000 ? `${plainSpaces((v / 1000).toLocaleString("fr-FR"))}${NB}k` : String(v));
const words = {
  xName: "PIB par habitant, en dollars",
  yName: "espérance de vie à la naissance, en années",
  belowClaim: `${below.count} pays sous ${money(BREAK)} · ${Math.round(below.range)}${NB}ans d’écart`,
  aboveClaim: `${above.count} au-dessus · ${Math.round(above.range)}${NB}ans`,
  logNote: "échelle logarithmique",
  breakNote: `seuil${NB}: ${money(BREAK)}`,
  belowNote: `${Math.round(below.range)}${NB}ans d’écart sous le seuil`,
  aboveNote: `${Math.round(above.range)}${NB}ans au-dessus, ${times} fois moins`,
};
const extremes = [
  { code: below.lo.code, label: `${FRENCH[below.lo.entity]} ${one(below.lo.y)}`, side: "below" },
  { code: below.hi.code, label: `${FRENCH[below.hi.entity]} ${one(below.hi.y)}`, side: "below" },
  { code: above.lo.code, label: `${FRENCH[above.lo.entity]} ${one(above.lo.y)}`, side: "above" },
  { code: above.hi.code, label: `${FRENCH[above.hi.entity]} ${one(above.hi.y)}`, side: "above" },
];
const alt =
  `Nuage de points du PIB par habitant contre l’espérance de vie pour ${points.length} pays en ${YEAR}, en échelle logarithmique. ` +
  `Sous ${BREAK} dollars l’espérance de vie s’étend sur ${Math.round(below.range)} ans, au-dessus sur ${Math.round(above.range)} ans.`;

/** One state per card; see `income-scatter-drive.mjs` for what each field paints. */
const STATES = [
  { log: 0, brk: 0, below: 0, above: 0, all: 0 },
  { log: 1, brk: 0, below: 0, above: 0, all: 0 },
  { log: 1, brk: 1, below: 0, above: 0, all: 0 },
  { log: 1, brk: 1, below: 1, above: 0, all: 0 },
  { log: 1, brk: 1, below: 0, above: 1, all: 0 },
  { log: 1, brk: 1, below: 0, above: 0, all: 1 },
];

const linearTicks = [0, 25000, 50000, 75000, 100000, 125000, 150000].map((v) => ({ value: Math.max(v, 1), label: k(v) }));
const logTicks = [1000, 2000, 5000, 10000, 20000, 50000, 100000].map((v) => ({ value: v, label: k(v) }));
const yTicks = [40, 50, 60, 70, 80, 90];
const textPerRegister = {
  display: title.join(" "),
  eyebrow: EYEBROW,
  body: `${prose.flat().join(" ")} ${source}`,
  axis: `${words.xName} (échelle linéaire) (échelle logarithmique) ${words.yName} ${extremes.map((e) => e.label).join(" ")} ${[...linearTicks, ...logTicks].map((t) => t.label).join(" ")} ${yTicks.join(" ")}`,
  annot: `${words.belowClaim} ${words.aboveClaim}`,
  value: `${words.logNote} ${words.breakNote} ${words.belowNote} ${words.aboveNote}`,
};

const filed = readdirSync(DIRECTIONS)
  .filter((f) => f.endsWith(".md"))
  .map((f) => readDirection(join(DIRECTIONS, f)));
const newsroom = readPalette(HERE);
const BEAT_FACTS = { evidenceLevels: 3 };
console.log(report(composeDirections({ newsroom, filed, beat: BEAT_FACTS, textPerRegister }), { beat: BEAT_FACTS }));
console.log("");

const driver = await readFile(join(HERE, "income-scatter-drive.mjs"), "utf8");
const refused = [];
for (const file of readdirSync(DIRECTIONS).filter((f) => f.endsWith(".md"))) {
  const id = file.replace(/\.md$/, "");
  const direction = resolveDirectionFamilies(readDirection(join(DIRECTIONS, file)), textPerRegister);
  const { ink, muted } = deriveFurniture(direction.ground);
  const regs = webRegisters(direction, { ink: { ink, muted, accent: direction.accent } });
  try {
    const { outPath } = await renderScrolly({
      steps: prose.map((p, i) => ({ id: ["lineaire", "logarithmique", "seuil", "sous-le-seuil", "au-dessus", "lecture"][i], prose: p })),
      reveal: {
        element: createElement(DirectedIncomeScatterScrolly, {
          points: points.map(({ code, x, y }) => ({ code, x, y })),
          breakAt: BREAK,
          spread: { below: { lo: below.lo.y, hi: below.hi.y }, above: { lo: above.lo.y, hi: above.hi.y } },
          extremes,
          linearTicks,
          logTicks,
          yTicks,
          words,
          alt,
          regs,
          stroke: direction.stroke ?? {},
          ground: direction.ground,
          accent: direction.accent,
          ink,
          muted,
        }),
        states: STATES,
        driver,
        apply: "applyIncomeState",
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
