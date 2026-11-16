import { describe, expect, it } from "bun:test";
import { mkdirSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { craftReads } from "../src/craft-kit.ts";
import { fsTools } from "../src/tools/fs.ts";

const root = mkdtempSync(join(tmpdir(), "splash-advertised-"));
const storyDir = join(root, "stories", "demo");
const beatDir = join(storyDir, "beats", "1");
mkdirSync(beatDir, { recursive: true });

// gx-histogram web, Qwen3.5-9B, 2026-11-16: the read tools' description named proof/, the craft session asked for
// stories/<story>/proof/data.json fourteen times and never wrote; 201 such reads over 30 Qwen runs, none on the 12B.
describe("craft reads — the read tools advertise only what the craft session may read", () => {
  it("should not name proof/ in read_file's description for a craft session", () => {
    const { readFile } = fsTools({ root, storyDir, ...craftReads(beatDir, "1") });
    expect(readFile.description).not.toContain("proof/");
  });
  it("should not name proof/ in list_dir's description for a craft session", () => {
    const { listDir } = fsTools({ root, storyDir, ...craftReads(beatDir, "1") });
    expect(listDir.description).not.toContain("proof/");
  });
  it("should still name proof/ for a session whose bases include it", () => {
    const { readFile } = fsTools({ root, storyDir });
    expect(readFile.description).toContain("proof/");
  });
  it("should name the beat's own data.json when the model reaches for proof/", async () => {
    const { readFile } = fsTools({ root, storyDir, ...craftReads(beatDir, "1") });
    const out = await readFile.execute("a", { path: join(storyDir, "proof", "data.json") }, undefined, undefined, undefined as never);
    expect(out.content[0].text).toContain("beats/1/data.json");
  });
});
