// The render watchdog: a hung Remotion render (the seismes-class Remotion+MapLibre
// per-frame hang) must become a bounded, clean fail-hard instead of burning the whole
// run. Real subprocesses (no mocks): a genuinely hung child is spawned and must be
// killed within the configured timeout.
import { describe, it, expect } from "bun:test";
import { spawn } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  DEFAULT_VIDEO_TIMEOUT_MS,
  videoTimeoutMs,
  runWithVideoWatchdog,
} from "../src/video-watchdog";

const here = dirname(fileURLToPath(import.meta.url));

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

  // detached:true puts the render in its own process group, so the terminal's Ctrl-C
  // (delivered to the FOREGROUND group only) never reaches it — without forwarding,
  // the render tree is orphaned and a hung one lingers forever (the watchdog timer
  // dies with the parent). Real processes: a helper parent runs a genuinely hung
  // child under the watchdog; the test Ctrl-Cs the helper and the child must die.
  it.skipIf(process.platform === "win32")(
    "should forward SIGINT to the detached child's process group so Ctrl-C reaches the render tree",
    async () => {
      const pidFile = join(mkdtempSync(join(tmpdir(), "watchdog-sig-")), "child.pid");
      const helper = spawn(
        "bun",
        [join(here, "helpers", "watchdog-signal-helper.ts"), pidFile],
        { stdio: ["ignore", "ignore", "pipe"] },
      );
      let childPid: number | undefined;
      try {
        // wait until the hung grandchild is alive and registered
        const deadline = Date.now() + 30_000;
        while (!existsSync(pidFile) || readFileSync(pidFile, "utf8") === "") {
          if (Date.now() > deadline) throw new Error("hung child never started");
          await new Promise((r) => setTimeout(r, 50));
        }
        childPid = Number(readFileSync(pidFile, "utf8"));
        expect(() => process.kill(childPid!, 0)).not.toThrow(); // alive before Ctrl-C

        helper.kill("SIGINT"); // what Ctrl-C delivers to the parent
        await new Promise((resolve) => helper.on("exit", resolve));

        // the forwarded signal must reap the detached child (poll: delivery is async)
        const killDeadline = Date.now() + 10_000;
        let dead = false;
        while (!dead && Date.now() < killDeadline) {
          try {
            process.kill(childPid, 0);
            await new Promise((r) => setTimeout(r, 50));
          } catch {
            dead = true;
          }
        }
        expect(dead).toBe(true);
      } finally {
        // never leak the hung child if the assertion above fails
        if (childPid !== undefined) {
          try {
            process.kill(childPid, "SIGKILL");
          } catch {
            // already dead — the passing case
          }
        }
        helper.kill("SIGKILL");
      }
    },
    60_000,
  );
});
