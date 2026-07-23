// S4d editorial gate: resolve which NEWSROOM-PROFILE.md governs an export / deploy-embed run.
// Shared by export-code.mjs and deploy-embed.mjs (previously two byte-identical copies).
// `--profile` always OVERRIDES when given (an explicit path is never second-guessed). Absent,
// this AUTO-DISCOVERS `NEWSROOM-PROFILE.md` in the invoking cwd — so requiredSigners enforces
// live-by-default whenever a newsroom's profile sets it, with no flag to remember. Neither
// present → empty profile (opt-in preserved — a directory with no profile still exports/deploys
// unsigned, never blocked).
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { parseNewsroomMarkdown, type BrandProfile } from "./brand-profile";

const NEWSROOM_PROFILE_FILENAME = "NEWSROOM-PROFILE.md";

/**
 * The resolved NEWSROOM-PROFILE.md path for this invocation — `flags.profile` if given, else
 * `NEWSROOM-PROFILE.md` in `process.cwd()` if it exists there, else null. Callers that shell out
 * to a subprocess (export-code → deploy-embed) forward this exact path via `--profile` rather
 * than relying on the subprocess's own cwd auto-discovery.
 */
export function resolveProfilePath(flags: { profile?: string }): string | null {
  const cwdProfile = join(process.cwd(), NEWSROOM_PROFILE_FILENAME);
  return flags.profile ?? (existsSync(cwdProfile) ? cwdProfile : null);
}

/**
 * The parsed BrandProfile at the resolved path (see resolveProfilePath), or an empty profile
 * (`{ palette: [] }`) when neither `--profile` nor a cwd NEWSROOM-PROFILE.md is found — the
 * opt-in default that never blocks a requiredSigners gate.
 */
export function resolveProfile(flags: { profile?: string }): BrandProfile {
  const path = resolveProfilePath(flags);
  return path
    ? (parseNewsroomMarkdown(readFileSync(path, "utf8")) ?? { palette: [] })
    : { palette: [] };
}
