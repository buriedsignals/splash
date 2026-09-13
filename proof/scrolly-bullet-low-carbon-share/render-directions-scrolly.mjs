// Low-carbon share of electricity, 2015 against 2024, rendered once per FILED DIRECTION into a
// self-contained scrolly page. The `bullet` type in the scrolly format.
//
// THE SAME PLATE AS `static-bullet-low-carbon-share`, READ IN ORDER. The shares, the ranking by change,
// both halves of the headline and the words are the static beat's own:
//
//   1. what is measured — the tracks to 100 % and the thick pale 2015 bars;
//   2. how far the subject moved — the thin saturated 2024 bars;
//   3. how little the already-high moved — every row's change in points;
//   4. the plate's own reading line.
//
// Usage:  bun proof/scrolly-bullet-low-carbon-share/render-directions-scrolly.mjs

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
import { renderScrolly } from "../../skills/scrolly/scripts/render-scrolly.mjs";
import { DirectedBulletScrolly } from "./DirectedBulletScrolly.tsx";

const HERE = dirname(fileURLToPath(import.meta.url));
const DIRECTIONS = join(HERE, "..", "..", "docs", "design-base", "directions");
const OUT = join(HERE, "renders");
const BEFORE = 2015;
const AFTER = 2024;
const EYEBROW = "Énergie · Europe";
/** Low-carbon: nuclear and every renewable — the split Ember's own columns make. */
const LOW_CARBON = ["Other renewables", "Bioenergy", "Solar", "Wind", "Hydropower", "Nuclear"];
const FRENCH = { France: "France", Germany: "Allemagne", Norway: "Norvège", Poland: "Pologne", Sweden: "Suède", Switzerland: "Suisse" };
const french = (entity) => {
  if (!FRENCH[entity]) throw new Error(`no French name recorded for ${entity}`);
  return FRENCH[entity];
};

// ── the shares, and the static beat's own assertions ───────────────────────────────────────────
const csv = (await readFile(join(HERE, "data.csv"), "utf8")).trim().split(/\r?\n/);
const header = csv[0].split(",");
const sources = header.slice(3);
const rowsRaw = csv.slice(1).map((l) => Object.fromEntries(header.map((h, i) => [h, l.split(",")[i]])));
const shareFor = (entity, year) => {
  const row = rowsRaw.find((r) => r.Entity === entity && Number(r.Year) === year);
  if (!row) throw new Error(`no ${year} row for ${entity} in the frozen data`);
  const total = sources.reduce((sum, c) => sum + Number(row[c]), 0);
  const low = LOW_CARBON.reduce((sum, c) => sum + Number(row[c]), 0);
  return (low / total) * 100;
};
const entities = [...new Set(rowsRaw.map((r) => r.Entity))];
const ranked = entities
  .map((entity) => ({ key: entity, label: french(entity), marker: shareFor(entity, BEFORE), measure: shareFor(entity, AFTER) }))
  .sort((a, b) => b.measure - b.marker - (a.measure - a.marker));
const moved = ranked[0];
const underHalf = ranked.filter((r) => r.measure < 50);
if (underHalf.length !== 1 || underHalf[0].key !== moved.key)
  throw new Error(`the headline says the country that moved furthest is also the only one still under half; ${underHalf.length} are under half and the furthest is ${moved.key}`);
/** 95, not 90: the static beat's own assertion corrected that sentence, France was at 92.2 % in 2015. */
const SATURATED = 95;
const alreadyHigh = ranked.filter((r) => r.marker >= SATURATED);
if (!alreadyHigh.every((r) => r.measure - r.marker < 1))
  throw new Error(`a card says every country already above ${SATURATED} % gained less than a point; one did not`);

const SPELLED = ["zéro", "un", "deux", "trois", "quatre", "cinq", "six"];
const one = (v) => plainSpaces(v.toLocaleString("fr-FR", { minimumFractionDigits: 1, maximumFractionDigits: 1 }));
const format = (v) => plainSpaces(v.toLocaleString("fr-FR", { maximumFractionDigits: 0 }));
const rows = ranked.map((r) => ({ ...r, verdict: `+${one(r.measure - r.marker)} pts` }));

