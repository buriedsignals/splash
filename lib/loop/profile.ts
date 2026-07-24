import type { DataProfile } from "./manifest";

// Minimal profiler for the slice: simple comma split (no RFC4180 quoting — deferred).
// A column is numeric only when every row cell parses as a finite number.
export function profileCsv(dataCsv: string): DataProfile {
  const lines = dataCsv.trim().split(/\r?\n/);
  const columns = lines[0].split(",").map((c) => c.trim());
  const rows = lines
    .slice(1)
    .filter((l) => l.trim() !== "")
    .map((l) => l.split(",").map((c) => c.trim()));
  const numericColumns = columns.filter(
    (_, i) =>
      rows.length > 0 &&
      rows.every(
        (r) => r[i] !== "" && r[i] !== undefined && !Number.isNaN(Number(r[i])),
      ),
  );
  return { columns, numericColumns, rowCount: rows.length };
}
