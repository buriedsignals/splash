// The frozen table, read once for every beat in this story.
//
// TWO THINGS THE PROFILER COULD NOT DO, AND THIS FILE HAS TO.
//
// 1. `source/profile.json` types `استهلاك_المياه_م3` as `text`, and records why: the Sfax cell is
//    written in ARABIC-INDIC digits (U+0660-U+0669) and `Number()` refuses it. So the whole column
//    arrives with no min, no max and no sum, and nothing upstream of this file can rank it.
// 2. `السكان` (population) is typed as a number, but the grounding check's denominator detector
//    reads column names against an English/French token list, so it never sees it. Any per-resident
//    reading is this file's arithmetic or nobody's.
//
// `toWesternDigits` is a TRANSLITERATION, never an estimate: U+0660..U+0669 map one-for-one onto
// 0..9. `raw` keeps the source's own characters so a beat can print the cell exactly as the
// journalist froze it, beside the number this file read out of it.

export type Governorate = {
  /** The governorate's name, in the article's own script. Never transformed, never reordered. */
  name: string;
  /** Cubic metres a year. */
  consumption: number;
  /** Residents. */
  population: number;
  /** The consumption cell exactly as `source/data.csv` writes it. */
  raw: string;
  /** True when that cell needed digit transliteration before it was a number. */
  transliterated: boolean;
};

const ARABIC_INDIC_ZERO = 0x0660;

/** U+0660..U+0669 -> 0..9. Nothing else is touched. */
export function toWesternDigits(text: string): string {
  return text.replace(/[٠-٩]/g, (d) =>
    String(d.codePointAt(0)! - ARABIC_INDIC_ZERO),
  );
}

export function hasArabicIndicDigits(text: string): boolean {
  return /[٠-٩]/.test(text);
}

/**
 * RFC 4180 row tokeniser, inlined rather than imported — a story workspace is not a skill and may
 * not reach across a skill boundary. A naive comma split corrupts a quoted name carrying its own
 * comma, which is exactly the shape an Arabic governorate list could arrive in; this walks the text
 * one character at a time instead.
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


export function readGovernorates(csv: string): Governorate[] {
  const [header, ...lines] = parseCsvRows(csv.trim()).filter((row) =>
    row.some((cell) => cell.trim() !== ""),
  );
  const columns = header.map((c) => c.trim());
  const at = (name: string) => {
    const index = columns.indexOf(name);
    if (index < 0)
      throw new Error(
        `source/data.csv has no column ${JSON.stringify(name)} — it carries ${columns.join(", ")}`,
      );
    return index;
  };
  const nameAt = at("المحافظة");
  const consumptionAt = at("استهلاك_المياه_م3");
  const populationAt = at("السكان");

  return lines.map((cells) => {
    if (cells.length !== header.length)
      throw new Error(`row has ${cells.length} cells, header has ${header.length}: ${cells.join(",")}`);
    const raw = cells[consumptionAt].trim();
    const western = toWesternDigits(raw);
    const consumption = Number(western);
    if (!Number.isFinite(consumption))
      throw new Error(
        `the consumption cell ${JSON.stringify(raw)} is not a number even after digit ` +
          `transliteration — this beat refuses to draw a value it could not read`,
      );
    const population = Number(toWesternDigits(cells[populationAt].trim()));
    if (!Number.isFinite(population))
      throw new Error(`the population cell ${JSON.stringify(cells[populationAt])} is not a number`);
    return {
      name: cells[nameAt].trim(),
      consumption,
      population,
      raw,
      transliterated: hasArabicIndicDigits(raw),
    };
  });
}

/** Millions of cubic metres, as the article writes them: Western digits, no decimal where none is
 *  needed. Tunisia's own press sets these figures in Western digits, and the frozen article does
 *  too ("142 مليون متر مكعب"), so the graphic follows the article rather than the one cell that
 *  does not. */
export function millions(cubicMetres: number): string {
  const value = cubicMetres / 1_000_000;
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

/** Cubic metres per resident, to one decimal. Arithmetic this file does because nothing upstream
 *  of it can: the denominator column is never detected. */
export function perResident(row: Governorate): number {
  return row.consumption / row.population;
}
