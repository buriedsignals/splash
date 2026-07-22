import { describe, it, expect } from "bun:test";
import { themeColors } from "../src/core/tokens";

describe("themeColors threads the house hue to tinted neutrals", () => {
  it("byte-identical to the no-hue call when no house hue", () => {
    expect(themeColors("#18181b")).toEqual(themeColors("#18181b", undefined));
  });
  it("passing a house hue tints muted (differs from the untinted muted)", () => {
    expect(themeColors("#18181b", "#009e73").muted).not.toBe(
      themeColors("#18181b").muted,
    );
  });
});
