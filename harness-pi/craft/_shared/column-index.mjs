// A point read as data.json's column POSITIONS rather than a row's values: `lon: Number(LON)` where `LON = col("lon")`
// is 5 puts every point at 5°, 6° (gx-locator video, Qwen3.5-9B, 2026-11-16). Says so, with the read that works.
import { readFileSync } from "node:fs";
import { join } from "node:path";

/** @returns a sentence when `lon`/`lat` equal the positions of data.json's lon and lat columns, else "" */
export function columnIndexHint(lon, lat, here) {
  let columns;
  try {
    columns = JSON.parse(readFileSync(join(here, "data.json"), "utf8")).columns.map((c) => (typeof c === "string" ? c : c.name));
  } catch {
    return "";
  }
  const at = (re) => columns.findIndex((c) => re.test(String(c)));
  const iLon = at(/^(lon|lng|longitude)$/i);
  const iLat = at(/^(lat|latitude)$/i);
  if (iLon < 0 || iLat < 0 || lon !== iLon || lat !== iLat) return "";
  return ` — ${lon} and ${lat} are the positions of data.json's "${columns[iLon]}" and "${columns[iLat]}" columns, not a row's values: read the row's value, Number(r[LON]) and Number(r[LAT]), not Number(LON)`;
}
