import { describe, it, expect } from "bun:test";
import { classifyNarrativePattern } from "../src/narrative-pattern";

describe("classifyNarrativePattern", () => {
  it("honours an explicit temporal hint over everything else", () => {
    expect(
      classifyNarrativePattern({
        hint: "temporal",
        fieldName: "rate",
        values: [12, 45, 88],
      }),
    ).toBe("temporal");
  });

  it("honours an explicit magnitude hint even for a year-named field", () => {
    expect(
      classifyNarrativePattern({
        hint: "magnitude",
        fieldName: "year",
        values: [2001, 2010, 2025],
      }),
    ).toBe("magnitude");
  });

  it("honours an explicit categorical hint", () => {
    expect(
      classifyNarrativePattern({
        hint: "categorical",
        fieldName: "region",
        values: [1, 2, 3],
      }),
    ).toBe("categorical");
  });

  it("ignores an unknown hint string and falls back to inference", () => {
    expect(
      classifyNarrativePattern({
        hint: "nonsense",
        fieldName: "year",
        values: [2001, 2025],
      }),
    ).toBe("temporal");
  });

  it("infers temporal from a 'year' field name", () => {
    expect(
      classifyNarrativePattern({ fieldName: "year", values: [2001, 2025] }),
    ).toBe("temporal");
  });

  it("infers temporal from a 'date' field name", () => {
    expect(
      classifyNarrativePattern({
        fieldName: "enacted_date",
        values: [1, 5, 9],
      }),
    ).toBe("temporal");
  });

  it("infers temporal from values that look like calendar years even without a temporal name", () => {
    expect(
      classifyNarrativePattern({
        fieldName: "value",
        values: [2001, 2003, 2015, 2025],
      }),
    ).toBe("temporal");
  });

  it("does NOT read a rate/percentage as temporal (magnitude)", () => {
    expect(
      classifyNarrativePattern({
        fieldName: "renewable_share",
        values: [12, 45, 88, 99],
      }),
    ).toBe("magnitude");
  });

  it("does NOT match 'layer' or 'yearning' as a temporal name", () => {
    expect(
      classifyNarrativePattern({ fieldName: "layer", values: [12, 45] }),
    ).toBe("magnitude");
  });

  it("defaults to magnitude when nothing signals temporal (no regression)", () => {
    expect(
      classifyNarrativePattern({ fieldName: "count", values: [3, 400, 9000] }),
    ).toBe("magnitude");
  });
});
