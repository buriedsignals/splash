// THE SUBJECT OF `static-heatmap-europe-electricity`, LOADED AND ASSERTED — Europe's 2024 electricity mix, the twelve rows
// the static plate draws, their shares of nine sources, the seven countries past 94 % low-carbon and their three routes:
// the static beat's own derivation (`render-directions.mjs` there runs it inline and exports nothing), read from its frozen
// file.
//
// Runs in Bun only.

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
export const STATIC_DIR = join(HERE, "..", "static-heatmap-europe-electricity");
export const YEAR = 2024;
export const FLOOR = 94;
export const ROWS_DRAWN = 12;
export const ABOVE = 7;
export const BREAKS = [2, 5, 10, 20, 40];

/** The column order is the static plate's: the five renewables, then nuclear, then the three fossil sources. */
export const SOURCES = [
  { key: "hydro_generation__twh", label: "Hydraulique", family: "renouvelables" },
  { key: "wind_generation__twh", label: "Éolien", family: "renouvelables" },
  { key: "solar_generation__twh", label: "Solaire", family: "renouvelables" },
  { key: "bioenergy_stacked_generation__twh", label: "Bioénergie", family: "renouvelables" },
  { key: "other_renewables_generation__twh", label: "Autres", family: "renouvelables" },
  { key: "nuclear_generation__twh", label: "Nucléaire", family: "nucléaire" },
  { key: "gas_generation__twh", label: "Gaz", family: "fossiles" },
  { key: "coal_generation__twh", label: "Charbon", family: "fossiles" },
  { key: "oil_generation__twh", label: "Pétrole", family: "fossiles" },
];
export const NUCLEAR_COLUMN = SOURCES.findIndex((s) => s.family === "nucléaire");

/** The three routes, in the order the video sets them: without nuclear, both, nuclear-led. */
export const ROUTES = ["renouvelables", "les deux", "nucléaire"];

const FRENCH = {
  Albania: "Albanie", Austria: "Autriche", Belarus: "Biélorussie", Belgium: "Belgique", "Bosnia and Herzegovina": "Bosnie-Herzégovine",
  Bulgaria: "Bulgarie", Croatia: "Croatie", Cyprus: "Chypre", Czechia: "Tchéquie", Denmark: "Danemark", Estonia: "Estonie",
  Finland: "Finlande", France: "France", Germany: "Allemagne", Greece: "Grèce", Hungary: "Hongrie", Iceland: "Islande",
  Ireland: "Irlande", Italy: "Italie", Latvia: "Lettonie", Lithuania: "Lituanie", Luxembourg: "Luxembourg", Malta: "Malte",
  Moldova: "Moldavie", Montenegro: "Monténégro", Netherlands: "Pays-Bas", "North Macedonia": "Macédoine du Nord", Norway: "Norvège",
  Poland: "Pologne", Portugal: "Portugal", Romania: "Roumanie", Russia: "Russie", Serbia: "Serbie", Slovakia: "Slovaquie",
  Slovenia: "Slovénie", Spain: "Espagne", Sweden: "Suède", Switzerland: "Suisse", Turkey: "Turquie", Ukraine: "Ukraine",
  "United Kingdom": "Royaume-Uni",
};
const french = (entity) => {
  if (!FRENCH[entity]) throw new Error(`no French name recorded for ${entity}`);
  return FRENCH[entity];
};

export function loadSubject({ dir = STATIC_DIR } = {}) {
  const lines = readFileSync(join(dir, "data.csv"), "utf8").trim().split(/\r?\n/);
  const header = lines[0].split(",");
  const measured = lines.slice(1).map((l) => {
    const cells = l.split(",");
    const raw = Object.fromEntries(header.map((h, i) => [h, cells[i]]));
    if (Number(raw.year) !== YEAR) throw new Error(`${raw.entity} is not ${YEAR}`);
    const twh = SOURCES.map((s) => Number(raw[s.key] || 0));
    return { raw, twh, total: twh.reduce((a, b) => a + b, 0) };
  });
  const unreported = measured.filter((m) => !(m.total > 0)).map((m) => m.raw.entity);

  const renewable = SOURCES.map((s, i) => (s.family === "renouvelables" ? i : -1)).filter((i) => i >= 0);
  const every = measured
    .filter((m) => m.total > 0)
    .map(({ raw, twh, total }) => {
      const shares = twh.map((v) => (v / total) * 100);
      const renewables = renewable.reduce((sum, i) => sum + shares[i], 0);
      const nuclear = shares[NUCLEAR_COLUMN];
      return { key: raw.entity, label: french(raw.entity), total, shares, renewables, nuclear, lowCarbon: renewables + nuclear };
    })
    .sort((a, b) => b.lowCarbon - a.lowCarbon);

  // The floor is checked over the whole frozen file, never over the drawn rows.
  const above = every.filter((r) => r.lowCarbon > FLOOR);
  if (above.length !== ABOVE) throw new Error(`the title says ${ABOVE} European countries clear ${FLOOR} % low-carbon; ${above.length} do`);
  const biggest = every
    .filter((r) => !above.includes(r))
    .sort((a, b) => b.total - a.total)
    .slice(0, ROWS_DRAWN - above.length);
  const rows = [...above, ...biggest].sort((a, b) => b.lowCarbon - a.lowCarbon);
  if (rows.length !== ROWS_DRAWN) throw new Error(`the matrix draws ${ROWS_DRAWN} rows; the rule selected ${rows.length}`);
  if (rows.slice(0, ABOVE).some((r) => r.lowCarbon <= FLOOR)) throw new Error("the countries past the floor are not the first rows");

  // THE THREE ROUTES, a partition of the seven, each checked.
  const routeOf = (r) => (r.nuclear === 0 ? 0 : r.nuclear > 0 && r.nuclear < 50 && r.renewables >= 50 ? 1 : r.nuclear >= 50 ? 2 : -1);
  const route = rows.map((r, i) => (i < ABOVE ? routeOf(r) : null));
  if (route.some((g) => g === -1)) throw new Error("a country past the floor takes none of the three routes");
  ROUTES.forEach((name, g) => {
    if (!route.includes(g)) throw new Error(`the video names three routes; « ${name} » is empty`);
  });

  const largest = every.reduce((a, b) => (b.total > a.total ? b : a));
  if (rows.at(-1).key !== largest.key) throw new Error(`the last row is ${rows.at(-1).label}, not Europe's largest producer ${largest.label}`);

  // Every row sums to its whole.
  rows.forEach((r) => {
    const sum = r.shares.reduce((a, b) => a + b, 0);
    if (Math.abs(sum - 100) > 1e-9) throw new Error(`${r.label}'s shares sum to ${sum}, not 100`);
  });

  return { rows, route, unreported, nuclearLed: rows[route.indexOf(2)] };
}
