// Which skills tree does the setup page MEASURE?
//
// A real install runs the delivered tree: scripts/pack-skills.mjs writes the engines to
// <root>/.dist/skills/ and installs their dependencies at <root>/.dist/node_modules — one level
// above them, where Bun resolves and no host walks. The source tree at <root>/skills/ keeps no
// node_modules of its own on such an install, so probing it reports every in-house engine as
// missing and tells the journalist to run `bun install` in a directory nothing will ever install
// into. A developer checkout is the mirror case: never packed, dependencies under
// skills/<engine>/node_modules.
//
// One rule covers both: probe the delivered tree when it exists, the source tree otherwise.
import { existsSync } from "node:fs";
import { join } from "node:path";

export function resolveSkillsRoot(
  installRoot: string,
  exists: (path: string) => boolean = existsSync,
): string {
  const delivered = join(installRoot, ".dist", "skills");
  return exists(delivered) ? delivered : join(installRoot, "skills");
}
