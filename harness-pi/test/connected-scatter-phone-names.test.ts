import { describe, expect, it } from "bun:test";
// @ts-expect-error untyped module
import { nameTop } from "../craft/web/connected-scatter/phone-names.mjs";

// "Austria" printed over the x-axis ticks at 375 × 812 (gx-connected-scatter, 2026-11-19): a name set below a point
// near the floor ran 1.35 lines past it, and on a phone those lines are a large share of the plot.
describe("nameTop", () => {
  it("should hold a name set below its point inside the plot's bottom edge", () => {
    expect(nameTop(98, true, 20)).toBe("min(98%, calc(100% - 27px))");
  });
  it("should leave a name set above its point where the de-collision put it", () => {
    expect(nameTop(98, false, 20)).toBe("98%");
  });
});
