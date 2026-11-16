import { beforeEach, describe, expect, it } from "bun:test";
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { type Bases, beatTools, fsTools } from "../src/tools/fs.ts";

// Moving formats, both students, 2026-11-16: 48 of 227 "old_text occurs 0 times" refusals were edits an earlier call
// had already applied (new_text was the file's line). The 12B then copied that line into old_text AND new_text, and
// looped on "this edit changes nothing" (gx-area video 1794742750454, gx-beeswarm video 1794835791923).
const NOW = '    { do: "reference", value: HIGH, note: `${HIGH} t` },';
const BEFORE = '    { do: "reference", value: HIGH, note: `${HIGH} t : ${above.length} pays` },';
let bases: Bases;
beforeEach(() => {
  const storyDir = mkdtempSync(join(tmpdir(), "splash-applied-"));
  mkdirSync(join(storyDir, "beats", "1"), { recursive: true });
  writeFileSync(join(storyDir, "beats", "1", "beat.mjs"), `export default {\n  gestures: [\n${NOW}\n  ],\n};\n`);
  bases = { root: storyDir, storyDir } as Bases;
});
const beat = () => readFileSync(join(bases.storyDir, "beats", "1", "beat.mjs"), "utf8");

async function viaBeat(args: object) {
  const { editFile } = beatTools(bases, "1");
  return editFile.execute("t", args as never, undefined, undefined, undefined as never);
}

describe("edit whose new_text is already in the file and whose old_text is not", () => {
  it("should answer without an error on edit_beat", async () => {
    await expect(viaBeat({ old_text: BEFORE, new_text: NOW })).resolves.toBeDefined();
  });
  it("should say the change is already in the file", async () => {
    const out = await viaBeat({ old_text: BEFORE, new_text: NOW });
    expect(out.content[0].text).toMatch(/already/);
  });
  it("should leave the file unchanged", async () => {
    const before = beat();
    await viaBeat({ old_text: BEFORE, new_text: NOW });
    expect(beat()).toBe(before);
  });
  it("should answer without an error on edit_file", async () => {
    const { editFile } = fsTools(bases);
    await expect(
      editFile.execute("t", { path: "beats/1/beat.mjs", old_text: BEFORE, new_text: NOW } as never, undefined, undefined, undefined as never),
    ).resolves.toBeDefined();
  });
  it("should still refuse an old_text that is absent when new_text is absent too", async () => {
    await expect(viaBeat({ old_text: BEFORE, new_text: "    { do: \"reference\", value: LOW }," })).rejects.toThrow(/occurs 0 times/);
  });
});

describe("edit whose new_text is a fragment found inside another line", () => {
  it("should still refuse the absent old_text", async () => {
    await expect(viaBeat({ old_text: BEFORE, new_text: "HIGH" })).rejects.toThrow(/occurs 0 times/);
  });
});
