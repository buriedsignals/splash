// Render watchdog: bounds a Remotion render/still subprocess with a hard timeout
// that kills the WHOLE process tree (bunx/npx → remotion CLI → headless Chromium),
// then fails with a clear, actionable message. Converts the seismes-class infinite
// hang (Remotion+MapLibre per-frame render — see CLAUDE.md backlog) into a clean
// fail-hard; root-causing the hang itself stays a separate ticket. MIRROR of
// skills/chart-native/src/video-watchdog.ts (mirror-pattern, like video-verify.ts) —
// keep the two in lockstep. map-native is the skill the seismes hang was observed in.
// Explicit node: imports (no ambient node globals) — this tsconfig does not include
// the "node" types globally.
import { spawn } from "node:child_process";
import process from "node:process";

/** Hard ceiling on ONE render subprocess, in ms. 15 min is a ceiling, not a target:
 * the slowest legitimate render observed (map-native story portrait) finishes well
 * under it, while a hung render never returns at all. Override per run with
 * SPLASH_VIDEO_TIMEOUT_MS. */
export const DEFAULT_VIDEO_TIMEOUT_MS = 900_000;

/** Resolves the effective watchdog timeout from the environment. A malformed or
 * non-positive override throws (fail-closed) rather than silently unbounding the
 * render. */
export function videoTimeoutMs(
  env: Record<string, string | undefined> = process.env,
): number {
  const raw = env.SPLASH_VIDEO_TIMEOUT_MS;
  if (raw === undefined || raw.trim() === "") return DEFAULT_VIDEO_TIMEOUT_MS;
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) {
    throw new Error(
      `SPLASH_VIDEO_TIMEOUT_MS must be a positive number of milliseconds, got "${raw}"`,
    );
  }
  return n;
}

export interface WatchdogOptions {
  cwd?: string;
  env?: Record<string, string | undefined>;
  shell?: boolean;
  /** Defaults to videoTimeoutMs() — the env-driven knob above. */
  timeoutMs?: number;
}

/** Runs `cmd args…` with inherited stdio, killing the whole process tree and
 * rejecting if it outlives the watchdog. Off Windows the child is spawned detached
 * (its own process group) so `kill(-pid)` reaps grandchildren (the Chromium a
 * remotion CLI leaves behind); on Windows `taskkill /T /F` does the same.
 *
 * Because `detached` removes the child from the terminal's FOREGROUND process group,
 * a user Ctrl-C (SIGINT to the foreground group) would no longer reach the render
 * tree — it would linger orphaned, and a HUNG one would linger forever (the watchdog
 * timer dies with the parent). So while a render is in flight, SIGINT/SIGTERM on the
 * parent are forwarded to the child's process group; the child's exit then settles
 * the promise (rejecting with the signal), and the handlers are removed on settle so
 * the parent's default die-on-signal behavior returns between renders. */
export function runWithVideoWatchdog(
  cmd: string,
  args: string[],
  options: WatchdogOptions = {},
): Promise<void> {
  const timeoutMs = options.timeoutMs ?? videoTimeoutMs();
  const isWin = process.platform === "win32";
  return new Promise<void>((resolve, reject) => {
    const child = spawn(cmd, args, {
      stdio: "inherit",
      cwd: options.cwd,
      env: options.env as NodeJS.ProcessEnv | undefined,
      shell: options.shell ?? false,
      detached: !isWin,
    });
    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      try {
        if (isWin) {
          spawn("taskkill", ["/pid", String(child.pid), "/T", "/F"], {
            stdio: "ignore",
          });
        } else if (child.pid !== undefined) {
          process.kill(-child.pid, "SIGKILL"); // negative pid = the whole process group
        }
      } catch {
        // already dead — the exit handler below settles the promise
      }
    }, timeoutMs);
    // Forward the user's interrupt to the detached render tree (POSIX only: on
    // Windows the child is NOT detached, so the console already delivers Ctrl-C to
    // it). The same signal is forwarded — not SIGKILL — so the remotion CLI gets its
    // normal graceful-shutdown path; the exit handler below settles the promise.
    const forwardSignal = (signal: NodeJS.Signals) => {
      try {
        if (!isWin && child.pid !== undefined) process.kill(-child.pid, signal);
      } catch {
        // already dead — the exit handler below settles the promise
      }
    };
    const onSigint = () => forwardSignal("SIGINT");
    const onSigterm = () => forwardSignal("SIGTERM");
    if (!isWin) {
      process.on("SIGINT", onSigint);
      process.on("SIGTERM", onSigterm);
    }
    const settle = () => {
      clearTimeout(timer);
      if (!isWin) {
        process.off("SIGINT", onSigint);
        process.off("SIGTERM", onSigterm);
      }
    };
    child.on("error", (err) => {
      settle();
      reject(err);
    });
    child.on("exit", (code, signal) => {
      settle();
      if (timedOut) {
        reject(
          new Error(
            `video render exceeded the ${timeoutMs} ms watchdog and was killed ` +
              `(${cmd} ${args.join(" ")}). A legitimate render should finish well under this; ` +
              `if yours genuinely needs longer, raise it via SPLASH_VIDEO_TIMEOUT_MS.`,
          ),
        );
      } else if (code !== 0) {
        reject(
          new Error(
            `video render exited with ${code === null ? `signal ${signal}` : `code ${code}`} (${cmd} ${args.join(" ")})`,
          ),
        );
      } else {
        resolve();
      }
    });
  });
}
