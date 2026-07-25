// probe.ts — the three primitives that ask the MACHINE a question, in one home. They are
// deliberately tiny and dependency-free (node:fs only) so every consumer can import them:
// lib/newsroom's own readiness and decor, and the shipped skills/splash/src/preflight.ts,
// which used to carry byte-identical copies of all three.
//
// Keeping them here is what makes the branch's thesis ("one declaration") true of the
// BEHAVIOUR too, not only of the capability data: a fix to the .env parser, or a change of
// mind about what counts as "set", now happens once.
import { readFileSync } from "node:fs";

/**
 * Parse a KEY=value file into a plain map. A line that does not look like an assignment is
 * ignored, and an unreadable/absent file yields an empty map — never a throw: a missing .env
 * means "nothing is configured", which every caller already handles.
 */
export function parseEnvFile(path: string): Record<string, string> {
  const out: Record<string, string> = {};
  try {
    for (const line of readFileSync(path, "utf8").split("\n")) {
      const m = line.match(/^([A-Z_][A-Z0-9_]*)\s*=\s*"?([^"\n]*)"?\s*$/);
      if (m) out[m[1]!] = m[2]!;
    }
  } catch {
    // no such file — the process environment alone decides
  }
  return out;
}

/** An empty or whitespace-only value is NOT set: an untouched `.env.example` line is not a key. */
export function isSet(v: string | undefined): boolean {
  return typeof v === "string" && v.trim() !== "";
}

/** Does this package resolve from that directory? The real machine answer, injectable in tests. */
export function defaultResolveDep(pkg: string, fromDir: string): boolean {
  try {
    Bun.resolveSync(pkg, fromDir);
    return true;
  } catch {
    return false;
  }
}
