import { describe, it, expect } from "bun:test";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

const ASSETS = join(import.meta.dirname, "..", "assets");

describe("twin-map-beat — one seed per genre, both marked", () => {
  for (const [file, genre] of [
    ["Co2MapStill.tsx", "static"],
    ["Co2MapVideo.tsx", "video"],
  ]) {
    it(`should mark ${file} as the ${genre} genre's seed`, async () => {
      const src = await readFile(join(ASSETS, file), "utf8");
      expect(src).toContain("REPLACE ME. Do not parameterise me.");
      expect(src).toContain(`seeds the ${genre} genre`);
    });
  }

  it("should carry sample data", async () => {
    const rows = JSON.parse(
      await readFile(join(ASSETS, "sample-data", "regions.json"), "utf8"),
    );
    expect(rows.length).toBeGreaterThanOrEqual(4);
  });
});
