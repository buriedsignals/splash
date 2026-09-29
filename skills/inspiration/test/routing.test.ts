import { describe, it, expect } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const SKILL_DIR = join(import.meta.dir, "..");
const REPO = join(SKILL_DIR, "..", "..");

function section(markdown: string, header: string) {
  const start = markdown.indexOf(`\n## ${header}\n`);
  if (start === -1) return "";
  const rest = markdown.slice(start + header.length + 5);
  const end = rest.indexOf("\n## ");
  return end === -1 ? rest : rest.slice(0, end);
}

describe("inspiration is reachable", () => {
  it("should be routed from the orchestrator's When to use", () => {
    const orchestrator = readFileSync(
      join(REPO, "skills", "splash", "SKILL.md"),
      "utf8",
    );
    expect(section(orchestrator, "When to use")).toContain("`inspiration`");
  });

  // Counted in llms_full.txt and linked under .agents/skills like every other skill:
  // skills/splash/test/every-skill-is-listed-and-linked.test.ts derives that from skills/*/SKILL.md.
});
