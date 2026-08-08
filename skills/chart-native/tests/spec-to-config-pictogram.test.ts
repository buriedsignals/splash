import { describe, it, expect } from "bun:test";
import { specToNativeConfig, type NativeSpec } from "../src/spec-to-config";
import { TARGET_MAX_ICONS } from "../src/pictogram-geometry";

const base = {
  title: "Four in five new transit passes went to two districts",
  source: {
    name: "Riverton transit authority enrolment data",
    url: "https://example.org/riverton-transit-pass",
  },
  unit: "residents who switched to the pass",
};

// The pictogram mapper carries ONE decision no other mapper has to make: what a single
// icon is worth. It is not in the CSV and a journalist will rarely state it, so the
// mapper derives it — and everything the type promises rests on that number being both
// round (the key is read aloud) and small enough that the longest row is countable.
describe("specToNativeConfig — pictogram (single, mapper derives the unit per icon)", () => {
  const spec: NativeSpec = {
    ...base,
    nativeType: "pictogram",
    data:
      "district,residents\n" +
      "Downtown,84000\nRiverside,56000\nOld Town,38000\nHillcrest,22000\nSuburbs,9000",
  };

  it("maps the category/value pair onto the component's field names", () => {
    const { type, config } = specToNativeConfig(spec);
    expect(type).toBe("pictogram");
    expect(config.categoryField).toBe("district");
    expect(config.valueField).toBe("residents");
    expect(config.rows).toHaveLength(5);
    expect(config.title).toBe(base.title);
    expect(config.unit).toBe(base.unit);
  });

  it("derives a round unit per icon that keeps the longest row countable", () => {
    const { config } = specToNativeConfig(spec);
    expect(config.unitPerIcon).toBe(10_000);
    expect(84_000 / (config.unitPerIcon as number)).toBeLessThanOrEqual(
      TARGET_MAX_ICONS,
    );
  });

  it("a journalist's own stated unit WINS over the derivation", () => {
    // "one figure = 20,000 residents" is an editorial choice about how coarse the count
    // should read; deriving over it would silently overrule them.
    const { config } = specToNativeConfig({ ...spec, unitPerIcon: 20_000 });
    expect(config.unitPerIcon).toBe(20_000);
  });

  it("names what one icon counts, from the value column, humanized", () => {
    const { config } = specToNativeConfig(spec);
    expect(config.iconNoun).toBe("residents");
    const snake = specToNativeConfig({
      ...spec,
      data: "district,new_riders\nDowntown,84000\nSuburbs,9000",
    });
    // the key reads "= 10 000 new riders", never "= 10 000 new_riders"
    expect(snake.config.iconNoun).toBe("new riders");
  });

  it("does not force-lowercase an acronym column", () => {
    const { config } = specToNativeConfig({
      ...spec,
      data: "district,FTE\nDowntown,84\nSuburbs,9",
    });
    expect(config.iconNoun).toBe("FTE");
  });

  it("rescales the unit when the values are a different size entirely", () => {
    // percentages, not people: the same rule has to produce a unit under 1.
    const { config } = specToNativeConfig({
      ...spec,
      data: "district,share\nDowntown,7.5\nSuburbs,2.1",
    });
    expect(config.unitPerIcon).toBe(1);
    const tiny = specToNativeConfig({
      ...spec,
      data: "district,share\nDowntown,0.42\nSuburbs,0.11",
    });
    expect(tiny.config.unitPerIcon).toBe(0.05);
  });
});
