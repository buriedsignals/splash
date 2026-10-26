import { describe, expect, it } from "bun:test";
import { createLength } from "../craft/_shared/gesture-length.mjs";

const ROWS = [
  { name: "Lisboa", value: 214 },
  { name: "Porto", value: 96 },
  { name: "Braga", value: 31 },
  { name: "Coimbra", value: 28 },
  { name: "Aveiro", value: 14 },
  { name: "Faro", value: 0 },
];
const FRAME = { x: 100, y: 50, width: 600, height: 400 };

describe("Length adapter", () => {
  const length = createLength({ rows: ROWS, frame: FRAME });

  it("should anchor a bar at its top centre, inside the frame, in the rest state", () => {
    const a = length.anchor("Lisboa", length.rest());
    const r = length.rect("Lisboa", length.rest());
    expect(a.x).toBeCloseTo(r.x + r.width / 2);
    expect(a.y).toBeCloseTo(r.y);
    expect(a.y).toBeGreaterThanOrEqual(FRAME.y);
    expect(a.x).toBeLessThanOrEqual(FRAME.x + FRAME.width);
  });

  it("should anchor a row of value zero on the baseline", () => {
    expect(length.anchor("Faro", length.rest()).y).toBeCloseTo(
      FRAME.y + FRAME.height,
    );
  });

  it("should refuse a rescale between two shots being compared", () => {
    const compared = length.with(length.rest(), {
      compare: ["Lisboa", "Porto"],
    });
    const rescaled = length.with(compared, { domain: [0, 400] });
    expect(() => length.invariants([compared, rescaled])).toThrow(
      /no-float-baseline-rescale/,
    );
  });

  it("should refuse a zoom that does not print its factor, naming the note", () => {
    const zoomed = length.window(length.rest(), ["Aveiro", "Faro"]);
    expect(() => length.invariants([length.rest(), zoomed])).toThrow(
      /note.*factor|factor.*note/,
    );
  });

  it("should accept a zoom whose factor is printed", () => {
    const zoomed = length.with(
      length.window(length.rest(), ["Aveiro", "Faro"]),
      { factorPrinted: true },
    );
    expect(() => length.invariants([length.rest(), zoomed])).not.toThrow();
  });

  it("should report a highlight on an already-highlighted row as no change", () => {
    const lit = length.with(length.rest(), { emphasis: { Lisboa: "accent" } });
    expect(
      length.equal(lit, length.with(lit, { emphasis: { Lisboa: "accent" } })),
    ).toBe(true);
  });

  it("should lay a copy of the second row's length against the first, from the baseline", () => {
    const copy = length.copyOnto("Porto", "Lisboa", length.rest());
    const porto = length.rect("Porto", length.rest());
    expect(copy.height).toBeCloseTo(porto.height);
    expect(copy.y + copy.height).toBeCloseTo(FRAME.y + FRAME.height);
  });

  it("should reorder the bars ascending", () => {
    const state = length.order(length.rest(), "ascending");
    expect(state.order[0]).toBe("Faro");
    expect(length.rect("Faro", state).x).toBeLessThan(
      length.rect("Lisboa", state).x,
    );
  });

  it("should transpose columns into rows, the anchor at the bar's end", () => {
    const rows = createLength({
      rows: ROWS,
      frame: FRAME,
      orientation: "rows",
    });
    const a = rows.anchor("Lisboa", rows.rest());
    const r = rows.rect("Lisboa", rows.rest());
    expect(a.x).toBeCloseTo(r.x + r.width);
    expect(a.y).toBeCloseTo(r.y + r.height / 2);
  });
});
