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

  it("should not carry the migration story", () => {
    expect(existsSync(join(ASSETS, "MigrationVideo.tsx"))).toBe(false);
    expect(existsSync(join(ASSETS, "migration-timing.ts"))).toBe(false);
  });

  // Both extra stories have now left, so the count assertion becomes true here — this is the task
  // that earns it. Task 4 deliberately does not make this claim, because `migration` was still
  // registered at its commit.
  it("should register exactly one composition — its seed, and nothing else", async () => {
    const root = await readFile(join(ASSETS, "Root.tsx"), "utf8");
    expect([...root.matchAll(/<Composition/g)]).toHaveLength(1);
    expect(root).toContain('id="co2-suisse"');
  });
});
