import { describe, expect, it } from "bun:test";
import {
  CO2_ALIAS,
  CO2_BREAKS,
  CO2_EXPECTED_NO_DATA,
  binIndexLowerInclusive,
  claimViolations,
  fr,
  joinValues,
  keepRing,
  labelPlacementIssues,
  placeValueLabels,
  luminanceOf,
  mixHex,
  pathFromRings,
  revealOrder,
  scalePosition,
  sequentialRamp,
  simplifyRing,
  valuesFromCsv,
  EARTH_CIRCUMFERENCE_KM,
  admittedRatios,
  assertAreaEncodingIsHonest,
  assertStageServesGeography,
  binsCrossedByProjection,
  extentBand,
  groundWidthKm,
  markRadiusCeilingPx,
  mercatorAreaBias,
  nearestNeighbourPx,
  stageBoxFor,
  studyExtentOf,
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

  // The coordinator's own finding, folded in here rather than left for later: `Number("0x1F")` is
  // 31, not a refusal — the exact gotcha `skills/intake/scripts/profile.mjs` already guards against
  // for the profiler's own column typing. A join reading the same shape of csv deserves the same
  // discipline, copied rather than imported.
  it("should refuse a hex-shaped cell instead of silently reading it as a number", () => {
    const hex = "Entity,Code,Year,value\nSwitzerland,CHE,2023,0x1F\n";
    expect(() => valuesFromCsv(hex, 2023)).toThrow(/CHE.*0x1F/);
  });

  it("should read a thousands-grouped cell instead of silently dropping it as no-data", () => {
    const grouped = 'Entity,Code,Year,value\nSwitzerland,CHE,2023,"1,234.5"\n';
    expect(valuesFromCsv(grouped, 2023).get("CHE")).toBeCloseTo(1234.5, 6);
  });

  it("should still treat a genuinely blank cell as absence, not a refusal", () => {
    expect(valuesFromCsv(CSV, 2023).has("NWH")).toBe(false);
  });
});

describe("joinValues", () => {
  const values = valuesFromCsv(CSV, 2023);

  it("should join a country whose shape key differs from its data key, through the alias", () => {
    const joined = joinValues(["CHE", "KOS"], values, {
      alias: CO2_ALIAS,
      expectedNoData: [],
      expectedExtraValues: "any", // this fixture's values map legitimately outruns a 2-key study
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
      expectedExtraValues: "any", // this fixture's values map legitimately outruns a 2-key study
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
      expectedExtraValues: "any", // this fixture's values map legitimately outruns a 3-key study
    });
    expect(joined.matched).toBe(2);
    expect(joined.rows).toHaveLength(3);
  });

  // FINDING 6 (stress test, 2026-08-20): the mirror of the FAIL-LOUD test above. `joinValues`
  // already refused a shape with no value; nothing refused a VALUE with no shape — the stress csv
  // carried a reading for "Atlantis", a country that does not exist, and the join said nothing.
  it("should FAIL LOUD, naming it, when a value finds no shape and nobody declared the source out of scope", () => {
    const withAtlantis = new Map(values);
    withAtlantis.set("ATL", 99);
    expect(() =>
      joinValues(["CHE", "FRA", "OWID_KOS", "OWID_EUR"], withAtlantis, {
        alias: {},
        expectedNoData: [],
      }),
    ).toThrow(/ATL/);
  });

  // THE LEGITIMATE CASE, not just the bug: a source that covers more ground than the study set
  // (OWID's global CO2 csv against a European study, say) has this shape by construction and it is
  // not a defect — `expectedExtraValues: "any"` is the beat's own explicit declaration that it
  // knows its source is broader, told apart from silence by being visible in the call site, not
  // inferred from a count. Without it, the same fixture throws (proven by every earlier test in
  // this describe block, all of which reuse a `values` map wider than their own study set).
  it("should stay quiet on a source that legitimately covers more ground than the study, once declared", () => {
    const withAtlantis = new Map(values);
    withAtlantis.set("ATL", 99);
    const joined = joinValues(["CHE", "FRA"], withAtlantis, {
      alias: {},
      expectedNoData: [],
      expectedExtraValues: "any",
    });
    expect(joined.rows.map((r) => r.key)).toEqual(["CHE", "FRA"]);
  });

  it("should also accept a SHORT, explicit list of extra value keys — not only the whole-source escape", () => {
    const withAtlantis = new Map(values);
    withAtlantis.set("ATL", 99);
    const joined = joinValues(["CHE", "FRA"], withAtlantis, {
      alias: {},
      expectedNoData: [],
      expectedExtraValues: ["OWID_KOS", "OWID_EUR", "ATL"],
    });
    expect(joined.rows.map((r) => r.key)).toEqual(["CHE", "FRA"]);
  });
});

