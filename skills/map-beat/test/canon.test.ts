import { describe, it, expect } from "bun:test";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

const ASSETS = join(import.meta.dirname, "..", "assets");

describe("map-beat assets — the canon's shape, not a story's", () => {
  it("should carry seeds marked with the canon's exact wording", async () => {
    const still = await readFile(join(ASSETS, "Co2MapStill.tsx"), "utf8");
    expect(still).toContain("REPLACE ME. Do not parameterise me.");

    const video = await readFile(join(ASSETS, "Co2MapVideo.tsx"), "utf8");
    expect(video).toContain("REPLACE ME. Do not parameterise me.");
  });

  it("should carry sample data both formats can render on their own", async () => {
    const raw = await readFile(
      join(ASSETS, "sample-data", "regions.json"),
      "utf8",
    );
    const rows = JSON.parse(raw);
    expect(Array.isArray(rows)).toBe(true);
    expect(rows.length).toBeGreaterThanOrEqual(8);
    for (const r of rows) {
      expect(typeof r.key).toBe("string");
      expect(typeof r.value).toBe("number");
    }
  });

  it("should not carry another story's own copy", async () => {
    const still = await readFile(join(ASSETS, "Co2MapStill.tsx"), "utf8");
    const video = await readFile(join(ASSETS, "Co2MapVideo.tsx"), "utf8");
    // Distinctive phrases from the CO2 beat, if it were a story-specific copy
    for (const leak of ["CHE", "Switzerland", "suisse"]) {
      expect(still).not.toContain(leak);
      expect(video).not.toContain(leak);
    }
  });

  it("should have a preview.png that is a current render of the seed", async () => {
    const proc = Bun.spawn(["bun", "scripts/render-preview.mjs", "--check"], {
      cwd: join(import.meta.dirname, ".."),
    });
    expect(await proc.exited).toBe(0);
  });
});
