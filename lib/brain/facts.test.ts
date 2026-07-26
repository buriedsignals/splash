// lib/brain/facts.test.ts
import { test, expect } from "bun:test";
import { deriveFacts } from "./facts";

test("series and points are the numeric columns, counted the two useful ways", () => {
  const f = deriveFacts({
    columns: ["canton", "2019", "2024"],
    numericColumns: ["2019", "2024"],
    rowCount: 26,
  });
  expect(f.rows).toBe(26);
  expect(f.series).toBe(26); // one series per row for a wide, two-point sheet
  expect(f.points).toBe(2); // one point per numeric column
});
