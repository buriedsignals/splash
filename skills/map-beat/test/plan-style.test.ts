import { describe, expect, it } from "bun:test";
import {
  transformStyle,
  assertNoDoubledBasemap,
} from "#shared/map-beat/style.mjs";

const styleDoc = () => ({
  glyphs: "https://api.maptiler.com/fonts/{fontstack}/{range}.pbf?key=REDACTED",
  layers: [
    { id: "Background", type: "background", paint: {} },
    { id: "Water", type: "fill", paint: {} },
    { id: "Landcover forest", type: "fill", paint: {} },
    { id: "Road network", type: "line", paint: {} },
    { id: "Country labels", type: "symbol", layout: {}, paint: {} },
  ],
});

describe("the transformed style", () => {
  it("should rewrite the glyph endpoint so our own faces are served", () => {
    const out = transformStyle(styleDoc(), {
      tints: { water: "#aaa", land: "#eee" },
      glyphs: "http://x/{fontstack}/{range}.pbf",
    });
    expect(out.glyphs).toBe("http://x/{fontstack}/{range}.pbf");
  });

  it("should hide texture and roads but keep water", () => {
    const out = transformStyle(styleDoc(), {
      tints: { water: "#aaa", land: "#eee" },
      glyphs: "http://x",
    });
    const vis = (id) => out.layers.find((l) => l.id === id)?.layout?.visibility;
    expect(vis("Landcover forest")).toBe("none");
    expect(vis("Road network")).toBe("none");
    expect(vis("Water")).not.toBe("none");
  });

  it("should hide every native label unless the beat asks to keep one", () => {
    const kept = transformStyle(styleDoc(), {
      tints: { water: "#aaa", land: "#eee" },
      glyphs: "http://x",
      keepLabels: [/country label/i],
    });
    expect(
      kept.layers.find((l) => l.id === "Country labels").layout.visibility,
    ).not.toBe("none");
    const none = transformStyle(styleDoc(), {
      tints: { water: "#aaa", land: "#eee" },
      glyphs: "http://x",
    });
    expect(
      none.layers.find((l) => l.id === "Country labels").layout.visibility,
    ).toBe("none");
  });

  it("should refuse a beat layer that repaints the land the basemap already draws", () => {
    const plan = {
      layers: [
        {
          id: "beat-land",
          type: "fill",
          role: "basemap-land",
          data: { type: "FeatureCollection", features: [] },
        },
      ],
    };
    expect(() => assertNoDoubledBasemap(plan)).toThrow(/doubled/);
  });
});
