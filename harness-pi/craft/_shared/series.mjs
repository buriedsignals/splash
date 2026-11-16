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
 * @param spec   { x: column, y: column | (row) => number, where?: { column: value }, from?: number, to?: number }
 *               y as a function reads the row by column name — (r) => r.solar / (r.solar + r.gas) — for a measure
 *               data.json does not hold as one column (a share, a sum); reading a column it lacks throws.
 * @returns      [{ year, value }] in x order, one per x
 */
export function series(table, { x, y, where = {}, from = -Infinity, to = Infinity }) {
  const at = (name) => {
    const i = table.columns.findIndex((c) => c.name === name);
    if (i < 0) throw new Error(`data.json has no column ${JSON.stringify(name)}; its columns are ${table.columns.map((c) => c.name).join(", ")}`);
    return i;
  };
  const xi = at(x);
  const yi = typeof y === "function" ? -1 : at(y);
  const named = (r) =>
    new Proxy({}, {
      get: (_, key) => (typeof key === "string" ? r[at(key)] : undefined),
    });
  const filters = Object.entries(where).map(([column, value]) => [at(column), String(value)]);
  const rows = table.rows.filter((r) => filters.every(([i, v]) => String(r[i]) === v));
  if (!rows.length) throw new Error(`no row of data.json matches ${JSON.stringify(where)}`);
  const points = new Map();
  for (const r of rows) {
    const year = Number(r[xi]);
    if (!Number.isFinite(year) || year < from || year > to) continue;
    const raw = yi < 0 ? y(named(r)) : r[yi];
    if (raw === "-" || raw === null || raw === "") continue;
    const value = Number(String(raw).replace(/\s/g, "").replace(",", "."));
    if (!Number.isFinite(value)) throw new Error(`${yi < 0 ? "y" : y} for ${year} is ${JSON.stringify(raw)}, not a number`);
    if (points.has(year)) throw new Error(`two rows give ${yi < 0 ? "y" : y} for ${year}: add a where filter on the column that splits them`);
    points.set(year, value);
  }
  return [...points].sort((a, b) => a[0] - b[0]).map(([year, value]) => ({ year, value }));
}

/**
 * Each entity of data.json once, in data order: { name, code, where }. name is in the page's language — the analyst's
 * <entity>_<lang> column when data.json has one, else the entity column — and where selects that entity's rows for
 * series(). gx-small-multiples web (Qwen3.5-9B, 2026-11-16): three runs failed on keying names by code, then filtering
 * the English entity column with a French name.
 */
export function members(table) {
  const cols = table.columns.map((c) => c.name);
  let entity = cols.indexOf("entity");
  if (entity < 0) entity = table.columns.findIndex((c) => c.type === "text");
  if (entity < 0) throw new Error(`data.json has no entity column; its columns are ${cols.join(", ")}`);
  const localized = cols.findIndex((n) => n.startsWith(`${cols[entity]}_`) && /_[a-z]{2}$/.test(n));
  const code = cols.findIndex((n) => /^code$/i.test(n));
  const seen = new Map();
  for (const r of table.rows) {
    const key = String(r[entity]);
    if (seen.has(key)) continue;
    seen.set(key, { name: String(r[localized >= 0 ? localized : entity]), code: code >= 0 ? String(r[code]) : null, where: { [cols[entity]]: key } });
  }
  return [...seen.values()];
}
