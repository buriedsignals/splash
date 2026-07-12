import { describe, it, expect } from "bun:test";
import { specToNativeConfig, type NativeSpec } from "../src/spec-to-config";
import { ShapeMismatchError } from "../src/shape-validation";
import { computeHeatmapLayout } from "../src/heatmap-geometry";

const base = {
  title: "Emergency-room waits peak on Monday mornings",
  source: { name: "County health authority", url: "https://example.org/er" },
  unit: "median wait (minutes)",
};

describe("specToNativeConfig — heatmap (wide day×hour matrix, colour = value)", () => {
  it("maps the first column to rowField and every numeric column after it to colFields", () => {
    const spec: NativeSpec = {
      ...base,
      nativeType: "heatmap",
      data:
        "day,06-10,10-14,14-18,18-22\n" +
        "Mon,52,38,41,60\n" +
        "Tue,44,33,39,55\n" +
        "Wed,40,31,37,50",
    };
    const { type, config } = specToNativeConfig(spec);
    expect(type).toBe("heatmap");
    expect(config.rowField).toBe("day");
    expect(config.colFields).toEqual(["06-10", "10-14", "14-18", "18-22"]);
    expect((config.rows as unknown[]).length).toBe(3);
    expect(config.unit).toBe("median wait (minutes)");
    expect(config.title).toBe(base.title);
    expect(config.source).toEqual(base.source);
  });

  it("produces a config the heatmap geometry accepts, with a continuous value→colour ramp", () => {
    const spec: NativeSpec = {
      ...base,
      nativeType: "heatmap",
      data: "day,morning,evening\nMon,10,40\nTue,20,30",
    };
    const { config } = specToNativeConfig(spec);
    // the config drives the SAME geometry the component renders — a value→colour grid
    const layout = computeHeatmapLayout(
      {
        rowField: config.rowField as string,
        colFields: config.colFields as string[],
        rows: config.rows as Record<string, string | number>[],
      },
      { width: 840, height: 480, padding: { top: 90, right: 16, bottom: 76, left: 52 } },
    );
    expect(layout.cells.length).toBe(4); // 2 rows × 2 cols
    // the domain min (10) and max (40) land on the extreme ramp stops → colour IS the value
    const lo = layout.cells.find((c) => c.value === 10)!;
    const hi = layout.cells.find((c) => c.value === 40)!;
    expect(lo.color).not.toBe(hi.color);
    expect(layout.rampStops.length).toBeGreaterThanOrEqual(3);
  });

  it("rejects a single-column (no grid) CSV via the shape gate", () => {
    const spec: NativeSpec = {
      ...base,
      nativeType: "heatmap",
      data: "day,waits\nMon,52\nTue,44",
    };
    expect(() => specToNativeConfig(spec)).toThrow(ShapeMismatchError);
  });
});
