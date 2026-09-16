// skills/map-beat/test/live-map-camera.test.ts
import { describe, expect, it } from "bun:test";
import { bootOptionsOf, settleFrame } from "../assets/live-map.ts";

describe("bootOptionsOf", () => {
  it("should boot a moving-camera plan at its first view", () => {
    expect(
      bootOptionsOf({
        camera: { view: { center: [10, 50], zoom: 3.2 } },
      } as any),
    ).toEqual({ center: [10, 50], zoom: 3.2 });
  });
  it("should boot a fixed plan at its bounds, unanimated and unpadded", () => {
    expect(
      bootOptionsOf({
        camera: {
          bounds: [
            [0, 0],
            [1, 1],
          ],
        },
      } as any),
    ).toEqual({
      bounds: [
        [0, 0],
        [1, 1],
      ],
      fitBoundsOptions: { padding: 0, animate: false },
    });
  });
  it("should refuse a plan with no camera", () => {
    expect(() => bootOptionsOf({ camera: {} } as any)).toThrow(/camera/);
  });
});

/** A map stand-in with MapLibre's two calls the settle reads; `loaded` lists what areTilesLoaded answers, idle by idle. */
function mapAnswering(loaded: boolean[]) {
  let i = 0;
  return {
    once: (_: string, fn: () => void) => queueMicrotask(fn),
    triggerRepaint() {},
    areTilesLoaded: () => loaded[Math.min(i++, loaded.length - 1)],
  };
}

describe("settleFrame", () => {
  it("should wait for idle again until every tile is loaded", async () => {
    const map = mapAnswering([false, false, true]);
    await settleFrame(map as any);
    expect(map.areTilesLoaded()).toBe(true);
  });
  it("should refuse a frame whose tiles never load", async () => {
    await expect(
      settleFrame(mapAnswering([false]) as any, { attempts: 3 }),
    ).rejects.toThrow(/tile still loading/);
  });
});
