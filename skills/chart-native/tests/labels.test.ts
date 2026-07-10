// Guards the GLOBAL label invariant: placeLabels never returns a label that
// leaves the bounds or overlaps a mark/another label. This is the enforcement
// the user asked for — a future overflow fails here, not just on the eye.
import { describe, it, expect } from "bun:test";
import {
  placeLabels,
  withinBounds,
  overlaps,
  type Box,
  type PlaceCandidate,
} from "../src/core/labels";

const bounds: Box = { x0: 0, x1: 600, y0: 0, y1: 400 };
const charW = 8;
const lh = 18;
const padX = 3;

// re-derive a placed label's box the same way placeLabels does
function placedBox(p: {
  x: number;
  y: number;
  anchor: "start" | "middle" | "end";
  text: string;
}): Box {
  const w = p.text.length * charW + padX * 2;
  const x0 =
    p.anchor === "start" ? p.x : p.anchor === "end" ? p.x - w : p.x - w / 2;
  return { x0, x1: x0 + w, y0: p.y - lh / 2, y1: p.y + lh / 2 };
}

describe("withinBounds / overlaps", () => {
  it("withinBounds is true only when fully inside", () => {
    expect(withinBounds({ x0: 10, x1: 50, y0: 10, y1: 28 }, bounds)).toBe(true);
    expect(withinBounds({ x0: -1, x1: 50, y0: 10, y1: 28 }, bounds)).toBe(
      false,
    );
    expect(withinBounds({ x0: 580, x1: 620, y0: 10, y1: 28 }, bounds)).toBe(
      false,
    );
  });
  it("overlaps detects intersection, not mere touching order", () => {
    expect(
      overlaps(
        { x0: 0, x1: 10, y0: 0, y1: 10 },
        { x0: 5, x1: 15, y0: 5, y1: 15 },
      ),
    ).toBe(true);
    expect(
      overlaps(
        { x0: 0, x1: 10, y0: 0, y1: 10 },
        { x0: 20, x1: 30, y0: 0, y1: 10 },
      ),
    ).toBe(false);
  });
});

describe("placeLabels — the in-bounds + no-overlap invariant ALWAYS holds", () => {
  // a spread of points incl. ones jammed against every edge
  const cands: PlaceCandidate[] = [
    { id: "mid", text: "Middle", ax: 300, ay: 200, r: 6, priority: 5 },
    { id: "right", text: "RightEdgeName", ax: 596, ay: 200, r: 6, priority: 4 },
    { id: "left", text: "LeftEdgeName", ax: 4, ay: 200, r: 6, priority: 3 },
    { id: "top", text: "TopName", ax: 300, ay: 4, r: 6, priority: 2 },
    { id: "bottom", text: "BottomName", ax: 300, ay: 396, r: 6, priority: 1 },
  ];
  const marks: Box[] = cands.map((c) => ({
    x0: c.ax - c.r,
    x1: c.ax + c.r,
    y0: c.ay - c.r,
    y1: c.ay + c.r,
  }));
  const placed = placeLabels(cands, marks, { bounds, charW, lh, padX });

  it("every placed label is fully inside the bounds", () => {
    for (const p of placed) {
      const text = String(cands.find((c) => c.id === p.id)!.text);
      expect(withinBounds(placedBox({ ...p, text }), bounds)).toBe(true);
    }
  });

  it("no placed label overlaps a mark or another placed label", () => {
    const boxes = placed.map((p) =>
      placedBox({ ...p, text: String(cands.find((c) => c.id === p.id)!.text) }),
    );
    for (const b of boxes)
      for (const m of marks) expect(overlaps(b, m)).toBe(false);
    for (let i = 0; i < boxes.length; i++)
      for (let j = i + 1; j < boxes.length; j++)
        expect(overlaps(boxes[i], boxes[j])).toBe(false);
  });

  it("skips a label that cannot be placed cleanly (fewer-but-readable)", () => {
    // a label far too wide for the bounds at a corner → unplaceable → dropped
    const huge: PlaceCandidate[] = [
      { id: "x", text: "A".repeat(120), ax: 596, ay: 396, r: 6, priority: 1 },
    ];
    expect(placeLabels(huge, [], { bounds, charW, lh, padX })).toHaveLength(0);
  });

  it("NEVER drops a REQUIRED label — offset over drop when every clean spot is blocked", () => {
    // one anchor mid-plot; marks blanket every adjacent label spot so NO clean (no-
    // overlap) position exists. A default label is dropped (fewer-but-readable); a
    // required one (an explicitly-requested highlight) is placed anyway, in-bounds.
    const anchor = { ax: 300, ay: 200, r: 6 };
    const marks: Box[] = [
      { x0: 200, x1: 400, y0: 180, y1: 220 }, // blocks the left/right horizontal spots
      { x0: 260, x1: 340, y0: 120, y1: 280 }, // blocks the above/below vertical spots
    ];
    // baseline: without `required`, the contended label is dropped
    const dropped = placeLabels(
      [{ id: "x", text: "Highlight", ...anchor, priority: 1 }],
      marks,
      { bounds, charW, lh, padX },
    );
    expect(dropped).toHaveLength(0);
    // with `required`, it survives (offset onto an overlapping-but-in-bounds spot)
    const placed = placeLabels(
      [{ id: "x", text: "Highlight", ...anchor, priority: 1, required: true }],
      marks,
      { bounds, charW, lh, padX },
    );
    expect(placed).toHaveLength(1);
    expect(placed[0].id).toBe("x");
    expect(
      withinBounds(placedBox({ ...placed[0], text: "Highlight" }), bounds),
    ).toBe(true);
  });

  it("places ALL required labels even when they contend for the same crowded anchor", () => {
    // three requested highlights stacked on nearly the same point — none may be dropped
    // (the scatter 3-highlight case: Japan/Qatar/Nigeria all requested).
    const crowded: PlaceCandidate[] = [
      {
        id: "a",
        text: "Japan",
        ax: 300,
        ay: 200,
        r: 6,
        priority: 3,
        required: true,
      },
      {
        id: "b",
        text: "Qatar",
        ax: 303,
        ay: 202,
        r: 6,
        priority: 2,
        required: true,
      },
      {
        id: "c",
        text: "Nigeria",
        ax: 298,
        ay: 199,
        r: 6,
        priority: 1,
        required: true,
      },
    ];
    const placed = placeLabels(crowded, [], { bounds, charW, lh, padX });
    expect(placed.map((p) => String(p.id)).sort()).toEqual(["a", "b", "c"]);
  });

  it("places a corner anchor whose label fits — the scatter 'Mexico' regression", () => {
    // A point at a plot corner (e.g. min-x, min-y): the adjacent spots clip vertically
    // (bottom/top edge) or horizontally (left/right edge). A fitting label must STILL be
    // placed (via the clamped-horizontal fallback), not silently dropped.
    for (const corner of [
      { ax: 3, ay: 397 }, // bottom-left (the Mexico case)
      { ax: 597, ay: 397 }, // bottom-right
      { ax: 3, ay: 3 }, // top-left
      { ax: 597, ay: 3 }, // top-right
    ]) {
      const cand: PlaceCandidate[] = [
        {
          id: "c",
          text: "Mexico",
          ax: corner.ax,
          ay: corner.ay,
          r: 6,
          priority: 1,
        },
      ];
      const placed = placeLabels(cand, [], { bounds, charW, lh, padX });
      expect(placed).toHaveLength(1);
      expect(
        withinBounds(placedBox({ ...placed[0], text: "Mexico" }), bounds),
      ).toBe(true);
    }
  });
});
