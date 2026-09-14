// Wind's and solar's share of electricity in six European countries, 2024, rendered once per FILED DIRECTION into a
// self-contained scrolly page. The `grouped bar` type in the scrolly format.
//
// THE SUBJECT OF `static-wind-vs-solar`, CHOREOGRAPHED. The six countries, the shares, the claim and its assertions are
// the static beat's own; the scroll tells them with its own gestures
// (`scrolly/references/directed-type-choreography.md`):
//
//   1. wind alone, six countries;
//   2. solar growing beside it;
//   3. every pair collapsed into its gap, wind minus solar, either side of zero;
//   4. the groups re-sorted by that gap;
//   5. 2015's gap as a ghost: Switzerland was already below zero;
//   6. the static plate.
//
// Usage:  bun proof/scrolly-wind-vs-solar/render-directions-scrolly.mjs

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
import { DirectedWindSolarScrolly } from "./DirectedWindSolarScrolly.tsx";

const HERE = dirname(fileURLToPath(import.meta.url));
const DIRECTIONS = join(HERE, "..", "..", "docs", "design-base", "directions");
const OUT = join(HERE, "renders");
const EYEBROW = "Énergie · Europe";
const NB = "\u00A0";
const YEAR = 2024;
const BEFORE = 2015;
const EXCEPTION = "Switzerland";
const SOURCES = ["Other renewables", "Bioenergy", "Solar", "Wind", "Hydropower", "Nuclear", "Gas", "Oil", "Coal"];
const FRENCH = { France: ["France", "la France"], Germany: ["Allemagne", "l’Allemagne"], Norway: ["Norvège", "la Norvège"], Poland: ["Pologne", "la Pologne"], Sweden: ["Suède", "la Suède"], Switzerland: ["Suisse", "la Suisse"] };

// ── the shares, and the static beat's own assertions ───────────────────────────────────────────
const csv = (await readFile(join(HERE, "data.csv"), "utf8")).trim().split(/\r?\n/);
const header = csv[0].split(",");
const missing = header.slice(3).filter((h) => !SOURCES.includes(h));
if (missing.length) throw new Error(`source column(s) not counted in the total: ${missing.join(", ")}`);
const rows = csv.slice(1).map((l) => Object.fromEntries(header.map((h, i) => [h, l.split(",")[i]])));
const shares = (entity, year) => {
  const r = rows.find((x) => x.Entity === entity && Number(x.Year) === year);
  if (!r) throw new Error(`no ${year} row for ${entity}`);
  const total = SOURCES.reduce((s, k) => s + Number(r[k]), 0);
  return { wind: (Number(r.Wind) / total) * 100, solar: (Number(r.Solar) / total) * 100 };
};
const entities = [...new Set(rows.map((r) => r.Entity))];
for (const e of entities) if (!FRENCH[e]) throw new Error(`no French name recorded for ${e}`);
const base = entities.map((e) => {
  const now = shares(e, YEAR);
  const then = shares(e, BEFORE);
  return { key: e, ...now, gap: now.wind - now.solar, before: then.wind - then.solar };
});
const reversals = base.filter((g) => g.solar > g.wind);
if (!(reversals.length === 1 && reversals[0].key === EXCEPTION)) throw new Error(`the headline names ${EXCEPTION} as the only country where solar leads; ${reversals.map((g) => g.key).join(", ") || "none"} do`);
const exception = reversals[0];
if (!(exception.before < 0)) throw new Error(`card 5 says ${EXCEPTION} was already below zero in ${BEFORE}; its gap was ${exception.before.toFixed(2)}`);
const widened = exception.gap / exception.before;
if (!(widened > 3)) throw new Error(`card 5 says ${EXCEPTION}'s gap several times wider than in ${BEFORE}; ×${widened.toFixed(2)}`);
const byGap = [...base].sort((a, b) => b.gap - a.gap);
const topWind = base.reduce((a, b) => (b.wind > a.wind ? b : a));
console.log(`${base.length} pays · exception ${exception.key} ${exception.gap.toFixed(1)} (${BEFORE} ${exception.before.toFixed(1)}, ×${widened.toFixed(1)}) · ordre ${byGap.map((g) => g.key).join(", ")}\n`);

const one = (v) => plainSpaces(v.toLocaleString("fr-FR", { minimumFractionDigits: 1, maximumFractionDigits: 1 }));
const signed = (v) => `${v >= 0 ? "+" : "−"}${one(Math.abs(v))}`;
const groups = base.map((g) => ({ key: g.key, label: FRENCH[g.key][0], wind: g.wind, solar: g.solar, before: g.before, windText: one(g.wind), solarText: one(g.solar), gapText: signed(g.gap), beforeText: signed(g.before), exception: g === exception }));
const indexOf = (g) => base.indexOf(g);
const orders = [[...base].sort((a, b) => FRENCH[a.key][0].localeCompare(FRENCH[b.key][0], "fr")).map(indexOf), byGap.map(indexOf)];
const cap = (s) => s[0].toUpperCase() + s.slice(1);

