import { test, expect } from "bun:test";
import { profileCsv } from "./profile";

test("profileCsv finds numeric columns and row count", () => {
  const p = profileCsv("canton,2015,2024\nGenève,449,583\nVaud,412,531");
  expect(p.columns).toEqual(["canton", "2015", "2024"]);
  expect(p.numericColumns).toEqual(["2015", "2024"]);
  expect(p.rowCount).toBe(2);
});

test("profileCsv treats a column with any non-number as non-numeric", () => {
  const p = profileCsv("name,note\nA,ok\nB,12");
  expect(p.numericColumns).toEqual([]);
});
