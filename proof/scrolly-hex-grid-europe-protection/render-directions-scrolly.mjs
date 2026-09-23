// Ukrainians under temporary protection in Europe, one hexagon per country, rendered once per FILED DIRECTION into a
// self-contained scrolly page. The `hex grid` type in the scrolly format.
//
// THE SUBJECT OF `static-hex-grid-europe-protection`, CHOREOGRAPHED. The layout, the rates, the claim and its
// assertions are the static beat's own; the scroll tells them with its own gestures
// (`scrolly/references/directed-type-choreography.md`):
//
//   1. the grid, uncoloured;
//   2. coloured by count: Germany and Poland darkest;
//   3. the same cells coloured per 1 000 inhabitants: Czechia darkest;
//   4. the cells leave the map for a ranking by rate;
//   5. back on the map, Czechia and Germany ringed;
//   6. the pull back.
//
// Usage:  bun proof/scrolly-hex-grid-europe-protection/render-directions-scrolly.mjs

import { readdirSync } from "node:fs";
import { readFile, rm } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createElement } from "react";
import { deriveFurniture } from "#shared/chart-beat/render-still.mjs";
import { adjustToContrast, contrast, mix, NON_TEXT_CONTRAST_MIN, readPalette } from "#shared/chart-beat/colour.mjs";
import { readDirection } from "#shared/design-base/read-direction.mjs";
import { composeDirections, report } from "#shared/design-base/compose.mjs";
import { resolveDirectionFamilies } from "#shared/design-base/resolve-families.mjs";
import { plainSpaces, webRegisters } from "#shared/design-base/web.mjs";
import { EYEBROW_TO_DISPLAY, gapOf, registerOf } from "#shared/design-base/register.mjs";
import { validateExpressions } from "#shared/map-beat/mount.mjs";
import { validateScrollyPlan } from "#shared/map-beat/scrolly.mjs";
import { plateTints } from "#shared/map-beat/tints.mjs";
import { renderScrolly } from "../../skills/scrolly/scripts/render-scrolly.mjs";
import { openLiveMapCards, renderWithCardImages } from "../../skills/scrolly/scripts/live-map-cards-bake.mjs";
import { fitCamera, hexMapPlan, iso2Of } from "./plan.mjs";
import { DirectedHexScrolly } from "./DirectedHexScrolly.tsx";

const HERE = dirname(fileURLToPath(import.meta.url));
const DIRECTIONS = join(HERE, "..", "..", "docs", "design-base", "directions");
const OUT = join(HERE, "renders");
const FALLBACK = join(HERE, "fallback");
/** The live map's window and reference stage: a plain, unmoving backdrop (this beat's grid is "designed, not
 *  measured" — see `plan.mjs`), so neither has to align with the hex layout's own pixels. */
const WINDOW = [-25, 34, 45, 72];
const REFERENCE = { width: 1200, height: 700 };
const ONLY = process.argv.includes("--only") ? process.argv[process.argv.indexOf("--only") + 1] : null;
const EYEBROW = "Migrations · Europe";
const NB = " ";
const ORIGIN = "UKR";
const SUBJECT = "CZE";
/** The static beat's designed layout: odd rows offset by half a cell. */
const GRID = [
  ".   ISL .   .   NOR SWE FIN .",
  ".   .   IRL DNK .   EST LVA .",
  ".   .   NLD DEU POL LTU UKR .",
  ".   BEL LUX CHE CZE SVK HUN ROU",
  "PRT ESP FRA LIE AUT SVN HRV BGR",
  ".   .   MLT ITA .   GRC CYP .",
];
const NAMES = {
  DEU: ["Allemagne", "l’Allemagne"], POL: ["Pologne", "la Pologne"], CZE: ["Tchéquie", "la Tchéquie"], ESP: ["Espagne"], ROU: ["Roumanie"],
  SVK: ["Slovaquie"], NLD: ["Pays-Bas"], IRL: ["Irlande"], BEL: ["Belgique"], AUT: ["Autriche"], NOR: ["Norvège"], BGR: ["Bulgarie"],
  CHE: ["Suisse"], FIN: ["Finlande"], PRT: ["Portugal"], FRA: ["France", "la France"], DNK: ["Danemark"], LTU: ["Lituanie"], HUN: ["Hongrie"],
  SWE: ["Suède"], GRC: ["Grèce"], ITA: ["Italie"], LVA: ["Lettonie"], EST: ["Estonie"], HRV: ["Croatie"], CYP: ["Chypre"], SVN: ["Slovénie"],
  ISL: ["Islande"], LUX: ["Luxembourg"], MLT: ["Malte"], LIE: ["Liechtenstein"], UKR: ["Ukraine", "l’Ukraine"],
};

