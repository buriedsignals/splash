import { describe, expect, it } from "bun:test";
import { scrollyMapScript } from "#shared/map-beat/inline.mjs";

describe("the scrolly map runtime, inlined", () => {
  it("should define the runtime's two entry points in one script with no module syntax", async () => {
    const script = await scrollyMapScript();
    expect(script).not.toMatch(/^\s*(import|export)\s/m);
    const scope = new Function(
      `${script}; return { initScrollyMap, applyScrollyMap, viewOf, bindState, mountPlan };`,
    )();
    expect(typeof scope.initScrollyMap).toBe("function");
    expect(typeof scope.applyScrollyMap).toBe("function");
    expect(scope.viewOf({ camX: 0.5, camY: 0.5, camZoom: 2 }).center).toEqual([
      0, 0,
    ]);
  });

  it("should never carry a real key, only the placeholder the delivery substitutes", async () => {
    const script = await scrollyMapScript();
    expect(script).not.toMatch(/key=[A-Za-z0-9]{16,}/);
  });
});
