/**
 * RULING R1b, AS A GUARD.
 *
 * R1 put a live MapTiler key in the delivered HTML, knowingly: a web map you cannot move through is
 * a picture, and MapTiler's own documentation calls an API key *"a simple and easy-to-use
 * authentication for client-side use"*. It did NOT cover a second place the key would land. Every
 * map × web beat COMMITS its rendered HTML (`beat-format-produces-artifact.test.ts` requires the
 * artifact to exist on disk), so a naive implementation writes a live key into a dozen tracked
 * files — and the FJM deliverable is an MIT open-source release. A key pushed to a public
 * repository is found by scanners within minutes and stays in the history after any later removal.
 *
 * It matters more than the usual key leak because MapTiler **invalidates ALL of an account's keys
 * at 100% of its spending limit**. One abused key blanks the maps in articles already published.
 *
 * So: committed artifacts carry a placeholder, `deliver` substitutes the real key at the
 * moment a file goes to a newsroom, and THIS reddens before the mistake is committed rather than
 * after.
 *
 * It scans TRACKED files only — `git ls-files`. An untracked scratch file with a key in it is not a
 * leak; a staged one is. That distinction is the whole point, and it is why this cannot be written
 * as a directory walk.
 *
 * ## THE THREE HOLES THE AUDIT WATCHED GO GREEN, AND HOW EACH IS CLOSED
 *
 * `AUDIT-W5-W6-map.md` §5.2 wrote a key into three tracked files and watched this guard pass on all
 * three:
 *
 *  1. **a tracked `.html` over 8 MB** — the old `:79` skipped anything over 8 000 000 bytes.
 *     A 9 MB tracked `.html` with the key on line 1: 3 pass, 0 fail. Closed by `fileContains`
 *     below, which scans in bounded CHUNKS with an overlap, so a file's SIZE no longer decides
 *     whether it is looked at. Memory stays flat; the reason for the skip does not survive it.
 *  2. **a tracked file with a binary-looking name** — the old `:78` skipped by EXTENSION, so the key
 *     written into a tracked `leak.png` passed. Closed by scanning BYTES rather than utf8 text: a
 *     MapTiler key is ASCII, and it is just as usable to a reader's browser whatever the file is
 *     called. A `.png` that is really an HTML file is not a hypothetical — it is the cheapest way
 *     past an extension list.
 *  3. **a DIFFERENT key** — and this was the structural one. The old guard looked only for the exact
 *     value in `twin/.env`, while R1b clause 4 says the delivered key is a **SECOND, domain-
 *     restricted** key. So *the one key the ruling intends to put into delivered files was precisely
 *     the key the guard could not see*. Closed two ways: `MAPTILER_DELIVERY_KEY` is now read out of
 *     `.env` and scanned for alongside `MAPTILER_KEY`, AND — because a key nobody wrote into `.env`
 *     would still be invisible to a value scan — a value-INDEPENDENT check reads every tracked
 *     file's MapTiler style URLs and requires the `key=` parameter to be the placeholder. That one
 *     needs no key at all to be looking, which is what makes it the real close.
 *
 * WHAT IT STILL DOES NOT CATCH, named rather than implied: a key already in the git HISTORY (this
 * reads the working tree), and any other vendor's credential.
 *
 * ## THE MUTATIONS, run in an rsync copy outside the tree with its own git repo
 *
 *   | mutation                                                   | before | after |
 *   |------------------------------------------------------------|--------|-------|
 *   | key in a tracked `proof/mapgen-symbol-web/leak.html`        | red    | red   |
 *   | the same file left UNTRACKED                                | green  | green |
 *   | key in a tracked 9 MB `.html`                               | GREEN  | red   |
 *   | key in a tracked `leak.png`                                 | GREEN  | red   |
 *   | a different 32-char key in a tracked page's style URL       | GREEN  | red   |
 *   | `MAPTILER_DELIVERY_KEY`'s own value in a tracked file       | GREEN  | red   |
 *
 * The exact output of each is in the commit that closed them.
 */
import { describe, expect, it } from "bun:test";
import { execFileSync } from "node:child_process";
import {
  existsSync,
  openSync,
  readFileSync,
  readSync,
  closeSync,
  statSync,
} from "node:fs";
import { join } from "node:path";

const TWIN = join(import.meta.dirname, "..", "..", "..");
const ENV = join(TWIN, ".env");
const PLACEHOLDER = "__MAPTILER" + "_KEY__";

/** Every MapTiler key name this tree knows about, INCLUDING R1b's second delivery key — the one the
 *  ruling says will be substituted into delivered files, and therefore the one most likely to be
 *  committed by accident. */
const KEY_NAMES = [
  "MAPTILER_KEY",
  "MAPTILER_DELIVERY_KEY",
  "MAPTILER_API_KEY",
  "VITE_MAPTILER_KEY",
  "REMOTION_MAPTILER_KEY",
];

function keysFromEnv(): { name: string; value: string }[] {
  if (!existsSync(ENV)) return [];
  const found: { name: string; value: string }[] = [];
  for (const line of readFileSync(ENV, "utf8").split(/\r?\n/)) {
    const m = /^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(\S+)\s*$/.exec(line);
    if (!m || !KEY_NAMES.includes(m[1]!) || m[2]!.length < 8) continue;
    if (!found.some((k) => k.value === m[2]))
      found.push({ name: m[1]!, value: m[2]! });
  }
  return found;
}

