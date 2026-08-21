/**
 * The story's one reading of its own frozen data.
 *
 * All three beats import this file, so they cannot disagree about a number, a unit, a rounding or
 * a name. Nothing here is typed: every figure below is derived from `source/data.csv`, which is
 * frozen and never written to.
 *
 * Units, fixed once for the whole story:
 *   trips        — millions of trips a year, printed with no decimal (the source has none)
 *   population   — residents, printed with a thin-space thousands group
 *   networkKm    — kilometres of network, printed with no decimal
 *   tripsPerResident — trips / residents, printed with no decimal; it is a RATE, and the story
 *                      says so wherever it appears
 */

export type City = {
  city: string;
  trips: number;
  population: number;
  networkKm: number;
  year: number;
};

/**
 * RFC 4180 row tokeniser, inlined rather than imported — a story workspace is not a skill and may
 * not reach across a skill boundary. A naive comma split corrupts a quoted name carrying its own
 * comma; this walks the text one character at a time instead.
 */
export function parseCsvRows(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  let i = 0;
  while (i < text.length) {
    const char = text[i];
    if (quoted) {
      if (char === '"') {
        if (text[i + 1] === '"') { field += '"'; i += 2; continue; }
        quoted = false; i += 1; continue;
      }
      field += char; i += 1; continue;
    }
    if (char === '"') { quoted = true; i += 1; continue; }
    if (char === ",") { row.push(field); field = ""; i += 1; continue; }
    if (char === "\r") { row.push(field); rows.push(row); row = []; field = ""; i += (text[i + 1] === "\n") ? 2 : 1; continue; }
    if (char === "\n") { row.push(field); rows.push(row); row = []; field = ""; i += 1; continue; }
    field += char; i += 1;
  }
  if (field !== "" || row.length > 0) { row.push(field); rows.push(row); }
  return rows;
}

const REQUIRED = ["city", "trips_millions", "population", "network_km", "year"] as const;

/** The frozen CSV, read into the story's own shape. Throws on anything it did not expect. */
export function readCities(csv: string): City[] {
  const [header, ...rest] = parseCsvRows(csv.trim());
  for (const column of REQUIRED) {
    if (!header.includes(column))
      throw new Error(`source/data.csv has no "${column}" column — it holds ${header.join(", ")}`);
  }
  const index = Object.fromEntries(header.map((name, i) => [name, i]));
  const cities = rest
    .filter((row) => row.some((cell) => cell.trim() !== ""))
    .map((row) => {
      if (row.length !== header.length)
        throw new Error(`row has ${row.length} cells, header has ${header.length}: ${row.join(",")}`);
      const number = (column: string) => {
        const value = Number(row[index[column]]);
        if (!Number.isFinite(value))
          throw new Error(`${row[index.city]} has a non-numeric ${column}: ${row[index[column]]}`);
        return value;
      };
      return {
        city: row[index.city].trim(),
        trips: number("trips_millions"),
        population: number("population"),
        networkKm: number("network_km"),
        year: number("year"),
      };
    });
  if (cities.length < 3) throw new Error(`this story needs at least three city networks, got ${cities.length}`);
  const years = [...new Set(cities.map((c) => c.year))];
  if (years.length !== 1)
    throw new Error(`the frozen data holds several years (${years.join(", ")}); every beat here claims one`);
  return cities;
}

/** Trips per resident. The rate the article never takes, computed in exactly one place. */
export function tripsPerResident(city: City): number {
  return (city.trips * 1e6) / city.population;
}

/** The whole story's number formats, so three beats round the same way. */
export const fmt = {
  trips: (v: number) => `${Math.round(v)}`,
  tripsWithUnit: (v: number) => `${Math.round(v)} m`,
  people: (v: number) => Math.round(v).toLocaleString("en-GB").replace(/,/g, " "),
  km: (v: number) => `${Math.round(v)} km`,
  rate: (v: number) => `${Math.round(v)}`,
  share: (v: number) => `${Math.round(v * 100)}%`,
};

/** The credit line, assembled once from `STORYBOARD.md`'s hand fields. */
export const SOURCE_LINE =
  "Source: city network figures for 2025, compiled by Buried Signals · as of 21 August 2026";
