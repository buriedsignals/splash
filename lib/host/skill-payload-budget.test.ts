import { describe, it, expect } from "bun:test";
import { readdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import { measureSkillPayload } from "./skill-payload";

// Two ceilings, guarding two different things on purpose.
//
// ★ BOTH ARE AN INSTALL-DAY MEASUREMENT, and that limit is real rather than theoretical. This
// file measures the SOURCE with exclusions applied, and docs/installer/pack-skills.test.ts
// measures a FRESHLY PACKED tree — neither ever measures a live install. The exclusion of `dist/`
// therefore holds until the first produce and no longer: the producers build into `<skill>/dist/`
// (chart-native's vite.config.ts through chartDistSub, map-native's produce.mjs through BUILD_OUT,
// scrolly's vite.config.ts outDir), which in an installation is `.dist/skills/<engine>/dist/` —
// inside the one directory a host enumerates. Nothing prunes it and nothing here can see it.
// Measured on this repo after ordinary development use: chart-native/dist = 14 files (~518 chars
// of enumeration), map-native/dist = 24 (~1 578), scrolly/dist = 1. The shape is
// dist/<type>/<format>/ at ~1-2 files each, so an install that eventually produced all 41
// chart-native types would add on the order of 120 files to a budget of 400 that starts at 276.
// It is the FILE ceiling that would bind, not the character one (~4 500 chars against 130 000 of
// headroom). Redirecting the build output out of the skill tree is the real fix and is recorded as
// out of scope in the design's §7 — not compensated for by inventing a number here.
//
// FILE_BUDGET is what the packer controls. After packaging the worst skill is chart-native at
// 276 files, so 400 leaves 31% of room in an engine that grows a directory per chart type.
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
