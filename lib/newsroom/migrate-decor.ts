// migrate-decor.ts — a one-time absorption, so an existing install is RECOGNISED instead of
// re-interrogated (#5: "existing configurator installations migrate without losing .env
// values"). Two legacy supports fold into newsroom.json:
//   .splash-runtime        → state.runtime
//   .splash-preflight.json → state.capabilities[id].lastVerified (green stamps only)
//
// This migration deliberately deletes nothing, and that is now its whole job: neither legacy
// file has a WRITER left (the setup page owns the runtime and the verification stamps, and
// A3 retired the one in `skills/splash/scripts/preflight.mjs`), but both still have live
// READERS for an install that has not been through that page yet. `install/bootstrap.sh`
// reads .splash-runtime on EVERY invocation — including its documented "re-run this installer
// to resume" path — so deleting it here would silently reinstall a goose/codex/gemini
// newsroom under a different runtime and rewrite its launcher. Retirement happens at the one
// moment the decor demonstrably holds the same facts: `install/preflight/server.ts` removes
// both files immediately after writing the state it absorbed them into.
//
// .env is NEVER touched: it is and stays the single home of every credential.
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import {
  loadBrandProfile,
  parseNewsroomMarkdown,
} from "../../skills/splash/src/brand-profile";
import {
  DEFAULT_NEWSROOM_STATE,
  NEWSROOM_STATE_FILE,
  defaultCapabilities,
  writeNewsroomState,
  type NewsroomState,
} from "./state";

export const LEGACY_RUNTIME_FILE = ".splash-runtime";
export const LEGACY_PREFLIGHT_FILE = ".splash-preflight.json";

export function needsDecorMigration(dir: string): boolean {
  if (existsSync(join(dir, NEWSROOM_STATE_FILE))) return false;
  return (
    existsSync(join(dir, LEGACY_RUNTIME_FILE)) ||
    existsSync(join(dir, LEGACY_PREFLIGHT_FILE))
  );
}

function readGreenStamps(dir: string): Record<string, string> {
  const path = join(dir, LEGACY_PREFLIGHT_FILE);
  if (!existsSync(path)) return {};
  try {
    const raw = JSON.parse(readFileSync(path, "utf8")) as {
      engines?: Record<string, { status?: string; checkedAt?: string }>;
    };
    const out: Record<string, string> = {};
    for (const [id, s] of Object.entries(raw.engines ?? {}))
      if (s?.status === "green" && typeof s.checkedAt === "string")
        out[id] = s.checkedAt;
    return out;
  } catch {
    return {}; // a cache of re-computable state, never a source of truth
  }
}

/**
 * The deliverables' language an install declares, read WITHOUT the cache write that
 * `loadNewsroomProfile` performs (it rewrites `brand.json` on every call). This derivation is on
 * a read path — `readDecorState`, which the export script calls just to pick a menu language —
 * and a language lookup has no business refreshing a brand cache. Same precedence as the
 * loader: the journalist's markdown wins, the machine cache answers when it is all there is.
 */
function profileLang(dir: string): string | undefined {
  const mdPath = join(dir, "NEWSROOM-PROFILE.md");
  if (existsSync(mdPath)) {
    try {
      return parseNewsroomMarkdown(readFileSync(mdPath, "utf8"))?.lang?.trim();
    } catch {
      return undefined; // a broken profile must not break the migration
    }
  }
  return loadBrandProfile(dir)?.lang?.trim();
}

/**
 * The state an existing install migrates TO, derived and returned without being written.
 * Pure enough to be the answer a read-only caller gets (`loadDecor` with an explicit dir):
 * the decor a host reads must not depend on whether anyone was allowed to persist it.
 */
export function migratedDecorState(
  dir: string,
  env: Record<string, string | undefined>,
): NewsroomState {
  let runtime = DEFAULT_NEWSROOM_STATE.runtime;
  const runtimePath = join(dir, LEGACY_RUNTIME_FILE);
  if (existsSync(runtimePath)) {
    const text = readFileSync(runtimePath, "utf8").trim();
    if (text) runtime = text;
  }

  const stamps = readGreenStamps(dir);
  const capabilities = defaultCapabilities(env);
  for (const [id, at] of Object.entries(stamps))
    if (capabilities[id]) capabilities[id]!.lastVerified = { at, result: "ok" };

  // An EXISTING newsroom keeps the language it already works in. English is the default for a
  // FRESH install (issue #6 asks for that, and only that); flipping a French newsroom's menus
  // to English on the day it upgrades would be a regression dressed as a default. The
  // deliverable language it declared in NEWSROOM-PROFILE.md is the only evidence P1 has of
  // which language it works in, so it seeds the interface language once, here.
  const uiLang = profileLang(dir) || DEFAULT_NEWSROOM_STATE.uiLang;

  return { schemaVersion: 1, runtime, uiLang, capabilities };
}

/** Derive the migrated state and persist it. The state file is the only thing written. */
export function migrateDecor(
  dir: string,
  env: Record<string, string | undefined>,
): NewsroomState {
  const state = migratedDecorState(dir, env);
  writeNewsroomState(dir, state);
  return state;
}
