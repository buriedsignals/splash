import { describe, expect, it, beforeAll } from "bun:test";
import { existsSync, lstatSync } from "node:fs";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { createRunRoot, stageStory } from "../src/run-root.ts";
import { whereIs } from "../../skills/splash/scripts/where.mjs";
import { checkDependencies } from "../../skills/splash/scripts/preflight.mjs";

const CHECKOUT = resolve(import.meta.dirname, "../..");

describe("run root", () => {
  let root: string;

  beforeAll(async () => {
    const parent = await mkdtemp(join(tmpdir(), "splash-run-"));
    root = await createRunRoot({
      checkout: CHECKOUT,
      dir: join(parent, "root"),
    });
  }, 120_000);

  it("should pass the Splash dependency check once created", async () => {
    const report = await checkDependencies(root);
    expect(report.status).toBe("pass");
  });

  it("should link skills and proof from the checkout instead of copying them", () => {
    expect(lstatSync(join(root, "skills")).isSymbolicLink()).toBe(true);
    expect(lstatSync(join(root, "proof")).isSymbolicLink()).toBe(true);
  });

  it("should stage a story from its sources so that it resolves to framing", async () => {
    const { storyDir } = await stageStory({
      root,
      checkout: CHECKOUT,
      slug: "stress-z-budget-parts",
    });
    const state = await whereIs(storyDir);
    expect(state.phase).toBe("framing");
  });

  it("should not carry the repository story's storyboard into the staged story", async () => {
    const storyDir = join(root, "stories", "stress-z-budget-parts");
    expect(existsSync(join(storyDir, "STORYBOARD.md"))).toBe(false);
  });

  it("should refuse a story with no data.csv, naming the missing file", async () => {
    await expect(
      stageStory({
        root,
        checkout: CHECKOUT,
        slug: "stress-h-site-photographs",
      }),
    ).rejects.toThrow(/data\.csv/);
  });

  it("should refuse a run root inside the repository checkout", async () => {
    await expect(
      createRunRoot({
        checkout: CHECKOUT,
        dir: join(CHECKOUT, "tmp-run-root"),
      }),
    ).rejects.toThrow(/inside the checkout/);
  });
});
