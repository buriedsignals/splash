// T7 (locator, 2026-11-15): on a French page the 12B printed "Kyiv" and "Bucharest" as data.json spells them; the
// contract's { name, label } was never filled. Natural Earth knows the page's name for the larger cities, so a bare
// place whose source spelling differs from it is refused with both values that work: the exonym stays a choice.
import { readFileSync } from "node:fs";
import { join } from "node:path";

let table;
const near = (a, b) => Math.abs(a.lat - b[1]) < 0.25 && Math.abs(a.lon - b[2]) < 0.25;
const fold = (s) => String(s).normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();

/** Throws when a bare place (no label) prints a source spelling the page's language writes otherwise. */
export function sourceSpelling(places, rows, lang) {
  const code = String(lang ?? "").toLowerCase().slice(0, 2);
  if (!code || code === "en") return undefined;
  table ??= JSON.parse(readFileSync(join(import.meta.dirname, "place-names.json"), "utf8")).places;
  [places].flat().forEach((p, i) => {
    if (typeof p === "object" && p !== null && p.label !== undefined) return;
    const name = typeof p === "object" && p !== null ? p.name : p;
    const row = rows[i];
    const known = row && table.find((t) => near(row, t) && fold(t[0]) === fold(name));
    const local = known?.[3][code];
    if (!local || fold(local) === fold(name)) return;
    const q = JSON.stringify;
    throw new Error(
      `places[${i}]: ${q(name)} is data.json's spelling; a ${code} page usually prints it ${q(local)} (Natural Earth) — a value that works: { name: ${q(name)}, label: ${q(local)} }, or { name: ${q(name)}, label: ${q(name)} } to keep the source's spelling`,
    );
  });
  return undefined;
}
