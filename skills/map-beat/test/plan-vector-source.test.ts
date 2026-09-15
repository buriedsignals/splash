import { describe, expect, it } from "bun:test";
import { mountPlan, sourceIdOf } from "#shared/map-beat/mount.mjs";

function fakeMap() {
  const sources = new Map<string, unknown>();
  const layers: Array<Record<string, unknown>> = [];
  return {
    sources,
    layers,
    getSource: (id: string) => sources.get(id),
    addSource: (id: string, spec: unknown) => sources.set(id, spec),
    addLayer: (spec: Record<string, unknown>) => layers.push(spec),
    getZoom: () => 3,
  };
}

const countries = {
  type: "vector",
  url:
    "https://api.maptiler.com/tiles/countries/tiles.json?key=__MAPTILER" +
    "_KEY__",
};

describe("vector sources in a map plan", () => {
  it("should add one source for two layers reading the same tiles", () => {
    const map = fakeMap();
    mountPlan(map, {
      degreesPerPixel: 1,
      layers: [
        {
          id: "fills",
          type: "fill",
          source: countries,
          sourceLayer: "administrative",
          paint: {},
        },
        {
          id: "edges",
          type: "line",
          source: countries,
          sourceLayer: "administrative",
          paint: {},
        },
      ],
    });
    expect(map.sources.size).toBe(1);
    expect(map.layers.map((l) => l.source)).toEqual([
      sourceIdOf({ source: countries }),
      sourceIdOf({ source: countries }),
    ]);
    expect(map.layers[0]["source-layer"]).toBe("administrative");
  });

  it("should keep a GeoJSON layer on a source of its own id", () => {
    const map = fakeMap();
    mountPlan(map, {
      degreesPerPixel: 1,
      layers: [
        {
          id: "seats",
          type: "symbol",
          data: { type: "FeatureCollection", features: [] },
        },
      ],
    });
    expect(map.layers[0].source).toBe("seats");
    expect(map.layers[0]["source-layer"]).toBeUndefined();
  });

  it("should refuse a vector layer with no source layer", () => {
    expect(() =>
      mountPlan(fakeMap(), {
        degreesPerPixel: 1,
        layers: [{ id: "fills", type: "fill", source: countries }],
      }),
    ).toThrow(/source layer/);
  });
});
