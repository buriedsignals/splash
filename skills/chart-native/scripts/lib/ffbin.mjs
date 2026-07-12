// Resolves the ffmpeg/ffprobe binaries that Remotion already ships in its
// platform compositor package (@remotion/compositor-<platform>-<arch> — the same
// binaries `remotion render` itself encodes with), so snap-video.mjs needs NO
// system ffmpeg install. Falls back to a system ffmpeg/ffprobe on PATH; if neither
// exists, throws with a clear install message. On macOS the compositor binaries
// need DYLD_LIBRARY_PATH pointed at their own dir (mirrors @remotion/renderer's
// call-ffmpeg): pass the returned `env`/`cwd` to every spawn of these binaries.
import { existsSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { spawnSync } from "node:child_process";

const require = createRequire(import.meta.url);

// Platform → Remotion compositor package (mirrors @remotion/renderer's own switch;
// the linux-musl variants are omitted — the system-PATH fallback covers them).
function compositorPackageName() {
  const { platform, arch } = process;
  if (platform === "darwin") {
    return arch === "arm64" ? "@remotion/compositor-darwin-arm64" : "@remotion/compositor-darwin-x64";
  }
  if (platform === "win32") return "@remotion/compositor-win32-x64-msvc";
  if (platform === "linux") {
    return arch === "arm64" ? "@remotion/compositor-linux-arm64-gnu" : "@remotion/compositor-linux-x64-gnu";
  }
  return null;
}

/**
 * @returns {{ ffmpeg: string, ffprobe: string, cwd: string | undefined, env: Record<string, string | undefined> }}
 */
export function resolveFfBinaries() {
  const suffix = process.platform === "win32" ? ".exe" : "";
  const pkg = compositorPackageName();
  if (pkg) {
    try {
      const dir = dirname(require.resolve(`${pkg}/package.json`));
      const ffmpeg = join(dir, `ffmpeg${suffix}`);
      const ffprobe = join(dir, `ffprobe${suffix}`);
      if (existsSync(ffmpeg) && existsSync(ffprobe)) {
        return {
          ffmpeg,
          ffprobe,
          cwd: dir,
          env:
            process.platform === "darwin"
              ? { ...process.env, DYLD_LIBRARY_PATH: dir }
              : { ...process.env },
        };
      }
    } catch {
      // package not installed for this platform — try the system PATH below
    }
  }
  // System fallback: a PATH-resolved ffmpeg/ffprobe pair.
  const probe = spawnSync(`ffprobe${suffix}`, ["-version"], { stdio: "ignore" });
  const mpeg = spawnSync(`ffmpeg${suffix}`, ["-version"], { stdio: "ignore" });
  if (probe.status === 0 && mpeg.status === 0) {
    return { ffmpeg: `ffmpeg${suffix}`, ffprobe: `ffprobe${suffix}`, cwd: undefined, env: { ...process.env } };
  }
  throw new Error(
    "snap-video: no ffmpeg/ffprobe found. Expected Remotion's bundled binaries " +
      `(${pkg ?? "no compositor package for this platform"} — run \`bun install\` in this skill) ` +
      "or a system ffmpeg+ffprobe on PATH.",
  );
}
