import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { mkdtemp, mkdir, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { whereIs } from "../scripts/where.mjs";

let dir: string;
beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), "story-"));
  for (const child of ["source", "beats", "export"])
    await mkdir(join(dir, child), { recursive: true });
});
afterEach(async () => {
  await rm(dir, { recursive: true, force: true });
});

const storyboard = `---
takeaway: "Rainfall fell by a third in ten years."
slots:
  - id: 1
    chosen: trajectory
---
`;

describe("whereIs", () => {
  it("should report intake when the source is empty", async () => {
    const state = await whereIs(dir);
    expect(state.phase).toBe("intake");
    expect(state.missing).toContain("source/article.md");
    expect(state.missing).toContain("source/profile.json");
  });

  it("should report intake with only article.md missing", async () => {
    await writeFile(join(dir, "source", "profile.json"), "{}");
    const state = await whereIs(dir);
    expect(state.phase).toBe("intake");
    expect(state.missing).toContain("source/article.md");
    expect(state.missing).not.toContain("source/profile.json");
  });

  it("should report intake with only profile.json missing", async () => {
    await writeFile(join(dir, "source", "article.md"), "text");
    const state = await whereIs(dir);
    expect(state.phase).toBe("intake");
    expect(state.missing).toContain("source/profile.json");
    expect(state.missing).not.toContain("source/article.md");
  });

  it("should report framing once the source is frozen but no storyboard exists", async () => {
    await writeFile(join(dir, "source", "article.md"), "text");
    await writeFile(join(dir, "source", "profile.json"), "{}");
    const state = await whereIs(dir);
    expect(state.phase).toBe("framing");
    expect(state.missing).toContain("STORYBOARD.md");
  });

  it("should report production once the storyboard carries a takeaway", async () => {
    await writeFile(join(dir, "source", "article.md"), "text");
    await writeFile(join(dir, "source", "profile.json"), "{}");
    await writeFile(join(dir, "STORYBOARD.md"), storyboard);
    const state = await whereIs(dir);
    expect(state.phase).toBe("production");
  });

  it("should stay in storyboard when STORYBOARD.md exists but has no takeaway", async () => {
    await writeFile(join(dir, "source", "article.md"), "text");
    await writeFile(join(dir, "source", "profile.json"), "{}");
    await writeFile(join(dir, "STORYBOARD.md"), "---\nslots: []\n---\n");
    const state = await whereIs(dir);
    expect(state.phase).toBe("storyboard");
    expect(state.missing).toContain("a confirmed takeaway");
  });

  it("should stay in storyboard when takeaway is an empty string", async () => {
    await writeFile(join(dir, "source", "article.md"), "text");
    await writeFile(join(dir, "source", "profile.json"), "{}");
    await writeFile(
      join(dir, "STORYBOARD.md"),
      `---\ntakeaway: ""\nslots: []\n---\n`,
    );
    const state = await whereIs(dir);
    expect(state.phase).toBe("storyboard");
    expect(state.missing).toContain("a confirmed takeaway");
  });

  it("should stay in storyboard when takeaway is YAML null", async () => {
    await writeFile(join(dir, "source", "article.md"), "text");
    await writeFile(join(dir, "source", "profile.json"), "{}");
    await writeFile(
      join(dir, "STORYBOARD.md"),
      `---\ntakeaway: null\nslots: []\n---\n`,
    );
    const state = await whereIs(dir);
    expect(state.phase).toBe("storyboard");
    expect(state.missing).toContain("a confirmed takeaway");
  });

  it("should stay in storyboard when takeaway is YAML tilde null", async () => {
    await writeFile(join(dir, "source", "article.md"), "text");
    await writeFile(join(dir, "source", "profile.json"), "{}");
    await writeFile(
      join(dir, "STORYBOARD.md"),
      `---\ntakeaway: ~\nslots: []\n---\n`,
    );
    const state = await whereIs(dir);
    expect(state.phase).toBe("storyboard");
    expect(state.missing).toContain("a confirmed takeaway");
  });

  it("should stay in storyboard when takeaway is only whitespace", async () => {
    await writeFile(join(dir, "source", "article.md"), "text");
    await writeFile(join(dir, "source", "profile.json"), "{}");
    await writeFile(
      join(dir, "STORYBOARD.md"),
      `---\ntakeaway:   \nslots: []\n---\n`,
    );
    const state = await whereIs(dir);
    expect(state.phase).toBe("storyboard");
    expect(state.missing).toContain("a confirmed takeaway");
  });

  it("should stay in storyboard when takeaway: appears in prose below frontmatter", async () => {
    await writeFile(join(dir, "source", "article.md"), "text");
    await writeFile(join(dir, "source", "profile.json"), "{}");
    await writeFile(
      join(dir, "STORYBOARD.md"),
      `---\nslots: []\n---\nThis takeaway: is in prose, not frontmatter.\n`,
    );
    const state = await whereIs(dir);
    expect(state.phase).toBe("storyboard");
    expect(state.missing).toContain("a confirmed takeaway");
  });

  it("should report delivery once a beat has a render", async () => {
    await writeFile(join(dir, "source", "article.md"), "text");
    await writeFile(join(dir, "source", "profile.json"), "{}");
    await writeFile(join(dir, "STORYBOARD.md"), storyboard);
    await mkdir(join(dir, "beats", "1-rainfall", "renders"), {
      recursive: true,
    });
    await writeFile(join(dir, "beats", "1-rainfall", "BRIEF.md"), "brief");
    await writeFile(
      join(dir, "beats", "1-rainfall", "renders", "still.png"),
      "x",
    );
    expect((await whereIs(dir)).phase).toBe("delivery");
  });

  it("should report done once the export holds a file and a render exists", async () => {
    await writeFile(join(dir, "source", "article.md"), "text");
    await writeFile(join(dir, "source", "profile.json"), "{}");
    await writeFile(join(dir, "STORYBOARD.md"), storyboard);
    await mkdir(join(dir, "beats", "1-rainfall", "renders"), {
      recursive: true,
    });
    await writeFile(join(dir, "beats", "1-rainfall", "BRIEF.md"), "brief");
    await writeFile(
      join(dir, "beats", "1-rainfall", "renders", "still.png"),
      "x",
    );
    await writeFile(join(dir, "export", "rainfall.png"), "x");
    expect((await whereIs(dir)).phase).toBe("done");
  });

  it("should report inconsistency when export holds a file but no render exists", async () => {
    await writeFile(join(dir, "source", "article.md"), "text");
    await writeFile(join(dir, "source", "profile.json"), "{}");
    await writeFile(join(dir, "STORYBOARD.md"), storyboard);
    await writeFile(join(dir, "export", "rainfall.png"), "x");
    const state = await whereIs(dir);
    expect(state.phase).toBe("production");
    expect(state.missing).toContain("no renders exist in any beat");
  });
});
