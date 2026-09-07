/**
 * TREATMENTS COMPOSE THROUGH AN ARBITER, NEVER BY STACKING.
 *
 * THE DEFECT, MEASURED. A probe enabled five treatments on one beat and three labels landed in the
 * same corner — "PIC DE 1973", "CHOC PÉTROLIER", "SECOND CHOC". Each treatment placed *its own*
 * label correctly. None could see the others, because none had any way to. That is not a bug in any
 * treatment; it is the absence of the thing this file tests.
 *
 * The arbiter is the only place in the system that knows where every treatment's text will land, so
 * it is the only place a collision can be refused.
 */
import { describe, it, expect } from "bun:test";
import { placeLabels } from "../../../shared/chart-beat/arbiter.mjs";

/** A measure stub: six pixels per character, twelve tall. Deterministic, so a failure is about
 *  placement rather than about font resolution. */
const measure = (text: string) => ({ width: text.length * 6, height: 12 });
const FRAME = { left: 0, top: 0, right: 900, bottom: 500 };

const overlaps = (a, b) =>
  a.x < b.x + b.width &&
  b.x < a.x + a.width &&
  a.y < b.y + b.height &&
  b.y < a.y + a.height;

describe("the arbiter", () => {
  it("should never place two labels on top of each other", () => {
    const { placed } = placeLabels(
      [
        {
          id: "peak",
          treatment: "peak-marked",
          text: "PIC DE 1973",
          at: { x: 300, y: 100 },
          priority: 2,
        },
        {
          id: "era-1",
          treatment: "era-bands",
          text: "CHOC PÉTROLIER",
          at: { x: 305, y: 104 },
          priority: 1,
        },
      ],
      { frame: FRAME, measure },
    );
    expect(placed).toHaveLength(2);
    expect(overlaps(placed[0].box, placed[1].box)).toBe(false);
  });

  it("should hold the three labels of the measured defect apart", () => {
    // The exact case: three requests within a few pixels of one another, as the five-treatment
    // probe produced them.
    const { placed, dropped } = placeLabels(
      [
        {
          id: "peak",
          treatment: "peak-marked",
          text: "PIC DE 1973",
          at: { x: 300, y: 100 },
          priority: 3,
        },
        {
          id: "era-1",
          treatment: "era-bands",
          text: "CHOC PÉTROLIER",
          at: { x: 306, y: 104 },
          priority: 2,
        },
        {
          id: "era-2",
          treatment: "era-bands",
          text: "SECOND CHOC",
          at: { x: 312, y: 108 },
          priority: 1,
        },
      ],
      { frame: FRAME, measure },
    );
    for (const a of placed)
      for (const b of placed)
        if (a.id !== b.id)
          expect(overlaps(a.box, b.box), `${a.id} over ${b.id}`).toBe(false);
    expect(placed.length + dropped.length).toBe(3);
  });

  it("should drop the lower-priority label rather than push it off the frame", () => {
    // An off-frame label is worse than an absent one, and `three-sizes-no-collision` already
    // refuses overflow elsewhere in this tree.
    const { placed, dropped } = placeLabels(
      [
        {
          id: "a",
          treatment: "t1",
          text: "AAAAAAAAAAAAAAAAAAAA",
          at: { x: 880, y: 250 },
          priority: 3,
        },
        {
          id: "b",
          treatment: "t2",
          text: "BBBBBBBBBBBBBBBBBBBB",
          at: { x: 882, y: 252 },
          priority: 1,
        },
      ],
      { frame: FRAME, measure },
    );
    expect(placed.map((p) => p.id)).toEqual(["a"]);
    expect(dropped[0].id).toBe("b");
    expect(dropped[0].why).toMatch(/collide|room/i);
  });

  it("should keep every placed box inside the frame", () => {
    const { placed } = placeLabels(
      [
        {
          id: "tr",
          treatment: "t",
          text: "A LABEL AT THE EDGE",
          at: { x: 895, y: 6 },
          priority: 1,
        },
        {
          id: "bl",
          treatment: "t",
          text: "ANOTHER AT THE OTHER",
          at: { x: 4, y: 496 },
          priority: 1,
        },
      ],
      { frame: FRAME, measure },
    );
    for (const p of placed) {
      expect(p.box.x, p.id).toBeGreaterThanOrEqual(FRAME.left);
      expect(p.box.x + p.box.width, p.id).toBeLessThanOrEqual(FRAME.right);
      expect(p.box.y, p.id).toBeGreaterThanOrEqual(FRAME.top);
      expect(p.box.y + p.box.height, p.id).toBeLessThanOrEqual(FRAME.bottom);
    }
  });

  it("should place in priority order, so the same set never resolves two ways", () => {
    const requests = [
      {
        id: "low",
        treatment: "t2",
        text: "LOW",
        at: { x: 400, y: 200 },
        priority: 1,
      },
      {
        id: "high",
        treatment: "t1",
        text: "HIGH",
        at: { x: 402, y: 202 },
        priority: 9,
      },
    ];
    const forward = placeLabels(requests, { frame: FRAME, measure });
    const backward = placeLabels([...requests].reverse(), {
      frame: FRAME,
      measure,
    });
    // The high-priority request keeps its own anchor in both runs; the order requests arrive in is
    // not allowed to decide the picture.
    expect(forward.placed.find((p) => p.id === "high").box).toEqual(
      backward.placed.find((p) => p.id === "high").box,
    );
  });

  it("should say why every dropped label was dropped", () => {
    const crowd = Array.from({ length: 12 }, (_, i) => ({
      id: `l${i}`,
      treatment: "t",
      text: "A CROWDED LABEL",
      at: { x: 450, y: 250 },
      priority: 12 - i,
    }));
    const { dropped } = placeLabels(crowd, { frame: FRAME, measure });
    expect(dropped.length).toBeGreaterThan(0);
    for (const d of dropped) {
      expect(typeof d.why, d.id).toBe("string");
      expect(d.why.length, d.id).toBeGreaterThan(0);
      expect(d.treatment, d.id).toBe("t");
    }
  });

  it("should place a lone label at its own anchor, unmoved", () => {
    // A guard that displaces correct work is a guard someone switches off.
    const { placed, dropped } = placeLabels(
      [
        {
          id: "solo",
          treatment: "t",
          text: "ALONE",
          at: { x: 400, y: 250 },
          priority: 1,
        },
      ],
      { frame: FRAME, measure },
    );
    expect(dropped).toHaveLength(0);
    expect(placed[0].anchor).toBe("above");
  });
});
