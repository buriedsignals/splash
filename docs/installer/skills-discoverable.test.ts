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

// A host reads the frontmatter to decide whether to load the skill at all — and it PARSES it as
// YAML. Anything the parser rejects is not a small formatting slip: the skill is dropped from
// discovery entirely, with nothing said. MEASURED on 2026-08-04, when image-native's freshly written
// description carried an unquoted ": " ("live here: the matching") — which a plain YAML scalar
// cannot hold. The directory was linked, the SKILL.md was right there, and `goose skills list`
// showed 11 of 12.
//
// So this PARSES rather than pattern-matches. A regex for /^description:\s*\S/ passed that very
// file, which is exactly why this test does not use one: a guard that cannot fail for the real
// reason is decoration.
test("every SKILL.md's frontmatter PARSES as YAML and carries a routable name and description", () => {
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
    let parsed: unknown;
    try {
      parsed = Bun.YAML.parse(fm[1]!);
    } catch (e) {
      broken.push(
        `${name}: frontmatter is not valid YAML — a host drops the skill silently (${(e as Error).message.split("\n")[0]})`,
      );
      continue;
    }
    const fields = parsed as Record<string, unknown> | null;
    if (typeof fields?.name !== "string" || !fields.name.trim())
      broken.push(`${name}: no name`);
    if (typeof fields?.description !== "string" || !fields.description.trim())
      broken.push(`${name}: no description`);
  }
  expect(broken).toEqual([]);
});
