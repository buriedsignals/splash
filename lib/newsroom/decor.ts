// decor.ts — the one impure function in lib/newsroom: it reads the install root and hands
// back the decor as data. Everything else in this directory is pure, which is what makes the
// decor testable without a machine.
//
// The install root is resolved from THIS module's location, not from process.cwd(): a
// producer, the loop and the host façade all run from different working directories, and the
// decor must not change depending on which one asked.
import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { loadNewsroomProfile } from "../../skills/splash/src/brand-profile";
import { resolveLanguage, type ResolvedLanguage } from "./language";
import { migrateDecor, needsDecorMigration } from "./migrate-decor";
import { decorReadiness, type CapabilityReadiness } from "./readiness";
import { readNewsroomState, type NewsroomState } from "./state";

const here = dirname(fileURLToPath(import.meta.url));

export type Decor = {
  root: string;
  state: NewsroomState;
  language: ResolvedLanguage;
  readiness: CapabilityReadiness[];
};

export function installRoot(): string {
  return resolve(here, "../..");
}

/**
 * The environment the decor judges against: the install's own .env, with the process
 * environment winning. Bun auto-loads .env from the CWD only, and a producer may run from
 * anywhere — reading the install's file is what keeps a readiness answer from claiming a key
 * is missing while it sits in the file the launcher sources.
 */
export function decorEnv(root: string): Record<string, string | undefined> {
  const fromFile: Record<string, string> = {};
  try {
    for (const line of readFileSync(join(root, ".env"), "utf8").split("\n")) {
      const m = line.match(/^([A-Z_][A-Z0-9_]*)\s*=\s*"?([^"\n]*)"?\s*$/);
      if (m) fromFile[m[1]!] = m[2]!;
    }
  } catch {
    // no .env — the process environment alone decides
  }
  return { ...fromFile, ...process.env };
}

export function loadDecor(root: string = installRoot()): Decor {
  const env = decorEnv(root);
  // The one write on a read path, and the reason an existing install is recognised instead of
  // re-interrogated. It happens once: afterwards newsroom.json exists.
  const state = needsDecorMigration(root)
    ? migrateDecor(root, env).state
    : readNewsroomState(root);
  const language = resolveLanguage({
    uiLang: state.uiLang,
    profileLang: loadNewsroomProfile(root)?.lang,
  });
  return { root, state, language, readiness: decorReadiness(state, { env }) };
}
