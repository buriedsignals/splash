// The 12B's six-country marimekko drew no "Switzerland" under its last, narrow column at any width: the label had
// to clear the frame's edge while centred on a column 30 units from it. Clamped inside the frame, it only has to
// clear its neighbours.
import { describe, expect, it } from "bun:test";
import { placeColumnLabels } from "../craft/_shared/part-axis-labels.mjs";

const W = 1000;
const columns = [
  { k: "France", cx: 200, lw: 70 },
  { k: "Norway", cx: 900, lw: 70 },
  { k: "Switzerland", cx: 985, lw: 80 },
];
const placed = placeColumnLabels(columns, W, ["France", "Norway", "Switzerland"], 4);

describe("placeColumnLabels", () => {
  it("should show a label beside the frame's edge at the frame's own width", () => {
    expect(placed.get("Switzerland")!.need).toBeLessThanOrEqual(W);
  });
  it("should put two close labels on different rows", () => {
    expect(placed.get("Switzerland")!.row).not.toBe(placed.get("Norway")!.row);
  });
});
