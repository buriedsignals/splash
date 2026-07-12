export function dataShape(csv: string): { columns: string[]; rows: number } {
  const records = parseCsvRecords(csv.trim());
  const columns = (records[0] ?? []).map((c) => c.trim());
  return { columns, rows: Math.max(0, records.length - 1) };
}

// RFC 4180 quote-aware scan of CSV text into records of raw cells: a comma or
// newline INSIDE a double-quoted field is literal (the field is not torn into
// extra cells / records), a doubled quote ("") is an escaped ", and the
// surrounding quotes are stripped. Unquoted cells are whitespace-trimmed; a
// quoted cell's interior is preserved verbatim. Sibling of the identical scanner
// in skills/chart-native/src/csv.ts (skills stay self-contained — no cross-skill
// imports), which itself mirrors skills/atelier/src/map-data.ts.
export function parseCsvRecords(text: string): string[][] {
  const records: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false; // cursor is inside the quoted section
  let quotedField = false; // this field opened with a quote → preserve verbatim
  let closed = false; // the quoted section has ended → ignore trailing chars
  let started = false; // a non-space char (or the opening quote) has begun the field

  const endField = () => {
    row.push(quotedField ? field : field.trim());
    field = "";
    inQuotes = false;
    quotedField = false;
    closed = false;
    started = false;
  };
  const endRow = () => {
    endField();
    records.push(row);
    row = [];
  };

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
          closed = true;
        }
      } else {
        field += ch;
      }
      continue;
    }
    if (ch === '"' && !started) {
      inQuotes = true;
      quotedField = true;
      started = true;
      field = ""; // discard any leading whitespace accumulated before the quote
      continue;
    }
    if (ch === ",") {
      endField();
      continue;
    }
    if (ch === "\n") {
      endRow();
      continue;
    }
    if (ch === "\r") {
      // Bare \r is kept; a \r\n record break is handled by the \n above.
      if (text[i + 1] !== "\n") field += ch;
      continue;
    }
    if (closed) continue; // stray char after a closed quoted field — ignore
    field += ch;
    if (ch !== " " && ch !== "\t") started = true;
  }
  endRow();
  return records;
}

// The RAW record strings of the CSV text — the byte-verbatim slices between
// UNQUOTED newlines (a newline inside a quoted field stays inside its record;
// quoting, padding and bare \r are untouched). Mirrors parseCsvRecords' quote
// state machine so both cut records at exactly the same offsets: index i here is
// the raw form of parseCsvRecords(text)[i]. Used where records must be REORDERED
// or REASSEMBLED without re-serializing cells — the bytes Datawrapper receives
// stay the author's bytes.
function splitCsvRecordStrings(text: string): string[] {
  const records: string[] = [];
  let start = 0;
  let inQuotes = false;
  let started = false; // a non-space char (or the opening quote) has begun the field
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') i++;
        else inQuotes = false;
      }
      continue;
    }
    if (ch === '"' && !started) {
      inQuotes = true;
      started = true;
      continue;
    }
    if (ch === ",") {
      started = false;
      continue;
    }
    if (ch === "\n") {
      records.push(text.slice(start, i));
      start = i + 1;
      started = false;
      continue;
    }
    if (ch !== " " && ch !== "\t" && ch !== "\r") started = true;
  }
  records.push(text.slice(start));
  return records;
}

