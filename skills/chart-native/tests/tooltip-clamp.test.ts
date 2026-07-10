import { describe, it, expect } from "bun:test";
import { clampOffset } from "../src/core/tooltip-clamp";

const MARGIN = 8;

// The invariant every clamped tooltip must satisfy: after applying {dx,dy}, its
// box stays inside [margin, size - margin] on both axes (or, when the tooltip is
// larger than the available room, its top-left edge stays pinned at margin so the
// anchor and the start of the text remain visible).
function assertInside(
  tip: { left: number; top: number; width: number; height: number },
  container: { width: number; height: number },
) {
  const { dx, dy } = clampOffset(tip, container, MARGIN);
  const left = tip.left + dx;
  const top = tip.top + dy;
  expect(left).toBeGreaterThanOrEqual(MARGIN - 1e-9);
  expect(top).toBeGreaterThanOrEqual(MARGIN - 1e-9);
  if (tip.width <= container.width - 2 * MARGIN) {
    expect(left + tip.width).toBeLessThanOrEqual(
      container.width - MARGIN + 1e-9,
    );
  }
  if (tip.height <= container.height - 2 * MARGIN) {
    expect(top + tip.height).toBeLessThanOrEqual(
      container.height - MARGIN + 1e-9,
    );
  }
}

describe("clampOffset — keep a tooltip inside its container", () => {
  it("flips a right-edge tooltip back in-bounds (the reported scatter/bar bug)", () => {
    // reproduces the reported measurement: tip at x≈1074, width≈204 in a 1200 viewport
    const tip = { left: 1074, top: 200, width: 204, height: 64 };
    const container = { width: 1200, height: 675 };
    const { dx } = clampOffset(tip, container, MARGIN);
    expect(dx).toBeLessThan(0); // shifted LEFT
    assertInside(tip, container);
  });

  it("does not move a tooltip that already fits", () => {
    const tip = { left: 300, top: 200, width: 180, height: 60 };
    const container = { width: 1200, height: 675 };
    expect(clampOffset(tip, container, MARGIN)).toEqual({ dx: 0, dy: 0 });
  });

  it("pushes a left-overflowing tooltip back to the margin", () => {
    const tip = { left: -30, top: 200, width: 160, height: 60 };
    const container = { width: 1200, height: 675 };
    const { dx } = clampOffset(tip, container, MARGIN);
    expect(dx).toBeGreaterThan(0);
    assertInside(tip, container);
  });

  it("flips a bottom-overflowing tooltip up", () => {
    const tip = { left: 300, top: 650, width: 160, height: 60 };
    const container = { width: 1200, height: 675 };
    const { dy } = clampOffset(tip, container, MARGIN);
    expect(dy).toBeLessThan(0);
    assertInside(tip, container);
  });

  it("flips a top-overflowing tooltip down", () => {
    const tip = { left: 300, top: -20, width: 160, height: 60 };
    const container = { width: 1200, height: 675 };
    const { dy } = clampOffset(tip, container, MARGIN);
    expect(dy).toBeGreaterThan(0);
    assertInside(tip, container);
  });

  it("pins the top-left at the margin when the tooltip is wider than the room", () => {
    const tip = { left: 0, top: 200, width: 1300, height: 60 };
    const container = { width: 1200, height: 675 };
    const { dx } = clampOffset(tip, container, MARGIN);
    expect(tip.left + dx).toBeCloseTo(MARGIN, 6);
  });
});
