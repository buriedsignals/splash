// storyboard's FORMAT_CATALOG (the table the format gate reads, in
// storyboard/scripts/format-catalog.mjs) is generated from the canonical visual catalogue.
// `bun run catalog:check` (scripts/visual-catalog.mjs, run in CI) already owns the structural
// parity: every producer has a shipped SKILL.md whose front matter names it, every pair's format
// has deliver forms, every format deliver offers is reached by a pair, and the generated copy has
// not drifted. This file holds what that check does not: that the producer a pair names is the
// RIGHT producer for that medium AND that format, read from the producer's own front matter; and
// that each pair's size rule matches the storyboard gate's own `sizeGap` condition.
// Runtime code never crosses a skill boundary in this branch (no-cross-skill-imports.test.ts) —
// this file is the test-only exception that rule reserves for exactly this purpose (see
// where.test.ts's own comment on the same pattern).
//
// THE PRODUCER ASSERTION IS THE ONE THAT MAKES THE PAIR FORM WORTH ANYTHING. The catalog used to be
// keyed on format alone, so `map` + `web` passed by naming `chart-web`. Widening the key to a
// medium/format pair does not by itself catch that: `chart-web` and `map-web` BOTH exist
// on disk, so a `"map/web" -> chart-web` row still satisfies "the directory exists". What
// catches it is reading the producer's own SKILL.md front matter and requiring that it names
// ITSELF as that skill, NAMES THE MEDIUM it is being claimed for, AND NAMES THE FORMAT. Delete
// either half of that and this task's central claim ships unguarded.
//
// THE FORMAT HALF WAS MISSING, AND THE HOLE WAS SYMMETRIC WITH THE ONE THE PAIR KEY CLOSED.
// The key is a pair; only one of its two terms was ever checked. Measured: pointing `"map/web"` at
// `map-beat` and `"chart/web"` at `chart-video` left this file completely green, 34 pass
// / 0 fail. With the format assertion, the same mutation in a copy under /tmp:
//
//   Expected: "chart-video names the web format: true"
//   Received: "chart-video names the web format: false"
//   (fail) … should find, in chart-video's own SKILL.md, a skill that names itself, names the
//          chart medium and names the web format
//   Expected: "map-beat names the web format: true"
//   Received: "map-beat names the web format: false"
//   (fail) … names the map medium and names the web format
//    32 pass · 2 fail
//
// Both rows name a producer of the RIGHT MEDIUM and the WRONG FORMAT, which is the same
// class of defect as naming the wrong medium, and it reached the dispatch table `splash`'s
// SKILL.md publishes. The format word is now required in the same front matter, word-bounded, with
// `scrolly` also matching `scrollytelling` because that is how that skill's own description says it.
//
// WHAT THIS SUBSTRING TEST DOES NOT SEPARATE, disclosed rather than over-built: a description that
// mentions a format it does NOT produce still satisfies the test for that format. Two do —
// `chart-web` says "degrades to that same static frame", `map-web` says "maps shipped
// only static/video until this skill" — so `chart/static -> chart-web` would pass. Closing
// that means the front matter carrying a format list as data rather than as prose, which is a change
// to seven SKILL.md files owned by other chantiers. The pair of wrong-format rows that were actually
// reachable, and that the journey audit demonstrated, both redden.
import { describe, it, expect } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { FORMAT_CATALOG } from "../../storyboard/scripts/format-catalog.mjs";
import visualCatalog from "../../storyboard/references/visual-catalog.json" with { type: "json" };
import { EXPORT_SIZES, SIZED_FORMATS } from "../../storyboard/scripts/storyboard.mjs";

const SKILLS = join(import.meta.dirname, "..", "..");

function frontMatter(skill: string): string {
  const text = readFileSync(join(SKILLS, skill, "SKILL.md"), "utf8");
  const match = /^---\r?\n([\s\S]*?)\r?\n---/.exec(text);
  if (!match) throw new Error(`${skill}/SKILL.md has no front matter`);
  return match[1];
}

describe("storyboard's format catalog agrees with what actually ships", () => {
  for (const [pair, row] of Object.entries(FORMAT_CATALOG)) {
    const [medium, format] = pair.split("/");

    it(`should find, in ${row.producerSkill}'s own SKILL.md, a skill that names itself, names the ${medium} medium and names the ${format} format`, () => {
      const meta = frontMatter(row.producerSkill);
      expect(meta).toContain(`name: ${row.producerSkill}`);
      const description = /^description:\s*([\s\S]*)$/m.exec(meta)?.[1] ?? "";
      expect(description.toLowerCase()).toContain(medium);
      // `scrolly` is written `scrollytelling` in that skill's own description, so the tail is open;
      // every other format word is closed on both sides so `video` does not match `videographer`.
      const formatWord = new RegExp(
        `\\b${format}${format === "scrolly" ? "" : "\\b"}`,
        "i",
      );
      expect(
        `${row.producerSkill} names the ${format} format: ${formatWord.test(description)}`,
      ).toBe(`${row.producerSkill} names the ${format} format: true`);
    });
  }

  for (const row of visualCatalog.formatPairs) {
    it(`should keep ${row.pair}'s size rule identical to the canonical storyboard gate`, () => {
      // The same condition `sizeGap` holds: a sized format takes a size, and a photo essay never does.
      const takesASize = SIZED_FORMATS.includes(row.format) && row.medium !== "image";
      if (takesASize) {
        expect(row.sizeRule).toEqual({ kind: "required", options: EXPORT_SIZES });
      } else {
        expect(row.sizeRule).toEqual({ kind: "none" });
      }
    });
  }
});
