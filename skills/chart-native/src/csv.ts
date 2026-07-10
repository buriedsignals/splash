// Shared CSV parsing for the native producer: header + rows, with per-column numeric
// detection. Extracted from spec-to-config.ts so shape-validation.ts and the mappers
// share one parser. Pure, framework-free.
//
// RFC 4180 aware: a comma or newline INSIDE a double-quoted field is literal (the
// field is not torn into extra cells / records), a doubled quote ("") is an escaped
// ", and the surrounding quotes are stripped. Unquoted cells are whitespace-trimmed;
// a quoted cell's interior is preserved verbatim. This mirrors the correct round-trip
// in skills/atelier/src/map-data.ts (kept as a sibling — not imported across skills).
export interface ParsedCsv {
  columns: string[];
  rows: Record<string, string | number>[];
  numericColumns: string[];
}

// Single quote-aware scan of the whole text into records of raw cells. A field is
// "quoted" when its first non-space character is a `"`; inside a quoted field a comma
// / newline is literal and `""` is an escaped `"`. Unquoted fields are trimmed; quoted
// fields keep their interior verbatim (leading whitespace before the opening quote and
// any stray char after the closing quote are dropped, per RFC 4180).
function parseRecords(text: string): string[][] {
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

export function parseCsv(csv: string): ParsedCsv {
  const records = parseRecords(csv.trim()).filter(
    (r) => !(r.length === 1 && r[0] === ""),
  );
  if (records.length < 2) throw new Error("csv: needs a header + ≥1 row");
  const columns = records[0];
  const rows = records.slice(1).map((cells) => {
    const row: Record<string, string | number> = {};
    columns.forEach((col, i) => {
      const raw = cells[i] ?? "";
      const num = Number(raw);
      row[col] = raw !== "" && Number.isFinite(num) ? num : raw;
    });
    return row;
  });
  const numericColumns = columns.filter((c) =>
    rows.every((r) => typeof r[c] === "number"),
  );
  return { columns, rows, numericColumns };
}
