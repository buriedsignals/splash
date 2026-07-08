// Convention-heavy mapper for `fan` — a sparse CSV with MAGIC column names
// (`actual`/`central`/`lo{n}`/`hi{n}`), not a tidy wide series-per-column CSV.
// Levels are derived by scanning headers for a matched lo{n}/hi{n} pair; blank
// cells must stay ABSENT (not coerced to 0) so fan-geometry's `!= null` checks
// correctly separate "no value" from a real 0.
import { describe, it, expect } from "bun:test";
import { specToNativeConfig, type NativeSpec } from "../src/spec-to-config";

const base = {
  title: "Riverton's debt is on track to top £300m by 2030",
  source: { name: "Riverton finance office", url: "https://example.org/x" },
  unit: "city debt, £m",
};

describe("specToNativeConfig — fan (sparse forecast-band CSV)", () => {
  it("derives levels from matched lo{n}/hi{n} header pairs and coerces only populated cells", () => {
    const spec: NativeSpec = {
      ...base,
      nativeType: "fan",
      data:
        "year,actual,central,lo80,hi80,lo95,hi95\n" +
        "2022,190,,,,,\n" +
        "2023,200,,,,,\n" +
        "2024,,210,205,215,200,220\n" +
        "2025,,224,213,235,208,240",
    };
    const { type, config } = specToNativeConfig(spec);
    expect(type).toBe("fan");
    expect(config.xField).toBe("year");
    expect(config.levels).toEqual([80, 95]);
    const rows = config.rows as Record<string, number>[];
    expect(rows.length).toBe(4);
    // history row: actual populated, central/bands absent (not 0)
    expect(rows[0].actual).toBe(190);
    expect(rows[0].central).toBeUndefined();
    expect(rows[0].lo80).toBeUndefined();
    // forecast row: central+bands populated, actual absent
    expect(rows[2].actual).toBeUndefined();
    expect(rows[2].central).toBe(210);
    expect(rows[2].lo80).toBe(205);
    expect(rows[2].hi95).toBe(220);
  });

  it("drops a lone lo{n} with no matching hi{n} rather than guessing a level", () => {
    const spec: NativeSpec = {
      ...base,
      nativeType: "fan",
      // lo80/hi80 is a valid matched pair (satisfies shape validation); lo95
      // has no hi95, so it must NOT surface as a level.
      data:
        "year,actual,central,lo80,hi80,lo95\n" +
        "2023,100,,,,\n" +
        "2024,,110,102,118,90",
    };
    const { config } = specToNativeConfig(spec);
    expect(config.levels).toEqual([80]);
  });
});
