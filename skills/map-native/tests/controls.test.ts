import { describe, it, expect } from "bun:test";
import { safeSetMaxBounds } from "../src/controls";

// Minimal map stub that records setMaxBounds calls.
function stubMap() {
  const calls: unknown[] = [];
  return { setMaxBounds: (b: unknown) => calls.push(b), calls } as any;
}

describe("safeSetMaxBounds (F12 — no >360° maxBounds)", () => {
  it("sets a normal sub-global envelope", () => {
    const m = stubMap();
    safeSetMaxBounds(m, [80, -25], [170, 60]);
    expect(m.calls.length).toBe(1);
    expect(m.calls[0]).toEqual([
      [80, -25],
      [170, 60],
    ]);
  });
  it("does NOT set a >360°-wide envelope (wrapped viewBounds produce -57.9 … 307.9)", () => {
    const m = stubMap();
    safeSetMaxBounds(m, [-57.9, -41.9], [307.9, 63.1]); // 365.8° wide
    expect(m.calls.length).toBe(0); // guarded — left unbounded
  });
  it("does NOT set a near-global (>175° tall) envelope", () => {
    const m = stubMap();
    safeSetMaxBounds(m, [-170, -88], [170, 88]);
    expect(m.calls.length).toBe(0);
  });
});
