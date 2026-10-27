import { describe, expect, it } from "bun:test";
import { mkdirSync, mkdtempSync, realpathSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { resolveReadable } from "../src/tools/fs.ts";

const root = realpathSync(mkdtempSync(join(tmpdir(), "splash-fs-")));
const storyDir = join(root, "stories", "stress-q-safety-incidents");
mkdirSync(join(storyDir, "beats", "1"), { recursive: true });
writeFileSync(join(storyDir, "STORYBOARD.md"), "---\n---\n");
writeFileSync(join(storyDir, "beats", "1", "data.json"), "{}");
mkdirSync(join(root, "stories", "other"), { recursive: true });
writeFileSync(join(root, "stories", "other", "STORYBOARD.md"), "---\n---\n");
const bases = { root, storyDir };

describe("resolveReadable", () => {
  it("should read the story's folder when the model spells its - as _", () => {
    expect(resolveReadable(bases, join(root, "stories", "stress_q_safety_incidents", "STORYBOARD.md"))).toBe(join(storyDir, "STORYBOARD.md"));
  });

  it("should reach the only beat's file through the misspelled folder", () => {
    expect(resolveReadable(bases, join(root, "stories", "stress_q_safety_incidents", "data.json"))).toBe(join(storyDir, "beats", "1", "data.json"));
  });

  it("should still refuse another story, naming this story's folder", () => {
    expect(() => resolveReadable(bases, join(root, "stories", "other", "STORYBOARD.md"))).toThrow(`the story is ${storyDir}`);
  });
});
