/**
 * THE PATTERN EVERY BEAT COPIES, WALKED.
 *
 * `proof/more-line-swiss-life-expectancy/render.mjs` — the worked example the craft skills point
 * authors at — used to cut a csv row on a bare `.split(",")`. Against real messy data that is
 * silent corruption, not a crash: `"1,234.5"` (a thousands separator) tears into two fields,
 * `"Netherlands, the"` (a name carrying its own comma) tears in half, and every column after either
 * one is one off from there — while `skills/intake/scripts/csv.mjs` already ships a real RFC 4180
 * reader nobody used.
 *
 * WHAT COUNTS AS AN OFFENDER. A file that merely mentions the word "csv", or merely calls
 * `.split(",")` on something else entirely (a signature, a destructured name, a place string,
 * `probe.stdout`'s own `"800,600"`), is not one — measured false positives from an earlier, looser
 * version of this scan: `proof/mapgen-symbol-web/render-web.mjs` reads a real csv through a
 * proper parser (`quakesFromCsv`) and ALSO calls `place.split(" of ").pop().split(",")[0]` on a
 * sentence; `skills/deliver/test/format-handover.test.ts` and
 * `skills/splash/test/render-output-lands-in-its-own-beat.test.ts` both mention "olympics.csv" or
 * "data.csv" as prose while splitting a function SIGNATURE or a DESTRUCTURED name, never a csv row;
 * `skills/palette/scripts/palette.mjs`, `skills/splash/scripts/newsroom.mjs` and others split a
 * comma-separated PALETTE.md/NEWSROOM.md field, never a csv, and never mention the word "csv" at
 * all — checked directly, which is why this scan matches the WORD "csv" rather than a literal
 * `.csv` file extension: `map-beat/assets/geo.ts` takes a `csv: string` parameter handed to it
 * already read, and never names the extension a caller read it from.
 * TWO shapes have to appear TOGETHER in the same file: a newline split that tokenises rows by hand
 * (`.split(/\r?\n/)`, or the quoted `"\n"` / `"\r\n"` forms) — proof the source walks a csv's own
 * rows itself — paired with a bare single-comma split (`.split(",")`, either quote style) that cuts
 * each one into fields. This is the same two-signal test `csvSplitByHand`
 * (`skills/*\/scripts/verify-*.mjs`, the catalogue's own `csv-split-by-hand` guard) applies to one
 * skill's own scripts at a time; this file applies it to every file the project ships.
 *
 * MEASURED 2026-08-20, before any fix: 84 offenders out of 744 files walked (`proof/`, `stories/`,
 * `skills/`, `shared/`, `installer/`) — 69 in `proof/` (including 7 `geo-dot.ts`/`geo-flow.ts`
 * cores and one `life-data.ts`, found only once this scan matched the WORD "csv" rather than a
 * literal `.csv` path), 4 in `stories/` (including `stress-c-vacant-homes`, one of the three
 * frozen stress fixtures), 10 in this project's own skill scripts/assets
 * (`chart-video/scripts/render-video.mjs`, `dw-beat/scripts/prove-co2.mjs`,
 * `map-beat/scripts/render-map.mjs`'s own `assets/geo.ts` and `scripts/extent-range.mjs`,
 * `scrolly/assets/gauge-data.ts`), and 1 test helper
 * (`skills/splash/test/camera-holds-the-study-set.test.ts`). All 84 are fixed: each keeps its own
 * inlined RFC 4180 row tokeniser (no cross-skill runtime import — a proof/story workspace is not a
 * skill, and each skill stays copy-pasteable on its own), and the walk below now finds none. A
 * reader that goes quiet is not proof of a clean tree — the `toBeGreaterThan` floor on `walked`
 * below is what turns a scan that silently stopped finding files into a red, not a pass.
 */
import { describe, expect, it } from "bun:test";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(import.meta.dirname, "..", "..", "..");
const SCAN_DIRS = ["proof", "stories", "skills", "shared", "installer"];
const EXCLUDE_DIRS = new Set(["node_modules", ".git"]);

function* sourceFiles(dir: string): Generator<string> {
  let entries: string[];
  try {
    entries = readdirSync(dir);
  } catch {
    return;
  }
  for (const name of entries) {
    if (EXCLUDE_DIRS.has(name)) continue;
    const path = join(dir, name);
    const stats = statSync(path);
    if (stats.isDirectory()) yield* sourceFiles(path);
    else if (/\.(mjs|ts|tsx|js)$/.test(name)) yield path;
  }
}

const CSV_REF = /\bcsv\b/i;
const ROW_SPLIT_BY_HAND =
  /\.split\(\s*(\/\\r\?\\n\/|["'`]\\r\\n["'`]|["'`]\\n["'`])\s*\)/;
const FIELD_SPLIT_BY_HAND = /\.split\(\s*(["'`]),\1\s*\)/;

function handSplitsACsv(source: string): boolean {
  return (
    CSV_REF.test(source) &&
    ROW_SPLIT_BY_HAND.test(source) &&
    FIELD_SPLIT_BY_HAND.test(source)
  );
}

describe("no file reads a csv and splits it by hand", () => {
  it("should find none — the pattern beat's own defect, walked everywhere it could recur", () => {
    let walked = 0;
    const offenders: string[] = [];
    for (const dir of SCAN_DIRS) {
      for (const file of sourceFiles(join(ROOT, dir))) {
        walked++;
        // GUARD MACHINERY EXCLUDED, same reasoning `traits.mjs`'s `inlines-its-assets` witness was
        // ruled on 2026-08-20: `csvSplitByHand`'s own regex source (in every `verify-*.mjs` this
        // guard was added to) literally CONTAINS the two-signal text this scan looks for — it is
        // written to DETECT the pattern, never to commit it. This file's own `handSplitsACsv` is
        // the same shape, one level up: its own regex source contains the very two-signal text it
        // scans for, so it flags ITSELF unless excluded too. Still walked and counted, only not
        // flagged as an offender by name.
        if (/^(verify|detect)-.*\.mjs$/.test(file.split("/").pop()!)) continue;
        if (file === import.meta.path) continue;
        if (handSplitsACsv(readFileSync(file, "utf8")))
          offenders.push(file.slice(ROOT.length + 1));
      }
    }
    // A reader that stopped walking real files would also report zero offenders — this floor is
    // what tells the two apart. Measured 2026-08-20: 743 files.
    expect(walked).toBeGreaterThan(700); // measured 2026-08-20: 744 files
    expect(offenders).toEqual([]);
  });
});
