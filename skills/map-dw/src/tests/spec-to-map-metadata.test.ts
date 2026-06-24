import { describe, it, expect } from "bun:test";
import { specToMapMetadata } from "../spec-to-map-metadata";
import {
  DEFAULT_BLUE,
  OKABE_ITO,
  type LocatorMapSpec,
  type MapSpec,
  type SymbolMapSpec,
} from "../map-spec";

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

const symbol: SymbolMapSpec = {
  mapType: "symbol",
  basemap: "france-metropolitan-departments",
  latColumn: "lat",
  lonColumn: "lon",
  sizeColumn: "population",
  data: "city,lat,lon,population\nParis,48.85,2.35,2100\nLyon,45.76,4.83,520",
  title: "Population concentrates in Paris",
  altInsight: "Paris dwarfs Lyon",
};

describe("specToMapMetadata — symbol", () => {
  it("emits the symbol type and binds value→SIZE via axes.area, value→COLOUR via axes.values", () => {
    const p = specToMapMetadata(symbol);
    expect(p.type).toBe("d3-maps-symbols");
    // The load-bearing fix: SIZE is axes.area, not axes.keys/values.
    expect(p.metadata.axes).toEqual({
      lat: "lat",
      lon: "lon",
      area: "population",
      values: "population",
    });
  });

  it("uses an explicit colorColumn for COLOUR when given", () => {
    const p = specToMapMetadata({ ...symbol, colorColumn: "lat" });
    expect((p.metadata.axes as Record<string, unknown>).values).toBe("lat");
    expect((p.metadata.axes as Record<string, unknown>).area).toBe(
      "population",
    );
  });

  it("sets the basemap as a backdrop and map-type-set (no map-key-attr join)", () => {
    const v = specToMapMetadata(symbol).metadata.visualize;
    expect(v.basemap).toBe("france-metropolitan-departments");
    expect(v["map-type-set"]).toBe(true);
    expect("map-key-attr" in v).toBe(false);
  });

  it("emits a colorscale WITHOUT the black-trap `stops` string", () => {
    const cs = specToMapMetadata(symbol).metadata.visualize
      .colorscale as Record<string, unknown>;
    expect(cs.colors).toEqual(DEFAULT_BLUE);
    expect("stops" in cs).toBe(false);
  });
});

const locator: LocatorMapSpec = {
  mapType: "locator",
  title: "Three sites along the Arve valley",
  altInsight: "Annemasse, Geneva, Chamonix",
  markers: [
    { lng: 6.2347, lat: 46.1939, label: "Annemasse" },
    { lng: 6.1432, lat: 46.2044, label: "Geneva", color: "#D55E00" },
  ],
};

describe("specToMapMetadata — locator", () => {
  it("emits the locator type and an empty axes (no data table)", () => {
    const p = specToMapMetadata(locator);
    expect(p.type).toBe("locator-map");
    expect(p.metadata.axes).toEqual({});
  });

  it("maps each marker to a point with [lng,lat] coordinates", () => {
    const markers = specToMapMetadata(locator).metadata.visualize
      .markers as Array<Record<string, unknown>>;
    expect(markers).toHaveLength(2);
    expect(markers[0].type).toBe("point");
    expect(markers[0].coordinates).toEqual([6.2347, 46.1939]);
    expect(markers[0].title).toBe("Annemasse");
  });

  it("cycles Okabe-Ito colours but honours a per-marker colour", () => {
    const markers = specToMapMetadata(locator).metadata.visualize
      .markers as Array<Record<string, unknown>>;
    expect(markers[0].markerColor).toBe(OKABE_ITO[0]);
    expect(markers[1].markerColor).toBe("#D55E00"); // explicit override
  });

  it("computes a center/zoom from the markers when no view is given (fit:true frames the whole world)", () => {
    const v = specToMapMetadata(locator).metadata.visualize.view as {
      center: [number, number];
      zoom: number;
      fit: boolean;
    };
    // center is the midpoint of the two markers' bounding box
    expect(v.center[0]).toBeCloseTo((6.2347 + 6.1432) / 2, 4);
    expect(v.center[1]).toBeCloseTo((46.1939 + 46.2044) / 2, 4);
    // a tight cluster zooms in, never the whole world
    expect(v.zoom).toBeGreaterThan(6);
    expect(v.fit).toBe(false);
  });

  it("uses an explicit center/zoom when a view is provided", () => {
    const v = specToMapMetadata({
      ...locator,
      view: { center: [6.4, 46.05], zoom: 8.5 },
    }).metadata.visualize.view as Record<string, unknown>;
    expect(v.center).toEqual([6.4, 46.05]);
    expect(v.zoom).toBe(8.5);
    expect(v.fit).toBe(false);
  });

  it("carries altInsight as the aria-description (WCAG)", () => {
    const d = specToMapMetadata(locator).metadata.describe as Record<
      string,
      unknown
    >;
    expect(d["aria-description"]).toBe("Annemasse, Geneva, Chamonix");
  });
});
