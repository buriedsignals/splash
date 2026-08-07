import { describe, it, expect } from "bun:test";
import {
  chooseReducedMotionTransition,
  STILL_STORY_NOTE,
  type StepCamera,
} from "./reduced-motion-verdict.ts";

const cam = (n: number): StepCamera => ({ lng: n, lat: n, zoom: 10 + n });

describe("chooseReducedMotionTransition", () => {
  it("tests a MID-story transition when the camera moves there — the reveal step the guard has always aimed at", () => {
    const cams = [0, 1, 2, 3, 4, 5, 6].map(cam);
    expect(chooseReducedMotionTransition(cams)).toEqual({
      kind: "transition",
      from: 2,
      to: 3,
    });
  });

  it("finds a real transition ELSEWHERE when the middle of the story happens to hold still", () => {
    // Steps 0–4 share a frame; the camera only moves into step 5. The guard used to sample
    // step 3 against step 2, find them equal, and refuse the whole build.
    const cams = [cam(0), cam(0), cam(0), cam(0), cam(0), cam(1), cam(1)];
    expect(chooseReducedMotionTransition(cams)).toEqual({
      kind: "transition",
      from: 4,
      to: 5,
    });
  });

  it("picks the mover CLOSEST to the middle, so the end-of-story establish↔takeaway no-op is still avoided", () => {
    const cams = [cam(0), cam(1), cam(1), cam(1), cam(1), cam(1), cam(2)];
    expect(chooseReducedMotionTransition(cams)).toEqual({
      kind: "transition",
      from: 0,
      to: 1,
    });
  });

  it("calls a story STILL only when no step's frame differs from any other, anywhere", () => {
    const cams = [0, 0, 0, 0, 0, 0, 0].map(cam);
    expect(chooseReducedMotionTransition(cams)).toEqual({ kind: "still" });
  });

  it("never calls a story still because two ADJACENT steps happen to share a frame", () => {
    const cams = [cam(0), cam(0), cam(0), cam(0), cam(0), cam(1), cam(1)];
    expect(chooseReducedMotionTransition(cams).kind).toBe("transition");
  });

  it("treats a one-step story as still — there is no pair to compare", () => {
    expect(chooseReducedMotionTransition([cam(0)])).toEqual({ kind: "still" });
  });

  it("says what a still story is in words a journalist reads, not a camera dump", () => {
    expect(STILL_STORY_NOTE).toMatch(/same frame/i);
    expect(STILL_STORY_NOTE).not.toMatch(/vacuous|lng|zoom|\{/i);
  });
});
