import { describe, expect, it } from "bun:test";
import { mountPlan } from "#shared/map-beat/mount.mjs";

/** A map whose style already carries the basemap's layers, recording where each plan layer is inserted. */
function fakeMap(styleLayers: Array<{ id: string; type: string }>) {
  const sources = new Map<string, unknown>();
  const layers = styleLayers.map((l) => ({ ...l }));
  return {
    layers,
    getSource: (id: string) => sources.get(id),
    addSource: (id: string, spec: unknown) => sources.set(id, spec),
    getStyle: () => ({ layers }),
    addLayer: (spec: Record<string, unknown> & { id: string; type: string }, beforeId?: string) => {
      const at = beforeId === undefined ? layers.length : layers.findIndex((l) => l.id === beforeId);
      if (at < 0) throw new Error(`no layer ${beforeId}`);
      layers.splice(at, 0, spec);
    },
    getZoom: () => 3,
  };
}

const countries = { type: "vector", url: "https://api.maptiler.com/tiles/countries/tiles.json?key=__MAPTILER" + "_KEY__" };
const fill = (id: string, extra: Record<string, unknown> = {}) => ({ id, type: "fill", source: countries, sourceLayer: "administrative", paint: {}, ...extra });

describe("a plan layer drawn beneath the basemap's water", () => {
  it("should insert it before the style's first water fill, so the basemap's sea draws the coast", () => {
    // THE TWO COASTLINES (spec §1.3): a choropleth filled from MapTiler Countries carries that tileset's own
    // coast, generalised per zoom, over the basemap's finer one. Measured on the choropleth pilot: fills
    // 1.5–3.6 CSS px over the basemap's sea at the Norwegian fjords, Dalmatia and the Aegean.
    const map = fakeMap([
      { id: "Background", type: "background" },
      { id: "Residential", type: "fill" },
      { id: "Water shadow", type: "fill" },
      { id: "Water", type: "fill" },
      { id: "Place labels", type: "symbol" },
    ]);
    mountPlan(map, { degreesPerPixel: 1, layers: [fill("classes", { beneath: "water" }), fill("edges", { type: "line" })] });
    expect(map.layers.map((l) => l.id)).toEqual(["Background", "Residential", "classes", "Water shadow", "Water", "Place labels", "edges"]);
  });

  it("should find the water by the same rule the style sweep tints it by, not by one provider's id", () => {
    const map = fakeMap([
      { id: "background", type: "background" },
      { id: "ocean", type: "fill" },
      { id: "lake", type: "fill" },
    ]);
    mountPlan(map, { degreesPerPixel: 1, layers: [fill("classes", { beneath: "water" })] });
    expect(map.layers.map((l) => l.id)).toEqual(["background", "classes", "ocean", "lake"]);
  });

  it("should keep the plan's own order among the layers it puts beneath the water", () => {
    const map = fakeMap([{ id: "Water", type: "fill" }]);
    mountPlan(map, { degreesPerPixel: 1, layers: [fill("low", { beneath: "water" }), fill("high", { beneath: "water" })] });
    expect(map.layers.map((l) => l.id)).toEqual(["low", "high", "Water"]);
  });

  it("should refuse, naming the layer, when the style has no water fill to go beneath", () => {
    const map = fakeMap([{ id: "Background", type: "background" }, { id: "Water outline", type: "line" }]);
    expect(() => mountPlan(map, { degreesPerPixel: 1, layers: [fill("classes", { beneath: "water" })] })).toThrow(/"classes".*no water fill/);
  });

  it("should refuse a place it does not know", () => {
    const map = fakeMap([{ id: "Water", type: "fill" }]);
    expect(() => mountPlan(map, { degreesPerPixel: 1, layers: [fill("classes", { beneath: "roads" })] })).toThrow(/"classes".*"roads"/);
  });
});
