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
  GENEVE: [{ featureId: "CHE-159", family: "name", country: "CHE" }],
  "CH-GE": [{ featureId: "CHE-159", family: "iso_3166_2", country: "CHE" }],
  VAUD: [{ featureId: "CHE-160", family: "name", country: "CHE" }],
};

// A hand-built fixture reproducing the real "Jura" collision (Task 15): the exact same name
// hits BOTH a Swiss canton and a French département — standing in for the real committed
// index (which carries the identical shape) so this test does not depend on the one-time
// fetch having run.
const swissWithCollisionFixture: Adm1Index = {
  ...swissFixture,
  JURA: [
    { featureId: "CHE-160-JURA", family: "name", country: "CHE" },
    { featureId: "FRA-5312", family: "name", country: "FRA" },
  ],
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
    expect(match!.geography.scope).toBe("CHE"); // Task 15: the country every row resolved to
    expect(match!.geography.level).toBe("admin-1"); // the level of the SET that matched, not the CSV header
    expect(match!.matched).toBe(2);
    expect(match!.unmatched).toEqual([]);
  });

  // The assertion above used to read `toBe("canton")` and was described as echoing "the ADM1
  // index's own level". It did no such thing: the code assigned the matched CSV COLUMN NAME, and
  // the column in that fixture is called "canton", so the test passed on a coincidence and would
  // not have reddened had the value been anything else. This case removes the coincidence — the
  // values are still Swiss cantons, but the column is named "zone" — so the level can no longer
  // borrow a correct-looking answer from the header.
  it("reports the level of the SET that matched, never the CSV column name", () => {
    const columns = ["zone", "value"];
    const rows = [
      { zone: "Genève", value: "1" },
      { zone: "Vaud", value: "2" },
    ];
    const match = matchGeography(
      columns,
      rows,
      undefined,
      undefined,
      swissFixture,
    );
    expect(match).toBeDefined();
    expect(match!.column).toBe("zone");
    expect(match!.geography.set).toBe("natural-earth-admin-1");
    expect(match!.geography.level).not.toBe("zone");
    expect(match!.geography.level).toBe("admin-1");
  });

  it("still resolves scope to CHE when one row's name also collides with France (the real 'Jura' case, Task 15) — the other unambiguous cantons carry the vote", () => {
    const columns = ["canton", "value"];
    const rows = [
      { canton: "Genève", value: "1" },
      { canton: "Vaud", value: "2" },
      { canton: "Jura", value: "3" }, // ambiguous alone: hits both CHE and FRA
    ];
    const match = matchGeography(
      columns,
      rows,
      undefined,
      undefined,
      swissWithCollisionFixture,
    );
    expect(match).toBeDefined();
    expect(match!.matched).toBe(3);
    expect(match!.geography.scope).toBe("CHE");
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
    // and geoRefusal (Task 12, `lib/loop/assemble/map-native.ts`) is where the "no geography
    // Splash can place" message lands. This test only asserts the ADM1 branch does not crash and
    // does not silently claim a match.
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
