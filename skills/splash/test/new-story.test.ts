import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { mkdtemp, rm, stat, readdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { slugify, createStory } from "../scripts/new-story.mjs";

let root: string;
beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), "splash-root-"));
});
afterEach(async () => {
  await rm(root, { recursive: true, force: true });
});

describe("slugify", () => {
  it("should lowercase, strip accents and join with hyphens", () => {
    expect(slugify("Annemasse, capitale du n'importe quoi")).toBe(
      "annemasse-capitale-du-n-importe-quoi",
    );
  });
  it("should collapse repeated separators and trim them", () => {
    expect(slugify("  --Water   Wars--  ")).toBe("water-wars");
  });
});

describe("createStory", () => {
  it("should create the whole workspace shape", async () => {
    const { slug, dir } = await createStory({ root, title: "Water Wars" });
    expect(slug).toBe("water-wars");
    for (const child of ["source", "beats", "export"]) {
      expect((await stat(join(dir, child))).isDirectory()).toBe(true);
    }
  });

  it("should refuse to overwrite an existing story", async () => {
    await createStory({ root, title: "Water Wars" });
    await expect(createStory({ root, title: "Water Wars" })).rejects.toThrow(
      "already exists",
    );
  });

  it("should refuse an empty title", async () => {
    await expect(createStory({ root, title: "" })).rejects.toThrow(
      "title carries no usable content",
    );
    const storiesDir = join(root, "stories");
    try {
      const contents = await readdir(storiesDir);
      expect(contents).not.toContain("source");
      expect(contents).not.toContain("beats");
      expect(contents).not.toContain("export");
    } catch {
      // stories dir doesn't exist, which is fine
    }
  });

  it("should refuse a whitespace-only title", async () => {
    await expect(createStory({ root, title: "   \t\n  " })).rejects.toThrow(
      "title carries no usable content",
    );
    const storiesDir = join(root, "stories");
    try {
      const contents = await readdir(storiesDir);
      expect(contents).not.toContain("source");
      expect(contents).not.toContain("beats");
      expect(contents).not.toContain("export");
    } catch {
      // stories dir doesn't exist, which is fine
    }
  });

  it("should refuse a punctuation-only title", async () => {
    await expect(createStory({ root, title: "!!!???..." })).rejects.toThrow(
      "title carries no usable content",
    );
    const storiesDir = join(root, "stories");
    try {
      const contents = await readdir(storiesDir);
      expect(contents).not.toContain("source");
      expect(contents).not.toContain("beats");
      expect(contents).not.toContain("export");
    } catch {
      // stories dir doesn't exist, which is fine
    }
  });
});
