import { describe, it, expect } from "bun:test";
import { scrollySourceManifest } from "../src/source-manifest";

describe("scrollySourceManifest", () => {
  it("tags a chart-scrolly by its nativeType marker", () => {
    expect(scrollySourceManifest({ nativeType: "bar" })).toEqual({
      engine: "scrolly",
      kind: "chart",
    });
  });
  it("tags a map-scrolly (has type, no nativeType)", () => {
    expect(scrollySourceManifest({ type: "choropleth" })).toEqual({
      engine: "scrolly",
      kind: "map",
    });
  });
  it("tags an image-scrolly by visual", () => {
    expect(scrollySourceManifest({ visual: "image" })).toEqual({
      engine: "scrolly",
      kind: "image",
    });
  });
});
