import { describe, it, expect } from "bun:test";
import {
  resolveScene,
  TITLE_SCENE_FRAMES,
  CROSSFADE_FRAMES,
} from "../src/video-scene";

describe("resolveScene", () => {
  const END = 75;
  it("title full, furniture hidden at frame 0", () => {
    const s = resolveScene(0, { titleSceneEndFrame: END });
    expect(s.titleOpacity).toBe(1);
    expect(s.furnitureOpacity).toBe(0);
  });
  it("holds title=1/furniture=0 before the crossfade window", () => {
    const s = resolveScene(END - CROSSFADE_FRAMES - 1, {
      titleSceneEndFrame: END,
    });
    expect(s.titleOpacity).toBe(1);
    expect(s.furnitureOpacity).toBe(0);
  });
  it("furniture full, title gone at/after the title scene end", () => {
    const s = resolveScene(END, { titleSceneEndFrame: END });
    expect(s.titleOpacity).toBeCloseTo(0, 5);
    expect(s.furnitureOpacity).toBeCloseTo(1, 5);
    const after = resolveScene(END + 40, { titleSceneEndFrame: END });
    expect(after.titleOpacity).toBe(0);
    expect(after.furnitureOpacity).toBe(1);
  });
  it("crossfades monotonically (title down, furniture up = 1-title), never NaN", () => {
    let prev = 2;
    for (let f = END - CROSSFADE_FRAMES; f <= END; f++) {
      const s = resolveScene(f, { titleSceneEndFrame: END });
      expect(Number.isNaN(s.titleOpacity)).toBe(false);
      expect(s.titleOpacity).toBeLessThanOrEqual(prev);
      expect(s.furnitureOpacity).toBeCloseTo(1 - s.titleOpacity, 5);
      prev = s.titleOpacity;
    }
  });
  it("exports the scene constants", () => {
    expect(TITLE_SCENE_FRAMES).toBe(75);
    expect(CROSSFADE_FRAMES).toBe(12);
  });
});
