// THE CSV GUARD, IN THE SKILL THAT READS THE FROZEN TABLE BACK.
//
// `csv-split-by-hand` reached the five skills that DRAW and read a table, and neither of the two
// that read a journalist's frozen `source/data.csv` outside a render: `intake`, which freezes it,
// and this one, whose `ground-claim.mjs` reads values back out of it to decide whether the article's
// own superlative is grounded. `reachable()` iterated the eight skills that draw until 2026-08-23.
//
// It reaches here now. `csvSplitByHand` below is the catalogue's own decision, copied
// byte-identically from `map-web/scripts/verify-guards.mjs` (no cross-skill runtime import;
// `splash/test/guard-copies-parity.test.ts` is what holds the copies to one decision), and
// `check-frozen-csv.mjs` beside this file is the command that runs it over this skill's own source.
//
// AND WHAT IT CANNOT SEE, named here rather than left to be discovered. This skill's own
// `readFrozenRows` was defective on the day the rule arrived — it split the table into LINES and
// parsed quotes inside each one, so a quoted field carrying its own newline became a whole extra
// row — and this decision was green on it throughout, because there is no `.split(",")` in a
// per-character splitter. The fix was not a better guard: it was reading the frozen table with
// `intake`'s own parser, one reader instead of two. A guard is what keeps the easy defect from
// coming back; it is not a substitute for the two skills agreeing.

/** The guards this script carries, read by `scripts/guards.mjs` and checked against
 *  `doctrine/references/guard-catalogue.json` by `doctrine/test/guard-parity.test.ts`. */
export const GUARDS = ["csvSplitByHand"];

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
