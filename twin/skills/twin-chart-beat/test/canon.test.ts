import { describe, it, expect } from "bun:test";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

const ASSETS = join(import.meta.dirname, "..", "assets");

describe("twin-chart-beat — the canon's assets", () => {
  it("should carry a seed marked with the canon's exact wording", async () => {
    const seed = await readFile(join(ASSETS, "ChartSeed.tsx"), "utf8");
    expect(seed).toContain("REPLACE ME. Do not parameterise me.");
  });

  it("should carry sample data the seed can render on its own", async () => {
    const raw = await readFile(
      join(ASSETS, "sample-data", "rainfall.json"),
      "utf8",
    );
    const rows = JSON.parse(raw);
    expect(Array.isArray(rows)).toBe(true);
    expect(rows.length).toBeGreaterThanOrEqual(8);
    for (const r of rows) {
      expect(typeof r.year).toBe("number");
      expect(r.value === null || typeof r.value === "number").toBe(true);
    }
  });

  it("should not carry another story's own copy", async () => {
    const seed = await readFile(join(ASSETS, "ChartSeed.tsx"), "utf8");
    // Distinctive phrases from other stories' beats, not from this seed
    for (const leak of ["Annemasse", "MeteoSwiss", "31 May 2026"]) {
      expect(seed).not.toContain(leak);
    }
  });

  it("should have a preview.png that is a current render of the seed", async () => {
    const proc = Bun.spawn(["bun", "scripts/render-preview.mjs", "--check"], {
      cwd: join(import.meta.dirname, ".."),
    });
    expect(await proc.exited).toBe(0);
  });
});
