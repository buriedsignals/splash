// THE SUBJECT OF `static-bump-emitter-rank`, LOADED AND ASSERTED — the top ten by year, every country ever in it, India's
// rank from 1990 to 2024 and every country it passed, derived.
//
// Runs in Bun only.

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
export const STATIC_DIR = join(HERE, "..", "static-bump-emitter-rank");
export const SLOTS = 10;
export const FIRST = 1990;
export const LAST = 2024;
export const SUBJECT = "India";
export const FRENCH = {
  "United States": "États-Unis", Russia: "Russie", China: "Chine", Japan: "Japon", Germany: "Allemagne", Ukraine: "Ukraine",
  "United Kingdom": "Royaume-Uni", India: "Inde", Canada: "Canada", Italy: "Italie", Kuwait: "Koweït", "South Korea": "Corée du Sud",
  France: "France", Iran: "Iran", "Saudi Arabia": "Arabie saoudite", Indonesia: "Indonésie",
};

export function loadSubject({ dir = STATIC_DIR } = {}) {
  const rows = readFileSync(join(dir, "data.csv"), "utf8")
    .trim()
    .split(/\r?\n/)
    .slice(1)
    .map((l) => l.split(","))
    .map((c) => ({ entity: c[0], code: c[1], year: Number(c[2]), value: Number(c[3]) }))
    .filter((r) => /^[A-Z]{3}$/.test(r.code) && Number.isFinite(r.value) && r.year >= FIRST && r.year <= LAST);
  const years = [...new Set(rows.map((r) => r.year))].sort((a, b) => a - b);
  if (years.length !== LAST - FIRST + 1) throw new Error(`expected every year from ${FIRST} to ${LAST}, got ${years.length}`);
  const top = new Map(years.map((y) => [y, rows.filter((r) => r.year === y).sort((a, b) => b.value - a.value).slice(0, SLOTS).map((r) => r.entity)]));
  const rankOf = (entity, year) => {
    const i = top.get(year).indexOf(entity);
    return i < 0 ? null : i + 1;
  };
  const everIn = [...new Set([...top.values()].flat())];
  for (const e of everIn) if (!FRENCH[e]) throw new Error(`no French name recorded for ${e}`);
  const tracks = everIn.map((entity) => ({ entity, ranks: years.map((y) => rankOf(entity, y)) }));
  const from = rankOf(SUBJECT, FIRST);
  const to = rankOf(SUBJECT, LAST);
  if (!(from === 8 && to === 3)) throw new Error(`the title says India went from 8th to 3rd; it went from ${from} to ${to}`);
  const passed = [];
  for (let i = 1; i < years.length; i++) {
    const [p, y] = [years[i - 1], years[i]];
    const ia = rankOf(SUBJECT, p);
    const ib = rankOf(SUBJECT, y);
    for (const c of top.get(p)) {
      const a = rankOf(c, p);
      const b = rankOf(c, y);
      if (ia && ib && a < ia && (b === null || b > ib)) passed.push({ entity: c, year: y });
    }
  }
  const stillIn = passed.filter((p) => rankOf(p.entity, LAST) !== null);
  if (stillIn.map((p) => p.entity).join() !== "Germany,Japan,Russia") throw new Error(`India should have passed Germany, Japan and Russia among those still in the top ten; it passed ${stillIn.map((p) => p.entity).join(", ")}`);
  return { years, tracks, top, from, to, passed, stillIn };
}
