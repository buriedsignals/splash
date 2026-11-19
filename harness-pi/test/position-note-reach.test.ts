// gx-slope-slopegraph video, Qwen (mvq151, 2026-11-19): with sixteen lines crossing the field, the compare's note and
// France's name note found their first free spot low-left in the plot, far below the lines they speak of, and
// France's note was set in the accent ink though France was not the accent.
import { describe, expect, it } from "bun:test";
import { placeNotes } from "../craft/_shared/gesture-family-position.mjs";

const text = { lead: () => 14, measure: (t: string) => String(t).length * 7 };
const frame = { x: 0, y: 0, width: 600, height: 600 };
const crowded = () => ({
  prims: [{ kind: "rect", x: 0, y: 100, width: 600, height: 230, o: 1 }],
  anchors: new Map([["France", { x: 300, y: 200, top: 200, side: "above" }]]),
  plot: frame,
});

describe("a position note with no free spot near its row", () => {
  it("should go to the note line rather than a spot far from its row", () => {
    const placed = placeNotes({ scene: crowded(), notes: [{ index: 0, marks: ["France"], text: "90,7 en 2000" }], text, frame });
    expect(placed.under.length).toBe(1);
  });
});

describe("a position note on a row that is not the accent", () => {
  it("should be set in the ink, not the accent", () => {
    const scene = { prims: [], anchors: new Map([["France", { x: 300, y: 300, top: 300, side: "above" }]]), plot: frame };
    placeNotes({ scene, notes: [{ index: 0, marks: ["France"], text: "90,7 en 2000", role: "ink" }], text, frame });
    expect(scene.prims.find((p: any) => p.id === "note-0-0")?.role).toBe("ink");
  });
});
