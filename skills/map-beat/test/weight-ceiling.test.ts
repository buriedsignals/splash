/**
 * THE DELIVERED FILE'S OWN WEIGHT, AGAINST WHAT THIS FORMAT'S BEATS ACTUALLY WEIGH TODAY.
 *
 * `image-beat`'s `checkWeight` refuses a beat about to embed more than 20 MB of raw photograph
 * bytes — a limit on what goes IN. Nothing has ever measured what comes OUT: the delivered file
 * itself, once every asset it inlines is already inside it. `weightAgainstCeiling` is that
 * measurement, and `CEILING_BYTES` (`../scripts/detect-weight-has-a-ceiling.mjs`) is this format's
 * own ceiling, set at the heaviest of the 7 `render/static.svg` stills measured 2026-08-20 — the
 * same population `test/verify-map.test.ts`'s own `mapStills()` walks for `duplicatedPayload`.
 */
import { describe, expect, it } from "bun:test";
import { existsSync, readdirSync, statSync } from "node:fs";
import { join, resolve } from "node:path";
import {
  weightAgainstCeiling,
  CEILING_BYTES,
  MEASURED_MAX_BYTES,
  MARGIN_BYTES,
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

describe("this format's ceiling carries a margin above today's measured maximum", () => {
  it("states both numbers, and the ceiling is exactly their sum", () => {
    expect(MARGIN_BYTES).toBeGreaterThan(0);
    expect(CEILING_BYTES).toBe(MEASURED_MAX_BYTES + MARGIN_BYTES);
  });

  // RULED 2026-08-20: a ceiling set at EXACTLY today's champion has no margin — the next delivered
  // beat one byte heavier than `MEASURED_MAX_BYTES` used to trip this guard on ordinary growth.
  it("does not trip on a file one byte heavier than today's measured maximum", () => {
    expect(weightAgainstCeiling(MEASURED_MAX_BYTES + 1, CEILING_BYTES).over).toBe(false);
  });
});

/** Every `render/static.svg` this format's own render ladder has produced — the same walk
 *  `test/verify-map.test.ts`'s own `mapStills()` does, duplicated rather than imported. */
function mapStills(): { name: string; file: string }[] {
  const found: { name: string; file: string }[] = [];
  for (const entry of readdirSync(PROOF, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const file = join(PROOF, entry.name, "render", "static.svg");
    if (existsSync(file)) found.push({ name: entry.name, file });
  }
  return found;
}

describe("every map-beat still on disk", () => {
  it("weighs at or under this format's own measured ceiling", () => {
    const stills = mapStills();
    expect(stills.length).toBeGreaterThanOrEqual(6);
    const offenders: string[] = [];
    for (const { name, file } of stills) {
      const bytes = statSync(file).size;
      const found = weightAgainstCeiling(bytes, CEILING_BYTES);
      if (found.over) offenders.push(`${name}: ${JSON.stringify(found)}`);
    }
    expect(offenders).toEqual([]);
  });
});
