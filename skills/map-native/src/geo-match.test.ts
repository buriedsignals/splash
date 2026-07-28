import { test, expect } from "bun:test";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { matchGeography } from "./geo-match";

test("an ISO-A3 column matches the world basemap and reports a full join", () => {
  const rows = [
    { country: "CHE", value: "12" },
    { country: "FRA", value: "9" },
    { country: "DEU", value: "7" },
  ];
  const m = matchGeography(["country", "value"], rows);
  expect(m).toBeDefined();
  expect(m!.column).toBe("country");
  expect(m!.basemap).toBe("world");
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
  expect(m!.basemap).toBe("us-states");
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
  expect(m!.basemap).toBe("world");
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
