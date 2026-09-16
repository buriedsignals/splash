import { describe, expect, it } from "bun:test";
import { mountPlan } from "#shared/map-beat/mount.mjs";

// MAPLIBRE REFUSES AN INVALID LAYER WITHOUT THROWING: `addLayer` fires an `error` event and adds nothing. Measured on
// the proportional symbol scrolly (2026-09-15): a `text-translate` interpolation whose stops were bare arrays was
// refused, the live runtime recorded it as a warning, and the page shipped with the station card 1 names missing
// from the map and from every frozen card image, with every guard green.

function refusingMap(refused: string) {
  const sources = new Map<string, unknown>();
  const layers: Array<{ id: string }> = [];
  return {
    getSource: (id: string) => sources.get(id),
    addSource: (id: string, spec: unknown) => sources.set(id, spec),
    getStyle: () => ({ layers }),
    addLayer: (spec: { id: string }) => {
      if (spec.id !== refused) layers.push(spec);
    },
    getLayer: (id: string) => layers.find((l) => l.id === id),
    getZoom: () => 3,
  };
}

const point = { type: "FeatureCollection", features: [] };

describe("a plan layer MapLibre refuses", () => {
  it("should stop the mount, naming the layer", () => {
    const map = refusingMap("name");
    expect(() => mountPlan(map, { degreesPerPixel: 1, layers: [{ id: "rings", type: "circle", data: point }, { id: "name", type: "symbol", data: point }] })).toThrow(/"name"/);
  });

  it("should mount every layer MapLibre adds", () => {
    const map = refusingMap("none");
    mountPlan(map, { degreesPerPixel: 1, layers: [{ id: "rings", type: "circle", data: point }] });
    expect(map.getLayer("rings")).toBeDefined();
  });
});
