// The render watchdog: a hung Remotion render (the seismes-class Remotion+MapLibre
// per-frame hang) must become a bounded, clean fail-hard instead of burning the whole
// run. Real subprocesses (no mocks): a genuinely hung child is spawned and must be
// killed within the configured timeout.
import { describe, it, expect } from "bun:test";
import {
  DEFAULT_VIDEO_TIMEOUT_MS,
  videoTimeoutMs,
  runWithVideoWatchdog,
} from "../src/video-watchdog";

describe("videoTimeoutMs — the ATELIER_VIDEO_TIMEOUT_MS knob", () => {
  it("should default to 15 minutes when the env var is absent", () => {
    expect(videoTimeoutMs({})).toBe(DEFAULT_VIDEO_TIMEOUT_MS);
    expect(DEFAULT_VIDEO_TIMEOUT_MS).toBe(900_000);
  });

  it("should read a positive integer override", () => {
    expect(videoTimeoutMs({ ATELIER_VIDEO_TIMEOUT_MS: "60000" })).toBe(60_000);
  });

  it("should reject a non-numeric or non-positive override instead of silently unbounding", () => {
    expect(() => videoTimeoutMs({ ATELIER_VIDEO_TIMEOUT_MS: "soon" })).toThrow(
      /ATELIER_VIDEO_TIMEOUT_MS/,
    );
    expect(() => videoTimeoutMs({ ATELIER_VIDEO_TIMEOUT_MS: "0" })).toThrow(
      /ATELIER_VIDEO_TIMEOUT_MS/,
    );
    expect(() => videoTimeoutMs({ ATELIER_VIDEO_TIMEOUT_MS: "-5" })).toThrow(
      /ATELIER_VIDEO_TIMEOUT_MS/,
    );
  });
});

describe("runWithVideoWatchdog — bounded subprocess execution", () => {
  it("should resolve when the child exits 0 in time", async () => {
    await runWithVideoWatchdog("bun", ["-e", "0"], { timeoutMs: 60_000 });
  }, 60_000);

  it("should reject when the child exits non-zero", async () => {
    await expect(
      runWithVideoWatchdog("bun", ["-e", "process.exit(3)"], {
        timeoutMs: 60_000,
      }),
    ).rejects.toThrow(/exit/i);
  }, 60_000);

  it("should kill a hung child and reject with a message naming the timeout and the env override", async () => {
    const t0 = Date.now();
    await expect(
      runWithVideoWatchdog(
        "bun",
        ["-e", "await new Promise(() => {})"], // hangs forever — the seismes shape
        { timeoutMs: 500 },
      ),
    ).rejects.toThrow(/500 ms.*ATELIER_VIDEO_TIMEOUT_MS/s);
    // the whole point: bounded, not the bun default 5s flake nor an infinite burn
    expect(Date.now() - t0).toBeLessThan(10_000);
  }, 60_000);
});
