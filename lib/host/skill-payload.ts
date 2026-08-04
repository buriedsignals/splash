// What a host is actually handed when it loads a skill.
//
// Measured on Goose 1.45 (crates/goose/src/skills/mod.rs:456-466) and validated against three
// payloads a model really received (docs/splash/skill-payload-2026-08-04.md §1.4: offer counts
// exact, sizes within 1.5%). The upstream rule has NO filter — not extension, not size, not
// depth. It skips only VCS directories and any subtree carrying its own SKILL.md, and it
// FOLLOWS symlinks, which is precisely how node_modules entered a tree `find` reported as clean.
import {
  readdirSync,
  readFileSync,
  statSync,
  existsSync,
  realpathSync,
} from "node:fs";
import { join, relative } from "node:path";

/** Directory names the packaged skill must not carry. Defined ONCE — the packer copies by the
 *  same rule the budgets measure by, so the delivered tree and the guarded tree cannot diverge. */
export const EXCLUDED_NAMES: ReadonlySet<string> = new Set([
  "node_modules",
  "dist",
  "tests",
  "output-proof",
  "coverage",
]);

const VCS = new Set([".git", ".hg", ".svn"]);

/** The exclusion rule. Directories are matched by name; files only by the `.test.ts` suffix —
 *  a FILE called `dist` is a file, not a build tree. */
export function isExcludedEntry(name: string, isDirectory: boolean): boolean {
  if (isDirectory) return EXCLUDED_NAMES.has(name);
  return name.endsWith(".test.ts");
}

export type SkillPayload = { files: number; chars: number };

/**
 * `files` — how many paths the host would offer.
 * `chars` — the prose plus one offer line per path, which is the shape of the response that
 * overflows the host's 200 000-character spill threshold.
 */
export function measureSkillPayload(
  skillDir: string,
  opts: { applyExclusions?: boolean } = {},
): SkillPayload {
  const apply = opts.applyExclusions === true;
  const offers: string[] = [];
  const seen = new Set<string>();

  const walk = (dir: string): void => {
    // Symlinks are followed, so a cycle is reachable. Key on the real path.
    let real: string;
    try {
      real = realpathSync(dir);
    } catch {
      return;
    }
    if (seen.has(real)) return;
    seen.add(real);

    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const name = entry.name;
      const full = join(dir, name);
      let isDir: boolean;
      try {
        isDir = statSync(full).isDirectory(); // stat, not lstat: follow the link
      } catch {
        continue; // a dead link offers nothing
      }
      if (isDir) {
        if (VCS.has(name)) continue;
        if (apply && isExcludedEntry(name, true)) continue;
        // A subtree with its own SKILL.md is another skill, not part of this offer.
        if (existsSync(join(full, "SKILL.md"))) continue;
        walk(full);
      } else {
        if (apply && isExcludedEntry(name, false)) continue;
        offers.push(relative(skillDir, full));
      }
    }
  };

  walk(skillDir);

  const skillMd = join(skillDir, "SKILL.md");
  const prose = existsSync(skillMd) ? readFileSync(skillMd, "utf8").length : 0;
  const enumeration = offers.reduce((n, p) => n + p.length + 1, 0);
  return { files: offers.length, chars: prose + enumeration };
}
