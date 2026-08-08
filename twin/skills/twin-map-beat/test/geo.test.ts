import { describe, expect, it } from "bun:test";
import {
  CO2_ALIAS,
  CO2_BREAKS,
  CO2_EXPECTED_NO_DATA,
  binIndex,
  claimViolations,
  fr,
  joinValues,
  keepRing,
  luminanceOf,
  mixHex,
  pathFromRings,
  revealOrder,
  scalePosition,
  sequentialRamp,
  simplifyRing,
  valuesFromCsv,
  type Ring,
} from "../assets/geo";

/**
 * The pure half of a map beat: the join, the classes, the ramp, and the geometry-to-path step.
 * Everything here runs without a browser, a tile or a key, which is what makes it testable at all —
 * the half that needs a camera is verified by looking at the render.
 *
 * The join tests are the important ones. `geo-discipline.md` rule 5: a bad join renders as no-data
 * and looks like a legitimate value, so every check here is written to FAIL when the join silently
 * loses a country.
 */

const CSV = `Entity,Code,Year,CO₂ emissions per capita
Switzerland,CHE,2022,3.7477124
Switzerland,CHE,2023,3.604899
France,FRA,2023,4.067842
Kosovo,OWID_KOS,2023,4.8353086
Europe,OWID_EUR,2023,6.545994
Nowhere,NWH,2023,
`;

describe("valuesFromCsv", () => {
  it("should read one year and key it by the source's own code", () => {
    const values = valuesFromCsv(CSV, 2023);
    expect(values.get("CHE")).toBeCloseTo(3.604899, 6);
    expect(values.get("OWID_EUR")).toBeCloseTo(6.545994, 6);
    expect(values.has("NWH")).toBe(false);
  });

  it("should not leak another year into the frozen one", () => {
    expect(valuesFromCsv(CSV, 2023).get("CHE")).not.toBeCloseTo(3.7477124, 6);
    expect(valuesFromCsv(CSV, 2022).get("CHE")).toBeCloseTo(3.7477124, 6);
  });

  it("should refuse a csv whose value column it cannot find", () => {
    expect(() => valuesFromCsv("a,b,c\n1,2,3\n", 2023)).toThrow(/Code|Year/);
  });
});

describe("joinValues", () => {
  const values = valuesFromCsv(CSV, 2023);

  it("should join a country whose shape key differs from its data key, through the alias", () => {
    const joined = joinValues(["CHE", "KOS"], values, {
      alias: CO2_ALIAS,
      expectedNoData: [],
    });
    expect(joined.rows.map((r) => r.key)).toEqual(["CHE", "KOS"]);
    expect(joined.rows[1]?.value).toBeCloseTo(4.8353086, 6);
    expect(joined.noData).toEqual([]);
  });

  it("should FAIL LOUD, naming the country, when a shape finds no value and nobody declared it", () => {
    expect(() =>
      joinValues(["CHE", "KOS"], values, { alias: {}, expectedNoData: [] }),
    ).toThrow(/KOS/);
  });

  it("should accept a shape with no value only when the beat declared it as no-data", () => {
    const joined = joinValues(["CHE", "VAT"], values, {
      alias: CO2_ALIAS,
      expectedNoData: ["VAT"],
    });
    expect(joined.noData).toEqual(["VAT"]);
    expect(joined.rows.find((r) => r.key === "VAT")?.value).toBeNull();
  });

  it("should FAIL LOUD when a declared no-data country turns out to have a value", () => {
    expect(() =>
      joinValues(["CHE"], values, { alias: {}, expectedNoData: ["CHE"] }),
    ).toThrow(/CHE/);
  });

  it("should count what it joined", () => {
    const joined = joinValues(["CHE", "FRA", "VAT"], values, {
      alias: CO2_ALIAS,
      expectedNoData: ["VAT"],
    });
    expect(joined.matched).toBe(2);
    expect(joined.rows).toHaveLength(3);
  });
});

