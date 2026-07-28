import { test, expect } from "bun:test";
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
