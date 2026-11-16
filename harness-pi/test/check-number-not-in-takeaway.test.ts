import { describe, expect, it } from "bun:test";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { errorText } from "../craft/_shared/guards.mjs";

// gx-connected-scatter web, Qwen3.5-9B (mvq17, mvq18): the example's check() tests ITS title's count
// (lost.length !== 5, "cinq plus légers"); Qwen copied the test under a takeaway that states no such count, and its own
// error — "5 countries lost European weight, not 1" — passed word for word. It tried 1, 15, then 1 again.
const TAKEAWAY = "All 16 countries cleaned up their own electricity between 2000 and 2024, yet France lost 11.8 points of weight";

async function thrown(condition: string, message: string, takeaway = TAKEAWAY) {
  const story = mkdtempSync(join(tmpdir(), "splash-checknum-"));
  const beat = join(story, "beats", "1");
  mkdirSync(beat, { recursive: true });
  writeFileSync(join(story, "STORYBOARD.md"), `---\ntakeaway: "${takeaway}"\n---\n`);
  writeFileSync(join(beat, "beat.mjs"), `const lost = [1, 2, 3, 4, 5];\nexport default {\n  check() {\n    if (${condition}) throw new Error(\`${message}\`);\n  },\n};\n`);
  const mod = await import(join(beat, "beat.mjs"));
  try {
    mod.default.check();
  } catch (e) {
    return errorText(e);
  }
  return "";
}

describe("a check() that tests a number the takeaway never states", () => {
  it("should say the takeaway states no such number", async () => {
    expect(await thrown("lost.length !== 1", "${lost.length} countries lost European weight, not 1")).toContain("the takeaway never states 1");
  });
  it("should say to delete the test", async () => {
    expect(await thrown("lost.length !== 1", "${lost.length} countries lost European weight, not 1")).toContain("delete this test from check()");
  });
  it("should keep the model's own words", async () => {
    expect(await thrown("lost.length !== 1", "${lost.length} countries lost European weight, not 1")).toContain("5 countries lost European weight, not 1");
  });
  it("should leave a test of a number the takeaway states as it was", async () => {
    expect(await thrown("lost.length !== 16", "${lost.length} countries, not 16")).not.toContain("never states");
  });
  it("should leave a test of a year the takeaway names as it was", async () => {
    expect(await thrown("lost.length !== 2000", "x")).not.toContain("never states");
  });
  it("should leave a test of a number the takeaway writes as a word as it was", async () => {
    const said = await thrown("lost.length !== 6", "x", "Tous plus propres chez eux, six plus légers en Europe");
    expect(said.startsWith("x") && !said.includes("never states")).toBe(true);
  });
});
