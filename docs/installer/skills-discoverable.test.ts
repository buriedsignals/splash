import { test, expect } from "bun:test";
import { readdirSync, existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const SKILLS = join(import.meta.dir, "../../skills");

const skillDirs = readdirSync(SKILLS, { withFileTypes: true })
  .filter((e) => e.isDirectory())
  .map((e) => e.name)
  .sort();

// The invariant E9 closed from the other side. `link_agents_skills` links only what carries a
// SKILL.md, so a directory without one is linked by nobody AND discovered by nobody — it simply
// does not exist for a host, silently. That silence is the whole problem: on Goose Desktop it read
// as "12 linked, 11 discovered" with nothing said, and it took a measurement to notice.
//
// This asserts the other half: every directory under skills/ IS a skill. If a future engine lands
// as a library with no prose, this reddens and the choice has to be made deliberately — publish it
// with a SKILL.md, or move it out of skills/ — instead of being discovered months later by counting.
test("every directory under skills/ carries a SKILL.md, so linked and discovered cannot diverge", () => {
  const without = skillDirs.filter(
    (name) => !existsSync(join(SKILLS, name, "SKILL.md")),
  );
  expect(without).toEqual([]);
});

// A host reads the frontmatter to decide whether to load the skill at all: no name, no description,
// and it is discovered but never chosen. Present-but-unusable is the same silence in a new place.
test("every SKILL.md declares a name and a description a host can route on", () => {
  const broken: string[] = [];
  for (const name of skillDirs) {
    const path = join(SKILLS, name, "SKILL.md");
    if (!existsSync(path)) continue; // the test above owns that failure
    const text = readFileSync(path, "utf8");
    const fm = /^---\n([\s\S]*?)\n---/.exec(text);
    if (!fm) {
      broken.push(`${name}: no frontmatter block`);
      continue;
    }
    const body = fm[1]!;
    if (!/^name:\s*\S/m.test(body)) broken.push(`${name}: no name`);
    if (!/^description:\s*\S/m.test(body))
      broken.push(`${name}: no description`);
  }
  expect(broken).toEqual([]);
});
