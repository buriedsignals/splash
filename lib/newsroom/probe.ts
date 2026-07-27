// probe.ts — the primitives that ask the MACHINE a question, in one home. They are
// deliberately tiny and dependency-free (node:fs only) so every consumer can import them:
// lib/newsroom's own readiness and decor, and the shipped skills/splash/src/preflight.ts,
// which used to carry byte-identical copies of the first three.
//
// Keeping them here is what makes the branch's thesis ("one declaration") true of the
// BEHAVIOUR too, not only of the capability data: a fix to the .env parser, or a change of
// mind about what counts as "set", now happens once.
import { readFileSync, statSync } from "node:fs";
import { arch, platform } from "node:os";
import { join } from "node:path";

/**
 * Parse a KEY=value file into a plain map. A line that does not look like an assignment is
 * ignored, and an unreadable/absent file yields an empty map — never a throw: a missing .env
 * means "nothing is configured", which every caller already handles.
 */
export function parseEnvFile(path: string): Record<string, string> {
  const out: Record<string, string> = {};
  try {
    for (const line of readFileSync(path, "utf8").split("\n")) {
      const m = line.match(/^([A-Z_][A-Z0-9_]*)\s*=\s*"?([^"\n]*)"?\s*$/);
      if (m) out[m[1]!] = m[2]!;
    }
  } catch {
    // no such file — the process environment alone decides
  }
  return out;
}

/** An empty or whitespace-only value is NOT set: an untouched `.env.example` line is not a key. */
export function isSet(v: string | undefined): boolean {
  return typeof v === "string" && v.trim() !== "";
}

/** Does this package resolve from that directory? The real machine answer, injectable in tests. */
export function defaultResolveDep(pkg: string, fromDir: string): boolean {
  try {
    Bun.resolveSync(pkg, fromDir);
    return true;
  } catch {
    return false;
  }
}

export type BrowserProbeStatus = "ready" | "missing";

export type BrowserProbeResult = {
  status: BrowserProbeStatus;
  /** Where a fully extracted browser would live, named even when it is not there — so a
   *  caller can surface the exact path in a diagnostic without recomputing it. */
  executablePath: string;
};

// A real chrome-headless-shell binary runs 50-90 MB. A stub, a truncated mid-write, or an
// empty placeholder cannot reach this floor, so it is a cheap extra guard against a false
// green beyond mere existence — see probe.test.ts's "truncated stub" case.
const MIN_BROWSER_EXECUTABLE_BYTES = 1_000_000;

/** The platform folder name @remotion/renderer's own BrowserFetcher uses. Unsupported hosts
 *  (anything besides darwin/linux/win32) return null rather than throw: a probe must never
 *  crash a readiness read. */
function remotionPlatformDir(): string | null {
  const os = platform();
  if (os === "darwin") return arch() === "arm64" ? "mac-arm64" : "mac-x64";
  if (os === "linux") return arch() === "arm64" ? "linux-arm64" : "linux64";
  if (os === "win32") return "win64";
  return null;
}

function remotionExecutableName(platformDir: string): string {
  if (platformDir === "win64") return "chrome-headless-shell.exe";
  if (platformDir === "linux-arm64") return "headless_shell";
  return "chrome-headless-shell";
}

/**
 * Where @remotion/renderer's OWN download cache would place a fully extracted headless-shell
 * binary for a package rooted at `fromDir`: node_modules/.remotion/chrome-headless-shell/
 * <platform>/chrome-headless-shell-<platform>/<executable>. This mirrors that private
 * convention (verified against a real `bunx remotion browser ensure` run) rather than
 * importing it — @remotion/renderer/dist/browser/BrowserFetcher.js is not a public export, and
 * liable to move between Remotion releases. Exported so a probe and its test compute the SAME
 * path without either hardcoding a host platform string. Null on an unsupported host.
 */
export function remotionExecutablePath(fromDir: string): string | null {
  const platformDir = remotionPlatformDir();
  if (!platformDir) return null;
  return join(
    fromDir,
    "node_modules",
    ".remotion",
    "chrome-headless-shell",
    platformDir,
    `chrome-headless-shell-${platformDir}`,
    remotionExecutableName(platformDir),
  );
}

/**
 * Does a FULLY EXTRACTED Remotion headless-shell browser sit where a video render from
 * `fromDir` would look for it? A filesystem stat only — no spawn, no network — so it costs
 * nothing on every readiness call.
 *
 * This is what a bare package-resolution check (`defaultResolveDep("remotion", fromDir)`)
 * cannot see: the real incident behind this probe was a stalled fetch that left a partial
 * `.zip` sitting in the SAME downloads folder, never extracted, while `remotion` itself
 * resolved fine and every dependent render died with an unreadable subprocess dump.
 */
export function probeRemotionBrowser(fromDir: string): BrowserProbeResult {
  const executablePath = remotionExecutablePath(fromDir);
  if (!executablePath) return { status: "missing", executablePath: "" };
  let ready = false;
  try {
    const stat = statSync(executablePath);
    ready = stat.isFile() && stat.size >= MIN_BROWSER_EXECUTABLE_BYTES;
  } catch {
    ready = false; // no such file — nothing was ever extracted here
  }
  return { status: ready ? "ready" : "missing", executablePath };
}
