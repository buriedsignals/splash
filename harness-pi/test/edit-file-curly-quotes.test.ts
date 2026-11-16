import { beforeEach, describe, expect, it } from "bun:test";
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { validateToolArguments } from "@earendil-works/pi-ai";
import { type Bases, beatTools } from "../src/tools/fs.ts";

// gx-beeswarm video, Qwen3.5-9B (gx-beeswarm-video-seeded-osaurus-qwen-1794827224885): the beat held "de l’humanité";
// the model typed old_text with a straight apostrophe ten times, each refused with the exact line quoted back.
let bases: Bases;
beforeEach(() => {
  const storyDir = mkdtempSync(join(tmpdir(), "splash-editquote-"));
  mkdirSync(join(storyDir, "beats", "1"), { recursive: true });
  writeFileSync(join(storyDir, "beats", "1", "beat.mjs"), "const note = `6 pays, 2,1 % de l’humanité`;\nconst title = “Les 6 pays”;\n");
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

describe("edit_file whose old_text differs from the file only by typographic quotes", () => {
  it("should apply the edit when old_text types a straight apostrophe for the file's curly one", async () => {
    await send({ old_text: "6 pays, 2,1 % de l'humanité", new_text: "6 pays" });
    expect(beat()).toBe("const note = `6 pays`;\nconst title = “Les 6 pays”;\n");
  });
  it("should apply the edit when old_text types straight double quotes for curly ones", async () => {
    await send({ old_text: 'const title = "Les 6 pays";', new_text: 'const title = "Six pays";' });
    expect(beat()).toContain('const title = "Six pays";');
  });
  it("should still refuse an old_text that differs by more than quotes", async () => {
    expect(await send({ old_text: "6 pays, 2,2 % de l'humanité", new_text: "6 pays" })).toContain("occurs 0 times");
  });
});
