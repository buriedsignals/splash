import { beforeEach, describe, expect, it } from "bun:test";
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { validateToolArguments } from "@earendil-works/pi-ai";
import { type Bases, beatTools } from "../src/tools/fs.ts";

// gx-locator web, 12B (gx-locator-web-seeded-osaurus-1794836711472): the beat held `const FRENCH_PLACE = {` at column 0;
// the model typed old_text with four leading spaces eleven times, each refused, and the cell hit its 15-minute cap.
let bases: Bases;
beforeEach(() => {
  const storyDir = mkdtempSync(join(tmpdir(), "splash-editindent-"));
  mkdirSync(join(storyDir, "beats", "1"), { recursive: true });
  writeFileSync(join(storyDir, "beats", "1", "beat.mjs"), 'const FRENCH_PLACE = {\n  Rostov: "Rostov",\n};\nexport default { FRENCH_PLACE };\n');
  bases = { storyDir } as Bases;
});

async function send(args: object) {
  const { editFile } = beatTools(bases, "1");
  const call = { type: "toolCall", id: "t", name: "edit_file", arguments: args } as any;
  try {
    const checked = validateToolArguments(editFile as any, call);
    await editFile.execute("t", checked, undefined, undefined, undefined);
    return "";
  } catch (e) {
    return (e as Error).message;
  }
}

const beat = () => readFileSync(join(bases.storyDir, "beats", "1", "beat.mjs"), "utf8");

describe("edit_file whose old_text differs from the file only by its leading indentation", () => {
  it("should apply the edit when old_text adds spaces before a line the file starts at column 0", async () => {
    await send({ old_text: '    const FRENCH_PLACE = {\n  Rostov: "Rostov",\n};', new_text: '    const FRENCH_PLACE = {\n  Rostov: "Rostov-sur-le-Don",\n};' });
    expect(beat()).toContain('const FRENCH_PLACE = {\n  Rostov: "Rostov-sur-le-Don",\n};');
  });
  it("should not leave the extra indentation in the file", async () => {
    await send({ old_text: '    const FRENCH_PLACE = {\n  Rostov: "Rostov",\n};', new_text: '    const FRENCH_PLACE = {\n  Rostov: "Rostov-sur-le-Don",\n};' });
    expect(beat().startsWith("const FRENCH_PLACE")).toBe(true);
  });
  it("should still refuse an old_text that differs by more than indentation", async () => {
    expect(await send({ old_text: '    const FRENCH_PLACE = {\n  Rostov: "Rostoff",\n};', new_text: "x" })).toContain("occurs 0 times");
  });
});
