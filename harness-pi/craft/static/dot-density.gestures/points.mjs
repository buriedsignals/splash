// The points a dot-density beat draws, read from data.json by column NAME. Copied into the beat with
// the kit; beat.mjs and render-beat.mjs both call it, so the count the words state and the count the
// plate draws come from one reader. Throws, by name, on what would draw a wrong field: a column that
// is not there, a coordinate that is not a number or not on Earth, a subject filter that keeps
// nothing or keeps everything.
import { readFileSync } from "node:fs";
import { join } from "node:path";

export function readTable(dir) {
  return JSON.parse(readFileSync(join(dir, "data.json"), "utf8"));
}

const at = (table, name) => {
  const i = table.columns.findIndex((c) => c.name === name);
  if (i < 0)
    throw new Error(`data.json has no column ${JSON.stringify(name)}; its columns are ${table.columns.map((c) => c.name).join(", ")}`);
  return i;
};
const num = (raw) => Number(String(raw).replace(/\s/g, "").replace(",", "."));

/**
 * @param table  data.json as read
 * @param spec   { lon: column, lat: column, subject: { column: value }, where?: { column: value } }
 * @returns      [{ lon, lat, subject, row }] — one per kept row; `row` is the row as an object
 */
export function readPoints(table, { lon, lat, subject, where = {} }) {
  const [xi, yi] = [at(table, lon), at(table, lat)];
  const filters = Object.entries(where).map(([column, value]) => [at(table, column), String(value)]);
  const subjectSpec = Object.entries(subject ?? {});
  if (subjectSpec.length !== 1)
    throw new Error(`subject must name ONE column and the value that marks the takeaway's points, e.g. { kind: "X" }; got ${JSON.stringify(subject)}`);
  const [[subjectColumn, subjectValue]] = subjectSpec;
  const si = at(table, subjectColumn);
  const names = table.columns.map((c) => c.name);
  const points = [];
  for (const r of table.rows) {
    if (!filters.every(([i, v]) => String(r[i]) === v)) continue;
    const p = { lon: num(r[xi]), lat: num(r[yi]) };
    if (!Number.isFinite(p.lon) || !Number.isFinite(p.lat))
      throw new Error(`a row has no usable coordinates (${lon}=${JSON.stringify(r[xi])}, ${lat}=${JSON.stringify(r[yi])}): every dot sits where the source recorded it, so leave out rows without coordinates (say so in the standfirst)`);
    if (Math.abs(p.lat) > 90 || Math.abs(p.lon) > 180)
      throw new Error(`a row has ${lon}=${p.lon}, ${lat}=${p.lat}, which is not on Earth: are the longitude and latitude columns swapped?`);
    points.push({ ...p, subject: String(r[si]) === String(subjectValue), row: Object.fromEntries(names.map((n, i) => [n, r[i]])) });
  }
  if (!points.length) throw new Error(`no row of data.json matches ${JSON.stringify(where)}`);
  const n = points.filter((p) => p.subject).length;
  if (n === 0)
    throw new Error(`no point has ${subjectColumn} = ${JSON.stringify(subjectValue)}; the values of ${subjectColumn} are ${[...new Set(table.rows.map((r) => String(r[si])))].slice(0, 12).join(", ")}`);
  if (n === points.length)
    throw new Error(`every point has ${subjectColumn} = ${JSON.stringify(subjectValue)}: the subject must be a part of the field, ringed against the rest`);
  return points;
}
