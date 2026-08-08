import { describe, it, expect } from "bun:test";
import { existsSync } from "node:fs";
import { join } from "node:path";

const ASSETS = join(import.meta.dirname, "..", "assets");

describe("twin-chart-web assets — the canon's shape, not a story's", () => {
  it("should not carry the CO2 story's component", () => {
    expect(existsSync(join(ASSETS, "EmissionsWeb.tsx"))).toBe(false);
  });
});
