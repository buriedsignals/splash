import { describe, it, expect } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { flowProse } from "./flow-prose";

// WHY THIS EXISTS — the approval gate reads a receipt only one command writes, and the prose that
// drives the journalist's path did not name that command.
//
// `applyRenderGate` (src/gate.ts) calls `shownCovers`, which refuses when no `_shown/<file>.json`
// receipt covers the bytes being approved. The ONLY writer of that receipt is
// `lib/loop/presentation.ts`'s `presentArtifact`, reached through `lib/host/cli.ts present`.
//
// BE PRECISE ABOUT WHAT WAS WRONG, because the first reading of it was not: the command WAS
// documented — in the Never list, and explicitly ("the duty is one command"). What was missing is
// its presence in the NUMBERED STEP where the act happens: the 3b walkthrough said to surface the
// render ("surface FIRST, ask SECOND") and then to approve it, with nothing in between. A duty that
// lives only in an appendix is read after the mistake.
//
// Verified end to end on a real artifact: without `present`, `gate-render` refuses with
// "nobody has been shown this visual yet"; with it, "render approved".
//
// This pins the ORDER, which is the part that carries the meaning: showing comes before approving.
describe("SKILL.md documents `present` before the approval gate", () => {
  const skill = flowProse();

  it("names the command that writes the presentation receipt", () => {
    expect(skill).toContain("lib/host/cli.ts present");
  });

  it("places it BEFORE gate-render, because that is the whole point", () => {
    const present = skill.indexOf("lib/host/cli.ts present");
    const approve = skill.indexOf("gate-render.mjs exports/<slug>/report.json");
    expect(present).toBeGreaterThan(-1);
    expect(approve).toBeGreaterThan(-1);
    expect(present).toBeLessThan(approve);
  });
});
