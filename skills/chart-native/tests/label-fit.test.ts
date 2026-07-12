// Pure box-containment math for the render-time label-fit guard
// (scripts/snap-label-fit.mjs). The guard's DECISION lives here so it is
// unit-testable without Playwright — the same pure/browser split as
// core/contrast-scan.ts vs scripts/snap-contrast.mjs. A text box (already
// axis-aligned: getBoundingClientRect returns the AABB even for rotated text)
// must sit fully inside its clip bounds (svg root / chart card) within a small
// antialiasing tolerance, else it ships visually clipped.
import { describe, it, expect } from "bun:test";
import {
  LABEL_FIT_TOLERANCE_PX,
  intersectBoxes,
  overflowPx,
  worstOverflowPx,
  isFitViolation,
  type Box,
} from "../src/core/label-fit";

const bounds: Box = { left: 0, top: 0, right: 600, bottom: 400 };

describe("overflowPx", () => {
  it("should report zero on every side when the box is fully inside", () => {
    const box: Box = { left: 10, top: 10, right: 200, bottom: 30 };
    expect(overflowPx(box, bounds)).toEqual({
      left: 0,
      top: 0,
      right: 0,
      bottom: 0,
    });
  });

  it("should report the exact px a straddling box exceeds the right edge by", () => {
    // the historical class: a right-gutter band label extending past the svg
    // viewport ("Renouvelables 280" clipped to "Renouvelables 28")
    const box: Box = { left: 520, top: 100, right: 643, bottom: 118 };
    expect(overflowPx(box, bounds)).toEqual({
      left: 0,
      top: 0,
      right: 43,
      bottom: 0,
    });
  });

  it("should report overflow on two sides for a corner-straddling box", () => {
    const box: Box = { left: -8, top: 390, right: 60, bottom: 420 };
    expect(overflowPx(box, bounds)).toEqual({
      left: 8,
      top: 0,
      right: 0,
      bottom: 20,
    });
  });

  it("should report overflow for a box entirely outside the bounds", () => {
    const box: Box = { left: 700, top: 10, right: 780, bottom: 28 };
    expect(overflowPx(box, bounds).right).toBe(180);
  });
});

describe("worstOverflowPx", () => {
  it("should be 0 for a contained box", () => {
    expect(
      worstOverflowPx({ left: 0, top: 0, right: 600, bottom: 400 }, bounds),
    ).toBe(0);
  });

  it("should be the max over the four sides", () => {
    const box: Box = { left: -3, top: -12, right: 601, bottom: 400 };
    expect(worstOverflowPx(box, bounds)).toBe(12);
  });
});

describe("isFitViolation — tolerance semantics", () => {
  it("should pass a box exactly at the tolerance edge (antialiasing slack)", () => {
    const box: Box = {
      left: 0,
      top: 0,
      right: 600 + LABEL_FIT_TOLERANCE_PX,
      bottom: 400,
    };
    expect(isFitViolation(box, bounds)).toBe(false);
  });

  it("should fail a box just past the tolerance edge", () => {
    const box: Box = {
      left: 0,
      top: 0,
      right: 600 + LABEL_FIT_TOLERANCE_PX + 0.5,
      bottom: 400,
    };
    expect(isFitViolation(box, bounds)).toBe(true);
  });

  it("should honor an explicit tolerance override", () => {
    const box: Box = { left: 0, top: 0, right: 605, bottom: 400 };
    expect(isFitViolation(box, bounds, 5)).toBe(false);
    expect(isFitViolation(box, bounds, 4)).toBe(true);
  });
});

describe("isFitViolation — rotated-label AABB case", () => {
  // A −40°, end-anchored rotated tick label pivoting at (tickX, tickY): its
  // axis-aligned box (what getBoundingClientRect returns) spans
  // cosθ·w + sinθ·h wide and sinθ·w + cosθ·h tall, reaching LEFT and DOWN of
  // the pivot. That AABB is exactly what must fit — the guard needs no
  // rotation-awareness of its own.
  const θ = (40 * Math.PI) / 180;
  const w = 140; // label length in px along its own baseline
  const h = 14; // font box height
  const aabbW = Math.cos(θ) * w + Math.sin(θ) * h;
  const aabbH = Math.sin(θ) * w + Math.cos(θ) * h;

  it("should pass a rotated label whose AABB lands inside the bounds", () => {
    // descent below the pivot is sinθ·w ≈ 90px → the pivot must sit high enough
    const tickX = 300;
    const tickY = 300;
    const box: Box = {
      left: tickX - aabbW,
      top: tickY - Math.cos(θ) * h,
      right: tickX,
      bottom: tickY - Math.cos(θ) * h + aabbH,
    };
    expect(isFitViolation(box, bounds)).toBe(false);
  });

  it("should fail a rotated label whose foot descends past the bottom edge", () => {
    // pivot too close to the bottom: the label's descent (sinθ·w) leaves the card
    const tickX = 300;
    const tickY = 395;
    const box: Box = {
      left: tickX - aabbW,
      top: tickY - Math.cos(θ) * h,
      right: tickX,
      bottom: tickY - Math.cos(θ) * h + aabbH,
    };
    expect(isFitViolation(box, bounds)).toBe(true);
    expect(overflowPx(box, bounds).bottom).toBeGreaterThan(
      LABEL_FIT_TOLERANCE_PX,
    );
  });

  it("should fail a rotated label whose start runs off the left edge", () => {
    const tickX = 80; // cosθ·140 ≈ 107 px reach > 80
    const tickY = 380;
    const box: Box = {
      left: tickX - aabbW,
      top: tickY - Math.cos(θ) * h,
      right: tickX,
      bottom: tickY - Math.cos(θ) * h + aabbH,
    };
    expect(isFitViolation(box, bounds)).toBe(true);
    expect(overflowPx(box, bounds).left).toBeGreaterThan(0);
  });
});

describe("intersectBoxes — the ancestor clip chain", () => {
  it("should return the overlapping region of two boxes", () => {
    const svg: Box = { left: 20, top: 60, right: 580, bottom: 360 };
    expect(intersectBoxes(bounds, svg)).toEqual(svg);
    expect(
      intersectBoxes(svg, { left: 0, top: 0, right: 300, bottom: 500 }),
    ).toEqual({ left: 20, top: 60, right: 300, bottom: 360 });
  });

  it("should judge a text inside the card but past its svg clip as a violation", () => {
    // svg overflow is hidden by default: the svg rect IS the clip box, even
    // when the card around it is larger.
    const svg: Box = { left: 20, top: 60, right: 580, bottom: 360 };
    const clip = intersectBoxes(bounds, svg);
    const text: Box = { left: 500, top: 100, right: 590, bottom: 118 };
    expect(isFitViolation(text, bounds)).toBe(false); // card alone would pass
    expect(isFitViolation(text, clip)).toBe(true); // svg clip catches it
  });
});
