// The route video's per-frame source updates, counted over a WHOLE render rather than asserted
// one call at a time — because the defect was never a wrong value, it was a right value shipped
// thousands of times.
//
// RouteScrolly.tsx was the only *Scrolly composition with no per-frame `setData` guard: its two
// siblings that render beside it both keep a "last shipped" ref and say so in their own source
// (ChoroplethScrolly.tsx: "Update source data only when the step's ref beat changes";
// LocatorScrolly.tsx: "so we avoid setData on every frame"). The route shipped every crossed
// territory's FULL border outline, plus two slices of the route line, on every single frame.
import { describe, it, expect } from "bun:test";
import {
  makeRouteSourceCache,
  trailPayloadFor,
} from "../src/route-frame-updates";
import { buildTimeline, cameraForFrame } from "../src/story-timeline";

// The sample route's own shape: 6 steps (title, overview, 3 draws, takeaway) at 30fps.
const STEPS = 6;
const TERRITORIES = ["CHN", "IND", "BGD"];
const { phases, totalFrames } = buildTimeline(
  Array.from({ length: STEPS }, (_, i) => (i === 0 ? "title" : "reveal")),
  30,
);
// One camera solution per step — cameraForFrame only needs the array's length here, the values
// are irrelevant to which STEP is active.
const solutions = phases.map(() => ({
  center: [0, 0] as [number, number],
  zoom: 4,
}));

describe("the route video ships a territory's outline twice per render, not once per frame", () => {
  it("asks for at most two trail updates per territory across every frame of a render", () => {
    const cache = makeRouteSourceCache();
    let shipped = 0;
    for (let frame = 0; frame < totalFrames; frame++) {
      const { beatIndex } = cameraForFrame(frame, phases, solutions);
      for (const key of TERRITORIES)
        if (cache.trailChanged(key, trailPayloadFor(beatIndex))) shipped++;
    }
    // Two states per territory — hidden on the title scene, outlined ever after.
    expect(shipped).toBe(TERRITORIES.length * 2);
    // …against what the unguarded component did, which is the number this closes.
    expect(totalFrames * TERRITORIES.length).toBeGreaterThan(2000);
  });

  it("names the title scene as the one step with no outline, and every later step as outlined", () => {
    expect(trailPayloadFor(0)).toBe("none");
    for (let step = 1; step < STEPS; step++)
      expect(trailPayloadFor(step)).toBe("full");
  });
});

describe("the route video ships the drawn line only while it is actually drawing", () => {
  // The reveal series a route walks: 0 through the title and overview, ramping across each draw
  // step's MOVE phase, pinned through its HOLD, then 1 for the takeaway. This mirrors
  // RouteScrolly.tsx's own driver closely enough to count frames that carry a NEW extent.
  const stops = [0.3, 0.6, 1.0];
  const revealAt = (frame: number): number => {
    const { beatIndex } = cameraForFrame(frame, phases, solutions);
    if (beatIndex <= 1) return 0;
    if (beatIndex === phases.length - 1) return 1;
    const k = beatIndex - 2;
    const p = phases[beatIndex];
    const t = Math.max(
      0,
      Math.min(1, p.moveFrames > 0 ? (frame - p.startFrame) / p.moveFrames : 1),
    );
    const from = k === 0 ? 0 : stops[k - 1];
    return from + (stops[k] - from) * t;
  };

  it("suppresses the update on every held frame, and never on a moving one", () => {
    const cache = makeRouteSourceCache();
    let shipped = 0;
    let heldFramesShipped = 0;
    for (let frame = 0; frame < totalFrames; frame++) {
      const km = revealAt(frame) * 3909;
      const changed = cache.riverChanged(km);
      if (changed) shipped++;
      if (changed && frame > 0 && revealAt(frame - 1) === revealAt(frame))
        heldFramesShipped++;
    }
    // A frame whose drawn extent equals the previous frame's ships nothing — ever.
    expect(heldFramesShipped).toBe(0);
    // And the render as a whole ships a small fraction of its frames.
    expect(shipped).toBeLessThan(totalFrames / 3);
    expect(shipped).toBeGreaterThan(0);
  });

  it("still ships every distinct extent — a suppressed update is never a lost one", () => {
    const cache = makeRouteSourceCache();
    const seen: number[] = [];
    for (let frame = 0; frame < totalFrames; frame++) {
      const km = revealAt(frame) * 3909;
      if (cache.riverChanged(km)) seen.push(km);
    }
    const distinct = new Set(
      Array.from({ length: totalFrames }, (_, f) => revealAt(f) * 3909),
    );
    // Every extent the render passes through was shipped exactly once, in order.
    expect(new Set(seen).size).toBe(distinct.size);
    expect(seen.length).toBe(distinct.size);
  });
});
