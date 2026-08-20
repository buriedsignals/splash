/**
 * THE DELIVERED FILE'S OWN WEIGHT, AGAINST WHAT THIS FORMAT'S BEATS ACTUALLY WEIGH TODAY.
 *
 * `image-beat`'s `checkWeight` refuses a beat about to embed more than 20 MB of raw photograph
 * bytes — a limit on what goes IN. Nothing has ever measured what comes OUT: the delivered file
 * itself, once every asset it inlines is already inside it. `weightAgainstCeiling` is that
 * measurement, and `CEILING_BYTES` (`../scripts/detect-weight-has-a-ceiling.mjs`) is this format's
 * own ceiling, set at the heaviest of the 17 delivered `chart-web` pages measured 2026-08-20.
 */
import { describe, expect, it } from "bun:test";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
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

/** Every delivered `chart-web` page on disk, told apart from its `map-web` sibling the same way
 *  `test/keyboard-reach.test.ts`'s own `chartWebArtifacts()` does: which format's own `renderWeb`
 *  actually wrote the file. */
function chartWebArtifacts(): string[] {
  const found: string[] = [];
  const walk = (dir: string) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const path = join(dir, entry.name);
      if (entry.isDirectory()) walk(path);
      else if (entry.name.endsWith(".html")) {
        const source = readFileSync(path, "utf8");
        if (/data-step|step-panel/.test(source)) continue; // scrolly, not this format
        const dirHasChartWebImport = readdirSync(dir)
          .filter((name) => name.endsWith(".mjs"))
          .some((name) =>
            readFileSync(join(dir, name), "utf8").includes(
              "skills/chart-web/scripts/render-web.mjs",
            ),
          );
        if (dirHasChartWebImport) found.push(path);
      }
    }
  };
  if (existsSync(PROOF) && statSync(PROOF).isDirectory()) walk(PROOF);
  return found;
}

describe("every chart-web page on disk", () => {
  it("weighs at or under this format's own measured ceiling", () => {
    const files = chartWebArtifacts();
    // Same floor as `test/keyboard-reach.test.ts`, for the same reason: a count under this means
    // the walk stopped finding beats, not that the beats got lighter.
    expect(files.length).toBeGreaterThanOrEqual(17);
    const offenders: string[] = [];
    for (const file of files) {
      const bytes = statSync(file).size;
      const found = weightAgainstCeiling(bytes, CEILING_BYTES);
      if (found.over) offenders.push(`${file.slice(TWIN.length + 1)}: ${JSON.stringify(found)}`);
    }
    expect(offenders).toEqual([]);
  });
});
