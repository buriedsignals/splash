/**
 * THE GUARD THE CATALOGUE COULD NOT ASK THIS SKILL UNTIL 2026-08-23.
 *
 * `csv-split-by-hand` refuses a reader that cuts a csv row on every literal comma instead of
 * parsing a quoted field: `"1,234.5"` tears into two fields, `"Netherlands, the"` tears in half,
 * every column after either one is one off, and nothing throws. Its own `earnedBy` names
 * `intake/scripts/csv.mjs` — the RFC 4180 reader that already shipped and that none of the 84
 * offenders used. The rule reached the five skills that DRAW and read a table; the two skills that
 * read a journalist's FROZEN table outside a render were never asked, because the catalogue's
 * population was the eight skills that draw.
 *
 * WHAT EACH ASSERTION HOLDS, and the mutation that reddens it:
 *
 *   1. no file this skill ships cuts a csv row by hand. MUTATION: the scratch skills below do, and
 *      are named with the exact cut they make.
 *   2. THE SWEEP READS CODE AS CODE. `csvSplitByHand`'s own doc comment spells both halves of the
 *      pattern it refuses, so a sweep over raw text reports the guard as the offender — pinned
 *      below by measuring both readings of the same file, because a stripping step nobody watches
 *      is a stripping step somebody deletes.
 *   3. the command exits non-zero on a skill that carries one. A decision nothing runs has not
 *      landed (round six, AC1).
 *   4. the documented false positive stays a false positive: a comma split with no row split beside
 *      it is cutting a sentence, not a table.
 *
 * EVERY OFFENDING FIXTURE BELOW IS ASSEMBLED FROM PIECES rather than written out, which looks fussy
 * and is not: `splash/test/csv-hand-split.test.ts` walks every source file in this repository for
 * the same two signals and does NOT strip comments, so a file that spells the pattern out — even as
 * test material, even inside a string — is an offender there. `deliver.mjs`'s own
 * `"__MAPTILER" + "_KEY__"` is the same move for the same kind of scan.
 */
import { afterEach, describe, expect, it } from "bun:test";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { csvSplitByHand, handSplitCsvReaders } from "../scripts/verify-frozen-csv.mjs";

const SKILL = join(import.meta.dirname, "..");
const COMMAND = join(SKILL, "scripts", "check-frozen-csv.mjs");
const GUARD_FILE = join(SKILL, "scripts", "verify-frozen-csv.mjs");

const ROW_CUT = '.split("' + '\\n")';
const FIELD_CUT = '.split("' + ',")';
const HAND_SPLIT =
  `const rows = csv${ROW_CUT};\n` +
  `export const cells = rows.map((row) => row${FIELD_CUT});\n`;

const scratches: string[] = [];
afterEach(() => {
  for (const dir of scratches.splice(0)) rmSync(dir, { recursive: true, force: true });
});

function scratchSkill(name: string, source: string): string {
  const dir = mkdtempSync(join(tmpdir(), "frozen-csv-sweep-"));
  mkdirSync(join(dir, "scripts"), { recursive: true });
  writeFileSync(join(dir, "scripts", name), source);
  scratches.push(dir);
  return dir;
}

describe("no reader in this skill cuts a csv row on a bare comma", () => {
  it("finds nothing in the files this skill ships", () => {
    expect(handSplitCsvReaders(SKILL)).toEqual([]);
  });

  it("names the file and the cut when one does", () => {
    const dir = scratchSkill("reader.mjs", HAND_SPLIT);
    expect(handSplitCsvReaders(dir)).toEqual([
      { file: join("scripts", "reader.mjs"), cuts: ['.split(",")'] },
    ]);
  });

  // THE TRAP, PINNED. The guard's own doc comment spells both halves of the pattern it refuses, in
  // prose, three lines above the function. Read raw, the decision reports its own file; read as
  // code, it does not. Deleting the stripping step in `handSplitCsvReaders` reddens this.
  it("reads code as code, so the guard's own doc comment is not an offender", () => {
    expect(csvSplitByHand(readFileSync(GUARD_FILE, "utf8")).length).toBeGreaterThan(0);
    expect(handSplitCsvReaders(SKILL).map((found) => found.file)).not.toContain(
      join("scripts", "verify-frozen-csv.mjs"),
    );
  });

  it("never counts a test as the skill's own source", () => {
    const dir = scratchSkill("reader.mjs", "export const clean = true;\n");
    mkdirSync(join(dir, "test"), { recursive: true });
    writeFileSync(join(dir, "test", "torn.test.ts"), HAND_SPLIT);
    expect(handSplitCsvReaders(dir)).toEqual([]);
  });

  // The measured false positive the decision's own comment names: a comma split with no row split
  // beside it is cutting a sentence, not a table.
  it("leaves a comma split that is not cutting a csv row alone", () => {
    const dir = scratchSkill(
      "place.mjs",
      `const csv = await read();\nexport const town = place.split(" of ").pop()${FIELD_CUT}[0];\n`,
    );
    expect(handSplitCsvReaders(dir)).toEqual([]);
  });
});

// THE WIRING, CHECKED RATHER THAN ASSERTED. `declarationsWithoutACaller` is the decision that
// refuses a guard a skill DECLARES and nothing it ships ever calls — round six's finding AC1, where
// a rule was distributed to eight skills and called by none four hours after the fix was reported.
// It never asks this skill, because it iterates the eight that DRAW; asking it here is what turns
// "the command calls it" from a sentence in a commit message into something a test reads off the
// files. An import is not a call there and a comment is not a call either, which is the whole point.
describe("the guard this skill declares is reachable from something a person runs", () => {
  it("is not one of this skill's declarations without a caller", async () => {
    const wiring = await import("../../map-web/scripts/detect-guard-wiring.mjs");
    expect(wiring.declarationsWithoutACaller(SKILL)).not.toContain("csvSplitByHand");
    const declared = wiring
      .declaredDecisions(SKILL)
      .find((decision: { name: string }) => decision.name === "csvSplitByHand");
    expect(declared?.callers).toEqual(["scripts/check-frozen-csv.mjs"]);
  });
});

describe("the command a person runs", () => {
  it("exits 0 on this skill", () => {
    const run = Bun.spawnSync(["bun", COMMAND], { cwd: SKILL });
    expect(`${run.exitCode}: ${run.stdout.toString()}`).toBe(`0: ${run.stdout.toString()}`);
  });

  it("exits 1 and names the file on a skill that cuts a row by hand", () => {
    const run = Bun.spawnSync(["bun", COMMAND, scratchSkill("reader.mjs", HAND_SPLIT)]);
    expect(run.exitCode).toBe(1);
    expect(run.stdout.toString()).toContain("reader.mjs");
  });
});
