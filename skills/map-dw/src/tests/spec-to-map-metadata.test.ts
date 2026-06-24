import { describe, it, expect } from "bun:test";
import { specToMapMetadata } from "../spec-to-map-metadata";
import { DEFAULT_BLUE, type MapSpec } from "../map-spec";

const base: MapSpec = {
  mapType: "choropleth",
  basemap: "world-2019",
  mapKeyAttr: "DW_STATE_CODE",
  regionKey: "code",
  valueColumn: "value",
  data: "code,value\nFRA,10\nSWE,70",
  title: "Sweden leads",
  altInsight: "Sweden highest, France lowest",
};

describe("specToMapMetadata", () => {
  it("emits the choropleth type and binds axes to the data columns", () => {
    const p = specToMapMetadata(base);
    expect(p.type).toBe("d3-maps-choropleth");
    expect(p.metadata.axes).toEqual({ keys: "code", values: "value" });
  });

  it("sets basemap and map-key-attr in visualize", () => {
    const p = specToMapMetadata(base);
    expect(p.metadata.visualize.basemap).toBe("world-2019");
    expect(p.metadata.visualize["map-key-attr"]).toBe("DW_STATE_CODE");
  });

  it("emits a colorscale WITHOUT the black-trap `stops` string", () => {
    const cs = specToMapMetadata(base).metadata.visualize.colorscale as Record<
      string,
      unknown
    >;
    expect(cs.colors).toBeDefined();
    expect(cs.mode).toBe("continuous");
    expect("stops" in cs).toBe(false); // the string `stops` forces black — must be absent
  });

  it("defaults to the light→blue colorScale when none is given", () => {
    const cs = specToMapMetadata(base).metadata.visualize.colorscale as {
      colors: unknown;
    };
    expect(cs.colors).toEqual(DEFAULT_BLUE);
  });

  it("uses a custom colorScale when provided", () => {
    const custom = [
      { color: "#fee5d9", position: 0 },
      { color: "#a50f15", position: 1 },
    ];
    const cs = specToMapMetadata({ ...base, colorScale: custom }).metadata
      .visualize.colorscale as { colors: unknown };
    expect(cs.colors).toEqual(custom);
  });

  it("carries altInsight as the aria-description (WCAG)", () => {
    const d = specToMapMetadata(base).metadata.describe as Record<
      string,
      unknown
    >;
    expect(d["aria-description"]).toBe("Sweden highest, France lowest");
  });
});
