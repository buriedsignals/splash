// Test support: walking the repository tree. Imported only by tests — a skill's `test/` directory
// is the one place allowed to import out of its skill (skills/splash/test/no-cross-skill-imports.test.ts).
import { readdirSync, type Dirent } from "node:fs";
import { join } from "node:path";

/** Dot-directories hold tooling, agent worktrees and scratch, never shipped code. */
export const skipped = (name: string) =>
  name === "node_modules" || name.startsWith(".");

/**
 * Every non-directory entry under `dir` that `keep` accepts, depth first in readdir order. An entry
 * `skip` names — file or directory — is neither kept nor descended into; by default that is
 * `node_modules` and every dot-entry. A missing `dir` throws: a walk that silently found nothing
 * would let every guard built on it pass vacuously.
 */
export function filesUnder(
  dir: string,
  keep: (entry: Dirent, path: string) => boolean = () => true,
  skip: (entry: Dirent) => boolean = (entry) => skipped(entry.name),
  out: string[] = [],
): string[] {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (skip(entry)) continue;
    const path = join(dir, entry.name);
    if (entry.isDirectory()) filesUnder(path, keep, skip, out);
    else if (keep(entry, path)) out.push(path);
  }
  return out;
}
