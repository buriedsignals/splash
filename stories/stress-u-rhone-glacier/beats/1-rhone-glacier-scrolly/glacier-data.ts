/**
 * THE READING LAYER for the Rhone glacier beat. Nothing here draws; nothing that draws computes a
 * fact. Every figure the beat says out loud comes back from `deriveFacts`, so a re-export of the
 * frozen table moves the words and the picture together or fails loudly.
 *
 * The frozen file is the story's own `source/data.csv`, which INTAKE wrote and nothing may edit.
 */

export type Reading = {
  year: number;
  area: number;
  volume: number;
  note: string;
};

/**
 * RFC 4180 row tokeniser, walked one character at a time.
 *
 * Not `text.split(",")`: a quoted field carrying its own comma (a thousands separator, a note with
 * a clause in it) would be silently fragmented into two columns, and this beat's own note column is
 * free text. Inlined here rather than imported — a story workspace is not a skill and imports
 * nothing across a skill boundary.
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

/** The frozen table, as typed readings, in the order the file holds them. */
export function parseReadings(text: string): Reading[] {
  const rows = parseCsvRows(text.trim());
  const header = rows[0].map((h) => h.trim());
  const at = (name: string) => {
    const index = header.indexOf(name);
    if (index < 0) throw new Error(`source/data.csv has no column "${name}" — it has ${header.join(", ")}`);
    return index;
  };
  const yearAt = at("year");
  const areaAt = at("area_km2");
  const volumeAt = at("volume_km3");
  const noteAt = header.indexOf("note");
  return rows.slice(1).filter((r) => r.some((cell) => cell.trim() !== "")).map((r) => {
    const reading = {
      year: Number(r[yearAt]),
      area: Number(r[areaAt]),
      volume: Number(r[volumeAt]),
      note: noteAt < 0 ? "" : (r[noteAt] ?? "").trim(),
    };
    for (const key of ["year", "area", "volume"] as const) {
      if (!Number.isFinite(reading[key]))
        throw new Error(`row ${JSON.stringify(r)} has a non-numeric ${key}`);
    }
    return reading;
  });
}

export type Facts = {
  readings: Reading[];
  firstYear: number;
  lastYear: number;
  firstArea: number;
  lastArea: number;
  firstVolume: number;
  lastVolume: number;
  /** The share of its 1990 area the glacier has LOST, as a fraction. */
  areaLostShare: number;
  volumeLostShare: number;
  /** The intervals whose recorded area did not move at all, as [from, to] year pairs. */
  flatIntervals: [number, number][];
  /** The steepest five-year fall in the record. */
  steepest: { from: number; to: number; drop: number };
  /** The step interval, in years, asserted constant across the whole table. */
  stepYears: number;
};

/** One decimal, and two — the two precisions this beat's prose uses, in one place. */
export const t1 = (n: number) => n.toFixed(1);
export const t2 = (n: number) => n.toFixed(2);
export const t3 = (n: number) => n.toFixed(3);

export function deriveFacts(readings: Reading[]): Facts {
  if (readings.length < 2) throw new Error(`this beat needs at least two readings, got ${readings.length}`);
  const spans = readings.slice(1).map((r, i) => r.year - readings[i].year);
  const stepYears = spans[0];
  if (spans.some((s) => s !== stepYears))
    throw new Error(`the readings are not evenly spaced: ${spans.join(", ")} — this beat's prose says "every ${stepYears} years"`);

  const first = readings[0];
  const last = readings[readings.length - 1];

  const flatIntervals: [number, number][] = [];
  let steepest = { from: first.year, to: readings[1].year, drop: first.area - readings[1].area };
  for (let i = 1; i < readings.length; i += 1) {
    const a = readings[i - 1];
    const b = readings[i];
    if (b.area === a.area) flatIntervals.push([a.year, b.year]);
    const drop = a.area - b.area;
    if (drop > steepest.drop) steepest = { from: a.year, to: b.year, drop };
  }

  return {
    readings,
    firstYear: first.year,
    lastYear: last.year,
    firstArea: first.area,
    lastArea: last.area,
    firstVolume: first.volume,
    lastVolume: last.volume,
    areaLostShare: (first.area - last.area) / first.area,
    volumeLostShare: (first.volume - last.volume) / first.volume,
    flatIntervals,
    steepest,
    stepYears,
  };
}
