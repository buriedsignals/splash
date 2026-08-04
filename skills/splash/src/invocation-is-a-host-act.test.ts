import { describe, it, expect } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

// WHY THIS EXISTS — both pins come from ONE observed run (2026-08-03, backlog E11,
// docs/installer/goose-desktop-proof.md § "The run that succeeded without Splash").
//
// The prose said « invoke `suggest-article` » and never said what invoking IS. The model read a
// skill name, inferred a TOOL name, called `suggest_article`, got `-32002: Tool not found` — then
// went shopping through the host's extension manager, ENABLED a charting extension the config had
// disabled, drew a bar in the chat and announced « Le visuel est prêt ». No exports/, no producer,
// no gate, no owned file.
//
// So: the prose must name the ACT (per host, without hardcoding one host) and must say that a
// chart living in the chat is not a deliverable. Neither is enforceable in code from inside a run
// that never reaches our code — which is exactly why they are pinned here, in the one artefact
// that run DID read.
const skill = readFileSync(join(import.meta.dir, "..", "SKILL.md"), "utf8");

describe("SKILL.md says HOW a host invokes a nested skill — the act, not just the name", () => {
  it("names invoking a skill as a host act with more than one shape", () => {
    expect(skill).toContain("Invoking a nested skill is a HOST ACT");
  });

  it("gives the fallback that exists on EVERY host — read that skill's own SKILL.md and follow it", () => {
    expect(skill).toContain("skills/suggest-article/SKILL.md");
    expect(skill).toContain("read it and follow it step by step");
  });

  it("forbids the inference that was actually made: a skill name is not a tool name", () => {
    expect(skill).toContain("never invent a tool name from a skill name");
    // And the specific trap: a host answering "no such tool" is not permission to improvise.
    expect(skill).toContain("is not permission to do the step from memory");
  });

  it("says the proof of the step is the file it leaves, never the name in skillsInvoked", () => {
    expect(skill).toContain("opportunities.json");
    expect(skill).toContain("not a name in `skillsInvoked`");
  });

  it("puts the instruction BEFORE the two steps that need it (ANALYSE, PROPOSITION)", () => {
    const how = skill.indexOf("Invoking a nested skill is a HOST ACT");
    const analyse = skill.indexOf("### 2. ANALYSE");
    const proposition = skill.indexOf("### 4. PROPOSITION");
    expect(how).toBeGreaterThan(-1);
    expect(how).toBeLessThan(analyse);
    expect(how).toBeLessThan(proposition);
  });
});

describe("SKILL.md forbids a chart drawn in the chat as the deliverable", () => {
  const never = skill.slice(skill.indexOf("## Never"));

  it("bans it in the Never list, where the run-time rules live", () => {
    expect(never).toContain(
      "Never present a chart drawn in the chat as a deliverable",
    );
  });

  it("bans the move that made it reachable — enabling another visualisation tool mid-run", () => {
    expect(never).toContain("never enable a host extension");
  });

  it("gives the criterion that decides it, so the ban is checkable and not a matter of taste", () => {
    expect(never).toContain("a file under `exports/`");
  });
});
