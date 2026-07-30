import { describe, it, expect } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { snapViewportFor } from "../scripts/lib/snap-viewport.mjs";

describe("the contrast snaps open the window the deliverable is rendered in", () => {
  it("should size the viewport from the channel's media box", () => {
    // 1080x1920 / STATIC_DEVICE_SCALE(2) = the CSS box vite.config.ts:61-62 builds.
    expect(snapViewportFor("social-vertical")).toEqual({
      width: 540,
      height: 960,
    });
    expect(snapViewportFor("social-feed")).toEqual({ width: 540, height: 540 });
    expect(snapViewportFor("article-web")).toEqual({ width: 600, height: 338 });
  });

  it("should keep the historical 900x560 when no channel is threaded", () => {
    // A manual run without SPLASH_CHANNEL must not change behaviour.
    expect(snapViewportFor(undefined)).toEqual({ width: 900, height: 560 });
  });

  it("should be what both snaps actually call", () => {
    for (const f of ["snap-contrast.mjs", "snap-interactive-contrast.mjs"]) {
      const src = readFileSync(
        join(import.meta.dir, "..", "scripts", f),
        "utf8",
      );
      expect(src).toContain("snapViewportFor");
      expect(src).toContain("SPLASH_CHANNEL");
      expect(src).not.toContain("width: 900, height: 560");
    }
  });
});
