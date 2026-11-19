// T7 (locator, 2026-11-15): on a French page the 12B printed "Kyiv" and "Bucharest" as data.json spells them; the
// contract's { name, label } was never filled. Natural Earth knows the page's name for the larger cities, so a bare
// place whose source spelling differs from it is refused with both values that work: the exonym stays a choice.
import { readFileSync } from "node:fs";
import { join } from "node:path";

let table;
const near = (a, b) => Math.abs(a.lat - b[1]) < 0.25 && Math.abs(a.lon - b[2]) < 0.25;
const fold = (s) => String(s).normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();

/** Throws, naming every one, when a place prints a source spelling the page's language writes otherwise. */
export function sourceSpelling(places, rows, lang, { printed: field = "label" } = {}) {
  const code = String(lang ?? "").toLowerCase().slice(0, 2);
  if (!code || code === "en") return undefined;
  table ??= JSON.parse(readFileSync(join(import.meta.dirname, "place-names.json"), "utf8")).places;
  const q = JSON.stringify;
  const wrong = [];
  [places].flat().forEach((p, i) => {
    const name = typeof p === "object" && p !== null ? p.name : p;
    const printed = field === "label" && typeof p === "object" && p !== null && p.label !== undefined ? p.label : name;
    // A label is the beat's choice unless it copies the source's spelling: label: c.name is the example's shape with
    // its table dropped (gx-locator static, 12B and Qwen3.5-9B, 2026-11-16).
    if (fold(printed) !== fold(name)) return;
    const row = rows[i];
    const known = row && table.find((t) => near(row, t) && fold(t[0]) === fold(name));
    const local = known?.[3][code];
    if (!local || fold(local) === fold(name)) return;
    wrong.push({ i, name, local });
  });
  if (!wrong.length) return undefined;
  // Every place at once: one per render cost the 12B a round per city (gx-locator static, 2026-11-16).
  const head = wrong.map(({ i, name, local }) => `places[${i}]: ${q(name)} → ${q(local)}`).join("; ");
  throw new Error(
    `${head} — ${wrong.length > 1 ? "these are" : "this is"} data.json's spelling, printed as is; a ${code} page usually prints the Natural Earth name — values that work: ${
      field === "label"
        ? `${wrong.map(({ name, local }) => `{ name: ${q(name)}, label: ${q(local)} }`).join(", ")}; a label copied from the name (label: c.name) prints the source's spelling`
        : `${wrong.map(({ local }) => `{ name: ${q(local)} }`).join(", ")}; this kit prints each place's name, so a name read straight from data.json prints the source's spelling`
    }`,
  );
}

/** Throws when a sentence prints a place's map spelling that the page's language writes otherwise. A live-map
 *  scrolly keeps `places[].name` as MapTiler spells it (it filters the map's own labels); its cards are prose in the
 *  page's language (gx-locator scrolly, Qwen3.5-9B mvq144 and 12B mvg96, 2026-11-19: « Kyiv, Bucharest »). */
export function proseSpelling(text, places, lang) {
  const code = String(lang ?? "").toLowerCase().slice(0, 2);
  if (!code || code === "en") return undefined;
  table ??= JSON.parse(readFileSync(join(import.meta.dirname, "place-names.json"), "utf8")).places;
  const folded = ` ${fold(text).replace(/[^\p{L}\p{N}-]+/gu, " ")} `;
  const wrong = [];
  for (const p of [places].flat()) {
    if (!p || typeof p.name !== "string" || !Number.isFinite(p.lon) || !Number.isFinite(p.lat)) continue;
    const nearest = table
      .filter((t) => near(p, t))
      .sort((a, b) => Math.hypot(a[1] - p.lat, a[2] - p.lon) - Math.hypot(b[1] - p.lat, b[2] - p.lon))[0];
    const local = nearest?.[3][code];
    if (!local || fold(local) === fold(p.name)) continue;
    if (folded.includes(` ${fold(p.name)} `)) wrong.push({ name: p.name, local });
  }
  if (!wrong.length) return undefined;
  const q = JSON.stringify;
  throw new Error(
    `${wrong.map(({ name, local }) => `${q(name)} → ${q(local)}`).join("; ")} — the card prints the map's spelling; a ${code} page says ${wrong.map(({ local }) => q(local)).join(", ")}. ` +
      `places[].name stays the map's spelling (it filters MapTiler's labels); the cards name each place through a table of the page's names — values that work: { ${wrong.map(({ name, local }) => `${q(name)}: ${q(local)}`).join(", ")} }`,
  );
}
