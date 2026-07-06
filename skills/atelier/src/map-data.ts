// The two map DATA views (map-dw uses a CSV string, map-native uses a rows array).
// Only the DATA payload is mechanically derivable; the geo binding (basemap, join key)
// is producer-specific and supplied by the agent — NOT derived here.
export interface Row {
  [col: string]: string | number;
}

// RFC 4180: quote a field only if it contains a comma, a double-quote, or a newline;
// double-quotes inside a quoted field are escaped by doubling them.
function csvField(value: string): string {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export function toCsv(rows: Row[]): string {
  if (rows.length === 0) return "";
  const cols = Object.keys(rows[0]);
  const header = cols.map(csvField).join(",");
  const body = rows
    .map((r) => cols.map((c) => csvField(String(r[c]))).join(","))
    .join("\n");
  return `${header}\n${body}`;
}

// Parses the whole CSV text in a single quote-aware scan: a record break (\n, or
// \r\n) and a field break (,) only count when NOT inside a quoted field, so a cell
// containing an embedded newline (produced by csvField's quoting) is never torn
// across records. "" inside a quoted field is a literal ".
function parseCsv(text: string): string[][] {
  const records: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          cell += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        cell += ch;
      }
    } else if (ch === '"' && cell === "") {
      inQuotes = true;
    } else if (ch === ",") {
      row.push(cell);
      cell = "";
    } else if (ch === "\n") {
      row.push(cell);
      records.push(row);
      row = [];
      cell = "";
    } else if (ch === "\r") {
      // Bare \r is dropped; \r\n's record break is handled by the \n above.
      if (text[i + 1] !== "\n") cell += ch;
    } else {
      cell += ch;
    }
  }
  row.push(cell);
  records.push(row);
  return records;
}

// Coerce a raw cell to a number only when it round-trips exactly AND is finite, so
// zero-padded codes ("08"), decimals with trailing zeros ("1.50"), non-numeric
// strings ("2A", ""), and the literal strings "NaN"/"Infinity"/"-Infinity" are
// preserved as strings.
function coerceCell(raw: string): string | number {
  if (
    raw !== "" &&
    Number.isFinite(Number(raw)) &&
    String(Number(raw)) === raw
  ) {
    return Number(raw);
  }
  return raw;
}

export function toRows(csv: string): Row[] {
  const records = parseCsv(csv.trim()).filter(
    (r) => !(r.length === 1 && r[0] === ""),
  );
  if (records.length === 0) return [];
  const cols = records[0];
  return records.slice(1).map((cells) => {
    const row: Row = {};
    cols.forEach((c, i) => {
      const raw = cells[i] ?? "";
      row[c] = coerceCell(raw);
    });
    return row;
  });
}
