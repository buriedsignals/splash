/**
 * THE SAME MEASUREMENT AS `chart-web/test/weight-ceiling.test.ts`, ON THIS FORMAT'S OWN FILES.
 *
 * `weightAgainstCeiling` is generic; `CEILING_BYTES` (`../scripts/detect-weight-has-a-ceiling.mjs`)
 * is this format's own — set at the heaviest of the 4 delivered `mapgen-*-web` pages measured
 * 2026-08-20, the same population `test/keyboard-reach.test.ts`'s own `mapWebArtifacts()` walks.
 */
import { describe, expect, it } from "bun:test";
import { existsSync, readdirSync, statSync } from "node:fs";
import { join, resolve } from "node:path";
import {
  weightAgainstCeiling,
  CEILING_BYTES,
} from "../scripts/detect-weight-has-a-ceiling.mjs";

const SKILL = resolve(import.meta.dirname, "..");
const TWIN = resolve(SKILL, "..", "..");
const PROOF = join(TWIN, "proof");

describe("weightAgainstCeiling", () => {
  it("says a file under the ceiling is not over", () => {
    expect(weightAgainstCeiling(100, 200)).toEqual({
      bytes: 100,
      ceiling: 200,
      over: false,
    });
  });

  it("says a file over the ceiling is over", () => {
    expect(weightAgainstCeiling(300, 200)).toEqual({
      bytes: 300,
      ceiling: 200,
      over: true,
    });
  });

  it("does not count a file sitting exactly on the ceiling as over", () => {
    expect(weightAgainstCeiling(200, 200).over).toBe(false);
  });
});

/** The 4 delivered `mapgen-*-web` beats — the same set `test/keyboard-reach.test.ts`'s own
 *  `mapWebArtifacts()` walks, duplicated rather than imported. */
function mapWebArtifacts(): string[] {
  const dirs = ["mapgen-symbol-web", "mapgen-dot-web", "mapgen-hexgrid-web", "mapgen-locator-web"];
  const found: string[] = [];
  for (const dir of dirs) {
    const full = join(PROOF, dir);
    if (!existsSync(full)) continue;
    for (const entry of readdirSync(full)) if (entry.endsWith(".html")) found.push(join(full, entry));
  }
  return found;
}

describe("every map-web page on disk", () => {
  it("weighs at or under this format's own measured ceiling", () => {
    const files = mapWebArtifacts();
    expect(files.length).toBeGreaterThanOrEqual(4);
    const offenders: string[] = [];
    for (const file of files) {
      const bytes = statSync(file).size;
      const found = weightAgainstCeiling(bytes, CEILING_BYTES);
      if (found.over) offenders.push(`${file.slice(TWIN.length + 1)}: ${JSON.stringify(found)}`);
    }
    expect(offenders).toEqual([]);
  });
});
