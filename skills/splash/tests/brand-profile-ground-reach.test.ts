// WHICH PRODUCERS A HOUSE GROUND ACTUALLY REACHES — measured, not re-read.
//
// `producerHonoursGround` exists so the loop's ground gate (lib/loop/ground.ts) only puts its
// question to a build the ground will actually be painted into. If that list ever disagrees with
// what `mergeProfileDefaults` really threads, the gate goes wrong in one of two silent ways: it
// walls a Datawrapper build over a colour Datawrapper never renders, or it waves through a native
// build carrying a ground nobody was asked about. So the list is checked against the MERGE, which
// is the thing that decides.
import { describe, expect, it } from "bun:test";
import {
  GROUND_HONOURING_PRODUCERS,
  mergeProfileDefaults,
  producerHonoursGround,
  type BrandProfile,
} from "../src/brand-profile";

const HOUSE: BrandProfile = { palette: ["#d5121e"], theme: "#0A5C36" };

// One spec per producer, shaped so the merge takes its intended branch (a map needs a map type, a
// chart a chart one, image-native neither).
const SPECS: Record<string, Record<string, unknown>> = {
  "chart-native": { nativeType: "bar" },
  "map-native": { type: "choropleth" },
  scrolly: { nativeType: "bar" },
  "image-native": {},
  "dw-chart": { nativeType: "bar" },
  "map-dw": { type: "choropleth" },
};

describe("the ground's reach", () => {
  for (const [producer, spec] of Object.entries(SPECS)) {
    it(`${producer}: the declared list matches what the merge actually threads`, () => {
      const merged = mergeProfileDefaults({ ...spec }, HOUSE, { producer }) as {
        themeBg?: string;
      };
      expect(producerHonoursGround(producer)).toBe(
        merged.themeBg !== undefined,
      );
    });
  }

  it("names Datawrapper's two engines as out of reach, which is why they are never walled", () => {
    expect(producerHonoursGround("dw-chart")).toBe(false);
    expect(producerHonoursGround("map-dw")).toBe(false);
    expect(producerHonoursGround(undefined)).toBe(false);
    expect([...GROUND_HONOURING_PRODUCERS]).not.toContain("dw-chart");
  });
});

describe("the recorded acceptance travels with the ground", () => {
  it("stamps groundAccepted only when a ground is actually applied", () => {
    const accepted = mergeProfileDefaults(
      { type: "choropleth" },
      { ...HOUSE, themeAccepted: true },
      { producer: "map-native" },
    ) as Record<string, unknown>;
    expect(accepted.groundAccepted).toBe(true);
    // No ground declared ⇒ nothing to accept, so nothing is stamped.
    const noGround = mergeProfileDefaults(
      { type: "choropleth" },
      { palette: ["#d5121e"], themeAccepted: true },
      { producer: "map-native" },
    ) as Record<string, unknown>;
    expect(noGround.groundAccepted).toBeUndefined();
  });

  it("leaves an ordinary charter without the stamp", () => {
    const plain = mergeProfileDefaults({ type: "choropleth" }, HOUSE, {
      producer: "map-native",
    }) as Record<string, unknown>;
    expect(plain.groundAccepted).toBeUndefined();
  });
});
