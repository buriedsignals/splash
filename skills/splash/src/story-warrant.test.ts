import { describe, it, expect } from "bun:test";
import { assessStoryArc } from "./story-warrant";

describe("assessStoryArc (design heuristic — not credited literature)", () => {
  it("line with a clear directional trend HAS an arc", () => {
    expect(
      assessStoryArc({ type: "line", values: [1, 2, 4, 7, 11, 16] }).hasArc,
    ).toBe(true);
  });
  it("line that is flat noise has NO arc", () => {
    expect(
      assessStoryArc({ type: "line", values: [5, 5.1, 4.9, 5, 5.05, 4.95] })
        .hasArc,
    ).toBe(false);
  });
  it("line with a clear single turn (up then down) HAS an arc", () => {
    expect(
      assessStoryArc({ type: "line", values: [1, 4, 9, 4, 1] }).hasArc,
    ).toBe(true);
  });
  it("bar with a detached leader / tail (real spread) HAS an arc", () => {
    expect(
      assessStoryArc({ type: "bar", values: [100, 20, 12, 8, 3] }).hasArc,
    ).toBe(true);
  });
  it("bar that is a flat ranking has NO arc", () => {
    expect(
      assessStoryArc({ type: "bar", values: [50, 49, 48, 47, 46] }).hasArc,
    ).toBe(false);
  });
  it("scatter with strong correlation HAS an arc", () => {
    expect(
      assessStoryArc({
        type: "scatter",
        values: [1, 2, 3, 4, 5, 6],
        ys: [2, 4, 6, 8, 10, 12],
      }).hasArc,
    ).toBe(true);
  });
  it("uncorrelated scatter has NO arc", () => {
    expect(
      assessStoryArc({
        type: "scatter",
        values: [1, 2, 3, 4, 5, 6],
        ys: [5, 1, 6, 2, 4, 3],
      }).hasArc,
    ).toBe(false);
  });
  it("degenerate (n<3) has no arc, no throw", () => {
    expect(assessStoryArc({ type: "line", values: [1, 2] }).hasArc).toBe(false);
  });
  it("every result carries a human reason", () => {
    expect(
      assessStoryArc({ type: "bar", values: [50, 49, 48] }).reason.length,
    ).toBeGreaterThan(0);
  });
});