describe("binIndexLowerInclusive", () => {
  it("should put a value in the class its own breaks name", () => {
    expect(binIndexLowerInclusive(0, CO2_BREAKS)).toBe(0);
    expect(binIndexLowerInclusive(3.6, CO2_BREAKS)).toBe(1);
    expect(binIndexLowerInclusive(6.5, CO2_BREAKS)).toBe(3);
    expect(binIndexLowerInclusive(13.04, CO2_BREAKS)).toBe(CO2_BREAKS.length);
  });

  it("should put a value exactly on a break into the class above it", () => {
    expect(binIndexLowerInclusive(4, CO2_BREAKS)).toBe(2);
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
  // The ramp's two ends are ARGUMENTS, not constants inside the function: measured 2026-08-10, the
  // choropleth family ran 0.10–0.78 and the hex family 0.14–0.82 under one shared docstring
  // claiming they were the same construction. These are the choropleth family's own, which is what
  // this seed ships.
  const FROM = 0.1;
  const TO = 0.78;

  it("should darken on a light ground and lighten on a dark one", () => {
    const light = sequentialRamp("#FFFFFF", "#000000", 6, FROM, TO).map(
      luminanceOf,
    );
    const dark = sequentialRamp("#101820", "#FFFFFF", 6, FROM, TO).map(
      luminanceOf,
    );
    expect(light).toEqual([...light].sort((a, b) => b - a));
    expect(dark).toEqual([...dark].sort((a, b) => a - b));
  });

  it("should never render as the bare ground nor as the ink itself", () => {
    const ramp = sequentialRamp("#FFFFFF", "#000000", 6, FROM, TO);
    expect(ramp[0]).not.toBe("#ffffff");
    expect(ramp[ramp.length - 1]).not.toBe("#000000");
  });

  it("should let a beat state ends its own subject needs, and honour them", () => {
    // The hex family's ends. A ramp whose low end is the bare ground is a class a reader cannot
    // see, which is the reason the ends exist at all — and the reason they are stated per beat.
    const hex = sequentialRamp("#FFFFFF", "#1A1A1A", 5, 0.14, 0.82);
    const choropleth = sequentialRamp("#FFFFFF", "#1A1A1A", 5, 0.1, 0.78);
    expect(hex[0]).not.toBe(choropleth[0]);
    expect(hex[0]).toBe("#dfdfdf");
    expect(choropleth[0]).toBe("#e8e8e8");
  });

  it("should separate every step from its neighbour, so two classes never read as one", () => {
    const ramp = sequentialRamp("#FFFFFF", "#000000", 6, FROM, TO).map(
      luminanceOf,
    );
    for (let i = 1; i < ramp.length; i++)
      expect(Math.abs(ramp[i]! - ramp[i - 1]!)).toBeGreaterThan(0.02);
  });

  it("should refuse a ground that is not a hex colour", () => {
    expect(() => sequentialRamp("white", "#000000", 6, FROM, TO)).toThrow(
      /#rrggbb/,
    );
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

  it("should say nothing under a 'most' claim when a strict majority of neighbours are above the subject, even if one is not", () => {
    // The real CO2 case this claim is drawn against: Switzerland below France, Germany, Italy and
    // Austria, but not below Liechtenstein — 4 of 5, a majority, not all.
    const violations = claimViolations({
      values: new Map([...supported, ["LIE", 3.31]]),
      subject: "CHE",
      comparison: "OWID_EUR",
      neighbours: ["FRA", "DEU", "LIE"],
      quorum: "most",
    });
    expect(violations).toEqual([]);
  });

  it("should report a 'most' claim as unsupported when the subject is not below a strict majority of its neighbours", () => {
    const violations = claimViolations({
      values: new Map([
        ["CHE", 5],
        ["FRA", 4], // below the subject
        ["DEU", 4.5], // below the subject
        ["OWID_EUR", 6.5],
      ]),
      subject: "CHE",
      comparison: "OWID_EUR",
      neighbours: ["FRA", "DEU"],
      quorum: "most",
    });
    expect(violations).toHaveLength(1);
    expect(violations[0]).toContain("FRA");
    expect(violations[0]).toContain("DEU");
  });

  it("should still name every individual neighbour below the subject when quorum is 'all' (the default, unchanged)", () => {
    const violations = claimViolations({
      values: new Map([...supported, ["LIE", 3.31]]),
      subject: "CHE",
      comparison: "OWID_EUR",
      neighbours: ["FRA", "DEU", "LIE"],
    });
    expect(violations).toHaveLength(1);
    expect(violations[0]).toContain("LIE");
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

// ── The camera, at any scale ───────────────────────────────────────────────────────────────────
//
// Every number asserted below was READ OFF THE TREE before it was written here — the sixteen
// committed `plate/geometry.json`, and the four beats whose own frozen CSV gives a study extent.
// A test whose expected values came from running the code it tests proves the code agrees with
// itself; these came from the artifacts.

describe("groundWidthKm and extentBand — the six rungs of B4.1", () => {
  // Straight out of the committed geometry files.
  const PLANET = { west: -20, east: 340, north: 78.22313, south: -60.53717 }; // map-quake-density
  const HEMISPHERE = { west: -26, east: 33, north: 68.2186, south: 33.36922 }; // mapgen-choropleth-web
  const CONTINENT = { west: 6.3, east: 30, north: 50.15432, south: 42.53759 }; // mapmore-flow-danube
  const CITY = {
    west: 6.057228,
    east: 6.229172,
    north: 46.2639,
    south: 46.1449,
  }; // mapvid-locator-geneva

  it("should measure ground, not degrees", () => {
    // 59° across Europe is not 59° across the equator, and the render decisions are about ground.
    expect(Math.round(groundWidthKm(HEMISPHERE))).toBe(4152);
    expect(
      Math.round(groundWidthKm({ ...HEMISPHERE, north: 29.5, south: -29.5 })),
    ).toBe(6568);
  });

  it("should put each committed camera on the rung a reader would name", () => {
    expect(extentBand(PLANET)).toBe("planet");
    expect(extentBand(HEMISPHERE)).toBe("hemisphere");
    expect(extentBand(CONTINENT)).toBe("continent");
    expect(extentBand(CITY)).toBe("city");
  });

  it("should place its boundaries at powers of four of the Earth's circumference", () => {
    // The ladder has one anchor and no free parameter: each rung is exactly two zoom levels.
    const atEquator = (km: number) => ({
      west: 0,
      east: (km / EARTH_CIRCUMFERENCE_KM) * 360,
      north: 0.0001,
      south: -0.0001,
    });
    expect(extentBand(atEquator(EARTH_CIRCUMFERENCE_KM / 4 + 1))).toBe(
      "planet",
    );
    expect(extentBand(atEquator(EARTH_CIRCUMFERENCE_KM / 4 - 1))).toBe(
      "hemisphere",
    );
    expect(extentBand(atEquator(EARTH_CIRCUMFERENCE_KM / 64 - 1))).toBe(
      "country",
    );
    expect(extentBand(atEquator(EARTH_CIRCUMFERENCE_KM / 1024 - 1))).toBe(
      "city",
    );
  });
});

describe("admittedRatios — what the fit added, and what it took away", () => {
  it("should report the Geneva locator showing 2.5x the city its claim names", () => {
    // proof/mapvid-locator-geneva: 11 organisations spanning 0.070° x 0.040°, in a frame showing
    // 0.172° x 0.120°. Nothing in the tree recorded this.
    const corners = {
      west: 6.057228,
      east: 6.229172,
      north: 46.2639,
      south: 46.1449,
    };
    const study = {
      west: 6.121882,
      east: 6.191689,
      south: 46.191865,
      north: 46.233535,
    };
    const admitted = admittedRatios(corners, study);
    expect(admitted.lon).toBeCloseTo(2.46, 1);
    expect(admitted.lat).toBeCloseTo(2.86, 1);
  });

  it("should go BELOW one when the frame crops what the study set is about", () => {
    // proof/map-quake-density: the catalogue spans 151.91° of latitude, the frame 138.76°, and the
    // 104 poleward events that fall outside are exactly this ratio's shortfall.
    const corners = { west: -20, east: 340, north: 78.223, south: -60.537 };
    const study = {
      west: -19.7276,
      east: 339.8246,
      north: 86.6053,
      south: -65.3009,
    };
    const admitted = admittedRatios(corners, study);
    expect(admitted.lon).toBeCloseTo(1.0, 2);
    expect(admitted.lat).toBeLessThan(1);
    expect(admitted.lat).toBeCloseTo(0.718, 2);
  });

  it("should compare latitude in Mercator units, not in degrees", () => {
    // Same degree span north and south of the equator is not the same amount of frame. A degree
    // comparison would report 1.00 for both of these; only one of them fills the frame.
    const near = admittedRatios(
      { west: 0, east: 10, north: 5, south: -5 },
      { west: 0, east: 10, north: 5, south: -5 },
    );
    const far = admittedRatios(
      { west: 0, east: 10, north: 65, south: 55 },
      { west: 0, east: 10, north: 60, south: 55 },
    );
    expect(near.lat).toBeCloseTo(1, 3);
    expect(far.lat).toBeGreaterThan(1.9);
  });
});

describe("the world-map-in-portrait limit", () => {
  it("should predict the crop the delivered planet beat actually shows on a phone", () => {
    // proof/mapgen-hexgrid-web at 375x812 draws into a 343x461 canvas and shows 266° of its 359.8°.
    // The model: Web Mercator's world is square, so 343px of width caps the world at 343px of
    // height; a 461px frame is clamped, and shows 360 * 343 / 461 = 267.8°. The 1.8° is the fit's
    // own padding. This is the whole reason a planet beat may not have the full stage height.
    const stage = stageBoxFor(343, 461, 359.8);
    expect(stage.letterboxed).toBe(true);
    expect(stage.height).toBe(343);
    expect(stage.degreesIfForced).toBeCloseTo(267.8, 0);
  });

  it("should letterbox a planet beat in a 1080x1920 portrait export and hand the rest to furniture", () => {
    const stage = stageBoxFor(1080, 1920, 360);
    expect([stage.width, stage.height, stage.spareHeightPx]).toEqual([
      1080, 1080, 840,
    ]);
  });

  it("should leave every narrower geography alone, at every export size", () => {
    // The limit bites only where the frame's aspect exceeds 360/lonSpan — at 1080x1920 that is any
    // study set wider than 202.5°. Europe, the Danube and Geneva are untouched, which is why this
    // rule costs nothing anywhere except the rung it exists for.
    for (const lon of [83, 59, 23.7, 0.137])
      expect(stageBoxFor(1080, 1920, lon).letterboxed).toBe(false);
  });

  it("should refuse with the numbers and the two honest options", () => {
    let message = "";
    try {
      assertStageServesGeography(1080, 1920, 360);
    } catch (error) {
      message = (error as Error).message;
    }
    expect(message).toContain("1080x1080");
    expect(message).toContain("840px");
    expect(message).toContain("202.5°");
    expect(message).toContain("Stretching is not one of them");
  });
});

describe("mercatorAreaBias and binsCrossedByProjection — B4.2's hardest half", () => {
  it("should reproduce the two figures the audit measured by hand", () => {
    expect(
      mercatorAreaBias({ west: 0, east: 1, north: 71.5, south: 34.5 }),
    ).toBeCloseTo(6.75, 2);
    expect(
      mercatorAreaBias({ west: 0, east: 1, north: 78.223, south: -60.537 }),
    ).toBeCloseTo(24.0, 1);
  });

  it("should read a frame straddling the equator against the equator itself", () => {
    // The least-distorted latitude inside such a frame is 0, not the nearer edge — a symmetric
    // frame would otherwise report x1.00 and call Mercator honest at every latitude.
    expect(
      mercatorAreaBias({ west: 0, east: 1, north: 45, south: -45 }),
    ).toBeCloseTo(2.0, 2);
  });

  it("should count how many of the beat's OWN legend bins the projection can move a cell", () => {
    // map-quake-density's published breaks: 51/13 = x3.92, 284/51 = x5.57, 663/284 = x2.33, so the
    // smallest adjacent step is x2.33 and a bias of x24.0 is log(24)/log(2.33) = 3.8 of them.
    const breaks = [13, 51, 284, 663];
    expect(binsCrossedByProjection(24.0, breaks)).toBe(3);
    expect(binsCrossedByProjection(1.32, breaks)).toBe(0);
  });

  it("should let an area encoding ship only if the reader is told", () => {
    const planet = { west: -20, east: 340, north: 78.223, south: -60.537 };
    const breaks = [13, 51, 284, 663];
    expect(() =>
      assertAreaEncodingIsHonest(
        planet,
        breaks,
        "104 of the 14 175 events fall outside the frame",
      ),
    ).toThrow(/24.0x/);
    expect(() =>
      assertAreaEncodingIsHonest(
        planet,
        breaks,
        "Mercator inflates area with latitude: a polar cell covers a twenty-fourth of the ground an equatorial one does",
      ),
    ).not.toThrow();
    // And it costs nothing at the continent rung, where the projection cannot move a cell at all.
    expect(() =>
      assertAreaEncodingIsHonest(
        { west: 8, east: 32, north: 49.4, south: 41.8 },
        breaks,
        "",
      ),
    ).not.toThrow();
  });
});

describe("markRadiusCeilingPx — the size a mark may be at THIS camera", () => {
  it("should be driven by the median gap, never by the one pathological pair", () => {
    // proof/map-geneva-locator: two organisations 0.57px apart on the plate, median gap 12.89px.
    const gaps = nearestNeighbourPx([
      { px: 100, py: 100 },
      { px: 100.4, py: 100.4 },
      { px: 130, py: 100 },
      { px: 100, py: 140 },
      { px: 300, py: 300 },
    ]);
    expect(gaps[0]).toBeCloseTo(0.57, 2);
    expect(
      markRadiusCeilingPx(gaps[Math.floor(gaps.length / 2)]!, 30),
    ).toBeGreaterThan(10);
  });

  it("should say today's continent-extent symbols are 2.3x too big", () => {
    // proof/mapgen-symbol-web: median nearest neighbour 26.06px, typed MAX_RADIUS 30.
    expect(markRadiusCeilingPx(26.06, 30)).toBeCloseTo(13.03, 2);
  });

  it("should never exceed the ceiling the beat already draws at", () => {
    expect(markRadiusCeilingPx(400, 30)).toBe(30);
  });
});

describe("studyExtentOf", () => {
  it("should read a point west of the camera one turn on", () => {
    const extent = studyExtentOf(
      [
        { lon: -170, lat: 10 },
        { lon: 100, lat: -10 },
      ],
      -20,
    );
    expect([extent.west, extent.east]).toEqual([100, 190]);
  });

  it("should refuse to measure nothing", () => {
    expect(() => studyExtentOf([], 0)).toThrow(/camera nobody chose/);
  });
});

// FINDING 10 (stress round three): stress-l-mixed-unit-clinics's own ClinicsMapStill.tsx hand-
// nudged three of its eight value labels ("Belgium and the Netherlands sit close enough at this
// plate's own scale ... that their bbox-centre labels collide; Germany's own centre sits close
// enough to its accent outline to clip against it") in the BEAT's own component. Fixed where
// labels are placed, not per beat: `labelPlacementIssues` measures a collision or a clip,
// `placeValueLabels` avoids both automatically from each label's own preferred anchor.
describe("labelPlacementIssues", () => {
  it("should report no issues when every label clears every other", () => {
    const issues = labelPlacementIssues([
      { key: "A", x: 0, y: 0, width: 20, height: 12 },
      { key: "B", x: 100, y: 100, width: 20, height: 12 },
    ]);
    expect(issues).toEqual([]);
  });

  it("should report a pair of labels whose own boxes overlap", () => {
    // Benelux's own shape: two centroids 8px apart, each label ~28px wide.
    const issues = labelPlacementIssues([
      { key: "NLD", x: 100, y: 100, width: 28, height: 12 },
      { key: "BEL", x: 108, y: 100, width: 28, height: 12 },
    ]);
    expect(issues).toEqual(["NLD/BEL: value labels overlap"]);
  });

  it("should report a label whose own box spills outside the shape it names", () => {
    // Germany's own shape: a small country, a label wider than its own outline.
    const issues = labelPlacementIssues([
      {
        key: "DEU",
        x: 100,
        y: 100,
        width: 40,
        height: 12,
        rings: [
          [
            [90, 95],
            [110, 95],
            [110, 105],
            [90, 105],
            [90, 95],
          ],
        ],
      },
    ]);
    expect(issues).toEqual(["DEU: value label clips its own shape's outline"]);
  });
});

describe("placeValueLabels", () => {
  it("should keep a label at its own preferred anchor when nothing collides", () => {
    const placed = placeValueLabels([
      { key: "A", x: 0, y: 0, width: 20, height: 12 },
      { key: "B", x: 200, y: 200, width: 20, height: 12 },
    ]);
    expect(placed).toEqual([
      { key: "A", x: 0, y: 0 },
      { key: "B", x: 200, y: 200 },
    ]);
  });

  it("should nudge a later label clear of an earlier one placed at the same anchor", () => {
    const placed = placeValueLabels([
      { key: "NLD", x: 100, y: 100, width: 28, height: 12 },
      { key: "BEL", x: 108, y: 100, width: 28, height: 12 },
    ]);
    expect(
      labelPlacementIssues(
        placed.map((p, i) => ({ ...p, width: 28, height: 12 })),
      ),
    ).toEqual([]);
    // The first label placed never moves for one placed after it.
    expect(placed[0]).toEqual({ key: "NLD", x: 100, y: 100 });
  });

  it("should never throw, even when a label cannot clear every candidate", () => {
    // Three centroids stacked on the exact same point — no ring of offsets clears all three
    // pairwise, and the function still returns one placement per label rather than refusing.
    const placed = placeValueLabels([
      { key: "A", x: 0, y: 0, width: 200, height: 200 },
      { key: "B", x: 0, y: 0, width: 200, height: 200 },
      { key: "C", x: 0, y: 0, width: 200, height: 200 },
    ]);
    expect(placed.map((p) => p.key)).toEqual(["A", "B", "C"]);
  });
});

/**
 * THE MUTATIONS THAT REDDEN THE CAMERA HALF, run in a copy under /tmp on 2026-08-11, never here.
 * Baseline in the copy: 58 pass, 0 fail.
 *
 *   M4  `maxStageHeightPx` loses Web Mercator's square — `frameWidthPx * 360` -> `* 180`, which is
 *       what someone would write if they thought the world's height were half a turn of longitude:
 *         (fail) should predict the crop the delivered planet beat actually shows on a phone
 *         (fail) should letterbox a planet beat in a 1080x1920 portrait export …
 *         (fail) should refuse with the numbers and the two honest options
 *          55 pass · 3 fail
 *
 *   M5  the mark ceiling driven by the MINIMUM nearest-neighbour gap instead of the median — the
 *       obvious reading of "no two marks overlap", and the one that collapses a whole city map
 *       because two organisations share a building:
 *         Expected: > 10   Received: 0.28284271247462306
 *         (fail) should be driven by the median gap, never by the one pathological pair
 *          57 pass · 1 fail
 *
 *   M6  `mercatorAreaBias` compares the frame's two edges instead of its worst edge against its
 *       least-distorted latitude, so a frame straddling the equator reports x1.00:
 *         (fail) should reproduce the two figures the audit measured by hand
 *         (fail) should read a frame straddling the equator against the equator itself
 *         (fail) should let an area encoding ship only if the reader is told
 *          55 pass · 3 fail
 */
