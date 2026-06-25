import { describe, it, expect } from "bun:test";
import { layoutLegend } from "../src/core/legend";

const colors = ["#000000", "#E69F00", "#56B4E9", "#009E73"];

describe("core/legend — the shared wrapping chip legend (global invariant)", () => {
  it("keeps every item on one row when there is room", () => {
    const { items, rows } = layoutLegend(
      ["A", "B", "C"],
      colors,
      1000,
      0,
      0,
      7,
      22,
    );
    expect(rows).toBe(1);
    expect(items).toHaveLength(3);
    expect(new Set(items.map((i) => i.y)).size).toBe(1); // all same y
  });

  it("wraps to a new row when the width runs out", () => {
    const { rows } = layoutLegend(
      ["Coal", "Gas", "Hydro", "Renewables"],
      colors,
      120, // narrow → must wrap
      0,
      0,
      7,
      22,
    );
    expect(rows).toBeGreaterThan(1);
  });

  it("assigns each series its colour by index", () => {
    const { items } = layoutLegend(["A", "B"], colors, 1000, 0, 0, 7, 22);
    expect(items[0].color).toBe(colors[0]);
    expect(items[1].color).toBe(colors[1]);
  });

  it("items never start left of x0", () => {
    const { items } = layoutLegend(
      ["Coal", "Gas", "Hydro", "Renewables"],
      colors,
      120,
      10,
      0,
      7,
      22,
    );
    for (const it of items) expect(it.x).toBeGreaterThanOrEqual(10);
  });
});
