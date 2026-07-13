import { describe, it, expect } from "bun:test";
import { mapSourceManifest } from "../src/source-manifest";

describe("mapSourceManifest", () => {
  it("tags the engine and takes the config type", () => {
    expect(mapSourceManifest({ type: "symbol" })).toEqual({
      engine: "map-native",
      type: "symbol",
    });
  });
  it("defaults a missing type to choropleth (the producer's implicit default)", () => {
    expect(mapSourceManifest({})).toEqual({
      engine: "map-native",
      type: "choropleth",
    });
  });
});
