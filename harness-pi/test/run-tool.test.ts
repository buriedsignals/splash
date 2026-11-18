import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { createRunRoot, stageStory } from "../src/run-root.ts";
import type { Bases } from "../src/tools/fs.ts";
import { quoteSpacedKeys, runTools , refusalHint, closeOpenExport, trimDuplicatedTail, trimStrayTail } from "../src/tools/run.ts";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";

const CHECKOUT = resolve(import.meta.dirname, "../..");
let bases: Bases;
let parent: string;
// Each run root holds a ~380 MB node_modules: left in tmpdir, every `bun test` leaked one.
afterAll(() => rm(parent, { recursive: true, force: true }));
const call = (tool: { execute: Function }, params: object) =>
  tool.execute("t1", params, undefined, undefined, undefined);
const textOf = (r: { content: { text?: string }[] }) =>
  r.content.map((c) => c.text ?? "").join("\n");

beforeAll(async () => {
  parent = await mkdtemp(join(tmpdir(), "splash-runtool-"));
  const root = await createRunRoot({
    checkout: CHECKOUT,
    dir: join(parent, "root"),
  });
  const { storyDir } = await stageStory({
    root,
    checkout: CHECKOUT,
    slug: "stress-z-budget-parts",
  });
  bases = { root, storyDir };
}, 180_000);

