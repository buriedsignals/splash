import { describe, expect, it } from "bun:test";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import models from "../serve/models.json";
import { beatTools } from "../src/tools/fs.ts";

const root = realpathSync(mkdtempSync(join(tmpdir(), "splash-write-")));
const storyDir = join(root, "stories", "s");
mkdirSync(join(storyDir, "beats", "1"), { recursive: true });
const beat = join(storyDir, "beats", "1", "beat.mjs");
const write = beatTools({ root, storyDir }, "1").writeFile as any;

describe("write_file over an existing beat.mjs", () => {
  it("should refuse empty content, keeping the file", async () => {
    writeFileSync(beat, "export default { title: 'kept' };");
    await expect(write.execute("1", { content: "  " })).rejects.toThrow(/empty write would erase it/);
    expect(readFileSync(beat, "utf8")).toContain("kept");
  });

  it("should still write non-empty content", async () => {
    await write.execute("1", { content: "export default {};" });
    expect(readFileSync(beat, "utf8")).toBe("export default {};");
  });
});

describe("the stock model's output cap", () => {
  it("should be at least max(8192, a quarter of the context window)", () => {
    const m = models.providers["splash-local"].models[0];
    expect(m.maxTokens).toBeGreaterThanOrEqual(Math.max(8192, m.contextWindow / 4));
  });
});

describe("write_file with no content", () => {
  it("should refuse a first write of \"null\", leaving no beat.mjs (real-gwis wrote 4 characters after an aborted generation)", async () => {
    const fresh = join(storyDir, "beats", "2", "beat.mjs");
    mkdirSync(join(storyDir, "beats", "2"), { recursive: true });
    const write2 = beatTools({ root, storyDir }, "2").writeFile as any;
    await expect(write2.execute("1", { content: "null" })).rejects.toThrow(/no content/);
    expect(existsSync(fresh)).toBe(false);
  });
});

// h12 map web (12B, 2026-11-14): the first write was 14,196 characters, 184 lines of reasoning in comments and no
// export default; every whole rewrite was then refused as "exists, too long", and the craft ran out its 15 min cap.
describe("write_file of a beat with no default export", () => {
  const dir = join(storyDir, "beats", "3");
  mkdirSync(dir, { recursive: true });
  const file = join(dir, "beat.mjs");
  const write3 = beatTools({ root, storyDir }, "3").writeFile as any;

  it("should refuse it and write nothing", async () => {
    await expect(write3.execute("1", { content: "const a = 1;\n// export default { title }\n" })).rejects.toThrow(
      /no export default.*Nothing was written/,
    );
    expect(existsSync(file)).toBe(false);
  });

  it("should let a whole rewrite replace a beat.mjs that has no default export, however long", async () => {
    writeFileSync(file, "const a = 1;\n");
    const long = `export default { title: "${"x".repeat(7_000)}" };\n`;
    await write3.execute("1", { content: long });
    expect(readFileSync(file, "utf8")).toBe(long);
  });
});