/** Tracked files under `twin/`, relative to it, as git itself sees them. */
function trackedFiles(): string[] {
  return execFileSync("git", ["ls-files", "-z", "--", "."], {
    cwd: TWIN,
    encoding: "utf8",
  })
    .split("\0")
    .filter(Boolean)
    .filter((rel) => existsSync(join(TWIN, rel)));
}

/**
 * Does this file contain this ASCII needle anywhere in its BYTES?
 *
 * Chunked, with an overlap of `needle.length - 1`, so a needle straddling a chunk boundary is still
 * found and a 200 MB tracked file costs 2 MB of memory rather than 200. No extension list and no
 * size ceiling: both were skips, and a skip is where a key hides.
 */
function fileContains(path: string, needle: string): boolean {
  const CHUNK = 2 * 1024 * 1024;
  const target = Buffer.from(needle, "latin1");
  const overlap = Math.max(0, target.length - 1);
  const fd = openSync(path, "r");
  try {
    const buffer = Buffer.alloc(overlap + CHUNK);
    let carried = 0;
    let position = 0;
    for (;;) {
      const read = readSync(fd, buffer, carried, CHUNK, position);
      if (read === 0) return false;
      position += read;
      const filled = carried + read;
      if (buffer.subarray(0, filled).includes(target)) return true;
      // Keep the last `overlap` bytes at the front, so a needle straddling the boundary is seen.
      carried = Math.min(overlap, filled);
      buffer.copy(buffer, 0, filled - carried, filled);
    }
  } finally {
    closeSync(fd);
  }
}

/** Every tracked path that is a real file — a tracked symlink to a directory or a submodule would
 *  otherwise throw EISDIR mid-scan instead of reporting anything at all. */
function scannablePaths(): string[] {
  const paths = [];
  for (const rel of trackedFiles()) {
    const path = join(TWIN, rel);
    let stat;
    try {
      stat = statSync(path);
    } catch {
      continue;
    }
    if (stat.isFile()) paths.push(rel);
  }
  return paths;
}

const keys = keysFromEnv();

describe("R1b — no tracked file carries a real MapTiler key", () => {
  it("should have a key to look for, or say plainly that it is not looking", () => {
    if (keys.length === 0)
      console.log(
        `R1b: no MapTiler key in twin/.env (looked for ${KEY_NAMES.join(", ")}) — the value scan ` +
          "below has nothing to look for. The style-URL scan does not need one.",
      );
    else
      console.log(`R1b: scanning for ${keys.map((k) => k.name).join(", ")}.`);
    expect(true).toBe(true);
  });

  for (const name of KEY_NAMES)
    it(`should not find ${name} in any tracked file`, () => {
      const key = keys.find((k) => k.name === name);
      if (!key) return;
      const offenders = scannablePaths().filter((rel) =>
        fileContains(join(TWIN, rel), key.value),
      );
      expect(offenders).toEqual([]);
    });

  /**
   * The value-independent half, and the only one that can see a key nobody wrote into `.env`.
   *
   * Every live map × web page requests `https://api.maptiler.com/maps/<style>/style.json?key=…`.
   * The committed artifact must carry the placeholder there — that IS R1b's clause 1, and until
   * this check existed nothing asserted it on a real file (the audit found the placeholder
   * "correct and unexercised", because no live page was committed at all).
   */
  it("should find the placeholder, and never a key, in every committed MapTiler style URL", () => {
    const offenders: string[] = [];
    for (const rel of scannablePaths()) {
      if (!fileContains(join(TWIN, rel), "api.maptiler.com")) continue;
      const text = readFileSync(join(TWIN, rel), "latin1");
      // A CREDENTIAL-SHAPED value, not any `key=` at all. A MapTiler key is a run of at least 16
      // alphanumerics (the one in this tree's own `.env` is 20; MapTiler's documented format is 32),
      // while the things that legitimately sit here are the placeholder, a template interpolation
      // (`key=${key}` in three bake scripts) and a short test fixture (`key=abc123`). Matching the
      // SHAPE rather than keeping a list of exceptions is what keeps this value-INDEPENDENT: it
      // does not need to know which key it is looking at, which is exactly why it can see the
      // second, domain-restricted delivery key that a value scan structurally cannot.
      for (const match of text.matchAll(
        /api\.maptiler\.com\/[^"'\s]*[?&]key=([A-Za-z0-9]{16,})/g,
      ))
        if (match[1] !== PLACEHOLDER)
          offenders.push(`${rel}: key=${match[1]!.slice(0, 6)}…`);
    }
    expect(
      offenders,
      "a tracked file requests MapTiler with something other than the delivery placeholder. R1b: " +
        "the key enters the file at delivery (deliver's substituteKeys) and nowhere earlier.",
    ).toEqual([]);
  });

  it("should be looking at the committed live pages rather than at nothing", () => {
    // Anti-vacuity for the check above: it passes trivially in a tree with no live map in it, which
    // is exactly the tree the audit found. At least one committed page must actually request
    // MapTiler and carry the placeholder, or the assertion proves nothing.
    const live = scannablePaths().filter(
      (rel) =>
        rel.endsWith(".html") &&
        fileContains(join(TWIN, rel), "api.maptiler.com") &&
        fileContains(join(TWIN, rel), PLACEHOLDER),
    );
    expect(live.length).toBeGreaterThan(0);
  });

  it("should confirm the env file itself is untracked, which is what makes the key safe to hold", () => {
    expect(trackedFiles()).not.toContain(".env");
  });
});
