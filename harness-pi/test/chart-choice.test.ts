import { describe, expect, it } from "bun:test";
import { FAMILIES, familyFor, readNeeds, resolveNeed } from "../src/chart-choice.ts";

describe("familyFor", () => {
  it("should read a comparison between places as location", () => {
    expect(familyFor("Comparison between places.")).toBe("location");
  });
  it("should read a change in two measures as a relationship", () => {
    expect(familyFor("Change in two measures.")).toBe("relationship between measures");
  });
  it("should read the French answer with its accent", () => {
    expect(familyFor("Évolution dans le temps.")).toBe("change over time");
  });
  it("should name no family when the answer names none", () => {
    expect(familyFor("I don't know.")).toBeUndefined();
  });
  it("should hold a map slot to location whatever the words", () => {
    expect(familyFor("Comparison between categories.", "map")).toBe("location");
  });
});

describe("readNeeds", () => {
  it("should read every need of chart-choice.md with a table of at least two types", () => {
    const needs = readNeeds();
    expect([needs.length, needs.every((n) => n.rows.length >= 2)]).toEqual([20, true]);
  });
  it("should place every need in at least one family", () => {
    const placed = new Set(Object.values(FAMILIES).flat());
    expect(readNeeds().map((_, i) => placed.has(i + 1)).every(Boolean)).toBe(true);
  });
});

describe("resolveNeed", () => {
  it("should accept the need's own words as well as its number", () => {
    expect(resolveNeed("change over time", "2. compare before and after")?.title).toBe("compare before and after");
  });
  // stress-p on the 12B (2026-11-20) wrote the story into need, twice, after being told to give the number.
  it("should read a sentence about the story as the need its words name", () => {
    expect(resolveNeed("comparison between categories", "compare Lisboa (214M), Porto (96M), and the other cities (totaling 394M) to show Lisboa's dominance.")?.title).toBe("rank or compare one value per category");
  });
  it("should name no need when the sentence names none of them", () => {
    expect(resolveNeed("comparison between categories", "Lisboa is big.")).toBeUndefined();
  });
  // r8 road deaths on the 12B (2026-11-20) pasted the whole menu as need: that is no decision.
  it("should name no need when the pick lists several of them", () => {
    expect(resolveNeed("change over time", "show a measured trend over time; compare before and after; show rank changing over time")).toBeUndefined();
  });
});
