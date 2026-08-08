import { describe, it, expect } from "bun:test";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

const ASSETS = join(import.meta.dirname, "..", "assets");

describe("twin-chart-video assets — one seed, no story catalogue", () => {
  it("should not carry the life-expectancy story", () => {
    expect(existsSync(join(ASSETS, "LifeExpectancyVideo.tsx"))).toBe(false);
    expect(existsSync(join(ASSETS, "life-expectancy-timing.ts"))).toBe(false);
  });

  it("should no longer register the life-expectancy composition", async () => {
    const root = await readFile(join(ASSETS, "Root.tsx"), "utf8");
    expect(root).not.toContain("life-expectancy");
    expect(root).not.toContain("LIFE_EXPECTANCY");
  });
});
