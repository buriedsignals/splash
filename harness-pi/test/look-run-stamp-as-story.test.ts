import { describe, expect, it } from "bun:test";
import { mkdirSync, mkdtempSync, realpathSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { Bases } from "../src/tools/fs.ts";
import { lookTool } from "../src/tools/look.ts";

// gx-slope-slopegraph video (12B, mvg80, 2026-11-18): the render printed the still's absolute path under
// <run>/stories/<slug>/; the model asked for it as stories/<run>/stories/<slug>/beats/1/look/… — the run's name taken
// for a story's — three times, and the craft stopped on "same failure 3x" with the beat never approved.
const PNG = Buffer.from("89504e470d0a1a0a0000000d49484452", "hex");
const run = realpathSync(mkdtempSync(join(tmpdir(), "splash-look-run-")));
const slug = "gx-slope-slopegraph";
const storyDir = join(run, "stories", slug);
mkdirSync(join(storyDir, "beats", "1", "look"), { recursive: true });
writeFileSync(join(storyDir, "beats", "1", "look", "final.png"), PNG);
const bases = { root: run, storyDir } as Bases;
const asked = join(
  "stories",
  run.split("/").pop() as string,
  "stories",
  slug,
  "beats",
  "1",
  "look",
  "final.png",
);

describe("look at a still asked for through the run's name taken as a story", () => {
  it("should show the story's own still", async () => {
    const result = await lookTool(bases).execute(
      "a",
      { path: asked },
      undefined,
      undefined,
      undefined as never,
    );
    expect(result.content.map((c: { type: string }) => c.type)).toContain(
      "image",
    );
  });

  it("should still refuse a still outside the story", async () => {
    mkdirSync(join(run, "elsewhere"), { recursive: true });
    writeFileSync(join(run, "elsewhere", "x.png"), PNG);
    await expect(
      lookTool(bases).execute(
        "b",
        { path: "/etc/x.png" },
        undefined,
        undefined,
        undefined as never,
      ),
    ).rejects.toThrow();
  });
});
