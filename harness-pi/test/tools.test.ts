import { beforeAll, describe, expect, it } from "bun:test";
import { existsSync, readFileSync } from "node:fs";
import { copyFile, mkdir, mkdtemp, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { type Bases, fsTools } from "../src/tools/fs.ts";
import { lookTool } from "../src/tools/look.ts";

const CHECKOUT = resolve(import.meta.dirname, "../..");
const PROOF_PNG = join(
  CHECKOUT,
  "proof/static-bar-top-emitters-2024/renders/creme.png",
);

let bases: Bases;
const call = (tool: { execute: Function }, params: object) =>
  tool.execute("t1", params, undefined, undefined, undefined);
const textOf = (r: { content: { type: string; text?: string }[] }) =>
  r.content.find((c) => c.type === "text")?.text ?? "";

beforeAll(async () => {
  const root = await mkdtemp(join(tmpdir(), "splash-tools-"));
  await symlink(join(CHECKOUT, "skills"), join(root, "skills"), "dir");
  const storyDir = join(root, "stories", "demo");
  await mkdir(join(storyDir, "source"), { recursive: true });
  await mkdir(join(storyDir, "beats", "1-top", "renders"), { recursive: true });
  const rows = [
    "year,value",
    ...Array.from({ length: 100 }, (_, i) => `${1900 + i},${i}`),
  ].join("\n");
  await writeFile(join(storyDir, "source", "data.csv"), rows);
  await copyFile(
    PROOF_PNG,
    join(storyDir, "beats", "1-top", "renders", "still.png"),
  );
  bases = { root, storyDir };
});

describe("file tools", () => {
  it("should write a file inside the story directory", async () => {
    const { writeFile: write } = fsTools(bases);
    await call(write, { path: "stories/demo/beats/1-top/Chart.tsx", content: "export {};" });
    expect(
      readFileSync(join(bases.storyDir, "beats/1-top/Chart.tsx"), "utf8"),
    ).toBe("export {};");
  });

  it("should refuse a write that climbs out of the story, naming the story directory", async () => {
    const { writeFile: write } = fsTools(bases);
    await expect(
      call(write, { path: "../outside.txt", content: "x" }),
    ).rejects.toThrow(/outside the story directory/);
    expect(existsSync(join(bases.root, "outside.txt"))).toBe(false);
  });

  it("should refuse a write into skills/ even though skills/ is readable", async () => {
    const { writeFile: write } = fsTools(bases);
    await expect(
      call(write, { path: join(bases.root, "skills/x.md"), content: "x" }),
    ).rejects.toThrow(/outside the story directory/);
  });

  it("should read a skill file by absolute path", async () => {
    const { readFile: read } = fsTools(bases);
    const r = await call(read, {
      path: join(bases.root, "skills/chart-beat/SKILL.md"),
    });
    expect(textOf(r)).toMatch(/^---\nname: chart-beat/);
  });

  it("should refuse a read outside the story, skills/, shared/ and proof/", async () => {
    const { readFile: read } = fsTools(bases);
    await expect(call(read, { path: "/etc/hosts" })).rejects.toThrow(
      /outside the readable directories/,
    );
  });

  it("should return an excerpt of a long CSV that points to the profile", async () => {
    const { readFile: read } = fsTools(bases);
    const r = await call(read, { path: "stories/demo/source/data.csv" });
    expect(textOf(r)).toMatch(
      /first 40 of 101 lines; the full profile is in source\/profile\.json/,
    );
  });

  it("should replace one exact occurrence, keeping dollar signs literal", async () => {
    const { writeFile: write, editFile } = fsTools(bases);
    await call(write, { path: "stories/demo/notes.md", content: "price: X" });
    await call(editFile, {
      path: "stories/demo/notes.md",
      old_text: "X",
      new_text: "$& $1",
    });
    expect(readFileSync(join(bases.storyDir, "notes.md"), "utf8")).toBe(
      "price: $& $1",
    );
  });

  it("should refuse an edit whose old text is not unique", async () => {
    const { writeFile: write, editFile } = fsTools(bases);
    await call(write, { path: "stories/demo/twice.md", content: "a a" });
    await expect(
      call(editFile, { path: "stories/demo/twice.md", old_text: "a", new_text: "b" }),
    ).rejects.toThrow(/occurs 2 times/);
  });
});

describe("look tool", () => {
  it("should return the render as one PNG image block", async () => {
    const r = await call(lookTool(bases), {
      path: "stories/demo/beats/1-top/renders/still.png",
    });
    const images = r.content.filter(
      (c: { type: string }) => c.type === "image",
    );
    expect(images).toHaveLength(1);
    expect(images[0].mimeType).toBe("image/png");
  });

  it("should refuse a file that is not a PNG", async () => {
    await expect(
      call(lookTool(bases), { path: "stories/demo/source/data.csv" }),
    ).rejects.toThrow(/is not a PNG/);
  });
});

describe("edit size limits", () => {
  it("should refuse an edit whose old text exceeds the limit, asking for smaller edits", async () => {
    const { writeFile: write, editFile } = fsTools(bases);
    await call(write, { path: "stories/demo/big.md", content: "x".repeat(2_000) });
    await expect(
      call(editFile, { path: "stories/demo/big.md", old_text: "x".repeat(1_600), new_text: "y" }),
    ).rejects.toThrow(/edit too large .*split it into smaller edits/);
  });

  it("should refuse to rewrite an existing file with long content, pointing to edit_file", async () => {
    const { writeFile: write } = fsTools(bases);
    await call(write, { path: "stories/demo/component.tsx", content: "short" });
    await expect(call(write, { path: "stories/demo/component.tsx", content: "z".repeat(7_000) })).rejects.toThrow(
      /rewrite it with several edit_file calls/,
    );
  });

  it("should still create a new file with long content", async () => {
    const { writeFile: write } = fsTools(bases);
    await call(write, { path: "stories/demo/fresh.tsx", content: "z".repeat(7_000) });
    expect(readFileSync(join(bases.storyDir, "fresh.tsx"), "utf8")).toHaveLength(7_000);
  });
});
