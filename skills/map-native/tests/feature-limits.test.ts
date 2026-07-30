import { describe, it, expect } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { featureLimits } from "../../../lib/core/feature-reach";
import "../src/manifest";

describe("map-native declares what its interactive render cannot do", () => {
  it("should declare the keyboard limit on every interactive type", () => {
    for (const t of [
      "symbol",
      "choropleth",
      "route",
      "locator",
      "hex-grid",
      "dot-density",
      "cartogram",
    ]) {
      const ls = featureLimits("map-native", t, "interactive");
      const kb = ls.find((l) => l.feature === "keyboard");
      expect(kb, `${t} must declare its keyboard limit`).toBeDefined();
      expect(kb!.sentence).toContain("keyboard");
      expect(kb!.measuredBy).toContain("map-native");
    }
  });

  it("should declare NO keyboard limit on the static render", () => {
    // A static PNG has no interaction to navigate — declaring a limit there would be a
    // refusal about nothing.
    expect(
      featureLimits("map-native", "symbol", "static").some(
        (l) => l.feature === "keyboard",
      ),
    ).toBe(false);
  });

  it("should declare that an interactive symbol map shows no direct labels", () => {
    const ls = featureLimits("map-native", "symbol", "interactive");
    expect(ls.some((l) => l.feature === "direct-labels")).toBe(true);
  });

  it("should be the sentence map-dw's refusal quotes, not a second wording", () => {
    const dw = readFileSync(
      join(import.meta.dir, "..", "..", "map-dw", "src", "map-spec.ts"),
      "utf8",
    );
    expect(dw).not.toContain("top-N");
    expect(dw).toContain("SYMBOL_LABELS_INTERACTIVE");
  });
});
