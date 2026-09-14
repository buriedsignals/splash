// Low-carbon share of electricity, 2015 against 2024, rendered once per FILED DIRECTION into a
// self-contained scrolly page. The `bullet` type in the scrolly format.
//
// THE SUBJECT OF `static-bullet-low-carbon-share`, CHOREOGRAPHED. The shares, the ranking by change,
// both halves of the headline and the colour rules are the static beat's own; the scroll tells them with
// its own gestures (`scrolly/references/directed-type-choreography.md`):
//
//   1. the thick pale bars — 2015 — extending from zero along tracks to 100 %;
//   2. the thin saturated bars — 2024 — extending on from where 2015 ends;
//   3. the rows re-sorting by their gain, Poland rising to the top, every gain counted;
//   4. the half ruled across the tracks, every row past it stepping back: Poland alone under it;
//   5. the axis closing onto 90–100 %, where the already-high countries' gains become visible;
//   6. back to the full track, the rows sorted by their 2024 level — the 2015 order, unchanged.
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
import { EYEBROW_TO_DISPLAY, gapOf, registerOf } from "#shared/design-base/register.mjs";
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
const ARTICLED = { France: "la France", Germany: "l’Allemagne", Norway: "la Norvège", Poland: "la Pologne", Sweden: "la Suède", Switzerland: "la Suisse" };
const articled = (entity) => {
  if (!ARTICLED[entity]) throw new Error(`no French article recorded for ${entity}`);
  return ARTICLED[entity];
};
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
const NB = "\u00A0";
const ZOOM_FROM = 90;
/** The fifth card narrows the axis to show the gains the full track flattens; every country it names must
 *  still be on that axis in 2015. */
if (!alreadyHigh.every((r) => r.marker >= ZOOM_FROM)) throw new Error(`card 5 zooms onto ${ZOOM_FROM}–100 % and a country it names starts below it`);
const orderByMarker = [...ranked].sort((a, b) => b.marker - a.marker);
const orderByMeasure = [...ranked].sort((a, b) => b.measure - a.measure);
if (orderByMeasure.some((r, i) => r !== orderByMarker[i])) throw new Error(`card 6 says the ${AFTER} ranking is the ${BEFORE} one; ${orderByMeasure.map((r) => r.key).join(", ")} against ${orderByMarker.map((r) => r.key).join(", ")}`);
const orderBefore = ranked.map((r) => orderByMarker.indexOf(r));
const underNext = orderByMeasure.at(-2);
const prose = [
  [`Part du bas-carbone — nucléaire et renouvelables — dans la production électrique de six pays européens, sur une piste jusqu’à 100${NB}%. La barre épaisse et pâle est ${BEFORE} : ${french(orderByMarker[0].key)} en tête, ${french(orderByMarker.at(-1).key)} en dernier, à ${one(orderByMarker.at(-1).marker)}${NB}%.`],
  [`La fine et saturée est ${AFTER} : chacune prolonge la barre de ${BEFORE}.`],
  [`Rangés par gain, ${french(moved.key)} passe en tête : de ${one(moved.marker)}${NB}% à ${one(moved.measure)}${NB}%, +${one(moved.measure - moved.marker)} points.`],
  [`Et elle reste la seule des six sous la moitié : ${one(moved.measure)}${NB}% en ${AFTER}, quand ${articled(underNext.key)}, l’avant-dernière, est à ${one(underNext.measure)}${NB}%.`],
  [`Resserrée sur ${ZOOM_FROM}–100${NB}%, l’échelle montre ce que la piste entière écrase : les ${SPELLED[alreadyHigh.length] ?? alreadyHigh.length} pays déjà au-dessus de ${SATURATED}${NB}% en ${BEFORE} gagnent moins d’un point chacun.`],
  [`Rangés par niveau en ${AFTER}, les six retrouvent l’ordre de ${BEFORE} : les gains n’ont déplacé personne. Aucun objectif n’est dessiné — ${BEFORE} est une date, pas une cible.`],
];
const zoomTicks = [90, 95, 100].map((v) => ({ value: v, label: v === 100 ? `${format(v)}${NB}%` : format(v) }));
const source = "Source : Ember, Energy Institute – Statistical Review of World Energy (2025), via Our World in Data";
const markerLabel = `${BEFORE} : ${format(moved.marker)} %`;
const measureLabel = `${AFTER} : ${format(moved.measure)} %`;
const halfLabel = `la moitié`;
const ticks = [0, 50, 100].map((v) => ({ value: v, label: v === 100 ? `${format(v)} %` : format(v) }));
const alt =
  `Graphique à puces : la part du bas-carbone dans l’électricité de six pays européens, ${BEFORE} contre ${AFTER}, ` +
  `sur une piste allant jusqu’à 100 %. ${french(moved.key)} progresse de ${one(moved.marker)} % à ${one(moved.measure)} %, ` +
  `soit +${one(moved.measure - moved.marker)} points, et reste la seule des six sous la moitié.`;

/** One state per card; see `bullet-drive.mjs` for what each field paints. */
const STATES = [
  { marker: 1, measure: 0, reorder: 0, verdict: 0, half: 0, zoom: 0 },
  { marker: 1, measure: 1, reorder: 0, verdict: 0, half: 0, zoom: 0 },
  { marker: 1, measure: 1, reorder: 1, verdict: 1, half: 0, zoom: 0 },
  { marker: 1, measure: 1, reorder: 1, verdict: 1, half: 1, zoom: 0 },
  { marker: 1, measure: 1, reorder: 1, verdict: 1, half: 0, zoom: 1 },
  { marker: 1, measure: 1, reorder: 0, verdict: 1, half: 0, zoom: 0 },
];

const textPerRegister = {
  display: title.join(" "),
  eyebrow: EYEBROW,
  body: `${prose.flat().join(" ")} ${source}`,
  axis: `${ticks.map((t) => t.label).join(" ")} ${zoomTicks.map((t) => t.label).join(" ")}`,
  annot: `${rows.map((r) => r.label).join(" ")} ${markerLabel} ${measureLabel} ${halfLabel}`,
  value: `${rows.map((r) => r.verdict).join(" ")} +0123456789, pts`,
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
      steps: prose.map((p, i) => ({ id: ["pistes", "2015", "2024", "gain", "zoom", "retour"][i], prose: p })),
      reveal: {
        element: createElement(DirectedBulletScrolly, {
          rows,
          subject: moved.key,
          ceiling: 100,
          markerLabel,
          measureLabel,
          halfLabel,
          ticks,
          zoomTicks,
          zoomFrom: ZOOM_FROM,
          orderBefore,
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
