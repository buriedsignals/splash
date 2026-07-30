import { describe, it, expect } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { contrastViewportFor } from "../scripts/lib/contrast-viewport.mjs";

describe("the map-native furniture-contrast snap opens the window the deliverable is rendered in", () => {
  it("should size the viewport from the channel's exact delivered pixels when MAP_WIDTH/MAP_HEIGHT are threaded", () => {
    // social-vertical: 1080x1920 (portrait) — the TALL fixture this bug needs: the old
    // fixed 1200x700 window is SHORTER than this, so a naive fixture (a short/landscape
    // one) could never exercise the y>700 drop this guard used to commit.
    expect(contrastViewportFor("1080", "1920")).toEqual({
      viewport: { width: 1080, height: 1920 },
      deviceScaleFactor: 1,
    });
    // social-feed: 1080x1080 (square) — also taller than the historical 700px window.
    expect(contrastViewportFor("1080", "1080")).toEqual({
      viewport: { width: 1080, height: 1080 },
      deviceScaleFactor: 1,
    });
  });

  it("should keep the historical 1200x700 @2x when no channel size is threaded", () => {
    // Manual runs (`bun scripts/snap-contrast.mjs` with no env) and MODE=interactive (no
    // fixed per-channel box — interactiveAspect is "responsive") must not change behaviour.
    expect(contrastViewportFor(undefined, undefined)).toEqual({
      viewport: { width: 1200, height: 700 },
      deviceScaleFactor: 2,
    });
  });

  it("should be what snap-contrast.mjs actually calls", () => {
    const src = readFileSync(
      join(import.meta.dir, "..", "scripts", "snap-contrast.mjs"),
      "utf8",
    );
    expect(src).toContain("contrastViewportFor");
    expect(src).toContain("MAP_WIDTH");
    expect(src).toContain("MAP_HEIGHT");
    // A fixed hardcoded box inline (rather than through the helper) is the exact
    // regression this guards against — the helper must be the only place that number lives.
    expect(src).not.toMatch(
      /viewport:\s*\{\s*width:\s*1200,\s*height:\s*700\s*\}/,
    );
  });

  it("should be what produce.mjs threads for the static case", () => {
    const src = readFileSync(
      join(import.meta.dir, "..", "scripts", "produce.mjs"),
      "utf8",
    );
    // The static-case snap-contrast call must carry MAP_WIDTH/MAP_HEIGHT, mirroring the
    // snap-static.mjs call just above it.
    const contrastCallMatch = src.match(
      /snap\("scripts\/snap-contrast\.mjs",\s*\{[^}]*\}\)/,
    );
    expect(contrastCallMatch).not.toBeNull();
    expect(contrastCallMatch![0]).toContain("MAP_WIDTH");
    expect(contrastCallMatch![0]).toContain("MAP_HEIGHT");
  });
});
