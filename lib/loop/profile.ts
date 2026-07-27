import type { DataProfile } from "./manifest";

// Minimal profiler for the slice: simple comma split (no RFC4180 quoting — deferred).
// A column is numeric only when every row cell parses as a finite number.
export function profileCsv(dataCsv: string): DataProfile {
  const { columns, rows, numericColumns } = parseCsvRows(dataCsv);
  return { columns, numericColumns, rowCount: rows.length };
}

/** The same parse, keeping the CELLS. `profileCsv` answers what the data IS; a caller that has
 *  to anchor on a value (lib/brain/beats.ts) needs the values themselves, and a SECOND parser
 *  written beside this one is the drift this codebase has already been bitten by. One split,
 *  two readers. */
export function parseCsvRows(dataCsv: string): {
  columns: string[];
  rows: Record<string, string>[];
  numericColumns: string[];
} {
  const lines = dataCsv.trim().split(/\r?\n/);
  const columns = lines[0].split(",").map((c) => c.trim());
  const cells = lines
    .slice(1)
    .filter((l) => l.trim() !== "")
    .map((l) => l.split(",").map((c) => c.trim()));
  const numericColumns = columns.filter(
    (_, i) =>
      cells.length > 0 &&
      cells.every(
        (r) =>
          r[i] !== "" && r[i] !== undefined && Number.isFinite(Number(r[i])),
      ),
  );
  const rows = cells.map((r) =>
    Object.fromEntries(columns.map((c, i) => [c, r[i] ?? ""])),
  );
  return { columns, rows, numericColumns };
}
