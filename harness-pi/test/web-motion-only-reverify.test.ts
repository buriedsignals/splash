import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { failuresBlock, motionOnly } from "../craft/_shared/verify-failures.mjs";

// gx-beeswarm web (12B, 2026-11-16, gx-beeswarm-web-seeded-osaurus-1794835397961): the same beat failed
// "two idle frames differ" on phone, then "rest restores the landing picture" on laptop-wide; the refusal said
// "fix the words" and the model sent 16 edits that changed nothing.
const IDLE = "  - phone: chart-gesture-1: the drawing is still enough between two frames to compare at all  — 260/45453 pixels differ between two idle frames of the same 327x139 rectangle — a click must beat 1040";
const RESTORE = '  - laptop-wide (no JS): chart-gesture-1: choosing "rest" again restores the landing picture  — 963 of 844288 pixels still differ from the landing view, against a 8-pixel noise floor';
const WORDS = "  - phone: annotation 2 overlaps the axis label";
const output = (...failures: string[]) => ["203 checks passed, 1 failed", "", "failures:", ...failures, "the refused page, for diagnosis —"];

describe("verify-web failures about motion alone", () => {
  it("should read the failures block", () => {
    expect(failuresBlock(output(IDLE, RESTORE))).toEqual([IDLE, RESTORE]);
  });
  it("should take an idle-frame and a restore failure as motion only", () => {
    expect(motionOnly([IDLE, RESTORE])).toBe(true);
  });
  it("should not take a list holding another failure as motion only", () => {
    expect(motionOnly([IDLE, WORDS])).toBe(false);
  });
  it("should not take an empty list as motion only", () => {
    expect(motionOnly([])).toBe(false);
  });
  it("should verify once more before refusing on motion", () => {
    const src = readFileSync(join(import.meta.dirname, "..", "craft", "_shared", "web.mjs"), "utf8");
    expect(src).toMatch(/motionOnly\(failuresBlock\(lines\)\)\) \{[\s\S]{0,200}verifyOnce\(\)/);
  });
});
