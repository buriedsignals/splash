// THE CSV GUARD, IN THE SKILL THAT FREEZES THE TABLE.
//
// `csv-split-by-hand` was earned by `proof/more-line-swiss-life-expectancy/render.mjs` — the worked
// example every craft skill points authors at — cutting its rows on a bare `row.split(",")`, and
// its own `earnedBy` names this skill in the same sentence: "skills/intake/scripts/csv.mjs already
// shipped a real RFC 4180 reader that none of them used". The rule reached the five skills that
// DRAW and read a table. It could not reach the skill that WRITES the table they read, because
// `reachable()` iterated the eight skills that draw, and this one freezes.
//
// It reaches here now. `csvSplitByHand` below is the catalogue's own decision, copied
// byte-identically from `map-web/scripts/verify-guards.mjs` (no cross-skill runtime import;
// `splash/test/guard-copies-parity.test.ts` is what holds the copies to one decision), and
// `check-frozen-csv.mjs` beside this file is the command that runs it over this skill's own source.
//
// WHAT IT FINDS TODAY: nothing, and that is the honest state of this cell — `scripts/csv.mjs` is
// the RFC 4180 reader, and it always was. The debt this closes is the missing SWEEP, not a live
// defect: nothing kept this skill's readers clean, and the same round found a real defect in the
// OTHER skill that reads a frozen table which this decision structurally cannot see (a quoted field
// carrying its own newline, torn by a line-oriented reader with no `.split(",")` in it at all).

/** Local CSV-split check. Not registered in the trait-derived guard catalogue (#26). */

import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

/** A `.csv` this script reads whose own row is cut on every literal comma instead of a parser that
 *  understands a quoted field — the pattern beat `proof/more-line-swiss-life-expectancy/render.mjs`
 *  shipped for months and every author since copied: `"1,234.5"` (a thousands separator) and
 *  `"Netherlands, the"` (a name carrying its own comma) both tear in two under a bare
 *  `row.split(",")`, silently — an extra field, every column after it one off, and nothing throws.
 *
 *  Reads SOURCE TEXT, not a delivered artifact: the defect lives in how a beat is WRITTEN, not in
 *  what it renders, so there is no rendered signal to inspect after the fact.
 *
 *  Two shapes have to appear TOGETHER for a match. A newline split that tokenises rows by hand
 *  (`.split(/\r?\n/)`, or the quoted `"\n"` / `"\r\n"` forms) is proof the source is walking a csv's
 *  own rows itself; paired with a bare single-comma split (`.split(",")`, either quote style) that
 *  cuts each one into fields. Either alone proves nothing — a comma split with no row split nearby
 *  is cutting something else (`place.split(" of ").pop().split(",")[0]`, a sentence, not a row: the
 *  false positive measured against `proof/mapgen-symbol-web/render-web.mjs`, which mentions "csv"
 *  repeatedly and reads a real one through a proper parser elsewhere), and a row split with no
 *  comma split nearby means the
 *  fields are read some other, safe way. Returns every offending `.split(",")` snippet found; empty
 *  means this source does not hand-cut a comma on its own csv rows. */
export function csvSplitByHand(source) {
  if (!/\bcsv\b/i.test(source)) return [];
  const rowSplitByHand =
    /\.split\(\s*(\/\\r\?\\n\/|["'`]\\r\\n["'`]|["'`]\\n["'`])\s*\)/.test(source);
  if (!rowSplitByHand) return [];
  return [...source.matchAll(/\.split\(\s*(["'`]),\1\s*\)/g)].map((m) => m[0]);
}

/** EVERY FILE THIS SKILL SHIPS THAT CUTS ITS OWN CSV ROWS BY HAND, with the cuts it makes — the
 *  sweep the decision above had no caller for in either of the two skills that read a journalist's
 *  frozen table.
 *
 *  COMMENTS ARE STRIPPED FIRST, and this file is why. `csvSplitByHand`'s own doc comment spells out
 *  both halves of the pattern it refuses — `.split(/\r?\n/)` and `.split(",")`, in prose, three
 *  lines above the function — so a sweep that read raw text would report the guard itself as the
 *  offender on its first run. That is the same trap `map-beat`'s credential sweep fell into, and it
 *  is the reason a check whose subject is a skill's own source has to read code as code. Whole-line
 *  `//` and block comments only, which is `render-still-parity.test.ts`'s own normalisation and is
 *  argued there: a trailing `//` cannot be cut safely out of a file this full of regex literals.
 *
 *  `test/` IS EXCLUDED, and the exclusion is the rule rather than a convenience: a test builds a
 *  torn row on purpose to watch the decision refuse it, so counting one would make every sweep here
 *  answer for a string somebody wrote to see it go red. */
export function handSplitCsvReaders(skillDir) {
  const pending = [skillDir];
  const found = [];
  while (pending.length > 0) {
    const dir = pending.pop();
    if (!existsSync(dir)) continue;
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (entry.name === "test" || entry.name === "node_modules" || entry.name.startsWith(".")) continue;
      const path = join(dir, entry.name);
      if (entry.isDirectory()) pending.push(path);
      else if (/\.(mjs|js|ts|tsx)$/.test(entry.name)) {
        const cuts = csvSplitByHand(
          readFileSync(path, "utf8")
            .replace(/^[ \t]*\/\/.*$/gm, "")
            .replace(/\/\*[\s\S]*?\*\//g, " "),
        );
        if (cuts.length > 0) found.push({ file: path.slice(skillDir.length + 1), cuts });
      }
    }
  }
  return found.sort((one, other) => one.file.localeCompare(other.file));
}
