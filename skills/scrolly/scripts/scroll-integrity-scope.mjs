// skills/scrolly/scripts/scroll-integrity-scope.mjs
//
// SCOPING test/scroll-integrity.test.ts TO ONE BEAT. The full sweep drives every proof/scrolly-* beat's own
// renders — ~40 and growing — and hit its own 600s ceiling on a cold run (2026-09-16): a beat's own render
// passed `verify-scrolly.mjs` directly with 0 failures, but the guard could not confirm that in a run of its
// own, only sweep every OTHER beat ever shipped along with it. `SCROLL_INTEGRITY_BEAT` scopes the sweep to
// one beat's own `render/`/`renders/` folder — the same env-var shape this repo's other scripts already use
// for a runtime target (`CHROME_PATH`, `MAPTILER_KEY`, …). Unset — the CI default — sweeps every beat,
// unchanged.

import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";

export const SCOPE_ENV_VAR = "SCROLL_INTEGRITY_BEAT";

/** The one beat folder to scan, honouring `SCROLL_INTEGRITY_BEAT` when set: a bare beat name
 *  (`scrolly-hex-grid-europe-wind-2024`) resolves under `proofDir`; anything carrying a path separator
 *  resolves as given (a story's own `beats/<id>`, say). `null` when the env var is unset — the caller then
 *  sweeps every beat, the unscoped default. Named and loud, never silent: a beat that does not exist under
 *  either reading refuses with the env var and the value it read, rather than quietly falling back to the
 *  full sweep. */
export function scopedBeatDir(proofDir, env = process.env) {
  const named = env[SCOPE_ENV_VAR];
  if (!named) return null;
  const dir = /[\\/]/.test(named) ? resolve(named) : join(proofDir, named);
  if (!existsSync(dir))
    throw new Error(`${SCOPE_ENV_VAR}=${JSON.stringify(named)} names no beat under ${proofDir} (or as its own path) — scroll-integrity has nothing to scope to`);
  return dir;
}

/** Every rendered scrolly page under `proofDir` — every beat's own `render/`/`renders/` folder by default, or
 *  only `scopedDir`'s own when one is given. Same discovery `test/scroll-integrity.test.ts` always used: a
 *  `.html` file whose markup carries `class="scrolly"` and `scrolly-track` — a new beat is guarded the moment
 *  its render lands, and a beat that stops being a scrolly drops out on its own. */
export function scrolliesUnder(proofDir, scopedDir = null) {
  const beatDirs = scopedDir ? [scopedDir] : readdirSync(proofDir).sort().map((name) => join(proofDir, name));
  const out = [];
  for (const beatDir of beatDirs)
    for (const sub of ["render", "renders"]) {
      const dir = join(beatDir, sub);
      if (!existsSync(dir)) continue;
      for (const file of readdirSync(dir).sort()) {
        if (!file.endsWith(".html")) continue;
        const path = join(dir, file);
        const html = readFileSync(path, "utf8");
        if (html.includes('class="scrolly"') && html.includes("scrolly-track")) out.push(path);
      }
    }
  return out;
}
