import { describe, expect, it } from "bun:test";
import * as floorModule from "../craft/_shared/time-row-floor.mjs";

const { bumpRowFloor } = floorModule as any;

// A 375 px phone drew gx-bump's ten ranks in ~80 px (2026-11-19): the end names printed over each other, though the
// kit spreads them for a plot of 240 px. A rank is a row, a LENGTH that may follow the stretch, so it takes a floor.
describe("bumpRowFloor", () => {
  it("should hold a bump's ranks at one name's height each", () => {
    expect(bumpRowFloor({ variant: "bump-ranking-over-time", domain: [10, 1], height: 400, px: 17.4 })).toMatchObject({ rows: 9, pitch: 400 / 9, px: 18 });
  });
  it("should declare nothing for a series whose vertical is a value", () => {
    expect(bumpRowFloor({ variant: "line", domain: [0, 100], height: 400, px: 17 })).toBeNull();
  });
});
