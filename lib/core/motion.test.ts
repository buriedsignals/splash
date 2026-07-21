import { describe, it, expect, afterEach } from "bun:test";
import { prefersReducedMotion } from "./motion";

const originalWindow = (globalThis as { window?: unknown }).window;

afterEach(() => {
  if (originalWindow === undefined) {
    delete (globalThis as { window?: unknown }).window;
  } else {
    (globalThis as { window?: unknown }).window = originalWindow;
  }
});

function stubMatchMedia(matches: boolean) {
  (globalThis as { window?: unknown }).window = {
    matchMedia: (query: string) => ({ matches, media: query }),
  };
}

describe("core/motion prefersReducedMotion", () => {
  it("returns false when window is unavailable (SSR/Node/Remotion)", () => {
    delete (globalThis as { window?: unknown }).window;
    expect(prefersReducedMotion()).toBe(false);
  });

  it("returns false when matchMedia is unavailable", () => {
    (globalThis as { window?: unknown }).window = {};
    expect(prefersReducedMotion()).toBe(false);
  });

  it("returns true when the OS setting requests reduced motion", () => {
    stubMatchMedia(true);
    expect(prefersReducedMotion()).toBe(true);
  });

  it("returns false when the OS setting does not request reduced motion", () => {
    stubMatchMedia(false);
    expect(prefersReducedMotion()).toBe(false);
  });
});