// ── the readings, the layout checked both ways, the claim asserted ─────────────────────────────
const readCsv = async (name) => {
  const lines = (await readFile(join(HERE, name), "utf8")).trim().split(/\r?\n/);
  const header = lines[0].split(",");
  return lines.slice(1).map((l) => Object.fromEntries(l.split(",").map((v, i) => [header[i], v])));
};
const protection = await readCsv("protection.csv");
const population = await readCsv("population.csv");
const people = Object.fromEntries(protection.map((r) => [r.code, Number(r.people)]));
const inhabitants = Object.fromEntries(population.map((r) => [r.code, Number(r.population_2023)]));
const month = protection[0].month;
const hosts = protection.map((r) => r.code);
for (const code of hosts) {
  if (!(people[code] > 0)) throw new Error(`${code} has no usable count`);
  if (!(inhabitants[code] > 0)) throw new Error(`${code} has no population in the frozen file`);
}
const rate = (code) => (people[code] / inhabitants[code]) * 1000;
const cells = [];
GRID.forEach((row, r) => row.trim().split(/\s+/).forEach((code, col) => code !== "." && cells.push({ code, row: r, col })));
const laidOut = new Set(cells.map((c) => c.code));
for (const c of cells) {
  if (c.code !== ORIGIN && !hosts.includes(c.code)) throw new Error(`the layout places ${c.code}, which the protection file does not report`);
  if (!NAMES[c.code]) throw new Error(`${c.code} has no French name filed`);
}
for (const code of hosts) if (!laidOut.has(code)) throw new Error(`${code} is reported and has no cell in the layout`);
const ranked = [...hosts].sort((a, b) => rate(b) - rate(a));
const byCount = [...hosts].sort((a, b) => people[b] - people[a]);
const [top, largest, last] = [ranked[0], byCount[0], ranked[ranked.length - 1]];
if (top !== SUBJECT) throw new Error(`the headline says ${SUBJECT} leads per inhabitant; ${top} does`);
if (largest === top) throw new Error("the headline says the ranking turns over between counts and rates; the same country leads both");
const largestRank = ranked.indexOf(largest) + 1;
if (!(largestRank > 5)) throw new Error(`a card says the largest host falls a long way per inhabitant; it is ${largestRank}th`);
const secondCount = byCount[1];
if (!NAMES[largest][1] || !NAMES[secondCount][1] || !NAMES[last][1]) throw new Error("a card names a country with no article filed");
const topCount = byCount.indexOf(top) + 1;
if (hosts.filter((code) => people[code] >= 500000).join() !== [largest, secondCount].join()) throw new Error("the second card says the two largest counts are the darkest cells; the top count class holds other countries");

const COUNT_BREAKS = [50000, 100000, 250000, 500000];
const RATE_BREAKS = [5, 12, 18, 25];
const classBy = (breaks, v) => breaks.filter((b) => v >= b).length;
const n0 = (v) => plainSpaces(Math.round(v).toLocaleString("fr-FR"));
const one = (v) => plainSpaces(v.toLocaleString("fr-FR", { minimumFractionDigits: 1, maximumFractionDigits: 1 }));
const tiles = cells.map((c) => {
  const origin = c.code === ORIGIN;
  return {
    ...c,
    name: NAMES[c.code][0],
    count: origin ? null : people[c.code],
    rate: origin ? null : rate(c.code),
    countClass: origin ? null : classBy(COUNT_BREAKS, people[c.code]),
    rateClass: origin ? null : classBy(RATE_BREAKS, rate(c.code)),
    rateText: origin ? "" : one(rate(c.code)),
  };
});
const cap = (s) => s[0].toUpperCase() + s.slice(1);
console.log(`${hosts.length} pays · par habitant ${top} ${rate(top).toFixed(1)} · ${largest} ${largestRank}e · ${last} dernier\n`);

