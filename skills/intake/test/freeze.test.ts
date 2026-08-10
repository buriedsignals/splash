// twin/skills/intake/test/freeze.test.ts
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
    const articleText = "# Rainfall\n";
    const dataText = "year,rainfall\n2015,912\n2025,604\n";
    await writeFile(articlePath, articleText);
    await writeFile(dataPath, dataText);

    const result = await freezeSource({ storyDir: dir, articlePath, dataPath });

    // The frozen files on disk are the real, byte-for-byte source — not just
    // something that happens to exist at those paths.
    expect(await readFile(join(dir, "source", "article.md"), "utf8")).toBe(
      articleText,
    );
    expect(await readFile(join(dir, "source", "data.csv"), "utf8")).toBe(
      dataText,
    );

    // The returned {article, data, profile} is the same record that was frozen,
    // not a coincidentally-shaped stand-in.
    expect(result.article).toBe(articleText);
    expect(result.data).toBe(dataText);
    expect(result.profile.rowCount).toBe(2);

    // profile.json on disk is the genuine computed profile, not an empty
    // placeholder or a stale/partial write.
    const written = JSON.parse(
      await readFile(join(dir, "source", "profile.json"), "utf8"),
    );
    expect(written).toEqual(result.profile);
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
