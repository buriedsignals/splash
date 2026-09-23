// twin/shared/map-beat/maptiler-key.mjs
//
// ONE PLACE A BEAT READS ITS MAPTILER KEY, because two places is how a page ships without its live layer
// and says nothing.
//
// A web map's bake read the key out of the root's `.env`, through the alias table, depth-independently. Its
// own runner read `process.env` and nothing else — and the key only reached it at all because Bun auto-loads
// `<cwd>/.env`. Measured 2026-09-23: run from the stories root the page got its key; run from the BEAT's own
// directory — which is what the bake's usage line and « open the .local.html » both invite — the same command
// exited 0, printed three successes, and quietly wrote no keyed copy at all. The journalist opens the
// committed page, sees the frozen fallback, and has no signal the live layer was never keyed.
//
// The alias table is the Engine's own (`skills/splash/scripts/keys.mjs`): the environment wins where it is
// set, and the root's `.env` answers otherwise.

import { existsSync, readFileSync } from "node:fs";
import { splashEnvPath } from "#shared/design-base/splash-root.mjs";

/** The names a MapTiler key is filed under, canonical first. */
export const MAPTILER_KEY_NAMES = ["MAPTILER_KEY", "MAPTILER_API_KEY", "REMOTION_MAPTILER_KEY", "VITE_MAPTILER_KEY"];

/** `KEY=value` lines, comments and blanks ignored, quotes stripped. */
export function parseEnvFile(text) {
  const out = {};
  for (const line of String(text).split(/\r?\n/)) {
    const pair = /^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/.exec(line);
    if (!pair) continue;
    out[pair[1]] = pair[2].trim().replace(/^["']|["']$/g, "");
  }
  return out;
}

/**
 * The key for a beat at `startDir`, or `""`.
 *
 * @param {string} startDir the beat's own directory, i.e. `import.meta.dirname`
 * @returns {{ key: string, from: string }} where it came from, so a runner can say so out loud
 */
export function mapTilerKeyFor(startDir) {
  for (const name of MAPTILER_KEY_NAMES)
    if (process.env[name]) return { key: process.env[name], from: `the environment (${name})` };
  let path;
  try {
    path = splashEnvPath(startDir);
  } catch {
    return { key: "", from: "no Splash root above this beat" };
  }
  if (!existsSync(path)) return { key: "", from: `no ${path}` };
  const env = parseEnvFile(readFileSync(path, "utf8"));
  for (const name of MAPTILER_KEY_NAMES) if (env[name]) return { key: env[name], from: `${path} (${name})` };
  return { key: "", from: `${path} carries none of ${MAPTILER_KEY_NAMES.join(", ")}` };
}