describe("binIndex", () => {
  it("should put a value in the class its own breaks name", () => {
    expect(binIndex(0, CO2_BREAKS)).toBe(0);
    expect(binIndex(3.6, CO2_BREAKS)).toBe(1);
    expect(binIndex(6.5, CO2_BREAKS)).toBe(3);
    expect(binIndex(13.04, CO2_BREAKS)).toBe(CO2_BREAKS.length);
  });

  it("should put a value exactly on a break into the class above it", () => {
    expect(binIndex(4, CO2_BREAKS)).toBe(2);
  });
});

describe("scalePosition", () => {
  it("should place a value inside its own class, not at the class edge", () => {
    // 3,6 is 80% of the way through the 2–4 class, which is the second of six.
    expect(scalePosition(3.6, CO2_BREAKS)).toBeCloseTo((1 + 0.8) / 6, 6);
    expect(scalePosition(6.5, CO2_BREAKS)).toBeCloseTo((3 + 0.25) / 6, 6);
  });

  it("should run from the bottom of the first class to the top of the last", () => {
    expect(scalePosition(0, CO2_BREAKS)).toBe(0);
    expect(scalePosition(12, CO2_BREAKS)).toBe(1);
  });

  it("should clamp a value past the open top class rather than run off the legend", () => {
    expect(scalePosition(40, CO2_BREAKS)).toBe(1);
  });

  it("should keep the subject below the comparison, which is the whole claim", () => {
    expect(scalePosition(3.604899, CO2_BREAKS)).toBeLessThan(
      scalePosition(6.545994, CO2_BREAKS),
    );
  });
});

