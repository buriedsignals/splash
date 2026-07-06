import { describe, it, expect } from "bun:test";
import { formatFlag } from "../src/adapters";

describe("formatFlag — VisualFormat → producer flag", () => {
  it("maps chart-native video → all, static → static", () => {
    expect(formatFlag("chart-native", "video")).toBe("all");
    expect(formatFlag("chart-native", "static")).toBe("static");
  });
  it("maps map-native interactive → static (web build), video → all", () => {
    expect(formatFlag("map-native", "interactive")).toBe("static");
    expect(formatFlag("map-native", "video")).toBe("all");
  });
});
