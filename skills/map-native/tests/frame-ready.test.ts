import { describe, it, expect } from "bun:test";
import {
  continueWhenMapSettles,
  FRAME_MAP_SETTLE_MS,
  type IdleEmitter,
} from "../src/core/frame-ready";

// A fake map whose `idle` we drive manually — or never fire at all, to prove the
// timeout path always continues the frame (the hang-impossibility invariant).
function fakeMap(): IdleEmitter & { fireIdle: () => void; hasListener: () => boolean } {
  let listener: (() => void) | null = null;
  return {
    once(_type, cb) {
      listener = cb;
      return this;
    },
    fireIdle() {
      const cb = listener;
      listener = null;
      cb?.();
    },
    hasListener() {
      return listener !== null;
    },
  };
}

describe("continueWhenMapSettles", () => {
  it("continues immediately when the map reaches idle", () => {
    const map = fakeMap();
    let continued = 0;
    continueWhenMapSettles(map, () => continued++, 6000);
    expect(continued).toBe(0);
    map.fireIdle();
    expect(continued).toBe(1);
  });

  it("continues after the settle timeout even if idle NEVER fires (no hang)", async () => {
    const map = fakeMap();
    let continued = 0;
    continueWhenMapSettles(map, () => continued++, 10); // short timeout for the test
    expect(continued).toBe(0);
    await new Promise((r) => setTimeout(r, 30));
    expect(continued).toBe(1); // the timeout path fired — a stalled tile cannot hang
  });

  it("continues EXACTLY once — a late idle after the timeout is a no-op", async () => {
    const map = fakeMap();
    let continued = 0;
    continueWhenMapSettles(map, () => continued++, 10);
    await new Promise((r) => setTimeout(r, 30));
    expect(continued).toBe(1);
    map.fireIdle(); // late idle
    expect(continued).toBe(1); // still once — the guard prevents a double continueRender
  });

  it("does not fire the timeout when idle wins the race", async () => {
    const map = fakeMap();
    let continued = 0;
    continueWhenMapSettles(map, () => continued++, 50);
    map.fireIdle();
    expect(continued).toBe(1);
    await new Promise((r) => setTimeout(r, 80));
    expect(continued).toBe(1); // timeout was cleared — no second continue
  });

  it("exposes a sane default settle bound below Remotion's per-frame timeout", () => {
    expect(FRAME_MAP_SETTLE_MS).toBeGreaterThan(1000);
    expect(FRAME_MAP_SETTLE_MS).toBeLessThan(120000);
  });
});
