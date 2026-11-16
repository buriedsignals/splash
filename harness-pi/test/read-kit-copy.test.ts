import { describe, expect, it } from "bun:test";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { type Bases, fsTools } from "../src/tools/fs.ts";

// gx-small-multiples web, Qwen3.5-9B (gx-small-multiples-web-seeded-osaurus-qwen-1794851937653): ~25 turns guessing
// skills/chart-beat/craft/_shared/series.mjs and its neighbours, when the kit's copy sat in beats/1/series.mjs.
function setup() {
  const root = mkdtempSync(join(tmpdir(), "splash-kitcopy-"));
  const storyDir = join(root, "stories", "s");
  mkdirSync(join(storyDir, "beats", "1"), { recursive: true });
  mkdirSync(join(root, "skills", "chart-beat"), { recursive: true });
  writeFileSync(join(storyDir, "beats", "1", "series.mjs"), "export const members = () => [];\n");
  return { root, storyDir, readBases: ["skills"] } as unknown as Bases;
}

async function read(bases: Bases, path: string) {
  try {
    await fsTools(bases).readFile.execute("t", { path }, undefined, undefined, undefined as any);
    return "";
  } catch (e) {
    return (e as Error).message;
  }
}

describe("read_file of a kit file at a guessed path", () => {
  it("should point to the beat's own copy when the guess is inside a readable folder", async () => {
    const bases = setup();
    expect(await read(bases, "skills/chart-beat/craft/_shared/series.mjs")).toContain("beats/1/series.mjs");
  });
  it("should point to the beat's own copy when the guess is outside the readable folders", async () => {
    const bases = setup();
    expect(await read(bases, "craft/_shared/series.mjs")).toContain("beats/1/series.mjs");
  });
});
