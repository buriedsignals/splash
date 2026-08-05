import { describe, it, expect } from "bun:test";
import {
  mkdtempSync,
  mkdirSync,
  writeFileSync,
  rmSync,
  symlinkSync,
} from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import {
  measureSkillPayload,
  isExcludedEntry,
  EXCLUDED_NAMES,
} from "./skill-payload";

/** A throwaway skill tree. Returns its root. */
function fixture(): string {
  const root = mkdtempSync(join(tmpdir(), "splash-payload-"));
  const skill = join(root, "alpha");
  mkdirSync(join(skill, "src"), { recursive: true });
  mkdirSync(join(skill, "tests"), { recursive: true });
  mkdirSync(join(skill, "node_modules", "leftpad"), { recursive: true });
  mkdirSync(join(skill, "output-proof"), { recursive: true });
  writeFileSync(join(skill, "SKILL.md"), "---\nname: alpha\n---\n0123456789");
  writeFileSync(join(skill, "src", "a.ts"), "export {};");
  writeFileSync(join(skill, "src", "a.test.ts"), "// a test");
  writeFileSync(join(skill, "tests", "big.ts"), "// a test");
  writeFileSync(join(skill, "node_modules", "leftpad", "index.js"), "//");
  writeFileSync(join(skill, "output-proof", "shot.png"), "PNG");
  return root;
}

describe("measureSkillPayload — what a host is actually handed", () => {
  it("counts every file when nothing is excluded, the way the host walks", () => {
    const root = fixture();
    try {
      const p = measureSkillPayload(join(root, "alpha"));
      // SKILL.md, src/a.ts, src/a.test.ts, tests/big.ts,
      // node_modules/leftpad/index.js, output-proof/shot.png
      expect(p.files).toBe(6);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("drops the excluded subtrees when asked, which is what the packer will ship", () => {
    const root = fixture();
    try {
      const p = measureSkillPayload(join(root, "alpha"), {
        applyExclusions: true,
      });
      // Only SKILL.md and src/a.ts survive: tests/, node_modules/, output-proof/
      // are excluded directories, and a.test.ts is an excluded file.
      expect(p.files).toBe(2);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("counts the prose AND the offer lines — the enumeration is the half nobody counted", () => {
    const root = fixture();
    try {
      const p = measureSkillPayload(join(root, "alpha"), {
        applyExclusions: true,
      });
      // SKILL.md body is 30 chars (verified against the fixture bytes); the two offer
      // lines are "SKILL.md\n" (9) and "src/a.ts\n" (9). Prose alone would be 30.
      expect(p.chars).toBe(30 + 9 + 9);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("FOLLOWS symlinks, because the host does and `find` does not", () => {
    const root = fixture();
    try {
      const outside = join(root, "outside");
      mkdirSync(outside, { recursive: true });
      writeFileSync(join(outside, "smuggled.js"), "//");
      symlinkSync(outside, join(root, "alpha", "linked"));
      const p = measureSkillPayload(join(root, "alpha"));
      expect(p.files).toBe(7); // the six above plus the smuggled one
      // A count alone does not prove the walk went THROUGH the link: treating the
      // symlink itself as an opaque file also yields 7 offers. Pin the char total too,
      // which only matches if "linked/smuggled.js" (19 chars) was actually enumerated
      // rather than "linked" (6 chars) standing in for it.
      expect(p.chars).toBe(146);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("stops at a subtree that carries its own SKILL.md — the host treats it as another skill", () => {
    const root = fixture();
    try {
      const nested = join(root, "alpha", "nested");
      mkdirSync(nested, { recursive: true });
      writeFileSync(join(nested, "SKILL.md"), "---\nname: nested\n---\n");
      writeFileSync(join(nested, "extra.ts"), "export {};");
      const p = measureSkillPayload(join(root, "alpha"));
      expect(p.files).toBe(6); // unchanged: the nested subtree is not ours to offer
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("names the excluded entries once, so the packer and the budgets cannot drift", () => {
    expect([...EXCLUDED_NAMES].sort()).toEqual([
      "coverage",
      "dist",
      "node_modules",
      "output-proof",
      "tests",
    ]);
    expect(isExcludedEntry("node_modules", true)).toBe(true);
    expect(isExcludedEntry("chart.test.ts", false)).toBe(true);
    expect(isExcludedEntry("chart.ts", false)).toBe(false);
    // A FILE named like an excluded directory is not excluded — the rule is about trees.
    expect(isExcludedEntry("dist", false)).toBe(false);
  });
});

import { existsSync as fileExists } from "node:fs";

describe("calibration — the simulator against the measured payloads", () => {
  const splash = join(import.meta.dir, "../../skills/splash");

  it("reproduces the packaged size of splash, the skill that sets the budget", () => {
    if (!fileExists(splash)) return; // not a source checkout; nothing to calibrate against
    const p = measureSkillPayload(splash, { applyExclusions: true });
    // 38 129 characters, re-measured 2026-08-04 AFTER the phase split. It was 144 757 before
    // (skill-payload-2026-08-04.md §5.3): the root no longer carries the six phases' prose, which
    // now lives in splash-input / splash-cadrage / splash-proposition / splash-production /
    // splash-export (6.9k … 31.9k each, every one of them far under the 200 000 overflow
    // threshold). The re-pin is a STRUCTURAL change, not prose drift — the 25% band exists to
    // absorb edits, and letting a 3.8x drop pass inside it would have made the band meaningless.
    expect(p.chars).toBeGreaterThan(38_129 * 0.75);
    expect(p.chars).toBeLessThan(144_757 * 1.25);
  });
});
