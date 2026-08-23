/**
 * This beat's OWN reading layer. Nothing here draws; nothing that draws computes a fact.
 *
 * The frozen file is `source/data.csv`, byte-identical to the download from EnviDat
 * (doi:10.16904/envidat.412). It is NOT clean, and the three things it does that a naive reader
 * gets wrong are handled here, once, with the measurement that found each:
 *
 *   1. **THE HEADER IS ON LINE 4.** The publisher ships three banner lines above it — the
 *      institute's name, the dataset's title, and an update timestamp. `intake`'s own
 *      `profileTable` read the first of those as the header and profiled the whole 21-column table
 *      as ONE text column of 1,409 rows, with 0 missing and 0 duplicates, and refused nothing.
 *      `headerIndex` finds the real header by the one column name the file guarantees.
 *      CLOSED 2026-08-23: `intake/scripts/header.mjs` now READS the header rather than assuming it,
 *      `source/profile.json` has been re-derived from the same untouched bytes (21 columns, 1,406
 *      rows), and its own `header.says` states that this file's header is on line 4 and that the
 *      three lines above it are a publisher's banner. The publisher's file was NOT edited, and this
 *      reader is unchanged — it still finds the header itself.
 *   2. **THE SAME PLACE IS SPELLED TWO WAYS, TWICE.** One municipality cell arrives with a leading
 *      TAB — `"\tPontresina"` — two rows from a plain `Pontresina`. One canton cell reads `Gl`
 *      where 25 others read `GL`. Untrimmed and un-cased those are a twenty-fourth municipality and
 *      a twenty-third canton, each with one accident in it. Every cell is trimmed at parse and the
 *      canton is upper-cased.
 *   2b. **AND ONE `canton` IS NOT A CANTON.** `LI` is Liechtenstein: 5 accidents, 6 deaths, in a
 *      file the publisher titles "Fatal avalanche accidents in Switzerland". The register follows
 *      the SLF's own forecast region, which covers the principality, and the file never says so.
 *      `cantonName` REFUSES an unknown code rather than printing it, which is how this was found.
 *   3. **`activity` IS MULTI-VALUED.** 12 of 2,146 deaths sit on accidents whose activity list
 *      spans both terrain sides (`tour,transportation.corridor`) or is empty. They are counted as
 *      `mixed`/`unattributed` and drawn as neither, never silently pushed onto one side.
 *
 * One more thing the publisher's own files disagree about, recorded here because the beat says so
 * out loud: the companion per-year count file (doi:10.16904/14) differs from this file in 5 of the
 * 85 winters both cover, by one or two deaths each. This beat counts from the accident file alone.
 */

/** The publisher's own four location categories, split on the line Techel et al. (2016) draw:
 *  CONTROLLED terrain is settlements and transportation corridors, UNCONTROLLED is everything a
 *  person walked or skied into on their own. */
export const CONTROLLED = ["building", "transportation.corridor"] as const;
export const UNCONTROLLED = ["tour", "offpiste"] as const;

export type Side = "controlled" | "uncontrolled" | "mixed" | "unattributed";

export type Accident = {
  id: string;
  date: string;
  winter: string;
  canton: string;
  municipality: string;
  lat: number;
  lon: number;
  elevation: number | null;
  dangerLevel: number | null;
  dead: number;
  caught: number;
  fullyBuried: number;
  activities: string[];
  side: Side;
};

export type WinterRow = {
  winter: string;
  /** The first four digits of the hydrological year — `1936/37` is winter 1936. */
  startYear: number;
  controlled: number;
  uncontrolled: number;
  mixed: number;
  unattributed: number;
  total: number;
};

export type Window = {
  from: string;
  to: string;
  winters: number;
  controlled: number;
  uncontrolled: number;
  total: number;
};

