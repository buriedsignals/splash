import { beforeEach, describe, expect, it } from "bun:test";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { Bases } from "../src/tools/fs.ts";
import { lookTool } from "../src/tools/look.ts";

// gx-histogram scrolly, Qwen (1794842413307): the first render passed; the model then spent 12 turns looking again at
// the same four unchanged cards until the craft stopped on "no new record". 33 such repeat looks over 25 cells.
const PNG = Buffer.from("89504e470d0a1a0a0000000d49484452", "hex");
let bases: Bases;
let png: string;
beforeEach(() => {
  const storyDir = mkdtempSync(join(tmpdir(), "splash-look-"));
  mkdirSync(join(storyDir, "beats", "1", "renders"), { recursive: true });
  png = join(storyDir, "beats", "1", "renders", "card-1.png");
  writeFileSync(png, PNG);
  bases = { root: storyDir, storyDir } as Bases;
});
const ctxHolding = (...ids: string[]) => ({ sessionManager: { buildContextEntries: () => ids.map((toolCallId) => ({ message: { toolCallId } })) } });
const kinds = (r: { content: { type: string }[] }) => r.content.map((c) => c.type);

describe("look at a render that has not changed since the last look", () => {
  it("should not send the image again while the first look is in context", async () => {
    const look = lookTool(bases);
    await look.execute("a", { path: "beats/1/renders/card-1.png" }, undefined, undefined, ctxHolding("a") as never);
    const again = await look.execute("b", { path: "beats/1/renders/card-1.png" }, undefined, undefined, ctxHolding("a") as never);
    expect(kinds(again)).not.toContain("image");
  });
  it("should say the beat is done when every render reads right", async () => {
    const look = lookTool(bases);
    await look.execute("a", { path: "beats/1/renders/card-1.png" }, undefined, undefined, ctxHolding("a") as never);
    const again = await look.execute("b", { path: "beats/1/renders/card-1.png" }, undefined, undefined, ctxHolding("a") as never);
    expect((again.content[0] as { text: string }).text).toMatch(/not changed[\s\S]*done/);
  });
  it("should send the image again once the render changed", async () => {
    const look = lookTool(bases);
    await look.execute("a", { path: "beats/1/renders/card-1.png" }, undefined, undefined, ctxHolding("a") as never);
    writeFileSync(png, Buffer.concat([PNG, Buffer.from([1])]));
    const again = await look.execute("b", { path: "beats/1/renders/card-1.png" }, undefined, undefined, ctxHolding("a") as never);
    expect(kinds(again)).toContain("image");
  });
  it("should send the image again once compaction dropped the first look", async () => {
    const look = lookTool(bases);
    await look.execute("a", { path: "beats/1/renders/card-1.png" }, undefined, undefined, ctxHolding("a") as never);
    const again = await look.execute("b", { path: "beats/1/renders/card-1.png" }, undefined, undefined, ctxHolding() as never);
    expect(kinds(again)).toContain("image");
  });
});
