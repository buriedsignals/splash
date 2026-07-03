export function dataShape(csv: string): { columns: string[]; rows: number } {
  const lines = csv.trim().split("\n");
  const columns = lines[0].split(",").map((c) => c.trim());
  return { columns, rows: Math.max(0, lines.length - 1) };
}

// Rename CSV column headers by key. Datawrapper's direct label on a line/area
// series is the column header — a raw column key (e.g. `median_home_price_usd`)
// must never reach the reader. Renaming the header is the one place that fixes
// the direct label, the legend, and the tooltip series name at once.
export function renameColumns(
  csv: string,
  labels: Record<string, string>,
): string {
  const lines = csv.trim().split("\n");
  const header = lines[0].split(",").map((c) => c.trim());
  const renamed = header.map((c) => labels[c] ?? c);
  return [renamed.join(","), ...lines.slice(1)].join("\n");
}

// Look up a series value at a given x (first-column) label. Datawrapper drops a
// line-chart text-annotation that has no numeric y, so when a spec pins an
// annotation to an x only, we derive the y from the data.
export function valueAt(
  csv: string,
  xLabel: string | number,
  column?: string,
): number | undefined {
  const lines = csv.trim().split("\n");
  const header = lines[0].split(",").map((c) => c.trim());
  const colIdx = column ? header.indexOf(column) : 1;
  if (colIdx < 1) return undefined;
  for (const line of lines.slice(1)) {
    const cells = line.split(",");
    if (cells[0]?.trim() === String(xLabel).trim()) {
      const n = Number(cells[colIdx]);
      return Number.isFinite(n) ? n : undefined;
    }
  }
  return undefined;
}

export function sortCsv(csv: string, dir: "asc" | "desc"): string {
  const lines = csv.trim().split("\n");
  const header = lines[0];
  const rows = lines.slice(1).map((l) => l.split(","));
  const lastIdx = header.split(",").length - 1;
  rows.sort((a, b) => {
    const d = Number(a[lastIdx]) - Number(b[lastIdx]);
    return dir === "desc" ? -d : d;
  });
  return [header, ...rows.map((r) => r.join(","))].join("\n");
}