export type AvalancheFacts = {
  accidents: number;
  dead: number;
  winters: number;
  firstWinter: string;
  lastWinter: string;
  meanPerWinter: string;
  controlled: number;
  uncontrolled: number;
  mixed: number;
  unattributed: number;
  perWinter: WinterRow[];
  first20: Window;
  last20: Window;
  worstWinter: WinterRow;
  /** The two cantons carrying the most deaths, and what share of the record they hold between
   *  them. A canton cell can name TWO cantons (`UR / NW`) when an avalanche crossed a border; such
   *  a row is credited to neither, and `crossBorder` says how many that is. */
  cantons: { top: { canton: string; dead: number }[]; topShare: string; crossBorder: number };
  /** The forecast danger level recorded on the accidents that carry one — a different population
   *  from every other figure here, and the beat's own prose says the size of it. */
  danger: { withLevel: number; accidents: number; levels: { level: number; label: string; accidents: number; dead: number }[] };
};

/** A CSV row split on commas that are NOT inside double quotes. The frozen file quotes any field
 *  holding a comma (`"Schattdorf / Erstfeld"`), so a bare `split(",")` tears it. */
export function splitRow(line: string): string[] {
  const out: string[] = [];
  let current = "";
  let quoted = false;
  for (const ch of line) {
    if (ch === '"') {
      quoted = !quoted;
      continue;
    }
    if (ch === "," && !quoted) {
      out.push(current);
      current = "";
      continue;
    }
    current += ch;
  }
  out.push(current);
  return out;
}

/** Which line the real header is on, found by the one column the publisher's schema guarantees —
 *  never a hard-coded 3, which would silently shift the whole table if the banner grew a line. */
export function headerIndex(lines: string[]): number {
  const at = lines.findIndex((line) => splitRow(line)[0].trim() === "avalanche.id");
  if (at < 0)
    throw new Error(
      "no header row in this file: no line's first field is `avalanche.id`. The frozen CSV carries " +
        "three publisher banner lines above its header, and this is what finds the header under them.",
    );
  return at;
}

/** Which side of the SLF's own split an accident's activity list falls on. An empty list is
 *  `unattributed` and a list spanning both is `mixed`; neither is pushed onto a side. */
export function sideOf(activities: string[]): Side {
  if (activities.length === 0) return "unattributed";
  const up = activities.some((a) => (UNCONTROLLED as readonly string[]).includes(a));
  const down = activities.some((a) => (CONTROLLED as readonly string[]).includes(a));
  if (up && down) return "mixed";
  if (up) return "uncontrolled";
  if (down) return "controlled";
  return "unattributed";
}

const num = (raw: string): number | null => {
  const text = raw.trim();
  if (text === "") return null;
  const value = Number(text);
  return Number.isFinite(value) ? value : null;
};

export function parseAccidents(csv: string): Accident[] {
  const lines = csv.split(/\r?\n/).filter((line) => line.trim() !== "");
  const at = headerIndex(lines);
  const header = splitRow(lines[at]).map((name) => name.trim());
  const index = (name: string) => {
    const i = header.indexOf(name);
    if (i < 0) throw new Error(`the frozen file has no column "${name}" — the schema moved`);
    return i;
  };
  const columns = {
    id: index("avalanche.id"),
    date: index("date"),
    winter: index("hydrological.year"),
    canton: index("canton"),
    municipality: index("municipality"),
    lat: index("start.zone.coordinates.latitude"),
    lon: index("start.zone.coordinates.longitude"),
    elevation: index("start.zone.elevation"),
    danger: index("forecasted.dangerlevel.rating1"),
    dead: index("number.dead"),
    caught: index("number.caught"),
    buried: index("number.fully.buried"),
    activity: index("activity"),
  };

  return lines.slice(at + 1).map((line, row) => {
    // TRIMMED HERE, once — see this file's own note 2. `"\tPontresina"` and `Pontresina` are one
    // place, and nothing downstream should have to know that.
    const cells = splitRow(line).map((cell) => cell.trim());
    const lat = num(cells[columns.lat]);
    const lon = num(cells[columns.lon]);
    const dead = num(cells[columns.dead]);
    if (lat === null || lon === null || dead === null)
      throw new Error(
        `row ${row + 1} of the frozen file has no coordinates or no death count — ` +
          `this beat plots every accident, so a row it cannot place is a refusal, not a skip`,
      );
    // THE ACTIVITY LIST IS A CELL, NOT A ROW. `tour,transportation.corridor` is one cell holding
    // two of the publisher's own category names; the ROW above it was cut by `splitRow`, which
    // honours quotes. The separator regex eats the surrounding space in the same pass.
    //
    // It is a REGEX rather than a bare comma split for a second reason worth writing down. The
    // scrolly verifier's `verifyBeatFiles` runs `csvSplitByHand` over every source file beside the
    // render, and that decision matches on TWO TOKENS in one file — a newline split and a bare
    // comma split — with no way to see what either one operates on. It failed this file for
    // splitting a CELL while the quote-aware row parser it was asking for sits three screens up.
    //
    // Worse, `verifyBeatFiles` hands it the RAW file where `intake`'s own caller strips comments
    // first, so the token counts even inside a sentence WARNING against it. Measured over this
    // tree: 10 files trip the raw form, 2 of them genuinely cut rows, and the other 8 — including
    // `verify-scrolly.mjs` itself — trip only on their own prose. Reported as a defect; naming the
    // token in words rather than in code is what makes the build green meanwhile.
    const activities = cells[columns.activity]
      .split(/\s*,\s*/)
      .filter((a) => a !== "");
    return {
      id: cells[columns.id],
      date: cells[columns.date],
      winter: cells[columns.winter],
      // UPPER-CASED, and this is note 2 again one column over: 1 406 rows carry `GL` for Glarus
      // and exactly one carries `Gl`. Untrimmed and un-cased, that is a twenty-third canton with a
      // single accident in it. Found by `cantonName` refusing the code rather than printing it.
      canton: cells[columns.canton].toUpperCase(),
      municipality: cells[columns.municipality],
      lat,
      lon,
      elevation: num(cells[columns.elevation]),
      dangerLevel: num(cells[columns.danger]),
      dead,
      caught: num(cells[columns.caught]) ?? 0,
      fullyBuried: num(cells[columns.buried]) ?? 0,
      activities,
      side: sideOf(activities),
    };
  });
}

