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

  // Replay scan 2026-11-07: 56 reads of data.json refused in 11 sessions since 2026-10-28, given bare or at the run root.
  it("should read the only beat's data.json when the model names it bare", () => {
    expect(resolveReadable(bases, "data.json")).toBe(join(storyDir, "beats", "1", "data.json"));
  });

  it("should read the only beat's data.json when the model puts it at the run root", () => {
    expect(resolveReadable(bases, join(root, "data.json"))).toBe(join(storyDir, "beats", "1", "data.json"));
  });

  // Replay scan 2026-11-07: a 12B retyped its run's absolute path with one digit too many, six times over.
  it("should read the story's file through a mistyped run directory", () => {
    expect(resolveReadable(bases, join(root + "0", "stories", "stress-q-safety-incidents", "beats", "1", "data.json"))).toBe(join(storyDir, "beats", "1", "data.json"));
  });

  // Osaurus run 2026-11-08: the MLX 12B spelled every - as _ in both the run directory and the story folder,
  // and spent its craft step on five refused reads of beats/1/data.json.
  it("should read the story's file when the run directory and the story folder are both spelled with _", () => {
    const typed = join(root.replace(/-/g, "_"), "stories", "stress_q_safety_incidents", "beats", "1", "data.json");
    expect(resolveReadable(bases, typed)).toBe(join(storyDir, "beats", "1", "data.json"));
  });

  it("should list the story's folder when the run directory and the story folder are both spelled with _", () => {
    expect(resolveReadable(bases, join(root.replace(/-/g, "_"), "stories", "stress_q_safety_incidents") + "/")).toBe(storyDir);
  });
});
