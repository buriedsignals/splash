import { test, expect } from "bun:test";
import { orient } from "./orient";

test("orient supports the point when the data has numeric columns and rows", () => {
  const r = orient("canton,2015,2024\nGenève,449,583");
  expect(r.supportsPoint).toBe(true);
  expect(r.profile.numericColumns).toEqual(["2015", "2024"]);
});

test("orient refuses honestly when there is no numeric data (no fabrication)", () => {
  const r = orient("name,quote\nA,hello\nB,world");
  expect(r.supportsPoint).toBe(false);
  expect(r.note).toContain("figures");
});

test("orient refuses when the data has a header but no rows", () => {
  const r = orient("canton,2015,2024");
  expect(r.supportsPoint).toBe(false);
  expect(r.note).toContain("rows");
});

test("orient reports the geography when the data carries one, and stays silent when it does not", () => {
  const geoRun = orient("country,value\nCHE,12\nFRA,9");
  expect(geoRun.geo?.geography.set).toBe("natural-earth-admin-0");
  expect(geoRun.geo?.column).toBe("country");
  const timeSeries = orient("year,extent\n1979,7.0\n2025,4.3");
  expect(timeSeries.geo).toBeUndefined();
});
