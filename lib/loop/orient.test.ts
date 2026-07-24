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
