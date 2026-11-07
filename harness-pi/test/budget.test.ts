import { describe, expect, it } from "bun:test";
import { resolve } from "node:path";
import { PROFILES, type Profile } from "../src/profiles.ts";
import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { contractText } from "../src/craft-kit.ts";
import {
  describeOverflow,
  estimateTokens,
  foldAt,
  HARNESS_OVERHEAD_TOKENS,
  maxOutputTokens,
  measureProfile,
} from "../src/budget.ts";

const CHECKOUT = resolve(import.meta.dirname, "../..");
const KITS = resolve(import.meta.dirname, "../craft");

const synthetic = (overrides: Partial<Profile>): Profile => ({
  owner: "skill:chart-web",
  body: "agents/editor.md",
  requiredReads: [],
  craft: false,
  keepRecentTokens: 8_000,
  ...overrides,
});

describe("context budget", () => {
  it("should report the editor profile below both limits", () => {
    const m = measureProfile(PROFILES["persona:editor"], CHECKOUT);
    expect(describeOverflow(m)).toBeNull();
  });

  it("should name the profile and its count when the working floor overflows", () => {
    const m = measureProfile(synthetic({}), CHECKOUT, () => 80_000);
    expect(describeOverflow(m)).toMatch(
      /^skill:chart-web: floor \d+ .* exceeds 49152$/,
    );
  });

  it("should fail on the compaction inequality when kept tokens reach the trigger", () => {
    const m = measureProfile(
      synthetic({ keepRecentTokens: 80_000 }),
      CHECKOUT,
      () => 10_000,
    );
    expect(describeOverflow(m)).toMatch(/cannot compact under 49152/);
  });

  it("should fail naming the missing instruction file rather than counting zero", () => {
    expect(() =>
      measureProfile(synthetic({ body: "agents/does-not-exist.md" }), CHECKOUT),
    ).toThrow(/agents\/does-not-exist\.md is missing/);
  });

  // Craft sessions start from their kit's CONTRACT.md (driver.ts), never from the skill body, so the
  // skill body is not what they hold; their real prompt is measured below.
  it("should fit every non-craft pipeline profile in the serving slot", () => {
    const overflowing = Object.values(PROFILES)
      .filter((p) => !p.craft)
      .map((p) => describeOverflow(measureProfile(p, CHECKOUT)))
      .filter(Boolean);
    expect(overflowing).toEqual([]);
  });

  it("should fold every craft kit's real prompt at Spotlight's fold point", async () => {
    const above: string[] = [];
    for (const format of ["static", "web", "video", "scrolly"])
      for (const k of readdirSync(join(KITS, format))) {
        const kit = join(KITS, format, k);
        if (!existsSync(join(kit, "CONTRACT.md"))) continue;
        const floor = estimateTokens(await contractText(kit, format)) + HARNESS_OVERHEAD_TOKENS;
        if (foldAt(floor) !== foldAt(0)) above.push(`${format}/${k}: ${floor}`);
      }
    expect(above).toEqual([]);
  });
});

describe("foldAt", () => {
  it("should fold a 12b session at Spotlight's 32,012 tokens on a 65,536 window", () => {
    expect(foldAt(4_000)).toBe(32_012);
  });

  it("should keep the tier's floor when the window is small", () => {
    expect(foldAt(4_000, "12b", 40_960)).toBe(20_480);
  });

  it("should fold a 26b session at its own floor on a small window", () => {
    expect(foldAt(4_000, "26b", 40_960)).toBe(24_576);
  });

  it("should fold a session with a large floor above what it needs to fold back under", () => {
    expect(foldAt(29_000)).toBe(29_000 + 4_000 + 2_000 + 6_000);
  });
});

describe("maxOutputTokens", () => {
  it("should be a quarter of the window, never below 8192", () => {
    expect([maxOutputTokens(65_536), maxOutputTokens(16_384)]).toEqual([16_384, 8_192]);
  });
});
