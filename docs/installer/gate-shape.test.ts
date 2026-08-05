// THE GATE'S SHAPE IS A GUARD, not a preference (registry E15).
//
// `lib/verify` runs the only suite that launches a real browser, and it gets its OWN `bun test`
// invocation. That is not tidiness: once `lib/verify/capture-html.test.ts` shares a process with a
// `lib/host` file that drives 5+ CLI journeys, Playwright can no longer launch Chromium — ENOENT
// inside launchProcess, with the capture layer itself perfectly healthy.
//
// FIVE causes were refuted by measurement, not by argument: an undrained stderr pipe (drained →
// still fails), spawning as such (1 child → fine), the number of children (20 → fine), the weight
// of the child (6 real CLI boots → fine), and a stdin buffer on the spawn (6 with one → fine). The
// remaining shape sits inside Bun's own process handling, which is not ours to fix.
//
// So the coupling is REMOVED rather than explained — and that decision needs a guard, because the
// next person to tidy `TEST_DIRS` would merge the two back with no way to know what they cost. A
// mitigation nobody can accidentally undo is worth more than one that depends on remembering.
//
// ⚠️ This asserts the SHAPE of the gate. It does not, and cannot, assert that the underlying Bun
// behaviour is fixed. Reading a green gate as "that problem is solved" is exactly the mistake this
// comment exists to prevent.
import { describe, it, expect } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const check = readFileSync(
  join(import.meta.dir, "..", "..", "scripts", "check.mjs"),
  "utf8",
);

describe("the gate keeps the browser suite in its own process", () => {
  it("names lib/verify as a check of its own", () => {
    expect(check).toContain("BROWSER_SUITE");
    expect(check).toMatch(/const BROWSER_SUITE = "lib\/verify"/);
  });

  it("excludes the browser suite from the lib check, so the two never share a process", () => {
    // The exclusion is the load-bearing half: naming lib/verify twice would run it twice and
    // still leave the flake in place.
    expect(check).toMatch(/filter\(\(d\) => d !== BROWSER_SUITE\)/);
  });

  it("derives the lib check from the directory listing, so a new lib/ subdir cannot go untested", () => {
    // A hand-written list would silently stop covering whatever is added next — a worse defect
    // than the flake this split repairs.
    expect(check).toMatch(/readdirSync\("lib"/);
  });
});
