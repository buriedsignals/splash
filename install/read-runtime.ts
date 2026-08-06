#!/usr/bin/env bun
// read-runtime.ts — which agentic runtime this install uses, printed for the bootstrap.
//
// The runtime has ONE home: newsroom.json, written by the setup page. `.splash-runtime` is read
// here for exactly one reason — an install that upgraded its Splash source but has not been
// through the page yet still has its choice recorded only there. The page retires that file the
// first time it writes, so the legacy branch dies out on its own.
//
// DELIBERATELY DEPENDENCY-FREE (node:fs only, no zod, no lib/newsroom). It runs inside
// install/bootstrap.sh before anything has been installed, and a decor it cannot parse must
// resolve to the default rather than stop an installation.
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

export const DEFAULT_RUNTIME = "claude";

/**
 * The shipped runtime modules, read from disk rather than listed here: adding a runtime is a new
 * install/runtimes/<name>.sh, never an edit to a shared file (the rule bootstrap.sh already
 * follows). It doubles as the allowlist — this value is interpolated into the bootstrap's shell
 * and used to build a path, and it comes off disk, so anything not naming a shipped module is
 * refused rather than passed on.
 */
function shippedRuntimes(): Set<string> {
  try {
    return new Set(
      readdirSync(join(import.meta.dir, "runtimes"))
        .filter((f) => f.endsWith(".sh") || f.endsWith(".ps1"))
        .map((f) => f.replace(/\.(sh|ps1)$/, "")),
    );
  } catch {
    return new Set([DEFAULT_RUNTIME]);
  }
}

/**
 * Whether `<id>` ships a module for `platform` — `.sh` on macOS/Linux, `.ps1` on Windows.
 *
 * The setup page's runtime radio uses this to decide what to OFFER, not only what to accept: before
 * this, `RUNTIMES.verified` was the only gate on the radio (install/preflight/client.ts), and
 * `shippedRuntimes()` above allowlists on `.sh` OR `.ps1` with no platform distinction — so a
 * macOS-only app (goose-desktop, claude-desktop, which ship no `.ps1`) passed straight through on
 * Windows. The install would then die at `bootstrap.ps1`'s runtime dispatch ("No runtime module
 * for '<id>'") after the keys were typed and everything else installed. Scoping the OFFER to the
 * SERVING machine's platform, with the same disk-derived rule, is what makes that unreachable.
 */
export function hasRuntimeModuleForPlatform(
  id: string,
  platform: NodeJS.Platform,
): boolean {
  const ext = platform === "win32" ? "ps1" : "sh";
  return existsSync(join(import.meta.dir, "runtimes", `${id}.${ext}`));
}

function fromDecor(dir: string): string | undefined {
  const path = join(dir, "newsroom.json");
  if (!existsSync(path)) return undefined;
  try {
    const parsed = JSON.parse(readFileSync(path, "utf8")) as {
      runtime?: unknown;
    };
    return typeof parsed.runtime === "string"
      ? parsed.runtime.trim()
      : undefined;
  } catch {
    return undefined; // a broken decor is fixed by re-running the setup page, not by failing here
  }
}

function fromLegacyFile(dir: string): string | undefined {
  const path = join(dir, ".splash-runtime");
  if (!existsSync(path)) return undefined;
  try {
    return readFileSync(path, "utf8").trim() || undefined;
  } catch {
    return undefined;
  }
}

export function installedRuntime(dir: string): string {
  const shipped = shippedRuntimes();
  for (const candidate of [fromDecor(dir), fromLegacyFile(dir)])
    if (candidate && shipped.has(candidate)) return candidate;
  return DEFAULT_RUNTIME;
}

if (import.meta.main) console.log(installedRuntime(process.cwd()));
