// The places a dot-density WEB beat draws, read from data.json by column NAME — the static kit's
// reader (static/dot-density/points.mjs) extended with what the web gesture needs: each place's
// quantity (what a dot is worth under a value rule), its category (which of three treatments it
// wears) and its country (the table and the answer). beat.mjs and render-beat.mjs both call it, so
// the counts the words state and the counts the map draws come from one reader. Throws, by name, on
// what would draw a wrong field.
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
const oneColumn = (spec, what) => {
  const entries = Object.entries(spec ?? {});
  if (entries.length !== 1) throw new Error(`${what} must name ONE column and its value(s), e.g. { kind: "X" }; got ${JSON.stringify(spec)}`);
  return entries[0];
};
const asSet = (v) => new Set([v].flat().map(String));

/**
 * @param table  data.json as read
 * @param spec   { lon, lat, value, country: column names; subject: { column: value } (the named
 *               category); second: { column: [values] } (the second treatment); where?: { column:
 *               value | [values] } (rows kept); exclude?: { column: [values] } (rows left out) }
 * @returns      [{ lon, lat, value, category, country, kind, row }] — `kind` is 2 for the subject, 1
 *               for `second`, 0 for every other category; `row` is the row as an object
 */
export function readPoints(table, { lon, lat, value, country, subject, second, where = {}, exclude = {} }) {
  const [xi, yi, vi, ci] = [at(table, lon), at(table, lat), at(table, value), at(table, country)];
  const [subjectColumn, subjectValue] = oneColumn(subject, "subject");
  const [secondColumn, secondValues] = oneColumn(second, "second");
  if (secondColumn !== subjectColumn)
    throw new Error(`second must name the same column as subject (${subjectColumn}): the three treatments are three groups of ONE category column`);
  const ki = at(table, subjectColumn);
  const keep = Object.entries(where).map(([column, v]) => [at(table, column), asSet(v)]);
  const drop = Object.entries(exclude).map(([column, v]) => [at(table, column), asSet(v)]);
  const seconds = asSet(secondValues);
  if (seconds.has(String(subjectValue))) throw new Error(`second holds the subject's own value ${JSON.stringify(subjectValue)}`);
  const names = table.columns.map((c) => c.name);
  const points = [];
  for (const r of table.rows) {
    if (!keep.every(([i, s]) => s.has(String(r[i])))) continue;
    if (drop.some(([i, s]) => s.has(String(r[i])))) continue;
    const p = { lon: num(r[xi]), lat: num(r[yi]), value: num(r[vi]) };
    if (!Number.isFinite(p.lon) || !Number.isFinite(p.lat))
      throw new Error(`a row has no usable coordinates (${lon}=${JSON.stringify(r[xi])}, ${lat}=${JSON.stringify(r[yi])}): every dot sits where the source recorded it, so leave out rows without coordinates with exclude (say so in the standfirst)`);
    if (Math.abs(p.lat) > 90 || Math.abs(p.lon) > 180)
      throw new Error(`a row has ${lon}=${p.lon}, ${lat}=${p.lat}, which is not on Earth: are the longitude and latitude columns swapped?`);
    if (!Number.isFinite(p.value) || p.value <= 0)
      throw new Error(`a row has ${value}=${JSON.stringify(r[vi])}: a place's quantity must be a positive number (a value rule cannot give a dot to nothing) — leave such rows out with where or exclude, and say so`);
    const category = String(r[ki]);
    points.push({ ...p, category, country: String(r[ci]), kind: category === String(subjectValue) ? 2 : seconds.has(category) ? 1 : 0, row: Object.fromEntries(names.map((n, i) => [n, r[i]])) });
  }
  if (!points.length) throw new Error(`no row of data.json is kept by where ${JSON.stringify(where)} and exclude ${JSON.stringify(exclude)}`);
  const values = [...new Set(table.rows.map((r) => String(r[ki])))].slice(0, 12).join(", ");
  const n = points.filter((p) => p.kind === 2).length;
  if (n === 0) throw new Error(`no kept place has ${subjectColumn} = ${JSON.stringify(subjectValue)}; the values of ${subjectColumn} are ${values}`);
  if (n === points.length) throw new Error(`every place has ${subjectColumn} = ${JSON.stringify(subjectValue)}: the subject must be a part of the field`);
  if (!points.some((p) => p.kind === 1)) throw new Error(`no kept place has ${subjectColumn} in ${JSON.stringify([...seconds])}: second must name the category (or categories) drawn in the second treatment; the values of ${subjectColumn} are ${values}`);
  if (!points.some((p) => p.kind === 0)) throw new Error(`every place is the subject or second: the quiet treatment would be empty — keep second to the next most telling category`);
  return points;
}
