import { describe, expect, it } from "bun:test";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fsTools } from "../src/tools/fs.ts";

const root = mkdtempSync(join(tmpdir(), "splash-reread-"));
const storyDir = join(root, "stories", "demo");
mkdirSync(join(storyDir, "source"), { recursive: true });
writeFileSync(join(storyDir, "source", "notes.md"), "the story's notes\n");
const bases = { root, storyDir, noRereads: "Edit the beat." };
const PATH = join(storyDir, "source", "notes.md");

/** The model's live context, as Pi builds it: the tool results still in it. */
const context = (...ids: string[]) => ({
  sessionManager: {
    buildContextEntries: () => ids.map((id) => ({ type: "message", id: `e-${id}`, message: { role: "toolResult", toolCallId: id } })),
  },
});
const read = (tool: { execute: Function }, id: string, ctx: object) => tool.execute(id, { path: PATH }, undefined, undefined, ctx);

// Qwen3.5-9B and 12B moving formats, 2026-11-16: 100 of 275 refused rereads came after the session had compacted,
// when the first read was no longer in the model's context, and the one path to the file was refused.
describe("read_file — a reread is refused only while the first read is still in the model's context", () => {
  it("should refuse a reread while the first read's result is still in context", async () => {
    const { readFile } = fsTools(bases);
    await read(readFile, "a", context());
    await expect(read(readFile, "b", context("a"))).rejects.toThrow(/already read/);
  });
  it("should return the file again once compaction has dropped the first read", async () => {
    const { readFile } = fsTools(bases);
    await read(readFile, "a", context());
    const out = await read(readFile, "b", context("x", "y"));
    expect(out.content[0].text.length).toBeGreaterThan(0);
  });
  it("should refuse a third read that follows a reread the context still holds", async () => {
    const { readFile } = fsTools(bases);
    await read(readFile, "a", context());
    await read(readFile, "b", context());
    await expect(read(readFile, "c", context("b"))).rejects.toThrow(/already read/);
  });
});
