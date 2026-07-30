import { describe, it, expect, beforeEach } from "bun:test";
import {
  registerFeatureLimits,
  featureLimits,
  clearFeatureLimits,
  type FeatureLimit,
} from "./feature-reach";

const KEYBOARD: FeatureLimit = {
  feature: "keyboard",
  sentence: "this interactive map will not be keyboard-navigable",
  measuredBy: 'skills/map-native/src/**/*.tsx — zero tabIndex / role="img"',
};

describe("feature-reach — a measured render limit, per (engine, type, format)", () => {
  beforeEach(() => clearFeatureLimits());

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
