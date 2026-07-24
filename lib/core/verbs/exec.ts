import { execFileSync } from "node:child_process";
import { mkdirSync, readdirSync, rmSync, statSync } from "node:fs";
import { join, resolve } from "node:path";
import { getProducer } from "../registry";
import type { Channel } from "../vocabulary";

// Flat directory listing (none of the 4 file-based scripts — chart-native, map-native,
// scrolly, image-native — write subdirectories into outDir: static.png /
// interactive.html / *.mp4 / scrolly.html all land directly there).
export function collectOutputs(dir: string): string[] {
  return readdirSync(dir)
    .filter((name) => statSync(join(dir, name)).isFile())
    .sort()
    .map((name) => join(dir, name));
}

function toText(buf: Buffer | string | undefined): string {
  return typeof buf === "string" ? buf : (buf?.toString("utf8") ?? "");
}

// Last N lines of a stream, for a bounded error/report dump (mirrors scripts/check.mjs's
// own `.slice(-30)` convention for failure output).
function tail(text: string, lines = 30): string {
  return text.split("\n").slice(-lines).join("\n").trim();
}

export type ExecOutcome =
  | { status: "produced" }
  | { status: "needs-fallback"; reason: string }
  | { status: "failed"; error: string };

// Runs a file-based producer script and normalizes its outcome. Captures BOTH stdout
// and stderr — NEITHER is ever inherited — so a producer's own build/render logs
// (chart-native's Vite output, map-native's "[produce map] building…", etc.) can never
// interleave with produce-all's own final JSON.stringify(report) line on the real
// stdout. Exit code 2 is chart-native's reliable FALLBACK_TO_DW signal; we still parse
// the captured stderr for the human-readable reason line (present whenever the
// fallback is chart-native's — the only producer that emits it) and fall back to a
// generic reason if a future producer ever exits 2 without one.
export function runProducerScript(
  cmd: string,
  args: string[],
  cwd: string,
  env: Record<string, string> = {},
): ExecOutcome {
  try {
    execFileSync(cmd, args, {
      cwd,
      stdio: ["ignore", "pipe", "pipe"],
      maxBuffer: 1024 * 1024 * 20,
      // Merge onto the parent's own env (never replace it) — empty `env` is a no-op,
      // matching the pre-Slice-2 behavior exactly (execFileSync inherits process.env
      // when no `env` option is given at all).
      env: { ...process.env, ...env },
    });
    return { status: "produced" };
  } catch (e) {
    const execErr = e as NodeJS.ErrnoException & {
      stdout?: Buffer | string;
      stderr?: Buffer | string;
      status?: number | null;
    };
    const stdoutText = toText(execErr.stdout);
    const stderrText = toText(execErr.stderr);
    const fallbackLine = stderrText
      .split("\n")
      .find((line) => line.includes("FALLBACK_TO_DW"));
    if (execErr.status === 2) {
      return {
        status: "needs-fallback",
        reason:
          fallbackLine?.trim() ??
          "native type unsupported (exit code 2, FALLBACK_TO_DW)",
      };
    }
    const dump = [
      stdoutText && `stdout:\n${tail(stdoutText)}`,
      stderrText && `stderr:\n${tail(stderrText)}`,
    ]
      .filter(Boolean)
      .join("\n\n");
    return { status: "failed", error: dump || execErr.message || String(e) };
  }
}

// Wipes `dir` clean (if it exists) and recreates it empty — a WHOLLY FRESH outDir for
// the dispatch about to write into it. Every proposal's `<outDir>/<id>` directory is
// keyed purely by `id` (produce-all.ts), so a re-produce that swaps producer/format for
// the same id (the sanctioned native→dw fallback, a source fix, a retry) would otherwise
// dispatch into the SAME directory the superseded attempt already wrote into — leaving
// its stray artifacts (e.g. a failed interactive map-native attempt's `interactive.html`
// / `a11y.png` / `responsive-*.png`) sitting next to the new delivery. None of the 5
// producers ever read pre-existing outDir contents before writing (no incremental/cached
// build depends on a prior run's files), so clearing first — before EVERY dispatch, not
// only a producer/format switch — is always safe and matches SKILL.md's own "every
// re-produce writes a WHOLLY FRESH ..." invariant (5c), extended from `report.json` to
// the artifact directory itself.
export function freshOutDir(dir: string): string {
  const abs = resolve(dir);
  rmSync(abs, { recursive: true, force: true });
  mkdirSync(abs, { recursive: true });
  return abs;
}

// The extra env a subprocess dispatch needs. Whether SPLASH_CHANNEL is threaded is the
// engine manifest's `threadsChannel` flag, never a hard-coded producer list: the two
// native engines render at the channel's size/aspect and set it; scrolly / image-native
// do not read a channel. The channel here is ALWAYS resolved — the contract's
// RenderPayload.channel is non-optional, so the legacy's `?? "article-web"` defaulting
// stays with the legacy caller where it belongs.
export function channelEnvForEngine(
  engine: string,
  channel: Channel,
): Record<string, string> {
  const sub = getProducer(engine)?.subprocess;
  if (!sub)
    throw new Error(`no subprocess config registered for producer "${engine}"`);
  return sub.threadsChannel ? { SPLASH_CHANNEL: channel } : {};
}
