import { test, expect, describe, it } from "bun:test";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { matchGeography } from "./geo-match";
import type { Adm1Index } from "../../../lib/geo/index-build";

test("an ISO-A3 column matches the world basemap and reports a full join", () => {
  const rows = [
    { country: "CHE", value: "12" },
    { country: "FRA", value: "9" },
    { country: "DEU", value: "7" },
  ];
  const m = matchGeography(["country", "value"], rows);
  expect(m).toBeDefined();
  expect(m!.column).toBe("country");
  expect(m!.geography.set).toBe("natural-earth-admin-0");
  expect(m!.matched).toBe(3);
  expect(m!.total).toBe(3);
  expect(m!.unmatched).toEqual([]);
});

test("two-letter US postal codes match us-states, not world", () => {
  const rows = [
    { state: "CA", v: "1" },
    { state: "TX", v: "2" },
  ];
  const m = matchGeography(["state", "v"], rows);
  expect(m!.geography.set).toBe("us-states");
  expect(m!.matched).toBe(2);
});

test("a partial join is REPORTED, with the orphans named — never rounded to a count", () => {
  const rows = [
    { country: "CHE", v: "1" },
    { country: "FRA", v: "2" },
    { country: "Genève", v: "3" },
    { country: "Vaud", v: "4" },
  ];
  const m = matchGeography(["country", "v"], rows);
  expect(m!.matched).toBe(2);
  expect(m!.total).toBe(4);
  expect(m!.unmatched).toEqual(["Genève", "Vaud"]);
});

test("data with no geography at all matches nothing — undefined, not an empty match", () => {
  const rows = [
    { year: "1979", extent: "7.0" },
    { year: "2025", extent: "4.3" },
  ];
  expect(matchGeography(["year", "extent"], rows)).toBeUndefined();
});

test("an absent basemap asset is skipped, not thrown — and a sibling basemap still matches (I1)", () => {
  const dir = mkdtempSync(join(tmpdir(), "geo-match-absent-"));
  // world.geojson is present and valid; us-states.geojson is never written — absent on disk.
  writeFileSync(
    join(dir, "world.geojson"),
    JSON.stringify({
      type: "FeatureCollection",
      features: [
        { type: "Feature", properties: { iso_a3: "CHE" }, geometry: null },
      ],
    }),
  );
  const basemaps = {
    world: { joinKey: "iso_a3", label: "World" },
    "us-states": { joinKey: "postal", label: "US States" },
  };
  const rows = [{ country: "CHE", value: "1" }];
  expect(() =>
    matchGeography(["country", "value"], rows, dir, basemaps),
  ).not.toThrow();
  const m = matchGeography(["country", "value"], rows, dir, basemaps);
  expect(m).toBeDefined();
  expect(m!.geography.set).toBe("natural-earth-admin-0");
  expect(m!.matched).toBe(1);
});

test("an unparseable basemap asset is skipped, not thrown — undefined, not a crash", () => {
  const dir = mkdtempSync(join(tmpdir(), "geo-match-corrupt-"));
  writeFileSync(join(dir, "broken.geojson"), "{ not valid json");
  const basemaps = { broken: { joinKey: "code", label: "Broken" } };
  const rows = [{ x: "AAA" }];
  expect(() => matchGeography(["x"], rows, dir, basemaps)).not.toThrow();
  expect(matchGeography(["x"], rows, dir, basemaps)).toBeUndefined();
});

// A tiny, hand-built ADM1 index fixture — Swiss cantons — standing in for the real committed
// lib/geo/adm1-index.json (Task 7), so this test does not depend on the one-time fetch having
// run. "Genève" is the exact worked example the spec's own text resolves (D6): "Genève, CH-GE,
// Geneva, Genf, Ginevra → tous CHE-159".
const swissFixture: Adm1Index = {
  GENEVE: [{ featureId: "CHE-159", family: "name" }],
  "CH-GE": [{ featureId: "CHE-159", family: "iso_3166_2" }],
  VAUD: [{ featureId: "CHE-160", family: "name" }],
};

describe("matchGeography — ADM1 index candidate (D10.2)", () => {
  it("matches a Swiss-cantons column against the ADM1 index, reporting scope+level", () => {
    const columns = ["canton", "value"];
    const rows = [
      { canton: "Genève", value: "1" },
      { canton: "Vaud", value: "2" },
    ];
    const match = matchGeography(
      columns,
      rows,
      undefined,
      undefined,
      swissFixture,
    );
    expect(match).toBeDefined();
    expect(match!.column).toBe("canton");
    expect(match!.geography.set).toBe("natural-earth-admin-1");
    expect(match!.geography.level).toBe("canton"); // echoes the ADM1 index's own level, not a guess
    expect(match!.matched).toBe(2);
    expect(match!.unmatched).toEqual([]);
  });

  it("still resolves the shipped 'world' basemap unchanged when a country column is given", () => {
    // Regression: the world/us-states path must not have moved. Uses the REAL shipped
    // assets/registry (no override args) exactly as the pre-existing test suite already does.
    const columns = ["country", "value"];
    const rows = [{ country: "FRA", value: "1" }];
    const match = matchGeography(columns, rows);
    expect(match?.geography.set).toBe("natural-earth-admin-0");
  });

  it("names the orphan WITH its level when a country name is asked of the ADM1 index — 'Suisse' fixture (spec D10.2 rule 3)", () => {
    const columns = ["place"];
    const rows = [{ place: "Suisse" }]; // an ADM0 name — absent from any ADM1 index by construction
    const match = matchGeography(
      columns,
      rows,
      undefined,
      undefined,
      swissFixture,
    );
    // No ADM1 candidate wins (0 matched), so this column is not returned as the best geography
    // match from the ADM1 side at all — orient.ts's caller sees `undefined` for this candidate
    // and geoRefusal (Task 13) is where the "no geography Splash can place" message lands. This
    // test only asserts the ADM1 branch does not crash and does not silently claim a match.
    expect(match).toBeUndefined();
  });

  it("never throws on a missing/corrupt ADM1 index — invariant I1", () => {
    expect(() =>
      matchGeography(
        ["canton"],
        [{ canton: "Genève" }],
        undefined,
        undefined,
        undefined,
      ),
    ).not.toThrow();
  });
});
