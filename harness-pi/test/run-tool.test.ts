import { beforeAll, describe, expect, it } from "bun:test";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { createRunRoot, stageStory } from "../src/run-root.ts";
import type { Bases } from "../src/tools/fs.ts";
import { runTools } from "../src/tools/run.ts";

const CHECKOUT = resolve(import.meta.dirname, "../..");
let bases: Bases;
const call = (tool: { execute: Function }, params: object) =>
  tool.execute("t1", params, undefined, undefined, undefined);
const textOf = (r: { content: { text?: string }[] }) =>
  r.content.map((c) => c.text ?? "").join("\n");

beforeAll(async () => {
  const parent = await mkdtemp(join(tmpdir(), "splash-runtool-"));
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
