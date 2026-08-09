/**
 * RULING R1b, AS A GUARD.
 *
 * R1 put a live MapTiler key in the delivered HTML, knowingly: a web map you cannot move through is
 * a picture, and MapTiler's own documentation calls an API key *"a simple and easy-to-use
 * authentication for client-side use"*. It did NOT cover a second place the key would land. Every
 * map × web beat COMMITS its rendered HTML (`beat-genre-produces-artifact.test.ts` requires the
 * artifact to exist on disk), so a naive implementation writes a live key into a dozen tracked
 * files — and the FJM deliverable is an MIT open-source release. A key pushed to a public
 * repository is found by scanners within minutes and stays in the history after any later removal.
 *
 * It matters more than the usual key leak because MapTiler **invalidates ALL of an account's keys
 * at 100% of its spending limit**. One abused key blanks the maps in articles already published.
 *
 * So: committed artifacts carry a placeholder, `twin-deliver` substitutes the real key at the
 * moment a file goes to a newsroom, and THIS reddens before the mistake is committed rather than
 * after. The key it looks for is the real one in `twin/.env`, so it cannot be satisfied by a
 * pattern that a future key format would slip past.
 *
 * It scans TRACKED files only — `git ls-files`. An untracked scratch file with a key in it is not a
 * leak; a staged one is. That distinction is the whole point, and it is why this cannot be written
 * as a directory walk.
 *
 * WHAT IT DOES NOT CATCH, named rather than implied: a key already in the git HISTORY (this reads
 * the working tree), a DIFFERENT MapTiler key than the one in `twin/.env`, and any other vendor's
 * credential. The first is why the guard exists before the first live-tile artifact is committed
 * rather than after.
 */
import { describe, expect, it } from "bun:test";
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const TWIN = join(import.meta.dirname, "..", "..", "..");
const ENV = join(TWIN, ".env");

function keyFromEnv(): string | null {
  if (!existsSync(ENV)) return null;
  for (const line of readFileSync(ENV, "utf8").split(/\r?\n/)) {
    const m =
      /^\s*(MAPTILER_KEY|MAPTILER_API_KEY|VITE_MAPTILER_KEY|REMOTION_MAPTILER_KEY)\s*=\s*(\S+)\s*$/.exec(
        line,
      );
    if (m && m[2] && m[2].length >= 8) return m[2];
  }
  return null;
}

/** Tracked files under `twin/`, relative to it, as git itself sees them. */
function trackedFiles(): string[] {
  return execFileSync("git", ["ls-files", "-z", "--", "."], {
    cwd: TWIN,
    encoding: "utf8",
  })
    .split("\0")
    .filter(Boolean);
}

const key = keyFromEnv();

describe("R1b — no tracked file carries a real MapTiler key", () => {
  it("should have a key to look for, or say plainly that it is not looking", () => {
    if (!key)
      console.log(
        "R1b: no MAPTILER_KEY in twin/.env — the scan below has nothing to look for.",
      );
    expect(true).toBe(true);
  });

  it("should not find the development key in any tracked file", () => {
    if (!key) return;
    const offenders: string[] = [];
    for (const rel of trackedFiles()) {
      const path = join(TWIN, rel);
      if (!existsSync(path)) continue;
      // Binary artifacts (plates, mp4s) cannot carry a key in a way a reader's browser would use,
      // and reading them as utf8 is wasteful. Anything over 8 MB is likewise not a source file.
      if (/\.(png|jpe?g|mp4|webm|gif|woff2?|ttf|ico|pdf)$/i.test(rel)) continue;
      if (statSync(path).size > 8_000_000) continue;
      if (readFileSync(path, "utf8").includes(key)) offenders.push(rel);
    }
    expect(offenders).toEqual([]);
  });

  it("should confirm the env file itself is untracked, which is what makes the key safe to hold", () => {
    if (!key) return;
    expect(trackedFiles()).not.toContain(".env");
  });
});