// ── the words ──────────────────────────────────────────────────────────────────────────────────
const title = [
  `Par habitant, ce n’est pas l’Allemagne : la ${NAMES[top][0]} accueille ${one(rate(top))} Ukrainiens pour 1${NB}000 habitants`,
  `Par habitant, la ${NAMES[top][0]} accueille ${one(rate(top))} Ukrainiens pour 1${NB}000 habitants`,
  `La protection temporaire, par habitant`,
];
const prose = [
  [`Un hexagone par pays européen, tous de même taille, rangés à peu près comme la carte. ${cap(NAMES[ORIGIN][1])}, d’où viennent les personnes comptées, est grisée.`],
  [`Coloriée selon le nombre d’Ukrainiens sous protection temporaire, la grille met ${NAMES[largest][1]} en tête (${n0(people[largest])}), puis ${NAMES[secondCount][1]} (${n0(people[secondCount])}).`],
  [`Rapportons ce nombre à la population. La ${NAMES[top][0]}, ${topCount}e en nombre, devient la plus foncée : ${one(rate(top))} pour 1${NB}000 habitants.`],
  [`Rangés par taux, les pays se réordonnent : ${NAMES[top][1]} en tête, ${NAMES[largest][1]} ${largestRank}e, ${NAMES[last][1]} dernière à ${one(rate(last))}.`],
  [`${cap(NAMES[top][1])} accueille ${one(rate(top))} Ukrainiens pour 1${NB}000 habitants, ${NAMES[largest][1]} ${one(rate(largest))}.`],
  [`Lecture : chaque pays pèse une case, quelle que soit sa taille. La disposition est dessinée à la main, pas mesurée.`],
];
const source = `Sources : Eurostat (migr_asytpsm), ${month} · population 2023, via Our World in Data`;
const words = {
  countUnit: "Ukrainiens sous protection temporaire",
  rateUnit: `Ukrainiens sous protection temporaire pour 1${NB}000 habitants`,
  countNote: `${NAMES[largest][0]}${NB}: ${n0(people[largest])} personnes`,
  rateNote: `${NAMES[top][0]}${NB}: ${one(rate(top))} pour 1${NB}000`,
  rankNote: `${NAMES[largest][0]} ${largestRank}e sur ${hosts.length}`,
  pairNote: `${one(rate(top))} contre ${one(rate(largest))} pour 1${NB}000`,
  originNote: `L’Ukraine est sur la grille et hors du compte : c’est d’elle que viennent les personnes que les autres cases comptent.`,
};
// grounded-by-hand: alt:1000 — the denominator of the rate the stage draws, declared by the beat
// and printed in its own unit line; it is not a reading from either frozen file.
const alt =
  `Grille d’hexagones, un par pays européen. Par nombre, ${NAMES[largest][1]} accueille le plus d’Ukrainiens sous protection temporaire ; ` +
  `pour 1 000 habitants, ${NAMES[top][1]} est en tête avec ${one(rate(top))}, ${NAMES[largest][1]} est ${largestRank}e avec ${one(rate(largest))}.`;

/** One state per card; see `hex-drive.mjs` for what each field paints. Unchanged from the validated choreography. */
const STATES_RAW = [
  { fill: 0, rate: 0, rank: 0, pair: 0 },
  { fill: 1, rate: 0, rank: 0, pair: 0 },
  { fill: 1, rate: 1, rank: 0, pair: 0 },
  { fill: 1, rate: 1, rank: 1, pair: 0 },
  { fill: 1, rate: 1, rank: 0, pair: 1 },
  { fill: 1, rate: 1, rank: 0, pair: 0 },
];
/** The live map's one, unmoving camera; every card carries it (`hex-drive.mjs`, `plan.mjs`). */
const camera = fitCamera({ west: WINDOW[0], south: WINDOW[1], east: WINDOW[2], north: WINDOW[3] }, REFERENCE);
const STATES = STATES_RAW.map((state) => ({ ...state, ...camera, card: 0 }));
/** The map never changes: one frozen card image covers every scroll card. */
const BAKE_STATES = STATES.slice(0, 1);

const textPerRegister = {
  display: title.join(" "),
  eyebrow: EYEBROW,
  body: `${prose.flat().join(" ")} ${source}`,
  axis: `${words.countUnit} ${words.rateUnit} ${words.originNote} ${tiles.map((t) => t.code).join(" ")} 50 k 100 k 250 k 500 k 0123456789,`,
  annot: "",
  value: `${words.countNote} ${words.rateNote} ${words.rankNote} ${words.pairNote} ${tiles.map((t) => t.rateText).join(" ")}`,
};

const filed = readdirSync(DIRECTIONS)
  .filter((f) => f.endsWith(".md"))
  .map((f) => readDirection(join(DIRECTIONS, f)));
