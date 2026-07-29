import { describe, it, expect } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  unsupportedArcBeatsErrors,
  ARC_CAPABLE_MAP_TYPES,
} from "../src/map-arc";
import { applyMapArc } from "../src/map-story";

// The engine's own four story components had the defect a QA sweep found in the scrolly: they
// compose a `meta` for deriveMapStory/deriveSymbolStory and never put `config.arcBeats` in it,
// so a journalist-confirmed walk that PASSED validation was rendered as the salience default —
// on the video track as well as the scrolly one. Guarded at the source, because what went
// wrong is a missing property in an object literal and these components cannot be imported
// under a test (module-scope MapTiler key guard).

const SRC = join(import.meta.dir, "..", "src");

describe("map-native story components forward the confirmed claim-arc", () => {
  const files = [
    "components/ChoroplethStory.tsx", // video
    "components/SymbolStory.tsx", // video
    "components/ChoroplethScrolly.tsx", // scrolly
    "components/SymbolScrolly.tsx", // scrolly
  ];
  for (const file of files) {
    it(`${file} puts arcBeats in the deriver meta`, () => {
      const source = readFileSync(join(SRC, file), "utf8");
      expect(source).toMatch(/arcBeats:\s*config\.arcBeats/);
    });
  }
});

describe("applyMapArc marks its beats as authored", () => {
  it("stamps every arc reveal, so a caption composer can tell it from a derived one", () => {
    const beats = applyMapArc(
      [
        { region: "A", role: "establish", text: "one" },
        { region: "B", role: "payoff", text: "two" },
      ],
      (region) => ({
        camera: [0, 0, 1, 1],
        highlight: [region],
        name: region,
        value: "1",
      }),
    );
    expect(beats.map((b) => b.authored)).toEqual([true, true]);
    // The claim is the copy — never a derived "name — value".
    expect(beats.map((b) => b.copy)).toEqual(["one", "two"]);
  });
});

describe("unsupportedArcBeatsErrors", () => {
  const plan = [{ region: "A", role: "establish" as const, text: "a" }];

  it("is silent for the two arc-capable types", () => {
    for (const type of ARC_CAPABLE_MAP_TYPES)
      expect(unsupportedArcBeatsErrors({ arcBeats: plan }, type)).toEqual([]);
  });

  it("is silent when no plan was submitted", () => {
    expect(unsupportedArcBeatsErrors({}, "hex-grid")).toEqual([]);
  });

  it("refuses by name, and names the way out", () => {
    const errors = unsupportedArcBeatsErrors({ arcBeats: plan }, "cartogram");
    expect(errors).toHaveLength(1);
    expect(errors[0]).toContain("arcBeats");
    expect(errors[0]).toContain("cartogram");
    // The refusal has to say which types DO walk an arc — otherwise it is a dead end.
    for (const type of ARC_CAPABLE_MAP_TYPES) expect(errors[0]).toContain(type);
  });

  it("refuses an EMPTY plan too — an empty array is still a field the render ignores", () => {
    expect(unsupportedArcBeatsErrors({ arcBeats: [] }, "locator")).toHaveLength(
      1,
    );
  });
});
