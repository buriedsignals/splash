import { describe, expect, it } from "bun:test";
import { existsSync, mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { layIn } from "../eval/run-eval.ts";

// Plan U1: a kept run seeds any later step — craft (the storyboard), the designer (the crafted beat and its renders)
// or delivery (the reviewed beat) — so each leg is measured alone, in minutes.
function keptRun() {
  const seed = mkdtempSync(join(tmpdir(), "kept-"));
  writeFileSync(join(seed, "STORYBOARD.md"), "---\n---\n");
  mkdirSync(join(seed, "beats", "1"), { recursive: true });
  for (const f of ["beat.mjs", "data.json", "OUTPUT-REVIEW.json"]) writeFileSync(join(seed, "beats", "1", f), "{}");
  mkdirSync(join(seed, "renders", "1"), { recursive: true });
  writeFileSync(join(seed, "renders", "1", "a.png"), "");
  const story = mkdtempSync(join(tmpdir(), "story-"));
  return { seed, story };
}

describe("layIn", () => {
  it("should lay in only the storyboard for a craft leg", () => {
    const { seed, story } = keptRun();
    layIn(seed, story, "craft");
    expect([existsSync(join(story, "STORYBOARD.md")), existsSync(join(story, "beats", "1", "beat.mjs"))]).toEqual([true, false]);
  });

  it("should lay in the crafted beat and its renders, but no review, for a designer leg", () => {
    const { seed, story } = keptRun();
    layIn(seed, story, "designer");
    expect(["beat.mjs", "data.json", "renders/a.png", "OUTPUT-REVIEW.json"].map((f) => existsSync(join(story, "beats", "1", f)))).toEqual([true, true, true, false]);
  });

  it("should lay in the review as well for a delivery leg", () => {
    const { seed, story } = keptRun();
    layIn(seed, story, "deliver");
    expect(existsSync(join(story, "beats", "1", "OUTPUT-REVIEW.json"))).toBe(true);
  });

  it("should refuse a delivery leg from a kept run that was never reviewed, naming the file", () => {
    const { seed, story } = keptRun();
    const bare = mkdtempSync(join(tmpdir(), "kept-"));
    mkdirSync(join(bare, "beats", "1"), { recursive: true });
    expect(() => layIn(bare, story, "deliver")).toThrow(/OUTPUT-REVIEW\.json/);
    void seed;
  });

  it("should refuse a leg it does not know, naming the ones it does", () => {
    const { seed, story } = keptRun();
    expect(() => layIn(seed, story, "palette")).toThrow(/craft, designer, deliver/);
  });
});
