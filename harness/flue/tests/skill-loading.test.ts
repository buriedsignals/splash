import { test, expect, beforeAll } from "bun:test";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { execFileSync } from "node:child_process";

const FLUE_ROOT = resolve(import.meta.dir, "..");
const STORE = resolve(FLUE_ROOT, ".agents/skills");

// The Splash skills that ship a SKILL.md (a skill-autonome package). image-native is
// deliberately excluded: it has no SKILL.md (it's an internal conformance library
// shared by chart-native/scrolly's image-story format, confirmed via
// `ls skills/*/SKILL.md` at repo root), so it is not one of the 8 discoverable skills.
const SPLASH_SKILLS = [
  "chart-native",
  "dw-chart",
  "map-dw",
  "map-native",
  "scrolly",
  "splash",
  "suggest-article",
  "suggest-chart",
];

beforeAll(() => {
  // Idempotent — (re)runs the link script so the store is populated whether or not a
  // prior manual `./scripts/link-skills.sh` step ran first.
  execFileSync(resolve(FLUE_ROOT, "scripts/link-skills.sh"), [], {
    stdio: "inherit",
  });
});

test("all splash skills are discoverable in the workspace store", () => {
  for (const s of SPLASH_SKILLS) {
    expect(existsSync(resolve(STORE, s, "SKILL.md"))).toBe(true);
  }
});

test("context floor: skill BODIES are not concatenated into the agent instructions", async () => {
  // The agent instructions carry the verb-adapter only, not skill bodies.
  const { FLUE_VERB_ADAPTER } = await import("../src/lib/roles.ts");
  // A skill body sentinel (a heading only present inside a SKILL.md) must be absent.
  expect(FLUE_VERB_ADAPTER).not.toContain("## When to use");
  expect(FLUE_VERB_ADAPTER.length).toBeLessThan(4000); // ~<1k tokens, not 55k
});
