// Legacy map runs once found `.env` with a fixed `../../../` climb. That happened to reach the
// checkout root during development, but symlinked or namespaced installations could silently read a
// developer's file instead of the copied root's file.
//
// Resolve the nearest Splash root by its `package.json` `#shared/*` import marker. Managed Engine
// operations do not use this environment path; they hydrate only the credential IDs declared by a
// closed operation. This helper remains read-only compatibility for an explicitly operated copied
// root.
//
// The file is duplicated byte-for-byte into every skill that needs it. The parity test verifies both
// flat and product-namespaced skill layouts and rejects another fixed climb.

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

/** The read-only `.env` compatibility path for an explicitly operated copied root. */
export function splashEnvPath(startDir) {
  return join(splashRoot(startDir), ".env");
}
