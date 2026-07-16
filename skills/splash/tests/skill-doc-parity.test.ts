// Doc-parity pins: SKILL.md prose must keep prescribing what the spine's code enforces.
// A drifted SKILL.md silently disarms prose-enforced emission (the orchestrator LLM reads
// the doc, not the gate source), so each pinned emission line is asserted here.
import { describe, it, expect } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const splash = readFileSync(join(import.meta.dir, "..", "SKILL.md"), "utf8");

describe("A5 — skillsInvoked emission", () => {
  it("§5b prescribes emitting skillsInvoked like channel/confirmedTakeaway", () => {
    expect(splash).toContain("skillsInvoked");
    expect(splash).toContain("splash:cadrage-guided");
  });
});
