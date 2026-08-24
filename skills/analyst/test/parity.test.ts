import { describe, it, expect } from "bun:test";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { parseStoryboardForAnalyst } from "../scripts/build-data.mjs";
import { parseStoryboard } from "../../storyboard/scripts/storyboard.mjs";

// The carried-copy guard. `analyst` vendors intake's CSV reader and profiler byte-for-byte —
// the same deliberate pattern as `splash/test/root-template-shared.test.ts`: a skill installs
// alone and never imports across a skill boundary at runtime, so the copy is physical and a test
// holds it to the original. Byte equality, not behavioural resemblance: any drift at all is a
// divergence between what the analyst verifies against and what intake froze with.

const ROOT = join(import.meta.dirname, "..", "..");

describe("carried copies of intake's helpers", () => {
  for (const name of ["csv.mjs", "profile.mjs"]) {
    it(`should keep scripts/${name} byte-identical to intake's`, async () => {
      const carried = await readFile(join(ROOT, "analyst", "scripts", name));
      const original = await readFile(join(ROOT, "intake", "scripts", name));
      expect(carried.equals(original)).toBe(true);
    });
  }
});

// S2: storyboard.mjs normalizes a legacy `genre:` slot into `format` when it parses; the
// analyst's carried parser must resolve it identically, because data.json's `slot.format` is
// what medium×format dispatch reads. A test-only cross-skill import, same permission as
// splash/test/where.test.ts claims: two independent implementations of one rule are held to
// agree, not unified by an import.
describe("carried genre→format normalization", () => {

  const CASES = [
    [
      "a legacy genre-only slot",
      "  - id: 1\n    proves: x\n    medium: chart\n    genre: static",
      "static",
    ],
    [
      "a slot carrying matching format and legacy genre",
      "  - id: 1\n    proves: x\n    medium: chart\n    format: web\n    genre: web",
      "web",
    ],
  ];

  for (const [name, slotLines, resolved] of CASES) {
    it(`should normalize ${name} exactly as storyboard's own parser does`, () => {
      const text = `---\ntakeaway: "x"\nslots:\n${slotLines}\n---\n`;
      const ours = parseStoryboardForAnalyst(text).slots[0];
      const theirs = parseStoryboard(text).meta.slots[0];
      expect(ours.format).toBe(resolved);
      expect(theirs.format).toBe(resolved);
      expect(Object.prototype.hasOwnProperty.call(ours, "genre")).toBe(false);
      expect(Object.prototype.hasOwnProperty.call(theirs, "genre")).toBe(false);
    });
  }

  it("should refuse conflicting fields on both sides with the same verdict", () => {
    const text =
      "---\ntakeaway: \"x\"\nslots:\n  - id: 1\n    proves: x\n    medium: chart\n    format: web\n    genre: static\n---\n";
    let ours = "";
    try {
      parseStoryboardForAnalyst(text);
    } catch (error) {
      ours = error.message;
    }
    expect(ours).toContain("conflicting publication format fields");
    expect(() => parseStoryboard(text)).toThrow(/conflicting publication format fields/);
  });
});
