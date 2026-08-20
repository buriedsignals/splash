/**
 * RFC 4180 row tokeniser, inlined here rather than imported — no cross-skill runtime import, and
 * a proof/story workspace is not a skill either. A naive comma split corrupts a quoted thousands
 * separator ("1,234.5") or a quoted name carrying its own comma ("Netherlands, the"); this walks
 * the text one character at a time instead. Returns one array of raw field strings per row
 * (header included), quotes stripped, doubled quotes un-escaped, and a lone CR or CRLF closing a
 * row the same way LF does.
 */
function parseCsvRows(text) {
  const rows = [];
  let row = [];
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

/**
 * The beat's own reading layer. Nothing here draws; nothing that draws computes a fact.
 *
 * Every number this beat says out loud comes from a field of `deriveFacts`. `render.mjs` builds its
 * prose as a FUNCTION of that object, never as a string with a figure typed into it — including the
 * one figure that is about the picture rather than about the data ("at this scale 2020's fall is
 * x% of the plot's own height"), which is derived from the beat's own first state so that changing
 * the axis would change the sentence.
 */

export type Reading = { year: number; value: number };

/** `Entity,Code,Year,Life expectancy` — the frozen Our World in Data fetch, one row per year. */
export function parseReadings(csv: string): Reading[] {
  const [header, ...lines] = parseCsvRows(csv.trim());
  const columns = (header ?? []);
  const yearAt = columns.indexOf("Year");
  const valueAt = columns.indexOf("Life expectancy");
  const entityAt = columns.indexOf("Entity");
  if (yearAt < 0 || valueAt < 0 || entityAt < 0)
    throw new Error(
      `csv has no Entity / Year / Life expectancy column, got: ${header}`,
    );
  const entities = new Set<string>();
  const readings = lines
    .filter((line) => line.trim())
    .map((line) => {
      const cells = line;
      entities.add(cells[entityAt] ?? "");
      return { year: Number(cells[yearAt]), value: Number(cells[valueAt]) };
    })
    .sort((a, b) => a.year - b.year);
  // The Our World in Data grapher endpoint silently returns the whole global dataset unless the
  // fetch asked it not to; a beat about one country drawn over 200 of them would not look wrong,
  // it would look busy. Checked against the file rather than trusted.
  if (entities.size !== 1)
    throw new Error(
      `expected one entity in the frozen file, got ${[...entities].join(", ")}`,
    );
  const gaps = readings.filter(
    (r, i) => i > 0 && r.year !== readings[i - 1]!.year + 1,
  );
  if (gaps.length)
    throw new Error(
      `the series has ${gaps.length} gap(s), first at ${gaps[0]!.year}; every claim below assumes one row per year`,
    );
  return readings;
}

export type Fall = { year: number; drop: number; from: number; to: number };

export type LifeFacts = {
  entity: string;
  readings: Reading[];
  firstYear: number;
  lastYear: number;
  firstValue: number;
  lastValue: number;
  gain: number;
  years: number;
  /** Every year-on-year fall, steepest first. */
  falls: Fall[];
  worst: Fall;
  secondWorst: Fall;
  worstRatio: number;
  /** The first year after the worst fall at or above the level of the year before it. */
  recoveryYear: number;
  recoveryYears: number;
  covid: Fall;
  /** The most recent year before the covid-era fall whose own fall was at least as steep. */
  lastFallAsSteepAsCovid: Fall;
  covidRatio: number;
  decadeFrom: number;
  decadeLo: number;
  decadeHi: number;
  fullLo: number;
  fullHi: number;
};

export function entityOf(csv: string): string {
  const [, first] = parseCsvRows(csv.trim());
  const columns = parseCsvRows(csv.trim())[0]!;
  return (first ?? "")[columns.indexOf("Entity")] ?? "";
}

export function deriveFacts(readings: Reading[], entity: string): LifeFacts {
  const first = readings[0]!;
  const last = readings[readings.length - 1]!;

  const falls: Fall[] = readings
    .slice(1)
    .map((r, i) => ({
      year: r.year,
      drop: readings[i]!.value - r.value,
      from: readings[i]!.value,
      to: r.value,
    }))
    .filter((f) => f.drop > 0)
    .sort((a, b) => b.drop - a.drop);

  const worst = falls[0]!;
  const secondWorst = falls[1]!;

  const beforeWorst = readings.find((r) => r.year === worst.year - 1)!;
  const recovery = readings.find(
    (r) => r.year > worst.year && r.value >= beforeWorst.value,
  );
  if (!recovery)
    throw new Error(
      `the series never returns to its ${beforeWorst.year} level; the recovery claim would be false`,
    );

  // The most recent fall this beat's last step is about. Named by POSITION in the record — the
  // steepest fall of the last quarter-century — rather than by a year typed in here.
  const recent = falls
    .filter((f) => f.year >= last.year - 25)
    .sort((a, b) => b.drop - a.drop);
  const covid = recent[0]!;
  const earlierAsSteep = falls
    .filter((f) => f.year < covid.year && f.drop >= covid.drop)
    .sort((a, b) => b.year - a.year)[0];
  if (!earlierAsSteep)
    throw new Error(
      `no earlier fall is as steep as ${covid.year}'s; the "largest since" claim would be false`,
    );

  const decadeFrom = last.year - 11;
  const decade = readings.filter((r) => r.year >= decadeFrom);
  const decadeLo = Math.min(...decade.map((r) => r.value));
  const decadeHi = Math.max(...decade.map((r) => r.value));
  const fullLo = Math.min(...readings.map((r) => r.value));
  const fullHi = Math.max(...readings.map((r) => r.value));

  return {
    entity,
    readings,
    firstYear: first.year,
    lastYear: last.year,
    firstValue: first.value,
    lastValue: last.value,
    gain: last.value - first.value,
    years: last.year - first.year,
    falls,
    worst,
    secondWorst,
    worstRatio: worst.drop / secondWorst.drop,
    recoveryYear: recovery.year,
    recoveryYears: recovery.year - beforeWorst.year,
    covid,
    lastFallAsSteepAsCovid: earlierAsSteep,
    covidRatio: worst.drop / covid.drop,
    decadeFrom,
    decadeLo,
    decadeHi,
    fullLo,
    fullHi,
  };
}

/** One decimal, the precision every figure on this beat is stated at. */
export function t1(value: number): string {
  return value.toFixed(1);
}

/** Two decimals, for the one figure a single decimal would round to nothing. */
export function t2(value: number): string {
  return value.toFixed(2);
}
