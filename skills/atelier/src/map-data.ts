// The two map DATA views (map-dw uses a CSV string, map-native uses a rows array).
// Only the DATA payload is mechanically derivable; the geo binding (basemap, join key)
// is producer-specific and supplied by the agent — NOT derived here.
export interface Row {
  [col: string]: string | number;
}

export function toCsv(rows: Row[]): string {
  if (rows.length === 0) return "";
  const cols = Object.keys(rows[0]);
  const header = cols.join(",");
  const body = rows
    .map((r) => cols.map((c) => String(r[c])).join(","))
    .join("\n");
  return `${header}\n${body}`;
}

export function toRows(csv: string): Row[] {
  const lines = csv.trim().split("\n");
  const cols = lines[0].split(",");
  return lines
    .slice(1)
    .filter((l) => l.length > 0)
    .map((line) => {
      const cells = line.split(",");
      const row: Row = {};
      cols.forEach((c, i) => {
        const raw = cells[i] ?? "";
        const n = Number(raw);
        row[c] = raw !== "" && !Number.isNaN(n) ? n : raw;
      });
      return row;
    });
}
