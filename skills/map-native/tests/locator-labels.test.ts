import { describe, it, expect } from "bun:test";
import {
  placeLabels,
  labelRadialOffset,
  type LabelBox,
} from "../src/locator-labels";

const box = (key: string, x: number, y: number, priority = 0): LabelBox => ({
  key,
  x,
  y,
  w: 40,
  h: 12,
  priority,
});

describe("placeLabels", () => {
  it("shows all when nothing overlaps", () => {
    const r = placeLabels([
      box("a", 0, 0),
      box("b", 100, 100),
      box("c", 200, 0),
    ]);
    expect(r.shown.sort()).toEqual(["a", "b", "c"]);
    expect(r.hidden).toEqual([]);
  });

  it("hides the lower-priority label of an overlapping pair", () => {
    const r = placeLabels([box("low", 0, 0, 1), box("high", 10, 0, 5)]);
    expect(r.shown).toEqual(["high"]);
    expect(r.hidden).toEqual(["low"]);
  });

  it("breaks priority ties deterministically by key", () => {
    const r = placeLabels([box("b", 0, 0, 3), box("a", 5, 0, 3)]);
    expect(r.shown).toEqual(["a"]); // same priority → "a" wins the tie
    expect(r.hidden).toEqual(["b"]);
  });

  it("is deterministic across input order", () => {
    const a = placeLabels([
      box("a", 0, 0, 1),
      box("b", 10, 0, 5),
      box("c", 300, 0, 2),
    ]);
    const b = placeLabels([
      box("c", 300, 0, 2),
      box("a", 0, 0, 1),
      box("b", 10, 0, 5),
    ]);
    expect(a).toEqual(b);
  });

  it("never leaves two shown boxes overlapping", () => {
    const boxes = [box("a", 0, 0, 1), box("b", 5, 5, 2), box("c", 8, 2, 3)];
    const { shown } = placeLabels(boxes);
    const byKey = Object.fromEntries(boxes.map((b) => [b.key, b]));
    for (let i = 0; i < shown.length; i++)
      for (let j = i + 1; j < shown.length; j++) {
        const p = byKey[shown[i]],
          q = byKey[shown[j]];
        const overlap =
          p.x < q.x + q.w &&
          p.x + p.w > q.x &&
          p.y < q.y + q.h &&
          p.y + p.h > q.y;
        expect(overlap).toBe(false);
      }
  });
});

describe("labelRadialOffset", () => {
  it("places the label just outside the marker radius, in ems", () => {
    expect(labelRadialOffset(10, 12, 6)).toBeCloseTo((10 + 6) / 12, 5);
  });
});
