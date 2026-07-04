import { describe, it, expect } from "bun:test";
import { resolveMapFrame, maxFittableLngSpan } from "../src/core/map-format";
import { FRAME_TYPE } from "../src/theme/map-tokens";

describe("maxFittableLngSpan (F8 aspect limit)", () => {
  it("a 360x640 portrait phone can only show ~202° of longitude", () => {
    expect(maxFittableLngSpan(360, 640)).toBeCloseTo(202.5, 1);
  });
  it("a wide landscape viewport can show the whole world (>360°)", () => {
    expect(maxFittableLngSpan(1200, 800)).toBeGreaterThan(360);
  });
  it("a globe-spanning 247° extent is unfittable on the phone but fine on desktop", () => {
    const span = 247; // LA (-118) → Busan (129), the ports dataset
    expect(span).toBeGreaterThan(maxFittableLngSpan(360, 640)); // impossible in portrait
    expect(span).toBeLessThan(maxFittableLngSpan(1200, 800)); // fits on desktop
  });
});

describe("resolveMapFrame", () => {
  it("scale = 1.0 when the smaller side is the 720 reference", () => {
    expect(resolveMapFrame(1280, 720).scale).toBeCloseTo(1, 6);
  });
  it("scales UP on a portrait canvas (bigger text), capped at 1.6", () => {
    expect(resolveMapFrame(1080, 1350).scale).toBeCloseTo(1.5, 6); // 1080/720
    expect(resolveMapFrame(4000, 4000).scale).toBe(1.6); // capped
  });
  it("floors the scale at 0.85 on tiny canvases", () => {
    expect(resolveMapFrame(360, 640).scale).toBe(0.85);
  });
  it("scales the type sizes by scale", () => {
    const f = resolveMapFrame(1080, 1350); // scale 1.5
    expect(f.type.title).toBe(Math.round(FRAME_TYPE.title * 1.5));
    expect(f.type.source).toBe(Math.round(FRAME_TYPE.source * 1.5));
  });
  it("reserves a top band at least as tall as the title lines", () => {
    const f = resolveMapFrame(1280, 720, { titleLines: 2 });
    expect(f.pad.top).toBeGreaterThanOrEqual(2 * f.type.title * 1.3);
  });
  it("a description makes the top band taller", () => {
    const withDesc = resolveMapFrame(1280, 720, {
      titleLines: 2,
      hasDescription: true,
    });
    const without = resolveMapFrame(1280, 720, {
      titleLines: 2,
      hasDescription: false,
    });
    expect(withDesc.pad.top).toBeGreaterThan(without.pad.top);
  });
  it("reserves a bottom band for the source line", () => {
    const f = resolveMapFrame(1280, 720);
    expect(f.pad.bottom).toBeGreaterThanOrEqual(f.type.source);
  });
  it("side insets clear the label overhang", () => {
    const f = resolveMapFrame(1280, 720, { labelOverhang: 80 });
    expect(f.pad.left).toBeGreaterThanOrEqual(Math.round(80 * f.scale));
    expect(f.pad.right).toBe(f.pad.left);
  });
  it("is deterministic", () => {
    expect(resolveMapFrame(1080, 1350)).toEqual(resolveMapFrame(1080, 1350));
  });
  it("reserves the supplied legend height in the bottom pad", () => {
    const small = resolveMapFrame(1280, 720, { legendHeight: 0 });
    const big = resolveMapFrame(1280, 720, { legendHeight: 160 });
    expect(big.pad.bottom).toBeGreaterThanOrEqual(160);
    expect(big.pad.bottom).toBeGreaterThan(small.pad.bottom);
  });
  it("uses a supplied measured title height for the top band when larger than the estimate", () => {
    const est = resolveMapFrame(1280, 720, { titleLines: 2 });
    const tall = resolveMapFrame(1280, 720, {
      titleLines: 2,
      titleHeightPx: 220,
    });
    expect(tall.pad.top).toBeGreaterThanOrEqual(220);
    expect(tall.pad.top).toBeGreaterThan(est.pad.top);
  });
  it("keeps the estimate when no measured height is supplied", () => {
    const a = resolveMapFrame(1280, 720, { titleLines: 2 });
    const b = resolveMapFrame(1280, 720, { titleLines: 2, titleHeightPx: 0 });
    expect(b.pad.top).toBe(a.pad.top);
  });

  // "Data must always be visible" — a marker's PIN/LABEL (not just its anchor) must clear the
  // furniture. The top band = gutter + banner + a FIXED marker clearance (a pin is a fixed px;
  // it must NOT shrink at mobile scale, the bug that buried the epicentre cluster at 360px).
  it("reserves a FIXED marker clearance beyond the measured banner at every scale", () => {
    const GUTTER = (w, h) =>
      16 * Math.max(0.85, Math.min(1.6, Math.min(w, h) / 720));
    for (const [w, h] of [
      [360, 640],
      [1280, 720],
    ]) {
      const f = resolveMapFrame(w, h, {
        titleHeightPx: 200,
        hasDescription: true,
      });
      const clearanceBeyondBanner = f.pad.top - 200 - GUTTER(w, h);
      expect(clearanceBeyondBanner).toBeGreaterThanOrEqual(28); // ≥ a pin glyph, unscaled
    }
  });
  it("reserves the legend plus marker clearance in the bottom band", () => {
    const f = resolveMapFrame(1280, 720, { legendHeight: 120 });
    expect(f.pad.bottom).toBeGreaterThanOrEqual(120 + 28);
  });
  it("reserves a supplied filterBarHeight in the top band", () => {
    const without = resolveMapFrame(1280, 720, { titleHeightPx: 120 });
    const withBar = resolveMapFrame(1280, 720, {
      titleHeightPx: 120,
      filterBarHeight: 44,
    });
    expect(withBar.pad.top - without.pad.top).toBeGreaterThanOrEqual(44);
  });
});