describe("sequentialRamp", () => {
  it("should darken on a light ground and lighten on a dark one", () => {
    const light = sequentialRamp("#FFFFFF", "#000000", 6).map(luminanceOf);
    const dark = sequentialRamp("#101820", "#FFFFFF", 6).map(luminanceOf);
    expect(light).toEqual([...light].sort((a, b) => b - a));
    expect(dark).toEqual([...dark].sort((a, b) => a - b));
  });

  it("should never render as the bare ground nor as the ink itself", () => {
    const ramp = sequentialRamp("#FFFFFF", "#000000", 6);
    expect(ramp[0]).not.toBe("#ffffff");
    expect(ramp[ramp.length - 1]).not.toBe("#000000");
  });

  it("should separate every step from its neighbour, so two classes never read as one", () => {
    const ramp = sequentialRamp("#FFFFFF", "#000000", 6).map(luminanceOf);
    for (let i = 1; i < ramp.length; i++)
      expect(Math.abs(ramp[i]! - ramp[i - 1]!)).toBeGreaterThan(0.02);
  });

  it("should refuse a ground that is not a hex colour", () => {
    expect(() => sequentialRamp("white", "#000000", 6)).toThrow(/#rrggbb/);
  });
});

describe("mixHex", () => {
  it("should return its endpoints exactly", () => {
    expect(mixHex("#FFFFFF", "#000000", 0)).toBe("#ffffff");
    expect(mixHex("#FFFFFF", "#000000", 1)).toBe("#000000");
  });
});

describe("pathFromRings", () => {
  it("should close every ring, so a country is a fill and not a stroke", () => {
    const d = pathFromRings([
      [
        [0, 0],
        [10, 0],
        [10, 10],
      ],
    ]);
    expect(d).toBe("M0 0L10 0L10 10Z");
  });

  it("should carry a hole as a second subpath, for evenodd to cut out", () => {
    const d = pathFromRings([
      [
        [0, 0],
        [10, 0],
        [10, 10],
      ],
      [
        [2, 2],
        [4, 2],
        [4, 4],
      ],
    ]);
    expect(d.match(/Z/g)).toHaveLength(2);
    expect(d).toContain("M2 2");
  });

  it("should drop a ring with fewer than three points rather than draw a sliver", () => {
    expect(
      pathFromRings([
        [
          [0, 0],
          [1, 1],
        ],
      ]),
    ).toBe("");
  });
});

describe("simplifyRing", () => {
  const dense: Ring = Array.from({ length: 200 }, (_, i) => [i / 10, 0]);

  it("should drop points closer together than the gap, keeping the ends", () => {
    const thin = simplifyRing(dense, 1);
    expect(thin.length).toBeLessThan(dense.length / 5);
    expect(thin[0]).toEqual(dense[0]!);
    expect(thin[thin.length - 1]).toEqual(dense[dense.length - 1]!);
  });

  it("should never shrink a ring below a drawable triangle", () => {
    const tiny: Ring = [
      [0, 0],
      [0.1, 0],
      [0.1, 0.1],
    ];
    expect(simplifyRing(tiny, 5)).toHaveLength(3);
  });
});

describe("keepRing", () => {
  const frame = { width: 600, height: 600 };

  it("should keep a ring that lands inside the frame", () => {
    expect(
      keepRing(
        [
          [10, 10],
          [20, 10],
          [20, 20],
        ],
        frame,
      ),
    ).toBe(true);
  });

  it("should drop a ring that never enters the frame", () => {
    expect(
      keepRing(
        [
          [-900, -900],
          [-880, -900],
          [-880, -880],
        ],
        frame,
      ),
    ).toBe(false);
  });

  it("should drop an antimeridian wrap, which is a streak and not a country", () => {
    expect(
      keepRing(
        [
          [-4000, 300],
          [4000, 300],
          [4000, 320],
        ],
        frame,
      ),
    ).toBe(false);
  });
});

describe("revealOrder", () => {
  it("should build the field lightest to darkest, which is the argument", () => {
    const order = revealOrder([
      { key: "DEU", value: 7 },
      { key: "CHE", value: 3.6 },
      { key: "FRA", value: 4.1 },
    ]);
    expect(order).toEqual(["CHE", "FRA", "DEU"]);
  });

  it("should lay the no-data shapes down first, because absence is not a value", () => {
    const order = revealOrder([
      { key: "DEU", value: 7 },
      { key: "VAT", value: null },
    ]);
    expect(order).toEqual(["VAT", "DEU"]);
  });
});

describe("claimViolations", () => {
  const supported = new Map([
    ["CHE", 3.6],
    ["FRA", 4.1],
    ["DEU", 7.0],
    ["OWID_EUR", 6.5],
  ]);

  it("should say nothing when the title is supported by the source", () => {
    expect(
      claimViolations({
        values: supported,
        subject: "CHE",
        comparison: "OWID_EUR",
        neighbours: ["FRA", "DEU"],
      }),
    ).toEqual([]);
  });

  it("should name the neighbour that is BELOW the subject, because the title says all of them", () => {
    const violations = claimViolations({
      values: new Map([...supported, ["LIE", 3.31]]),
      subject: "CHE",
      comparison: "OWID_EUR",
      neighbours: ["FRA", "DEU", "LIE"],
    });
    expect(violations).toHaveLength(1);
    expect(violations[0]).toContain("LIE");
  });

  it("should name the comparison when the subject is not below it", () => {
    const violations = claimViolations({
      values: new Map([
        ["CHE", 8],
        ["OWID_EUR", 6.5],
      ]),
      subject: "CHE",
      comparison: "OWID_EUR",
      neighbours: [],
    });
    expect(violations[0]).toContain("OWID_EUR");
  });

  it("should refuse to pass silently when a code it was asked about is absent", () => {
    expect(() =>
      claimViolations({
        values: supported,
        subject: "CHE",
        comparison: "OWID_EUR",
        neighbours: ["ITA"],
      }),
    ).toThrow(/ITA/);
  });
});

describe("fr", () => {
  it("should write a decimal the way the newsroom's readers do", () => {
    expect(fr(3.604899, 1)).toBe("3,6");
    expect(fr(13, 0)).toBe("13");
  });
});

describe("the beat's declared no-data set", () => {
  it("should not claim a country the source actually reports", () => {
    expect(CO2_EXPECTED_NO_DATA).not.toContain("CHE");
    expect(CO2_EXPECTED_NO_DATA).not.toContain("KOS");
  });
});