// ── the words: the static beat's, one reading per card ─────────────────────────────────────────
const title = [
  `${french(moved.key)} : +${one(moved.measure - moved.marker)} points de bas-carbone depuis ${BEFORE}, et toujours la seule des six sous la moitié`,
  `${french(moved.key)} : +${one(moved.measure - moved.marker)} points de bas-carbone depuis ${BEFORE}`,
  `${french(moved.key)} : +${one(moved.measure - moved.marker)} points depuis ${BEFORE}`,
];
const prose = [
  [`Part du bas-carbone — nucléaire et renouvelables — dans la production électrique de chaque pays, en ${BEFORE} et en ${AFTER}.`],
  [`${french(moved.key)} passe de ${one(moved.marker)} % à ${one(moved.measure)} %.`],
  [`Les ${SPELLED[alreadyHigh.length] ?? alreadyHigh.length} pays déjà au-dessus de ${SATURATED} % en ${BEFORE} gagnent moins d’un point chacun.`],
  [
    `Lecture : la barre épaisse et pâle est ${BEFORE}, la fine et saturée ${AFTER} — deux états d’une même mesure, donc une seule teinte à deux intensités. La piste va jusqu’à 100 %, si bien que ce qui reste à parcourir se lit aussi. Aucun objectif n’est dessiné ici : ${BEFORE} est une date, pas une cible.`,
  ],
];
const source = "Source : Ember, Energy Institute – Statistical Review of World Energy (2025), via Our World in Data";
const markerLabel = `${BEFORE} : ${format(moved.marker)} %`;
const measureLabel = `${AFTER} : ${format(moved.measure)} %`;
const ticks = [0, 50, 100].map((v) => ({ value: v, label: v === 100 ? `${format(v)} %` : format(v) }));
const alt =
  `Graphique à puces : la part du bas-carbone dans l’électricité de six pays européens, ${BEFORE} contre ${AFTER}, ` +
  `sur une piste allant jusqu’à 100 %. ${french(moved.key)} progresse de ${one(moved.marker)} % à ${one(moved.measure)} %, ` +
  `soit +${one(moved.measure - moved.marker)} points, et reste la seule des six sous la moitié.`;

/** One state per card; see `bullet-drive.mjs` for what each field paints. */
const STATES = [
  { marker: 1, measure: 0, verdict: 0 },
  { marker: 1, measure: 1, verdict: 0 },
  { marker: 1, measure: 1, verdict: 1 },
  { marker: 1, measure: 1, verdict: 1 },
];

const textPerRegister = {
  display: title.join(" "),
  eyebrow: EYEBROW,
  body: `${prose.flat().join(" ")} ${source}`,
  axis: ticks.map((t) => t.label).join(" "),
  annot: `${rows.map((r) => r.label).join(" ")} ${markerLabel} ${measureLabel}`,
  value: rows.map((r) => r.verdict).join(" "),
};

const filed = readdirSync(DIRECTIONS)
  .filter((f) => f.endsWith(".md"))
  .map((f) => readDirection(join(DIRECTIONS, f)));
const newsroom = readPalette(HERE, { stopAt: join(HERE, "..") });
const BEAT_FACTS = { evidenceLevels: 3 };
console.log(report(composeDirections({ newsroom, filed, beat: BEAT_FACTS, textPerRegister }), { beat: BEAT_FACTS }));
console.log("");

const driver = await readFile(join(HERE, "bullet-drive.mjs"), "utf8");
const refused = [];
for (const file of readdirSync(DIRECTIONS).filter((f) => f.endsWith(".md"))) {
  const id = file.replace(/\.md$/, "");
  const direction = resolveDirectionFamilies(readDirection(join(DIRECTIONS, file)), textPerRegister);
  const { ink, muted, grid } = deriveFurniture(direction.ground);
  const regs = webRegisters(direction, { ink: { ink, muted, accent: direction.accent } });
  try {
    const { outPath } = await renderScrolly({
      steps: prose.map((p, i) => ({ id: ["mesure", "pologne", "deja-hauts", "lecture"][i], prose: p })),
      reveal: {
        element: createElement(DirectedBulletScrolly, {
          rows,
          subject: moved.key,
          ceiling: 100,
          markerLabel,
          measureLabel,
          ticks,
          alt,
          regs,
          pad: direction.pad,
          stroke: direction.stroke ?? {},
          ground: direction.ground,
          accent: direction.accent,
          ink,
          muted,
          grid,
        }),
        states: STATES,
        driver,
        apply: "applyBulletState",
      },
      title,
      eyebrow: EYEBROW,
      source,
      ground: direction.ground,
      type: { eyebrow: regs.eyebrow, display: regs.display, body: regs.body, source: regs.body },
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
