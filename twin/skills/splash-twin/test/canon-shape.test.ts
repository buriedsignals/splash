import { describe, it, expect } from "bun:test";
import { existsSync } from "node:fs";
import { join } from "node:path";

const SKILLS = join(import.meta.dirname, "..", "..");
const CRAFT = [
  "twin-chart-beat",
  "twin-chart-web",
  "twin-chart-video",
  "twin-map-beat",
];

describe("every craft skill carries the canon's four assets", () => {
  for (const s of CRAFT) {
    it(`${s} should carry sample-data, preview.png and output-proof`, () => {
      expect(existsSync(join(SKILLS, s, "assets", "sample-data"))).toBe(true);
      expect(existsSync(join(SKILLS, s, "assets", "preview.png"))).toBe(true);
      expect(existsSync(join(SKILLS, s, "output-proof"))).toBe(true);
    });
  }
});
