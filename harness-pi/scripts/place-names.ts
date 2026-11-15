// Builds craft/_shared/place-names.json from Natural Earth's ne_10m_populated_places.dbf (public domain).
// Usage: bun scripts/place-names.ts <path/to/ne_10m_populated_places.dbf>
// Keeps only the places whose name differs in at least one of LANGS, with their coordinates, so a locator can
// tell a source spelling ("Bucharest") from the one a French page prints ("Bucarest").
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const LANGS = ["fr", "de", "es", "it", "pt", "nl", "pl", "sv"] as const;
const file = process.argv[2];
if (!file)
  throw new Error(
    "usage: bun scripts/place-names.ts <ne_10m_populated_places.dbf>",
  );
const buf = readFileSync(file);
const count = buf.readUInt32LE(4);
const headerLength = buf.readUInt16LE(8);
const recordLength = buf.readUInt16LE(10);
const fields: { name: string; length: number }[] = [];
for (let at = 32; buf[at] !== 0x0d; at += 32)
  fields.push({
    name: buf
      .subarray(at, at + 11)
      .toString("latin1")
      .replace(/\0.*$/s, ""),
    length: buf[at + 16],
  });

const places: [string, number, number, Record<string, string>][] = [];
for (let i = 0; i < count; i++) {
  let at = headerLength + i * recordLength + 1;
  const rec: Record<string, string> = {};
  for (const f of fields) {
    rec[f.name] = buf
      .subarray(at, at + f.length)
      .toString("utf8")
      .trim();
    at += f.length;
  }
  const names: Record<string, string> = {};
  for (const lang of LANGS) {
    const local = rec[`NAME_${lang.toUpperCase()}`];
    if (local && local !== rec.NAME) names[lang] = local;
  }
  if (Object.keys(names).length)
    places.push([rec.NAME, Number(rec.LATITUDE), Number(rec.LONGITUDE), names]);
}
const out = join(
  import.meta.dirname,
  "..",
  "craft",
  "_shared",
  "place-names.json",
);
writeFileSync(
  out,
  `${JSON.stringify({ source: "Natural Earth 10m populated places 5.1.2 (public domain)", places })}\n`,
);
console.log(`${places.length} places → ${out}`);
