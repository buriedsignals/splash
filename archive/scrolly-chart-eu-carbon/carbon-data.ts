/**
 * This beat's own reading layer. Nothing here draws; nothing that draws computes a fact.
 *
 * The whole point of the beat is that FOUR different charts are built from ONE column of numbers,
 * so there is exactly one parser and one `deriveFacts` — every figure any of the four frames or any
 * step's prose says out loud comes from here, and a frame that wanted a number the others could not
 * see would have to add it here first, in the open.
 *
 * `eu-co2-per-capita.csv` is frozen beside this file, byte-identical (same md5) to the copy
 * `proof/webz-diverging-bar-eu-per-capita` freezes — Global Carbon Budget (2025), population from
 * various sources, with major processing by Our World in Data, indicator `co-emissions-per-capita`.
 * Tonnes of CO₂ per person, fossil fuels and industry only.
 */

/** One country's reading in one year. */
export type Reading = { country: string; year: number; value: number };

/** A country's pair of readings at the two ends of the window, and the change between them. */
export type Change = {
  country: string;
  first: number;
  last: number;
  change: number;
};

export const WINDOW = { first: 1990, last: 2024 } as const;

/**
 * The header this parser expects, asserted rather than assumed. The column carries a subscript ₂
 * (U+2082) that a re-export could silently drop; a positional read of column 4 would then keep
 * working while reading something else entirely.
 */
const HEADER = "Entity,Code,Year,CO₂ emissions per capita";

export function parseReadings(text: string): Reading[] {
  const lines = text.trim().split(/\r?\n/);
  const header = lines[0].trim();
  if (header !== HEADER)
    throw new Error(
      `eu-co2-per-capita.csv header changed: expected ${JSON.stringify(HEADER)}, got ${JSON.stringify(header)}`,
    );
  const out: Reading[] = [];
  for (const line of lines.slice(1)) {
    if (!line.trim()) continue;
    const cell = line.split(",");
    if (cell.length !== 4)
      throw new Error(`expected 4 cells, got ${cell.length}: ${line}`);
    const year = Number(cell[2]);
    const value = Number(cell[3]);
    if (!Number.isFinite(year) || !Number.isFinite(value))
      throw new Error(`unparseable row: ${line}`);
    out.push({ country: cell[0], year, value });
  }
  return out;
}

/** `country -> year -> tonnes per person`. */
export type Series = Map<string, Map<number, number>>;

export function bySeries(readings: Reading[]): Series {
  const out: Series = new Map();
  for (const r of readings) {
    let s = out.get(r.country);
    if (!s) out.set(r.country, (s = new Map()));
    s.set(r.year, r.value);
  }
  return out;
}

export function median(values: number[]): number {
  if (!values.length) throw new Error("median of an empty set");
  const s = [...values].sort((a, b) => a - b);
  const mid = s.length >> 1;
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

/**
 * Every figure this beat states, in one place.
 *
 * The window is asserted, not hoped for: each of the 27 member states must carry a reading in
 * EVERY year from 1990 to 2024 inclusive. Three of the four frames draw the whole window (the line
 * chart draws all 35 years; the slope and the ranked bar draw its ends), and a country missing a
 * year would leave a line with an invisible hole in it while the ranking beside it stayed complete.
 */
export type CarbonFacts = {
  countries: string[];
  years: number[];
  /** Every country's own pair of end readings, sorted by change, most negative first. */
  changes: Change[];
  /** 2024's readings, highest first. */
  ranked: { country: string; value: number }[];
  /** The median of the 27, one value per year — the line the accent is spent on. */
  medianByYear: { year: number; value: number }[];
  medianFirst: number;
  medianLast: number;
  fell: number;
  rose: number;
  /** The single country whose reading is higher at the end than at the start. */
  riser: Change;
  /** The largest fall. */
  biggestFall: Change;
  /** Its rank in the final year, 1-based. */
  biggestFallRankLast: number;
  highestLast: { country: string; value: number };
  lowestLast: { country: string; value: number };
  ratioLast: number;
  withinOneOfMedian: number;
  withinTwoOfMedian: number;
};

export function deriveFacts(readings: Reading[]): CarbonFacts {
  const series = bySeries(readings);
  const countries = [...series.keys()].sort();
  const years: number[] = [];
  for (let y = WINDOW.first; y <= WINDOW.last; y++) years.push(y);

  for (const c of countries)
    for (const y of years)
      if (!series.get(c)!.has(y))
        throw new Error(
          `${c} has no reading for ${y}; this beat draws the whole ${WINDOW.first}-${WINDOW.last} window for all ${countries.length} member states and a hole in one series would be invisible beside a complete ranking`,
        );

  const changes: Change[] = countries
    .map((country) => {
      const s = series.get(country)!;
      const first = s.get(WINDOW.first)!;
      const last = s.get(WINDOW.last)!;
      return { country, first, last, change: last - first };
    })
    .sort((a, b) => a.change - b.change);

  const ranked = changes
    .map((c) => ({ country: c.country, value: c.last }))
    .sort((a, b) => b.value - a.value);

  const medianByYear = years.map((year) => ({
    year,
    value: median(countries.map((c) => series.get(c)!.get(year)!)),
  }));

  const fell = changes.filter((c) => c.change < 0).length;
  const rose = changes.filter((c) => c.change > 0).length;
  if (rose !== 1)
    throw new Error(
      `this beat's third step names THE one country that emits more per person than in ${WINDOW.first}; the data now shows ${rose}`,
    );
  if (fell + rose !== countries.length)
    throw new Error(
      `${countries.length - fell - rose} member state(s) are exactly flat between ${WINDOW.first} and ${WINDOW.last}; the prose says every one of the rest fell`,
    );

  const riser = changes[changes.length - 1];
  const biggestFall = changes[0];
  const biggestFallRankLast =
    ranked.findIndex((r) => r.country === biggestFall.country) + 1;

  const lastValues = ranked.map((r) => r.value);
  const medianLast = median(lastValues);
  const medianFirst = median(changes.map((c) => c.first));

  return {
    countries,
    years,
    changes,
    ranked,
    medianByYear,
    medianFirst,
    medianLast,
    fell,
    rose,
    riser,
    biggestFall,
    biggestFallRankLast,
    highestLast: ranked[0],
    lowestLast: ranked[ranked.length - 1],
    ratioLast: ranked[0].value / ranked[ranked.length - 1].value,
    withinOneOfMedian: lastValues.filter((v) => Math.abs(v - medianLast) <= 1)
      .length,
    withinTwoOfMedian: lastValues.filter((v) => Math.abs(v - medianLast) <= 2)
      .length,
  };
}

/** One decimal, the precision every figure in this beat's prose is stated at. */
export const t = (v: number) => v.toFixed(1);

/** Two decimals, for the one figure a single decimal would round to zero (Croatia's +0.03). */
export const t2 = (v: number) => v.toFixed(2);
