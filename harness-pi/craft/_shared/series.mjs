// The one series a beat draws, read from data.json by name. Copied into the beat with the kit; the
// model calls it instead of writing filters by hand (the 12B indexed columns off by one and mistook
// rows for objects). Throws, by name, on what would draw a wrong line: a column that is not there, a
// filter that keeps nothing, two values for one x, a cell that is not a number.
import { readFileSync } from "node:fs";
import { join } from "node:path";

export function readTable(dir) {
  return JSON.parse(readFileSync(join(dir, "data.json"), "utf8"));
}

/**
 * @param table  data.json as read
 * @param spec   { x: column, y: column, where?: { column: value }, from?: number, to?: number }
 * @returns      [{ year, value }] in x order, one per x
 */
export function series(table, { x, y, where = {}, from = -Infinity, to = Infinity }) {
  const at = (name) => {
    const i = table.columns.findIndex((c) => c.name === name);
    if (i < 0) throw new Error(`data.json has no column ${JSON.stringify(name)}; its columns are ${table.columns.map((c) => c.name).join(", ")}`);
    return i;
  };
  const [xi, yi] = [at(x), at(y)];
  const filters = Object.entries(where).map(([column, value]) => [at(column), String(value)]);
  const rows = table.rows.filter((r) => filters.every(([i, v]) => String(r[i]) === v));
  if (!rows.length) throw new Error(`no row of data.json matches ${JSON.stringify(where)}`);
  const points = new Map();
  for (const r of rows) {
    const year = Number(r[xi]);
    if (!Number.isFinite(year) || year < from || year > to) continue;
    const raw = r[yi];
    if (raw === "-" || raw === null || raw === "") continue;
    const value = Number(String(raw).replace(/\s/g, "").replace(",", "."));
    if (!Number.isFinite(value)) throw new Error(`${y} for ${year} is ${JSON.stringify(raw)}, not a number`);
    if (points.has(year)) throw new Error(`two rows give ${y} for ${year}: add a where filter on the column that splits them`);
    points.set(year, value);
  }
  return [...points].sort((a, b) => a[0] - b[0]).map(([year, value]) => ({ year, value }));
}