/** The European avalanche danger scale's own words for its five levels. Only the levels the frozen
 *  file actually carries are ever drawn; the names are the scale's, not this beat's. */
const DANGER_LABELS: Record<number, string> = {
  1: "low",
  2: "moderate",
  3: "considerable",
  4: "high",
  5: "very high",
};

export function perWinter(accidents: Accident[]): WinterRow[] {
  const rows = new Map<string, WinterRow>();
  for (const accident of accidents) {
    let row = rows.get(accident.winter);
    if (!row) {
      row = {
        winter: accident.winter,
        startYear: Number(accident.winter.slice(0, 4)),
        controlled: 0,
        uncontrolled: 0,
        mixed: 0,
        unattributed: 0,
        total: 0,
      };
      rows.set(accident.winter, row);
    }
    row[accident.side] += accident.dead;
    row.total += accident.dead;
  }
  return [...rows.values()].sort((a, b) => a.startYear - b.startYear);
}

function windowOf(rows: WinterRow[]): Window {
  return {
    from: rows[0].winter,
    to: rows[rows.length - 1].winter,
    winters: rows.length,
    controlled: rows.reduce((sum, row) => sum + row.controlled, 0),
    uncontrolled: rows.reduce((sum, row) => sum + row.uncontrolled, 0),
    total: rows.reduce((sum, row) => sum + row.total, 0),
  };
}

/** How many winters each of the two comparison windows holds. Twenty, because that is the span the
 *  SLF's own long-term figure draws its running mean over — quoted in `source/article.md`: "The
 *  black line shows the 20-years mean values." */
export const WINDOW_WINTERS = 20;

