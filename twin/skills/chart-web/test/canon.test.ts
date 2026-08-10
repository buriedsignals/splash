import { describe, it, expect } from "bun:test";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

const ASSETS = join(import.meta.dirname, "..", "assets");

describe("chart-web assets — the canon's shape, not a story's", () => {
  it("should not carry the CO2 story's component", () => {
    expect(existsSync(join(ASSETS, "EmissionsWeb.tsx"))).toBe(false);
  });
});

describe("chart-web — the canon's assets", () => {
  it("should carry a seed marked with the canon's exact wording", async () => {
    const seed = await readFile(join(ASSETS, "ChartWebSeed.tsx"), "utf8");
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
      expect(typeof r.value).toBe("number");
    }
  });

  it("should not carry the CO2 story's own copy", async () => {
    const seed = await readFile(join(ASSETS, "ChartWebSeed.tsx"), "utf8");
    // Whole words and distinctive phrases only. A bare "CO" substring would match the word
    // CONFIG, which this seed is REQUIRED to contain — a leak test that fails on its own
    // mandate is a broken test, not a strict one.
    for (const leak of [
      "Suisse",
      "CO₂",
      "Niveau de 1967",
      "pic de 1973",
      "Global Carbon Budget",
    ]) {
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
