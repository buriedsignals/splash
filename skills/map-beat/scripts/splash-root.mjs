// THE DEFECT THIS FILE CLOSES: the key had two homes, and neither knew about the other.
//
// `recordKey` — the one code path in this toolchain that accepts a key from a journalist — writes
// it to `<root>/.env` (`keys.mjs`). The map producers read theirs from
// `new URL("../../../.env", import.meta.url)`, i.e. three directories above the script, which in
// this development checkout is `twin/.env`. In the checkout those two happen to be the same file,
// so nothing ever showed. Anywhere else they are not, and the failure is silent in the worst
// direction: both Bun and Node resolve a symlink BEFORE computing `import.meta.url`, so installing
// the skills as a symlink does not repair it — it makes the producer read the DEVELOPER's `.env`
// while the journalist's own key sits unread in their own root.
//
// The fix is not a patch on one of the two paths. It is to DEFINE the root once, so that both
// resolutions land on the same file by construction: a Splash root is the nearest ancestor
// directory holding a `package.json` that declares the `#shared/*` subpath import. That marker is
// not arbitrary — it is the one thing that makes a directory a Splash root rather than any other
// folder: `#shared/*` is how every beat loads the vendored craft mechanism, so a directory that
// does not declare it cannot run a beat at all.
//
// This resolves correctly in BOTH topologies, which is the whole point:
//   - the development checkout — a script in `twin/skills/<skill>/scripts/` walks up to `twin/`;
//   - an installed newsroom root — a script in `<root>/skills/<skill>/scripts/` walks up to
//     `<root>/`, which is exactly where `recordKey` writes.
//
// It is DUPLICATED, byte for byte, into every skill that needs it, never imported across a skill
// boundary — the twin's method (`no-cross-skill-imports.test.ts`), the same way `render-still.mjs`
// travels. `the-key-has-one-home.test.ts` walks the copies and proves they stay in step, and proves
// they agree with `recordKey` about where the file is.

import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";

/**
 * The Splash root that owns `startDir`: the nearest ancestor whose `package.json` declares the
 * `#shared/*` subpath import.
 *
 * Throws, naming every directory it looked in, when there is none. That is deliberate and it is
 * this project's standing rule — a missing prerequisite is reported, never designed around. The
 * shape it replaces (`../../../.env`) could not fail: it always produced a path, and when that path
 * did not exist the caller reported "no MAPTILER_KEY in <path>", which sends a reader hunting for a
 * missing key when what is actually missing is the root.
 */
export function splashRoot(startDir) {
  const looked = [];
  let dir = resolve(startDir);
  for (;;) {
    looked.push(dir);
    const manifest = join(dir, "package.json");
    if (existsSync(manifest)) {
      try {
        const pkg = JSON.parse(readFileSync(manifest, "utf8"));
        if (pkg?.imports?.["#shared/*"]) return dir;
      } catch {
        // An unparsable package.json is not this function's business to report on; keep walking.
      }
    }
    const parent = dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  throw new Error(
    `no Splash root above ${startDir} — looked for a package.json declaring the "#shared/*" import in:\n  ${looked.join("\n  ")}`,
  );
}

/** The one `.env` a Splash root has — the same file `recordKey({root})` writes into. */
export function splashEnvPath(startDir) {
  return join(splashRoot(startDir), ".env");
}