// ── the words ──────────────────────────────────────────────────────────────────────────────────
const title = [
  `Dans ${base.length - 1} de ces ${base.length} pays l’éolien devance le solaire — la Suisse est l’exception`,
  `L’éolien devance le solaire partout, sauf en Suisse`,
  `Éolien et solaire dans six pays européens`,
];
const prose = [
  [`La part de l’éolien dans la production électrique de six pays européens en ${YEAR} : de ${one(topWind.wind)}${NB}% en ${FRENCH[topWind.key][0]} à ${one(exception.wind)}${NB}% en Suisse.`],
  [`À côté, le solaire : ${one(exception.solar)}${NB}% en Suisse.`],
  [`Gardons seulement l’écart, éolien moins solaire. Au-dessus de zéro, l’éolien mène ; en dessous, le solaire. Un seul pays passe sous zéro : la Suisse, ${signed(exception.gap)}${NB}points.`],
  [`Rangés par écart : ${FRENCH[byGap[0].key][1]} en tête, ${signed(byGap[0].gap)}${NB}points ; la Suisse en dernier.`],
  [`En ${BEFORE}, la Suisse était déjà sous zéro, à ${signed(exception.before)}. L’écart est ${one(widened)} fois plus grand aujourd’hui.`],
  [`Lecture : part de chaque source dans la production électrique nationale en ${YEAR}, en %. Les pays sont classés par l’écart entre les deux, pas par ordre alphabétique.`],
];
const source = "Source : Ember, Energy Institute — Statistical Review of World Energy (2025), via Our World in Data";
const words = {
  wind: "Éolien",
  solar: "Solaire",
  windAhead: "l’éolien mène",
  solarAhead: "le solaire mène",
  windNote: `part de l’éolien, ${YEAR}, en %`,
  solarNote: `et du solaire, en %`,
  gapNote: `éolien moins solaire, en points`,
  sortNote: "rangés par écart",
  ghostNote: `pointillé${NB}: l’écart en ${BEFORE}`,
  readNote: `${cap(FRENCH[EXCEPTION][0])}${NB}: solaire devant éolien`,
};
const alt =
  `Barres groupées : la part de l’éolien et du solaire dans la production électrique de six pays européens en ${YEAR}. ` +
  `L’éolien devance le solaire partout sauf en Suisse, où le solaire fait ${one(exception.solar)} % et l’éolien ${one(exception.wind)} %.`;

/** One state per card; see `windsolar-drive.mjs` for what each field paints. */
const STATES = [
  { wind: 1, solar: 0, gap: 0, sort: 0, ghost: 0, note: 0 },
  { wind: 1, solar: 1, gap: 0, sort: 0, ghost: 0, note: 1 },
  { wind: 1, solar: 1, gap: 1, sort: 0, ghost: 0, note: 2 },
  { wind: 1, solar: 1, gap: 1, sort: 1, ghost: 0, note: 3 },
  { wind: 1, solar: 1, gap: 1, sort: 1, ghost: 1, note: 4 },
  { wind: 1, solar: 1, gap: 0, sort: 1, ghost: 0, note: 5 },
];

const textPerRegister = {
  display: title.join(" "),
  eyebrow: EYEBROW,
  body: `${prose.flat().join(" ")} ${source}`,
  axis: `${words.windAhead} ${words.solarAhead} ${groups.map((g) => g.beforeText).join(" ")}`,
  annot: `${words.wind} ${words.solar} ${groups.map((g) => g.label).join(" ")}`,
  value: `${groups.map((g) => `${g.windText} ${g.solarText} ${g.gapText}`).join(" ")} ${Object.entries(words).filter(([k]) => k.endsWith("Note")).map(([, v]) => v).join(" ")}`,
};

const filed = readdirSync(DIRECTIONS)
  .filter((f) => f.endsWith(".md"))
  .map((f) => readDirection(join(DIRECTIONS, f)));
const newsroom = readPalette(HERE, { stopAt: join(HERE, "..") });
const BEAT_FACTS = { evidenceLevels: 3 };
console.log(report(composeDirections({ newsroom, filed, beat: BEAT_FACTS, textPerRegister }), { beat: BEAT_FACTS }));
console.log("");

const driver = await readFile(join(HERE, "windsolar-drive.mjs"), "utf8");
const refused = [];
for (const file of readdirSync(DIRECTIONS).filter((f) => f.endsWith(".md"))) {
  const id = file.replace(/\.md$/, "");
  const direction = resolveDirectionFamilies(readDirection(join(DIRECTIONS, file)), textPerRegister);
  const { ink, muted, grid } = deriveFurniture(direction.ground);
  const regs = webRegisters(direction, { ink: { ink, muted, accent: direction.accent } });
  try {
    const { outPath } = await renderScrolly({
      steps: prose.map((p, i) => ({ id: ["eolien", "solaire", "ecart", "par-ecart", `ecart-${BEFORE}`, "lecture"][i], prose: p })),
      reveal: {
        element: createElement(DirectedWindSolarScrolly, { groups, orders, words, alt, regs, ground: direction.ground, accent: direction.accent, ink, muted, grid }),
        states: STATES,
        driver,
        apply: "applyWindSolarState",
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
