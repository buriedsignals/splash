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
 * REPLACE ME with your own beat's data reading. Do not parameterise me.
 *
 * This seed's own data layer: the two frozen files under `sample-data/` in, the handful of facts
 * this beat actually claims out. Nothing here draws anything, and nothing that draws anything
 * computes a fact — that separation is the whole point of this file existing.
 *
 * **Why a beat's prose is computed, not typed.** The single most common defect this project has
 * found in its own rendered output is a number typed by hand into a title, a caption or an alt
 * text that its own data does not support — one beat in four carried one. Every figure this seed
 * says out loud (the count of readings, the highest, the lowest, the ratio between them, the
 * median, the drainage area) is returned by `deriveFacts`/`readStation` below, from the frozen
 * files, and `ScrollySeed.tsx`'s own `STEPS_META` receives them as an argument rather than
 * repeating them. A correction to the data is therefore a correction to the prose, mechanically.
 */

/** One day's own reading: the date as the USGS publishes it, and the daily MEAN discharge in cubic
 *  feet per second (parameter 00060, statistic 00003). */
export type Reading = { date: string; value: number };

/** The gauge itself, read out of the frozen USGS site file rather than typed here. */
export type Station = {
  id: string;
  name: string;
  lon: number;
  lat: number;
  /** Drainage area upstream of the gauge, square miles — the USGS's own `drain_area_va`. */
  drainageSqMi: number;
};

/** Everything this beat claims out loud about the year of readings, each one computed. */
export type GaugeFacts = {
  count: number;
  year: string;
  peak: Reading;
  low: Reading;
  median: number;
  /** Highest reading divided by lowest, one decimal place. */
  ratio: number;
};

/**
 * USGS RDB is tab-separated with TWO header rows: the column names, then a row of format codes
 * (`5s`, `15s`, `20d`, ...) that is not data. Comment lines start with `#`. Parsing it as plain TSV
 * without dropping the format row silently yields one junk record — the kind of off-by-one that
 * survives every test that only ever looks at `rows.length > 0`.
 */
export function parseRdb(text: string): Record<string, string>[] {
  const lines = text
    .split(/\r?\n/)
    .filter((line) => line.length > 0 && !line.startsWith("#"));
  if (lines.length < 2)
    throw new Error("RDB file has no header and format row");
  const columns = lines[0].split("\t");
  const isFormatRow = /^\d+[sndp]$/.test(
    (lines[1].split("\t")[0] ?? "").trim(),
  );
  if (!isFormatRow)
    throw new Error(
      "RDB file's second line is not the format row — refusing to read the first data row as headers",
    );
  return lines.slice(2).map((line) => {
    const cells = line.split("\t");
    const row: Record<string, string> = {};
    columns.forEach((name, i) => (row[name] = cells[i] ?? ""));
    return row;
  });
}

/** Reads the frozen daily-values file. The discharge column's own name carries the USGS timeseries
 *  id (`68426_00060_00003`), which is why it is found by SUFFIX rather than by a literal — a
 *  different site would publish the same statistic under a different id. */
export function parseReadings(csv: string): Reading[] {
  const lines = parseCsvRows(csv).filter((l) => l.length > 0);
  const header = lines[0];
  const dateAt = header.indexOf("date");
  const valueAt = header.indexOf("discharge_cfs");
  if (dateAt < 0 || valueAt < 0)
    throw new Error(`expected date,discharge_cfs columns, got: ${lines[0]}`);
  return lines.slice(1).map((line) => {
    const cells = line;
    const value = Number(cells[valueAt]);
    if (!Number.isFinite(value))
      throw new Error(
        `non-numeric reading on ${cells[dateAt]}: ${cells[valueAt]}`,
      );
    return { date: cells[dateAt], value };
  });
}

/** The station, out of the frozen USGS site file — never re-typed into a component or a script. */
export function readStation(rdbText: string): Station {
  const row = parseRdb(rdbText)[0];
  if (!row) throw new Error("frozen site file carries no station row");
  const num = (name: string) => {
    const value = Number(row[name]);
    if (!Number.isFinite(value))
      throw new Error(`site file's ${name} is not a number: ${row[name]}`);
    return value;
  };
  return {
    id: row.site_no,
    // The USGS publishes station names in upper case; this beat prints them in ordinary sentence
    // case, which is a typographic choice, never a change to the name itself.
    name: titleCase(row.station_nm),
    lon: num("dec_long_va"),
    lat: num("dec_lat_va"),
    drainageSqMi: num("drain_area_va"),
  };
}

/** `POTOMAC RIVER AT POINT OF ROCKS, MD` → `Potomac River at Point of Rocks, MD`. Two-letter state
 *  abbreviations and the joining words keep their own conventional case. */
function titleCase(name: string): string {
  const small = new Set(["at", "near", "above", "below", "of", "the", "and"]);
  return name
    .toLowerCase()
    .split(" ")
    .map((word, i) => {
      if (
        /^[a-z]{2},?$/.test(word) &&
        i > 0 &&
        !small.has(word.replace(",", ""))
      )
        return word.toUpperCase();
      if (i > 0 && small.has(word)) return word;
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(" ");
}

export function deriveFacts(readings: Reading[]): GaugeFacts {
  if (readings.length === 0)
    throw new Error("no readings to derive facts from");
  const peak = readings.reduce((a, b) => (b.value > a.value ? b : a));
  const low = readings.reduce((a, b) => (b.value < a.value ? b : a));
  const sorted = [...readings].map((r) => r.value).sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  const median =
    sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
  const years = new Set(readings.map((r) => r.date.slice(0, 4)));
  if (years.size !== 1)
    throw new Error(
      `this beat's prose says "a year"; the frozen file spans ${[...years].join(", ")}`,
    );
  return {
    count: readings.length,
    year: [...years][0],
    peak,
    low,
    median,
    ratio: Math.round((peak.value / low.value) * 10) / 10,
  };
}

/** `76500` → `76,500`. English thousands grouping, the register this beat's own prose is written
 *  in — never a locale-dependent `toLocaleString`, whose output would change with the machine that
 *  rendered the beat. */
export function group(value: number): string {
  const rounded = Math.round(value);
  return String(rounded).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

/** `2024-04-04` → `4 April`. The year is carried once by the beat's own header, not repeated on
 *  every date in the prose. */
export function dayAndMonth(isoDate: string): string {
  const [, month, day] = isoDate.split("-");
  return `${Number(day)} ${MONTHS[Number(month) - 1]}`;
}