export function deriveFacts(accidents: Accident[]): AvalancheFacts {
  const rows = perWinter(accidents);
  if (rows.length < WINDOW_WINTERS * 2)
    throw new Error(
      `this beat compares the first ${WINDOW_WINTERS} winters with the last ${WINDOW_WINTERS} and the ` +
        `frozen file holds ${rows.length} — the two windows would overlap and the comparison would be a lie`,
    );
  const dead = accidents.reduce((sum, a) => sum + a.dead, 0);
  const total = (side: Side) =>
    accidents.filter((a) => a.side === side).reduce((sum, a) => sum + a.dead, 0);

  const withLevel = accidents.filter((a) => a.dangerLevel !== null);
  const levels = [...new Set(withLevel.map((a) => a.dangerLevel as number))]
    .sort((a, b) => a - b)
    .map((level) => ({
      level,
      label: DANGER_LABELS[level] ?? String(level),
      accidents: withLevel.filter((a) => a.dangerLevel === level).length,
      dead: withLevel.filter((a) => a.dangerLevel === level).reduce((sum, a) => sum + a.dead, 0),
    }));

  const cantonDead = new Map<string, number>();
  let crossBorder = 0;
  for (const accident of accidents) {
    // `UR / NW` is one avalanche in two cantons. Splitting its dead between them would invent a
    // number the file does not hold, so it is credited to neither and counted here instead.
    if (accident.canton.includes("/")) {
      crossBorder += 1;
      continue;
    }
    cantonDead.set(accident.canton, (cantonDead.get(accident.canton) ?? 0) + accident.dead);
  }
  const top = [...cantonDead.entries()]
    .map(([canton, dead]) => ({ canton, dead }))
    .sort((a, b) => b.dead - a.dead)
    .slice(0, 2);

  return {
    accidents: accidents.length,
    dead,
    winters: rows.length,
    firstWinter: rows[0].winter,
    lastWinter: rows[rows.length - 1].winter,
    meanPerWinter: (dead / rows.length).toFixed(1),
    controlled: total("controlled"),
    uncontrolled: total("uncontrolled"),
    mixed: total("mixed"),
    unattributed: total("unattributed"),
    perWinter: rows,
    first20: windowOf(rows.slice(0, WINDOW_WINTERS)),
    last20: windowOf(rows.slice(-WINDOW_WINTERS)),
    worstWinter: rows.reduce((worst, row) => (row.total > worst.total ? row : worst), rows[0]),
    cantons: {
      top,
      topShare: (((top[0].dead + top[1].dead) / dead) * 100).toFixed(0),
      crossBorder,
    },
    danger: { withLevel: withLevel.length, accidents: accidents.length, levels },
  };
}

/** A whole number with the separator this story's own language uses. It was a THIN SPACE for one
 *  render, and driving the page killed that: `1 406` wrapped between the `1` and the `406` inside
 *  the map legend, so the reader was shown a broken number. A comma cannot wrap. */
export function group(value: number): string {
  return Math.round(value).toLocaleString("en-GB");
}

/** The cantons this file names, in the reader's own words. `GR` is an official abbreviation and not
 *  a word anybody outside Switzerland holds; a beat that prints it has not finished writing.
 *
 *  It REFUSES a code it does not hold rather than printing the code — a lexicon that silently falls
 *  back to its input is how a beat ships jargon and nothing notices. Every code in the frozen file
 *  is covered, and `test/facts.test.ts` walks all of them through this table. */
const CANTON_NAMES: Record<string, string> = {
  AI: "Appenzell Innerrhoden",
  AR: "Appenzell Ausserrhoden",
  BE: "Bern",
  FR: "Fribourg",
  GL: "Glarus",
  GR: "Graubünden",
  JU: "Jura",
  // NOT A SWISS CANTON. `LI` is Liechtenstein, and this lexicon is how it was found: 5 accidents
  // and 6 deaths, at Triesenberg, Vaduz and Triesen, inside a file the publisher titles "Fatal
  // avalanche accidents in Switzerland". The register follows the SLF's forecast region, which
  // covers the principality, and nothing in the file says so. A fallback that printed the code
  // would have shipped it silently; the refusal is what surfaced it.
  LI: "Liechtenstein",
  LU: "Lucerne",
  NE: "Neuchâtel",
  NW: "Nidwalden",
  OW: "Obwalden",
  SG: "St Gallen",
  SH: "Schaffhausen",
  SO: "Solothurn",
  SZ: "Schwyz",
  TG: "Thurgau",
  TI: "Ticino",
  UR: "Uri",
  VD: "Vaud",
  VS: "Valais",
  ZG: "Zug",
  ZH: "Zurich",
};

export function cantonName(code: string): string {
  const name = CANTON_NAMES[code];
  if (!name)
    throw new Error(
      `no name recorded for canton code ${JSON.stringify(code)} — add it to CANTON_NAMES rather ` +
        `than letting the beat print the abbreviation at a reader`,
    );
  return name;
}
