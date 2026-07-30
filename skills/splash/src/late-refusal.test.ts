import { describe, it, expect } from "bun:test";
import { mkdtempSync, readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { lateRefusalSentence, recordLateRefusal } from "./late-refusal";

describe("a late refusal deviates and is recorded", () => {
  const r = {
    guard: "snap-contrast",
    subject: "heatmap/static",
    reason:
      'label "Vendredi" measured 3.1:1 against #18181B, below the 4.5:1 floor',
    deviation:
      "pick a lighter house ground, or a darker in-cell label colour, then produce again",
  };

  it("should name the unblocking step in the sentence", () => {
    const s = lateRefusalSentence(r);
    expect(s).toContain("3.1:1");
    expect(s).toContain("produce again");
  });

  it("should never emit a refusal with no deviation", () => {
    // A refusal that stops instead of routing is the defect family A exists to close; this
    // module must not be able to produce one.
    expect(() => lateRefusalSentence({ ...r, deviation: "  " })).toThrow(
      /deviation/,
    );
  });

  it("should append one JSON line per refusal, so the list can shrink", () => {
    const dir = mkdtempSync(join(tmpdir(), "late-"));
    recordLateRefusal(dir, r);
    recordLateRefusal(dir, { ...r, subject: "heatmap/interactive" });
    const p = join(dir, "late-refusals.jsonl");
    expect(existsSync(p)).toBe(true);
    const lines = readFileSync(p, "utf8").trim().split("\n");
    expect(lines).toHaveLength(2);
    expect(JSON.parse(lines[0]).at).toMatch(/^\d{4}-/);
  });
});
