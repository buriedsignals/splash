// twin/skills/twin-intake/test/freeze.test.ts
import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { mkdtemp, mkdir, writeFile, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { freezeSource } from "../scripts/freeze.mjs";

let dir: string;
beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), "story-"));
  await mkdir(join(dir, "source"), { recursive: true });
});
afterEach(async () => {
  await rm(dir, { recursive: true, force: true });
});

describe("freezeSource", () => {
  it("should copy the article and the data into source/ and write a profile", async () => {
    const articlePath = join(dir, "draft.md");
    const dataPath = join(dir, "rainfall.csv");
    await writeFile(articlePath, "# Rainfall\n");
    await writeFile(dataPath, "year,rainfall\n2015,912\n2025,604\n");

    const result = await freezeSource({ storyDir: dir, articlePath, dataPath });

    expect(await readFile(join(dir, "source", "article.md"), "utf8")).toBe(
      "# Rainfall\n",
    );
    expect(result.profile.rowCount).toBe(2);
    const written = JSON.parse(
      await readFile(join(dir, "source", "profile.json"), "utf8"),
    );
    expect(written.columns).toHaveLength(2);
  });

  it("should refuse to freeze twice, so the frozen source stays frozen", async () => {
    const articlePath = join(dir, "draft.md");
    const dataPath = join(dir, "rainfall.csv");
    await writeFile(articlePath, "# Rainfall\n");
    await writeFile(dataPath, "year,rainfall\n2015,912\n");
    await freezeSource({ storyDir: dir, articlePath, dataPath });
    await expect(
      freezeSource({ storyDir: dir, articlePath, dataPath }),
    ).rejects.toThrow("already frozen");
  });
});
