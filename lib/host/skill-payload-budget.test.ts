import { describe, it, expect } from "bun:test";
import { readdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import { measureSkillPayload } from "./skill-payload";

// Two ceilings, guarding two different things on purpose.
//
// FILE_BUDGET is what the packer controls. After packaging the worst skill is chart-native at
// 276 files, so 400 leaves 45% of room in an engine that grows a directory per chart type.
//
// CHAR_BUDGET is the guard against the failure itself: Goose spills a tool response over
// 200 000 characters into a temp file, and SKILL.md then never enters the model's context
// (measured, and observed happening — skill-payload-2026-08-04.md §3). 160 000 is 80% of it.
//
// splash sits at 146 316 and passes with only 9% of room. That is deliberate and must NOT be
// exempted: its weight is no longer enumeration (1 905 tokens) but PROSE (33 693 tokens), so
// this ceiling is the only sensor the repo has on SKILL.md growth. When it reddens, the answer
// is to split SKILL.md by phase — not to raise the number.
const FILE_BUDGET = 400;
const CHAR_BUDGET = 160_000;

const SKILLS = join(import.meta.dir, "../../skills");

const skillDirs = readdirSync(SKILLS, { withFileTypes: true })
  .filter(
    (e) => e.isDirectory() && existsSync(join(SKILLS, e.name, "SKILL.md")),
  )
  .map((e) => e.name)
  .sort();

describe("what we would deliver stays inside its budget", () => {
  it("has skills to measure at all", () => {
    expect(skillDirs.length).toBeGreaterThan(5);
  });

  for (const name of skillDirs) {
    it(`${name} stays under ${FILE_BUDGET} files and ${CHAR_BUDGET} characters`, () => {
      const p = measureSkillPayload(join(SKILLS, name), {
        applyExclusions: true,
      });
      // A skill that offers nothing has not been measured — it has been mislocated.
      expect(p.files).toBeGreaterThan(0);
      if (p.files > FILE_BUDGET)
        throw new Error(
          `${name}: ${p.files} files offered, budget ${FILE_BUDGET}. Something heavy joined the skill — exclude it in EXCLUDED_NAMES or move it out of the skill directory.`,
        );
      if (p.chars > CHAR_BUDGET)
        throw new Error(
          `${name}: ${p.chars} characters, budget ${CHAR_BUDGET} (80% of the host's 200 000 spill threshold). If the excess is prose, split SKILL.md by phase; raising this number re-opens the failure it exists to catch.`,
        );
    });
  }
});
