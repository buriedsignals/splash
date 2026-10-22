import { describe, expect, it } from "bun:test";
import { resolve } from "node:path";
import { PROFILES, type Profile } from "../src/profiles.ts";
import { describeOverflow, measureProfile } from "../src/budget.ts";

const CHECKOUT = resolve(import.meta.dirname, "../..");

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
      /^skill:chart-web: floor \d+ .* exceeds 90112$/,
    );
  });

  it("should fail on the compaction inequality when kept tokens reach the trigger", () => {
    const m = measureProfile(
      synthetic({ keepRecentTokens: 80_000 }),
      CHECKOUT,
      () => 10_000,
    );
    expect(describeOverflow(m)).toMatch(/cannot compact under 90112/);
  });

  it("should fail naming the missing instruction file rather than counting zero", () => {
    expect(() =>
      measureProfile(synthetic({ body: "agents/does-not-exist.md" }), CHECKOUT),
    ).toThrow(/agents\/does-not-exist\.md is missing/);
  });

  it("should fit every pipeline profile in the serving slot", () => {
    const overflowing = Object.values(PROFILES)
      .map((p) => describeOverflow(measureProfile(p, CHECKOUT)))
      .filter(Boolean);
    expect(overflowing).toEqual([]);
  });
});
