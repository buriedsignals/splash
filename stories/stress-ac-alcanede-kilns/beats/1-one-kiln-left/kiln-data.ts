// The reading layer for the Alcanede kiln beat. Nothing here draws; nothing that draws computes a
// fact. Every figure the beat says out loud comes from this file, derived from the frozen
// `source/data.csv` — never a number typed into a sentence.

export type Row = {
  year: number;
  kilns: number;
  workers: number;
  lat: number;
  lon: number;
};

export type Facts = {
  rows: Row[];
  first: Row;
  last: Row;
  /** The row after which the article says the decline steepened, found from the data rather than
   *  taken from the article: the largest drop in kilns per year between two consecutive rows. */
  steepest: { from: Row; to: Row; kilnsPerYear: number };
  /** The same rate over the whole span before that pair, so the beat can say "steeper" with two
   *  numbers rather than with an adverb. */
  beforeSteepest: { from: Row; to: Row; kilnsPerYear: number };
  site: { lat: number; lon: number };
  span: { years: number };
  maxWorkers: number;
};

/** A CSV reader that walks fields with a tokenizer rather than cutting a row on every comma —
 *  a bare comma split silently fragments any quoted field that contains one. This file's own
 *  frozen input carries no quotes today; the reader does not depend on that staying true. */
export function parseRows(text: string): Row[] {
  const lines = text.replace(/\r\n/g, "\n").split("\n").filter((l) => l.trim() !== "");
  const header = fields(lines[0]);
  const index = (name: string) => {
    const at = header.indexOf(name);
    if (at < 0) throw new Error(`frozen file has no "${name}" column; it carries ${header.join(", ")}`);
    return at;
  };
  const yearAt = index("year");
  const kilnsAt = index("kilns_active");
  const workersAt = index("workers");
  const latAt = index("site_lat");
  const lonAt = index("site_lon");

  return lines.slice(1).map((line, i) => {
    const cells = fields(line);
    const num = (at: number, name: string) => {
      const value = Number(cells[at]);
      if (!Number.isFinite(value))
        throw new Error(`row ${i + 1}: ${name} is not a number: ${JSON.stringify(cells[at])}`);
      return value;
    };
    return {
      year: num(yearAt, "year"),
      kilns: num(kilnsAt, "kilns_active"),
      workers: num(workersAt, "workers"),
      lat: num(latAt, "site_lat"),
      lon: num(lonAt, "site_lon"),
    };
  });
}

/** One CSV row into its fields, honouring double quotes and doubled quotes inside them. */
function fields(line: string): string[] {
  const out: string[] = [];
  let cell = "";
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (quoted) {
      if (ch === '"' && line[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (ch === '"') quoted = false;
      else cell += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ",") {
      out.push(cell.trim());
      cell = "";
    } else cell += ch;
  }
  out.push(cell.trim());
  return out;
}

export function deriveFacts(rows: Row[]): Facts {
  if (rows.length < 3) throw new Error(`this beat reads a trajectory; the frozen file carries ${rows.length} rows`);
  const ordered = [...rows].sort((a, b) => a.year - b.year);

  const lats = new Set(ordered.map((r) => r.lat));
  const lons = new Set(ordered.map((r) => r.lon));
  if (lats.size !== 1 || lons.size !== 1)
    throw new Error(
      "this beat draws ONE locator for ONE site; the frozen file carries more than one coordinate pair",
    );

  const rates = ordered.slice(1).map((to, i) => {
    const from = ordered[i];
    return { from, to, kilnsPerYear: (from.kilns - to.kilns) / (to.year - from.year) };
  });
  let steepestAt = 0;
  for (let i = 1; i < rates.length; i++) if (rates[i].kilnsPerYear > rates[steepestAt].kilnsPerYear) steepestAt = i;
  const steepest = rates[steepestAt];

  // The same rate measured over everything BEFORE the steepest pair starts, so "steeper" is a
  // comparison of two computed numbers rather than a word.
  const beforeFrom = ordered[0];
  const beforeTo = steepest.from;
  const beforeSteepest = {
    from: beforeFrom,
    to: beforeTo,
    kilnsPerYear:
      beforeTo.year > beforeFrom.year ? (beforeFrom.kilns - beforeTo.kilns) / (beforeTo.year - beforeFrom.year) : 0,
  };

  return {
    rows: ordered,
    first: ordered[0],
    last: ordered[ordered.length - 1],
    steepest,
    beforeSteepest,
    site: { lat: ordered[0].lat, lon: ordered[0].lon },
    span: { years: ordered[ordered.length - 1].year - ordered[0].year },
    maxWorkers: Math.max(...ordered.map((r) => r.workers)),
  };
}

/** Thousands separated with a thin space rather than a comma: a comma between digits is the one
 *  form the grounding check refuses to read, and this beat's own numbers are printed by the same
 *  function everywhere so the page and the storyboard cannot disagree about them. */
export function group(value: number): string {
  return String(Math.round(value)).replace(/\B(?=(\d{3})+(?!\d))/g, " ");
}