// Serialize one cell back to CSV: quote it only when RFC 4180 requires (a comma,
// quote, or line break inside) — a plain cell round-trips byte-identical.
function serializeCsvCell(cell: string): string {
  return /[",\n\r]/.test(cell) ? `"${cell.replace(/"/g, '""')}"` : cell;
}

// The label-column (first-cell) values of the DATA rows (header skipped), RFC
// 4180-parsed and trimmed, empties dropped. Membership checks (highlight,
// annotation x) must compare against THESE: a quoted, comma-containing category
// (e.g. "Ministère de l'Économie, des Finances et de la Souveraineté industrielle
// et numérique") is ONE label — a naive split(",") tears it into fragments and
// falsely rejects the legitimate value. Never throws; [] when there are no rows.
export function labelColumnValues(csv: string): string[] {
  return parseCsvRecords(csv.trim())
    .slice(1)
    .map((cells) => (cells[0] ?? "").trim())
    .filter(Boolean);
}

// Rename CSV column headers by key. Datawrapper's direct label on a line/area
// series is the column header — a raw column key (e.g. `median_home_price_usd`)
// must never reach the reader. Renaming the header is the one place that fixes
// the direct label, the legend, and the tooltip series name at once.
export function renameColumns(
  csv: string,
  labels: Record<string, string>,
): string {
  const records = splitCsvRecordStrings(csv.trim());
  const header = (parseCsvRecords(records[0] ?? "")[0] ?? []).map((c) =>
    c.trim(),
  );
  const renamed = header.map((c) => serializeCsvCell(labels[c] ?? c));
  // Only the header record is re-serialized; the data records pass through as
  // the author's raw bytes.
  return [renamed.join(","), ...records.slice(1)].join("\n");
}

// Look up a series value at a given x (first-column) label. Datawrapper drops a
// line-chart text-annotation that has no numeric y, so when a spec pins an
// annotation to an x only, we derive the y from the data.
export function valueAt(
  csv: string,
  xLabel: string | number,
  column?: string,
): number | undefined {
  const records = parseCsvRecords(csv.trim());
  const header = (records[0] ?? []).map((c) => c.trim());
  const colIdx = column ? header.indexOf(column) : 1;
  if (colIdx < 1) return undefined;
  for (const cells of records.slice(1)) {
    if (cells[0]?.trim() === String(xLabel).trim()) {
      const n = Number(cells[colIdx]);
      return Number.isFinite(n) ? n : undefined;
    }
  }
  return undefined;
}

// Column indexes whose non-empty data cells are ALL numeric — a value column, as
// opposed to a text/label column. Used to tell a scatter's x/y value columns apart from
// a leading label column (Datawrapper plots numeric columns; a text column is a label).
export function numericColumnIndexes(csv: string): number[] {
  const records = parseCsvRecords(csv.trim());
  if (records.length < 2) return [];
  const width = (records[0] ?? []).length;
  const out: number[] = [];
  for (let c = 0; c < width; c++) {
    let anyNumeric = false;
    let allNumeric = true;
    for (const cells of records.slice(1)) {
      const cell = cells[c]?.trim() ?? "";
      if (cell === "") continue; // a gap does not decide the column's type
      if (Number.isFinite(Number(cell))) anyNumeric = true;
      else {
        allNumeric = false;
        break;
      }
    }
    if (anyNumeric && allNumeric) out.push(c);
  }
  return out;
}

export interface ScatterColumns {
  xIdx: number;
  yIdx: number;
  xCol: string;
  yCol: string;
  labelIdx: number | undefined; // leading text column used for point labels, if any
}

// A scatter plot's x/y value columns. Datawrapper plots the FIRST numeric column on the
// x-axis and the SECOND numeric column on the y-axis; a leading non-numeric column is the
// point label. Returns undefined when the data has fewer than two numeric columns (not a
// well-formed scatter), so the caller falls back to the category-x/value-y model.
export function scatterColumns(csv: string): ScatterColumns | undefined {
  const header = (parseCsvRecords(csv.trim())[0] ?? []).map((c) => c.trim());
  const nums = numericColumnIndexes(csv);
  if (nums.length < 2) return undefined;
  const xIdx = nums[0];
  const yIdx = nums[1];
  return {
    xIdx,
    yIdx,
    xCol: header[xIdx],
    yCol: header[yIdx],
    labelIdx: xIdx > 0 ? 0 : undefined,
  };
}

// Resolve the scatter data ROW an annotation names — its `key` may be the label-column
// value (e.g. "Japan") or the x-column value itself. Returns the numeric x (x-column) and
// the numeric value of `column` (defaults to the y-column) for that row, so an annotation
// pinned by name still resolves to a positionable numeric (x, y). Undefined when no row
// matches or the cells are not numeric.
export function scatterPointAt(
  csv: string,
  key: string | number | undefined,
  cols: ScatterColumns,
  column?: string,
): { x: number; y: number } | undefined {
  if (key === undefined) return undefined;
  const records = parseCsvRecords(csv.trim());
  const header = (records[0] ?? []).map((c) => c.trim());
  const yIdx = column ? header.indexOf(column) : cols.yIdx;
  if (yIdx < 0) return undefined;
  const k = String(key).trim();
  for (const cells of records.slice(1)) {
    const label =
      cols.labelIdx !== undefined ? cells[cols.labelIdx]?.trim() : undefined;
    const xCell = cells[cols.xIdx]?.trim();
    if (label === k || xCell === k) {
      const x = Number(cells[cols.xIdx]);
      const y = Number(cells[yIdx]);
      return Number.isFinite(x) && Number.isFinite(y) ? { x, y } : undefined;
    }
  }
  return undefined;
}

// Sort the DATA records by their last-column numeric value. The records are
// reordered as RAW strings (splitCsvRecordStrings) with the sort key read from the
// aligned PARSED records — cells are never re-serialized, so a quoted-comma
// category keeps its author bytes AND sorts by its true value (a naive split read
// the torn wrong cell → NaN → the ranking shipped unsorted).
export function sortCsv(csv: string, dir: "asc" | "desc"): string {
  const text = csv.trim();
  const raw = splitCsvRecordStrings(text);
  const parsed = parseCsvRecords(text);
  const lastIdx = (parsed[0] ?? []).length - 1;
  const rows = raw
    .slice(1)
    .map((line, i) => ({ line, key: Number(parsed[i + 1]?.[lastIdx]) }));
  rows.sort((a, b) => {
    const d = a.key - b.key;
    return dir === "desc" ? -d : d;
  });
  return [raw[0], ...rows.map((r) => r.line)].join("\n");
}
