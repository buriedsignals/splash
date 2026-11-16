import { beforeEach, describe, expect, it } from "bun:test";
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { validateToolArguments } from "@earendil-works/pi-ai";
import { type Bases, beatTools } from "../src/tools/fs.ts";

// gx-beeswarm static, 26B-A4B (gx-beeswarm-seeded-local26-1794825350813): edit_file sent write_file's arguments
// ({ content }) twelve times; Pi's schema error ("new_text: must have required properties") never named write_file,
// and the beat stayed unchanged under the same refusal.
let bases: Bases;
beforeEach(() => {
  const storyDir = mkdtempSync(join(tmpdir(), "splash-editwhole-"));
  mkdirSync(join(storyDir, "beats", "1"), { recursive: true });
  writeFileSync(join(storyDir, "beats", "1", "beat.mjs"), "const a = 1;\nexport default a;\n");
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

describe("edit_file given a whole file's content", () => {
  it("should name write_file as the call that takes content", async () => {
    expect(await send({ content: "const a = 2;\nexport default a;\n" })).toContain("call write_file");
  });
  it("should leave the beat unchanged", async () => {
    await send({ content: "const a = 2;\nexport default a;\n" });
    expect(readFileSync(join(bases.storyDir, "beats", "1", "beat.mjs"), "utf8")).toBe("const a = 1;\nexport default a;\n");
  });
  it("should still edit from old_text and new_text", async () => {
    await send({ old_text: "a = 1", new_text: "a = 2" });
    expect(readFileSync(join(bases.storyDir, "beats", "1", "beat.mjs"), "utf8")).toBe("const a = 2;\nexport default a;\n");
  });
  it("should still ask for new_text when only old_text comes", async () => {
    expect(await send({ old_text: "a = 1" })).toContain("new_text");
  });
});
