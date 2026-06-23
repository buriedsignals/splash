import { describe, it, expect } from "bun:test";
import { dataShape } from "../src/csv";

describe("dataShape", () => {
  it("counts columns and data rows", () => {
    const s = dataShape("year,value\n2018,5\n2019,6\n");
    expect(s.columns).toEqual(["year", "value"]);
    expect(s.rows).toBe(2);
  });
  it("handles a trailing newline and multiple value columns", () => {
    const s = dataShape("year,A,B,C\n2018,1,2,3");
    expect(s.columns).toEqual(["year", "A", "B", "C"]);
    expect(s.rows).toBe(1);
  });
});
