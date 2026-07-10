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

// Column indexes whose non-empty data cells are ALL numeric — a value column, as
// opposed to a text/label column. Used to tell a scatter's x/y value columns apart from
// a leading label column (Datawrapper plots numeric columns; a text column is a label).
export function numericColumnIndexes(csv: string): number[] {
  const lines = csv.trim().split("\n");
  if (lines.length < 2) return [];
  const width = lines[0].split(",").length;
  const out: number[] = [];
  for (let c = 0; c < width; c++) {
    let anyNumeric = false;
    let allNumeric = true;
    for (const line of lines.slice(1)) {
      const cell = line.split(",")[c]?.trim() ?? "";
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
  const header = csv
    .trim()
    .split("\n")[0]
    .split(",")
    .map((c) => c.trim());
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
  const lines = csv.trim().split("\n");
  const header = lines[0].split(",").map((c) => c.trim());
  const yIdx = column ? header.indexOf(column) : cols.yIdx;
  if (yIdx < 0) return undefined;
  const k = String(key).trim();
  for (const line of lines.slice(1)) {
    const cells = line.split(",");
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
