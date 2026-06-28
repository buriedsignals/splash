import { describe, it, expect } from "bun:test";
import {
  buildTimeline,
  cameraForFrame,
  easeInOutCubic,
  type CameraSolution,
} from "../src/story-timeline";

describe("buildTimeline", () => {
  it("lays out establish/reveal/takeaway holds with moves between, first move 0", () => {
    const { phases, totalFrames } = buildTimeline(4, 30, {
      establishHold: 2,
      revealHold: 3,
      takeawayHold: 3,
      move: 1,
    });
    expect(phases).toHaveLength(4);
    expect(phases[0].moveFrames).toBe(0);
    expect(phases[0].startFrame).toBe(0);
    expect(phases[0].holdFrames).toBe(60); // 2s @30
    expect(phases[1].moveFrames).toBe(30); // 1s
    // total = 2 + (1+3) + (1+3) + (1+3) = 14s -> 420 frames
    expect(totalFrames).toBe(420);
  });
});

describe("cameraForFrame", () => {
  const sols: CameraSolution[] = [
    { center: [0, 0], zoom: 3 },
    { center: [10, 10], zoom: 5 },
    { center: [20, 0], zoom: 5 },
    { center: [0, 0], zoom: 3 },
  ];
  const { phases } = buildTimeline(4, 30, {
    establishHold: 2,
    revealHold: 3,
    takeawayHold: 3,
    move: 1,
  });
  it("is blank (fillReveal 0) at frame 0 and full after establish", () => {
    expect(cameraForFrame(0, phases, sols).fillReveal).toBe(0);
    expect(cameraForFrame(59, phases, sols).fillReveal).toBeCloseTo(1, 1);
  });
  it("sits on the establish camera during its hold", () => {
    const r = cameraForFrame(30, phases, sols);
    expect(r.beatIndex).toBe(0);
    expect(r.camera.center).toEqual([0, 0]);
  });
  it("interpolates center/zoom during a move between beats", () => {
    // beat 1 move spans frames 60..89 (1s). Midpoint ~frame 75 → between sol[0] and sol[1].
    const r = cameraForFrame(75, phases, sols);
    expect(r.beatIndex).toBe(1);
    expect(r.camera.center[0]).toBeGreaterThan(0);
    expect(r.camera.center[0]).toBeLessThan(10);
  });
  it("lands exactly on the target camera once the move completes", () => {
    const r = cameraForFrame(95, phases, sols); // into beat 1 hold
    expect(r.camera.center).toEqual([10, 10]);
    expect(r.camera.zoom).toBe(5);
  });
});

describe("easeInOutCubic", () => {
  it("is 0 at 0, 1 at 1, 0.5 at 0.5", () => {
    expect(easeInOutCubic(0)).toBe(0);
    expect(easeInOutCubic(1)).toBe(1);
    expect(easeInOutCubic(0.5)).toBeCloseTo(0.5, 5);
  });
});
