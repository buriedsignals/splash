// twin-storyboard's GENRE_CATALOG (the table the genre gate reads, in
// twin-storyboard/scripts/genre-catalog.mjs) is a REIMPLEMENTATION of facts that live for real
// elsewhere: whether a producer skill exists on disk, whether it is the RIGHT producer for that
// medium, and whether twin-deliver's own FORMS_BY_GENRE actually offers forms for that genre.
// Runtime code never crosses a skill boundary in this branch (no-cross-skill-imports.test.ts) —
// this file is the test-only exception that rule reserves for exactly this purpose (see
// where.test.ts's own comment on the same pattern), reading twin-deliver's real table and the
// filesystem to prove twin-storyboard's own copy has not drifted from either.
//
// THE THIRD ASSERTION IS THE ONE THAT MAKES THE PAIR FORM WORTH ANYTHING. The catalog used to be
// keyed on genre alone, so `map` + `web` passed by naming `twin-chart-web`. Widening the key to a
// medium/genre pair does not by itself catch that: `twin-chart-web` and `twin-map-web` BOTH exist
// on disk, so a `"map/web" -> twin-chart-web` row still satisfies "the directory exists". What
// catches it is reading the producer's own SKILL.md front matter and requiring that it names
// ITSELF as that skill and NAMES THE MEDIUM it is being claimed for. Delete that assertion and
// this task's central claim ships unguarded.
import { describe, it, expect } from "bun:test";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { GENRE_CATALOG } from "../../twin-storyboard/scripts/genre-catalog.mjs";
import { FORMS_BY_GENRE } from "../../twin-deliver/scripts/deliver.mjs";

const SKILLS = join(import.meta.dirname, "..", "..");

function frontMatter(skill: string): string {
  const text = readFileSync(join(SKILLS, skill, "SKILL.md"), "utf8");
  const match = /^---\r?\n([\s\S]*?)\r?\n---/.exec(text);
  if (!match) throw new Error(`${skill}/SKILL.md has no front matter`);
  return match[1];
}

describe("twin-storyboard's genre catalog agrees with what actually ships", () => {
  for (const [pair, row] of Object.entries(GENRE_CATALOG)) {
    const [medium, genre] = pair.split("/");

    it(`should find a producer skill directory on disk for ${pair} (${row.producerSkill})`, () => {
      expect(existsSync(join(SKILLS, row.producerSkill))).toBe(true);
    });

    it(`should find, in ${row.producerSkill}'s own SKILL.md, a skill that names itself and names the ${medium} medium`, () => {
      const meta = frontMatter(row.producerSkill);
      expect(meta).toContain(`name: ${row.producerSkill}`);
      const description = /^description:\s*([\s\S]*)$/m.exec(meta)?.[1] ?? "";
      expect(description.toLowerCase()).toContain(medium);
    });

    if (row.delivered) {
      it(`should find a matching twin-deliver FORMS_BY_GENRE entry for genre ${genre}, since the catalog claims ${pair} is delivered`, () => {
        expect(FORMS_BY_GENRE[genre]).toBeDefined();
      });
    }
  }

  // The reverse direction: a genre twin-deliver can genuinely materialise must appear in at least
  // one catalog pair marked delivered, or the genre gate would refuse something this toolchain can
  // truly ship — the exact defect this whole table exists to prevent, approached from the other
  // side.
  for (const genre of Object.keys(FORMS_BY_GENRE)) {
    it(`should record at least one delivered medium/${genre} pair in GENRE_CATALOG, since twin-deliver offers forms for it`, () => {
      const delivered = Object.entries(GENRE_CATALOG).filter(
        ([pair, row]) => pair.endsWith(`/${genre}`) && row.delivered,
      );
      expect(delivered.length).toBeGreaterThan(0);
    });
  }
});
