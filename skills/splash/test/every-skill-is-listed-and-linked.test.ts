import { describe, it, expect } from "bun:test";
import { existsSync, readdirSync, readFileSync, realpathSync } from "node:fs";
import { join } from "node:path";

/**
 * EVERY SKILL IS COUNTED, LISTED AND LINKED — DERIVED FROM `skills/*\/SKILL.md`, NEVER A NUMBER.
 *
 * A skill is a directory under `skills/` holding a `SKILL.md` (AGENTS.md: "Derive the inventory from
 * the filesystem"). The full LLM reference states how many there are and lists each one, and the
 * repository's `.agents/skills/<id>` links each one into the agents store. Both are written by hand,
 * so a skill added or removed without them is what this catches — for every skill, not only the
 * one whose test happened to assert it.
 */

const REPO = join(import.meta.dir, "..", "..", "..");
const SKILLS = join(REPO, "skills");

const ids = readdirSync(SKILLS, { withFileTypes: true })
  .filter((e) => e.isDirectory() && existsSync(join(SKILLS, e.name, "SKILL.md")))
  .map((e) => e.name)
  .sort();

describe("every skill under skills/ is counted, listed and linked", () => {
  it("should find skills at all (premise)", () => {
    expect(ids).toContain("splash");
  });

  it("should be counted and listed, each once, in llms_full.txt's skill contracts section", () => {
    const full = readFileSync(join(REPO, "llms_full.txt"), "utf8");
    const lead = /currently ships (\d+) directories containing executable `SKILL\.md` contracts:\n\n((?:- `[^`]+`:.*\n)+)/.exec(full);
    expect(lead).not.toBeNull();
    expect(Number(lead![1])).toBe(ids.length);
    const listed = [...lead![2].matchAll(/^- `([^`]+)`:/gm)].map((m) => m[1]).sort();
    expect(listed).toEqual(ids);
  });

  for (const id of ids)
    it(`should link .agents/skills/${id} to skills/${id}`, () => {
      const link = join(REPO, ".agents", "skills", id);
      expect([id, existsSync(link)]).toEqual([id, true]);
      expect(realpathSync(link)).toBe(realpathSync(join(SKILLS, id)));
    });
});
