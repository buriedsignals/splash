import { describe, it, expect } from "bun:test";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

const ASSETS = join(import.meta.dirname, "..", "assets");

describe("chart-video assets — one seed, no story catalogue", () => {
  it("should register exactly one composition — its seed, and nothing else", async () => {
    const root = await readFile(join(ASSETS, "Root.tsx"), "utf8");
    expect([...root.matchAll(/<Composition/g)]).toHaveLength(1);
    expect(root).toContain('id="co2-suisse"');
  });

  it("should mark its seed with the canon's exact wording", async () => {
    const seed = await readFile(join(ASSETS, "EmissionsVideo.tsx"), "utf8");
    expect(seed).toContain("REPLACE ME. Do not parameterise me.");
  });

  it("should carry sample data", async () => {
    const rows = JSON.parse(
      await readFile(join(ASSETS, "sample-data", "rainfall.json"), "utf8"),
    );
    expect(rows.length).toBeGreaterThanOrEqual(8);
  });

  it("should have a preview.png that is a current render of the seed", async () => {
    const proc = Bun.spawn(["bun", "scripts/render-preview.mjs", "--check"], {
      cwd: join(import.meta.dirname, ".."),
    });
    expect(await proc.exited).toBe(0);
  }, 120_000);
});
