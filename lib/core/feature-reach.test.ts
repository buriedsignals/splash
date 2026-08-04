import { describe, it, expect, beforeEach, afterAll } from "bun:test";
import {
  registerFeatureLimits,
  featureLimits,
  clearFeatureLimits,
  snapshotFeatureLimits,
  restoreFeatureLimits,
  type FeatureLimit,
} from "./feature-reach";

// HERMETIC (registry E15). Taken at module load, BEFORE the first clear, so it holds whatever
// the real engines registered if any file ran before this one — and an empty map if this file
// runs first, which is equally correct: the real registration then happens later, unobstructed.
// Without this, clearing left the process with no `map-native` limits at all (its registration
// is an import-time side effect that never runs twice), which is what reddened offer/phrase.
const PRISTINE = snapshotFeatureLimits();

const KEYBOARD: FeatureLimit = {
  feature: "keyboard",
  sentence: "this interactive map will not be keyboard-navigable",
  measuredBy: 'skills/map-native/src/**/*.tsx — zero tabIndex / role="img"',
};

describe("feature-reach — a measured render limit, per (engine, type, format)", () => {
  beforeEach(() => clearFeatureLimits());
  afterAll(() => restoreFeatureLimits(PRISTINE));

  it("should answer per pairing, not per engine", () => {
    registerFeatureLimits("map-native", (_t, format) =>
      format === "interactive" ? [KEYBOARD] : [],
    );
    expect(featureLimits("map-native", "symbol", "interactive")).toEqual([
      KEYBOARD,
    ]);
    expect(featureLimits("map-native", "symbol", "static")).toEqual([]);
  });

  it("should answer empty for an engine that declared nothing", () => {
    expect(featureLimits("chart-native", "bar", "interactive")).toEqual([]);
  });

  it("should refuse a limit with no measurement", () => {
    // A refusal nobody measured is a false in the other direction. THIS is the guard that keeps
    // the table from becoming a sixth place where capability is written and drifts.
    registerFeatureLimits("map-dw", () => [
      {
        feature: "hover-values",
        sentence: "s",
        measuredBy: "  ",
      } as FeatureLimit,
    ]);
    expect(() => featureLimits("map-dw", "choropleth", "static")).toThrow(
      /measuredBy/,
    );
  });

  it("should refuse two registrations for one engine", () => {
    registerFeatureLimits("map-native", () => []);
    expect(() => registerFeatureLimits("map-native", () => [])).toThrow();
  });
});
