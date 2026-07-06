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

// Splits a CSV line into raw cells, respecting double-quoted fields (comma inside
// quotes is not a delimiter; "" inside a quoted field is a literal ").
function splitCsvLine(line: string): string[] {
  const cells: string[] = [];
  let cell = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
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
      cells.push(cell);
      cell = "";
    } else {
      cell += ch;
    }
  }
  cells.push(cell);
  return cells;
}

// Coerce a raw cell to a number only when it round-trips exactly, so zero-padded
// codes ("08"), decimals with trailing zeros ("1.50"), and non-numeric strings
// ("2A", "") are preserved as strings.
function coerceCell(raw: string): string | number {
  if (raw !== "" && String(Number(raw)) === raw) return Number(raw);
  return raw;
}

export function toRows(csv: string): Row[] {
  const lines = csv.trim().split("\n");
  const cols = splitCsvLine(lines[0]);
  return lines
    .slice(1)
    .filter((l) => l.length > 0)
    .map((line) => {
      const cells = splitCsvLine(line);
      const row: Row = {};
      cols.forEach((c, i) => {
        const raw = cells[i] ?? "";
        row[c] = coerceCell(raw);
      });
      return row;
    });
}
