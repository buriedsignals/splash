import { describe, it, expect } from "bun:test";
import {
  buildTimeline,
  cameraForFrame,
  easeInOutCubic,
  type CameraSolution,
} from "../src/story-timeline";

// Shared kinds array used across most tests.
const KINDS = ["title", "establish", "reveal", "takeaway"] as const;
// Shared opts: title=2s, establish=2s, reveal=3s, takeaway=3s, move=1s.
const OPTS = {
  titleHold: 2,
  establishHold: 2,
  revealHold: 3,
  takeawayHold: 3,
  move: 1,
};

describe("buildTimeline", () => {
  it("lays out title/establish/reveal/takeaway holds with moves between, first move 0", () => {
    const { phases, totalFrames } = buildTimeline([...KINDS], 30, OPTS);
    // title: 0 move + 60 hold = 60
    // establish: 30 move + 60 hold = 90
    // reveal: 30 move + 90 hold = 120
    // takeaway: 30 move + 90 hold = 120
    // total = 390
    expect(phases).toHaveLength(4);
    expect(phases[0].moveFrames).toBe(0);
    expect(phases[0].startFrame).toBe(0);
    expect(phases[0].holdFrames).toBe(60); // title 2s @30
    expect(phases[1].moveFrames).toBe(30); // 1s move
    expect(phases[1].startFrame).toBe(60);
    expect(phases[1].holdFrames).toBe(60); // establish 2s
    expect(phases[2].startFrame).toBe(60 + 30 + 60); // 150
    expect(phases[2].holdFrames).toBe(90); // reveal 3s
    expect(totalFrames).toBe(390);
  });

  it("assigns per-kind hold durations correctly", () => {
    const { phases } = buildTimeline(["title", "reveal", "takeaway"], 10, {
      titleHold: 3,
      revealHold: 2,
      takeawayHold: 4,
      move: 1,
    });
    expect(phases[0].holdFrames).toBe(30); // title 3s @10
    expect(phases[1].holdFrames).toBe(20); // reveal 2s
    expect(phases[2].holdFrames).toBe(40); // takeaway 4s
  });
});

describe("cameraForFrame", () => {
  const sols: CameraSolution[] = [
    { center: [0, 0], zoom: 3 }, // title
    { center: [0, 0], zoom: 3 }, // establish (same bounds)
    { center: [10, 10], zoom: 5 }, // reveal
    { center: [0, 0], zoom: 3 }, // takeaway
  ];
  const { phases } = buildTimeline([...KINDS], 30, OPTS);
  // title hold: 0–59, establish move: 60–89, establish hold: 90–149,
  // reveal move: 150–179, reveal hold: 180–269, takeaway move: 270–299, takeaway hold: 300–389.

  it("is blank (fillReveal 0) during the entire title beat", () => {
    expect(cameraForFrame(0, phases, sols).fillReveal).toBe(0);
    expect(cameraForFrame(30, phases, sols).fillReveal).toBe(0);
    expect(cameraForFrame(59, phases, sols).fillReveal).toBe(0);
  });

  it("is still 0 during the establish move (before hold starts)", () => {
    expect(cameraForFrame(60, phases, sols).fillReveal).toBe(0);
    expect(cameraForFrame(89, phases, sols).fillReveal).toBe(0);
  });

  it("ramps 0→1 across the establish hold (frames 90–149)", () => {
    expect(cameraForFrame(90, phases, sols).fillReveal).toBeCloseTo(0, 1);
    expect(cameraForFrame(119, phases, sols).fillReveal).toBeCloseTo(0.5, 1);
    expect(cameraForFrame(149, phases, sols).fillReveal).toBeCloseTo(1, 1);
  });

  it("is 1 after the establish beat ends", () => {
    expect(cameraForFrame(150, phases, sols).fillReveal).toBe(1);
    expect(cameraForFrame(300, phases, sols).fillReveal).toBe(1);
  });

  it("sits on the title beat camera during its hold", () => {
    const r = cameraForFrame(30, phases, sols);
    expect(r.beatIndex).toBe(0);
    expect(r.camera.center).toEqual([0, 0]);
  });

  it("interpolates center/zoom during the reveal move (frames 150–179)", () => {
    // midpoint ~frame 165 → between sol[1]=[0,0] and sol[2]=[10,10].
    const r = cameraForFrame(165, phases, sols);
    expect(r.beatIndex).toBe(2);
    expect(r.camera.center[0]).toBeGreaterThan(0);
    expect(r.camera.center[0]).toBeLessThan(10);
  });

  it("lands exactly on the target camera once the reveal move completes", () => {
    const r = cameraForFrame(185, phases, sols); // into reveal hold
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
