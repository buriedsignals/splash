import { describe, it, expect } from "bun:test";
import { readFileSync, realpathSync } from "node:fs";
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

  it("should be linked into the agents store like every other skill", () => {
    expect(realpathSync(join(REPO, ".agents", "skills", "inspiration"))).toBe(
      realpathSync(SKILL_DIR),
    );
  });

  it("should be counted in the full LLM reference", () => {
    const full = readFileSync(join(REPO, "llms_full.txt"), "utf8");
    expect(full).toContain(
      "currently ships 17 directories containing executable `SKILL.md` contracts",
    );
    expect(full).toContain("- `inspiration`:");
  });
});
