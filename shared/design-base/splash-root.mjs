// twin/shared/design-base/splash-root.mjs
//
// WHERE A BEAT'S OWN ROOT IS, ASKED BY A BEAT — the same question `skills/*/scripts/splash-root.mjs`
// answers for a skill, on the one import path a beat has.
//
// A beat can import `#shared/*` and nothing else, so it could not ask that question at all, and
// every bake counted the climb by hand: `join(HERE, "../../.env")`. From a worked example at
// `proof/<beat>/` that reaches the checkout root and is right. From a story beat at
// `stories/<story>/beats/<beat>/` it reaches the STORY folder, which holds no `.env` and never will.
// Measured 2026-09-23, baking a real story's choropleth in an installed root:
//
//   ENOENT: no such file or directory, open '…/stories/the-eu-widest-…/.env'
//
// The climb could not fail — it always produces a path — so what the reader was told was that a key
// was missing from a file, when what was missing was the root.

import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";

/**
 * The Splash root that owns `startDir`: the nearest ancestor whose `package.json` declares the
 * `#shared/*` subpath import. A checkout and an installed stories root both answer to it, which is
 * the point — it is the one marker both kinds of root carry.
 *
 * Throws, naming every directory it looked in, rather than handing back a path that does not exist.
 */
export function splashRoot(startDir) {
  const looked = [];
  for (let dir = resolve(startDir); ; ) {
    looked.push(dir);
    const manifest = join(dir, "package.json");
    if (existsSync(manifest)) {
      try {
        if (JSON.parse(readFileSync(manifest, "utf8"))?.imports?.["#shared/*"]) return dir;
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

/** The `.env` of the root that owns this beat — a checkout's, or an installed stories root's. */
export function splashEnvPath(startDir) {
  return join(splashRoot(startDir), ".env");
}