const newsroom = readPalette(HERE);
const BEAT_FACTS = { evidenceLevels: 4 };
console.log(report(composeDirections({ newsroom, filed, beat: BEAT_FACTS, textPerRegister }), { beat: BEAT_FACTS }));
console.log("");

for (const code of hosts) iso2Of(code); // every host joins MapTiler Countries, or refuses loudly here
iso2Of(ORIGIN);

const cards = await openLiveMapCards();
const driver = `${cards.mapScript}\n${await readFile(join(HERE, "hex-drive.mjs"), "utf8")}`;
const refused = [];
try {
  for (const file of readdirSync(DIRECTIONS).filter((f) => f.endsWith(".md"))) {
    const id = file.replace(/\.md$/, "");
    if (ONLY && id !== ONLY) continue;
    const direction = resolveDirectionFamilies(readDirection(join(DIRECTIONS, file)), textPerRegister);
    const { ink, muted, grid } = deriveFurniture(direction.ground);
    const regs = webRegisters(direction, { ink: { ink, muted, accent: direction.accent } });
    try {
      const ground = direction.ground;
      const { water: sea, land } = plateTints(direction);
      const floorOnGround = (colour, what) => {
        if (contrast(colour, ground) >= NON_TEXT_CONTRAST_MIN) return colour;
        const lifted = adjustToContrast(colour, ground, NON_TEXT_CONTRAST_MIN);
        if (!lifted) throw new Error(`${what} cannot be told from the ground: nothing clears ${NON_TEXT_CONTRAST_MIN}:1 against ${ground}`);
        return lifted;
      };
      const neutral = floorOnGround(mix(ground, ink, 0.22), "the map's host countries");
      const originFill = floorOnGround(mix(ground, ink, 0.16), "the map's Ukraine");
      const mutedInk = adjustToContrast(muted, ground, NON_TEXT_CONTRAST_MIN) ?? muted;
      const colours = { sea, land, neutral, originFill, originEdge: mutedInk, border: grid };
      const strokes = { border: direction.stroke?.hairline ?? 0.6 };

      const mapPlan = hexMapPlan({ hosts, origin: ORIGIN, colours, strokes, camera, referenceWidth: REFERENCE.width, referenceHeight: REFERENCE.height });
      const violations = [...validateScrollyPlan(mapPlan, STATES), ...validateExpressions(mapPlan)];
      if (violations.length) throw new Error(`the plan is not renderable:\n  ${violations.join("\n  ")}`);

      const renderPage = (fallbacks) =>
        renderScrolly({
          steps: prose.map((p, i) => ({ id: ["grille", "par-nombre", "par-habitant", "classement", "tchequie-allemagne", "lecture"][i], prose: p })),
          reveal: {
            element: createElement(DirectedHexScrolly, {
              plan: mapPlan,
              fallbacks,
              reference: REFERENCE,
              tiles,
              ranked,
              subject: SUBJECT,
              largest,
              countBreaks: COUNT_BREAKS.map((b) => `${n0(b / 1000)}${NB}k`),
              rateBreaks: RATE_BREAKS.map((b) => one(b)),
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
            apply: "applyHexState",
          },
          vendor: [{ js: cards.maplibreJs, css: cards.maplibreCss }],
          title,
          eyebrow: EYEBROW,
          source,
          ground: direction.ground,
          type: { eyebrow: { ...regs.eyebrow, marginBottom: `${gapOf(registerOf(direction, "eyebrow"), EYEBROW_TO_DISPLAY)}px` }, display: regs.display, body: regs.body, source: regs.body },
          lang: "fr",
          outDir: OUT,
          name: `${id}.html`,
        });

      const { outPath } = await renderWithCardImages(cards, {
        id,
        plan: mapPlan,
        states: BAKE_STATES,
        fallbackDir: FALLBACK,
        stageGround: ground,
        cardOf: (baked) => ({ zoom: baked.zoom }),
        renderPage,
        noBake: process.argv.includes("--no-bake"),
      });
      console.log(`${id} -> ${outPath.replace(`${HERE}/`, "")}`);
    } catch (error) {
      await rm(join(OUT, `${id}.html`), { force: true });
      refused.push({ id, why: error.message });
      console.log(`${id} REFUSED — ${error.message}`);
    }
  }
} finally {
  await cards.close();
}
if (refused.length) {
  console.log(`\nrefused by ${refused.length}: ${refused.map((x) => x.id).join(", ")}`);
  process.exitCode = 1;
}
