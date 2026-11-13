// Country names in a journalist's table, resolved to the ISO alpha-3 codes the map kits join on.
// Names are matched against the kit's own shapes (shapes.geojson beside it) and a short list of usual
// aliases; a name nothing matches is refused with the closest name, so a misspelling ("Belgiumm") is
// corrected in beat.mjs as a visible decision, never guessed.
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { ALIASES, distance, norm } from "./country-names.mjs";

/** name → ISO-3 for the shapes beside `dir` (the beat folder). */
export function countryIndex(dir) {
  const path = join(dir, "shapes.geojson");
  const names = new Map(Object.entries(ALIASES));
  const codes = new Set(Object.values(ALIASES));
  if (existsSync(path))
    for (const f of JSON.parse(readFileSync(path, "utf8")).features ?? []) {
      const { iso, name } = f.properties ?? {};
      if (iso) codes.add(iso);
      if (iso && name) names.set(norm(name), iso);
    }
  return { names, codes };
}

/**
 * The ISO-3 code of each value in `names` (country names or codes). `rename` maps a source spelling to
 * the right name or code, for a misspelling the journalist confirms. Throws once, naming every value it
 * could not resolve with the closest known name.
 */
export function iso3Of(names, dir, rename = {}) {
  // One name gives one code: a beat called iso3Of(country, HERE) per row in a try/catch, names.map threw on the string,
  // and every row was skipped (Qwen3.5-9B, gx-proportional-symbol web, 2026-11-13).
  if (!Array.isArray(names)) return iso3Of([names], dir, rename)[0];
  const { names: index, codes } = countryIndex(dir);
  const unresolved = [];
  const out = names.map((raw) => {
    const given = rename[raw] ?? raw;
    const upper = String(given).trim().toUpperCase();
    if (/^[A-Z]{3}$/.test(upper) && codes.has(upper)) return upper;
    const hit = index.get(norm(given));
    if (hit) return hit;
    const closest = [...index.keys()].sort((a, b) => distance(norm(given), a) - distance(norm(given), b))[0];
    unresolved.push(`${JSON.stringify(raw)} (closest: ${closest})`);
    return null;
  });
  // A beat copied the contract example's [CODE, NAME, VALUE] onto data with no code column, and passed the
  // value column as names; the misspelling advice sent it round the same refusal twice.
  const numeric = names.filter((n) => n !== null && n !== "" && Number.isFinite(Number(n)));
  if (numeric.length)
    throw new Error(`these "country names" are numbers (${numeric.slice(0, 3).join(", ")}): beat.mjs reads the value column as the names. Read the names from the column whose cells are country names (find it by name in data.json's columns), and the value from the number column`);
  if (unresolved.length)
    throw new Error(`these country names match no country on the map: ${unresolved.join(", ")}. If one is a misspelling, map it in beat.mjs with rename { "<as written>": "<country>" } — say so in the standfirst — or leave the row out`);
  // The codes in the order of the names, and also keyed by each name as written: a 12B beat read codes["Germany"]
  // off the array and refused its own countries.
  names.forEach((name, i) => { if (!(String(name) in out)) out[String(name)] = out[i]; });
  return out;
}
