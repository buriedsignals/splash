// storyboard's GENRE_CATALOG (the table the genre gate reads, in
// storyboard/scripts/genre-catalog.mjs) is a REIMPLEMENTATION of facts that live for real
// elsewhere: whether a producer skill exists on disk, whether it is the RIGHT producer for that
// medium, and whether deliver's own FORMS_BY_GENRE actually offers forms for that genre.
// Runtime code never crosses a skill boundary in this branch (no-cross-skill-imports.test.ts) —
// this file is the test-only exception that rule reserves for exactly this purpose (see
// where.test.ts's own comment on the same pattern), reading deliver's real table and the
// filesystem to prove storyboard's own copy has not drifted from either.
//
// THE THIRD ASSERTION IS THE ONE THAT MAKES THE PAIR FORM WORTH ANYTHING. The catalog used to be
// keyed on genre alone, so `map` + `web` passed by naming `chart-web`. Widening the key to a
// medium/genre pair does not by itself catch that: `chart-web` and `map-web` BOTH exist
// on disk, so a `"map/web" -> chart-web` row still satisfies "the directory exists". What
// catches it is reading the producer's own SKILL.md front matter and requiring that it names
// ITSELF as that skill, NAMES THE MEDIUM it is being claimed for, AND NAMES THE GENRE. Delete
// either half of that and this task's central claim ships unguarded.
//
// THE GENRE HALF WAS MISSING, AND THE HOLE WAS SYMMETRIC WITH THE ONE THE PAIR KEY CLOSED.
// The key is a pair; only one of its two terms was ever checked. Measured: pointing `"map/web"` at
// `map-beat` and `"chart/web"` at `chart-video` left this file completely green, 34 pass
// / 0 fail. With the genre assertion, the same mutation in a copy under /tmp:
//
//   Expected: "chart-video names the web genre: true"
//   Received: "chart-video names the web genre: false"
//   (fail) … should find, in chart-video's own SKILL.md, a skill that names itself, names the
//          chart medium and names the web genre
//   Expected: "map-beat names the web genre: true"
//   Received: "map-beat names the web genre: false"
//   (fail) … names the map medium and names the web genre
//    32 pass · 2 fail
//
// Both rows name a producer of the RIGHT MEDIUM and the WRONG GENRE, which is the same
// class of defect as naming the wrong medium, and it reached the dispatch table `splash`'s
// SKILL.md publishes. The genre word is now required in the same front matter, word-bounded, with
// `scrolly` also matching `scrollytelling` because that is how that skill's own description says it.
//
// WHAT THIS SUBSTRING TEST DOES NOT SEPARATE, disclosed rather than over-built: a description that
// mentions a genre it does NOT produce still satisfies the test for that genre. Two do —
// `chart-web` says "degrades to that same static frame", `map-web` says "maps shipped
// only static/video until this skill" — so `chart/static -> chart-web` would pass. Closing
// that means the front matter carrying a genre list as data rather than as prose, which is a change
// to seven SKILL.md files owned by other chantiers. The pair of wrong-genre rows that were actually
// reachable, and that the journey audit demonstrated, both redden.
import { describe, it, expect } from "bun:test";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { GENRE_CATALOG } from "../../storyboard/scripts/genre-catalog.mjs";
import { FORMS_BY_GENRE } from "../../deliver/scripts/deliver.mjs";

const SKILLS = join(import.meta.dirname, "..", "..");

function frontMatter(skill: string): string {
  const text = readFileSync(join(SKILLS, skill, "SKILL.md"), "utf8");
  const match = /^---\r?\n([\s\S]*?)\r?\n---/.exec(text);
  if (!match) throw new Error(`${skill}/SKILL.md has no front matter`);
  return match[1];
}

describe("storyboard's genre catalog agrees with what actually ships", () => {
  for (const [pair, row] of Object.entries(GENRE_CATALOG)) {
    const [medium, genre] = pair.split("/");

    it(`should find a producer skill directory on disk for ${pair} (${row.producerSkill})`, () => {
      expect(existsSync(join(SKILLS, row.producerSkill))).toBe(true);
    });

    it(`should find, in ${row.producerSkill}'s own SKILL.md, a skill that names itself, names the ${medium} medium and names the ${genre} genre`, () => {
      const meta = frontMatter(row.producerSkill);
      expect(meta).toContain(`name: ${row.producerSkill}`);
      const description = /^description:\s*([\s\S]*)$/m.exec(meta)?.[1] ?? "";
      expect(description.toLowerCase()).toContain(medium);
      // `scrolly` is written `scrollytelling` in that skill's own description, so the tail is open;
      // every other genre word is closed on both sides so `video` does not match `videographer`.
      const genreWord = new RegExp(
        `\\b${genre}${genre === "scrolly" ? "" : "\\b"}`,
        "i",
      );
      expect(
        `${row.producerSkill} names the ${genre} genre: ${genreWord.test(description)}`,
      ).toBe(`${row.producerSkill} names the ${genre} genre: true`);
    });

    if (row.delivered) {
      it(`should find a matching deliver FORMS_BY_GENRE entry for genre ${genre}, since the catalog claims ${pair} is delivered`, () => {
        expect(FORMS_BY_GENRE[genre]).toBeDefined();
      });
    }
  }

  // The reverse direction: a genre deliver can genuinely materialise must appear in at least
  // one catalog pair marked delivered, or the genre gate would refuse something this toolchain can
  // truly ship — the exact defect this whole table exists to prevent, approached from the other
  // side.
  for (const genre of Object.keys(FORMS_BY_GENRE)) {
    it(`should record at least one delivered medium/${genre} pair in GENRE_CATALOG, since deliver offers forms for it`, () => {
      const delivered = Object.entries(GENRE_CATALOG).filter(
        ([pair, row]) => pair.endsWith(`/${genre}`) && row.delivered,
      );
      expect(delivered.length).toBeGreaterThan(0);
    });
  }
});
