// lib/loop/schema-version-drift.test.ts
//
// THIS IS A SOURCE-SCAN DRIFT LOCK, NOT A PROOF OF CORRECTNESS. It proves nothing about whether
// CURRENT_SCHEMA_VERSION is wired correctly at any given call site — that was already proven by
// execution/mutation-testing in Task 9 (lib/host/state.test.ts's stale-schema round-trip) and
// Task 10 (lib/loop/init.test.ts's "not a restated literal" assertion). What this guard buys is
// narrower and purely textual: it makes it impossible to silently REINTRODUCE a bare numeric
// `schemaVersion: N` literal at a NEW call site without a failing test naming the exact file.
//
// Why this exists: CURRENT_SCHEMA_VERSION (manifest.ts) was created by Task 9 specifically to be
// the single source of truth for the manifest's schema version, closing a drift where
// lib/host/state.ts carried its own hardcoded `schemaVersion !== 4` that had silently fallen
// behind the real version. The very next task (Task 10) independently reintroduced the same
// defect class at a DIFFERENT site — lib/loop/init.ts wrote `schemaVersion: 5` instead of
// importing the constant — proving that exporting a constant does not, by itself, stop a future
// call site from writing a bare literal instead of importing it. Two instances in two
// consecutive tasks, with 11 more manifest-adjacent tasks still ahead (Phases C–F) — each a
// fresh chance for a third. This test is the mechanical backstop for that recurring pattern.
//
// Three exemption classes, and nothing else:
//   (a) lib/loop/migrate.ts — the migration dispatcher ladder (`schemaVersion === 5`, `=== 4`,
//       …) and its per-version output literals (`schemaVersion: 4`, `schemaVersion: 3`, …) are
//       DELIBERATELY pinned to specific historical schema versions. Every one of them must be
//       hand-edited whenever a new version is added anyway (migrate() gains a new branch), so a
//       bare literal there is not a drift risk the way a single current-version write site is —
//       it was reviewed and explicitly ruled correct in Task 9's review.
//   (b) lib/newsroom/state.ts and lib/newsroom/migrate-decor.ts — these carry their own
//       `schemaVersion: 1` on a COMPLETELY UNRELATED schema (NewsroomStateSchema, not
//       RunManifestSchema). Same field name, different domain, coincidental collision — not the
//       same defect class at all.
//   (c) any `*.test.ts` file — a fixture is allowed to construct any schemaVersion value it
//       wants (including old versions, to exercise migrate()); that is the point of a fixture,
//       not a drift risk.
//
// Anything else that writes a bare `schemaVersion: <digits>` in lib/**/*.ts, skills/**/*.ts or
// skills/**/*.mjs is exactly the class of literal this test exists to catch.
import { describe, it, expect } from "bun:test";
import { readFileSync, readdirSync } from "node:fs";
import { join, relative } from "node:path";

const ROOT = join(import.meta.dir, "..", "..");

const SKIP_DIRS = new Set(["node_modules", "dist"]);

// Walks a directory tree collecting files whose name passes `keep`, pruning SKIP_DIRS along the
// way — the same shape as skills/map-native/src/core/frame-house-hue-parity.test.ts's `walk`,
// widened to prune node_modules/dist since this scan spans whole top-level trees rather than one
// skill's src/.
function walk(dir: string, keep: (name: string) => boolean): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    if (e.isDirectory()) {
      if (SKIP_DIRS.has(e.name)) return [];
      return walk(join(dir, e.name), keep);
    }
    return keep(e.name) ? [join(dir, e.name)] : [];
  });
}

const LIB_FILES = walk(join(ROOT, "lib"), (n) => n.endsWith(".ts"));
const SKILLS_FILES = walk(
  join(ROOT, "skills"),
  (n) => n.endsWith(".ts") || n.endsWith(".mjs"),
);
const ALL_FILES = [...LIB_FILES, ...SKILLS_FILES];

// Exemption class (a): the migration ladder, hand-mirrored path.
const MIGRATE_PATH = join(ROOT, "lib", "loop", "migrate.ts");
// Exemption class (b): the unrelated NewsroomStateSchema.
const NEWSROOM_EXEMPT_PATHS = new Set([
  join(ROOT, "lib", "newsroom", "state.ts"),
  join(ROOT, "lib", "newsroom", "migrate-decor.ts"),
]);

function isExempt(file: string): boolean {
  if (file.endsWith(".test.ts")) return true; // class (c)
  if (file === MIGRATE_PATH) return true; // class (a)
  if (NEWSROOM_EXEMPT_PATHS.has(file)) return true; // class (b)
  return false;
}

// A bare numeric literal, never a reference: `schemaVersion: CURRENT_SCHEMA_VERSION` and
// `schemaVersion !== CURRENT_SCHEMA_VERSION` do not match this — only `schemaVersion: 5` (or any
// other digit run) does, which is exactly the shape a hand-restated literal takes.
const BARE_LITERAL = /schemaVersion:\s*[0-9]+/;

describe("schemaVersion literal drift lock (source-scan only, not a correctness proof)", () => {
  it("scans a real, non-zero set of files under lib/ and skills/", () => {
    // A guard whose scan silently comes back empty is a guard that passes for the wrong reason —
    // the same discipline docs/splash/guardrails.md's parity tests already hold themselves to.
    expect(ALL_FILES.length).toBeGreaterThan(500);
  });

  it("every bare `schemaVersion: <number>` literal outside the three exempt classes is a regression", () => {
    const offenders: string[] = [];
    for (const file of ALL_FILES) {
      if (isExempt(file)) continue;
      const src = readFileSync(file, "utf8");
      const lines = src.split("\n");
      for (let i = 0; i < lines.length; i++) {
        if (BARE_LITERAL.test(lines[i])) {
          offenders.push(`${relative(ROOT, file)}:${i + 1}`);
        }
      }
    }
    expect(
      offenders,
      offenders.length
        ? `bare schemaVersion literal(s) found outside the exempt files — import CURRENT_SCHEMA_VERSION from lib/loop/manifest.ts instead:\n${offenders.join("\n")}`
        : undefined,
    ).toEqual([]);
  });
});