describe("run tools", () => {
  it("should surface the scaffold's own refusal as a failed tool result", async () => {
    const r = await call(runTools(bases).scaffoldStatic, {
      type: "diverging-bar",
      beat: "1-test",
      component: "BudgetBars",
    });
    expect(r.isError).toBe(true);
    expect(textOf(r)).toMatch(/data\.csv: this beat's own frozen data/);
  });

  it("should pass the scaffold's refusal of an unknown chart type through", async () => {
    const r = await call(runTools(bases).scaffoldStatic, {
      type: "bar",
      beat: "1-test",
      component: "BudgetBars",
    });
    expect(textOf(r)).toMatch(
      /has no sheet at skills\/chart-beat\/references\/types\/bar\.md/,
    );
  });

  it("should refuse a beat name that could leave the story before running anything", async () => {
    await expect(
      call(runTools(bases).scaffoldStatic, {
        type: "line",
        beat: "../../escape",
        component: "X",
      }),
    ).rejects.toThrow(/beat "\.\.\/\.\.\/escape" is not under this story's beats/);
  });

  it("should refuse to verify a page that was never rendered, so it cannot pass on the seed", async () => {
    await expect(
      call(runTools(bases).verifyWeb, { beat: "1-test", page: "still" }),
    ).rejects.toThrow(/renders\/still\.html does not exist/);
  });

  it("should run a script from the Splash root and return its output", async () => {
    const r = await call(runTools(bases).runScript, {
      code: "console.log(process.cwd())",
    });
    expect(r.isError).toBe(false);
    expect(textOf(r)).toContain(bases.root.split("/").pop()!);
  });
});

describe("refusal hints", () => {
  it("should say where shorter forms go when a copy-fit refusal asks for them", () => {
    expect(refusalHint("REFUSED — the panel's copy does not fit its column. Give the beat shorter forms — do not shrink the map")).toMatch(
      /after the first one, to limits and reading first.*title's first form stays the journalist's takeaway/i,
    );
  });

  it("should tell the model to rewrite beat.mjs whole when an edit left a name declared twice", () => {
    expect(refusalHint('REFUSED — "whole" has already been declared')).toMatch(/declares "whole" twice.*write_file/);
  });

  // stress-t web map (Osaurus, 2026-11-11): the refusal said "a label too long, two marks answering the same"; the
  // failures were the phone frame's height, and the 12B edited the reading line eleven times.
  it("should send a phone overflow to a shorter limits form, not to the labels", () => {
    expect(
      refusalHint(
        "  - phone 375x812: no vertical scroll inside the visual  — document 851px in a 812px window (overflow 39px)\nREFUSED — the page rendered but the chart-web verification failed (2)",
      ),
    ).toMatch(/phone.*39px.*limits.*shorter form.*title's first form stays/i);
  });

  it("should add nothing to a refusal that does not ask for shorter forms", () => {
    expect(refusalHint("error: these country names match no country on the map")).toBe("");
  });
});

describe("report", () => {
  it("should say how many stderr chars the model does not see, and where they are kept", async () => {
    const { report, CHILD_LOG } = await import("../src/tools/run.ts");
    const r = report(["bun", "x"], { exitCode: 1, stdout: "", stderr: "e".repeat(5_000) });
    expect(r.content[0].text).toContain(`[1000 earlier chars dropped; full output in ${CHILD_LOG}]`);
  });
});

// gx-bullet web (12B, 2026-11-13): beat.mjs ended "};" then a line holding one backtick. Told to delete it, the 12B
// edited template strings elsewhere through three passes, and a whole rewrite was refused for an existing file.
// A lone quote line after the closing "};" is never code: the harness removes it before rendering.
describe("a stray quote after the end of beat.mjs", () => {
  it("should be removed, and said", () => {
    const dir = mkdtempSync(join(tmpdir(), "splash-stray-"));
    writeFileSync(join(dir, "beat.mjs"), "export default {\n  title: `t`,\n};\n`\n");
    expect(trimStrayTail(join(dir, "beat.mjs"))).toMatch(/removed line 4/);
    expect(readFileSync(join(dir, "beat.mjs"), "utf8")).toBe("export default {\n  title: `t`,\n};\n");
  });

  // gx-proportional-symbol web (12B, 2026-11-14): the file ended "};" then "`,"; six refused passes on line 121.
  it("should remove a stray quote followed by a comma", () => {
    const dir = mkdtempSync(join(tmpdir(), "splash-stray-"));
    writeFileSync(join(dir, "beat.mjs"), "export default {\n  title: `t`,\n};\n`,\n");
    expect(trimStrayTail(join(dir, "beat.mjs"))).toMatch(/removed line 4/);
    expect(readFileSync(join(dir, "beat.mjs"), "utf8")).toBe("export default {\n  title: `t`,\n};\n");
  });

  it("should leave a beat whose last line is code", () => {
    const dir = mkdtempSync(join(tmpdir(), "splash-stray-"));
    writeFileSync(join(dir, "beat.mjs"), "export default {\n  title: `t\n`,\n};\n");
    expect(trimStrayTail(join(dir, "beat.mjs"))).toBe("");
  });
});

// gx-proportional-symbol web (Qwen3.5-9B, 2026-11-14): `Czech Republic: "Tchéquie"` in a names map. Told the exact
// quoted key six times, Qwen rewrote the whole file with the same line each time and the cell never rendered.
// Quoting a key is meaning-preserving: the harness does it before rendering, and says so.
describe("an unquoted key with a space in beat.mjs", () => {
  const src = 'const NAMES = {\n  Cyprus: "Chypre", Czech Republic: "Tchéquie",\n  North Macedonia: "Macédoine",\n};\nexport default { title: "Czech Republic: a, b", NAMES };\n';
  it("should be quoted, every one, and said", () => {
    const dir = mkdtempSync(join(tmpdir(), "splash-key-"));
    writeFileSync(join(dir, "beat.mjs"), src);
    expect(quoteSpacedKeys(join(dir, "beat.mjs"))).toMatch(/quoted the keys "Czech Republic", "North Macedonia"/);
    expect(readFileSync(join(dir, "beat.mjs"), "utf8")).toBe(src.replace("Czech Republic:", '"Czech Republic":').replace("North Macedonia:", '"North Macedonia":'));
  });

  it("should leave a beat that parses", () => {
    const dir = mkdtempSync(join(tmpdir(), "splash-key-"));
    writeFileSync(join(dir, "beat.mjs"), 'export default { title: "Czech Republic: a, b" };\n');
    expect(quoteSpacedKeys(join(dir, "beat.mjs"))).toBe("");
  });
});

// gx-connected-scatter web (12B, mvg8, 2026-11-18): an edit_file rewrote check()'s tail and left the old tail after
// its closing "},". The file stopped parsing ("Expected identifier but found "!""), and the 12B spent the rest of
// its 30 minutes editing around it. A block that repeats the lines before the "}," it follows, and whose removal is
// what makes the file parse, is never meant: the harness removes it before rendering.
describe("a stale copy of a method's tail after its closing brace", () => {
  const head = "export default {\n  check() {\n    const a = 1;\n    if (a > 2) throw new Error(\"x\");\n    if (a < 0) throw new Error(\"y\");\n  },\n";
  const stale = "\n    if (!(a > 2)) throw new Error(\"x\");\n    if (a < 0) throw new Error(\"y\");\n  },\n";
  it("should be removed, and said", () => {
    const dir = mkdtempSync(join(tmpdir(), "splash-dup-"));
    writeFileSync(join(dir, "beat.mjs"), `${head}${stale}};\n`);
    expect(trimDuplicatedTail(join(dir, "beat.mjs"))).toMatch(/removed lines 7.10/);
    expect(readFileSync(join(dir, "beat.mjs"), "utf8")).toBe(`${head}};\n`);
  });
  it("should leave a beat that parses", () => {
    const dir = mkdtempSync(join(tmpdir(), "splash-dup-"));
    writeFileSync(join(dir, "beat.mjs"), `${head}};\n`);
    expect(trimDuplicatedTail(join(dir, "beat.mjs"))).toBe("");
  });
  it("should leave a broken beat whose removal would not make it parse", () => {
    const dir = mkdtempSync(join(tmpdir(), "splash-dup-"));
    const src = `${head}${stale}  title: \`t,\n};\n`;
    writeFileSync(join(dir, "beat.mjs"), src);
    expect(trimDuplicatedTail(join(dir, "beat.mjs"))).toBe("");
    expect(readFileSync(join(dir, "beat.mjs"), "utf8")).toBe(src);
  });
});

// gx-connected-scatter web (12B, mvg9, 2026-11-18): each edit of check() left the file ending on its "}," with the
// object's closing "};" gone ("Expected identifier but found end of file"), refused twice in a row. A file that
// parses once the object is closed lost only that line: the harness restores it before rendering.
describe("an export object whose closing brace is gone", () => {
  it("should be closed, and said", () => {
    const dir = mkdtempSync(join(tmpdir(), "splash-close-"));
    writeFileSync(join(dir, "beat.mjs"), "export default {\n  check() {\n    return 1;\n  },");
    expect(closeOpenExport(join(dir, "beat.mjs"))).toMatch(/added "};"/);
    expect(readFileSync(join(dir, "beat.mjs"), "utf8")).toBe("export default {\n  check() {\n    return 1;\n  },\n};\n");
  });
  it("should leave a beat that parses", () => {
    const dir = mkdtempSync(join(tmpdir(), "splash-close-"));
    writeFileSync(join(dir, "beat.mjs"), "export default {\n  title: 1,\n};\n");
    expect(closeOpenExport(join(dir, "beat.mjs"))).toBe("");
  });
  it("should leave a broken beat that closing would not fix", () => {
    const dir = mkdtempSync(join(tmpdir(), "splash-close-"));
    const src = "export default {\n  check() {\n    if (a) {\n  },";
    writeFileSync(join(dir, "beat.mjs"), src);
    expect(closeOpenExport(join(dir, "beat.mjs"))).toBe("");
    expect(readFileSync(join(dir, "beat.mjs"), "utf8")).toBe(src);
  });
});

describe("refusalHint on a recorded staging", () => {
  // Qwen3.5-9B's tile cartogram (2026-11-15): gestures.json held "Russie, 12 %"; it fixed beat.mjs's gestures three
  // times, which the kit never reads once a record exists, and the craft step stopped on the same refusal.
  const refused = "REFUSED — gestures[0].note: states 12, which nothing this name draws comes near (36): drop the note";
  it("should point a gesture refusal at record_gestures when the staging is recorded", () => {
    expect(refusalHint(refused, "beats/1/gestures.json")).toMatch(/beats\/1\/gestures\.json.*record_gestures/);
  });
  it("should say nothing of a record when there is none", () => {
    expect(refusalHint(refused)).not.toMatch(/record_gestures/);
  });
});

describe("beatDir on a file path", () => {
  // Qwen3.5-9B called render_beat with "beats/1/beat.mjs" (tile cartogram, 2026-11-15), was refused with a folder
  // name it did not have, and spent seven turns listing and re-reading before rendering beat "1".
  const bases = { storyDir: "/story" } as unknown as Bases;
  it("should name the beat folder when given a file inside it", async () => {
    const { beatDir } = await import("../src/tools/run.ts");
    expect(beatDir(bases, "beats/1/beat.mjs")).toBe(join("/story", "beats", "1"));
  });
  it("should still refuse a path outside beats/", async () => {
    const { beatDir } = await import("../src/tools/run.ts");
    expect(() => beatDir(bases, "source/data.csv")).toThrow(/not under this story's beats/);
  });
});
