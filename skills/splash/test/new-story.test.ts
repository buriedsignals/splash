import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import {
  mkdtemp,
  mkdir,
  readFile,
  rm,
  stat,
  readdir,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  slugify,
  createStory,
  ensureStoryGuidance,
} from "../scripts/new-story.mjs";

let root: string;
beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), "splash-root-"));
  // A Splash root is the thing `#shared/*` resolves through, and `createStory` now refuses one
  // that is not. These two are the whole of that: the mapping, and what it maps to.
  await writeFile(
    join(root, "package.json"),
    `${JSON.stringify({ name: "splash-root", private: true, type: "module", imports: { "#shared/*": "./shared/*" } }, null, 2)}\n`,
  );
  await mkdir(join(root, "shared"), { recursive: true });
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
    const guidance = await readFile(join(dir, "AGENTS.md"), "utf8");
    expect(guidance).toContain("beats/<outputId>/");
    expect(guidance).toContain("export/<outputId>/DEPLOYMENT.json");
    expect(guidance).toContain("same public embed URL");
    expect(guidance).toContain("stableAcrossRevisions: false");
  });

  it("should make scaffolding mandatory before phase recovery in the orchestration contract", async () => {
    const skill = await readFile(
      join(import.meta.dirname, "..", "SKILL.md"),
      "utf8",
    );
    // The spine rewrite moved the two steps into one When-to-use bullet; the guard keeps pinning
    // their order — scaffolding is documented before phase recovery.
    const createStep = skill.indexOf(
      "`createStory({root, title})` first create",
    );
    const recoverStep = skill.indexOf("then call `whereIs` for the first time");
    expect(createStep).toBeGreaterThan(-1);
    expect(recoverStep).toBeGreaterThan(createStep);
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
    expect(
      await Bun.file(join(beatDir, "renders", "slope.html")).exists(),
    ).toBe(true);
  });

  it("should refuse to overwrite an existing story", async () => {
    await createStory({ root, title: "Water Wars" });
    await expect(createStory({ root, title: "Water Wars" })).rejects.toThrow(
      "already exists",
    );
  });

  it("should backfill guidance into a pre-feature story without overwriting existing guidance", async () => {
    const storyDir = join(root, "stories", "older-story");
    for (const child of ["source", "beats", "export"]) {
      await mkdir(join(storyDir, child), { recursive: true });
    }
    expect(await ensureStoryGuidance({ storyDir })).toMatchObject({
      created: true,
    });
    expect(await readFile(join(storyDir, "AGENTS.md"), "utf8")).toContain(
      "Editor-feedback revisions",
    );
    await writeFile(join(storyDir, "AGENTS.md"), "# Story-specific guidance\n");
    expect(await ensureStoryGuidance({ storyDir })).toMatchObject({
      created: false,
    });
    expect(await readFile(join(storyDir, "AGENTS.md"), "utf8")).toBe(
      "# Story-specific guidance\n",
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

/**
 * A ROOT THAT CANNOT RENDER IS NOT A ROOT.
 *
 * On 2026-09-22 a story was created in a directory carrying no `package.json` and no `shared/`,
 * and `whereIs` walked it through intake, framing and storyboard and into production without a
 * word. The first thing to notice would have been an unresolved `#shared/...` import, in a stack
 * trace, several gates later. `readPalette` already sets the standard this follows: refuse where
 * the refusal is cheap, and name what is missing.
 */
describe("the root a story is created in", () => {
  it("refuses a root that carries no render substrate, naming what is missing", async () => {
    const bare = await mkdtemp(join(tmpdir(), "splash-bare-"));
    try {
      await expect(
        createStory({ root: bare, title: "Anything At All" }),
      ).rejects.toThrow(/package\.json/);
      // A refusal that has already made directories is one the journalist has to clean up.
      await expect(stat(join(bare, "stories"))).rejects.toThrow();
    } finally {
      await rm(bare, { recursive: true, force: true });
    }
  });
});
