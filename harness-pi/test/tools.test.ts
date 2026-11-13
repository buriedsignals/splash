import { beforeAll, describe, expect, it } from "bun:test";
import { existsSync, readFileSync } from "node:fs";
import { copyFile, mkdir, mkdtemp, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { type Bases, beatTools, fsTools } from "../src/tools/fs.ts";
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
    await call(write, { path: "stories/demo/beats/1-top/beat.mjs", content: "export {};" });
    expect(
      readFileSync(join(bases.storyDir, "beats/1-top/beat.mjs"), "utf8"),
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

  it("should recover the file name from a path that swallowed the next tool call", async () => {
    const { writeFile: write } = fsTools(bases);
    const path = "stories/demo/beats/1-top/beat.mjs`}<tool_call|><|channel>thought\n<channel|><|tool_call>call:render_beat{beat:";
    await call(write, { path, content: "export default {};" });
    expect(readFileSync(join(bases.storyDir, "beats/1-top/beat.mjs"), "utf8")).toBe("export default {};");
  });

  it("should refuse a malformed path that names no file", async () => {
    const { writeFile: write } = fsTools(bases);
    await expect(call(write, { path: "stories/demo/<|tool_call>call:x{", content: "x" })).rejects.toThrow(/malformed/);
  });

  it("should read a story-relative path the root does not hold", async () => {
    const { listDir } = fsTools(bases);
    const r = await call(listDir, { path: "source/" });
    expect(textOf(r)).toContain("data.csv");
  });

  // gx-bullet static (Qwen3.5-9B, 2026-11-13): reads of beat.example.mjs, data.json and BEATS.md, three files the
  // worked example does not hold, each answered with a bare ENOENT, before one list_dir showed what was there.
  it("should name what the folder holds when the file read does not exist", async () => {
    const { readFile: read } = fsTools(bases);
    await expect(call(read, { path: "stories/demo/source/BEATS.md" })).rejects.toThrow(/does not exist.*holds: .*data\.csv/);
  });

  it("should name what the nearest folder holds when the folder listed does not exist", async () => {
    const { listDir } = fsTools(bases);
    await expect(call(listDir, { path: "stories/demo/source/nope/deeper" })).rejects.toThrow(/does not exist; stories\/demo\/source\/ holds: .*data\.csv/);
  });

  it("should list the story for the path '.'", async () => {
    const { listDir } = fsTools(bases);
    const r = await call(listDir, { path: "." });
    expect(textOf(r)).toContain("source/");
  });

  it("should refuse to write the analyst's data.json", async () => {
    const { writeFile: write } = fsTools(bases);
    await expect(call(write, { path: "stories/demo/beats/1-top/data.json", content: "{}" })).rejects.toThrow(/not yours to write/);
  });

  it("should refuse any beat file other than beat.mjs", async () => {
    const { writeFile: write } = fsTools(bases);
    await expect(call(write, { path: "stories/demo/beats/1-top/bake.mjs", content: "x" })).rejects.toThrow(/not yours to write/);
  });

  it("should refuse to edit the frozen sources", async () => {
    const { writeFile: write } = fsTools(bases);
    await expect(call(write, { path: "stories/demo/source/data.csv", content: "x" })).rejects.toThrow(/not yours to write/);
  });

  it("should find a beat file asked for at the story root in the story's only beat", async () => {
    const { readFile: read } = fsTools(bases);
    const { writeFileSync } = await import("node:fs");
    writeFileSync(join(bases.storyDir, "beats/1-top/notes.txt"), "beat note");
    const r = await call(read, { path: join(bases.storyDir, "notes.txt") });
    expect(textOf(r)).toContain("beat note");
  });

  it("should read a skill file by absolute path", async () => {
    const { readFile: read } = fsTools(bases);
    const r = await call(read, {
      path: join(bases.root, "skills/chart-beat/SKILL.md"),
    });
    expect(textOf(r)).toMatch(/^---\nname: chart-beat/);
  });

  // stress-v (Qwen3.5-9B, 2026-11-13): the storyboard listed proof/, which holds a finished scrolly of the same story.
  it("should refuse proof/ to a session whose read bases leave it out", async () => {
    const { mkdirSync, writeFileSync } = await import("node:fs");
    mkdirSync(join(bases.root, "proof/some-beat"), { recursive: true });
    writeFileSync(join(bases.root, "proof/some-beat/BRIEF.md"), "finished");
    const { readFile: read } = fsTools({ ...bases, readBases: ["skills", "shared"] });
    await expect(call(read, { path: "proof/some-beat/BRIEF.md" })).rejects.toThrow(/outside the readable directories \(the story, skills\/, shared\/\)/);
  });

  it("should refuse a second read of an unchanged file and name what to do instead", async () => {
    const { readFile: read } = fsTools({ ...bases, noRereads: "Ask the journalist." });
    await call(read, { path: "proof/source/data.csv" });
    await expect(call(read, { path: "proof/source/data.csv" })).rejects.toThrow(/already read .* Ask the journalist\./);
  });

  it("should name the question still open, computed at the refusal, when a reread is refused", async () => {
    let open = "first";
    const { readFile: read } = fsTools({ ...bases, noRereads: async () => `Ask "Should this be a chart, a map or an image?" (${open}).` });
    await call(read, { path: "proof/source/data.csv" });
    open = "now";
    await expect(call(read, { path: "proof/source/data.csv" })).rejects.toThrow(/Ask "Should this be a chart, a map or an image\?" \(now\)/);
  });

  it("should refuse a second listing of an unchanged directory and name what to do instead", async () => {
    const { listDir } = fsTools({ ...bases, noRereads: "Ask the journalist." });
    await call(listDir, { path: "skills" });
    await expect(call(listDir, { path: "skills" })).rejects.toThrow(/already listed .* Ask the journalist\./);
  });

  it("should answer a read of a path the harness already answered with its reply, even when the path is missing", async () => {
    const { readFile: read, listDir } = fsTools({ ...bases, answered: [{ match: /datawrapper/i, reply: "Ask Custom or Datawrapper." }] });
    expect([
      textOf(await call(read, { path: "shared/chart-beat/references/datawrapper-chart-types.json" })),
      textOf(await call(listDir, { path: "references/datawrapper" })),
    ]).toEqual(["Ask Custom or Datawrapper.", "Ask Custom or Datawrapper."]);
  });

  it("should read a file again once it has changed", async () => {
    const { writeFileSync, utimesSync } = await import("node:fs");
    const f = join(bases.storyDir, "NOTE.md");
    writeFileSync(f, "one");
    const { readFile: read } = fsTools({ ...bases, noRereads: "Ask the journalist." });
    await call(read, { path: f });
    writeFileSync(f, "two");
    utimesSync(f, new Date(), new Date(Date.now() + 5000));
    expect(textOf(await call(read, { path: f }))).toBe("two");
  });

  it("should read the story's frozen source asked for under proof/", async () => {
    const { readFile: read } = fsTools(bases);
    const r = await call(read, { path: "proof/source/data.csv" });
    expect(textOf(r)).toMatch(/full profile is in source\/profile\.json/);
  });

  it("should read the newsroom profile asked for under shared/", async () => {
    const { writeFileSync } = await import("node:fs");
    writeFileSync(join(bases.root, "NEWSROOM.md"), "---\nname: Test news\n---\n");
    const { readFile: read } = fsTools(bases);
    const r = await call(read, { path: "shared/editorial/NEWSROOM.md" });
    expect(textOf(r)).toContain("Test news");
  });

  // stress-v (Qwen3.5-9B, 2026-11-13): "references/type-survey.md", refused, then twelve turns listing shared/.
  it("should find a skill reference asked for by its path inside the skill", async () => {
    const { readFile: read } = fsTools(bases);
    const r = await call(read, { path: "references/type-survey.md" });
    expect(textOf(r).length).toBeGreaterThan(100);
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

  // gx-bullet web (12B, 2026-11-13): eight edits whose new_text equalled old_text were each answered "edited", and the
  // craft looped on them until the same-failure stop.
  it("should refuse an edit that changes nothing", async () => {
    const { writeFile: write, editFile } = fsTools(bases);
    await call(write, { path: "stories/demo/same.mjs", content: "const x = 1;\n" });
    await expect(
      call(editFile, { path: "stories/demo/same.mjs", old_text: "const x = 1;", new_text: "const x = 1;" }),
    ).rejects.toThrow(/new_text is old_text: this edit changes nothing/);
  });

  // gx-proportional-symbol static (Qwen3.5-9B, 2026-11-13): after a passing render, the same 4221-character beat.mjs was
  // written four more times until the fifteen-minute cap.
  it("should refuse a write that changes nothing", async () => {
    const { writeFile: write } = fsTools(bases);
    await call(write, { path: "stories/demo/again.mjs", content: "const x = 1;\n" });
    await expect(
      call(write, { path: "stories/demo/again.mjs", content: "const x = 1;\n" }),
    ).rejects.toThrow(/already holds exactly this content: this write changes nothing/);
  });

  it("should quote the closest line when old text is not found", async () => {
    const { writeFile: write, editFile } = fsTools(bases);
    await call(write, { path: "stories/demo/near.mjs", content: "const title = `Lisboa leads`;\nconst x = 1;" });
    await expect(
      call(editFile, { path: "stories/demo/near.mjs", old_text: "const title = 'Lisboa leads';", new_text: "y" }),
    ).rejects.toThrow(/closest line in the file is: "const title = `Lisboa leads`;"/);
  });

  it("should quote the whole closest passage of a near-miss Arabic block, not only its key line", async () => {
    const { writeFile: write, editFile } = fsTools(bases);
    const block = "  limits: [\n    `استهلاك المياه السنوي بالمتر المكعب.`,\n  ],";
    await call(write, { path: "stories/demo/ar.mjs", content: `const beat = {\n  title: "x",\n${block}\n};` });
    await expect(
      call(editFile, { path: "stories/demo/ar.mjs", old_text: "  limits: [\n    `استهلاك المياه السنوي بالمتر مكعب.`,\n  ],", new_text: "y" }),
    ).rejects.toThrow(`closest passage in the file is: ${JSON.stringify(block)}`);
  });

  it("should find the closest line of a near-miss written only in Arabic", async () => {
    const { writeFile: write, editFile } = fsTools(bases);
    await call(write, { path: "stories/demo/ar1.mjs", content: "const a = 1;\nconst s = `الجدول يغطي سبع محافظات فقط`;\nconst b = 2;" });
    await expect(
      call(editFile, { path: "stories/demo/ar1.mjs", old_text: "`الجدول يغطي سبع محافظات`", new_text: "y" }),
    ).rejects.toThrow("closest line in the file is: \"const s = `الجدول يغطي سبع محافظات فقط`;\"");
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

  it("should say a still taken mid-gesture shows its figures still moving, and name the settled one", async () => {
    // stress-v (Qwen3.5-9B, 2026-11-13): "subject-bracket" is the middle of the bracket, its count still climbing
    // (8.1 of 11.7 Gt); the model took it for a wrong sum and rewrote a correct gesture three times.
    const { mkdirSync, copyFileSync } = await import("node:fs");
    const dir = join(bases.storyDir, "beats/1-top/look");
    mkdirSync(dir, { recursive: true });
    copyFileSync(join(bases.storyDir, "beats/1-top/renders/still.png"), join(dir, "creme-336-subject-bracket.png"));
    const r = await call(lookTool(bases), { path: join(dir, "creme-336-subject-bracket.png") });
    expect(r.content[0].text).toMatch(/middle of the subject gesture.*still moving.*end-subject/);
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

describe("beat tools", () => {
  it("should write the beat's beat.mjs from content alone, with no path to get wrong", async () => {
    const { writeFile: write } = beatTools(bases, "1-top");
    await call(write, { content: "export default {};\n" });
    expect(readFileSync(join(bases.storyDir, "beats", "1-top", "beat.mjs"), "utf8")).toBe("export default {};\n");
  });

  it("should edit the beat's beat.mjs from old_text and new_text alone", async () => {
    const { writeFile: write, editFile } = beatTools(bases, "1-top");
    await call(write, { content: "const a = 1;\n" });
    await call(editFile, { old_text: "a = 1", new_text: "a = 2" });
    expect(readFileSync(join(bases.storyDir, "beats", "1-top", "beat.mjs"), "utf8")).toBe("const a = 2;\n");
  });

  // The craft's own tools: the no-op guards first landed only in fsTools, and Qwen3.5-9B's map web craft (2026-11-13)
  // was still answered "edited" for identical edits.
  it("should refuse a beat edit that changes nothing", async () => {
    const { writeFile: write, editFile } = beatTools(bases, "1-top");
    await call(write, { content: "const a = 1;\n" });
    await expect(call(editFile, { old_text: "a = 1", new_text: "a = 1" })).rejects.toThrow(/this edit changes nothing/);
  });

  it("should refuse a beat write that changes nothing", async () => {
    const { writeFile: write } = beatTools(bases, "1-top");
    await call(write, { content: "const c = 3;\n" });
    await expect(call(write, { content: "const c = 3;\n" })).rejects.toThrow(/this write changes nothing/);
  });

  it("should ignore a stray path argument and still write beat.mjs", async () => {
    const { writeFile: write } = beatTools(bases, "1-top");
    await call(write, { content: "export default 3;\n", path: { path: { path: {} } } });
    expect(readFileSync(join(bases.storyDir, "beats", "1-top", "beat.mjs"), "utf8")).toBe("export default 3;\n");
  });
});
