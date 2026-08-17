import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { mkdtemp, mkdir, readFile, rm, stat, readdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { slugify, createStory, ensureStoryGuidance } from "../scripts/new-story.mjs";

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
    const { slug, dir } = await createStory({
      storiesRoot: join(root, "stories"),
      title: "Water Wars",
    });
    expect(slug).toBe("water-wars");
    for (const child of ["source", "beats", "export"]) {
      expect((await stat(join(dir, child))).isDirectory()).toBe(true);
    }
    const guidance = await readFile(join(dir, "AGENTS.md"), "utf8");
    expect(guidance).toContain("beats/<outputId>/");
    expect(guidance).toContain("export/<outputId>/DEPLOYMENT.json");
    expect(guidance).toContain("same public embed URL");
    expect(guidance).toContain("stableAcrossRevisions: false");
  });

  it("should make scaffolding mandatory before phase recovery in the orchestration contract", async () => {
    const skill = await readFile(join(import.meta.dirname, "..", "SKILL.md"), "utf8");
    const createStep = skill.indexOf("create_splash_story` exactly once before intake");
    const recoverStep = skill.indexOf("**Recover the phase.**");
    expect(createStep).toBeGreaterThan(-1);
    expect(recoverStep).toBeGreaterThan(createStep);
  });

  it("should keep preflight portable without accepting credentials in chat", async () => {
    const skill = await readFile(join(import.meta.dirname, "..", "SKILL.md"), "utf8");
    expect(skill).toContain("MCP server is the\nportable launch and control bridge");
    expect(skill).toContain("does not publish an embedded MCP Apps resource");
    expect(skill).toContain("bun --no-env-file installer/configure.mjs");
    expect(skill).toContain("Never ask the journalist to paste a credential into chat");
    expect(skill).toContain("one scrolling form with Credentials and Newsroom branding sections");
    expect(skill).toContain("Save setup and continue");
  });

  it("should keep the active hosted beat's renderer on the canonical review target", async () => {
    const beatDir = join(
      import.meta.dirname,
      "..",
      "..",
      "..",
      "stories",
      "heat-pump-adoption-across-europe",
      "beats",
      "1-the-gap-that-persists",
    );
    const renderer = await readFile(join(beatDir, "render-web.mjs"), "utf8");
    expect(renderer).toContain('outDir: join(HERE, "renders")');
    expect(await Bun.file(join(beatDir, "slope.html")).exists()).toBe(false);
    expect(await Bun.file(join(beatDir, "renders", "slope.html")).exists()).toBe(true);
  });

  it("should refuse to overwrite an existing story", async () => {
    const storiesRoot = join(root, "stories");
    await createStory({ storiesRoot, title: "Water Wars" });
    await expect(createStory({ storiesRoot, title: "Water Wars" })).rejects.toThrow(
      "already exists",
    );
  });

  it("should backfill guidance into a pre-feature story without overwriting existing guidance", async () => {
    const storyDir = join(root, "stories", "older-story");
    for (const child of ["source", "beats", "export"]) {
      await mkdir(join(storyDir, child), { recursive: true });
    }
    expect(await ensureStoryGuidance({ storyDir })).toMatchObject({ created: true });
    expect(await readFile(join(storyDir, "AGENTS.md"), "utf8")).toContain("Editor-feedback revisions");
    await writeFile(join(storyDir, "AGENTS.md"), "# Story-specific guidance\n");
    expect(await ensureStoryGuidance({ storyDir })).toMatchObject({ created: false });
    expect(await readFile(join(storyDir, "AGENTS.md"), "utf8")).toBe("# Story-specific guidance\n");
  });

  it("should refuse an empty title", async () => {
    await expect(createStory({ storiesRoot: join(root, "stories"), title: "" })).rejects.toThrow(
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
    await expect(createStory({ storiesRoot: join(root, "stories"), title: "   \t\n  " })).rejects.toThrow(
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
    await expect(createStory({ storiesRoot: join(root, "stories"), title: "!!!???..." })).rejects.toThrow(
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
