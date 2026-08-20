// FINDING 8: nothing challenged a framing that did not serve the point. `framingMeasurement`
// is not a guard — it never throws — it is the reading `static-discipline.md`'s own
// `framing-serves-the-point` discipline asks an author to look at BEFORE deciding how to draw:
// how much of the plot's own extent the takeaway's values actually occupy, and how far the
// largest value sits above the middle of the group. Both numbers, always, printed by the beat's
// own render.mjs — never a refusal.
import { describe, it, expect } from "bun:test";
import { framingMeasurement } from "../scripts/render-still.mjs";

describe("framingMeasurement", () => {
  it("reproduces stories/stress-c-vacant-homes: a real fall, nearly invisible on its own zero baseline", () => {
    // 2019..2022, 8.4 -> 8.1 -> 7.6 -> 7.2. Falls every year, and the fall is 14% of the
    // 0-8.4 extent it is about to be drawn on — this is the "spread invisible" shape.
    const m = framingMeasurement([8.4, 8.1, 7.6, 7.2]);
    expect(m.max).toBe(8.4);
    expect(m.min).toBe(7.2);
    expect(m.spreadAgainstExtent).toBeCloseTo(1.2 / 8.4, 5);
    expect(m.spreadAgainstExtent).toBeLessThan(0.2);
    // Not an outlier problem: the largest reading is barely above the middle of its own group.
    expect(m.largestAgainstMedian).toBeCloseTo(8.4 / 7.85, 5);
    expect(m.largestAgainstMedian).toBeLessThan(1.2);
  });

  it("reproduces stories/stress-a-energy-bills: one mark dwarfing the rest", () => {
    // Germany 1234.5, France 987.25, Spain 712.0, Denmark 48210.75, Netherlands 1102.4 (Italy
    // and Poland report no price and are excluded — there is nothing to measure a null against).
    const m = framingMeasurement([1234.5, 987.25, 712.0, 48210.75, 1102.4]);
    expect(m.max).toBe(48210.75);
    const median = 1102.4;
    expect(m.largestAgainstMedian).toBeCloseTo(48210.75 / median, 5);
    expect(m.largestAgainstMedian).toBeGreaterThan(10);
    // The spread against the zero-based extent is large here too — Denmark's own bar reaches
    // nearly the full height of the plot, which is the opposite shape from stress-c.
    expect(m.spreadAgainstExtent).toBeGreaterThan(0.9);
  });

  it("computes the median on an even-length series as the mean of the two middle values", () => {
    const m = framingMeasurement([1, 2, 3, 4]);
    expect(m.median).toBe(2.5);
  });

  it("ignores non-finite values rather than letting one poison the reading", () => {
    const m = framingMeasurement([10, NaN, 20, Infinity, 30]);
    expect(m.max).toBe(30);
    expect(m.median).toBe(20);
  });

  it("returns null rather than dividing by zero when every value is zero", () => {
    const m = framingMeasurement([0, 0, 0]);
    expect(m.spreadAgainstExtent).toBeNull();
    expect(m.largestAgainstMedian).toBeNull();
  });

  it("returns null for an empty series instead of throwing", () => {
    expect(framingMeasurement([])).toBeNull();
  });
});
