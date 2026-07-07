import { describe, it, expect } from "bun:test";
import { specToNativeConfig, type NativeSpec } from "../src/spec-to-config";

const base = {
  title: "Half of Riverton still commutes by car",
  source: {
    name: "Riverton travel-to-work survey",
    url: "https://example.org/riverton-commute",
  },
  unit: "share of commuters (each square = 1%)",
};

describe("specToNativeConfig — waffle (single, mapper builds items)", () => {
  it("maps category + value rows into a pre-built items array", () => {
    const spec: NativeSpec = {
      ...base,
      nativeType: "waffle",
      data: "mode,share\nCar,52\nBus,18\nBike,12\nWalk,11\nTrain,7",
    };
    const { type, config } = specToNativeConfig(spec);
    expect(type).toBe("waffle");
    expect(config.items).toEqual([
      { label: "Car", value: 52 },
      { label: "Bus", value: 18 },
      { label: "Bike", value: 12 },
      { label: "Walk", value: 11 },
      { label: "Train", value: 7 },
    ]);
    expect(config.title).toBe(base.title);
    expect(config.unit).toBe(base.unit);
  });
});
