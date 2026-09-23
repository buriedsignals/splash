// twin/shared/design-base/working-root.mjs
//
// THE ROOT A JOURNALIST IS WORKING IN IS NOT THE ROOT THE SKILL LIVES IN, and every scaffold
// assumed they were the same one.
//
// In a CHECKOUT they are: `skills/`, `proof/` and `stories/` sit in one tree, so a scaffold could
// resolve `--beat stories/x/beats/y` against its own `../../..` and be right. An installed root is
// not a checkout — it vendors `shared/` and holds the journalist's stories, and the Engine projects
// the skills somewhere else entirely. Measured 2026-09-23: the only way to scaffold into a real
// story was `--beat ../../../../.local/share/splash-stories/stories/…`, which then travelled into
// the written beat as its own recorded path.
//
// So a scaffold asks TWO questions now. `DEFAULT_ROOT` (its own `../../..`) still answers "where are
// my type sheets and my worked examples". This answers "where is the journalist working", and it
// asks the filesystem rather than the skill's own location.

import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";

/**
 * The nearest ancestor of `startDir` whose `package.json` declares the `#shared/*` import — the same
 * marker `splashRoot` uses, because it is the same question asked from the other end.
 *
 * Returns `fallback` rather than throwing when there is none: running a scaffold from an unrelated
 * directory is not an error, it just means the skill's own checkout is the root, which is what every
 * catalogue run does.
 *
 * @param {string} startDir usually `process.cwd()`
 * @param {string} fallback the scaffold's own `DEFAULT_ROOT`
 */
export function workingRoot(startDir, fallback) {
  for (let dir = resolve(startDir); ; ) {
    const manifest = join(dir, "package.json");
    if (existsSync(manifest)) {
      try {
        if (JSON.parse(readFileSync(manifest, "utf8"))?.imports?.["#shared/*"]) return dir;
      } catch {
        // an unparsable package.json is not this function's business — keep walking
      }
    }
    const parent = dirname(dir);
    if (parent === dir) return fallback;
    dir = parent;
  }
}
