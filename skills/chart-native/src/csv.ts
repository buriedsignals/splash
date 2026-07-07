// Shared CSV parsing for the native producer: header + rows, with per-column numeric
// detection. Extracted from spec-to-config.ts so shape-validation.ts and the mappers
// share one parser. Pure, framework-free.
export interface ParsedCsv {
  columns: string[];
  rows: Record<string, string | number>[];
  numericColumns: string[];
}

export function parseCsv(csv: string): ParsedCsv {
  const lines = csv.trim().split("\n");
  if (lines.length < 2) throw new Error("csv: needs a header + ≥1 row");
  const columns = lines[0].split(",").map((c) => c.trim());
  const rows = lines.slice(1).map((line) => {
    const cells = line.split(",");
    const row: Record<string, string | number> = {};
    columns.forEach((col, i) => {
      const raw = (cells[i] ?? "").trim();
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
