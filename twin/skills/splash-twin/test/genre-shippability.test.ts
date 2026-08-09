// twin-storyboard's GENRE_CATALOG (the table checkStoryboard's gate reads, in
// twin-storyboard/scripts/genre-catalog.mjs) is a REIMPLEMENTATION of two facts that live for
// real elsewhere: whether a producer skill actually exists on disk, and whether twin-deliver's
// own FORMS_BY_GENRE actually offers forms for that genre. Runtime code never crosses a skill
// boundary in this branch (no-cross-skill-imports.test.ts) — this file is the test-only exception
// that rule reserves for exactly this purpose (see where.test.ts's own comment on the same
// pattern), reading twin-deliver's real table and the filesystem to prove twin-storyboard's own
// copy has not drifted from either.
//
// This is the guard Fix 1 exists to build: the concrete defect it closes was a producer
// (twin-chart-web) shipping with no matching row in twin-deliver's FORMS_BY_GENRE, discovered
// only by walking the journey end to end. Without this test, that same gap could reopen —
// GENRE_CATALOG could claim a genre is `delivered: true` when twin-deliver has since dropped it,
// or twin-deliver could grow a genre GENRE_CATALOG never learns about — and nothing would notice
// until a journalist hit the wall again three phases downstream.
import { describe, it, expect } from "bun:test";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { GENRE_CATALOG } from "../../twin-storyboard/scripts/genre-catalog.mjs";
import { FORMS_BY_GENRE } from "../../twin-deliver/scripts/deliver.mjs";

const SKILLS = join(import.meta.dirname, "..", "..");

describe("twin-storyboard's genre catalog agrees with what actually ships", () => {
  for (const [genre, row] of Object.entries(GENRE_CATALOG)) {
    it(`should find a producer skill directory on disk for genre ${genre} (${row.producerSkill})`, () => {
      expect(existsSync(join(SKILLS, row.producerSkill))).toBe(true);
    });

    if (row.delivered) {
      it(`should find a matching twin-deliver FORMS_BY_GENRE entry for genre ${genre}, since the catalog claims it is delivered`, () => {
        expect(FORMS_BY_GENRE[genre]).toBeDefined();
      });
    }
  }

  // The reverse direction: a genre twin-deliver can genuinely materialise must be recorded here
  // as `delivered: true`, or checkStoryboard's gate would refuse a genre this toolchain can truly
  // ship — the exact defect this whole table exists to prevent, approached from the other side.
  for (const genre of Object.keys(FORMS_BY_GENRE)) {
    it(`should record genre ${genre} as delivered in GENRE_CATALOG, since twin-deliver offers forms for it`, () => {
      expect(GENRE_CATALOG[genre]?.delivered).toBe(true);
    });
  }
});
