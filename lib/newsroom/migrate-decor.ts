// migrate-decor.ts — a one-time absorption, so an existing install is RECOGNISED instead of
// re-interrogated (#5: "existing configurator installations migrate without losing .env
// values"). Two legacy supports fold into newsroom.json and are then removed:
//   .splash-runtime        → state.runtime
//   .splash-preflight.json → state.capabilities[id].lastVerified (green stamps only)
// .env is NEVER touched: it is and stays the single home of every credential.
import { existsSync, readFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { NEWSROOM_CAPABILITIES } from "./capabilities";
import {
  DEFAULT_NEWSROOM_STATE,
  NEWSROOM_STATE_FILE,
  writeNewsroomState,
  type CapabilityState,
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

function isSet(v: string | undefined): boolean {
  return typeof v === "string" && v.trim() !== "";
}

// A capability an existing install can already exercise was, in effect, already chosen: the
// journalist supplied its key. Enabling exactly those is what stops the migration from
// asking a working install to configure itself again.
function enabledByEnv(
  capId: string,
  env: Record<string, string | undefined>,
): boolean {
  const cap = NEWSROOM_CAPABILITIES[capId]!;
  if (!cap.implemented) return false;
  return cap.env.every((group) => group.some((name) => isSet(env[name])));
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

export function migrateDecor(
  dir: string,
  env: Record<string, string | undefined>,
): { state: NewsroomState; removed: string[] } {
  const removed: string[] = [];

  let runtime = DEFAULT_NEWSROOM_STATE.runtime;
  const runtimePath = join(dir, LEGACY_RUNTIME_FILE);
  if (existsSync(runtimePath)) {
    const text = readFileSync(runtimePath, "utf8").trim();
    if (text) runtime = text;
  }

  const stamps = readGreenStamps(dir);
  const capabilities: Record<string, CapabilityState> = {};
  for (const id of Object.keys(NEWSROOM_CAPABILITIES)) {
    const entry: CapabilityState = { enabled: enabledByEnv(id, env) };
    if (stamps[id]) entry.lastVerified = { at: stamps[id]!, result: "ok" };
    capabilities[id] = entry;
  }

  const state: NewsroomState = {
    schemaVersion: 1,
    runtime,
    uiLang: DEFAULT_NEWSROOM_STATE.uiLang,
    capabilities,
  };
  writeNewsroomState(dir, state);

  for (const file of [LEGACY_RUNTIME_FILE, LEGACY_PREFLIGHT_FILE]) {
    const path = join(dir, file);
    if (existsSync(path)) {
      rmSync(path);
      removed.push(file);
    }
  }
  return { state, removed };
}
